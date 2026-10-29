import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { ESLint, type Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

// Lints the fixtures with the real eslint.config.mjs. Each line that must fail is marked with
// `// ✗ <kind>`; every other line must pass. Only boundary rules are compared (slice 0.6, Q5).
const repoRoot = join(import.meta.dirname, '../../..');
const fixturesDir = join(import.meta.dirname, 'boundaries/fixtures');
const MARKER = /\/\/ ✗ (\S+)/;

/** Which boundary a lint message is about, so a policy cannot hide behind another one. */
function kindOf(message: Linter.LintMessage): string | undefined {
  if (message.ruleId === 'import-x/no-cycle') return 'cycle';
  if (message.ruleId !== 'boundaries/dependencies') return undefined;
  if (message.message.startsWith('Only *.repository.ts')) return 'prisma';
  if (message.message.startsWith('Apps do not import each other')) return 'cross-app';
  if (message.message.includes('public API')) return 'public-api';
  return 'unknown-boundary';
}

function expectedViolations(): string[] {
  return readdirSync(fixturesDir, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.ts'))
    .flatMap((file) =>
      readFileSync(join(fixturesDir, file), 'utf8')
        .split('\n')
        .flatMap((line, index) => {
          const kind = MARKER.exec(line)?.[1];
          return kind ? [`${file}:${index + 1} ${kind}`] : [];
        }),
    )
    .sort();
}

describe('module boundary lint rules', () => {
  it('reports exactly the marked imports in the fixtures', async () => {
    // `ignore: false`: the fixtures are in globalIgnores so that `make lint` skips them.
    const eslint = new ESLint({ cwd: repoRoot, ignore: false });
    const results = await eslint.lintFiles([fixturesDir]);

    const actual = results
      .flatMap((result) =>
        result.messages.flatMap((message) => {
          const kind = kindOf(message);
          return kind ? [`${relative(fixturesDir, result.filePath)}:${message.line} ${kind}`] : [];
        }),
      )
      .sort();

    expect(actual).toEqual(expectedViolations());
    // Guards against markers and violations disappearing together. Update when fixtures change.
    expect(actual).toHaveLength(10);
  }, 60_000);
});
