import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup-env.ts'],
    // Integration test files share one test database and recreate its schema,
    // so they must not run at the same time
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
