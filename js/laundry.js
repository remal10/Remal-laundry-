// =============================================================
// LOGIQUE MÉTIER BLANCHISSERIE, SPA & TRAITEMENTS DONNÉES (UNIFIÉ)
// =============================================================

async function selectBackupFolder() {
    try {
        if (window.showDirectoryPicker) {
            globalDirHandle = await window.showDirectoryPicker();
            alert("✅ Dossier de sauvegarde direct configuré avec succès !");
        } else {
            alert("⚠️ Votre navigateur ne supporte pas l'accès direct aux dossiers.");
        }
    } catch (err) {
        console.warn("Folder picker cancelled:", err);
    }
}

async function writeRecordToFile(record) {
    if (!globalDirHandle) return;
    try {
        const identifier = record.room_number || record.room || record.spa_serial || 'record';
        const filename = `Remal_Record_${identifier}_${Date.now()}.json`;
        const fileHandle = await globalDirHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(record, null, 2));
        await writable.close();
    } catch (err) {
        console.warn("Could not write record to direct folder:", err);
    }
}

function chargerDonneesLocalStorage() {
    const data = localStorage.getItem('remal_laundry_slips');
    cachedSlips = data ? JSON.parse(data) : [];
}

function sauvegarderDonneesLocalStorage() {
    localStorage.setItem('remal_laundry_slips', JSON.stringify(cachedSlips));
}

function chargerPmsLocalStorage() {
    const data = localStorage.getItem('remal_pms_database');
    if (data) {
        try { pmsDatabase = JSON.parse(data); } catch(e) { pmsDatabase = {}; }
    }
}

function sauvegarderPmsLocalStorage() {
    localStorage.setItem('remal_pms_database', JSON.stringify(pmsDatabase));
}

function isRoomNumberValid(val) {
    const room = parseInt(val, 10);
    if (isNaN(room)) return false;
    return (
        (room >= 103 && room <= 144) ||
        (room >= 201 && room <= 246) ||
        (room >= 301 && room <= 348) ||
        (room >= 401 && room <= 448) ||
        (room >= 501 && room <= 520) ||
        (room >= 601 && room <= 608)
    );
}

function updateQty(key, name, price, delta) {
    if (!cart[key]) cart[key] = { qty: 0, freeQty: 0, price: price, name: name, service: currentService };
    cart[key].qty += delta;
    if (cart[key].freeQty > cart[key].qty) cart[key].freeQty = cart[key].qty;
    if (cart[key].qty <= 0) delete cart[key];
    renderItems(); calculateGlobalTotals();
}

function updateFreeQty(key, delta) {
    if (!cart[key]) return;
    cart[key].freeQty += delta;
    if (cart[key].freeQty < 0) cart[key].freeQty = 0;
    if (cart[key].freeQty > cart[key].qty) cart[key].freeQty = cart[key].qty;
    renderItems(); calculateGlobalTotals();
}

function calculateGlobalTotals() {
    let totalClothes = 0; 
    let subtotal = 0;

    Object.values(cart).forEach(item => { 
        totalClothes += item.qty; 
        if (currentCountType === 'guest') {
            subtotal += item.price * item.qty;
        } else if (currentCountType === 'quota_extra') {
            let chargeableQty = item.qty - (item.freeQty || 0);
            if(chargeableQty < 0) chargeableQty = 0;
            subtotal += item.price * chargeableQty;
        }
    });

    for (let i = 0; i < 3; i++) {
        const nameVal = document.getElementById(`customName${i}`)?.value.trim() || '';
        const priceVal = parseFloat(document.getElementById(`customPrice${i}`)?.value) || 0;
        const qtyVal = parseInt(document.getElementById(`customQty${i}`)?.value) || 0;

        if (nameVal && qtyVal > 0) {
            totalClothes += qtyVal;
            if (currentCountType === 'guest' || currentCountType === 'quota_extra') {
                subtotal += priceVal * qtyVal;
            }
        }
    }

    const vat = subtotal * 0.05; 
    const grandTotal = subtotal + vat;
    
    const countEl = document.getElementById('currentBordereauCount');
    const subEl = document.getElementById('subTotal');
    const vatEl = document.getElementById('vatAmount');
    const grandEl = document.getElementById('grandTotal');

    if (countEl) countEl.innerText = `${totalClothes} pieces`;
    if (subEl) subEl.innerText = `${subtotal.toFixed(2)} AED`;
    if (vatEl) vatEl.innerText = `${vat.toFixed(2)} AED`;
    if (grandEl) grandEl.innerText = `${grandTotal.toFixed(2)} AED`;
}

