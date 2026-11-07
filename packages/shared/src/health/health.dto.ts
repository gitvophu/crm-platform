export type ServiceStatus = 'ok' | 'error';

/** Response body of `GET /health`. */
export interface HealthResponse {
  status: ServiceStatus;
  db: ServiceStatus;
}
