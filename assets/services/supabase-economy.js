// ==================== SUPABASE ECONOMY MODE ====================
// Optimisation pour rester dans le quota gratuit
// À ajouter APRÈS config.js dans chaque HTML

(function() {
    'use strict';
    
    console.log('💰 Mode économie Supabase activé');
    
    // Cache en mémoire (rapide)
    const memoryCache = {};
    
    // Durée du cache : 10 minutes
    const CACHE_DURATION = 10 * 60 * 1000;
    
    // Récupérer avec cache
    async function cachedFetch(table, query, cacheKey) {
        // Vérifier le cache mémoire
        if (memoryCache[cacheKey] && 
            Date.now() - memoryCache[cacheKey].timestamp < CACHE_DURATION) {
            console.log('✅ Cache mémoire:', cacheKey);
            return memoryCache[cacheKey].data;
        }
        
        // Vérifier le cache localStorage
        const localCached = localStorage.getItem('cache_' + cacheKey);
        if (localCached) {
            try {
                const parsed = JSON.parse(localCached);
                if (Date.now() - parsed.timestamp < CACHE_DURATION) {
                    console.log('✅ Cache local:', cacheKey);
                    // Mettre aussi en mémoire
                    memoryCache[cacheKey] = parsed;
                    return parsed.data;
                }
            } catch (e) {
                // Cache corrompu, ignorer
            }
        }
        
        // Requête Supabase (uniquement si nécessaire)
        console.log('🔄 Requête Supabase:', cacheKey);
        const { data, error } = await query;
        
        if (data && !error) {
            const cacheData = {
                data: data,
                timestamp: Date.now()
            };
            
            // Sauvegarder dans les caches
            memoryCache[cacheKey] = cacheData;
            
            try {
                localStorage.setItem('cache_' + cacheKey, JSON.stringify(cacheData));
            } catch (e) {
                // localStorage plein, ignorer
            }
        }
        
        return data;
    }
    
    // Récupérer les données d'un guest avec cache
    async function getGuestData(roomNumber) {
        const cacheKey = `guest_${roomNumber}`;
        
        return cachedFetch('pms_guests', 
            supabase
                .from('pms_guests')
                .select('*')
                .eq('room', roomNumber)
                .single(),
            cacheKey
        );
    }
    
    // Récupérer les demandes laundry avec cache
    async function getLaundryRequests(roomNumber) {
        const cacheKey = `laundry_${roomNumber}`;
        
        return cachedFetch('guest_laundry_requests',
            supabase
                .from('guest_laundry_requests')
                .select('*')
                .eq('room_number', roomNumber)
                .order('created_at', { ascending: false })
                .limit(5),
            cacheKey
        );
    }
    
    // Récupérer les offres avec cache (valable 1 heure)
    async function getOffers() {
        const cacheKey = `offers_active`;
        const OFFERS_CACHE_DURATION = 60 * 60 * 1000; // 1 heure
        
        if (memoryCache[cacheKey] && 
            Date.now() - memoryCache[cacheKey].timestamp < OFFERS_CACHE_DURATION) {
            console.log('✅ Cache offres:', cacheKey);
            return memoryCache[cacheKey].data;
        }
        
        const { data, error } = await supabase
            .from('offers')
            .select('*')
            .eq('active', true);
        
        if (data && !error) {
            memoryCache[cacheKey] = {
                data: data,
                timestamp: Date.now()
            };
            
            try {
                localStorage.setItem('cache_' + cacheKey, JSON.stringify({
                    data: data,
                    timestamp: Date.now()
                }));
            } catch (e) {}
        }
        
        return data;
    }
    
    // Nettoyer les vieux caches
    function cleanupCache() {
        const now = Date.now();
        
        // Nettoyer la mémoire
        Object.keys(memoryCache).forEach(key => {
            if (now - memoryCache[key].timestamp > CACHE_DURATION) {
                delete memoryCache[key];
            }
        });
        
        // Nettoyer localStorage
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('cache_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (now - data.timestamp > CACHE_DURATION) {
                        localStorage.removeItem(key);
                    }
                } catch (e) {
                    localStorage.removeItem(key);
                }
            }
        }
    }
    
    // Nettoyage périodique (toutes les 30 minutes)
    setInterval(cleanupCache, 30 * 60 * 1000);
    
    // Nettoyer au chargement
    cleanupCache();
    
    // Exposer les fonctions
    window.supabaseEconomy = {
        cachedFetch: cachedFetch,
        getGuestData: getGuestData,
        getLaundryRequests: getLaundryRequests,
        getOffers: getOffers,
        cleanupCache: cleanupCache
    };
    
    console.log('✅ Économie Supabase activée - Cache 10 min');
    
})();
