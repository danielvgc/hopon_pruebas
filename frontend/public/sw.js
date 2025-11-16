// Service Worker for HopOn PWA
const CACHE_NAME = 'hopon-v3';
const urlsToCache = [
  '/logo.png',
  '/manifest.json',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch((err) => {
        console.log('Error caching URLs:', err);
        // Don't fail installation if some resources aren't available
      });
    })
  );
  self.skipWaiting();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Don't cache cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Don't cache HTML pages - always fetch fresh to avoid stale content issues
  const url = new URL(event.request.url);
  // Always fetch root (/) and other HTML pages fresh from network
  if (url.pathname === '/' || url.pathname.endsWith('.html') || 
      (url.pathname !== '/' && !url.pathname.includes('.') && !url.pathname.includes('/api/'))) {
    // This is an HTML page route - fetch fresh from network, only use cache as fallback
    return event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Always return the fresh response from network
          return response;
        })
        .catch(() => {
          // Only fall back to cache if network fails
          return caches.match(event.request).then((response) => {
            return response || caches.match('/');
          });
        })
    );
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version if available
      if (response) {
        return response;
      }

      // Otherwise fetch from network
      return fetch(event.request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache successful responses for future use (only non-HTML assets)
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // Return a cached response, or a custom offline page if needed
          return caches.match('/');
        });
    })
  );
});

// Activate event - clean up old caches
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
