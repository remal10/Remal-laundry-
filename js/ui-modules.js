// ═══════════════════════════════════════════════════════════════════
// REMAL LAUNDRY OS — UI MODULES
// Archives, Lost & Found, Dashboard, SPA, Cloud, Login
// ⚠️ Chargé APRÈS ui-live.js
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// PHASE 2.2 — STATUS FILTER STATE
// PHASE 2.3 — DATE FILTER STATE
// ═══════════════════════════════════════════════════════════════════

// Phase 2.2 — Status filter ('all' | 'pending' | 'washing' | 'ready' | 'delivered')
let currentStatusFilter = 'all';

// Phase 2.3 — Quick date filter ('today' | '7d' | '30d' | '90d' | null = no filter)
let currentDateFilter = null;

// ═══════════════════════════════════════════════════════════════════
// PHASE 2.4 — ROOM AUTOCOMPLETE IN SEARCH
// ═══════════════════════════════════════════════════════════════════

let searchRoomDebounceTimer = null;

/**
 * Extract unique room numbers from cachedSlips, sorted ascending
 * @returns {string[]}
 */
function getUniqueRoomsFromArchives() {
    if (typeof cachedSlips === 'undefined' || !Array.isArray(cachedSlips)) return [];
    const rooms = new Set();
    cachedSlips.forEach(entry => {
        const room = String(entry.room_number || entry.room || '').trim();
        if (room && /^\d+$/.test(room)) rooms.add(room);
    });
    return Array.from(rooms).sort((a, b) => parseInt(a) - parseInt(b));
}

/**
 * Handle input/focus on #searchRoom — debounced autocomplete
 * @param {Event} event
 */
function onSearchRoomInput(event) {
    if (searchRoomDebounceTimer) clearTimeout(searchRoomDebounceTimer);
    searchRoomDebounceTimer = setTimeout(() => {
        renderSearchRoomDropdown(event?.target?.value || '');
    }, 200);
}

/**
 * Render autocomplete dropdown for #searchRoom
 * @param {string} query
 */
function renderSearchRoomDropdown(query) {
    const dropdown = document.getElementById('searchRoomDropdown');
    if (!dropdown) return;

    const input = document.getElementById('searchRoom');
    if (!input) return;

    const q = String(query || '').trim().toLowerCase();

    // If query looks like a guest name or SPA serial (contains letters or #), don't show room suggestions
    if (q && !/^\d+$/.test(q)) {
        dropdown.classList.add('hidden');
        dropdown.innerHTML = '';
        // Still trigger the standard filter
        if (typeof afficherListeBordereauxLocal === 'function') {
            afficherListeBordereauxLocal();
        }
        return;
    }

    const allRooms = getUniqueRoomsFromArchives();
    const matches = q
        ? allRooms.filter(r => r.startsWith(q))
        : allRooms;

    // Limit to 12 results for cleanliness
    const limited = matches.slice(0, 12);

    if (limited.length === 0) {
        dropdown.classList.add('hidden');
        dropdown.innerHTML = '';
        if (typeof afficherListeBordereauxLocal === 'function') {
            afficherListeBordereauxLocal();
        }
        return;
    }

    dropdown.innerHTML = limited.map(room => `
        <button type="button"
                onclick="selectSearchRoom('${room}')"
                class="w-full text-left px-4 py-2.5 text-xs font-semibold text-stone-200 hover:bg-[#181614] border-b border-[#2f2820] last:border-b-0 transition flex items-center justify-between">
            <span>🏠 Room <strong class="text-[#DCA773]">${room}</strong></span>
            <span class="text-[10px] text-stone-500">→</span>
        </button>
    `).join('');

    dropdown.classList.remove('hidden');
}

/**
 * Apply a room suggestion: fill input + hide dropdown + re-run filter
 * @param {string} room
 */
function selectSearchRoom(room) {
    const input = document.getElementById('searchRoom');
    if (input) input.value = room;

    const dropdown = document.getElementById('searchRoomDropdown');
    if (dropdown) {
        dropdown.classList.add('hidden');
        dropdown.innerHTML = '';
    }

    if (typeof afficherListeBordereauxLocal === 'function') {
        afficherListeBordereauxLocal();
    }

    console.log('[SearchRoom] Selected:', room);
}

