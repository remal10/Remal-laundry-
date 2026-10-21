// ═══════════════════════════════════════════════════════════════════
// REMAL LAUNDRY OS — UI MODULES (Version Complète et Finale)
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// PHASE 5 — ROLE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════
function isAdmin() {
    try {
        if (typeof currentStaffUser === 'undefined' || !currentStaffUser) {
            const session = localStorage.getItem('remal_current_staff');
            if (session) {
                const parsed = JSON.parse(session);
                return String(parsed.role || '').toLowerCase() === 'admin';
            }
            return false;
        }
        return String(currentStaffUser.role || '').toLowerCase() === 'admin';
    } catch (e) { return false; }
}

function requireAdmin(actionName = 'this action') {
    if (isAdmin()) return true;
    alert(`🚫 Access denied.\n\nOnly administrators can perform: ${actionName}.`);
    return false;
}

function applyRoleVisibility() {
    const body = document.body;
    if (!body) return;
    if (isAdmin()) {
        body.classList.remove('role-staff');
        return;
    }
    body.classList.add('role-staff');
    const ADMIN_SECTIONS = ['sectionLostfound', 'sectionPdfList', 'sectionMassEntry', 'sectionDashboard', 'sectionCheckout', 'sectionChat', 'sectionLinenControl'];
    ADMIN_SECTIONS.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    const ADMIN_NAV_BUTTONS = ['navBtnLostfound', 'navBtnPdfList', 'navBtnMassEntry', 'navBtnDashboard', 'navBtnChat', 'navBtnLinenControl'];
    ADMIN_NAV_BUTTONS.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    document.querySelectorAll('[data-admin-only="true"]').forEach(el => {
        if (el.parentNode) el.parentNode.removeChild(el);
    });
}

// ═══════════════════════════════════════════════════════════════════
// CHARGEMENT DONNÉES CLOUD
// ═══════════════════════════════════════════════════════════════════
async function chargerDonneesEtAbonnementCloud() {
    chargerDonneesLocalStorage();
    if (!supabaseClient) return;

    try {
        const ilYa90Jours = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
        const { data: slips, error: slipsErr } = await supabaseClient
            .from('guest_laundry_requests')
            .select('*')
            .gte('created_at', ilYa90Jours)
            .order('created_at', { ascending: false });
        
        if (!slipsErr && slips && slips.length > 0) {
            const slipMap = new Map();
            cachedSlips.forEach(s => slipMap.set(String(s.id), s));
            slips.forEach(s => {
                const roomClean = s.room_number || s.room || '---';
                let parsedItems = s.items;
                if (typeof parsedItems === 'string') { try { parsedItems = JSON.parse(parsedItems); } catch(e) { parsedItems = []; } }
                if (parsedItems && typeof parsedItems === 'object' && !Array.isArray(parsedItems)) parsedItems = Object.values(parsedItems);
                if (!Array.isArray(parsedItems)) parsedItems = [];
                slipMap.set(String(s.id), { ...s, id: String(s.id), room: roomClean, room_number: roomClean, items: parsedItems });
            });
            cachedSlips = Array.from(slipMap.values());
            sauvegarderDonneesLocalStorage();
            if (typeof chargerLiveOrders === 'function') chargerLiveOrders();
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
            if (typeof updateLastSyncDisplay === 'function') updateLastSyncDisplay();
        }
    } catch (e) { console.error("Exception sync cloud:", e); }
}

// ═══════════════════════════════════════════════════════════════════
// TABLE PMS PREVIEW (Mass Entry V2)
// ═══════════════════════════════════════════════════════════════════
function renderMassPreviewTable() {
    const container = document.getElementById('massPreviewContainer');
    const counterContainer = document.getElementById('massRecordCounter');
    const resultsCard = document.getElementById('massResultsCard');
    if (!container) return;

    const rooms = Object.keys(pmsDatabase || {}).sort((a, b) => parseInt(a) - parseInt(b));
    if (rooms.length === 0) {
        container.innerHTML = `<tr><td colspan="8" class="p-4 text-stone-500 text-center">No data loaded.</td></tr>`;
        if (counterContainer) counterContainer.innerHTML = '';
        if (resultsCard) resultsCard.classList.add('hidden');
        return;
    }

    let html = '';
    rooms.forEach(room => {
        const item = pmsDatabase[room];
        let rowClass = !item.isChargeable ? "laundry-row" : "";
        if (!item.agency || item.agency === "---") rowClass += " bg-yellow-950/30 text-yellow-200 border-yellow-800";
        const statusHTML = item.isChargeable ? `<span class="badge-chargeable">Chargeable</span>` : `<span class="badge-green">Included (${item.quotaText})</span>`;
        const editableAttrs = (field) => `contenteditable="true" data-field="${field}" data-room="${room}" onblur="sauvegarderChampPMS(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}" class="editable-cell outline-none px-1 py-0.5 rounded"`;

        html += `<tr class="${rowClass}"><td class="p-3.5"><strong>${room}</strong></td><td class="p-3.5"><span ${editableAttrs('guestName')}>${item.guestName || 'Unknown Guest'}</span></td><td class="p-3.5"><span ${editableAttrs('roomTyp')}>${item.roomTyp || '---'}</span></td><td class="p-3.5"><span ${editableAttrs('agency')}>${item.agency || '---'}</span></td><td class="p-3.5"><span ${editableAttrs('arrival')}>${item.arrival || '---'}</span></td><td class="p-3.5"><span ${editableAttrs('departure')}>${item.departure || '---'}</span></td><td class="p-3.5"><span ${editableAttrs('quotaText')}>${item.quotaText || 'Chargeable'}</span></td><td class="p-3.5">${statusHTML}</td></tr>`;
    });

    container.innerHTML = html;
    if (counterContainer) counterContainer.innerHTML = `✅ ${rooms.length} PMS record(s) loaded.`;
    if (resultsCard) resultsCard.classList.remove('hidden');
}

async function sauvegarderChampPMS(cell) {
    if (!cell) return;
    const room = cell.dataset.room;
    const field = cell.dataset.field;
    const newValue = cell.innerText.trim();
    if (!room || !field || !pmsDatabase[room]) return;
    if (String(pmsDatabase[room][field] || '') === newValue) return;
    
    pmsDatabase[room][field] = newValue;
    if (field === 'quotaText') {
        const lower = newValue.toLowerCase();
        pmsDatabase[room].isChargeable = lower.includes('chargeable') || (!lower.includes('laundry') && !lower.includes('pcs'));
    }
    sauvegarderPmsLocalStorage();

    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        const payload = {}; payload[field] = newValue;
        if (field === 'quotaText') payload.is_chargeable = pmsDatabase[room].isChargeable;
        try {
            await supabaseClient.from('pms_guests').update(payload).eq('room', room);
            cell.classList.add('bg-emerald-900/50');
            setTimeout(() => cell.classList.remove('bg-emerald-900/50'), 800);
        } catch (e) { console.error('[PMS Edit] Save error:', e); }
    }
}
window.sauvegarderChampPMS = sauvegarderChampPMS;

