import { CONTACT_SEARCH_MAX_LENGTH, CONTACT_STAGES, type ContactStage } from '@crm/shared';
import { useQuery } from '@tanstack/react-query';
import { Archive, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { userQueries } from '@/features/users';
import { Button } from '@/components/ui/button';
import type { ContactsSearch } from '@/features/contacts/contacts-search';
import { STAGE_LABEL } from '@/features/contacts/stage';

/** Wait for a pause in typing before searching (slice 1.3: 300 ms). */
export const SEARCH_DEBOUNCE_MS = 300;

interface ContactFiltersProps {
  search: ContactsSearch;
  onChange: (changes: Partial<ContactsSearch>) => void;
}

export function ContactFilters({ search, onChange }: ContactFiltersProps) {
  const members = useQuery(userQueries.team()).data ?? [];
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
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-64">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          aria-label="Search contacts"
          placeholder="Search name or email"
          maxLength={CONTACT_SEARCH_MAX_LENGTH}
          className="pl-8"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
      </div>
      <NativeSelect
        aria-label="Owner"
        value={search.owner ?? ''}
        onChange={(event) => onChange({ owner: event.target.value || undefined })}
      >
        <NativeSelectOption value="">All owners</NativeSelectOption>
        <NativeSelectOption value="me">Me</NativeSelectOption>
        {members.map((member) => (
          <NativeSelectOption key={member.id} value={member.id}>
            {member.name}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <NativeSelect
        aria-label="Stage"
        value={search.stage ?? ''}
        onChange={(event) =>
          onChange({ stage: (event.target.value || undefined) as ContactStage | undefined })
        }
      >
        <NativeSelectOption value="">All stages</NativeSelectOption>
        {CONTACT_STAGES.map((stage) => (
          <NativeSelectOption key={stage} value={stage}>
            {STAGE_LABEL[stage]}
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
  );
}
