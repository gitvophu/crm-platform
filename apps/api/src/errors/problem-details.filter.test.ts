import {
  type ArgumentsHost,
  ForbiddenException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { AppProblem } from './app-problem.js';
import { ProblemDetailsFilter } from './problem-details.filter.js';

/** Runs the filter and returns what it sent. */
function run(exception: unknown) {
  const res = { status: vi.fn(), type: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  res.type.mockReturnValue(res);
  const host = {
    switchToHttp: () => ({ getRequest: () => ({ id: 'req-1' }), getResponse: () => res }),
  } as unknown as ArgumentsHost;

  new ProblemDetailsFilter().catch(exception, host);

  return {
    status: res.status.mock.calls[0]?.[0] as number,
    type: res.type.mock.calls[0]?.[0] as string,
    body: res.json.mock.calls[0]?.[0] as Record<string, unknown>,
  };
}

describe('ProblemDetailsFilter', () => {
  it('sends an AppProblem as problem+json with its code and field errors', () => {
    const sent = run(
      new AppProblem(409, 'contact.email_taken', 'Already used.', { email: ['Already used.'] }),
    );

    expect(sent.status).toBe(409);
    expect(sent.type).toBe('application/problem+json');
    expect(sent.body).toEqual({
      type: 'about:blank',
      title: 'Conflict',
      status: 409,
      detail: 'Already used.',
      code: 'contact.email_taken',
      errors: { email: ['Already used.'] },
      requestId: 'req-1',
    });
  });

  it('maps Nest exceptions to generic codes, dropping a detail that repeats the title', () => {
    expect(run(new UnauthorizedException()).body).toEqual({
      type: 'about:blank',
      title: 'Unauthorized',
      status: 401,
      code: 'unauthorized',
      requestId: 'req-1',
    });
    expect(run(new ForbiddenException()).body).toMatchObject({ code: 'forbidden' });
    expect(run(new NotFoundException('Cannot GET /nope')).body).toMatchObject({
      code: 'not_found',
      detail: 'Cannot GET /nope',
    });
  });

  it('logs a 5xx HttpException and keeps its message out of the response', () => {
    const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const exception = new ServiceUnavailableException('pool exhausted on db-2');

    const sent = run(exception);

    expect(sent.body).toMatchObject({ status: 503, code: 'internal_error' });
    expect(JSON.stringify(sent.body)).not.toContain('db-2');
    expect(log).toHaveBeenCalledWith(exception);
  });

  it('hides an unexpected error behind a 500 and logs it', () => {
    const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const bug = new TypeError('cannot read x of undefined');

    const sent = run(bug);

    expect(sent.status).toBe(500);
    expect(sent.body).toMatchObject({ code: 'internal_error', title: 'Internal Server Error' });
    expect(JSON.stringify(sent.body)).not.toContain('cannot read');
    expect(log).toHaveBeenCalledWith(bug);
  });
});
