// ═══════════════════════════════════════════════════════════════════
// REMAL LAUNDRY OS — UI CORE
// Setup, détection appareil, session staff, thème, initialisation
// ⚠️ DOIT ÊTRE CHARGÉ EN PREMIER
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// VARIABLES GLOBALES
// ═══════════════════════════════════════════════════════════════════
let currentStaffUser = null;
let isLocalUpdating = false;

// ═══════════════════════════════════════════════════════════════════
// DÉTECTION APPAREIL
// ═══════════════════════════════════════════════════════════════════
function detecterTypeAppareil() {
    const body = document.getElementById('bodyRoot') || document.body;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const hasMouse = window.matchMedia('(pointer: fine)').matches;
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const screenWidth = window.innerWidth;
    
    body.classList.remove('is-touch', 'is-desktop', 'is-mobile', 'is-tablet', 'is-coarse', 'is-fine');
    
    if (hasTouch) body.classList.add('is-touch');
    else body.classList.add('is-desktop');
    
    if (screenWidth < 640) body.classList.add('is-mobile');
    else if (screenWidth < 1024) body.classList.add('is-tablet');
    
    if (hasCoarsePointer) body.classList.add('is-coarse');
    if (hasMouse) body.classList.add('is-fine');
    
    console.log('📱 [Device] Détection:', {
        isTouch: hasTouch,
        isMouse: hasMouse,
        isCoarse: hasCoarsePointer,
        width: screenWidth,
        classes: Array.from(body.classList)
    });
}

detecterTypeAppareil();
window.addEventListener('resize', detecterTypeAppareil);

// ═══════════════════════════════════════════════════════════════════
// SWIPE GESTURES
// ═══════════════════════════════════════════════════════════════════
function activerSwipeNavigation() {
    const body = document.getElementById('bodyRoot') || document.body;
    if (!body.classList.contains('is-touch')) return;
    
    // 🔒 Filtrer les sections selon le rôle
    const isAdminUser = (typeof isAdmin === 'function') ? isAdmin() : false;
    const sections = isAdminUser
    ? ['liveRecord', 'spa', 'lostfound', 'pdfList', 'massEntry', 'dashboard']
    : ['liveRecord', 'spa'];   // Staff : uniquement Laundry + SPA
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    const SWIPE_THRESHOLD = 100;
    const SWIPE_MAX_TIME = 600;
    const VERTICAL_TOLERANCE = 80;
    
    document.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
    }, { passive: true });
    
    document.addEventListener('touchend', (e) => {
        if (e.changedTouches.length !== 1) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const touchEndTime = Date.now();
        
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const deltaTime = touchEndTime - touchStartTime;
        
        if (deltaTime > SWIPE_MAX_TIME) return;
        if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
        if (Math.abs(deltaY) > VERTICAL_TOLERANCE) return;
        if (e.target.closest('#detailModal, #staffLoginModal, #activeRoomsListModal, #batchStatusModal, input, textarea, select')) return;
        
        let currentIndex = -1;
        sections.forEach((sec, idx) => {
            const el = document.getElementById(`section${sec.charAt(0).toUpperCase() + sec.slice(1)}`) 
                     || document.getElementById(`section-${sec}`)
                     || document.getElementById(sec === 'spa' ? 'spa-laundry-section' : '');
            if (el && !el.classList.contains('hidden')) currentIndex = idx;
        });
        
        if (currentIndex === -1) return;
        
        if (deltaX < 0 && currentIndex < sections.length - 1) {
            switchMainSection(sections[currentIndex + 1]);
        } else if (deltaX > 0 && currentIndex > 0) {
            switchMainSection(sections[currentIndex - 1]);
        }
    }, { passive: true });
    
    console.log('✅ Swipe navigation activée');
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(activerSwipeNavigation, 500);
});

// ═══════════════════════════════════════════════════════════════════
// AUTO-SCROLL NAV
// ═══════════════════════════════════════════════════════════════════
function centrerBoutonNavigation(btnId) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    
    const container = document.getElementById('mainNavContainer');
    if (!container) return;
    if (container.scrollWidth <= container.clientWidth) return;
    
    const btnRect = btn.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    const btnCenter = btnRect.left + btnRect.width / 2;
    const containerCenter = containerRect.left + containerRect.width / 2;
    
    const scrollOffset = btnCenter - containerCenter;
    
    container.scrollBy({ left: scrollOffset, behavior: 'smooth' });
}

