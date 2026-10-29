import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, it, vi } from 'vitest';

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
    await request(app.getHttpServer()).get('/health').expect(200, { status: 'ok', db: 'ok' });
  });

  it('returns 503 when the database is unreachable', async () => {
    vi.spyOn(app.get(PrismaService), 'ping').mockRejectedValueOnce(new Error('connection refused'));

    await request(app.getHttpServer()).get('/health').expect(503, { status: 'ok', db: 'error' });
  });
});
