import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

// Lints the fixtures with the real eslint.config.mjs. Each line that must fail is marked with
// `// ✗ <rule>`; every other line must pass. Only boundary rules are compared (slice 0.6, Q5).
const repoRoot = join(import.meta.dirname, '../../..');
const fixturesDir = join(import.meta.dirname, 'boundaries/fixtures');
const BOUNDARY_RULES = new Set(['boundaries/dependencies', 'import-x/no-cycle']);
const MARKER = /\/\/ ✗ (\S+)/;

function expectedViolations(): string[] {
  return readdirSync(fixturesDir, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.ts'))
    .flatMap((file) =>
      readFileSync(join(fixturesDir, file), 'utf8')
        .split('\n')
        .flatMap((line, index) => {
          const rule = MARKER.exec(line)?.[1];
          return rule ? [`${file}:${index + 1} ${rule}`] : [];
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
        result.messages
          .filter((message) => message.ruleId && BOUNDARY_RULES.has(message.ruleId))
          .map(
            (message) =>
              `${relative(fixturesDir, result.filePath)}:${message.line} ${message.ruleId}`,
          ),
      )
      .sort();

    expect(actual).toEqual(expectedViolations());
    // Guards against markers and violations disappearing together. Update when fixtures change.
    expect(actual).toHaveLength(8);
  }, 60_000);
});
