// ==========================================
// REALTIME LISTENER & NOTIFICATIONS (REMAL LAUNDRY OS)
// ✅ CORRIGÉ : N1, N2, N3 (Anti-doublon & Fallback robuste)
// ==========================================

// ═══════════════════════════════════════════════════════════════════
// 🎵 SONS PREMIUM — 3 tonalités distinctes selon le type
// ═══════════════════════════════════════════════════════════════════

// Contexte audio partagé (créé au 1er user gesture)
let _sharedAudioCtx = null;

function _getAudioCtx() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return null;
        if (!_sharedAudioCtx) _sharedAudioCtx = new AudioContext();
        if (_sharedAudioCtx.state === 'suspended') _sharedAudioCtx.resume();
        return _sharedAudioCtx;
    } catch (e) {
        console.warn("Audio Context Warning:", e);
        return null;
    }
}

// Init au 1er clic (obligatoire mobile)
document.addEventListener('click', () => _getAudioCtx(), { once: true });
document.addEventListener('touchstart', () => _getAudioCtx(), { once: true });

/**
 * Joue une séquence de notes
 * @param {Array} notes - [{ freq, delay, duration, volume }]
 * @param {string} type - 'sine' | 'triangle' | 'square'
 */
function _playSequence(notes, type = 'sine') {
    const ctx = _getAudioCtx();
    if (!ctx) return;

    const now = ctx.currentTime;

    notes.forEach(({ freq, delay = 0, duration = 0.3, volume = 0.15 }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now + delay);

        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(volume, now + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + duration + 0.1);
    });
}

/**
 * 🛎️ Chime principal — Nouvelle commande Laundry
 */
function playLuxuryHotelChime() {
    _playSequence([
        { freq: 523.25, delay: 0.00, duration: 0.40, volume: 0.15 },  // C5
        { freq: 659.25, delay: 0.15, duration: 0.40, volume: 0.15 },  // E5
        { freq: 783.99, delay: 0.30, duration: 0.45, volume: 0.14 },  // G5
        { freq: 1046.50, delay: 0.45, duration: 0.60, volume: 0.12 }  // C6
    ], 'sine');

    if ("vibrate" in navigator) {
        navigator.vibrate([200, 100, 200, 100, 400]);
    }
}

/**
 * 🧺 Son Laundry Guest (demande de linge)
 */
function playLaundryChime() {
    _playSequence([
        { freq: 659.25, delay: 0.00, duration: 0.35, volume: 0.16 },  // E5
        { freq: 880.00, delay: 0.18, duration: 0.50, volume: 0.13 }   // A5
    ], 'triangle');

    if ("vibrate" in navigator) {
        navigator.vibrate([120, 60, 120]);
    }
}

/**
 * 📢 Gong SPA (demande SPA)
 */
function playSpaGong() {
    _playSequence([
        { freq: 196.00, delay: 0.00, duration: 0.80, volume: 0.14 },  // G3
        { freq: 147.00, delay: 0.30, duration: 1.00, volume: 0.12 }   // D3
    ], 'sine');

    if ("vibrate" in navigator) {
        navigator.vibrate([200, 100, 200]);
    }
}

/**
 * 🎯 Sélectionne le son selon le type de commande
 */
function playAlert(type = 'new_order') {
    switch (type) {
        case 'spa':
            playSpaGong();
            break;
        case 'laundry':
            playLaundryChime();
            break;
        case 'new_order':
        case 'room_service':
        default:
            playLuxuryHotelChime();
            break;
    }
}

