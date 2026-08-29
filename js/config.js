// Configuration & Variables Globales (Remal Hotel & Villas)
let deferredPrompt;
let globalDirHandle = null;

// URL et Clé Anon Supabase
const SUPABASE_URL = 'https://kmtnkjhjbmsietrlebhs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdG5ramhqYm1zaWV0cmxlYmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMjQ1MTMsImV4cCI6MjEwMTkwMDUxM30.fOMotE-gsxKkTtrgzbrk5qsC22qWdQmF__k89Xt-ErA';

let supabaseClient = null;
try {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            realtime: {
                params: {
                    eventsPerSecond: 10
                }
            }
        });
        console.log("✅ Client Supabase initialisé avec succès.");
    } else {
        console.warn("⚠️ SDK Supabase non détecté au chargement de js/config.js.");
    }
} catch(err) { 
    console.warn("Supabase local mode fallback:", err); 
}

// Variables d'état de l'application
let currentLang = 'en';
let cachedSlips = [];
let pmsDatabase = {}; 
let currentArchiveFilter = 'all';
let doughnutChartInstance = null;
let barChartInstance = null;
let currentLFPhotoData = null;

let currentService = 'laundry';
let currentCountType = 'hotel';
let cart = {};
let currentImageData = null;
let selectedIdForModal = null;

// Mots-clés pour l'identification des agences/compagnies dans le rapport PMS
const companyKeywords = [
    'llc', 'inc', 'w.l.l', 'wll', 'corp', 'corporation', 'company', 'co.',
    'ltd', 'limited', 'energy', 'systems', 'services', 'tourism', 'travel',
    'holdings', 'trading', 'contracting', 'establishment', 'est.', 'group',
    'expedia', 'booking', 'agoda', 'tui', 'emirates', 'rotana', 'marriott',
    'hilton', 'saudi', 'qatar', 'adnoc', 'excelerate', 'generation', 'homat',
    'gulf', 'international', 'global', 'solutions', 'enterprises', 'hunter'
];

