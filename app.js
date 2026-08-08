/* REMAL LAUNDRY CLOUD - VERSION FINALE PROPRE & SÉPARÉE */

const USER_PINS = { 'Front Desk': '1234', 'Laundry Plant': '5678' };
let currentActiveUser = sessionStorage.getItem('remal_auth_user') || null;

const SUPABASE_URL = 'https://fwtfeklctflgehueuuik.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3dGZla2xjdGZsZ2VodWV1dWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMzEyNTEsImV4cCI6MjEwMTYwNzI1MX0.vNmrYb4bmFgRcrlGKZ-KlTvCOJLt-GYJMXpRBRD5WDM';

let supabaseClient = null;
try {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch(err) { console.warn("Supabase local mode fallback:", err); }

let currentLang = 'en';
let cachedSlips = [];
let pmsDatabase = {}; 
let doughnutChartInstance = null;
let barChartInstance = null;
let currentService = 'laundry';
let currentCountType = 'hotel';
let cart = {};
let currentImageData = null;
let selectedIdForModal = null;

const i18n = {
    en: {
        txtBtnNewRecord: "New Record", txtBtnPdfListNav: "PDF List",
        lblFormTitle: "New Record", lblRoomNum: "Room Number",
        lblSelectedGarments: "Total Garments:", lblSubTotal: "Subtotal:",
        lblVat: "VAT (5%):", lblGrandTotal: "Grand Total:", btnPhotoProof: "📷 Take Proof Photo (Camera)",
        btnSaveRecord: "💾 Save Record", lblArchiveTitle: "Archives & Search",
        lblAutoArchive: "Auto-Archive at 00:00", lblLoadingRecords: "Loading records...", noRecords: "No laundry records found.",
        lblRoomError: "Invalid room number! Allowed ranges: 103-144, 201-246, 301-348, 401-448, 501-520, 601-608.",
        lblActiveRoomsHeader: "Active Rooms",
        navActiveRooms: "Active Rooms", navNewRecord: "Laundry Slip", navSpa: "SPA Sheet", navArchives: "Archives", navMass: "Mass PDF", navChart: "Chart",
        headerSub: "Al Ruwais City, Abu Dhabi – UAE",
        modalRoleTitle: "SELECT ROLE", modalRoleSub: "Please identify your terminal.", modalRoleLabel: "Terminal Role",
        modalPinLabel: "Security PIN", btnVerify: "VERIFY",
        pwaTitle: "Installer l'application Remal Laundry", pwaSub: "Accès rapide écran d'accueil", pwaInstall: "Installer",
        guestNameTitle: "Guest Name:", roomTypeTitle: "Room Type (Typ):", pmsQuotaTitle: "PMS Quota / Status:", agencyTitle: "Agency:",
        accountTypeTitle: "Account & Quota Type", btnHotelCount: "Hotel Count (Free)", btnHotelExtra: "Hotel & Extra Charged", btnGuestCount: "Guest Count (Full)",
        serviceTypeTitle: "Service Type", packagingTitle: "Packaging", customSummary: "➕ Other / Custom Items (Manual Entry)", notesSummary: "📝 Garment Notes / Defects (Optional)",
        massTitle: "PMS Mass Entry & PDF Parser", massSub: "Front Desk Morning Setup Terminal", btnClearPms: "🗑 Clear Today's PMS", accurateBadge: "Accurate Guest Mapping",
        massDesc: "Upload your PMS multi-page PDF report directly or paste the text content below.", pdfUploadTitle: "Click to upload PMS PDF Report", pdfUploadSub: "Supports multi-page guest list reports",
        btnAnalyzeSave: "Analyze & Save Database", inHouseTitle: "In-House Guest Laundry List & Status",
        thRoom: "Room", thGuest: "Guest Name", thTyp: "Typ", thArrival: "Arrival", thDeparture: "Departure", thAgency: "Agency", thStatus: "Laundry Status",
        loadingActive: "Loading active rooms...",
        spaDateHeader: "Date :", spaGivenBy: "Given By (Spa):", spaSerial: "SERIAL NO:",
        thSpaItem: "Item", thSpaQty: "Quantity", thSpaRate: "Rate (AED)", thSpaTotal: "Total Amount (AED)",
        lblSpaGrandTotal: "Grand Total :", lblSpaCollectedByTitle: "Collected By (Laundry) :", lblSpaColDateTime: "Collection Date & Time :",
        lblSpaDeliveredByTitle: "Delivered By (Laundry) :", lblSpaDelDateTime: "Delivery Date & Time :", lblSpaSignaturesTitle: "Signatures Officielles (SPA)",
        sigGivenText: "Sign. Given By (Spa)", sigCollText: "Sign. Collected By", sigDelText: "Sign. Delivered By", clearBtnText: "Effacer",
        btnSaveSpa: "Validate & Save SPA Receipt", btnExportBackup: "📥 Export Backup", btnImportBackup: "📤 Import Backup",
        analyticsTitle: "📈 Reception & Management Analytics", execOverview: "Executive Overview",
        kpiRev: "Total Revenue", kpiOrd: "Total Orders", kpiGar: "Garments Processed",
        chartStatus: "Orders Status Distribution", chartRev: "Business Evolution (Revenue by Date)",
        modalGuest: "Guest / Given By:", modalTyp: "Room Typ / Dept:", modalAgency: "Agency / Section:", modalQuota: "Status / Quota:", modalCreated: "Created By:",
        modalPack: "Packaging / Option:", thModalItem: "Item", thModalQty: "Qty", thModalTotal: "Total",
        modalTotPieces: "Total Pieces:", modalGrandTot: "Grand Total:", modalCollBy: "Collected By:", modalDelBy: "Delivered By:",
        modalCollTime: "Col. Time:", modalDelTime: "Del. Time:", modalSigGiven: "Given By", modalSigColl: "Collected", modalSigDel: "Delivered",
        modalNotesTitle: "Garment Notes / Defects:", btnModalDownload: "📥 Download PDF A4", btnModalEdit: "✏️ Edit Record", btnModalDelete: "🗑️ Delete"
    },
    ar: {
        txtBtnNewRecord: "سجل جديد", txtBtnPdfListNav: "قائمة PDF",
        lblFormTitle: "سجل جديد", lblRoomNum: "رقم الغرفة",
        lblSelectedGarments: "مجموع الملابس:", lblSubTotal: "المجموع الفرعي:",
        lblVat: "ضريبة القيمة المضافة (٥٪):", lblGrandTotal: "المجموع الإجمالي:", btnPhotoProof: "📷 التقاط صورة إثبات (كاميرا)",
        btnSaveRecord: "💾 حفظ السجل", lblArchiveTitle: "الأرشيف والبحث",
        lblAutoArchive: "أرشفة تلقائية ٠٠:٠٠", lblLoadingRecords: "جاري تحميل السجلات...", noRecords: "لا توجد سجلات.",
        lblRoomError: "رقم الغرفة غير صحيح! النطاقات المسموحة: 103-144، 201-246، 301-348، 401-448، 501-520، 601-608.",
        lblActiveRoomsHeader: "الغرف النشطة",
        navActiveRooms: "الغرف النشطة", navNewRecord: "سجل الغسيل", navSpa: "ورقة السبا", navArchives: "الأرشيف", navMass: "إدخال مجمع", navChart: "الرسوم البيانية",
        headerSub: "مدينة الرويس، أبوظبي – الإمارات",
        modalRoleTitle: "اختيار الدور", modalRoleSub: "يرجى تحديد المحطة الخاصة بك.", modalRoleLabel: "دور المحطة",
        modalPinLabel: "رمز الحماية PIN", btnVerify: "تحقق",
        pwaTitle: "تثبيت تطبيق رمال للمغسلة", pwaSub: "وصول سريع للشاشة الرئيسية", pwaInstall: "تثبيت",
        guestNameTitle: "اسم الضيف:", roomTypeTitle: "نوع الغرفة:", pmsQuotaTitle: "حصة PMS / الحالة:", agencyTitle: "الوكالة:",
        accountTypeTitle: "نوع الحساب والحصة", btnHotelCount: "حساب الفندق (مجاني)", btnHotelExtra: "الفندق وإضافي مدفوع", btnGuestCount: "حساب الضيف (بالكامل)",
        serviceTypeTitle: "نوع الخدمة", packagingTitle: "التغليف", customSummary: "➕ عناصر أخرى / مخصصة (إدخال يدوي)", notesSummary: "📝 ملاحظات الملابس / عيوب (اختياري)",
        massTitle: "إدخال جماعي و محلل PDF", massSub: "محطة الاستقبال الصباحية", btnClearPms: "🗑 مسح تقرير اليوم", accurateBadge: "مطابقة دقيقة للضيوف",
        massDesc: "قم برفع تقرير PDF الخاص بـ PMS مباشرة أو الصق النص أدناه.", pdfUploadTitle: "انقر لرفع تقرير PMS PDF", pdfUploadSub: "يدعم تقارير قائمة الضيوف متعددة الصفحات",
        btnAnalyzeSave: "تحليل وحفظ قاعدة البيانات", inHouseTitle: "قائمة وحالة غسيل ضيوف الفندق",
        thRoom: "الغرفة", thGuest: "اسم الضيف", thTyp: "النوع", thArrival: "الوصول", thDeparture: "المغادرة", thAgency: "الوكالة", thStatus: "حالة الغسيل",
        loadingActive: "جاري تحميل الغرف النشطة...",
        spaDateHeader: "التاريخ :", spaGivenBy: "مُسلم بواسطة (السبا):", spaSerial: "رقم التسلسل:",
        thSpaItem: "العنصر", thSpaQty: "الكمية", thSpaRate: "السعر (درهم)", thSpaTotal: "المبلغ الإجمالي (درهم)",
        lblSpaGrandTotal: "المجموع الإجمالي :", lblSpaCollectedByTitle: "مستلم بواسطة (المغسلة) :", lblSpaColDateTime: "تاريخ ووقت الاستلام :",
        lblSpaDeliveredByTitle: "مسلم بواسطة (المغسلة) :", lblSpaDelDateTime: "تاريخ ووقت التسليم :", lblSpaSignaturesTitle: "التوقيعات الرسمية (السبا)",
        sigGivenText: "توقيع المُسلم (السبا)", sigCollText: "توقيع المستلم", sigDelText: "توقيع المسلم", clearBtnText: "مسح",
        btnSaveSpa: "تثبيت وحفظ إيصال السبا", btnExportBackup: "📥 تصدير نسخة احتياطية", btnImportBackup: "📤 استيراد نسخة احتياطية",
        analyticsTitle: "📈 تحليلات الإدارة والاستقبال", execOverview: "نظرة عامة تنفيذية",
        kpiRev: "إجمالي الإيرادات", kpiOrd: "إجمالي الطلبات", kpiGar: "الملابس المعالجة",
        chartStatus: "توزيع حالة الطلبات", chartRev: "تطور الأعمال (الإيرادات حسب التاريخ)",
        modalGuest: "الضيف / المُسلم بواسطة:", modalTyp: "نوع الغرفة / القسم:", modalAgency: "الوكالة / القسم:", modalQuota: "الحالة / الحصة:", modalCreated: "أنشئت بواسطة:",
        modalPack: "التغليف / الخيار:", thModalItem: "العنصر", thModalQty: "الكمية", thModalTotal: "الإجمالي",
        modalTotPieces: "إجمالي القطع:", modalGrandTot: "المجموع الإجمالي:", modalCollBy: "مستلم بواسطة:", modalDelBy: "مسلم بواسطة:",
        modalCollTime: "وقت الاستلام:", modalDelTime: "وقت التسليم:", modalSigGiven: "المُسلم", modalSigColl: "المستلم", modalSigDel: "المسلم",
        modalNotesTitle: "ملاحظات الملابس / العيوب:", btnModalDownload: "📥 تحميل PDF A4", btnModalEdit: "✏️ تعديل السجل", btnModalDelete: "🗑️ حذف"
    },
    hi: {
        txtBtnNewRecord: "नया रिकॉर्ड", txtBtnPdfListNav: "पीडीएफ सूची",
        lblFormTitle: "नया रिकॉर्ड", lblRoomNum: "कमरा नंबर",
        lblSelectedGarments: "कुल कपड़े:", lblSubTotal: "उप-कुल:",
        lblVat: "जीएसटी/वैट (5%):", lblGrandTotal: "कुल योग:", btnPhotoProof: "📷 प्रमाण फोटो लें (कैमरा)",
        btnSaveRecord: "💾 रिकॉर्ड सुरक्षित करें", lblArchiveTitle: "अभिलेख और खोज",
        lblAutoArchive: "00:00 बजे ऑटो-संग्रह", lblLoadingRecords: "रिकॉर्ड लोड हो रहे हैं...", noRecords: "कोई रिकॉर्ड नहीं मिला।",
        lblRoomError: "अमान्य कमरा नंबर! केवल ये नंबर मान्य हैं: 103-144, 201-246, 301-348, 401-448, 501-520, 601-608.",
        lblActiveRoomsHeader: "सक्रिय कमरे",
        navActiveRooms: "सक्रिय कमरे", navNewRecord: "लॉन्ड्री पर्ची", navSpa: "स्पा शीट", navArchives: "अभिलेख", navMass: "मास पीडीएफ", navChart: "चार्ट",
        headerSub: "अल रुवाइस सिटी, अबू धाबी – यूएई",
        modalRoleTitle: "भूमिका चुनें", modalRoleSub: "कृपया अपने टर्मिनल की पहचान करें।", modalRoleLabel: "टर्मिनल भूमिका",
        modalPinLabel: "सुरक्षा पिन", btnVerify: "सत्यापित करें",
        pwaTitle: "रेमल लॉन्ड्री ऐप इंस्टॉल करें", pwaSub: "होम स्क्रीन त्वरित पहुंच", pwaInstall: "इंस्टॉल करें",
        guestNameTitle: "अतिथि का नाम:", roomTypeTitle: "कमरे का प्रकार:", pmsQuotaTitle: "PMS कोटा / स्थिति:", agencyTitle: "एजेंसी:",
        accountTypeTitle: "खाता और कोटा प्रकार", btnHotelCount: "होटल काउंट (मुफ्त)", btnHotelExtra: "होटल और अतिरिक्त चार्ज", btnGuestCount: "अतिथि काउंट (पूर्ण)",
        serviceTypeTitle: "सेवा प्रकार", packagingTitle: "पैकेजिंग", customSummary: "➕ अन्य / कस्टम आइटम (मैनुअल प्रविष्टि)", notesSummary: "📝 कपड़े के नोट्स / दोष (वैकल्पिक)",
        massTitle: "PMS मास एंट्री और PDF पार्सर", massSub: "फ्रंट डेस्क मॉर्निंग सेटअप टर्मिनल", btnClearPms: "🗑 आज की PMS साफ़ करें", accurateBadge: "सटीक अतिथि मैपिंग",
        massDesc: "अपनी PMS मल्टी-पेज PDF रिपोर्ट सीधे अपलोड करें या नीचे पाठ पेस्ट करें।", pdfUploadTitle: "PMS PDF रिपोर्ट अपलोड करने के लिए क्लिक करें", pdfUploadSub: "मल्टी-पेज गेस्ट लिस्ट रिपोर्ट का समर्थन करता है",
        btnAnalyzeSave: "विश्लेषण करें और डेटाबेस सहेजें", inHouseTitle: "इन-हाउस गेस्ट लॉन्ड्री सूची और स्थिति",
        thRoom: "कमरा", thGuest: "अतिथि का नाम", thTyp: "प्रकार", thArrival: "आगमन", thDeparture: "प्रस्थान", thAgency: "एजेंसी", thStatus: "लॉन्ड्री स्थिति",
        loadingActive: "सक्रिय कमरे लोड हो रहे हैं...",
        spaDateHeader: "दिनांक :", spaGivenBy: "द्वारा दिया गया (स्पा):", spaSerial: "क्रम संख्या:",
        thSpaItem: "आइटम", thSpaQty: "मात्रा", thSpaRate: "दर (AED)", thSpaTotal: "कुल राशि (AED)",
        lblSpaGrandTotal: "कुल योग :", lblSpaCollectedByTitle: "द्वारा एकत्र (लॉन्ड्री) :", lblSpaColDateTime: "एकत्रित करने की तिथि और समय :",
        lblSpaDeliveredByTitle: "द्वारा वितरित (लॉन्ड्री) :", lblSpaDelDateTime: "वितरण तिथि और समय :", lblSpaSignaturesTitle: "आधिकारिक हस्ताक्षर (स्पा)",
        sigGivenText: "स्पा द्वारा हस्ताक्षर", sigCollText: "एकत्रित हस्ताक्षर", sigDelText: "वितरित हस्ताक्षर", clearBtnText: "साफ़ करें",
        btnSaveSpa: "मान्य करें और स्पा रसीद सहेजें", btnExportBackup: "📥 बैकअप निर्यात करें", btnImportBackup: "📤 बैकअप आयात करें",
        analyticsTitle: "📈 रिसेप्शन और प्रबंधन विश्लेषिकी", execOverview: "कार्यकारी अवलोकन",
        kpiRev: "कुल राजस्व", kpiOrd: "कुल ऑर्डर", kpiGar: "प्रसंस्कृत कपड़े",
        chartStatus: "ऑर्डर स्थिति वितरण", chartRev: "व्यापार विकास (तिथि के अनुसार राजस्व)",
        modalGuest: "अतिथि / द्वारा दिया गया:", modalTyp: "कमरा प्रकार / विभाग:", modalAgency: "एजेंसी / अनुभाग:", modalQuota: "स्थिति / कोटा:", modalCreated: "द्वारा बनाया गया:",
        modalPack: "पैकेजिंग / विकल्प:", thModalItem: "आइटम", thModalQty: "मात्रा", thModalTotal: "कुल",
        modalTotPieces: "कुल टुकड़े:", modalGrandTot: "कुल योग:", modalCollBy: "द्वारा एकत्र:", modalDelBy: "द्वारा वितरित:",
        modalCollTime: "एकत्रित समय:", modalDelTime: "वितरण समय:", modalSigGiven: "दिया गया", modalSigColl: "एकत्रित", modalSigDel: "वितरित",
        modalNotesTitle: "कपड़े के नोट्स / दोष:", btnModalDownload: "📥 पीडीएफ डाउनलोड A4", btnModalEdit: "✏️ रिकॉर्ड संपादित करें", btnModalDelete: "🗑️ हटाएं"
    }
};

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

document.addEventListener('DOMContentLoaded', async () => {
    if (!currentActiveUser) {
        document.getElementById('pinLoginModal').classList.remove('hidden');
    } else {
        document.getElementById('pinLoginModal').classList.add('hidden');
        document.getElementById('activeUserLabel').innerText = currentActiveUser;
        applyRolePermissions();
    }

    setLang('en');
    selectCountType('hotel');
    renderItems();
    
    await chargerDonneesEtAbonnementCloud();

    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const spaDateEl = document.getElementById('spa-current-date');
    if(spaDateEl) spaDateEl.innerText = new Date().toLocaleDateString('fr-FR', options);
    const serialEl = document.getElementById('spa-serial-no');
    if(serialEl && !serialEl.value) serialEl.value = String(590).padStart(4, '0');

    const now = new Date();
    const todayIso = now.toISOString().split('T')[0];
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeIso = `${hours}:${minutes}`;

    const colDate = document.getElementById('spa-collection-date');
    const colTime = document.getElementById('spa-collection-time');
    const delDate = document.getElementById('spa-delivery-date');
    const delTime = document.getElementById('spa-delivery-time');

    if(colDate && !colDate.value) colDate.value = todayIso;
    if(colTime && !colTime.value) colTime.value = timeIso;
    if(delDate && !delDate.value) delDate.value = todayIso;
    if(delTime && !delTime.value) delTime.value = timeIso;

    initSignaturePads();
});

function submitPinLogin() {
    const selectedRole = document.getElementById('userRoleSelect').value;
    currentActiveUser = selectedRole;
    sessionStorage.setItem('remal_auth_user', currentActiveUser);
    
    const modal = document.getElementById('pinLoginModal');
    if(modal) modal.style.display = 'none';
    
    const label = document.getElementById('activeUserLabel');
    if(label) label.innerText = currentActiveUser;
    
    applyRolePermissions();
}

function logoutUser() {
    sessionStorage.removeItem('remal_auth_user');
    currentActiveUser = null;
    document.getElementById('pinInputDisplay').value = '';
    const modal = document.getElementById('pinLoginModal');
    if(modal) modal.style.display = 'flex';
}

function applyRolePermissions() {
    if (!currentActiveUser) return;
    const isFrontDesk = (currentActiveUser === 'Front Desk');

    document.getElementById('navBtnLiveRecord').style.display = 'block';
    document.getElementById('navBtnNewRecord').style.display = 'block';
    document.getElementById('navBtnMassEntry').style.display = 'block';
    
    document.getElementById('navBtnSpa').style.display = isFrontDesk ? 'none' : 'block';
    document.getElementById('navBtnPdfList').style.display = isFrontDesk ? 'none' : 'block';
    document.getElementById('navBtnDashboard').style.display = isFrontDesk ? 'none' : 'block';

    switchMainSection('liveRecord');
}

let deferredPrompt;
if ('serviceWorker' in navigator) {
    const swCode = `
        const CACHE_NAME = 'remal-pwa-v1';
        self.addEventListener('install', (e) => { self.skipWaiting(); });
        self.addEventListener('activate', (e) => { e.waitUntil(clients.claim()); });
        self.addEventListener('fetch', (e) => { e.respondWith(fetch(e.request).catch(() => caches.match(e.request))); });
    `;
    const blob = new Blob([swCode], { type: 'application/javascript' });
    const swUrl = URL.createObjectURL(blob);
    window.addEventListener('load', () => { navigator.serviceWorker.register(swUrl).catch(err => console.log('SW Registration failed:', err)); });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferredPrompt = e;
    document.getElementById('pwaInstallBanner').classList.remove('hidden');
});