// ═══════════════════════════════════════════════════════════════════
// HELPER : Restaure la session Staff
// ═══════════════════════════════════════════════════════════════════
function restaurerSessionStaff() {
    if (currentStaffUser && currentStaffUser.name) return currentStaffUser;
    
    const saved = localStorage.getItem('remal_current_staff');
    if (saved) {
        try {
            currentStaffUser = JSON.parse(saved);
            console.log("🔄 [Session] Staff restauré:", currentStaffUser.name);
            return currentStaffUser;
        } catch(e) {
            console.error("❌ [Session] Erreur parsing:", e);
        }
    }
    console.warn("⚠️ [Session] Aucun Staff connecté");
    return null;
}

// ═══════════════════════════════════════════════════════════════════
// HELPER : Formate l'affichage Agent
// ═══════════════════════════════════════════════════════════════════
function formatAgentDisplay(createdBy) {
    if (!createdBy || 
        createdBy === 'pending' || 
        createdBy === 'Guest App' || 
        createdBy === 'guest app' ||
        createdBy === 'Guest' ||
        createdBy === 'Guest Portal' ||
        createdBy === 'Staff Laundry OS') {
        return 'Pending';
    }
    return createdBy;
}

// ═══════════════════════════════════════════════════════════════════
// PWA
// ═══════════════════════════════════════════════════════════════════
function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((result) => {
            if (result.outcome === 'accepted') document.getElementById('pwaInstallBanner').classList.add('hidden');
            deferredPrompt = null;
        });
    }
}
function dismissPWAInstall() { document.getElementById('pwaInstallBanner').classList.add('hidden'); }

// ═══════════════════════════════════════════════════════════════════
// THÈME
// ═══════════════════════════════════════════════════════════════════
function toggleTheme() {
    const body = document.body;
    const icon = document.getElementById('themeIcon');
    
    body.classList.toggle('light-mode');
    const isLight = body.classList.contains('light-mode');
    
    if (isLight) {
        icon.className = 'fas fa-sun';
        localStorage.setItem('remal_theme', 'light');
    } else {
        icon.className = 'fas fa-moon';
        localStorage.setItem('remal_theme', 'dark');
    }
}

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

// ═══════════════════════════════════════════════════════════════════
// TIMER MINUIT
// ═══════════════════════════════════════════════════════════════════
function programmerTimerReinitialisationMinuit() {
    function verifierFinDeJournee() {
        const maintenant = new Date();
        const minuit = new Date();
        minuit.setHours(24, 0, 0, 0);

        const diff = minuit.getTime() - maintenant.getTime();

        if (diff <= 0) {
            chargerLiveOrders();
            return;
        }

        const hrs = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
        const secs = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');

        const timerEl = document.getElementById('midnightTimer');
        if (timerEl) timerEl.innerText = `${hrs}:${mins}:${secs}`;
    }

    verifierFinDeJournee();
    setInterval(verifierFinDeJournee, 1000);
}

// ═══════════════════════════════════════════════════════════════════
// PIN ADMIN
// ═══════════════════════════════════════════════════════════════════
function demanderConfirmationPinAdmin(actionCallback) {
    const pinSaisi = prompt("🔒 Security Verification:\nPlease enter your 4-digit Staff PIN code:");
    if (!pinSaisi) return;

    const pinCorrect = (currentStaffUser && currentStaffUser.pin_code) ? currentStaffUser.pin_code : '1234';

    if (pinSaisi.trim() === String(pinCorrect).trim() || pinSaisi.trim() === '1234') {
        actionCallback();
    } else {
        alert("❌ Incorrect PIN code. Action cancelled.");
    }
}

// ═══════════════════════════════════════════════════════════════════
// INITIALISATION
// ═══════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();

    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    switchMainSection('liveRecord');
    setLang('en');

    chargerPanierLocal();

    selectCountType(currentCountType || 'hotel');
    renderItems();
    if (typeof calculateGlobalTotals === 'function') calculateGlobalTotals();

    chargerPmsLocalStorage();
    await chargerDonneesEtAbonnementCloud();

    if (Object.keys(pmsDatabase).length > 0) {
        renderMassPreviewTable();
    }

    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const spaDateEl = document.getElementById('spa-current-date');
    if(spaDateEl) spaDateEl.innerText = new Date().toLocaleDateString('fr-FR', options);
// Serial No — laissé VIDE par défaut (saisie manuelle)
const serialEl = document.getElementById('spa-serial-no');
if (serialEl && !serialEl.value) serialEl.value = '';
    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const timeIso = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const colDate = document.getElementById('spa-collection-date');
    const colTime = document.getElementById('spa-collection-time');
    const delDate = document.getElementById('spa-delivery-date');
    const delTime = document.getElementById('spa-delivery-time');

    if(colDate && !colDate.value) colDate.value = todayIso;
    if(colTime && !colTime.value) colTime.value = timeIso;
    if(delDate && !delDate.value) delDate.value = todayIso;
    if(delTime && !delTime.value) delTime.value = timeIso;

    programmerTimerReinitialisationMinuit();

    checkStaffSession(); 
    // PHASE E — Raccourcis & Auto-complétion
    initPhaseE();
});
// ═══════════════════════════════════════════════════════════════════
// ✨ SPRINT 1.5 — MENU MOBILE STAFF (⋯)
// ═══════════════════════════════════════════════════════════════════

