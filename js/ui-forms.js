// ═══════════════════════════════════════════════════════════════════
// REMAL LAUNDRY OS — UI FORMS
// Panier, formulaire New Record, save, room input, langue, navigation
// ⚠️ Chargé APRÈS ui-core.js
// PHASE E.3 : Long-press +5 / Clic-droit Set Qty
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// PANIER LOCAL
// ═══════════════════════════════════════════════════════════════════
function sauvegarderPanierLocal() {
    try {
        localStorage.setItem('remal_draft_cart', JSON.stringify(cart));
        localStorage.setItem('remal_draft_count_type', currentCountType);
        localStorage.setItem('remal_draft_service', currentService);
    } catch (e) {
        console.error("Erreur sauvegarde panier local:", e);
    }
}

function chargerPanierLocal() {
    try {
        const savedCart = localStorage.getItem('remal_draft_cart');
        const savedType = localStorage.getItem('remal_draft_count_type');
        const savedService = localStorage.getItem('remal_draft_service');

        if (savedCart) cart = JSON.parse(savedCart);
        if (savedType) currentCountType = savedType;
        if (savedService) currentService = savedService;
    } catch (e) {
        console.error("Erreur chargement panier local:", e);
        cart = {};
    }
}

function updateQty(key, name, price, delta) {
    if (!cart[key]) {
        cart[key] = { qty: 0, freeQty: 0, price: price, name: name };
    }
    
    cart[key].qty += delta;
    
    if (cart[key].qty <= 0) delete cart[key];

    sauvegarderPanierLocal();
    renderItems();
    if (typeof calculateGlobalTotals === 'function') calculateGlobalTotals();
}

// ✨ PHASE E.3 : Set Qty direct (modale Set Qty)
function setQtyDirect(key, name, price, newQty) {
    const qty = parseInt(newQty, 10);
    if (isNaN(qty) || qty < 0) return;

    if (qty === 0) {
        delete cart[key];
    } else {
        if (!cart[key]) {
            cart[key] = { qty: 0, freeQty: 0, price: price, name: name };
        }
        cart[key].qty = qty;
        // Cap freeQty si nécessaire
        if (cart[key].freeQty && cart[key].freeQty > qty) {
            cart[key].freeQty = qty;
        }
    }

    sauvegarderPanierLocal();
    renderItems();
    if (typeof calculateGlobalTotals === 'function') calculateGlobalTotals();
}

function updateFreeQty(key, delta) {
    if (cart[key]) {
        cart[key].freeQty = Math.max(0, (cart[key].freeQty || 0) + delta);
        sauvegarderPanierLocal();
        renderItems();
        if (typeof calculateGlobalTotals === 'function') calculateGlobalTotals();
    }
}

// ═══════════════════════════════════════════════════════════════════
// PHASE E.3 : MODALE "SET QTY"
// ═══════════════════════════════════════════════════════════════════
let currentSetQtyContext = null;

function ouvrirModalSetQty(key, name, price, currentQty) {
    currentSetQtyContext = { key, name, price };
    
    const modal = document.getElementById('setQtyModal');
    const nameEl = document.getElementById('setQtyItemName');
    const input = document.getElementById('setQtyInput');
    const priceEl = document.getElementById('setQtyItemPrice');
    
    if (!modal || !input) return;
    
    if (nameEl) nameEl.innerText = name;
    if (priceEl) priceEl.innerText = `${price.toFixed(2)} AED / pièce`;
    input.value = currentQty || '';
    
    modal.classList.remove('hidden');
    
    setTimeout(() => {
        input.focus();
        input.select();
    }, 100);
}

function fermerModalSetQty() {
    const modal = document.getElementById('setQtyModal');
    if (modal) modal.classList.add('hidden');
    currentSetQtyContext = null;
}

function validerModalSetQty() {
    if (!currentSetQtyContext) return;
    const input = document.getElementById('setQtyInput');
    if (!input) return;
    
    const newQty = parseInt(input.value, 10) || 0;
    setQtyDirect(currentSetQtyContext.key, currentSetQtyContext.name, currentSetQtyContext.price, newQty);
    fermerModalSetQty();
}

function incrementModalSetQty(delta) {
    const input = document.getElementById('setQtyInput');
    if (!input) return;
    const current = parseInt(input.value, 10) || 0;
    const next = Math.max(0, current + delta);
    input.value = next;
}