// Display VIP notification banner in English
function showLuxuryNotificationBanner(normalizedData) {
    const banner = document.getElementById('guestBannerContainer') || document.getElementById('guestRequestNotificationBanner');
    const bannerText = document.getElementById('guestBannerText');

    const roomNum = normalizedData.room || normalizedData.room_number || '---';
    const guestName = normalizedData.guest_name || 'Guest';
    const totalPcs = normalizedData.total_clothes || normalizedData.total_pieces || 0;
    const grandTotal = Number(normalizedData.grand_total || normalizedData.total || 0);

    const textMessage = `⚡ NEW REQUEST: Room ${roomNum} (${guestName}) — ${totalPcs} Pcs (${grandTotal.toFixed(2)} AED)`;

    if (bannerText) {
        bannerText.innerText = textMessage;
    }

    if (banner) {
        banner.classList.remove('hidden');
        banner.style.display = 'flex';
        banner.classList.add('animate-bounce');
    } else {
        console.log("🔔 NOTIFICATION:", textMessage);
    }

    // 🎵 Sélectionne le son selon le type de commande
    let soundType = 'laundry';  // par défaut : Laundry Guest
    
    const serviceType = String(normalizedData.service_type || '').toLowerCase();
    if (serviceType.includes('spa')) {
        soundType = 'spa';
    } else if (serviceType.includes('room') || serviceType.includes('falaj') || serviceType.includes('sarab')) {
        soundType = 'room_service';
    } else if (serviceType.includes('laundry')) {
        soundType = 'laundry';
    }
    
    playAlert(soundType);
}

// ═══════════════════════════════════════════════════════════════════
// Process incoming payload
// ═══════════════════════════════════════════════════════════════════
function processIncomingPayload(rawData) {
    if (!rawData) return;

    const createdBy = String(rawData.created_by || '').trim();
    const isStaffAction = createdBy.startsWith('staff (');

    console.log("🔍 [processIncomingPayload]", {
        id: rawData.id,
        created_by: createdBy,
        status: rawData.status,
        isStaff: isStaffAction
    });

    // ═══════════════════════════════════════════════════════════════
    // CAS 1 : ACTION STAFF → transmission silencieuse (pas de chime)
    // ═══════════════════════════════════════════════════════════════
    if (isStaffAction) {
        console.log("👤 [processIncomingPayload] Staff action - no banner, no chime");
        
        if (typeof window.onNewGuestRequestReceived === 'function') {
            window.onNewGuestRequestReceived(rawData);
        } else if (typeof chargerLiveOrders === 'function') {
            chargerLiveOrders();
        }
        return;
    }

    // ═══════════════════════════════════════════════════════════════
    // CAS 2 : ACTION GUEST → chime + bannière
    // ═══════════════════════════════════════════════════════════════
    console.log("🛎️ [processIncomingPayload] Guest action - banner + chime");

    const normalizedRequest = {
        id: String(rawData.id),
        room: rawData.room_number || rawData.room || '---',
        room_number: rawData.room_number || rawData.room || '---',
        guest_name: rawData.guest_name || 'Guest',
        service_type: rawData.service_type || 'Laundry Collection',
        items: rawData.items || [],
        total_clothes: rawData.total_pieces || rawData.total_clothes || 0,
        total_pieces: rawData.total_pieces || rawData.total_clothes || 0,
        subtotal: Number(rawData.subtotal || 0),
        vat: Number(rawData.vat || 0),
        total: Number(rawData.grand_total || rawData.total || 0),
        grand_total: Number(rawData.grand_total || rawData.total || 0),
        note: rawData.special_notes || rawData.note || 'None',
        special_notes: rawData.special_notes || rawData.note || 'None',
        pms_quota: rawData.pms_quota || 'Standard',
        extra_charged: rawData.extra_charged || false,
        status: rawData.status || 'Pending',
        is_guest_request: true,
        created_by: 'pending',
        created_at: rawData.created_at || new Date().toISOString()
    };

    showLuxuryNotificationBanner(normalizedRequest);

    if (typeof window.onNewGuestRequestReceived === 'function') {
        window.onNewGuestRequestReceived(normalizedRequest);
    } else if (typeof chargerLiveOrders === 'function') {
        chargerLiveOrders();
    }
}

// ═══════════════════════════════════════════════════════════════════
// Fallback polling sync (CORRIGÉ : N1, N2, N3)
// Utilise un curseur temporel pour ne rien rater et ne rien doubler.
// ═══════════════════════════════════════════════════════════════════
let lastSyncTime = new Date().toISOString();

