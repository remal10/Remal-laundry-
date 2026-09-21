// ═══════════════════════════════════════════════════════════════════
// REMAL LAUNDRY OS — UI LIVE
// Live orders, modals, PDF, statuts, batch
// ⚠️ Chargé APRÈS ui-forms.js
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// ON NEW GUEST REQUEST RECEIVED
// ═══════════════════════════════════════════════════════════════════
window.onNewGuestRequestReceived = async function(newOrder) {
    if (!newOrder) return;

    const recordId = String(newOrder.id || Date.now());
    const incomingCreatedBy = String(newOrder.created_by || '').trim();
    const incomingStatus = newOrder.status;

    console.log("🟢 [onNewGuestRequestReceived] REÇU:", {
        id: recordId,
        created_by: incomingCreatedBy,
        status: incomingStatus
    });

    if (typeof cachedSlips === 'undefined' || !Array.isArray(cachedSlips)) {
        console.warn("⚠️ cachedSlips non disponible");
        return;
    }

    const existingLocal = cachedSlips.find(s => String(s.id) === recordId);

    if (existingLocal && existingLocal.created_by && 
        String(existingLocal.created_by).startsWith('staff (')) {
        
        console.log("🛡️ SHIELD : record Staff — aucune modification locale");
        
        if (typeof chargerLiveOrders === 'function') {
            chargerLiveOrders();
        }
        return;
    }

    if (incomingCreatedBy.startsWith('staff (')) {
        console.log("🛡️ SHIELD INVERSE : force created_by à", incomingCreatedBy);
        
        if (existingLocal) {
            const existingIndex = cachedSlips.findIndex(s => String(s.id) === recordId);
            if (existingIndex !== -1) {
                cachedSlips[existingIndex] = {
                    ...cachedSlips[existingIndex],
                    ...newOrder,
                    created_by: incomingCreatedBy,
                    status: incomingStatus || cachedSlips[existingIndex].status
                };
                sauvegarderDonneesLocalStorage();
            }
        }
        
        if (typeof chargerLiveOrders === 'function') {
            chargerLiveOrders();
        }
        return;
    }

    const roomNum = String(newOrder.room_number || newOrder.room || '---');
    const guestName = newOrder.guest_name || 'Guest';
    const totalPcs = parseInt(newOrder.total_pieces || newOrder.total_clothes, 10) || 0;
    const grandTotal = parseFloat(newOrder.grand_total || newOrder.total) || 0;
    const specialNotes = newOrder.special_notes || newOrder.note || 'Request from Guest Portal';
    const pmsQuotaText = newOrder.pms_quota || 'Standard';
    const isExtra = newOrder.extra_charged || false;

    let rawItems = newOrder.items || [];
    if (typeof rawItems === 'string') {
        try { rawItems = JSON.parse(rawItems); } catch(e) { rawItems = []; }
    }
    const parsedItemsList = Array.isArray(rawItems) ? rawItems : (typeof rawItems === 'object' ? Object.values(rawItems) : []);

    const pmsInfo = pmsDatabase[roomNum] || {};

    const slipRecord = {
        id: recordId,
        room: roomNum,
        room_number: roomNum,
        guest_name: guestName,
        pms_quota: pmsQuotaText,
        extra_charged: isExtra,
        service_type: newOrder.service_type || 'Laundry Collection',
        room_typ: pmsInfo.roomTyp || 'DLXR',
        agency: pmsInfo.agency || 'Direct',
        quota: pmsQuotaText,
        count_type: isExtra ? 'quota_extra' : (newOrder.count_type || 'guest'),
        created_at: newOrder.created_at || new Date().toISOString(),
        total_clothes: totalPcs,
        total_pieces: totalPcs,
        total: grandTotal,
        grand_total: grandTotal,
        subtotal: parseFloat(newOrder.subtotal) || grandTotal,
        vat: parseFloat(newOrder.vat) || 0,
        status: newOrder.status || 'Pending',
        is_spa: false,
        created_by: incomingCreatedBy || 'pending',
        note: specialNotes,
        special_notes: specialNotes,
        items: parsedItemsList,
        options: { service_style: newOrder.service_type || 'Laundry Collection' }
    };

    try {
        const existingIndex = cachedSlips.findIndex(s => String(s.id) === recordId);
        if (existingIndex !== -1) {
            cachedSlips[existingIndex] = { ...cachedSlips[existingIndex], ...slipRecord };
        } else {
            cachedSlips.unshift(slipRecord);
        }
        sauvegarderDonneesLocalStorage();
    } catch (e) {
        console.warn("Local storage write error:", e);
    }

    try {
        if (typeof chargerLiveOrders === 'function') {
            chargerLiveOrders();
        }
    } catch (e) {}

    const bannerContainer = document.getElementById('guestBannerContainer') || document.getElementById('guestRequestNotificationBanner');
    const bannerText = document.getElementById('guestBannerText');
    const formattedMessage = `⚡ NEW REQUEST: Room ${roomNum} (${guestName}) — ${totalPcs} Pcs (${grandTotal.toFixed(2)} AED)`;

    if (bannerText) {
        bannerText.innerText = formattedMessage;
    }
    
    if (bannerContainer) {
        bannerContainer.classList.remove('hidden');
        bannerContainer.classList.add('animate-bounce');
        bannerContainer.style.display = 'flex';
    }

    try {
        if (typeof playLuxuryHotelChime === 'function') {
            playLuxuryHotelChime();
        }
    } catch (e) {}
};