// Gestion clavier dans la modale Set Qty
document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('setQtyModal');
    if (!modal || modal.classList.contains('hidden')) return;
    
    if (e.key === 'Enter') {
        e.preventDefault();
        validerModalSetQty();
    } else if (e.key === 'Escape') {
        e.preventDefault();
        fermerModalSetQty();
    }
});

// ═══════════════════════════════════════════════════════════════════
// PHASE E.3 : LONG-PRESS sur bouton + (600ms → +5)
// ═══════════════════════════════════════════════════════════════════
const LONG_PRESS_DURATION = 600; // ms
let longPressTimer = null;
let longPressTriggered = false;
let longPressStartTime = 0;

function initLongPressOnPlusButtons() {
    // Délégation d'événements sur le conteneur itemsContainer
    const container = document.getElementById('itemsContainer');
    if (!container) return;

    // Annuler à chaque re-render (nouveaux boutons)
    container.querySelectorAll('.qty-plus-btn').forEach(btn => {
        // Reset si déjà attaché
        if (btn.dataset.longPressAttached === 'true') return;
        btn.dataset.longPressAttached = 'true';

        const key = btn.dataset.key;
        const name = btn.dataset.name;
        const price = parseFloat(btn.dataset.price) || 0;

        // ─── SOURIS (Desktop) ───────────────────────────────────────
        btn.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Seulement clic gauche
            startLongPress(btn, () => {
                updateQty(key, name, price, 5);
                showQuickAddToast('+5');
            });
        });

        btn.addEventListener('mouseup', () => cancelLongPress(btn));
        btn.addEventListener('mouseleave', () => cancelLongPress(btn));

        // ─── TACTILE (Mobile/Tablette) ──────────────────────────────
        btn.addEventListener('touchstart', (e) => {
            startLongPress(btn, () => {
                updateQty(key, name, price, 5);
                showQuickAddToast('+5');
                if ('vibrate' in navigator) navigator.vibrate(30);
            });
        }, { passive: true });

        btn.addEventListener('touchend', (e) => {
            cancelLongPress(btn);
        });
        btn.addEventListener('touchcancel', () => cancelLongPress(btn));
    });

    // ─── CLIC-DROIT sur l'item (wrapper) ──────────────────────────
    container.querySelectorAll('.item-row-wrapper').forEach(row => {
        if (row.dataset.rightClickAttached === 'true') return;
        row.dataset.rightClickAttached = 'true';

        row.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const key = row.dataset.key;
            const name = row.dataset.name;
            const price = parseFloat(row.dataset.price) || 0;
            const currentQty = cart[key]?.qty || 0;
            ouvrirModalSetQty(key, name, price, currentQty);
        });
    });

    // ─── DOUBLE-TAP sur l'item (accélère +1) ─────────────────────
    let lastTap = 0;
    container.querySelectorAll('.item-row-wrapper').forEach(row => {
        if (row.dataset.doubleTapAttached === 'true') return;
        row.dataset.doubleTapAttached = 'true';

        row.addEventListener('touchend', (e) => {
            // Ne pas interférer avec les boutons
            if (e.target.closest('button')) return;
            
            const now = Date.now();
            const DOUBLE_TAP_DELAY = 300;
            
            if (now - lastTap < DOUBLE_TAP_DELAY) {
                // Double-tap détecté
                const key = row.dataset.key;
                const name = row.dataset.name;
                const price = parseFloat(row.dataset.price) || 0;
                updateQty(key, name, price, 1);
                if ('vibrate' in navigator) navigator.vibrate(15);
                lastTap = 0;
            } else {
                lastTap = now;
            }
        }, { passive: true });
    });
}

function startLongPress(btn, callback) {
    longPressTriggered = false;
    longPressStartTime = Date.now();
    btn.classList.add('long-press-active');

    longPressTimer = setTimeout(() => {
        longPressTriggered = true;
        btn.classList.remove('long-press-active');
        btn.classList.add('long-press-success');
        setTimeout(() => btn.classList.remove('long-press-success'), 300);
        callback();
    }, LONG_PRESS_DURATION);
}

function cancelLongPress(btn) {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
    btn.classList.remove('long-press-active');
    longPressTriggered = false;
}

