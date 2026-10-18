// ═══════════════════════════════════════════════════════════════════
// REMAL LAUNDRY OS — LINEN CONTROL MODULE (v5 ULTIMATE FIX)
// - Handler submit robuste
// - Historique cliquable (reopenLinenSheet)
// - Print 100% fidèle (copie du <head> pour garder les styles)
// - PDF garanti non vide (via conteneur virtuel)
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
        alert("Erreur : la modale d'aperçu est absente du DOM.");
        return;
    }

    const dateObj = date ? new Date(date) : new Date();
    const formattedDate = isNaN(dateObj.getTime())
        ? '---'
        : dateObj.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

    document.getElementById('printTitle').innerText =
        type === 'hotel' ? 'HOTEL LINEN CONTROL SHEET' : 'VILLA LINEN CONTROL SHEET';
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

    console.log('🖨️ [LINEN] Modale aperçu ouverte');
}

function closeLinenPrintPreview() {
    const printModal = document.getElementById('linenPrintModal');
    if (!printModal) return;
    printModal.classList.add('hidden');
    printModal.style.display = '';
    console.log('🖨️ [LINEN] Modale aperçu fermée');
}

// ═══════════════════════════════════════════════════════════════════
// PRINT — Impression isolée et fidèle
// ═══════════════════════════════════════════════════════════════════
function printLinenSheet() {
    console.log('🖨️ [LINEN] printLinenSheet()');

    const printArea = document.getElementById('linenPrintArea');
    if (!printArea) return alert('⚠️ Contenu introuvable.');

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
        console.warn('⚠️ Popup bloquée, fallback window.print()');
        window.print();
        return;
    }

    // 🎯 COPIE DU <head> ENTIER (récupère Tailwind, FontAwesome, Google Fonts)
    const headHTML = document.head.innerHTML;
    
    printWindow.document.open();
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
            <head>
                ${headHTML}
                <title>Linen Control Sheet</title>
                <style>
                    @page { size: A4 portrait; margin: 12mm; }
                    body { background: #fff !important; color: #1c1917 !important; padding: 0; margin: 0; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .no-print { display: none !important; }
                </style>
            </head>
            <body>
                ${printArea.outerHTML}
            </body>
        </html>
    `);
    printWindow.document.close();

    printWindow.onload = () => {
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 500);
    };
}

// ═══════════════════════════════════════════════════════════════════
// DOWNLOAD PDF — Génère un PDF A4 propre (fix "page blanche")
// ═══════════════════════════════════════════════════════════════════
async function downloadLinenSheetPDF() {
    console.log('📥 [LINEN] downloadLinenSheetPDF()');

    if (typeof html2pdf === 'undefined') {
        return alert('⚠️ html2pdf non chargé. Vérifie le CDN.');
    }

    const printArea = document.getElementById('linenPrintArea');
    if (!printArea) return alert('⚠️ Contenu introuvable.');

    // Récupération des métadonnées pour le nom du fichier
    const type = (document.getElementById('printTitle')?.innerText || 'linen')
        .toLowerCase().includes('villa') ? 'Villa' : 'Hotel';
    const location = (document.getElementById('printLocation')?.innerText || 'NA').trim();
    const datePart = new Date().toISOString().split('T')[0];
    const filename = `REMAL_Linen_${type}_${location}_${datePart}.pdf`;

    // 🎯 CRÉATION D'UN CONTENEUR VIRTUEL À L'ÉCRAN
    // (html2canvas ne capture pas les éléments qui ont opacity:0 ou qui sont hors écran)
    const exportContainer = document.createElement('div');
    exportContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 800px;
        background: #ffffff;
        z-index: 999999;
        padding: 20px;
        /* On le cache visuellement sous la modale pour ne pas gêner l'utilisateur */
        pointer-events: none;
        transform: translateY(-200vh); 
    `;
    exportContainer.innerHTML = printArea.innerHTML;
    document.body.appendChild(exportContainer);

    // Attente pour que les logos/images se chargent
    if (document.fonts && document.fonts.ready) {
        try { await document.fonts.ready; } catch (e) {}
    }
    await new Promise(r => setTimeout(r, 600));

    const opt = {
        margin: [10, 10, 10, 10],
        filename: filename,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: 800,
            scrollX: 0,
            scrollY: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        await html2pdf().set(opt).from(exportContainer).save();
        console.log('✅ [LINEN] PDF généré:', filename);
    } catch (err) {
        console.error('❌ [LINEN] Erreur PDF:', err);
        alert('⚠️ Impossible de générer le PDF.\n' + err.message);
    } finally {
        if (exportContainer.parentNode) {
            exportContainer.parentNode.removeChild(exportContainer);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// HISTORIQUE — Chargement des 5 dernières fiches
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

        // Cache pour retrouver les données au clic
        window._linenSheetsCache = {};
        data.forEach(sheet => {
            window._linenSheetsCache[sheet.id] = sheet;
        });

        container.innerHTML = data.map(sheet => {
            const d = sheet.pickup_date
                ? new Date(sheet.pickup_date).toLocaleDateString('en-GB')
                : '---';
            return `
                <div onclick="reopenLinenSheet('${sheet.id}')" class="flex justify-between items-center p-3 bg-[#0f0e0c] border border-[#2f2820] hover:border-[#DCA773] rounded-xl text-xs cursor-pointer transition">
                    <div>
                        <span class="font-bold text-[#DCA773] uppercase">${sheet.type || '---'} - ${sheet.location_number || '---'}</span>
                        <div class="text-[10px] text-stone-500 mt-1">Pickup: ${d}</div>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="bg-amber-950 text-amber-200 px-2 py-1 rounded font-bold text-[9px] uppercase">${sheet.status || 'washing'}</span>
                        <i class="fas fa-eye text-stone-600"></i>
                    </div>
                </div>`;
        }).join('');
    } catch (err) {
        console.error('❌ [LINEN] Exception loadRecentLinenSheets:', err);
    }
}

// ═══════════════════════════════════════════════════════════════════
// Rouvrir un sheet depuis l'historique
// ═══════════════════════════════════════════════════════════════════
function reopenLinenSheet(sheetId) {
    console.log('👁️ [LINEN] reopenLinenSheet:', sheetId);

    const sheet = window._linenSheetsCache?.[sheetId];
    if (!sheet) {
        console.error('❌ [LINEN] Sheet introuvable dans le cache:', sheetId);
        return;
    }

    const type = sheet.type;
    const location = sheet.location_number;
    const date = sheet.pickup_date;

    let items = sheet.items || {};
    if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch(e) { items = {}; }
    }

    showLinenPrintPreview(type, location, date, items);
}

