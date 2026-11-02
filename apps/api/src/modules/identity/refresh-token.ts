import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SECRET = /^[\w-]{43}$/;

/**
 * Refresh token = `<session id>.<secret>` (ADR-0004). The id finds the session; the database keeps
 * only the SHA-256 of the secret, so a leaked table cannot be replayed.
 */
export function newRefreshSecret(): string {
  return randomBytes(32).toString('base64url');
}

export function hashRefreshSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

export function formatRefreshToken(sessionId: string, secret: string): string {
  return `${sessionId}.${secret}`;
}

export function parseRefreshToken(token: string): { sessionId: string; secret: string } | null {
  const [sessionId, secret, ...rest] = token.split('.');
  if (rest.length > 0 || !sessionId || !secret) return null;
  if (!UUID.test(sessionId) || !SECRET.test(secret)) return null;
  return { sessionId, secret };
}

/** Constant-time comparison of two hex SHA-256 hashes. */
export function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}
