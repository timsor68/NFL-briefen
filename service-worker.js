// Enkel service worker för NFL-briefen: cachar bara sidans egna statiska
// filer (samma origin) så att appen kan öppnas offline/som installerad PWA.
// Alla API-anrop till externa domäner (ESPN, rss2json, allorigins,
// Open-Meteo) går alltid direkt till nätverket, så data är alltid färsk.
const CACHE_NAME = 'nflbriefen-cache-v1';
const CORE_ASSETS = ['./', './index.html', './logo.png', './manifest.json'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(CORE_ASSETS))
            .catch((err) => console.error('SW install-fel:', err))
    );
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
    const url = new URL(event.request.url);

    // Rör bara GET-förfrågningar till vår egen domän. Allt annat
    // (externa API:er, POST m.m.) hanteras av webbläsaren som vanligt.
    if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            const networkFetch = fetch(event.request)
                .then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => cached);
            return cached || networkFetch;
        })
    );
});
