import {
  Controller,
  Get,
  type INestApplication,
  Logger as NestLogger,
  Query,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Logger, LoggerModule } from 'nestjs-pino';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { loggerParams } from '@/logging/logger.params.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const LEVEL = { info: 30, warn: 40, error: 50 };

interface LogLine {
  level: number;
  msg: string;
  reqId?: string;
  context?: string;
  req?: { headers: Record<string, string> };
  res?: { statusCode: number };
}

@Controller()
class ProbeController {
  private readonly logger = new NestLogger('Probe');

  @Get('probe')
  probe() {
    this.logger.log('inside request');
    return { ok: true };
  }

  @Get('health')
  health(@Query('down') down?: string, @Query('crash') crash?: string) {
    if (down) throw new ServiceUnavailableException();
    if (crash) throw new Error('health bug');
    return { ok: true };
  }

  @Get('fail')
  fail() {
    throw new Error('boom');
  }
}

describe('request logging', () => {
  let app: INestApplication<App>;
  const lines: LogLine[] = [];
  const linesOf = (reqId: string) => lines.filter((line) => line.reqId === reqId);

  beforeAll(async () => {
    const destination = { write: (line: string) => void lines.push(JSON.parse(line) as LogLine) };
    const moduleRef = await Test.createTestingModule({
      imports: [LoggerModule.forRoot(loggerParams('info', destination))],
      controllers: [ProbeController],
    }).compile();
    app = moduleRef.createNestApplication({ bufferLogs: true });
    app.useLogger(app.get(Logger));
    await app.init();
  });

  beforeEach(() => {
    lines.length = 0;
  });

  afterAll(async () => {
    await app.close();
  });

  it('tags every log of a request with the id returned in X-Request-Id', async () => {
    const res = await request(app.getHttpServer()).get('/probe').expect(200);
    const id = res.headers['x-request-id'] as string;

    expect(id).toMatch(UUID);
    // toMatchObject: same number of lines, each matched partially at every depth.
    expect(linesOf(id)).toMatchObject([
      { level: LEVEL.info, msg: 'inside request', context: 'Probe' },
      { level: LEVEL.info, msg: 'request completed', res: { statusCode: 200 } },
    ]);
  });

  it('reuses a valid incoming X-Request-Id', async () => {
    await request(app.getHttpServer())
      .get('/probe')
      .set('X-Request-Id', 'abc-123')
      .expect('x-request-id', 'abc-123');

    expect(linesOf('abc-123')).toHaveLength(2);
  });

  it('replaces a malformed incoming X-Request-Id', async () => {
    const res = await request(app.getHttpServer()).get('/probe').set('X-Request-Id', 'abc 123"');

    expect(res.headers['x-request-id']).toMatch(UUID);
  });

  it('does not log a healthy /health, logs a failing one as warn', async () => {
    const ok = await request(app.getHttpServer()).get('/health').expect(200);
    const down = await request(app.getHttpServer()).get('/health?down=1').expect(503);

    expect(linesOf(ok.headers['x-request-id'] as string)).toEqual([]);
    expect(linesOf(down.headers['x-request-id'] as string)).toEqual([
      expect.objectContaining({ level: LEVEL.warn, msg: 'request errored' }),
    ]);
    expect(lines.some((line) => 'err' in line)).toBe(false);
  });

  it.each(['/health/', '/HEALTH', '/health?x=1'])('treats %s as /health', async (path) => {
    const res = await request(app.getHttpServer()).get(path).expect(200);

    expect(linesOf(res.headers['x-request-id'] as string)).toEqual([]);
  });

  it('logs an unexpected /health failure as error, not warn', async () => {
    const res = await request(app.getHttpServer()).get('/health?crash=1').expect(500);

    expect(linesOf(res.headers['x-request-id'] as string)).toContainEqual(
      expect.objectContaining({ level: LEVEL.error, msg: 'request errored' }),
    );
  });

  it('logs a server error as error, with the stack logged by Nest under the same id', async () => {
    const res = await request(app.getHttpServer()).get('/fail').expect(500);

    expect(linesOf(res.headers['x-request-id'] as string)).toMatchObject([
      { level: LEVEL.error, msg: 'boom', context: 'ExceptionsHandler' },
      { level: LEVEL.error, msg: 'request errored', res: { statusCode: 500 } },
    ]);
  });

  it('redacts credentials from the request log', async () => {
    const res = await request(app.getHttpServer())
      .get('/probe')
      .set('Authorization', 'Bearer secret')
      .set('Cookie', 'session=secret');

    const completed = linesOf(res.headers['x-request-id'] as string).find((line) => line.req);
    expect(completed?.req?.headers).toMatchObject({
      authorization: '[Redacted]',
      cookie: '[Redacted]',
    });
    expect(JSON.stringify(lines)).not.toContain('secret');
  });
});
