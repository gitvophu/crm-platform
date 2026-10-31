import { createFileRoute } from '@tanstack/react-router';

import { ComingSoon } from '@/components/ComingSoon';

// Placeholder until slice 1.4.
export const Route = createFileRoute('/companies')({
  staticData: { title: 'Companies' },
  component: () => (
    <ComingSoon
      title="Companies"
      what="the brands and businesses Nova works for"
      features={[
        'Company profile and industry',
        'Contacts that belong to the company',
        'Deals and activity in one place',
      ]}
    />
  ),
});