/**
 * Close dropdown when clicking outside
 */
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('searchRoomDropdown');
    const input = document.getElementById('searchRoom');
    if (!dropdown || !input) return;
    if (!dropdown.contains(e.target) && e.target !== input) {
        dropdown.classList.add('hidden');
    }
});

/**
 * Close dropdown on Escape key
 */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const dropdown = document.getElementById('searchRoomDropdown');
        if (dropdown) dropdown.classList.add('hidden');
    }
});

// ═══════════════════════════════════════════════════════════════════
// CHARGEMENT DONNÉES CLOUD
// ═══════════════════════════════════════════════════════════════════
async function chargerDonneesEtAbonnementCloud() {
    chargerDonneesLocalStorage();

    if (!supabaseClient) {
        console.warn("Supabase client non initialisé. Mode 100% Local actif.");
        return;
    }

    try {
        // Limiter aux 90 derniers jours (archives illimitées dans Supabase, affichage limité)
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
                if (typeof parsedItems === 'string') {
                    try { parsedItems = JSON.parse(parsedItems); } catch(e) { parsedItems = []; }
                }
                if (parsedItems && typeof parsedItems === 'object' && !Array.isArray(parsedItems)) {
                    parsedItems = Object.values(parsedItems);
                }
                if (!Array.isArray(parsedItems)) parsedItems = [];

                const existing = slipMap.get(String(s.id));
                const localCreatedBy = existing?.created_by ? String(existing.created_by) : '';
                const supaCreatedBy = s.created_by ? String(s.created_by) : '';
                
                const shouldPreserveLocal = localCreatedBy.startsWith('staff (') && 
                                            !supaCreatedBy.startsWith('staff (');

                if (shouldPreserveLocal) {
                    console.log("🛡️ [ChargerCloud] Préservation local pour ID:", s.id, "→", localCreatedBy);
                    slipMap.set(String(s.id), { 
                        ...existing,
                        ...s, 
                        id: String(s.id),
                        room: roomClean, 
                        room_number: roomClean,
                        items: parsedItems,
                        created_by: localCreatedBy,
                        status: existing.status
                    });
                } else {
                    slipMap.set(String(s.id), { 
                        ...existing,
                        ...s, 
                        id: String(s.id),
                        room: roomClean, 
                        room_number: roomClean,
                        items: parsedItems
                    });
                }
            });
            
            cachedSlips = Array.from(slipMap.values());
            sauvegarderDonneesLocalStorage();
            chargerLiveOrders();
        } else if (slipsErr) {
            console.warn("Erreur lecture guest_laundry_requests sur Supabase:", slipsErr.message);
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

    } catch (e) {
        console.error("Exception lors de la synchronisation cloud:", e);
    }
}

// ═══════════════════════════════════════════════════════════════════
// TABLE PMS PREVIEW
// ═══════════════════════════════════════════════════════════════════
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

// ─────────────────────────────────────────────────────────────────
// PHASE 2.2 — STATUS FILTER CHIPS
// ─────────────────────────────────────────────────────────────────
function switchStatusFilter(status) {
    currentStatusFilter = status;

    // Reset all status chips
    ['All', 'Pending', 'Washing', 'Ready', 'Delivered'].forEach(label => {
        const btn = document.getElementById('statusFilter' + label);
        if (btn) {
            btn.className = 'status-filter-btn px-3 py-1.5 rounded-full text-xs font-semibold border border-[#2f2820] text-stone-400 hover:bg-[#181614] transition';
        }
    });

    // Activate selected chip
    const activeLabel = status.charAt(0).toUpperCase() + status.slice(1);
    const activeBtn = document.getElementById('statusFilter' + activeLabel);
    if (activeBtn) {
        activeBtn.className = 'status-filter-btn px-3 py-1.5 rounded-full text-xs font-semibold border border-[#DCA773] bg-[#DCA773] text-stone-950 shadow transition';
    }

    afficherListeBordereauxLocal();
    console.log('[StatusFilter] Applied:', status);
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

// ─────────────────────────────────────────────────────────────────
// PHASE 2.3 — QUICK DATE FILTERS
// ─────────────────────────────────────────────────────────────────
function switchDateFilter(range) {
    // Toggle: clicking active filter clears it
    currentDateFilter = (currentDateFilter === range) ? null : range;

    // Reset all date chips
    ['Today', '7d', '30d', '90d'].forEach(label => {
        const btn = document.getElementById('dateFilter' + label);
        if (btn) {
            btn.className = 'date-filter-btn px-3 py-1.5 rounded-full text-xs font-semibold border border-[#2f2820] text-stone-400 hover:bg-[#181614] transition';
        }
    });

    // Activate selected chip
    if (currentDateFilter) {
        const activeLabel = currentDateFilter.charAt(0).toUpperCase() + currentDateFilter.slice(1);
        const activeBtn = document.getElementById('dateFilter' + activeLabel);
        if (activeBtn) {
            activeBtn.className = 'date-filter-btn px-3 py-1.5 rounded-full text-xs font-semibold border border-[#DCA773] bg-[#DCA773] text-stone-950 shadow transition';
        }
    }

    afficherListeBordereauxLocal();
    console.log('[DateFilter] Applied:', currentDateFilter || 'none');
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
        case 'today': {
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            return recordDate >= today;
        }
        case '7d':  return diffDays <= 7;
        case '30d': return diffDays <= 30;
        case '90d': return diffDays <= 90;
        default:    return true;
    }
}

