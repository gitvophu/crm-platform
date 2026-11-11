import { CONTACT_SEARCH_MAX_LENGTH, type ContactType, OWNER_ME } from '@crm/shared';
import { useQuery } from '@tanstack/react-query';
import { Archive, Building2, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { cn } from '@/lib/utils';
import { userQueries } from '@/features/users';
import { contactQueries } from '@/features/contacts/contacts-api';
import { type ContactsSearch, SEARCH_DEBOUNCE_MS } from '@/features/contacts/contacts-search';

const TYPES: { value: ContactType | undefined; label: string }[] = [
  { value: undefined, label: 'All' },
  { value: 'company', label: 'Companies' },
  { value: 'person', label: 'People' },
];

interface ContactFiltersProps {
  search: ContactsSearch;
  onChange: (changes: Partial<ContactsSearch>) => void;
}

/** All / Companies / People, like Odoo's filters on one list (slice 1.4, Q5). */
function TypeFilter({
  value,
  onChange,
}: {
  value?: ContactType;
  onChange: (type?: ContactType) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Type"
      className="inline-flex h-9 rounded-md border bg-muted p-0.5"
    >
      {TYPES.map((type) => (
        <button
          key={type.label}
          type="button"
          aria-pressed={value === type.value}
          className={cn(
            'rounded-sm px-3 text-sm text-muted-foreground',
            'aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-xs',
          )}
          onClick={() => onChange(type.value)}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
}

/** The company the list is narrowed to (`?companyId=`), with a button to drop it. */
function CompanyChip({ id, onClear }: { id: string; onClear: () => void }) {
  const company = useQuery(contactQueries.detail(id));
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-primary-soft pr-1 pl-2.5 text-sm text-primary">
      <Building2 className="size-3.5" aria-hidden />
      Company: {company.data?.name ?? '…'}
      <button
        type="button"
        aria-label="Remove company filter"
        className="rounded-full p-0.5 hover:bg-primary/10"
        onClick={onClear}
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </span>
  );
}

export function ContactFilters({ search, onChange }: ContactFiltersProps) {
  const users = useQuery(userQueries.all()).data ?? [];
  const tags = useQuery(contactQueries.tags()).data ?? [];
  const [q, setQ] = useState(search.q ?? '');
  // The URL is the source of truth: follow it when it changes elsewhere (Clear filters, Back).
  const [urlQ, setUrlQ] = useState(search.q);
  if (search.q !== urlQ) {
    setUrlQ(search.q);
    setQ(search.q ?? '');
  }

  useEffect(() => {
    if (q === (search.q ?? '')) return;
    const timer = setTimeout(() => onChange({ q: q || undefined }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [q, search.q, onChange]);

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <TypeFilter value={search.type} onChange={(type) => onChange({ type })} />
        <div className="relative w-full sm:w-64">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            aria-label="Search contacts"
            placeholder="Search name, email, phone"
            maxLength={CONTACT_SEARCH_MAX_LENGTH}
            className="pl-8"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
        </div>
        <NativeSelect
          aria-label="Salesperson"
          value={search.salesperson ?? ''}
          onChange={(event) => onChange({ salesperson: event.target.value || undefined })}
        >
          <NativeSelectOption value="">All salespeople</NativeSelectOption>
          <NativeSelectOption value={OWNER_ME}>Me</NativeSelectOption>
          {users.map((user) => (
            <NativeSelectOption key={user.id} value={user.id}>
              {user.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Tag"
          value={search.tag ?? ''}
          onChange={(event) => onChange({ tag: event.target.value || undefined })}
        >
          <NativeSelectOption value="">All tags</NativeSelectOption>
          {tags.map((tag) => (
            <NativeSelectOption key={tag.id} value={tag.id}>
              {tag.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button
          variant="outline"
          aria-pressed={search.archived ?? false}
          className="aria-pressed:border-primary/40 aria-pressed:bg-primary-soft aria-pressed:text-primary"
          onClick={() => onChange({ archived: search.archived ? undefined : true })}
        >
          <Archive />
          Archived
        </Button>
      </div>
      {search.companyId && (
        <div>
          <CompanyChip id={search.companyId} onClear={() => onChange({ companyId: undefined })} />
        </div>
      )}
    </div>
  );
}
