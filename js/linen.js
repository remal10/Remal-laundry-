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
    // 🛡️ SÉCURITÉ : Admin uniquement
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

            if (window.supabaseClient) {
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
                    console.error(error);
                    alert("Error saving sheet: " + error.message);
                    return;
                }
            }

            closeLinenSheetModal();
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

    document.getElementById('linenPrintModal').classList.remove('hidden');
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
                <span class="bg-amber-950 text-amber-200 px-2 py-1 rounded font-bold text-[9px] uppercase">${sheet.status}</span>
            </div>
        `;
    }).join('');
}

const originalSwitch = window.switchMainSection;
window.switchMainSection = function(sectionName) {
    if (sectionName === 'linenControl') {
        setTimeout(() => {
            loadRecentLinenSheets();
        }, 100);
    }
    if (typeof originalSwitch === 'function') {
        originalSwitch.apply(this, arguments);
    }
};
