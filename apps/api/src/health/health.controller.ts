import { isHealthy, type HealthResponse, type ServiceStatus } from '@crm/shared';
import { Controller, Get, HttpStatus, Logger, Res } from '@nestjs/common';
import type { Response } from 'express';

import { Public } from '@/modules/identity/index.js';
import { PrismaService } from '@/prisma/prisma.service.js';

// Polled by the compose healthcheck and the web status, signed in or not.
@Public()
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 200 when everything is ok, 503 with the same body shape otherwise. */
  @Get()
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthResponse> {
    const db: ServiceStatus = await this.prisma.ping().then(
      () => 'ok',
      (error: unknown) => {
        this.logger.warn(`Database ping failed: ${String(error)}`);
        return 'error';
      },
    );
    const health: HealthResponse = { status: 'ok', db };
    // A plain 503 with the same body, not an exception: the web reads it, and the problem+json
    // filter would replace it.
    if (!isHealthy(health)) res.status(HttpStatus.SERVICE_UNAVAILABLE);
    return health;
  }
}