// ═══════════════════════════════════════════════════════════════════
// ARCHIVES
// ═══════════════════════════════════════════════════════════════════
function switchArchiveFilter(filter) {
    currentArchiveFilter = filter;
    document.getElementById('archiveFilterAll').className = filter === 'all' ? 'flex-1 py-2.5 rounded-xl transition text-center bg-[#DCA773] text-stone-950 shadow font-bold' : 'flex-1 py-2.5 rounded-xl transition text-center hover:text-stone-200';
    document.getElementById('archiveFilterLaundry').className = filter === 'laundry' ? 'flex-1 py-2.5 rounded-xl transition text-center bg-[#DCA773] text-stone-950 shadow font-bold' : 'flex-1 py-2.5 rounded-xl transition text-center hover:text-stone-200';
    document.getElementById('archiveFilterSpa').className = filter === 'spa' ? 'flex-1 py-2.5 rounded-xl transition text-center bg-[#DCA773] text-stone-950 shadow font-bold' : 'flex-1 py-2.5 rounded-xl transition text-center hover:text-stone-200';
    afficherListeBordereauxLocal();
}

function switchStatusFilter(status) {
    currentStatusFilter = status;
    ['All', 'Pending', 'Washing', 'Ready', 'Delivered'].forEach(label => {
        const btn = document.getElementById('statusFilter' + label);
        if (btn) btn.className = 'status-filter-btn px-3 py-1.5 rounded-full text-xs font-semibold border border-[#2f2820] text-stone-400 hover:bg-[#181614] transition';
    });
    const activeLabel = status.charAt(0).toUpperCase() + status.slice(1);
    const activeBtn = document.getElementById('statusFilter' + activeLabel);
    if (activeBtn) activeBtn.className = 'status-filter-btn px-3 py-1.5 rounded-full text-xs font-semibold border border-[#DCA773] bg-[#DCA773] text-stone-950 shadow transition';
    afficherListeBordereauxLocal();
}

function matchesStatusFilter(record) {
    if (currentStatusFilter === 'all') return true;
    const status = String(record.status || '').toLowerCase().trim();
    switch (currentStatusFilter) {
        case 'pending':   return status === 'pending' || status === 'collected';
        case 'washing':   return status === 'washing' || status === 'in_progress';
        case 'ready':     return status === 'ready';
        case 'delivered': return status === 'delivered' || status === 'completed';
        default:          return true;
    }
}

function switchDateFilter(range) {
    currentDateFilter = (currentDateFilter === range) ? null : range;
    ['Today', '7d', '30d', '90d'].forEach(label => {
        const btn = document.getElementById('dateFilter' + label);
        if (btn) btn.className = 'date-filter-btn px-3 py-1.5 rounded-full text-xs font-semibold border border-[#2f2820] text-stone-400 hover:bg-[#181614] transition';
    });
    if (currentDateFilter) {
        const activeLabel = currentDateFilter.charAt(0).toUpperCase() + currentDateFilter.slice(1);
        const activeBtn = document.getElementById('dateFilter' + activeLabel);
        if (activeBtn) activeBtn.className = 'date-filter-btn px-3 py-1.5 rounded-full text-xs font-semibold border border-[#DCA773] bg-[#DCA773] text-stone-950 shadow transition';
    }
    afficherListeBordereauxLocal();
}

function matchesDateFilter(record) {
    if (!currentDateFilter) return true;
    const dateStr = record.created_at || record.date || record.timestamp;
    if (!dateStr) return false;
    const recordDate = new Date(dateStr);
    if (isNaN(recordDate.getTime())) return false;
    const now = new Date();
    const diffMs = now - recordDate;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    switch (currentDateFilter) {
        case 'today': { const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); return recordDate >= today; }
        case '7d':  return diffDays <= 7;
        case '30d': return diffDays <= 30;
        case '90d': return diffDays <= 90;
        default:    return true;
    }
}

