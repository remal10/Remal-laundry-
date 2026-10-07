/* ═══════════════════════════════════════════════════════════════════
   🧳 REMAL LAUNDRY OS — Check-Out Laundry
   Track guest laundry deposits before departure
   ═══════════════════════════════════════════════════════════════════ */

/* ═══ STATE ═══ */
let checkoutRecords = [];
let currentCheckoutFilter = 'all';
let currentCheckoutPhoto = null;      // Base64 compressed
let currentCheckoutPhotoSize = 0;     // KB
let currentEditingCheckout = null;    // Record being viewed
let checkoutLoading = false;

/* ═══ CONSTANTS ═══ */
const CHECKOUT_STORAGE_BUCKET = 'checkout-receipts';
const CHECKOUT_PHOTO_MAX_WIDTH = 1200;
const CHECKOUT_PHOTO_QUALITY = 0.6;
const CHECKOUT_THUMB_MAX_WIDTH = 200;
const CHECKOUT_THUMB_QUALITY = 0.5;

/* ═══════════════════════════════════════════════════════════════════
   MODAL — OPEN / CLOSE
   ═══════════════════════════════════════════════════════════════════ */

function openCheckoutForm() {
    // Check admin
    if (typeof requireAdmin === 'function' && !requireAdmin('create a check-out record')) {
        return;
    }

    // Reset state
    currentCheckoutPhoto = null;
    currentCheckoutPhotoSize = 0;

    // Reset form fields
    const fields = [
        'checkoutGuestName',
        'checkoutRoomNumber',
        'checkoutDepartureDate',
        'checkoutContactPhone',
        'checkoutPieceCount',
        'checkoutNotes'
    ];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    // Reset selects
    const serviceType = document.getElementById('checkoutServiceType');
    const recoveryMethod = document.getElementById('checkoutRecoveryMethod');
    if (serviceType) serviceType.value = 'Laundry';
    if (recoveryMethod) recoveryMethod.value = 'Front Desk';

    // Auto-fill "Deposited By" with current user
    const depositedBy = document.getElementById('checkoutDepositedBy');
    if (depositedBy && typeof currentStaffUser !== 'undefined' && currentStaffUser) {
        depositedBy.value = currentStaffUser.name || 'Staff';
    }

    // Generate serial number
    const serialEl = document.getElementById('checkoutModalSerial');
    if (serialEl) {
        serialEl.textContent = 'Serial: ' + generateCheckoutSerialPreview();
    }

    // Reset photo preview
    removeCheckoutPhoto();

    // Open modal
    const modal = document.getElementById('checkoutFormModal');
    if (modal) modal.classList.remove('hidden');

    // Focus on first field
    setTimeout(() => {
        const firstField = document.getElementById('checkoutGuestName');
        if (firstField) firstField.focus();
    }, 200);

    console.log('🧳 [Checkout] Form opened');
}

function closeCheckoutForm() {
    const modal = document.getElementById('checkoutFormModal');
    if (modal) modal.classList.add('hidden');

    // Reset state
    currentCheckoutPhoto = null;
    currentCheckoutPhotoSize = 0;
    console.log('🧳 [Checkout] Form closed');
}

/* ═══════════════════════════════════════════════════════════════════
   SERIAL NUMBER
   ═══════════════════════════════════════════════════════════════════ */

function generateCheckoutSerialPreview() {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 9000) + 1000;
    return `CO-${year}-${random}`;
}

async function generateCheckoutSerial() {
    // Try to get the next number from Supabase
    if (typeof supabaseClient === 'undefined' || !supabaseClient) {
        // Fallback : local generation
        return generateCheckoutSerialPreview();
    }

    try {
        const year = new Date().getFullYear();
        const prefix = `CO-${year}-`;

        // Get the latest serial for this year
        const { data, error } = await supabaseClient
            .from('checkout_records')
            .select('serial_number')
            .like('serial_number', `${prefix}%`)
            .order('serial_number', { ascending: false })
            .limit(1);

        if (error) {
            console.warn('[Checkout] Serial fetch error:', error.message);
            return generateCheckoutSerialPreview();
        }

        if (!data || data.length === 0) {
            return `${prefix}0001`;
        }

        // Extract number and increment
        const lastSerial = data[0].serial_number;
        const lastNumber = parseInt(lastSerial.replace(prefix, ''), 10) || 0;
        const nextNumber = lastNumber + 1;
        const padded = String(nextNumber).padStart(4, '0');

        return `${prefix}${padded}`;

    } catch (e) {
        console.warn('[Checkout] Serial exception:', e);
        return generateCheckoutSerialPreview();
    }
}

