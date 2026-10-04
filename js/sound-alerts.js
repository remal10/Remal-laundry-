// ==================== SOUND ALERTS ====================
// Notifications sonores Laundry OS
// Génère les sons via Web Audio API (aucun fichier mp3)

(function () {
    'use strict';

    let audioCtx = null;
    let soundEnabled = true;

    // Init audio context (au premier user gesture)
    function getAudioCtx() {
        if (!audioCtx) {
            try {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('[Sound] AudioContext non supporté:', e);
                return null;
            }
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    // Init au premier clic (obligatoire sur mobile)
    document.addEventListener('click', () => getAudioCtx(), { once: true });
    document.addEventListener('touchstart', () => getAudioCtx(), { once: true });

    /**
     * Joue une note (fréquence en Hz, durée en ms)
     */
    function playNote(freq, duration = 200, type = 'sine', volume = 0.3) {
        const ctx = getAudioCtx();
        if (!ctx || !soundEnabled) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration / 1000);
    }

    /**
     * 🛎️ Carillon Room Service (Guest Hub)
     * Son de cloche élégant
     */
    function playRoomServiceChime() {
        playNote(880, 150, 'sine', 0.25);
        setTimeout(() => playNote(1174, 200, 'sine', 0.20), 120);
        setTimeout(() => playNote(1568, 300, 'sine', 0.15), 260);
    }

    /**
     * 🧺 Son Laundry (Guest demande son linge)
     * Doux et rapide
     */
    function playLaundryChime() {
        playNote(659, 180, 'triangle', 0.25);
        setTimeout(() => playNote(880, 250, 'triangle', 0.20), 150);
    }

    /**
     * 📢 Gong SPA
     * Grave et profond
     */
    function playSpaGong() {
        playNote(196, 400, 'sine', 0.20);
        setTimeout(() => playNote(147, 500, 'sine', 0.15), 200);
    }

    /**
     * 🔔 Notification générique (nouvelle commande)
     * Carillon premium
     */
    function playNewOrderAlert() {
        playNote(523, 120, 'sine', 0.30);
        setTimeout(() => playNote(659, 120, 'sine', 0.28), 100);
        setTimeout(() => playNote(784, 200, 'sine', 0.25), 200);
        setTimeout(() => playNote(1046, 300, 'sine', 0.20), 320);
    }

    /**
     * ✅ Confirmation (action réussie)
     */
    function playSuccessChime() {
        playNote(1046, 100, 'sine', 0.20);
        setTimeout(() => playNote(1318, 200, 'sine', 0.18), 100);
    }

    /**
     * 🚨 Alerte urgente
     */
    function playUrgentAlert() {
        playNote(880, 150, 'square', 0.20);
        setTimeout(() => playNote(880, 150, 'square', 0.20), 200);
        setTimeout(() => playNote(880, 150, 'square', 0.20), 400);
    }

    /**
     * Joue le son + vibration selon le type
     */
    function playAlert(type = 'new_order') {
        if (!soundEnabled) return;

        switch (type) {
            case 'room_service':
                playRoomServiceChime();
                if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
                break;
            case 'laundry':
                playLaundryChime();
                if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                break;
            case 'spa':
                playSpaGong();
                if (navigator.vibrate) navigator.vibrate([150, 100, 150]);
                break;
            case 'success':
                playSuccessChime();
                if (navigator.vibrate) navigator.vibrate(30);
                break;
            case 'urgent':
                playUrgentAlert();
                if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
                break;
            case 'new_order':
            default:
                playNewOrderAlert();
                if (navigator.vibrate) navigator.vibrate([50, 30, 50, 30, 100]);
                break;
        }
    }

    /**
     * Active / désactive le son
     */
    function toggleSound() {
        soundEnabled = !soundEnabled;
        localStorage.setItem('remal_sound_enabled', soundEnabled ? '1' : '0');
        return soundEnabled;
    }

    /**
     * Récupère l'état depuis localStorage
     */
    function initSoundState() {
        const saved = localStorage.getItem('remal_sound_enabled');
        soundEnabled = saved !== '0';
    }

    initSoundState();

    // Exposition globale
    window.playAlert = playAlert;
    window.toggleSound = toggleSound;
    window.isSoundEnabled = () => soundEnabled;
    window.playSuccessChime = playSuccessChime;

    console.log('✅ [Sound Alerts] Module chargé');
})();
