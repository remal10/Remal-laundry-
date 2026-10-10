// ═══════════════════════════════════════════════════════════════════
// REMAL LAUNDRY OS — CHAT NOTIFICATIONS
// Badge title + sound alert when new guest message arrives (admin only)
// ═══════════════════════════════════════════════════════════════════

window.ChatNotifications = (function () {
    let lastUnreadTotal = 0;
    let titleFlashInterval = null;
    const originalTitle = document.title;

    function updateFromConversations(conversations, totalUnread) {
        if (totalUnread > lastUnreadTotal) {
            onNewMessage(totalUnread);
        } else {
            onUnreadCleared(totalUnread);
        }
        lastUnreadTotal = totalUnread;
    }

    function onNewMessage(count) {
        playNotificationSound();
        startTitleFlash(count);
        showBrowserNotification(count);
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }
    }

    function onUnreadCleared(count) {
        if (count === 0) stopTitleFlash();
    }

    function playNotificationSound() {
        if (window.playNotificationSound && typeof window.playNotificationSound === 'function') {
            try { window.playNotificationSound(); return; } catch (e) {}
        }

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

    function showBrowserNotification(count) {
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;

        try {
            new Notification('New guest message', {
                body: `${count} unread message${count > 1 ? 's' : ''} in Chat`,
                icon: 'assets/icon-staff-192.png',
                tag: 'remal-chat'
            });
        } catch (e) {
            console.warn('[ChatNotifications] Browser notif error:', e);
        }
    }

    function requestPermission() {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {});
        }
    }

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) stopTitleFlash();
    });

    return {
        updateFromConversations,
        requestPermission,
        _stopTitleFlash: stopTitleFlash
    };
})();

console.log('✅ [ChatNotifications] Loaded');
