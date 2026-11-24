// Screenshot helper for visual verification (used by humans and agents).
// Usage: node scripts/shot.mjs <url> <out.png> [--w 390] [--h 844] [--wait 1200] [--full] [--dsf 1]
//        [--click "<css selector>"] [--dark]
// Prints browser console errors/warnings and page errors so runtime problems are visible.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const VALUE_FLAGS = new Set(['w', 'h', 'wait', 'dsf', 'click']);
const opts = {};
const pos = [];
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const k = a.slice(2);
    if (VALUE_FLAGS.has(k)) opts[k] = argv[++i];
    else opts[k] = true;
  } else pos.push(a);
}
const flag = (name, def) => (opts[name] !== undefined ? opts[name] : def);
const has = (name) => opts[name] === true;
const [url, out = 'shots/shot.png'] = pos;
if (!url) {
  console.error('usage: node scripts/shot.mjs <url> <out.png> [--w 390 --h 844 --wait 1200 --full --dsf 1 --click sel --dark]');
  process.exit(1);
}
mkdirSync(dirname(out), { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({
  viewport: { width: +flag('w', 390), height: +flag('h', 844) },
  deviceScaleFactor: +flag('dsf', 1),
  colorScheme: has('dark') ? 'dark' : 'light',
});
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') console.log(`[console.${m.type()}] ${m.text()}`);
});
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: 'load', timeout: 30000 });
const click = flag('click');
if (click) {
  await page.click(click);
}
await page.waitForTimeout(+flag('wait', 1200));
await page.screenshot({ path: out, fullPage: has('full') });
console.log('saved', out);
await browser.close();
