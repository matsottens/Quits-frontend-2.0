// This is a minimal service worker used in production
// It doesn't do any caching but prevents the MIME type errors

// Service worker version for cache busting
const VERSION = '1.0.0';

// Install event - cache basic assets
self.addEventListener('install', event => {
  self.skipWaiting();
  console.log(`Service Worker (v${VERSION}) installed`);
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  self.clients.claim();
  console.log(`Service Worker (v${VERSION}) activated`);
});

// Fetch event - network first strategy
self.addEventListener('fetch', event => {
  // Pass through all requests to the network
  event.respondWith(fetch(event.request));
}); 