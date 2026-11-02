import { defineConfig } from 'prisma/config';

// Prisma 7 reads the connection URL from here instead of the schema file.
// Tests point DATABASE_URL at the test database (see test/global-setup.ts).
export default defineConfig({
  schema: 'prisma/schema',
  // `prisma db seed` (`make seed`). tsx maps the `.js` imports of the generated client to `.ts`.
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
