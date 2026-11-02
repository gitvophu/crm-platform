import type { Role } from '@crm/shared';
import type { Request } from 'express';

/** Claims of the access token (ADR-0004). */
export interface AccessTokenPayload {
  /** User id. */
  sub: string;
  /** Session id, to tell this sign-in from the user's other ones. */
  sid: string;
  role: Role;
  teamId: string;
}

/** The caller of a request, read from the access token only (no DB lookup, slice 1.2, Q2). */
export interface SessionUser {
  id: string;
  sessionId: string;
  role: Role;
  teamId: string;
}

export interface AuthenticatedRequest extends Request {
  user?: SessionUser;
}