// -------------------------------------------------------------
// ENREGISTREMENT ET ALIGNEMENT COMPATIBLE GUEST PORTAL & SUPABASE
// -------------------------------------------------------------
async function sauvegarderBordereauLocal() {
    const roomInput = document.getElementById('roomNumber');
    const roomNum = roomInput ? roomInput.value.trim() : '';
    const editingId = document.getElementById('editingRecordId')?.value.trim();
    const optionalNote = document.getElementById('recordOptionalNote')?.value.trim() || '';

    if (!roomNum) {
        alert('Please enter a room number.');
        return;
    }

    const cartEntries = Object.values(cart);

    // Vérifier s'il y a des custom items renseignés
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
        alert('Please select at least one garment or take a proof photo.');
        return;
    }

    let totalPcs = 0;
    let subtotalCalc = 0;
    const itemsArray = [];

    // 1. Extraction des articles du panier standard
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

    // 2. EXTRACTION SÉCURISÉE DES CUSTOM ITEMS (0, 1, 2)
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

    const selectedOption = document.querySelector('input[name="foldingOption"]:checked')?.value || 'F — Folding';
    const subtotal = Number(subtotalCalc.toFixed(2));
    const vat = Number((subtotal * 0.05).toFixed(2));
    const grandTotal = Number((subtotal + vat).toFixed(2));

    const pmsData = pmsDatabase[roomNum] || { guestName: 'Unknown Guest', roomTyp: 'DLXR', agency: 'Direct', quotaText: 'Chargeable', isChargeable: true };

    chargerDonneesLocalStorage();
    let currentStatus = 'Collected';
    if (editingId) {
        const existingRecord = cachedSlips.find(s => String(s.id) === String(editingId));
        if (existingRecord && existingRecord.status) {
            currentStatus = existingRecord.status;
        }
    }

    const payloadSupabase = {
        room_number: roomNum,
        guest_name: pmsData.guestName,
        pms_quota: pmsData.quotaText || 'Standard',
        extra_charged: currentCountType === 'quota_extra',
        service_type: selectedOption,
        items: itemsArray,
        total_pieces: totalPcs,
        subtotal: subtotal,
        vat: vat,
        grand_total: grandTotal,
        special_notes: optionalNote,
        status: currentStatus,
        created_by: 'Staff Laundry OS', // Marqueur pour désactiver le auto-trigger notification
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
            } else if (res.data && res.data.length > 0) {
                assignedId = String(res.data[0].id);
                console.log("✅ Enregistré sur Supabase avec succès, UUID:", assignedId);
            }
        } catch (e) {
            console.error("Exception d'écriture Supabase :", e);
        }
    }

    if (!assignedId) assignedId = String(Date.now());

    const slipRecord = {
        ...payloadSupabase,
        id: assignedId,
        room: roomNum,
        room_typ: pmsData.roomTyp,
        agency: pmsData.agency,
        quota: pmsData.quotaText,
        count_type: currentCountType,
        total_clothes: totalPcs,
        total: grandTotal,
        note: optionalNote,
        photo: currentImageData,
        options: { service_style: selectedOption },
        created_at: new Date().toISOString()
    };
    slipRecord.receipt_id = obtenirReceiptId(slipRecord);

    const existingIndex = cachedSlips.findIndex(s => String(s.id) === String(assignedId));
    if (existingIndex !== -1) {
        cachedSlips[existingIndex] = slipRecord;
        alert(`✅ Record for Room ${roomNum} updated successfully!`);
    } else {
        cachedSlips.unshift(slipRecord);
        alert(`✅ Record for Room ${roomNum} saved!`);
    }
    sauvegarderDonneesLocalStorage();

    await writeRecordToFile(slipRecord);
    reinitialiserFormulaire();
    switchMainSection('liveRecord');
    if (typeof chargerLiveOrders === 'function') chargerLiveOrders();

    setTimeout(() => { isLocalUpdating = false; }, 1000);
}

function isPAXOrInvalid(val) {
    if (!val) return true;
    let cleaned = val.trim();
    if (/^\d+[\/\-\.]\d+[\/\-\.]\d+$/.test(cleaned)) return true;
    if (/^[\d\/\s\-\.]+$/.test(cleaned)) return true;
    if (/\d{2}\/\d{2}\/\d{4}/.test(cleaned)) return true;
    const blockedCodes = ['DLXR', 'BBLA', 'HBDL', 'REG', 'IN', 'CN', 'EMA', 'SAM', 'CORP', 'B1', 'B2', '1/0/0', '2/0/0'];
    if (blockedCodes.includes(cleaned.toUpperCase())) return true;
    return false;
}

