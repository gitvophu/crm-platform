import '@testing-library/jest-dom/vitest';

import type { HealthResponse } from '@crm/shared';
import { cleanup } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { toast } from 'sonner';
import { afterAll, afterEach, beforeAll } from 'vitest';

/**
 * Shared MSW server; each test adds its own handlers with `server.use(...)`. The sidebar polls
 * the health endpoint on every page, so a healthy answer is the default.
 */
export const server = setupServer(
  http.get('/api/health', () => HttpResponse.json<HealthResponse>({ status: 'ok', db: 'ok' })),
);

// jsdom has no matchMedia; the shadcn sidebar uses it to detect a mobile viewport.
// Typed as always present, so check the value at runtime.
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) satisfies MediaQueryList;
}

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  cleanup();
  // Sonner keeps toasts in a module-level store; do not leak them into the next test.
  toast.dismiss();
  server.resetHandlers();
});
afterAll(() => server.close());