/* ═══════════════════════════════════════════════════════════════════
   PHOTO — PREVIEW / COMPRESS / REMOVE
   ═══════════════════════════════════════════════════════════════════ */

async function previewCheckoutPhoto(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size (max 10 MB original)
    if (file.size > 10 * 1024 * 1024) {
        alert('⚠️ Photo too large (max 10 MB).');
        event.target.value = '';
        return;
    }

    try {
        const reader = new FileReader();

        reader.onload = async (e) => {
            const img = new Image();

            img.onload = async () => {
                // Compress main photo
                const compressed = await compressImage(img, CHECKOUT_PHOTO_MAX_WIDTH, CHECKOUT_PHOTO_QUALITY);
                currentCheckoutPhoto = compressed;
                currentCheckoutPhotoSize = Math.round(compressed.length * 0.75 / 1024); // approximate KB

                // Show preview
                const previewWrap = document.getElementById('checkoutPhotoPreviewWrap');
                const preview = document.getElementById('checkoutPhotoPreview');
                const sizeEl = document.getElementById('checkoutPhotoSize');
                const btnText = document.getElementById('checkoutPhotoBtnText');

                if (preview) preview.src = compressed;
                if (sizeEl) sizeEl.textContent = `📸 ${currentCheckoutPhotoSize} KB`;
                if (previewWrap) previewWrap.classList.remove('hidden');
                if (btnText) btnText.textContent = '📸 Retake Photo';

                console.log(`📸 [Checkout] Photo compressed: ${currentCheckoutPhotoSize} KB`);
            };

            img.onerror = () => {
                alert('⚠️ Could not read this image.');
                event.target.value = '';
            };

            img.src = e.target.result;
        };

        reader.onerror = () => {
            alert('⚠️ Could not read this file.');
            event.target.value = '';
        };

        reader.readAsDataURL(file);

    } catch (e) {
        console.error('[Checkout] Photo preview error:', e);
        alert('⚠️ Error processing photo.');
    }
}

function compressImage(img, maxWidth, quality) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Scale down if needed
        if (width > maxWidth) {
            height = Math.round(height * (maxWidth / width));
            width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
    });
}

function removeCheckoutPhoto() {
    currentCheckoutPhoto = null;
    currentCheckoutPhotoSize = 0;

    const previewWrap = document.getElementById('checkoutPhotoPreviewWrap');
    const preview = document.getElementById('checkoutPhotoPreview');
    const btnText = document.getElementById('checkoutPhotoBtnText');
    const input = document.getElementById('checkoutPhotoInput');

    if (previewWrap) previewWrap.classList.add('hidden');
    if (preview) preview.src = '';
    if (btnText) btnText.textContent = '📸 Take Photo of Receipt';
    if (input) input.value = '';

    console.log('📸 [Checkout] Photo removed');
}

/* ═══════════════════════════════════════════════════════════════════
   UPLOAD PHOTO TO SUPABASE STORAGE
   ═══════════════════════════════════════════════════════════════════ */