function afficherListeBordereauxLocal() {
    chargerDonneesLocalStorage();
    const searchVal = document.getElementById('searchRoom').value.toLowerCase().trim();
    const searchDateVal = document.getElementById('searchDate').value;

    let filtered = cachedSlips.filter(entry => {
        const roomNum = String(entry.room_number || entry.room || '').toLowerCase();
        const receiptId = typeof obtenirReceiptId === 'function' ? obtenirReceiptId(entry).toLowerCase() : '';
        const matchRoom = !searchVal || roomNum.includes(searchVal) || receiptId.includes(searchVal) || String(entry.guest_name || '').toLowerCase().includes(searchVal) || String(entry.spa_serial || '').toLowerCase().includes(searchVal) || (entry.is_spa && `#${entry.spa_serial}`.toLowerCase().includes(searchVal));
        
        let matchDate = true;
        if (searchDateVal) {
            const entryDate = entry.created_at ? new Date(entry.created_at).toISOString().split('T')[0] : '';
            matchDate = (entryDate === searchDateVal);
        }

        let matchCategory = true;
        if (currentArchiveFilter === 'laundry') matchCategory = !entry.is_spa;
        if (currentArchiveFilter === 'spa') matchCategory = !!entry.is_spa;

        if (!matchesStatusFilter(entry)) return false;
        if (!matchesDateFilter(entry)) return false;

        return matchRoom && matchDate && matchCategory;
    });

    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const container = document.getElementById('laundryList');
    if (!container) return;

    const existingBanner = document.getElementById('archives-info-banner');
    if (existingBanner) existingBanner.remove();
    if (cachedSlips.length > 50) {
        const infoBanner = document.createElement('div');
        infoBanner.id = 'archives-info-banner';
        infoBanner.className = 'bg-amber-950/40 border border-amber-800 rounded-2xl p-3 text-xs text-amber-200 font-semibold mb-3';
        infoBanner.innerHTML = `📚 <strong>Archives limited to 90 days</strong> — <span class="text-stone-300">${cachedSlips.length} records loaded.</span> Older data is automatically archived.`;
        container.parentNode.insertBefore(infoBanner, container);
    }

    if (filtered.length === 0) {
        container.innerHTML = `<p class="text-xs text-stone-500 text-center py-6">No records found matching criteria.</p>`;
        return;
    }

    const hotelEntries = filtered.filter(e => !e.is_spa);
    const spaEntries = filtered.filter(e => !!e.is_spa);
    let html = '';

    if ((currentArchiveFilter === 'all' || currentArchiveFilter === 'laundry') && hotelEntries.length > 0) {
        html += `<div class="space-y-2"><div class="flex justify-between items-center bg-[#181614] p-3 rounded-2xl border border-[#2f2820]"><span class="text-xs font-bold text-[#DCA773] uppercase tracking-wider flex items-center gap-2">🏨 Hotel Rooms Laundry</span><span class="text-[10px] bg-[#0f0e0c] text-stone-300 font-bold px-2.5 py-0.5 rounded-full border border-[#2f2820]">${hotelEntries.length} record(s)</span></div><div class="space-y-2">`;
        hotelEntries.forEach(entry => {
            let badgeLabel = 'Hotel Count'; let badgeClass = 'luxe-badge luxe-badge-collected';
            if(entry.extra_charged || entry.count_type === 'quota_extra') { badgeLabel = 'Quota + Extra'; badgeClass = 'luxe-badge luxe-badge-ready'; }
            else if(entry.count_type === 'guest') { badgeLabel = 'Chargeable'; badgeClass = 'luxe-badge luxe-badge-chargeable'; }
            const roomNum = entry.room_number || entry.room || '---';
            const receiptId = typeof obtenirReceiptId === 'function' ? obtenirReceiptId(entry) : `REC-${String(entry.id).slice(-6).toUpperCase()}`;
            const dateFormatted = entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '---';
            const totalPcs = entry.total_pieces || entry.total_clothes || 0;
            const totalAmount = entry.grand_total || entry.total || 0;
            const agentDisplay = formatAgentDisplay(entry.created_by);
            html += `<div onclick="ouvrirModalDetails('${entry.id}')" class="p-4 bg-[#0f0e0c] rounded-2xl border border-[#2f2820] text-xs flex justify-between items-center cursor-pointer hover:border-[#DCA773] transition"><div><span class="font-serif-luxury font-bold text-[#DCA773] text-sm sm:text-base">Room ${roomNum} (${entry.guest_name || 'Guest'})</span><span class="ml-2 ${badgeClass}">${badgeLabel}</span><div class="text-[10px] text-stone-400 mt-1">#${receiptId} | 📅 ${dateFormatted} | Agent: ${agentDisplay}</div></div><div class="text-right font-bold text-stone-200"><small class="text-stone-400 font-normal">(${totalPcs} pcs)</small><span class="text-[#DCA773] font-serif-luxury text-base sm:text-lg ml-1.5">${totalAmount.toFixed(2)} AED</span>${entry.photo ? '📸' : ''}</div></div>`;
        });
        html += `</div></div>`;
    }

    if ((currentArchiveFilter === 'all' || currentArchiveFilter === 'spa') && spaEntries.length > 0) {
        html += `<div class="space-y-2 mt-4"><div class="flex justify-between items-center bg-[#181614] p-3 rounded-2xl border border-[#2f2820]"><span class="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">🧘 V Element SPA Laundry</span><span class="text-[10px] bg-[#0f0e0c] text-purple-200 font-bold px-2.5 py-0.5 rounded-full border border-purple-900">${spaEntries.length} record(s)</span></div><div class="space-y-2">`;
        spaEntries.forEach(entry => {
            const dateFormatted = entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '---';
            const totalPcs = entry.total_pieces || entry.total_clothes || 0;
            const totalAmount = entry.grand_total || entry.total || 0;
            html += `<div onclick="ouvrirSpaDetailModal('${entry.id}')" class="p-4 bg-[#0f0e0c] rounded-2xl border border-[#2f2820] text-xs flex justify-between items-center cursor-pointer hover:border-purple-500 transition"><div><span class="font-serif-luxury font-bold text-purple-300 text-sm sm:text-base">SPA Sheet #${entry.spa_serial || '---'} — ${entry.guest_name || 'Spa Agent'}</span><span class="ml-2 luxe-badge luxe-badge-spa">SPA Daily Sheet</span><div class="text-[10px] text-stone-400 mt-1">📅 ${dateFormatted} | Delivered by: ${entry.options?.delivered_by || 'Staff'}</div></div><div class="text-right font-bold text-stone-200"><small class="text-stone-400 font-normal">(${totalPcs} pcs)</small><span class="text-purple-300 font-serif-luxury text-base sm:text-lg ml-1.5">${totalAmount.toFixed(2)} AED</span></div></div>`;
        });
        html += `</div></div>`;
    }

    const counterId = 'archives-results-counter';
    const existingCounter = document.getElementById(counterId);
    if (existingCounter) existingCounter.remove();
    if (filtered.length > 0) {
        const counter = document.createElement('div');
        counter.id = counterId;
        counter.className = 'text-xs text-stone-400 font-semibold mb-2';
        counter.innerText = `📊 ${filtered.length} result${filtered.length > 1 ? 's' : ''} found`;
        container.parentNode.insertBefore(counter, container);
    }
    container.innerHTML = html;
}

function getCurrentFilteredArchives() {
    if (typeof cachedSlips === 'undefined' || !Array.isArray(cachedSlips)) return [];
    const searchRoomEl = document.getElementById('searchRoom');
    const searchDateEl = document.getElementById('searchDate');
    const searchVal = searchRoomEl ? searchRoomEl.value.toLowerCase().trim() : '';
    const searchDateVal = searchDateEl ? searchDateEl.value : '';

    let filtered = cachedSlips.filter(entry => {
        const roomNum = String(entry.room_number || entry.room || '').toLowerCase();
        const receiptId = typeof obtenirReceiptId === 'function' ? obtenirReceiptId(entry).toLowerCase() : '';
        const matchRoom = !searchVal || roomNum.includes(searchVal) || receiptId.includes(searchVal) || String(entry.guest_name || '').toLowerCase().includes(searchVal) || String(entry.spa_serial || '').toLowerCase().includes(searchVal) || (entry.is_spa && `#${entry.spa_serial}`.toLowerCase().includes(searchVal));

        let matchDate = true;
        if (searchDateVal) {
            const entryDate = entry.created_at ? new Date(entry.created_at).toISOString().split('T')[0] : '';
            matchDate = (entryDate === searchDateVal);
        }

        let matchCategory = true;
        if (currentArchiveFilter === 'laundry') matchCategory = !entry.is_spa;
        if (currentArchiveFilter === 'spa') matchCategory = !!entry.is_spa;

        if (!matchesStatusFilter(entry)) return false;
        if (!matchesDateFilter(entry)) return false;

        return matchRoom && matchDate && matchCategory;
    });

    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return filtered;
}

