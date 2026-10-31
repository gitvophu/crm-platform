import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusDot } from './StatusDot';
import type { ServiceView } from './use-health';
import { HEALTH_REFETCH_MS, useHealth } from './use-health';

function ServiceRow({ name, detail, view }: { name: string; detail: string; view: ServiceView }) {
  return (
    <li className="flex items-center justify-between gap-3 border-t py-3 first:border-t-0">
      <div className="grid">
        <span>{name}</span>
        <span className="font-mono text-xs text-muted-foreground">{detail}</span>
      </div>
      <Badge variant="outline" className="gap-1.5">
        <StatusDot level={view.level} />
        {view.label}
      </Badge>
    </li>
  );
}

const timeFormat = new Intl.DateTimeFormat('en-GB', { timeStyle: 'medium' });

/** Dashboard card for the API and DB status; replaces the Phase 0 health line. */
export function SystemStatusCard() {
  const health = useHealth();

  return (
    <Card aria-busy={health.state === 'pending'}>
      <CardHeader>
        <CardTitle>System status</CardTitle>
        <CardDescription>
          {health.state === 'pending'
            ? 'Checking services…'
            : `Checked every ${HEALTH_REFETCH_MS / 1000} seconds.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {health.state === 'pending' ? (
          <div className="grid gap-3.5 py-2">
            <Skeleton className="h-3.5 w-3/5" />
            <Skeleton className="h-3.5 w-2/5" />
          </div>
        ) : (
          <>
            <ul>
              <ServiceRow name="API" detail="GET /api/health" view={health.api} />
              <ServiceRow name="Database" detail="PostgreSQL 18" view={health.db} />
            </ul>
            <p className="mt-3 text-xs text-muted-foreground tabular-nums">
              Last checked {timeFormat.format(health.checkedAt)}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
