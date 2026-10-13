// ═══════════════════════════════════════════════════════════════════
// REMAL LAUNDRY OS — BATCH PRINT
// Prints all checked slips. H/F packaging → 2 pages (Hanger + Folding)
//
// ✅ FIX : Uses CLASSES instead of IDs for data injection
// ✅ FIX : No remove() workaround — direct page building
// ✅ FIX : Detailed console logs for debugging
// ✅ FIX v2 : Syntax error at line 130 removed
// ═══════════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ───────────────────────────────────────────────────────────────
    // MAIN — Print all checked slips
    // ───────────────────────────────────────────────────────────────
    function printSelectedSlips() {
        const checkboxes = document.querySelectorAll('.room-checkbox:checked');
        console.log('[Batch] Checkboxes checked:', checkboxes.length);

        if (checkboxes.length === 0) {
            alert('⚠️ No slips selected. Please check at least one room.');
            return;
        }

        // 1. Collect slip IDs
        const slipIds = [];
        checkboxes.forEach(cb => {
            const id = cb.dataset.id || cb.value || cb.getAttribute('data-slip-id');
            if (id) slipIds.push(String(id));
        });

        console.log('[Batch] Slip IDs collected:', slipIds);

        if (slipIds.length === 0) {
            alert('⚠️ Could not read slip IDs. Check the checkbox data attributes.');
            return;
        }

        // 2. Find slips in cachedSlips
        const slips = slipIds
            .map(id => (cachedSlips || []).find(s => String(s.id) === String(id)))
            .filter(Boolean);

        console.log('[Batch] Slips found in cache:', slips.length);

        if (slips.length === 0) {
            alert('⚠️ No matching slips found in cache.');
            return;
        }

        // 3. Build the print container
        buildAndPrint(slips);
    }

    // ───────────────────────────────────────────────────────────────
    // BUILD — Generate the printable HTML
    // ───────────────────────────────────────────────────────────────
    function buildAndPrint(slips) {
        // Récupérer la zone modèle (#pdfExportArea) pour cloner le style
        const template = document.getElementById('pdfExportArea');
        if (!template) {
            alert('⚠️ Template not found. Please open a slip first to initialize the template.');
            console.error('[Batch] #pdfExportArea not found in DOM');
            return;
        }

        // Créer le container batch (caché à l'écran)
        let container = document.getElementById('batchPrintContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'batchPrintContainer';
            document.body.appendChild(container);
        }

        // Vider le container AVANT de reconstruire
        container.innerHTML = '';

        // Compteur de pages
        let pageCount = 0;

        slips.forEach((slip, index) => {
            const packaging = getPackaging(slip);
            console.log(`[Batch] Slip ${slip.room_number || slip.room} | packaging=${packaging.key} (${packaging.label})`);

            if (packaging.key === 'hf') {
                // H/F → 2 pages : Hanger + Folding
                container.appendChild(buildSlipPage(slip, template, packaging, 'hanger', index));
                container.appendChild(buildSlipPage(slip, template, packaging, 'folding', index));
                pageCount += 2;
            } else {
                // F / S / H → 1 page
                container.appendChild(buildSlipPage(slip, template, packaging, null, index));
                pageCount += 1;
            }
        });

        console.log(`[Batch] Total: ${slips.length} slip(s) → ${pageCount} page(s)`);

        // Marquer le body pour activer le CSS print
        document.body.classList.add('print-mode-batch');
        document.body.classList.remove('print-mode-modal');

        // Déclencher l'impression
        setTimeout(() => {
            window.print();
        }, 300);

        // Nettoyer après impression
        setTimeout(() => {
            document.body.classList.remove('print-mode-batch');
        }, 3000);
    }

    // ───────────────────────────────────────────────────────────────
    // BUILD ONE PAGE — Clone the template and fill data
    // ───────────────────────────────────────────────────────────────
    function buildSlipPage(slip, template, packaging, hfMode, index) {
        const card = document.createElement('div');
        card.className = 'printable-card';
        card.setAttribute('data-slip-id', slip.id);
        if (hfMode) card.setAttribute('data-hf-mode', hfMode);

        // Deep clone du template (#pdfExportArea)
        const clone = template.cloneNode(true);
        clone.removeAttribute('id');                // ⚠️ Retire l'ID pour ne pas dupliquer
        clone.classList.add('pdf-export-area');     // ✅ Utilise la classe
        clone.classList.remove('no-print');         // ✅ Assure la visibilité

        // Injecter les données dans le clone
        injectSlipData(clone, slip, packaging, hfMode);

        // Ajouter un badge H/F si nécessaire
        if (hfMode) {
            const headerRight = clone.querySelector('.receipt-header-right');
            if (headerRight) {
                const hfBadge = document.createElement('div');
                hfBadge.className = `hf-badge hf-badge--${hfMode}`;
                hfBadge.textContent = hfMode === 'hanger' ? '🧷 HANGER' : '📦 FOLDING';
                hfBadge.style.cssText = `
                    display: inline-block;
                    padding: 6px 14px;
                    border-radius: 9999px;
                    font-size: 11px;
                    font-weight: 900;
                    letter-spacing: 0.1em;
                    margin-top: 8px;
                    text-transform: uppercase;
                    background: ${hfMode === 'hanger' ? '#dbeafe' : '#fef3c7'};
                    color: ${hfMode === 'hanger' ? '#1e40af' : '#78350f'};
                    border: 1.5px solid ${hfMode === 'hanger' ? '#3b82f6' : '#f59e0b'};
                `;
                headerRight.appendChild(hfBadge);
            }
        }

        card.appendChild(clone);
        return card;
    }

    // ───────────────────────────────────────────────────────────────
    // INJECT DATA — Fill the cloned template with slip info
    // ⚠️ Uses CLASSES (not IDs) to avoid conflicts between clones
    // ───────────────────────────────────────────────────────────────
    function injectSlipData(clone, slip, packaging, hfMode) {
        const $ = (sel) => clone.querySelector(sel);
        const setText = (sel, val) => { const el = $(sel); if (el) el.textContent = val; };

        // ─── Room number ───
        const roomNum = slip.room_number || slip.room || '---';
        setText('.receipt-room-number', roomNum);

        // ─── Service badge ───
        setText('.receipt-service-compact', 'LAUNDRY SERVICE');

        // ─── Receipt ID ───
        const receiptId = typeof obtenirReceiptId === 'function'
            ? obtenirReceiptId(slip)
            : (slip.receipt_id || '---');
        setText('.receipt-id-compact', 'Receipt ID: ' + receiptId);

        // ─── Date ───
        const dateStr = slip.created_at
            ? new Date(slip.created_at).toLocaleDateString('en-GB', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            })
            : '---';
        const dateEl = clone.querySelector('.receipt-info-box .text-right p');
        if (dateEl) dateEl.textContent = dateStr;

        // ─── Type badge ───
        let badgeLabel = 'Hotel Count';
        if (slip.extra_charged || slip.count_type === 'quota_extra') badgeLabel = 'Quota + Extra';
        else if (slip.count_type === 'guest') badgeLabel = 'Chargeable';
        const badgeEl = clone.querySelector('#modalTypeBadgeInline');
        if (badgeEl) badgeEl.textContent = badgeLabel;

        // ─── Guest info ───
        const agencyBox = clone.querySelector('#modalAgencyQuotaBox');
        if (agencyBox) {
            agencyBox.classList.remove('hidden');
            const rows = agencyBox.querySelectorAll('.flex.justify-between');
            if (rows[0]) {
                const valEl = rows[0].querySelector('span:last-child');
                if (valEl) valEl.textContent = slip.guest_name || '---';
            }
            if (rows[1]) {
                const valEl = rows[1].querySelector('span:last-child');
                if (valEl) valEl.textContent = slip.room_typ || '---';
            }
            if (rows[2]) {
                const valEl = rows[2].querySelector('span:last-child');
                if (valEl) valEl.textContent = slip.agency || 'Direct';
            }
            if (rows[3]) {
                const valEl = rows[3].querySelector('span:last-child');
                if (valEl) valEl.textContent = slip.quota || slip.pms_quota || '---';
            }
            if (rows[4]) {
                const valEl = rows[4].querySelector('span:last-child');
                if (valEl) valEl.textContent = typeof formatAgentDisplay === 'function'
                    ? formatAgentDisplay(slip.created_by)
                    : (slip.created_by || '---');
            }
        }

        // ─── Packaging ───
        let packLabel = slip.options?.service_style || slip.service_type || 'F — Folding';
        if (hfMode === 'hanger') packLabel = 'H/F — HANGER ONLY';
        else if (hfMode === 'folding') packLabel = 'H/F — FOLDING ONLY';
        const packEl = clone.querySelector('#modalPackagingStyle');
        if (packEl) packEl.textContent = packLabel;

        // ─── Items table ───
        const tbody = clone.querySelector('#modalTableBody');
        if (tbody) {
            tbody.innerHTML = '';
            const items = Array.isArray(slip.items) ? slip.items : Object.values(slip.items || {});
            let hasItems = false;
            items.forEach(item => {
                const qty = parseInt(item.quantity || item.qty, 10) || 0;
                const price = parseFloat(item.unit_price || item.price) || 0;
                const lineTotal = qty * price;
                if (qty <= 0) return;
                hasItems = true;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="p-3">${item.name || 'Item'}</td>
                    <td class="p-3 text-center">${qty}</td>
                    <td class="p-3 text-right">${lineTotal.toFixed(2)} AED</td>
                `;
                tbody.appendChild(tr);
            });
            if (!hasItems) {
                tbody.innerHTML = `<tr><td colspan="3" class="p-3 text-center text-stone-400">No items</td></tr>`;
            }
        }

        // ─── Totals ───
        const totalPcs = slip.total_pieces || slip.total_clothes || 0;
        const totalAmount = Number(slip.grand_total || slip.total || 0).toFixed(2);

        const pcsEl = clone.querySelector('#modalClothesCount');
        if (pcsEl) pcsEl.textContent = `${totalPcs} pieces`;

        const totalEl = clone.querySelector('#modalTotal');
        if (totalEl) totalEl.textContent = `${totalAmount} AED`;

        // ─── Notes ───
        const noteBox = clone.querySelector('#modalNoteBox');
        const noteText = clone.querySelector('#modalNoteText');
        if (noteBox && noteText) {
            noteBox.classList.remove('hidden');
            noteText.textContent = slip.special_notes || slip.note || 'None';
        }

        // ─── Photo ───
        const photoContainer = clone.querySelector('#modalPhotoContainer');
        if (photoContainer) {
            if (slip.photo) {
                photoContainer.innerHTML = `<img src="${slip.photo}" alt="Proof" style="width:100%; max-height:200px; object-fit:cover; border-radius:8px;">`;
            } else {
                photoContainer.innerHTML = '';
            }
        }
    }

    // ───────────────────────────────────────────────────────────────
    // HELPERS
    // ───────────────────────────────────────────────────────────────
    function getPackaging(slip) {
        const raw = String(
            slip.options?.service_style || slip.service_type || 'F — Folding'
        ).toLowerCase().trim();

        // H/F — Hanger/Folding (les 2 mots présents)
        if (raw.includes('h/f') || (raw.includes('hanger') && raw.includes('fold'))) {
            return { key: 'hf', label: 'H/F — Hanger/Folding' };
        }
        // H — Hanger seul
        if (raw.includes('hanger')) {
            return { key: 'h', label: 'H — Hanger' };
        }
        // S — Single
        if (raw.includes('single') || /^s\s*[—-]/.test(raw)) {
            return { key: 's', label: 'S — Single' };
        }
        // F — Folding (par défaut)
        return { key: 'f', label: 'F — Folding' };
    }

    // ───────────────────────────────────────────────────────────────
    // INTERCEPT Ctrl+P → redirect to batch print
    // ───────────────────────────────────────────────────────────────
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
            // Si une modale detail est ouverte → comportement natif (print modale seule)
            const detailModal = document.getElementById('detailModal');
            if (detailModal && !detailModal.classList.contains('hidden')) {
                console.log('[Batch] Ctrl+P in modal → native print');
                return; // laisser le navigateur gérer
            }

            // Sinon → batch print des slips cochés
            e.preventDefault();
            e.stopPropagation();
            console.log('[Batch] Ctrl+P intercepted → batch print');
            printSelectedSlips();
        }
    }, true);

    // ───────────────────────────────────────────────────────────────
    // EXPOSE GLOBAL (pour le bouton Batch Print)
    // ───────────────────────────────────────────────────────────────
    window.printSelectedSlips = printSelectedSlips;
    // Alias : ton ancien bouton appelle imprimerToutesLesChambresDuJour
    window.imprimerToutesLesChambresDuJour = printSelectedSlips;

    console.log('✅ [Batch Print] Loaded — Ctrl+P intercepted, imprimerToutesLesChambresDuJour → printSelectedSlips');
})();