function showQuickAddToast(text) {
    let toast = document.getElementById('quickAddToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'quickAddToast';
        toast.className = 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] bg-[#DCA773] text-stone-950 font-black text-2xl px-6 py-3 rounded-2xl shadow-2xl pointer-events-none';
        document.body.appendChild(toast);
    }
    toast.innerText = text;
    toast.style.opacity = '1';
    toast.style.transform = 'translate(-50%, -50%) scale(1.1)';
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, -50%) scale(0.9)';
    }, 400);
    
    setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 700);
}

// ═══════════════════════════════════════════════════════════════════
// ROOM INPUT
// ═══════════════════════════════════════════════════════════════════
function onRoomNumberInput() {
    validateRoomNumber();
    const roomVal = document.getElementById('roomNumber').value.trim();
    const infoBox = document.getElementById('roomPmsInfoBox');
    const guestSpan = document.getElementById('pmsInfoGuest');
    const typSpan = document.getElementById('pmsInfoTyp');
    const quotaSpan = document.getElementById('pmsInfoQuota');
    const agencySpan = document.getElementById('pmsInfoAgency');
    
    const arrivalSpan = document.getElementById('pmsInfoArrival');
    const departureSpan = document.getElementById('pmsInfoDeparture');

    if (pmsDatabase[roomVal]) {
        const data = pmsDatabase[roomVal];
        if (guestSpan) guestSpan.innerText = data.guestName || 'Unknown Guest';
        if (typSpan) typSpan.innerText = data.roomTyp || 'DLXR';
        if (agencySpan) agencySpan.innerText = data.agency || 'Direct';
        
        if (arrivalSpan) arrivalSpan.innerText = data.arrival || '---';
        if (departureSpan) departureSpan.innerText = data.departure || '---';

        if (quotaSpan) {
            quotaSpan.innerHTML = data.isChargeable ? `<span class="text-rose-400 font-bold">Chargeable</span>` : `<span class="text-emerald-400 font-bold">${data.quotaText}</span>`;
        }

        if (infoBox) infoBox.classList.remove('hidden');

        if (data.isChargeable) {
            selectCountType('guest');
        } else {
            selectCountType('hotel');
        }
    } else {
        if (infoBox) infoBox.classList.add('hidden');
    }
}

function validateRoomNumber() {
    const input = document.getElementById('roomNumber');
    const errorMsg = document.getElementById('roomErrorMsg');
    const saveBtn = document.getElementById('btnSaveRecord');
    const val = input.value.trim();

    if (val === '' || isRoomNumberValid(val)) {
        input.className = "w-full remal-input rounded-2xl p-4 text-base font-bold";
        errorMsg.classList.add('hidden');
        saveBtn.disabled = false;
        saveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        return true;
    } else {
        input.className = "w-full border-2 border-rose-500 rounded-2xl p-4 text-base font-bold bg-rose-950/20 text-rose-200 outline-none";
        errorMsg.classList.remove('hidden');
        saveBtn.disabled = true;
        saveBtn.classList.add('opacity-50', 'cursor-not-allowed');
        return false;
    }
}

// ═══════════════════════════════════════════════════════════════════
// LANGUE
// ═══════════════════════════════════════════════════════════════════
function setLang(lang) {
    currentLang = lang;
    const t = i18n[lang] || i18n.en;
    document.getElementById('htmlRoot').setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.getElementById('langSelect').value = lang;

    document.getElementById('txtBtnNewRecord').innerText = t.txtBtnNewRecord;
    document.getElementById('lblFormTitle').innerText = t.lblFormTitle;
    document.getElementById('lblRoomNum').innerText = t.lblRoomNum;
    document.getElementById('lblSelectedGarments').innerText = t.lblSelectedGarments;
    document.getElementById('lblSubTotal').innerText = t.lblSubTotal;
    document.getElementById('lblGrandTotal').innerText = t.lblGrandTotal;
    document.getElementById('btnPhotoProof').innerHTML = `<span>📷</span> ${t.btnPhotoProof}`;
    document.getElementById('btnSaveRecord').innerText = t.btnSaveRecord;
    document.getElementById('lblArchiveTitle').innerText = t.lblArchiveTitle;
    document.getElementById('lblRoomError').innerText = t.lblRoomError;
    document.getElementById('lblActiveRoomsHeader').innerText = t.lblActiveRoomsHeader;

    renderItems();
}

