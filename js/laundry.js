// =============================================================
// REMAL LAUNDRY OS - LOGIQUE MÉTIER & BASE DE DONNÉES COMPLÈTE
// =============================================================

// Base de données tarifaire standard (Gents, Ladies, Dry Cleaning & Pressing)
const database = {
    laundry: {
        "GENTS": [
            { name: "Shirt / Chemise", price: 15.00, ar: "قميص" },
            { name: "T-Shirt / T-Shirt", price: 12.00, ar: "تيشيرت" },
            { name: "Trousers / Pantalon", price: 18.00, ar: "بنطال" },
            { name: "Shorts / Short", price: 10.00, ar: "شورت" },
            { name: "Suit (2 pcs) / Costume", price: 35.00, ar: "بدلة" },
            { name: "Jacket / Veste", price: 22.00, ar: "سترة" },
            { name: "Underwear / Sous-vêtement", price: 6.00, ar: "ملابس داخلية" },
            { name: "Socks (Pair) / Chaussettes", price: 5.00, ar: "جوارب" },
            { name: "Pyjamas / Pyjama", price: 16.00, ar: "بيجامة" }
        ],
        "LADIES": [
            { name: "Dress / Robe", price: 25.00, ar: "فستان" },
            { name: "Blouse / Chemisier", price: 15.00, ar: "بلوزة" },
            { name: "Skirt / Jupe", price: 16.00, ar: "تنورة" },
            { name: "Trousers / Pantalon", price: 18.00, ar: "بنطال نسائي" },
            { name: "Abaya / Abaya", price: 25.00, ar: "عباءة" },
            { name: "Underwear / Sous-vêtement", price: 6.00, ar: "ملابس داخلية نسائية" },
            { name: "Nightgown / Chemise de nuit", price: 18.00, ar: "ثوب نوم" }
        ]
    },
    dry: {
        "GENTS": [
            { name: "Suit (2 pcs) / Costume Pressing", price: 45.00, ar: "بدلة غسيل جاف" },
            { name: "Jacket / Veste", price: 28.00, ar: "سترة غسيل جاف" },
            { name: "Coat / Manteau", price: 38.00, ar: "معطف" },
            { name: "Trousers / Pantalon", price: 22.00, ar: "بنطال غسيل جاف" }
        ],
        "LADIES": [
            { name: "Evening Dress / Robe de soirée", price: 55.00, ar: "فستان سهرة" },
            { name: "Silk Dress / Robe en soie", price: 40.00, ar: "فستان حرير" },
            { name: "Coat / Manteau", price: 38.00, ar: "معطف نسائي" }
        ]
    },
    pressing: {
        "GENTS": [
            { name: "Shirt / Chemise (Repassage)", price: 8.00, ar: "كوي قميص" },
            { name: "Trousers / Pantalon (Repassage)", price: 10.00, ar: "كوي بنطال" },
            { name: "Suit / Costume (Repassage)", price: 20.00, ar: "كوي بدلة" }
        ],
        "LADIES": [
            { name: "Dress / Robe (Repassage)", price: 14.00, ar: "كوي فستان" },
            { name: "Abaya / Abaya (Repassage)", price: 14.00, ar: "كوي عباءة" }
        ]
    }
};

let currentService = 'laundry';
let currentCountType = 'hotel'; 
let currentLang = 'en';
let cart = {}; 
let cachedSlips = [];
let pmsDatabase = {}; 
let currentImageData = null;
let currentLFPhotoData = null;
let selectedIdForModal = null;
let deferredPrompt = null;
let doughnutChartInstance = null;
let barChartInstance = null;
let currentArchiveFilter = 'all';
let currentStaffUser = null;

