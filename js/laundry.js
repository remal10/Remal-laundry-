// =============================================================
// LOGIQUE MÉTIER BLANCHISSERIE, SPA & TRAITEMENTS DONNÉES (UNIFIÉ)
// ⚠️ Ce fichier est chargé AVANT ui.js — les doublons de fonctions
//    (updateQty, chargerDonneesLocalStorage, etc.) sont écrasés par ui.js.
//    Seules les fonctions UNIQUES à ce fichier sont actives.
// ✅ Aligné sur la logique created_by de ui.js : 'staff ( nom )' ou 'pending'
// ✅ MASS ENTRY V2 — Parser PMS robuste (PAX multiplier + Quota + Filtres)
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
    // ✅ Phase 1.2 — Dégradation gracieuse
    // Niveau 1 : 90 derniers jours
    const ilYa90Jours = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const slips90j = cachedSlips.filter(s => s.created_at && s.created_at >= ilYa90Jours);
    
    try {
        localStorage.setItem('remal_laundry_slips', JSON.stringify(slips90j));
        return;
    } catch (e) {
        console.warn("⚠️ [Storage] localStorage plein à 90j, réduction à 30j");
    }

    // Niveau 2 : 30 derniers jours
    const ilYa30Jours = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const slips30j = cachedSlips.filter(s => s.created_at && s.created_at >= ilYa30Jours);
    
    try {
        localStorage.setItem('remal_laundry_slips', JSON.stringify(slips30j));
        return;
    } catch (e) {
        console.warn("⚠️ [Storage] localStorage plein à 30j, réduction à 100 records");
    }

    // Niveau 3 : 100 records les plus récents
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
// ⚠️ NOTE : cette fonction n'est plus appelée par le bouton Save 
// (ui.js:sauvegarderBordereauDepuisFormulaire() prend le relais).
// Conservée pour compatibilité legacy — alignée sur la logique ui.js.
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

    // ✅ ALIGNÉ SUR ui.js : restaure la session + fallback 'pending'
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

// ═══════════════════════════════════════════════════════════════════
// MASS ENTRY V2 — HELPERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Detect parasite lines: page numbers, tables of "1 1 1", headers, footers
 */
function isParasiteLine(line) {
    const t = line.trim();
    if (!t || t.length < 3) return true;

    // Pattern "1 1 1 1 1 1..." (artefact pdf.js)
    const digitsRatio = (t.match(/\d/g) || []).length / t.length;
    if (digitsRatio > 0.7 && t.length > 20) return true;

    const lower = t.toLowerCase();

    // Footers / headers Prologic
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

    // Header colonnes
    if (/^(room|block|id\/check|guest last|company\/agent|arrival|mrkt|pax|terms|plan)/i.test(t)) return true;

    return false;
}

/**
 * Normalize a date "05/10/2026" → "2026-10-05" (ISO sortable) or return original
 */
function normalizePmsDate(str) {
    if (!str) return '';
    const m = String(str).match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!m) return str;
    return `${m[3]}-${m[2]}-${m[1]}`;
}

/**
 * Detect PAX multiplier from text like "02-PAX", "1 PX", "10- PAX"
 * Returns 1 if not found.
 */
function parsePaxMultiplier(text) {
    if (!text) return 1;
    // "02-PAX", "2-PAX", "10- PAX", "1 PX", "02 PAX"
    const m = text.match(/(?:^|[\s\-\(])0*([1-9]\d?)\s*[\-\s]?\s*(?:px|pax)(?=[\s\-\)\,]|$)/i);
    if (m) {
        const n = parseInt(m[1], 10);
        if (n >= 1 && n <= 10) return n;
    }
    return 1;
}

/**
 * Parse laundry quota from text.
 * Returns { pcs: number, type: 'daily'|'extra'|'comp'|'package'|'chargeable', text: string }
 */