// ═══════════════════════════════════════════════════════════════════
// NAVIGATION SECTIONS
// ═══════════════════════════════════════════════════════════════════
function switchMainSection(section) {
    if (section === 'newRecord') {
        reinitialiserFormulaire();
    }

    ['newRecord', 'massEntry', 'liveRecord', 'spa', 'lostfound', 'pdfList', 'dashboard'].forEach(sec => {
        const el = document.getElementById(`section${sec.charAt(0).toUpperCase() + sec.slice(1)}`) || document.getElementById(`${sec}-laundry-section`);
        if(el) el.classList.add('hidden');
    });

    const targetSection = section === 'spa' ? document.getElementById('spa-laundry-section') : document.getElementById(`section${section.charAt(0).toUpperCase() + section.slice(1)}`);
    if(targetSection) targetSection.classList.remove('hidden');

    const navButtons = {
        'liveRecord': 'navBtnLiveRecord',
        'spa': 'navBtnSpa',
        'lostfound': 'navBtnLostfound',
        'pdfList': 'navBtnPdfList',
        'massEntry': 'navBtnMassEntry',
        'dashboard': 'navBtnDashboard'
    };

    Object.entries(navButtons).forEach(([key, btnId]) => {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        if (key === section) {
            btn.className = "flex-shrink-0 px-5 py-3 rounded-xl transition text-xs sm:text-sm font-bold bg-[#DCA773] text-stone-950 shadow";
        } else {
            btn.className = "flex-shrink-0 px-5 py-3 rounded-xl transition text-xs sm:text-sm font-bold bg-[#181614] hover:bg-[#211e1a] text-stone-300 border border-[#2f2820]";
        }
    });

    const quickActionButtons = document.getElementById('quickActionButtons');
    if (section === 'liveRecord') {
        quickActionButtons.classList.remove('hidden');
        chargerLiveOrders();
    } else {
        quickActionButtons.classList.add('hidden');
    }

    if (section === 'pdfList') {
        afficherListeBordereauxLocal();
    } else if (section === 'dashboard') {
        renderManagementDashboard();
    } else if (section === 'lostfound') {
        renderLostFoundItems();
    }
    
    // AUTO-SCROLL : Centrer le bouton actif
    const navBtnId = navButtons[section];
    if (navBtnId) {
        setTimeout(() => centrerBoutonNavigation(navBtnId), 100);
    }
}

// ═══════════════════════════════════════════════════════════════════
// COUNT TYPE / SERVICE
// ═══════════════════════════════════════════════════════════════════
function selectCountType(type) {
    currentCountType = type;
    document.getElementById('btn-count-hotel').className = type === 'hotel' ? 'py-3 px-1 rounded-xl bg-[#DCA773] text-stone-950 shadow font-bold leading-tight' : 'py-3 px-1 rounded-xl text-stone-400 leading-tight';
    document.getElementById('btn-count-quota-extra').className = type === 'quota_extra' ? 'py-3 px-1 rounded-xl bg-[#DCA773] text-stone-950 shadow font-bold leading-tight' : 'py-3 px-1 rounded-xl text-stone-400 leading-tight';
    document.getElementById('btn-count-guest').className = type === 'guest' ? 'py-3 px-1 rounded-xl bg-[#DCA773] text-stone-950 shadow font-bold leading-tight' : 'py-3 px-1 rounded-xl text-stone-400 leading-tight';

    sauvegarderPanierLocal();
    renderItems(); 
    if (typeof calculateGlobalTotals === 'function') calculateGlobalTotals();
}

function switchService(service) {
    currentService = service;
    ['laundry', 'dry', 'pressing'].forEach(s => {
        document.getElementById(`tab-service-${s}`).className = s === service ? "flex-1 py-3 rounded-xl bg-[#DCA773] text-stone-950 shadow font-bold" : "flex-1 py-3 rounded-xl bg-[#0f0e0c] text-stone-400 border border-[#2f2820]";
    });
    sauvegarderPanierLocal();
    renderItems();
}