// Dictionnaire multilingue
const i18n = {
    en: {
        txtBtnNewRecord: "New Record",
        lblFormTitle: "New Record",
        lblRoomNum: "Room Number",
        lblSelectedGarments: "Total Garments:",
        lblSubTotal: "Subtotal:",
        lblGrandTotal: "Grand Total:",
        btnPhotoProof: "Take Proof Photo (Camera)",
        btnSaveRecord: "💾 Save Record",
        lblArchiveTitle: "Archives & Search",
        lblRoomError: "Invalid room number! Allowed ranges: 103-144, 201-246, 301-348, 401-448, 501-520, 601-608.",
        lblActiveRoomsHeader: "Active Rooms & SPA",
        pdfHotelName: "REMAL HOTEL & VILLAS",
        pdfHotelSub: "Al Ruwais City, Abu Dhabi – UAE",
        pdfLaundryService: "LAUNDRY SERVICE",
        pdfSpaSheet: "V ELEMENT SPA LAUNDRY SHEET",
        pdfRoom: "Room:",
        pdfSheetSerial: "Sheet Serial:",
        pdfDate: "Date:",
        pdfHotelCountFree: "Hotel Count (Free)",
        pdfHotelExtra: "Hotel & Extra",
        pdfGuestCount: "Guest Count (Full)",
        pdfSpaRecord: "SPA Record",
        pdfGuest: "Guest Name:",
        pdfRoomTyp: "Room Typ:",
        pdfAgency: "Agency:",
        pdfQuota: "Laundry Quota:",
        pdfAgent: "Agent:",
        pdfPackaging: "Packaging:",
        pdfItem: "Item",
        pdfQty: "Qty",
        pdfTotal: "Total",
        pdfTotalPieces: "Total Pieces:",
        pdfGrandTotalText: "Grand Total:",
        pdfNotes: "Garment Notes / Defects:",
        pdfProofPhoto: "Proof Photo:"
    },
    ar: {
        txtBtnNewRecord: "سجل جديد",
        lblFormTitle: "إضافة طلب غسيل",
        lblRoomNum: "رقم الغرفة",
        lblSelectedGarments: "إجمالي القطع:",
        lblSubTotal: "المجموع الفرعي:",
        lblGrandTotal: "المجموع الكلي:",
        btnPhotoProof: "التقاط صورة إثبات",
        btnSaveRecord: "💾 حفظ الطلب",
        lblArchiveTitle: "الأرشيف والبحث",
        lblRoomError: "رقم الغرفة غير صحيح! النطاقات المسموحة: 103-144, 201-246, 301-348, 401-448, 501-520, 601-608.",
        lblActiveRoomsHeader: "الغرف النشطة والسبا",
        pdfHotelName: "فندق وفيلا ريمال",
        pdfHotelSub: "مدينة الرويس، أبوظبي – الإمارات",
        pdfLaundryService: "خدمة المغسلة",
        pdfSpaSheet: "كشف مغسلة السبا",
        pdfRoom: "الغرفة:",
        pdfSheetSerial: "رقم الكشف:",
        pdfDate: "التاريخ:",
        pdfHotelCountFree: "حساب الفندق (مجاني)",
        pdfHotelExtra: "حساب الفندق + إضافي",
        pdfGuestCount: "حساب الضيف (كامل)",
        pdfSpaRecord: "سجل السبا",
        pdfGuest: "اسم الضيف:",
        pdfRoomTyp: "نوع الغرفة:",
        pdfAgency: "الوكالة:",
        pdfQuota: "حصوة المغسلة:",
        pdfAgent: "الموظف:",
        pdfPackaging: "التغليف:",
        pdfItem: "الصنف",
        pdfQty: "الكمية",
        pdfTotal: "الإجمالي",
        pdfTotalPieces: "إجمالي القطع:",
        pdfGrandTotalText: "المجموع الكلي:",
        pdfNotes: "ملاحظات / عيوب الملابس:",
        pdfProofPhoto: "صورة الإثبات:"
    },
    hi: {
        txtBtnNewRecord: "नया रिकॉर्ड",
        lblFormTitle: "नया रिकॉर्ड",
        lblRoomNum: "कमरा संख्या",
        lblSelectedGarments: "कुल कपड़े:",
        lblSubTotal: "उप-कुल:",
        lblGrandTotal: "कुल योग:",
        btnPhotoProof: "प्रमाण फोटो लें",
        btnSaveRecord: "💾 रिकॉर्ड सुरक्षित करें",
        lblArchiveTitle: "संग्रह और खोज",
        lblRoomError: "अमान्य कमरा संख्या! अनुमति प्राप्त सीमाएं: 103-144, 201-246, 301-348, 401-448, 501-520, 601-608.",
        lblActiveRoomsHeader: "सक्रिय कमरे और स्पा",
        pdfHotelName: "रेमल होटल एंड विला",
        pdfHotelSub: "अल रुवैस शहर, अबू धाबी - यूएई",
        pdfLaundryService: "लॉन्ड्री सेवा",
        pdfSpaSheet: "स्पा लॉन्د्री शीट",
        pdfRoom: "कमरा:",
        pdfSheetSerial: "शीट क्रमांक:",
        pdfDate: "दिनांक:",
        pdfHotelCountFree: "होटल गिनती (निःशुल्क)",
        pdfHotelExtra: "होटल और अतिरिक्त",
        pdfGuestCount: "अतिथि गिनती (पूर्ण)",
        pdfSpaRecord: "स्पा रिकॉर्ड",
        pdfGuest: "अतिथि नाम:",
        pdfRoomTyp: "कमरा प्रकार:",
        pdfAgency: "एजेंसी:",
        pdfQuota: "लॉन्ड्री कोटा:",
        pdfAgent: "एजेंट:",
        pdfPackaging: "पैकेजिंग:",
        pdfItem: "सामग्री",
        pdfQty: "मात्रा",
        pdfTotal: "कुल",
        pdfTotalPieces: "कुल टुकड़े:",
        pdfGrandTotalText: "कुल योग:",
        pdfNotes: "कपड़ों के नोट्स / दोष:",
        pdfProofPhoto: "प्रमाण फोटो:"
    }
};

