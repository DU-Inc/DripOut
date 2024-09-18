import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser'; // Import TypeScript parser
import tsPlugin from '@typescript-eslint/eslint-plugin'; // Import TypeScript plugin

export default [
  js.configs.recommended, // Use the recommended JavaScript rules
  {
    files: ['**/*.ts', '**/*.tsx'], // Target TypeScript files
    languageOptions: {
      parser: tsParser, // Use TypeScript parser for TS files
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        window: 'readonly',
        document: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin, // Add TypeScript plugin for linting
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off', // Disable warnings for unused variables in TypeScript
      '@typescript-eslint/no-explicit-any': 'off', // Allow 'any' type in TypeScript
      'no-console': 'off', // Allow console.log statements
    },
  },
  {
    files: ['**/*.js', '**/*.jsx'], // Target JavaScript files
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        window: 'readonly',
        document: 'readonly',
      },
    },
    rules: {
      'no-undef': 'error', // Ensure variables are defined in JS
      'no-unused-vars': 'off', // Disable warnings for unused variables in JS
      'no-console': 'off', // Allow console.log statements
    },
  },
];