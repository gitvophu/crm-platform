import { z } from 'zod';

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './auth.constants.js';

const email = z
  .string()
  .trim()
  .min(1, 'Enter your email.')
  .toLowerCase()
  .pipe(z.email('Enter a valid email.'));

/** Body of `POST /auth/login`. */
export const loginInput = z.object({
  email,
  // Any length: a stored password may predate the current rules; only an upper bound for argon2.
  password: z.string().min(1, 'Enter your password.').max(PASSWORD_MAX_LENGTH),
});
export type LoginInput = z.input<typeof loginInput>;

/** Body of `POST /auth/change-password`. */
export const changePasswordInput = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.').max(PASSWORD_MAX_LENGTH),
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
      .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters.`),
  })
  .refine((input) => input.newPassword !== input.currentPassword, {
    path: ['newPassword'],
    message: 'Choose a password different from the current one.',
  });
export type ChangePasswordInput = z.input<typeof changePasswordInput>;