// Traductions d'interface
const i18n = {
    en: {
        txtBtnNewRecord: "New Record", lblFormTitle: "New Record", lblRoomNum: "Room Number",
        lblSelectedGarments: "Total Garments:", lblSubTotal: "Subtotal:", lblVat: "VAT (5%):",
        lblGrandTotal: "Grand Total:", btnPhotoProof: "📷 Take Proof Photo (Camera)",
        btnSaveRecord: "💾 Save Record", lblArchiveTitle: "Archives & Search",
        lblLoadingRecords: "Loading records...", lblRoomError: "Invalid room number!",
        lblActiveRoomsHeader: "Active Rooms & SPA",
        pdfHotelName: "REMAL HOTEL & VILLAS",
        pdfHotelSub: "Al Ruwais City, Abu Dhabi – UAE",
        pdfLaundryService: "LAUNDRY SERVICE",
        pdfRoom: "Room:", pdfDate: "Date:", pdfGuest: "Guest Name:", pdfRoomTyp: "Room Typ:",
        pdfAgency: "Agency:", pdfQuota: "Laundry Quota:", pdfAgent: "Agent:", pdfPackaging: "Packaging:",
        pdfItem: "Item", pdfQty: "Qty", pdfTotal: "Total", pdfTotalPieces: "Total Pieces:",
        pdfGrandTotalText: "Grand Total:", pdfNotes: "Garment Notes / Defects:", pdfProofPhoto: "Proof Photo:",
        pdfHotelCount: "Hotel Count", pdfHotelCountFree: "Hotel Count (Free)", pdfHotelExtra: "Hotel & Extra",
        pdfGuestCount: "Guest Count (Full)", pdfSpaSheet: "V ELEMENT SPA LAUNDRY SHEET",
        pdfGivenBy: "Given By (Spa):", pdfCollectedBy: "Collected By:", pdfDeliveredBy: "Delivered By:",
        pdfSheetSerial: "Sheet Serial:", pdfReceiptNo: "Receipt No:", pdfDownloaded: "Downloaded:", pdfSpaRecord: "SPA Record"
    },
    ar: {
        txtBtnNewRecord: "سجل جديد", lblFormTitle: "سجل جديد", lblRoomNum: "رقم الغرفة",
        lblSelectedGarments: "مجموع الملابس:", lblSubTotal: "المجموع الفرعي:", lblVat: "ضريبة القيمة المضافة (٥٪):",
        lblGrandTotal: "المجموع الإجمالي:", btnPhotoProof: "📷 التقاط صورة إثبات (كاميرا)",
        btnSaveRecord: "💾 حفظ السجل", lblArchiveTitle: "الأرشيف والبحث",
        lblLoadingRecords: "جاري تحميل السجلات...", lblRoomError: "رقم الغرفة غير صحيح!",
        lblActiveRoomsHeader: "الغرف النشطة والسبا",
        pdfHotelName: "فندق وفيلا رمال",
        pdfHotelSub: "مدينة الرويس، أبوظبي - الإمارات العربية المتحدة",
        pdfLaundryService: "خدمة المغسلة",
        pdfRoom: "الغرفة:", pdfDate: "التاريخ:", pdfGuest: "اسم الضيف:", pdfRoomTyp: "نوع الغرفة:",
        pdfAgency: "الوكالة:", pdfQuota: "حصص المغسلة:", pdfAgent: "الموظف:", pdfPackaging: "التعبئة:",
        pdfItem: "الصنف", pdfQty: "الكمية", pdfTotal: "المجموع", pdfTotalPieces: "مجموع القطع:",
        pdfGrandTotalText: "المجموع الإجمالي:", pdfNotes: "ملاحظات / عيوب الملابس:", pdfProofPhoto: "صورة الإثبات:",
        pdfHotelCount: "عداد الفندق", pdfHotelCountFree: "عداد الفندق (مجاني)", pdfHotelExtra: "الفندق وإضافي",
        pdfGuestCount: "عداد الضيف (كامل)", pdfSpaSheet: "ورقة مغسلة سبا في إيلمنت",
        pdfGivenBy: "مقدم من (السبا):", pdfCollectedBy: "تم الاستلام بواسطة:", pdfDeliveredBy: "تم التسليم بواسطة:",
        pdfSheetSerial: "رقم السجل:", pdfReceiptNo: "رقم الإيصال:", pdfDownloaded: "تم التحميل:", pdfSpaRecord: "سجل السبا"
    },
    hi: {
        txtBtnNewRecord: "नया रिकॉर्ड", lblFormTitle: "नया रिकॉर्ड", lblRoomNum: "कमरा नंबर",
        lblSelectedGarments: "कुल कपड़े:", lblSubTotal: "उप-कुल:", lblVat: "जीएसटी/वैट (5%):",
        lblGrandTotal: "कुल योग:", btnPhotoProof: "📷 प्रमाण फोटो लें (कैमरा)",
        btnSaveRecord: "💾 रिकॉर्ड सुरक्षित करें", lblArchiveTitle: "अभिलेख और खोज",
        lblLoadingRecords: "रिकॉर्ड लोड हो रहे हैं...", lblRoomError: "अमान्य कमरा नंबर!",
        lblActiveRoomsHeader: "सक्रिय कमरे और स्पा",
        pdfHotelName: "रेमल होटल एंड विला",
        pdfHotelSub: "अल रुwais सिटी, अबू धाबी - यूएई",
        pdfLaundryService: "लॉन्ड्रि सेवा",
        pdfRoom: "कमरा:", pdfDate: "दिनांक:", pdfGuest: "अतिथि का नाम:", pdfRoomTyp: "कमरे का प्रकार:",
        pdfAgency: "एजेंसी:", pdfQuota: "लॉन्ड्री कोटा:", pdfAgent: "कर्मचारी:", pdfPackaging: "पैकेजिंग:",
        pdfItem: "आइटम", pdfQty: "मात्रा", pdfTotal: "कुल", pdfTotalPieces: "कुल पीस:",
        pdfGrandTotalText: "कुल योग:", pdfNotes: "कपड़े के नोट्स / दोष:", pdfProofPhoto: "प्रमाण फोटो:",
        pdfHotelCount: "होटल काउंट", pdfHotelCountFree: "होटل काउंट (मुफ्त)", pdfHotelExtra: "होटल और अतिरिक्त",
        pdfGuestCount: "अतिथि काउंट (पूर्ण)", pdfSpaSheet: "वी एलिमेंट स्पा लॉन्ड्रि शीट",
        pdfGivenBy: "द्वारा दिया गया (स्पा):", pdfCollectedBy: "द्वारा एकत्रित:", pdfDeliveredBy: "द्वारा वितरित:",
        pdfSheetSerial: "शीट सीरियल:", pdfReceiptNo: "रسيद संख्या:", pdfDownloaded: "डाउनलोड किया गया:", pdfSpaRecord: "स्पा रिकॉर्ड"
    }
};

// Grille tarifaire de la blanchisserie
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
