// ==================== SECURITY GUARD - REPO 3 (LAUNDRY OS) ====================
// Protection adaptée pour l'équipe laundry

(function() {
    'use strict';
    
    const CONFIG = {
        enabled: true,
        logging: true,
        maskSensitiveData: true,
        appType: 'laundry_os',
        staffOnly: true // C'est une application staff uniquement
    };
    
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // ==================== JOURNALISATION ====================
    function logActivity(action, details = {}) {
        if (!CONFIG.logging) return;
        
        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                repo: CONFIG.appType,
                page: currentPage,
                action: action,
                details: details,
                staffId: localStorage.getItem('staffId') || 'unknown',
                staffRole: localStorage.getItem('staffRole') || 'unknown'
            };
            
            console.log('🔒 LaundryOS Security:', logEntry);
            
            const logs = JSON.parse(localStorage.getItem('security_logs_laundryos') || '[]');
            logs.push(logEntry);
            
            if (logs.length > 300) {
                logs.splice(0, logs.length - 300);
            }
            
            localStorage.setItem('security_logs_laundryos', JSON.stringify(logs));
        } catch (e) {}
    }
    
    // ==================== PROTECTION STAFF ====================
    function protectStaffAccess() {
        if (!CONFIG.staffOnly) return;
        
        const staffRole = localStorage.getItem('staffRole');
        const staffId = localStorage.getItem('staffId');
        
        logActivity('laundry_os_accessed', { 
            authenticated: !!(staffRole && staffId),
            role: staffRole || 'none'
        });
        
        // Vérification douce - ne bloque pas, avertit seulement
        if (!staffRole || !staffId) {
            console.warn('⚠️ Laundry OS accessible sans authentification staff');
            showStaffWarning();
        }
    }
    
    // ==================== PROTECTION DES ACTIONS ====================
    function protectStaffActions() {
        document.addEventListener('click', function(e) {
            const target = e.target.closest('[data-laundry-action]');
            
            if (target) {
                const action = target.getAttribute('data-laundry-action');
                const orderId = target.getAttribute('data-order-id');
                
                logActivity('laundry_action', {
                    action: action,
                    orderId: orderId,
                    element: target.textContent.trim()
                });
                
                // Journaliser les changements de statut
                if (action === 'update-status') {
                    const newStatus = target.getAttribute('data-new-status');
                    logActivity('status_update', {
                        orderId: orderId,
                        newStatus: newStatus
                    });
                }
            }
        });
    }
    
    // ==================== MASQUAGE DES DONNÉES CLIENTS ====================
    function maskClientInfo() {
        if (!CONFIG.maskSensitiveData) return;
        
        // Masquer les noms complets des clients
        document.querySelectorAll('[data-mask="client-name"]').forEach(el => {
            const name = el.textContent;
            if (name && name.length > 3) {
                const parts = name.split(' ');
                if (parts.length > 1) {
                    el.textContent = parts[0] + ' ' + parts[1].charAt(0) + '.';
                }
            }
        });
        
        // Masquer les numéros de chambre partiellement
        document.querySelectorAll('[data-mask="room-partial"]').forEach(el => {
            const room = el.textContent;
            if (room && room.length > 2) {
                el.textContent = room.slice(0, 1) + '**';
            }
        });
    }
    
    // ==================== AVERTISSEMENT STAFF ====================
    function showStaffWarning() {
        const warning = document.createElement('div');
        warning.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0,0,0,0.9);
            color: #ef4444;
            padding: 12px 16px;
            border-radius: 12px;
            font-size: 11px;
            z-index: 99999;
            border: 1px solid #ef4444;
            font-weight: bold;
        `;
        warning.textContent = '⚠️ Mode non authentifié - Actions journalisées';
        document.body.appendChild(warning);
        
        setTimeout(() => warning.remove(), 5000);
    }
    
    // ==================== INITIALISATION ====================
    function init() {
        if (!CONFIG.enabled) return;
        
        logActivity('laundry_os_loaded');
        
        document.addEventListener('DOMContentLoaded', function() {
            protectStaffAccess();
            protectStaffActions();
            maskClientInfo();
            logActivity('dom_ready');
        });
        
        const observer = new MutationObserver(function() {
            maskClientInfo();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    init();
    
    window.securityGuard = {
        log: logActivity,
        mask: maskClientInfo
    };
    
})();
