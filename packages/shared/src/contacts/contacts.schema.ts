import { z } from 'zod';

import { booleanParam, OWNER_ME } from '../http/filters.js';
import { pageQuery } from '../http/page.js';
import {
  CONTACT_FIELD_MAX as MAX,
  CONTACT_SEARCH_MAX_LENGTH,
  CONTACT_SORT_DEFAULT,
  CONTACT_SORT_VALUES,
  CONTACT_STAGE_DEFAULT,
  CONTACT_STAGES,
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
  firstName: z
    .string()
    .trim()
    .min(1, 'Enter a first name.')
    .max(MAX.firstName, tooLong(MAX.firstName)),
  lastName: optionalText(MAX.lastName),
  email,
  phone: optionalText(MAX.phone),
  jobTitle: optionalText(MAX.jobTitle),
  stage: z.enum(CONTACT_STAGES, 'Choose a stage.'),
  notes: optionalText(MAX.notes),
  /** Who looks after the contact; a member can only pick themselves (slice 1.3, Q4). */
  ownerId: z.uuid('Choose an owner.').optional(),
};

/** Body of `POST /contacts`. */
export const createContactInput = z.object({
  ...fields,
  stage: fields.stage.default(CONTACT_STAGE_DEFAULT),
  /** Admins only; everyone else creates in their own team. */
  teamId: z.uuid().optional(),
});
export type CreateContactInput = z.input<typeof createContactInput>;

/** Body of `PATCH /contacts/:id`: only the fields sent change, `null` clears one. */
export const updateContactInput = z.object(fields).partial();
export type UpdateContactInput = z.input<typeof updateContactInput>;

/** Query of `GET /contacts`, also the search params of the web list (slice 1.3, Q7). */
export const contactListQuery = z.object({
  ...pageQuery,
  q: z.string().trim().max(CONTACT_SEARCH_MAX_LENGTH).optional(),
  /** `me` or a user id. */
  owner: z.union([z.literal(OWNER_ME), z.uuid()]).optional(),
  /** One stage, or several separated by commas. */
  stage: z
    .string()
    .transform((value) => value.split(',').filter(Boolean))
    .pipe(z.array(z.enum(CONTACT_STAGES)))
    .optional(),
  archived: booleanParam.optional(),
  sort: z.enum(CONTACT_SORT_VALUES).default(CONTACT_SORT_DEFAULT),
});
export type ContactListQuery = z.output<typeof contactListQuery>;
export type ContactListSearch = z.input<typeof contactListQuery>;