// ═══════════════════════════════════════════════════════════════════
// HANDLER SUBMIT — Attaché immédiatement
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

        if (Object.keys(items).length === 0) {
            return alert('Please enter at least one item quantity.');
        }

        const staffSession = JSON.parse(localStorage.getItem('remal_current_staff') || '{}');
        const staffName = staffSession.name ? `staff ( ${staffSession.name} )` : 'admin';

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
        }

        try {
            showLinenPrintPreview(type, location, date, items);
        } catch (err) {
            console.error('❌ [LINEN] showLinenPrintPreview:', err);
            return alert('Erreur aperçu: ' + err.message);
        }

        closeLinenSheetModal();
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
// ESCAPE KEY — Ferme l'aperçu si ouvert
// ═══════════════════════════════════════════════════════════════════
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const printModal = document.getElementById('linenPrintModal');
    if (printModal && !printModal.classList.contains('hidden')) {
        closeLinenPrintPreview();
    }
});

// ═══════════════════════════════════════════════════════════════════
// EXPORT GLOBAL
// ═══════════════════════════════════════════════════════════════════
window.openLinenSheetModal = openLinenSheetModal;
window.closeLinenSheetModal = closeLinenSheetModal;
window.showLinenPrintPreview = showLinenPrintPreview;
window.closeLinenPrintPreview = closeLinenPrintPreview;
window.printLinenSheet = printLinenSheet;
window.downloadLinenSheetPDF = downloadLinenSheetPDF;
window.loadRecentLinenSheets = loadRecentLinenSheets;
window.reopenLinenSheet = reopenLinenSheet;
window.attachLinenFormHandler = attachLinenFormHandler;

console.log('✅ [LINEN] Module chargé (v5 ULTIMATE FIX)');
