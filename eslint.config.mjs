import js from '@eslint/js';
import typescript from 'typescript-eslint';

export default typescript.config(
  js.configs.recommended,
  typescript.configs.recommended,
  {
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  }
);