// Initialisation globale
document.addEventListener('DOMContentLoaded', () => {
    chargerPmsLocalStorage();
    chargerDonneesLocalStorage();
    renderArticlesUI();
    setupEventListeners();
    updateRoomInfoUI();
});

// Validation du numéro de chambre
function isRoomNumberValid(roomNum) {
    const num = parseInt(roomNum, 10);
    if (isNaN(num)) return false;

    return (num >= 103 && num <= 144) ||
           (num >= 201 && num <= 246) ||
           (num >= 301 && num <= 348) ||
           (num >= 401 && num <= 448) ||
           (num >= 501 && num <= 520) ||
           (num >= 601 && num <= 608);
}

// Rendu des articles dynamiques selon le service sélectionné
function renderArticlesUI() {
    const container = document.getElementById('garmentsContainer');
    if (!container) return;

    container.innerHTML = '';
    const currentData = database[currentService] || {};

    Object.keys(currentData).forEach(category => {
        const catHeader = document.createElement('h4');
        catHeader.className = 'font-bold text-amber-800 text-sm uppercase tracking-wider mt-4 mb-2 border-b border-amber-200 pb-1';
        catHeader.innerText = category;
        container.appendChild(catHeader);

        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-1 sm:grid-cols-2 gap-2';

        currentData[category].forEach(item => {
            const key = `${currentService}_${item.name}`;
            const qty = cart[key]?.qty || 0;

            const card = document.createElement('div');
            card.className = 'flex items-center justify-between p-2.5 bg-stone-50 rounded-lg border border-stone-200 shadow-sm hover:border-amber-400 transition';
            card.innerHTML = `
                <div>
                    <div class="font-semibold text-stone-800 text-sm">${item.name}</div>
                    <div class="text-xs text-stone-500">${item.ar} - <span class="text-amber-700 font-medium">${item.price.toFixed(2)} AED</span></div>
                </div>
                <div class="flex items-center space-x-2">
                    <button type="button" onclick="updateItemQty('${key}', '${item.name}', ${item.price}, -1)" class="w-8 h-8 rounded-full bg-stone-200 text-stone-700 font-bold hover:bg-stone-300 active:scale-95 transition flex items-center justify-center">-</button>
                    <span id="qty_${key}" class="w-6 text-center font-bold text-stone-800">${qty}</span>
                    <button type="button" onclick="updateItemQty('${key}', '${item.name}', ${item.price}, 1)" class="w-8 h-8 rounded-full bg-amber-600 text-white font-bold hover:bg-amber-700 active:scale-95 transition flex items-center justify-center">+</button>
                </div>
            `;
            grid.appendChild(card);
        });

        container.appendChild(grid);
    });

    calculateGlobalTotals();
}