function parseQuotaText(text) {
    if (!text) return { pcs: 0, type: 'chargeable', text: 'Chargeable' };
    const t = text.toLowerCase();

    // ═══ Pattern 1 : "03PCS/LAU DAILY", "04PCS/LAU@10++", "5PCS LAU 10++" ═══
    let m = text.match(/(?:^|[^\d])([0-9]{1,2})\s*(?:pcs|pieces)\s*[\/@\s]+\s*(?:lau|lan|laundry|daily)/i);
    if (m) {
        const pcs = parseInt(m[1], 10);
        if (pcs >= 1 && pcs <= 30) {
            const isComp = t.includes('comp');
            return { pcs, type: isComp ? 'comp' : 'daily', text: `${String(pcs).padStart(2, '0')} PCS ${isComp ? 'COMP' : 'LAU DAILY'}` };
        }
    }

    // ═══ Pattern 2 : "INCL.5PCS LAU", "INCL 5 PCS" ═══
    m = text.match(/incl\.?\s*([0-9]{1,2})\s*(?:pcs|pieces)/i);
    if (m) {
        const pcs = parseInt(m[1], 10);
        if (pcs >= 1 && pcs <= 30) {
            return { pcs, type: 'daily', text: `${String(pcs).padStart(2, '0')} PCS LAU DAILY` };
        }
    }

    // ═══ Pattern 4 : "X PCS EXTRA" ═══
    m = text.match(/(?:^|[^\d])([0-9]{1,2})\s*(?:pcs|pieces)\s*extra/i);
    if (m) {
        const pcs = parseInt(m[1], 10);
        if (pcs >= 1 && pcs <= 30) {
            return { pcs, type: 'extra', text: `${String(pcs).padStart(2, '0')} PCS EXTRA` };
        }
    }

    // ═══ Fallback : mention laundry mais sans chiffre précis ═══
    if (/hdl[0-9]|laundry|lau\s*daily|laun/i.test(t)) {
        return { pcs: 0, type: 'package', text: 'Laundry Package' };
    }

    return { pcs: 0, type: 'chargeable', text: 'Chargeable' };
}

/**
 * Extract guest name from a text chunk (Last,First Mr./Ms.)
 */
