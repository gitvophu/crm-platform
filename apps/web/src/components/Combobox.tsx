import { Loader2, Plus } from 'lucide-react';
import { type KeyboardEvent, type ReactNode, useId, useState } from 'react';

import { cn } from '@/lib/utils';

export interface ComboboxOption {
  id: string;
  label: string;
  /** Muted text on the right, e.g. "F&B · 3 people". */
  hint?: string;
  icon?: ReactNode;
}

interface ComboboxProps {
  id: string;
  /** What the user types; the parent searches with it (usually on the server). */
  query: string;
  onQueryChange: (query: string) => void;
  options: ComboboxOption[];
  onSelect: (option: ComboboxOption) => void;
  /** Results for `query` are on their way; Enter waits for them. */
  loading?: boolean;
  /** Offers "Create “query”" after the options when no option has exactly that label. */
  onCreate?: (label: string) => void;
  /** Backspace in an empty box: removes the last chip of a multi-select. */
  onBackspaceEmpty?: () => void;
  /** Inside the box, before the input: chips of a multi-select, an icon. */
  prefix?: ReactNode;
  placeholder?: string;
  emptyText: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
}

/**
 * An input with a list of suggestions (WAI-ARIA combobox pattern): type to search, arrows to move,
 * Enter to pick, Escape to close. shadcn's Command was not used: its CLI wanted to overwrite our
 * button and input (slice 1.4, implementation notes).
 */
export function Combobox({
  id,
  query,
  onQueryChange,
  options,
  onSelect,
  loading = false,
  onCreate,
  onBackspaceEmpty,
  prefix,
  placeholder,
  emptyText,
  disabled = false,
  invalid = false,
  describedBy,
}: ComboboxProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const trimmed = query.trim();
  // While loading, the options are those of the previous search: neither create nor pick yet.
  const canCreate =
    !loading &&
    onCreate !== undefined &&
    trimmed !== '' &&
    !options.some((option) => option.label.toLowerCase() === trimmed.toLowerCase());
  const count = options.length + (canCreate ? 1 : 0);
  const activeIndex = Math.min(active, Math.max(count - 1, 0));
  const optionId = (index: number) => `${listId}-${index}`;

  const choose = (index: number) => {
    if (index < options.length) onSelect(options[index]!);
    else if (canCreate) onCreate(trimmed);
    onQueryChange('');
    setActive(0);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) return setOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((activeIndex + step + count) % Math.max(count, 1));
    } else if (event.key === 'Enter' && open) {
      event.preventDefault();
      if (!loading && count > 0) choose(activeIndex);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === 'Backspace' && query === '') {
      onBackspaceEmpty?.();
    }
  };

  return (
    <div className="relative">
      <div
        className={cn(
          'flex min-h-9 flex-wrap items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1 text-sm shadow-xs transition-[color,box-shadow]',
          'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
          invalid && 'border-destructive',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        {prefix}
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && count > 0 ? optionId(activeIndex) : undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={query}
          className="h-7 min-w-24 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          onChange={(event) => {
            onQueryChange(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Text that picked nothing is dropped, so the box never shows an unsaved value.
            setOpen(false);
            onQueryChange('');
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 grid max-h-64 overflow-y-auto rounded-md border bg-popover p-1 text-sm text-popover-foreground shadow-md"
        >
          {loading && count === 0 && (
            <li className="flex items-center gap-2 px-2 py-1.5 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Searching…
            </li>
          )}
          {!loading && count === 0 && (
            <li className="px-2 py-1.5 text-muted-foreground">{emptyText}</li>
          )}
          {options.map((option, index) => (
            <li
              key={option.id}
              id={optionId(index)}
              role="option"
              aria-selected={index === activeIndex}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 aria-selected:bg-muted"
              // Keep the focus in the input: a blur would close the list before the click.
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(index)}
            >
              {option.icon}
              <span className="truncate">{option.label}</span>
              {option.hint && (
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  {option.hint}
                </span>
              )}
            </li>
          ))}
          {canCreate && (
            <li
              id={optionId(options.length)}
              role="option"
              aria-selected={activeIndex === options.length}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 aria-selected:bg-muted"
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(options.length)}
              onClick={() => choose(options.length)}
            >
              <Plus className="size-4 text-muted-foreground" aria-hidden />
              Create “{trimmed}”
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
