import { contactName, HTTP_STATUS } from '@crm/shared';
import { createFileRoute, Link, notFound, Outlet } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import { contactQueries } from '@/features/contacts';
import { ApiError } from '@/lib/api';

/** `/contacts/$id/*`: loads the contact once for the detail and edit pages, names the crumb. */
export const Route = createFileRoute('/_app/contacts/$id')({
  // Shown in the breadcrumb only when the loader found nothing.
  staticData: { title: 'Not found' },
  loader: async ({ context, params }) => {
    try {
      // Cached data is fine here; the page refetches it in the background.
      const contact = await context.queryClient.query({
        ...contactQueries.detail(params.id),
        staleTime: 'static',
      });
      return { crumb: contactName(contact) };
    } catch (error) {
      // Unknown id and another team's contact alike (ADR-0005): nothing to tell apart.
      if (error instanceof ApiError && error.status === HTTP_STATUS.notFound) throw notFound();
      throw error;
    }
  },
  notFoundComponent: ContactNotFound,
  component: Outlet,
});

function ContactNotFound() {
  return (
    <div className="grid justify-items-start gap-2 py-6">
      <span className="font-mono text-[13px] text-muted-foreground">404</span>
      <h1 className="text-2xl font-semibold tracking-tight">Contact not found</h1>
      <p className="text-muted-foreground">
        The link may be wrong, or the contact belongs to another team.
      </p>
      <Button asChild size="sm" className="mt-2">
        <Link to="/contacts">Back to contacts</Link>
      </Button>
    </div>
  );
}
