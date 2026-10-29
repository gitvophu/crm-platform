import { AlphaService } from './modules/alpha/index.js';
import { BetaRepository } from './modules/beta/beta.repository.js'; // ✗ boundaries/dependencies

export const app = [AlphaService, BetaRepository];
