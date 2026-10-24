import { isHealthy, type HealthResponse, type ServiceStatus } from '@crm/shared';
import { Controller, Get, Logger, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 200 when everything is ok, 503 with the same body shape otherwise. */
  @Get()
  async check(): Promise<HealthResponse> {
    const db: ServiceStatus = await this.prisma.ping().then(
      () => 'ok',
      (error: unknown) => {
        this.logger.warn(`Database ping failed: ${String(error)}`);
        return 'error';
      },
    );
    const health: HealthResponse = { status: 'ok', db };
    if (!isHealthy(health)) {
      throw new ServiceUnavailableException(health);
    }
    return health;
  }
}
