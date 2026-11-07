import { type ContactDto, contactName } from '@crm/shared';
import { Link, useNavigate } from '@tanstack/react-router';
import { Archive, Pencil } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ArchiveDialog } from './ArchiveDialog';
import { ContactAvatar } from '@/features/contacts/ContactAvatar';
import { RestoreDialog } from '@/features/contacts/RestoreDialog';
import { StageBadge } from '@/features/contacts/StageBadge';
import { useContactActions } from '@/features/contacts/use-contact-actions';

function Properties({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[minmax(6rem,auto)_1fr] gap-x-4 gap-y-2">
      {rows.map(([term, value]) => (
        <div key={term} className="contents">
          <dt className="text-muted-foreground">{term}</dt>
          <dd className="min-w-0 [overflow-wrap:anywhere] whitespace-pre-line">{value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A section of a later feature: same "Soon" badge as the sidebar. */
function Placeholder({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'grid gap-1 rounded-lg border border-dashed p-4 text-sm text-muted-foreground',
        className,
      )}
    >
      <span className="flex items-center gap-2 font-medium text-foreground">
        {title}
        <span className="rounded-full border px-1.5 text-[10px] font-normal text-muted-foreground">
          Soon
        </span>
      </span>
      {children}
    </div>
  );
}

/** Email and phone open the mail app or the dialer. */
const mailLink = (email: string | null) =>
  email && (
    <a href={`mailto:${email}`} className="text-primary hover:underline">
      {email}
    </a>
  );
const phoneLink = (phone: string | null) =>
  phone && (
    <a href={`tel:${phone.replace(/\s/g, '')}`} className="text-primary hover:underline">
      {phone}
    </a>
  );

export function ContactDetail({ contact }: { contact: ContactDto }) {
  const navigate = useNavigate();
  const { archive, restore } = useContactActions();
  /** The action whose confirmation dialog is open. */
  const [confirming, setConfirming] = useState<'archive' | 'restore' | null>(null);
  const closeDialog = (open: boolean) => {
    if (!open) setConfirming(null);
  };
  const { canEdit } = contact.permissions;
  const archived = contact.archivedAt !== null;

  return (
    <div className="grid max-w-6xl gap-5">
      {archived && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed bg-muted px-4 py-2.5">
          <span>This contact is archived and hidden from the list.</span>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              disabled={restore.isPending}
              onClick={() => setConfirming('restore')}
            >
              Restore
            </Button>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <ContactAvatar contact={contact} size="lg" />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-balance">
              {contactName(contact)}
            </h1>
            {contact.jobTitle && <p className="text-muted-foreground">{contact.jobTitle}</p>}
          </div>
        </div>
        {canEdit ? (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/contacts/$id/edit" params={{ id: contact.id }}>
                <Pencil />
                Edit
              </Link>
            </Button>
            {!archived && (
              <Button variant="outline" onClick={() => setConfirming('archive')}>
                <Archive />
                Archive
              </Button>
            )}
          </div>
        ) : (
          <p className="max-w-72 text-right text-sm text-muted-foreground">
            Only {contact.owner.name} or a manager can edit this contact.
          </p>
        )}
      </div>
      {/* Phones stack the cards in DOM order, so Ownership comes right after Details. */}
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_20rem]">
        <Card className="lg:col-start-1">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Properties
              rows={[
                ['Email', mailLink(contact.email)],
                ['Phone', phoneLink(contact.phone)],
                ['Job title', contact.jobTitle],
                ['Stage', <StageBadge key="stage" stage={contact.stage} />],
                ['Notes', contact.notes],
              ]}
            />
          </CardContent>
        </Card>
        <Card className="lg:col-start-2 lg:row-span-3 lg:row-start-1">
          <CardHeader>
            <CardTitle>Ownership</CardTitle>
          </CardHeader>
          <CardContent>
            <Properties
              rows={[
                ['Owner', contact.owner.name],
                ['Team', contact.team.name],
                ['Created', formatDate(contact.createdAt)],
                ['Updated', timeAgo(contact.updatedAt)],
              ]}
            />
          </CardContent>
        </Card>
        <Placeholder title="Deals" className="lg:col-start-1">
          Deals with this contact will show up here.
        </Placeholder>
        <Placeholder title="Activity" className="lg:col-start-1">
          Calls, meetings and notes with this contact will show up here.
        </Placeholder>
      </div>
      <ArchiveDialog
        contact={contact}
        open={confirming === 'archive'}
        onOpenChange={closeDialog}
        onConfirm={() =>
          archive.mutate(contact.id, { onSuccess: () => void navigate({ to: '/contacts' }) })
        }
      />
      <RestoreDialog
        contact={contact}
        open={confirming === 'restore'}
        onOpenChange={closeDialog}
        onConfirm={() => restore.mutate(contact.id)}
      />
    </div>
  );
}