function sanitizeAgencyName(agencyStr) {
    if (!agencyStr || isPAXOrInvalid(agencyStr)) return "Direct";
    let cleaned = agencyStr.trim();
    if (isPAXOrInvalid(cleaned)) return "Direct";
    return cleaned;
}

async function processTextData(rawData) {
    if (!rawData || !rawData.trim()) {
        alert("No data found to process.");
        return;
    }

    const lines = rawData.split('\n');
    let parsedData = [];
    let currentRoom = null;
    let currentGuest = "";
    let currentRoomTyp = "";
    let currentArrival = "";
    let currentDeparture = "";
    let currentAgency = "Direct";
    let accumulatedText = "";

    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        
        const cols = line.split('\t').map(c => c.trim()).filter(c => c !== "");

        if (/^\d{3,4}$/.test(cols[0])) {
            if (currentRoom) {
                parsedData.push({
                    room: currentRoom,
                    guestName: currentGuest || 'Unknown Guest',
                    roomTyp: currentRoomTyp || 'DLXR',
                    arrival: currentArrival,
                    departure: currentDeparture,
                    agency: sanitizeAgencyName(currentAgency),
                    fullContext: accumulatedText.toLowerCase()
                });
            }
            currentRoom = cols[0];
            currentGuest = "";
            currentRoomTyp = "DLXR";
            currentArrival = "";
            currentDeparture = "";
            currentAgency = "Direct";

            for (let i = 1; i < cols.length; i++) {
                let val = cols[i];
                let valLower = val.toLowerCase();

                if (isPAXOrInvalid(val)) continue;

                const isCompany = companyKeywords.some(kw => valLower.includes(kw));
                if (isCompany) {
                    currentAgency = val;
                    continue;
                }

                if (val.length <= 5 && /^[A-Z]+$/.test(val) && !currentRoomTyp) {
                    currentRoomTyp = val;
                } 
                else if (/\d{2}\/\d{2}\/\d{4}/.test(val)) {
                    if (!currentArrival) currentArrival = val;
                    else if (!currentDeparture) currentDeparture = val;
                } 
                else if (!currentGuest && (val.includes(',') || val.includes('Mr.') || val.includes('Ms.'))) {
                    currentGuest = val;
                }
            }

            let candidateCompany = cols.find(c => companyKeywords.some(kw => c.toLowerCase().includes(kw)) && !isPAXOrInvalid(c));
            if (candidateCompany) {
                currentAgency = candidateCompany;
            }

            accumulatedText = line;
        } else {
            accumulatedText += " " + line;
            let candidateCompany = cols.find(c => companyKeywords.some(kw => c.toLowerCase().includes(kw)) && !isPAXOrInvalid(c));
            if (candidateCompany && (currentAgency === "Direct" || isPAXOrInvalid(currentAgency))) {
                currentAgency = candidateCompany;
            }
        }
    });

    if (currentRoom) {
        parsedData.push({
            room: currentRoom,
            guestName: currentGuest || 'Unknown Guest',
            roomTyp: currentRoomTyp || 'DLXR',
            arrival: currentArrival,
            departure: currentDeparture,
            agency: sanitizeAgencyName(currentAgency),
            fullContext: accumulatedText.toLowerCase()
        });
    }

    if (parsedData.length > 0) {
        pmsDatabase = {};
        let cloudGuestsPayload = [];

        parsedData.forEach(item => {
            const laundryRegex = /([0-9]{1,2})\s*(pcs|pieces)?[\/\s]*(lau|lan|laun|laundy|daily)/i;
            const match = item.fullContext.match(laundryRegex);
            const hasLaundry = match !== null || /hdl[0-9]|laundry|lau\s*daily/i.test(item.fullContext);
            
            let quotaText = "";
            let isChargeable = false;

            if (match) {
                const pcsCount = parseInt(match[1], 10);
                quotaText = `${String(pcsCount).padStart(2, '0')} PIECES LAU DAILY`;
                isChargeable = false;
            } else if (hasLaundry) {
                quotaText = "Laundry Package";
                isChargeable = false;
            } else {
                quotaText = "Chargeable";
                isChargeable = true;
            }

            pmsDatabase[item.room] = {
                guestName: item.guestName,
                roomTyp: item.roomTyp,
                arrival: item.arrival,
                departure: item.departure,
                agency: item.agency,
                quotaText: quotaText,
                isChargeable: isChargeable
            };

            cloudGuestsPayload.push({
                room: item.room,
                guest_name: item.guestName,
                room_typ: item.roomTyp,
                arrival: item.arrival,
                departure: item.departure,
                agency: item.agency,
                quota_text: quotaText,
                is_chargeable: isChargeable
            });
        });

        sauvegarderPmsLocalStorage();
        if (typeof renderMassPreviewTable === 'function') renderMassPreviewTable();

        if (supabaseClient && cloudGuestsPayload.length > 0) {
            try {
                await supabaseClient.from('pms_guests').delete().neq('room', '000');
                await supabaseClient.from('pms_guests').insert(cloudGuestsPayload);
                alert(`✅ PMS Report updated successfully! (${parsedData.length} rooms mapped)`);
            } catch(e) {
                console.warn("Erreur Supabase PMS Guests:", e);
            }
        }

    } else {
        alert("Could not automatically map data from this format.");
    }
}

