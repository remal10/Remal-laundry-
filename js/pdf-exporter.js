/**
 * Construit un tableau HTML structuré d'articles pour la génération PDF
 */
function buildPdfTableRows(entry) {
    let tableRowsHtml = '';
    const itemsList = Object.values(entry.items || {});

    itemsList.forEach(item => {
        let name = item.name || 'Article';
        let qty = parseInt(item.qty) || 0;
        let price = parseFloat(item.price) || 0;
        if (qty <= 0) return;

        if (entry.is_spa) {
            tableRowsHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 6px; font-weight: bold; color: #000;">${name}</td><td style="text-align: center; font-weight: bold; padding: 6px; color: #000;">${qty}</td><td style="text-align: right; font-weight: bold; padding: 6px; color: #000;">${(qty * price).toFixed(2)} AED</td></tr>`;
        } else if (entry.count_type === 'hotel') {
            tableRowsHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 6px; font-weight: bold; color: #000;">${name}</td><td style="text-align: center; font-weight: bold; padding: 6px; color: #000;">${qty}</td><td style="text-align: right; font-weight: bold; padding: 6px; color: #047857;">0.00 AED</td></tr>`;
        } else if (entry.count_type === 'guest') {
            tableRowsHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 6px; font-weight: bold; color: #000;">${name}</td><td style="text-align: center; font-weight: bold; padding: 6px; color: #000;">${qty}</td><td style="text-align: right; font-weight: bold; padding: 6px; color: #000;">${(qty * price).toFixed(2)} AED</td></tr>`;
        } else if (entry.count_type === 'quota_extra') {
            let freeQty = parseInt(item.freeQty) || 0;
            let chg = qty - freeQty; if (chg < 0) chg = 0;
            if (freeQty > 0) tableRowsHtml += `<tr style="border-bottom: 1px solid #eee; color: #047857;"><td style="padding: 6px; font-weight: bold;">${name} (Free)</td><td style="text-align: center; font-weight: bold; padding: 6px;">${freeQty}</td><td style="text-align: right; font-weight: bold; padding: 6px;">0.00 AED</td></tr>`;
            if (chg > 0) tableRowsHtml += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 6px; font-weight: bold; color: #000;">${name} (Extra)</td><td style="text-align: center; font-weight: bold; padding: 6px; color: #000;">${chg}</td><td style="text-align: right; font-weight: bold; padding: 6px; color: #000;">${(chg * price).toFixed(2)} AED</td></tr>`;
        }
    });

    return tableRowsHtml;
}

/**
 * Génère un fichier PDF ultra-propre et sans bavures d'impression
 */
async function genererPDF(entryId = null) {
    const targetId = entryId || selectedIdForModal;
    if (!targetId) {
        alert("⚠️ Aucun élément sélectionné.");
        return;
    }

    chargerDonneesLocalStorage();
    const entry = cachedSlips.find(e => e.id == targetId);
    if (!entry) return;

    if (!entry.receipt_id) {
        entry.receipt_id = entry.is_spa ? `SPA-${entry.spa_serial}` : `REM-${entry.id.toString().slice(-8)}`;
    }

    const dateFormatted = entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-GB') : '---';
    const tableRowsHtml = buildPdfTableRows(entry);

    const pdfContainer = document.createElement('div');
    pdfContainer.style.cssText = `
        width: 190mm; 
        padding: 10mm; 
        background: #ffffff; 
        color: #000000; 
        font-family: 'Plus Jakarta Sans', Arial, sans-serif;
        box-sizing: border-box;
    `;

    pdfContainer.innerHTML = `
        <div style="text-align: center; border-bottom: 2px solid #DCA773; padding-bottom: 6px; margin-bottom: 10px;">
            <h2 style="color: #b47a3e; margin: 0; font-size: 18px; font-family: 'Playfair Display', serif;">REMAL HOTEL & VILLAS</h2>
            <p style="font-size: 9px; color: #555; text-transform: uppercase; margin: 2px 0;">Al Ruwais City, Abu Dhabi – UAE</p>
            <p style="font-size: 11px; font-weight: bold; color: #b45309; margin: 3px 0 0 0; text-transform: uppercase;">${entry.is_spa ? 'V ELEMENT SPA SHEET' : 'LAUNDRY SERVICE'}</p>
            <p style="font-size: 10px; font-family: monospace; color: #666; margin: 3px 0;">Receipt ID: <strong>${entry.receipt_id}</strong></p>
        </div>
        <div style="background: #f9f9f9; padding: 8px; border-radius: 6px; border: 1px solid #ddd; margin-bottom: 10px; font-size: 11px; line-height: 1.5;">
            <p style="margin: 0;"><strong>${entry.is_spa ? 'Sheet Serial:' : 'Room:'}</strong> ${entry.is_spa ? '#' + entry.spa_serial : entry.room}</p>
            <p style="margin: 0;"><strong>Date:</strong> ${dateFormatted}</p>
            <p style="margin: 0;"><strong>Guest:</strong> ${entry.guest_name || 'Guest'}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 11px;">
            <thead>
                <tr style="background: #f4f4f4;">
                    <th style="padding: 6px; border-bottom: 2px solid #ddd; text-align: left;">Item</th>
                    <th style="text-align: center; padding: 6px; border-bottom: 2px solid #ddd;">Qty</th>
                    <th style="text-align: right; padding: 6px; border-bottom: 2px solid #ddd;">Total</th>
                </tr>
            </thead>
            <tbody>${tableRowsHtml}</tbody>
        </table>
        <div style="background: #f9f9f9; padding: 8px; border-radius: 6px; border: 1px solid #ddd; font-size: 11px; text-align: right;">
            <p style="margin: 0 0 2px 0;"><strong>Total Pieces:</strong> ${entry.total_clothes} pieces</p>
            <p style="margin: 0; font-size: 13px; color: #b47a3e;"><strong>Grand Total:</strong> ${(entry.total || 0).toFixed(2)} AED</p>
        </div>
    `;

    if (typeof fermerModal === 'function') fermerModal();

    const opt = {
        margin:       5,
        filename:     `Remal_Receipt_${entry.receipt_id}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a5', orientation: 'portrait' }
    };

    try {
        await html2pdf().set(opt).from(pdfContainer).save();
    } catch (e) {
        console.error("Erreur PDF:", e);
        alert("⚠️ Erreur lors de la génération du PDF.");
    }
}
