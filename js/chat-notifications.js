// ═══════════════════════════════════════════════════════════════════
// REMAL LAUNDRY OS — CHAT NOTIFICATIONS
// Badge title + sound alert when new guest message arrives (admin only)
// ═══════════════════════════════════════════════════════════════════

window.ChatNotifications = (function () {
    let lastUnreadTotal = 0;
    let titleFlashInterval = null;
    let originalTitle = document.title;

    // ───────────────────────────────────────────────────────────────
    // CALLED BY ChatAdmin whenever conversations refresh
    // ───────────────────────────────────────────────────────────────
    function updateFromConversations(conversations, totalUnread) {
        if (totalUnread > lastUnreadTotal) {
            onNewMessage(totalUnread);
        } else {
            onUnreadCleared(totalUnread);
        }
        lastUnreadTotal = totalUnread;
    }

    // ───────────────────────────────────────────────────────────────
    // NEW MESSAGE RECEIVED
    // ───────────────────────────────────────────────────────────────
    function onNewMessage(count) {
        // 1. Play sound
        playNotificationSound();

        // 2. Flash page title
        startTitleFlash(count);

        // 3. Show browser notification (if allowed)
        showBrowserNotification(count);

        // 4. Vibrate on mobile
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
    }

    function onUnreadCleared(count) {
        if (count === 0) stopTitleFlash();
    }

    // ───────────────────────────────────────────────────────────────
    // SOUND
    // ───────────────────────────────────────────────────────────────
    function playNotificationSound() {
        // Try to use existing sound-alerts.js if available
        if (window.playNotificationSound && typeof window.playNotificationSound === 'function') {
            try { window.playNotificationSound(); return; } catch (e) {}
        }

        // Fallback: Web Audio API beep
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.0001, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.45);
        } catch (e) {
            console.warn('[ChatNotifications] Sound error:', e);
        }
    }

    // ───────────────────────────────────────────────────────────────
    // TITLE FLASH
    // ───────────────────────────────────────────────────────────────
    function startTitleFlash(count) {
        stopTitleFlash();
        let visible = true;
        const flashText = `💬 (${count}) New message`;

        titleFlashInterval = setInterval(() => {
            document.title = visible ? flashText : originalTitle;
            visible = !visible;
        }, 1200);
    }

    function stopTitleFlash() {
        if (titleFlashInterval) {
            clearInterval(titleFlashInterval);
            titleFlashInterval = null;
        }
        document.title = originalTitle;
    }

    // ───────────────────────────────────────────────────────────────
    // BROWSER NOTIFICATION (optional, needs permission)
    // ───────────────────────────────────────────────────────────────
    function showBrowserNotification(count) {
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;

        try {
            new Notification('New guest message', {
                body: `${count} unread message${count > 1 ? 's' : ''} in Chat`,
                icon: 'assets/icon-staff-192.png',
                tag: 'remal-chat',
                requireInteraction: false
            });
        } catch (e) {
            console.warn('[ChatNotifications] Browser notif error:', e);
        }
    }

    // ───────────────────────────────────────────────────────────────
    // REQUEST PERMISSION (call once on user interaction)
    // ───────────────────────────────────────────────────────────────
    function requestPermission() {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {});
        }
    }

    // ───────────────────────────────────────────────────────────────
    // CLEANUP ON PAGE HIDE
    // ───────────────────────────────────────────────────────────────
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            stopTitleFlash();
        }
    });

    // ───────────────────────────────────────────────────────────────
    // PUBLIC API
    // ───────────────────────────────────────────────────────────────
    return {
        updateFromConversations,
        requestPermission,
        _stopTitleFlash: stopTitleFlash
    };
})();

console.log('✅ [ChatNotifications] Loaded');
