import { isHealthy } from '@crm/shared';
import { useQuery } from '@tanstack/react-query';

import { fetchHealth } from './fetch-health';

export const HEALTH_REFETCH_MS = 10_000;

export type HealthLevel = 'ok' | 'warn' | 'down';

export interface ServiceView {
  level: HealthLevel;
  label: string;
}

export type HealthView =
  | { state: 'pending' }
  | {
      state: 'ready';
      level: HealthLevel;
      summary: string;
      api: ServiceView;
      db: ServiceView;
      checkedAt: number;
    };

/**
 * Polls `/api/health`. The dashboard card and the sidebar footer share this query. An error is
 * not shown as a load error: an unreachable API is itself the status to report.
 */
export function useHealth(): HealthView {
  const query = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: HEALTH_REFETCH_MS,
    // Show "unreachable" as soon as the API is down instead of retrying for several seconds.
    retry: false,
  });

  if (query.isPending) return { state: 'pending' };
  // A failed refetch keeps the last data, so check the error first.
  if (query.isError) {
    return {
      state: 'ready',
      level: 'down',
      summary: 'Can’t reach the API',
      api: { level: 'down', label: 'Unreachable' },
      db: { level: 'warn', label: 'Unknown' },
      checkedAt: query.errorUpdatedAt,
    };
  }
  const online: ServiceView = { level: 'ok', label: 'Online' };
  const healthy = isHealthy(query.data);
  return {
    state: 'ready',
    level: healthy ? 'ok' : 'warn',
    summary: healthy ? 'All systems operational' : 'Database unavailable',
    api: online,
    db: query.data.db === 'ok' ? online : { level: 'down', label: 'Unavailable' },
    checkedAt: query.dataUpdatedAt,
  };
}
