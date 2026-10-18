// ═══════════════════════════════════════════════════════════════════
// REMAL LAUNDRY OS — LINEN CONTROL MODULE (v3 FINAL)
// Fixes :
//  - Handler submit attaché indépendamment de DOMContentLoaded
//  - Ordre correct : ouvrir aperçu AVANT fermer saisie
//  - Nettoyage inline style à la fermeture
//  - Logs de diagnostic complets
// ═══════════════════════════════════════════════════════════════════

const linenItemsMap = {
    bedsheets: 'Bedsheets',
    duvet: 'Duvet Cover',
    pillow: 'Pillow covers',
    bathtowel: 'Bath towels',
    handtowel: 'Hand Towels',
    face: 'Face Towels',
    bathmat: 'Bath Mats',
    robe: 'Bath Robes',
    duster: 'Dusters'
};

// ═══════════════════════════════════════════════════════════════════
// MODALE SAISIE — OUVERTURE / FERMETURE
// ═══════════════════════════════════════════════════════════════════
function openLinenSheetModal(type) {
    console.log('🟡 [LINEN] openLinenSheetModal, type =', type);

    if (typeof isAdmin === 'function' && !isAdmin()) {
        return alert("🚫 Access denied. Only administrators can create Linen Sheets.");
    }

    const modal = document.getElementById('linenSheetModal');
    if (!modal) {
        console.error('❌ [LINEN] #linenSheetModal introuvable');
        return;
    }

    document.getElementById('linenType').value = type;
    document.getElementById('linenModalTitle').innerText =
        type === 'hotel' ? 'New Hotel Linen Sheet' : 'New Villa Linen Sheet';

    document.getElementById('linenForm').reset();
    document.getElementById('linenDate').valueAsDate = new Date();

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    console.log('🟡 [LINEN] Modale saisie ouverte');
}

function closeLinenSheetModal() {
    const modal = document.getElementById('linenSheetModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.style.display = '';
    console.log('🟡 [LINEN] Modale saisie fermée');
}

// ═══════════════════════════════════════════════════════════════════
// MODALE APERÇU — AFFICHAGE / FERMETURE
// ═══════════════════════════════════════════════════════════════════
function showLinenPrintPreview(type, location, date, items) {
    console.log('🖨️ [LINEN] showLinenPrintPreview', { type, location, date, items });

    const printModal = document.getElementById('linenPrintModal');
    if (!printModal) {
        console.error('❌ [LINEN] #linenPrintModal introuvable !');
        alert("Erreur : la modale d'aperçu est absente du DOM.\nVérifie que le patch index.html a bien été appliqué.");
        return;
    }

    const dateObj = date ? new Date(date) : new Date();
    const formattedDate = isNaN(dateObj.getTime())
        ? '---'
        : dateObj.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

    document.getElementById('printTitle').innerText =
        type === 'hotel' ? 'Hotel Linen Control Sheet' : 'Villa Linen Control Sheet';
    document.getElementById('printLocation').innerText = location || '---';
    document.getElementById('printDate').innerText = formattedDate;

    const tbody = document.getElementById('printTableBody');
    const entries = Object.entries(items || {});
    if (entries.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" class="p-4 text-center text-stone-400 italic">No items</td></tr>`;
    } else {
        tbody.innerHTML = entries.map(([name, qty]) => `
            <tr>
                <td class="p-3 border-b border-stone-200 font-semibold text-stone-700">${name}</td>
                <td class="p-3 border-b border-stone-200 text-center font-bold text-lg">${qty}</td>
            </tr>
        `).join('');
    }

    printModal.classList.remove('hidden');
    printModal.style.display = 'flex';
    printModal.style.zIndex = '999999';

    console.log('🖨️ [LINEN] Modale aperçu ouverte · display =',
        window.getComputedStyle(printModal).display);
}

function closeLinenPrintPreview() {
    const printModal = document.getElementById('linenPrintModal');
    if (!printModal) return;
    printModal.classList.add('hidden');
    printModal.style.display = '';
    console.log('🖨️ [LINEN] Modale aperçu fermée');
}

// ═══════════════════════════════════════════════════════════════════
// HISTORIQUE
// ═══════════════════════════════════════════════════════════════════
async function loadRecentLinenSheets() {
    const container = document.getElementById('recentLinenSheets');
    if (!container) return;
    if (!window.supabaseClient) {
        console.warn('⚠️ [LINEN] supabaseClient absent');
        return;
    }

    try {
        const { data, error } = await window.supabaseClient
            .from('linen_control_sheets')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error('❌ [LINEN] loadRecentLinenSheets error:', error);
            container.innerHTML = `<p class="text-xs text-rose-400 text-center py-4">⚠️ ${error.message}</p>`;
            return;
        }

        if (!data || data.length === 0) {
            container.innerHTML = `<p class="text-xs text-stone-500 text-center py-4">No sheets created yet.</p>`;
            return;
        }

        container.innerHTML = data.map(sheet => {
            const d = sheet.pickup_date ? new Date(sheet.pickup_date).toLocaleDateString('en-GB') : '---';
            return `
                <div class="flex justify-between items-center p-3 bg-[#0f0e0c] border border-[#2f2820] rounded-xl text-xs">
                    <div>
                        <span class="font-bold text-[#DCA773] uppercase">${sheet.type || '---'} - ${sheet.location_number || '---'}</span>
                        <div class="text-[10px] text-stone-500 mt-1">Pickup: ${d}</div>
                    </div>
                    <span class="bg-amber-950 text-amber-200 px-2 py-1 rounded font-bold text-[9px] uppercase">${sheet.status || 'washing'}</span>
                </div>`;
        }).join('');
    } catch (err) {
        console.error('❌ [LINEN] Exception loadRecentLinenSheets:', err);
    }
}

