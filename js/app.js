let currentLang = 'en';
let currentService = 'laundry';
let currentCountType = 'hotel';
let cart = {};
let currentImageData = null;
let selectedIdForModal = null;

document.addEventListener('DOMContentLoaded', async () => {
    initTheme();

    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    switchMainSection('liveRecord');
    setLang('en');
    selectCountType('hotel');
    renderItems();
    
    chargerPmsLocalStorage();
    await chargerDonneesEtAbonnementCloud();
});

function initTheme() {
    const savedTheme = localStorage.getItem('remal_theme');
    const icon = document.getElementById('themeIcon');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        if (icon) icon.className = 'fas fa-sun';
    } else {
        document.body.classList.remove('light-mode');
        if (icon) icon.className = 'fas fa-moon';
    }
}

function toggleTheme() {
    const body = document.body;
    const icon = document.getElementById('themeIcon');
    body.classList.toggle('light-mode');
    const isLight = body.classList.contains('light-mode');
    
    icon.className = isLight ? 'fas fa-sun' : 'fas fa-moon';
    localStorage.setItem('remal_theme', isLight ? 'light' : 'dark');
}

function setLang(lang) {
    currentLang = lang;
    const t = i18n[lang] || i18n.en;
    document.getElementById('htmlRoot').setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.getElementById('langSelect').value = lang;

    document.getElementById('txtBtnNewRecord').innerText = t.txtBtnNewRecord;
    document.getElementById('lblFormTitle').innerText = t.lblFormTitle;
    document.getElementById('lblRoomNum').innerText = t.lblRoomNum;
    document.getElementById('lblSelectedGarments').innerText = t.lblSelectedGarments;
    document.getElementById('lblSubTotal').innerText = t.lblSubTotal;
    document.getElementById('lblVat').innerText = t.lblVat;
    document.getElementById('lblGrandTotal').innerText = t.lblGrandTotal;
    document.getElementById('btnPhotoProof').innerHTML = `<span>📷</span> ${t.btnPhotoProof}`;
    document.getElementById('btnSaveRecord').innerText = t.btnSaveRecord;
    document.getElementById('lblArchiveTitle').innerText = t.lblArchiveTitle;
    document.getElementById('lblRoomError').innerText = t.lblRoomError;
    document.getElementById('lblActiveRoomsHeader').innerText = t.lblActiveRoomsHeader;

    renderItems();
}

function switchMainSection(section) {
    ['newRecord', 'massEntry', 'liveRecord', 'spa', 'lostfound', 'pdfList', 'dashboard'].forEach(sec => {
        const el = document.getElementById(`section${sec.charAt(0).toUpperCase() + sec.slice(1)}`) || document.getElementById(`${sec}-laundry-section`);
        if (el) el.classList.add('hidden');
    });

    const targetSection = section === 'spa' ? document.getElementById('spa-laundry-section') : document.getElementById(`section${section.charAt(0).toUpperCase() + section.slice(1)}`);
    if (targetSection) targetSection.classList.remove('hidden');

    const quickActionButtons = document.getElementById('quickActionButtons');
    if (section === 'liveRecord') {
        quickActionButtons?.classList.remove('hidden');
        if (typeof chargerLiveOrders === 'function') chargerLiveOrders();
    } else {
        quickActionButtons?.classList.add('hidden');
    }
}

function fermerModal() { 
    document.getElementById('detailModal').classList.add('hidden'); 
    selectedIdForModal = null; 
}