// ═══════════════════════════════════════════════════════════════════
// CHARGER LIVE ORDERS
// ═══════════════════════════════════════════════════════════════════
function chargerLiveOrders() {
    const container = document.getElementById('liveOrdersList');
    if (!container) return;

    chargerDonneesLocalStorage();
    
    const debutJournee = new Date();
    debutJournee.setHours(0, 0, 0, 0);

    const activeTodaySlips = cachedSlips.filter(entry => {
        if (!entry.created_at) return false;
        const entryDate = new Date(entry.created_at);
        return entryDate >= debutJournee;
    });

    const isPendingEntry = (e) => {
        const cb = String(e.created_by || '');
        return e.status === 'Pending' || 
               cb === 'pending' || 
               cb === 'Guest App' || 
               cb === 'guest app' ||
               cb === 'Guest' ||
               cb === 'Staff Laundry OS' ||
               cb === '';
    };
    
    activeTodaySlips.sort((a, b) => {
        const aPending = isPendingEntry(a);
        const bPending = isPendingEntry(b);
        if (aPending && !bPending) return -1;
        if (!aPending && bPending) return 1;
        
        if (a.is_spa && !b.is_spa) return -1;
        if (!a.is_spa && b.is_spa) return 1;
        
        const roomA = parseInt(a.room_number || a.room) || 0;
        const roomB = parseInt(b.room_number || b.room) || 0;
        return roomA - roomB;
    });

    const badge = document.getElementById('activeRoomsCountBadge');
    if (badge) badge.innerText = activeTodaySlips.length;

    container.innerHTML = '';

    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'col-span-full flex flex-wrap gap-2 mb-2';
    controlsDiv.innerHTML = `
        <button onclick="toggleAllSelections(true)" class="luxe-btn luxe-btn-secondary" style="font-size:0.65rem;padding:0.5rem 0.85rem;">✅ Select All</button>
        <button onclick="toggleAllSelections(false)" class="luxe-btn luxe-btn-ghost" style="font-size:0.65rem;padding:0.5rem 0.85rem;">❌ Deselect All</button>
        <button onclick="ouvrirModalBatchStatus()" class="luxe-btn luxe-btn-secondary" style="font-size:0.65rem;padding:0.5rem 0.85rem;color:#fcd34d;border-color:rgba(245,158,11,0.3);">🔄 Update Selected Status</button>
        <button onclick="supprimerBordereauxEnLot()" class="luxe-btn" style="font-size:0.65rem;padding:0.5rem 0.85rem;color:#fda4af;border-color:rgba(244,63,94,0.4);background:rgba(244,63,94,0.1);">🗑️ Delete Selected</button>
    `;
    container.appendChild(controlsDiv);

    if (activeTodaySlips.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.className = 'text-xs text-stone-500 text-center py-6 col-span-full';
        emptyMsg.innerText = 'No active room or SPA records for today. Auto-cleared at 00:00.';
        container.appendChild(emptyMsg);
        updatePrintButtonCount();
        return;
    }

    activeTodaySlips.forEach(entry => {
        const itemDiv = document.createElement('div');
        
        const isPendingCard = entry.status === 'Pending' || 
                              !entry.created_by || 
                              entry.created_by === 'pending' || 
                              entry.created_by === 'Guest App' || 
                              entry.created_by === 'guest app' ||
                              entry.created_by === 'Guest' ||
                              entry.created_by === 'Staff Laundry OS';
        
        itemDiv.className = isPendingCard 
            ? 'luxe-card luxe-fade-in p-4 flex items-center gap-3.5 cursor-pointer pending-card' 
            : 'luxe-card luxe-fade-in p-4 flex items-center gap-3.5 cursor-pointer';

        let badgeText = entry.status || 'Collected';
        let badgeClass = 'luxe-badge luxe-badge-collected';
        
        if (isPendingCard) {
            badgeText = '⏳ PENDING';
            badgeClass = 'luxe-badge luxe-badge-pending';
        } else if (entry.status === 'pickup_alert') {
            badgeText = '⚡ GUEST REQ';
            badgeClass = 'luxe-badge luxe-badge-guest-req';
        } else if (entry.status === 'Washing' || entry.status === 'In Progress') {
            badgeText = '🧼 Washing';
            badgeClass = 'luxe-badge luxe-badge-washing';
        } else if (entry.status === 'Ready') {
            badgeText = '✨ Ready';
            badgeClass = 'luxe-badge luxe-badge-ready';
        } else if (entry.status === 'Delivered' || entry.status === 'Completed') {
            badgeText = '✅ Delivered';
            badgeClass = 'luxe-badge luxe-badge-delivered';
        } else if (entry.is_spa) {
            badgeText = 'SPA Daily Sheet';
            badgeClass = 'luxe-badge luxe-badge-spa';
        }

        const roomNum = entry.room_number || entry.room || '---';
        const receiptId = typeof obtenirReceiptId === 'function' ? obtenirReceiptId(entry) : `REC-${String(entry.id).slice(-6).toUpperCase()}`;

        let identifierDisplay = `Room ${roomNum}`;
        if (entry.is_spa) {
            const todayStr = new Date().toISOString().split('T')[0];
            const entryDateOnly = entry.options?.collection_date || (entry.created_at ? entry.created_at.split('T')[0] : todayStr);
            identifierDisplay = `SPA — ${entryDateOnly} (#${entry.spa_serial || '---'})`;
        }

        const totalPcs = entry.total_pieces || entry.total_clothes || 0;
        const totalAmount = entry.grand_total || entry.total || 0;
        const subDesc = entry.is_spa ? `Given By: ${entry.guest_name || 'Staff'} · 📦 ${totalPcs} pcs` : `👤 ${entry.guest_name || 'Guest'} · #${receiptId} · 📦 ${totalPcs} pcs`;

        itemDiv.innerHTML = `
            <input type="checkbox" checked data-id="${entry.id}" class="room-checkbox w-7 h-7 accent-[var(--text-accent)] cursor-pointer flex-shrink-0" onchange="updatePrintButtonCount()">
            <div class="flex-1 min-w-0" onclick="ouvrirModalDetails('${entry.id}')">
                <div class="flex justify-between items-start gap-3">
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-serif-luxury font-bold ${entry.is_spa ? 'text-purple-300' : 'text-[var(--text-accent)]'} text-base">${identifierDisplay}</span>
                            <span class="${badgeClass}">${badgeText}</span>
                        </div>
                        <p class="text-[10px] text-[var(--text-secondary)] mt-1.5 flex items-center gap-1 truncate">${subDesc}</p>
                    </div>
                    <div class="text-right flex-shrink-0">
                        <p class="font-serif-luxury font-bold ${entry.is_spa ? 'text-purple-300' : 'text-[var(--text-accent)]'} text-base leading-tight">${totalAmount.toFixed(2)} AED</p>
                        <p class="text-[9px] text-[var(--text-muted)] font-semibold mt-0.5">${entry.is_spa ? `Delivered: ${entry.options?.delivered_by || 'Staff'}` : (entry.service_type || entry.options?.service_style || 'Folding')}</p>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(itemDiv);
    });

    updatePrintButtonCount();
}

// ═══════════════════════════════════════════════════════════════════
// MODAL ACTIVE ROOMS LIST
// ═══════════════════════════════════════════════════════════════════
function ouvrirModalActiveRoomsList() {
    chargerDonneesLocalStorage();
    
    const debutJournee = new Date();
    debutJournee.setHours(0, 0, 0, 0);

    let activeLaundrySlips = cachedSlips.filter(entry => {
        if (entry.is_spa) return false;
        if (!entry.created_at) return false;
        const entryDate = new Date(entry.created_at);
        return entryDate >= debutJournee;
    });

    activeLaundrySlips.sort((a, b) => (parseInt(a.room_number || a.room) || 0) - (parseInt(b.room_number || b.room) || 0));

    const tbody = document.getElementById('activeRoomsTableBody');
    tbody.innerHTML = '';

    let totalPieces = 0;

    if (activeLaundrySlips.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-stone-400 font-semibold">No active hotel room records today.</td></tr>`;
    } else {
        activeLaundrySlips.forEach(s => {
            let quotaLabel = 'Hotel Count (Free)';
            if (s.extra_charged || s.count_type === 'quota_extra') quotaLabel = 'Hotel & Extra';
            if (s.count_type === 'guest') quotaLabel = 'Guest Count (Full)';

            const roomDisp = s.room_number || s.room || '---';
            const pkgDisp = s.service_type || s.options?.service_style || 'F — Folding';
            const guestDisp = s.guest_name || 'Guest';
            const pcs = s.total_pieces || s.total_clothes || 0;
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
        alert("⚠️ Error exporting PDF.");
    }
}

// ═══════════════════════════════════════════════════════════════════
// SELECTIONS / PRINT
// ═══════════════════════════════════════════════════════════════════
function toggleAllSelections(state) {
    document.querySelectorAll('.room-checkbox').forEach(cb => cb.checked = state);
    updatePrintButtonCount();
}

function updatePrintButtonCount() {
    const selectedCount = document.querySelectorAll('.room-checkbox:checked').length;
    const btn = document.getElementById('lblBatchPrintText');
    if (btn) btn.innerText = `🖨️ Batch Print (${selectedCount})`;
}

async function imprimerToutesLesChambresDuJour() {
    demanderConfirmationPinAdmin(() => {
        imprimerToutesLesChambresDuJourExécution();
    });
}

async function imprimerToutesLesChambresDuJourExécution() {
    chargerDonneesLocalStorage();
    const selectedIds = Array.from(document.querySelectorAll('.room-checkbox:checked')).map(cb => String(cb.dataset.id));

    if (selectedIds.length === 0) {
        alert("⚠️ No items selected for printing.");
        return;
    }

    const slipsToPrint = cachedSlips.filter(s => selectedIds.includes(String(s.id)));
    slipsToPrint.sort((a, b) => (parseInt(a.room_number || a.room) || 0) - (parseInt(b.room_number || b.room) || 0));

    const batchContainer = document.getElementById('batchPrintContainer');
    batchContainer.innerHTML = '';

    slipsToPrint.forEach(entry => {
        const receiptId = typeof obtenirReceiptId === 'function' ? obtenirReceiptId(entry) : `REC-${String(entry.id).slice(-6).toUpperCase()}`;
        entry.receipt_id = receiptId;
        const dateFormatted = entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-GB') : '---';
        const roomNum = entry.room_number || entry.room || '---';

        let badgeText = 'Hotel Count (Free)';
        if (entry.extra_charged || entry.count_type === 'quota_extra') {
            badgeText = 'Hotel & Extra';
        } else if (entry.count_type === 'guest') {
            badgeText = 'Guest Count (Full)';
        }

        const serviceStyleText = entry.service_type || entry.options?.service_style || '';
        const isHangerFolding = serviceStyleText.includes('H/F') || serviceStyleText.includes('Hanger');
        const copiesToPrint = isHangerFolding ? ['LAUNDRY COPY', 'GUEST / HANGER COPY'] : ['ORIGINAL'];

        let rawItems = entry.items || [];
        if (typeof rawItems === 'string') {
            try { rawItems = JSON.parse(rawItems); } catch(e) { rawItems = []; }
        }
        const itemsList = Array.isArray(rawItems) ? rawItems : (typeof rawItems === 'object' ? Object.values(rawItems) : []);
        
        let tableRowsHtml = '';

        itemsList.forEach(item => {
            let name = item.name || item.item_name || 'Article';
            let qty = parseInt(item.quantity || item.qty, 10) || 0;
            let price = parseFloat(item.unit_price || item.price) || 0;
            let freeQty = parseInt(item.free_quantity || item.freeQty, 10) || 0;

            if (qty <= 0) return;

            if (entry.is_spa) {
                const rowTotal = qty * price;
                tableRowsHtml += `<tr style="border-bottom: 1px solid #e5e7eb; color: #111827;"><td style="padding: 8px; font-weight: 700;">${name}</td><td style="text-align: center; font-weight: 700; padding: 8px;">${qty}</td><td style="text-align: right; font-weight: 700; padding: 8px;">${rowTotal.toFixed(2)} AED</td></tr>`;
            } else {
                if (!entry.extra_charged && entry.count_type !== 'guest') {
                    tableRowsHtml += `<tr style="border-bottom: 1px solid #e5e7eb; color: #111827;"><td style="padding: 8px; font-weight: 700;">${name}</td><td style="text-align: center; font-weight: 700; padding: 8px;">${qty}</td><td style="text-align: right; font-weight: 700; padding: 8px; color: #047857;">0.00 AED</td></tr>`;
                } else if (entry.count_type === 'guest') {
                    const rowTotal = qty * price;
                    tableRowsHtml += `<tr style="border-bottom: 1px solid #e5e7eb; color: #111827;"><td style="padding: 8px; font-weight: 700;">${name}</td><td style="text-align: center; font-weight: 700; padding: 8px;">${qty}</td><td style="text-align: right; font-weight: 700; padding: 8px;">${rowTotal.toFixed(2)} AED</td></tr>`;
                } else if (entry.extra_charged || entry.count_type === 'quota_extra') {
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

        const noteText = entry.special_notes || entry.note || '';
        const noteHtml = (noteText && noteText.trim() !== '') ? `
            <div style="background-color: #fffbeb; border: 1px solid #fef3c7; padding: 10px; border-radius: 12px; margin-top: 10px; font-size: 11px;">
                <p style="font-weight: 700; color: #78350f; text-transform: uppercase; margin: 0 0 4px 0; font-size: 9px;">Garment Notes / Defects:</p>
                <p style="margin: 0; color: #1f2937; font-weight: 500;">${noteText}</p>
            </div>
        ` : '';

        const photoHtml = entry.photo ? `
            <div style="border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 8px;">
                <p style="font-weight: 700; font-size: 10px; margin-bottom: 4px; color: #374151;">Proof Photo:</p>
                <img src="${entry.photo}" style="width: 100%; max-height: 160px; object-fit: cover; border-radius: 12px; border: 1px solid #d1d5db;">
            </div>
        ` : '';

        const grandTotalVal = entry.grand_total || entry.total || 0;
        const totalPiecesVal = entry.total_pieces || entry.total_clothes || 0;

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
                    <p style="font-size: 10px; font-family: monospace; color: #6b7280; margin: 2px 0;">Receipt ID: <strong style="color: #111827;">#${receiptId}</strong></p>
                </div>

                <div style="background-color: #f9fafb; padding: 10px 12px; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 10px; font-size: 11px;">
                    <div style="display: flex; justify-between; align-items: center; margin-bottom: 6px;">
                        <div>
                            <span style="color: #6b7280; font-weight: 600;">${entry.is_spa ? 'Sheet Serial:' : 'Room:'}</span>
                            <span style="font-size: 18px; font-weight: 700; color: #111827; margin-left: 4px;">${entry.is_spa ? '#' + String(entry.spa_serial || '').replace(/SPA\s*#?/gi, '') : roomNum}</span>
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
                        <div style="text-align: right;"><span style="color: #6b7280; font-weight: 500;">Laundry Quota:</span> <span style="color: #e11d48;">${entry.pms_quota || entry.quota || badgeText}</span></div>
                        <div style="grid-column: span 2; border-top: 1px solid #e5e7eb; padding-top: 4px; font-size: 10px; color: #6b7280;"><span style="font-weight: 500;">Agent:</span> <span style="color: #374151;">${formatAgentDisplay(entry.created_by)}</span></div>
                    </div>
                </div>

                <div style="background-color: #f9fafb; padding: 8px 12px; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 10px; font-size: 11px; font-weight: 700; display: flex; justify-between;">
                    <span style="color: #374151;">Packaging:</span>
                    <span style="color: #b45309;">${serviceStyleText || 'F — Folding'}</span>
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
                        <span>${totalPiecesVal} pieces</span>
                    </div>
                    <div style="display: flex; justify-between; font-weight: 700; font-size: 14px; color: #111827; padding-top: 6px;">
                        <span>Grand Total:</span>
                        <span style="color: #b45309; font-family: 'Playfair Display', Georgia, serif;">${grandTotalVal.toFixed(2)} AED</span>
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
    demanderConfirmationPinAdmin(async () => {
        chargerDonneesLocalStorage();
        const selectedIds = Array.from(document.querySelectorAll('.room-checkbox:checked')).map(cb => String(cb.dataset.id));

        if (selectedIds.length === 0) {
            alert("⚠️ No items selected.");
            return;
        }

        const slipsToDownload = cachedSlips.filter(s => selectedIds.includes(String(s.id)));
        
        for (const entry of slipsToDownload) {
            await genererPDF(entry.id);
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        alert(`✅ ${slipsToDownload.length} receipts downloaded successfully.`);
    });
}

// ═══════════════════════════════════════════════════════════════════
// FERMER NOTIFICATION BANNER
// ═══════════════════════════════════════════════════════════════════
function fermerNotificationGuestReq(id) {
    if (id) {
        const checkbox = document.querySelector(`.room-checkbox[data-id="${id}"]`);
        if (checkbox) {
            const card = checkbox.closest('.luxe-card') || checkbox.closest('.remal-card');
            if (card) {
                card.classList.remove('animate-pulse', 'ring-2', 'ring-amber-500', 'bg-amber-950/30');
            }
        }
    }
    
    dismissGuestNotificationBanner();
}

// ═══════════════════════════════════════════════════════════════════
// MODAL DÉTAILS
// ═══════════════════════════════════════════════════════════════════
async function ouvrirModalDetails(id) {
    fermerNotificationGuestReq(id);

    selectedIdForModal = String(id);

    chargerDonneesLocalStorage();
    let entry = cachedSlips.find(e => String(e.id) === String(id));

    const localCreatedBy = String(entry?.created_by || '').trim();
    const needsRefresh = !localCreatedBy.startsWith('staff (');

    if (needsRefresh && typeof supabaseClient !== 'undefined' && supabaseClient) {
        try {
            console.log("🔄 [Modal] Refresh depuis Supabase pour ID:", id);
            const { data, error } = await supabaseClient
                .from('guest_laundry_requests')
                .select('*')
                .eq('id', id)
                .single();

            if (!error && data) {
                console.log("✅ [Modal] Record rafraîchi, created_by =", data.created_by);
                const idx = cachedSlips.findIndex(s => String(s.id) === String(id));
                if (idx !== -1) {
                    cachedSlips[idx] = { ...cachedSlips[idx], ...data };
                } else {
                    cachedSlips.unshift(data);
                }
                sauvegarderDonneesLocalStorage();
                entry = cachedSlips.find(e => String(e.id) === String(id));
            }
        } catch (e) {
            console.warn("⚠️ [Modal] Erreur refresh:", e);
        }
    }

    if (!entry) {
        console.warn("⚠️ [Modal] Record introuvable:", id);
        return;
    }

    const receiptId = typeof obtenirReceiptId === 'function' ? obtenirReceiptId(entry) : `REC-${String(entry.id).slice(-6).toUpperCase()}`;
    entry.receipt_id = receiptId;

    const t = i18n[currentLang] || i18n.en;
    const roomNum = entry.room_number || entry.room || '---';

    document.getElementById('modalPdfHotelName').innerText = t.pdfHotelName;
    document.getElementById('modalPdfHotelSub').innerText = t.pdfHotelSub;
    document.getElementById('modalPdfLaundryService').innerText = entry.is_spa ? t.pdfSpaSheet : t.pdfLaundryService;
    document.getElementById('modalReceiptIdDisplay').innerText = `#${receiptId}`;
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
    if (entry.extra_charged || entry.count_type === 'quota_extra') {
        badgeText = t.pdfHotelExtra;
    } else if (entry.count_type === 'guest') {
        badgeText = t.pdfGuestCount;
    }

    document.getElementById('modalIdentifierLabel').innerText = entry.is_spa ? `${t.pdfSheetSerial}:` : t.pdfRoom;
    
    if (entry.is_spa) {
        const serialClean = String(entry.spa_serial || roomNum || '').replace(/SPA\s*#?/gi, '').trim();
        document.getElementById('modalRoomNumDisplay').innerText = `#${serialClean}`;
    } else {
        document.getElementById('modalRoomNumDisplay').innerText = roomNum;
    }
    
    const dateFormatted = entry.created_at ? new Date(entry.created_at).toLocaleDateString(currentLang === 'ar' ? 'ar-AE' : (currentLang === 'hi' ? 'hi-IN' : 'en-GB')) : '---';
    document.getElementById('modalDate').innerText = `${t.pdfDate} ${dateFormatted}`;
    document.getElementById('modalTypeBadgeInline').innerText = entry.is_spa ? t.pdfSpaRecord : badgeText;
    document.getElementById('modalPackagingStyle').innerText = entry.service_type || entry.options?.service_style || 'F — Folding';

    const agencyBox = document.getElementById('modalAgencyQuotaBox');
    if (entry.guest_name || entry.agency || entry.quota || entry.pms_quota) {
        document.getElementById('modalGuestDisplay').innerText = entry.guest_name || 'Unknown';
        document.getElementById('modalTypDisplay').innerText = entry.room_typ || (entry.is_spa ? 'SPA' : 'DLXR');
        document.getElementById('modalAgencyDisplay').innerText = entry.agency || (entry.is_spa ? 'V Element SPA' : 'Direct');
        document.getElementById('modalQuotaDisplay').innerText = entry.pms_quota || entry.quota || (entry.is_spa ? 'V Element SPA' : badgeText);
        document.getElementById('modalCreatedByDisplay').innerText = formatAgentDisplay(entry.created_by);
        agencyBox.classList.remove('hidden');
    } else {
        agencyBox.classList.add('hidden');
    }

    const tbody = document.getElementById('modalTableBody'); 
    tbody.innerHTML = '';

    let rawItems = entry.items || [];
    if (typeof rawItems === 'string') {
        try { rawItems = JSON.parse(rawItems); } catch(e) { rawItems = []; }
    }
    const itemsList = Array.isArray(rawItems) ? rawItems : (typeof rawItems === 'object' ? Object.values(rawItems) : []);

    if (itemsList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center py-2 text-stone-400 font-semibold">No items selected.</td></tr>`;
    } else {
        itemsList.forEach(item => {
            let name = item.name || item.item_name || 'Article';
            let qty = parseInt(item.quantity || item.qty, 10) || 0;
            let price = parseFloat(item.unit_price || item.price) || 0;
            let freeQty = parseInt(item.free_quantity || item.freeQty, 10) || 0;

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
                if (!entry.extra_charged && entry.count_type !== 'guest') {
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
                } else if (entry.extra_charged || entry.count_type === 'quota_extra') {
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

    const totalPcsVal = entry.total_pieces || entry.total_clothes || 0;
    const grandTotalVal = entry.grand_total || entry.total || 0;

    document.getElementById('modalClothesCount').innerText = `${totalPcsVal} pieces`;
    document.getElementById('modalTotal').innerText = `${grandTotalVal.toFixed(2)} AED`;

    const noteBox = document.getElementById('modalNoteBox');
    const noteText = document.getElementById('modalNoteText');
    const noteContent = entry.special_notes || entry.note || '';

    if (noteContent && noteContent.trim() !== '') {
        noteText.innerText = noteContent;
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

    const whatsappMsg = encodeURIComponent(`*REMAL HOTEL & VILLAS - RECEIPT*\n*Ref:* ${entry.is_spa ? '#' + entry.spa_serial : 'Room ' + roomNum}\n*Receipt ID:* #${receiptId}\n*Guest:* ${entry.guest_name}\n*Total Pieces:* ${totalPcsVal} pcs\n*Grand Total:* ${grandTotalVal.toFixed(2)} AED`);
    document.getElementById('btnWhatsappShare').href = `https://wa.me/?text=${whatsappMsg}`;

    document.getElementById('detailModal').classList.remove('hidden');
}

// ═══════════════════════════════════════════════════════════════════
// EDIT
// ═══════════════════════════════════════════════════════════════════
function modifierBordereauActuel() {
    if (!selectedIdForModal) {
        alert("⚠️ No record selected");
        return;
    }
    
    chargerDonneesLocalStorage();
    
    const entry = cachedSlips.find(e => String(e.id) === String(selectedIdForModal));
    
    if (!entry) {
        console.error("❌ Record not found. selectedIdForModal =", selectedIdForModal);
        alert("⚠️ Record not found. Please refresh the page.");
        return;
    }

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

        let rawItems = entry.items || {};
        if (typeof rawItems === 'string') {
            try { rawItems = JSON.parse(rawItems); } catch(e) { rawItems = {}; }
        }

        const rows = document.querySelectorAll('#spa-laundry-section tbody tr:not(.bg-stone-100)');
        rows.forEach(row => {
            const input = row.querySelector('.spa-qty-input');
            const itemName = row.querySelector('td').innerText.trim();
            if (input && rawItems[itemName]) {
                input.value = rawItems[itemName].qty || rawItems[itemName].quantity || 0;
            } else if (input) {
                input.value = '';
            }
        });
        calculateSpaTotal();

    } else {
        const roomNum = entry.room_number || entry.room || '---';
        switchMainSection('newRecord');
        document.getElementById('editingRecordId').value = entry.id;
        document.getElementById('lblFormTitle').innerText = `✏️ Edit / Validate Record - Room ${roomNum}`;
        document.getElementById('roomNumber').value = roomNum;
        onRoomNumberInput();

        selectCountType(entry.extra_charged ? 'quota_extra' : (entry.count_type || 'hotel'));
        document.getElementById('recordOptionalNote').value = entry.special_notes || entry.note || '';

        cart = {};

        let rawItems = entry.items || [];
        if (typeof rawItems === 'string') {
            try { rawItems = JSON.parse(rawItems); } catch(e) { rawItems = []; }
        }
        const itemsList = Array.isArray(rawItems) ? rawItems : (typeof rawItems === 'object' ? Object.values(rawItems) : []);

        let customIdx = 0;
        itemsList.forEach(item => {
            const itemName = item.name || item.item_name || 'Article';
            const itemQty = parseInt(item.quantity || item.qty, 10) || 0;
            const itemPrice = parseFloat(item.unit_price || item.price) || 0;
            const freeQty = parseInt(item.free_quantity || item.freeQty, 10) || 0;
            
            if (item.category === 'Custom Item' && customIdx < 3) {
                const nameInput = document.getElementById(`customName${customIdx}`);
                const priceInput = document.getElementById(`customPrice${customIdx}`);
                const qtyInput = document.getElementById(`customQty${customIdx}`);
                if (nameInput) nameInput.value = itemName;
                if (priceInput) priceInput.value = itemPrice;
                if (qtyInput) qtyInput.value = itemQty;
                customIdx++;
                const customDetails = document.getElementById('detailsCustomItems');
                if (customDetails) customDetails.open = true;
            } else {
                let servicePrefix = item.service || currentService || 'laundry';
                if (!['laundry', 'dry', 'pressing'].includes(servicePrefix)) {
                    servicePrefix = 'laundry';
                }

                if (itemQty > 0) {
                    const key = `${servicePrefix}_${itemName}`;
                    cart[key] = {
                        name: itemName,
                        price: itemPrice,
                        qty: itemQty,
                        freeQty: freeQty
                    };
                }
            }
        });

        sauvegarderPanierLocal();
        renderItems();
        if (typeof calculateGlobalTotals === 'function') calculateGlobalTotals();
    }
}

// ═══════════════════════════════════════════════════════════════════
// PHASE E.4 — DUPLICATION RAPIDE D'UN RECORD
// ═══════════════════════════════════════════════════════════════════
function dupliquerRecordActuel() {
    if (!selectedIdForModal) {
        alert("⚠️ No record selected");
        return;
    }

    chargerDonneesLocalStorage();
    const entry = cachedSlips.find(e => String(e.id) === String(selectedIdForModal));

    if (!entry) {
        console.error("❌ [Duplicate] Record not found:", selectedIdForModal);
        alert("⚠️ Record not found. Please refresh the page.");
        return;
    }

    if (entry.is_spa) {
        alert("⚠️ SPA receipts cannot be duplicated.\nCreate a new one with a different serial number.");
        return;
    }

    fermerModal();
    switchMainSection('newRecord');
    reinitialiserFormulaire();

    const sourceCountType = entry.extra_charged 
        ? 'quota_extra' 
        : (entry.count_type || 'hotel');
    selectCountType(sourceCountType);

    const serviceStyle = entry.service_type || entry.options?.service_style || 'F — Folding';
    const foldingRadios = document.querySelectorAll('input[name="foldingOption"]');
    foldingRadios.forEach(radio => {
        if (radio.value === serviceStyle) {
            radio.checked = true;
        }
    });

    let rawItems = entry.items || [];
    if (typeof rawItems === 'string') {
        try { rawItems = JSON.parse(rawItems); } catch(e) { rawItems = []; }
    }
    const itemsList = Array.isArray(rawItems) 
        ? rawItems 
        : (typeof rawItems === 'object' ? Object.values(rawItems) : []);

    cart = {};
    let customIdx = 0;

    itemsList.forEach(item => {
        const itemName = item.name || item.item_name || 'Article';
        const itemQty = parseInt(item.quantity || item.qty, 10) || 0;
        const itemPrice = parseFloat(item.unit_price || item.price) || 0;
        const freeQty = parseInt(item.free_quantity || item.freeQty, 10) || 0;

        if (itemQty <= 0) return;

        if (item.category === 'Custom Item' && customIdx < 3) {
            const nameInput = document.getElementById(`customName${customIdx}`);
            const priceInput = document.getElementById(`customPrice${customIdx}`);
            const qtyInput = document.getElementById(`customQty${customIdx}`);
            if (nameInput) nameInput.value = itemName;
            if (priceInput) priceInput.value = itemPrice;
            if (qtyInput) qtyInput.value = itemQty;
            customIdx++;
            const customDetails = document.getElementById('detailsCustomItems');
            if (customDetails) customDetails.open = true;
        } else {
            let foundService = null;
            if (typeof database !== 'undefined') {
                for (const svcKey of ['laundry', 'dry', 'pressing']) {
                    const svc = database[svcKey];
                    if (!svc) continue;
                    for (const cat of Object.values(svc)) {
                        if (cat.some(i => i.name === itemName)) {
                            foundService = svcKey;
                            break;
                        }
                    }
                    if (foundService) break;
                }
            }

            const servicePrefix = foundService || 'laundry';
            const key = `${servicePrefix}_${itemName}`;
            cart[key] = {
                name: itemName,
                price: itemPrice,
                qty: itemQty,
                freeQty: freeQty
            };
        }
    });

    sauvegarderPanierLocal();
    renderItems();
    if (typeof calculateGlobalTotals === 'function') calculateGlobalTotals();

    setTimeout(() => {
        const roomInput = document.getElementById('roomNumber');
        if (roomInput) {
            roomInput.focus();
            roomInput.select();
        }
    }, 300);

    const totalPcs = entry.total_pieces || entry.total_clothes || 0;
    const itemCount = Object.keys(cart).length;
    showDuplicateToast(itemCount, totalPcs);
}

function showDuplicateToast(itemCount, totalPcs) {
    let toast = document.getElementById('duplicateToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'duplicateToast';
        toast.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-[#DCA773] text-stone-950 font-bold text-xs px-5 py-3 rounded-2xl shadow-2xl transition-all duration-300';
        document.body.appendChild(toast);
    }
    
    toast.innerHTML = `📋 <strong>Record duplicated</strong> — ${itemCount} item(s), ${totalPcs} pcs<br><span class="text-[10px] opacity-80">Choisissez la nouvelle chambre</span>`;
    toast.style.opacity = '1';
    toast.style.transform = 'translate(-50%, 0)';
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, 20px)';
    }, 3500);
    
    setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3800);
}

// ═══════════════════════════════════════════════════════════════════
// PDF
// ═══════════════════════════════════════════════════════════════════
async function genererPDF(entryId = null) {
    const targetId = entryId || selectedIdForModal;
    if (!targetId) {
        alert("⚠️ No item selected.");
        return;
    }

    chargerDonneesLocalStorage();
    const entry = cachedSlips.find(e => String(e.id) === String(targetId));
    if (!entry) return;

    const roomNum = entry.room_number || entry.room || '---';

    if (entry.is_spa) {
        ouvrirModalDetails(targetId);
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
            alert("⚠️ Error generating SPA PDF.");
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

    entry.receipt_id = typeof obtenirReceiptId === 'function' ? obtenirReceiptId(entry) : `REC-${String(entry.id).slice(-6).toUpperCase()}`;
    const dateIso = entry.created_at ? entry.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
    const fileTargetName = `REMAL_${dateIso}_RM-${roomNum}`;

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
        alert("⚠️ Error generating PDF.");
    } finally {
        noPrintElements.forEach(el => el.style.display = '');
        if (modalWasHidden) {
            fermerModal();
        }
    }
}

function fermerModal() { document.getElementById('detailModal').classList.add('hidden'); selectedIdForModal = null; }

// ═══════════════════════════════════════════════════════════════════
// SUPPRESSION
// ═══════════════════════════════════════════════════════════════════
async function supprimerBordereauActuel() {
    if (!selectedIdForModal) return;
    if (confirm(`Delete this record?`)) {
        isLocalUpdating = true;
        chargerDonneesLocalStorage();
        cachedSlips = cachedSlips.filter(e => String(e.id) !== String(selectedIdForModal));
        sauvegarderDonneesLocalStorage();

        if (supabaseClient) {
            try { 
                await supabaseClient.from('guest_laundry_requests').delete().eq('id', selectedIdForModal); 
            } catch(e) {
                console.error("Erreur suppression Supabase:", e);
            }
        }

        fermerModal();
        chargerLiveOrders();
        if(!document.getElementById('sectionPdfList').classList.contains('hidden')) {
            afficherListeBordereauxLocal();
        }
        setTimeout(() => { isLocalUpdating = false; }, 1000);
    }
}

// ═══════════════════════════════════════════════════════════════════
// CHANGEMENT STATUT
// ═══════════════════════════════════════════════════════════════════
async function changerStatutBordereau(recordId, nouveauStatut) {
    const targetId = recordId || selectedIdForModal;
    if (!targetId) return;

    const idStr = String(targetId).trim();
    isLocalUpdating = true;

    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        try {
            if (idStr.length === 36) {
                const { error } = await supabaseClient
                    .from('guest_laundry_requests')
                    .update({ status: nouveauStatut })
                    .eq('id', idStr);

                if (error) {
                    console.error("❌ Erreur mise à jour statut Supabase :", error.message);
                    alert("Erreur Supabase: " + error.message);
                    return;
                }
                console.log(`✅ Statut Supabase mis à jour : '${nouveauStatut}' (ID: ${idStr})`);
            }
        } catch (e) {
            console.error("Exception changement statut :", e);
        }
    }

    chargerDonneesLocalStorage();
    const item = cachedSlips.find(s => String(s.id).trim() === idStr);
    if (item) {
        item.status = nouveauStatut;
        sauvegarderDonneesLocalStorage();
    }

    if (typeof fermerModal === 'function') fermerModal();
    if (typeof chargerLiveOrders === 'function') chargerLiveOrders();
    if (typeof afficherListeBordereauxLocal === 'function') afficherListeBordereauxLocal();

    setTimeout(() => { isLocalUpdating = false; }, 800);
}

async function mettreAJourStatutCommande(requestId, nouveauStatut) {
    await changerStatutBordereau(requestId, nouveauStatut);
}

// ═══════════════════════════════════════════════════════════════════
// BATCH STATUS
// ═══════════════════════════════════════════════════════════════════
function ouvrirModalBatchStatus() {
    const selectedIds = Array.from(document.querySelectorAll('.room-checkbox:checked')).map(cb => String(cb.dataset.id));

    console.log("🔍 [BatchStatus] Checkboxes cochées:", selectedIds.length);
    console.log("🔍 [BatchStatus] IDs:", selectedIds);

    if (selectedIds.length === 0) {
        alert("⚠️ Please select at least one room checkbox.");
        return;
    }

    const countLabel = document.getElementById('batchStatusCountLabel');
    if (countLabel) countLabel.innerText = `Apply new status to ${selectedIds.length} selected record(s)`;

    const modal = document.getElementById('batchStatusModal');
    if (!modal) {
        console.error("❌ [BatchStatus] Modale introuvable dans le DOM !");
        alert("⚠️ Batch status modal not found. Please refresh the page.");
        return;
    }

    modal.classList.remove('hidden');
    console.log("✅ [BatchStatus] Modale ouverte avec", selectedIds.length, "record(s)");
}

function fermerModalBatchStatus() {
    const modal = document.getElementById('batchStatusModal');
    if (modal) modal.classList.add('hidden');
}

async function appliquerStatutEnLot(nouveauStatut) {
    const selectedIds = Array.from(document.querySelectorAll('.room-checkbox:checked')).map(cb => String(cb.dataset.id));
    if (selectedIds.length === 0) {
        alert("⚠️ No records selected.");
        return;
    }

    isLocalUpdating = true;

    chargerDonneesLocalStorage();
    let updatedCount = 0;
    cachedSlips.forEach(s => {
        if (selectedIds.includes(String(s.id))) {
            s.status = nouveauStatut;
            updatedCount++;
        }
    });
    sauvegarderDonneesLocalStorage();

    fermerModalBatchStatus();
    chargerLiveOrders();

    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        try {
            const uuidBatch = selectedIds.filter(id => id.length === 36);
            if (uuidBatch.length > 0) {
                const { error } = await supabaseClient
                    .from('guest_laundry_requests')
                    .update({ status: nouveauStatut })
                    .in('id', uuidBatch);
                
                if (error) {
                    console.error("❌ [BatchStatus] Erreur Supabase:", error.message);
                } else {
                    console.log(`✅ [BatchStatus] ${uuidBatch.length} records mis à jour sur Supabase`);
                }
            }
        } catch (err) {
            console.error("❌ [BatchStatus] Exception:", err);
        }
    }

    setTimeout(() => { isLocalUpdating = false; }, 1000);
    alert(`✅ Status updated to "${nouveauStatut}" for ${selectedIds.length} record(s)!`);
}

// ═══════════════════════════════════════════════════════════════════
// SUPPRESSION EN LOT
// ═══════════════════════════════════════════════════════════════════
async function supprimerBordereauxEnLot() {
    const selectedIds = Array.from(document.querySelectorAll('.room-checkbox:checked')).map(cb => String(cb.dataset.id));
    
    if (selectedIds.length === 0) {
        alert("⚠️ Please select at least one record to delete.");
        return;
    }

    demanderConfirmationPinAdmin(async () => {
        const confirmation = confirm(`⚠️ Are you sure you want to permanently delete ${selectedIds.length} selected record(s)?`);
        if (!confirmation) return;

        isLocalUpdating = true;

        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            try {
                const uuidBatch = selectedIds.filter(id => id.length === 36);
                if (uuidBatch.length > 0) {
                    await supabaseClient.from('guest_laundry_requests').delete().in('id', uuidBatch);
                }
            } catch (err) {
                console.error("Error deleting bulk items from Supabase:", err);
            }
        }

        try {
            chargerDonneesLocalStorage();
            if (typeof cachedSlips !== 'undefined' && Array.isArray(cachedSlips)) {
                cachedSlips = cachedSlips.filter(s => !selectedIds.includes(String(s.id)));
                sauvegarderDonneesLocalStorage();
            }
        } catch (e) {
            console.error("Error updating local storage:", e);
        }

        chargerLiveOrders();
        setTimeout(() => { isLocalUpdating = false; }, 1000);
        alert(`✅ Successfully deleted ${selectedIds.length} record(s).`);
    });
}

// ═══════════════════════════════════════════════════════════════════
// BANNIÈRE
// ═══════════════════════════════════════════════════════════════════
function dismissGuestNotificationBanner() {
    const bannerContainer = document.getElementById('guestBannerContainer') || document.getElementById('guestRequestNotificationBanner');
    if (bannerContainer) {
        bannerContainer.classList.remove('animate-bounce', 'animate-pulse');
        bannerContainer.classList.add('hidden');
        bannerContainer.style.display = 'none';
    }

    document.querySelectorAll('.luxe-card, .remal-card').forEach(card => {
        card.classList.remove('animate-pulse', 'ring-2', 'ring-amber-500', 'bg-amber-950/30');
    });
}
