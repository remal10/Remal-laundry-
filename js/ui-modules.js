// ═══════════════════════════════════════════════════════════════════
// REMAL LAUNDRY OS — UI MODULES
// Archives, Lost & Found, Dashboard, SPA, Cloud, Login
// ⚠️ Chargé APRÈS ui-live.js
// ═══════════════════════════════════════════════════════════════════

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
        📚 <strong>Archives limitées à 90 jours</strong> — 
        <span class="text-stone-300">${cachedSlips.length} records chargés.</span> 
        Les données plus anciennes restent dans Supabase mais ne sont pas affichées.
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

    container.innerHTML = html;
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
        `🚪 Se déconnecter ?\n\n` +
        `Agent actuel : ${currentStaffUser.name}\n` +
        `Rôle : ${currentStaffUser.role}\n\n` +
        `Vous devrez saisir votre PIN à nouveau pour continuer.`
    );
    
    if (confirmed) {
        logoutStaff();
    }
}
