import { execFileSync } from 'node:child_process';

/** Recreates the test database from migrations once per test run (slice 0.3, Q14). */
export default function setup(): void {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error('TEST_DATABASE_URL is not set. Run tests with `make test`.');
  }
  // `migrate reset` drops everything: refuse anything that does not look like a test database.
  const dbName = new URL(url).pathname.slice(1);
  if (!dbName.endsWith('_test')) {
    throw new Error(
      `Refusing to reset "${dbName}": TEST_DATABASE_URL must point to a *_test database.`,
    );
  }
  execFileSync('prisma', ['migrate', 'reset', '--force'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });
}