function buildFiltersSummary() {
    const parts = [];
    if (currentArchiveFilter && currentArchiveFilter !== 'all') parts.push(`Category=${currentArchiveFilter === 'laundry' ? 'Hotel Laundry' : 'SPA Laundry'}`);
    if (currentStatusFilter && currentStatusFilter !== 'all') parts.push(`Status=${currentStatusFilter.charAt(0).toUpperCase() + currentStatusFilter.slice(1)}`);
    if (currentDateFilter) {
        const labels = { today: 'Today', '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days' };
        parts.push(`Date=${labels[currentDateFilter] || currentDateFilter}`);
    }
    const searchRoomEl = document.getElementById('searchRoom');
    if (searchRoomEl && searchRoomEl.value.trim()) parts.push(`Search="${searchRoomEl.value.trim()}"`);
    const searchDateEl = document.getElementById('searchDate');
    if (searchDateEl && searchDateEl.value) parts.push(`Date=${searchDateEl.value}`);
    return parts.length > 0 ? parts.join(' · ') : 'No filters';
}

function buildFilenameSuffix() {
    const parts = [];
    if (currentArchiveFilter && currentArchiveFilter !== 'all') parts.push(currentArchiveFilter);
    if (currentStatusFilter && currentStatusFilter !== 'all') parts.push(currentStatusFilter);
    if (currentDateFilter) parts.push(currentDateFilter);
    return parts.length > 0 ? '_' + parts.join('-') : '';
}

async function exportFilteredArchivesToPDF() {
    const filtered = getCurrentFilteredArchives();
    if (filtered.length === 0) { alert('⚠️ No records to export. Adjust your filters first.'); return; }
    const container = document.getElementById('archivesExportContainer');
    if (!container) { alert('⚠️ Export container missing.'); return; }

    const today = new Date().toISOString().split('T')[0];
    const filtersSummary = buildFiltersSummary();
    const now = new Date().toLocaleString('en-GB');

    let rowsHtml = '';
    filtered.forEach((entry, idx) => {
        const room = entry.room_number || entry.room || '---';
        const guest = entry.guest_name || (entry.is_spa ? 'Spa Agent' : 'Guest');
        const receiptId = typeof obtenirReceiptId === 'function' ? obtenirReceiptId(entry) : `REC-${String(entry.id).slice(-6).toUpperCase()}`;
        const date = entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '---';
        const status = (entry.status || 'Collected');
        const pcs = entry.total_pieces || entry.total_clothes || 0;
        const amount = Number(entry.grand_total || entry.total || 0).toFixed(2);
        const type = entry.is_spa ? 'SPA' : 'Hotel';

        rowsHtml += `<tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 6px 8px; font-size: 10px; text-align: center;">${idx + 1}</td><td style="padding: 6px 8px; font-size: 10px; font-weight: bold;">${room}</td><td style="padding: 6px 8px; font-size: 10px;">${guest}</td><td style="padding: 6px 8px; font-size: 9px; font-family: monospace; color: #6b7280;">${receiptId}</td><td style="padding: 6px 8px; font-size: 9px;">${date}</td><td style="padding: 6px 8px; font-size: 10px; text-align: center;">${type}</td><td style="padding: 6px 8px; font-size: 10px; text-align: center;">${status}</td><td style="padding: 6px 8px; font-size: 10px; text-align: right;">${pcs}</td><td style="padding: 6px 8px; font-size: 10px; text-align: right; font-weight: bold;">${amount} AED</td></tr>`;
    });

    const totalPieces = filtered.reduce((sum, e) => sum + Number(e.total_pieces || e.total_clothes || 0), 0);
    const totalAmount = filtered.reduce((sum, e) => sum + Number(e.grand_total || e.total || 0), 0).toFixed(2);

    container.innerHTML = `
        <div style="font-family: 'Helvetica', Arial, sans-serif; padding: 20px; background: #fff; color: #1c1917;">
            <div style="text-align: center; border-bottom: 2px solid #DCA773; padding-bottom: 12px; margin-bottom: 16px;">
                <h1 style="font-size: 20px; margin: 0; color: #1c1917; letter-spacing: 2px;">REMAL HOTEL & VILLAS</h1>
                <p style="font-size: 10px; color: #6b7280; margin: 4px 0 0 0; letter-spacing: 2px; text-transform: uppercase;">Al Ruwais City, Abu Dhabi – UAE</p>
                <p style="font-size: 14px; color: #DCA773; font-weight: bold; margin: 8px 0 0 0; letter-spacing: 1px;">LAUNDRY ARCHIVES EXPORT</p>
            </div>
            <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 10px; margin-bottom: 16px; font-size: 10px;">
                <div style="font-weight: bold; color: #78350f; margin-bottom: 4px;">📋 Active Filters:</div>
                <div style="color: #57534e;">${filtersSummary}</div>
                <div style="color: #57534e; margin-top: 6px;">Total exported: <strong>${filtered.length} record(s)</strong> · Exported on: ${now}</div>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                <thead><tr style="background: #1c1917; color: #fff;"><th style="padding: 8px; text-align: center; font-size: 9px; letter-spacing: 1px;">#</th><th style="padding: 8px; text-align: left; font-size: 9px; letter-spacing: 1px;">ROOM</th><th style="padding: 8px; text-align: left; font-size: 9px; letter-spacing: 1px;">GUEST</th><th style="padding: 8px; text-align: left; font-size: 9px; letter-spacing: 1px;">RECEIPT ID</th><th style="padding: 8px; text-align: left; font-size: 9px; letter-spacing: 1px;">DATE</th><th style="padding: 8px; text-align: center; font-size: 9px; letter-spacing: 1px;">TYPE</th><th style="padding: 8px; text-align: center; font-size: 9px; letter-spacing: 1px;">STATUS</th><th style="padding: 8px; text-align: right; font-size: 9px; letter-spacing: 1px;">PCS</th><th style="padding: 8px; text-align: right; font-size: 9px; letter-spacing: 1px;">AMOUNT</th></tr></thead>
                <tbody>${rowsHtml}</tbody>
                <tfoot><tr style="background: #f5f5f4; font-weight: bold;"><td colspan="7" style="padding: 10px 8px; text-align: right; font-size: 11px;">TOTALS:</td><td style="padding: 10px 8px; text-align: right; font-size: 11px;">${totalPieces}</td><td style="padding: 10px 8px; text-align: right; font-size: 11px; color: #b45309;">${totalAmount} AED</td></tr></tfoot>
            </table>
            <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 9px; color: #9ca3af;">Remal Laundry OS — Generated automatically. This document is a system export.</div>
        </div>
    `;

    const filename = `REMAL_Archives_${today}${buildFilenameSuffix()}.pdf`;
    const opt = { margin: [8, 8, 8, 8], filename: filename, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }, pagebreak: { mode: ['css', 'legacy'] } };

    try { await html2pdf().set(opt).from(container).save(); console.log('[Export PDF] Success:', filename); } catch (e) { console.error('[Export PDF] Error:', e); alert('⚠️ Error generating PDF.'); } finally { container.innerHTML = ''; }
}

