import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // `@/*` alias from tsconfig.app.json (slice 0.6, Q8).
  resolve: { tsconfigPaths: true },
  server: {
    // Listen on every interface so the port published by compose reaches the dev server.
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      // Same-origin calls, no CORS: /api/health → http://api:3000/health (slice 0.4, Q1).
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://api:3000',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
  },
});
