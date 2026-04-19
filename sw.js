const CACHE_NAME = 'habitos-cache-v1.6'; // Subimos la versión para forzar actualización
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/styles.css?v=1.5',
    '/app.js?v=1.5',
    '/manifest.json'
];

// Instalar y almacenar núcleo estático
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Limpiar versiones viejas
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim(); // Tomar control de la página inmediatamente
});

// Interceptar peticiones (Caché Dinámica Robusta)
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    
    // Ignorar las peticiones a la API en vivo de la base de datos y autenticación.
    // Esto se gestiona por el IndexedDB de Firebase, no por el Service Worker.
    if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('identitytoolkit')) {
        return; 
    }

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse; // 1. Devuelve si ya está guardado
            }
            return fetch(event.request).then(networkResponse => {
                // 2. Si no está guardado, lo descarga de internet (ej. módulos de gstatic)
                // Asegurar que la respuesta es válida antes de guardarla
                if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
                    return networkResponse;
                }
                
                // 3. Guarda una copia en el caché para la próxima vez que no haya internet
                let responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseToCache);
                });
                
                return networkResponse;
            });
        }).catch(() => {
            // Fallback en caso extremo
            if (event.request.mode === 'navigate') {
                return caches.match('/index.html');
            }
        })
    );
});