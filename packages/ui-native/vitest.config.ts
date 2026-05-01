import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-native': resolve(__dirname, 'src/__mocks__/react-native.ts'),
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
