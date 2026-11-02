import type { CookieOptions, Request, Response } from 'express';

export const ACCESS_COOKIE = 'crm_access';
export const REFRESH_COOKIE = 'crm_refresh';

// Paths as the browser sees them, through the `/api` proxy (ADR-0004). The refresh token only
// goes to the auth endpoints. `secure` comes from COOKIE_SECURE (env.ts).
const accessOptions = (secure: boolean): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  secure,
  path: '/api',
});
const refreshOptions = (secure: boolean): CookieOptions => ({
  ...accessOptions(secure),
  path: '/api/auth',
});

export interface IssuedTokens {
  accessToken: string;
  accessExpiresAt: Date;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export function setAuthCookies(res: Response, tokens: IssuedTokens, secure: boolean): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...accessOptions(secure),
    expires: tokens.accessExpiresAt,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...refreshOptions(secure),
    expires: tokens.refreshExpiresAt,
  });
}

export function clearAuthCookies(res: Response, secure: boolean): void {
  res.clearCookie(ACCESS_COOKIE, accessOptions(secure));
  res.clearCookie(REFRESH_COOKIE, refreshOptions(secure));
}

/** A cookie parsed by cookie-parser (see IdentityModule), or undefined. */
export function readCookie(req: Request, name: string): string | undefined {
  const value = (req.cookies as Record<string, unknown> | undefined)?.[name];
  return typeof value === 'string' ? value : undefined;
}