// ═══════════════════════════════════════════════════════════════════
// AFFICHAGE LISTE BORDEREAUX
// ═══════════════════════════════════════════════════════════════════
function afficherListeBordereauxLocal() {
    chargerDonneesLocalStorage();
    const searchVal = document.getElementById('searchRoom').value.toLowerCase().trim();
    const searchDateVal = document.getElementById('searchDate').value;

    let filtered = cachedSlips.filter(entry => {
        const roomNum = String(entry.room_number || entry.room || '').toLowerCase();
        const receiptId = typeof obtenirReceiptId === 'function' ? obtenirReceiptId(entry).toLowerCase() : '';
        const matchRoom = !searchVal || 
            roomNum.includes(searchVal) || 
            receiptId.includes(searchVal) ||
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

        // Phase 2.2 — Status filter
        if (!matchesStatusFilter(entry)) return false;

        // Phase 2.3 — Date filter
        if (!matchesDateFilter(entry)) return false;

        return matchRoom && matchDate && matchCategory;
    });

    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    const container = document.getElementById('laundryList');
    if (!container) return;

    // ✅ Phase 1.4 — Bandeau info si > 50 records
    const existingBanner = document.getElementById('archives-info-banner');
    if (existingBanner) existingBanner.remove();

    if (cachedSlips.length > 50) {
        const infoBanner = document.createElement('div');
        infoBanner.id = 'archives-info-banner';
        infoBanner.className = 'bg-amber-950/40 border border-amber-800 rounded-2xl p-3 text-xs text-amber-200 font-semibold mb-3';
      infoBanner.innerHTML = `
    📚 <strong>Archives limited to 90 days</strong> — 
    <span class="text-stone-300">${cachedSlips.length} records loaded.</span> 
    Older data is automatically archived.
`;
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
            let badgeClass = 'luxe-badge luxe-badge-collected';
            if(entry.extra_charged || entry.count_type === 'quota_extra') {
                badgeLabel = 'Quota + Extra';
                badgeClass = 'luxe-badge luxe-badge-ready';
            } else if(entry.count_type === 'guest') {
                badgeLabel = 'Chargeable';
                badgeClass = 'luxe-badge luxe-badge-chargeable';
            }

            const roomNum = entry.room_number || entry.room || '---';
            const receiptId = typeof obtenirReceiptId === 'function' ? obtenirReceiptId(entry) : `REC-${String(entry.id).slice(-6).toUpperCase()}`;
            const dateFormatted = entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-GB', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : '---';

            const totalPcs = entry.total_pieces || entry.total_clothes || 0;
            const totalAmount = entry.grand_total || entry.total || 0;
            const agentDisplay = formatAgentDisplay(entry.created_by);

            html += `
                <div onclick="ouvrirModalDetails('${entry.id}')" class="p-4 bg-[#0f0e0c] rounded-2xl border border-[#2f2820] text-xs flex justify-between items-center cursor-pointer hover:border-[#DCA773] transition">
                    <div>
                        <span class="font-serif-luxury font-bold text-[#DCA773] text-sm sm:text-base">Room ${roomNum} (${entry.guest_name || 'Guest'})</span>
                        <span class="ml-2 ${badgeClass}">${badgeLabel}</span>
                        <div class="text-[10px] text-stone-400 mt-1">#${receiptId} | 📅 ${dateFormatted} | Agent: ${agentDisplay}</div>
                    </div>
                    <div class="text-right font-bold text-stone-200">
                        <small class="text-stone-400 font-normal">(${totalPcs} pcs)</small> 
                        <span class="text-[#DCA773] font-serif-luxury text-base sm:text-lg ml-1.5">${totalAmount.toFixed(2)} AED</span> 
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
            const dateFormatted = entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-GB', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : '---';

            const totalPcs = entry.total_pieces || entry.total_clothes || 0;
            const totalAmount = entry.grand_total || entry.total || 0;

            html += `
                <div onclick="ouvrirModalDetails('${entry.id}')" class="p-4 bg-[#0f0e0c] rounded-2xl border border-[#2f2820] text-xs flex justify-between items-center cursor-pointer hover:border-purple-500 transition">
                    <div>
                        <span class="font-serif-luxury font-bold text-purple-300 text-sm sm:text-base">SPA Sheet #${entry.spa_serial || '---'} — ${entry.guest_name || 'Spa Agent'}</span>
                        <span class="ml-2 luxe-badge luxe-badge-spa">SPA Daily Sheet</span>
                        <div class="text-[10px] text-stone-400 mt-1">📅 ${dateFormatted} | Delivered by: ${entry.options?.delivered_by || 'Staff'}</div>
                    </div>
                    <div class="text-right font-bold text-stone-200">
                        <small class="text-stone-400 font-normal">(${totalPcs} pcs)</small> 
                        <span class="text-purple-300 font-serif-luxury text-base sm:text-lg ml-1.5">${totalAmount.toFixed(2)} AED</span> 
                    </div>
                </div>
            `;
        });

        html += `</div></div>`;
    }

    // Phase 2.1 — Result counter
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

// ═══════════════════════════════════════════════════════════════════
// PHASE 3 — EXPORT FILTERED ARCHIVES (PDF + CSV)
// ═══════════════════════════════════════════════════════════════════

/**
 * Returns the currently filtered list (same logic as afficherListeBordereauxLocal)
 * @returns {Array}
 */
function getCurrentFilteredArchives() {
    if (typeof cachedSlips === 'undefined' || !Array.isArray(cachedSlips)) return [];

    const searchRoomEl = document.getElementById('searchRoom');
    const searchDateEl = document.getElementById('searchDate');
    const searchVal = searchRoomEl ? searchRoomEl.value.toLowerCase().trim() : '';
    const searchDateVal = searchDateEl ? searchDateEl.value : '';

    let filtered = cachedSlips.filter(entry => {
        const roomNum = String(entry.room_number || entry.room || '').toLowerCase();
        const receiptId = typeof obtenirReceiptId === 'function' ? obtenirReceiptId(entry).toLowerCase() : '';
        const matchRoom = !searchVal ||
            roomNum.includes(searchVal) ||
            receiptId.includes(searchVal) ||
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

        if (!matchesStatusFilter(entry)) return false;
        if (!matchesDateFilter(entry)) return false;

        return matchRoom && matchDate && matchCategory;
    });

    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return filtered;
}

/**
 * Build a human-readable filters summary string
 * @returns {string}
 */
function buildFiltersSummary() {
    const parts = [];
    if (currentArchiveFilter && currentArchiveFilter !== 'all') {
        parts.push(`Category=${currentArchiveFilter === 'laundry' ? 'Hotel Laundry' : 'SPA Laundry'}`);
    }
    if (currentStatusFilter && currentStatusFilter !== 'all') {
        parts.push(`Status=${currentStatusFilter.charAt(0).toUpperCase() + currentStatusFilter.slice(1)}`);
    }
    if (currentDateFilter) {
        const labels = { today: 'Today', '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days' };
        parts.push(`Date=${labels[currentDateFilter] || currentDateFilter}`);
    }
    const searchRoomEl = document.getElementById('searchRoom');
    if (searchRoomEl && searchRoomEl.value.trim()) {
        parts.push(`Search="${searchRoomEl.value.trim()}"`);
    }
    const searchDateEl = document.getElementById('searchDate');
    if (searchDateEl && searchDateEl.value) {
        parts.push(`Date=${searchDateEl.value}`);
    }
    return parts.length > 0 ? parts.join(' · ') : 'No filters';
}

/**
 * Build a safe filename suffix from active filters
 * @returns {string}
 */
function buildFilenameSuffix() {
    const parts = [];
    if (currentArchiveFilter && currentArchiveFilter !== 'all') parts.push(currentArchiveFilter);
    if (currentStatusFilter && currentStatusFilter !== 'all') parts.push(currentStatusFilter);
    if (currentDateFilter) parts.push(currentDateFilter);
    return parts.length > 0 ? '_' + parts.join('-') : '';
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 3.1 — EXPORT PDF
// ═══════════════════════════════════════════════════════════════════
async function exportFilteredArchivesToPDF() {
    const filtered = getCurrentFilteredArchives();

    if (filtered.length === 0) {
        alert('⚠️ No records to export. Adjust your filters first.');
        return;
    }

    const container = document.getElementById('archivesExportContainer');
    if (!container) {
        alert('⚠️ Export container missing.');
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    const filtersSummary = buildFiltersSummary();
    const now = new Date().toLocaleString('en-GB');

    // Build HTML for PDF
    let rowsHtml = '';
    filtered.forEach((entry, idx) => {
        const room = entry.room_number || entry.room || '---';
        const guest = entry.guest_name || (entry.is_spa ? 'Spa Agent' : 'Guest');
        const receiptId = typeof obtenirReceiptId === 'function' ? obtenirReceiptId(entry) : `REC-${String(entry.id).slice(-6).toUpperCase()}`;
        const date = entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-GB', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : '---';
        const status = (entry.status || 'Collected');
        const pcs = entry.total_pieces || entry.total_clothes || 0;
        const amount = Number(entry.grand_total || entry.total || 0).toFixed(2);
        const type = entry.is_spa ? 'SPA' : 'Hotel';

        rowsHtml += `
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 6px 8px; font-size: 10px; text-align: center;">${idx + 1}</td>
                <td style="padding: 6px 8px; font-size: 10px; font-weight: bold;">${room}</td>
                <td style="padding: 6px 8px; font-size: 10px;">${guest}</td>
                <td style="padding: 6px 8px; font-size: 9px; font-family: monospace; color: #6b7280;">${receiptId}</td>
                <td style="padding: 6px 8px; font-size: 9px;">${date}</td>
                <td style="padding: 6px 8px; font-size: 10px; text-align: center;">${type}</td>
                <td style="padding: 6px 8px; font-size: 10px; text-align: center;">${status}</td>
                <td style="padding: 6px 8px; font-size: 10px; text-align: right;">${pcs}</td>
                <td style="padding: 6px 8px; font-size: 10px; text-align: right; font-weight: bold;">${amount} AED</td>
            </tr>
        `;
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
                <thead>
                    <tr style="background: #1c1917; color: #fff;">
                        <th style="padding: 8px; text-align: center; font-size: 9px; letter-spacing: 1px;">#</th>
                        <th style="padding: 8px; text-align: left; font-size: 9px; letter-spacing: 1px;">ROOM</th>
                        <th style="padding: 8px; text-align: left; font-size: 9px; letter-spacing: 1px;">GUEST</th>
                        <th style="padding: 8px; text-align: left; font-size: 9px; letter-spacing: 1px;">RECEIPT ID</th>
                        <th style="padding: 8px; text-align: left; font-size: 9px; letter-spacing: 1px;">DATE</th>
                        <th style="padding: 8px; text-align: center; font-size: 9px; letter-spacing: 1px;">TYPE</th>
                        <th style="padding: 8px; text-align: center; font-size: 9px; letter-spacing: 1px;">STATUS</th>
                        <th style="padding: 8px; text-align: right; font-size: 9px; letter-spacing: 1px;">PCS</th>
                        <th style="padding: 8px; text-align: right; font-size: 9px; letter-spacing: 1px;">AMOUNT</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
                <tfoot>
                    <tr style="background: #f5f5f4; font-weight: bold;">
                        <td colspan="7" style="padding: 10px 8px; text-align: right; font-size: 11px;">TOTALS:</td>
                        <td style="padding: 10px 8px; text-align: right; font-size: 11px;">${totalPieces}</td>
                        <td style="padding: 10px 8px; text-align: right; font-size: 11px; color: #b45309;">${totalAmount} AED</td>
                    </tr>
                </tfoot>
            </table>

            <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 9px; color: #9ca3af;">
                Remal Laundry OS — Generated automatically. This document is a system export.
            </div>
        </div>
    `;

    const filename = `REMAL_Archives_${today}${buildFilenameSuffix()}.pdf`;

    const opt = {
        margin: [8, 8, 8, 8],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
        pagebreak: { mode: ['css', 'legacy'] }
    };

    try {
        await html2pdf().set(opt).from(container).save();
        console.log('[Export PDF] Success:', filename, `(${filtered.length} records)`);
    } catch (e) {
        console.error('[Export PDF] Error:', e);
        alert('⚠️ Error generating PDF. Check the console.');
    } finally {
        container.innerHTML = '';
    }
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 3.2 — EXPORT CSV
// ═══════════════════════════════════════════════════════════════════
function exportFilteredArchivesToCSV() {
    const filtered = getCurrentFilteredArchives();

    if (filtered.length === 0) {
        alert('⚠️ No records to export. Adjust your filters first.');
        return;
    }

    const today = new Date().toISOString().split('T')[0];

    // CSV header
    const headers = [
        'Index', 'Room', 'Guest', 'Receipt ID', 'Date', 'Type', 'Status',
        'Pieces', 'Amount (AED)', 'Created By', 'Packaging'
    ];

    // CSV rows
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

        return [
            idx + 1,
            csvEscape(room),
            csvEscape(guest),
            csvEscape(receiptId),
            csvEscape(date),
            csvEscape(type),
            csvEscape(status),
            pcs,
            amount,
            csvEscape(agent),
            csvEscape(packaging)
        ].join(',');
    });

    // Totals row
    const totalPieces = filtered.reduce((s, e) => s + Number(e.total_pieces || e.total_clothes || 0), 0);
    const totalAmount = filtered.reduce((s, e) => s + Number(e.grand_total || e.total || 0), 0).toFixed(2);
    const totalRow = `TOTALS,,,,,,,,${totalPieces},${totalAmount},,`;

    const csv = [headers.join(','), ...rows, totalRow].join('\n');

    // Download
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel UTF-8
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `REMAL_Archives_${today}${buildFilenameSuffix()}.csv`;

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('[Export CSV] Success:', filename, `(${filtered.length} records)`);
}

