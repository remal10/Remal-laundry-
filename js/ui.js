// Interactions Interface Utilisateur, Modals & Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();

    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    switchMainSection('liveRecord');
    setLang('en');
    selectCountType('hotel');
    renderItems();
    
    chargerPmsLocalStorage();
    await chargerDonneesEtAbonnementCloud();
    
    if (Object.keys(pmsDatabase).length > 0) {
        renderMassPreviewTable();
    }

    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const spaDateEl = document.getElementById('spa-current-date');
    if(spaDateEl) spaDateEl.innerText = new Date().toLocaleDateString('fr-FR', options);
    const serialEl = document.getElementById('spa-serial-no');
    if(serialEl && !serialEl.value) serialEl.value = String(23).padStart(4, '0');

    const now = new Date();
    const todayIso = now.toISOString().split('T')[0];
    const timeIso = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const colDate = document.getElementById('spa-collection-date');
    const colTime = document.getElementById('spa-collection-time');
    const delDate = document.getElementById('spa-delivery-date');
    const delTime = document.getElementById('spa-delivery-time');

    if(colDate && !colDate.value) colDate.value = todayIso;
    if(colTime && !colTime.value) colTime.value = timeIso;
    if(delDate && !delDate.value) delDate.value = todayIso;
    if(delTime && !delTime.value) delTime.value = timeIso;
});

function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((result) => {
            if (result.outcome === 'accepted') document.getElementById('pwaInstallBanner').classList.add('hidden');
            deferredPrompt = null;
        });
    }
}
function dismissPWAInstall() { document.getElementById('pwaInstallBanner').classList.add('hidden'); }

function toggleTheme() {
    const body = document.body;
    const icon = document.getElementById('themeIcon');
    
    body.classList.toggle('light-mode');
    const isLight = body.classList.contains('light-mode');
    
    if (isLight) {
        icon.className = 'fas fa-sun';
        localStorage.setItem('remal_theme', 'light');
    } else {
        icon.className = 'fas fa-moon';
        localStorage.setItem('remal_theme', 'dark');
    }
}

function initTheme() {
    const savedTheme = localStorage.getItem('remal_theme');
    const icon = document.getElementById('themeIcon');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        if (icon) icon.className = 'fas fa-sun';
    } else {
        document.body.classList.remove('light-mode');
        if (icon) icon.className = 'fas fa-moon';
    }
}

async function chargerDonneesEtAbonnementCloud() {
    chargerDonneesLocalStorage();

    if (!supabaseClient) {
        console.warn("Supabase client non initialisé. Mode 100% Local actif.");
        return;
    }

    try {
        const { data: slips, error: slipsErr } = await supabaseClient.from('laundry_slips').select('*');
        
        if (!slipsErr && slips && slips.length > 0) {
            const slipMap = new Map();
            cachedSlips.forEach(s => slipMap.set(String(s.id), s));
            slips.forEach(s => slipMap.set(String(s.id), s));
            
            cachedSlips = Array.from(slipMap.values());
            sauvegarderDonneesLocalStorage();
            chargerLiveOrders();
        } else if (slipsErr) {
            console.warn("Erreur lecture laundry_slips sur Supabase:", slipsErr.message);
        }

        const { data: guests, error: guestsErr } = await supabaseClient.from('pms_guests').select('*');
        if (!guestsErr && guests && guests.length > 0) {
            pmsDatabase = {};
            guests.forEach(g => {
                pmsDatabase[g.room] = {
                    guestName: g.guest_name || g.guestName || 'Unknown Guest',
                    roomTyp: g.room_typ || g.roomTyp || 'DLXR',
                    arrival: g.arrival || '',
                    departure: g.departure || '',
                    agency: g.agency || 'Direct',
                    quotaText: g.quota_text || g.quotaText || 'Chargeable',
                    isChargeable: g.is_chargeable !== undefined ? g.is_chargeable : true
                };
            });
            sauvegarderPmsLocalStorage();
            renderMassPreviewTable();
        }

        supabaseClient.channel('realtime_laundry')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'laundry_slips' }, async () => {
                const { data } = await supabaseClient.from('laundry_slips').select('*');
                if (data && data.length > 0) {
                    const slipMap = new Map();
                    cachedSlips.forEach(s => slipMap.set(String(s.id), s));
                    data.forEach(s => slipMap.set(String(s.id), s));
                    
                    cachedSlips = Array.from(slipMap.values());
                    sauvegarderDonneesLocalStorage();
                    chargerLiveOrders();
                    if(!document.getElementById('sectionPdfList').classList.contains('hidden')) {
                        afficherListeBordereauxLocal();
                    }
                }
            })
            .subscribe();

    } catch (e) {
        console.error("Exception lors de la synchronisation cloud:", e);
    }
}

function renderMassPreviewTable() {
    const container = document.getElementById('massPreviewContainer');
    const counterContainer = document.getElementById('massRecordCounter');
    const resultsCard = document.getElementById('massResultsCard');

    if (!container || Object.keys(pmsDatabase).length === 0) return;

    let html = ``;
    const rooms = Object.keys(pmsDatabase).sort((a, b) => parseInt(a) - parseInt(b));
    
    rooms.forEach(room => {
        const item = pmsDatabase[room];
        const hasLaundry = !item.isChargeable;
        let rowClass = hasLaundry ? "laundry-row" : "";
        
        const isMissingAgency = (!item.agency || item.agency === "---" || item.agency === "Direct" || item.agency === "N/A");
        if (isMissingAgency) {
            rowClass += " bg-yellow-950/30 text-yellow-200 border-yellow-800";
        }

        let statusHTML = item.isChargeable ? `<span class="badge-chargeable">Chargeable</span>` : `<span class="badge-green">Included (${item.quotaText})</span>`;

        html += `
            <tr class="${rowClass}">
                <td class="p-3.5"><strong>${room}</strong></td>
                <td class="p-3.5">${item.guestName}</td>
                <td class="p-3.5">${item.roomTyp}</td>
                <td class="p-3.5 font-bold ${isMissingAgency ? 'text-yellow-400' : 'text-stone-200'}">${item.agency || '---'}</td>
                <td class="p-3.5">${item.arrival || '---'}</td>
                <td class="p-3.5">${item.departure || '---'}</td>
                <td class="p-3.5">${statusHTML}</td>
            </tr>
        `;
    });

    container.innerHTML = html;
    counterContainer.innerHTML = `✅ ${rooms.length} PMS record(s) loaded from memory.`;
    resultsCard.classList.remove('hidden');
}

