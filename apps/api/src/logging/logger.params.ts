import type { Params } from 'nestjs-pino';
import type { DestinationStream, LevelWithSilent } from 'pino';
import type { Options } from 'pino-http';

import { REQUEST_ID_HEADER, resolveRequestId } from './request-id.js';

const HEALTH_PATH = '/health';

/** Path without query string or trailing slash, lower-cased like Express route matching. */
function pathOf(req: { url?: string; originalUrl?: string }): string {
  const path = (req.originalUrl ?? req.url ?? '').split('?')[0] ?? '';
  return path.replace(/\/+$/, '').toLowerCase();
}

/** pino-http invents this error for a 5xx response that carried none. */
const isSyntheticError = (error: Error, statusCode: number) =>
  error.message === `failed with status code ${statusCode}`;

/**
 * JSON logs through pino (slice 0.7). Every log made while handling a request carries `reqId`,
 * which is also returned in the `X-Request-Id` response header.
 * `destination` defaults to stdout; tests pass an in-memory stream.
 */
export function loggerParams(level: LevelWithSilent, destination?: DestinationStream): Params {
  const options: Options = {
    level,
    genReqId: (req, res) => {
      const id = resolveRequestId(req.headers[REQUEST_ID_HEADER]);
      res.setHeader(REQUEST_ID_HEADER, id);
      return id;
    },
    customLogLevel: (req, res, error) => {
      // Compose and the web app poll /health every 10s: only failures are worth a line (Q4).
      // 503 means a dependency is down, which /health reports by design.
      if (pathOf(req) === HEALTH_PATH) {
        if (res.statusCode < 400) return 'silent';
        if (res.statusCode === 503) return 'warn';
      }
      if (error || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    // For a 5xx pino-http attaches a synthetic `err` whose stack points into pino-http itself. Nest
    // has already caught the real error and logged it (ExceptionsHandler), so drop the noise.
    // Real errors (aborted request, socket error) are kept.
    customErrorObject: (_req, res, error, value: Record<string, unknown>) =>
      isSyntheticError(error, res.statusCode)
        ? Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'err'))
        : value,
    redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
    // Logs inside a request carry only `reqId`; the request itself is logged once on completion.
    quietReqLogger: true,
  };
  return { pinoHttp: destination ? [options, destination] : options };
}
