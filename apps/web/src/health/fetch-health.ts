import type { HealthResponse, ServiceStatus } from '@crm/shared';

export const HEALTH_URL = '/api/health';

const isServiceStatus = (value: unknown): value is ServiceStatus =>
  value === 'ok' || value === 'error';

function isHealthResponse(body: unknown): body is HealthResponse {
  if (typeof body !== 'object' || body === null) return false;
  const { status, db } = body as Record<string, unknown>;
  return isServiceStatus(status) && isServiceStatus(db);
}

/**
 * 200 and 503 both carry a HealthResponse: 503 means the API is up but a dependency is not
 * (slice 0.4, Q3). Anything else, a body of another shape, or a network error means the API
 * itself is unreachable.
 */
export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(HEALTH_URL);
  if (res.status !== 200 && res.status !== 503) {
    throw new Error(`Unexpected status ${res.status} from ${HEALTH_URL}`);
  }
  const body: unknown = await res.json();
  if (!isHealthResponse(body)) {
    throw new Error(`Unexpected body from ${HEALTH_URL}`);
  }
  return body;
}
