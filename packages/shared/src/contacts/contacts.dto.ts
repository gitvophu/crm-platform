import type { ContactType, CountryCode } from './contacts.constants.js';

export interface ContactTagDto {
  id: string;
  name: string;
  /** Index into the tag palette of the web, `0`..`CONTACT_TAG_COLOR_COUNT - 1`. */
  color: number;
}

export interface IndustryDto {
  id: string;
  name: string;
}

/** A company or a person (`res.partner` of Odoo, slice 1.4). */
export interface ContactDto {
  id: string;
  type: ContactType;
  name: string;
  /** The company of a person; always null for a company. */
  company: { id: string; name: string; archived: boolean } | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  /** People only. */
  jobTitle: string | null;
  street: string | null;
  city: string | null;
  countryCode: CountryCode | null;
  taxId: string | null;
  industry: IndustryDto | null;
  tags: ContactTagDto[];
  /** Who looks after the contact at Nova; a user of identity. */
  salesperson: { id: string; name: string } | null;
  notes: string | null;
  /** Active people of a company; null for a person. */
  peopleCount: number | null;
  /** ISO 8601; null while active. */
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
