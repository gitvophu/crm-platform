import { AlphaService } from './modules/alpha/index.js';
import { BetaRepository } from './modules/beta/beta.repository.js'; // ✗ public-api

export const app = [AlphaService, BetaRepository];
