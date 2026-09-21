// ==========================================
// REALTIME LISTENER & NOTIFICATIONS (REMAL LAUNDRY OS)
// ==========================================

// Play hotel chime with mobile AudioContext support
function playLuxuryHotelChime() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();

        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const notes = [523.25, 659.25, 783.99, 1046.50];
        let now = ctx.currentTime;

        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.15);

            gain.gain.setValueAtTime(0, now + idx * 0.15);
            gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.15 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.15 + 1.1);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + idx * 0.15);
            osc.stop(now + idx * 0.15 + 1.2);
        });

        if ("vibrate" in navigator) {
            navigator.vibrate([200, 100, 200, 100, 400]);
        }
    } catch (e) {
        console.warn("Audio Context Warning:", e);
    }
}

// Display VIP notification banner in English
function showLuxuryNotificationBanner(normalizedData) {
    const banner = document.getElementById('guestBannerContainer') || document.getElementById('guestRequestNotificationBanner');
    const bannerText = document.getElementById('guestBannerText');

    const roomNum = normalizedData.room || normalizedData.room_number || '---';
    const guestName = normalizedData.guest_name || 'Guest';
    const totalPcs = normalizedData.total_clothes || normalizedData.total_pieces || 0;

    const textMessage = `New laundry request from Room ${roomNum} (${guestName}) — ${totalPcs} Pcs`;

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

    playLuxuryHotelChime();
}

// ═══════════════════════════════════════════════════════════════════
// Process incoming payload
// ═══════════════════════════════════════════════════════════════════
// RÈGLES STRICTES :
//   1. created_by commence par 'staff (' → action STAFF → pas de chime
//   2. created_by vide/null/'pending'/'Guest App'/'Guest' → GUEST → chime
//   3. Sinon → silence
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
// Fallback polling sync
// CORRECTION : Ignore les records Staff (pas de chime, pas d'écrasement)
// ═══════════════════════════════════════════════════════════════════
let lastProcessedId = null;

async function syncFallbackGuestRequests() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
    if (typeof isLocalUpdating !== 'undefined' && isLocalUpdating) return;

    try {
        const { data, error } = await supabaseClient
            .from('guest_laundry_requests')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

        if (error || !data || data.length === 0) return;

        const latest = data[0];
        const latestCreatedBy = String(latest.created_by || '').trim();

        if (lastProcessedId === null) {
            lastProcessedId = String(latest.id);
            return;
        }

        if (String(latest.id) !== lastProcessedId) {
            lastProcessedId = String(latest.id);
            
            // ⛔ NE PAS TRAITER les records Staff
            if (latestCreatedBy.startsWith('staff (')) {
                console.log("⏭️ [Fallback] Skipping STAFF record (no chime):", {
                    id: latest.id,
                    created_by: latestCreatedBy
                });
                return;
            }

            console.log("🔄 [Fallback] New GUEST request detected:", {
                id: latest.id,
                created_by: latestCreatedBy,
                status: latest.status
            });
            processIncomingPayload(latest);
        }
    } catch (err) {
        console.warn("Fallback sync warning:", err);
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
                
                // ⛔ Ignorer les records Staff (double protection)
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

    setInterval(syncFallbackGuestRequests, 8000);
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initRealtimeGuestRequests, 1000);
});
