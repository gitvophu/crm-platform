import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AppModule } from '@/app.module.js';
import { PrismaService } from '@/prisma/prisma.service.js';

describe('GET /health', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 when the database is reachable', async () => {
    await request(app.getHttpServer())
      .get('/health')
      .expect('x-request-id', /^[0-9a-f-]{36}$/)
      .expect(200, { status: 'ok', db: 'ok' });
  });

  it('answers problem+json with a code for an unknown route', async () => {
    const res = await request(app.getHttpServer()).get('/nope').expect(404);

    expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
    const body = res.body as Record<string, unknown>;
    expect(body).toMatchObject({ status: 404, code: 'not_found' });
    expect(body.requestId).toBeTypeOf('string');
  });

  it('returns 503 when the database is unreachable', async () => {
    vi.spyOn(app.get(PrismaService), 'ping').mockRejectedValueOnce(new Error('connection refused'));

    await request(app.getHttpServer())
      .get('/health')
      .expect('content-type', /^application\/json/)
      .expect(503, { status: 'ok', db: 'error' });
  });
});
