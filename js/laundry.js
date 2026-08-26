// GESTION DU CALCUL DES TARIFS ET DES BORDEREAUX DU LINGE ET DU SPA

let currentServiceType = 'laundry';
let currentCountType = 'hotel';

const LAUNDRY_PRICES = {
    laundry: { "Shirt": 5, "Trousers": 6, "Dress": 10, "Suit": 15, "Underwear": 2, "Socks": 2 },
    dry: { "Shirt": 8, "Trousers": 10, "Dress": 18, "Suit": 25, "Coats": 20 },
    pressing: { "Shirt": 3, "Trousers": 4, "Dress": 6, "Suit": 8 }
};

function selectCountType(type) {
    currentCountType = type;
    document.getElementById('btn-count-hotel')?.classList.remove('bg-[#DCA773]', 'text-stone-950');
    document.getElementById('btn-count-quota-extra')?.classList.remove('bg-[#DCA773]', 'text-stone-950');
    document.getElementById('btn-count-guest')?.classList.remove('bg-[#DCA773]', 'text-stone-950');
    
    document.getElementById(`btn-count-${type}`)?.classList.add('bg-[#DCA773]', 'text-stone-950');
    calculateGlobalTotals();
}

function switchService(service) {
    currentServiceType = service;
    ['laundry', 'dry', 'pressing'].forEach(s => {
        const btn = document.getElementById(`tab-service-${s}`);
        if (btn) {
            btn.className = (s === service) 
                ? "flex-1 py-3 rounded-xl bg-[#DCA773] text-stone-950 shadow font-bold text-xs" 
                : "flex-1 py-3 rounded-xl bg-[#0f0e0c] text-stone-400 border border-[#2f2820] font-bold text-xs";
        }
    });
    renderGarmentItemsList();
    calculateGlobalTotals();
}

function renderGarmentItemsList() {
    const container = document.getElementById('itemsContainer');
    if (!container) return;
    
    const items = LAUNDRY_PRICES[currentServiceType] || {};
    let html = "";
    
    Object.keys(items).forEach(item => {
        const price = items[item];
        html += `
            <div class="flex justify-between items-center bg-[#181614] p-3 rounded-xl border border-[#2f2820]">
                <div>
                    <p class="text-xs font-bold text-stone-200">${item}</p>
                    <p class="text-[10px] text-stone-500">${price.toFixed(2)} AED</p>
                </div>
                <div class="flex items-center gap-2">
                    <input type="number" min="0" value="0" data-item="${item}" data-price="${price}" oninput="calculateGlobalTotals()" class="garment-qty-input w-16 remal-input rounded-lg p-1.5 text-center text-xs font-bold">
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function calculateGlobalTotals() {
    let totalPieces = 0;
    let subtotal = 0;

    document.querySelectorAll('.garment-qty-input').forEach(input => {
        const qty = parseInt(input.value) || 0;
        const price = parseFloat(input.dataset.price) || 0;
        totalPieces += qty;
        if (currentCountType !== 'hotel') {
            subtotal += qty * price;
        }
    });

    for (let i = 0; i < 3; i++) {
        const name = document.getElementById(`customName${i}`)?.value;
        const price = parseFloat(document.getElementById(`customPrice${i}`)?.value) || 0;
        const qty = parseInt(document.getElementById(`customQty${i}`)?.value) || 0;
        if (name && qty > 0) {
            totalPieces += qty;
            if (currentCountType !== 'hotel') {
                subtotal += qty * price;
            }
        }
    }

    const vat = subtotal * 0.05;
    const grandTotal = subtotal + vat;

    const elCount = document.getElementById('currentBordereauCount');
    if (elCount) elCount.innerText = `${totalPieces} pieces`;
    
    const elSub = document.getElementById('subTotal');
    if (elSub) elSub.innerText = `${subtotal.toFixed(2)} AED`;
    
    const elVat = document.getElementById('vatAmount');
    if (elVat) elVat.innerText = `${vat.toFixed(2)} AED`;
    
    const elGrand = document.getElementById('grandTotal');
    if (elGrand) elGrand.innerText = `${grandTotal.toFixed(2)} AED`;
}

function calculateSpaTotal() {
    let grandTotal = 0;
    document.querySelectorAll('.spa-qty-input').forEach(input => {
        const qty = parseInt(input.value) || 0;
        const rate = parseFloat(input.dataset.rate) || 0;
        const rowAmount = qty * rate;
        
        const rowCell = input.closest('tr')?.querySelector('.spa-row-amount');
        if (rowCell) rowCell.innerText = rowAmount.toFixed(2);
        
        grandTotal += rowAmount;
    });

    const totalEl = document.getElementById('spa-grand-total');
    if (totalEl) totalEl.innerText = `${grandTotal.toFixed(2)} AED`;
}
