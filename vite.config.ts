import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  publicDir: 'public',
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        app: resolve(__dirname, 'src/index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 8080,
    strictPort: false,
  },
  preview: {
    host: '0.0.0.0',
    port: 8080,
  },
  test: {
    browser: {
      enabled: true,
      headless: true,
      name: 'chrome',
    },
  },
});