function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                document.getElementById('pwaInstallBanner').classList.add('hidden');
            }
            deferredPrompt = null;
        });
    }
}

function dismissPWAInstall() { document.getElementById('pwaInstallBanner').classList.add('hidden'); }

function initSignaturePads() {
    ['canvasGivenBy', 'canvasCollectedBy', 'canvasDeliveredBy'].forEach(canvasId => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        canvas.width = canvas.parentElement.clientWidth || 300;
        canvas.height = 96;

        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#DCA773'; 
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        let isDrawing = false;

        function getPos(e) {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: clientX - rect.left, y: clientY - rect.top };
        }

        canvas.onmousedown = (e) => { isDrawing = true; ctx.beginPath(); ctx.moveTo(getPos(e).x, getPos(e).y); };
        canvas.onmousemove = (e) => { if (!isDrawing) return; ctx.lineTo(getPos(e).x, getPos(e).y); ctx.stroke(); };
        canvas.onmouseup = () => { isDrawing = false; };
        canvas.onmouseleave = () => { isDrawing = false; };

        canvas.ontouchstart = (e) => { e.preventDefault(); isDrawing = true; ctx.beginPath(); ctx.moveTo(getPos(e).x, getPos(e).y); };
        canvas.ontouchmove = (e) => { e.preventDefault(); if (!isDrawing) return; ctx.lineTo(getPos(e).x, getPos(e).y); ctx.stroke(); };
        canvas.ontouchend = (e) => { e.preventDefault(); isDrawing = false; };
    });
}