// ═══════════════════════════════════════════════════════════════════
// HANDLER SUBMIT — attaché IMMÉDIATEMENT (pas d'attente DOMContentLoaded)
// ═══════════════════════════════════════════════════════════════════
function attachLinenFormHandler() {
    const form = document.getElementById('linenForm');
    if (!form) {
        console.warn('⚠️ [LINEN] #linenForm pas encore dans le DOM');
        return false;
    }
    if (form.dataset.linenBound === '1') {
        console.log('ℹ️ [LINEN] Handler déjà attaché');
        return true;
    }
    form.dataset.linenBound = '1';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('🚀 [LINEN] Submit intercepté');

        const type = document.getElementById('linenType')?.value || '';
        const location = (document.getElementById('linenLocation')?.value || '').trim();
        const date = document.getElementById('linenDate')?.value || '';

        if (!type) return alert('Type manquant. Rouvre la modale.');
        if (!location) return alert('Location # requis.');
        if (!date) return alert('Pickup date requise.');

        const items = {};
        Object.keys(linenItemsMap).forEach(key => {
            const el = document.getElementById(`item_${key}`);
            const val = el ? (parseInt(el.value) || 0) : 0;
            if (val > 0) items[linenItemsMap[key]] = val;
        });

        console.log('📦 [LINEN] Données:', { type, location, date, items });

        if (Object.keys(items).length === 0) {
            return alert('Please enter at least one item quantity.');
        }

        const staffSession = JSON.parse(localStorage.getItem('remal_current_staff') || '{}');
        const staffName = staffSession.name ? `staff ( ${staffSession.name} )` : 'admin';

        // 1) Sauvegarde Supabase
        if (window.supabaseClient) {
            try {
                const { data, error } = await window.supabaseClient
                    .from('linen_control_sheets')
                    .insert([{ type, location_number: location, pickup_date: date, items, created_by: staffName }])
                    .select();

                if (error) {
                    console.warn('⚠️ [LINEN] Supabase error:', error.message, error);
                    alert('⚠️ Supabase error:\n' + error.message + '\n\nL\'aperçu s\'ouvre quand même.');
                } else {
                    console.log('✅ [LINEN] Sauvegardé Supabase:', data);
                }
            } catch (err) {
                console.error('❌ [LINEN] Exception Supabase:', err);
            }
        } else {
            console.warn('⚠️ [LINEN] supabaseClient absent');
        }

        // 2) OUVRIR l'aperçu EN PREMIER
        try {
            showLinenPrintPreview(type, location, date, items);
        } catch (err) {
            console.error('❌ [LINEN] showLinenPrintPreview:', err);
            return alert('Erreur aperçu: ' + err.message);
        }

        // 3) FERMER la saisie ENSUITE
        closeLinenSheetModal();

        // 4) Historique
        loadRecentLinenSheets();
    });

    console.log('✅ [LINEN] Handler submit attaché à #linenForm');
    return true;
}

// Attach immédiat + retry si nécessaire
(function initLinenFormHandler() {
    if (attachLinenFormHandler()) return;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachLinenFormHandler, { once: true });
    } else {
        setTimeout(attachLinenFormHandler, 100);
    }
})();

// ═══════════════════════════════════════════════════════════════════
// EXPORT GLOBAL
// ═══════════════════════════════════════════════════════════════════
window.openLinenSheetModal = openLinenSheetModal;
window.closeLinenSheetModal = closeLinenSheetModal;
window.showLinenPrintPreview = showLinenPrintPreview;
window.closeLinenPrintPreview = closeLinenPrintPreview;
window.loadRecentLinenSheets = loadRecentLinenSheets;
window.attachLinenFormHandler = attachLinenFormHandler;

console.log('✅ [LINEN] Module chargé (v3 FINAL)');
