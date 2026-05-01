import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@marstv/core': resolve(__dirname, '../../packages/core/src/index.ts'),
      '@marstv/ui-web': resolve(__dirname, '../../packages/ui-web/src/index.ts'),
      '@marstv/ui-shared': resolve(__dirname, '../../packages/ui-shared/src/index.ts'),
      '@marstv/config': resolve(__dirname, '../../packages/config/src/index.ts'),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
