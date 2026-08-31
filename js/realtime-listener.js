// ==========================================
// REALTIME LISTENER & NOTIFICATIONS (REMAL LAUNDRY OS)
// ==========================================

// Jouer le carillon avec gestion sécurisée de l'AudioContext mobile
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

// Affichage sécurisé de la bannière VIP en Anglais
function showLuxuryNotificationBanner(normalizedData) {
    const banner = document.getElementById('guestBannerContainer') || document.getElementById('guestRequestNotificationBanner');
    const bannerText = document.getElementById('guestBannerText');

    const roomNum = normalizedData.room || normalizedData.room_number || '---';
    const guestName = normalizedData.guest_name || 'Guest';
    const totalPcs = normalizedData.total_clothes || normalizedData.total_pieces || 0;

    if (bannerText) {
        bannerText.innerText = `⚡ NEW REQUEST: Room ${roomNum} (${guestName}) — ${totalPcs} piece(s) submitted.`;
    }

    if (banner) {
        banner.classList.remove('hidden');
        banner.style.display = 'flex';
    }

    playLuxuryHotelChime();
}

// Normalisation des données envoyées par le Guest Portal
function processIncomingPayload(rawData) {
    if (!rawData) return;

    // IGNORER SI C'EST UNE CRÉATION PAR LE STAFF DE LAUNDRY OS (Évite l'auto-trigger)
    if (rawData.created_by && rawData.created_by !== 'Guest App' && rawData.created_by !== 'Guest') {
        return;
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
        status: rawData.status || 'Pending',
        is_guest_request: true,
        created_at: rawData.created_at || new Date().toISOString()
    };

    // 1. Afficher la bannière et jouer le carillon VIP uniquement pour les vrais guests
    showLuxuryNotificationBanner(normalizedRequest);

    // 2. Transmettre à l'UI
    if (typeof window.onNewGuestRequestReceived === 'function') {
        window.onNewGuestRequestReceived(normalizedRequest);
    }
}

// Synchronisation de secours intelligente (Déclenchée uniquement si inactive)
let lastProcessedId = null;

async function syncFallbackGuestRequests() {
    if (!supabaseClient || isLocalUpdating) return;
    try {
        const { data, error } = await supabaseClient
            .from('guest_laundry_requests')
            .select('*')
            .eq('status', 'Pending') // Ne surveiller que les vraies requêtes clients en attente
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
            console.log("🔄 Nouvelle requête client détectée via fallback :", latest);
            processIncomingPayload(latest);
        }
    } catch (err) {
        console.warn("Fallback sync warning:", err);
    }
}

// Initialisation unique du Listener Realtime
function initRealtimeGuestRequests() {
    if (!supabaseClient) {
        console.warn("⚠️ Client Supabase non prêt pour Realtime.");
        return;
    }

    console.log("⚡ Écoute en temps réel activée sur guest_laundry_requests...");

    supabaseClient
        .channel('laundry_os_realtime_channel')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'guest_laundry_requests' },
            (payload) => {
                if (isLocalUpdating) return;
                console.log("🔔 NOUVELLE REQUÊTE CLIENT DIRECTE :", payload.new);
                processIncomingPayload(payload.new);
            }
        )
        .subscribe((status) => {
            console.log("📡 Statut canal Supabase :", status);
        });

    // Polling de secours toutes les 10 secondes (filtré sur 'Pending')
    setInterval(syncFallbackGuestRequests, 10000);
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initRealtimeGuestRequests, 1000);
});
