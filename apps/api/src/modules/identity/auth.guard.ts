import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

import { ACCESS_COOKIE, readCookie } from './auth.cookies.js';
import { IS_PUBLIC_KEY } from './auth.decorators.js';
import type { AccessTokenPayload, AuthenticatedRequest } from './auth.types.js';

/**
 * Global guard: every route needs a valid access token unless it is `@Public()`. Trusts the token
 * alone, no DB lookup (slice 1.2, Q2), so a revoked session keeps access until the token expires.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = readCookie(req, ACCESS_COOKIE);
    if (!token) throw new UnauthorizedException();

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }
    req.user = {
      id: payload.sub,
      sessionId: payload.sid,
      role: payload.role,
      teamId: payload.teamId,
    };
    return true;
  }
}