async function uploadCheckoutPhoto(base64Data, serialNumber) {
    if (!base64Data) return { url: null, thumb: null };

    if (typeof supabaseClient === 'undefined' || !supabaseClient) {
        console.warn('[Checkout] Supabase not available, skipping upload');
        return { url: null, thumb: null };
    }

    try {
        // Convert base64 to Blob
        const blob = dataURLtoBlob(base64Data);
        const timestamp = Date.now();
        const filename = `${serialNumber}_${timestamp}.jpg`;

        // Upload main photo
        const { data: uploadData, error: uploadError } = await supabaseClient
            .storage
            .from(CHECKOUT_STORAGE_BUCKET)
            .upload(filename, blob, {
                contentType: 'image/jpeg',
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.warn('[Checkout] Upload error:', uploadError.message);
            return { url: null, thumb: null };
        }

        // Get public URL
        const { data: urlData } = supabaseClient
            .storage
            .from(CHECKOUT_STORAGE_BUCKET)
            .getPublicUrl(filename);

        const publicUrl = urlData?.publicUrl || null;

        console.log(`✅ [Checkout] Photo uploaded: ${filename}`);

        return {
            url: publicUrl,
            thumb: base64Data  // For now, use same for thumbnail
        };

    } catch (e) {
        console.error('[Checkout] Upload exception:', e);
        return { url: null, thumb: null };
    }
}

function dataURLtoBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

/* ═══════════════════════════════════════════════════════════════════
   SAVE RECORD
   ═══════════════════════════════════════════════════════════════════ */

async function saveCheckoutRecord() {
    // Get values
    const guestName = document.getElementById('checkoutGuestName')?.value.trim();
    const roomNumber = document.getElementById('checkoutRoomNumber')?.value.trim();
    const departureDate = document.getElementById('checkoutDepartureDate')?.value || null;
    const contactPhone = document.getElementById('checkoutContactPhone')?.value.trim();
    const depositedBy = document.getElementById('checkoutDepositedBy')?.value.trim();
    const pieceCount = parseInt(document.getElementById('checkoutPieceCount')?.value, 10) || 0;
    const serviceType = document.getElementById('checkoutServiceType')?.value || 'Laundry';
    const recoveryMethod = document.getElementById('checkoutRecoveryMethod')?.value || 'Front Desk';
    const notes = document.getElementById('checkoutNotes')?.value.trim();

    // Validation
    if (!guestName || guestName.length < 2) {
        alert('⚠️ Please enter a valid guest name.');
        document.getElementById('checkoutGuestName')?.focus();
        return;
    }

    if (!roomNumber) {
        alert('⚠️ Please enter the room number.');
        document.getElementById('checkoutRoomNumber')?.focus();
        return;
    }

    if (pieceCount <= 0) {
        alert('⚠️ Please enter a valid piece count.');
        document.getElementById('checkoutPieceCount')?.focus();
        return;
    }

    if (!currentCheckoutPhoto) {
        const confirmNoPhoto = confirm('⚠️ No receipt photo.\n\nContinue without photo?');
        if (!confirmNoPhoto) return;
    }

    // Save button — loading state
    const saveBtn = document.getElementById('checkoutSaveBtn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.classList.add('loading');
    }

    try {
        // Generate serial
        const serialNumber = await generateCheckoutSerial();
        console.log(`🧳 [Checkout] Saving: ${serialNumber}`);

        // Upload photo (if any)
        let photoUrl = null;
        let photoThumb = null;

        if (currentCheckoutPhoto) {
            const uploadResult = await uploadCheckoutPhoto(currentCheckoutPhoto, serialNumber);
            photoUrl = uploadResult.url;
            photoThumb = uploadResult.thumb;
        }

        // Save to Supabase
        const payload = {
            serial_number: serialNumber,
            guest_name: guestName,
            room_number: roomNumber,
            departure_date: departureDate,
            contact_phone: contactPhone || null,
            deposited_by: depositedBy || 'Staff',
            deposited_role: (typeof currentStaffUser !== 'undefined' && currentStaffUser?.role) || 'staff',
            piece_count: pieceCount,
            service_type: serviceType,
            recovery_method: recoveryMethod,
            notes: notes || null,
            status: 'Deposited',
            receipt_photo_url: photoUrl,
            receipt_photo_thumb: photoThumb
        };

        let insertedRecord = null;

        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient
                .from('checkout_records')
                .insert([payload])
                .select()
                .single();

            if (error) {
                console.error('[Checkout] Insert error:', error.message);
                alert('⚠️ Error saving record: ' + error.message);
                return;
            }

            insertedRecord = data;
        } else {
            // Local fallback
            insertedRecord = {
                ...payload,
                id: 'local_' + Date.now(),
                created_at: new Date().toISOString()
            };
            console.warn('[Checkout] Saved locally only (Supabase unavailable)');
        }

        // Save to localStorage (thumb)
        saveCheckoutToLocalStorage(insertedRecord);

        // Close modal
        closeCheckoutForm();

        // Refresh list
        await renderCheckoutList();

        // Show success
        showCheckoutToast(`✅ Check-Out ${serialNumber} saved`, 'success');

        console.log(`✅ [Checkout] Saved: ${serialNumber}`);

    } catch (e) {
        console.error('[Checkout] Save exception:', e);
        alert('⚠️ Error saving check-out. Please retry.');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.classList.remove('loading');
        }
    }
}

