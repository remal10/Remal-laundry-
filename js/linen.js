// ═══════════════════════════════════════════════════════════════════
// REMAL LAUNDRY OS — LINEN CONTROL MODULE (v17 FINAL PRINT)
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
// 1. FORMULAIRE DE SAISIE
// ═══════════════════════════════════════════════════════════════════
function openLinenSheetModal(type) {
    if (typeof isAdmin === 'function' && !isAdmin()) {
        return alert("🚫 Access denied. Admins only.");
    }

    const modal = document.getElementById('linenSheetModal');
    if (!modal) return;

    document.getElementById('linenType').value = type;
    document.getElementById('linenModalTitle').innerText =
        type === 'hotel' ? 'New Hotel Sheet' : 'New Villa Sheet';

    document.getElementById('linenForm').reset();
    document.getElementById('linenDate').valueAsDate = new Date();

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

function closeLinenSheetModal() {
    const modal = document.getElementById('linenSheetModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.style.display = '';
}

// ═══════════════════════════════════════════════════════════════════
// 2. APERÇU (MODALE)
// ═══════════════════════════════════════════════════════════════════
function showLinenPrintPreview(type, location, date, items) {
    const printModal = document.getElementById('linenPrintModal');
    if (!printModal) return;

    const dateObj = date ? new Date(date) : new Date();
    const formattedDate = isNaN(dateObj.getTime())
        ? '---'
        : dateObj.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

    document.getElementById('printTitle').innerText =
        type === 'hotel' ? 'HOTEL LINEN CONTROL SHEET' : 'VILLA LINEN CONTROL SHEET';
    document.getElementById('printLocation').innerText = location || '---';
    
    const dateEl = document.getElementById('printDate');
    if (dateEl) dateEl.innerText = formattedDate;

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
}

function closeLinenPrintPreview() {
    const printModal = document.getElementById('linenPrintModal');
    if (!printModal) return;
    printModal.classList.add('hidden');
    printModal.style.display = '';
}

// ═══════════════════════════════════════════════════════════════════
// 3. BOUTON PRINT (Direct)
// ═══════════════════════════════════════════════════════════════════
function printLinenSheet() {
    document.body.classList.add('printing-linen');
    window.print();
    setTimeout(() => document.body.classList.remove('printing-linen'), 1000);
}

// ═══════════════════════════════════════════════════════════════════
// 4. BOUTON PDF (Méthode propre via nouvel onglet)
// ═══════════════════════════════════════════════════════════════════
function downloadLinenSheetPDF() {
    const printArea = document.getElementById('linenPrintArea');
    const modal = document.getElementById('linenPrintModal');
    if (!printArea || !modal) return alert('⚠️ Contenu introuvable.');

    // On ouvre un nouvel onglet vide
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        return alert("⚠️ Veuillez autoriser les pop-ups pour générer le PDF.");
    }

    // On récupère tout le code de la page (pour Tailwind et les polices)
    const headHTML = document.head.innerHTML;

    // On écrit la feuille seule dans le nouvel onglet
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
            <head>
                ${headHTML}
                <title>REMAL Linen</title>
                <style>
                    body { background: #fff !important; margin: 0; padding: 20px; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    @page { size: A4 portrait; margin: 10mm; }
                </style>
            </head>
            <body>
                ${printArea.outerHTML}
            </body>
        </html>
    `);
    printWindow.document.close();

    // On attend que le logo charge, puis on lance l'impression
    printWindow.onload = () => {
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 500);
    };
}

// ═══════════════════════════════════════════════════════════════════
// 5. HISTORIQUE
// ═══════════════════════════════════════════════════════════════════
async function loadRecentLinenSheets() {
    const container = document.getElementById('recentLinenSheets');
    if (!container || !window.supabaseClient) return;

    try {
        const { data, error } = await window.supabaseClient
            .from('linen_control_sheets')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            console.error('❌ [LINEN] Failed to load recent sheets:', error);
            container.innerHTML = `<p class="text-xs text-rose-400 text-center py-4">Unable to load recent sheets. Please refresh and try again.</p>`;
            return;
        }

        if (!data) {
            container.innerHTML = `<p class="text-xs text-rose-400 text-center py-4">Recent sheets could not be loaded. Please refresh and try again.</p>`;
            return;
        }

        if (data.length === 0) {
            container.innerHTML = `<p class="text-xs text-stone-500 text-center py-4">No sheets created yet.</p>`;
            return;
        }

        window._linenSheetsCache = {};
        data.forEach(sheet => { window._linenSheetsCache[sheet.id] = sheet; });

        container.innerHTML = data.map(sheet => {
            const pickupD = sheet.pickup_date ? new Date(sheet.pickup_date).toLocaleDateString('en-GB') : '---';
            
            return `
                <div class="flex justify-between items-center p-3 bg-[#0f0e0c] border border-[#2f2820] hover:border-[#DCA773] rounded-xl text-xs transition group">
                    <div class="flex-1 cursor-pointer" onclick="openLinenFromCache('${sheet.id}')">
                        <span class="font-bold text-[#DCA773] uppercase">${sheet.type || '---'} - ${sheet.location_number || '---'}</span>
                        <div class="text-[10px] text-stone-500 mt-1">📥 Pickup: ${pickupD}</div>
                    </div>
                    <div class="flex items-center gap-3">
                        <button onclick="deleteLinenSheet('${sheet.id}')" class="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-950/40 text-rose-400 border border-rose-900/50 hover:bg-rose-900 hover:text-rose-200 transition" title="Delete">
                            <i class="fas fa-trash-alt text-[10px]"></i>
                        </button>
                        <button onclick="openLinenFromCache('${sheet.id}')" class="w-8 h-8 flex items-center justify-center rounded-lg bg-[#181614] text-stone-400 border border-[#2f2820] hover:text-[#DCA773] transition" title="View">
                            <i class="fas fa-eye text-[11px]"></i>
                        </button>
                    </div>
                </div>`;
        }).join('');
    } catch (err) {
        console.error('❌ [LINEN] Erreur historique:', err);
    }
}

function openLinenFromCache(sheetId) {
    const sheet = window._linenSheetsCache?.[sheetId];
    if (!sheet) return;

    let items = sheet.items || {};
    if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch(e) { items = {}; }
    }
    showLinenPrintPreview(sheet.type, sheet.location_number, sheet.pickup_date, items);
}

async function deleteLinenSheet(sheetId) {
    if (!confirm('🗑️ Delete this sheet permanently?')) return;

    if (!window.supabaseClient) {
        alert('⚠️ Cannot delete the sheet: database connection is unavailable. Please try again.');
        return;
    }

    try {
        const { error } = await window.supabaseClient
            .from('linen_control_sheets')
            .delete()
            .eq('id', sheetId);

        if (error) throw error;
        await loadRecentLinenSheets();
    } catch (err) {
        console.error('Linen sheet deletion failed:', err);
        alert('⚠️ Could not delete sheet. Please try again.');
    }
}

// ═══════════════════════════════════════════════════════════════════
// 6. ENREGISTREMENT DU FORMULAIRE
// ═══════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('linenForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const type = document.getElementById('linenType')?.value || '';
        const location = (document.getElementById('linenLocation')?.value || '').trim();
        const date = document.getElementById('linenDate')?.value || '';

        if (!location || !date) return alert('Please fill all required fields.');

        const items = {};
        Object.keys(linenItemsMap).forEach(key => {
            const el = document.getElementById(`item_${key}`);
            const val = el ? (parseInt(el.value) || 0) : 0;
            if (val > 0) items[linenItemsMap[key]] = val;
        });

        if (Object.keys(items).length === 0) return alert('Please enter at least one item quantity.');

        const staffSession = JSON.parse(localStorage.getItem('remal_current_staff') || '{}');
        const staffName = staffSession.name ? `staff ( ${staffSession.name} )` : 'admin';

        if (!window.supabaseClient) {
            alert('⚠️ Cannot save the sheet: database connection is unavailable. Please try again.');
            return;
        }

        try {
            const { error } = await window.supabaseClient
                .from('linen_control_sheets')
                .insert([{ type, location_number: location, pickup_date: date, items, created_by: staffName }]);

            if (error) throw error;
        } catch (err) {
            console.error('❌ [LINEN] Save failed:', err);
            alert('⚠️ Could not save the sheet. Your data was not confirmed as saved. Please try again.');
            return;
        }

        closeLinenSheetModal();
        showLinenPrintPreview(type, location, date, items);
        loadRecentLinenSheets();
    });
});

// ESC pour fermer
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLinenPrintPreview();
});

// ═══════════════════════════════════════════════════════════════════
// EXPORTS GLOBAUX
// ═══════════════════════════════════════════════════════════════════
window.openLinenSheetModal = openLinenSheetModal;
window.closeLinenSheetModal = closeLinenSheetModal;
window.showLinenPrintPreview = showLinenPrintPreview;
window.closeLinenPrintPreview = closeLinenPrintPreview;
window.printLinenSheet = printLinenSheet;
window.downloadLinenSheetPDF = downloadLinenSheetPDF;
window.loadRecentLinenSheets = loadRecentLinenSheets;
window.openLinenFromCache = openLinenFromCache;
window.deleteLinenSheet = deleteLinenSheet;
