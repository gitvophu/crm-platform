import type { Role } from '../auth/auth.constants.js';

/** A user as other features show it (owner of a record, member of a team). */
export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: Role;
  team: { id: string; name: string };
}