function exportFilteredArchivesToCSV() {
    const filtered = getCurrentFilteredArchives();
    if (filtered.length === 0) { alert('⚠️ No records to export. Adjust your filters first.'); return; }
    const today = new Date().toISOString().split('T')[0];
    const headers = ['Index', 'Room', 'Guest', 'Receipt ID', 'Date', 'Type', 'Status', 'Pieces', 'Amount (AED)', 'Created By', 'Packaging'];
    const rows = filtered.map((entry, idx) => {
        const room = entry.room_number || entry.room || '';
        const guest = entry.guest_name || (entry.is_spa ? 'Spa Agent' : 'Guest');
        const receiptId = typeof obtenirReceiptId === 'function' ? obtenirReceiptId(entry) : `REC-${String(entry.id).slice(-6).toUpperCase()}`;
        const date = entry.created_at ? new Date(entry.created_at).toISOString() : '';
        const type = entry.is_spa ? 'SPA' : 'Hotel';
        const status = entry.status || 'Collected';
        const pcs = entry.total_pieces || entry.total_clothes || 0;
        const amount = Number(entry.grand_total || entry.total || 0).toFixed(2);
        const agent = entry.created_by || '';
        const packaging = entry.packaging || entry.folding || '';
        return [idx + 1, csvEscape(room), csvEscape(guest), csvEscape(receiptId), csvEscape(date), csvEscape(type), csvEscape(status), pcs, amount, csvEscape(agent), csvEscape(packaging)].join(',');
    });

    const totalPieces = filtered.reduce((s, e) => s + Number(e.total_pieces || e.total_clothes || 0), 0);
    const totalAmount = filtered.reduce((s, e) => s + Number(e.grand_total || e.total || 0), 0).toFixed(2);
    const totalRow = `TOTALS,,,,,,,,${totalPieces},${totalAmount},,`;
    const csv = [headers.join(','), ...rows, totalRow].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `REMAL_Archives_${today}${buildFilenameSuffix()}.csv`;
    link.href = url; link.download = filename; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
}

function csvEscape(value) {
    const str = String(value == null ? '' : value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) { return '"' + str.replace(/"/g, '""') + '"'; }
    return str;
}

function ouvrirModaleArchives() {
    const modal = document.getElementById('archivesModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    chargerArchives();
}

function fermerModaleArchives() {
    const modal = document.getElementById('archivesModal');
    if (modal) modal.classList.add('hidden');
}

async function chargerArchives() {
    const list = document.getElementById('archivesList');
    const badge = document.getElementById('archivesCountBadge');
    if (!list || !badge) return;
    if (typeof supabaseClient === 'undefined' || !supabaseClient) { list.innerHTML = `<p class="text-xs text-rose-400 text-center py-6">⚠️ Supabase not available.</p>`; badge.innerText = 'Error'; return; }
    list.innerHTML = `<p class="text-xs text-stone-500 text-center py-6">Loading archived records...</p>`;
    badge.innerText = 'Loading...';
    try {
        const { data, error } = await supabaseClient.from('archives').select('*').order('created_at', { ascending: false }).limit(500);
        if (error) { list.innerHTML = `<p class="text-xs text-rose-400 text-center py-6">⚠️ Error: ${error.message}</p>`; badge.innerText = 'Error'; return; }
        if (!data || data.length === 0) { list.innerHTML = `<p class="text-xs text-stone-500 text-center py-6">📭 No archived records yet.</p>`; badge.innerText = '0 records'; return; }
        badge.innerText = `${data.length} record${data.length > 1 ? 's' : ''} loaded`;
        list.innerHTML = data.map(entry => {
            const room = entry.room_number || entry.room || '---';
            const guest = entry.guest_name || 'Guest';
            const receiptId = typeof obtenirReceiptId === 'function' ? obtenirReceiptId(entry) : `REC-${String(entry.id).slice(-6).toUpperCase()}`;
            const dateFormatted = entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }) : '---';
            const archivedAt = entry.archived_at ? new Date(entry.archived_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' }) : '---';
            const status = entry.status || 'Collected';
            const pcs = entry.total_pieces || 0;
            const amount = Number(entry.grand_total || 0).toFixed(2);
            const type = entry.service_type || 'laundry';
            return `<div class="p-3 bg-[#181614] rounded-2xl border border-[#2f2820] text-xs"><div class="flex justify-between items-start"><div class="flex-1"><div class="font-bold text-[#DCA773]">🏠 Room ${room} — ${guest}</div><div class="text-[10px] text-stone-500 mt-1">#${receiptId} · ${type} · Status: <span class="text-stone-300 font-semibold">${status}</span></div><div class="text-[10px] text-stone-500 mt-0.5">📅 Created: ${dateFormatted} · 📦 Archived: ${archivedAt}</div></div><div class="text-right ml-3"><div class="font-bold text-stone-200 text-sm">${amount} AED</div><div class="text-[10px] text-stone-500">${pcs} pcs</div></div></div></div>`;
        }).join('');
    } catch (e) { list.innerHTML = `<p class="text-xs text-rose-400 text-center py-6">⚠️ Unexpected error.</p>`; badge.innerText = 'Error'; }
}

// ═══════════════════════════════════════════════════════════════════
// LOST & FOUND
// ═══════════════════════════════════════════════════════════════════
function previewLFImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 600; const MAX_HEIGHT = 600;
            let width = img.width; let height = img.height;
            if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
            currentLFPhotoData = canvas.toDataURL('image/jpeg', 0.7);
            const previewEl = document.getElementById('lfImagePreview');
            previewEl.src = currentLFPhotoData; previewEl.classList.remove('hidden');
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
}

async function saveLostFoundItem() {
    const name = document.getElementById('lfItemName').value.trim();
    const loc = document.getElementById('lfItemLoc').value.trim();
    const note = document.getElementById('lfItemNote').value.trim();
    if (!name || !loc) { alert("Please enter the item name and location."); return; }
    const items = JSON.parse(localStorage.getItem('remal_lost_found') || '[]');
    const newItem = { id: Date.now(), is_lost_found: true, name: name, loc: loc, note: note, photo: currentLFPhotoData || null, date: new Date().toLocaleString(), status: 'Unclaimed' };
    items.unshift(newItem); localStorage.setItem('remal_lost_found', JSON.stringify(items));
    if (typeof writeRecordToFile === 'function') await writeRecordToFile(newItem);
    document.getElementById('lfItemName').value = ''; document.getElementById('lfItemLoc').value = ''; document.getElementById('lfItemNote').value = ''; document.getElementById('lfItemPhoto').value = ''; document.getElementById('lfImagePreview').classList.add('hidden'); currentLFPhotoData = null; document.getElementById('lfFormCard').classList.add('hidden');
    renderLostFoundItems(); alert("✅ Lost & Found item saved successfully!");
}

function renderLostFoundItems() {
    const container = document.getElementById('lfItemsGrid');
    if (!container) return;
    const items = JSON.parse(localStorage.getItem('remal_lost_found') || '[]');
    if (items.length === 0) { container.innerHTML = `<p class="text-xs text-stone-500 text-center py-6 col-span-full">No lost and found items registered.</p>`; return; }
    container.innerHTML = '';
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'remal-card p-4 rounded-2xl space-y-3 relative';
        div.innerHTML = `${item.photo ? `<img src="${item.photo}" class="w-full h-36 object-cover rounded-xl border border-[#2f2820]">` : ''}<div><div class="flex justify-between items-start"><h4 class="font-serif-luxury font-bold text-[#DCA773] text-base">${item.name}</h4><span class="text-[9px] ${item.status === 'Claimed' ? 'bg-emerald-950 text-emerald-200 border-emerald-800' : 'bg-amber-950 text-amber-200 border-amber-800'} border font-bold px-2 py-0.5 rounded-md">${item.status}</span></div><p class="text-xs text-stone-300 mt-1">📍 <strong>Location:</strong> ${item.loc}</p>${item.note ? `<p class="text-xs text-stone-400 italic mt-1">"${item.note}"</p>` : ''}<p class="text-[10px] text-stone-500 mt-2">📅 Found: ${item.date}</p></div><div class="flex gap-2 pt-2 border-t border-[#2f2820]"><button onclick="toggleLFStatus(${item.id})" class="flex-1 py-2 bg-[#181614] hover:bg-[#211e1a] text-stone-300 font-bold rounded-xl text-[10px] border border-[#2f2820]">Toggle Status</button><button onclick="deleteLFItem(${item.id})" class="py-2 px-3 bg-rose-950 hover:bg-rose-900 text-rose-200 font-bold rounded-xl text-[10px] border border-rose-800">🗑️</button></div>`;
        container.appendChild(div);
    });
}

