import {
  type GenericProblemCode,
  PROBLEM_CODES,
  PROBLEM_CONTENT_TYPE,
  PROBLEM_TYPE_DEFAULT,
  type ProblemDetails,
} from '@crm/shared';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { STATUS_CODES } from 'node:http';

import { AppProblem } from './app-problem.js';

const CODE_BY_STATUS: Partial<Record<HttpStatus, GenericProblemCode>> = {
  [HttpStatus.BAD_REQUEST]: PROBLEM_CODES.badRequest,
  [HttpStatus.UNAUTHORIZED]: PROBLEM_CODES.unauthorized,
  [HttpStatus.FORBIDDEN]: PROBLEM_CODES.forbidden,
  [HttpStatus.NOT_FOUND]: PROBLEM_CODES.notFound,
  [HttpStatus.CONFLICT]: PROBLEM_CODES.conflict,
  [HttpStatus.PAYLOAD_TOO_LARGE]: PROBLEM_CODES.payloadTooLarge,
  [HttpStatus.TOO_MANY_REQUESTS]: PROBLEM_CODES.tooManyRequests,
};

const title = (status: number) => STATUS_CODES[status] ?? 'Error';

/** All a client learns of a 5xx; the details are in the log under the request id. */
const SERVER_ERROR_DETAIL = 'Something went wrong on our side. Try again later.';

/** Message of a Nest HttpException: a string, or `message` of its response object. */
function messageOf(exception: HttpException): string | undefined {
  const response = exception.getResponse();
  if (typeof response === 'string') return response;
  const { message } = response as { message?: unknown };
  if (typeof message === 'string') return message;
  if (Array.isArray(message)) return message.join('; ');
  return undefined;
}

/**
 * Every error response is RFC 9457 `application/problem+json` with `code` and `requestId`
 * (slice 1.3, Q5). An error nobody expected becomes a bare 500: its details only go to the log,
 * under the same request id.
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request & { id?: unknown }>();
    const res = http.getResponse<Response>();

    const problem = this.toProblem(exception);
    if (typeof req.id === 'string') problem.requestId = req.id;
    res.status(problem.status).type(PROBLEM_CONTENT_TYPE).json(problem);
  }

  private toProblem(exception: unknown): ProblemDetails {
    if (exception instanceof AppProblem) {
      const { status, code, detail, errors } = exception;
      return { type: PROBLEM_TYPE_DEFAULT, title: title(status), status, detail, code, errors };
    }
    if (exception instanceof HttpException) {
      const status: HttpStatus = exception.getStatus();
      if (status >= HttpStatus.INTERNAL_SERVER_ERROR) return this.serverError(exception, status);
      const message = messageOf(exception);
      const problem: ProblemDetails = {
        type: PROBLEM_TYPE_DEFAULT,
        title: title(status),
        status,
        code: CODE_BY_STATUS[status] ?? PROBLEM_CODES.badRequest,
      };
      // Nest's default messages repeat the title ("Unauthorized"); keep only real details.
      if (message && message !== problem.title) problem.detail = message;
      return problem;
    }
    return this.serverError(exception, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  /** Logged with the request id; the client only gets a generic sentence. */
  private serverError(exception: unknown, status: number): ProblemDetails {
    this.logger.error(exception);
    return {
      type: PROBLEM_TYPE_DEFAULT,
      title: title(status),
      status,
      detail: SERVER_ERROR_DETAIL,
      code: PROBLEM_CODES.internalError,
    };
  }
}
