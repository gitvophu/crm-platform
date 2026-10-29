import type { PrismaClient } from '@/generated/prisma/client.js';
import { PrismaService } from '@/prisma/prisma.service.js';

export class AlphaRepository {
  constructor(readonly prisma: PrismaService) {}

  client(): PrismaClient {
    return this.prisma;
  }
}