function extractGuestNameFromText(text) {
    if (!text) return '';
    if (/total\s+rooms|grand\s+total/i.test(text)) return '';
    // Pattern principal : "Last,First Mr./Ms."
    let m = text.match(/([A-Za-z][A-Za-z\s\-\.\']+,\s*[A-Za-z][A-Za-z\s\-\.\']+\s*(?:MR|Mr|MS|Ms|Mr\.|Ms\.)?)/);
    if (m) {
        let n = m[1].trim();
        if (!/total/i.test(n) && n.length > 3) return n;
    }
    return '';
}

/**
 * Detect a company / agency from text chunk
 */
/**
 * Detect a company / agency from text chunk — VERSION ROBUSTE V2
 * Gère les lignes collées (pas de séparateur \s{2,} ou \t) et 
 * remonte le nom complet avant le mot-clé (ex: "Excelerate Energy Inc").
 */
/**
 * Extract Company / Agent Group from a text line — VERSION V3 FIDÈLE
 * Stratégie : extraire le texte entre la FIN DU NOM DU GUEST et la 1ère DATE
 * 
 * Format réel du PDF :
 *   [guest + Mr./Ms.]  [COMPANY/AGENT]  [arrival JJ/MM/YYYY]  [mrkt]  [PAX]  ...
 * 
 * Exemples :
 *   "115 DLXR B1 161397 47307 Duraikkannan,Nandhakuma Mr. Fertiglobe Holding Investment Limited 05/10/2026 OIL 1/0/0..."
 *   → Company = "Fertiglobe Holding Investment Limited"
 *   
 *   "109DLXRB1160801Bade,Sakib Dild Mr.Excelerate Energy Inc29/09/2026CORP1/0/0..."
 *   → Company = "Excelerate Energy Inc"
 *   
 *   "133 DLXR B1 161689 47337 Alotaiba,Otaiba You Mr. FERTIL 07/10/2026 OIL 1/0/0..."
 *   → Company = "FERTIL"
 */
function extractAgencyFromText(text) {
    if (!text || typeof text !== 'string') return 'Direct';

    // ═══════════════════════════════════════════════════════════════
    // ÉTAPE 0 — Normalisation : insérer des espaces dans le texte collé
    // ═══════════════════════════════════════════════════════════════
    let normalized = text
        // "Mr.Excelerate" → "Mr. Excelerate"
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        // "Inc29/09" → "Inc 29/09"
        .replace(/([a-zA-Z])(\d)/g, '$1 $2')
        // "5Mr." → "5 Mr."
        .replace(/(\d)([a-zA-Z])/g, '$1 $2')
        // Nettoyer les espaces multiples
        .replace(/\s+/g, ' ')
        .trim();

    // ═══════════════════════════════════════════════════════════════
    // ÉTAPE 1 — Trouver la position de FIN du nom du guest
    // ═══════════════════════════════════════════════════════════════
    let guestEndIndex = -1;
    const lower = normalized.toLowerCase();

    // Pattern prioritaire : chercher le dernier titre (Mr. / Ms. / MR / MS / MRS)
    // suivi d'un espace, puis d'un caractère
    const titlePatterns = [
        /\bMr\.\s/gi, /\bMs\.\s/gi, /\bMrs\.\s/gi, /\bDr\.\s/gi,
        /\bMR\s/gi,  /\bMS\s/gi,  /\bMRS\s/gi,  /\bDR\s/gi
    ];

    let lastTitleMatch = null;
    for (const pat of titlePatterns) {
        let m;
        while ((m = pat.exec(normalized)) !== null) {
            if (!lastTitleMatch || m.index > lastTitleMatch.index) {
                lastTitleMatch = { index: m.index, length: m[0].length };
            }
        }
    }

    if (lastTitleMatch) {
        guestEndIndex = lastTitleMatch.index + lastTitleMatch.length;
    }

    // ═══════════════════════════════════════════════════════════════
    // ÉTAPE 2 — Trouver la position de la 1ère DATE (arrival)
    // ═══════════════════════════════════════════════════════════════
    const dateMatch = normalized.match(/\b\d{2}\/\d{2}\/\d{4}\b/);
    let dateStartIndex = dateMatch ? dateMatch.index : -1;

    // ═══════════════════════════════════════════════════════════════
    // ÉTAPE 3 — Extraire le texte entre guestEnd et dateStart
    // ═══════════════════════════════════════════════════════════════
    let candidate = '';

    if (guestEndIndex > 0 && dateStartIndex > guestEndIndex) {
        candidate = normalized.substring(guestEndIndex, dateStartIndex).trim();
    } else if (guestEndIndex > 0) {
        // Pas de date après le titre → prendre le reste de la ligne
        candidate = normalized.substring(guestEndIndex).trim();
    } else if (dateStartIndex > 0) {
        // Pas de titre trouvé → prendre 60 caractères avant la date
        const start = Math.max(0, dateStartIndex - 60);
        candidate = normalized.substring(start, dateStartIndex).trim();
        // Nettoyer les mots parasites en début
        candidate = candidate.replace(/^[\d\s\-\/\.]+/, '').trim();
    }

    // ═══════════════════════════════════════════════════════════════
    // ÉTAPE 4 — Nettoyage du candidat
    // ═══════════════════════════════════════════════════════════════
    candidate = candidate
        // Enlever le contenu entre parenthèses qui pourrait rester
        .replace(/\([^)]*\)/g, '')
        // Enlever les codes identifiants en début (Id/Check in, Confirm #, etc.)
        .replace(/^\s*\d{4,}\s+/, '')
        .replace(/^\s*\d{4,}\s+/, '')
        // Enlever les codes comme "B1", "B2"
        .replace(/\bB\d\b/g, '')
        // Enlever les nombres isolés
        .replace(/\b\d+\b/g, '')
        // Enlever les codes mrkt (OIL, CORP, REG, NORM, CITY, RMON, STAH, WALK, HOUS, FIT, GHQ, VILA, VISA, CASH, AED, USD, etc.)
        .replace(/\b(OIL|CORP|REG|NORM|CITY|RMON|STAH|WALK|HOUS|FIT|GHQ|VILA|VISA|CASH|AED|USD|EUR|B4HB|B4RO|OTA1|ADN2|ADNZ|CC\d+|GG\d+|GDE[L]?|RMON|VROM|VRMO)\b/gi, '')
        // Enlever les codes de plan (FB24, HDL4, HD40, BBLA, HBDL, RMON, RM LA, etc.)
        .replace(/\b(FB24|HDL4|HD40|BBLA|HBDL|RMLA|BB|HD\d+|FB\d+)\b/gi, '')
        // Enlever les termes booking.com / expedia isolés (mais on les GARDE s'ils sont la seule company)
        // Enlever caractères spéciaux en début/fin
        .replace(/^[\s\-\.,;:]+|[\s\-\.,;:]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    // ═══════════════════════════════════════════════════════════════
    // ÉTAPE 5 — Validation
    // ═══════════════════════════════════════════════════════════════
    
    // Si le candidat est vide, trop court, ou est un nom de guest (contient une virgule), 
    // → fallback sur un pattern direct dans le texte
    if (!candidate || candidate.length < 3 || candidate.includes(',')) {
        // Fallback : chercher un mot long en MAJUSCULES (typique des companies courtes comme FERTIL, CEGSPA)
        const capsMatch = text.match(/\b([A-Z]{3,}(?:\s+[A-Z]{2,})*)\b/g);
        if (capsMatch) {
            const BLOCKED = [
                'DLXR','PRMR','ROYS','EXCS','EXTW','VILLA','PREM','BBLA','HBDL','HDL4','HD40','FB24',
                'CORP','STAH','WALK','OIL','CITY','NORM','REG','MR','MS','MRS','DR','PX','HB','FB',
                'BF','LD','DXR','AED','GST','ACC','B4HB','B4RO','VISARMON','CASHRMON','CASH','VISA',
                'HU','OTA1','ADN2','CC','GG','B1','B2','RMON','VILA','GHQ','NET','FB40','FB RATE',
                'PO','CHECK','IN','CHECKOUT','LONG','STAY','NIGHT','NIGHTS','ROOM','ONLY','NUMBER',
                'TOTAL','ROOMS','PAX','PRINTED','PROLOGIC','FIRST','INHOUSE','GUEST','LIST','HOTEL',
                'REMAL','VEHICLE','CONFIRM','BILLING','INSTRUCTIONS','GROUP','DEPARTURE','CLASS',
                'TEXT','PLAN','BALANCE','CHANNEL','ACTIVITY','INCLUSIVE','DESCRIPTION','FROM','TO'
            ];
            // Priorité : mots ≥ 4 lettres, en majuscules, pas dans blocked
            const validCaps = capsMatch
                .map(c => c.trim())
                .filter(c => c.length >= 4 && !BLOCKED.includes(c.toUpperCase()))
                .filter(c => !/^\d+$/.test(c));
            
            if (validCaps.length > 0) {
                // Prendre le plus long (le plus probable d'être la company)
                validCaps.sort((a, b) => b.length - a.length);
                return validCaps[0];
            }
        }
        return 'Direct';
    }

    // Tronquer à 80 caractères max
    if (candidate.length > 80) candidate = candidate.substring(0, 80).trim();

    // Filtrer les mots parasites à la fin
    candidate = candidate
        .replace(/\s+(HARV|SGL|DBL|ACCT|RO|Net|NET|FB|HB|SALE|COMPANY|ACCOUNT|FOLLOW|ORGANIZATION)$/i, '')
        .trim();

    return candidate || 'Direct';
}

window.extractAgencyFromText = extractAgencyFromText;
// ═══════════════════════════════════════════════════════════════════
// MASS ENTRY V2 — PARSER PRINCIPAL
// ═══════════════════════════════════════════════════════════════════

async function processTextData(rawData) {
    if (!rawData || !rawData.trim()) {
        alert("No data found to process.");
        return;
    }

    // ═══════════════════════════════════════════════════════════════
    // ÉTAPE 1 — Pré-nettoyage : split + filtre parasites
    // ═══════════════════════════════════════════════════════════════
    const rawLines = rawData.split('\n');
    const cleanLines = rawLines.filter(l => !isParasiteLine(l));

    // ═══════════════════════════════════════════════════════════════
    // ÉTAPE 2 — Parsing ligne par ligne (2 formats supportés)
    // ═══════════════════════════════════════════════════════════════
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

        parsedData.push({
            room: currentRoom,
            guestName: currentGuest || extractGuestNameFromText(accumulatedText) || 'Unknown Guest',
            roomTyp: currentRoomTyp,
            arrival: currentArrival,
            departure: currentDeparture,
            agency: currentAgency,
            quotaText: quotaText,
            isChargeable: quota.type === 'chargeable',
            paxMultiplier: pax,
            fullContext: accumulatedText.toLowerCase()
        });
    }

    cleanLines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // ═══ Format A : "115 DLXR B1 161397 ..." ═══
        // ═══ Format B : "109DLXRB1160801Bade,Sakib..." ═══
        const fmtA = trimmed.match(/^(\d{3,4})\s+([A-Z0-9]{2,6})?/);
        const fmtB = trimmed.match(/^(\d{3,4})(DLXR|PRMR|ROYS|EXCS|EXTW|EXTC|EXTP|VILLA|PREM)(B\d)?(\d+)?/i);

        let roomMatch = null;
        let remainder = trimmed;

        if (fmtB && isRoomNumberValid(fmtB[1])) {
            roomMatch = fmtB[1];
            remainder = trimmed.substring(fmtB[0].length);
        } else if (fmtA && isRoomNumberValid(fmtA[1]) && trimmed.length > 10) {
            roomMatch = fmtA[1];
            remainder = trimmed.substring(fmtA[0].length);
        }

        if (roomMatch) {
            // Flush précédente
            flushCurrentRoom();

            // Nouvelle chambre
            currentRoom = roomMatch;
            currentGuest = "";
            currentRoomTyp = (fmtA && fmtA[2] && /^[A-Z]{3,6}$/.test(fmtA[2])) ? fmtA[2] : "DLXR";
            currentArrival = "";
            currentDeparture = "";
            currentAgency = "Direct";
            accumulatedText = trimmed;

            // Extraction guest depuis cette ligne
            currentGuest = extractGuestNameFromText(trimmed);

            // Extraction agency
            const ag = extractAgencyFromText(trimmed);
            if (ag !== 'Direct') currentAgency = ag;

            // Extraction dates
            const dates = trimmed.match(dateRegex);
            if (dates) {
                currentArrival = dates[0];
                if (dates[1]) currentDeparture = dates[1];
            }
        } else if (currentRoom) {
            // Ligne de continuation
            accumulatedText += " " + trimmed;

            // Guest si pas encore trouvé
            if (!currentGuest || currentGuest === 'Unknown Guest') {
                const g = extractGuestNameFromText(trimmed);
                if (g) currentGuest = g;
            }

            // Agency si pas encore trouvée
            if (currentAgency === 'Direct') {
                const ag = extractAgencyFromText(trimmed);
                if (ag !== 'Direct') currentAgency = ag;
            }

            // Dates
            const dates = trimmed.match(dateRegex);
            if (dates) {
                dates.forEach(d => {
                    if (!currentArrival) currentArrival = d;
                    else if (!currentDeparture && d !== currentArrival) currentDeparture = d;
                });
            }
        }
    });

    // Flush final
    flushCurrentRoom();

    // ═══════════════════════════════════════════════════════════════
    // ÉTAPE 3 — Déduplication par room (dernière occurrence gagne)
    // ═══════════════════════════════════════════════════════════════
    const roomMap = new Map();
    parsedData.forEach(item => roomMap.set(item.room, item));
    parsedData = Array.from(roomMap.values());

    if (parsedData.length === 0) {
        alert("Could not automatically map data from this format.");
        return;
    }

    // ═══════════════════════════════════════════════════════════════
    // ÉTAPE 4 — Construction payload + UPSERT + DELETE orphelins
    // ═══════════════════════════════════════════════════════════════
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

    // ═══ Garde-fou anti-catastrophe ═══
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

    // ═══ Mise à jour locale immédiate ═══
    pmsDatabase = newPmsDatabase;
    sauvegarderPmsLocalStorage();

    if (typeof renderMassPreviewTable === 'function') {
        renderMassPreviewTable();
    }

    // ═══ Sync Supabase (UPSERT batch + DELETE orphelins) ═══
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        try {
            // 1. UPSERT batch
            const { error: upsertErr } = await supabaseClient
                .from('pms_guests')
                .upsert(cloudGuestsPayload, { onConflict: 'room' });

            if (upsertErr) throw upsertErr;

            // 2. DELETE orphelins (chambres présentes avant, disparues du nouveau PDF)
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

            // 3. Timestamp
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

    // ✅ ALIGNÉ SUR ui.js : restaure la session + fallback 'pending'
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

    // ✨ PHASE E.5 : Undo sur nouvelle création SPA
    if (isNewSpa && typeof showUndoToast === 'function') {
        showUndoToast(assignedId, `#${serialNo}`, true);
    } else if (!isNewSpa) {
        // Update SPA → feedback simple
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
