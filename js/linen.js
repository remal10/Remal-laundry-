// ═══════════════════════════════════════════════════════════════════
// REMAL LAUNDRY OS — LINEN CONTROL MODULE (v4 FINAL)
// - Handler submit attaché indépendamment de DOMContentLoaded
// - Ordre correct : ouvrir aperçu AVANT fermer saisie
// - Nettoyage inline style à la fermeture
// - Ouverture depuis l'historique (reopenLinenSheet)
// - Print isolé + Download PDF depuis l'aperçu
// - Escape + clic backdrop pour fermer
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
// PRINT — Impression isolée (contenu A4 uniquement)
// ═══════════════════════════════════════════════════════════════════
function printLinenSheet() {
    console.log('🖨️ [LINEN] printLinenSheet()');

    const printArea = document.getElementById('linenPrintArea');
    if (!printArea) {
        alert('⚠️ Contenu introuvable.');
        return;
    }

    // Fenêtre isolée pour ne pas imprimer la modale ni la nav
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
        // Popup bloquée → fallback : impression navigateur standard
        console.warn('⚠️ [LINEN] Popup bloquée, fallback window.print()');
        window.print();
        return;
    }

    const styles = `
        <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 20px; font-family: 'Helvetica', Arial, sans-serif; color: #1c1917; background: #fff; }
            .text-center { text-align: center; }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .border-b-2 { border-bottom: 2px solid #e5e7eb; }
            .border-b { border-bottom: 1px solid #d1d5db; }
            .bg-stone-100 { background: #f5f5f4; }
            .bg-stone-50 { background: #fafaf9; }
            .text-amber-700 { color: #b45309; }
            .text-stone-900 { color: #1c1917; }
            .text-stone-500 { color: #78716c; }
            .text-stone-400 { color: #a8a29e; }
            .font-serif { font-family: Georgia, 'Times New Roman', serif; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .uppercase { text-transform: uppercase; }
            .tracking-widest { letter-spacing: 0.15em; }
            .tracking-wider { letter-spacing: 0.05em; }
            .mb-6 { margin-bottom: 24px; }
            .mt-5 { margin-top: 20px; }
            .mt-12 { margin-top: 48px; }
            .pb-5 { padding-bottom: 20px; }
            .p-3 { padding: 12px; }
            .p-6 { padding: 24px; }
            .w-24 { width: 96px; }
            .w-40 { width: 160px; }
            .w-48 { width: 192px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px; }
            th, td { padding: 10px; }
            tbody tr { border-bottom: 1px solid #e5e7eb; }
            tbody tr:last-child { border-bottom: none; }
            .flex { display: flex; }
            .flex-wrap { flex-wrap: wrap; }
            .justify-between { justify-content: space-between; }
            .gap-2 { gap: 8px; }
            .gap-4 { gap: 16px; }
            .rounded-lg { border-radius: 8px; }
            .px-3 { padding-left: 12px; padding-right: 12px; }
            .py-2 { padding-top: 8px; padding-bottom: 8px; }
            .border { border: 1px solid #e5e7eb; }
            @page { size: A4 portrait; margin: 15mm; }
        </style>
    `;

    printWindow.document.open();
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="UTF-8">
                <title>Linen Control Sheet</title>
                ${styles}
            </head>
            <body>${printArea.innerHTML}</body>
        </html>
    `);
    printWindow.document.close();

    // Impression après chargement (images/logos)
    printWindow.onload = () => {
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 300);
    };

    // Filet de sécurité
    setTimeout(() => {
        try {
            printWindow.focus();
            printWindow.print();
        } catch (e) {
            console.warn('⚠️ [LINEN] Print fallback error:', e);
        }
    }, 800);
}

// ═══════════════════════════════════════════════════════════════════
// DOWNLOAD PDF — Génère un PDF A4 propre
// ═══════════════════════════════════════════════════════════════════
async function downloadLinenSheetPDF() {
    console.log('📥 [LINEN] downloadLinenSheetPDF()');

    if (typeof html2pdf === 'undefined') {
        alert('⚠️ html2pdf non chargé. Vérifie le CDN.');
        return;
    }

    const printArea = document.getElementById('linenPrintArea');
    if (!printArea) {
        alert('⚠️ Contenu introuvable.');
        return;
    }

    // Métadonnées pour le nom de fichier
    const type = (document.getElementById('printTitle')?.innerText || 'linen')
        .toLowerCase().includes('villa') ? 'Villa' : 'Hotel';
    const location = (document.getElementById('printLocation')?.innerText || 'NA').trim();
    const datePart = new Date().toISOString().split('T')[0];
    const filename = `REMAL_Linen_${type}_${location}_${datePart}.pdf`;

    // Clone du contenu dans un conteneur temporaire (rendu propre pour html2pdf)
    const exportContainer = document.createElement('div');
    exportContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 794px;
        background: #ffffff;
        z-index: 999999;
        padding: 0;
        pointer-events: none;
        opacity: 0;
    `;
    exportContainer.innerHTML = printArea.outerHTML;
    document.body.appendChild(exportContainer);

    // Attend le chargement des fonts + images
    if (document.fonts && document.fonts.ready) {
        try { await document.fonts.ready; } catch (e) {}
    }
    await new Promise(r => setTimeout(r, 600));

    const opt = {
        margin: [10, 10, 10, 10],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
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
// 🎯 Rouvrir un sheet depuis l'historique
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
// HANDLER SUBMIT — Attaché immédiatement, indépendant de DOMContentLoaded
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

        // 1) Sauvegarde Supabase — non bloquante
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

        // 4) Rafraîchir l'historique
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

console.log('✅ [LINEN] Module chargé (v4 FINAL — historique cliquable + print/PDF isolés)');
