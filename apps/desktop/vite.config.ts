import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@marstv/core': resolve(__dirname, '../../packages/core/src/index.ts'),
      '@marstv/ui-web': resolve(__dirname, '../../packages/ui-web/src/index.ts'),
      '@marstv/ui-shared': resolve(__dirname, '../../packages/ui-shared/src/index.ts'),
      '@marstv/config': resolve(__dirname, '../../packages/config/src/index.ts'),
    },
  },
  server: {
    port: 1420,
    strictPort: true,
  },
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_'],
});
