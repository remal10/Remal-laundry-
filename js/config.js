// CONFIGURATION DE LA BASE DE DONNÉES LOCALSTORAGE & INDEXEDDB
const STORAGE_KEY = "remal_laundry_records";
const PMS_STORAGE_KEY = "remal_pms_guest_db";

// --- INITIALISATION INDEXEDDB (POUR PHOTOS ILLIMITÉES HORS-LIGNE) ---
const dbName = "RemalLaundryDB";
let db;

const requestDB = indexedDB.open(dbName, 1);

requestDB.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("bordereaux")) {
        db.createObjectStore("bordereaux", { keyPath: "id" });
    }
};

requestDB.onsuccess = (e) => {
    db = e.target.result;
    console.log("IndexedDB initialisée avec succès.");
};

requestDB.onerror = (e) => {
    console.error("Erreur d'ouverture IndexedDB", e);
};

// Sauvegarder dans IndexedDB
function saveToIndexedDB(record) {
    return new Promise((resolve, reject) => {
        if (!db) return resolve(false);
        const transaction = db.transaction(["bordereaux"], "readwrite");
        const store = transaction.objectStore("bordereaux");
        const req = store.put(record);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
    });
}

// Récupérer depuis IndexedDB
function getFromIndexedDB(id) {
    return new Promise((resolve) => {
        if (!db) return resolve(null);
        const transaction = db.transaction(["bordereaux"], "readonly");
        const store = transaction.objectStore("bordereaux");
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
    });
}

// Fonction utilitaire pour obtenir la liste locale
function getLocalRecords() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error("Erreur de lecture du LocalStorage", e);
        return [];
    }
}

// Fonction utilitaire pour sauvegarder la liste locale
function saveLocalRecords(records) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
        console.error("Erreur de sauvegarde LocalStorage", e);
    }
}
