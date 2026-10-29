import { webStub } from '../../../apps/web/src/web-stub.js'; // ✗ cross-app

import { AlphaService } from '../alpha/index.js'; // ✗ cycle
import { BetaRepository } from './beta.repository.js';

export class BetaService {
  constructor(
    readonly repository: BetaRepository,
    readonly alpha: AlphaService,
  ) {}

  readonly web = webStub;
}
