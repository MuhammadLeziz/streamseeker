// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      eslintPluginPrettierRecommended,
    ],
    rules: {
      // The interface prefix is a repository-wide convention, inherited from
      // the Angular starter's rule and applied here so the two sides of the
      // monorepo read the same way.
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: ['interface'],
          format: ['PascalCase'],
          custom: { regex: '^I[A-Z]', match: true },
        },
      ],
      // NestJS builds objects out of decorated class properties, which have no
      // initialiser and no explicit accessibility by design.
      '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'no-public' }],
      // The seeder is a command line script and reports what it did.
      'no-console': 'off',
      quotes: ['warn', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
      semi: 'warn',
    },
  },
]);
