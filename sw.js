const CACHE_NAME = 'remal-clean-v1';

self.addEventListener('install', (e) => { 
    self.skipWaiting(); 
});

self.addEventListener('activate', (e) => { 
    e.waitUntil(
        caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
    );
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    // On ne met en cache QUE si c'est du GET et que ce n'est pas vers Supabase
    if (e.request.method !== 'GET' || e.request.url.includes('supabase.co')) return;
    
    e.respondWith(
        fetch(e.request)
            .then(response => {
                const copy = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
                return response;
            })
            .catch(() => caches.match(e.request))
    );
});