function calculateSpaTotal() {
    let grandTotal = 0;
    const rows = document.querySelectorAll('#spa-laundry-section tbody tr:not(.bg-stone-100)');
    
    rows.forEach(row => {
        const input = row.querySelector('.spa-qty-input');
        if(!input) return;
        const qty = parseInt(input.value) || 0;
        const rate = parseFloat(input.getAttribute('data-rate')) || 0;
        const rowAmountCell = row.querySelector('.spa-row-amount');
        
        const rowTotal = qty * rate;
        if(rowAmountCell) rowAmountCell.innerText = rowTotal.toFixed(2);
        grandTotal += rowTotal;
    });
    
    const gtEl = document.getElementById('spa-grand-total');
    if(gtEl) gtEl.innerText = grandTotal.toFixed(2) + " AED";
}

async function validateAndSaveSpaReceipt() {
    const serialNo = document.getElementById('spa-serial-no').value.trim();
    const grandTotalText = document.getElementById('spa-grand-total').innerText;
    const grandTotalValue = parseFloat(grandTotalText) || 0;
    const collectedBy = document.getElementById('spa-collected-by').value.trim();
    const deliveredBy = document.getElementById('spa-delivered-by').value.trim();
    const givenBy = document.getElementById('spa-given-by').value.trim();
    const editingSpaId = document.getElementById('editingSpaId').value;
    
    const colDate = document.getElementById('spa-collection-date').value;
    const colTime = document.getElementById('spa-collection-time').value;
    const delDate = document.getElementById('spa-delivery-date').value;
    const delTime = document.getElementById('spa-delivery-time').value;

    if (!serialNo) { alert("⚠️ Veuillez entrer un numéro de série (Serial No)."); return false; }
    if (grandTotalValue <= 0) { alert("⚠️ Le Grand Total doit être supérieur à 0 AED."); return false; }
    if (!collectedBy || !deliveredBy || !givenBy) { alert("⚠️ Veuillez remplir tous les noms."); return false; }

    let spaItemsArray = [];
    let totalClothes = 0;
    const rows = document.querySelectorAll('#spa-laundry-section tbody tr:not(.bg-stone-100)');
    rows.forEach(row => {
        const input = row.querySelector('.spa-qty-input');
        if (!input) return;
        const qty = parseInt(input.value) || 0;
        if(qty > 0) {
            const itemName = row.querySelector('td').innerText.trim();
            const rate = parseFloat(input.getAttribute('data-rate')) || 0;
            spaItemsArray.push({
                name: itemName,
                quantity: qty,
                unit_price: rate,
                total_price: qty * rate
            });
            totalClothes += qty;
        }
    });

    const payloadSpa = {
        room_number: `SPA #${serialNo}`,
        guest_name: givenBy,
        pms_quota: 'SPA Sheet',
        extra_charged: false,
        service_type: 'SPA Daily Sheet',
        items: spaItemsArray,
        total_pieces: totalClothes,
        subtotal: grandTotalValue,
        vat: 0,
        grand_total: grandTotalValue,
        special_notes: `Collected by: ${collectedBy} | Delivered by: ${deliveredBy}`,
        status: 'Collected',
        created_by: 'Staff Laundry OS',
        accepted_policy: true
    };

    isLocalUpdating = true;
    let assignedId = editingSpaId;

    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        try {
            let res;
            if (editingSpaId && editingSpaId.length === 36) {
                res = await supabaseClient.from('guest_laundry_requests').update(payloadSpa).eq('id', editingSpaId).select();
            } else {
                res = await supabaseClient.from('guest_laundry_requests').insert([payloadSpa]).select();
            }
            if (res.data && res.data.length > 0) {
                assignedId = String(res.data[0].id);
            }
        } catch(e) {
            console.warn("Erreur Supabase SPA:", e);
        }
    }

    if (!assignedId) assignedId = String(Date.now());

    chargerDonneesLocalStorage();
    const targetRecord = {
        ...payloadSpa,
        id: assignedId,
        is_spa: true,
        spa_serial: serialNo,
        room: `SPA #${serialNo}`,
        room_typ: 'SPA',
        agency: 'V Element SPA',
        count_type: 'guest',
        total_clothes: totalClothes,
        total: grandTotalValue,
        options: { 
            service_style: 'SPA Daily Sheet', 
            collection_date: colDate, collection_time: colTime, 
            delivery_date: delDate, delivery_time: delTime, 
            collected_by: collectedBy, delivered_by: deliveredBy 
        },
        created_at: colDate ? `${colDate}T${colTime || '00:00'}:00.000Z` : new Date().toISOString()
    };
    targetRecord.receipt_id = obtenirReceiptId(targetRecord);

    const index = cachedSlips.findIndex(s => String(s.id) === String(assignedId));
    if (index !== -1) {
        cachedSlips[index] = targetRecord;
        alert(`✅ SPA Receipt #${serialNo} updated!`);
    } else {
        cachedSlips.unshift(targetRecord);
        alert(`✅ SPA Receipt #${serialNo} saved!`);
    }

    sauvegarderDonneesLocalStorage();
    await writeRecordToFile(targetRecord);
    switchMainSection('liveRecord');
    if (typeof chargerLiveOrders === 'function') chargerLiveOrders();

    setTimeout(() => { isLocalUpdating = false; }, 1000);
    return true;
}

