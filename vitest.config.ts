import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    clearMocks: true,
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
  },
});
