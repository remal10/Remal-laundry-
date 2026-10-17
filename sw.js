// ═══════════════════════════════════════════════════════════
// REMAL LAUNDRY OS — SERVICE WORKER V2
// Network First pour HTML + JS + CSS (toujours la dernière version)
// ═══════════════════════════════════════════════════════════

const CACHE_VERSION = 'remal-laundry-v2.0.0';  // ⚠️ Bump à chaque déploiement majeur
const CACHE_STATIC = CACHE_VERSION + '-static';
const CACHE_RUNTIME = CACHE_VERSION + '-runtime';

const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/assets/remal-logo.png'
];

// ═══ INSTALL ═══
self.addEventListener('install', (event) => {
    console.log('📦 [SW] Installation version', CACHE_VERSION);
    event.waitUntil(
        caches.open(CACHE_STATIC)
            .then((cache) => cache.addAll(PRECACHE_URLS).catch(err => console.warn(err)))
            .then(() => self.skipWaiting())
    );
});

// ═══ ACTIVATE ═══
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

// ═══ FETCH ═══
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== 'GET') return;

    // Ignorer Supabase et CDN
    if (url.hostname.includes('supabase.co') ||
        url.hostname.includes('cdn.jsdelivr.net') ||
        url.hostname.includes('cdnjs.cloudflare.com') ||
        url.hostname.includes('fonts.googleapis.com') ||
        url.hostname.includes('fonts.gstatic.com') ||
        url.hostname.includes('tailwindcss.com')) {
        return;
    }

    if (url.origin !== self.location.origin) return;

    const pathname = url.pathname.toLowerCase();

    // 🎯 NETWORK FIRST pour HTML, JS, CSS
    if (pathname.endsWith('.html') || pathname === '/' || pathname.endsWith('.js') || pathname.endsWith('.css')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const copy = response.clone();
                        caches.open(CACHE_RUNTIME).then((cache) => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(() => caches.match(request).then(cached => cached || caches.match('/')))
        );
        return;
    }

    // 🎯 CACHE FIRST pour le reste (images, fonts)
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request).then((response) => {
                if (response && response.status === 200) {
                    const copy = response.clone();
                    caches.open(CACHE_RUNTIME).then((cache) => cache.put(request, copy));
                }
                return response;
            }).catch(() => new Response('Offline', { status: 503 }));
        })
    );
});
