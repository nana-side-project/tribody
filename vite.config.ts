import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`         → dist/        (static site, e.g. GitHub Pages)
// `npm run build:single`  → dist-single/ (one self-contained index.html for previews)
// Agents running dev servers in parallel set VITE_CACHE_DIR to avoid clobbering each other.

/** Single-file build: there are no sibling files, so inline the SVG icon and drop links to PNG icons / manifest. */
function singleFileHead(): Plugin {
  return {
    name: 'tribody-single-file-head',
    transformIndexHtml(html) {
      const svg = readFileSync(new URL('./public/icon.svg', import.meta.url), 'utf8');
      const dataUri = `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`;
      return html
        .replace(/<link rel="icon" href="\.?\/icon\.svg"[^>]*>/, `<link rel="icon" href="${dataUri}" type="image/svg+xml" />`)
        .replace(/\s*<link rel="icon" href="\.?\/icon-192\.png"[^>]*>/, '')
        .replace(/\s*<link rel="apple-touch-icon"[^>]*>/, '')
        .replace(/\s*<link rel="manifest"[^>]*>/, '');
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: './',
  cacheDir: process.env.VITE_CACHE_DIR || 'node_modules/.vite',
  plugins: [react(), ...(mode === 'single' ? [singleFileHead(), viteSingleFile()] : [])],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 2000,
    // single mode: no public/ copies (icons, manifest, sw.js) next to the one HTML file
    copyPublicDir: mode !== 'single',
  },
  server: { host: '127.0.0.1' },
  test: { include: ['src/**/*.test.ts'] },
}));
