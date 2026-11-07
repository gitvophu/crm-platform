import type { AuthUser, ChangePasswordInput, LoginInput } from '@crm/shared';
import { queryOptions } from '@tanstack/react-query';

import { api } from '@/lib/api';

/** One function per endpoint of `/auth` (convention from slice 1.3). */
export const authApi = {
  login: (input: LoginInput) => api<AuthUser>('/auth/login', { method: 'POST', json: input }),
  logout: () => api<null>('/auth/logout', { method: 'POST' }),
  me: () => api<AuthUser>('/auth/me'),
  changePassword: (input: ChangePasswordInput) =>
    api<null>('/auth/change-password', { method: 'POST', json: input }),
};

/**
 * The signed-in user. Fetched once by the `_app` route before any page renders; it changes only
 * through this app (sign in, sign out), so it never goes stale. Under `['auth']`: its 401 means
 * "signed out", handled by the route, not "session expired".
 */
export const meQueryOptions = queryOptions({
  queryKey: ['auth', 'me'],
  queryFn: authApi.me,
  // 'static': cached data is never refetched, so `queryClient.query()` returns it as is.
  staleTime: 'static',
  retry: false,
});
