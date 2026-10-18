import { describe, expect, it } from 'vitest';

import { isHealthy } from './index.js';

describe('isHealthy', () => {
  it('is true when API and DB are both ok', () => {
    expect(isHealthy({ status: 'ok', db: 'ok' })).toBe(true);
  });

  it('is false when the DB is down', () => {
    expect(isHealthy({ status: 'ok', db: 'error' })).toBe(false);
  });
});