function clearSignature(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

async function purgerAnciennesPhotos() {
    if (!supabaseClient) return;
    const ilYA30Jours = new Date();
    ilYA30Jours.setDate(ilYA30Jours.getDate() - 30);
    const isoLimit = ilYA30Jours.toISOString();

    try {
        const { data: anciensSlips, error } = await supabaseClient
            .from('laundry_slips')
            .select('id')
            .lt('created_at', isoLimit)
            .not('photo', 'is', null);

        if (error || !anciensSlips || anciensSlips.length === 0) return;
        const idsAPurger = anciensSlips.map(s => s.id);
        await supabaseClient.from('laundry_slips').update({ photo: null }).in('id', idsAPurger);
    } catch (e) { console.warn("Erreur purge:", e); }
}

async function chargerDonneesEtAbonnementCloud() {
    if (!supabaseClient) {
        chargerDonneesLocalStorage();
        return;
    }

    try {
        purgerAnciennesPhotos();
        
        async function syncWithCloud() {
            const { data: slips, error: slipsErr } = await supabaseClient.from('laundry_slips').select('*').order('created_at', { ascending: false });
            const { data: guests, error: guestsErr } = await supabaseClient.from('pms_guests').select('*');

            if (!slipsErr && slips) {
                cachedSlips = slips;
                sauvegarderDonneesLocalStorage();
            } else if (slipsErr) {
                console.warn("Erreur chargement slips Supabase:", slipsErr);
            }

            if (!guestsErr && guests && guests.length > 0) {
                let tempPms = {};
                guests.forEach(g => {
                    tempPms[g.room] = {
                        guestName: g.guest_name,
                        roomTyp: g.room_typ,
                        agency: g.agency,
                        quotaText: g.quota_text,
                        isChargeable: g.is_chargeable
                    };
                });
                pmsDatabase = tempPms;
                const todayStr = new Date().toISOString().split('T')[0];
                localStorage.setItem('remal_pms_cache', JSON.stringify({ date: todayStr, database: pmsDatabase }));
            }

            chargerLiveOrders();
            if(!document.getElementById('sectionPdfList').classList.contains('hidden')) {
                afficherListeBordereauxLocal();
            }
        }

        await syncWithCloud();
        setInterval(syncWithCloud, 5000);

    } catch (e) { 
        console.warn("Erreur critique Cloud, bascule sur le local:", e);
        chargerDonneesLocalStorage(); 
    }
}

function chargerDonneesLocalStorage() {
    const data = localStorage.getItem('remal_laundry_slips');
    cachedSlips = data ? JSON.parse(data) : [];

    const pmsCache = localStorage.getItem('remal_pms_cache');
    if (pmsCache) {
        try {
            const parsedPms = JSON.parse(pmsCache);
            const todayStr = new Date().toISOString().split('T')[0];
            if (parsedPms.date === todayStr) {
                pmsDatabase = parsedPms.database || {};
                const resultsCard = document.getElementById('massResultsCard');
                const container = document.getElementById('massPreviewContainer');
                const counterContainer = document.getElementById('massRecordCounter');
                
                if (resultsCard && container && counterContainer && parsedPms.previewHtml) {
                    container.innerHTML = parsedPms.previewHtml;
                    counterContainer.innerHTML = `✅ ${parsedPms.count} PMS record(s) loaded from today's saved report.`;
                    resultsCard.classList.remove('hidden');
                }
            } else { localStorage.removeItem('remal_pms_cache'); }
        } catch(e) { console.warn("Erreur cache PMS:", e); }
    }
}

function sauvegarderDonneesLocalStorage() {
    localStorage.setItem('remal_laundry_slips', JSON.stringify(cachedSlips));
}

function effacerRapportPmsAujourdhui() {
    if (confirm("Clear today's saved PMS report?")) {
        localStorage.removeItem('remal_pms_cache');
        pmsDatabase = {};
        document.getElementById('massResultsCard').classList.add('hidden');
        document.getElementById('massPreviewContainer').innerHTML = '';
        document.getElementById('massRecordCounter').innerHTML = '';
        document.getElementById('pmsPasteArea').value = '';
        alert("Today's PMS cache cleared.");
    }
}

function isRoomNumberValid(val) {
    const room = parseInt(val, 10);
    if (isNaN(room)) return false;
    return (
        (room >= 103 && room <= 144) ||
        (room >= 201 && room <= 246) ||
        (room >= 301 && room <= 348) ||
        (room >= 401 && room <= 448) ||
        (room >= 501 && room <= 520) ||
        (room >= 601 && room <= 608)
    );
}

function onRoomNumberInput() {
    validateRoomNumber();
    const roomVal = document.getElementById('roomNumber').value.trim();
    const infoBox = document.getElementById('roomPmsInfoBox');
    const guestSpan = document.getElementById('pmsInfoGuest');
    const typSpan = document.getElementById('pmsInfoTyp');
    const quotaSpan = document.getElementById('pmsInfoQuota');
    const agencySpan = document.getElementById('pmsInfoAgency');

    if (pmsDatabase[roomVal]) {
        const data = pmsDatabase[roomVal];
        guestSpan.innerText = data.guestName || 'Unknown Guest';
        typSpan.innerText = data.roomTyp || 'DLXR';
        quotaSpan.innerHTML = data.isChargeable ? `<span class="text-rose-400 font-bold">Chargeable</span>` : `<span class="text-emerald-400 font-bold">${data.quotaText}</span>`;
        agencySpan.innerText = data.agency || 'Direct';
        infoBox.classList.remove('hidden');

        if (data.isChargeable) { selectCountType('guest'); } 
        else { selectCountType('hotel'); }
    } else { infoBox.classList.add('hidden'); }
}

function validateRoomNumber() {
    const input = document.getElementById('roomNumber');
    const errorMsg = document.getElementById('roomErrorMsg');
    const saveBtn = document.getElementById('btnSaveRecord');
    const val = input.value.trim();

    if (val === '' || isRoomNumberValid(val)) {
        input.className = "w-full remal-input rounded-xl p-3 text-sm font-bold";
        errorMsg.classList.add('hidden');
        saveBtn.disabled = false;
        saveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        return true;
    } else {
        input.className = "w-full border-2 border-rose-500 rounded-xl p-3 text-sm font-bold bg-rose-950/20 text-rose-200 outline-none";
        errorMsg.classList.remove('hidden');
        saveBtn.disabled = true;
        saveBtn.classList.add('opacity-50', 'cursor-not-allowed');
        return false;
    }
}

function setLang(lang) {
    currentLang = lang;
    const t = i18n[lang] || i18n.en;
    document.getElementById('htmlRoot').setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.getElementById('langSelect').value = lang;

    document.getElementById('txtBtnNewRecord').innerText = t.txtBtnNewRecord;
    document.getElementById('txtBtnPdfListNav').innerText = t.txtBtnPdfListNav;
    document.getElementById('lblFormTitle').innerText = t.lblFormTitle;
    document.getElementById('lblRoomNum').innerText = t.lblRoomNum;
    document.getElementById('lblSelectedGarments').innerText = t.lblSelectedGarments;
    document.getElementById('lblSubTotal').innerText = t.lblSubTotal;
    document.getElementById('lblVat').innerText = t.lblVat;
    document.getElementById('lblGrandTotal').innerText = t.lblGrandTotal;
    document.getElementById('btnPhotoProof').innerHTML = `📷 ${t.btnPhotoProof}`;
    document.getElementById('btnSaveRecord').innerText = t.btnSaveRecord;
    document.getElementById('lblArchiveTitle').innerText = t.lblArchiveTitle;
    document.getElementById('lblAutoArchive').innerText = t.lblAutoArchive;
    document.getElementById('lblLoadingRecords').innerText = t.lblLoadingRecords;
    document.getElementById('lblRoomError').innerText = t.roomError || t.lblRoomError;
    document.getElementById('lblActiveRoomsHeader').innerText = t.lblActiveRoomsHeader;

    document.getElementById('navBtnLiveRecord').innerText = t.navActiveRooms;
    document.getElementById('navBtnNewRecord').innerText = t.navNewRecord;
    document.getElementById('navBtnSpa').innerText = t.navSpa;
    document.getElementById('navBtnPdfList').innerText = t.navArchives;
    document.getElementById('navBtnMassEntry').innerText = t.navMass;
    document.getElementById('navBtnDashboard').innerText = t.navChart;

    document.getElementById('headerSubLoc').innerText = t.headerSub;
    document.getElementById('lblModalRoleTitle').innerText = t.modalRoleTitle;
    document.getElementById('lblModalRoleSub').innerText = t.modalRoleSub;
    document.getElementById('lblModalRoleLabel').innerText = t.modalRoleLabel;
    document.getElementById('lblModalPinLabel').innerText = t.modalPinLabel;
    document.getElementById('btnVerify').innerText = t.btnVerify;

    document.getElementById('pwaTitle').innerText = t.pwaTitle;
    document.getElementById('pwaSub').innerText = t.pwaSub;
    document.getElementById('pwaBtnInstall').innerText = t.pwaInstall;

    document.getElementById('lblGuestNameTitle').innerText = t.guestNameTitle;
    document.getElementById('lblRoomTypeTitle').innerText = t.roomTypeTitle;
    document.getElementById('lblPmsQuotaTitle').innerText = t.pmsQuotaTitle;
    document.getElementById('lblAgencyTitle').innerText = t.agencyTitle;

    document.getElementById('lblAccountTypeTitle').innerText = t.accountTypeTitle;
    document.getElementById('btn-count-hotel').innerText = t.btnHotelCount;
    document.getElementById('btn-count-quota-extra').innerText = t.btnHotelExtra;
    document.getElementById('btn-count-guest').innerText = t.btnGuestCount;

    document.getElementById('lblServiceTypeTitle').innerText = t.serviceTypeTitle;
    document.getElementById('lblPackagingTitle').innerText = t.packagingTitle;
    document.getElementById('lblCustomItemSummary').innerText = t.customSummary;
    document.getElementById('lblNotesSummary').innerText = t.notesSummary;

    document.getElementById('lblMassTitle').innerText = t.massTitle;
    document.getElementById('lblMassSub').innerText = t.massSub;
    document.getElementById('btnClearPms').innerText = t.btnClearPms;
    document.getElementById('lblAccurateBadge').innerText = t.accurateBadge;
    document.getElementById('lblMassDesc').innerText = t.massDesc;
    document.getElementById('lblPdfUploadTitle').innerText = t.pdfUploadTitle;
    document.getElementById('lblPdfUploadSub').innerText = t.pdfUploadSub;
    document.getElementById('btnAnalyzeSave').innerText = t.btnAnalyzeSave;
    document.getElementById('lblInHouseTitle').innerText = t.inHouseTitle;

    document.getElementById('thRoom').innerText = t.thRoom;
    document.getElementById('thGuest').innerText = t.thGuest;
    document.getElementById('thTyp').innerText = t.thTyp;
    document.getElementById('thArrival').innerText = t.thArrival;
    document.getElementById('thDeparture').innerText = t.thDeparture;
    document.getElementById('thAgency').innerText = t.thAgency;
    document.getElementById('thStatus').innerText = t.thStatus;

    document.getElementById('lblSpaDateHeader').innerText = t.spaDateHeader;
    document.getElementById('lblSpaGivenBy').innerText = t.spaGivenBy;
    document.getElementById('lblSpaSerial').innerText = t.spaSerial;
    document.getElementById('thSpaItem').innerText = t.thSpaItem;
    document.getElementById('thSpaQty').innerText = t.thSpaQty;
    document.getElementById('thSpaRate').innerText = t.thSpaRate;
    document.getElementById('thSpaTotal').innerText = t.thSpaTotal;
    document.getElementById('lblSpaGrandTotal').innerText = t.lblSpaGrandTotal;
    document.getElementById('lblSpaCollectedByTitle').innerText = t.lblSpaCollectedByTitle;
    document.getElementById('lblSpaColDateTime').innerText = t.lblSpaColDateTime;
    document.getElementById('lblSpaDeliveredByTitle').innerText = t.lblSpaDeliveredByTitle;
    document.getElementById('lblSpaDelDateTime').innerText = t.lblSpaDelDateTime;
    document.getElementById('lblSpaSignaturesTitle').innerText = t.lblSpaSignaturesTitle;

    document.getElementById('lblSigGivenText').innerText = t.sigGivenText;
    document.getElementById('lblSigCollText').innerText = t.sigCollText;
    document.getElementById('lblSigDelText').innerText = t.sigDelText;
    document.querySelectorAll('.clear-btn-text').forEach(el => el.innerText = t.clearBtnText);

    document.getElementById('btnSaveSpa').innerHTML = `<i class="fas fa-check-circle"></i> ${t.btnSaveSpa}`;
    document.getElementById('btnExportBackup').innerText = t.btnExportBackup;
    document.getElementById('btnImportBackup').innerText = t.btnImportBackup;

    document.getElementById('lblAnalyticsTitle').innerText = t.analyticsTitle;
    document.getElementById('lblExecOverview').innerText = t.execOverview;
    document.getElementById('lblKpiRev').innerText = t.kpiRev;
    document.getElementById('lblKpiOrd').innerText = t.kpiOrd;
    document.getElementById('lblKpiGar').innerText = t.kpiGar;
    document.getElementById('lblChartStatus').innerText = t.chartStatus;
    document.getElementById('lblChartRev').innerText = t.chartRev;

    document.getElementById('lblModalGuest').innerText = t.modalGuest;
    document.getElementById('lblModalTyp').innerText = t.modalTyp;
    document.getElementById('lblModalAgency').innerText = t.modalAgency;
    document.getElementById('lblModalQuota').innerText = t.modalQuota;
    document.getElementById('lblModalCreated').innerText = t.modalCreated;
    document.getElementById('lblModalPack').innerText = t.modalPack;
    document.getElementById('thModalItem').innerText = t.thModalItem;
    document.getElementById('thModalQty').innerText = t.thModalQty;
    document.getElementById('thModalTotal').innerText = t.thModalTotal;
    document.getElementById('modalClothesCount').innerText = t.modalTotPieces;
    document.getElementById('modalGrandTot').innerText = t.modalGrandTot;
    document.getElementById('lblModalCollBy').innerText = t.modalCollBy;
    document.getElementById('lblModalDelBy').innerText = t.modalDelBy;
    document.getElementById('lblModalCollTime').innerText = t.modalCollTime;
    document.getElementById('lblModalDelTime').innerText = t.modalDelTime;
    document.getElementById('lblModalSigGiven').innerText = t.modalSigGiven;
    document.getElementById('lblModalSigColl').innerText = t.modalSigColl;
    document.getElementById('lblModalSigDel').innerText = t.modalSigDel;
    document.getElementById('modalNotesTitle').innerText = t.modalNotesTitle;
    document.getElementById('btnModalDownload').innerText = t.btnModalDownload;
    document.getElementById('btnModalEdit').innerText = t.btnModalEdit;
    document.getElementById('btnModalDelete').innerText = t.btnModalDelete;

    renderItems();
}

function switchMainSection(section) {
    if (section === 'newRecord') { reinitialiserFormulaire(); }

    ['newRecord', 'massEntry', 'liveRecord', 'spa', 'pdfList', 'dashboard'].forEach(sec => {
        const el = document.getElementById(`section${sec.charAt(0).toUpperCase() + sec.slice(1)}`) || document.getElementById(`${sec}-laundry-section`);
        if(el) el.classList.add('hidden');
    });
    
    ['liveRecord', 'newRecord', 'spa', 'pdfList', 'massEntry', 'dashboard'].forEach(sec => {
        const btn = document.getElementById(`navBtn${sec.charAt(0).toUpperCase() + sec.slice(1)}`);
        if(btn) btn.className = "flex-1 py-2.5 rounded-xl transition text-center text-stone-400 hover:text-stone-200";
    });

    const targetSection = section === 'spa' ? document.getElementById('spa-laundry-section') : document.getElementById(`section${section.charAt(0).toUpperCase() + section.slice(1)}`);
    if(targetSection) targetSection.classList.remove('hidden');
    
    const activeNav = document.getElementById(`navBtn${section.charAt(0).toUpperCase() + section.slice(1)}`);
    if(activeNav) activeNav.className = "flex-1 py-2.5 rounded-xl bg-[#DCA773] text-stone-950 font-bold shadow transition text-center";

    if (section === 'spa') { setTimeout(initSignaturePads, 100); }

    const quickActionButtons = document.getElementById('quickActionButtons');
    if (section === 'liveRecord' && currentActiveUser === 'Laundry Plant') {
        quickActionButtons.classList.remove('hidden');
        chargerLiveOrders();
    } else { quickActionButtons.classList.add('hidden'); }

    if (section === 'pdfList') { afficherListeBordereauxLocal(); } 
    else if (section === 'dashboard') { renderManagementDashboard(); } 
    else if (section === 'liveRecord') { chargerLiveOrders(); }
}

function selectCountType(type) {
    currentCountType = type;
    const t = i18n[currentLang] || i18n.en;
    document.getElementById('btn-count-hotel').className = type === 'hotel' ? 'py-2.5 px-1 rounded-xl bg-[#DCA773] text-stone-950 shadow font-bold text-xs' : 'py-2.5 px-1 rounded-xl text-stone-400 text-xs';
    document.getElementById('btn-count-quota-extra').className = type === 'quota_extra' ? 'py-2.5 px-1 rounded-xl bg-[#DCA773] text-stone-950 shadow font-bold text-xs' : 'py-2.5 px-1 rounded-xl text-stone-400 text-xs';
    document.getElementById('btn-count-guest').className = type === 'guest' ? 'py-2.5 px-1 rounded-xl bg-[#DCA773] text-stone-950 shadow font-bold text-xs' : 'py-2.5 px-1 rounded-xl text-stone-400 text-xs';

    document.getElementById('btn-count-hotel').innerText = t.btnHotelCount;
    document.getElementById('btn-count-quota-extra').innerText = t.btnHotelExtra;
    document.getElementById('btn-count-guest').innerText = t.btnGuestCount;

    renderItems(); 
    calculateGlobalTotals();
}

function switchService(service) {
    currentService = service;
    ['laundry', 'dry', 'pressing'].forEach(s => {
        document.getElementById(`tab-service-${s}`).className = s === service ? "flex-1 py-2.5 rounded-xl bg-[#DCA773] text-stone-950 shadow font-bold text-xs" : "flex-1 py-2.5 rounded-xl bg-[#0f0e0c] text-stone-400 border border-[#2f2820] text-xs";
    });
    renderItems();
}

function renderItems() {
    const container = document.getElementById('itemsContainer');
    container.innerHTML = '';
    const serviceData = database[currentService];
    for (const [catName, items] of Object.entries(serviceData)) {
        const catHeader = document.createElement('div');
        catHeader.className = 'bg-[#0f0e0c] text-[#DCA773] px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider mb-2 mt-2 border border-[#2f2820]'; 
        catHeader.innerText = catName;
        container.appendChild(catHeader);

        items.forEach(item => {
            const key = `${currentService}_${item.name}`;
            const entry = cart[key] || { qty: 0, freeQty: 0, price: item.price, name: item.name };
            const qty = entry.qty;
            const freeQty = entry.freeQty || 0;
            
            const priceDisplay = currentCountType === 'hotel' ? '0.00 AED' : `${item.price.toFixed(2)} AED`;

            let freeControlsHtml = '';
            if (currentCountType === 'quota_extra' && qty > 0) {
                freeControlsHtml = `
                    <div class="flex items-center gap-1 mt-1 bg-[#0f0e0c] px-2 py-1 rounded-lg border border-[#2f2820] text-[10px]">
                        <span class="text-stone-400 font-semibold">${currentLang === 'ar' ? 'قطع مجانية:' : (currentLang === 'hi' ? 'मुफ्त पीस:' : 'Free Pcs:')}</span>
                        <button onclick="updateFreeQty('${key}', -1)" class="w-5 h-5 bg-[#181614] text-stone-200 rounded font-bold">-</button>
                        <span class="text-emerald-400 font-bold px-1">${freeQty}</span>
                        <button onclick="updateFreeQty('${key}', 1)" class="w-5 h-5 bg-[#DCA773] text-stone-950 rounded font-bold">+</button>
                    </div>
                `;
            }

            const itemNameDisplayed = currentLang === 'ar' ? item.ar : item.name;

            const row = document.createElement('div');
            row.className = 'flex justify-between items-center py-2 border-b border-[#2f2820] text-xs';
            row.innerHTML = `
                <div>
                    <p class="font-bold text-stone-200">${itemNameDisplayed}</p>
                    <p class="text-[10px] ${currentCountType === 'hotel' ? 'text-emerald-400 font-bold' : 'text-[#DCA773] font-semibold'}">${priceDisplay}</p>
                    ${freeControlsHtml}
                </div>
                <div class="flex items-center space-x-2 bg-[#0f0e0c] p-1 rounded-xl border border-[#2f2820]">
                    <button onclick="updateQty('${key}', '${item.name}', ${item.price}, -1)" class="w-6 h-6 bg-[#181614] text-stone-200 rounded font-bold shadow-sm">-</button>
                    <span class="font-bold px-1 text-stone-100">${qty}</span>
                    <button onclick="updateQty('${key}', '${item.name}', ${item.price}, 1)" class="w-6 h-6 bg-[#DCA773] text-stone-950 rounded font-bold shadow-sm">+</button>
                </div>
            `;
            container.appendChild(row);
        });
    }
}

function updateQty(key, name, price, delta) {
    if (!cart[key]) cart[key] = { qty: 0, freeQty: 0, price: price, name: name, service: currentService };
    cart[key].qty += delta;
    if (cart[key].freeQty > cart[key].qty) { cart[key].freeQty = cart[key].qty; }
    if (cart[key].qty <= 0) delete cart[key];
    renderItems(); calculateGlobalTotals();
}

function updateFreeQty(key, delta) {
    if (!cart[key]) return;
    cart[key].freeQty += delta;
    if (cart[key].freeQty < 0) cart[key].freeQty = 0;
    if (cart[key].freeQty > cart[key].qty) cart[key].freeQty = cart[key].qty;
    renderItems(); calculateGlobalTotals();
}

function calculateGlobalTotals() {
    let totalClothes = 0; 
    let subtotal = 0;

    Object.values(cart).forEach(item => { 
        totalClothes += item.qty; 
        if (currentCountType === 'guest') {
            subtotal += item.price * item.qty;
        } else if (currentCountType === 'quota_extra') {
            let chargeableQty = item.qty - (item.freeQty || 0);
            if(chargeableQty < 0) chargeableQty = 0;
            subtotal += item.price * chargeableQty;
        }
    });

    for (let i = 0; i < 3; i++) {
        const nameVal = document.getElementById(`customName${i}`)?.value.trim() || '';
        const priceVal = parseFloat(document.getElementById(`customPrice${i}`)?.value) || 0;
        const qtyVal = parseInt(document.getElementById(`customQty${i}`)?.value) || 0;

        if (nameVal && qtyVal > 0) {
            totalClothes += qtyVal;
            if (currentCountType === 'guest' || currentCountType === 'quota_extra') {
                subtotal += priceVal * qtyVal;
            }
        }
    }

    const vat = subtotal * 0.05; 
    const grandTotal = subtotal + vat;
    
    document.getElementById('currentBordereauCount').innerText = `${totalClothes} pieces`;
    document.getElementById('subTotal').innerText = `${subtotal.toFixed(2)} AED`;
    document.getElementById('vatAmount').innerText = `${vat.toFixed(2)} AED`;
    document.getElementById('grandTotal').innerText = `${grandTotal.toFixed(2)} AED`;
}

function previewImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            } else {
                if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            currentImageData = canvas.toDataURL('image/jpeg', 0.7);
            const previewEl = document.getElementById('imagePreview');
            previewEl.src = currentImageData;
            previewEl.classList.remove('hidden');
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
}

