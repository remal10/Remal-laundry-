/* ═══════════════════════════════════════════════════════════════════
   📦 REMAL LAUNDRY OS — Stock Management
   Track laundry supplies, chemicals, and consumables
   ═══════════════════════════════════════════════════════════════════ */

/* ═══ STATE ═══ */
let stockItems = [];
let stockMovements = [];
let currentStockFilter = 'all';
let currentEditingItem = null;
let currentMovementItem = null;
let currentMovementType = 'in';  // 'in' or 'out'
let stockLoading = false;

const STOCK_CACHE_KEY = 'remal_stock_cache';
const STOCK_CACHE_TTL = 60000; // 1 min

let stockCache = {
    items: null,
    timestamp: 0
};

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════ */

function formatStockNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    const n = Number(num);
    if (n % 1 === 0) return String(n);
    return n.toFixed(2).replace(/\.?0+$/, '');
}

function getStockIcon(category) {
    const cat = String(category || '').toLowerCase();
    if (cat.includes('chemical')) return '🧴';
    if (cat.includes('packaging')) return '📦';
    if (cat.includes('consumable')) return '📎';
    if (cat.includes('equipment')) return '🧰';
    if (cat.includes('uniform')) return '👕';
    return '📦';
}

function computeStockStatus(item) {
    const qty = Number(item.current_quantity) || 0;
    const min = Number(item.min_threshold) || 0;
    const critical = Number(item.critical_threshold) || 0;

    if (qty <= critical) return 'critical';
    if (qty <= min) return 'low';
    return 'ok';
}

function computeAutonomyDays(item) {
    // Estimation basique : si on a un historique, on peut calculer
    // Sinon on estime 2 unités/jour en moyenne
    const qty = Number(item.current_quantity) || 0;
    const dailyUsage = 2; // Valeur par défaut
    if (qty <= 0) return 0;
    return Math.floor(qty / dailyUsage);
}

/* ═══════════════════════════════════════════════════════════════════
   MODAL — ITEM FORM (NEW / EDIT)
   ═══════════════════════════════════════════════════════════════════ */

function openStockItemForm(itemId = null) {
    // Check admin
    if (typeof requireAdmin === 'function' && !requireAdmin('manage stock items')) {
        return;
    }

    currentEditingItem = null;

    // Reset form
    const fields = [
        'stockItemName', 'stockItemCategory', 'stockItemUnit',
        'stockItemSupplier', 'stockItemQuantity', 'stockItemPrice',
        'stockItemMin', 'stockItemCritical', 'stockItemNotes'
    ];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const modalTitle = document.getElementById('stockModalTitle');
    const modalSubtitle = document.getElementById('stockModalSubtitle');

    // Si édition → charger les données
    if (itemId) {
        const item = stockItems.find(i => String(i.id) === String(itemId));
        if (item) {
            currentEditingItem = item;

            document.getElementById('stockItemName').value = item.name || '';
            document.getElementById('stockItemCategory').value = item.category || '';
            document.getElementById('stockItemUnit').value = item.unit || '';
            document.getElementById('stockItemSupplier').value = item.supplier || '';
            document.getElementById('stockItemQuantity').value = item.current_quantity || 0;
            document.getElementById('stockItemPrice').value = item.unit_price || 0;
            document.getElementById('stockItemMin').value = item.min_threshold || 0;
            document.getElementById('stockItemCritical').value = item.critical_threshold || 0;
            document.getElementById('stockItemNotes').value = item.notes || '';

            if (modalTitle) modalTitle.textContent = '✏️ Edit Stock Item';
            if (modalSubtitle) modalSubtitle.textContent = item.name;
        }
    } else {
        if (modalTitle) modalTitle.textContent = '📦 New Stock Item';
        if (modalSubtitle) modalSubtitle.textContent = 'Add a new item to inventory';
    }

    // Auto-calculate thresholds on quantity change
    const qtyInput = document.getElementById('stockItemQuantity');
    if (qtyInput) {
        qtyInput.oninput = () => {
            const qty = parseFloat(qtyInput.value) || 0;
            const minInput = document.getElementById('stockItemMin');
            const critInput = document.getElementById('stockItemCritical');
            
            // Si vide, on auto-remplit
            if (!minInput.value && qty > 0) {
                minInput.placeholder = `Auto: ${Math.round(qty * 0.2)}`;
            }
            if (!critInput.value && qty > 0) {
                critInput.placeholder = `Auto: ${Math.round(qty * 0.05)}`;
            }
        };
    }

    // Open modal
    document.getElementById('stockItemModal').classList.remove('hidden');

    // Focus
    setTimeout(() => {
        document.getElementById('stockItemName')?.focus();
    }, 200);
}

