// ═══════════════════════════════════════════════════════════
// REMAL LAUNDRY OS — SERVICE WORKER
// Cache intelligent + offline fallback
// ═══════════════════════════════════════════════════════════

const CACHE_NAME = 'remal-laundry-v1.0.0';
const RUNTIME_CACHE = 'remal-laundry-runtime-v1.0.0';

// Fichiers à mettre en cache au démarrage
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/style.css',
    '/manifest.json',
    '/assets/remal-logo.png',
    '/assets/icon-staff-192.png',
    '/assets/icon-staff-512.png',
    '/assets/css/premium-effects.css',
    '/js/config.js',
    '/js/laundry.js',
    '/js/realtime-listener.js',
    '/js/ui-core.js',
    '/js/ui-forms.js',
    '/js/ui-live.js',
    '/js/ui-modules.js',
    '/js/ui-shortcuts.js',
    '/security-guard.js'
];

// Installation — précache
self.addEventListener('install', (event) => {
    console.log('📦 [SW] Installation...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📦 [SW] Précache des fichiers');
                return cache.addAll(PRECACHE_URLS);
            })
            .then(() => self.skipWaiting())
            .catch((err) => console.warn('⚠️ [SW] Erreur précache:', err))
    );
});

// Activation — nettoyer anciens caches
self.addEventListener('activate', (event) => {
    console.log('✅ [SW] Activation');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
                    .map((name) => {
                        console.log('🗑️ [SW] Suppression ancien cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch — stratégie
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorer les requêtes non-GET
    if (request.method !== 'GET') return;

    // Ignorer Supabase et les CDN externes
    if (url.hostname.includes('supabase.co') ||
        url.hostname.includes('cdn.jsdelivr.net') ||
        url.hostname.includes('cdnjs.cloudflare.com') ||
        url.hostname.includes('fonts.googleapis.com') ||
        url.hostname.includes('fonts.gstatic.com') ||
        url.hostname.includes('tailwindcss.com')) {
        return;
    }

    // Ne gérer que les mêmes origines
    if (url.origin !== self.location.origin) return;

    // Stratégie : Network First pour HTML, Cache First pour assets
    if (request.destination === 'document') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    return response;
                })
                .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
        );
    } else {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;
                return fetch(request).then((response) => {
                    const copy = response.clone();
                    caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
                    return response;
                });
            })
        );
    }
});

console.log('✅ [SW] Service Worker chargé');