function onRoomNumberInput() {
    validateRoomNumber();
    const roomVal = document.getElementById('roomNumber').value.trim();
    const infoBox = document.getElementById('roomPmsInfoBox');
    const guestSpan = document.getElementById('pmsInfoGuest');
    const typSpan = document.getElementById('pmsInfoTyp');
    const quotaSpan = document.getElementById('pmsInfoQuota');
    const agencySpan = document.getElementById('pmsInfoAgency');

    if (pmsDatabase[roomVal]) {
        const data = pmsDatabase[roomVal];
        guestSpan.innerText = data.guestName || 'Unknown Guest';
        typSpan.innerText = data.roomTyp || 'DLXR';
        quotaSpan.innerHTML = data.isChargeable ? `<span class="text-rose-400 font-bold">Chargeable</span>` : `<span class="text-emerald-400 font-bold">${data.quotaText}</span>`;
        agencySpan.innerText = data.agency || 'Direct';
        infoBox.classList.remove('hidden');

        if (data.isChargeable) {
            selectCountType('guest');
        } else {
            selectCountType('hotel');
        }
    } else {
        infoBox.classList.add('hidden');
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
}

function selectCountType(type) {
    currentCountType = type;
    document.getElementById('btn-count-hotel').className = type === 'hotel' ? 'py-3 px-1 rounded-xl bg-[#DCA773] text-stone-950 shadow font-bold leading-tight' : 'py-3 px-1 rounded-xl text-stone-400 leading-tight';
    document.getElementById('btn-count-quota-extra').className = type === 'quota_extra' ? 'py-3 px-1 rounded-xl bg-[#DCA773] text-stone-950 shadow font-bold leading-tight' : 'py-3 px-1 rounded-xl text-stone-400 leading-tight';
    document.getElementById('btn-count-guest').className = type === 'guest' ? 'py-3 px-1 rounded-xl bg-[#DCA773] text-stone-950 shadow font-bold leading-tight' : 'py-3 px-1 rounded-xl text-stone-400 leading-tight';

    renderItems(); 
    calculateGlobalTotals();
}

function switchService(service) {
    currentService = service;
    ['laundry', 'dry', 'pressing'].forEach(s => {
        document.getElementById(`tab-service-${s}`).className = s === service ? "flex-1 py-3 rounded-xl bg-[#DCA773] text-stone-950 shadow font-bold" : "flex-1 py-3 rounded-xl bg-[#0f0e0c] text-stone-400 border border-[#2f2820]";
    });
    renderItems();
}

function renderItems() {
    const container = document.getElementById('itemsContainer');
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
                        <button onclick="updateFreeQty('${key}', -1)" class="w-6 h-6 bg-[#181614] text-stone-200 rounded font-bold">-</button>
                        <span class="text-emerald-400 font-bold px-1">${freeQty}</span>
                        <button onclick="updateFreeQty('${key}', 1)" class="w-6 h-6 bg-[#DCA773] text-stone-950 rounded font-bold">+</button>
                    </div>
                `;
            }

            const row = document.createElement('div');
            row.className = 'flex justify-between items-center py-2.5 border-b border-[#2f2820] text-xs';
            row.innerHTML = `
                <div>
                    <p class="font-bold">${currentLang === 'ar' ? item.ar : item.name}</p>
                    <p class="text-[10px] ${currentCountType === 'hotel' ? 'text-emerald-400 font-bold' : 'text-[#DCA773] font-semibold'}">${priceDisplay}</p>
                    ${freeControlsHtml}
                </div>
                <div class="flex items-center space-x-2 bg-[#0f0e0c] p-1.5 rounded-xl border border-[#2f2820]">
                    <button onclick="updateQty('${key}', '${item.name}', ${item.price}, -1)" class="w-7 h-7 bg-[#181614] text-stone-200 rounded-lg font-bold shadow-sm">-</button>
                    <span class="font-bold px-2 text-sm">${qty}</span>
                    <button onclick="updateQty('${key}', '${item.name}', ${item.price}, 1)" class="w-7 h-7 bg-[#DCA773] text-stone-950 rounded-lg font-bold shadow-sm">+</button>
                </div>
            `;
            container.appendChild(row);
        });
    }
}

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
    cart = {}; currentImageData = null;
    document.getElementById('imagePreview').classList.add('hidden'); document.getElementById('photoInput').value = '';
    
    selectCountType('hotel'); 
    renderItems(); 
    calculateGlobalTotals();
}

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

function chargerLiveOrders() {
    const container = document.getElementById('liveOrdersList');
    chargerDonneesLocalStorage();
    
    // Obtenir la date locale du jour (Format YYYY-MM-DD)
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    // FILTRE DE MINUIT : Conserve uniquement les bordereaux créés aujourd'hui
    const activeTodaySlips = cachedSlips.filter(entry => {
        if (!entry.created_at) return false;
        
        // Convertit la date du bordereau en heure locale pour la comparaison
        const entryDate = new Date(entry.created_at);
        const entryDateStr = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}-${String(entryDate.getDate()).padStart(2, '0')}`;
        
        // Affiche uniquement si c'est aujourd'hui OU s'il y a une alerte non traitée
        return entryDateStr === todayStr || entry.status === 'pickup_alert';
    });

    activeTodaySlips.sort((a, b) => {
        if (a.is_spa && !b.is_spa) return -1;
        if (!a.is_spa && b.is_spa) return 1;
        return (parseInt(a.room) || 0) - (parseInt(b.room) || 0);
    });

    document.getElementById('activeRoomsCountBadge').innerText = activeTodaySlips.length;

    if (activeTodaySlips.length === 0) {
        container.innerHTML = `<p class="text-xs text-stone-500 text-center py-6 col-span-full">No active room or SPA records for today.</p>`;
        updatePrintButtonCount();
        return;
    }

    container.innerHTML = '';

    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'col-span-full flex gap-3 mb-2';
    controlsDiv.innerHTML = `
        <button onclick="toggleAllSelections(true)" class="text-xs font-bold text-[#DCA773] bg-[#181614] hover:bg-[#211e1a] px-3.5 py-2 rounded-xl border border-[#2f2820] shadow transition">✅ Select All</button>
        <button onclick="toggleAllSelections(false)" class="text-xs font-bold text-stone-400 bg-[#181614] hover:bg-[#211e1a] px-3.5 py-2 rounded-xl border border-[#2f2820] shadow transition">❌ Deselect All</button>
    `;
    container.appendChild(controlsDiv);

    activeTodaySlips.forEach(entry => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'remal-card p-4 rounded-2xl flex items-center gap-3.5 hover:border-[#DCA773] transition cursor-pointer';

        let badgeText = 'Hotel Count';
        let badgeClass = 'bg-amber-950 text-amber-200 border border-amber-800';
        
        if (entry.status === 'pickup_alert') {
            badgeText = '⚡ GUEST REQ';
            badgeClass = 'bg-emerald-950 text-emerald-300 border border-emerald-600 animate-pulse';
        } else if (entry.is_spa) {
            badgeText = 'SPA Daily Sheet';
            badgeClass = 'bg-purple-950 text-purple-200 border border-purple-800';
        } else if (entry.count_type === 'quota_extra') {
            badgeText = 'Hotel & Extra';
            badgeClass = 'bg-purple-950 text-purple-200 border border-purple-800';
        } else if (entry.count_type === 'guest') {
            badgeText = 'Guest Count';
            badgeClass = 'bg-rose-950 text-rose-200 border border-rose-800';
        }

        let identifierDisplay = `Room ${entry.room}`;
        if (entry.is_spa) {
            const entryDateOnly = entry.options?.collection_date || (entry.created_at ? entry.created_at.split('T')[0] : todayStr);
            identifierDisplay = `SPA — ${entryDateOnly} (#${entry.spa_serial || '---'})`;
        }

        const subDesc = entry.is_spa ? `Given By: ${entry.guest_name || 'Staff'} · 📦 ${entry.total_clothes} pcs` : `👤 ${entry.guest_name || 'Guest'} · 📦 ${entry.total_clothes} pcs`;

        itemDiv.innerHTML = `
            <input type="checkbox" checked data-id="${entry.id}" class="room-checkbox w-5 h-5 accent-[#DCA773] cursor-pointer" onchange="updatePrintButtonCount()">
            <div class="flex-1" onclick="ouvrirModalDetails('${entry.id}')">
                <div class="flex justify-between items-start">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="font-serif-luxury font-bold ${entry.is_spa ? 'text-purple-300' : 'text-[#DCA773]'} text-base">${identifierDisplay}</span>
                            <span class="text-[9px] font-bold px-2 py-0.5 rounded-md ${badgeClass}">${badgeText}</span>
                        </div>
                        <p class="text-[10px] text-stone-400 mt-1 flex items-center gap-1">${subDesc}</p>
                    </div>
                    <div class="text-right">
                        <p class="font-serif-luxury font-bold ${entry.is_spa ? 'text-purple-300' : 'text-[#DCA773]'} text-sm">${(entry.total || 0).toFixed(2)} AED</p>
                        <p class="text-[9px] text-stone-500 font-semibold">${entry.is_spa ? `Delivered: ${entry.options?.delivered_by || 'Staff'}` : (entry.options?.service_style || 'Folding')}</p>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(itemDiv);
    });

    updatePrintButtonCount();
}

function ouvrirModalActiveRoomsList() {
    chargerDonneesLocalStorage();
    const todayStr = new Date().toISOString().split('T')[0];
    
    let activeLaundrySlips = cachedSlips.filter(entry => {
        if (entry.is_spa) return false;
        if (!entry.created_at) return false;
        return entry.created_at.split('T')[0] === todayStr || entry.status === 'pickup_alert';
    });

    activeLaundrySlips.sort((a, b) => {
        const roomA = parseInt(a.room) || 0;
        const roomB = parseInt(b.room) || 0;
        return roomA - roomB;
    });

    const tbody = document.getElementById('activeRoomsTableBody');
    tbody.innerHTML = '';

    let totalPieces = 0;

    if (activeLaundrySlips.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-stone-400 font-semibold">Aucune chambre d'hôtel active aujourd'hui.</td></tr>`;
    } else {
        activeLaundrySlips.forEach(s => {
            let quotaLabel = 'Hotel Count (Free)';
            if (s.count_type === 'quota_extra') quotaLabel = 'Hotel & Extra';
            if (s.count_type === 'guest') quotaLabel = 'Guest Count (Full)';

            const roomDisp = s.room;
            const pkgDisp = s.options?.service_style || 'F — Folding';
            const guestDisp = s.guest_name || 'Guest';
            const pcs = s.total_clothes || 0;
            totalPieces += pcs;

            const tr = document.createElement('tr');
            tr.className = "py-2 border-b border-stone-200 text-stone-800 text-xs font-semibold";
            tr.innerHTML = `
                <td class="p-2.5 font-bold text-amber-800">${roomDisp}</td>
                <td class="p-2.5">${guestDisp}</td>
                <td class="p-2.5 text-stone-600">${pkgDisp}</td>
                <td class="p-2.5 font-bold text-emerald-700">${quotaLabel}</td>
                <td class="p-2.5 text-right font-bold text-stone-900">${pcs} pcs</td>
            `;
            tbody.appendChild(tr);
        });
    }

    document.getElementById('activeRoomsTotalCount').innerText = activeLaundrySlips.length;
    document.getElementById('activeRoomsTotalPieces').innerText = `${totalPieces} pcs`;
    document.getElementById('activeRoomsPdfDate').innerText = `Date: ${new Date().toLocaleDateString('en-GB')}`;

    document.getElementById('activeRoomsListModal').classList.remove('hidden');
}

