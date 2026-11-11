import type { ContactTagDto } from '@crm/shared';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** A tag in its palette color (`--tag-N` tokens of styles.css). */
export function TagBadge({
  tag,
  className,
  children,
}: {
  tag: ContactTagDto;
  className?: string;
  /** After the name, e.g. a remove button. */
  children?: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-2 text-xs leading-5 whitespace-nowrap',
        className,
      )}
      style={{
        backgroundColor: `var(--tag-${tag.color})`,
        color: `var(--tag-${tag.color}-foreground)`,
      }}
    >
      {tag.name}
      {children}
    </span>
  );
}

export function ContactTags({ tags }: { tags: ContactTagDto[] }) {
  if (tags.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <TagBadge key={tag.id} tag={tag} />
      ))}
    </span>
  );
}
