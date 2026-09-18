// =============================================================
// SERVICE WORKER - REMAL LAUNDRY OS
// Version : v33 (fix: gestion erreurs fetch + Vercel SSO)
// =============================================================

const CACHE_NAME = 'remal-pwa-v33';

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './assets/remal-logo.png',
    './assets/css/premium-effects.css',
    './js/config.js',
    './js/laundry.js',
    './js/realtime-listener.js',
    './js/ui.js',
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
    console.log('[SW] Installing v33...');
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Cache local assets (obligatoire)
            const localPromise = cache.addAll(ASSETS_TO_CACHE).catch(err => {
                console.warn('[SW] Some local assets failed to cache:', err);
            });
            
            // Cache external assets (best effort - échec non-bloquant)
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

// ACTIVATION - Nettoyage des anciens caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating v33...');
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

// FETCH - Interception des requêtes avec fallback robuste
self.addEventListener('fetch', (event) => {
    // Ignorer les méthodes non-GET
    if (event.request.method !== 'GET') return;
    
    // Ignorer les requêtes Supabase (toujours en direct)
    if (event.request.url.includes('supabase.co')) return;
    
    // Ignorer les requêtes chrome-extension, etc.
    if (!event.request.url.startsWith('http')) return;
    
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse; // Retourne depuis le cache
            }
            
            // Pas en cache → essaie le réseau
            return fetch(event.request).then((networkResponse) => {
                // Vérifier que la réponse est valide
                if (!networkResponse || !networkResponse.ok) {
                    // Réponse invalide → fallback
                    return fallbackResponse(event.request);
                }
                
                // Mettre en cache les nouvelles ressources locales (optionnel)
                if (event.request.url.startsWith(self.location.origin)) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone).catch(() => {});
                    });
                }
                
                return networkResponse;
            }).catch((error) => {
                // Erreur réseau → fallback
                console.warn('[SW] Network fetch failed for:', event.request.url);
                return fallbackResponse(event.request);
            });
        })
    );
});

// Fonction de fallback robuste
function fallbackResponse(request) {
    // Pour HTML → retourne index.html depuis le cache
    if (request.headers.get('accept')?.includes('text/html')) {
        return caches.match('./index.html').then(response => {
            return response || new Response(
                '<!DOCTYPE html><html><body><h1>Offline</h1><p>Page non disponible hors-ligne.</p></body></html>',
                { headers: { 'Content-Type': 'text/html' } }
            );
        });
    }
    
    // Pour JSON → retourne un JSON vide valide
    if (request.url.endsWith('.json')) {
        return Promise.resolve(new Response('{}', {
            headers: { 'Content-Type': 'application/json' }
        }));
    }
    
    // Pour tout le reste → retourne une réponse vide valide
    return Promise.resolve(new Response('', {
        status: 408,
        statusText: 'Request Timeout'
    }));
}
