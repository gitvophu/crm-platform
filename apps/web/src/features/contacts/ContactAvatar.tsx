import { type ContactDto, contactName } from '@crm/shared';

import { initials } from '@/features/auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export function ContactAvatar({
  contact,
  size = 'sm',
}: {
  contact: Pick<ContactDto, 'firstName' | 'lastName'>;
  size?: 'sm' | 'lg';
}) {
  return (
    <Avatar className={size === 'lg' ? 'size-11' : 'size-8'}>
      <AvatarFallback
        className={cn('bg-muted font-semibold text-muted-foreground', size === 'sm' && 'text-xs')}
      >
        {initials(contactName(contact))}
      </AvatarFallback>
    </Avatar>
  );
}