async function exportAutoDirect() {
    chargerDonneesLocalStorage();
    const lostFoundItems = JSON.parse(localStorage.getItem('remal_lost_found') || '[]');

    if (cachedSlips.length === 0 && lostFoundItems.length === 0) {
        alert("⚠️ Aucune donnée à exporter.");
        return;
    }

    const backupData = {
        type: "Remal_Full_System_Backup",
        exportDate: new Date().toISOString(),
        slips: cachedSlips,
        lost_found: lostFoundItems
    };
    
    const jsonString = JSON.stringify(backupData, null, 2);
    const filename = `Remal_Hotel_Full_Backup_${new Date().toISOString().split('T')[0]}.json`;

    localStorage.setItem('remal_auto_backup_full', JSON.stringify(backupData));
    
    const blob = new Blob([jsonString], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    alert("✅ Sauvegarde complète (Blanchisserie & Lost & Found) effectuée !");
}

async function importAutoDirect() {
    let importedData = null;

    const internalData = localStorage.getItem('remal_auto_backup_full');
    if (internalData) {
        try {
            importedData = JSON.parse(internalData);
        } catch(e) {}
    }

    if (importedData && (importedData.slips || importedData.lost_found)) {
        if (importedData.slips && importedData.slips.length > 0) {
            chargerDonneesLocalStorage();
            const slipMap = new Map();
            cachedSlips.forEach(s => slipMap.set(String(s.id), s));
            importedData.slips.forEach(s => slipMap.set(String(s.id), s));
            cachedSlips = Array.from(slipMap.values());
            sauvegarderDonneesLocalStorage();
        }

        if (importedData.lost_found && importedData.lost_found.length > 0) {
            const currentLF = JSON.parse(localStorage.getItem('remal_lost_found') || '[]');
            const lfMap = new Map();
            currentLF.forEach(i => lfMap.set(String(i.id), i));
            importedData.lost_found.forEach(i => lfMap.set(String(i.id), i));
            localStorage.setItem('remal_lost_found', JSON.stringify(Array.from(lfMap.values())));
        }

        if (typeof afficherListeBordereauxLocal === 'function') afficherListeBordereauxLocal();
        if (typeof renderLostFoundItems === 'function') renderLostFoundItems();

        alert(`✅ Données restaurées avec succès !`);
    } else {
        alert("⚠️ Aucune sauvegarde complète trouvée en mémoire.");
    }
}