function toggleLFStatus(id) {
    let items = JSON.parse(localStorage.getItem('remal_lost_found') || '[]');
    items = items.map(i => { if (i.id === id) { i.status = i.status === 'Unclaimed' ? 'Claimed' : 'Unclaimed'; } return i; });
    localStorage.setItem('remal_lost_found', JSON.stringify(items)); renderLostFoundItems();
}

function deleteLFItem(id) {
    if (confirm("Delete this lost item record?")) {
        let items = JSON.parse(localStorage.getItem('remal_lost_found') || '[]');
        items = items.filter(i => i.id !== id);
        localStorage.setItem('remal_lost_found', JSON.stringify(items)); renderLostFoundItems();
    }
}

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════
function renderManagementDashboard() {
    chargerDonneesLocalStorage();
    const now = new Date();
    let startDate = new Date();

    switch (currentDashboardPeriod) {
        case 'today': startDate.setHours(0, 0, 0, 0); break;
        case '7d': startDate.setDate(now.getDate() - 7); break;
        case '30d': startDate.setDate(now.getDate() - 30); break;
        case '90d': startDate.setDate(now.getDate() - 90); break;
    }

    const periodLength = now - startDate;
    const prevStart = new Date(startDate.getTime() - periodLength);
    const prevEnd = startDate;

    const currentSlips = cachedSlips.filter(s => { if (!s.created_at) return false; const d = new Date(s.created_at); return d >= startDate && d <= now; });
    const prevSlips = cachedSlips.filter(s => { if (!s.created_at) return false; const d = new Date(s.created_at); return d >= prevStart && d < prevEnd; });

    function computeMetrics(slips) {
        let revenue = 0, orders = slips.length, garments = 0;
        let laundry = 0, spa = 0;
        let statusCounts = { Collected: 0, Washing: 0, Ready: 0, Delivered: 0, Pending: 0 };
        let revenueByDate = {}, roomRevenue = {}, agencyRevenue = {}, roomGuests = {}, agencyOrders = {};

        slips.forEach(s => {
            const rev = Number(s.grand_total || s.total || 0);
            const pcs = Number(s.total_pieces || s.total_clothes || 0);
            revenue += rev; garments += pcs;
            if (s.is_spa) { spa += rev; } else {
                laundry += rev;
                const room = String(s.room_number || s.room || '---');
                roomRevenue[room] = (roomRevenue[room] || 0) + rev;
                if (!roomGuests[room]) roomGuests[room] = s.guest_name || 'Guest';
                const agency = s.agency || 'Direct';
                agencyRevenue[agency] = (agencyRevenue[agency] || 0) + rev;
                agencyOrders[agency] = (agencyOrders[agency] || 0) + 1;
            }
            let st = s.status || 'Collected';
            if (statusCounts[st] !== undefined) statusCounts[st]++; else statusCounts.Collected++;
            if (s.created_at) { const dStr = s.created_at.split('T')[0]; revenueByDate[dStr] = (revenueByDate[dStr] || 0) + rev; }
        });

        return { revenue, orders, garments, laundry, spa, statusCounts, revenueByDate, roomRevenue, agencyRevenue, roomGuests, agencyOrders, slips: slips };
    }
    const m = computeMetrics(currentSlips);
    const p = computeMetrics(prevSlips);

    if (typeof animateNumber === 'function') {
        animateNumber(document.getElementById('kpiRevenue'), m.revenue, 'AED');
        animateNumber(document.getElementById('kpiOrders'), m.orders, '');
        animateNumber(document.getElementById('kpiGarments'), m.garments, 'pcs');
        animateNumber(document.getElementById('kpiLaundry'), m.laundry, 'AED');
        animateNumber(document.getElementById('kpiSpa'), m.spa, 'AED');
    }

    function updateDelta(elId, curr, prev) {
        const el = document.getElementById(elId); if (!el) return;
        if (prev === 0) { el.style.display = 'none'; return; }
        const delta = ((curr - prev) / prev) * 100;
        el.style.display = 'inline-flex';
        el.className = 'dashboard-kpi-delta ' + (delta >= 0 ? 'up' : 'down');
        el.textContent = `${delta >= 0 ? '↑' : '↓'} ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`;
    }

    updateDelta('kpiRevenueDelta', m.revenue, p.revenue);
    updateDelta('kpiOrdersDelta', m.orders, p.orders);
    updateDelta('kpiGarmentsDelta', m.garments, p.garments);
    updateDelta('kpiLaundryDelta', m.laundry, p.laundry);
    updateDelta('kpiSpaDelta', m.spa, p.spa);

    requestAnimationFrame(() => {
        const pieEl = document.getElementById('spaVsLaundryChart');
        if (pieEl && typeof Chart !== 'undefined') { if (window._spaVsLaundryChart) window._spaVsLaundryChart.destroy(); window._spaVsLaundryChart = new Chart(pieEl.getContext('2d'), { type: 'doughnut', data: { labels: ['Laundry', 'SPA'], datasets: [{ data: [m.laundry, m.spa], backgroundColor: ['#93c5fd', '#d8b4fe'], borderWidth: 0, hoverOffset: 12 }] }, options: { responsive: true, maintainAspectRatio: false, animation: { duration: 1500, easing: 'easeOutQuart' }, plugins: { legend: { position: 'bottom', labels: { color: '#d6d3d1', font: { size: 11, weight: 600 }, padding: 16 } } } } }); }
        const doughnutEl = document.getElementById('statusDoughnutChart');
        if (doughnutEl && typeof Chart !== 'undefined') { if (window._statusDoughnutChart) window._statusDoughnutChart.destroy(); window._statusDoughnutChart = new Chart(doughnutEl.getContext('2d'), { type: 'doughnut', data: { labels: ['Collected', 'Washing', 'Ready', 'Delivered'], datasets: [{ data: [m.statusCounts.Collected + m.statusCounts.Pending, m.statusCounts.Washing, m.statusCounts.Ready, m.statusCounts.Delivered], backgroundColor: ['#57534e', '#3b82f6', '#a855f7', '#10b981'], borderWidth: 0, hoverOffset: 12 }] }, options: { responsive: true, maintainAspectRatio: false, animation: { duration: 1500, easing: 'easeOutQuart' }, plugins: { legend: { position: 'bottom', labels: { color: '#d6d3d1', font: { size: 11, weight: 600 }, padding: 16 } } } } }); }
        const barEl = document.getElementById('revenueBarChart');
        if (barEl && typeof Chart !== 'undefined') {
            const dates = Object.keys(m.revenueByDate).sort();
            const revenues = dates.map(d => m.revenueByDate[d]);
            if (window._revenueBarChart) window._revenueBarChart.destroy();
            window._revenueBarChart = new Chart(barEl.getContext('2d'), { type: 'bar', data: { labels: dates.length > 0 ? dates : ['No Data'], datasets: [{ label: 'Revenue (AED)', data: revenues.length > 0 ? revenues : [0], backgroundColor: (ctx) => { const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300); g.addColorStop(0, '#F8E9C0'); g.addColorStop(1, '#B88351'); return g; }, borderRadius: 8, borderSkipped: false }] }, options: { responsive: true, maintainAspectRatio: false, animation: { duration: 1800, easing: 'easeOutQuart' }, plugins: { legend: { display: false } }, scales: { y: { ticks: { color: '#a8a29e', font: { size: 11 } }, grid: { color: 'rgba(47,40,32,0.4)' } }, x: { ticks: { color: '#a8a29e', font: { size: 11 } }, grid: { display: false } } } } });
        }
    });

    const topRooms = Object.entries(m.roomRevenue).map(([room, value]) => ({ name: `Room ${room}`, value, sub: m.roomGuests[room] || '' })).sort((a, b) => b.value - a.value).slice(0, 5);
    if (typeof renderTopList === 'function') renderTopList('topRoomsList', topRooms, true);

    const topAgencies = Object.entries(m.agencyRevenue).map(([agency, value]) => ({ name: agency, value, sub: `${m.agencyOrders[agency]} order${m.agencyOrders[agency] > 1 ? 's' : ''}` })).sort((a, b) => b.value - a.value).slice(0, 5);
    if (typeof renderTopList === 'function') renderTopList('topAgenciesList', topAgencies, true);

    if (typeof renderAgentPerformance === 'function') renderAgentPerformance(m && m.slips ? m.slips : []);
    if (typeof renderProcessingTimes === 'function') renderProcessingTimes(m && m.slips ? m.slips : []);
}

