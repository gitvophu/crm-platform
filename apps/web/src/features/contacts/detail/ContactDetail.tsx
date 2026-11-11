import type { ContactDto } from '@crm/shared';
import { Link, useNavigate } from '@tanstack/react-router';
import { Archive, Building2, Pencil } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, timeAgo } from '@/lib/format';
import { ArchiveDialog } from './ArchiveDialog';
import { CompanyPeople } from './CompanyPeople';
import { ContactAvatar } from '@/features/contacts/ContactAvatar';
import { ContactTags } from '@/features/contacts/ContactTags';
import { RestoreDialog } from '@/features/contacts/RestoreDialog';
import { useContactActions } from '@/features/contacts/use-contact-actions';

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

function Properties({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[minmax(6rem,auto)_1fr] gap-x-4 gap-y-2">
      {rows.map(([term, value]) => (
        <div key={term} className="contents">
          <dt className="text-muted-foreground">{term}</dt>
          <dd className="min-w-0 [overflow-wrap:anywhere] whitespace-pre-line">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Email, phone and website open the mail app, the dialer, a new tab. */
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
const webLink = (website: string | null) =>
  website && (
    <a
      href={/^https?:\/\//.test(website) ? website : `https://${website}`}
      target="_blank"
      rel="noreferrer"
      className="text-primary hover:underline"
    >
      {website}
    </a>
  );

/** A person's company: a link, marked when archived. */
function CompanyLink({ company }: { company: NonNullable<ContactDto['company']> }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Link to="/contacts/$id" params={{ id: company.id }} className="text-primary hover:underline">
        {company.name}
      </Link>
      {company.archived && (
        <span className="rounded-full border border-dashed px-1.5 text-xs text-muted-foreground">
          Archived
        </span>
      )}
    </span>
  );
}

/** A value a person takes from their company (slice 1.4, Q6), with where it comes from. */
function Synced({ value, company }: { value: ReactNode; company: ContactDto['company'] }) {
  if (!value) return '—';
  if (!company) return value;
  return (
    <>
      {value}
      <span className="block text-xs text-muted-foreground">From {company.name}</span>
    </>
  );
}

function address(contact: ContactDto): string {
  const country = contact.countryCode ? regionNames.of(contact.countryCode) : null;
  return [contact.street, contact.city, country].filter(Boolean).join('\n');
}

export function ContactDetail({ contact }: { contact: ContactDto }) {
  const navigate = useNavigate();
  const { archive, restore } = useContactActions();
  /** The action whose confirmation dialog is open. */
  const [confirming, setConfirming] = useState<'archive' | 'restore' | null>(null);
  const closeDialog = (open: boolean) => {
    if (!open) setConfirming(null);
  };
  const archived = contact.archivedAt !== null;
  const isCompany = contact.type === 'company';
  const { company } = contact;

  return (
    <div className="grid max-w-6xl gap-5">
      {archived && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed bg-muted px-4 py-2.5">
          <span>This contact is archived and hidden from lists.</span>
          <Button
            variant="outline"
            size="sm"
            disabled={restore.isPending}
            onClick={() => setConfirming('restore')}
          >
            Restore
          </Button>
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <ContactAvatar contact={contact} size="lg" />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-balance">{contact.name}</h1>
            <p className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
              {isCompany ? (
                <>
                  <Building2 className="size-4" aria-hidden />
                  Company
                  {contact.industry && ` · ${contact.industry.name}`}
                </>
              ) : (
                <>
                  {contact.jobTitle ?? 'Person'}
                  {company && (
                    <>
                      {' at '}
                      <CompanyLink company={company} />
                    </>
                  )}
                </>
              )}
            </p>
          </div>
        </div>
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
      </div>
      {/* Phones stack the cards in DOM order, so Sales comes right after Details. */}
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
                ['Website', webLink(contact.website)],
                ['Address', <Synced key="address" value={address(contact)} company={company} />],
                ['Tax ID', <Synced key="tax" value={contact.taxId} company={company} />],
                [
                  'Industry',
                  <Synced key="industry" value={contact.industry?.name} company={company} />,
                ],
                ['Tags', contact.tags.length > 0 && <ContactTags tags={contact.tags} />],
                ['Notes', contact.notes],
              ]}
            />
          </CardContent>
        </Card>
        <Card className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <CardHeader>
            <CardTitle>Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <Properties
              rows={[
                ['Salesperson', contact.salesperson?.name],
                ['Created', formatDate(contact.createdAt)],
                ['Updated', timeAgo(contact.updatedAt)],
              ]}
            />
          </CardContent>
        </Card>
        {isCompany && <CompanyPeople company={contact} />}
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
