// sw.js - Service Worker mínimo
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    // Necesario para que Chrome habilite el modo App
});