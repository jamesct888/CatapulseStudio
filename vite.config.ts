
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  // @ts-ignore
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'e2e/**'], // Exclude Playwright E2E tests
    setupFiles: ['./utils/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['utils/logic.ts', 'components/**'], // Focus coverage on the logic engine and components
    },
  },
  server: {
    port: 3000,
    open: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './')
    }
  }
});
