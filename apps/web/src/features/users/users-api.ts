import type { UserSummary } from '@crm/shared';
import { queryOptions } from '@tanstack/react-query';

import { api } from '@/lib/api';

export const usersApi = {
  /** Members of the caller's team; an admin may ask for another team. */
  listTeam: (teamId?: string) =>
    api<UserSummary[]>(teamId ? `/users?teamId=${encodeURIComponent(teamId)}` : '/users'),
};

export const userQueries = {
  team: (teamId?: string) =>
    queryOptions({
      queryKey: ['users', 'team', teamId ?? 'mine'],
      queryFn: () => usersApi.listTeam(teamId),
      // Team members change rarely (seed only for now).
      staleTime: 5 * 60_000,
    }),
};