// Mise à jour de la quantité d'un article
function updateItemQty(key, name, price, delta) {
    if (!cart[key]) {
        cart[key] = { name: name, price: price, qty: 0, freeQty: 0 };
    }

    cart[key].qty = Math.max(0, cart[key].qty + delta);
    if (cart[key].qty === 0) {
        delete cart[key];
    }

    const qtySpan = document.getElementById(`qty_${key}`);
    if (qtySpan) {
        qtySpan.innerText = cart[key]?.qty || 0;
    }

    calculateGlobalTotals();
}

// Calcul des totaux globaux (Soustotal, TVA, Total Général)
function calculateGlobalTotals() {
    let totalPieces = 0;
    let subtotalCalc = 0;

    Object.values(cart).forEach(item => {
        const qty = parseInt(item.qty, 10) || 0;
        const price = parseFloat(item.price) || 0;
        const freeQty = parseInt(item.freeQty, 10) || 0;

        if (qty <= 0) return;
        totalPieces += qty;

        if (currentCountType === 'guest') {
            subtotalCalc += qty * price;
        } else if (currentCountType === 'quota_extra') {
            const extraQty = Math.max(0, qty - freeQty);
            subtotalCalc += extraQty * price;
        }
    });

    for (let i = 0; i < 3; i++) {
        const customName = document.getElementById(`customName${i}`)?.value.trim() || '';
        const customPrice = parseFloat(document.getElementById(`customPrice${i}`)?.value) || 0;
        const customQty = parseInt(document.getElementById(`customQty${i}`)?.value, 10) || 0;

        if (customName !== '' && customQty > 0) {
            totalPieces += customQty;
            if (currentCountType === 'guest' || currentCountType === 'quota_extra') {
                subtotalCalc += customQty * customPrice;
            }
        }
    }

    const subtotal = Number(subtotalCalc.toFixed(2));
    const vat = Number((subtotal * 0.05).toFixed(2));
    const grandTotal = Number((subtotal + vat).toFixed(2));

    const currentCountEl = document.getElementById('currentBordereauCount');
    if (currentCountEl) currentCountEl.innerText = `${totalPieces} pieces`;

    const subTotalEl = document.getElementById('subTotal');
    if (subTotalEl) subTotalEl.innerText = `${subtotal.toFixed(2)} AED`;

    const vatEl = document.getElementById('vatAmount');
    if (vatEl) vatEl.innerText = `${vat.toFixed(2)} AED`;

    const grandTotalEl = document.getElementById('grandTotal');
    if (grandTotalEl) grandTotalEl.innerText = `${grandTotal.toFixed(2)} AED`;
}

// Calcul du total pour le SPA
function calculateSpaTotal() {
    let grandTotal = 0;
    const rows = document.querySelectorAll('#spa-laundry-section tbody tr:not(.bg-stone-100)');

    rows.forEach(row => {
        const input = row.querySelector('.spa-qty-input');
        const amountCell = row.querySelector('.spa-row-amount');
        if (input && amountCell) {
            const qty = parseInt(input.value, 10) || 0;
            const rate = parseFloat(input.dataset.rate) || 0;
            const lineTotal = qty * rate;
            amountCell.innerText = lineTotal.toFixed(2);
            grandTotal += lineTotal;
        }
    });

    const totalEl = document.getElementById('spa-grand-total');
    if (totalEl) totalEl.innerText = `${grandTotal.toFixed(2)} AED`;
}

