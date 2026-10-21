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
// ═══════════════════════════════════════════════════════════════════
// CATALOGUE DES VÊTEMENTS (Pour renderItems)
// ═══════════════════════════════════════════════════════════════════
const database = {
    laundry: {
        "GENTLEMEN": [
            { name: "Shirt", ar: "قميص", price: 22 }, { name: "T-Shirt", ar: "فانيلة", price: 15 }, { name: "Trousers", ar: "بنطلون", price: 24 },
            { name: "Under Shirt", ar: "قميص داخلي", price: 10 }, { name: "Under Pants", ar: "سروال داخلي", price: 12 }, { name: "Pajama Slack", ar: "بيجامة سلاك", price: 11 },
            { name: "Pajamas (2 Pcs)", ar: "بيجامة قطعتين", price: 22 }, { name: "Socks", ar: "جوارب", price: 6 }, { name: "Jacket", ar: "جاكيت", price: 34 },
            { name: "Dishdash", ar: "دشداشة", price: 30 }, { name: "Gutra", ar: "غترة", price: 10 }, { name: "Khafia", ar: "كوفية", price: 10 },
            { name: "Lungi", ar: "وزار", price: 15 }, { name: "Shorts", ar: "سروال قصير", price: 18 }, { name: "Track Suit", ar: "بدلة رياضة", price: 30 },
            { name: "Overall", ar: "افرول", price: 36 }, { name: "Gloves", ar: "قفازات", price: 6 }, { name: "Knee Pad", ar: "واقي الركبة", price: 6 }, { name: "Bandages", ar: "مشد رباط", price: 6 }
        ],
        "LADIES": [
            { name: "Dress", ar: "فستان", price: 42 }, { name: "Blouse", ar: "بلوزة", price: 24 }, { name: "Skirt", ar: "تنورة", price: 24 },
            { name: "Jacket", ar: "سترة/جاكيت", price: 30 }, { name: "Petticoat", ar: "كومبليزون", price: 10 }, { name: "Brassiere", ar: "صدرية/سوتيان", price: 12 },
            { name: "Trousers", ar: "بنطلون", price: 18 }, { name: "Night Gown", ar: "قميص نوم", price: 30 }, { name: "Dressing Gown", ar: "عباية", price: 30 },
            { name: "Panties", ar: "سروال داخلي", price: 12 }, { name: "Handkerchief", ar: "منديل", price: 6 }, { name: "Scarf", ar: "حجاب/شيلة", price: 15 }, { name: "Saree", ar: "ساري", price: 36 }
        ],
        "CHILDREN": [
            { name: "Child - Shorts", ar: "شورت", price: 7 }, { name: "Child - Trouser", ar: "بنطلون", price: 12 }, { name: "Child - Shirt", ar: "قميص", price: 7 },
            { name: "Child - T-Shirt", ar: "قميص خفيف", price: 12 }, { name: "Child - Dishdasha", ar: "دشداشة", price: 7 }, { name: "Child - Dress", ar: "فستان", price: 22 }
        ]
    },
    dry: {
        "GENTLEMEN": [
            { name: "Suit (2 pcs.)", ar: "بدلة قطعتين", price: 54 }, { name: "Trousers", ar: "بنطلون", price: 36 }, { name: "Jacket", ar: "جاكيت", price: 30 },
            { name: "Necktie", ar: "ربطة عنق", price: 18 }, { name: "Sweater", ar: "كنزة", price: 22 }, { name: "Shirt (Silk)", ar: "قميص حرير", price: 24 },
            { name: "Dishdash", ar: "دشداشة", price: 36 }, { name: "Gutra", ar: "غترة", price: 12 }, { name: "T-Shirt", ar: "قميص خفيف", price: 27 },
            { name: "Waist Coat", ar: "سترة", price: 22 }, { name: "Overall", ar: "افرول", price: 42 }, { name: "Cap / Hat", ar: "قبعة", price: 12 }
        ],
        "LADIES": [
            { name: "Dress", ar: "فستان", price: 48 }, { name: "Evening Dress", ar: "فستان سهرة", price: 54 }, { name: "Blouse", ar: "بلوزة", price: 36 },
            { name: "Skirt", ar: "تنورة", price: 27 }, { name: "Slacks / Trousers", ar: "بنطلون", price: 24 }, { name: "Jacket", ar: "جاكيت", price: 30 },
            { name: "Saree", ar: "ساري", price: 42 }, { name: "Abbaya", ar: "عباية", price: 36 }, { name: "T-Shirt", ar: "قميص خفيف", price: 27 },
            { name: "Scarf", ar: "حجاب/شيلة", price: 18 }, { name: "Pajama", ar: "بيجامة", price: 30 }, { name: "Child - Dress", ar: "فستان", price: 24 },
            { name: "Child - T-Shirt", ar: "قميص الأطفال", price: 12 }, { name: "Shawl", ar: "شال", price: 12 }
        ]
    },
    pressing: {
        "GENTLEMEN": [
            { name: "Suit (2 pcs.)", ar: "بدلة قطعتين", price: 30 }, { name: "Trousers", ar: "بنطلون", price: 12 }, { name: "Jacket", ar: "جاكيت", price: 18 },
            { name: "Shirt", ar: "قميص", price: 12 }, { name: "Necktie", ar: "ربطة عنق", price: 12 }, { name: "Dishdash", ar: "دشداشة", price: 18 },
            { name: "Lungi", ar: "وزار", price: 12 }, { name: "T-Shirt", ar: "قميص خفيف", price: 10 }, { name: "Overall", ar: "افرول", price: 24 },
            { name: "Pajama Slack", ar: "بيجامة سلاك", price: 15 }, { name: "Gutra", ar: "غترة", price: 6 }, { name: "Shorts", ar: "سروال قصير / شورت", price: 10 }, { name: "Abbaya", ar: "عباية", price: 18 }
        ],
        "LADIES": [
            { name: "Blouse", ar: "بلوزة", price: 12 }, { name: "Dress", ar: "فستان", price: 30 }, { name: "Evening Dress", ar: "فستان سهرة", price: 42 },
            { name: "Skirt", ar: "تنورة", price: 15 }, { name: "Slacks / Trousers", ar: "بنطلون", price: 12 }, { name: "Jacket", ar: "جاكيت", price: 24 },
            { name: "Saree", ar: "ساري", price: 24 }, { name: "Abbaya", ar: "عباية", price: 21 }, { name: "Night Gown", ar: "قميص نوم", price: 18 },
            { name: "Scarf", ar: "حجاب/شيلة", price: 10 }, { name: "Shawl", ar: "شال", price: 10 }
        ]
    }
};
