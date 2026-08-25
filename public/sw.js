// PWA Service Worker for Offline Compliance and Resource Caching
const CACHE_NAME = 'lifeos-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html'
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
  // Let the browser handle API endpoints via Mock Interceptor (avoid caching API responses)
  if (req.url.includes('/api/')) {
    return;
  }
  
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(req).catch(() => {
        // Fallback for document navigation
        if (req.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
