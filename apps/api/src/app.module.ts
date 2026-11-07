import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';

import { validateEnv } from './config/env.js';
import { ProblemDetailsFilter } from './errors/problem-details.filter.js';
import { HealthModule } from './health/health.module.js';
import { LoggingModule } from './logging/logging.module.js';
import { ContactsModule } from './modules/contacts/index.js';
import { IdentityModule } from './modules/identity/index.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    // Env comes from docker compose (`env_file: .env`), so there is no .env file to load here.
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, validate: validateEnv }),
    LoggingModule,
    PrismaModule,
    HealthModule,
    IdentityModule,
    ContactsModule,
  ],
  // Every error response is problem+json (slice 1.3, Q5).
  providers: [{ provide: APP_FILTER, useClass: ProblemDetailsFilter }],
})
export class AppModule {}
