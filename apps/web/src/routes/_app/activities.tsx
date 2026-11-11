import { createFileRoute } from '@tanstack/react-router';

import { ComingSoon } from '@/components/ComingSoon';

// Placeholder until slice 1.7 (activities and chatter).
export const Route = createFileRoute('/_app/activities')({
  staticData: { title: 'Activities' },
  component: () => (
    <ComingSoon
      title="Activities"
      what="calls, meetings and notes with clients"
      features={[
        'Log a call, meeting or note',
        'Timeline on contacts, leads and opportunities',
        'Who did what, and when',
      ]}
    />
  ),
});
