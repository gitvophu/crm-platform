import type { RouterHistory } from '@tanstack/react-router';
import { createRouter } from '@tanstack/react-router';

import { RouteError } from '@/components/RouteError';
import { createQueryClient } from '@/lib/query-client';
import { routeTree } from '@/routeTree.gen';

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
  interface StaticDataRouteOption {
    /** Page title, shown in the header breadcrumb. */
    title?: string;
  }
}

/**
 * The router and its query client (in `router.options.context`). `history` is a memory history
 * in tests; the browser history otherwise.
 */
export function createAppRouter(history?: RouterHistory) {
  const queryClient = createQueryClient({ onSessionExpired: () => void expireSession() });
  const router = createRouter({
    routeTree,
    history,
    context: { queryClient },
    defaultPreload: 'intent',
    defaultErrorComponent: RouteError,
  });

  let expiring: Promise<void> | undefined;

  /**
   * The refresh token no longer works: back to login, then back to this page (slice 1.2, Q6).
   * Several queries can fail at once; only the first call acts.
   */
  function expireSession() {
    expiring ??= (async () => {
      const { pathname, href } = router.state.location;
      if (pathname === '/login') return;
      await router.navigate({ to: '/login', search: { redirect: href, expired: true } });
      // Nothing of the previous session stays in memory.
      queryClient.clear();
    })().finally(() => {
      expiring = undefined;
    });
    return expiring;
  }

  return router;
}
