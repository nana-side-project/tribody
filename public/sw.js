// TriBody service worker — offline use of the installed app.
// Registered only on https top-level pages of the static build (see src/main.tsx; never in the single-file build).
// - The build (vite.config.ts → precacheManifest) replaces BUILD below with the version and EVERY emitted file (entry
//   JS/CSS, the App chunk, each page chunk, the 3D viewer JS + CSS, icons, manifest). Install caches all of them, so
//   the app works offline after the first visit — also the pages and the 3D viewer never opened online.
// - One cache per build version: a new deploy installs next to the old one and takes over once no page of the old
//   version is open any more (the old pages keep loading their own chunks from the old cache); activate then deletes
//   the old caches, so hashed files of old builds do not pile up.
// - Navigations: the cached index.html of this version (it names exactly the precached chunks), else the network.
// - Other same-origin GETs: cache first (any version), then the network (and store).
/* eslint-disable */
const BUILD = /*__TRIBODY_BUILD__*/ { version: 'dev', files: [] } /*__TRIBODY_BUILD_END__*/;
const VERSION = `tribody-${BUILD.version}`;
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
const PRECACHE = [...new Set([...SHELL, ...BUILD.files.map((f) => `./${f}`)])];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      // one at a time so a single failing file does not discard the rest (addAll is all-or-nothing)
      .then((c) => Promise.all(PRECACHE.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => undefined))))
      // first install: take control at once (nothing older to stay consistent with)
      .then(() => (self.registration.active ? undefined : self.skipWaiting())),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('tribody-') && k !== VERSION).map((k) => caches.delete(k))))
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
      caches
        .open(VERSION)
        .then((c) => c.match(shellKey))
        .then((cached) => cached || fetchAndStore(req, shellKey).catch(() => caches.match(shellKey))),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetchAndStore(req).catch(() => cached)),
  );
});
