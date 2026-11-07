import {
  CONTACT_SEARCH_MAX_LENGTH as SEARCH_MAX_LENGTH,
  CONTACT_SORT_VALUES,
  CONTACT_STAGES,
  OWNER_ME,
} from '@crm/shared';
import { z } from 'zod';

/**
 * Search params of `/contacts` (slice 1.3, Q7): the values of `GET /contacts` the page uses, one
 * stage at a time. A bad value in a hand-edited URL is dropped instead of failing the page.
 */
export const contactsSearch = z.object({
  page: z.number().int().min(1).optional().catch(undefined),
  // Same limit as the API: a longer search in a hand-edited URL is dropped, not sent.
  q: z.string().max(SEARCH_MAX_LENGTH).optional().catch(undefined),
  owner: z
    .union([z.literal(OWNER_ME), z.uuid()])
    .optional()
    .catch(undefined),
  stage: z.enum(CONTACT_STAGES).optional().catch(undefined),
  archived: z.boolean().optional().catch(undefined),
  sort: z.enum(CONTACT_SORT_VALUES).optional().catch(undefined),
});
export type ContactsSearch = z.output<typeof contactsSearch>;

/** Filters that narrow the list (not paging or sorting). */
export const hasFilters = (search: ContactsSearch) =>
  Boolean(search.q || search.owner || search.stage);
