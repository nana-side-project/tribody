// Generates the TriBody app icons (original artwork) into public/.
// Usage: node scripts/make-icons.mjs
// Writes icon.svg (favicon), icon-maskable.svg, and renders PNGs with Playwright:
//   icon-192.png, icon-512.png (rounded, purpose "any"), icon-maskable-512.png (full bleed, safe zone),
//   apple-touch-icon.png (180, full bleed — iOS rounds it).
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = createRequire('/opt/node-tools/')('playwright'));
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = (f) => join(root, 'public', f);

const C = {
  bgTop: '#c25d56',
  bgBottom: '#a5463f',
  belly: '#fbf4ee',
  fibre: '#e6a49e',
  tendon: '#e9dcc0',
  origin: '#d9772b',
  insertion: '#3f6fd1',
};

/** The mark: a fusiform muscle belly between an origin (orange) and an insertion (blue) dot. 64-unit art box. */
function art() {
  return `
  <g transform="rotate(-38 32 32)">
    <path d="M32 11 L32 17" stroke="${C.tendon}" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M32 47 L32 53" stroke="${C.tendon}" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M32 16 C 43 22, 43 42, 32 48 C 21 42, 21 22, 32 16 Z" fill="${C.belly}"/>
    <path d="M32 19 C 30 28, 30 36, 32 45 M27.5 24 C 26.5 30, 26.5 34, 28 40 M36.5 24 C 37.5 30, 37.5 34, 36 40"
      stroke="${C.fibre}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <circle cx="32" cy="10" r="4" fill="${C.origin}" stroke="${C.belly}" stroke-width="1.8"/>
    <circle cx="32" cy="54" r="4" fill="${C.insertion}" stroke="${C.belly}" stroke-width="1.8"/>
  </g>`;
}

function svg({ rounded, scale }) {
  // scale < 1 shrinks the art toward the centre (maskable safe zone)
  const t = (1 - scale) * 32;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.bgTop}"/>
      <stop offset="1" stop-color="${C.bgBottom}"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" ${rounded ? 'rx="14"' : ''} fill="url(#g)"/>
  <g transform="translate(${t} ${t}) scale(${scale})">${art()}</g>
</svg>
`;
}

const any = svg({ rounded: true, scale: 1 });
const full = svg({ rounded: false, scale: 0.92 });
const maskable = svg({ rounded: false, scale: 0.72 });
writeFileSync(pub('icon.svg'), any);
writeFileSync(pub('icon-maskable.svg'), maskable);

const browser = await chromium.launch();
const page = await browser.newPage();
async function render(markup, size, file) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${markup.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`,
  );
  await page.screenshot({ path: pub(file), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  console.log('wrote public/' + file);
}
await render(any, 192, 'icon-192.png');
await render(any, 512, 'icon-512.png');
await render(maskable, 512, 'icon-maskable-512.png');
await render(full, 180, 'apple-touch-icon.png');
await browser.close();
