// GESTION DE L'INTERFACE UTILISATEUR, SIGNATURE, QR CODE ET INTERACTIONS

let selectedIdForModal = null;
let signaturePad = null;

function switchMainSection(sectionId) {
    const sections = ['sectionLiveRecord', 'sectionNewRecord', 'sectionMassEntry', 'sectionPdfList', 'sectionDashboard', 'sectionLostfound', 'spa-laundry-section'];
    sections.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.classList.add('hidden');
    });

    const target = document.getElementById(sectionId) || document.getElementById(`section${sectionId.charAt(0).toUpperCase() + sectionId.slice(1)}`);
    if (target) target.classList.remove('hidden');

    if (sectionId === 'liveRecord') afficherChambresActives();
    if (sectionId === 'pdfList') afficherListeBordereauxLocal();
}

function afficherChambresActives() {
    const records = getLocalRecords();
    const container = document.getElementById('liveOrdersList');
    if (!container) return;

    if (records.length === 0) {
        container.innerHTML = `<p class="text-xs text-stone-500 text-center py-6 col-span-full">No active laundry orders found.</p>`;
        return;
    }

    let html = "";
    records.forEach(r => {
        html += `
            <div onclick="ouvrirModalDetail('${r.id}')" class="remal-card p-5 rounded-2xl cursor-pointer hover:border-[#DCA773] transition space-y-3">
                <div class="flex justify-between items-center border-b border-[#2f2820] pb-2">
                    <span class="text-lg font-serif-luxury font-bold text-[#DCA773]">Room ${r.roomNumber || r.id}</span>
                    <span class="text-[10px] bg-amber-950 text-amber-200 border border-amber-800 font-bold px-2.5 py-1 rounded-full">${r.countType || 'Hotel'}</span>
                </div>
                <div class="flex justify-between text-xs text-stone-400 font-medium">
                    <span>Pieces: <strong class="text-stone-200">${r.totalPieces || 0} pcs</strong></span>
                    <span>Total: <strong class="text-[#DCA773]">${(r.grandTotal || 0).toFixed(2)} AED</strong></span>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function ouvrirModalDetail(id) {
    selectedIdForModal = id;
    const modal = document.getElementById('detailModal');
    if (!modal) return;

    const records = getLocalRecords();
    const record = records.find(r => r.id === id) || { id: id, roomNumber: id, totalPieces: 0, grandTotal: 0 };

    document.getElementById('modalReceiptIdDisplay').innerText = record.id;
    document.getElementById('modalRoomNumDisplay').innerText = record.roomNumber || '---';
    document.getElementById('modalClothesCount').innerText = `${record.totalPieces || 0} pieces`;
    document.getElementById('modalTotal').innerText = `${(record.grandTotal || 0).toFixed(2)} AED`;

    modal.classList.remove('hidden');

    // Génération du QR Code et initialisation de la signature
    setTimeout(() => {
        initSignaturePad();
        generateQRCodeForRecord(record.id);
    }, 150);
}

function fermerModal() {
    const modal = document.getElementById('detailModal');
    if (modal) modal.classList.add('hidden');
}

// --- LOGIQUE SIGNATURE ELECTRONIQUE ---
function initSignaturePad() {
    const canvas = document.getElementById('signatureCanvas');
    if (canvas) {
        signaturePad = new SignaturePad(canvas, {
            backgroundColor: 'rgba(255, 255, 255, 0)',
            penColor: 'rgb(18, 16, 14)'
        });
    }
}

function clearSignature() {
    if (signaturePad) {
        signaturePad.clear();
        const img = document.getElementById('signatureImageDisplay');
        if (img) img.classList.add('hidden');
    }
}

function saveSignature() {
    if (signaturePad && !signaturePad.isEmpty()) {
        const dataURL = signaturePad.toDataURL();
        const img = document.getElementById('signatureImageDisplay');
        if (img) {
            img.src = dataURL;
            img.classList.remove('hidden');
        }
    }
}

// --- LOGIQUE GENERATION QR CODE ---
function generateQRCodeForRecord(recordId) {
    const container = document.getElementById('qrcode');
    if (!container) return;
    container.innerHTML = "";
    new QRCode(container, {
        text: recordId,
        width: 75,
        height: 75,
        colorDark: "#12100e",
        colorLight: "#ffffff"
    });
}

function afficherListeBordereauxLocal() {
    const records = getLocalRecords();
    const container = document.getElementById('laundryList');
    if (!container) return;

    if (records.length === 0) {
        container.innerHTML = `<p class="text-xs text-stone-500 text-center py-4">Aucun enregistrement dans les archives.</p>`;
        return;
    }

    let html = "";
    records.forEach(r => {
        html += `
            <div class="p-3 bg-[#0f0e0c] border border-[#2f2820] rounded-xl flex justify-between items-center text-xs">
                <div>
                    <p class="font-bold text-stone-200">Reçu #${r.id} - Room ${r.roomNumber || 'N/A'}</p>
                    <p class="text-[10px] text-stone-500">${r.date || 'Aujourd\'hui'}</p>
                </div>
                <button onclick="ouvrirModalDetail('${r.id}')" class="px-3 py-1 bg-[#DCA773] text-stone-950 font-bold rounded-lg">Voir</button>
            </div>
        `;
    });
    container.innerHTML = html;
}

window.addEventListener('DOMContentLoaded', () => {
    renderGarmentItemsList();
    afficherChambresActives();
});
