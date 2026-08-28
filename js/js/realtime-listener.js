// js/realtime-listener.js - Module de réception Realtime pour Laundry OS
document.addEventListener('DOMContentLoaded', () => {
    // Vérification que le client Supabase est bien initialisé
    if (typeof supabaseClient === 'undefined') {
        console.error("⚠️ Supabase client introuvable dans Laundry OS.");
        return;
    }

    console.log("🔊 Écoute en temps réel des commandes démarrée...");

    // Écoute en direct des insertions dans la table laundry_requests
    supabaseClient
        .channel('laundry-os-realtime')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'laundry_requests' 
        }, (payload) => {
            const nouvelleCommande = payload.new;
            console.log("🛎️ Nouvelle commande reçue :", nouvelleCommande);

            // 1. Signal sonore d'alerte
            try {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audio.play();
            } catch (e) {
                console.log("Alerte sonore bloquée par le navigateur");
            }

            // 2. Notification visuelle rapide à l'écran
            alert(`🛎️ NOUVELLE COMMANDE REÇUE !\nChambre: ${nouvelleCommande.room}\nClient: ${nouvelleCommande.guest_name}\nService: ${nouvelleCommande.service_type}`);

            // 3. Si tu as une fonction d'actualisation de tableau déjà présente dans ton JS, appelle-la ici :
            // Exemple : if (typeof chargerCommandes === 'function') { chargerCommandes(); }
        })
        .subscribe();
});