/* ═══════════════════════════════════════════════════════════════════
   LOCAL STORAGE — Thumbnails cache
   ═══════════════════════════════════════════════════════════════════ */

const CHECKOUT_LOCAL_KEY = 'remal_checkout_records';

function saveCheckoutToLocalStorage(record) {
    try {
        let records = [];
        const raw = localStorage.getItem(CHECKOUT_LOCAL_KEY);
        if (raw) {
            try { records = JSON.parse(raw) || []; } catch (e) { records = []; }
        }

        // Keep only thumbnails in localStorage (not full photos)
        const lightRecord = {
            id: record.id,
            serial_number: record.serial_number,
            guest_name: record.guest_name,
            room_number: record.room_number,
            departure_date: record.departure_date,
            contact_phone: record.contact_phone,
            deposited_by: record.deposited_by,
            piece_count: record.piece_count,
            service_type: record.service_type,
            recovery_method: record.recovery_method,
            notes: record.notes,
            status: record.status,
            receipt_photo_thumb: record.receipt_photo_thumb ? record.receipt_photo_thumb.substring(0, 50000) : null, // Cap size
            created_at: record.created_at
        };

        // Add or update
        const existingIdx = records.findIndex(r => String(r.id) === String(record.id));
        if (existingIdx !== -1) {
            records[existingIdx] = lightRecord;
        } else {
            records.unshift(lightRecord);
        }

        // Cap to 100 records
        records = records.slice(0, 100);

        localStorage.setItem(CHECKOUT_LOCAL_KEY, JSON.stringify(records));
    } catch (e) {
        console.warn('[Checkout] localStorage save error:', e);
    }
}

function loadCheckoutFromLocalStorage() {
    try {
        const raw = localStorage.getItem(CHECKOUT_LOCAL_KEY);
        if (!raw) return [];
        return JSON.parse(raw) || [];
    } catch (e) {
        return [];
    }
}

/* ═══════════════════════════════════════════════════════════════════
   RENDER LIST
   ═══════════════════════════════════════════════════════════════════ */

