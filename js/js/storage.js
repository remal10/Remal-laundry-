let cachedSlips = [];
let pmsDatabase = {};
let supabaseClient = null;

try {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch(err) { 
    console.warn("Supabase local mode fallback:", err); 
}

function chargerDonneesLocalStorage() {
    const data = localStorage.getItem('remal_laundry_slips');
    cachedSlips = data ? JSON.parse(data) : [];
}

function sauvegarderDonneesLocalStorage() {
    localStorage.setItem('remal_laundry_slips', JSON.stringify(cachedSlips));
}

function chargerPmsLocalStorage() {
    const data = localStorage.getItem('remal_pms_database');
    if (data) {
        try { pmsDatabase = JSON.parse(data); } catch(e) { pmsDatabase = {}; }
    }
}

function sauvegarderPmsLocalStorage() {
    localStorage.setItem('remal_pms_database', JSON.stringify(pmsDatabase));
}

async function chargerDonneesEtAbonnementCloud() {
    chargerDonneesLocalStorage();
    if (!supabaseClient) return;

    try {
        const { data: slips, error: slipsErr } = await supabaseClient.from('laundry_slips').select('*');
        if (!slipsErr && slips && slips.length > 0) {
            cachedSlips = slips;
            sauvegarderDonneesLocalStorage();
        }

        const { data: guests, error: guestsErr } = await supabaseClient.from('pms_guests').select('*');
        if (!guestsErr && guests && guests.length > 0) {
            pmsDatabase = {};
            guests.forEach(g => {
                pmsDatabase[g.room] = {
                    guestName: g.guest_name || g.guestName || 'Unknown Guest',
                    roomTyp: g.room_typ || g.roomTyp || 'DLXR',
                    arrival: g.arrival || '',
                    departure: g.departure || '',
                    agency: g.agency || 'Direct',
                    quotaText: g.quota_text || g.quotaText || 'Chargeable',
                    isChargeable: g.is_chargeable !== undefined ? g.is_chargeable : true
                };
            });
            sauvegarderPmsLocalStorage();
        }

        supabaseClient.channel('realtime_laundry')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'laundry_slips' }, async () => {
                const { data } = await supabaseClient.from('laundry_slips').select('*');
                if (data) {
                    cachedSlips = data;
                    sauvegarderDonneesLocalStorage();
                    if (typeof chargerLiveOrders === 'function') chargerLiveOrders();
                }
            })
            .subscribe();

    } catch (e) {
        console.error("Erreur de synchronisation cloud:", e);
    }
}
