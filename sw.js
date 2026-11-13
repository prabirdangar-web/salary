/* TFHS Salary Portal - service worker.
   Page itself: network first, always revalidated with the server (bypasses the browser's 10-minute GitHub Pages cache); cached copy only when offline.
   Firebase scripts (gstatic): cached after first load so the app opens faster.
   Firestore / login traffic is never touched. Bump VERSION to force an update. */
const VERSION = 'tfhs-salary-v4';
const CORE = ['./', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  /* cache each core file separately so one missing icon does not stop the others */
  e.waitUntil(caches.open(VERSION)
    .then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {}))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const keep = (e, req, res) => {
  if (res && res.ok && res.status === 200) {
    const copy = res.clone();
    e.waitUntil(caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {}));
  }
  return res;
};
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req, { cache: 'no-cache' }).then(res => keep(e, req, res))
        .catch(() => caches.match(req, { ignoreSearch: true })
          .then(r => r || (req.mode === 'navigate' ? caches.match('./') : undefined)))
    );
  } else if (url.hostname === 'www.gstatic.com') {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => keep(e, req, res))));
  }
});
