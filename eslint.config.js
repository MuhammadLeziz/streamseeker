// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
      eslintPluginPrettierRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error'],
        },
      ],
      // 'padded-blocks': ['error', { classes: 'always' }],
      quotes: ['warn', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
      'object-curly-spacing': ['warn', 'always'],
      'template-curly-spacing': ['warn', 'always'],
      semi: 'warn',
      'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        {
          accessibility: 'no-public',
        },
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: ['interface'],
          format: ['PascalCase'],
          trailingUnderscore: 'allow',
          custom: {
            regex: '^I[A-Z]',
            match: true,
          },
        },
        {
          selector: ['typeProperty', 'objectLiteralProperty'],
          format: null,
        },
        {
          selector: ['enumMember'],
          format: ['UPPER_CASE'],
          leadingUnderscore: 'forbid',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [
      angular.configs.templateRecommended,
      angular.configs.templateAccessibility,
      eslintPluginPrettierRecommended,
    ],
    rules: {
      '@angular-eslint/template/banana-in-box': ['error'],
      '@angular-eslint/template/eqeqeq': ['warn'],
      '@angular-eslint/template/elements-content': ['error'],
      '@angular-eslint/template/no-nested-tags': ['error'],
      '@angular-eslint/template/prefer-self-closing-tags': ['error'],
    },
  },
]);
