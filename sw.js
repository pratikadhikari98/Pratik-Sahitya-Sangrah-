// ================================================
// प्रतीक साहित्य संग्रह — Service Worker (PWA)
// ================================================

const CACHE_NAME = 'pratik-sahitya-v1';
const CACHE_URLS = [
  './',
  './index.html',
  './about.html',
  './css/style.css',
  './css/about.css',
  './css/print.css',
  './js/app.js',
  './js/theme.js',
  './js/bookmark.js',
  './js/search.js',
  './js/share.js',
  './js/about.js',
  './data/kavita.js',
  './data/about.js',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './covers/1776176711764.png',
  './covers/1776177925119.png',
  './covers/k007.png',
  './covers/khusi.png'
];

// ── Install: cache सबै files ──────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching app shell');
      return cache.addAll(CACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: पुरानो cache हटाउने ─────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Cache First, Network Fallback ──────────
self.addEventListener('fetch', event => {
  // बाहिरी requests (Google Fonts आदि) network बाट लिने
  if (!event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      fetch(event.request).catch(() => new Response(''))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Cache मा छ भने त्यही दिने, background मा update गर्ने
        const networkUpdate = fetch(event.request).then(response => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(cache =>
              cache.put(event.request, response.clone())
            );
          }
          return response;
        }).catch(() => {});
        return cached;
      }

      // Cache मा छैन भने network बाट लिने
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache =>
          cache.put(event.request, responseToCache)
        );
        return response;
      }).catch(() => {
        // Offline fallback
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
