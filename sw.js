// Service Worker â€” Drill Control v2.1.2
const CACHE_NAME = 'drill-control-v2.1.2';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './rig_bg.png',
    './icon-32x32.png',
    './icon-180x180.png',
    './icon-192x192.png',
    './icon-512x512.png'
];

// InstalaciÃ³n del Service Worker y almacenamiento de archivos en cachÃ©
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Drill Control v1.4.0 â€” archivos almacenados en cachÃ©');
                return cache.addAll(ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// ActivaciÃ³n y limpieza de cachÃ©s antiguas
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW] Eliminando cachÃ© antigua:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Estrategia Network First para index.html (siempre intenta buscar la versiÃ³n mÃ¡s nueva)
// Cache First para el resto de los assets (Ã­conos, estilos, scripts)
self.addEventListener('fetch', event => {
    if (!event.request.url.startsWith(self.location.origin)) return;

    const isHTML = event.request.destination === 'document';

    if (isHTML) {
        // Network First: busca en la red, si falla usa la cachÃ©
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
    } else {
        // Cache First: busca en cachÃ©, si no estÃ¡ va a la red
        event.respondWith(
            caches.match(event.request).then(cached => {
                return cached || fetch(event.request).then(response => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    return response;
                });
            })
        );
    }
});

