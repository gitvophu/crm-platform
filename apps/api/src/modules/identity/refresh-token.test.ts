import { describe, expect, it } from 'vitest';

import {
  formatRefreshToken,
  hashRefreshSecret,
  newRefreshSecret,
  parseRefreshToken,
  sameHash,
} from './refresh-token.js';

const SESSION_ID = '019a3c1e-7a4b-7c3d-9e2f-0123456789ab';

describe('refresh token', () => {
  it('round-trips through format and parse', () => {
    const secret = newRefreshSecret();

    expect(parseRefreshToken(formatRefreshToken(SESSION_ID, secret))).toEqual({
      sessionId: SESSION_ID,
      secret,
    });
  });

  it.each(['', 'abc', `${SESSION_ID}`, `${SESSION_ID}.short`, `not-a-uuid.${newRefreshSecret()}`])(
    'rejects malformed token %j',
    (token) => {
      expect(parseRefreshToken(token)).toBeNull();
    },
  );

  it('compares hashes', () => {
    const hash = hashRefreshSecret('secret');

    expect(sameHash(hash, hashRefreshSecret('secret'))).toBe(true);
    expect(sameHash(hash, hashRefreshSecret('other'))).toBe(false);
    expect(sameHash(hash, '')).toBe(false);
  });
});
