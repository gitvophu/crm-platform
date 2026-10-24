import { describe, expect, it } from 'vitest';

import { validateEnv } from './env.js';

const valid = { DATABASE_URL: 'postgresql://crm:crm@postgres:5432/crm' };

describe('validateEnv', () => {
  it('defaults PORT to 3000', () => {
    expect(validateEnv(valid)).toEqual({ ...valid, PORT: 3000 });
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

  it('rejects an invalid PORT', () => {
    expect(() => validateEnv({ ...valid, PORT: 'abc' })).toThrow(/PORT/);
  });
});