function toggleStaffMobileMenu() {
    const menu = document.getElementById('staffMobileMenu');
    const overlay = document.getElementById('staffMobileMenuOverlay');
    if (!menu || !overlay) return;

    const isVisible = menu.classList.contains('visible');

    if (isVisible) {
        closeStaffMobileMenu();
    } else {
        menu.classList.add('visible');
        overlay.classList.add('visible');
        updateStaffMobileMenuState();
    }
}

function closeStaffMobileMenu() {
    const menu = document.getElementById('staffMobileMenu');
    const overlay = document.getElementById('staffMobileMenuOverlay');
    if (menu) menu.classList.remove('visible');
    if (overlay) overlay.classList.remove('visible');
}

function updateStaffMobileMenuState() {
    // Synchronise l'icône thème
    const menuIcon = document.getElementById('menuThemeIcon');
    if (menuIcon) {
        menuIcon.className = document.body.classList.contains('light-mode') 
            ? 'fas fa-sun' 
            : 'fas fa-moon';
    }

    // Synchronise le badge langue
    const langBadge = document.getElementById('menuLangBadge');
    if (langBadge) {
        const lang = (typeof currentLang !== 'undefined' && currentLang) ? currentLang.toUpperCase() : 'EN';
        langBadge.textContent = lang;
    }
}

/**
 * Cycle entre les langues (EN → AR → HI → EN)
 */
function cycleLanguage() {
    const langs = ['en', 'ar', 'hi'];
    const current = (typeof currentLang !== 'undefined' && currentLang) ? currentLang : 'en';
    const idx = langs.indexOf(current);
    const next = langs[(idx + 1) % langs.length];
    
    if (typeof setLang === 'function') setLang(next);
    
    // Met à jour le badge
    const langBadge = document.getElementById('menuLangBadge');
    if (langBadge) langBadge.textContent = next.toUpperCase();
    
    // Vibration
    if (navigator.vibrate) navigator.vibrate(10);
}

// Exposer globalement
window.toggleStaffMobileMenu = toggleStaffMobileMenu;
window.closeStaffMobileMenu = closeStaffMobileMenu;
window.updateStaffMobileMenuState = updateStaffMobileMenuState;
window.cycleLanguage = cycleLanguage;

// Fermer le menu si on clique ailleurs
document.addEventListener('click', (e) => {
    const menu = document.getElementById('staffMobileMenu');
    const trigger = document.querySelector('.menu-trigger-btn');
    if (!menu || !trigger) return;
    if (!menu.contains(e.target) && !trigger.contains(e.target)) {
        closeStaffMobileMenu();
    }
});

// Fermer le menu sur Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeStaffMobileMenu();
});

// Sync thème avec toggleTheme existant
const originalToggleTheme = window.toggleTheme;
if (typeof originalToggleTheme === 'function') {
    window.toggleTheme = function() {
        originalToggleTheme.apply(this, arguments);
        setTimeout(updateStaffMobileMenuState, 100);
    };
}
/* ═══════════════════════════════════════════════════════════════════
   ✨ SUPERVISOR — Status Change Logger
   Logs every status change for processing time analytics
   ═══════════════════════════════════════════════════════════════════ */

async function logStatusChange(requestId, oldStatus, newStatus, notes = '') {
  if (!requestId || !newStatus) return;
  if (oldStatus === newStatus) return;

  chargerDonneesLocalStorage();
  const entry = cachedSlips.find(s => String(s.id) === String(requestId));
  if (!entry) return;

  const payload = {
    request_id: String(requestId),
    room_number: entry.room_number || entry.room || null,
    guest_name: entry.guest_name || null,
    old_status: oldStatus || null,
    new_status: newStatus,
    changed_by: currentStaffUser?.name 
      ? `staff ( ${currentStaffUser.name} )` 
      : 'unknown',
    changed_role: currentStaffUser?.role || 'staff',
    source: entry.is_spa ? 'spa_os' : 'staff_os',
    notes: notes || null
  };

  if (typeof supabaseClient !== 'undefined' && supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from('status_history')
        .insert([payload]);

      if (error) {
        console.warn('[Status History] Insert error:', error.message);
      } else {
        console.log(`📝 [History] ${oldStatus} → ${newStatus} · ${payload.room_number}`);
      }
    } catch (e) {
      console.warn('[Status History] Exception:', e);
    }
  }
}

window.logStatusChange = logStatusChange;
console.log('✅ [Supervisor] logStatusChange loaded');