// ═══════════════════════════════════════════════════════════════════
// RENDER ITEMS
// PHASE E.3 : ajout data-attrs + classes pour long-press/clic-droit
// ═══════════════════════════════════════════════════════════════════
function renderItems() {
    const container = document.getElementById('itemsContainer');
    if(!container) return;
    container.innerHTML = '';
    const serviceData = database[currentService];
    for (const [catName, items] of Object.entries(serviceData)) {
        const catHeader = document.createElement('div');
        catHeader.className = 'bg-[#0f0e0c] text-[#DCA773] px-3.5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider mb-2 mt-2 border border-[#2f2820]'; 
        catHeader.innerText = catName;
        container.appendChild(catHeader);

        items.forEach(item => {
            const key = `${currentService}_${item.name}`;
            const entry = cart[key] || { qty: 0, freeQty: 0, price: item.price, name: item.name };
            const qty = entry.qty;
            const freeQty = entry.freeQty || 0;
            
            const priceDisplay = currentCountType === 'hotel' ? '0.00 AED' : `${item.price.toFixed(2)} AED`;

            let freeControlsHtml = '';
            if (currentCountType === 'quota_extra' && qty > 0) {
                freeControlsHtml = `
                    <div class="flex items-center gap-1.5 mt-1 bg-[#0f0e0c] px-2.5 py-1 rounded-lg border border-[#2f2820] text-[10px]">
                        <span class="text-stone-400 font-semibold">Free Pcs:</span>
                        <button onclick="updateFreeQty('${key}', -1)" class="w-8 h-8 bg-[#181614] text-stone-200 rounded font-bold active:scale-90 transition-transform">−</button>
                        <span class="text-emerald-400 font-bold px-1">${freeQty}</span>
                        <button onclick="updateFreeQty('${key}', 1)" class="w-8 h-8 bg-[#DCA773] text-stone-950 rounded font-bold active:scale-90 transition-transform">+</button>
                    </div>
                `;
            }

            // ✨ PHASE E.3 : item-row-wrapper avec data-* pour interactions
            const row = document.createElement('div');
            row.className = 'item-row-wrapper flex justify-between items-center py-2.5 border-b border-[#2f2820] text-xs';
            row.dataset.key = key;
            row.dataset.name = item.name;
            row.dataset.price = item.price;
            row.innerHTML = `
                <div>
                    <p class="font-bold">${currentLang === 'ar' ? item.ar : item.name}</p>
                    <p class="text-[10px] ${currentCountType === 'hotel' ? 'text-emerald-400 font-bold' : 'text-[#DCA773] font-semibold'}">${priceDisplay}</p>
                    ${freeControlsHtml}
                </div>
                <div class="flex items-center gap-3 bg-[#0f0e0c] p-1.5 rounded-xl border border-[#2f2820]">
                    <button onclick="updateQty('${key}', '${item.name}', ${item.price}, -1)" class="w-11 h-11 bg-[#181614] text-stone-200 rounded-lg font-bold shadow-sm active:scale-90 transition-transform text-lg">−</button>
                    <span class="font-bold px-2 text-base min-w-[32px] text-center">${qty}</span>
                    <button data-key="${key}" data-name="${item.name}" data-price="${item.price}" onclick="updateQty('${key}', '${item.name}', ${item.price}, 1)" class="qty-plus-btn w-11 h-11 bg-[#DCA773] text-stone-950 rounded-lg font-bold shadow-sm active:scale-90 transition-transform text-lg relative overflow-hidden">+</button>
                </div>
            `;
            container.appendChild(row);
        });
    }
    
    // ✨ PHASE E.3 : Attacher les listeners après render
    initLongPressOnPlusButtons();
}

// ═══════════════════════════════════════════════════════════════════
// PREVIEW IMAGE
// ═══════════════════════════════════════════════════════════════════
function previewImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            } else {
                if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            currentImageData = canvas.toDataURL('image/jpeg', 0.7);
            
            const previewEl = document.getElementById('imagePreview');
            previewEl.src = currentImageData;
            previewEl.classList.remove('hidden');
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
}