// Sauvegarde et validation du reçu SPA
async function validateAndSaveSpaReceipt() {
    const givenBy = document.getElementById('spa-given-by')?.value.trim() || '';
    const serialNo = document.getElementById('spa-serial-no')?.value.trim() || '';
    const collectedBy = document.getElementById('spa-collected-by')?.value.trim() || '';

    if (!serialNo) {
        alert("Please enter a Serial Number for the SPA receipt.");
        return false;
    }

    const itemsMap = {};
    let totalPieces = 0;
    const rows = document.querySelectorAll('#spa-laundry-section tbody tr:not(.bg-stone-100)');

    rows.forEach(row => {
        const input = row.querySelector('.spa-qty-input');
        const itemName = row.querySelector('td')?.innerText.trim();
        if (input && itemName) {
            const qty = parseInt(input.value, 10) || 0;
            const rate = parseFloat(input.dataset.rate) || 0;
            if (qty > 0) {
                totalPieces += qty;
                itemsMap[itemName] = { qty, rate, total: qty * rate };
            }
        }
    });

    if (totalPieces === 0) {
        alert("Please select at least one SPA item quantity.");
        return false;
    }

    const grandTotalVal = parseFloat(document.getElementById('spa-grand-total')?.innerText) || 0;
    const editingId = document.getElementById('editingSpaId')?.value.trim() || '';

    const payloadSupabase = {
        room_number: `SPA #${serialNo}`,
        guest_name: givenBy || 'V Element Spa',
        pms_quota: 'SPA Daily Sheet',
        extra_charged: false,
        service_type: 'SPA Laundry',
        items: itemsMap,
        total_pieces: totalPieces,
        subtotal: grandTotalVal,
        vat: 0,
        grand_total: grandTotalVal,
        special_notes: `Given By: ${givenBy || 'N/A'} | Collected By: ${collectedBy || 'N/A'}`,
        status: 'Collected',
        created_by: 'SPA Agent',
        accepted_policy: true
    };

    let assignedId = editingId;

    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        try {
            let res;
            if (editingId && editingId.length === 36) {
                res = await supabaseClient.from('guest_laundry_requests').update(payloadSupabase).eq('id', editingId).select();
            } else {
                res = await supabaseClient.from('guest_laundry_requests').insert([payloadSupabase]).select();
            }

            if (res.data && res.data.length > 0) {
                assignedId = String(res.data[0].id);
            }
        } catch (e) {
            console.error("Exception écriture Supabase SPA :", e);
        }
    }

    if (!assignedId) assignedId = `SPA-${Date.now()}`;

    const spaRecord = {
        ...payloadSupabase,
        id: assignedId,
        is_spa: true,
        spa_serial: serialNo,
        created_at: new Date().toISOString(),
        options: {
            collected_by: collectedBy,
            delivered_by: document.getElementById('spa-delivered-by')?.value.trim() || '',
            collection_date: document.getElementById('spa-collection-date')?.value || '',
            collection_time: document.getElementById('spa-collection-time')?.value || ''
        }
    };

    chargerDonneesLocalStorage();
    const idx = cachedSlips.findIndex(s => String(s.id) === String(assignedId));
    if (idx !== -1) {
        cachedSlips[idx] = spaRecord;
    } else {
        cachedSlips.unshift(spaRecord);
    }
    sauvegarderDonneesLocalStorage();

    alert(`✅ SPA Receipt #${serialNo} saved successfully!`);
    return true;
}

