// ═══════════════════════════════════════════════════════════════════
// REMAL LAUNDRY OS — UI SHORTCUTS
// Phase E.1 (raccourcis clavier) + Phase E.2 (auto-complétion chambre)
// ⚠️ Chargé EN DERNIER
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// PHASE E.1 — RACCOURCIS CLAVIER (Desktop)
// ═══════════════════════════════════════════════════════════════════
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        const target = e.target;
        const isTyping = target.tagName === 'INPUT' 
                      || target.tagName === 'TEXTAREA' 
                      || target.isContentEditable;
        
        const modalOpen = !document.getElementById('detailModal')?.classList.contains('hidden')
                       || !document.getElementById('staffLoginModal')?.classList.contains('hidden')
                       || (document.getElementById('batchStatusModal')?.classList.contains('hidden') === false)
                       || !document.getElementById('activeRoomsListModal')?.classList.contains('hidden');

        // Ctrl+S → Save Record (partout, même en tapant)
        if (e.ctrlKey && e.key.toLowerCase() === 's') {
            e.preventDefault();
            const saveBtn = document.getElementById('btnSaveRecord');
            const formOpen = !document.getElementById('sectionNewRecord')?.classList.contains('hidden');
            if (formOpen && saveBtn && !saveBtn.disabled) {
                saveBtn.click();
            }
            return;
        }

        // Ctrl+F → Focus recherche Archives
        if (e.ctrlKey && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            const archivesOpen = !document.getElementById('sectionPdfList')?.classList.contains('hidden');
            if (archivesOpen) {
                const searchInput = document.getElementById('searchRoom');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }
            return;
        }

        // Échap → Fermer ce qui est ouvert
        if (e.key === 'Escape') {
            if (modalOpen) {
                // Fermer la modale la plus haute
                if (!document.getElementById('batchStatusModal')?.classList.contains('hidden')) {
                    fermerModalBatchStatus();
                } else if (!document.getElementById('activeRoomsListModal')?.classList.contains('hidden')) {
                    fermerModalActiveRoomsList();
                } else if (!document.getElementById('detailModal')?.classList.contains('hidden')) {
                    fermerModal();
                }
                return;
            }
            // Fermer formulaire si ouvert
            const formOpen = !document.getElementById('sectionNewRecord')?.classList.contains('hidden');
            if (formOpen) {
                switchMainSection('liveRecord');
                return;
            }
        }

        // Si l'utilisateur est en train de taper → on s'arrête là
        if (isTyping) return;
        if (modalOpen) return;

        // N → New Record
        if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            switchMainSection('newRecord');
            setTimeout(() => {
                document.getElementById('roomNumber')?.focus();
            }, 150);
            return;
        }

        // 1 / 2 / 3 → Bascule service (uniquement si form New Record ouvert)
        const formOpen = !document.getElementById('sectionNewRecord')?.classList.contains('hidden');
        if (formOpen) {
            if (e.key === '1') { e.preventDefault(); switchService('laundry'); return; }
            if (e.key === '2') { e.preventDefault(); switchService('dry'); return; }
            if (e.key === '3') { e.preventDefault(); switchService('pressing'); return; }
        }
    });

    console.log('⌨️ [Shortcuts] Raccourcis clavier activés (N, Échap, Ctrl+S, Ctrl+F, 1/2/3)');
}

// ═══════════════════════════════════════════════════════════════════
// PHASE E.2 — AUTO-COMPLÉTION CHAMBRE (PMS in-house uniquement)
// ═══════════════════════════════════════════════════════════════════
let autocompleteSelectedIndex = -1;
let autocompleteSuggestions = [];

function getRoomSuggestions(query) {
    if (!query || query.length < 1) return [];
    if (typeof pmsDatabase === 'undefined' || !pmsDatabase) return [];

    const q = String(query).trim();
    const results = [];

    Object.keys(pmsDatabase).forEach(room => {
        if (String(room).startsWith(q)) {
            const info = pmsDatabase[room];
            results.push({
                room: String(room),
                guestName: info.guestName || 'Guest',
                agency: info.agency || 'Direct',
                quotaText: info.quotaText || 'Chargeable',
                isChargeable: info.isChargeable !== false
            });
        }
    });

    // Tri numérique
    results.sort((a, b) => parseInt(a.room) - parseInt(b.room));
    return results.slice(0, 8); // max 8 suggestions
}