async function sauvegarderBordereauLocal() {
    const roomInput = document.getElementById('roomNumber');
    const roomNum = roomInput.value.trim();
    const editingId = document.getElementById('editingRecordId').value;
    const optionalNote = document.getElementById('recordOptionalNote').value.trim();

    if (!roomNum) { alert('Please enter a room number.'); return; }

    let finalCart = {};
    for (const [k, v] of Object.entries(cart)) { finalCart[k] = { ...v }; }

    for (let i = 0; i < 3; i++) {
        const nameVal = document.getElementById(`customName${i}`).value.trim();
        const priceVal = parseFloat(document.getElementById(`customPrice${i}`).value) || 0;
        const qtyVal = parseInt(document.getElementById(`customQty${i}`).value) || 0;

        if (nameVal && qtyVal > 0) {
            finalCart[`custom_${i}`] = { name: nameVal, price: priceVal, qty: qtyVal, freeQty: 0, service: currentService };
        }
    }

    if (Object.keys(finalCart).length === 0 && !currentImageData) {
        alert('Please select at least one garment or take a proof photo.');
        return;
    }

    let totalClothes = 0; 
    Object.values(finalCart).forEach(item => totalClothes += item.qty);

    let subtotal = 0;
    Object.values(finalCart).forEach(item => {
        if (currentCountType === 'guest') {
            subtotal += item.price * item.qty;
        } else if (currentCountType === 'quota_extra') {
            let chargeableQty = item.qty - (item.freeQty || 0);
            if(chargeableQty < 0) chargeableQty = 0;
            subtotal += item.price * chargeableQty;
        }
    });

    const selectedOption = document.querySelector('input[name="foldingOption"]:checked')?.value || 'F — Folding';
    const vat = subtotal * 0.05; 
    const grandTotal = subtotal + vat;

    const pmsData = pmsDatabase[roomNum] || { guestName: 'Unknown Guest', roomTyp: 'DLXR', agency: 'Direct', quotaText: 'Chargeable', isChargeable: true };

    chargerDonneesLocalStorage();
    let targetRecord = null;

    if (editingId) {
        const index = cachedSlips.findIndex(s => s.id == editingId);
        if (index !== -1) {
            cachedSlips[index] = {
                ...cachedSlips[index],
                is_spa: false, // Laundry standard
                room: roomNum,
                count_type: currentCountType,
                options: { service_style: selectedOption },
                items: finalCart,
                total_clothes: totalClothes,
                subtotal: subtotal,
                vat: vat,
                total: grandTotal,
                note: optionalNote,
                photo: currentImageData || cachedSlips[index].photo,
                guest_name: pmsData.guestName,
                room_typ: pmsData.roomTyp,
                agency: pmsData.agency,
                quota: pmsData.quotaText,
                created_by: currentActiveUser || 'Laundry Plant'
            };
            targetRecord = cachedSlips[index];
        }
        alert(`Record updated successfully!`);
    } else {
        targetRecord = {
            id: Date.now(),
            is_spa: false, // Laundry standard (séparé du SPA)
            spa_serial: null,
            room: roomNum,
            count_type: currentCountType,
            options: { service_style: selectedOption },
            items: finalCart,
            total_clothes: totalClothes,
            subtotal: subtotal,
            vat: vat,
            total: grandTotal,
            note: optionalNote,
            photo: currentImageData,
            guest_name: pmsData.guestName,
            room_typ: pmsData.roomTyp,
            agency: pmsData.agency,
            quota: pmsData.quotaText,
            created_by: currentActiveUser || 'Laundry Plant',
            status: 'Collected',
            created_at: new Date().toISOString()
        };
        cachedSlips.push(targetRecord);
        alert(`Record saved!`);
    }

    sauvegarderDonneesLocalStorage();

    if (supabaseClient && targetRecord) {
        const { error } = await supabaseClient.from('laundry_slips').upsert(targetRecord);
        if (error) {
            console.error("Erreur Supabase détaillée :", error);
            alert("⚠️ Erreur de synchronisation Supabase : " + error.message);
        } else {
            console.log("Synchronisé avec succès dans Supabase !");
        }
    }

    reinitialiserFormulaire();
    switchMainSection('liveRecord');
}

