import { createFileRoute } from '@tanstack/react-router';

import { ComingSoon } from '@/components/ComingSoon';

// Placeholder until slice 1.6.
export const Route = createFileRoute('/activities')({
  staticData: { title: 'Activities' },
  component: () => (
    <ComingSoon
      title="Activities"
      what="calls, meetings and notes with clients"
      features={[
        'Log a call, meeting or note',
        'Timeline on contacts, companies and deals',
        'Who did what, and when',
      ]}
    />
  ),
});
