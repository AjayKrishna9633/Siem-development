import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    ignores: ['dist/**', 'node_modules/**', 'build/**', '.env', 'scripts/**'],
  },
  {
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      // Private fields (including constructor parameter properties) start with "_".
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: ['classProperty', 'parameterProperty'],
          modifiers: ['private'],
          format: null,
          leadingUnderscore: 'require',
        },
      ],
    },
  },
);
