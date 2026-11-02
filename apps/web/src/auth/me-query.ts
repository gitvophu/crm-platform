import type { AuthUser } from '@crm/shared';
import { queryOptions, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

/**
 * The signed-in user. Fetched once by the `_app` route before any page renders; it changes only
 * through this app (sign in, sign out), so it never goes stale. Under `['auth']`: its 401 means
 * "signed out", handled by the route, not "session expired".
 */
export const meQueryOptions = queryOptions({
  queryKey: ['auth', 'me'],
  queryFn: () => api<AuthUser>('/auth/me'),
  // 'static': cached data is never refetched, so `queryClient.query()` returns it as is.
  staleTime: 'static',
  retry: false,
});

/** The signed-in user; undefined only while signing out. */
export function useCurrentUser(): AuthUser | undefined {
  return useQuery(meQueryOptions).data;
}
