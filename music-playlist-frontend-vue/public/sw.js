/**
 * SOUNDWAVE Production Service Worker (PWA & Offline Experience)
 * Milestone 6.4
 */

const CACHE_NAME = 'soundwave-v6.4-prod';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icon.svg'
];

// Install: precache essential app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up older cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: intelligent caching strategy
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Never cache non-GET requests (e.g. POST, PUT, DELETE)
  if (req.method !== 'GET') {
    return;
  }

  // 2. Never cache remote audio files, streams, or media blobs
  // (guards against caching quotas being exceeded by large audio binaries)
  const isAudioRequest =
    req.destination === 'audio' ||
    url.pathname.match(/\.(mp3|m4a|ogg|flac|wav|aac)(\?.*)?$/i) ||
    url.hostname.includes('jamendo.com') ||
    url.hostname.includes('archive.org') ||
    url.hostname.includes('audius.co') ||
    url.hostname.includes('spotify.com');

  if (isAudioRequest) {
    return;
  }

  // 3. API requests:
  // - Never intercept cross-origin API requests (e.g. to deployed backend or Vercel preview backends)
  // - Never convert real network failures or protected responses into a synthetic 503 if online
  // - Network-first with offline cache fallback only when truly offline or cached
  if (url.pathname.startsWith('/api/')) {
    // Pass cross-origin API requests directly to the network without SW interference
    if (url.origin !== self.location.origin) {
      return;
    }

    event.respondWith(
      fetch(req).catch(async (networkErr) => {
        // If offline and request is in cache, return cached response
        const cached = await caches.match(req);
        if (cached) return cached;

        // If explicitly offline, return structured offline fallback
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          return new Response(
            JSON.stringify({
              offline: true,
              message: 'You are currently offline. Displaying cached metadata where available.',
              items: []
            }),
            {
              status: 503,
              statusText: 'Service Unavailable (Offline)',
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }

        // Otherwise propagate the real network error so client interceptors receive accurate diagnostics
        throw networkErr;
      })
    );
    return;
  }

  // 4. Static assets (JS, CSS, fonts, images): Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, clone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Network failed; return fallback if HTML page
        if (req.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });

      return cachedResponse || fetchPromise;
    })
  );
});
