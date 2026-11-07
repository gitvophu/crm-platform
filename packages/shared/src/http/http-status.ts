/** HTTP statuses the web branches on. The API uses Nest's `HttpStatus`. */
export const HTTP_STATUS = {
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  conflict: 409,
  internalServerError: 500,
  serviceUnavailable: 503,
} as const;