async function renderCheckoutList() {
    const container = document.getElementById('checkoutList');
    if (!container) return;

    // Avoid double-loading
    if (checkoutLoading) return;
    checkoutLoading = true;

    try {
        // Load from Supabase
        let records = [];
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient
                .from('checkout_records')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(200);

            if (!error && data) {
                records = data;
                console.log(`🧳 [Checkout] Loaded ${records.length} records from Supabase`);
            } else if (error) {
                console.warn('[Checkout] Load error:', error.message);
                // Fallback to localStorage
                records = loadCheckoutFromLocalStorage();
            }
        } else {
            records = loadCheckoutFromLocalStorage();
        }

        checkoutRecords = records;

        // Update stats
        updateCheckoutStats(records);

        // Filter
        const filtered = filterCheckoutRecords(records);

        // Render
        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="checkout-empty">
                    <div style="font-size: 40px; margin-bottom: 12px;">📭</div>
                    <p>No check-out records yet.</p>
                    <p style="font-size: 11px; opacity: 0.7; margin-top: 6px;">
                        Click "New Check-Out" to create the first one.
                    </p>
                </div>`;
            return;
        }

        container.innerHTML = filtered.map((record, i) => renderCheckoutCard(record, i)).join('');

    } catch (e) {
        console.error('[Checkout] Render exception:', e);
        container.innerHTML = `
            <div class="checkout-empty">
                <p>⚠️ Error loading check-outs.</p>
                <p style="font-size: 11px; opacity: 0.7; margin-top: 6px;">${e.message}</p>
            </div>`;
    } finally {
        checkoutLoading = false;
    }
}

function renderCheckoutCard(record, index) {
    const statusClass = (record.status || 'Deposited').toLowerCase().replace(' ', '-');
    const thumb = record.receipt_photo_thumb || record.receipt_photo_url;
    
    // Format date
    const dateFormatted = record.created_at 
        ? new Date(record.created_at).toLocaleDateString('en-GB', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
        })
        : '---';

    // Departure info
    let departureInfo = '';
    if (record.departure_date) {
        const depDate = new Date(record.departure_date);
        const now = new Date();
        const diffDays = Math.ceil((depDate - now) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            departureInfo = `<span style="color: #fda4af;">⚠️ Departed ${Math.abs(diffDays)}d ago</span>`;
        } else if (diffDays === 0) {
            departureInfo = `<span style="color: #fbbf24;">🔔 Departs today</span>`;
        } else {
            departureInfo = `<span>🛫 ${diffDays}d left</span>`;
        }
    }

    const photoHtml = thumb
        ? `<img src="${thumb}" alt="${record.serial_number}" class="checkout-card-photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
           <div class="checkout-card-photo-placeholder" style="display:none;">📸</div>`
        : `<div class="checkout-card-photo-placeholder">📸</div>`;

    return `
        <div class="checkout-card status-${statusClass}" onclick="openCheckoutDetail('${record.id}')" style="animation-delay: ${index * 30}ms">
            ${photoHtml}
            <div class="checkout-card-info">
                <div class="checkout-card-serial">${record.serial_number}</div>
                <div class="checkout-card-guest">${record.guest_name}</div>
                <div class="checkout-card-details">
                    <span>🏠 Room ${record.room_number}</span>
                    <span>📦 ${record.piece_count} pcs</span>
                    ${departureInfo}
                </div>
                <div class="checkout-card-details" style="opacity: 0.7;">
                    <span>📅 ${dateFormatted}</span>
                    <span>👤 ${record.deposited_by || 'Staff'}</span>
                </div>
            </div>
            <div class="checkout-card-status ${statusClass}">
                ${record.status || 'Deposited'}
            </div>
        </div>
    `;
}

/* ═══════════════════════════════════════════════════════════════════
   FILTERS + STATS
   ═══════════════════════════════════════════════════════════════════ */

function switchCheckoutFilter(status) {
    currentCheckoutFilter = status;

    // Update buttons
    document.querySelectorAll('.checkout-filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const btnId = status === 'all' 
        ? 'checkoutFilterAll' 
        : `checkoutFilter${status.replace(' ', '')}`;
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.add('active');

    // Re-render
    renderCheckoutList();
}

function filterCheckoutRecords(records) {
    let filtered = records;

    // Status filter
    if (currentCheckoutFilter !== 'all') {
        filtered = filtered.filter(r => r.status === currentCheckoutFilter);
    }

    // Search filter
    const searchInput = document.getElementById('checkoutSearchInput');
    const query = searchInput?.value.toLowerCase().trim() || '';

    if (query) {
        filtered = filtered.filter(r => {
            return (
                String(r.serial_number || '').toLowerCase().includes(query) ||
                String(r.guest_name || '').toLowerCase().includes(query) ||
                String(r.room_number || '').toLowerCase().includes(query)
            );
        });
    }

    return filtered;
}

function updateCheckoutStats(records) {
    const counts = {
        Deposited: 0,
        Processing: 0,
        Ready: 0,
        'Picked Up': 0
    };

    records.forEach(r => {
        if (counts[r.status] !== undefined) counts[r.status]++;
    });

    const el = (id, val) => {
        const e = document.getElementById(id);
        if (e) e.textContent = val;
    };

    el('checkoutStatDeposited', counts.Deposited);
    el('checkoutStatProcessing', counts.Processing);
    el('checkoutStatReady', counts.Ready);
    el('checkoutStatPickedUp', counts['Picked Up']);
}

/* ═══════════════════════════════════════════════════════════════════
   DETAIL MODAL
   ═══════════════════════════════════════════════════════════════════ */

function openCheckoutDetail(recordId) {
    const record = checkoutRecords.find(r => String(r.id) === String(recordId));
    if (!record) return;

    currentEditingCheckout = record;

    const body = document.getElementById('checkoutDetailBody');
    if (!body) return;

    const photoUrl = record.receipt_photo_url || record.receipt_photo_thumb;
    const photoHtml = photoUrl
        ? `<img src="${photoUrl}" alt="Receipt" style="width: 100%; max-height: 300px; object-fit: contain; border-radius: 12px; background: #000; margin-bottom: 16px;">`
        : `<div style="text-align: center; padding: 30px; background: rgba(0,0,0,0.3); border-radius: 12px; margin-bottom: 16px; color: #78716c;">📸 No photo</div>`;

    body.innerHTML = `
        ${photoHtml}
        
        <div style="background: rgba(15, 14, 12, 0.6); border: 1px solid var(--border-gold); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
            <div style="font-family: 'Courier New', monospace; color: #DCA773; font-size: 13px; font-weight: 900; margin-bottom: 4px;">
                ${record.serial_number}
            </div>
            <div style="color: var(--text-muted); font-size: 11px;">
                Created: ${new Date(record.created_at).toLocaleString('en-GB')}
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div>
                <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Guest</div>
                <div style="font-size: 14px; font-weight: 700; color: var(--text-main);">${record.guest_name}</div>
            </div>
            <div>
                <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Room</div>
                <div style="font-size: 14px; font-weight: 700; color: var(--text-main);">${record.room_number}</div>
            </div>
            <div>
                <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Pieces</div>
                <div style="font-size: 14px; font-weight: 700; color: var(--text-main);">${record.piece_count}</div>
            </div>
            <div>
                <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Service</div>
                <div style="font-size: 14px; font-weight: 700; color: var(--text-main);">${record.service_type}</div>
            </div>
            <div>
                <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Departure</div>
                <div style="font-size: 14px; font-weight: 700; color: var(--text-main);">${record.departure_date || '---'}</div>
            </div>
            <div>
                <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Phone</div>
                <div style="font-size: 14px; font-weight: 700; color: var(--text-main);">${record.contact_phone || '---'}</div>
            </div>
            <div>
                <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Deposited By</div>
                <div style="font-size: 14px; font-weight: 700; color: var(--text-main);">${record.deposited_by || '---'}</div>
            </div>
            <div>
                <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Recovery</div>
                <div style="font-size: 14px; font-weight: 700; color: var(--text-main);">${record.recovery_method || '---'}</div>
            </div>
        </div>

        ${record.notes ? `
            <div style="background: rgba(15, 14, 12, 0.6); border: 1px solid var(--border-gold); border-radius: 12px; padding: 12px; margin-bottom: 16px;">
                <div style="font-size: 10px; color: #DCA773; text-transform: uppercase; font-weight: 800; margin-bottom: 6px;">📝 Notes</div>
                <div style="font-size: 12px; color: var(--text-main);">${record.notes}</div>
            </div>
        ` : ''}

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px;">
            <button onclick="changeCheckoutStatus('${record.id}', 'Processing')" style="padding: 12px; border-radius: 10px; background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.4); color: #93c5fd; font-weight: 700; font-size: 11px; cursor: pointer; text-transform: uppercase;">
                🧼 Processing
            </button>
            <button onclick="changeCheckoutStatus('${record.id}', 'Ready')" style="padding: 12px; border-radius: 10px; background: rgba(168,85,247,0.15); border: 1px solid rgba(168,85,247,0.4); color: #d8b4fe; font-weight: 700; font-size: 11px; cursor: pointer; text-transform: uppercase;">
                ✨ Ready
            </button>
            <button onclick="changeCheckoutStatus('${record.id}', 'Picked Up')" style="grid-column: span 2; padding: 12px; border-radius: 10px; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.4); color: #6ee7b7; font-weight: 700; font-size: 11px; cursor: pointer; text-transform: uppercase;">
                ✅ Mark as Picked Up
            </button>
        </div>
    `;

    const modal = document.getElementById('checkoutDetailModal');
    if (modal) modal.classList.remove('hidden');
}

function closeCheckoutDetail() {
    const modal = document.getElementById('checkoutDetailModal');
    if (modal) modal.classList.add('hidden');
    currentEditingCheckout = null;
}

async function changeCheckoutStatus(recordId, newStatus) {
    if (!recordId || !newStatus) return;

    if (typeof supabaseClient === 'undefined' || !supabaseClient) {
        alert('⚠️ Supabase not available.');
        return;
    }

    try {
        const payload = { status: newStatus };
        if (newStatus === 'Picked Up') {
            payload.picked_up_at = new Date().toISOString();
        }

        const { error } = await supabaseClient
            .from('checkout_records')
            .update(payload)
            .eq('id', recordId);

        if (error) {
            alert('⚠️ Error: ' + error.message);
            return;
        }

        // Close detail + refresh list
        closeCheckoutDetail();
        await renderCheckoutList();

        showCheckoutToast(`✅ Status updated to ${newStatus}`, 'success');

    } catch (e) {
        console.error('[Checkout] Status change error:', e);
        alert('⚠️ Error updating status.');
    }
}

/* ═══════════════════════════════════════════════════════════════════
   TOAST
   ═══════════════════════════════════════════════════════════════════ */

function showCheckoutToast(message, type = 'info') {
    // Reuse existing toast if available
    if (typeof showToast === 'function') {
        showToast(message);
        return;
    }

    // Fallback
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 90px;
        left: 50%;
        transform: translateX(-50%) translateY(120px);
        background: linear-gradient(135deg, #1a0c05, #2f170d);
        color: #f3f4f6;
        padding: 14px 22px;
        border-radius: 99px;
        font-weight: 700;
        font-size: 13px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.6);
        border: 1px solid rgba(220,167,115,0.4);
        z-index: 9999;
        transition: transform 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.4);
        pointer-events: none;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(120px)';
        setTimeout(() => toast.remove(), 400);
    }, 2600);
}

/* ═══════════════════════════════════════════════════════════════════
   PRINT RECEIPT
   ═══════════════════════════════════════════════════════════════════ */

function printCheckoutReceipt() {
    if (!currentEditingCheckout) return;

    const r = currentEditingCheckout;

    // Build print window
    const printWindow = window.open('', '_blank', 'width=800,height=900');

    if (!printWindow) {
        alert('⚠️ Please allow pop-ups to print.');
        return;
    }

    const photoUrl = r.receipt_photo_url || r.receipt_photo_thumb;

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Check-Out Receipt - ${r.serial_number}</title>
            <style>
                @page { size: A4; margin: 15mm; }
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Helvetica', Arial, sans-serif; color: #1c1917; background: #fff; }
                .header { text-align: center; border-bottom: 2px solid #DCA773; padding-bottom: 16px; margin-bottom: 24px; }
                .header h1 { font-size: 22px; letter-spacing: 3px; margin-bottom: 6px; color: #1c1917; }
                .header p { font-size: 10px; color: #6b7280; letter-spacing: 2px; text-transform: uppercase; }
                .title { font-size: 16px; font-weight: 900; color: #b45309; letter-spacing: 2px; text-align: center; margin: 20px 0; text-transform: uppercase; }
                .serial { text-align: center; font-family: 'Courier New', monospace; font-size: 14px; font-weight: 900; color: #DCA773; background: #f5ece0; padding: 10px; border-radius: 8px; margin-bottom: 20px; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; margin-bottom: 20px; }
                .field { border-bottom: 1px solid #e5e7eb; padding: 8px 0; }
                .field-label { font-size: 9px; color: #6b7280; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; margin-bottom: 4px; }
                .field-value { font-size: 13px; font-weight: 700; color: #1c1917; }
                .photo { width: 100%; max-height: 300px; object-fit: contain; border-radius: 12px; border: 1px solid #e5e7eb; margin: 20px 0; background: #f9fafb; }
                .notes { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px; margin: 20px 0; font-size: 11px; }
                .notes-title { font-weight: 800; color: #78350f; font-size: 9px; text-transform: uppercase; margin-bottom: 6px; }
                .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #DCA773; }
                .footer-title { font-size: 12px; font-weight: 900; color: #b45309; letter-spacing: 2px; text-transform: uppercase; }
                .footer-sub { font-size: 9px; color: #6b7280; margin-top: 6px; }
                .signature { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; }
                .signature-item { border-top: 1px solid #1c1917; padding-top: 8px; font-size: 9px; color: #6b7280; text-align: center; text-transform: uppercase; letter-spacing: 1px; }
                @media print { body { padding: 0; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>REMAL HOTEL &amp; VILLAS</h1>
                <p>Al Ruwais City · Abu Dhabi · U.A.E</p>
            </div>

            <div class="title">Check-Out Laundry Receipt</div>
            <div class="serial">${r.serial_number}</div>

            <div class="grid">
                <div class="field">
                    <div class="field-label">Guest Name</div>
                    <div class="field-value">${r.guest_name}</div>
                </div>
                <div class="field">
                    <div class="field-label">Room Number</div>
                    <div class="field-value">${r.room_number}</div>
                </div>
                <div class="field">
                    <div class="field-label">Departure Date</div>
                    <div class="field-value">${r.departure_date || '---'}</div>
                </div>
                <div class="field">
                    <div class="field-label">Contact Phone</div>
                    <div class="field-value">${r.contact_phone || '---'}</div>
                </div>
                <div class="field">
                    <div class="field-label">Piece Count</div>
                    <div class="field-value">${r.piece_count} pieces</div>
                </div>
                <div class="field">
                    <div class="field-label">Service Type</div>
                    <div class="field-value">${r.service_type}</div>
                </div>
                <div class="field">
                    <div class="field-label">Deposited By</div>
                    <div class="field-value">${r.deposited_by}</div>
                </div>
                <div class="field">
                    <div class="field-label">Recovery Method</div>
                    <div class="field-value">${r.recovery_method}</div>
                </div>
                <div class="field">
                    <div class="field-label">Date &amp; Time</div>
                    <div class="field-value">${new Date(r.created_at).toLocaleString('en-GB')}</div>
                </div>
                <div class="field">
                    <div class="field-label">Current Status</div>
                    <div class="field-value">${r.status}</div>
                </div>
            </div>

            ${photoUrl ? `<img src="${photoUrl}" class="photo" alt="Receipt">` : ''}

            ${r.notes ? `
                <div class="notes">
                    <div class="notes-title">📝 Notes</div>
                    <div>${r.notes}</div>
                </div>
            ` : ''}

            <div class="signature">
                <div class="signature-item">Guest Signature</div>
                <div class="signature-item">Staff Signature</div>
            </div>

            <div class="footer">
                <div class="footer-title">Thank You For Your Stay</div>
                <div class="footer-sub">This receipt is your proof of deposit. Please keep it safe.</div>
            </div>

            <script>
                window.onload = () => {
                    setTimeout(() => { window.print(); }, 500);
                };
            <\/script>
        </body>
        </html>
    `);

    printWindow.document.close();
}

/* ═══════════════════════════════════════════════════════════════════
   EXPOSE GLOBALLY
   ═══════════════════════════════════════════════════════════════════ */

window.openCheckoutForm = openCheckoutForm;
window.closeCheckoutForm = closeCheckoutForm;
window.previewCheckoutPhoto = previewCheckoutPhoto;
window.removeCheckoutPhoto = removeCheckoutPhoto;
window.saveCheckoutRecord = saveCheckoutRecord;
window.renderCheckoutList = renderCheckoutList;
window.switchCheckoutFilter = switchCheckoutFilter;
window.openCheckoutDetail = openCheckoutDetail;
window.closeCheckoutDetail = closeCheckoutDetail;
window.changeCheckoutStatus = changeCheckoutStatus;
window.printCheckoutReceipt = printCheckoutReceipt;

console.log('✅ [Checkout] Module loaded');