function reinitialiserFormulaire() {
    document.getElementById('roomNumber').value = ''; 
    document.getElementById('editingRecordId').value = '';
    document.getElementById('recordOptionalNote').value = '';
    document.getElementById('roomPmsInfoBox').classList.add('hidden');
    
    const defaultFoldingRadio = document.querySelector('input[name="foldingOption"][value="F — Folding"]');
    if(defaultFoldingRadio) defaultFoldingRadio.checked = true;

    for (let i = 0; i < 3; i++) {
        if(document.getElementById(`customName${i}`)) document.getElementById(`customName${i}`).value = '';
        if(document.getElementById(`customPrice${i}`)) document.getElementById(`customPrice${i}`).value = '';
        if(document.getElementById(`customQty${i}`)) document.getElementById(`customQty${i}`).value = '';
    }

    const customDetails = document.getElementById('detailsCustomItems');
    const notesDetails = document.getElementById('detailsGarmentNotes');
    if(customDetails) customDetails.open = false;
    if(notesDetails) notesDetails.open = false;

    validateRoomNumber();
    cart = {}; currentImageData = null;
    document.getElementById('imagePreview').classList.add('hidden'); document.getElementById('photoInput').value = '';
    
    selectCountType('hotel'); 
    renderItems(); 
    calculateGlobalTotals();
}

async function handlePDFUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const counterContainer = document.getElementById('massRecordCounter');
    counterContainer.innerHTML = "Reading PDF file...";

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let extractedText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            let lastY = null;
            let lineText = "";
            
            textContent.items.forEach(item => {
                if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
                    extractedText += lineText + "\n";
                    lineText = "";
                }
                lineText += item.str + "\t";
                lastY = item.transform[5];
            });
            extractedText += lineText + "\n\n";
        }

        document.getElementById('pmsPasteArea').value = extractedText;
        processTextData(extractedText);
    } catch (error) {
        console.error("Error reading PDF:", error);
        alert("Error reading PDF file.");
    }
}

