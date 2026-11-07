import type { AuthUser } from '@crm/shared';
import { useQuery } from '@tanstack/react-query';

import { meQueryOptions } from './auth-api';

/** The signed-in user; undefined only while signing out. */
export function useCurrentUser(): AuthUser | undefined {
  return useQuery(meQueryOptions).data;
}
