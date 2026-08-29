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

// Affichage sécurisé de la bannière VIP
function showLuxuryNotificationBanner(normalizedData) {
    const banner = document.getElementById('guestRequestNotificationBanner');
    const bannerText = document.getElementById('guestBannerText');

    if (bannerText) {
        bannerText.innerText = `Chambre ${normalizedData.room} (${normalizedData.guest_name}) - ${normalizedData.total_clothes} pièce(s).`;
    }

    if (banner) {
        banner.classList.remove('hidden');
    }

    playLuxuryHotelChime();
}

// Normalisation des données envoyées par le Guest Portal
function processIncomingPayload(rawData) {
    if (!rawData) return;

    const normalizedRequest = {
        id: rawData.id || Date.now(),
        room: rawData.room_number || rawData.room || '---',
        guest_name: rawData.guest_name || 'Guest',
        service: rawData.service_type || 'Laundry',
        items: rawData.items || [],
        total_clothes: rawData.total_pieces || rawData.total_clothes || 0,
        subtotal: rawData.subtotal || 0,
        vat: rawData.vat || 0,
        total: rawData.grand_total || rawData.total || 0,
        note: rawData.special_notes || rawData.note || 'None',
        pms_quota: rawData.pms_quota || 'Standard',
        extra_charged: rawData.extra_charged || false,
        status: 'pickup_alert',
        is_guest_request: true,
        created_at: rawData.created_at || new Date().toISOString()
    };

    // 1. Afficher la bannière et jouer le son
    showLuxuryNotificationBanner(normalizedRequest);

    // 2. Transmettre à l'interface graphique UI
    if (typeof window.onNewGuestRequestReceived === 'function') {
        window.onNewGuestRequestReceived(normalizedRequest);
    }
}

// Synchronisation de secours (Polling toutes les 5 secondes en cas de rupture de réseau)
let lastProcessedId = null;

async function syncFallbackGuestRequests() {
    if (!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient
            .from('guest_laundry_requests')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

        if (error || !data || data.length === 0) return;

        const latest = data[0];
        if (lastProcessedId && latest.id !== lastProcessedId) {
            console.log("🔄 Nouvelle requête détectée via le système de secours :", latest);
            processIncomingPayload(latest);
        }
        lastProcessedId = latest.id;
    } catch (err) {
        console.warn("Fallback sync warning:", err);
    }
}

// Initialisation du listener Realtime
function initRealtimeGuestRequests() {
    if (!supabaseClient) {
        console.warn("⚠️ Client Supabase non prêt pour Realtime.");
        return;
    }

    console.log("⚡ Écoute en temps réel activée sur guest_laundry_requests...");

    supabaseClient
        .channel('public:guest_laundry_requests')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'guest_laundry_requests' },
            (payload) => {
                console.log("🔔 NOUVELLE REQUÊTE REÇUE EN DIRECT :", payload.new);
                processIncomingPayload(payload.new);
            }
        )
        .subscribe((status) => {
            console.log("📡 Statut canal Supabase :", status);
        });

    // Activer la vérification automatique toutes les 5 secondes
    setInterval(syncFallbackGuestRequests, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initRealtimeGuestRequests, 800);
});
