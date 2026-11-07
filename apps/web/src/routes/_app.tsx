import { HTTP_STATUS } from '@crm/shared';
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

import { meQueryOptions } from '@/features/auth';
import { AppHeader } from '@/components/AppHeader';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ApiError } from '@/lib/api';

/** Layout of every signed-in page (pathless: adds no URL segment). */
export const Route = createFileRoute('/_app')({
  // Runs before any page below renders: signed out → login, then back here (slice 1.2, Q12).
  beforeLoad: async ({ context, location }) => {
    try {
      await context.queryClient.query(meQueryOptions);
    } catch (error) {
      if (error instanceof ApiError && error.status === HTTP_STATUS.unauthorized) {
        throw redirect({
          to: '/login',
          search: { redirect: location.href === '/' ? undefined : location.href },
        });
      }
      throw error;
    }
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          {/* SidebarInset is the <main> landmark. */}
          <div className="flex-1 p-4 md:p-6">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
