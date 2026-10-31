import { createRootRoute, Outlet } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

import { AppHeader } from '@/components/AppHeader';
import { AppSidebar } from '@/components/AppSidebar';
import { NotFound } from '@/components/NotFound';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

// Dev server only: the import is dropped from the build (slice 1.1, Q8), and kept out of tests.
const Devtools =
  import.meta.env.DEV && import.meta.env.MODE !== 'test'
    ? lazy(() => import('@/components/Devtools'))
    : () => null;

export const Route = createRootRoute({
  component: RootLayout,
  // Rendered in place of <Outlet />, so a 404 keeps the sidebar.
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
      <Toaster position="bottom-right" />
      <Suspense>
        <Devtools />
      </Suspense>
    </TooltipProvider>
  );
}
