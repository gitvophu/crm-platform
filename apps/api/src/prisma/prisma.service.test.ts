import type { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Env } from '@/config/env.js';
import { PrismaService } from './prisma.service.js';

const config = {
  get: () => 'postgresql://crm:crm@localhost:5432/crm_test',
} as unknown as ConfigService<Env, true>;

describe('PrismaService.ping', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects when the database never answers', async () => {
    vi.useFakeTimers();
    const prisma = new PrismaService(config);
    // A connection that is open but whose server stopped answering (e.g. paused container).
    vi.spyOn(prisma, '$queryRaw').mockReturnValue(new Promise(() => {}) as never);

    const result = expect(prisma.ping()).rejects.toThrow(/did not answer within 2000ms/);
    await vi.advanceTimersByTimeAsync(2000);
    await result;
  });
});
