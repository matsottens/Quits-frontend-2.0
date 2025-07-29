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
  const url = event.request.url;
  
  // Never proxy the Google-proxy exchange – let the page handle it once.
  if (url.includes('/api/google-proxy')) {
    return; // default browser fetch (no SW)
  }
  
  // Pass through all other requests to the network
  event.respondWith(fetch(event.request));
}); 