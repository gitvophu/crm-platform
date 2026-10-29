import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';

import type { Env } from '@/config/env.js';
import { PrismaClient } from '@/generated/prisma/client.js';

const PING_TIMEOUT_MS = 2000;

/**
 * Infrastructure only. Inside `src/modules/<module>/`, only `*.repository.ts` may inject this,
 * and only for models of that module's schema (ADR-0003).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService<Env, true>) {
    super({
      adapter: new PrismaPg({
        connectionString: config.get('DATABASE_URL', { infer: true }),
        // Without a timeout, a request waits forever when the database is unreachable.
        connectionTimeoutMillis: 2000,
      }),
    });
  }

  /** Throws when the database is unreachable or does not answer within the timeout. */
  async ping(): Promise<void> {
    // connectionTimeoutMillis does not cover an open connection whose server stopped answering.
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Database did not answer within ${PING_TIMEOUT_MS}ms`)),
        PING_TIMEOUT_MS,
      );
    });
    try {
      await Promise.race([this.$queryRaw`SELECT 1`, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
