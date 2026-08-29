// ==========================================
// REALTIME LISTENER & NOTIFICATIONS (REMAL LAUNDRY OS)
// ==========================================

// 1. Jouer un carillon Web Audio "Luxury Hotel"
function playLuxuryHotelChime() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();

        // Si le contexte est en pause (sécurité navigateur), on le relance
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const notes = [523.25, 659.25, 783.99, 1046.50]; // Do, Mi, Sol, Do (Aptement luxueux)
        let now = ctx.currentTime;

        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.15);

            gain.gain.setValueAtTime(0, now + idx * 0.15);
            gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.15 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.15 + 1.2);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + idx * 0.15);
            osc.stop(now + idx * 0.15 + 1.3);
        });

        // Vibration smartphone si supportée
        if ("vibrate" in navigator) {
            navigator.vibrate([200, 100, 200, 100, 400]);
        }
    } catch (e) {
        console.warn("Erreur AudioContext:", e);
    }
}

// 2. Afficher la bannière de notification VIP en haut
function showLuxuryNotificationBanner(reqData) {
    const banner = document.getElementById('guestRequestNotificationBanner');
    const bannerText = document.getElementById('guestBannerText');

    // Récupération intelligente des champs (compatibilité Guest Portal)
    const roomNum = reqData.room_number || reqData.room || '---';
    const guestName = reqData.guest_name || 'Guest';
    const totalPcs = reqData.total_pieces || reqData.total_clothes || 0;

    if (bannerText) {
        bannerText.innerText = `Chambre ${roomNum} (${guestName}) vient de demander ${totalPcs} pièce(s).`;
    }

    if (banner) {
        banner.classList.remove('hidden');
    }

    // Jouer le son
    playLuxuryHotelChime();
}

// 3. Initialiser l'abonnement Supabase Realtime
function initRealtimeGuestRequests() {
    if (!supabaseClient) {
        console.warn("⚠️ supabaseClient non initialisé. Realtime désactivé.");
        return;
    }

    console.log("⚡ Activation du canal Realtime sur la table guest_laundry_requests...");

    const channel = supabaseClient
        .channel('laundry_os_guest_requests_channel')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'guest_laundry_requests'
            },
            (payload) => {
                console.log("🔔 NOUVELLE DEMANDE EN DIRECT REÇUE :", payload.new);

                const rawData = payload.new;

                // Normalisation des données pour l'interface de Laundry OS
                const normalizedRequest = {
                    id: rawData.id || Date.now(),
                    room: rawData.room_number || rawData.room || '---',
                    guest_name: rawData.guest_name || 'Guest',
                    service: rawData.service_type || 'Laundry',
                    items: rawData.items || [],
                    total_clothes: rawData.total_pieces || rawData.total_clothes || 0,
                    total: rawData.grand_total || rawData.total || rawData.subtotal || 0,
                    note: rawData.special_notes || rawData.note || 'None',
                    status: 'pickup_alert',
                    pms_quota: rawData.pms_quota || 'Standard',
                    extra_charged: rawData.extra_charged || false,
                    is_guest_request: true,
                    created_at: rawData.created_at || new Date().toISOString()
                };

                // Notification visuelle et sonore
                showLuxuryNotificationBanner(normalizedRequest);

                // Transmission à l'UI globale
                if (typeof window.onNewGuestRequestReceived === 'function') {
                    window.onNewGuestRequestReceived(normalizedRequest);
                } else if (typeof afficherListeBordereauxLocal === 'function') {
                    afficherListeBordereauxLocal();
                }
            }
        )
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                console.log("✅ Connecté au temps réel Supabase avec succès !");
            } else if (status === 'CHANNEL_ERROR') {
                console.error("❌ Erreur d'abonnement Realtime :", err);
            }
        });
}

// Lancement automatique au chargement
document.addEventListener('DOMContentLoaded', () => {
    // Petit délai pour s'assurer du chargement de Supabase SDK
    setTimeout(initRealtimeGuestRequests, 1000);
});
