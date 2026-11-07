import { type SortValue, sortValues, toSort } from '../http/sort.js';

export const CONTACT_STAGES = ['lead', 'prospect', 'customer', 'churned'] as const;
export type ContactStage = (typeof CONTACT_STAGES)[number];
/** Stage of a new contact when none is picked. */
export const CONTACT_STAGE_DEFAULT: ContactStage = 'lead';

/** Longest value of each text field, in characters. */
export const CONTACT_FIELD_MAX = {
  firstName: 100,
  lastName: 100,
  /** RFC 5321 limit of an address. */
  email: 254,
  phone: 50,
  jobTitle: 100,
  notes: 5000,
} as const;

export const CONTACT_SORTS = ['name', 'email', 'stage', 'createdAt', 'updatedAt'] as const;
export type ContactSortField = (typeof CONTACT_SORTS)[number];
export type ContactSort = SortValue<ContactSortField>;
/** Every accepted `sort`: a column, or `-column` for descending. */
export const CONTACT_SORT_VALUES = sortValues(CONTACT_SORTS);
/** Recently changed first. */
export const CONTACT_SORT_DEFAULT: ContactSort = toSort('updatedAt', true);

export const CONTACT_SEARCH_MAX_LENGTH = 100;
