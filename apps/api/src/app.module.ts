import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnv } from './config/env.js';
import { HealthModule } from './health/health.module.js';
import { LoggingModule } from './logging/logging.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    // Env comes from docker compose (`env_file: .env`), so there is no .env file to load here.
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, validate: validateEnv }),
    LoggingModule,
    PrismaModule,
    HealthModule,
  ],
})
export class AppModule {}
