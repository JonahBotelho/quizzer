/** Vite build, locale-owned document title, and unit-test configuration. */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import appCopy from './src/locales/en-CA/app.json';
import { pdfAssets } from './build/pdfAssets';
export default defineConfig({
  plugins: [react(), pdfAssets(), {
    name: 'localised-document-title',
    transformIndexHtml: () => [{ tag: 'title', children: appCopy.brand, injectTo: 'head' }],
  }], base: './',
  worker: { format: 'es' },
  test: { include: ['src/tests/**/*.test.ts'], environment: 'node' },
});