async function processTextData(rawData) {
    const container = document.getElementById('massPreviewContainer');
    const counterContainer = document.getElementById('massRecordCounter');
    const resultsCard = document.getElementById('massResultsCard');

    if (!rawData.trim()) { alert("⚠️ Empty text."); return; }

    const lines = rawData.split('\n');
    let parsedData = [];
    let currentRoom = null;
    let currentGuest = "";
    let currentRoomTyp = "";
    let currentArrival = "";
    let currentDeparture = "";
    let currentAgency = "";
    let accumulatedText = "";

    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        const cols = line.split('\t').map(c => c.trim()).filter(c => c !== "");

        if (/^\d{3,4}$/.test(cols[0])) {
            if (currentRoom) {
                parsedData.push({
                    room: currentRoom, guestName: currentGuest || 'Unknown Guest',
                    roomTyp: currentRoomTyp || 'DLXR', arrival: currentArrival,
                    departure: currentDeparture, agency: currentAgency || 'Direct',
                    fullContext: accumulatedText.toLowerCase()
                });
            }
            currentRoom = cols[0];
            let potentialCol1 = cols[1] || "";
            let potentialCol3 = cols[3] || "";

            if (potentialCol1.length <= 5 && /^[A-Z]+$/.test(potentialCol1)) {
                currentRoomTyp = potentialCol1;
                currentGuest = potentialCol3 || "Unknown Guest";
            } else {
                currentGuest = potentialCol1;
                currentRoomTyp = potentialCol3.length <= 6 ? potentialCol3 : "DLXR";
            }

            currentArrival = cols.find(c => /\d{2}\/\d{2}\/\d{4}/.test(c)) || "";
            currentAgency = cols.find(c => /LLC|Staff|Expedia|Booking|Toshiba/i.test(c)) || cols[6] || "";
            accumulatedText = line;
        } else {
            accumulatedText += " " + line;
            if (!currentAgency && cols.length > 0) {
                currentAgency = cols.find(c => /LLC|Staff|Expedia|Booking|Toshiba/i.test(c)) || currentAgency;
            }
        }
    });

    if (currentRoom) {
        parsedData.push({
            room: currentRoom, guestName: currentGuest || 'Unknown Guest',
            roomTyp: currentRoomTyp || 'DLXR', arrival: currentArrival,
            departure: currentDeparture, agency: currentAgency || 'Direct',
            fullContext: accumulatedText.toLowerCase()
        });
    }

    if (parsedData.length > 0) {
        counterContainer.innerHTML = `✅ ${parsedData.length} records detected...`;
        resultsCard.classList.remove('hidden');

        let html = ``;
        pmsDatabase = {}; 
        let cloudGuestsPayload = [];

        parsedData.forEach(item => {
            const laundryRegex = /([0-9]{1,2})\s*pcs[\/\s]*(lau|lan|laun|laundy)/i;
            const match = item.fullContext.match(laundryRegex);
            const hasLaundry = match !== null || /hdl[0-9]|laundry/i.test(item.fullContext);
            
            let rowClass = hasLaundry ? "laundry-row" : "";
            let statusHTML = "";
            let quotaText = "";
            let isChargeable = false;

            if (match) {
                const pcsCount = parseInt(match[1], 10);
                let unitName = match[2].toUpperCase();
                if (unitName === "LAUNDRY") unitName = "LAUN";
                quotaText = `${pcsCount} PCS ${unitName}`;
                statusHTML = `<span class="badge-green">Included (${quotaText})</span>`;
                isChargeable = false;
            } else if (hasLaundry) {
                quotaText = "Laundry Package";
                statusHTML = `<span class="badge-green">Included (${quotaText})</span>`;
                isChargeable = false;
            } else {
                quotaText = "Chargeable";
                statusHTML = `<span class="badge-chargeable">Chargeable</span>`;
                isChargeable = true;
            }

            pmsDatabase[item.room] = { guestName: item.guestName, roomTyp: item.roomTyp, agency: item.agency, quotaText: quotaText, isChargeable: isChargeable };
            cloudGuestsPayload.push({
                room: String(item.room), guest_name: String(item.guestName),
                room_typ: String(item.roomTyp), agency: String(item.agency),
                quota_text: String(quotaText), is_chargeable: Boolean(isChargeable)
            });

            html += `
                <tr class="${rowClass}">
                    <td class="p-3"><strong>${item.room}</strong></td>
                    <td class="p-3">${item.guestName}</td>
                    <td class="p-3">${item.roomTyp}</td>
                    <td class="p-3">${item.arrival}</td>
                    <td class="p-3">${item.departure}</td>
                    <td class="p-3">${item.agency}</td>
                    <td class="p-3">${statusHTML}</td>
                </tr>
            `;
        });

        container.innerHTML = html;
        const todayStr = new Date().toISOString().split('T')[0];
        localStorage.setItem('remal_pms_cache', JSON.stringify({ date: todayStr, database: pmsDatabase, previewHtml: html, count: parsedData.length }));

        if (supabaseClient) {
            const { error: guestErr } = await supabaseClient.from('pms_guests').upsert(cloudGuestsPayload);
            if (guestErr) {
                console.error("Erreur sync PMS guests Supabase:", guestErr);
                alert("⚠️ Erreur sync PMS guests : " + guestErr.message);
            }
        }
    } else { alert("⚠️ Format error."); }
}

