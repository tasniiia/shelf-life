// Minimal service worker: just enough to make the app installable and
// usable offline after a first visit. Deliberately simple rather than
// using a full build-time precache manifest (which would need a bundler
// plugin) — this caches same-origin assets as they're actually requested,
// and explicitly never touches cross-origin requests.
//
// Critically: Open Library and Google Books calls are cross-origin, so
// they're never intercepted or cached here — caching a genre lookup
// response would mean stale data forever, which defeats the whole point
// of the persistent metadata cache already handled in bookMetadata.js
// (that one is a deliberate, permanent cache; this one should not be).

const CACHE_NAME = 'shelflife-shell-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle same-origin GET requests — everything else (including all
  // Open Library / Google Books calls, which are cross-origin) passes
  // straight through to the network untouched.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) {
        // Stale-while-revalidate: serve the cached version instantly, and
        // quietly refresh the cache in the background for next time.
        fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
          })
          .catch(() => {}); // offline — fine, we already served from cache
        return cached;
      }
      try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      } catch (err) {
        // Truly offline with nothing cached for this request — let it fail
        // naturally rather than masking the error.
        throw err;
      }
    })
  );
});
