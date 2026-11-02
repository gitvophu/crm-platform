import type { AuthUser, ChangePasswordInput, LoginInput } from '@crm/shared';
import { ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';

import type { Team, User } from '@/generated/prisma/client.js';
import type { IssuedTokens } from './auth.cookies.js';
import type { AccessTokenPayload, SessionUser } from './auth.types.js';
import { IdentityRepository } from './identity.repository.js';
import { hashPassword, verifyPassword } from './password.js';
import {
  formatRefreshToken,
  hashRefreshSecret,
  newRefreshSecret,
  parseRefreshToken,
  sameHash,
} from './refresh-token.js';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

// Lifetimes (ADR-0004, slice 1.2 Q1 and Q5).
export const ACCESS_TOKEN_TTL_MS = 15 * MINUTE;
export const SESSION_IDLE_TTL_MS = 7 * DAY;
export const SESSION_ABSOLUTE_TTL_MS = 30 * DAY;
/** Reusing the token a rotation just replaced is a race (parallel requests, tabs), not a theft. */
export const REFRESH_REUSE_GRACE_MS = 30_000;

const INVALID_CREDENTIALS = 'Invalid email or password';

/**
 * The refresh lost a race with another refresh of the same session (parallel requests, tabs).
 * The session is fine and the winner's response sets the new cookies, so this 401 must not
 * clear them.
 */
export class StaleRefreshError extends UnauthorizedException {}

type UserWithTeam = User & { team: Team };

function toAuthUser(user: UserWithTeam): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    team: { id: user.team.id, name: user.team.name },
  };
}

const earliest = (a: Date, b: Date) => (a < b ? a : b);

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  /** Verified against when the email is unknown, so both failures take the same time. */
  private dummyHash: Promise<string> | undefined;

  constructor(
    private readonly repository: IdentityRepository,
    private readonly jwt: JwtService,
  ) {}

  async login(input: LoginInput): Promise<{ user: AuthUser; tokens: IssuedTokens }> {
    const user = await this.repository.findUserByEmail(input.email);
    // Lazy: a hashing failure surfaces here as a 500, not as an unhandled rejection at startup.
    this.dummyHash ??= hashPassword(randomBytes(16).toString('hex'));
    const valid = await verifyPassword(
      user?.passwordHash ?? (await this.dummyHash),
      input.password,
    );
    if (!user || !valid) throw new UnauthorizedException(INVALID_CREDENTIALS);

    const now = Date.now();
    const absoluteExpiresAt = new Date(now + SESSION_ABSOLUTE_TTL_MS);
    const idleExpiresAt = earliest(new Date(now + SESSION_IDLE_TTL_MS), absoluteExpiresAt);
    const secret = newRefreshSecret();
    const session = await this.repository.createSession({
      userId: user.id,
      tokenHash: hashRefreshSecret(secret),
      idleExpiresAt,
      absoluteExpiresAt,
    });
    this.logger.log(`User ${user.id} signed in (session ${session.id})`);
    return {
      user: toAuthUser(user),
      tokens: await this.issueTokens(user, session.id, secret, idleExpiresAt),
    };
  }

  /**
   * Rotates the refresh token and issues a new access token. Throws 401 if it cannot:
   * `StaleRefreshError` when another refresh just rotated it, a plain 401 when the session is over.
   */
  async refresh(refreshToken: string | undefined): Promise<IssuedTokens> {
    const parsed = refreshToken ? parseRefreshToken(refreshToken) : null;
    if (!parsed) throw new UnauthorizedException();
    const session = await this.repository.findSession(parsed.sessionId);
    const now = new Date();
    if (
      !session ||
      session.revokedAt ||
      session.idleExpiresAt <= now ||
      session.absoluteExpiresAt <= now
    ) {
      throw new UnauthorizedException();
    }

    const hash = hashRefreshSecret(parsed.secret);
    if (!sameHash(hash, session.tokenHash)) {
      const isPrevious =
        session.previousTokenHash !== null && sameHash(hash, session.previousTokenHash);
      // A secret we never issued proves nothing (anyone who knows a session id can make one up),
      // so it must not be able to end someone's session.
      if (!isPrevious) throw new UnauthorizedException();
      const justRotated =
        session.rotatedAt !== null &&
        now.getTime() - session.rotatedAt.getTime() < REFRESH_REUSE_GRACE_MS;
      if (justRotated) throw new StaleRefreshError();
      // The token a rotation replaced came back later: someone else may hold the session.
      await this.repository.revokeSession(session.id, now);
      this.logger.warn(`Refresh token reused; session ${session.id} revoked`);
      throw new UnauthorizedException();
    }

    const user = await this.repository.findUserById(session.userId);
    if (!user) throw new UnauthorizedException();
    const secret = newRefreshSecret();
    const idleExpiresAt = earliest(
      new Date(now.getTime() + SESSION_IDLE_TTL_MS),
      session.absoluteExpiresAt,
    );
    const rotated = await this.repository.rotateSession(session.id, session.tokenHash, {
      tokenHash: hashRefreshSecret(secret),
      idleExpiresAt,
      rotatedAt: now,
    });
    // A concurrent refresh with the same token won the race; its response carries the new cookies.
    if (!rotated) throw new StaleRefreshError();
    return this.issueTokens(user, session.id, secret, idleExpiresAt);
  }

  /** Revokes the session of this refresh token. A token that does not match is ignored. */
  async logout(refreshToken: string | undefined): Promise<void> {
    const parsed = refreshToken ? parseRefreshToken(refreshToken) : null;
    if (!parsed) return;
    const session = await this.repository.findSession(parsed.sessionId);
    if (!session) return;
    const hash = hashRefreshSecret(parsed.secret);
    const matches =
      sameHash(hash, session.tokenHash) ||
      (session.previousTokenHash !== null && sameHash(hash, session.previousTokenHash));
    if (matches) await this.repository.revokeSession(session.id, new Date());
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.repository.findUserById(userId);
    if (!user) throw new UnauthorizedException();
    return toAuthUser(user);
  }

  /** Keeps the caller's session; every other session of the user is revoked (slice 1.2, Q11). */
  async changePassword(caller: SessionUser, input: ChangePasswordInput): Promise<void> {
    const user = await this.repository.findUserById(caller.id);
    if (!user) throw new UnauthorizedException();
    // 403, not 401: the caller is signed in, and a 401 would make the web refresh and retry.
    if (!(await verifyPassword(user.passwordHash, input.currentPassword))) {
      throw new ForbiddenException('Current password is incorrect');
    }
    await this.repository.changePassword(
      user.id,
      await hashPassword(input.newPassword),
      caller.sessionId,
      new Date(),
    );
    this.logger.log(`User ${user.id} changed password; other sessions revoked`);
  }

  private async issueTokens(
    user: User,
    sessionId: string,
    secret: string,
    refreshExpiresAt: Date,
  ): Promise<IssuedTokens> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      sid: sessionId,
      role: user.role,
      teamId: user.teamId,
    };
    return {
      accessToken: await this.jwt.signAsync(payload),
      accessExpiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_MS),
      refreshToken: formatRefreshToken(sessionId, secret),
      refreshExpiresAt,
    };
  }
}