function chargerLiveOrders() {
    const container = document.getElementById('liveOrdersList');
    chargerDonneesLocalStorage();
    
    const todayStr = new Date().toISOString().split('T')[0];
    const activeTodaySlips = cachedSlips.filter(entry => {
        if (!entry.created_at) return false;
        const entryDateStr = new Date(entry.created_at).toISOString().split('T')[0];
        return entryDateStr === todayStr || entry.status === 'pickup_alert';
    });

    activeTodaySlips.sort((a, b) => (parseInt(a.room) || 0) - (parseInt(b.room) || 0));
    const badgeEl = document.getElementById('activeRoomsCountBadge');
    if (badgeEl) badgeEl.innerText = activeTodaySlips.length;

    if (!container) return;
    if (activeTodaySlips.length === 0) {
        container.innerHTML = `<p class="text-xs text-stone-500 text-center py-6 col-span-full">No active room records for today.</p>`;
        return;
    }

    container.innerHTML = '';
    activeTodaySlips.forEach(entry => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'remal-card p-4 rounded-2xl space-y-3 transition cursor-pointer';
        itemDiv.onclick = () => ouvrirModalDetails(entry.id);
        
        let badgeText = 'Hotel Count (Free)';
        let badgeClass = 'bg-amber-950 text-amber-200 border border-amber-800';
        if(entry.count_type === 'quota_extra') {
            badgeText = 'Hotel & Extra'; badgeClass = 'bg-purple-950 text-purple-200 border border-purple-800';
        } else if(entry.count_type === 'guest') {
            badgeText = 'Guest Count'; badgeClass = 'bg-rose-950 text-rose-200 border border-rose-800';
        }

        const dateStr = entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-GB') : '';
        const identifierDisplay = entry.is_spa ? `SPA: ${entry.guest_name} (#${entry.spa_serial || '---'})` : `Room ${entry.room}`;

        itemDiv.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-[#DCA773] text-sm">${identifierDisplay}</span>
                        <span class="text-[9px] font-bold px-2 py-0.5 rounded-md ${badgeClass}">${badgeText}</span>
                    </div>
                    <p class="text-[10px] text-stone-400 mt-1 flex items-center gap-1">📅 ${dateStr} · 👤 ${entry.created_by || 'Staff'}</p>
                    ${entry.note ? `<p class="text-[10px] text-amber-300 mt-1">📝 Note: ${entry.note}</p>` : ''}
                </div>
                <div class="text-right">
                    <p class="text-[11px] text-stone-300 flex items-center gap-1 justify-end font-semibold">📦 ${entry.total_clothes} pcs</p>
                    <p class="font-bold text-[#DCA773] text-sm mt-0.5">${entry.total.toFixed(2)} AED ${entry.photo ? '📸' : ''}</p>
                </div>
            </div>
        `;
        container.appendChild(itemDiv);
    });
}

function printActiveRooms() {
    const pdfBody = document.getElementById('pdfTableBody');
    pdfBody.innerHTML = '';
    
    const todayStr = new Date().toISOString().split('T')[0];
    const activeEntries = cachedSlips.filter(e => {
        if(!e.created_at) return false;
        return new Date(e.created_at).toISOString().split('T')[0] === todayStr;
    });

    if (activeEntries.length === 0) { alert("No active rooms found for today to export."); return; }

    activeEntries.forEach(entry => {
        const tr = document.createElement('tr');
        tr.className = "border-b border-stone-200 text-stone-900";
        tr.innerHTML = `
            <td class="p-2 border border-stone-300 font-bold">${entry.room}</td>
            <td class="p-2 border border-stone-300">${entry.guest_name || 'Guest'}</td>
            <td class="p-2 border border-stone-300 text-center font-bold">${entry.total_clothes} pcs</td>
            <td class="p-2 border border-stone-300 text-stone-600">${entry.note || '-'}</td>
        `;
        pdfBody.appendChild(tr);
    });

    document.getElementById('reportDate').innerText = new Date().toLocaleDateString('fr-FR');
    const printableArea = document.getElementById('printableActiveRooms');
    printableArea.classList.remove('hidden');

    const opt = {
        margin: 10, filename: `Laundry_Roadmap_${todayStr}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(printableArea).save().then(() => { printableArea.classList.add('hidden'); });
}

function afficherListeBordereauxLocal() {
    chargerDonneesLocalStorage();
    const searchVal = document.getElementById('searchRoom').value.toLowerCase().trim();
    const searchDateVal = document.getElementById('searchDate').value;

    let filtered = cachedSlips.filter(entry => {
        const matchRoom = !searchVal || 
            String(entry.room).toLowerCase().includes(searchVal) || 
            String(entry.guest_name || '').toLowerCase().includes(searchVal) ||
            String(entry.spa_serial || '').toLowerCase().includes(searchVal);
        
        let matchDate = true;
        if (searchDateVal) {
            const entryDate = new Date(entry.created_at).toISOString().split('T')[0];
            matchDate = (entryDate === searchDateVal);
        }
        return matchRoom && matchDate;
    });

    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const container = document.getElementById('laundryList');
    if (!container) return;
    
    if (filtered.length === 0) { container.innerHTML = `<p class="text-xs text-stone-500 text-center py-4">No records found.</p>`; return; }

    container.innerHTML = '';
    filtered.forEach(entry => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'p-3.5 bg-[#0f0e0c] rounded-2xl border border-[#2f2820] text-xs flex justify-between items-center cursor-pointer hover:border-[#DCA773] transition'; 
        itemDiv.onclick = () => ouvrirModalDetails(entry.id);
        
        let badgeLabel = 'Hotel';
        let badgeClass = 'bg-amber-950 text-amber-200 border border-amber-800';
        if(entry.count_type === 'quota_extra') {
            badgeLabel = 'Quota+Extra'; badgeClass = 'bg-purple-950 text-purple-200 border border-purple-800';
        } else if(entry.count_type === 'guest') {
            badgeLabel = 'Chargeable'; badgeClass = 'bg-rose-950 text-rose-200 border border-rose-800';
        }
        if(entry.is_spa) {
            badgeLabel = `SPA (#${entry.spa_serial || '---'})`; badgeClass = 'bg-purple-950 text-purple-200 border border-purple-800';
        }

        const titleDisplay = entry.is_spa ? `SPA Sheet #${entry.spa_serial || '---'} — ${entry.guest_name}` : `Room ${entry.room} (${entry.guest_name || 'Guest'})`;

        itemDiv.innerHTML = `
            <div>
                <span class="font-bold text-[#DCA773] text-sm">${titleDisplay}</span>
                <span class="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-md ${badgeClass}">${badgeLabel}</span>
                <div class="text-[10px] text-stone-400 mt-0.5">Date: ${new Date(entry.created_at).toLocaleDateString('fr-FR')}</div>
            </div>
            <div class="text-right font-bold text-stone-200">
                <small class="text-stone-400 font-normal">(${entry.total_clothes} pcs)</small> <span class="text-[#DCA773] text-sm">${entry.total.toFixed(2)} AED</span> ${entry.photo ? '📸' : ''}
            </div>
        `;
        container.appendChild(itemDiv);
    });
}

function exportDatabaseBackup() {
    chargerDonneesLocalStorage();
    if (cachedSlips.length === 0) { alert("⚠️ No records to export."); return; }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cachedSlips, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute("download", `Remal_Laundry_Backup_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importDatabaseBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (Array.isArray(importedData)) {
                if (confirm(`⚠️ Import backup file containing ${importedData.length} records?`)) {
                    cachedSlips = importedData;
                    sauvegarderDonneesLocalStorage();
                    if(supabaseClient) { 
                        const { error } = await supabaseClient.from('laundry_slips').upsert(importedData);
                        if (error) alert("⚠️ Erreur import Supabase : " + error.message);
                    }
                    alert("✅ Backup successfully restored!");
                    afficherListeBordereauxLocal();
                    chargerLiveOrders();
                }
            } else { alert("⚠️ Invalid file format."); }
        } catch (err) { alert("⚠️ Read error."); }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function renderManagementDashboard() {
    chargerDonneesLocalStorage();
    let totalRevenue = 0;
    let totalGarments = 0;
    let statusCounts = { Collected: 0, Washing: 0, Ready: 0, Delivered: 0 };
    let revenueByDate = {};

    cachedSlips.forEach(slip => {
        totalRevenue += (slip.total || 0);
        totalGarments += (slip.total_clothes || 0);
        let st = slip.status || 'Collected';
        if (statusCounts[st] !== undefined) statusCounts[st]++;

        if (slip.created_at) {
            let dStr = slip.created_at.split('T')[0];
            revenueByDate[dStr] = (revenueByDate[dStr] || 0) + (slip.total || 0);
        }
    });

    document.getElementById('kpiRevenue').innerText = `${totalRevenue.toFixed(2)} AED`;
    document.getElementById('kpiOrders').innerText = cachedSlips.length;
    document.getElementById('kpiGarments').innerText = `${totalGarments} pcs`;

    const ctxDoughnut = document.getElementById('statusDoughnutChart').getContext('2d');
    if (doughnutChartInstance) doughnutChartInstance.destroy();

    doughnutChartInstance = new Chart(ctxDoughnut, {
        type: 'doughnut',
        data: {
            labels: ['Collected', 'Washing', 'Ready', 'Delivered'],
            datasets: [{
                data: [statusCounts.Collected, statusCounts.Washing, statusCounts.Ready, statusCounts.Delivered],
                backgroundColor: ['#57534e', '#3b82f6', '#a855f7', '#10b981'], borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, color: '#d6d3d1' } } } }
    });

    const dates = Object.keys(revenueByDate).sort();
    const revenues = dates.map(d => revenueByDate[d]);

    const ctxBar = document.getElementById('revenueBarChart').getContext('2d');
    if (barChartInstance) barChartInstance.destroy();

    barChartInstance = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: dates.length > 0 ? dates : ['No Data'],
            datasets: [{ label: 'Revenue (AED)', data: revenues.length > 0 ? revenues : [0], backgroundColor: '#DCA773', borderRadius: 6 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { ticks: { font: { size: 10 }, color: '#d6d3d1' } },
                x: { ticks: { font: { size: 10 }, color: '#d6d3d1' } }
            }
        }
    });
}

function calculateSpaTotal() {
    let grandTotal = 0;
    const rows = document.querySelectorAll('#spa-laundry-section tbody tr');
    
    rows.forEach(row => {
        const input = row.querySelector('.spa-qty-input');
        if(!input) return;
        const qty = parseInt(input.value) || 0;
        const rate = parseFloat(input.getAttribute('data-rate'));
        const rowAmountCell = row.querySelector('.spa-row-amount');
        
        const rowTotal = qty * rate;
        if(rowAmountCell) rowAmountCell.innerText = rowTotal.toFixed(2);
        grandTotal += rowTotal;
    });
    
    const gtEl = document.getElementById('spa-grand-total');
    if(gtEl) gtEl.innerText = grandTotal.toFixed(2) + " AED";
}

async function validateAndSaveSpaReceipt() {
    const serialNo = document.getElementById('spa-serial-no').value.trim();
    const grandTotalText = document.getElementById('spa-grand-total').innerText;
    const grandTotalValue = parseFloat(grandTotalText) || 0;
    const collectedBy = document.getElementById('spa-collected-by').value.trim();
    const deliveredBy = document.getElementById('spa-delivered-by').value.trim();
    const givenBy = document.getElementById('spa-given-by').value.trim();
    const editingSpaId = document.getElementById('editingSpaId').value;
    
    const colDate = document.getElementById('spa-collection-date').value;
    const colTime = document.getElementById('spa-collection-time').value;
    const delDate = document.getElementById('spa-delivery-date').value;
    const delTime = document.getElementById('spa-delivery-time').value;

    const sigGiven = document.getElementById('canvasGivenBy')?.toDataURL() || null;
    const sigCollected = document.getElementById('canvasCollectedBy')?.toDataURL() || null;
    const sigDelivered = document.getElementById('canvasDeliveredBy')?.toDataURL() || null;

    if (!serialNo) { alert("⚠️ Error: Serial No required."); return false; }
    if (grandTotalValue <= 0) { alert("⚠️ Error: Grand Total must be greater than 0 AED."); return false; }
    if (!collectedBy || !deliveredBy || !givenBy) { alert("⚠️ Error: Please fill all name fields."); return false; }

    let spaItems = {};
    let totalClothes = 0;
    const rows = document.querySelectorAll('#spa-laundry-section tbody tr');
    rows.forEach(row => {
        const input = row.querySelector('.spa-qty-input');
        if(!input) return;
        const qty = parseInt(input.value) || 0;
        if(qty > 0) {
            const itemName = row.querySelector('td').innerText;
            const rate = parseFloat(input.getAttribute('data-rate'));
            spaItems[itemName] = { name: itemName, qty: qty, price: rate };
            totalClothes += qty;
        }
    });

    chargerDonneesLocalStorage();
    let targetRecord = null;

    if (editingSpaId) {
        const index = cachedSlips.findIndex(s => s.id == editingSpaId);
        if (index !== -1) {
            cachedSlips[index] = {
                ...cachedSlips[index],
                is_spa: true, // SPA Sheet
                spa_serial: serialNo, room: `SPA #${serialNo}`, guest_name: givenBy,
                options: { 
                    ...cachedSlips[index].options, collection_date: colDate, collection_time: colTime, 
                    delivery_date: delDate, delivery_time: delTime, collected_by: collectedBy, 
                    delivered_by: deliveredBy, sig_given: sigGiven, sig_collected: sigCollected, sig_delivered: sigDelivered
                },
                items: spaItems, total_clothes: totalClothes, subtotal: grandTotalValue, total: grandTotalValue,
                created_by: currentActiveUser || 'Laundry Plant'
            };
            targetRecord = cachedSlips[index];
        }
        alert(`✅ SPA Receipt #${serialNo} updated successfully!`);
        document.getElementById('editingSpaId').value = '';
    } else {
        targetRecord = {
            id: Date.now(), 
            is_spa: true, // SPA Sheet (séparé du linge standard)
            spa_serial: serialNo, 
            room: `SPA #${serialNo}`,
            guest_name: givenBy, 
            room_typ: 'SPA', 
            agency: 'V Element SPA', 
            count_type: 'guest',
            options: { 
                service_style: 'SPA Daily Sheet', collection_date: colDate, collection_time: colTime, 
                delivery_date: delDate, delivery_time: delTime, collected_by: collectedBy, 
                delivered_by: deliveredBy, sig_given: sigGiven, sig_collected: sigCollected, sig_delivered: sigDelivered
            },
            items: spaItems, total_clothes: totalClothes, subtotal: grandTotalValue, vat: 0, total: grandTotalValue,
            created_by: currentActiveUser || 'Laundry Plant', status: 'Collected',
            created_at: colDate ? `${colDate}T${colTime || '00:00'}:00.000Z` : new Date().toISOString()
        };
        cachedSlips.push(targetRecord);
        alert(`✅ SPA Receipt validated and saved!`);
    }

    sauvegarderDonneesLocalStorage();

    if (supabaseClient && targetRecord) {
        const { error } = await supabaseClient.from('laundry_slips').upsert(targetRecord);
        if (error) {
            console.error("Erreur Supabase SPA :", error);
            alert("⚠️ Erreur Supabase SPA : " + error.message);
        }
    }

    switchMainSection('liveRecord');
    return true;
}

