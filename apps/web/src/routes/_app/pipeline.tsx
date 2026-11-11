import { createFileRoute } from '@tanstack/react-router';

import { ComingSoon } from '@/components/ComingSoon';

// Placeholder until slice 1.6 (leads and opportunities, Odoo crm.lead).
export const Route = createFileRoute('/_app/pipeline')({
  staticData: { title: 'Pipeline' },
  component: () => (
    <ComingSoon
      title="Pipeline"
      what="leads and opportunities, from the first contact to won or lost"
      features={[
        'Kanban board by stage',
        'Convert a lead into an opportunity',
        'Expected revenue and closing date',
      ]}
    />
  ),
});