// ═══════════════════════════════════════════════════════════════════
// SESSION STAFF & LOGIN (Auto-connect)
// ═══════════════════════════════════════════════════════════════════
function checkStaffSession() {
    const savedStaff = localStorage.getItem('remal_current_staff');
    const loginModal = document.getElementById('staffLoginModal');

    if (savedStaff) {
        try {
            currentStaffUser = JSON.parse(savedStaff);
            console.log("✅ Staff session restored:", currentStaffUser);
            if (loginModal) loginModal.classList.add('hidden');
            if (typeof updateStaffUIIndicator === 'function') updateStaffUIIndicator();
            if (typeof applyRoleVisibility === 'function') applyRoleVisibility();
            return;
        } catch (e) {}
    }

    console.warn("⚠️ No staff session found - Auto-login Admin");
    currentStaffUser = { id: 'admin', name: 'Admin', role: 'admin', pin_code: '1994' };
    saveAndUnlockSession();
}

async function verifyStaffPin() {
    const pinInput = document.getElementById('staffPinInput');
    const errorMsg = document.getElementById('loginErrorMsg');
    const pin = pinInput ? pinInput.value.trim() : '';
    if (!pin) return;

    const localStaff = {
        '1994': { name: 'Admin', role: 'admin' },
        '2468': { name: 'Sangare', role: 'staff' },
        '3579': { name: 'Suraj', role: 'staff' },
        '4681': { name: 'Ram', role: 'staff' },
        '5723': { name: 'Kuldeep', role: 'staff' },
        '6834': { name: 'Balkran', role: 'staff' },
        '7945': { name: 'Arif', role: 'staff' }
    };

    if (localStaff[pin]) {
        currentStaffUser = { id: pin, name: localStaff[pin].name, role: localStaff[pin].role, pin_code: pin };
        saveAndUnlockSession();
        return;
    }

    if(errorMsg) errorMsg.classList.remove('hidden');
    if(pinInput) pinInput.value = '';
}

function saveAndUnlockSession() {
    localStorage.setItem('remal_current_staff', JSON.stringify(currentStaffUser));
    const loginModal = document.getElementById('staffLoginModal');
    if (loginModal) loginModal.classList.add('hidden');
    if (typeof updateStaffUIIndicator === 'function') updateStaffUIIndicator();
    if (typeof applyRoleVisibility === 'function') applyRoleVisibility();
}

