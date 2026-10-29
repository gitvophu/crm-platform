import { fetchHealth } from '../../../../../../../web/src/health/fetch-health.js'; // ✗ boundaries/dependencies

import { AlphaService } from '../alpha/index.js'; // ✗ import-x/no-cycle
import { BetaRepository } from './beta.repository.js';

export class BetaService {
  constructor(
    readonly repository: BetaRepository,
    readonly alpha: AlphaService,
  ) {}

  readonly health = fetchHealth;
}
