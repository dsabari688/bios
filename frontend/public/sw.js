// PWA Service Worker for Offline Compliance and Resource Caching
const CACHE_NAME = 'lifeos-cache-v3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  'index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Handle only GET requests for http and https protocols (exclude /api/ endpoints and custom schemes)
  if (
    req.method !== 'GET' ||
    !req.url.startsWith('http') ||
    req.url.includes('/api/')
  ) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        // Network-First strategy
        const networkResponse = await fetch(req);
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache).catch(() => {});
          });
        }
        return networkResponse;
      } catch (networkError) {
        // Fallback to cache if offline or fetch fails
        const cachedResponse = await caches.match(req);
        if (cachedResponse) {
          return cachedResponse;
        }

        // Navigation fallback for SPA routes
        if (req.mode === 'navigate') {
          const indexFallback =
            (await caches.match('index.html')) ||
            (await caches.match('./index.html')) ||
            (await caches.match('/index.html'));
          if (indexFallback) {
            return indexFallback;
          }
        }

        // Throw error cleanly so browser handles network failure instead of breaking with undefined
        throw networkError;
      }
    })()
  );
});


