import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser'; 
import tsPlugin from '@typescript-eslint/eslint-plugin'; 

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'], 
    languageOptions: {
      parser: tsParser, 
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
      '@typescript-eslint': tsPlugin, 
    },
    rules: {
      'no-unused-vars': 'off', 
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'off', 
      'no-console': 'off', 
    },
  },
  {
    files: ['**/*.js', '**/*.jsx'], 
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
      'no-undef': 'error', 
      'no-unused-vars': 'warn', 
      'no-console': 'off', 
    },
  },
];