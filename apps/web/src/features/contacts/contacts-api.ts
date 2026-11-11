import {
  CONTACT_ARCHIVED_ALL,
  CONTACT_PICKER_SIZE,
  type ContactDto,
  type ContactListSearch,
  type ContactTagDto,
  type CreateContactInput,
  type IndustryDto,
  type Page,
  type UpdateContactInput,
} from '@crm/shared';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import { api } from '@/lib/api';

/** Industries and tags change rarely (seeded, or added from a form). */
const LOOKUP_STALE_MS = 5 * 60_000;
/** Contacts sharing an email shown under the Email field (slice 1.4, Q3). */
export const DUPLICATES_SHOWN = 3;
/** People listed on a company page; more are one click away in the filtered list. */
export const COMPANY_PEOPLE_SHOWN = 50;

/** `?page=2&type=company`: query string of a `GET`, without empty values. */
function toQuery(params: object): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}

const path = (id: string) => `/contacts/${encodeURIComponent(id)}`;

/** One function per endpoint of `/contacts` (convention from slice 1.3). */
export const contactsApi = {
  list: (search: ContactListSearch) => api<Page<ContactDto>>(`/contacts${toQuery(search)}`),
  get: (id: string) => api<ContactDto>(path(id)),
  create: (input: CreateContactInput) =>
    api<ContactDto>('/contacts', { method: 'POST', json: input }),
  update: (id: string, input: UpdateContactInput) =>
    api<ContactDto>(path(id), { method: 'PATCH', json: input }),
  archive: (id: string) => api<ContactDto>(`${path(id)}/archive`, { method: 'POST' }),
  restore: (id: string) => api<ContactDto>(`${path(id)}/restore`, { method: 'POST' }),
  industries: () => api<IndustryDto[]>('/contacts/industries'),
  tags: (q?: string) => api<ContactTagDto[]>(`/contacts/tags${toQuery({ q })}`),
  createTag: (name: string) =>
    api<ContactTagDto>('/contacts/tags', { method: 'POST', json: { name } }),
};

/** Every query under `['contacts']`: invalidate that key after any change. */
export const contactQueries = {
  all: ['contacts'] as const,
  list: (search: ContactListSearch) =>
    queryOptions({
      queryKey: ['contacts', 'list', search],
      queryFn: () => contactsApi.list(search),
      // Keep the current page on screen while the next one (filter, sort, page) loads.
      placeholderData: keepPreviousData,
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: ['contacts', 'detail', id],
      queryFn: () => contactsApi.get(id),
    }),
  /** Active companies whose name, email or phone matches: the company picker. */
  companies: (q: string) =>
    contactQueries.list({
      type: 'company',
      q: q || undefined,
      pageSize: CONTACT_PICKER_SIZE,
      sort: 'name',
    }),
  /** Active people of a company, by name. */
  people: (companyId: string) =>
    contactQueries.list({ companyId, pageSize: COMPANY_PEOPLE_SHOWN, sort: 'name' }),
  /** Contacts, archived ones too, already using `email`. */
  duplicates: (email: string) =>
    queryOptions({
      queryKey: ['contacts', 'duplicates', email],
      queryFn: () =>
        // One more than shown: the contact being edited may be among them.
        contactsApi.list({ email, archived: CONTACT_ARCHIVED_ALL, pageSize: DUPLICATES_SHOWN + 1 }),
    }),
  industries: () =>
    queryOptions({
      queryKey: ['contacts', 'industries'],
      queryFn: contactsApi.industries,
      staleTime: LOOKUP_STALE_MS,
    }),
  /** Every tag (filter), or the ones matching `q` (tag picker). */
  tags: (q?: string) =>
    queryOptions({
      queryKey: ['contacts', 'tags', q ?? ''],
      queryFn: () => contactsApi.tags(q),
      staleTime: LOOKUP_STALE_MS,
    }),
};
