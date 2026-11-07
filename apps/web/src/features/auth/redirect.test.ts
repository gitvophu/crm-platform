import { describe, expect, it } from 'vitest';

import { safeRedirect } from './redirect';

describe('safeRedirect', () => {
  it.each(['/deals', '/contacts?page=2', '/'])('keeps the app path %s', (path) => {
    expect(safeRedirect(path)).toBe(path);
  });

  it.each([undefined, '', 'deals', '//evil.com', '/\\evil.com', 'https://evil.com', '/login'])(
    'falls back to the dashboard for %j',
    (target) => {
      expect(safeRedirect(target)).toBe('/');
    },
  );
});
