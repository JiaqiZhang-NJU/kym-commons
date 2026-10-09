import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'scripts/**/*.test.mjs', 'server/**/*.test.mjs'],
  },
});
