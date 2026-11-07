import { alphaList } from '../alpha/index.js'; // ✗ cycle
import { alphaList as deep } from '../alpha/list/alpha-list.js'; // ✗ public-api

export const betaApi: unknown[] = [alphaList, deep];
