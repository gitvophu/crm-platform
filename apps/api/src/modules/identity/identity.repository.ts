import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/prisma/prisma.service.js';

const withTeam = { team: true } as const;

/** The only place that reads and writes the `identity` schema (ADR-0003). */
@Injectable()
export class IdentityRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email }, include: withTeam });
  }

  findUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id }, include: withTeam });
  }

  createSession(data: {
    userId: string;
    tokenHash: string;
    idleExpiresAt: Date;
    absoluteExpiresAt: Date;
  }) {
    return this.prisma.session.create({ data, select: { id: true } });
  }

  findSession(id: string) {
    return this.prisma.session.findUnique({ where: { id } });
  }

  /**
   * Replaces the token hash only if it is still `currentHash`, so two concurrent refreshes with
   * the same token cannot both succeed. Returns whether this call rotated the session.
   */
  async rotateSession(
    id: string,
    currentHash: string,
    data: { tokenHash: string; idleExpiresAt: Date; rotatedAt: Date },
  ): Promise<boolean> {
    const { count } = await this.prisma.session.updateMany({
      where: { id, tokenHash: currentHash, revokedAt: null },
      data: { ...data, previousTokenHash: currentHash },
    });
    return count === 1;
  }

  async revokeSession(id: string, at: Date): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: at },
    });
  }

  /** New password hash, and every other session of the user revoked, in one transaction. */
  async changePassword(
    userId: string,
    passwordHash: string,
    keepSessionId: string,
    at: Date,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      this.prisma.session.updateMany({
        where: { userId, id: { not: keepSessionId }, revokedAt: null },
        data: { revokedAt: at },
      }),
    ]);
  }
}