function closeStockItemForm() {
    document.getElementById('stockItemModal').classList.add('hidden');
    currentEditingItem = null;
}

/* ═══════════════════════════════════════════════════════════════════
   SAVE ITEM
   ═══════════════════════════════════════════════════════════════════ */

async function saveStockItem() {
    // Get values
    const name = document.getElementById('stockItemName')?.value.trim();
    const category = document.getElementById('stockItemCategory')?.value.trim() || 'General';
    const unit = document.getElementById('stockItemUnit')?.value.trim() || 'units';
    const supplier = document.getElementById('stockItemSupplier')?.value.trim();
    const quantity = parseFloat(document.getElementById('stockItemQuantity')?.value) || 0;
    const price = parseFloat(document.getElementById('stockItemPrice')?.value) || 0;
    let min = parseFloat(document.getElementById('stockItemMin')?.value);
    let critical = parseFloat(document.getElementById('stockItemCritical')?.value);
    const notes = document.getElementById('stockItemNotes')?.value.trim();

    // Validation
    if (!name || name.length < 2) {
        alert('⚠️ Please enter a valid product name.');
        document.getElementById('stockItemName')?.focus();
        return;
    }

    // Auto-calculate thresholds if not provided
    if (isNaN(min) || min <= 0) min = Math.round(quantity * 0.2);
    if (isNaN(critical) || critical <= 0) critical = Math.round(quantity * 0.05);

    // Ensure critical < min
    if (critical >= min) {
        critical = Math.max(1, Math.round(min * 0.25));
    }

    // Button loading
    const saveBtn = document.getElementById('stockSaveBtn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.classList.add('loading');
    }

    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) {
            alert('⚠️ Supabase not available.');
            return;
        }

        const payload = {
            name,
            category,
            unit,
            supplier: supplier || null,
            current_quantity: quantity,
            unit_price: price,
            min_threshold: min,
            critical_threshold: critical,
            notes: notes || null,
            created_by: (typeof currentStaffUser !== 'undefined' && currentStaffUser?.name)
                ? currentStaffUser.name
                : 'Admin'
        };

        let result;
        if (currentEditingItem) {
            // Update
            result = await supabaseClient
                .from('stock_items')
                .update(payload)
                .eq('id', currentEditingItem.id)
                .select()
                .single();
        } else {
            // Insert
            result = await supabaseClient
                .from('stock_items')
                .insert([payload])
                .select()
                .single();

            // Log initial movement if quantity > 0
            if (result.data && quantity > 0) {
                await supabaseClient.from('stock_movements').insert([{
                    item_id: result.data.id,
                    item_name: name,
                    movement_type: 'in',
                    quantity: quantity,
                    quantity_before: 0,
                    quantity_after: quantity,
                    reason: 'Initial Stock',
                    performed_by: payload.created_by,
                    performed_role: 'admin'
                }]);
            }
        }

        if (result.error) {
            console.error('[Stock] Save error:', result.error.message);
            alert('⚠️ Error: ' + result.error.message);
            return;
        }

        // Invalidate cache
        stockCache.items = null;
        stockCache.timestamp = 0;

        // Close + refresh
        closeStockItemForm();
        await renderStockList();

        // Toast
        if (typeof showToast === 'function') {
            showToast(currentEditingItem ? '✅ Item updated' : '✅ Item created');
        }

    } catch (e) {
        console.error('[Stock] Exception:', e);
        alert('⚠️ Error saving item.');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.classList.remove('loading');
        }
    }
}

/* ═══════════════════════════════════════════════════════════════════
   RENDER LIST
   ═══════════════════════════════════════════════════════════════════ */

