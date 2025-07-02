// service-worker.js
// Basic offline caching for Pecking Order
const CACHE_NAME = 'pecking-order-v4';
const ASSETS = [
  '/',
  'index.html',
  'styles.css',
  'race.js',
  // Images
  'assets/landing-image.png',
  'assets/feather.png',
  'assets/egg_blue.png',
  'assets/egg_green.png',
  'assets/egg_orange.png',
  'assets/egg_pink.png',
  'assets/egg_purple.png',
  'assets/egg_yellow.png',
  // Bird sprites
  'assets/birds/brown_pelican.png',
  'assets/birds/little_penguin.png',
  'assets/birds/musk_duck.png',
  'assets/birds/american_goldfinch.png',
  'assets/birds/common_raven.png',
  'assets/birds/franklins_gull.png',
  'assets/birds/killdeer.png',
  'assets/birds/annas_hummingbird.png',
  'assets/birds/painted_bunting.png',
  'assets/birds/bald_eagle.png',
  'assets/birds/trumpeter_swan.png',
  // Predator sprite
  'assets/predators/great_horned_owl.png',
  // Audio
  'assets/audio/bg1.mp3',
  'assets/audio/crow.mp3',
  'assets/audio/owl.mp3',
  'assets/audio/complete1.mp3',
  'assets/audio/flapping.mp3',
  'assets/audio/parrots2.mp3',
  'assets/audio/sparrow1.mp3',
  'assets/audio/thud.mp3',
  'assets/audio/woo.mp3',
];

// On install, cache all known assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await Promise.all(
        ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('SW cache fail', url, err))
        )
      );
    })
  );
  self.skipWaiting();
});

// Delete old caches on activate
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Stale-while-revalidate strategy: serve from cache, then update it in the background.
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(request).then(cachedResponse => {
        const fetchPromise = fetch(request)
          .then(networkResponse => {
            // Refresh cache with latest copy
            if (
              networkResponse &&
              networkResponse.ok &&
              networkResponse.status === 200 &&
              !request.headers.has('range')
            ) {
              cache.put(request, networkResponse.clone()).catch(()=>{});
            }
            return networkResponse;
          })
          .catch(() => cachedResponse); // fallback to cache on failure

        // Return cached version immediately if present, else wait for network
        return cachedResponse || fetchPromise;
      })
    )
  );
}); 