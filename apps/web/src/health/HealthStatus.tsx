import { isHealthy } from '@crm/shared';
import { useQuery } from '@tanstack/react-query';

import { fetchHealth } from './fetch-health';

export const HEALTH_REFETCH_MS = 10_000;

export function HealthStatus() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: HEALTH_REFETCH_MS,
    // Show "unreachable" as soon as the API is down instead of retrying for several seconds.
    retry: false,
  });

  if (isPending) return <p className="health health--loading">Đang kiểm tra API…</p>;
  if (isError) return <p className="health health--error">API: không kết nối được</p>;

  const modifier = isHealthy(data) ? 'ok' : 'error';
  return (
    <p className={`health health--${modifier}`}>
      API: {data.status}, DB: {data.db}
    </p>
  );
}
