// TriBody service worker — cache-first app shell for offline use.
// Registered only on https top-level pages (see src/main.tsx).
// - Install: pre-cache the shell (index, manifest, icons).
// - Navigations: serve the cached shell immediately, refresh it in the background (stale-while-revalidate).
// - Same-origin GET assets (hashed JS/CSS, icons): cache-first, then network (and store).
const VERSION = 'tribody-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => undefined))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function fetchAndStore(request, cacheKey) {
  return fetch(request).then((res) => {
    if (res && res.ok && res.type === 'basic') {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(cacheKey || request, copy));
    }
    return res;
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    const shellKey = new URL('./index.html', self.registration.scope).href;
    event.respondWith(
      caches.match(shellKey).then((cached) => {
        const network = fetchAndStore(req, shellKey).catch(() => cached);
        return cached || network;
      }),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetchAndStore(req).catch(() => cached)),
  );
});
