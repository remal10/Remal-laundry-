/* REMAL LAUNDRY CLOUD - LOGIQUE PRINCIPALE */

const USER_PINS = { 'Front Desk': '1234', 'Laundry Plant': '5678' };
let currentActiveUser = sessionStorage.getItem('remal_auth_user') || null;
let cachedSlips = [];
let pmsDatabase = {}; 
let cart = {};
let currentImageData = null;
let selectedIdForModal = null;
let currentService = 'laundry';
let currentCountType = 'hotel';

/* --- INITIALISATION --- */
document.addEventListener('DOMContentLoaded', async () => {
    if (!currentActiveUser) {
        document.getElementById('pinLoginModal').classList.remove('hidden');
    } else {
        document.getElementById('pinLoginModal').classList.add('hidden');
        document.getElementById('activeUserLabel').innerText = currentActiveUser;
        applyRolePermissions();
    }
    
    setLang('en');
    selectCountType('hotel');
    renderItems();
    await chargerDonneesEtAbonnementCloud();
    initSignaturePads();
});

/* --- GESTION DES RÔLES & AUTH --- */
function submitPinLogin() {
    const selectedRole = document.getElementById('userRoleSelect').value;
    currentActiveUser = selectedRole;
    sessionStorage.setItem('remal_auth_user', currentActiveUser);
    document.getElementById('pinLoginModal').style.display = 'none';
    document.getElementById('activeUserLabel').innerText = currentActiveUser;
    applyRolePermissions();
}

function logoutUser() {
    sessionStorage.removeItem('remal_auth_user');
    window.location.reload();
}

function applyRolePermissions() {
    const isFrontDesk = (currentActiveUser === 'Front Desk');
    document.getElementById('navBtnSpa').style.display = isFrontDesk ? 'none' : 'block';
    document.getElementById('navBtnPdfList').style.display = isFrontDesk ? 'none' : 'block';
    document.getElementById('navBtnDashboard').style.display = isFrontDesk ? 'none' : 'block';
    switchMainSection('liveRecord');
}

/* --- LOGIQUE D'AFFICHAGE ET ACTIONS --- */
function switchMainSection(section) {
    ['newRecord', 'massEntry', 'liveRecord', 'spa', 'pdfList', 'dashboard'].forEach(sec => {
        const el = document.getElementById(`section${sec.charAt(0).toUpperCase() + sec.slice(1)}`) || document.getElementById(`${sec}-laundry-section`);
        if(el) el.classList.add('hidden');
    });
    
    const targetSection = section === 'spa' ? document.getElementById('spa-laundry-section') : document.getElementById(`section${section.charAt(0).toUpperCase() + section.slice(1)}`);
    if(targetSection) targetSection.classList.remove('hidden');
    
    if (section === 'pdfList') afficherListeBordereauxLocal();
    if (section === 'liveRecord') chargerLiveOrders();
}

/* --- LE CORRECTIF MODAL (Items Display) --- */
function ouvrirModalDetails(id) {
    selectedIdForModal = id;
    const entry = cachedSlips.find(e => e.id == id);
    if (!entry) return;

    // Mise à jour des infos texte du modal...
    // (Ajoute ici le remplissage des champs de texte comme dans ton code original)

    const tbody = document.getElementById('modalTableBody'); 
    tbody.innerHTML = '';
    
    const itemsObj = entry.items || {};
    Object.keys(itemsObj).forEach(k => {
        const item = itemsObj[k];
        if (!item || !item.name) return;

        let qty = item.qty || 0;
        let freeQty = item.freeQty || 0;
        let chargeableQty = entry.count_type === 'quota_extra' ? (qty - freeQty) : (entry.count_type === 'hotel' ? 0 : qty);
        if(chargeableQty < 0) chargeableQty = 0;

        if (freeQty > 0) {
            const trFree = document.createElement('tr');
            trFree.className = "py-1 border-b border-stone-200 text-emerald-700";
            trFree.innerHTML = `<td class="font-bold py-1.5 p-2">${item.name} (Free Quota)</td><td class="text-center font-bold p-1.5">${freeQty}</td><td class="text-right font-bold p-1.5">0.00</td>`;
            tbody.appendChild(trFree);
        }
        
        const effectiveQty = (entry.count_type === 'hotel') ? qty : chargeableQty;
        if (effectiveQty > 0 || entry.count_type === 'guest' || entry.is_spa) {
            const displayQty = (entry.count_type === 'quota_extra') ? chargeableQty : qty;
            const trChg = document.createElement('tr');
            trChg.className = "py-1 border-b border-stone-200 text-stone-900";
            trChg.innerHTML = `<td class="font-bold py-1.5 p-2">${item.name}</td><td class="text-center font-bold p-1.5">${displayQty}</td><td class="text-right font-bold p-1.5">${(displayQty * (item.price || 0)).toFixed(2)}</td>`;
            tbody.appendChild(trChg);
        }
    });
    
    document.getElementById('detailModal').classList.remove('hidden');
}

/* --- AJOUTE ICI LE RESTE DE TES FONCTIONS --- */
// (Copie ici toutes les autres fonctions de ton ancien script : 
// sauvegarderBordereauLocal, chargerDonneesEtAbonnementCloud, etc.)

// Fin du fichier app.js
