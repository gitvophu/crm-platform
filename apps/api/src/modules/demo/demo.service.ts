import { PrismaService } from '@/prisma/prisma.service.js';

// Deliberate boundary violation to see CI fail (slice 0.6). Reverted right after.
export class DemoService {
  constructor(readonly prisma: PrismaService) {}
}