function updateStaffUIIndicator() {
    const indicator = document.getElementById('currentLoggedStaff');
    const headerIndicator = document.getElementById('staffIndicatorHeader');
    const headerName = document.getElementById('staffNameHeader');
    const roleName = document.getElementById('roleBadgeName');
    const roleIcon = document.getElementById('roleBadgeIcon');
    const roleRole = document.getElementById('roleBadgeRole');
    
    if (currentStaffUser) {
        if (indicator) indicator.innerText = `👤 ${currentStaffUser.name}`;
        if (headerIndicator) headerIndicator.classList.remove('hidden');
        if (headerName) headerName.innerText = currentStaffUser.name;
        if (roleName) roleName.textContent = currentStaffUser.name || 'Staff';
        const isAdminUser = String(currentStaffUser.role || '').toLowerCase() === 'admin';
        if (roleIcon) roleIcon.textContent = isAdminUser ? '👑' : '👤';
        if (roleRole) roleRole.textContent = isAdminUser ? 'Manager' : 'Staff';
    } else {
        if (headerIndicator) headerIndicator.classList.add('hidden');
    }
}

function logoutStaff() {
    localStorage.removeItem('remal_current_staff');
    currentStaffUser = null;
    window.location.reload(true);
}

function confirmLogout() {
    if (!currentStaffUser) return;
    const confirmed = confirm(`🚪 Log out?\n\nCurrent agent: ${currentStaffUser.name}\nRole: ${currentStaffUser.role}\n\nYou will need to enter your PIN again to continue.`);
    if (confirmed) { logoutStaff(); }
}

// ═══════════════════════════════════════════════════════════════════
// SPA DETAILS MODAL
// ═══════════════════════════════════════════════════════════════════
async function ouvrirSpaDetailModal(recordId) {
    if (!recordId) return;
    currentSpaRecordId = String(recordId);
    chargerDonneesLocalStorage();
    const entry = cachedSlips.find(s => String(s.id) === String(recordId));
    if (!entry || !entry.is_spa) return;

    const dateFormatted = entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-GB') : '---';
    document.getElementById('spaDetailDate').innerText = dateFormatted;
    document.getElementById('spaDetailGivenBy').innerText = entry.guest_name || '---';
    document.getElementById('spaDetailSerial').innerText = entry.spa_serial || '---';
    document.getElementById('spaDetailReceiptId').innerText = '#' + (entry.receipt_id || 'REC-' + String(entry.id).slice(-6).toUpperCase());
    document.getElementById('spaDetailAgent').innerText = typeof formatAgentDisplay === 'function' ? formatAgentDisplay(entry.created_by) : entry.created_by;
    document.getElementById('spaDetailPackaging').innerText = entry.service_type || 'SPA Daily Sheet';
    document.getElementById('spaDetailCollectedBy').innerText = entry.options?.collected_by || '---';
    document.getElementById('spaDetailDeliveredBy').innerText = entry.options?.delivered_by || '---';
    document.getElementById('spaDetailCollectionDate').innerText = (entry.options?.collection_date || '---') + ' ' + (entry.options?.collection_time || '');
    document.getElementById('spaDetailDeliveryDate').innerText = (entry.options?.delivery_date || '---') + ' ' + (entry.options?.delivery_time || '');

    const tableBody = document.getElementById('spaDetailTableBody');
    tableBody.innerHTML = '';
    let grandTotal = 0;
    let items = entry.items || [];
    if (typeof items === 'string') { try { items = JSON.parse(items); } catch(e) { items = []; } }
    if (!Array.isArray(items)) items = Object.values(items);

    items.forEach(item => {
        const qty = parseInt(item.quantity || item.qty, 10) || 0;
        const rate = parseFloat(item.unit_price || item.price) || 0;
        const total = qty * rate;
        if (qty <= 0) return;
        grandTotal += total;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${item.name || 'Item'}</td><td class="text-center">${qty}</td><td class="text-center">${rate.toFixed(2)}</td><td class="text-right">${total.toFixed(2)} AED</td>`;
        tableBody.appendChild(tr);
    });

    document.getElementById('spaDetailGrandTotal').innerText = `${grandTotal.toFixed(2)} AED`;
    document.getElementById('spaDetailModal').classList.remove('hidden');
    if (navigator.vibrate) navigator.vibrate(15);
}

function fermerSpaDetailModal() {
    document.getElementById('spaDetailModal').classList.add('hidden');
    currentSpaRecordId = null;
}

function modifierSpaRecord() {
    if (!currentSpaRecordId) return;
    fermerSpaDetailModal();
    chargerDonneesLocalStorage();
    const entry = cachedSlips.find(s => String(s.id) === String(currentSpaRecordId));
    if (entry && typeof switchMainSection === 'function') {
        switchMainSection('spa');
        document.getElementById('editingSpaId').value = entry.id;
        document.getElementById('spa-serial-no').value = entry.spa_serial || '';
        document.getElementById('spa-given-by').value = entry.guest_name || '';
        document.getElementById('spa-collected-by').value = entry.options?.collected_by || '';
        document.getElementById('spa-delivered-by').value = entry.options?.delivered_by || '';
    }
}

async function dupliquerSpaRecord() {
    if (!currentSpaRecordId) return;
    fermerSpaDetailModal();
    if (typeof switchMainSection === 'function') switchMainSection('spa');
    document.getElementById('editingSpaId').value = ''; document.getElementById('spa-serial-no').value = ''; document.getElementById('spa-given-by').value = ''; document.getElementById('spa-collected-by').value = ''; document.getElementById('spa-delivered-by').value = '';
    alert('📋 Formulaire réinitialisé.');
}

async function supprimerSpaRecord() {
    if (!currentSpaRecordId) return;
    if (!confirm('🗑️ Supprimer ce SPA Sheet ?')) return;
    const id = currentSpaRecordId;
    isLocalUpdating = true;
    if (typeof supabaseClient !== 'undefined' && supabaseClient && id.length === 36) {
        try { await supabaseClient.from('guest_laundry_requests').delete().eq('id', id); } catch (e) { console.warn(e); }
    }
    chargerDonneesLocalStorage();
    cachedSlips = cachedSlips.filter(s => String(s.id) !== String(id));
    sauvegarderDonneesLocalStorage();
    fermerSpaDetailModal();
    if (typeof chargerLiveOrders === 'function') chargerLiveOrders();
    if (typeof afficherListeBordereauxLocal === 'function') afficherListeBordereauxLocal();
    setTimeout(() => { isLocalUpdating = false; }, 800);
}

window.ouvrirSpaDetailModal = ouvrirSpaDetailModal;
window.fermerSpaDetailModal = fermerSpaDetailModal;
window.modifierSpaRecord = modifierSpaRecord;
window.dupliquerSpaRecord = dupliquerSpaRecord;
window.supprimerSpaRecord = supprimerSpaRecord;
