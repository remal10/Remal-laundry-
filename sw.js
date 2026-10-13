// ═══════════════════════════════════════════════════════════
// REMAL LAUNDRY OS — SERVICE WORKER V2
// Network First pour HTML + JS + CSS (toujours la dernière version)
// Cache First pour images / fonts
// ═══════════════════════════════════════════════════════════

const CACHE_VERSION = 'remal-laundry-v2.0.0';  // ⚠️ Bump à chaque déploiement majeur
const CACHE_STATIC = CACHE_VERSION + '-static';
const CACHE_RUNTIME = CACHE_VERSION + '-runtime';

// Fichiers à pré-cacher (uniquement le minimum vital)
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/assets/remal-logo.png'
];

// ═══ INSTALL — Précache minimal + skipWaiting ═══
self.addEventListener('install', (event) => {
    console.log('📦 [SW] Installation version', CACHE_VERSION);
    event.waitUntil(
        caches.open(CACHE_STATIC)
            .then((cache) => {
                console.log('📦 [SW] Précache des fichiers essentiels');
                return cache.addAll(PRECACHE_URLS).catch(err => {
                    console.warn('⚠️ [SW] Précache partiel:', err);
                });
            })
            .then(() => self.skipWaiting())  // Active immédiatement
    );
});

// ═══ ACTIVATE — Nettoyer anciens caches ═══
self.addEventListener('activate', (event) => {
    console.log('✅ [SW] Activation version', CACHE_VERSION);
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => !name.startsWith(CACHE_VERSION))
                    .map((name) => {
                        console.log('🗑️ [SW] Suppression ancien cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// ═══ FETCH — Stratégie adaptée par type de fichier ═══
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorer les requêtes non-GET
    if (request.method !== 'GET') return;

    // Ignorer Supabase et CDN externes (laisse le navigateur gérer)
    if (url.hostname.includes('supabase.co') ||
        url.hostname.includes('cdn.jsdelivr.net') ||
        url.hostname.includes('cdnjs.cloudflare.com') ||
        url.hostname.includes('fonts.googleapis.com') ||
        url.hostname.includes('fonts.gstatic.com') ||
        url.hostname.includes('tailwindcss.com')) {
        return;
    }

    // Ne gérer que la même origine
    if (url.origin !== self.location.origin) return;

    const pathname = url.pathname.toLowerCase();

    // 🎯 NETWORK FIRST pour HTML + JS + CSS (toujours la dernière version)
    if (pathname.endsWith('.html') ||
        pathname === '/' ||
        pathname.endsWith('.js') ||
        pathname.endsWith('.css')) {

        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Mettre en cache la nouvelle version
                    if (response && response.status === 200) {
                        const copy = response.clone();
                        caches.open(CACHE_RUNTIME).then((cache) => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(() => {
                    // Offline → servir le cache, puis le HTML par défaut
                    return caches.match(request).then(cached => cached || caches.match('/'));
                })
        );
        return;
    }

    // 🎯 CACHE FIRST pour le reste (images, fonts, etc.)
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request).then((response) => {
                if (response && response.status === 200) {
                    const copy = response.clone();
                    caches.open(CACHE_RUNTIME).then((cache) => cache.put(request, copy));
                }
                return response;
            }).catch(() => {
                // Offline → rien pour cette ressource
                return new Response('Offline', { status: 503 });
            });
        })
    );
});

// ═══ MESSAGE — SKIP_WAITING sur demande ═══
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('⏭️ [SW] SKIP_WAITING reçu');
        self.skipWaiting();
    }
});

console.log('✅ [SW] Service Worker chargé version', CACHE_VERSION);
