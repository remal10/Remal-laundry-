// ═══════════════════════════════════════════════════════════════════
// REMAL LAUNDRY OS — LINEN CONTROL MODULE (v20 FULL FIXED)
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
// 3. BOUTON PRINT
// ═══════════════════════════════════════════════════════════════════
function printLinenSheet() {
    document.body.classList.add('printing-linen');
    window.print();
    setTimeout(() => document.body.classList.remove('printing-linen'), 1000);
}

// ═══════════════════════════════════════════════════════════════════
// 4. BOUTON PDF
// ═══════════════════════════════════════════════════════════════════
async function downloadLinenSheetPDF() {
    if (typeof html2pdf === 'undefined') return alert('⚠️ html2pdf non chargé.');

    const printArea = document.getElementById('linenPrintArea');
    const modal = document.getElementById('linenPrintModal');
    if (!printArea || !modal) return alert('⚠️ Contenu introuvable.');

    const type = (document.getElementById('printTitle')?.innerText || 'linen').toLowerCase().includes('villa') ? 'Villa' : 'Hotel';
    const location = (document.getElementById('printLocation')?.innerText || 'NA').trim();
    const datePart = new Date().toISOString().split('T')[0];
    const filename = `REMAL_Linen_${type}_${location}_${datePart}.pdf`;

    const btn = document.querySelector('button[onclick="downloadLinenSheetPDF()"]');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    }

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position: fixed; left: 0; top: 0; width: 800px; height: 1200px; opacity: 0; pointer-events: none; z-index: -9999;';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow.document;
    const headHTML = document.head.innerHTML;

    iframeDoc.open();
    iframeDoc.write(`
        <!DOCTYPE html>
        <html>
            <head>
                ${headHTML}
                <style>
                    body, html { background: #ffffff !important; margin: 0 !important; padding: 0 !important; }
                    #pdf-content { width: 794px !important; padding: 40px !important; margin: 0 !important; box-sizing: border-box; }
                </style>
            </head>
            <body>
                <div id="pdf-content">
                    ${printArea.innerHTML}
                </div>
            </body>
        </html>
    `);
    iframeDoc.close();

    if (document.fonts && document.fonts.ready) {
        try { await document.fonts.ready; } catch (e) {}
    }
    await new Promise(r => setTimeout(r, 600));

    const elementToPrint = iframeDoc.getElementById('pdf-content');

    const opt = {
        margin: [10, 10, 10, 10],
        filename: filename,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            windowWidth: 794,
            scrollX: 0,
            scrollY: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        await html2pdf().set(opt).from(elementToPrint).save();
    } catch (err) {
        console.error('❌ Erreur PDF:', err);
        alert('⚠️ Impossible de générer le PDF.');
    } finally {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-file-pdf"></i> <span class="hidden sm:inline">PDF</span>';
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// 5. HISTORIQUE (L1 & L3 FIX)
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

        // 🎯 FIX L1 : Afficher une erreur claire en cas de panne
        if (error) {
            console.error('❌ [LINEN] loadRecentLinenSheets error:', error);
            container.innerHTML = `<p class="text-xs text-rose-400 text-center py-4">⚠️ Impossible de charger l'historique (${error.message})</p>`;
            return;
        }

        if (!data || data.length === 0) {
            container.innerHTML = `<p class="text-xs text-stone-500 text-center py-4">No sheets created yet.</p>`;
            return;
        }

        window._linenSheetsCache = {};
        data.forEach(sheet => { window._linenSheetsCache[sheet.id] = sheet; });

        container.innerHTML = data.map(sheet => {
            const d = sheet.pickup_date
                ? new Date(sheet.pickup_date).toLocaleDateString('en-GB')
                : '---';
            return `
                <div class="flex justify-between items-center p-3 bg-[#0f0e0c] border border-[#2f2820] hover:border-[#DCA773] rounded-xl text-xs transition group">
                    <div class="flex-1 cursor-pointer" onclick="reopenLinenSheet('${sheet.id}')">
                        <span class="font-bold text-[#DCA773] uppercase">${sheet.type || '---'} - ${sheet.location_number || '---'}</span>
                        <div class="text-[10px] text-stone-500 mt-1">📥 Pickup: ${d}</div>
                    </div>
                    <div class="flex items-center gap-3">
                        <button onclick="deleteLinenSheet('${sheet.id}')" class="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-950/40 text-rose-400 border border-rose-900/50 hover:bg-rose-900 hover:text-rose-200 transition" title="Delete">
                            <i class="fas fa-trash-alt text-[10px]"></i>
                        </button>
                        <button onclick="reopenLinenSheet('${sheet.id}')" class="w-8 h-8 flex items-center justify-center rounded-lg bg-[#181614] text-stone-400 border border-[#2f2820] hover:text-[#DCA773] transition" title="View">
                            <i class="fas fa-eye text-[11px]"></i>
                        </button>
                    </div>
                </div>`;
        }).join('');
    } catch (err) {
        console.error('❌ [LINEN] Exception loadRecentLinenSheets:', err);
        container.innerHTML = `<p class="text-xs text-rose-400 text-center py-4">⚠️ Erreur inattendue de chargement.</p>`;
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
    
    if (window.supabaseClient) {
        try {
            // 🎯 FIX L3 : On vérifie que Supabase a bien supprimé avant d'afficher succès
            const { error } = await window.supabaseClient
                .from('linen_control_sheets')
                .delete()
                .eq('id', sheetId);
                
            if (error) {
                alert('⚠️ Could not delete: ' + error.message);
                return;
            }
            
            loadRecentLinenSheets();
        } catch (err) {
            console.error('Erreur suppression:', err);
            alert('⚠️ Network error. Could not delete sheet.');
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// 6. ENREGISTREMENT (L2 FIX : Anti-double clic)
// ═══════════════════════════════════════════════════════════════════
function attachLinenFormHandler() {
    const form = document.getElementById('linenForm');
    if (!form || form.dataset.linenBound === '1') return;
    form.dataset.linenBound = '1';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        // 🎯 FIX L2 : Anti-double-clic (on désactive le bouton pendant la requête)
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Save';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        try {
            const type = document.getElementById('linenType')?.value || '';
            const location = (document.getElementById('linenLocation')?.value || '').trim();
            const date = document.getElementById('linenDate')?.value || '';

            if (!type || !location || !date) {
                alert('Please fill Location and Pickup Date.');
                return;
            }

            const items = {};
            Object.keys(linenItemsMap).forEach(key => {
                const el = document.getElementById(`item_${key}`);
                const val = el ? (parseInt(el.value) || 0) : 0;
                if (val > 0) items[linenItemsMap[key]] = val;
            });

            if (Object.keys(items).length === 0) {
                alert('Please enter at least one item quantity.');
                return;
            }

            const staffSession = JSON.parse(localStorage.getItem('remal_current_staff') || '{}');
            const staffName = staffSession.name ? `staff ( ${staffSession.name} )` : 'admin';

            if (window.supabaseClient) {
                const { data, error } = await window.supabaseClient
                    .from('linen_control_sheets')
                    .insert([{ type, location_number: location, pickup_date: date, items, created_by: staffName }])
                    .select();

                if (error) {
                    alert('⚠️ Database error: ' + error.message);
                    return;
                }
            }

            closeLinenSheetModal();
            showLinenPrintPreview(type, location, date, items);
            loadRecentLinenSheets();

        } catch (err) {
            console.error(err);
            alert('An error occurred. Please try again.');
        } finally {
            // 🎯 On réactive le bouton
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        }
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
window.attachLinenFormHandler = attachLinenFormHandler;
window.reopenLinenSheet = openLinenFromCache;

console.log('✅ [LINEN] Module chargé (v20 FULL FIXED)');