function fermerModalActiveRoomsList() {
    document.getElementById('activeRoomsListModal').classList.add('hidden');
}

async function exportActiveRoomsListToPDF() {
    const printArea = document.getElementById('activeRoomsPdfExportArea');
    const todayStr = new Date().toISOString().split('T')[0];

    const opt = {
        margin:       [8, 8, 8, 8],
        filename:     `REMAL_Active_Laundry_Rooms_${todayStr}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        await html2pdf().set(opt).from(printArea).save();
    } catch (e) {
        console.error("Erreur génération PDF Active Rooms List:", e);
        alert("⚠️ Erreur lors de l'export du PDF.");
    }
}

function toggleAllSelections(state) {
    document.querySelectorAll('.room-checkbox').forEach(cb => cb.checked = state);
    updatePrintButtonCount();
}

function updatePrintButtonCount() {
    const selectedCount = document.querySelectorAll('.room-checkbox:checked').length;
    document.getElementById('lblBatchPrintText').innerText = `🖨️ Batch Print (${selectedCount})`;
}

async function imprimerToutesLesChambresDuJour() {
    chargerDonneesLocalStorage();
    const selectedIds = Array.from(document.querySelectorAll('.room-checkbox:checked')).map(cb => String(cb.dataset.id));

    if (selectedIds.length === 0) {
        alert("⚠️ Aucune sélection pour l'impression.");
        return;
    }

    const slipsToPrint = cachedSlips.filter(s => selectedIds.includes(String(s.id)));
    slipsToPrint.sort((a, b) => (parseInt(a.room) || 0) - (parseInt(b.room) || 0));

    const batchContainer = document.getElementById('batchPrintContainer');
    batchContainer.innerHTML = '';

    slipsToPrint.forEach(entry => {
        entry.receipt_id = genererIdentifiantBordereau(entry);
        const dateFormatted = entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-GB') : '---';
        
        let badgeText = 'Hotel Count (Free)';
        if (entry.count_type === 'quota_extra') {
            badgeText = 'Hotel & Extra';
        } else if (entry.count_type === 'guest') {
            badgeText = 'Guest Count (Full)';
        }

        const isHangerFolding = (entry.options?.service_style || '').includes('H/F') || (entry.options?.service_style || '').includes('Hanger');
        const copiesToPrint = isHangerFolding ? ['LAUNDRY COPY', 'GUEST / HANGER COPY'] : ['ORIGINAL'];

        const itemsObj = entry.items || {};
        const itemsList = Array.isArray(itemsObj) ? itemsObj : Object.values(itemsObj);
        let tableRowsHtml = '';

        itemsList.forEach(item => {
            let name = item.name || 'Article';
            let qty = parseInt(item.qty || item.quantity) || 0;
            let price = parseFloat(item.price || item.unit_price) || 0;
            let freeQty = parseInt(item.freeQty || item.free_quantity) || 0;

            if (qty <= 0) return;

            if (entry.is_spa) {
                const rowTotal = qty * price;
                tableRowsHtml += `<tr style="border-bottom: 1px solid #e5e7eb; color: #111827;"><td style="padding: 8px; font-weight: 700;">${name}</td><td style="text-align: center; font-weight: 700; padding: 8px;">${qty}</td><td style="text-align: right; font-weight: 700; padding: 8px;">${rowTotal.toFixed(2)} AED</td></tr>`;
            } else {
                if (entry.count_type === 'hotel') {
                    tableRowsHtml += `<tr style="border-bottom: 1px solid #e5e7eb; color: #111827;"><td style="padding: 8px; font-weight: 700;">${name}</td><td style="text-align: center; font-weight: 700; padding: 8px;">${qty}</td><td style="text-align: right; font-weight: 700; padding: 8px; color: #047857;">0.00 AED</td></tr>`;
                } else if (entry.count_type === 'guest') {
                    const rowTotal = qty * price;
                    tableRowsHtml += `<tr style="border-bottom: 1px solid #e5e7eb; color: #111827;"><td style="padding: 8px; font-weight: 700;">${name}</td><td style="text-align: center; font-weight: 700; padding: 8px;">${qty}</td><td style="text-align: right; font-weight: 700; padding: 8px;">${rowTotal.toFixed(2)} AED</td></tr>`;
                } else if (entry.count_type === 'quota_extra') {
                    let chargeableQty = qty - freeQty;
                    if (chargeableQty < 0) chargeableQty = 0;

                    if (freeQty > 0) {
                        tableRowsHtml += `<tr style="border-bottom: 1px solid #e5e7eb; color: #047857;"><td style="padding: 8px; font-weight: 700;">${name} (Free Quota)</td><td style="text-align: center; font-weight: 700; padding: 8px;">${freeQty}</td><td style="text-align: right; font-weight: 700; padding: 8px;">0.00 AED</td></tr>`;
                    }
                    if (chargeableQty > 0) {
                        const totalLine = chargeableQty * price;
                        tableRowsHtml += `<tr style="border-bottom: 1px solid #e5e7eb; color: #111827;"><td style="padding: 8px; font-weight: 700;">${name} (Extra)</td><td style="text-align: center; font-weight: 700; padding: 8px;">${chargeableQty}</td><td style="text-align: right; font-weight: 700; padding: 8px;">${totalLine.toFixed(2)} AED</td></tr>`;
                    }
                }
            }
        });

        const noteHtml = (entry.note && entry.note.trim() !== '') ? `
            <div style="background-color: #fffbeb; border: 1px solid #fef3c7; padding: 10px; border-radius: 12px; margin-top: 10px; font-size: 11px;">
                <p style="font-weight: 700; color: #78350f; text-transform: uppercase; margin: 0 0 4px 0; font-size: 9px;">Garment Notes / Defects:</p>
                <p style="margin: 0; color: #1f2937; font-weight: 500;">${entry.note}</p>
            </div>
        ` : '';

        const photoHtml = entry.photo ? `
            <div style="border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 8px;">
                <p style="font-weight: 700; font-size: 10px; margin-bottom: 4px; color: #374151;">Proof Photo:</p>
                <img src="${entry.photo}" style="width: 100%; max-height: 160px; object-fit: cover; border-radius: 12px; border: 1px solid #d1d5db;">
            </div>
        ` : '';

        copiesToPrint.forEach((copyLabel) => {
            const card = document.createElement('div');
            card.className = "printable-card";
            card.style.cssText = `
                padding: 8mm 10mm; 
                background: #ffffff !important; 
                color: #000000 !important; 
                box-sizing: border-box;
                font-family: 'Plus Jakarta Sans', Arial, sans-serif;
            `;
            
            const copyBadgeHtml = isHangerFolding ? `
                <div style="position: absolute; top: 0; right: 0; background-color: #111827; color: #ffffff; font-size: 9px; font-weight: 800; padding: 3px 8px; border-radius: 6px; text-transform: uppercase;">
                    ${copyLabel}
                </div>
            ` : '';

            card.innerHTML = `
                <div style="text-align: center; border-bottom: 1px solid #d1d5db; padding-bottom: 10px; margin-bottom: 12px; position: relative;">
                    ${copyBadgeHtml}
                    <h2 style="font-family: 'Playfair Display', Georgia, serif; color: #09090b; margin: 0; font-size: 18px; font-weight: 700; letter-spacing: 0.05em;">REMAL HOTEL & VILLAS</h2>
                    <p style="font-size: 8px; color: #6b7280; text-transform: uppercase; margin: 2px 0;">Al Ruwais City, Abu Dhabi – UAE</p>
                    <p style="font-size: 11px; font-weight: 700; color: #b45309; margin: 4px 0 0 0; text-transform: uppercase;">${entry.is_spa ? 'V ELEMENT SPA LAUNDRY SHEET' : 'LAUNDRY SERVICE'}</p>
                    <p style="font-size: 10px; font-family: monospace; color: #6b7280; margin: 2px 0;">Receipt ID: <strong style="color: #111827;">${entry.receipt_id}</strong></p>
                </div>

                <div style="background-color: #f9fafb; padding: 10px 12px; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 10px; font-size: 11px;">
                    <div style="display: flex; justify-between; align-items: center; margin-bottom: 6px;">
                        <div>
                            <span style="color: #6b7280; font-weight: 600;">${entry.is_spa ? 'Sheet Serial:' : 'Room:'}</span>
                            <span style="font-size: 18px; font-weight: 700; color: #111827; margin-left: 4px;">${entry.is_spa ? '#' + String(entry.spa_serial || '').replace(/SPA\s*#?/gi, '') : entry.room}</span>
                        </div>
                        <div style="text-align: right;">
                            <span style="color: #6b7280; font-weight: 700;">Date: ${dateFormatted}</span><br>
                            <span style="display: inline-block; margin-top: 3px; background-color: #fef3c7; color: #92400e; font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; border: 1px solid #fde68a;">${entry.is_spa ? 'SPA Record' : badgeText}</span>
                        </div>
                    </div>

                    <div style="border-top: 1px solid #e5e7eb; padding-top: 6px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px; font-weight: 700; color: #374151;">
                        <div><span style="color: #6b7280; font-weight: 500;">Guest Name:</span> <span style="color: #111827;">${entry.guest_name || 'Unknown'}</span></div>
                        <div style="text-align: right;"><span style="color: #6b7280; font-weight: 500;">Room Typ:</span> <span style="color: #111827;">${entry.room_typ || (entry.is_spa ? 'SPA' : 'DLXR')}</span></div>
                        <div><span style="color: #6b7280; font-weight: 500;">Agency:</span> <span style="color: #111827;">${entry.agency || (entry.is_spa ? 'V Element SPA' : 'Direct')}</span></div>
                        <div style="text-align: right;"><span style="color: #6b7280; font-weight: 500;">Laundry Quota:</span> <span style="color: #e11d48;">${entry.quota || (entry.is_spa ? 'V Element SPA' : badgeText)}</span></div>
                        <div style="grid-column: span 2; border-top: 1px solid #e5e7eb; padding-top: 4px; font-size: 10px; color: #6b7280;"><span style="font-weight: 500;">Agent:</span> <span style="color: #374151;">${entry.created_by || 'Staff'}</span></div>
                    </div>
                </div>

                <div style="background-color: #f9fafb; padding: 8px 12px; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 10px; font-size: 11px; font-weight: 700; display: flex; justify-between;">
                    <span style="color: #374151;">Packaging:</span>
                    <span style="color: #b45309;">${entry.options?.service_style || 'F — Folding'}</span>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 11px;">
                    <thead>
                        <tr style="background-color: #f3f4f6; color: #111827; font-weight: 700; border-bottom: 1px solid #d1d5db;">
                            <th style="padding: 8px; text-align: left;">Item</th>
                            <th style="padding: 8px; text-align: center;">Qty</th>
                            <th style="padding: 8px; text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>${tableRowsHtml}</tbody>
                </table>

                <div style="background-color: #f9fafb; padding: 10px 12px; border-radius: 12px; border: 1px solid #e5e7eb; font-size: 11px;">
                    <div style="display: flex; justify-between; font-weight: 700; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">
                        <span>Total Pieces:</span>
                        <span>${entry.total_clothes || 0} pieces</span>
                    </div>
                    <div style="display: flex; justify-between; font-weight: 700; font-size: 14px; color: #111827; padding-top: 6px;">
                        <span>Grand Total:</span>
                        <span style="color: #b45309; font-family: 'Playfair Display', Georgia, serif;">${(entry.total || 0).toFixed(2)} AED</span>
                    </div>
                </div>

                ${noteHtml}
                ${photoHtml}
            `;
            batchContainer.appendChild(card);
        });
    });

    batchContainer.classList.remove('hidden');

    setTimeout(() => {
        window.print();
        batchContainer.classList.add('hidden');
        batchContainer.innerHTML = '';
    }, 300);
}

async function telechargerToutesLesChambresDuJour() {
    chargerDonneesLocalStorage();
    const selectedIds = Array.from(document.querySelectorAll('.room-checkbox:checked')).map(cb => String(cb.dataset.id));

    if (selectedIds.length === 0) {
        alert("⚠️ Aucun élément sélectionné.");
        return;
    }

    const slipsToDownload = cachedSlips.filter(s => selectedIds.includes(String(s.id)));
    
    for (const entry of slipsToDownload) {
        await genererPDF(entry.id);
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    alert(`✅ ${slipsToDownload.length} bordereaux téléchargés avec succès.`);
}

function switchArchiveFilter(filter) {
    currentArchiveFilter = filter;
    document.getElementById('archiveFilterAll').className = filter === 'all' ? 'flex-1 py-2.5 rounded-xl transition text-center bg-[#DCA773] text-stone-950 shadow font-bold' : 'flex-1 py-2.5 rounded-xl transition text-center hover:text-stone-200';
    document.getElementById('archiveFilterLaundry').className = filter === 'laundry' ? 'flex-1 py-2.5 rounded-xl transition text-center bg-[#DCA773] text-stone-950 shadow font-bold' : 'flex-1 py-2.5 rounded-xl transition text-center hover:text-stone-200';
    document.getElementById('archiveFilterSpa').className = filter === 'spa' ? 'flex-1 py-2.5 rounded-xl transition text-center bg-[#DCA773] text-stone-950 shadow font-bold' : 'flex-1 py-2.5 rounded-xl transition text-center hover:text-stone-200';
    
    afficherListeBordereauxLocal();
}

function afficherListeBordereauxLocal() {
    chargerDonneesLocalStorage();
    const searchVal = document.getElementById('searchRoom').value.toLowerCase().trim();
    const searchDateVal = document.getElementById('searchDate').value;

    let filtered = cachedSlips.filter(entry => {
        const matchRoom = !searchVal || 
            String(entry.room).toLowerCase().includes(searchVal) || 
            String(entry.guest_name || '').toLowerCase().includes(searchVal) ||
            String(entry.spa_serial || '').toLowerCase().includes(searchVal) ||
            (entry.is_spa && `#${entry.spa_serial}`.toLowerCase().includes(searchVal));
        
        let matchDate = true;
        if (searchDateVal) {
            const entryDate = entry.created_at ? new Date(entry.created_at).toISOString().split('T')[0] : '';
            matchDate = (entryDate === searchDateVal);
        }

        let matchCategory = true;
        if (currentArchiveFilter === 'laundry') matchCategory = !entry.is_spa;
        if (currentArchiveFilter === 'spa') matchCategory = !!entry.is_spa;

        return matchRoom && matchDate && matchCategory;
    });

    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    const container = document.getElementById('laundryList');
    if (filtered.length === 0) {
        container.innerHTML = `<p class="text-xs text-stone-500 text-center py-6">Aucun bordereau trouvé pour ces critères.</p>`;
        return;
    }

    const hotelEntries = filtered.filter(e => !e.is_spa);
    const spaEntries = filtered.filter(e => !!e.is_spa);

    let html = '';

    if ((currentArchiveFilter === 'all' || currentArchiveFilter === 'laundry') && hotelEntries.length > 0) {
        html += `
            <div class="space-y-2">
                <div class="flex justify-between items-center bg-[#181614] p-3 rounded-2xl border border-[#2f2820]">
                    <span class="text-xs font-bold text-[#DCA773] uppercase tracking-wider flex items-center gap-2">
                        🏨 Hotel Rooms Laundry
                    </span>
                    <span class="text-[10px] bg-[#0f0e0c] text-stone-300 font-bold px-2.5 py-0.5 rounded-full border border-[#2f2820]">
                        ${hotelEntries.length} record(s)
                    </span>
                </div>
                <div class="space-y-2">
        `;

        hotelEntries.forEach(entry => {
            let badgeLabel = 'Hotel Count';
            let badgeClass = 'bg-amber-950 text-amber-200 border border-amber-800';
            if(entry.count_type === 'quota_extra') {
                badgeLabel = 'Quota + Extra';
                badgeClass = 'bg-purple-950 text-purple-200 border border-purple-800';
            } else if(entry.count_type === 'guest') {
                badgeLabel = 'Chargeable';
                badgeClass = 'bg-rose-950 text-rose-200 border border-rose-800';
            }

            const dateFormatted = entry.created_at ? new Date(entry.created_at).toLocaleDateString('fr-FR', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : '---';

            html += `
                <div onclick="ouvrirModalDetails('${entry.id}')" class="p-4 bg-[#0f0e0c] rounded-2xl border border-[#2f2820] text-xs flex justify-between items-center cursor-pointer hover:border-[#DCA773] transition">
                    <div>
                        <span class="font-serif-luxury font-bold text-[#DCA773] text-sm sm:text-base">Room ${entry.room} (${entry.guest_name || 'Guest'})</span>
                        <span class="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-md ${badgeClass}">${badgeLabel}</span>
                        <div class="text-[10px] text-stone-400 mt-1">📅 ${dateFormatted} | Agent: ${entry.created_by || 'Staff'}</div>
                    </div>
                    <div class="text-right font-bold text-stone-200">
                        <small class="text-stone-400 font-normal">(${entry.total_clothes} pcs)</small> 
                        <span class="text-[#DCA773] font-serif-luxury text-base sm:text-lg ml-1.5">${(entry.total || 0).toFixed(2)} AED</span> 
                        ${entry.photo ? '📸' : ''}
                    </div>
                </div>
            `;
        });

        html += `</div></div>`;
    }

    if ((currentArchiveFilter === 'all' || currentArchiveFilter === 'spa') && spaEntries.length > 0) {
        html += `
            <div class="space-y-2 mt-4">
                <div class="flex justify-between items-center bg-[#181614] p-3 rounded-2xl border border-[#2f2820]">
                    <span class="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                        🧘 V Element SPA Laundry
                    </span>
                    <span class="text-[10px] bg-[#0f0e0c] text-purple-200 font-bold px-2.5 py-0.5 rounded-full border border-purple-900">
                        ${spaEntries.length} record(s)
                    </span>
                </div>
                <div class="space-y-2">
        `;

        spaEntries.forEach(entry => {
            const dateFormatted = entry.created_at ? new Date(entry.created_at).toLocaleDateString('fr-FR', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : '---';

            html += `
                <div onclick="ouvrirModalDetails('${entry.id}')" class="p-4 bg-[#0f0e0c] rounded-2xl border border-[#2f2820] text-xs flex justify-between items-center cursor-pointer hover:border-purple-500 transition">
                    <div>
                        <span class="font-serif-luxury font-bold text-purple-300 text-sm sm:text-base">SPA Sheet #${entry.spa_serial || '---'} — ${entry.guest_name || 'Spa Agent'}</span>
                        <span class="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-950 text-purple-200 border border-purple-800">SPA Daily Sheet</span>
                        <div class="text-[10px] text-stone-400 mt-1">📅 ${dateFormatted} | Delivered by: ${entry.options?.delivered_by || 'Staff'}</div>
                    </div>
                    <div class="text-right font-bold text-stone-200">
                        <small class="text-stone-400 font-normal">(${entry.total_clothes} pcs)</small> 
                        <span class="text-purple-300 font-serif-luxury text-base sm:text-lg ml-1.5">${(entry.total || 0).toFixed(2)} AED</span> 
                    </div>
                </div>
            `;
        });

        html += `</div></div>`;
    }

    container.innerHTML = html;
}

function previewLFImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 600;
            const MAX_HEIGHT = 600;
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
            currentLFPhotoData = canvas.toDataURL('image/jpeg', 0.7);
            const previewEl = document.getElementById('lfImagePreview');
            previewEl.src = currentLFPhotoData;
            previewEl.classList.remove('hidden');
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
}

async function saveLostFoundItem() {
    const name = document.getElementById('lfItemName').value.trim();
    const loc = document.getElementById('lfItemLoc').value.trim();
    const note = document.getElementById('lfItemNote').value.trim();

    if (!name || !loc) {
        alert("Please enter the item name and location.");
        return;
    }

    const items = JSON.parse(localStorage.getItem('remal_lost_found') || '[]');
    const newItem = {
        id: Date.now(),
        is_lost_found: true,
        name: name,
        loc: loc,
        note: note,
        photo: currentLFPhotoData || null,
        date: new Date().toLocaleString(),
        status: 'Unclaimed'
    };

    items.unshift(newItem);
    localStorage.setItem('remal_lost_found', JSON.stringify(items));

    await writeRecordToFile(newItem);

    document.getElementById('lfItemName').value = '';
    document.getElementById('lfItemLoc').value = '';
    document.getElementById('lfItemNote').value = '';
    document.getElementById('lfItemPhoto').value = '';
    document.getElementById('lfImagePreview').classList.add('hidden');
    currentLFPhotoData = null;
    document.getElementById('lfFormCard').classList.add('hidden');

    renderLostFoundItems();
    alert("✅ Lost & Found item saved successfully!");
}

function renderLostFoundItems() {
    const container = document.getElementById('lfItemsGrid');
    if (!container) return;
    const items = JSON.parse(localStorage.getItem('remal_lost_found') || '[]');

    if (items.length === 0) {
        container.innerHTML = `<p class="text-xs text-stone-500 text-center py-6 col-span-full">No lost and found items registered.</p>`;
        return;
    }

    container.innerHTML = '';
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'remal-card p-4 rounded-2xl space-y-3 relative';
        div.innerHTML = `
            ${item.photo ? `<img src="${item.photo}" class="w-full h-36 object-cover rounded-xl border border-[#2f2820]">` : ''}
            <div>
                <div class="flex justify-between items-start">
                    <h4 class="font-serif-luxury font-bold text-[#DCA773] text-base">${item.name}</h4>
                    <span class="text-[9px] ${item.status === 'Claimed' ? 'bg-emerald-950 text-emerald-200 border-emerald-800' : 'bg-amber-950 text-amber-200 border-amber-800'} border font-bold px-2 py-0.5 rounded-md">${item.status}</span>
                </div>
                <p class="text-xs text-stone-300 mt-1">📍 <strong>Location:</strong> ${item.loc}</p>
                ${item.note ? `<p class="text-xs text-stone-400 italic mt-1">"${item.note}"</p>` : ''}
                <p class="text-[10px] text-stone-500 mt-2">📅 Found: ${item.date}</p>
            </div>
            <div class="flex gap-2 pt-2 border-t border-[#2f2820]">
                <button onclick="toggleLFStatus(${item.id})" class="flex-1 py-2 bg-[#181614] hover:bg-[#211e1a] text-stone-300 font-bold rounded-xl text-[10px] border border-[#2f2820]">Toggle Status</button>
                <button onclick="deleteLFItem(${item.id})" class="py-2 px-3 bg-rose-950 hover:bg-rose-900 text-rose-200 font-bold rounded-xl text-[10px] border border-rose-800">🗑️</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function toggleLFStatus(id) {
    let items = JSON.parse(localStorage.getItem('remal_lost_found') || '[]');
    items = items.map(i => {
        if (i.id === id) {
            i.status = i.status === 'Unclaimed' ? 'Claimed' : 'Unclaimed';
        }
        return i;
    });
    localStorage.setItem('remal_lost_found', JSON.stringify(items));
    renderLostFoundItems();
}

function deleteLFItem(id) {
    if (confirm("Delete this lost item record?")) {
        let items = JSON.parse(localStorage.getItem('remal_lost_found') || '[]');
        items = items.filter(i => i.id !== id);
        localStorage.setItem('remal_lost_found', JSON.stringify(items));
        renderLostFoundItems();
    }
}

function renderManagementDashboard() {
    chargerDonneesLocalStorage();

    let totalRevenue = 0;
    let totalGarments = 0;
    let statusCounts = { Collected: 0, Washing: 0, Ready: 0, Delivered: 0 };
    let revenueByDate = {};

    cachedSlips.forEach(slip => {
        totalRevenue += (slip.total || 0);
        totalGarments += (slip.total_clothes || 0);
        
        let st = slip.status || 'Collected';
        if (statusCounts[st] !== undefined) statusCounts[st]++;

        if (slip.created_at) {
            let dStr = slip.created_at.split('T')[0];
            revenueByDate[dStr] = (revenueByDate[dStr] || 0) + (slip.total || 0);
        }
    });

    document.getElementById('kpiRevenue').innerText = `${totalRevenue.toFixed(2)} AED`;
    document.getElementById('kpiOrders').innerText = cachedSlips.length;
    document.getElementById('kpiGarments').innerText = `${totalGarments} pcs`;

    requestAnimationFrame(() => {
        const ctxDoughnut = document.getElementById('statusDoughnutChart').getContext('2d');
        if (doughnutChartInstance) doughnutChartInstance.destroy();

        doughnutChartInstance = new Chart(ctxDoughnut, {
            type: 'doughnut',
            data: {
                labels: ['Collected', 'Washing', 'Ready', 'Delivered'],
                datasets: [{
                    data: [statusCounts.Collected, statusCounts.Washing, statusCounts.Ready, statusCounts.Delivered],
                    backgroundColor: ['#57534e', '#3b82f6', '#a855f7', '#10b981'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, color: '#d6d3d1' } } }
            }
        });

        const dates = Object.keys(revenueByDate).sort();
        const revenues = dates.map(d => revenueByDate[d]);

        const ctxBar = document.getElementById('revenueBarChart').getContext('2d');
        if (barChartInstance) barChartInstance.destroy();

        barChartInstance = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: dates.length > 0 ? dates : ['No Data'],
                datasets: [{
                    label: 'Revenue (AED)',
                    data: revenues.length > 0 ? revenues : [0],
                    backgroundColor: '#DCA773',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { ticks: { font: { size: 11 }, color: '#d6d3d1' } },
                    x: { ticks: { font: { size: 11 }, color: '#d6d3d1' } }
                }
            }
        });
    });
}

async function exportSpaToPDF() {
    const isValid = await validateAndSaveSpaReceipt();
    if (!isValid) return;

    const serialNo = document.getElementById('spa-serial-no').value.trim();
    const colDate = document.getElementById('spa-collection-date').value || new Date().toISOString().split('T')[0];
    const spaArea = document.getElementById('spa-laundry-section');

    const isHidden = spaArea.classList.contains('hidden');
    if (isHidden) spaArea.classList.remove('hidden');

    const actionButtons = document.getElementById('spa-action-buttons');
    if (actionButtons) actionButtons.style.display = 'none';

    const opt = {
        margin:       [10, 10, 10, 10],
        filename:     `REMAL_${colDate}_SPA-${serialNo}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
            scale: 2, 
            useCORS: true, 
            logging: false, 
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
        await html2pdf().set(opt).from(spaArea).save();
    } catch (e) {
        console.error("Erreur PDF SPA:", e);
        alert("⚠️ Erreur lors de la génération du PDF du SPA.");
    } finally {
        if (actionButtons) actionButtons.style.display = '';
        if (isHidden) spaArea.classList.add('hidden');
    }
}

function ouvrirModalDetails(id) {
    // 🛡️ STOP CLIGNOTEMENT AU CLIC (Intégré sans casser l'existant)
    const clickedCheckbox = document.querySelector(`.room-checkbox[data-id="${id}"]`);
    if (clickedCheckbox) {
        const card = clickedCheckbox.closest('.remal-card');
        if (card) {
            card.classList.remove('animate-pulse', 'ring-2', 'ring-amber-500', 'bg-amber-950/30');
        }
    }

    selectedIdForModal = String(id);
    chargerDonneesLocalStorage();
    const entry = cachedSlips.find(e => String(e.id) === String(id));
    if (!entry) return;

    entry.receipt_id = genererIdentifiantBordereau(entry);
    const t = i18n[currentLang] || i18n.en;

    document.getElementById('modalPdfHotelName').innerText = t.pdfHotelName;
    document.getElementById('modalPdfHotelSub').innerText = t.pdfHotelSub;
    document.getElementById('modalPdfLaundryService').innerText = entry.is_spa ? t.pdfSpaSheet : t.pdfLaundryService;
    document.getElementById('modalReceiptIdDisplay').innerText = entry.receipt_id;
    document.getElementById('modalThItem').innerText = t.pdfItem;
    document.getElementById('modalThQty').innerText = t.pdfQty;
    document.getElementById('modalThTotal').innerText = t.pdfTotal;
    document.getElementById('modalLblTotalPieces').innerText = t.pdfTotalPieces;
    document.getElementById('modalLblGrandTotal').innerText = t.pdfGrandTotalText;
    document.getElementById('modalLblGarmentNotes').innerText = t.pdfNotes;
    document.getElementById('modalLblGuestName').innerText = t.pdfGuest;
    document.getElementById('modalLblRoomTyp').innerText = t.pdfRoomTyp;
    document.getElementById('modalLblAgency').innerText = t.pdfAgency;
    document.getElementById('modalLblQuota').innerText = t.pdfQuota;
    document.getElementById('modalLblAgent').innerText = t.pdfAgent;
    document.getElementById('modalLblPackaging').innerText = t.pdfPackaging;

    let badgeText = t.pdfHotelCountFree;
    if (entry.count_type === 'quota_extra') {
        badgeText = t.pdfHotelExtra;
    } else if (entry.count_type === 'guest') {
        badgeText = t.pdfGuestCount;
    }

    document.getElementById('modalIdentifierLabel').innerText = entry.is_spa ? `${t.pdfSheetSerial}:` : t.pdfRoom;
    
    if (entry.is_spa) {
        const serialClean = String(entry.spa_serial || entry.room || '').replace(/SPA\s*#?/gi, '').trim();
        document.getElementById('modalRoomNumDisplay').innerText = `#${serialClean}`;
    } else {
        document.getElementById('modalRoomNumDisplay').innerText = entry.room;
    }
    
    const dateFormatted = entry.created_at ? new Date(entry.created_at).toLocaleDateString(currentLang === 'ar' ? 'ar-AE' : (currentLang === 'hi' ? 'hi-IN' : 'en-GB')) : '---';
    document.getElementById('modalDate').innerText = `${t.pdfDate} ${dateFormatted}`;
    document.getElementById('modalTypeBadgeInline').innerText = entry.is_spa ? t.pdfSpaRecord : badgeText;
    document.getElementById('modalPackagingStyle').innerText = entry.options?.service_style || 'F — Folding';

    const agencyBox = document.getElementById('modalAgencyQuotaBox');
    if (entry.guest_name || entry.agency || entry.quota) {
        document.getElementById('modalGuestDisplay').innerText = entry.guest_name || 'Unknown';
        document.getElementById('modalTypDisplay').innerText = entry.room_typ || (entry.is_spa ? 'SPA' : 'DLXR');
        document.getElementById('modalAgencyDisplay').innerText = entry.agency || (entry.is_spa ? 'V Element SPA' : 'Direct');
        document.getElementById('modalQuotaDisplay').innerText = entry.quota || (entry.is_spa ? 'V Element SPA' : badgeText);
        document.getElementById('modalCreatedByDisplay').innerText = entry.created_by || 'Staff';
        agencyBox.classList.remove('hidden');
    } else {
        agencyBox.classList.add('hidden');
    }

    const tbody = document.getElementById('modalTableBody'); 
    tbody.innerHTML = '';

    const itemsObj = entry.items || {};
    const itemsList = Array.isArray(itemsObj) ? itemsObj : Object.values(itemsObj);

    if (itemsList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center py-2 text-stone-400 font-semibold">Aucun article sélectionné.</td></tr>`;
    } else {
        itemsList.forEach(item => {
            let name = item.name || 'Article';
            let qty = parseInt(item.qty || item.quantity) || 0;
            let price = parseFloat(item.price || item.unit_price) || 0;
            let freeQty = parseInt(item.freeQty || item.free_quantity) || 0;

            if (qty <= 0) return;

            if (entry.is_spa) {
                const rowTotal = qty * price;
                const tr = document.createElement('tr');
                tr.className = "py-1.5 border-b border-stone-200 text-stone-900";
                tr.innerHTML = `
                    <td class="font-bold py-1.5 p-2">${name}</td>
                    <td class="text-center font-bold p-1.5">${qty}</td>
                    <td class="text-right font-bold p-1.5">${rowTotal.toFixed(2)} AED</td>
                `;
                tbody.appendChild(tr);
            } else {
                if (entry.count_type === 'hotel') {
                    const trHotel = document.createElement('tr');
                    trHotel.className = "py-1.5 border-b border-stone-200 text-stone-900";
                    trHotel.innerHTML = `
                        <td class="font-bold py-1.5 p-2">${name}</td>
                        <td class="text-center font-bold p-1.5">${qty}</td>
                        <td class="text-right font-bold p-1.5 text-emerald-700">0.00 AED</td>
                    `;
                    tbody.appendChild(trHotel);
                } else if (entry.count_type === 'guest') {
                    const rowTotal = qty * price;
                    const trGuest = document.createElement('tr');
                    trGuest.className = "py-1.5 border-b border-stone-200 text-stone-900";
                    trGuest.innerHTML = `
                        <td class="font-bold py-1.5 p-2">${name}</td>
                        <td class="text-center font-bold p-1.5">${qty}</td>
                        <td class="text-right font-bold p-1.5">${rowTotal.toFixed(2)} AED</td>
                    `;
                    tbody.appendChild(trGuest);
                } else if (entry.count_type === 'quota_extra') {
                    let chargeableQty = qty - freeQty;
                    if (chargeableQty < 0) chargeableQty = 0;

                    if (freeQty > 0) {
                        const trFree = document.createElement('tr');
                        trFree.className = "py-1.5 border-b border-stone-200 text-emerald-700";
                        trFree.innerHTML = `
                            <td class="font-bold py-1.5 p-2">${name} (Free Quota)</td>
                            <td class="text-center font-bold p-1.5">${freeQty}</td>
                            <td class="text-right font-bold p-1.5">0.00 AED</td>
                        `;
                        tbody.appendChild(trFree);
                    }

                    if (chargeableQty > 0) {
                        const totalLine = chargeableQty * price;
                        const trChg = document.createElement('tr');
                        trChg.className = "py-1.5 border-b border-stone-200 text-stone-900";
                        trChg.innerHTML = `
                            <td class="font-bold py-1.5 p-2">${name} (Extra)</td>
                            <td class="text-center font-bold p-1.5">${chargeableQty}</td>
                            <td class="text-right font-bold p-1.5">${totalLine.toFixed(2)} AED</td>
                        `;
                        tbody.appendChild(trChg);
                    }
                }
            }
        });
    }

    document.getElementById('modalClothesCount').innerText = `${entry.total_clothes || 0} pieces`;
    document.getElementById('modalTotal').innerText = `${(entry.total || 0).toFixed(2)} AED`;

    const noteBox = document.getElementById('modalNoteBox');
    const noteText = document.getElementById('modalNoteText');
    if (entry.note && entry.note.trim() !== '') {
        noteText.innerText = entry.note;
        noteBox.classList.remove('hidden');
    } else {
        noteBox.classList.add('hidden');
    }

    const pContainer = document.getElementById('modalPhotoContainer');
    if (entry.photo) {
        pContainer.innerHTML = `<div class="border-t border-stone-200 pt-2 mt-1"><p class="font-bold text-[10px] mb-1 text-stone-700">${t.pdfProofPhoto}</p><img src="${entry.photo}" class="w-full max-h-40 object-cover rounded-xl border border-stone-300"></div>`;
    } else {
        pContainer.innerHTML = '';
    }

    const whatsappMsg = encodeURIComponent(`*REMAL HOTEL & VILLAS - RECEIPT*\n*Ref:* ${entry.is_spa ? '#' + entry.spa_serial : 'Room ' + entry.room}\n*Guest:* ${entry.guest_name}\n*Total Pieces:* ${entry.total_clothes} pcs\n*Grand Total:* ${(entry.total || 0).toFixed(2)} AED`);
    document.getElementById('btnWhatsappShare').href = `https://wa.me/?text=${whatsappMsg}`;

    document.getElementById('detailModal').classList.remove('hidden');
}

// MODIFICATION DU BORDEREAU (GÈRE AUSSI LES DEMANDES GUEST PORTAL)
function modifierBordereauActuel() {
    if (!selectedIdForModal) return;
    chargerDonneesLocalStorage();
    const entry = cachedSlips.find(e => String(e.id) === String(selectedIdForModal));
    if (!entry) return;

    fermerModal();

    if (entry.is_spa) {
        switchMainSection('spa');
        document.getElementById('editingSpaId').value = entry.id;
        document.getElementById('spaFormTitleLabel').innerText = `✏️ Edit SPA Receipt #${entry.spa_serial}`;
        document.getElementById('btnSaveSpa').innerHTML = `<i class="fas fa-save"></i> Update SPA Receipt`;

        document.getElementById('spa-serial-no').value = entry.spa_serial || '';
        document.getElementById('spa-given-by').value = entry.guest_name || '';
        document.getElementById('spa-collected-by').value = entry.options?.collected_by || '';
        document.getElementById('spa-delivered-by').value = entry.options?.delivered_by || '';

        const rows = document.querySelectorAll('#spa-laundry-section tbody tr:not(.bg-stone-100)');
        rows.forEach(row => {
            const input = row.querySelector('.spa-qty-input');
            const itemName = row.querySelector('td').innerText;
            if (input && entry.items && entry.items[itemName]) {
                input.value = entry.items[itemName].qty;
            } else if (input) {
                input.value = '';
            }
        });
        calculateSpaTotal();

    } else {
        switchMainSection('newRecord');
        document.getElementById('editingRecordId').value = entry.id;
        document.getElementById('lblFormTitle').innerText = `✏️ Edit / Validate Record - Room ${entry.room}`;
        document.getElementById('roomNumber').value = entry.room;
        onRoomNumberInput();

        selectCountType(entry.count_type || 'hotel');
        document.getElementById('recordOptionalNote').value = entry.note || '';

        cart = {};

        if (entry.items) {
            const itemsList = Array.isArray(entry.items) ? entry.items : Object.values(entry.items);
            
            itemsList.forEach(item => {
                const itemName = item.name || 'Article';
                const itemQty = parseInt(item.quantity || item.qty, 10) || 1;
                const itemPrice = parseFloat(item.unit_price || item.price) || 0;
                const freeQty = parseInt(item.free_quantity || item.freeQty, 10) || 0;

                const key = `${currentService}_${itemName}`;
                cart[key] = {
                    name: itemName,
                    price: itemPrice,
                    qty: itemQty,
                    freeQty: freeQty
                };
            });
        }

        renderItems();
        calculateGlobalTotals();
    }
}

async function genererPDF(entryId = null) {
    const targetId = entryId || selectedIdForModal;
    if (!targetId) {
        alert("⚠️ Aucun élément sélectionné.");
        return;
    }

    chargerDonneesLocalStorage();
    const entry = cachedSlips.find(e => String(e.id) === String(targetId));
    if (!entry) return;

    if (entry.is_spa) {
        ouvrirModalDetails(targetId);
        const modalEl = document.getElementById('detailModal');
        const printArea = document.getElementById('pdfExportArea');
        const dateIso = entry.created_at ? entry.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
        const fileTargetName = `REMAL_${dateIso}_SPA-${entry.spa_serial || '0000'}`;

        const noPrintElements = printArea.querySelectorAll('.no-print');
        noPrintElements.forEach(el => el.style.display = 'none');

        const opt = {
            margin:       [10, 12, 10, 12],
            filename:     `${fileTargetName}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { 
                scale: 2, 
                useCORS: true, 
                logging: false, 
                backgroundColor: '#ffffff',
                scrollX: 0,
                scrollY: 0
            },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
        };

        try {
            await html2pdf().set(opt).from(printArea).save();
        } catch (e) {
            console.error("Erreur génération PDF SPA:", e);
            alert("⚠️ Erreur lors de la création du PDF SPA.");
        } finally {
            noPrintElements.forEach(el => el.style.display = '');
            fermerModal();
        }
        return;
    }

    const modalEl = document.getElementById('detailModal');
    const modalWasHidden = modalEl.classList.contains('hidden');
    if (modalWasHidden) {
        ouvrirModalDetails(targetId);
    }

    entry.receipt_id = genererIdentifiantBordereau(entry);
    const dateIso = entry.created_at ? entry.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
    const fileTargetName = `REMAL_${dateIso}_RM-${entry.room}`;

    const printArea = document.getElementById('pdfExportArea');
    const noPrintElements = printArea.querySelectorAll('.no-print');
    noPrintElements.forEach(el => el.style.display = 'none');

    const opt = {
        margin:       [10, 12, 10, 12],
        filename:     `${fileTargetName}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
            scale: 2, 
            useCORS: true, 
            logging: false, 
            backgroundColor: '#ffffff',
            scrollX: 0,
            scrollY: 0
        },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
        await html2pdf().set(opt).from(printArea).save();
    } catch (e) {
        console.error("Erreur génération PDF:", e);
        alert("⚠️ Erreur lors de la création du PDF.");
    } finally {
        noPrintElements.forEach(el => el.style.display = '');
        if (modalWasHidden) {
            fermerModal();
        }
    }
}

function fermerModal() { document.getElementById('detailModal').classList.add('hidden'); selectedIdForModal = null; }

async function supprimerBordereauActuel() {
    if (!selectedIdForModal) return;
    if (confirm(`Delete this record?`)) {
        chargerDonneesLocalStorage();
        cachedSlips = cachedSlips.filter(e => String(e.id) !== String(selectedIdForModal));
        sauvegarderDonneesLocalStorage();

        if (supabaseClient) {
            try { await supabaseClient.from('laundry_slips').delete().eq('id', selectedIdForModal); } catch(e) {}
        }

        fermerModal();
        chargerLiveOrders();
        if(!document.getElementById('sectionPdfList').classList.contains('hidden')) {
            afficherListeBordereauxLocal();
        }
    }
}

// ==========================================================================
// INTEGRATION REALTIME & CONVERSION GUEST PORTAL EN BORDEREAU ÉDITABLE
// ==========================================================================

window.onNewGuestRequestReceived = function(newOrder) {
    if (!newOrder) return;

    console.log("📥 Nouvelle demande client convertie en bordereau éditable :", newOrder);

    const roomNum = String(newOrder.room_number || newOrder.room || '---');
    const guestName = newOrder.guest_name || 'Online Guest';
    const totalPcs = parseInt(newOrder.total_pieces || newOrder.total_clothes || newOrder.total_items, 10) || 0;
    const grandTotal = parseFloat(newOrder.grand_total || newOrder.total || newOrder.subtotal) || 0;
    const specialNotes = newOrder.special_notes || newOrder.note || newOrder.special_instructions || 'Request from Guest Portal';
    const pmsQuotaText = newOrder.pms_quota || 'Standard';
    const isExtra = newOrder.extra_charged || false;

    const slipRecord = {
        id: String(newOrder.id || Date.now()),
        room: roomNum,
        guest_name: guestName,
        count_type: isExtra ? 'quota_extra' : (newOrder.count_type || 'guest'),
        created_at: newOrder.created_at || new Date().toISOString(),
        total_clothes: totalPcs,
        total: grandTotal,
        subtotal: parseFloat(newOrder.subtotal) || grandTotal,
        vat: parseFloat(newOrder.vat) || 0,
        status: 'pickup_alert',
        is_spa: false,
        created_by: 'Guest App',
        note: specialNotes,
        quota: pmsQuotaText,
        items: newOrder.items || [],
        options: {
            service_style: newOrder.service_type || 'Laundry Collection'
        }
    };

    chargerDonneesLocalStorage();
    
    const existingIndex = cachedSlips.findIndex(s => String(s.id) === String(slipRecord.id));
    if (existingIndex !== -1) {
        cachedSlips[existingIndex] = slipRecord;
    } else {
        cachedSlips.unshift(slipRecord);
    }
    
    sauvegarderDonneesLocalStorage();

    const bannerText = document.getElementById('guestBannerText');
    if (bannerText) {
        bannerText.innerText = `Room ${roomNum} (${guestName}) — ${totalPcs} piece(s) submitted.`;
    }

    const liveSection = document.getElementById('sectionLiveRecord');
    if (liveSection && !liveSection.classList.contains('hidden')) {
        chargerLiveOrders();
    } else {
        const activeTodaySlips = cachedSlips.filter(entry => {
            if (!entry.created_at) return false;
            const todayStr = new Date().toISOString().split('T')[0];
            return entry.created_at.split('T')[0] === todayStr || entry.status === 'pickup_alert';
        });
        const badge = document.getElementById('activeRoomsCountBadge');
        if (badge) badge.innerText = activeTodaySlips.length;
    }

    setTimeout(() => {
        const checkbox = document.querySelector(`.room-checkbox[data-id="${slipRecord.id}"]`);
        if (checkbox) {
            const card = checkbox.closest('.remal-card');
            if (card) {
                card.classList.add('ring-2', 'ring-amber-500', 'bg-amber-950/30', 'animate-pulse');
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, 200);
};

// ==========================================================================
// LAUNDRY OS STAFF AUTHENTICATION & TRACEABILITY
// ==========================================================================

let currentStaffUser = null;

document.addEventListener('DOMContentLoaded', () => {
    checkStaffSession();
});

function checkStaffSession() {
    const savedStaff = localStorage.getItem('remal_current_staff');
    const loginModal = document.getElementById('staffLoginModal');

    if (savedStaff) {
        try {
            currentStaffUser = JSON.parse(savedStaff);
            if (loginModal) loginModal.classList.add('hidden');
            updateStaffUIIndicator();
            return;
        } catch (e) {}
    }

    if (loginModal) {
        loginModal.classList.remove('hidden');
    }
}

async function verifyStaffPin() {
    const pinInput = document.getElementById('staffPinInput');
    const errorMsg = document.getElementById('loginErrorMsg');
    const pin = pinInput ? pinInput.value.trim() : '';

    if (!pin) return;

    if (typeof supabaseClient === 'undefined' || !supabaseClient) {
        if (pin === '1234') {
            currentStaffUser = { name: 'Superviseur (Local)', role: 'Manager' };
            saveAndUnlockSession();
            return;
        } else {
            errorMsg.classList.remove('hidden');
            return;
        }
    }

    try {
        const { data, error } = await supabaseClient
            .from('laundry_staff')
            .select('*')
            .eq('pin_code', pin)
            .eq('is_active', true)
            .single();

        if (error || !data) {
            errorMsg.classList.remove('hidden');
            pinInput.value = '';
            return;
        }

        currentStaffUser = {
            id: data.id,
            name: data.name,
            role: data.role
        };

        saveAndUnlockSession();

    } catch (err) {
        console.error("Erreur authentification staff:", err);
        errorMsg.classList.remove('hidden');
    }
}

function saveAndUnlockSession() {
    localStorage.setItem('remal_current_staff', JSON.stringify(currentStaffUser));
    const loginModal = document.getElementById('staffLoginModal');
    if (loginModal) loginModal.classList.add('hidden');
    
    updateStaffUIIndicator();
    console.log(`✅ Session déverrouillée par : ${currentStaffUser.name} (${currentStaffUser.role})`);
}

function updateStaffUIIndicator() {
    const indicator = document.getElementById('currentLoggedStaff');
    if (indicator && currentStaffUser) {
        indicator.innerText = `👤 ${currentStaffUser.name}`;
    }
}

function logoutStaff() {
    localStorage.removeItem('remal_current_staff');
    currentStaffUser = null;
    location.reload();
}
// Mise à jour du statut d'une demande client depuis Laundry OS
async function mettreAJourStatutCommande(requestId, nouveauStatut) {
    if (!supabaseClient || !requestId) {
        alert("⚠️ Client Supabase non connecté.");
        return;
    }

    try {
        // 1. Mise à jour dans la table guest_laundry_requests
        const { error: reqErr } = await supabaseClient
            .from('guest_laundry_requests')
            .update({ status: nouveauStatut })
            .eq('id', requestId);

        // 2. Mise à jour dans laundry_slips si présent
        const { error: slipErr } = await supabaseClient
            .from('laundry_slips')
            .update({ status: nouveauStatut })
            .eq('id', requestId);

        if (reqErr && slipErr) {
            console.error("Erreur maj statut:", reqErr || slipErr);
            alert("⚠️ Impossible de mettre à jour le statut.");
            return;
        }

        // 3. Mise à jour du cache local
        chargerDonneesLocalStorage();
        const localSlip = cachedSlips.find(s => String(s.id) === String(requestId));
        if (localSlip) {
            localSlip.status = nouveauStatut;
            sauvegarderDonneesLocalStorage();
        }

        // 4. Rafraîchir l'affichage
        chargerLiveOrders();
        fermerModal();

        console.log(`✅ Statut mis à jour avec succès : ${nouveauStatut}`);

    } catch (e) {
        console.error("Exception lors du changement de statut:", e);
    }
}
