import {
  CONTACT_SEARCH_MAX_LENGTH as SEARCH_MAX_LENGTH,
  CONTACT_SORT_VALUES,
  CONTACT_TYPES,
  OWNER_ME,
} from '@crm/shared';
import { z } from 'zod';

/**
 * Search params of `/contacts` (slice 1.4): the values of `GET /contacts` the page uses. A bad
 * value in a hand-edited URL is dropped instead of failing the page.
 */
export const contactsSearch = z.object({
  page: z.number().int().min(1).optional().catch(undefined),
  // Same limit as the API: a longer search in a hand-edited URL is dropped, not sent.
  q: z.string().max(SEARCH_MAX_LENGTH).optional().catch(undefined),
  type: z.enum(CONTACT_TYPES).optional().catch(undefined),
  companyId: z.uuid().optional().catch(undefined),
  salesperson: z
    .union([z.literal(OWNER_ME), z.uuid()])
    .optional()
    .catch(undefined),
  tag: z.uuid().optional().catch(undefined),
  archived: z.boolean().optional().catch(undefined),
  sort: z.enum(CONTACT_SORT_VALUES).optional().catch(undefined),
});
export type ContactsSearch = z.output<typeof contactsSearch>;

/** Filters that narrow the list (not paging, sorting or the archived view). */
export const hasFilters = (search: ContactsSearch) =>
  Boolean(search.q || search.type || search.companyId || search.salesperson || search.tag);

/** Search params with every filter cleared. */
export const NO_FILTERS = {
  q: undefined,
  type: undefined,
  companyId: undefined,
  salesperson: undefined,
  tag: undefined,
} satisfies Partial<ContactsSearch>;

/** Wait for a pause in typing before searching (slice 1.3: 300 ms). */
export const SEARCH_DEBOUNCE_MS = 300;
