import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';

import { authApi, meQueryOptions } from './auth-api';

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationKey: ['auth', 'logout'],
    mutationFn: authApi.logout,
    meta: { errorTitle: 'Couldn’t sign out' },
    onSuccess: async () => {
      // Forget the user first, or the login page would send us straight back.
      queryClient.removeQueries({ queryKey: meQueryOptions.queryKey });
      await router.navigate({ to: '/login' });
      // Nothing of the previous user stays in memory.
      queryClient.clear();
    },
  });
}
