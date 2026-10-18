import { defineConfig } from 'vitest/config';

// Lets `pnpm vitest` at the root run every package; turbo still runs `test` per package.
export default defineConfig({
  test: {
    projects: ['apps/*', 'packages/*'],
  },
});
