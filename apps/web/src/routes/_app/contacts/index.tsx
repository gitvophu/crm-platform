import { CONTACT_SORT_DEFAULT, type ContactDto } from '@crm/shared';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Plus, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { useCurrentUser } from '@/features/auth';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  ContactFilters,
  contactQueries,
  ContactsPager,
  contactsSearch,
  type ContactsSearch,
  ContactsTable,
  ContactsTableSkeleton,
  hasFilters,
  RestoreDialog,
  useContactActions,
} from '@/features/contacts';

export const Route = createFileRoute('/_app/contacts/')({
  // Filters, sort and page live in the URL (slice 1.3, Q7): reload and Back keep them.
  validateSearch: (search: Record<string, unknown>) => contactsSearch.parse(search),
  component: ContactsPage,
});

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid justify-items-center gap-2 rounded-lg border border-dashed px-6 py-12 text-center text-muted-foreground">
      {children}
    </div>
  );
}

function ContactsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const me = useCurrentUser();
  const { restore } = useContactActions();

  /** Any change but paging goes back to page 1. Typing does not add history entries. */
  const update = useCallback(
    (changes: Partial<ContactsSearch>) =>
      void navigate({
        search: (previous) => ({ ...previous, page: undefined, ...changes }),
        replace: true,
      }),
    [navigate],
  );

  const apiSearch: ContactsSearch = { ...search, sort: search.sort ?? CONTACT_SORT_DEFAULT };
  const contacts = useQuery(contactQueries.list(apiSearch));
  // The contact whose Restore asks for confirmation. `setRestoring` is stable, so passing it to
  // the table does not rebuild its columns.
  const [restoring, setRestoring] = useState<ContactDto | null>(null);
  // Remounts the filters on Clear, dropping a search still waiting for its debounce.
  const [filtersKey, setFiltersKey] = useState(0);
  const clearFilters = () => {
    setFiltersKey((key) => key + 1);
    update({ q: undefined, owner: undefined, stage: undefined });
  };

  // Past the last page (rows archived or restored meanwhile, or a hand-edited URL): go to the
  // last one instead of showing an empty table.
  const page = contacts.data;
  const lastPage = page ? Math.max(1, Math.ceil(page.total / page.pageSize)) : 1;
  const pastEnd = page !== undefined && page.items.length === 0 && page.page > lastPage;
  useEffect(() => {
    if (pastEnd) update({ page: lastPage === 1 ? undefined : lastPage });
  }, [pastEnd, lastPage, update]);

  let body: React.ReactNode;
  if (contacts.isPending || pastEnd) {
    body = <ContactsTableSkeleton />;
  } else if (contacts.isError) {
    body = (
      <ErrorState what="contacts" error={contacts.error} onRetry={() => void contacts.refetch()} />
    );
  } else if (contacts.data.total === 0 && hasFilters(search)) {
    body = (
      <EmptyState>
        <span className="text-base font-medium text-foreground">No contacts match</span>
        <span>Nothing matches these filters.</span>
        <Button variant="outline" onClick={clearFilters}>
          Clear filters
        </Button>
      </EmptyState>
    );
  } else if (contacts.data.total === 0) {
    body = search.archived ? (
      <EmptyState>
        <span className="text-base font-medium text-foreground">No archived contacts</span>
        <span>Contacts you archive show up here, ready to restore.</span>
      </EmptyState>
    ) : (
      <EmptyState>
        <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
          <Users className="size-[22px]" aria-hidden />
        </span>
        <span className="text-base font-medium text-foreground">No contacts yet</span>
        <span>Add the people you work with at your clients.</span>
        <Button asChild>
          <Link to="/contacts/new">
            <Plus />
            New contact
          </Link>
        </Button>
      </EmptyState>
    );
  } else {
    body = (
      <>
        <ContactsTable
          contacts={contacts.data.items}
          sort={apiSearch.sort ?? CONTACT_SORT_DEFAULT}
          onSort={(sort) => update({ sort })}
          onRestore={search.archived ? setRestoring : undefined}
        />
        <ContactsPager
          page={contacts.data.page}
          pageSize={contacts.data.pageSize}
          total={contacts.data.total}
          archived={search.archived ?? false}
          onPage={(page) => update({ page })}
        />
      </>
    );
  }

  return (
    <div className="grid max-w-6xl gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        {search.archived ? (
          <PageHeader
            title="Archived contacts"
            description="Hidden from the contact list. Restore a contact to bring it back."
          />
        ) : (
          <PageHeader
            title="Contacts"
            description={
              me?.role === 'admin'
                ? 'People at your client companies, across every team.'
                : 'People at your client companies. You see your team’s contacts.'
            }
          />
        )}
        <Button asChild>
          <Link to="/contacts/new">
            <Plus />
            New contact
          </Link>
        </Button>
      </div>
      <ContactFilters key={filtersKey} search={search} onChange={update} />
      {body}
      {restoring && (
        <RestoreDialog
          contact={restoring}
          open
          onOpenChange={(open) => !open && setRestoring(null)}
          onConfirm={() => restore.mutate(restoring.id)}
        />
      )}
    </div>
  );
}
