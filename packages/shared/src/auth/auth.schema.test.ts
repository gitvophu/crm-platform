import { describe, expect, it } from 'vitest';

import { changePasswordInput, loginInput } from './auth.schema.js';

describe('loginInput', () => {
  it('trims and lowercases the email', () => {
    expect(loginInput.parse({ email: '  Linh@Nova.TEST ', password: 'x' })).toEqual({
      email: 'linh@nova.test',
      password: 'x',
    });
  });

  it('reports empty fields', () => {
    const result = loginInput.safeParse({ email: '', password: '' });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      'Enter your email.',
      'Enter your password.',
    ]);
  });

  it('rejects an invalid email', () => {
    expect(loginInput.safeParse({ email: 'linh', password: 'x' }).error?.issues[0]?.message).toBe(
      'Enter a valid email.',
    );
  });
});

describe('changePasswordInput', () => {
  it('requires at least 8 characters', () => {
    const result = changePasswordInput.safeParse({ currentPassword: 'old', newPassword: 'short' });

    expect(result.error?.issues[0]).toMatchObject({
      path: ['newPassword'],
      message: 'Use at least 8 characters.',
    });
  });

  it('rejects the current password as the new one', () => {
    const result = changePasswordInput.safeParse({
      currentPassword: 'same-password',
      newPassword: 'same-password',
    });

    expect(result.error?.issues[0]?.path).toEqual(['newPassword']);
  });
});
