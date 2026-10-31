import { createFileRoute } from '@tanstack/react-router';

import { PageHeader } from '@/components/PageHeader';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SystemStatusCard } from '@/health/SystemStatusCard';

export const Route = createFileRoute('/')({
  staticData: { title: 'Dashboard' },
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="grid max-w-5xl gap-5">
      <PageHeader title="Dashboard" description="Overview of your workspace." />
      <div className="grid items-start gap-4 md:grid-cols-2">
        <SystemStatusCard />
        <Card>
          <CardHeader>
            <CardTitle>Getting started</CardTitle>
            <CardDescription>
              Contacts, companies and deals will show up here as they are added to Nova CRM.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
