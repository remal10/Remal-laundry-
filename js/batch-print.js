// ═══════════════════════════════════════════════════════════════════
// REMAL LAUNDRY OS — BATCH PRINT
// Prints all checked slips. H/F packaging → 2 pages (Hanger + Folding)
// ═══════════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ───────────────────────────────────────────────────────────────
    // MAIN — Print all checked slips
    // ───────────────────────────────────────────────────────────────
    function printSelectedSlips() {
        const checkboxes = document.querySelectorAll('.room-checkbox:checked');
        if (checkboxes.length === 0) {
            alert('⚠️ No slips selected. Please check at least one room.');
            return;
        }

        // 1. Collect slip IDs
        const slipIds = [];
        checkboxes.forEach(cb => {
            const id = cb.dataset.id || cb.value || cb.getAttribute('data-slip-id');
            if (id) slipIds.push(id);
        });

        if (slipIds.length === 0) {
            alert('⚠️ Could not read slip IDs. Check the checkbox data attributes.');
            return;
        }

        // 2. Find slips in cachedSlips
        const slips = slipIds
            .map(id => (cachedSlips || []).find(s => String(s.id) === String(id)))
            .filter(Boolean);

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
            alert('⚠️ Template not found. Please open a slip first.');
            return;
        }

        // Créer le container batch (caché à l'écran)
        let container = document.getElementById('batchPrintContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'batchPrintContainer';
            document.body.appendChild(container);
        }

        // Vider puis reconstruire
        container.innerHTML = '';

        slips.forEach((slip, index) => {
            const packaging = getPackaging(slip);

            // Toujours 1 page minimum
            container.appendChild(buildSlipPage(slip, template, packaging, null, index));

            // Si H/F → ajouter une 2e page
            if (packaging.key === 'hf') {
                // Page Hanger
                container.querySelector(`.printable-card[data-slip-id="${slip.id}"]`)?.remove();
                container.appendChild(buildSlipPage(slip, template, packaging, 'hanger', index));
                // Page Folding
                container.appendChild(buildSlipPage(slip, template, packaging, 'folding', index));
            }
        });

        // Marquer le body pour le CSS print
        document.body.classList.add('print-mode-batch');
        document.body.classList.remove('print-mode-modal');

        // Déclencher l'impression après un court délai
        setTimeout(() => {
            window.print();
        }, 200);

        // Nettoyer après impression
        setTimeout(() => {
            document.body.classList.remove('print-mode-batch');
            // Optionnel : vider le container
            // container.innerHTML = '';
        }, 3000);
    }

    // ───────────────────────────────────────────────────────────────
    // BUILD ONE PAGE — Clone the template and fill data
    // ───────────────────────────────────────────────────────────────
    function buildSlipPage(slip, template, packaging, hfMode, index) {
        // Clone le template pour avoir tout le HTML stylé
        const card = document.createElement('div');
        card.className = 'printable-card';
        card.setAttribute('data-slip-id', slip.id);
        if (hfMode) card.setAttribute('data-hf-mode', hfMode);

        // Deep clone du template (#pdfExportArea)
        const clone = template.cloneNode(true);
        // Nettoyer les IDs pour éviter les doublons (sauf le container principal)
        clone.id = `pdfExportArea-${index}-${hfMode || 'single'}`;
        clone.classList.remove('no-print');

        // ─── Injecter les données ───
        injectSlipData(clone, slip, packaging, hfMode);

        // Ajouter un badge H/F si nécessaire
        if (hfMode) {
            const headerRight = clone.querySelector('.receipt-header-right');
            if (headerRight) {
                const hfBadge = document.createElement('div');
                hfBadge.className = `hf-badge hf-badge--${hfMode}`;
                hfBadge.textContent = hfMode === 'hanger' ? '🧷 HANGER' : '📦 FOLDING';
                headerRight.appendChild(hfBadge);
            }
        }

        card.appendChild(clone);
        return card;
    }

    // ───────────────────────────────────────────────────────────────
    // INJECT DATA — Fill the cloned template with slip info
    // ───────────────────────────────────────────────────────────────
    function injectSlipData(clone, slip, packaging, hfMode) {
        const $ = (sel) => clone.querySelector(sel);
        const setText = (sel, val) => { const el = $(sel); if (el) el.textContent = val; };
        const setHTML = (sel, val) => { const el = $(sel); if (el) el.innerHTML = val; };

        // Room number
        const roomNum = slip.room_number || slip.room || '---';
        setText('#modalRoomNumDisplay', roomNum);

        // Service badge
        setText('#modalPdfLaundryService', 'LAUNDRY SERVICE');

        // Receipt ID
        const receiptId = typeof obtenirReceiptId === 'function' ? obtenirReceiptId(slip) : (slip.receipt_id || '---');
        setText('#modalReceiptIdDisplay', receiptId);

        // Date
        const dateStr = slip.created_at
            ? new Date(slip.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
            : '---';
        setText('#modalDate', dateStr);

        // Type badge
        let badgeLabel = 'Hotel Count';
        if (slip.extra_charged || slip.count_type === 'quota_extra') badgeLabel = 'Quota + Extra';
        else if (slip.count_type === 'guest') badgeLabel = 'Chargeable';
        setText('#modalTypeBadgeInline', badgeLabel);

        // Guest info
        setText('#modalGuestDisplay', slip.guest_name || '---');
        setText('#modalTypDisplay', slip.room_typ || '---');
        setText('#modalAgencyDisplay', slip.agency || 'Direct');
        setText('#modalQuotaDisplay', slip.quota || slip.pms_quota || '---');
        setText('#modalCreatedByDisplay', formatAgentDisplay ? formatAgentDisplay(slip.created_by) : (slip.created_by || '---'));

        // Afficher le bloc agence si données
        const agencyBox = $('#modalAgencyQuotaBox');
        if (agencyBox) agencyBox.classList.remove('hidden');

        // Packaging (avec indication H/F si mode)
        let packLabel = slip.options?.service_style || slip.service_type || 'F — Folding';
        if (hfMode === 'hanger') packLabel = 'H/F — HANGER ONLY';
        else if (hfMode === 'folding') packLabel = 'H/F — FOLDING ONLY';
        setText('#modalPackagingStyle', packLabel);

        // Items table
        const tbody = $('#modalTableBody');
        if (tbody) {
            tbody.innerHTML = '';
            const items = Array.isArray(slip.items) ? slip.items : (Object.values(slip.items || {}));
            let subtotal = 0;
            items.forEach(item => {
                const qty = parseInt(item.quantity || item.qty, 10) || 0;
                const price = parseFloat(item.unit_price || item.price) || 0;
                const lineTotal = qty * price;
                subtotal += lineTotal;
                if (qty <= 0) return;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="p-3">${item.name || 'Item'}</td>
                    <td class="p-3 text-center">${qty}</td>
                    <td class="p-3 text-right">${lineTotal.toFixed(2)} AED</td>
                `;
                tbody.appendChild(tr);
            });
        }

        // Total pieces + grand total
        const totalPcs = slip.total_pieces || slip.total_clothes || 0;
        const totalAmount = Number(slip.grand_total || slip.total || 0).toFixed(2);
        setText('#modalClothesCount', `${totalPcs} pieces`);
        setText('#modalTotal', `${totalAmount} AED`);

        // Notes
        const noteBox = $('#modalNoteBox');
        const noteText = $('#modalNoteText');
        if (slip.special_notes || slip.note) {
            if (noteBox) noteBox.classList.remove('hidden');
            if (noteText) noteText.textContent = slip.special_notes || slip.note;
        } else {
            if (noteBox) {
                noteBox.classList.remove('hidden');
            }
            if (noteText) noteText.textContent = 'None';
        }

        // Photo (si présente)
        const photoContainer = $('#modalPhotoContainer');
        if (photoContainer && slip.photo) {
            photoContainer.innerHTML = `<img src="${slip.photo}" alt="Proof" style="width:100%; max-height:200px; object-fit:cover; border-radius:8px;">`;
        }
    }

    // ───────────────────────────────────────────────────────────────
    // HELPERS
    // ───────────────────────────────────────────────────────────────
    function getPackaging(slip) {
        const raw = (slip.options?.service_style || slip.service_type || 'F — Folding').toLowerCase();
        if (raw.includes('h/f') || raw.includes('hanger') && raw.includes('fold')) {
            return { key: 'hf', label: 'H/F — Hanger/Folding' };
        }
        if (raw.includes('hanger')) {
            return { key: 'h', label: 'H — Hanger' };
        }
        if (raw.includes('single') || raw.includes('s —')) {
            return { key: 's', label: 'S — Single' };
        }
        return { key: 'f', label: 'F — Folding' };
    }

    // ───────────────────────────────────────────────────────────────
    // INTERCEPT Ctrl+P → redirect to batch print
    // ───────────────────────────────────────────────────────────────
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
            e.preventDefault();
            e.stopPropagation();

            // Si une modale detail est ouverte → comportement normal (print modale seule)
            const detailModal = document.getElementById('detailModal');
            if (detailModal && !detailModal.classList.contains('hidden')) {
                // Laisser faire le print natif (le CSS print-mode-modal gère)
                window.print();
                return;
            }

            // Sinon → batch print des slips cochés
            printSelectedSlips();
        }
    }, true);

    // ───────────────────────────────────────────────────────────────
    // EXPOSE GLOBAL (pour le bouton Batch Print)
    // ───────────────────────────────────────────────────────────────
    window.printSelectedSlips = printSelectedSlips;
    // Alias pour ton ancien bouton qui appelle imprimerToutesLesChambresDuJour
    window.imprimerToutesLesChambresDuJour = printSelectedSlips;

    console.log('✅ [Batch Print] Loaded. Ctrl+P intercepted. imprimerToutesLesChambresDuJour → printSelectedSlips');
})();