// ═══════════════════════════════════════════════════════════════════
// RESET FORMULAIRE
// ═══════════════════════════════════════════════════════════════════
function reinitialiserFormulaire() {
    document.getElementById('roomNumber').value = ''; 
    document.getElementById('editingRecordId').value = '';
    document.getElementById('recordOptionalNote').value = '';
    document.getElementById('roomPmsInfoBox').classList.add('hidden');
    
    const defaultFoldingRadio = document.querySelector('input[name="foldingOption"][value="F — Folding"]');
    if(defaultFoldingRadio) defaultFoldingRadio.checked = true;

    for (let i = 0; i < 3; i++) {
        if(document.getElementById(`customName${i}`)) document.getElementById(`customName${i}`).value = '';
        if(document.getElementById(`customPrice${i}`)) document.getElementById(`customPrice${i}`).value = '';
        if(document.getElementById(`customQty${i}`)) document.getElementById(`customQty${i}`).value = '';
    }

    const customDetails = document.getElementById('detailsCustomItems');
    const notesDetails = document.getElementById('detailsGarmentNotes');
    if(customDetails) customDetails.open = false;
    if(notesDetails) notesDetails.open = false;

    validateRoomNumber();
    
    cart = {}; 
    localStorage.removeItem('remal_draft_cart');

    currentImageData = null;
    document.getElementById('imagePreview').classList.add('hidden'); 
    document.getElementById('photoInput').value = '';
    
    selectCountType('hotel'); 
    renderItems(); 
    if (typeof calculateGlobalTotals === 'function') calculateGlobalTotals();
}

// ═══════════════════════════════════════════════════════════════════
// PDF UPLOAD
// ═══════════════════════════════════════════════════════════════════
async function handlePDFUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const counterContainer = document.getElementById('massRecordCounter');
    counterContainer.innerHTML = "Reading multi-page PDF file, please wait...";

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let extractedText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            let lastY = null;
            let lineText = "";
            
            textContent.items.forEach(item => {
                if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
                    extractedText += lineText + "\n";
                    lineText = "";
                }
                lineText += item.str + "\t";
                lastY = item.transform[5];
            });
            extractedText += lineText + "\n\n";
        }

        document.getElementById('pmsPasteArea').value = extractedText;
        processTextData(extractedText);

    } catch (error) {
        console.error("Error reading PDF:", error);
        alert("Error reading PDF file. Please use copy-paste instead.");
    }
}

