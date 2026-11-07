import type { Role } from './auth.constants.js';

/** The signed-in user: response of `POST /auth/login` and `GET /auth/me`. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  team: { id: string; name: string };
}
