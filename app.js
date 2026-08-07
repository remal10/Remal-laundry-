:root {
    --bg-dark: #0f0e0c;
    --bg-card: #181614;
    --bg-card-hover: #211e1a;
    --text-gold: #DCA773;
    --border-gold: #2f2820;
    --font-family: 'Plus Jakarta Sans', sans-serif;
    --font-serif: 'Playfair Display', serif;
}
body { 
    font-family: var(--font-family); 
    background-color: var(--bg-dark); 
    color: #f3f4f6; 
    -webkit-tap-highlight-color: transparent; 
}
.font-serif-luxury { font-family: var(--font-serif); }
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }

.remal-card { 
    background: var(--bg-card); 
    border: 1px solid var(--border-gold); 
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); 
}
.remal-input { 
    background: #0f0e0c; 
    border: 1px solid var(--border-gold); 
    color: #f3f4f6; 
    transition: border-color 0.2s;
}
.remal-input:focus { 
    border-color: #DCA773; 
    outline: none; 
}
.laundry-row { background-color: rgba(40, 167, 69, 0.12) !important; }
.badge-green { color: #5cb85c; font-weight: bold; background-color: rgba(40, 167, 69, 0.2); padding: 3px 8px; border-radius: 6px; border: 1px solid rgba(92, 184, 92, 0.3); display: inline-block; }
.badge-chargeable { color: #f87171; font-weight: bold; background-color: rgba(248, 113, 113, 0.15); padding: 3px 8px; border-radius: 6px; border: 1px solid rgba(248, 113, 113, 0.3); display: inline-block; }

button, input, select, textarea { touch-action: manipulation; }

input[type="date"]::-webkit-calendar-picker-indicator,
input[type="time"]::-webkit-calendar-picker-indicator {
    filter: invert(0.8) sepia(1) saturate(3) hue-rotate(340deg);
    cursor: pointer;
}

details summary::-webkit-details-marker { display: none; }
details summary { list-style: none; }

.printable-page {
    box-sizing: border-box !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
}

@media print {
    body { background-color: #ffffff !important; color: #000000 !important; margin: 0 !important; padding: 0 !important; }
    .no-print { display: none !important; }
    .printable-page { 
        background-color: #ffffff !important; 
        color: #000000 !important; 
        border: none !important; 
        box-shadow: none !important; 
        padding: 10mm !important; 
        width: 100% !important;
        max-width: 100% !important;
    }
}
