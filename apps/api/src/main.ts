import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { pino } from 'pino';

import { AppModule } from './app.module.js';
import type { Env } from './config/env.js';

try {
  // Buffer startup logs until the pino logger is in place, so every line is JSON. On a startup
  // failure Nest would print the buffer and the error as text (`abortOnError`, `autoFlushLogs`);
  // instead the error is thrown to the catch below.
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    abortOnError: false,
    autoFlushLogs: false,
  });
  app.useLogger(app.get(Logger));
  app.flushLogs();
  // Closes the Prisma connection pool on SIGTERM (`docker compose down`).
  app.enableShutdownHooks();

  const config = app.get<ConfigService<Env, true>>(ConfigService);
  await app.listen(config.get('PORT', { infer: true }));
} catch (error) {
  // No app logger yet (e.g. invalid env): log the failure as JSON with a standalone pino.
  pino().fatal({ err: error }, 'Failed to start the application');
  process.exitCode = 1;
}
