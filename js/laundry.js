// =============================================================
// LOGIQUE MÉTIER BLANCHISSERIE, SPA & TRAITEMENTS DONNÉES (UNIFIÉ)
// ⚠️ Chargé AVANT ui.js
// ✅ MASS ENTRY V2 — Parser PMS robuste
// ✅ AGENCY V9 — Extraction par mot-clé + arrêt strict
// ✅ QUOTA V4 — Détection "X pieces per day for AED Y" → AED (Y/X) per Pcs
// ✅ CHECKOUT TODAY — Aide à la décision agent + réception
// ✅ FIX — chargerDonneesLocalStorage déclarée AVANT tout usage
// =============================================================

// ═══════════════════════════════════════════════════════════════════
// 🔧 HELPERS DE STORAGE
// ═══════════════════════════════════════════════════════════════════
function chargerDonneesLocalStorage() {
    const data = localStorage.getItem('remal_laundry_slips');
    cachedSlips = data ? JSON.parse(data) : [];
}

function sauvegarderDonneesLocalStorage() {
    const ilYa90Jours = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const slips90j = cachedSlips.filter(s => s.created_at && s.created_at >= ilYa90Jours);

    try {
        localStorage.setItem('remal_laundry_slips', JSON.stringify(slips90j));
        return;
    } catch (e) {
        console.warn("⚠️ [Storage] localStorage plein à 90j, réduction à 30j");
    }

    const ilYa30Jours = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const slips30j = cachedSlips.filter(s => s.created_at && s.created_at >= ilYa30Jours);

    try {
        localStorage.setItem('remal_laundry_slips', JSON.stringify(slips30j));
        return;
    } catch (e) {
        console.warn("⚠️ [Storage] localStorage plein à 30j, réduction à 100 records");
    }

    try {
        const last100 = cachedSlips.slice(0, 100);
        localStorage.setItem('remal_laundry_slips', JSON.stringify(last100));
        console.error("❌ [Storage] localStorage critique, garde uniquement 100 records");
    } catch (e) {
        console.error("❌ [Storage] Impossible de sauvegarder dans localStorage");
    }
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

// ═══════════════════════════════════════════════════════════════════
// ⚙️ CODES BLOQUÉS
// ═══════════════════════════════════════════════════════════════════
const BLOCKED_CODES_AGENCY = [
    'BBLA', 'HBDL', 'HDL4', 'HD40', 'FB24', 'FB40', 'BB', 'HB', 'FB', 'BF', 'LD',
    'HDL', 'HD', 'RO', 'RMLA', 'ROYS',
    'CORP', 'STAH', 'WALK', 'OIL', 'CITY', 'NORM', 'REG', 'FIT', 'HOUS', 'GHQ',
    'CASH', 'VISA', 'HU', 'AED', 'USD', 'EUR', 'VCC', 'NET', 'GST',
    'RMON', 'OTA1', 'ADN2', 'ADN', 'B4HB', 'B4RO', 'VROM', 'GDEL',
    'MR', 'MS', 'MRS', 'DR', 'PX', 'PAX',
    'DLXR', 'PRMR', 'EXCS', 'EXTW', 'VILLA', 'PREM', 'ACCR',
    'ROOM', 'BLOCK', 'GUEST', 'COMPANY', 'AGENT', 'ARRIVAL', 'DEPARTURE',
    'TOTAL', 'ROOMS', 'PRINTED', 'PROLOGIC', 'FIRST', 'INHOUSE',
    'LIST', 'HOTEL', 'REMAL', 'VEHICLE', 'CONFIRM', 'BILLING', 'INSTRUCTIONS',
    'GROUP', 'CLASS', 'TEXT', 'PLAN', 'BALANCE', 'CHANNEL', 'ACTIVITY',
    'INCLUSIVE', 'DESCRIPTION', 'FROM', 'TO', 'SORTED', 'SUPPRESSED',
    'NOTES', 'COMPLAINTS', 'FEEDBACK', 'TASK', 'INFORMATION', 'PREFERENCES',
    'NOTIFICATIONS', 'NIGHT', 'NIGHTS', 'SHORT', 'STAY', 'LONG', 'ONLY',
    'NUMBER', 'CHECK', 'CHECKOUT', 'PRINT'
];

// ═══════════════════════════════════════════════════════════════════
// 🏢 MOTS-CLÉS COMPANY
// ═══════════════════════════════════════════════════════════════════
const COMPANY_KEYWORDS_V7 = [
    // Companies spécifiques du PDF Remal
    'HONEYWELL MIDDLE EAST LIMITED',
    'SAMSUNG E & ADNOC WASTE HEAT RECOVERY PROJECT',
    'OMV Downstream Middle East & Asia',
    'Fertiglobe Holding Investment Limited',
    'Fertiglohe Holding Investment Limited',
    'Toshiba Energy Systems & Services Gulf',
    'Power Mech Projects Limited',
    'Tazweed for Oil Field Services',
    'Rotary Engineering Pte Ltd',
    'HABSHAN TRADING COMPANY',
    'INCO GROUP OF COMPANIES',
    'HONEYWELL MIDDLE EAST',
    'Siemens Industrial LLC',
    'Archirodon Construction (Overseas) Co. Ltd',
    'Federal Authority for Nuclear Regulation',
    'SCHNEIDER ELECTRIC ENGINEERS',
    'ADNOC GAS PROCESSING',
    'Bureau Veritas',
    'WebBeds FZ LLC',
    'GHQ Moral Guidance',
    'Excelerate Energy Inc',
    'Hunter Tourism LLC',
    'Hotel Booking Engine',
    'Siemens Energy',
    'ADNOC REFINING',
    'Homat Al Watan',
    'FNC TECHNOLOGY',
    'Borouge 4 LLC',
    'Borouge LLC',
    'Generation 5',
    'ADNOC GS & A',
    'Direct Booking',
    'Booking.com',
    'ERTH Staff',
    'Qateintl.com',
    'AXEN FALAJ',
    'AXEN GROUP',
    'CEGSPA',
    'alfalaval',
    'fbmhudson',
    'EXPEDIA',
    'ETIMAD',
    'FERTIL',
    'IPCO',

    // Mots-clés génériques
    'LLC', 'LIMITED', 'Inc', 'Inc.', 'GROUP', 'Holding', 'Tourism', 'Travel',
    'Energy', 'Systems', 'Services', 'Trading', 'Company', 'COMPANY',
    'Corporation', 'Corp', 'Ltd', 'LTD', 'W.L.L', 'Refining',
    'Processing', 'Engineering', 'Industrial', 'Solutions', 'Industries',
    'International', 'Global', 'Enterprises'
];

// ═══════════════════════════════════════════════════════════════════
// HELPERS MÉTIER
// ═══════════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════════
// SAUVEGARDE BORDEREAU (legacy)
// ═══════════════════════════════════════════════════════════════════
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
        if (currentStatus === 'Pending') {
            currentStatus = 'Collected';
        }
    }

    const staffSession = (typeof restaurerSessionStaff === 'function')
        ? restaurerSessionStaff()
        : (currentStaffUser || null);

    const staffName = staffSession?.name
        ? `staff ( ${staffSession.name} )`
        : 'pending';

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
            } else if (res.data && res.data.length > 0) {
                assignedId = String(res.data[0].id);
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

// ═══════════════════════════════════════════════════════════════════
// AGENCY V9 — Extraction par mot-clé + arrêt strict + préfixe propre
// ═══════════════════════════════════════════════════════════════════
function extractAgencyFromText(text) {
    if (!text || typeof text !== 'string') return 'Direct';

    let normalized = text
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([a-zA-Z])(\d)/g, '$1 $2')
        .replace(/(\d)([a-zA-Z])/g, '$1 $2')
        .replace(/\s+/g, ' ')
        .trim();

    let bestKeyword = null;
    let bestIndex = -1;

    for (const kw of COMPANY_KEYWORDS_V7) {
        const idx = normalized.indexOf(kw);
        if (idx !== -1) {
            if (!bestKeyword || kw.length > bestKeyword.length) {
                bestKeyword = kw;
                bestIndex = idx;
            }
        }
    }

    if (!bestKeyword || bestIndex === -1) {
        return 'Direct';
    }

    const GENERIC_KEYWORDS = ['LLC', 'LIMITED', 'Inc', 'Inc.', 'GROUP', 'Holding',
                              'Tourism', 'Travel', 'Energy', 'Systems', 'Services',
                              'Trading', 'Company', 'COMPANY', 'Corporation', 'Corp',
                              'Ltd', 'LTD', 'W.L.L', 'Refining', 'Processing',
                              'Engineering', 'Industrial', 'Solutions', 'Industries',
                              'International', 'Global', 'Enterprises'];

    let candidate = '';

    if (GENERIC_KEYWORDS.includes(bestKeyword)) {
        const beforeStart = Math.max(0, bestIndex - 40);
        const prefix = normalized.substring(beforeStart, bestIndex);
        candidate = prefix + bestKeyword;
    } else {
        candidate = bestKeyword;

        const afterKeyword = normalized.substring(bestIndex + bestKeyword.length);
        const afterWords = afterKeyword.trim().split(/\s+/).filter(w => w.length > 0);
        const LEGIT_EXTENSIONS = ['LLC', 'Ltd', 'LTD', 'Limited', 'LIMITED', 'Inc', 'Inc.',
                                  'W.L.L', 'Corp', 'CORP', 'Group', 'GROUP',
                                  'Company', 'Pte', 'PTE', 'Gulf', 'Services', 'SERVICES',
                                  'Systems', 'SYSTEMS', 'Holding', 'HOLDING', 'Trading',
                                  'TRADING', 'Refining', 'Processing', 'Engineering',
                                  'Industrial', 'Solutions', 'International', 'Global',
                                  'FALAJ'];
        for (let i = 0; i < Math.min(2, afterWords.length); i++) {
            const w = afterWords[i];
            if (LEGIT_EXTENSIONS.includes(w) || LEGIT_EXTENSIONS.includes(w.replace(/\.$/, ''))) {
                candidate += ' ' + w;
            } else {
                break;
            }
        }
    }

    candidate = candidate
        .replace(/\b\d{2}\/\d{2}\/\d{4}\b/g, ' ')
        .replace(/\b\d{3,6}\b/g, ' ')
        .replace(/\b(BBLA|HBDL|HDL4|HD40|FB24|FB40|BB|HB|FB|BF|LD|HDL|HD|RMLA|ROYS|RO)\b/gi, ' ')
        .replace(/\b(CORP|STAH|WALK|OIL|CITY|NORM|REG|FIT|HOUS|GHQ)\b/gi, ' ')
        .replace(/\b(CASH|VISA|HU|AED|USD|EUR|VCC|NET|GST)\b/gi, ' ')
        .replace(/\b(RMON|OTA1|ADN2|ADN|B4HB|B4RO|VROM|GDEL|BBF|RM|MCR|CO)\b/gi, ' ')
        .replace(/\b(B\d|V\d)\b/gi, ' ')
        .replace(/\b(DLXR|PRMR|EXCS|EXTW|VILLA|PREM|ACCR)\b/gi, ' ')
        .replace(/\b(Mr\.|Ms\.|Mrs\.|Dr\.|MR|MS|MRS|DR)\b/g, ' ')
        .replace(/\b(PX|PAX|HB|FB|BB|BF|LD)\b/gi, ' ')
        .replace(/\b(Pay By|OTA|BBF|RM|MCR|CO|ST|VCC|EXTR|DAILY|LAU|TO COMPANY|COMPANY|CR|DXR|U|B\.|B)\b/gi, ' ')
        .replace(/\b(\w+)\s+\1\b/gi, '$1')
        .replace(/\b\d+(\.\d+)?\b/g, ' ')
        .replace(/[\(\)\[\]<>«»\/\|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (candidate.includes(',')) {
        const commaIdx = candidate.indexOf(',');
        candidate = candidate.substring(commaIdx + 1).trim();
        candidate = candidate.replace(/^[A-Za-z]+\s+(MR|MS|MRS|Mr\.|Ms\.|Mrs\.)\s+/i, '');
    }

    candidate = candidate
        .replace(/^[A-Z]\.\s+/, '')
        .replace(/^B\s+(?=Borouge)/i, '')
        .trim();

    const lettersCount = (candidate.match(/[A-Za-z]/g) || []).length;
    if (lettersCount < 3) return 'Direct';

    candidate = candidate
        .replace(/\s+(B|L|H|ST|NORM|REG|CORP|OIL|CITY|GHQ|HU|DXR|AED|NET|GST|RO|ONLY|STAY|SHORT|LONG|BBF|RM|MCR|CO|OTA|PAY|BY)$/gi, '')
        .replace(/^[\s\-\.,;:]+|[\s\-\.,;:]+$/g, '')
        .trim();

    if (candidate.length > 80) candidate = candidate.substring(0, 80).trim();

    return candidate || 'Direct';
}

window.extractAgencyFromText = extractAgencyFromText;

// ═══════════════════════════════════════════════════════════════════
// MASS ENTRY V2 — HELPERS
// ═══════════════════════════════════════════════════════════════════
function isParasiteLine(line) {
    const t = line.trim();
    if (!t || t.length < 3) return true;

    const digitsRatio = (t.match(/\d/g) || []).length / t.length;
    if (digitsRatio > 0.7 && t.length > 20) return true;

    const lower = t.toLowerCase();

    if (lower.includes('prologic first')) return true;
    if (lower.includes('printed on')) return true;
    if (lower.includes('business date')) return true;
    if (lower.includes('inhouse guest list')) return true;
    if (lower.includes('remal hotel')) return true;
    if (lower.includes('inclusive plan')) return true;
    if (lower.includes('total rooms')) return true;
    if (lower.includes('total pax')) return true;
    if (lower.includes('grand total')) return true;
    if (/^page\s+\d+\s+of\s+\d+/i.test(t)) return true;
    if (/^(room|block|id\/check|guest last|company\/agent|arrival|mrkt|pax|terms|plan)/i.test(t)) return true;

    return false;
}

function normalizePmsDate(str) {
    if (!str) return '';
    const m = String(str).match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!m) return str;
    return `${m[3]}-${m[2]}-${m[1]}`;
}

function parsePaxMultiplier(text) {
    if (!text) return 1;
    const m = text.match(/(?:^|[\s\-\(])0*([1-9]\d?)\s*[\-\s]?\s*(?:px|pax)(?=[\s\-\)\,]|$)/i);
    if (m) {
        const n = parseInt(m[1], 10);
        if (n >= 1 && n <= 10) return n;
    }
    return 1;
}

// ═══════════════════════════════════════════════════════════════════
// ✅ QUOTA V4 — "X pieces per day for AED Y" → AED (Y/X) per Pcs
// ═══════════════════════════════════════════════════════════════════
function parseQuotaText(text) {
    if (!text) return { pcs: 0, type: 'chargeable', text: 'Chargeable' };

    // 🎯 PRIORITÉ ABSOLUE : "X pieces per day for AED Y net"
    let aedMatch = text.match(/(\d{1,2})\s*pieces?\s*per\s*day\s*for\s*AED\s*(\d+(?:\.\d+)?)/i);
    if (aedMatch) {
        const pcs = parseInt(aedMatch[1], 10);
        const totalAed = parseFloat(aedMatch[2]);
        if (pcs >= 1 && pcs <= 30 && totalAed > 0) {
            const aedPerPc = Math.round(totalAed / pcs);
            return {
                pcs: 0,
                type: 'aed_per_pc',
                text: `AED ${aedPerPc} per Pcs`,
                aedPerPc: aedPerPc
            };
        }
    }

    const t = text.toLowerCase();

    // "X pieces per day"
    let m = text.match(/(\d{1,2})\s*(?:pieces?|pcs?)\s*per\s*day/i);
    if (m) {
        const pcs = parseInt(m[1], 10);
        if (pcs >= 1 && pcs <= 30) {
            return { pcs, type: 'daily', text: `${String(pcs).padStart(2, '0')} PCS LAU DAILY` };
        }
    }

    let cleaned = text.replace(/AED\s*\d+(\.\d+)?\s*(net|gst|acc|bb)?/gi, ' ');

    m = cleaned.match(/(?:^|[^\d])([0-9]{1,2})\s*(?:pcs|pieces)\s*[\/@\s]+\s*(?:lau|lan|laundry|daily)/i);
    if (m) {
        const pcs = parseInt(m[1], 10);
        if (pcs >= 1 && pcs <= 30) {
            const isComp = t.includes('comp');
            return { pcs, type: isComp ? 'comp' : 'daily', text: `${String(pcs).padStart(2, '0')} PCS ${isComp ? 'COMP' : 'LAU DAILY'}` };
        }
    }

    m = cleaned.match(/(\d{1,2})\s*pieces?\s*(?:per\s*day|daily)/i);
    if (m) {
        const pcs = parseInt(m[1], 10);
        if (pcs >= 1 && pcs <= 30) {
            return { pcs, type: 'daily', text: `${String(pcs).padStart(2, '0')} PCS LAU DAILY` };
        }
    }

    m = cleaned.match(/incl\.?\s*([0-9]{1,2})\s*(?:pcs|pieces)/i);
    if (m) {
        const pcs = parseInt(m[1], 10);
        if (pcs >= 1 && pcs <= 30) {
            return { pcs, type: 'daily', text: `${String(pcs).padStart(2, '0')} PCS LAU DAILY` };
        }
    }

    m = cleaned.match(/(?:^|[^\d])([0-9]{1,2})\s*(?:pcs|pieces)\s*extra/i);
    if (m) {
        const pcs = parseInt(m[1], 10);
        if (pcs >= 1 && pcs <= 30) {
            return { pcs, type: 'extra', text: `${String(pcs).padStart(2, '0')} PCS EXTRA` };
        }
    }

    if (/hdl[0-9]|laundry|lau\s*daily|laun/i.test(t)) {
        return { pcs: 0, type: 'package', text: 'Laundry Package' };
    }

    return { pcs: 0, type: 'chargeable', text: 'Chargeable' };
}

function extractGuestNameFromText(text) {
    if (!text) return '';
    if (/total\s+rooms|grand\s+total/i.test(text)) return '';
    let m = text.match(/([A-Za-z][A-Za-z\s\-\.\']+,\s*[A-Za-z][A-Za-z\s\-\.\']+\s*(?:MR|Mr|MS|Ms|Mr\.|Ms\.)?)/);
    if (m) {
        let n = m[1].trim();
        if (!/total/i.test(n) && n.length > 3) return n;
    }
    return '';
}

// ═══════════════════════════════════════════════════════════════════
// MASS ENTRY V2 — PARSER PRINCIPAL
// ═══════════════════════════════════════════════════════════════════
async function processTextData(rawData) {
    if (!rawData || !rawData.trim()) {
        alert("No data found to process.");
        return;
    }

    const rawLines = rawData.split('\n');
    const cleanLines = rawLines.filter(l => !isParasiteLine(l));

    let parsedData = [];
    let currentRoom = null;
    let currentGuest = "";
    let currentRoomTyp = "DLXR";
    let currentArrival = "";
    let currentDeparture = "";
    let currentAgency = "Direct";
    let accumulatedText = "";

    const dateRegex = /\b\d{2}\/\d{2}\/\d{4}\b/g;

    function flushCurrentRoom() {
        if (!currentRoom) return;
        const quota = parseQuotaText(accumulatedText);
        const pax = parsePaxMultiplier(accumulatedText);
        const finalPcs = quota.pcs * pax;

        let quotaText = quota.text;
        if (pax > 1 && quota.pcs > 0) {
            quotaText = `${String(finalPcs).padStart(2, '0')} PCS ${quota.type === 'extra' ? 'EXTRA' : 'LAU DAILY'} (×${pax} PAX)`;
        }

        const agencyFromFullText = extractAgencyFromText(accumulatedText);

        parsedData.push({
            room: currentRoom,
            guestName: currentGuest || extractGuestNameFromText(accumulatedText) || 'Unknown Guest',
            roomTyp: currentRoomTyp,
            arrival: currentArrival,
            departure: currentDeparture,
            agency: agencyFromFullText,
            quotaText: quotaText,
            isChargeable: quota.type === 'chargeable',
            isAedPerPc: quota.type === 'aed_per_pc',
            aedPerPc: quota.aedPerPc || 0,
            paxMultiplier: pax,
            fullContext: accumulatedText.toLowerCase()
        });
    }

    cleanLines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        const fmtA = trimmed.match(/^(\d{3,4})\s+([A-Z0-9]{2,6})?/);
        const fmtB = trimmed.match(/^(\d{3,4})(DLXR|PRMR|ROYS|EXCS|EXTW|EXTC|EXTP|VILLA|PREM|ACCR)(B\d)?(\d+)?/i);

        let roomMatch = null;

        if (fmtB && isRoomNumberValid(fmtB[1])) {
            roomMatch = fmtB[1];
        } else if (fmtA && isRoomNumberValid(fmtA[1]) && trimmed.length > 10) {
            roomMatch = fmtA[1];
        }

        if (roomMatch) {
            flushCurrentRoom();

            currentRoom = roomMatch;
            currentGuest = "";
            currentRoomTyp = (fmtA && fmtA[2] && /^[A-Z]{3,6}$/.test(fmtA[2])) ? fmtA[2] : "DLXR";
            currentArrival = "";
            currentDeparture = "";
            currentAgency = "Direct";
            accumulatedText = trimmed;

            currentGuest = extractGuestNameFromText(trimmed);

            const dates = trimmed.match(dateRegex);
            if (dates) {
                currentArrival = dates[0];
                if (dates[1]) currentDeparture = dates[1];
            }
        } else if (currentRoom) {
            accumulatedText += " " + trimmed;

            if (!currentGuest || currentGuest === 'Unknown Guest') {
                const g = extractGuestNameFromText(trimmed);
                if (g) currentGuest = g;
            }

            const dates = trimmed.match(dateRegex);
            if (dates) {
                dates.forEach(d => {
                    if (!currentArrival) currentArrival = d;
                    else if (!currentDeparture && d !== currentArrival) currentDeparture = d;
                });
            }
        }
    });

    flushCurrentRoom();

    const roomMap = new Map();
    parsedData.forEach(item => roomMap.set(item.room, item));
    parsedData = Array.from(roomMap.values());

    if (parsedData.length === 0) {
        alert("Could not automatically map data from this format.");
        return;
    }

    const newPmsDatabase = {};
    const cloudGuestsPayload = [];

    parsedData.forEach(item => {
        newPmsDatabase[item.room] = {
            guestName: item.guestName,
            roomTyp: item.roomTyp,
            arrival: item.arrival,
            departure: item.departure,
            agency: item.agency,
            quotaText: item.quotaText,
            isChargeable: item.isChargeable,
            isAedPerPc: item.isAedPerPc,
            aedPerPc: item.aedPerPc
        };

        cloudGuestsPayload.push({
            room: item.room,
            guest_name: item.guestName,
            room_typ: item.roomTyp,
            arrival: item.arrival,
            departure: item.departure,
            agency: item.agency,
            quota_text: item.quotaText,
            is_chargeable: item.isChargeable
        });
    });

    const oldRooms = Object.keys(pmsDatabase || {});
    const newRooms = Object.keys(newPmsDatabase);

    if (oldRooms.length >= 30 && newRooms.length < 30) {
        const confirmed = confirm(
            `⚠️ SAFETY CHECK\n\n` +
            `Parser found only ${newRooms.length} rooms, but ${oldRooms.length} rooms currently exist.\n\n` +
            `This could mean the PDF parsing failed.\n\n` +
            `Continue anyway? (This will DELETE ${oldRooms.length - newRooms.length} rooms)`
        );
        if (!confirmed) {
            console.warn('[Parser V2] Aborted by user (safety guard)');
            return;
        }
    }

    pmsDatabase = newPmsDatabase;
    sauvegarderPmsLocalStorage();

    if (typeof renderMassPreviewTable === 'function') {
        renderMassPreviewTable();
    }

    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        try {
            const { error: upsertErr } = await supabaseClient
                .from('pms_guests')
                .upsert(cloudGuestsPayload, { onConflict: 'room' });

            if (upsertErr) throw upsertErr;

            const roomsInPdf = new Set(newRooms);
            const roomsToDelete = oldRooms.filter(r => !roomsInPdf.has(r));

            let deletedCount = 0;
            if (roomsToDelete.length > 0) {
                const { error: delErr } = await supabaseClient
                    .from('pms_guests')
                    .delete()
                    .in('room', roomsToDelete);

                if (delErr) throw delErr;
                deletedCount = roomsToDelete.length;
            }

            if (typeof markPmsSynced === 'function') {
                markPmsSynced();
            }

            // 🚨 Mise à jour badge checkout du jour
            if (typeof updateCheckoutTodayBadge === 'function') {
                updateCheckoutTodayBadge();
            }

            const msg = `✅ PMS Updated: ${cloudGuestsPayload.length} room(s) synced` +
                        (deletedCount > 0 ? ` · ${deletedCount} checked out` : '');
            alert(msg);
            console.log('[Parser V2]', msg);

        } catch (e) {
            console.error('[Parser V2] Supabase error:', e);
            alert(`❌ Supabase sync failed: ${e.message}`);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// SPA
// ═══════════════════════════════════════════════════════════════════
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

    const staffSession = (typeof restaurerSessionStaff === 'function')
        ? restaurerSessionStaff()
        : (currentStaffUser || null);

    const staffName = staffSession?.name
        ? `staff ( ${staffSession.name} )`
        : 'pending';

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
        created_by: staffName,
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
    const isNewSpa = (index === -1);

    if (!isNewSpa) {
        cachedSlips[index] = targetRecord;
    } else {
        cachedSlips.unshift(targetRecord);
    }

    sauvegarderDonneesLocalStorage();
    await writeRecordToFile(targetRecord);
    if (typeof chargerLiveOrders === 'function') chargerLiveOrders();

    if (isNewSpa && typeof showUndoToast === 'function') {
        showUndoToast(assignedId, `#${serialNo}`, true);
    } else if (!isNewSpa) {
        const t = document.createElement('div');
        t.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-emerald-950 border border-emerald-800 text-emerald-200 font-bold text-xs px-5 py-3 rounded-2xl shadow-2xl';
        t.innerHTML = `✅ <strong>SPA #${serialNo}</strong> updated`;
        document.body.appendChild(t);
        setTimeout(() => {
            t.style.opacity = '0';
            t.style.transition = 'opacity 0.3s ease';
            setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
        }, 1800);
    }

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

// ═══════════════════════════════════════════════════════════════════
// 🚨 CHECK-OUT TODAY — Aide à la décision (agent + réception)
// ═══════════════════════════════════════════════════════════════════

function getTodayAbuDhabiIso() {
    try {
        const f = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Dubai',
            year: 'numeric', month: '2-digit', day: '2-digit'
        });
        return f.format(new Date());
    } catch (e) {
        const n = new Date();
        return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
    }
}

function getTodayAbuDhabi() {
    try {
        const f = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Dubai',
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
        const p = f.formatToParts(new Date());
        return `${p.find(x => x.type === 'day').value}/${p.find(x => x.type === 'month').value}/${p.find(x => x.type === 'year').value}`;
    } catch (e) {
        const n = new Date();
        return `${String(n.getDate()).padStart(2, '0')}/${String(n.getMonth() + 1).padStart(2, '0')}/${n.getFullYear()}`;
    }
}

let _checkoutDecisionsToday = {};

async function loadCheckoutDecisionsToday() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
    try {
        const today = getTodayAbuDhabiIso();
        const { data, error } = await supabaseClient
            .from('checkout_decisions')
            .select('room, decision')
            .eq('decision_date', today);
        if (error) { console.warn('[CheckoutDecisions] Load error:', error.message); return; }
        _checkoutDecisionsToday = {};
        (data || []).forEach(r => { _checkoutDecisionsToday[r.room] = r.decision; });
        console.log('📋 [CheckoutDecisions] Loaded:', _checkoutDecisionsToday);
    } catch (e) { console.warn('[CheckoutDecisions] Exception:', e); }
}

async function saveCheckoutDecision(room, decision) {
    if (!room || !['wash', 'hold'].includes(decision)) return false;
    const staffName = (typeof currentStaffUser !== 'undefined' && currentStaffUser?.name)
        ? currentStaffUser.name : 'Agent';
    _checkoutDecisionsToday[room] = decision;
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return true;
    try {
        const { error } = await supabaseClient
            .from('checkout_decisions')
            .upsert({
                room: String(room),
                decision_date: getTodayAbuDhabiIso(),
                decision: decision,
                decided_by: staffName,
                decided_at: new Date().toISOString()
            }, { onConflict: 'room,decision_date' });
        if (error) { console.warn('[CheckoutDecisions] Save error:', error.message); return false; }
        console.log(`✅ [CheckoutDecisions] ${room} → ${decision} by ${staffName}`);
        return true;
    } catch (e) { console.warn('[CheckoutDecisions] Exception:', e); return false; }
}

function getCheckoutTodayRooms() {
    if (typeof pmsDatabase === 'undefined' || !pmsDatabase) return [];
    const todayStr = getTodayAbuDhabi();
    const checkoutRooms = [];
    chargerDonneesLocalStorage();
    Object.entries(pmsDatabase).forEach(([room, data]) => {
        if (!data.departure) return;
        if (String(data.departure).trim() !== todayStr) return;
        let laundryStatus = 'No slip yet';
        let slipId = null;
        const slip = cachedSlips.find(s => String(s.room_number || s.room) === String(room) && !s.is_spa);
        if (slip) { laundryStatus = slip.status || 'Collected'; slipId = String(slip.id); }
        checkoutRooms.push({
            room, guestName: data.guestName || 'Unknown Guest',
            roomTyp: data.roomTyp || 'DLXR', agency: data.agency || 'Direct',
            arrival: data.arrival || '---', departure: data.departure,
            quotaText: data.quotaText || 'Chargeable',
            isChargeable: data.isChargeable, isAedPerPc: data.isAedPerPc,
            aedPerPc: data.aedPerPc || 0,
            laundryStatus, slipId,
            decision: _checkoutDecisionsToday[room] || null
        });
    });
    checkoutRooms.sort((a, b) => parseInt(a.room) - parseInt(b.room));
    return checkoutRooms;
}

body.innerHTML = html;
modal.style.display = 'flex';    // ← Force l'affichage
if (navigator.vibrate) navigator.vibrate(30);
function showCheckoutToast() {
    const rooms = getCheckoutTodayRooms();
    if (rooms.length === 0) return;
    const key = `remal_checkout_toast_${getTodayAbuDhabiIso()}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    const pending = rooms.filter(r => !r.decision).length;
    const old = document.getElementById('checkoutToast');
    if (old) old.remove();
    const toast = document.createElement('div');
    toast.id = 'checkoutToast';
    toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 z-[9999] bg-rose-950 border-2 border-rose-700 text-rose-100 font-bold text-xs px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 max-w-md cursor-pointer hover:bg-rose-900 transition';
    toast.onclick = () => {
        toast.remove();
        if (typeof ouvrirCheckoutTodayModal === 'function') ouvrirCheckoutTodayModal();
    };
    toast.innerHTML = `
        <span class="text-2xl">🚨</span>
        <div class="flex-1">
            <div class="text-[13px] font-black text-rose-200 uppercase tracking-wider">Check-Out Alert</div>
            <div class="text-[11px] text-rose-300 mt-0.5 font-medium">
                ${rooms.length} room${rooms.length > 1 ? 's' : ''} check-out today${pending > 0 ? ` · ${pending} à valider avec la réception` : ''}
            </div>
        </div>
        <button onclick="event.stopPropagation(); this.parentElement.remove();" class="text-rose-300 hover:text-rose-100 text-lg font-bold">✕</button>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.4s ease';
            setTimeout(() => toast.remove(), 400);
        }
    }, 12000);
}

