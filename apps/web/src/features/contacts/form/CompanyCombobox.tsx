import type { ContactDto } from '@crm/shared';
import { useQuery } from '@tanstack/react-query';
import { Building2, X } from 'lucide-react';
import { useState } from 'react';

import { Combobox } from '@/components/Combobox';
import { Button } from '@/components/ui/button';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { contactQueries } from '@/features/contacts/contacts-api';
import { SEARCH_DEBOUNCE_MS } from '@/features/contacts/contacts-search';

export type CompanyChoice = Pick<ContactDto, 'id' | 'name'>;

const peopleLabel = (count: number | null) => `${count ?? 0} ${count === 1 ? 'person' : 'people'}`;

interface CompanyComboboxProps {
  id: string;
  value: CompanyChoice | null;
  /** The contact being edited, never offered. */
  excludeId?: string;
  onChange: (company: ContactDto | null) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
}

/** The company of a person: active companies, searched on the server (slice 1.4, Q5). */
export function CompanyCombobox({
  id,
  value,
  excludeId,
  onChange,
  disabled,
  invalid,
  describedBy,
}: CompanyComboboxProps) {
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const companies = useQuery({ ...contactQueries.companies(debounced), enabled: value === null });

  if (value) {
    return (
      <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-2.5 text-sm shadow-xs">
        <Building2 className="size-4 text-muted-foreground" aria-hidden />
        <span id={id} className="flex-1 truncate">
          {value.name}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6"
          aria-label="Remove company"
          disabled={disabled}
          onClick={() => onChange(null)}
        >
          <X />
        </Button>
      </div>
    );
  }

  // A company being turned into a person cannot be its own company.
  const items = (companies.data?.items ?? []).filter((company) => company.id !== excludeId);
  return (
    <Combobox
      id={id}
      query={query}
      onQueryChange={setQuery}
      loading={companies.isFetching || query.trim() !== debounced}
      options={items.map((company) => ({
        id: company.id,
        label: company.name,
        hint: [company.industry?.name, peopleLabel(company.peopleCount)]
          .filter(Boolean)
          .join(' · '),
        icon: <Building2 className="size-4 text-muted-foreground" aria-hidden />,
      }))}
      onSelect={(option) => onChange(items.find((company) => company.id === option.id) ?? null)}
      placeholder="Search companies"
      emptyText="No company found."
      disabled={disabled}
      invalid={invalid}
      describedBy={describedBy}
    />
  );
}
