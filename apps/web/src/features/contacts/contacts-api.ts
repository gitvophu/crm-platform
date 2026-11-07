import type { ContactDto, CreateContactInput, Page, UpdateContactInput } from '@crm/shared';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import { api } from '@/lib/api';
import type { ContactsSearch } from './contacts-search';

/** `?page=2&stage=lead`: query string of `GET /contacts`, without empty values. */
function toQuery(search: ContactsSearch): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === '' || value === false) continue;
    params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

const path = (id: string) => `/contacts/${encodeURIComponent(id)}`;

/** One function per endpoint of `/contacts` (convention from slice 1.3). */
export const contactsApi = {
  list: (search: ContactsSearch) => api<Page<ContactDto>>(`/contacts${toQuery(search)}`),
  get: (id: string) => api<ContactDto>(path(id)),
  create: (input: CreateContactInput) =>
    api<ContactDto>('/contacts', { method: 'POST', json: input }),
  update: (id: string, input: UpdateContactInput) =>
    api<ContactDto>(path(id), { method: 'PATCH', json: input }),
  archive: (id: string) => api<ContactDto>(`${path(id)}/archive`, { method: 'POST' }),
  restore: (id: string) => api<ContactDto>(`${path(id)}/restore`, { method: 'POST' }),
};

/** Every query under `['contacts']`: invalidate that key after any change. */
export const contactQueries = {
  all: ['contacts'] as const,
  list: (search: ContactsSearch) =>
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
};