// ═══════════════════════════════════════════════════════════════════
// SAUVEGARDER BORDEREAU
// ═══════════════════════════════════════════════════════════════════
async function sauvegarderBordereauDepuisFormulaire() {
    const roomNum = document.getElementById('roomNumber').value.trim();
    if (!roomNum || !isRoomNumberValid(roomNum)) {
        alert("Please enter a valid room number.");
        return;
    }

    restaurerSessionStaff();

    const editingId = document.getElementById('editingRecordId').value.trim();
    const cartEntries = Object.values(cart);

    let hasCustomItems = false;
    for (let i = 0; i < 3; i++) {
        const nameVal = document.getElementById(`customName${i}`)?.value.trim() || '';
        const qtyVal = parseInt(document.getElementById(`customQty${i}`)?.value) || 0;
        if (nameVal !== '' && qtyVal > 0) {
            hasCustomItems = true;
            break;
        }
    }

    if (cartEntries.length === 0 && !hasCustomItems && !currentImageData) {
        alert("Please select at least one garment or custom item before saving.");
        return;
    }

    let totalPcs = 0;
    let subtotalCalc = 0;
    const itemsArray = [];

    cartEntries.forEach(item => {
        const qty = parseInt(item.qty, 10) || 0;
        const price = parseFloat(item.price) || 0;
        const freeQty = parseInt(item.freeQty, 10) || 0;
        if (qty <= 0) return;

        totalPcs += qty;
        let extraQty = Math.max(0, qty - freeQty);
        let totalPrice = 0;

        if (currentCountType === 'guest') {
            totalPrice = qty * price;
        } else if (currentCountType === 'quota_extra') {
            totalPrice = extraQty * price;
        }

        subtotalCalc += totalPrice;

        itemsArray.push({
            name: item.name,
            category: item.category || '',
            quantity: qty,
            free_quantity: freeQty,
            extra_quantity: extraQty,
            unit_price: price,
            total_price: totalPrice
        });
    });

    for (let i = 0; i < 3; i++) {
        const customNameEl = document.getElementById(`customName${i}`);
        const customPriceEl = document.getElementById(`customPrice${i}`);
        const customQtyEl = document.getElementById(`customQty${i}`);

        if (customNameEl && customQtyEl) {
            const nameVal = customNameEl.value.trim();
            const priceVal = parseFloat(customPriceEl ? customPriceEl.value : 0) || 0;
            const qtyVal = parseInt(customQtyEl.value, 10) || 0;

            if (nameVal !== '' && qtyVal > 0) {
                totalPcs += qtyVal;
                let totalPrice = 0;

                if (currentCountType === 'guest' || currentCountType === 'quota_extra') {
                    totalPrice = qtyVal * priceVal;
                }

                subtotalCalc += totalPrice;

                itemsArray.push({
                    name: nameVal,
                    category: 'Custom Item',
                    quantity: qtyVal,
                    free_quantity: 0,
                    extra_quantity: qtyVal,
                    unit_price: priceVal,
                    total_price: totalPrice
                });
            }
        }
    }

    const foldingRadio = document.querySelector('input[name="foldingOption"]:checked');
    const serviceStyle = foldingRadio ? foldingRadio.value : 'F — Folding';
    const noteVal = document.getElementById('recordOptionalNote').value.trim();

    const pmsInfo = pmsDatabase[roomNum] || {};

    const subtotal = Number(subtotalCalc.toFixed(2));
    const vat = Number((subtotal * 0.05).toFixed(2));
    const grandTotal = Number((subtotal + vat).toFixed(2));

    chargerDonneesLocalStorage();
    let currentStatus = 'Collected';
    if (editingId) {
        const existingRecord = cachedSlips.find(s => String(s.id) === String(editingId));
        if (existingRecord && existingRecord.status) {
            currentStatus = existingRecord.status;
        }
        if (currentStatus === 'Pending') {
            currentStatus = 'Collected';
        }
    }

    const staffName = currentStaffUser?.name ? `staff ( ${currentStaffUser.name} )` : 'pending';
    console.log("🔧 [Save] currentStaffUser:", currentStaffUser);
    console.log("🔧 [Save] created_by sera:", staffName);
    console.log("🔧 [Save] status sera:", currentStatus);

    const payloadSupabase = {
        room_number: roomNum,
        guest_name: pmsInfo.guestName || 'Guest',
        pms_quota: pmsInfo.quotaText || 'Standard',
        extra_charged: currentCountType === 'quota_extra',
        service_type: serviceStyle,
        items: itemsArray,
        total_pieces: totalPcs,
        subtotal: subtotal,
        vat: vat,
        grand_total: grandTotal,
        special_notes: noteVal,
        status: currentStatus,
        created_by: staffName,
        accepted_policy: true
    };

    isLocalUpdating = true;
    let assignedId = editingId;

    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        try {
            let res;
            if (editingId && editingId.length === 36) {
                res = await supabaseClient
                    .from('guest_laundry_requests')
                    .update(payloadSupabase)
                    .eq('id', editingId)
                    .select();
            } else {
                res = await supabaseClient
                    .from('guest_laundry_requests')
                    .insert([payloadSupabase])
                    .select();
            }

            if (res.error) {
                console.error("❌ ERREUR SUPABASE :", res.error.message);
                alert("Erreur Supabase: " + res.error.message);
                isLocalUpdating = false;
                return;
            } else if (res.data && res.data.length > 0) {
                assignedId = String(res.data[0].id);
                console.log("✅ Synchronisé sur Supabase avec succès, ID:", assignedId);
            }
        } catch (e) {
            console.error("Exception écriture Supabase :", e);
            alert("Exception d'écriture : " + e.message);
            isLocalUpdating = false;
            return;
        }
    }

    if (!assignedId) assignedId = String(Date.now());

    const slipRecord = {
        ...payloadSupabase,
        id: assignedId,
        room: roomNum,
        total_clothes: totalPcs,
        total: grandTotal,
        note: noteVal,
        options: { service_style: serviceStyle },
        created_at: new Date().toISOString()
    };

    const existingIndex = cachedSlips.findIndex(s => String(s.id) === String(assignedId));
    if (existingIndex !== -1) {
        cachedSlips[existingIndex] = slipRecord;
    } else {
        cachedSlips.unshift(slipRecord);
    }
    sauvegarderDonneesLocalStorage();

    if (editingId) {
        alert(`✅ Record for Room ${roomNum} updated successfully!`);
    } else {
        alert(`✅ Record for Room ${roomNum} saved successfully!`);
    }

    reinitialiserFormulaire();
    switchMainSection('liveRecord');
    chargerLiveOrders();

    setTimeout(() => { isLocalUpdating = false; }, 3000);
}
