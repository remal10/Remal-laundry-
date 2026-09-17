// =============================================================
// SERVICE WORKER - REMAL LAUNDRY OS
// Cache des assets pour fonctionnement PWA offline
// =============================================================

const CACHE_NAME = 'remal-pwa-v32';

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './manifest.json',
    './assets/remal-logo.png',
    './assets/css/premium-effects.css',
    './js/config.js',
    './js/laundry.js',
    './js/realtime-listener.js',
    './js/ui.js',
    './js/guesthub-integration.js',
    './security-guard.js',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// INSTALLATION
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching assets...');
                return cache.addAll(ASSETS_TO_CACHE).catch(err => {
                    console.log('[SW] Cache partial (some assets failed):', err);
                });
            })
    );
});

// ACTIVATION
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// FETCH (interception des requêtes)
self.addEventListener('fetch', (event) => {
    // Ignorer les requêtes non-GET
    if (event.request.method !== 'GET') return;
    
    // Ignorer les requêtes Supabase (toujours en direct)
    if (event.request.url.includes('supabase.co')) return;
    
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response; // Retourne depuis le cache
                }
                return fetch(event.request).catch(() => {
                    // Fallback : retourne index.html si hors-ligne
                    return caches.match('./index.html');
                });
            })
    );
});
