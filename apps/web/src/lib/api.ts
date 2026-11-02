import { refreshSession } from '@/lib/session-refresh';

/** Every API call goes through the Vite proxy: `/api/x` → `http://api:3000/x` (slice 0.4, Q1). */
export const API_PREFIX = '/api';

export const REQUEST_ID_HEADER = 'x-request-id';

/** A response outside 2xx. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    /** Parsed JSON body, the raw text if it is not JSON, or null when empty. */
    readonly body: unknown,
    /** `X-Request-Id` of the response, to find the request in the API logs. */
    readonly requestId: string | null,
  ) {
    super(`API request failed with status ${status}`);
    this.name = 'ApiError';
  }
}

/** The request never got a response (API down, proxy cannot connect, offline). */
export class NetworkError extends Error {
  constructor(options?: ErrorOptions) {
    super('API request failed without a response', options);
    this.name = 'NetworkError';
  }
}

// `application/json` and `application/problem+json` (RFC 9457).
const JSON_TYPE = /^application\/([\w.-]+\+)?json\b/i;

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  if (!JSON_TYPE.test(res.headers.get('content-type') ?? '')) return text;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    // A broken JSON body must not hide the status and request id of the response.
    return text;
  }
}

export interface ApiInit extends RequestInit {
  /** Sent as a JSON body with `Content-Type: application/json`. */
  json?: unknown;
}

// Their 401 means bad credentials or no session, never an expired access token to refresh.
const AUTH_PATHS = new Set(['/auth/login', '/auth/refresh', '/auth/logout']);

async function send(path: string, { json, ...init }: ApiInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has('accept')) headers.set('accept', 'application/json');
  if (json !== undefined) headers.set('content-type', 'application/json');
  const body = json !== undefined ? JSON.stringify(json) : init.body;
  try {
    return await fetch(`${API_PREFIX}${path}`, { ...init, headers, body });
  } catch (error) {
    // An abort is the caller's choice (TanStack Query cancels stale queries), not a failure.
    if (init.signal?.aborted) throw error;
    throw new NetworkError({ cause: error });
  }
}

/**
 * Calls the API and returns the parsed body as `T` (types from `@crm/shared`, not validated).
 * Throws `ApiError` for a non-2xx response, `NetworkError` when there is no response.
 *
 * A 401 means the access token expired (15 min, ADR-0004): refresh the session and send the
 * request once more. If that fails too, the 401 is thrown; the query client then sends the user
 * to the login page (see `createAppRouter`).
 */
export async function api<T>(path: string, init?: ApiInit): Promise<T> {
  let res = await send(path, init);
  if (res.status === 401 && !AUTH_PATHS.has(path)) {
    await refreshSession();
    // Retry even if this refresh failed: another tab may have refreshed the cookies meanwhile.
    res = await send(path, init);
  }
  const body = await readBody(res);
  if (!res.ok) throw new ApiError(res.status, body, res.headers.get(REQUEST_ID_HEADER));
  return body as T;
}

/** User-facing text for an error, shared by ErrorState and error toasts. */
export function describeError(error: unknown): { message: string; requestId: string | null } {
  if (error instanceof NetworkError) {
    return {
      message: 'Can’t reach the server. Check your connection and try again.',
      requestId: null,
    };
  }
  if (!(error instanceof ApiError)) {
    // A bug in the page (render error, unexpected data), not a network problem.
    return { message: 'Something went wrong. Try again in a moment.', requestId: null };
  }
  const message =
    error.status >= 500
      ? `The server answered with an error (${error.status}). Try again in a moment.`
      : `The request was rejected (${error.status}).`;
  return { message, requestId: error.requestId };
}
