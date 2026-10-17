// ═══════════════════════════════════════════════════════════════════
// REMAL LAUNDRY OS — LINEN CONTROL MODULE
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

function openLinenSheetModal(type) {
    if (typeof isAdmin === 'function' && !isAdmin()) {
        return alert("🚫 Access denied. Only administrators can create Linen Sheets.");
    }

    document.getElementById('linenType').value = type;
    document.getElementById('linenModalTitle').innerText = type === 'hotel' ? 'New Hotel Linen Sheet' : 'New Villa Linen Sheet';
    
    document.getElementById('linenForm').reset();
    document.getElementById('linenDate').valueAsDate = new Date();

    document.getElementById('linenSheetModal').classList.remove('hidden');
}

function closeLinenSheetModal() {
    document.getElementById('linenSheetModal').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('linenForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("🚀 [Linen] Form submitted");
            
            const type = document.getElementById('linenType').value;
            const location = document.getElementById('linenLocation').value;
            const date = document.getElementById('linenDate').value;
            
            const items = {};
            Object.keys(linenItemsMap).forEach(key => {
                const val = parseInt(document.getElementById(`item_${key}`).value) || 0;
                if (val > 0) items[linenItemsMap[key]] = val;
            });

            if (Object.keys(items).length === 0) {
                return alert("Please enter at least one item quantity.");
            }

            const staffSession = JSON.parse(localStorage.getItem('remal_current_staff') || '{}');
            const staffName = staffSession.name ? `staff ( ${staffSession.name} )` : 'admin';

            // 1. Sauvegarde Supabase (On ne bloque pas si erreur)
            if (window.supabaseClient) {
                try {
                    const { error } = await window.supabaseClient
                        .from('linen_control_sheets')
                        .insert([{
                            type: type,
                            location_number: location,
                            pickup_date: date,
                            items: items,
                            created_by: staffName
                        }]);
                    
                    if (error) {
                        console.warn("⚠️ Supabase save warning (not blocking):", error.message);
                    } else {
                        console.log("✅ [Linen] Saved to Supabase");
                    }
                } catch (err) {
                    console.error("❌ Supabase Exception:", err);
                }
            }

            // 2. FERMER LA MODALE DE SAISIE
            closeLinenSheetModal();

            // 3. OUVRIR L'APERÇU D'IMPRESSION IMMÉDIATEMENT
            console.log("🖨️ [Linen] Opening Print Preview...");
            showLinenPrintPreview(type, location, date, items);
        });
    }
});

function showLinenPrintPreview(type, location, date, items) {
    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    
    document.getElementById('printTitle').innerText = type === 'hotel' ? 'Hotel Linen Control Sheet' : 'Villa Linen Control Sheet';
    document.getElementById('printLocation').innerText = location;
    document.getElementById('printDate').innerText = formattedDate;

    let rows = '';
    for (const [itemName, qty] of Object.entries(items)) {
        rows += `
            <tr>
                <td class="p-3 border-b border-stone-200 font-semibold text-stone-700">${itemName}</td>
                <td class="p-3 border-b border-stone-200 text-center font-bold text-lg">${qty}</td>
            </tr>
        `;
    }
    document.getElementById('printTableBody').innerHTML = rows;

    // 🎯 FORCER L'AFFICHAGE (comme pour la modale de saisie)
    const printModal = document.getElementById('linenPrintModal');
    printModal.classList.remove('hidden');
    printModal.style.setProperty('display', 'flex', 'important');
    
    loadRecentLinenSheets();
}

async function loadRecentLinenSheets() {
    const container = document.getElementById('recentLinenSheets');
    if (!container || !window.supabaseClient) return;

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

    container.innerHTML = data.map(sheet => {
        const date = new Date(sheet.pickup_date).toLocaleDateString('en-GB');
        return `
            <div class="flex justify-between items-center p-3 bg-[#0f0e0c] border border-[#2f2820] rounded-xl text-xs">
                <div>
                    <span class="font-bold text-[#DCA773] uppercase">${sheet.type} - ${sheet.location_number}</span>
                    <div class="text-[10px] text-stone-500 mt-1">Pickup: ${date}</div>
                </div>
                <span class="bg-amber-950 text-amber-200 px-2 py-1 rounded font-bold text-[9px] uppercase">${sheet.status || 'washing'}</span>
            </div>
        `;
    }).join('');
}
