import { z } from 'zod';

export const ROLES = ['admin', 'manager', 'member'] as const;
export type Role = (typeof ROLES)[number];

/** NIST SP 800-63B: length only, no composition rules (slice 1.2). */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

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

/** The signed-in user: response of `POST /auth/login` and `GET /auth/me`. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  team: { id: string; name: string };
}
