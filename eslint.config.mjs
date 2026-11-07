// @ts-check
import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import boundaries from 'eslint-plugin-boundaries';
import importX from 'eslint-plugin-import-x';
import reactHooks from 'eslint-plugin-react-hooks';
import { reactRefresh } from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Every tsconfig that defines the `@/*` alias, so import resolvers map it to the right app.
const tsconfigs = [
  'apps/api/tsconfig.json',
  'apps/web/tsconfig.app.json',
  'packages/*/tsconfig.json',
];

const crossAppMessage = 'Apps do not import each other; share code through @crm/shared';

export default defineConfig(
  globalIgnores([
    '**/dist/',
    '**/coverage/',
    '**/.turbo/',
    '**/src/generated/',
    '**/src/routeTree.gen.ts',
    // Deliberate violations, linted only by apps/api/test/boundaries.test.ts.
    'apps/api/test/boundaries/fixtures/',
  ]),
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    // Not in recommendedTypeChecked; libraries announce their next breaking changes this way.
    rules: { '@typescript-eslint/no-deprecated': 'error' },
  },
  {
    // Module boundaries (ADR-0001, ADR-0003), and the same for web features (slice 1.3, Q13).
    // `basePattern` also matches the lint fixtures under apps/api/test/boundaries/fixtures/, which
    // reproduce the same src/ layout.
    files: ['**/*.{ts,tsx}'],
    plugins: { boundaries, 'import-x': importX },
    settings: {
      ...importX.flatConfigs.typescript.settings,
      // Turbo runs `eslint .` inside each package; paths must stay relative to the repo root.
      'boundaries/root-path': import.meta.dirname,
      'boundaries/legacy-templates': false,
      // The closest match to a file wins, so a module beats the app that contains it.
      'boundaries/elements': [
        { type: 'module', pattern: 'src/modules/*', basePattern: 'apps/api', capture: ['name'] },
        {
          type: 'feature',
          pattern: 'src/features/*',
          basePattern: '**/apps/web',
          capture: ['name'],
        },
        { type: 'prisma', pattern: 'src/{prisma,generated}', basePattern: 'apps/api' },
        { type: 'api', pattern: 'apps/api' },
        { type: 'web', pattern: 'apps/web' },
        { type: 'shared', pattern: 'packages/shared' },
      ],
      // A repository's own test sets up PrismaService too.
      'boundaries/files': [{ category: 'repository', pattern: '**/*.repository{,.test}.ts' }],
      'import/resolver': { typescript: { project: tsconfigs } },
      'import-x/resolver-next': [createTypeScriptImportResolver({ project: tsconfigs })],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          // The last matching policy wins: general disallows first, then the exceptions.
          default: 'allow',
          policies: [
            {
              from: { element: { type: 'api' } },
              disallow: { to: { element: { type: 'module' } } },
              message: 'Import modules through their public API ({{to.element.path}}/index.ts)',
            },
            {
              from: { element: { type: 'module' } },
              disallow: {
                to: {
                  element: {
                    type: 'module',
                    captured: { name: '!{{ from.element.captured.name }}' },
                  },
                },
              },
              message:
                'Import other modules through their public API ({{to.element.path}}/index.ts)',
            },
            {
              from: { element: { type: 'web' } },
              disallow: { to: { element: { type: 'feature' } } },
              message: 'Import features through their public API ({{to.element.path}}/index.ts)',
            },
            {
              from: { element: { type: 'feature' } },
              disallow: {
                to: {
                  element: {
                    type: 'feature',
                    captured: { name: '!{{ from.element.captured.name }}' },
                  },
                },
              },
              message:
                'Import other features through their public API ({{to.element.path}}/index.ts)',
            },
            {
              allow: {
                to: {
                  element: {
                    types: { anyOf: ['module', 'feature'] },
                    fileInternalPath: 'index.ts',
                  },
                },
              },
            },
            {
              // Value imports only: services may still name the model types a repository returns.
              from: { element: { type: 'module' } },
              disallow: { to: { element: { type: 'prisma' } }, dependency: { kind: 'value' } },
              message: 'Only *.repository.ts may use PrismaService or the Prisma client (ADR-0003)',
            },
            {
              from: { element: { type: 'module' }, file: { categories: 'repository' } },
              allow: { to: { element: { type: 'prisma' } } },
            },
            {
              from: { element: { types: { anyOf: ['api', 'module', 'prisma', 'shared'] } } },
              disallow: { to: { element: { types: { anyOf: ['web', 'feature'] } } } },
              message: crossAppMessage,
            },
            {
              from: { element: { types: { anyOf: ['web', 'feature', 'shared'] } } },
              disallow: { to: { element: { types: { anyOf: ['api', 'module', 'prisma'] } } } },
              message: crossAppMessage,
            },
          ],
        },
      ],
    },
  },
  {
    // A cycle between modules (or web features) means their boundaries are wrong (Nest would need
    // forwardRef).
    files: [
      'apps/api/src/modules/**/*.ts',
      'apps/web/src/features/**/*.{ts,tsx}',
      'apps/api/test/boundaries/fixtures/src/modules/**/*.ts',
      'apps/api/test/boundaries/fixtures/apps/web/src/features/**/*.ts',
    ],
    rules: { 'import-x/no-cycle': 'error' },
  },
  {
    // `@/` across folders, `./` within a folder (slice 0.6).
    files: ['apps/*/{src,test}/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        // Any `..` segment: `../x`, `..`, `./../x`.
        { patterns: [{ regex: '(^|/)\\.\\.(/|$)', message: 'Use the @/ alias instead of ../' }] },
      ],
    },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat['recommended-latest'], reactRefresh.configs.vite()],
    languageOptions: { globals: globals.browser },
    rules: {
      // TanStack Router leaves a route by `throw redirect(...)` / `throw notFound()`, not Errors.
      '@typescript-eslint/only-throw-error': [
        'error',
        {
          allow: [
            {
              from: 'package',
              package: '@tanstack/router-core',
              name: ['Redirect', 'NotFoundError'],
            },
          ],
        },
      ],
    },
  },
  {
    // A route file exports `Route` next to its components. The router plugin splits the
    // components into their own modules, so fast refresh still works (slice 1.1).
    files: ['apps/web/src/routes/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // Generated by the shadcn CLI and kept close to upstream, so updates stay easy to diff.
    files: ['apps/web/src/components/ui/**', 'apps/web/src/hooks/use-mobile.ts'],
    rules: {
      'react-refresh/only-export-components': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // Config files are not part of any tsconfig project.
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  prettier,
);