function renderRoomAutocomplete(suggestions) {
    const container = document.getElementById('roomAutocompleteDropdown');
    if (!container) return;

    if (!suggestions || suggestions.length === 0) {
        container.classList.add('hidden');
        container.innerHTML = '';
        autocompleteSelectedIndex = -1;
        autocompleteSuggestions = [];
        return;
    }

    autocompleteSuggestions = suggestions;
    autocompleteSelectedIndex = -1;

    container.innerHTML = suggestions.map((s, idx) => `
        <div data-room="${s.room}" data-idx="${idx}" 
             class="room-autocomplete-item px-4 py-3 cursor-pointer border-b border-[#2f2820] last:border-b-0 hover:bg-[#211e1a] transition flex justify-between items-center gap-3">
            <div class="flex items-center gap-3 min-w-0">
                <span class="text-[#DCA773] font-black text-base min-w-[44px]">${s.room}</span>
                <div class="min-w-0">
                    <p class="text-xs font-bold text-stone-100 truncate">${s.guestName}</p>
                    <p class="text-[10px] text-stone-400 truncate">${s.agency}</p>
                </div>
            </div>
            <span class="text-[9px] font-bold px-2 py-1 rounded-md flex-shrink-0 ${s.isChargeable ? 'bg-rose-950/60 text-rose-300 border border-rose-800' : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'}">
                ${s.isChargeable ? 'Chargeable' : s.quotaText.replace(' PIECES LAU DAILY', ' PCS')}
            </span>
        </div>
    `).join('');

    container.classList.remove('hidden');

    // Attacher les clics
    container.querySelectorAll('.room-autocomplete-item').forEach(el => {
        el.addEventListener('click', () => {
            const room = el.dataset.room;
            selectRoomSuggestion(room);
        });
    });
}

function selectRoomSuggestion(room) {
    const input = document.getElementById('roomNumber');
    if (!input) return;
    input.value = room;
    hideRoomAutocomplete();
    onRoomNumberInput();
    // Focus sur la zone articles
    setTimeout(() => {
        document.getElementById('itemsContainer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

function hideRoomAutocomplete() {
    const container = document.getElementById('roomAutocompleteDropdown');
    if (container) {
        container.classList.add('hidden');
        container.innerHTML = '';
    }
    autocompleteSelectedIndex = -1;
    autocompleteSuggestions = [];
}

function highlightAutocompleteItem() {
    const container = document.getElementById('roomAutocompleteDropdown');
    if (!container) return;
    const items = container.querySelectorAll('.room-autocomplete-item');
    items.forEach((el, idx) => {
        if (idx === autocompleteSelectedIndex) {
            el.classList.add('bg-[#211e1a]', 'border-l-4', 'border-l-[#DCA773]');
            el.scrollIntoView({ block: 'nearest' });
        } else {
            el.classList.remove('bg-[#211e1a]', 'border-l-4', 'border-l-[#DCA773]');
        }
    });
}

function initRoomAutocomplete() {
    const input = document.getElementById('roomNumber');
    if (!input) return;

    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('spellcheck', 'false');

    // Input → suggestions
    input.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val.length === 0) {
            hideRoomAutocomplete();
            return;
        }
        const suggestions = getRoomSuggestions(val);
        renderRoomAutocomplete(suggestions);
    });

    // Focus → si valeur existante, proposer
    input.addEventListener('focus', () => {
        const val = input.value.trim();
        if (val.length > 0) {
            const suggestions = getRoomSuggestions(val);
            renderRoomAutocomplete(suggestions);
        }
    });

    // Navigation clavier dans les suggestions
    input.addEventListener('keydown', (e) => {
        const container = document.getElementById('roomAutocompleteDropdown');
        const isOpen = container && !container.classList.contains('hidden');

        if (e.key === 'ArrowDown') {
            if (!isOpen || autocompleteSuggestions.length === 0) return;
            e.preventDefault();
            autocompleteSelectedIndex = Math.min(autocompleteSelectedIndex + 1, autocompleteSuggestions.length - 1);
            highlightAutocompleteItem();
        } 
        else if (e.key === 'ArrowUp') {
            if (!isOpen || autocompleteSuggestions.length === 0) return;
            e.preventDefault();
            autocompleteSelectedIndex = Math.max(autocompleteSelectedIndex - 1, 0);
            highlightAutocompleteItem();
        } 
        else if (e.key === 'Enter') {
            if (isOpen && autocompleteSelectedIndex >= 0 && autocompleteSuggestions[autocompleteSelectedIndex]) {
                e.preventDefault();
                selectRoomSuggestion(autocompleteSuggestions[autocompleteSelectedIndex].room);
            } else if (isOpen && autocompleteSuggestions.length === 1) {
                e.preventDefault();
                selectRoomSuggestion(autocompleteSuggestions[0].room);
            }
        } 
        else if (e.key === 'Escape') {
            if (isOpen) {
                e.preventDefault();
                hideRoomAutocomplete();
            }
        }
    });

    // Fermer si clic ailleurs
    document.addEventListener('click', (e) => {
        if (e.target === input) return;
        if (e.target.closest('#roomAutocompleteDropdown')) return;
        hideRoomAutocomplete();
    });

    console.log('🔍 [Autocomplete] Auto-complétion chambre activée (source: PMS in-house)');
}

// ═══════════════════════════════════════════════════════════════════
// INIT PHASE E (appelé au DOMContentLoaded)
// ═══════════════════════════════════════════════════════════════════
function initPhaseE() {
    initKeyboardShortcuts();
    initRoomAutocomplete();
}
