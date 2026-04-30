import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@marstv/core': resolve(__dirname, '../../packages/core/src/index.ts'),
      '@marstv/config': resolve(__dirname, '../../packages/config/src/index.ts'),
      '@marstv/ui-native': resolve(__dirname, '../../packages/ui-native/src/index.ts'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    globals: false,
    restoreMocks: true,
  },
});
