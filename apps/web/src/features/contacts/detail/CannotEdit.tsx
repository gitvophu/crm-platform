import { type ContactDto, contactName } from '@crm/shared';
import { Link } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';

/** `/contacts/$id/edit` without the right to edit (slice 1.3, Q9): say why instead of a form. */
export function CannotEdit({ contact }: { contact: ContactDto }) {
  const name = contactName(contact);
  return (
    <div className="grid justify-items-start gap-2 py-6">
      <span className="font-mono text-[13px] text-muted-foreground">403</span>
      <h1 className="text-2xl font-semibold tracking-tight">You can’t edit this contact</h1>
      <p className="text-muted-foreground">
        Only {contact.owner.name} (the owner) or a manager of the team can edit {name}.
      </p>
      <Button asChild size="sm" className="mt-2">
        <Link to="/contacts/$id" params={{ id: contact.id }}>
          Back to {name}
        </Link>
      </Button>
    </div>
  );
}
