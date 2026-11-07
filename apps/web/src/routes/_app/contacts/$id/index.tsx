import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import { ContactDetail, contactQueries } from '@/features/contacts';

export const Route = createFileRoute('/_app/contacts/$id/')({
  component: ContactPage,
});

function ContactPage() {
  const { id } = Route.useParams();
  // Loaded by the parent route before this renders.
  const { data: contact } = useSuspenseQuery(contactQueries.detail(id));
  return <ContactDetail contact={contact} />;
}
