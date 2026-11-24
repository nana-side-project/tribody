import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`         → dist/        (static site, e.g. GitHub Pages)
// `npm run build:single`  → dist-single/ (one self-contained index.html for previews)
// Agents running dev servers in parallel set VITE_CACHE_DIR to avoid clobbering each other.
export default defineConfig(({ mode }) => ({
  base: './',
  cacheDir: process.env.VITE_CACHE_DIR || 'node_modules/.vite',
  plugins: [react(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 2000,
  },
  server: { host: '127.0.0.1' },
  test: { include: ['src/**/*.test.ts'] },
}));
