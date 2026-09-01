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

// Dismiss notification banner manually
function dismissGuestNotificationBanner() {
    const banner = document.getElementById('guestBannerContainer') || document.getElementById('guestRequestNotificationBanner');
    if (banner) {
        banner.style.display = 'none';
        banner.classList.add('hidden');
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

    // Play chime sound
    playLuxuryHotelChime();
}

// Process incoming payload from Guest Portal
function processIncomingPayload(rawData) {
    if (!rawData) return;

    // ⛔ BLOQUAGE NOTIFICATION SI CRÉÉ PAR LE STAFF / LAUNDRY OS
    if (rawData.created_by && rawData.created_by !== 'Guest App' && rawData.created_by !== 'Guest' && rawData.created_by !== 'Guest Portal') {
        if (typeof window.onNewGuestRequestReceived === 'function') {
            window.onNewGuestRequestReceived(rawData);
        } else if (typeof chargerLiveOrders === 'function') {
            chargerLiveOrders();
        } else if (typeof loadOrders === 'function') {
            loadOrders();
        }
        return; // Stoppe l'exécution : Pas de son ni de bannière pour le staff
    }

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
        status: rawData.status || 'Collected',
        is_guest_request: true,
        created_at: rawData.created_at || new Date().toISOString()
    };

    // 1. Trigger notification banner & audio chime only for real guest requests
    showLuxuryNotificationBanner(normalizedRequest);

    // 2. Transmit to Laundry OS interface to refresh active orders
    if (typeof window.onNewGuestRequestReceived === 'function') {
        window.onNewGuestRequestReceived(normalizedRequest);
    } else if (typeof chargerLiveOrders === 'function') {
        chargerLiveOrders();
    } else if (typeof loadOrders === 'function') {
        loadOrders();
    }
}

// Fallback polling sync (Monitors all new incoming requests)
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
        if (lastProcessedId === null) {
            lastProcessedId = String(latest.id);
            return;
        }

        if (String(latest.id) !== lastProcessedId) {
            lastProcessedId = String(latest.id);
            console.log("🔄 New request detected via fallback:", latest);
            processIncomingPayload(latest);
        }
    } catch (err) {
        console.warn("Fallback sync warning:", err);
    }
}

// Initialize Supabase Realtime Listener
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
                if (typeof isLocalUpdating !== 'undefined' && isLocalUpdating) return;
                console.log("🔔 DIRECT GUEST REQUEST RECEIVED:", payload.new);
                processIncomingPayload(payload.new);
            }
        )
        .subscribe((status) => {
            console.log("📡 Supabase Realtime channel status:", status);
        });

    // Fallback polling every 8 seconds
    setInterval(syncFallbackGuestRequests, 8000);
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initRealtimeGuestRequests, 1000);
});
