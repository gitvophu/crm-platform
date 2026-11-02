import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from './password.js';

describe('password', () => {
  it('hashes with argon2id and verifies', async () => {
    const passwordHash = await hashPassword('correct horse');

    expect(passwordHash).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword(passwordHash, 'correct horse')).resolves.toBe(true);
    await expect(verifyPassword(passwordHash, 'wrong horse')).resolves.toBe(false);
  });
});
