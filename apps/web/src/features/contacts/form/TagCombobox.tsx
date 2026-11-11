import type { ContactTagDto } from '@crm/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useState } from 'react';

import { Combobox } from '@/components/Combobox';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { contactQueries, contactsApi } from '@/features/contacts/contacts-api';
import { SEARCH_DEBOUNCE_MS } from '@/features/contacts/contacts-search';
import { TagBadge } from '@/features/contacts/ContactTags';

interface TagComboboxProps {
  id: string;
  value: ContactTagDto[];
  onChange: (tags: ContactTagDto[]) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
}

/** Several tags; typing a new name offers to create it (slice 1.4). */
export function TagCombobox({
  id,
  value,
  onChange,
  disabled,
  invalid,
  describedBy,
}: TagComboboxProps) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const tags = useQuery(contactQueries.tags(debounced));
  const create = useMutation({
    mutationFn: contactsApi.createTag,
    meta: { errorTitle: 'Couldn’t create the tag' },
    onSuccess: (tag) => {
      if (!value.some((picked) => picked.id === tag.id)) onChange([...value, tag]);
      void queryClient.invalidateQueries({ queryKey: [...contactQueries.all, 'tags'] });
    },
  });

  const picked = new Set(value.map((tag) => tag.id));
  const options = (tags.data ?? []).filter((tag) => !picked.has(tag.id));
  const remove = (id: string) => onChange(value.filter((tag) => tag.id !== id));

  return (
    <Combobox
      id={id}
      query={query}
      onQueryChange={setQuery}
      loading={tags.isFetching || create.isPending || query.trim() !== debounced}
      options={options.map((tag) => ({ id: tag.id, label: tag.name }))}
      onSelect={(option) => {
        const tag = options.find((candidate) => candidate.id === option.id);
        if (tag) onChange([...value, tag]);
      }}
      onCreate={(name) => create.mutate(name)}
      onBackspaceEmpty={() => value.length > 0 && remove(value.at(-1)!.id)}
      prefix={value.map((tag) => (
        <TagBadge key={tag.id} tag={tag}>
          <button
            type="button"
            className="-mr-1 rounded-full p-0.5 hover:bg-foreground/10"
            aria-label={`Remove ${tag.name}`}
            disabled={disabled}
            onClick={() => remove(tag.id)}
          >
            <X className="size-3" aria-hidden />
          </button>
        </TagBadge>
      ))}
      placeholder={value.length === 0 ? 'Add tags' : undefined}
      emptyText="Type to create a tag."
      disabled={disabled}
      invalid={invalid}
      describedBy={describedBy}
    />
  );
}