// Export PDF SPA
function exportSpaToPDF() {
    const serialNo = document.getElementById('spa-serial-no')?.value.trim() || '0023';
    const element = document.getElementById('spa-laundry-section');
    if (!element) return;
    
    const opt = {
        margin: 5,
        filename: `Remal_SPA_Laundry_${serialNo}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    if (typeof html2pdf !== 'undefined') {
        html2pdf().set(opt).from(element).save();
    } else {
        alert("PDF generator library not loaded.");
    }
}

// Traitement du texte/PDF PMS avec extraction des dates d'arrivée et de départ
function processTextData(rawText) {
    if (!rawText || !rawText.trim()) {
        alert("⚠️ Text area is empty.");
        return;
    }

    const lines = rawText.split('\n');
    let addedCount = 0;

    lines.forEach(line => {
        const cleanLine = line.trim();
        if (!cleanLine) return;

        const parts = cleanLine.split('\t').map(p => p.trim()).filter(Boolean);

        if (parts.length >= 2) {
            const roomNum = parts[0];
            
            if (/^\d{3}$/.test(roomNum)) {
                const guestName = parts[1] || 'Unknown Guest';
                const roomTyp = parts[2] || 'DLXR';
                const agency = parts[3] || 'Direct';
                
                // Extraire proprement les dates d'arrivée et de départ
                const arrivalDate = parts[4] || '---';
                const departureDate = parts[5] || '---';

                const isChargeable = cleanLine.toLowerCase().includes('chargeable') || cleanLine.toLowerCase().includes('guest count');
                const quotaText = isChargeable ? 'Chargeable' : 'Included';

                pmsDatabase[roomNum] = {
                    guestName: guestName,
                    roomTyp: roomTyp,
                    agency: agency,
                    arrival: arrivalDate,
                    departure: departureDate,
                    quotaText: quotaText,
                    isChargeable: isChargeable
                };

                addedCount++;
            }
        }
    });

    sauvegarderPmsLocalStorage();
    
    if (typeof renderMassPreviewTable === 'function') {
        renderMassPreviewTable();
    }

    alert(`✅ Success: ${addedCount} PMS guest records loaded into memory!`);
}

// Mise à jour de l'affichage des informations de chambre
function updateRoomInfoUI() {
    const roomInput = document.getElementById('roomNumberInput');
    const guestSpan = document.getElementById('pmsGuestName');
    const roomTypSpan = document.getElementById('pmsRoomTyp');
    const quotaSpan = document.getElementById('pmsQuota');
    const agencySpan = document.getElementById('pmsAgency');
    const errorDiv = document.getElementById('roomNumError');

    if (!roomInput) return;

    const val = roomInput.value.trim();
    if (!val) {
        if (guestSpan) guestSpan.innerText = '---';
        if (roomTypSpan) roomTypSpan.innerText = '---';
        if (quotaSpan) quotaSpan.innerText = '---';
        if (agencySpan) agencySpan.innerText = '---';
        if (errorDiv) errorDiv.classList.add('hidden');
        return;
    }

    if (!isRoomNumberValid(val)) {
        if (errorDiv) errorDiv.classList.remove('hidden');
        return;
    } else {
        if (errorDiv) errorDiv.classList.add('hidden');
    }

    const info = pmsDatabase[val];
    if (info) {
        if (guestSpan) guestSpan.innerText = info.guestName || '---';
        if (roomTypSpan) roomTypSpan.innerText = info.roomTyp || '---';
        if (quotaSpan) quotaSpan.innerText = info.quotaText || '---';
        if (agencySpan) agencySpan.innerText = info.agency || '---';
    } else {
        if (guestSpan) guestSpan.innerText = 'In-House Guest';
        if (roomTypSpan) roomTypSpan.innerText = 'Standard';
        if (quotaSpan) quotaSpan.innerText = 'Included';
        if (agencySpan) agencySpan.innerText = 'Direct';
    }
}

// Configuration des écouteurs d'événements UI
function setupEventListeners() {
    const roomInput = document.getElementById('roomNumberInput');
    if (roomInput) {
        roomInput.addEventListener('input', updateRoomInfoUI);
    }

    const serviceBtns = document.querySelectorAll('.service-tab-btn');
    serviceBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            serviceBtns.forEach(b => b.classList.remove('bg-amber-600', 'text-white'));
            btn.classList.add('bg-amber-600', 'text-white');
            currentService = btn.dataset.service || 'laundry';
            renderArticlesUI();
        });
    });

    const countBtns = document.querySelectorAll('.count-type-btn');
    countBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            countBtns.forEach(b => b.classList.remove('active-count-type'));
            btn.classList.add('active-count-type');
            currentCountType = btn.dataset.type || 'hotel';
            calculateGlobalTotals();
        });
    });
}

// Fonctions de stockage local
function chargerDonneesLocalStorage() {
    try {
        const saved = localStorage.getItem('remal_laundry_slips');
        if (saved) {
            cachedSlips = JSON.parse(saved);
        }
    } catch (e) {
        console.error("Erreur lecture LocalStorage :", e);
        cachedSlips = [];
    }
}

function sauvegarderDonneesLocalStorage() {
    try {
        localStorage.setItem('remal_laundry_slips', JSON.stringify(cachedSlips));
    } catch (e) {
        console.error("Erreur écriture LocalStorage :", e);
    }
}

function chargerPmsLocalStorage() {
    try {
        const saved = localStorage.getItem('remal_pms_database');
        if (saved) pmsDatabase = JSON.parse(saved);
    } catch (e) {
        console.error("Erreur lecture PMS LocalStorage :", e);
    }
}

function sauvegarderPmsLocalStorage() {
    try {
        localStorage.setItem('remal_pms_database', JSON.stringify(pmsDatabase));
    } catch (e) {
        console.error("Erreur écriture PMS LocalStorage :", e);
    }
}

function obtenirReceiptId(entry) {
    if (!entry) return 'REC-000000';
    if (entry.receipt_id) return entry.receipt_id;
    
    const idStr = String(entry.id || '');
    if (idStr.length >= 6) {
        return `REC-${idStr.slice(-6).toUpperCase()}`;
    }
    return `REC-${idStr.padStart(6, '0')}`;
}
