// Bump this version string whenever you deploy a new build.
// That forces the old cache to clear and the new assets to be fetched.
const CACHE_NAME = 'evolv-cache-v3';

const OFFLINE_PAGE = `
<!DOCTYPE html>
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
    .icon {
      width: 96px;
      height: 96px;
      border-radius: 24px;
      margin-bottom: 2rem;
      box-shadow: 0 8px 32px rgba(122,82,48,0.2);
    }
    h1 { font-size: 2rem; font-weight: 300; letter-spacing: -0.02em; margin-bottom: 0.5rem; }
    p { color: #7A5230; font-size: 0.95rem; margin-bottom: 2rem; font-style: italic; }
    .note { font-size: 0.8rem; color: #aaa; margin-bottom: 2rem; font-style: normal; }
    button {
      background: #7A5230;
      color: white;
      border: none;
      padding: 0.875rem 2.5rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    button:hover { opacity: 0.85; }
  </style>
</head>
<body>
  <img class="icon" src="/icon-512.png" alt="Evolv" onerror="this.style.display='none'" />
  <h1>You're Offline</h1>
  <p>Your habits are still saved on this device.</p>
  <p class="note">Connect to the internet to load the app for the first time.</p>
  <button onclick="window.location.reload()">Try Again</button>
</body>
</html>
`;

// ── Install ───────────────────────────────────
// Only pre-cache the bare shell. Vite's hashed asset files
// are cached at runtime on first visit (see fetch handler below).
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(['/', '/index.html', '/icon-512.png', '/manifest.json'])
    )
  );
  self.skipWaiting();
});

// ── Activate ──────────────────────────────────
// Delete any old caches from previous versions.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────
// Strategy: Cache-first, with network fallback + runtime caching.
// Every successful response is stored in the cache so the next
// offline visit can serve the full app — including Vite's hashed
// /assets/*.js and /assets/*.css bundles.
self.addEventListener('fetch', event => {
  // Only handle GET requests — skip POST, etc.
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests (e.g. Google Fonts, analytics).
  // We only want to cache same-origin app assets.
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      // 1. Try the cache first.
      const cached = await cache.match(event.request);
      if (cached) return cached;

      // 2. Not in cache — fetch from network.
      try {
        const networkResponse = await fetch(event.request);

        // Only cache valid responses (status 200, basic type).
        if (networkResponse.ok && networkResponse.type === 'basic') {
          // clone() because a response can only be consumed once.
          cache.put(event.request, networkResponse.clone());
        }

        return networkResponse;
      } catch {
        // 3. Network failed — show offline page for navigation requests.
        if (event.request.mode === 'navigate') {
          return new Response(OFFLINE_PAGE, {
            headers: { 'Content-Type': 'text/html' }
          });
        }
        // For non-navigation requests (assets) just return an empty 503.
        return new Response('Offline', { status: 503 });
      }
    })
  );
});

// ── Notification click ────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow('/');
    })
  );
});
