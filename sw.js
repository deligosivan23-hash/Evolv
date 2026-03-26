const CACHE_NAME = 'evolv-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/icon-512.png',
  '/manifest.json'
];

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
    h1 {
      font-size: 2rem;
      font-weight: 300;
      letter-spacing: -0.02em;
      margin-bottom: 0.5rem;
    }
    p {
      color: #7A5230;
      font-size: 0.95rem;
      margin-bottom: 2rem;
      font-style: italic;
    }
    .note {
      font-size: 0.8rem;
      color: #aaa;
      margin-bottom: 2rem;
      font-style: normal;
    }
    button {
      background: #1A1A1A;
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
  <p class="note">Connect to the internet to sync your progress.</p>
  <button onclick="window.location.reload()">Try Again</button>
</body>
</html>
`;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(cacheNames.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return new Response(OFFLINE_PAGE, {
            headers: { 'Content-Type': 'text/html' }
          });
        }
      });
    })
  );
});

// Handle notification clicks — open the app
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
