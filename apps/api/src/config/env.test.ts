import { describe, expect, it } from 'vitest';

import { validateEnv } from './env.js';

const valid = {
  DATABASE_URL: 'postgresql://crm:crm@postgres:5432/crm',
  JWT_SECRET: 'a'.repeat(32),
};

describe('validateEnv', () => {
  it('defaults PORT, LOG_LEVEL and COOKIE_SECURE', () => {
    expect(validateEnv(valid)).toEqual({
      ...valid,
      PORT: 3000,
      LOG_LEVEL: 'info',
      COOKIE_SECURE: true,
    });
  });

  it('coerces PORT from string', () => {
    expect(validateEnv({ ...valid, PORT: '8080' }).PORT).toBe(8080);
  });

  it('names the missing variable', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('rejects a non-postgres URL', () => {
    expect(() => validateEnv({ DATABASE_URL: 'mysql://localhost/crm' })).toThrow(/DATABASE_URL/);
  });

  it('rejects an unknown LOG_LEVEL', () => {
    expect(() => validateEnv({ ...valid, LOG_LEVEL: 'verbose' })).toThrow(/LOG_LEVEL/);
  });

  it('rejects a JWT_SECRET shorter than 32 characters', () => {
    expect(() => validateEnv({ ...valid, JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  });

  it('reads COOKIE_SECURE=false', () => {
    expect(validateEnv({ ...valid, COOKIE_SECURE: 'false' }).COOKIE_SECURE).toBe(false);
  });

  it('rejects an invalid PORT', () => {
    expect(() => validateEnv({ ...valid, PORT: 'abc' })).toThrow(/PORT/);
  });
});
