export type ServiceStatus = 'ok' | 'error';

/** Response body of `GET /health`. */
export interface HealthResponse {
  status: ServiceStatus;
  db: ServiceStatus;
}

export function isHealthy(health: HealthResponse): boolean {
  return health.status === 'ok' && health.db === 'ok';
}
