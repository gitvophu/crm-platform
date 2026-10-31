import { createFileRoute } from '@tanstack/react-router';

import { ComingSoon } from '@/components/ComingSoon';

// Placeholder until slice 1.5.
export const Route = createFileRoute('/deals')({
  staticData: { title: 'Deals' },
  component: () => (
    <ComingSoon
      title="Deals"
      what="service contracts, one-off or monthly retainer"
      features={[
        'Pipeline board from lead to won',
        'Drag a deal to change its stage',
        'Contract value and type',
      ]}
    />
  ),
});
