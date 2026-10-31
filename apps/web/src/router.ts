import type { RouterHistory } from '@tanstack/react-router';
import { createRouter } from '@tanstack/react-router';

import { RouteError } from '@/components/RouteError';

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

/** `history` is a memory history in tests; the browser history otherwise. */
export function createAppRouter(history?: RouterHistory) {
  return createRouter({
    routeTree,
    history,
    defaultPreload: 'intent',
    defaultErrorComponent: RouteError,
  });
}