async function renderStockList() {
    const container = document.getElementById('stockList');
    if (!container) return;

    if (stockLoading) return;
    stockLoading = true;

    try {
        // Fetch items (with cache)
        const items = await fetchStockItems();
        stockItems = items;

        // Update stats
        updateStockStats(items);

        // Filter
        const filtered = filterStockItems(items);

        // Render
        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="stock-empty">
                    <div style="font-size: 40px; margin-bottom: 12px;">📭</div>
                    <p>No stock items yet.</p>
                    <p style="font-size: 11px; opacity: 0.7; margin-top: 6px;">
                        Click "New Item" to add the first product.
                    </p>
                </div>`;
            return;
        }

        container.innerHTML = filtered.map((item, i) => renderStockCard(item, i)).join('');

    } catch (e) {
        console.error('[Stock] Render error:', e);
        container.innerHTML = `
            <div class="stock-empty">
                <p>⚠️ Error loading stock items.</p>
                <p style="font-size: 11px; opacity: 0.7; margin-top: 6px;">${e.message}</p>
            </div>`;
    } finally {
        stockLoading = false;
    }
}

async function fetchStockItems() {
    // Cache
    const now = Date.now();
    if (stockCache.items && stockCache.items.length > 0 && (now - stockCache.timestamp) < STOCK_CACHE_TTL) {
        return stockCache.items;
    }

    if (typeof supabaseClient === 'undefined' || !supabaseClient) {
        return [];
    }

    try {
        // ✨ Requête SANS filtre is_active (plus tolérant)
        const { data, error } = await supabaseClient
            .from('stock_items')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error('[Stock] Fetch error:', error.message);
            return [];
        }

        console.log('[Stock] Fetched from Supabase:', data?.length || 0, 'items');

        // ✨ Filtrer en JS : garder seulement is_active !== false
        const activeItems = (data || []).filter(item => item.is_active !== false);

        stockCache.items = activeItems;
        stockCache.timestamp = now;
        return stockCache.items;

    } catch (e) {
        console.error('[Stock] Fetch exception:', e);
        return [];
    }
}

function renderStockCard(item, index) {
    const status = computeStockStatus(item);
    const qty = Number(item.current_quantity) || 0;
    const min = Number(item.min_threshold) || 0;
    const critical = Number(item.critical_threshold) || 0;
    const unit = item.unit || 'units';
    const icon = getStockIcon(item.category);
    const autonomy = computeAutonomyDays(item);

    // Status label
    let statusLabel = 'OK';
    let statusEmoji = '🟢';
    if (status === 'low') { statusLabel = 'Low Stock'; statusEmoji = '🟡'; }
    if (status === 'critical') { statusLabel = 'Critical'; statusEmoji = '🔴'; }

    return `
        <div class="stock-card status-${status}" onclick="openStockDetail('${item.id}')" style="animation-delay: ${index * 30}ms">
            <div class="stock-card-icon">${icon}</div>

            <div class="stock-card-info">
                <div class="stock-card-name">${item.name}</div>
                <div class="stock-card-category">${item.category || 'General'}${item.supplier ? ' · ' + item.supplier : ''}</div>
                <div class="stock-card-details">
                    <span>📦 <strong class="stock-card-qty">${formatStockNumber(qty)}</strong> ${unit}</span>
                    <span style="opacity: 0.6;">·</span>
                    <span>⚠️ Seuil: ${formatStockNumber(min)}</span>
                    ${autonomy > 0 ? `<span style="opacity: 0.6;">·</span><span>⏱️ ~${autonomy}d</span>` : ''}
                </div>
            </div>

            <div class="stock-card-status ${status}">
                <span>${statusEmoji}</span>
                <span>${statusLabel}</span>
            </div>

            <div class="stock-card-actions">
                <button onclick="event.stopPropagation(); openStockMovementForm('${item.id}', 'in')" class="stock-action-btn in" title="Stock In">📥</button>
                <button onclick="event.stopPropagation(); openStockMovementForm('${item.id}', 'out')" class="stock-action-btn out" title="Stock Out">📤</button>
            </div>
        </div>
    `;
}

/* ═══════════════════════════════════════════════════════════════════
   FILTERS + STATS
   ═══════════════════════════════════════════════════════════════════ */

function switchStockFilter(filter) {
    currentStockFilter = filter;

    document.querySelectorAll('.stock-filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const btnMap = {
        'all': 'stockFilterAll',
        'ok': 'stockFilterOk',
        'low': 'stockFilterLow',
        'critical': 'stockFilterCritical'
    };
    const btn = document.getElementById(btnMap[filter]);
    if (btn) btn.classList.add('active');

    renderStockList();
}

function filterStockItems(items) {
    let filtered = items;

    // Status filter
    if (currentStockFilter !== 'all') {
        filtered = filtered.filter(i => computeStockStatus(i) === currentStockFilter);
    }

    // Search
    const input = document.getElementById('stockSearchInput');
    const q = input?.value.toLowerCase().trim() || '';
    if (q) {
        filtered = filtered.filter(i =>
            String(i.name || '').toLowerCase().includes(q) ||
            String(i.category || '').toLowerCase().includes(q) ||
            String(i.supplier || '').toLowerCase().includes(q)
        );
    }

    return filtered;
}

function updateStockStats(items) {
    const total = items.length;
    const low = items.filter(i => computeStockStatus(i) === 'low').length;
    const critical = items.filter(i => computeStockStatus(i) === 'critical').length;
    const value = items.reduce((sum, i) => {
        const qty = Number(i.current_quantity) || 0;
        const price = Number(i.unit_price) || 0;
        return sum + (qty * price);
    }, 0);

    const el = (id, val) => {
        const e = document.getElementById(id);
        if (e) e.textContent = val;
    };

    el('stockStatTotal', total);
    el('stockStatLow', low);
    el('stockStatCritical', critical);
    el('stockStatValue', value.toFixed(0));
}

/* ═══════════════════════════════════════════════════════════════════
   MODAL — MOVEMENT (IN / OUT)
   ═══════════════════════════════════════════════════════════════════ */

function openStockMovementForm(itemId, type = 'in') {
    if (typeof requireAdmin === 'function' && !requireAdmin('update stock')) {
        return;
    }

    const item = stockItems.find(i => String(i.id) === String(itemId));
    if (!item) {
        alert('⚠️ Item not found.');
        return;
    }

    currentMovementItem = item;
    currentMovementType = type;

    const modalTitle = document.getElementById('movementModalTitle');
    const modalItem = document.getElementById('movementModalItem');
    const currentStock = document.getElementById('movementCurrentStock');
    const reasonSelect = document.getElementById('movementReason');
    const qtyInput = document.getElementById('movementQuantity');
    const notesInput = document.getElementById('movementNotes');

    if (modalTitle) modalTitle.textContent = type === 'in' ? '📥 Stock In' : '📤 Stock Out';
    if (modalItem) modalItem.textContent = `${item.name} (${item.category || 'General'})`;
    if (currentStock) currentStock.textContent = `${formatStockNumber(item.current_quantity)} ${item.unit || 'units'}`;
    
    if (qtyInput) qtyInput.value = '';
    if (notesInput) notesInput.value = '';

    // Reason options selon type
    if (reasonSelect) {
        if (type === 'in') {
            reasonSelect.innerHTML = `
                <option value="Supplier Delivery">Supplier Delivery</option>
                <option value="Return from Use">Return from Use</option>
                <option value="Manual Adjustment">Manual Adjustment</option>
                <option value="Other">Other</option>
            `;
        } else {
            reasonSelect.innerHTML = `
                <option value="Daily Consumption">Daily Consumption</option>
                <option value="Damage / Loss">Damage / Loss</option>
                <option value="Transfer">Transfer</option>
                <option value="Manual Adjustment">Manual Adjustment</option>
                <option value="Other">Other</option>
            `;
        }
    }

    updateMovementPreview();

    const modal = document.getElementById('stockMovementModal');
    if (modal) modal.classList.remove('hidden');

    setTimeout(() => qtyInput?.focus(), 200);
}

function closeStockMovementForm() {
    document.getElementById('stockMovementModal').classList.add('hidden');
    currentMovementItem = null;
}

function updateMovementPreview() {
    if (!currentMovementItem) return;

    const qty = parseFloat(document.getElementById('movementQuantity')?.value) || 0;
    const current = Number(currentMovementItem.current_quantity) || 0;

    let newStock;
    if (currentMovementType === 'in') {
        newStock = current + qty;
    } else {
        newStock = Math.max(0, current - qty);
    }

    const preview = document.getElementById('movementPreviewNewStock');
    if (preview) preview.textContent = `${formatStockNumber(newStock)} ${currentMovementItem.unit || 'units'}`;
}

async function saveStockMovement() {
    if (!currentMovementItem) return;

    const qty = parseFloat(document.getElementById('movementQuantity')?.value) || 0;
    const reason = document.getElementById('movementReason')?.value || '';
    const notes = document.getElementById('movementNotes')?.value.trim();

    if (qty <= 0) {
        alert('⚠️ Please enter a valid quantity.');
        document.getElementById('movementQuantity')?.focus();
        return;
    }

    const current = Number(currentMovementItem.current_quantity) || 0;
    let newStock;
    if (currentMovementType === 'in') {
        newStock = current + qty;
    } else {
        newStock = Math.max(0, current - qty);
        if (qty > current) {
            alert(`⚠️ Not enough stock.\n\nCurrent: ${current}\nRequested: ${qty}`);
            return;
        }
    }

    const saveBtn = document.getElementById('movementSaveBtn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.classList.add('loading');
    }

    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) {
            alert('⚠️ Supabase not available.');
            return;
        }

        // 1. Update item quantity
        const { error: updateErr } = await supabaseClient
            .from('stock_items')
            .update({ current_quantity: newStock })
            .eq('id', currentMovementItem.id);

        if (updateErr) {
            alert('⚠️ Error: ' + updateErr.message);
            return;
        }

        // 2. Insert movement log
        const performedBy = (typeof currentStaffUser !== 'undefined' && currentStaffUser?.name)
            ? currentStaffUser.name
            : 'Admin';

        await supabaseClient.from('stock_movements').insert([{
            item_id: currentMovementItem.id,
            item_name: currentMovementItem.name,
            movement_type: currentMovementType,
            quantity: qty,
            quantity_before: current,
            quantity_after: newStock,
            reason: reason || null,
            notes: notes || null,
            performed_by: performedBy,
            performed_role: 'admin'
        }]);

        // Invalidate cache
        stockCache.items = null;
        stockCache.timestamp = 0;

        // Close + refresh
        closeStockMovementForm();
        await renderStockList();

        if (typeof showToast === 'function') {
            showToast(currentMovementType === 'in' ? '📥 Stock added' : '📤 Stock removed');
        }

    } catch (e) {
        console.error('[Stock] Movement error:', e);
        alert('⚠️ Error updating stock.');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.classList.remove('loading');
        }
    }
}

/* ═══════════════════════════════════════════════════════════════════
   MODAL — DETAIL
   ═══════════════════════════════════════════════════════════════════ */

async function openStockDetail(itemId) {
    const item = stockItems.find(i => String(i.id) === String(itemId));
    if (!item) return;

    currentEditingItem = item;

    const title = document.getElementById('stockDetailTitle');
    const subtitle = document.getElementById('stockDetailSubtitle');
    const body = document.getElementById('stockDetailBody');

    if (title) title.textContent = `${getStockIcon(item.category)} ${item.name}`;
    if (subtitle) subtitle.textContent = `${item.category || 'General'} · ${item.supplier || 'No supplier'}`;

    // Fetch movements for this item
    let movements = [];
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        const { data } = await supabaseClient
            .from('stock_movements')
            .select('*')
            .eq('item_id', item.id)
            .order('created_at', { ascending: false })
            .limit(20);
        movements = data || [];
    }

    const status = computeStockStatus(item);
    const qty = Number(item.current_quantity) || 0;
    const min = Number(item.min_threshold) || 0;
    const critical = Number(item.critical_threshold) || 0;
    const price = Number(item.unit_price) || 0;
    const value = qty * price;
    const unit = item.unit || 'units';

    // Progress bar
    const maxRef = Math.max(min * 2, qty, 1);
    const percent = Math.min(100, (qty / maxRef) * 100);

    body.innerHTML = `
        <div class="stock-detail-hero">
            <div class="stock-detail-hero-icon">${getStockIcon(item.category)}</div>
            <div class="stock-detail-hero-name">${item.name}</div>
            <div class="stock-detail-hero-category">${item.category || 'General'}</div>
        </div>

        <div class="stock-detail-grid">
            <div class="stock-detail-item">
                <div class="stock-detail-label">Current Stock</div>
                <div class="stock-detail-value gold">${formatStockNumber(qty)} ${unit}</div>
                <div class="stock-progress-bar">
                    <div class="stock-progress-fill ${status}" style="width: ${percent}%;"></div>
                </div>
            </div>
            <div class="stock-detail-item">
                <div class="stock-detail-label">Status</div>
                <div class="stock-detail-value ${status === 'ok' ? 'green' : status === 'low' ? 'yellow' : 'red'}">
                    ${status === 'ok' ? '🟢 OK' : status === 'low' ? '🟡 Low Stock' : '🔴 Critical'}
                </div>
            </div>
            <div class="stock-detail-item">
                <div class="stock-detail-label">Min Threshold</div>
                <div class="stock-detail-value">${formatStockNumber(min)} ${unit}</div>
            </div>
            <div class="stock-detail-item">
                <div class="stock-detail-label">Critical Threshold</div>
                <div class="stock-detail-value">${formatStockNumber(critical)} ${unit}</div>
            </div>
            <div class="stock-detail-item">
                <div class="stock-detail-label">Unit Price</div>
                <div class="stock-detail-value">${price.toFixed(2)} AED</div>
            </div>
            <div class="stock-detail-item">
                <div class="stock-detail-label">Total Value</div>
                <div class="stock-detail-value gold">${value.toFixed(2)} AED</div>
            </div>
            <div class="stock-detail-item">
                <div class="stock-detail-label">Supplier</div>
                <div class="stock-detail-value">${item.supplier || '---'}</div>
            </div>
            <div class="stock-detail-item">
                <div class="stock-detail-label">Created By</div>
                <div class="stock-detail-value">${item.created_by || '---'}</div>
            </div>
        </div>

        ${item.notes ? `
            <div style="background: rgba(220,167,115,0.08); border: 1px dashed rgba(220,167,115,0.3); border-radius: 12px; padding: 12px 14px; margin-bottom: 20px;">
                <div style="font-size: 9px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px;">📝 Notes</div>
                <div style="font-size: 12px; color: var(--text-main);">${item.notes}</div>
            </div>
        ` : ''}

        <div class="stock-history-title">📜 Recent Movements</div>

        ${movements.length === 0 ? `
            <p style="text-align: center; color: var(--text-muted); font-size: 12px; padding: 20px;">
                No movements recorded yet.
            </p>
        ` : movements.map(m => `
            <div class="stock-history-item">
                <div class="stock-history-icon ${m.movement_type}">
                    ${m.movement_type === 'in' ? '📥' : m.movement_type === 'out' ? '📤' : '🔄'}
                </div>
                <div class="stock-history-info">
                    <div class="stock-history-reason">${m.reason || (m.movement_type === 'in' ? 'Stock In' : 'Stock Out')}</div>
                    <div class="stock-history-date">${new Date(m.created_at).toLocaleString('en-GB')} · ${m.performed_by || 'Admin'}</div>
                </div>
                <div class="stock-history-qty ${m.movement_type}">
                    ${m.movement_type === 'in' ? '+' : '-'}${formatStockNumber(m.quantity)}
                </div>
            </div>
        `).join('')}
    `;

    document.getElementById('stockDetailModal').classList.remove('hidden');
}

function closeStockDetail() {
    document.getElementById('stockDetailModal').classList.add('hidden');
    currentEditingItem = null;
}

function editStockItem() {
    if (!currentEditingItem) return;
    const id = currentEditingItem.id;
    closeStockDetail();
    openStockItemForm(id);
}

async function deleteStockItem() {
    if (!currentEditingItem) return;

    if (!confirm(`⚠️ Delete "${currentEditingItem.name}"?\n\nThis will also delete all its movement history.`)) {
        return;
    }

    try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

        // Soft delete : is_active = false
        const { error } = await supabaseClient
            .from('stock_items')
            .update({ is_active: false })
            .eq('id', currentEditingItem.id);

        if (error) {
            alert('⚠️ Error: ' + error.message);
            return;
        }

        stockCache.items = null;
        stockCache.timestamp = 0;

        closeStockDetail();
        await renderStockList();

        if (typeof showToast === 'function') {
            showToast('🗑️ Item deleted');
        }

    } catch (e) {
        console.error('[Stock] Delete error:', e);
        alert('⚠️ Error deleting item.');
    }
}

/* ═══════════════════════════════════════════════════════════════════
   EVENT LISTENERS
   ═══════════════════════════════════════════════════════════════════ */

// Update preview when quantity changes
document.addEventListener('input', (e) => {
    if (e.target?.id === 'movementQuantity') {
        updateMovementPreview();
    }
});

// Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeStockItemForm();
        closeStockMovementForm();
        closeStockDetail();
    }
});

/* ═══════════════════════════════════════════════════════════════════
   EXPOSE
   ═══════════════════════════════════════════════════════════════════ */

window.openStockItemForm = openStockItemForm;
window.closeStockItemForm = closeStockItemForm;
window.saveStockItem = saveStockItem;
window.renderStockList = renderStockList;
window.switchStockFilter = switchStockFilter;
window.openStockMovementForm = openStockMovementForm;
window.closeStockMovementForm = closeStockMovementForm;
window.saveStockMovement = saveStockMovement;
window.openStockDetail = openStockDetail;
window.closeStockDetail = closeStockDetail;
window.editStockItem = editStockItem;
window.deleteStockItem = deleteStockItem;

console.log('✅ [Stock] Module loaded');
/* ═══════════════════════════════════════════════════════════════════
   📄 EXPORT STOCK PDF — Rapport pour le GM
   ═══════════════════════════════════════════════════════════════════ */

async function exportStockPDF() {
    const btn = document.querySelector('.stock-export-btn');
    if (btn) {
        btn.classList.add('loading');
        btn.disabled = true;
    }

    try {
        // 1. Récupérer les données fraîches
        stockCache.items = null;
        stockCache.timestamp = 0;
        
        const items = await fetchStockItems();
        
        if (!items || items.length === 0) {
            alert('⚠️ No stock items to export.');
            return;
        }

        // 2. Récupérer les mouvements du mois en cours (pour le Top 5)
        let topUsed = [];
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const monthStart = new Date();
            monthStart.setDate(1);
            monthStart.setHours(0, 0, 0, 0);

            const { data: movements } = await supabaseClient
                .from('stock_movements')
                .select('*')
                .eq('movement_type', 'out')
                .gte('created_at', monthStart.toISOString());

            if (movements && movements.length > 0) {
                // Grouper par item_id
                const usageMap = {};
                movements.forEach(m => {
                    if (!usageMap[m.item_id]) {
                        usageMap[m.item_id] = {
                            name: m.item_name || 'Unknown',
                            total: 0
                        };
                    }
                    usageMap[m.item_id].total += Number(m.quantity) || 0;
                });

                topUsed = Object.values(usageMap)
                    .sort((a, b) => b.total - a.total)
                    .slice(0, 5);
            }
        }

        // 3. Calculer les stats
        const totalItems = items.length;
        const lowCount = items.filter(i => computeStockStatus(i) === 'low').length;
        const criticalCount = items.filter(i => computeStockStatus(i) === 'critical').length;
        const totalValue = items.reduce((sum, i) => {
            const qty = Number(i.current_quantity) || 0;
            const price = Number(i.unit_price) || 0;
            return sum + (qty * price);
        }, 0);

        // 4. Alerts (Low + Critical)
        const alerts = items
            .filter(i => {
                const status = computeStockStatus(i);
                return status === 'low' || status === 'critical';
            })
            .sort((a, b) => {
                const statusA = computeStockStatus(a);
                const statusB = computeStockStatus(b);
                if (statusA === 'critical' && statusB !== 'critical') return -1;
                if (statusB === 'critical' && statusA !== 'critical') return 1;
                return 0;
            });

        // 5. Items triés par statut puis nom
        const sortedItems = [...items].sort((a, b) => {
            const statusOrder = { critical: 0, low: 1, ok: 2 };
            const statusA = computeStockStatus(a);
            const statusB = computeStockStatus(b);
            if (statusOrder[statusA] !== statusOrder[statusB]) {
                return statusOrder[statusA] - statusOrder[statusB];
            }
            return String(a.name || '').localeCompare(String(b.name || ''));
        });

        // 6. Générer le HTML
        const html = buildStockReportHTML({
            items: sortedItems,
            alerts,
            topUsed,
            stats: {
                totalItems,
                lowCount,
                criticalCount,
                totalValue
            },
            generatedAt: new Date(),
            generatedBy: (typeof currentStaffUser !== 'undefined' && currentStaffUser?.name)
                ? currentStaffUser.name
                : 'Admin'
        });

        // 7. Container + PDF
        let container = document.getElementById('stockPdfContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'stockPdfContainer';
            document.body.appendChild(container);
        }
        container.innerHTML = html;

        // Attendre images
        await new Promise(r => setTimeout(r, 800));

        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `REMAL_Stock_Report_${dateStr}.pdf`;

        const opt = {
            margin: [8, 8, 8, 8],
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                backgroundColor: '#ffffff'
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        await html2pdf().set(opt).from(container).save();

        console.log('✅ [Stock PDF] Generated:', filename);

        if (typeof showToast === 'function') {
            showToast('📄 Stock report downloaded');
        }

    } catch (e) {
        console.error('[Stock PDF] Error:', e);
        alert('⚠️ Error generating stock report.');
    } finally {
        const container = document.getElementById('stockPdfContainer');
        if (container) container.innerHTML = '';

        if (btn) {
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    }
}

function buildStockReportHTML(data) {
    const { items, alerts, topUsed, stats, generatedAt, generatedBy } = data;

    const dateFormatted = generatedAt.toLocaleDateString('en-GB', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const timeFormatted = generatedAt.toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit'
    });

    // Alerts HTML
    let alertsHTML = '';
if (alerts.length === 0) {
    alertsHTML = `
        <div style="text-align: center; padding: 18px; color: #065f46; font-weight: 700; font-size: 12px; font-family: 'Helvetica', Arial, sans-serif;">
            ✅ All items are at healthy stock levels
        </div>
    `;
    } else {
        alertsHTML = alerts.map(a => {
            const status = computeStockStatus(a);
            return `
                <div class="stock-pdf-alert-item">
                    <span class="stock-pdf-alert-name">
                        ${a.name}
                        <span class="stock-pdf-alert-badge ${status}">${status}</span>
                    </span>
                    <span class="stock-pdf-alert-qty">
                        ${formatStockNumber(a.current_quantity)} ${a.unit || 'units'}
                    </span>
                </div>
            `;
        }).join('');
    }

    // Items HTML
    const itemsHTML = items.map(item => {
        const status = computeStockStatus(item);
        const qty = Number(item.current_quantity) || 0;
        const min = Number(item.min_threshold) || 0;
        const price = Number(item.unit_price) || 0;
        const value = qty * price;

        return `
            <tr class="status-${status}">
                <td><strong>${item.name}</strong></td>
                <td>${item.category || 'General'}</td>
                <td style="text-align: right; font-weight: 700;">${formatStockNumber(qty)} ${item.unit || 'units'}</td>
                <td style="text-align: right; color: #6b7280;">${formatStockNumber(min)}</td>
                <td style="text-align: right; font-weight: 700; color: #b45309;">${value.toFixed(2)} AED</td>
                <td style="text-align: center;">
                    <span class="status-badge ${status}">
                        ${status === 'ok' ? 'OK' : status === 'low' ? 'Low' : 'Critical'}
                    </span>
                </td>
            </tr>
        `;
    }).join('');

    // Top 5 HTML
    let topUsedHTML = '';
    if (topUsed.length === 0) {
        topUsedHTML = `
            <div style="text-align: center; padding: 20px; color: #6b7280; font-style: italic; font-size: 11px;">
                No consumption data for this month yet.
            </div>
        `;
    } else {
        topUsedHTML = topUsed.map((item, i) => `
            <div class="stock-pdf-top-item">
                <span class="stock-pdf-top-rank">${i + 1}</span>
                <span class="stock-pdf-top-name">${item.name}</span>
                <span class="stock-pdf-top-qty">${formatStockNumber(item.total)}</span>
            </div>
        `).join('');
    }

    return `
        <div class="stock-pdf-header">
            <div class="stock-pdf-header-left">
                <img src="assets/remal-logo.png" alt="Remal" class="stock-pdf-logo" onerror="this.style.display='none';">
                <div>
                    <h1 class="stock-pdf-hotel-name">REMAL HOTEL & VILLAS</h1>
                    <p class="stock-pdf-hotel-sub">Al Ruwais City · Abu Dhabi · U.A.E</p>
                </div>
            </div>
            <div style="text-align: right;">
                <h2 class="stock-pdf-title">STOCK REPORT</h2>
                <p class="stock-pdf-date">${dateFormatted}</p>
                <p class="stock-pdf-date" style="font-size: 9px;">Generated at ${timeFormatted} by ${generatedBy}</p>
            </div>
        </div>

        <div class="stock-pdf-body">

            <!-- KPI -->
            <div class="stock-pdf-section">
                <div class="stock-pdf-section-title">🎯 Key Indicators</div>
                <div class="stock-pdf-kpi-grid">
                    <div class="stock-pdf-kpi">
                        <div class="stock-pdf-kpi-label">Total Items</div>
                        <div class="stock-pdf-kpi-value">${stats.totalItems}</div>
                    </div>
                    <div class="stock-pdf-kpi">
                        <div class="stock-pdf-kpi-label">Low Stock</div>
                        <div class="stock-pdf-kpi-value yellow">${stats.lowCount}</div>
                    </div>
                    <div class="stock-pdf-kpi">
                        <div class="stock-pdf-kpi-label">Critical</div>
                        <div class="stock-pdf-kpi-value red">${stats.criticalCount}</div>
                    </div>
                    <div class="stock-pdf-kpi">
                        <div class="stock-pdf-kpi-label">Total Value</div>
                        <div class="stock-pdf-kpi-value green">${stats.totalValue.toFixed(0)} AED</div>
                    </div>
                </div>
            </div>

<!-- Alerts -->
<div class="stock-pdf-section">
    <div class="stock-pdf-section-title">⚠️ Alerts (${alerts.length} item${alerts.length > 1 ? 's' : ''})</div>
    <div class="stock-pdf-alerts ${alerts.length === 0 ? '' : alerts.some(a => computeStockStatus(a) === 'critical') ? 'danger' : 'warning'}">
        ${alertsHTML}
    </div>
</div>

            <!-- Full Inventory -->
            <div class="stock-pdf-section">
                <div class="stock-pdf-section-title">📦 Full Inventory</div>
                <table class="stock-pdf-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Category</th>
                            <th style="text-align: right;">Quantity</th>
                            <th style="text-align: right;">Threshold</th>
                            <th style="text-align: right;">Value (AED)</th>
                            <th style="text-align: center;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHTML}
                    </tbody>
                </table>
            </div>

            <!-- Top 5 Used -->
            ${topUsed.length > 0 ? `
                <div class="stock-pdf-section">
                    <div class="stock-pdf-section-title">📊 Top 5 Most Used This Month</div>
                    ${topUsedHTML}
                </div>
            ` : ''}

            <!-- Signatures -->
            <div class="stock-pdf-signatures">
                <div class="stock-pdf-signature-item">
                    <div class="stock-pdf-signature-line"></div>
                    <div class="stock-pdf-signature-label">Prepared by</div>
                    <div style="font-size: 10px; color: #6b7280; margin-top: 4px;">${generatedBy}</div>
                </div>
                <div class="stock-pdf-signature-item">
                    <div class="stock-pdf-signature-line"></div>
                    <div class="stock-pdf-signature-label">Approved by</div>
                    <div style="font-size: 10px; color: #6b7280; margin-top: 4px;">General Manager</div>
                </div>
            </div>

        </div>

        <div class="stock-pdf-footer">
            Remal Laundry OS · Stock Report · Auto-generated · Confidential
        </div>
    `;
}

/* ═══ Exposer globalement ═══ */
window.exportStockPDF = exportStockPDF;
console.log('✅ [Stock] Export PDF loaded');
