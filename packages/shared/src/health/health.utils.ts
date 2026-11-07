import type { HealthResponse } from './health.dto.js';

export function isHealthy(health: HealthResponse): boolean {
  return health.status === 'ok' && health.db === 'ok';
}
