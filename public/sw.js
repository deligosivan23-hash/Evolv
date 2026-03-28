// This service worker clears all old caches and unregisters itself
// to fix the blank white screen caused by stale cached files.

const CACHE_NAME = 'evolv-cache-v3';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/icon-512.png',
  '/manifest.json'
];

const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Evolv – Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #F5EFE8;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #1A1A1A;
      text-align: center;
      padding: 2rem;
    }
    img { width: 96px; height: 96px; border-radius: 24px; margin-bottom: 2rem; }
    h1 { font-size: 2rem; font-weight: 300; margin-bottom: 0.5rem; }
    p { color: #7A5230; font-style: italic; margin-bottom: 2rem; }
    button {
      background: #7A5230; color: white; border: none;
      padding: 0.875rem 2.5rem; border-radius: 9999px;
      font-size: 0.875rem; font-weight: 500; cursor: pointer;
    }
  </style>
</head>
<body>
  <img src="/icon-512.png" alt="Evolv" onerror="this.style.display='none'" />
  <h1>You're Offline</h1>
  <p>Your habits are saved on this device.</p>
  <button onclick="window.location.reload()">Try Again</button>
</body>
</html>`;

self.addEventListener('install', event => {
  // Force this new SW to activate immediately, replacing any old one
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      // Delete ALL old caches (v1, v2, workbox, etc.)
      caches.keys().then(names =>
        Promise.all(names.filter(n => n !== CACHE_NAME).map(n => {
          console.log('[SW] Deleting old cache:', n);
          return caches.delete(n);
        }))
      ),
      // Take control of all open tabs immediately
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', event => {
  // Only intercept same-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).catch(() => {
        // Only return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return new Response(OFFLINE_HTML, {
            headers: { 'Content-Type': 'text/html' }
          });
        }
      });
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow('/');
    })
  );
});