async function syncFallbackGuestRequests() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
    if (typeof isLocalUpdating !== 'undefined' && isLocalUpdating) return;

    try {
        // On récupère TOUTES les commandes depuis la dernière vérification (max 50 par sécurité)
        const { data, error } = await supabaseClient
            .from('guest_laundry_requests')
            .select('*')
            .gt('created_at', lastSyncTime) 
            .order('created_at', { ascending: true })
            .limit(50);

        if (error) {
            console.warn("⚠️ [Fallback] Erreur de sync:", error.message);
            return;
        }

        if (!data || data.length === 0) {
            // Rien de nouveau, on met juste à jour le curseur en silence
            lastSyncTime = new Date().toISOString();
            return;
        }

        console.log(`🔄 [Fallback] ${data.length} nouvelle(s) commande(s) détectée(s) via polling.`);

        for (const req of data) {
            const createdBy = String(req.created_by || '').trim();
            
            // On ignore le son pour les actions du Staff
            if (createdBy.startsWith('staff (')) {
                continue;
            }

            // Traitement de la commande Guest
            processIncomingPayload(req);
        }

        // On avance le curseur temporel avec l'heure de la commande la plus récente
        const latestDate = new Date(data[data.length - 1].created_at);
        latestDate.setMilliseconds(latestDate.getMilliseconds() + 1);
        lastSyncTime = latestDate.toISOString();

    } catch (err) {
        console.warn("⚠️ [Fallback] Exception:", err);
    }
}

// ═══════════════════════════════════════════════════════════════════
// Initialize Supabase Realtime Listener
// ═══════════════════════════════════════════════════════════════════
function initRealtimeGuestRequests() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) {
        console.warn("⚠️ Supabase client not ready for Realtime.");
        return;
    }

    console.log("⚡ Realtime listener activated on guest_laundry_requests...");

    supabaseClient
        .channel('laundry_os_realtime_channel')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'guest_laundry_requests' },
            (payload) => {
                if (typeof isLocalUpdating !== 'undefined' && isLocalUpdating) {
                    console.log("⏸️ [Realtime] Ignoring (local update in progress)");
                    return;
                }
                
                const createdBy = String(payload.new.created_by || '').trim();
                
                // Double protection : ignorer les records Staff
                if (createdBy.startsWith('staff (')) {
                    console.log("⏭️ [Realtime] Skipping STAFF record:", createdBy);
                    return;
                }
                
                console.log("🔔 [Realtime] INSERT RECEIVED:", {
                    id: payload.new.id,
                    created_by: createdBy,
                    status: payload.new.status
                });
                processIncomingPayload(payload.new);
            }
        )
        .subscribe((status) => {
            console.log("📡 Supabase Realtime channel status:", status);
        });

    // Lancement du polling de secours toutes les 8 secondes
    setInterval(syncFallbackGuestRequests, 8000);
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initRealtimeGuestRequests, 1000);
});

// ═══════════════════════════════════════════════════════════════════
// ✅ NEW — PMS SYNC TIMESTAMP HELPERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Format an ISO timestamp as relative time: "Just now", "3 min ago", "2h ago"
 */
function formatLastSync(isoString) {
    if (!isoString) return 'Never';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Never';

    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;

    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Update the last sync badge in the UI
 */
function updateLastSyncDisplay() {
    const lastSync = localStorage.getItem('remal_pms_last_sync');

    const elHeader = document.getElementById('lastUpdateHeaderDisplay');
    const elTable = document.getElementById('tableSyncTime');
    const elBadge = document.getElementById('pmsLastSync');

    const relative = formatLastSync(lastSync);

    if (elHeader) elHeader.textContent = relative;
    if (elTable) elTable.textContent = `Updated: ${relative}`;
    if (elBadge) elBadge.textContent = `📅 Last sync: ${relative}`;
}

/**
 * Mark PMS as synced now + refresh display
 */
function markPmsSynced() {
    const nowIso = new Date().toISOString();
    localStorage.setItem('remal_pms_last_sync', nowIso);
    updateLastSyncDisplay();
    console.log('[PMS] Marked synced at', nowIso);
}

// Auto-refresh every minute
setInterval(updateLastSyncDisplay, 60000);

// Refresh on page ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(updateLastSyncDisplay, 500);
});

// Expose globally
window.formatLastSync = formatLastSync;
window.updateLastSyncDisplay = updateLastSyncDisplay;
window.markPmsSynced = markPmsSynced;

console.log('✅ [PMS Sync] Timestamp helpers loaded (v2)');