function ouvrirModalDetails(id) {
    selectedIdForModal = id;
    chargerDonneesLocalStorage();
    const entry = cachedSlips.find(e => e.id == id);
    if (!entry) return;

    let badgeText = 'Hotel Count (Free)';
    if(entry.count_type === 'quota_extra') { badgeText = 'Hotel & Extra (Custom Free)'; } 
    else if(entry.count_type === 'guest') { badgeText = 'Guest Count (Full)'; }

    document.getElementById('modalDocTitle').innerText = entry.is_spa ? 'V ELEMENT SPA LAUNDRY SHEET' : 'OFFICIAL LAUNDRY RECEIPT';
    document.getElementById('modalIdentifierLabel').innerText = entry.is_spa ? 'Sheet Serial:' : 'Room:';
    document.getElementById('modalRoomNumDisplay').innerText = entry.is_spa ? `#${entry.spa_serial || entry.room}` : entry.room;
    document.getElementById('modalDate').innerText = `Date: ${new Date(entry.created_at).toLocaleDateString('fr-FR')}`;
    document.getElementById('modalTypeBadgeInline').innerText = entry.is_spa ? 'SPA Record' : badgeText;
    
    const packagingBox = document.getElementById('modalPackagingBox');
    if (entry.is_spa) { packagingBox.classList.add('hidden'); } 
    else {
        packagingBox.classList.remove('hidden');
        document.getElementById('modalPackagingStyle').innerText = entry.options?.service_style || 'F — Folding';
    }

    const agencyBox = document.getElementById('modalAgencyQuotaBox');
    if (entry.guest_name || entry.agency || entry.quota || entry.is_spa) {
        document.getElementById('modalGuestDisplay').innerText = entry.guest_name || 'Unknown';
        document.getElementById('modalTypDisplay').innerText = entry.room_typ || 'DLXR';
        document.getElementById('modalAgencyDisplay').innerText = entry.agency || 'Direct';
        document.getElementById('modalQuotaDisplay').innerText = entry.quota || (entry.is_spa ? 'V Element SPA' : badgeText);
        document.getElementById('modalCreatedByDisplay').innerText = entry.created_by || 'Staff';
        agencyBox.classList.remove('hidden');
    } else { agencyBox.classList.add('hidden'); }

    const spaDetailsBox = document.getElementById('modalSpaDetailsBox');
    if (entry.is_spa && entry.options) {
        document.getElementById('modalCollectedBy').innerText = entry.options.collected_by || '---';
        document.getElementById('modalDeliveredBy').innerText = entry.options.delivered_by || '---';
        document.getElementById('modalColTime').innerText = `${entry.options.collection_date || ''} ${entry.options.collection_time || ''}`;
        document.getElementById('modalDelTime').innerText = `${entry.options.delivery_date || ''} ${entry.options.delivery_time || ''}`;
        
        const imgGiven = document.getElementById('imgSigGiven');
        const imgCollected = document.getElementById('imgSigCollected');
        const imgDelivered = document.getElementById('imgSigDelivered');

        if (entry.options.sig_given) { imgGiven.src = entry.options.sig_given; imgGiven.classList.remove('hidden'); } else { imgGiven.classList.add('hidden'); }
        if (entry.options.sig_collected) { imgCollected.src = entry.options.sig_collected; imgCollected.classList.remove('hidden'); } else { imgCollected.classList.add('hidden'); }
        if (entry.options.sig_delivered) { imgDelivered.src = entry.options.sig_delivered; imgDelivered.classList.remove('hidden'); } else { imgDelivered.classList.add('hidden'); }

        spaDetailsBox.classList.remove('hidden');
    } else { spaDetailsBox.classList.add('hidden'); }

    const tbody = document.getElementById('modalTableBody'); 
    tbody.innerHTML = '';
    
    const itemsObj = entry.items || {};
    Object.keys(itemsObj).forEach(k => {
        const item = itemsObj[k];
        if (!item || !item.name) return;

        let qty = item.qty || 0;
        let freeQty = item.freeQty || 0;
        let chargeableQty = entry.count_type === 'quota_extra' ? (qty - freeQty) : (entry.count_type === 'hotel' ? 0 : qty);
        if(chargeableQty < 0) chargeableQty = 0;

        if (freeQty > 0) {
            const trFree = document.createElement('tr');
            trFree.className = "border-b border-[#2f2820] text-emerald-400";
            trFree.innerHTML = `<td class="p-2">${item.name} (Free Quota)</td><td class="p-2 text-center">${freeQty}</td><td class="p-2 text-right">0.00</td>`;
            tbody.appendChild(trFree);
        }
        if (chargeableQty > 0 || entry.count_type === 'guest' || entry.is_spa || k.startsWith('custom_') || item.price > 0) {
            const effectiveQty = (entry.count_type === 'hotel') ? qty : chargeableQty;
            if (entry.count_type === 'hotel' && qty > 0) {
                const trH = document.createElement('tr');
                trH.className = "border-b border-[#2f2820]";
                trH.innerHTML = `<td class="p-2">${item.name}</td><td class="p-2 text-center">${qty}</td><td class="p-2 text-right">0.00</td>`;
                tbody.appendChild(trH);
            } else if (effectiveQty > 0 || entry.count_type === 'guest' || entry.is_spa) {
                const displayQty = (entry.count_type === 'quota_extra') ? chargeableQty : qty;
                if (displayQty > 0 || entry.is_spa) {
                    const trChg = document.createElement('tr');
                    trChg.className = "border-b border-[#2f2820]";
                    trChg.innerHTML = `<td class="p-2">${item.name} ${entry.count_type === 'quota_extra' ? '(Extra)' : ''}</td><td class="p-2 text-center">${displayQty}</td><td class="p-2 text-right">${(displayQty * (item.price || 0)).toFixed(2)}</td>`;
                    tbody.appendChild(trChg);
                }
            }
        }
    });

    document.getElementById('modalClothesCount').innerText = `${entry.total_clothes} pieces`;
    document.getElementById('modalTotal').innerText = `${entry.total.toFixed(2)} AED`;

    const noteBox = document.getElementById('modalNoteBox');
    const noteText = document.getElementById('modalNoteText');
    if (entry.note && entry.note.trim() !== '') {
        noteText.innerText = entry.note;
        noteBox.classList.remove('hidden');
    } else { noteBox.classList.add('hidden'); }

    const pContainer = document.getElementById('modalPhotoContainer');
    if (entry.photo) {
        pContainer.innerHTML = `<div class="border-t border-[#2f2820] pt-2 mt-2"><p class="font-bold text-[10px] mb-1 text-stone-400">Proof Photo:</p><img src="${entry.photo}" class="w-full max-h-36 object-cover rounded-xl border border-[#2f2820]"></div>`;
    } else { pContainer.innerHTML = ''; }

    const whatsappMsg = encodeURIComponent(`*REMAL HOTEL - LAUNDRY SLIP*\n*Identifier:* ${entry.room}\n*Guest/Staff:* ${entry.guest_name || 'Guest'}\n*Total Pieces:* ${entry.total_clothes} pcs\n*Grand Total:* ${entry.total.toFixed(2)} AED${entry.note ? `\n*Note:* ${entry.note}` : ''}`);
    document.getElementById('btnWhatsappShare').href = `https://wa.me/?text=${whatsappMsg}`;

    document.getElementById('detailModal').classList.remove('hidden');
}

function modifierBordereauActuel() {
    if (!selectedIdForModal) return;
    chargerDonneesLocalStorage();
    const entry = cachedSlips.find(e => e.id == selectedIdForModal);
    if (!entry) return;

    fermerModal();

    if (entry.is_spa) {
        switchMainSection('spa');
        document.getElementById('editingSpaId').value = entry.id;
        document.getElementById('spaFormTitleLabel').innerText = `✏️ Edit SPA Receipt #${entry.spa_serial}`;

        document.getElementById('spa-serial-no').value = entry.spa_serial || '';
        document.getElementById('spa-given-by').value = entry.guest_name || '';
        document.getElementById('spa-collected-by').value = entry.options?.collected_by || '';
        document.getElementById('spa-delivered-by').value = entry.options?.delivered_by || '';
        if(entry.options?.collection_date) document.getElementById('spa-collection-date').value = entry.options.collection_date;
        if(entry.options?.collection_time) document.getElementById('spa-collection-time').value = entry.options.collection_time;
        if(entry.options?.delivery_date) document.getElementById('spa-delivery-date').value = entry.options.delivery_date;
        if(entry.options?.delivery_time) document.getElementById('spa-delivery-time').value = entry.options.delivery_time;

        const rows = document.querySelectorAll('#spa-laundry-section tbody tr');
        rows.forEach(row => {
            const input = row.querySelector('.spa-qty-input');
            const itemName = row.querySelector('td').innerText;
            if (input && entry.items[itemName]) { input.value = entry.items[itemName].qty; } 
            else if (input) { input.value = ''; }
        });
        calculateSpaTotal();
    } else {
        switchMainSection('newRecord');
        document.getElementById('editingRecordId').value = entry.id;
        document.getElementById('lblFormTitle').innerText = `✏️ Edit Record for Room ${entry.room}`;
        document.getElementById('roomNumber').value = entry.room;
        onRoomNumberInput();

        selectCountType(entry.count_type || 'hotel');
        const styleVal = entry.options?.service_style;
        if (styleVal) {
            const radio = document.querySelector(`input[name="foldingOption"][value="${styleVal}"]`);
            if (radio) radio.checked = true;
        }

        document.getElementById('recordOptionalNote').value = entry.note || '';
        if (entry.note && entry.note.trim() !== '') {
            const notesDetails = document.getElementById('detailsGarmentNotes');
            if (notesDetails) notesDetails.open = true;
        }

        cart = {};
        let customIndex = 0;
        let hasCustomItems = false;
        if (entry.items) {
            for (const [k, v] of Object.entries(entry.items)) {
                if (k.startsWith('custom_')) {
                    if (customIndex < 3) {
                        document.getElementById(`customName${customIndex}`).value = v.name;
                        document.getElementById(`customPrice${customIndex}`).value = v.price;
                        document.getElementById(`customQty${customIndex}`).value = v.qty;
                        customIndex++;
                        hasCustomItems = true;
                    }
                } else { cart[k] = { ...v }; }
            }
        }

        if (hasCustomItems) {
            const customDetails = document.getElementById('detailsCustomItems');
            if (customDetails) customDetails.open = true;
        }

        renderItems();
        calculateGlobalTotals();
    }
}

function genererPDF() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR');
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('pdfExportTimestamp').innerText = `Exporté le : ${dateStr} à ${timeStr}`;

    const element = document.getElementById('pdfExportArea');
    const roomVal = document.getElementById('modalRoomNumDisplay').innerText.replace('#','');
    
    const opt = {
        margin: [10, 10, 10, 10], 
        filename: `Laundry_Slip_${roomVal}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, windowWidth: 794 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
}

function fermerModal() { document.getElementById('detailModal').classList.add('hidden'); selectedIdForModal = null; }

async function supprimerBordereauActuel() {
    if (!selectedIdForModal) return;
    if (confirm(`Delete this record?`)) {
        chargerDonneesLocalStorage();
        cachedSlips = cachedSlips.filter(e => e.id != selectedIdForModal);
        sauvegarderDonneesLocalStorage();

        if (supabaseClient) {
            const { error } = await supabaseClient.from('laundry_slips').delete().eq('id', selectedIdForModal);
            if (error) alert("⚠️ Erreur suppression Supabase : " + error.message);
        }

        fermerModal();
        chargerLiveOrders();
        if(!document.getElementById('sectionPdfList').classList.contains('hidden')) {
            afficherListeBordereauxLocal();
        }
    }
}
