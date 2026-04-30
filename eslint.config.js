import js from '@eslint/js';
import globals from 'globals';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      // TypeScript
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // React
      ...reactPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // Not needed with React 17+ JSX transform
      'react/prop-types': 'off',         // We use TypeScript instead
      'react/no-unescaped-entities': 'warn',

      // React Hooks
      ...reactHooksPlugin.configs.recommended.rules,
      'react-hooks/set-state-in-effect': 'warn',

      // General
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': 'off', // Handled by @typescript-eslint/no-unused-vars
      'no-undef': 'off', // TypeScript handles undefined identifiers; avoids false positives on types
      'no-empty': 'warn',
      'no-useless-escape': 'warn',

      // Path Alias Enforcement - Prefer @/ over deep relative imports
      'no-restricted-imports': [
        'warn',
        {
          patterns: [
            {
              group: ['../*', '../../*', '../../../*', '../../../../*'],
              message: 'Use @/ path aliases instead of deep relative imports. Example: import { useStore } from "@/store" instead of "../../store"',
            },
          ],
        },
      ],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', '*.config.js', '*.config.ts'],
  },
];
