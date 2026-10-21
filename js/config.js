// ==========================================
// CONFIGURATION SUPABASE (Retour au projet stable)
// ==========================================

const SUPABASE_URL = 'https://kmtnkjhjbmsietrlebhs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdG5ramhqYm1zaWV0cmxlYmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMjQ1MTMsImV4cCI6MjEwMTkwMDUxM30.fOMotE-gsxKkTtrgzbrk5qsC22qWdQmF__k89Xt-ErA';

let supabaseClient = null;
try {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("✅ Client Supabase connecté au projet stable.");
    }
} catch(err) { console.warn("Supabase init error:", err); }

// Variables globales
let currentStaffUser = null;
let currentLang = 'en';
let cachedSlips = [];
let pmsDatabase = {}; 
let currentArchiveFilter = 'all';
let currentDateFilter = null;
let currentStatusFilter = 'all';
let currentDashboardPeriod = 'today';
let currentLFPhotoData = null;
let currentSpaRecordId = null;
let deferredPrompt = null;

// Fonction utilitaire pour le Receipt ID
function obtenirReceiptId(order) {
    if (!order) return '---';
    if (order.receipt_id) return order.receipt_id;
    const rawId = String(order.id || '');
    if (!rawId) return '---';
    const cleanId = rawId.replace(/-/g, '').toUpperCase();
    return `REC-${cleanId.slice(-6)}`;
}
