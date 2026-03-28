// Evolv Service Worker v4 — full offline support
// Caches ALL build assets at install time using cache-then-network strategy

const CACHE_NAME = 'evolv-v4';

// These static files are always available
const PRECACHE = [
  '/',
  '/index.html',
  '/icon-512.png',
  '/manifest.json'
];

const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Evolv – Offline</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{min-height:100vh;display:flex;flex-direction:column;align-items:center;
      justify-content:center;background:#F5EFE8;font-family:-apple-system,sans-serif;
      color:#1A1A1A;text-align:center;padding:2rem}
    img{width:96px;height:96px;border-radius:24px;margin-bottom:2rem}
    h1{font-size:2rem;font-weight:300;margin-bottom:.5rem}
    p{color:#7A5230;font-style:italic;margin-bottom:2rem}
    button{background:#7A5230;color:#fff;border:none;padding:.875rem 2.5rem;
      border-radius:9999px;font-size:.875rem;font-weight:500;cursor:pointer}
  </style>
</head>
<body>
  <img src="/icon-512.png" alt="Evolv" onerror="this.style.display='none'"/>
  <h1>You're Offline</h1>
  <p>Your habits are saved on this device.</p>
  <button onclick="window.location.reload()">Try Again</button>
</body>
</html>`;

// ── Install: precache known files ─────────────
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
});

// ── Activate: nuke ALL old caches ────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      ),
      self.clients.claim()
    ])
  );
});

// ── Fetch: cache-first for assets, network-first for HTML ─────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET and cross-origin requests
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // JS / CSS / images / fonts — cache first, update in background
  const isAsset = /\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf)(\?.*)?$/.test(url.pathname);

  if (isAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          // Serve from cache immediately, but also fetch & update cache
          const fetchPromise = fetch(event.request).then(response => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // HTML navigation — network first, fallback to cache, then offline page
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the fresh HTML
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() =>
          caches.match(event.request)
            .then(cached => cached || caches.match('/index.html'))
            .then(cached => cached || new Response(OFFLINE_HTML, {
              headers: { 'Content-Type': 'text/html' }
            }))
        )
    );
    return;
  }

  // Everything else — cache first
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request).then(response => {
        if (response.ok) {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
        }
        return response;
      }).catch(() => new Response('', { status: 503 }))
    )
  );
});

// ── Notification clicks ───────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(list => list.length ? list[0].focus() : clients.openWindow('/'))
  );
});
