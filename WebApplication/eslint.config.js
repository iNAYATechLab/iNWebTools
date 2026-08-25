// @ts-check
/**
 * iNWebTools — ESLint flat configuration (monorepo root).
 * Applies to both the Express server and the React client workspaces.
 */
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      'release/**',
      'server/tmp/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  /* ---------------------------- Shared rules ---------------------------- */
  {
    files: ['**/*.{ts,tsx,js,mjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  /* ------------------------------ Server -------------------------------- */
  {
    // .mjs included: CLI helpers such as db/migrate.mjs are Node programs too.
    files: ['server/**/*.{js,mjs}'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  /* --------------------------- Node CLI scripts -------------------------- */
  {
    // Operator-facing scripts talk to a terminal, so stdout is their interface
    // rather than a stray debug statement.
    files: ['server/db/*.mjs', 'DevelopmentFiles/scripts/**/*.mjs'],
    rules: {
      'no-console': 'off',
    },
  },

  /* ------------------------------ Client -------------------------------- */
  {
    files: ['client/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  /* ------------------------------- Tests -------------------------------- */
  {
    files: ['**/tests/**/*.{ts,js}', '**/*.test.{ts,js}'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  prettier,
);
