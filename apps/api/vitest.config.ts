import swc from 'unplugin-swc';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  // esbuild (Vite default) does not emit decorator metadata, which Nest DI relies on.
  plugins: [swc.vite({ module: { type: 'es6' } })],
  // `@/*` alias from tsconfig.json (slice 0.6, Q4).
  resolve: { tsconfigPaths: true },
  test: {
    // dist/ is build output; never run compiled copies of the tests.
    exclude: [...configDefaults.exclude, 'dist/**'],
    globalSetup: ['./test/global-setup.ts'],
    restoreMocks: true,
    // Tests must never touch the dev database.
    // Logging tests use their own in-memory logger. Elsewhere keep only errors, which explain a
    // failing test without flooding the output.
    env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? '', LOG_LEVEL: 'error' },
  },
});
