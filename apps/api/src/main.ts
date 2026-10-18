// Placeholder until slice 0.2 scaffolds NestJS.
import { isHealthy, type HealthResponse } from '@crm/shared';

const health: HealthResponse = { status: 'ok', db: 'ok' };

console.log(`api placeholder: healthy=${isHealthy(health)}`);
