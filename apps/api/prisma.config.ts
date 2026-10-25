import { defineConfig } from 'prisma/config';

// Prisma 7 reads the connection URL from here instead of the schema file.
// Tests point DATABASE_URL at the test database (see test/global-setup.ts).
export default defineConfig({
  schema: 'prisma/schema',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
