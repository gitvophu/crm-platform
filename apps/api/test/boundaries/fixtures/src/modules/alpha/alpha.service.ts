import { PrismaService } from '@/prisma/prisma.service.js'; // ✗ boundaries/dependencies

import { BetaRepository } from '../beta/beta.repository.js'; // ✗ boundaries/dependencies
import { BetaService } from '../beta/index.js'; // ✗ import-x/no-cycle
import { AlphaRepository } from './alpha.repository.js';

export class AlphaService {
  constructor(
    readonly repository: AlphaRepository,
    readonly beta: BetaService,
    readonly betaRepository: BetaRepository,
    readonly prisma: PrismaService,
  ) {}
}
