import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';

import type { createAppRouter } from '@/router';

/** Providers around the router; main.tsx and the tests render the same tree. */
export function App({ router }: { router: ReturnType<typeof createAppRouter> }) {
  return (
    <QueryClientProvider client={router.options.context.queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
