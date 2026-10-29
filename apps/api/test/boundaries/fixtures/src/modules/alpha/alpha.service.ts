import type { PrismaClient } from '@/generated/prisma/client.js';
import { PrismaService } from '@/prisma/prisma.service.js'; // ✗ prisma

import { BetaRepository } from '../beta/beta.repository.js'; // ✗ public-api
import { BetaService } from '../beta/index.js'; // ✗ cycle
import { AlphaRepository } from './alpha.repository.js';

export class AlphaService {
  constructor(
    readonly repository: AlphaRepository,
    readonly beta: BetaService,
    readonly betaRepository: BetaRepository,
    readonly prisma: PrismaService,
  ) {}

  client?: PrismaClient;
}
