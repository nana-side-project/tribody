import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
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

/**
 * Static build: write every emitted file (entry JS/CSS, App, page chunks, the 3D viewer JS + CSS) and the public
 * files into dist/sw.js, plus a version derived from that list, so the service worker precaches the whole app at
 * install (offline after the first visit) and a new deploy gets a new cache (old hashed files are dropped).
 */
function precacheManifest(): Plugin {
  const MARK = /\/\*__TRIBODY_BUILD__\*\/[\s\S]*?\/\*__TRIBODY_BUILD_END__\*\//;
  return {
    name: 'tribody-precache-manifest',
    apply: 'build',
    writeBundle(options, bundle) {
      const dir = options.dir;
      if (!dir) return;
      const sw = join(dir, 'sw.js');
      if (!existsSync(sw)) return;
      const pub = new URL('./public/', import.meta.url);
      const publicFiles = readdirSync(pub).filter((f) => f !== 'sw.js' && !f.startsWith('.'));
      const files = [...new Set([...Object.keys(bundle), ...publicFiles])]
        .filter((f) => f !== 'sw.js' && !f.endsWith('.map'))
        .sort();
      const hash = createHash('sha256');
      for (const f of files) hash.update(f);
      const html = bundle['index.html'];
      if (html && html.type === 'asset') hash.update(typeof html.source === 'string' ? html.source : Buffer.from(html.source));
      const build = { version: hash.digest('hex').slice(0, 12), files };
      const src = readFileSync(sw, 'utf8');
      if (!MARK.test(src)) throw new Error('public/sw.js: build marker not found');
      writeFileSync(sw, src.replace(MARK, JSON.stringify(build)));
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: './',
  cacheDir: process.env.VITE_CACHE_DIR || 'node_modules/.vite',
  plugins: [react(), ...(mode === 'single' ? [singleFileHead(), viteSingleFile()] : [precacheManifest()])],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 2000,
    // single mode: no public/ copies (icons, manifest, sw.js) next to the one HTML file
    copyPublicDir: mode !== 'single',
  },
  server: { host: '127.0.0.1' },
  test: { include: ['src/**/*.test.ts'] },
}));
