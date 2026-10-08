// =============================================================
// LOGIQUE MÉTIER BLANCHISSERIE, SPA & TRAITEMENTS DONNÉES (UNIFIÉ)
// ⚠️ Chargé AVANT ui.js
// ✅ MASS ENTRY V2 — Parser PMS robuste
// ✅ AGENCY V8 — Arrêt strict après mot-clé (fin des codes parasites)
// ✅ QUOTA V3 — "X pieces per day for AED Y" → X PCS
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
    'HONEYWELL MIDDLE EAST LIMITED', 'Fertiglobe Holding Investment Limited',
    'HONEYWELL MIDDLE EAST', 'Toshiba Energy Systems & Services Gulf',
    'SAMSUNG E & ADNOC WASTE HEAT RECOVERY PROJECT',
    'OMV Downstream Middle East & Asia', 'Tazweed for Oil Field Services',
    'Power Mech Projects Limited', 'Rotary Engineering Pte Ltd',
    'Siemens Industrial LLC', 'Bureau Veritas', 'WebBeds FZ LLC',
    'GHQ Moral Guidance', 'ADNOC GAS PROCESSING', 'ADNOC REFINING',
    'ADNOC GS & A', 'Homat Al Watan', 'INCO GROUP OF COMPANIES',
    'HABSHAN TRADING COMPANY', 'Excelerate Energy Inc', 'Hunter Tourism LLC',
    'Borouge 4 LLC', 'Borouge LLC', 'Siemens Energy', 'Generation 5',
    'EXPEDIA', 'Booking.com', 'ETIMAD', 'FERTIL', 'CEGSPA', 'AXEN GROUP',
    'AXEN FALAJ', 'alfalaval', 'fbmhudson', 'Qateintl.com', 'Direct Booking',
    'ERTH Staff', 'IPCO',
    // Mots-clés génériques (fallback)
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
// AGENCY V8 — Extraction par mot-clé + arrêt strict
// Corrige : "FERTIL Pay By" → "FERTIL"
//           "Power Mech Projects Limited BBF" → "Power Mech Projects Limited"
//           "OTA EXPEDIA RM" → "EXPEDIA"
// ═══════════════════════════════════════════════════════════════════
function extractAgencyFromText(text) {
    if (!text || typeof text !== 'string') return 'Direct';

    // Normalisation
    let normalized = text
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([a-zA-Z])(\d)/g, '$1 $2')
        .replace(/(\d)([a-zA-Z])/g, '$1 $2')
        .replace(/\s+/g, ' ')
        .trim();

    // ═══ ÉTAPE 1 : Trouver le mot-clé company le PLUS LONG ═══
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

    // ═══ ÉTAPE 2 : Prendre 40 caractères AVANT pour le préfixe ═══
    const beforeStart = Math.max(0, bestIndex - 40);
    const prefix = normalized.substring(beforeStart, bestIndex);

    // ═══ ÉTAPE 3 : Prendre MAX 2 mots APRÈS (extensions légitimes uniquement) ═══
    const afterKeyword = normalized.substring(bestIndex + bestKeyword.length);
    const afterWords = afterKeyword.trim().split(/\s+/).filter(w => w.length > 0);
    const LEGIT_EXTENSIONS = ['LLC', 'Ltd', 'LTD', 'Limited', 'LIMITED', 'Inc', 'Inc.',
                              'W.L.L', 'w.l.l', 'Corp', 'CORP', 'Group', 'GROUP',
                              'Company', 'COMPANY', 'Pte', 'PTE', 'Gulf',
                              'Services', 'SERVICES', 'Systems', 'SYSTEMS', 'Holding',
                              'HOLDING', 'Trading', 'TRADING', 'Refining', 'Processing',
                              'Engineering', 'Industrial', 'Solutions', 'International',
                              'Global', 'FALAJ'];
    let extension = '';
    for (let i = 0; i < Math.min(2, afterWords.length); i++) {
        const w = afterWords[i];
        if (LEGIT_EXTENSIONS.includes(w) || LEGIT_EXTENSIONS.includes(w.replace(/\.$/, ''))) {
            extension += ' ' + w;
        } else {
            break;
        }
    }

    // ═══ ÉTAPE 4 : Reconstruire ═══
    let candidate = (prefix + bestKeyword + extension).trim();

    // ═══ ÉTAPE 5 : Nettoyage strict ═══
    candidate = candidate
        .replace(/\b\d{2}\/\d{2}\/\d{4}\b/g, ' ')
        .replace(/\b\d{3,6}\b/g, ' ')
        .replace(/\b(BBLA|HBDL|HDL4|HD40|FB24|FB40|BB|HB|FB|BF|LD|HDL|HD|RMLA|ROYS|RO)\b/gi, ' ')
        .replace(/\b(CORP|STAH|WALK|OIL|CITY|NORM|REG|FIT|HOUS|GHQ)\b/gi, ' ')
        .replace(/\b(CASH|VISA|HU|AED|USD|EUR|VCC|NET|GST)\b/gi, ' ')
        .replace(/\b(RMON|OTA1|ADN2|ADN|B4HB|B4RO|VROM|GDEL|BBF|BBF RM|RM|MCR|CO)\b/gi, ' ')
        .replace(/\b(B\d|V\d)\b/gi, ' ')
        .replace(/\b(DLXR|PRMR|EXCS|EXTW|VILLA|PREM|ACCR)\b/gi, ' ')
        .replace(/\b(Mr\.|Ms\.|Mrs\.|Dr\.|MR|MS|MRS|DR)\b/g, ' ')
        .replace(/\b(PX|PAX|HB|FB|BB|BF|LD)\b/gi, ' ')
        // Enlever "Pay By", "OTA", "BBF", "RM", "MCR", "CO", "ST"
        .replace(/\b(Pay By|OTA|BBF|RM|MCR|CO|ST|VCC)\b/gi, ' ')
        // Enlever doublons (ex: "ETIMAD etimad")
        .replace(/\b(\w+)\s+\1\b/gi, '$1')
        // Enlever les nombres isolés
        .replace(/\b\d+(\.\d+)?\b/g, ' ')
        // Symboles
        .replace(/[\(\)\[\]<>«»\/\|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // ═══ ÉTAPE 6 : Si virgule → retirer avant ═══
    if (candidate.includes(',')) {
        const commaIdx = candidate.indexOf(',');
        candidate = candidate.substring(commaIdx + 1).trim();
        candidate = candidate.replace(/^[A-Za-z]+\s+(MR|MS|MRS|Mr\.|Ms\.|Mrs\.)\s+/i, '');
    }

    // ═══ ÉTAPE 7 : Validation ═══
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
// QUOTA V3
// ═══════════════════════════════════════════════════════════════════
function parseQuotaText(text) {
    if (!text) return { pcs: 0, type: 'chargeable', text: 'Chargeable' };
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

        // AGENCY V8 : ré-extraire depuis le texte complet
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

    // Déduplication par room
    const roomMap = new Map();
    parsedData.forEach(item => roomMap.set(item.room, item));
    parsedData = Array.from(roomMap.values());

    if (parsedData.length === 0) {
        alert("Could not automatically map data from this format.");
        return;
    }

    // Construction payload
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
            isChargeable: item.isChargeable
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

    // Garde-fou anti-catastrophe
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

    // Mise à jour locale
    pmsDatabase = newPmsDatabase;
    sauvegarderPmsLocalStorage();

    if (typeof renderMassPreviewTable === 'function') {
        renderMassPreviewTable();
    }

    // Sync Supabase
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

console.log('✅ [laundry.js] Loaded with Agency V8 + Quota V3');
