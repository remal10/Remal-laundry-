// ═══════════════════════════════════════════════════════════════════
// REMAL LAUNDRY OS — LINEN CONTROL MODULE (v7 FINAL)
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
// MODALE SAISIE
// ═══════════════════════════════════════════════════════════════════
function openLinenSheetModal(type) {
    if (typeof isAdmin === 'function' && !isAdmin()) {
        return alert("🚫 Access denied. Only administrators can create Linen Sheets.");
    }

    const modal = document.getElementById('linenSheetModal');
    if (!modal) return;

    document.getElementById('linenType').value = type;
    document.getElementById('linenModalTitle').innerText =
        type === 'hotel' ? 'New Hotel Linen Sheet' : 'New Villa Linen Sheet';

    document.getElementById('linenForm').reset();
    document.getElementById('linenDate').valueAsDate = new Date(); // Pickup aujourd'hui par défaut

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
// MODALE APERÇU
// ═══════════════════════════════════════════════════════════════════
function showLinenPrintPreview(type, location, pickupDate, deliveryDate, items) {
    const printModal = document.getElementById('linenPrintModal');
    if (!printModal) return;

    const formatD = (dStr) => {
        if (!dStr) return '---';
        const dObj = new Date(dStr);
        return isNaN(dObj.getTime()) ? '---' : dObj.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    document.getElementById('printTitle').innerText =
        type === 'hotel' ? 'HOTEL LINEN CONTROL SHEET' : 'VILLA LINEN CONTROL SHEET';
    
    document.getElementById('printLocation').innerText = location || '---';
    document.getElementById('printPickupDate').innerText = formatD(pickupDate);
    document.getElementById('printDeliveryDate').innerText = formatD(deliveryDate);

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
// PRINT
// ═══════════════════════════════════════════════════════════════════
function printLinenSheet() {
    const printArea = document.getElementById('linenPrintArea');
    if (!printArea) return alert('⚠️ Contenu introuvable.');

    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) return alert('⚠️ Veuillez autoriser les pop-ups.');

    const headHTML = document.head.innerHTML;

    printWindow.document.open();
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
            <head>
                ${headHTML}
                <title>Linen Control Sheet</title>
                <style>
                    body { background: #fff !important; margin: 0; padding: 20px; }
                    @page { size: A4 portrait; margin: 10mm; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
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
// DOWNLOAD PDF
// ═══════════════════════════════════════════════════════════════════
async function downloadLinenSheetPDF() {
    if (typeof html2pdf === 'undefined') return alert('⚠️ html2pdf non chargé.');

    const printArea = document.getElementById('linenPrintArea');
    if (!printArea) return alert('⚠️ Contenu introuvable.');

    const type = (document.getElementById('printTitle')?.innerText || 'linen')
        .toLowerCase().includes('villa') ? 'Villa' : 'Hotel';
    const location = (document.getElementById('printLocation')?.innerText || 'NA').trim();
    const datePart = new Date().toISOString().split('T')[0];
    const filename = `REMAL_Linen_${type}_${location}_${datePart}.pdf`;

    const modal = document.getElementById('linenPrintModal');
    if (modal) modal.style.setProperty('opacity', '0', 'important');

    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = `
        position: absolute; top: 0; left: 0;
        width: 794px; background: #ffffff;
        padding: 40px; box-sizing: border-box;
        z-index: 99999;
    `;
    
    tempContainer.innerHTML = printArea.innerHTML;
    document.body.appendChild(tempContainer);

    await new Promise(r => setTimeout(r, 600));

    const opt = {
        margin: [10, 10, 10, 10],
        filename: filename,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', windowWidth: 794, scrollX: 0, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        await html2pdf().set(opt).from(tempContainer).save();
    } catch (err) {
        console.error('❌ Erreur PDF:', err);
        alert('⚠️ Impossible de générer le PDF.');
    } finally {
        if (tempContainer.parentNode) tempContainer.parentNode.removeChild(tempContainer);
        if (modal) modal.style.opacity = ''; 
    }
}

// ═══════════════════════════════════════════════════════════════════
// HISTORIQUE (Avec Bouton Supprimer)
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

        if (error || !data) return;

        if (data.length === 0) {
            container.innerHTML = `<p class="text-xs text-stone-500 text-center py-4">No sheets created yet.</p>`;
            return;
        }

        window._linenSheetsCache = {};
        data.forEach(sheet => { window._linenSheetsCache[sheet.id] = sheet; });

        container.innerHTML = data.map(sheet => {
            const pickupD = sheet.pickup_date ? new Date(sheet.pickup_date).toLocaleDateString('en-GB') : '---';
            const deliveryD = sheet.delivery_date ? new Date(sheet.delivery_date).toLocaleDateString('en-GB') : '---';
            
            return `
                <div class="flex justify-between items-center p-3 bg-[#0f0e0c] border border-[#2f2820] hover:border-[#DCA773] rounded-xl text-xs transition group">
                    <div class="flex-1 cursor-pointer" onclick="reopenLinenSheet('${sheet.id}')">
                        <span class="font-bold text-[#DCA773] uppercase">${sheet.type || '---'} - ${sheet.location_number || '---'}</span>
                        <div class="text-[10px] text-stone-500 mt-1">
                            📥 Pickup: ${pickupD} &nbsp;|&nbsp; 📤 Delivery: ${deliveryD}
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <button onclick="deleteLinenSheet('${sheet.id}')" class="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-950/40 text-rose-400 border border-rose-900/50 hover:bg-rose-900 hover:text-rose-200 transition" title="Delete">
                            <i class="fas fa-trash-alt text-[10px]"></i>
                        </button>
                        <i class="fas fa-eye text-stone-600 group-hover:text-[#DCA773] transition cursor-pointer" onclick="reopenLinenSheet('${sheet.id}')"></i>
                    </div>
                </div>`;
        }).join('');
    } catch (err) {
        console.error('❌ [LINEN] Exception loadRecentLinenSheets:', err);
    }
}

function reopenLinenSheet(sheetId) {
    const sheet = window._linenSheetsCache?.[sheetId];
    if (!sheet) return;

    let items = sheet.items || {};
    if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch(e) { items = {}; }
    }
    showLinenPrintPreview(sheet.type, sheet.location_number, sheet.pickup_date, sheet.delivery_date, items);
}

async function deleteLinenSheet(sheetId) {
    if (!confirm('🗑️ Are you sure you want to permanently delete this sheet?')) return;
    
    if (window.supabaseClient) {
        try {
            await window.supabaseClient.from('linen_control_sheets').delete().eq('id', sheetId);
            loadRecentLinenSheets(); // Rafraîchit la liste
        } catch (err) {
            console.error('Erreur suppression:', err);
            alert('⚠️ Could not delete sheet.');
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// HANDLER SUBMIT
// ═══════════════════════════════════════════════════════════════════
function attachLinenFormHandler() {
    const form = document.getElementById('linenForm');
    if (!form || form.dataset.linenBound === '1') return;
    form.dataset.linenBound = '1';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const type = document.getElementById('linenType')?.value || '';
        const location = (document.getElementById('linenLocation')?.value || '').trim();
        const pickupDate = document.getElementById('linenDate')?.value || '';
        const deliveryDate = document.getElementById('linenDeliveryDate')?.value || '';

        if (!type || !location || !pickupDate) return alert('Please fill Location and Pickup Date.');

        const items = {};
        Object.keys(linenItemsMap).forEach(key => {
            const el = document.getElementById(`item_${key}`);
            const val = el ? (parseInt(el.value) || 0) : 0;
            if (val > 0) items[linenItemsMap[key]] = val;
        });

        if (Object.keys(items).length === 0) return alert('Please enter at least one item quantity.');

        const staffSession = JSON.parse(localStorage.getItem('remal_current_staff') || '{}');
        const staffName = staffSession.name ? `staff ( ${staffSession.name} )` : 'admin';

        if (window.supabaseClient) {
            try {
                await window.supabaseClient
                    .from('linen_control_sheets')
                    .insert([{ 
                        type, 
                        location_number: location, 
                        pickup_date: pickupDate, 
                        delivery_date: deliveryDate || null, // On ajoute la nouvelle colonne
                        items, 
                        created_by: staffName 
                    }]);
            } catch (err) { 
                console.error('Supabase error:', err); 
                alert('⚠️ Database error. Did you add the "delivery_date" column to Supabase?\n\nError: ' + err.message);
            }
        }

        showLinenPrintPreview(type, location, pickupDate, deliveryDate, items);
        closeLinenSheetModal();
        loadRecentLinenSheets();
    });
}

(function initLinenFormHandler() {
    if (!attachLinenFormHandler()) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', attachLinenFormHandler, { once: true });
        } else {
            setTimeout(attachLinenFormHandler, 100);
        }
    }
})();

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const printModal = document.getElementById('linenPrintModal');
        if (printModal && !printModal.classList.contains('hidden')) closeLinenPrintPreview();
    }
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
window.reopenLinenSheet = reopenLinenSheet;
window.deleteLinenSheet = deleteLinenSheet;
window.attachLinenFormHandler = attachLinenFormHandler;