async function ouvrirCheckoutTodayModal() {
    const modal = document.getElementById('checkoutTodayModal');
    const body = document.getElementById('checkoutTodayModalBody');
    const countEl = document.getElementById('checkoutTodayCount');
    if (!modal || !body) return;
    await loadCheckoutDecisionsToday();
    const rooms = getCheckoutTodayRooms();
    if (countEl) countEl.textContent = rooms.length;
    if (rooms.length === 0) {
        body.innerHTML = `<p class="text-xs text-stone-500 text-center py-6">✅ No check-outs today.</p>`;
        modal.classList.remove('hidden');
        return;
    }
    let html = '';
    rooms.forEach(item => {
        const sLower = String(item.laundryStatus || '').toLowerCase();
        let statusClass = 'bg-stone-800 text-stone-300 border-stone-700';
        let statusIcon = '📭';
        if (sLower.includes('delivered') || sLower.includes('completed')) {
            statusClass = 'bg-emerald-950 text-emerald-300 border-emerald-800'; statusIcon = '✅';
        } else if (sLower.includes('ready')) {
            statusClass = 'bg-purple-950 text-purple-300 border-purple-800'; statusIcon = '✨';
        } else if (sLower.includes('washing') || sLower.includes('in_progress')) {
            statusClass = 'bg-blue-950 text-blue-300 border-blue-800'; statusIcon = '🧼';
        } else if (sLower.includes('pending') || sLower.includes('collected')) {
            statusClass = 'bg-amber-950 text-amber-300 border-amber-800'; statusIcon = '⏳';
        }
        let quotaBadge = '';
        if (item.isAedPerPc && item.aedPerPc > 0) {
            quotaBadge = `<span class="bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-md text-[10px] font-bold">AED ${item.aedPerPc} / pc</span>`;
        } else if (item.isChargeable) {
            quotaBadge = `<span class="bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded-md text-[10px] font-bold">Chargeable</span>`;
        } else {
            quotaBadge = `<span class="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-md text-[10px] font-bold">${item.quotaText}</span>`;
        }
        let decisionBorder = 'border-rose-900/50';
        let decisionBadge = `<span class="bg-amber-950/50 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded-md text-[10px] font-bold">⚠️ À décider</span>`;
        if (item.decision === 'wash') {
            decisionBorder = 'border-emerald-700/70';
            decisionBadge = `<span class="bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded-md text-[10px] font-black">✅ WASH OK</span>`;
        } else if (item.decision === 'hold') {
            decisionBorder = 'border-rose-700/70';
            decisionBadge = `<span class="bg-rose-950 text-rose-200 border border-rose-700 px-2 py-0.5 rounded-md text-[10px] font-black">⛔ HOLD</span>`;
        }
        html += `
            <div class="p-3 bg-rose-950/20 border-2 ${decisionBorder} rounded-2xl space-y-2">
                <div class="flex justify-between items-start gap-2">
                    <div class="flex-1 min-w-0">
                        <div class="font-bold text-rose-200 text-sm">🏠 Room ${item.room} — ${item.guestName}</div>
                        <div class="text-[10px] text-stone-400 mt-0.5">${item.roomTyp} · ${item.agency}</div>
                        <div class="text-[10px] text-stone-400 mt-0.5">📅 Arr: ${item.arrival} → Dep: <span class="text-rose-400 font-bold">${item.departure}</span></div>
                    </div>
                    <div class="text-right space-y-1 shrink-0">
                        <div>${quotaBadge}</div>
                        <div class="inline-flex items-center gap-1 ${statusClass} border px-2 py-0.5 rounded-md text-[10px] font-bold">${statusIcon} ${item.laundryStatus}</div>
                    </div>
                </div>
                <div class="flex justify-between items-center pt-2 border-t border-rose-900/40">
                    <div>${decisionBadge}</div>
                    <div class="flex gap-2">
                        <button onclick="deciderCheckout('${item.room}', 'wash')" class="px-3 py-1.5 rounded-lg text-[10px] font-bold border border-emerald-700 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/80 transition ${item.decision === 'wash' ? 'ring-2 ring-emerald-500' : ''}">✅ Wash OK</button>
                        <button onclick="deciderCheckout('${item.room}', 'hold')" class="px-3 py-1.5 rounded-lg text-[10px] font-bold border border-rose-700 bg-rose-950/60 text-rose-300 hover:bg-rose-900/80 transition ${item.decision === 'hold' ? 'ring-2 ring-rose-500' : ''}">⛔ Hold</button>
                    </div>
                </div>
            </div>
        `;
    });
  body.innerHTML = html;
modal.style.display = 'flex';    // ← Force l'affichage
if (navigator.vibrate) navigator.vibrate(30);
}

