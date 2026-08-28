// js/realtime-listener.js - Module d'écoute en temps réel pour Laundry OS
document.addEventListener('DOMContentLoaded', () => {
    // 1. Vérification de la présence du client Supabase
    const client = window.supabaseClient || window.supabase;
    
    if (!client) {
        console.error("⚠️ [Realtime] Impossible de trouver l'instance Supabase.");
        return;
    }

    console.log("🔊 [Realtime] Module de réception activé pour Laundry OS");

    // 2. Abonnement en temps réel sur la table laundry_requests
    client
        .channel('laundry-os-sync')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'laundry_requests' 
        }, (payload) => {
            const nouvelleCommande = payload.new;
            console.log("🛎️ [Realtime] Nouvelle commande reçue :", nouvelleCommande);

            // A. Signal sonore d'alerte
            try {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audio.play().catch(e => console.log("Alerte audio bloquée par le navigateur :", e));
            } catch (err) {
                console.error("Erreur lecture audio :", err);
            }

            // B. Notification visuelle
            alert(`🛎️ NOUVELLE DEMANDE REÇUE !\n\nChambre : ${nouvelleCommande.room}\nClient : ${nouvelleCommande.guest_name || 'Non spécifié'}\nService : ${nouvelleCommande.service_type}`);

            // C. Rafraîchissement automatique de la liste si une fonction existe
            if (typeof window.chargerCommandes === 'function') {
                window.chargerCommandes();
            } else if (typeof window.fetchOrders === 'function') {
                window.fetchOrders();
            } else if (typeof window.init === 'function') {
                window.init();
            }
        })
        .subscribe((status) => {
            console.log("📡 [Realtime] Statut de connexion :", status);
        });
});
