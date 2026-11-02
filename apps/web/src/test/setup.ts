import '@testing-library/jest-dom/vitest';

import type { AuthUser, HealthResponse } from '@crm/shared';
import { cleanup } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { toast } from 'sonner';
import { afterAll, afterEach, beforeAll } from 'vitest';

/** The signed-in user of the default handlers. */
export const testUser: AuthUser = {
  id: '019a3c1e-0000-7000-8000-000000000001',
  email: 'manager@nova.test',
  name: 'Linh Tran',
  role: 'manager',
  team: { id: '019a3c1e-0000-7000-8000-0000000000aa', name: 'Growth' },
};

/**
 * Shared MSW server; each test adds its own handlers with `server.use(...)`. By default the user
 * is signed in and the API healthy: every page checks the session, the sidebar polls health.
 */
export const server = setupServer(
  http.get('/api/auth/me', () => HttpResponse.json(testUser)),
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

// jsdom has no ResizeObserver; Radix popovers (tooltip, dropdown menu) measure with it. A
// tooltip opens on hover after a delay, so without this a slow test run crashes at random.
window.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  cleanup();
  // Sonner keeps toasts in a module-level store; do not leak them into the next test.
  toast.dismiss();
  server.resetHandlers();
});
afterAll(() => server.close());
