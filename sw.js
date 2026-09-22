// ═══════════════════════════════════════════════════════════════════
// SERVICE WORKER — REMAL LAUNDRY OS
// Version : v34
// Stratégie : Network-first pour HTML/CSS/JS (toujours frais)
//             Cache-first pour images/fonts (performance)
// ⚠️ Si le SW échoue, l'app continue de fonctionner normalement
// ═══════════════════════════════════════════════════════════════════

const CACHE_VERSION = 'v34';
const CACHE_NAME = `remal-pwa-${CACHE_VERSION}`;

const PRECACHE_ASSETS = [
    './',
    './index.html',
    './style.css',
    './assets/css/premium-effects.css',
    './assets/remal-logo.png',
    './js/config.js',
    './js/laundry.js',
    './js/realtime-listener.js',
    './js/ui-core.js',
    './js/ui-forms.js',
    './js/ui-live.js',
    './js/ui-modules.js',
    './js/ui-shortcuts.js',
    './js/guesthub-integration.js',
    './security-guard.js'
];

// ─── INSTALL : pré-cache (échec non-bloquant) ──────────────────────
self.addEventListener('install', (event) => {
    console.log(`[SW ${CACHE_VERSION}] Installing...`);
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.all(
                PRECACHE_ASSETS.map(url =>
                    cache.add(url).catch(err => {
                        console.warn(`[SW] Skip precache: ${url}`, err.message);
                    })
                )
            );
        })
    );
});

// ─── ACTIVATE : nettoyage des vieux caches ─────────────────────────
self.addEventListener('activate', (event) => {
    console.log(`[SW ${CACHE_VERSION}] Activating...`);

    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => {
                        console.log(`[SW] Deleting old cache: ${key}`);
                        return caches.delete(key);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// ─── FETCH : stratégie adaptative ──────────────────────────────────
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorer : non-GET, non-HTTP, Supabase, extensions
    if (request.method !== 'GET') return;
    if (!request.url.startsWith('http')) return;
    if (request.url.includes('supabase.co')) return;
    if (url.protocol === 'chrome-extension:') return;

    const isSameOrigin = url.origin === self.location.origin;
    const isDocument = request.destination === 'document' || url.pathname.endsWith('.html');
    const isStyleOrScript = request.destination === 'style' || request.destination === 'script'
                         || url.pathname.endsWith('.css') || url.pathname.endsWith('.js');

    // ─── HTML / CSS / JS : NETWORK-FIRST ───────────────────────────
    if (isSameOrigin && (isDocument || isStyleOrScript)) {
        event.respondWith(networkFirst(request));
        return;
    }

    // ─── Images / Fonts / CDN : CACHE-FIRST ────────────────────────
    event.respondWith(cacheFirst(request));
});

// ─── Stratégie Network-First ───────────────────────────────────────
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
                cache.put(request, clone).catch(() => {});
            });
        }
        return networkResponse;
    } catch (err) {
        // Réseau KO → fallback cache
        const cached = await caches.match(request);
        if (cached) return cached;

        // Pour HTML uniquement : fallback sur index.html en cache
        if (request.destination === 'document') {
            const fallback = await caches.match('./index.html');
            if (fallback) return fallback;
        }

        return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

// ─── Stratégie Cache-First ─────────────────────────────────────────
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
                cache.put(request, clone).catch(() => {});
            });
        }
        return networkResponse;
    } catch (err) {
        return new Response('Offline', { status: 503 });
    }
}
