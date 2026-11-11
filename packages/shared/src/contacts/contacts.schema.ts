import { z } from 'zod';

import { booleanParam, OWNER_ME } from '../http/filters.js';
import { pageQuery } from '../http/page.js';
import {
  CONTACT_ARCHIVED_ALL,
  CONTACT_FIELD_MAX as MAX,
  CONTACT_SEARCH_MAX_LENGTH,
  CONTACT_SORT_DEFAULT,
  CONTACT_SORT_VALUES,
  CONTACT_TAG_NAME_MAX,
  CONTACT_TAGS_MAX,
  CONTACT_TYPES,
  COUNTRY_CODES,
  COUNTRY_DEFAULT,
} from './contacts.constants.js';

const tooLong = (max: number) => `Use at most ${max} characters.`;

/** Optional text: trimmed, empty means "no value" (null). `undefined` means "not sent". */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, tooLong(max))
    .transform((value) => value || null)
    .nullish();

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(MAX.email, tooLong(MAX.email))
  .refine((value) => value === '' || z.email().safeParse(value).success, 'Enter a valid email.')
  .transform((value) => value || null)
  .nullish();

const fields = {
  type: z.enum(CONTACT_TYPES, 'Choose company or person.'),
  name: z.string().trim().min(1, 'Enter a name.').max(MAX.name, tooLong(MAX.name)),
  /** People only: their company (slice 1.4). */
  companyId: z.uuid('Choose a company.').nullish(),
  email,
  phone: optionalText(MAX.phone),
  website: optionalText(MAX.website),
  jobTitle: optionalText(MAX.jobTitle),
  street: optionalText(MAX.street),
  city: optionalText(MAX.city),
  countryCode: z.enum(COUNTRY_CODES, 'Choose a country.').nullish(),
  taxId: optionalText(MAX.taxId),
  industryId: z.uuid('Choose an industry.').nullish(),
  /** The full list of tags; duplicates are dropped. */
  tagIds: z
    .array(z.uuid())
    .max(CONTACT_TAGS_MAX, `Use at most ${CONTACT_TAGS_MAX} tags.`)
    .transform((ids) => [...new Set(ids)]),
  salespersonId: z.uuid('Choose a salesperson.').nullish(),
  notes: optionalText(MAX.notes),
};

/** Body of `POST /contacts`. */
export const createContactInput = z.object({
  ...fields,
  countryCode: fields.countryCode.default(COUNTRY_DEFAULT),
  tagIds: fields.tagIds.default([]),
});
export type CreateContactInput = z.input<typeof createContactInput>;

/** Body of `PATCH /contacts/:id`: only the fields sent change, `null` clears one. */
export const updateContactInput = z.object(fields).partial();
export type UpdateContactInput = z.input<typeof updateContactInput>;

/** Query of `GET /contacts`, also the search params of the web list (slice 1.4). */
export const contactListQuery = z.object({
  ...pageQuery,
  /** Words found in the name, email or phone. */
  q: z.string().trim().max(CONTACT_SEARCH_MAX_LENGTH).optional(),
  type: z.enum(CONTACT_TYPES).optional(),
  /** People of one company. */
  companyId: z.uuid().optional(),
  /** `me` or a user id. */
  salesperson: z.union([z.literal(OWNER_ME), z.uuid()]).optional(),
  tag: z.uuid().optional(),
  /** Exact match, for the duplicate email check of the form. */
  email: z.string().trim().toLowerCase().max(MAX.email).optional(),
  /** `true`: archived only; `all`: both; absent or `false`: active only. */
  archived: z.union([z.literal(CONTACT_ARCHIVED_ALL), booleanParam]).optional(),
  sort: z.enum(CONTACT_SORT_VALUES).default(CONTACT_SORT_DEFAULT),
});
export type ContactListQuery = z.output<typeof contactListQuery>;
export type ContactListSearch = z.input<typeof contactListQuery>;

/** Body of `POST /contacts/tags`: an existing tag of the same name is returned instead. */
export const createContactTagInput = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a tag.')
    .max(CONTACT_TAG_NAME_MAX, tooLong(CONTACT_TAG_NAME_MAX)),
});
export type CreateContactTagInput = z.input<typeof createContactTagInput>;

/** Query of `GET /contacts/tags`. */
export const contactTagListQuery = z.object({
  q: z.string().trim().max(CONTACT_TAG_NAME_MAX).optional(),
});
export type ContactTagListQuery = z.output<typeof contactTagListQuery>;
