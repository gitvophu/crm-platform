/** Codes shared by every module; business errors use `<module>.<error>` (slice 1.3, Q5). */
export const PROBLEM_CODES = {
  validationFailed: 'validation_failed',
  badRequest: 'bad_request',
  unauthorized: 'unauthorized',
  forbidden: 'forbidden',
  notFound: 'not_found',
  conflict: 'conflict',
  payloadTooLarge: 'payload_too_large',
  tooManyRequests: 'too_many_requests',
  internalError: 'internal_error',
} as const;
export type GenericProblemCode = (typeof PROBLEM_CODES)[keyof typeof PROBLEM_CODES];

/** Error body of every API response outside 2xx: RFC 9457 with extensions. */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  /** Stable, for code to branch on: `validation_failed`, `contact.email_taken`... */
  code: GenericProblemCode | (string & {});
  /** Same id as the `X-Request-Id` header and the API logs. */
  requestId?: string;
  /** Messages per field, for 400 validation and field conflicts (409). */
  errors?: Record<string, string[]>;
}

export const PROBLEM_CONTENT_TYPE = 'application/problem+json';

/** RFC 9457 default `type`: no type of its own, the HTTP status says it all. */
export const PROBLEM_TYPE_DEFAULT = 'about:blank';
