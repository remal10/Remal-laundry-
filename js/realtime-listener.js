// ==========================================
// REALTIME LISTENER - GUEST REQUESTS (REMAL HOTEL)
// ==========================================

// 1. Sonnerie élégante Carillon Hôtel 5 Étoiles (Web Audio API)
function playLuxuryHotelChime() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();

        // Notes harmonieuses (La5 - 880Hz puis Mi6 - 1318.51Hz)
        const notes = [880, 1318.51];
        
        notes.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);

            // Attaque douce et déclin élégant style cloche en cristal
            const startTime = ctx.currentTime + (index * 0.25);
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05); // Attaque
            gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.2); // Déclin doux

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + 1.2);
        });
    } catch (e) {
        console.warn("Audio Context non autorisé ou non supporté sans interaction préalable.");
    }
}

// 2. Affichage de la Bannière de Notification VIP
function showLuxuryNotificationBanner(order) {
    // Supprimer une ancienne bannière si elle existe
    const existingBanner = document.getElementById('remalLuxuryBanner');
    if (existingBanner) existingBanner.remove();

    const banner = document.createElement('div');
    banner.id = 'remalLuxuryBanner';
    banner.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-md bg-[#161412]/95 border border-[#DCA773] text-[#ffffff] p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-xl flex items-center justify-between gap-4 transition-all duration-500 transform -translate-y-10 opacity-0';
    
    banner.innerHTML = `
        <div class="flex items-center gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-[#DCA773]/20 border border-[#DCA773] flex items-center justify-center text-[#DCA773] shrink-0">
                <i class="fas fa-bell text-base animate-bounce"></i>
            </div>
            <div>
                <div class="flex items-center gap-2">
                    <span class="font-bold text-xs uppercase tracking-widest text-[#DCA773]">New Guest Order</span>
                    <span class="text-[9px] bg-[#DCA773] text-stone-950 font-black px-2 py-0.5 rounded-full">ROOM ${order.room_number}</span>
                </div>
                <p class="text-xs font-semibold text-stone-200 mt-0.5">${order.guest_name || 'Guest'} • ${order.total_pieces || 0} Pcs</p>
            </div>
        </div>
        <button onclick="document.getElementById('remalLuxuryBanner').remove()" class="text-stone-400 hover:text-white p-1 text-base">✕</button>
    `;

    document.body.appendChild(banner);

    // Animation d'apparition
    requestAnimationFrame(() => {
        banner.classList.remove('-translate-y-10', 'opacity-0');
    });

    // Masquage automatique après 7 secondes
    setTimeout(() => {
        if (banner && banner.parentNode) {
            banner.classList.add('-translate-y-10', 'opacity-0');
            setTimeout(() => banner.remove(), 500);
        }
    }, 7000);
}

// 3. Écouteur Realtime Supabase
function initGuestRequestsRealtime() {
    if (typeof supabaseClient === 'undefined') {
        console.error("Supabase client non défini dans Laundry OS.");
        return;
    }

    supabaseClient
        .channel('laundry_os_guest_requests')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'guest_laundry_requests' 
        }, payload => {
            const newOrder = payload.new;

            // 1. Jouer la sonnerie élégante
            playLuxuryHotelChime();

            // 2. Afficher la bannière
            showLuxuryNotificationBanner(newOrder);

            // 3. Mettre à jour l'interface Active Room (Appelle ui.js ou laundry.js)
            if (typeof window.onNewGuestRequestReceived === 'function') {
                window.onNewGuestRequestReceived(newOrder);
            }
        })
        .subscribe((status) => {
            console.log("Statut Connexion Realtime Guest Requests:", status);
        });
}

// Lancement automatique de l'écouteur au chargement
document.addEventListener('DOMContentLoaded', () => {
    initGuestRequestsRealtime();
});
