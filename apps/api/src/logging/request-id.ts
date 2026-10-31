import { randomUUID } from 'node:crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

// Short and log-safe: no spaces, quotes or control characters a client could inject into logs.
const VALID_REQUEST_ID = /^[\w.-]{1,128}$/;

/**
 * Reuses the incoming `X-Request-Id` when it is well-formed, so a proxy or another service can
 * trace one operation across hops (slice 0.7, Q2). Otherwise starts a new id.
 */
export function resolveRequestId(header: string | string[] | undefined): string {
  return typeof header === 'string' && VALID_REQUEST_ID.test(header) ? header : randomUUID();
}
