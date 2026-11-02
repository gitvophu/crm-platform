import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

import { NotFound } from '@/components/NotFound';
import { Toaster } from '@/components/ui/sonner';

// Dev server only: the import is dropped from the build (slice 1.1, Q8), and kept out of tests.
const Devtools =
  import.meta.env.DEV && import.meta.env.MODE !== 'test'
    ? lazy(() => import('@/components/Devtools'))
    : () => null;

export interface RouterContext {
  /** For `beforeLoad` and loaders: `await context.queryClient.query(options)`. */
  queryClient: QueryClient;
}

/** Bare root: `/login` has no layout; the signed-in layout is `_app.tsx`. */
export const Route = createRootRouteWithContext<RouterContext>()({
  component: Root,
  // Unknown URLs are caught by `_app/$.tsx` (404 inside the layout); this is the fallback.
  notFoundComponent: NotFound,
});

function Root() {
  return (
    <>
      <Outlet />
      <Toaster position="bottom-right" />
      <Suspense>
        <Devtools />
      </Suspense>
    </>
  );
}
