import {
  type ContactDto,
  contactName,
  type ContactSort,
  type ContactSortField,
  parseSort,
  toSort,
} from '@crm/shared';
import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ContactAvatar } from '@/features/contacts/ContactAvatar';
import { StageBadge } from '@/features/contacts/StageBadge';

// Sorting, paging and filtering happen in the API; the table only lays the page out.
const features = tableFeatures({});
const column = createColumnHelper<typeof features, ContactDto>();

interface Sortable {
  field: ContactSortField;
  /** Direction of a first click. */
  firstDescending: boolean;
}

/** Columns (by table column id) the API sorts by. */
const SORTABLE: Partial<Record<string, Sortable>> = {
  name: { field: 'name', firstDescending: false },
  stage: { field: 'stage', firstDescending: false },
  updatedAt: { field: 'updatedAt', firstDescending: true },
};

/** Sorted by this column: a click flips the direction. Otherwise its first direction. */
function nextSort(current: ContactSort, { field, firstDescending }: Sortable): ContactSort {
  const sorted = parseSort(current);
  return toSort(field, sorted.field === field ? !sorted.descending : firstDescending);
}

/**
 * Columns hidden on narrow screens (by column id), so a phone shows name and stage without
 * scrolling sideways. The name cell already shows the email.
 */
const RESPONSIVE: Partial<Record<string, string>> = {
  jobTitle: 'hidden lg:table-cell',
  owner: 'hidden sm:table-cell',
  updatedAt: 'hidden md:table-cell',
};

/** A click on a link or a button of the row does its own thing, not open the contact. */
const isControl = (target: EventTarget) =>
  target instanceof Element && target.closest('a, button') !== null;

interface ContactsTableProps {
  contacts: ContactDto[];
  sort: ContactSort;
  onSort: (sort: ContactSort) => void;
  /** Archived view: a Restore button on the rows the caller may edit. */
  onRestore?: (contact: ContactDto) => void;
}

export function ContactsTable({ contacts, sort, onSort, onRestore }: ContactsTableProps) {
  const navigate = useNavigate();
  const columns = useMemo(
    () =>
      column.columns([
        column.display({
          id: 'name',
          header: 'Name',
          cell: ({ row }) => (
            // A minimum width: on a phone the table scrolls sideways instead of eating the name.
            <div className="flex min-w-48 items-center gap-2.5">
              <ContactAvatar contact={row.original} />
              <div className="grid min-w-0">
                <Link
                  to="/contacts/$id"
                  params={{ id: row.original.id }}
                  className="truncate font-medium hover:underline"
                >
                  {contactName(row.original)}
                </Link>
                <span className="truncate text-xs text-muted-foreground">
                  {row.original.email ?? '—'}
                </span>
              </div>
            </div>
          ),
        }),
        column.accessor('stage', {
          header: 'Stage',
          cell: ({ getValue }) => <StageBadge stage={getValue()} />,
        }),
        column.accessor('jobTitle', {
          header: 'Job title',
          cell: ({ getValue }) => getValue() ?? '—',
        }),
        column.accessor((contact) => contact.owner.name, { id: 'owner', header: 'Owner' }),
        column.accessor('updatedAt', {
          header: 'Updated',
          cell: ({ getValue }) => (
            <span className="text-muted-foreground tabular-nums">{timeAgo(getValue())}</span>
          ),
        }),
        ...(onRestore
          ? [
              column.display({
                id: 'restore',
                header: () => <span className="sr-only">Actions</span>,
                cell: ({ row }) =>
                  row.original.permissions.canEdit && (
                    <Button variant="outline" size="sm" onClick={() => onRestore(row.original)}>
                      Restore
                    </Button>
                  ),
              }),
            ]
          : []),
      ]),
    [onRestore],
  );

  const table = useTable<typeof features, ContactDto>({
    features,
    columns,
    data: contacts,
    getRowId: (contact) => contact.id,
  });

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => {
                const sortable = SORTABLE[header.column.id];
                const sorted = parseSort(sort);
                const direction =
                  sortable?.field !== sorted.field
                    ? undefined
                    : sorted.descending
                      ? 'descending'
                      : 'ascending';
                const label = <table.FlexRender header={header} />;
                return (
                  <TableHead
                    key={header.id}
                    className={RESPONSIVE[header.column.id]}
                    aria-sort={sortable ? (direction ?? 'none') : undefined}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                        onClick={() => onSort(nextSort(sort, sortable))}
                      >
                        {label}
                        {direction === 'ascending' ? (
                          <ArrowUp className="size-3.5" aria-hidden />
                        ) : direction === 'descending' ? (
                          <ArrowDown className="size-3.5" aria-hidden />
                        ) : (
                          <ChevronsUpDown
                            className="size-3.5 text-muted-foreground/60"
                            aria-hidden
                          />
                        )}
                      </button>
                    ) : (
                      label
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            // The name link stays the keyboard and new-tab way in; the row is a bigger target.
            <TableRow
              key={row.id}
              className={cn('cursor-pointer hover:bg-muted', onRestore && 'text-muted-foreground')}
              onClick={(event) => {
                if (isControl(event.target)) return;
                void navigate({ to: '/contacts/$id', params: { id: row.id } });
              }}
            >
              {row.getAllCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={cn('max-w-64 whitespace-nowrap', RESPONSIVE[cell.column.id])}
                >
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