/**
 * Escape CSV field (handles quotes, commas, newlines)
 * @param {string} value
 * @returns {string}
 */
function csvEscape(value) {
    const str = String(value == null ? '' : value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
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

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════
function renderManagementDashboard() {
    chargerDonneesLocalStorage();

    let totalRevenue = 0;
    let totalGarments = 0;
    let statusCounts = { Collected: 0, Washing: 0, Ready: 0, Delivered: 0, Pending: 0 };
    let revenueByDate = {};

    cachedSlips.forEach(slip => {
        const rev = Number(slip.grand_total || slip.total || 0);
        const garments = Number(slip.total_pieces || slip.total_clothes || 0);
        
        totalRevenue += rev;
        totalGarments += garments;
        
        let st = slip.status || 'Collected';
        if (statusCounts[st] !== undefined) {
            statusCounts[st]++;
        } else {
            statusCounts.Collected++;
        }

        if (slip.created_at) {
            let dStr = slip.created_at.split('T')[0];
            revenueByDate[dStr] = (revenueByDate[dStr] || 0) + rev;
        }
    });

    const kpiRev = document.getElementById('kpiRevenue');
    const kpiOrd = document.getElementById('kpiOrders');
    const kpiGar = document.getElementById('kpiGarments');

    if(kpiRev) kpiRev.innerText = `${totalRevenue.toFixed(2)} AED`;
    if(kpiOrd) kpiOrd.innerText = cachedSlips.length;
    if(kpiGar) kpiGar.innerText = `${totalGarments} pcs`;

    requestAnimationFrame(() => {
        const ctxDoughnutEl = document.getElementById('statusDoughnutChart');
        if (ctxDoughnutEl) {
            const ctxDoughnut = ctxDoughnutEl.getContext('2d');
            if (doughnutChartInstance) doughnutChartInstance.destroy();

            doughnutChartInstance = new Chart(ctxDoughnut, {
                type: 'doughnut',
                data: {
                    labels: ['Collected', 'Washing', 'Ready', 'Delivered'],
                    datasets: [{
                        data: [
                            statusCounts.Collected + statusCounts.Pending, 
                            statusCounts.Washing, 
                            statusCounts.Ready, 
                            statusCounts.Delivered
                        ],
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
        }

        const dates = Object.keys(revenueByDate).sort();
        const revenues = dates.map(d => revenueByDate[d]);

        const ctxBarEl = document.getElementById('revenueBarChart');
        if (ctxBarEl) {
            const ctxBar = ctxBarEl.getContext('2d');
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
        }
    });
}

// ═══════════════════════════════════════════════════════════════════
// SPA
// ═══════════════════════════════════════════════════════════════════
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
        alert("⚠️ Error generating SPA PDF.");
    } finally {
        if (actionButtons) actionButtons.style.display = '';
        if (isHidden) spaArea.classList.add('hidden');
    }
}

// ═══════════════════════════════════════════════════════════════════
// SESSION STAFF
// ═══════════════════════════════════════════════════════════════════
function checkStaffSession() {
    const savedStaff = localStorage.getItem('remal_current_staff');
    const loginModal = document.getElementById('staffLoginModal');

    if (savedStaff) {
        try {
            currentStaffUser = JSON.parse(savedStaff);
            console.log("✅ Staff session restored:", currentStaffUser);
            if (loginModal) loginModal.classList.add('hidden');
            updateStaffUIIndicator();
            return;
        } catch (e) {
            console.error("❌ Error parsing saved staff:", e);
        }
    }

    console.warn("⚠️ No staff session found - showing login");
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
            currentStaffUser = { name: 'Superviseur (Local)', role: 'Manager', pin_code: '1234' };
            saveAndUnlockSession();
            return;
        } else {
            if(errorMsg) errorMsg.classList.remove('hidden');
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
            if(errorMsg) errorMsg.classList.remove('hidden');
            if(pinInput) pinInput.value = '';
            return;
        }

        currentStaffUser = {
            id: data.id,
            name: data.name,
            role: data.role,
            pin_code: data.pin_code
        };

        saveAndUnlockSession();

    } catch (err) {
        console.error("Erreur authentification staff:", err);
        if(errorMsg) errorMsg.classList.remove('hidden');
    }
}

function saveAndUnlockSession() {
    localStorage.setItem('remal_current_staff', JSON.stringify(currentStaffUser));
    const loginModal = document.getElementById('staffLoginModal');
    if (loginModal) loginModal.classList.add('hidden');
    
    updateStaffUIIndicator();
    console.log(`✅ Session unlocked by: ${currentStaffUser.name} (${currentStaffUser.role})`);
}

function updateStaffUIIndicator() {
    const indicator = document.getElementById('currentLoggedStaff');
    const headerIndicator = document.getElementById('staffIndicatorHeader');
    const headerName = document.getElementById('staffNameHeader');
    
    if (currentStaffUser) {
        if (indicator) indicator.innerText = `👤 ${currentStaffUser.name}`;
        if (headerIndicator) headerIndicator.classList.remove('hidden');
        if (headerName) headerName.innerText = currentStaffUser.name;
    } else {
        if (headerIndicator) headerIndicator.classList.add('hidden');
    }
}

function logoutStaff() {
    localStorage.removeItem('remal_current_staff');
    currentStaffUser = null;
    location.reload();
}

function confirmLogout() {
    if (!currentStaffUser) return;
    
    const confirmed = confirm(
        `🚪 Log out?\n\n` +
        `Current agent: ${currentStaffUser.name}\n` +
        `Role: ${currentStaffUser.role}\n\n` +
        `You will need to enter your PIN again to continue.`
    );
    
    if (confirmed) {
        logoutStaff();
    }
        }
