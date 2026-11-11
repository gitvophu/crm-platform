import type { ContactDto } from '@crm/shared';
import { Building2 } from 'lucide-react';

import { initials } from '@/features/auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

/** A person: initials in a circle. A company: a building in a rounded square. */
export function ContactAvatar({
  contact,
  size = 'sm',
}: {
  contact: Pick<ContactDto, 'type' | 'name'>;
  size?: 'sm' | 'lg';
}) {
  const company = contact.type === 'company';
  return (
    <Avatar className={cn(size === 'lg' ? 'size-11' : 'size-8', company && 'rounded-md')}>
      <AvatarFallback
        className={cn(
          'bg-muted font-semibold text-muted-foreground',
          size === 'sm' && 'text-xs',
          company && 'rounded-md',
        )}
      >
        {company ? (
          <Building2 className={size === 'lg' ? 'size-5' : 'size-4'} aria-hidden />
        ) : (
          initials(contact.name)
        )}
      </AvatarFallback>
    </Avatar>
  );
}
