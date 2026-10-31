import { createFileRoute } from '@tanstack/react-router';

import { ComingSoon } from '@/components/ComingSoon';

// Placeholder until slice 1.3.
export const Route = createFileRoute('/contacts')({
  staticData: { title: 'Contacts' },
  component: () => (
    <ComingSoon
      title="Contacts"
      what="people at your client companies"
      features={[
        'Search, filter and sort your contacts',
        'See only your team’s contacts',
        'Owner and team on every record',
      ]}
    />
  ),
});
