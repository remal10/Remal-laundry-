// =============================================================
// SERVICE WORKER - REMAL LAUNDRY OS
// Version : v34 (fix: network-first pour HTML/CSS/JS + suppression ui.js)
// =============================================================

const CACHE_NAME = 'remal-pwa-v34';

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './assets/remal-logo.png',
    './assets/css/premium-effects.css',
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

const EXTERNAL_ASSETS = [
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// INSTALLATION - Cache les assets locaux + externes
self.addEventListener('install', (event) => {
    console.log('[SW] Installing v34...');
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            const localPromise = cache.addAll(ASSETS_TO_CACHE).catch(err => {
                console.warn('[SW] Some local assets failed to cache:', err);
            });
            
            const externalPromise = Promise.all(
                EXTERNAL_ASSETS.map(url => 
                    fetch(url).then(response => {
                        if (response && response.ok) {
                            return cache.put(url, response);
                        }
                    }).catch(err => {
                        console.warn('[SW] External asset skipped:', url);
                    })
                )
            );
            
            return Promise.all([localPromise, externalPromise]);
        }).catch(err => {
            console.error('[SW] Install error:', err);
        })
    );
});

// ACTIVATION - Nettoyage des anciens caches + prise de contrôle immédiate
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating v34...');
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

// FETCH - Stratégie adaptative selon le type de ressource
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (event.request.url.includes('supabase.co')) return;
    if (!event.request.url.startsWith('http')) return;

    const url = new URL(event.request.url);
    const isLocal = url.origin === self.location.origin;

    // ═══════════════════════════════════════════════════════════════
    // STRATÉGIE 1 : NETWORK-FIRST pour HTML/CSS/JS local
    // → Toujours essayer le réseau en premier → jamais de version obsolète
    // ═══════════════════════════════════════════════════════════════
    if (isLocal && (
        event.request.destination === 'document' ||
        url.pathname.endsWith('.html') ||
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.js')
    )) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.ok) {
                        // Mettre à jour le cache en arrière-plan
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseClone).catch(() => {});
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Réseau indisponible → fallback cache
                    return caches.match(event.request).then(cached => {
                        return cached || fallbackResponse(event.request);
                    });
                })
        );
        return;
    }

    // ═══════════════════════════════════════════════════════════════
    // STRATÉGIE 2 : CACHE-FIRST pour images, fonts, assets externes
    // → Performance optimale, ces ressources changent rarement
    // ═══════════════════════════════════════════════════════════════
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            
            return fetch(event.request).then((networkResponse) => {
                if (!networkResponse || !networkResponse.ok) {
                    return fallbackResponse(event.request);
                }
                
                // Cacher les nouvelles ressources valides
                if (networkResponse.ok) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone).catch(() => {});
                    });
                }
                
                return networkResponse;
            }).catch(() => {
                return fallbackResponse(event.request);
            });
        })
    );
});

// Fallback robuste
function fallbackResponse(request) {
    if (request.headers.get('accept')?.includes('text/html')) {
        return caches.match('./index.html').then(response => {
            return response || new Response(
                '<!DOCTYPE html><html><body><h1>Offline</h1><p>Page non disponible hors-ligne.</p></body></html>',
                { headers: { 'Content-Type': 'text/html' } }
            );
        });
    }
    
    if (request.url.endsWith('.json')) {
        return Promise.resolve(new Response('{}', {
            headers: { 'Content-Type': 'application/json' }
        }));
    }
    
    return Promise.resolve(new Response('', {
        status: 408,
        statusText: 'Request Timeout'
    }));
}
