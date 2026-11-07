import { betaApi } from '../../beta/index.js'; // ✗ cycle

export const alphaList: unknown[] = ['alpha', betaApi];
