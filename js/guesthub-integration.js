// ==================== GUEST HUB INTEGRATION ====================
// Session management and seamless return

let guestHubSession = null;

// Initialize Guest Hub session
function initGuestHubSession() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const room = params.get('room');
    const name = params.get('name');
    const lang = params.get('lang');
    const returnURL = params.get('return_url');
    
    if (token && room && name) {
        // Session from Guest Hub
        guestHubSession = {
            token: token,
            room: room,
            name: name,
            lang: lang || 'en',
            returnURL: returnURL || window.location.origin + '/index.html'
        };
        
        // Apply guest language
        if (lang) {
            console.log('Language received:', lang);
            localStorage.setItem('remal_lang', lang);
            
            // Apply language using existing function
            if (typeof setLang === 'function') {
                setLang(lang);
            }
        }
        
        // Save session
        localStorage.setItem('guestHub_session', JSON.stringify(guestHubSession));
        
        // Auto-fill room field
        const roomInput = document.getElementById('roomNumber');
        if (roomInput) {
            roomInput.value = room;
            if (typeof onRoomNumberInput === 'function') {
                onRoomNumberInput();
            }
        }
        
        // Show return button and banner
        showGuestHubElements(name, room);
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    } else {
        // Check existing session
        const savedSession = localStorage.getItem('guestHub_session');
        if (savedSession) {
            try {
                guestHubSession = JSON.parse(savedSession);
                showGuestHubElements(guestHubSession.name, guestHubSession.room);
            } catch (e) {
                console.error('Session error:', e);
            }
        }
    }
}

// Show Guest Hub elements
function showGuestHubElements(name, room) {
    // Create return button if not exists
    let returnBtn = document.getElementById('returnToGuestHubBtn');
    
    if (!returnBtn) {
        returnBtn = document.createElement('button');
        returnBtn.id = 'returnToGuestHubBtn';
        returnBtn.innerHTML = '🏨 Guest Hub';
        returnBtn.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 9999;
            background: #1c1917;
            color: #DCA773;
            border: 1px solid #DCA773;
            border-radius: 25px;
            padding: 10px 18px;
            font-weight: bold;
            font-size: 11px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        returnBtn.onmouseover = () => {
            returnBtn.style.transform = 'scale(1.05)';
        };
        returnBtn.onmouseout = () => {
            returnBtn.style.transform = 'scale(1)';
        };
        returnBtn.onclick = returnToGuestHub;
        document.body.appendChild(returnBtn);
    } else {
        returnBtn.style.display = 'flex';
    }
    
    // Create session banner
    let sessionBanner = document.getElementById('guestSessionBanner');
    
    if (!sessionBanner) {
        sessionBanner = document.createElement('div');
        sessionBanner.id = 'guestSessionBanner';
        sessionBanner.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 9998;
            background: #1c1917;
            border: 1px solid #DCA773;
            border-radius: 12px;
            padding: 10px 16px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            gap: 10px;
            animation: remalSlideUp 0.5s ease;
        `;
        document.body.appendChild(sessionBanner);
    }
    
    sessionBanner.innerHTML = `
        <span style="font-size: 20px;">👤</span>
        <div>
            <p style="color: #DCA773; font-size: 11px; font-weight: bold; margin: 0;">${name}</p>
            <p style="color: #a8a29e; font-size: 9px; margin: 2px 0 0;">Room ${room}</p>
        </div>
    `;
    sessionBanner.style.display = 'flex';
    
    // Hide banner after 5 seconds
    setTimeout(() => {
        if (sessionBanner) {
            sessionBanner.style.transition = 'all 0.5s ease';
            sessionBanner.style.opacity = '0';
            sessionBanner.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(() => {
                sessionBanner.style.display = 'none';
            }, 500);
        }
    }, 5000);
}

// Return to Guest Hub
function returnToGuestHub() {
    if (!guestHubSession) {
        const savedSession = localStorage.getItem('guestHub_session');
        if (savedSession) {
            try {
                guestHubSession = JSON.parse(savedSession);
            } catch (e) {
                console.error('Session error:', e);
            }
        }
    }
    
    if (!guestHubSession) {
        alert('No active Guest Hub session');
        return;
    }
    
    // Show transition
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.95);
        animation: remalFadeIn 0.3s ease;
    `;
    overlay.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 60px; animation: remalBounce 1s infinite;">🏨</div>
            <h2 style="color: #DCA773; font-size: 24px; margin-top: 20px; font-weight: bold; font-family: 'Cinzel', serif;">
                Guest Hub
            </h2>
            <p style="color: #a8a29e; font-size: 12px; margin-top: 10px;">
                Returning to your personal space...
            </p>
            <div style="margin-top: 20px;">
                <span style="display: inline-block; width: 8px; height: 8px; background: #DCA773; border-radius: 50%; animation: remalPulse 0.6s infinite; margin: 0 3px;"></span>
                <span style="display: inline-block; width: 8px; height: 8px; background: #DCA773; border-radius: 50%; animation: remalPulse 0.6s 0.2s infinite; margin: 0 3px;"></span>
                <span style="display: inline-block; width: 8px; height: 8px; background: #DCA773; border-radius: 50%; animation: remalPulse 0.6s 0.4s infinite; margin: 0 3px;"></span>
            </div>
            <p style="color: #57534e; font-size: 10px; margin-top: 20px;">
                ${guestHubSession.name} • Room ${guestHubSession.room}
            </p>
        </div>
    `;
    document.body.appendChild(overlay);
    
    // Redirect after animation
    setTimeout(() => {
        const params = new URLSearchParams({
            room: guestHubSession.room,
            name: guestHubSession.name,
            token: guestHubSession.token,
            lang: guestHubSession.lang || 'en'
        });
        
        window.location.href = `${guestHubSession.returnURL}?${params.toString()}`;
    }, 2000);
}

// Add animations
function addGuestHubAnimations() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes remalBounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-15px); }
        }
        @keyframes remalPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.3; transform: scale(1.3); }
        }
        @keyframes remalFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes remalSlideUp {
            from { opacity: 0; transform: translateX(-50%) translateY(20px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
    `;
    document.head.appendChild(style);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    addGuestHubAnimations();
    setTimeout(initGuestHubSession, 1000);
});
