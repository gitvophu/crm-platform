import type { UserSummary } from '@crm/shared';
import { queryOptions } from '@tanstack/react-query';

import { api } from '@/lib/api';

/** Users change rarely (seed only until slice 1.5). */
const USERS_STALE_MS = 5 * 60_000;

export const usersApi = {
  /** Every user: salesperson pickers and filters (slice 1.4). */
  list: () => api<UserSummary[]>('/users'),
};

export const userQueries = {
  all: () =>
    queryOptions({
      queryKey: ['users', 'all'],
      queryFn: usersApi.list,
      staleTime: USERS_STALE_MS,
    }),
};
