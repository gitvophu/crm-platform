// Placeholder until slice 0.3 scaffolds Vite + React.
import { isHealthy, type HealthResponse } from '@crm/shared';

const health: HealthResponse = { status: 'ok', db: 'ok' };

document.title = `web placeholder: healthy=${isHealthy(health)}`;
