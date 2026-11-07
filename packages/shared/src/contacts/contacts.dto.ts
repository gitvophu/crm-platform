import type { ContactStage } from './contacts.constants.js';

export interface ContactDto {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  stage: ContactStage;
  notes: string | null;
  owner: { id: string; name: string };
  team: { id: string; name: string };
  /** ISO 8601; null while active. */
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Computed by the API from the caller's role; the web only reads it. */
  permissions: { canEdit: boolean };
}