async function deciderCheckout(room, decision) {
    const ok = await saveCheckoutDecision(room, decision);
    if (!ok) { alert('⚠️ Failed to save decision.'); return; }
    if (navigator.vibrate) navigator.vibrate(15);
    await ouvrirCheckoutTodayModal();
    updateCheckoutTodayBadge();
}

function fermerCheckoutTodayModal() {
    const m = document.getElementById('checkoutTodayModal');
    if (m) m.classList.add('hidden');
}

function imprimerCheckoutToday() {
    const rooms = getCheckoutTodayRooms();
    if (rooms.length === 0) { alert('No rooms to print.'); return; }
    const todayStr = getTodayAbuDhabi();
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const staffName = (typeof currentStaffUser !== 'undefined' && currentStaffUser?.name) ? currentStaffUser.name : 'Agent';
    let rowsHtml = '';
    rooms.forEach(item => {
        let decision = 'À décider';
        if (item.decision === 'wash') decision = '✅ WASH OK';
        else if (item.decision === 'hold') decision = '⛔ HOLD';
        let quotaText = '';
        if (item.isAedPerPc && item.aedPerPc > 0) quotaText = `AED ${item.aedPerPc}/pc`;
        else if (item.isChargeable) quotaText = 'Chargeable';
        else quotaText = item.quotaText || 'Included';
        rowsHtml += `<tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:8px;font-weight:bold;text-align:center;">${item.room}</td>
            <td style="padding:8px;">${item.guestName}<br><span style="font-size:9px;color:#78716c;">${item.agency}</span></td>
            <td style="padding:8px;text-align:center;">${item.departure}</td>
            <td style="padding:8px;text-align:center;">${item.laundryStatus}</td>
            <td style="padding:8px;text-align:center;">${quotaText}</td>
            <td style="padding:8px;text-align:center;font-weight:bold;">${decision}</td>
        </tr>`;
    });
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Check-Out Today — ${todayStr}</title>
<style>*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
body{font-family:Arial,sans-serif;padding:20px;color:#1c1917;}
h1{font-family:Georgia,serif;letter-spacing:3px;margin:0;font-size:20px;}
table{width:100%;border-collapse:collapse;margin-top:16px;font-size:11px;}
th{background:#1c1917;color:white;padding:10px 8px;font-size:9px;letter-spacing:1px;text-transform:uppercase;}</style></head>
<body>
<div style="border-bottom:3px solid #DCA773;padding-bottom:10px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:flex-end;">
<div><h1>REMAL HOTEL &amp; VILLAS</h1><p style="margin:4px 0 0 0;font-size:9px;letter-spacing:2px;color:#78716c;text-transform:uppercase;">Al Ruwais City · Abu Dhabi</p></div>
<div style="text-align:right;"><div style="background:#7f1d1d;color:white;padding:5px 12px;border-radius:6px;font-size:10px;font-weight:bold;">🚨 CHECK-OUT TODAY</div>
<p style="margin:6px 0 0 0;font-size:10px;color:#57534e;">${todayStr} — ${timeFormatted}</p></div></div>
<div style="background:#fef2f2;border-left:4px solid #dc2626;padding:10px 14px;border-radius:8px;margin-bottom:12px;font-size:11px;">
<strong>⚠️ ${rooms.length} room(s) checking out today.</strong> Coordinate with reception before washing.</div>
<table><thead><tr><th>Room</th><th>Guest / Agency</th><th>Departure</th><th>Laundry</th><th>Quota</th><th>Decision</th></tr></thead>
<tbody>${rowsHtml}</tbody></table>
<div style="margin-top:24px;display:flex;justify-content:space-between;font-size:10px;color:#57534e;">
<div>Prepared by: <strong>${staffName}</strong></div>
<div>Received by Front Desk: _________________</div></div>
</body></html>`;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { alert('⚠️ Popup blocked. Please allow popups.'); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 400);
}

window.updateCheckoutTodayBadge = updateCheckoutTodayBadge;
window.getCheckoutTodayRooms = getCheckoutTodayRooms;
window.getTodayAbuDhabi = getTodayAbuDhabi;
window.getTodayAbuDhabiIso = getTodayAbuDhabiIso;
window.saveCheckoutDecision = saveCheckoutDecision;
window.loadCheckoutDecisionsToday = loadCheckoutDecisionsToday;
window.showCheckoutToast = showCheckoutToast;
window.ouvrirCheckoutTodayModal = ouvrirCheckoutTodayModal;
window.deciderCheckout = deciderCheckout;
window.fermerCheckoutTodayModal = fermerCheckoutTodayModal;
window.imprimerCheckoutToday = imprimerCheckoutToday;

setInterval(() => {
    if (typeof updateCheckoutTodayBadge === 'function') updateCheckoutTodayBadge();
}, 60000);

setInterval(() => {
    if (typeof updateCheckoutTodayBadge === 'function') updateCheckoutTodayBadge();
}, 60000);

document.addEventListener('DOMContentLoaded', async () => {
    setTimeout(async () => {
        // 1. Charger pmsDatabase depuis Supabase si vide
        if (!pmsDatabase || Object.keys(pmsDatabase).length === 0) {
            await loadPmsFromSupabase();
        }
        // 2. Charger les décisions du jour
        await loadCheckoutDecisionsToday();
        // 3. Update badge
        updateCheckoutTodayBadge();
        // 4. Toast si checkouts
        showCheckoutToast();
    }, 3000);
});
console.log('✅ [laundry.js] Loaded — Agency V9 + Quota V4 + Checkout Today');
// ═══════════════════════════════════════════════════════════════════
// ☁️ LOAD PMS FROM SUPABASE — Recharge pmsDatabase depuis la table pms_guests
// Utilisé au démarrage + auto-refresh si pmsDatabase est vide
// ═══════════════════════════════════════════════════════════════════
async function loadPmsFromSupabase() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) {
        console.warn('[PMS Load] Supabase not available');
        return false;
    }

    try {
        const { data, error } = await supabaseClient
            .from('pms_guests')
            .select('*')
            .order('room', { ascending: true });

        if (error) {
            console.warn('[PMS Load] Supabase error:', error.message);
            return false;
        }

        if (!data || data.length === 0) {
            console.log('[PMS Load] No data in pms_guests');
            return false;
        }

        // Remplir pmsDatabase
        pmsDatabase = {};
        data.forEach(g => {
            pmsDatabase[String(g.room)] = {
                guestName: g.guest_name || g.guestName || 'Unknown Guest',
                roomTyp: g.room_typ || g.roomTyp || 'DLXR',
                arrival: g.arrival || '',
                departure: g.departure || '',
                agency: g.agency || 'Direct',
                quotaText: g.quota_text || g.quotaText || 'Chargeable',
                isChargeable: g.is_chargeable !== undefined ? g.is_chargeable : true,
                isAedPerPc: (g.quota_text || '').toLowerCase().includes('aed') && (g.quota_text || '').toLowerCase().includes('per pcs'),
                aedPerPc: 0
            };
        });

        sauvegarderPmsLocalStorage();
        console.log(`☁️ [PMS Load] ${data.length} rooms loaded from Supabase`);

        // Refresh badge + table si présents
        if (typeof updateCheckoutTodayBadge === 'function') {
            updateCheckoutTodayBadge();
        }
        if (typeof renderMassPreviewTable === 'function') {
            renderMassPreviewTable();
        }

        return true;
    } catch (e) {
        console.warn('[PMS Load] Exception:', e);
        return false;
    }
}

window.loadPmsFromSupabase = loadPmsFromSupabase;

// ═══════════════════════════════════════════════════════════════════
// 🔄 REFRESH CHECKOUT BADGE — Recharge pmsDatabase si vide puis update badge
// ═══════════════════════════════════════════════════════════════════
async function refreshCheckoutBadgeWithCloud() {
    // Si pmsDatabase est vide → charger depuis Supabase
    if (!pmsDatabase || Object.keys(pmsDatabase).length === 0) {
        console.log('🔄 [Checkout] pmsDatabase empty → loading from Supabase...');
        await loadPmsFromSupabase();
    }

    // Update le badge
    if (typeof updateCheckoutTodayBadge === 'function') {
        updateCheckoutTodayBadge();
    }
}

window.refreshCheckoutBadgeWithCloud = refreshCheckoutBadgeWithCloud;
