// service-worker.js
// Basic offline caching for Pecking Order
const CACHE_NAME = 'pecking-order-v1';
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
  // Audio
  'assets/audio/bg1.mp3',
  'assets/audio/crow.mp3',
  'assets/audio/owl.mp3',
  'assets/audio/complete1.mp3',
  'assets/audio/flapping.mp3',
  'assets/audio/parrots2.mp3',
  'assets/audio/sparrow1.mp3',
  'assets/audio/poof.mp3',
  'assets/audio/thud.mp3',
];

// On install, cache all known assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
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

// Cache-first strategy with network fallback
self.addEventListener('fetch', event => {
  const { request } = event;
  // Only handle GET requests over http/https
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        // Clone & store in cache for future
        const respClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, respClone));
        return response;
      }).catch(() => cached);
    })
  );
}); 