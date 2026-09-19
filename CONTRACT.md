# 🔒 CONTRAT D'INTERFACE — STAFF ↔ GUEST

> **Ce document est la référence absolue pour toute modification.**
> **Toute modification du payload Supabase DOIT respecter ce contrat.**

---

## 📊 1. Vue d'ensemble

Deux applications communiquent via **Supabase** :

| Application | Rôle | URL |
|---|---|---|
| **Guest Portal** | Interface client (chambre) | `[guest-app-url]` |
| **Laundry OS (Staff)** | Interface réception | `remal-laundry.vercel.app` |

**Communication :** Realtime + Polling fallback (8 secondes)

---

## 🗄️ 2. Tables Supabase

### **Table `guest_laundry_requests`** (partagée)

| Colonne | Type | Écrit par Guest | Écrit par Staff | Valeurs autorisées |
|---|---|---|---|---|
| `id` | UUID | auto | auto | — |
| `room_number` | text | ✅ | ✅ | `"103"`, `"SPA #0023"` |
| `guest_name` | text | ✅ | ✅ | Nom du PMS |
| `pms_quota` | text | ✅ | ✅ | `"05 PIECES LAU DAILY"`, `"Chargeable"`, `"Standard"` |
| `extra_charged` | bool | ✅ | ✅ | `true` / `false` |
| `service_type` | text | ✅ | ✅ | Voir liste ci-dessous ⚠️ |
| `items` | jsonb | ✅ | ✅ | Voir format ci-dessous ⚠️ |
| `total_pieces` | int | ✅ | ✅ | Nombre entier |
| `subtotal` | numeric | ✅ | ✅ | Nombre décimal |
| `vat` | numeric | ✅ | ✅ | Nombre décimal |
| `grand_total` | numeric | ✅ | ✅ | Nombre décimal |
| `special_notes` | text | ✅ | ✅ | Texte libre ou `"None"` |
| `status` | text | ✅ (`Collected`) | ✅ | Voir liste ci-dessous ⚠️ |
| `created_by` | text | ❌ **absent** | ✅ `"Staff Laundry OS"` | — |
| `accepted_policy` | bool | ✅ `true` | ✅ `true` | — |
| `created_at` | timestamptz | auto | auto | ISO 8601 |
| `updated_at` | timestamptz | auto | auto | ISO 8601 |

### **Table `pms_guests`** (PMS)

| Colonne | Type | Écrit par Staff | Lu par Guest |
|---|---|---|---|
| `room` | text | ✅ | ✅ (vérification identité) |
| `guest_name` | text | ✅ | ✅ |
| `room_typ` | text | ✅ | ✅ |
| `arrival` | text | ✅ | ✅ |
| `departure` | text | ✅ | ✅ |
| `agency` | text | ✅ | ✅ |
| `quota_text` | text | ✅ | ✅ |
| `is_chargeable` | bool | ✅ | ✅ |

### **Table `laundry_staff`** (Auth)

| Colonne | Type | Utilisé par |
|---|---|---|
| `id` | UUID | Staff (login) |
| `pin_code` | text | Staff (login) |
| `name` | text | Staff (indicateur) |
| `role` | text | Staff |
| `is_active` | bool | Staff |

---

## ⚠️ 3. Valeurs EXACTES autorisées

### **Champ `status`** (CRITIQUE)

| Valeur | Sens | Visible Guest ? |
|---|---|---|
| `Collected` | Collecté | ✅ Oui (< 24h) |
| `Washing` | En lavage | ✅ Oui (< 24h) |
| `Ready` | Prêt | ✅ Oui (< 24h) |
| `Delivered` | Livré | ✅ Oui (< 8h après livraison) |
| `Pending` | En attente | ✅ Oui (< 24h) |
| `In Progress` | En cours | ✅ Oui (< 24h) |
| `Completed` | Terminé | ✅ Oui (< 8h) |
| `pickup_alert` | Demande Guest | ✅ Oui (staff uniquement) |

**❌ NE PAS INVENTER D'AUTRES VALEURS.**

### **Champ `service_type`**

**Valeurs GUEST (envoyées par le portail client) :**
- `"Laundry Collection"`
- `"Dry Cleaning"`
- `"Pressing Only"`
- `"Extra Hangers"`
- `"On Hanger"`
- `"Remove the Stains"`
- `"Urgent"`

**Valeurs STAFF (envoyées par Laundry OS) :**
- `"F — Folding"`
- `"H/F — Hanger/Folding"`
- `"S — Single"`
- `"SPA Daily Sheet"`
- `"Laundry Collection"` (fallback)

**→ Les deux listes sont indépendantes. Chacune doit rester intacte.**

### **Format `items`** (JSONB)

```json
[
  {
    "name": "Shirt",
    "category": "GENTLEMEN",
    "quantity": 5,
    "free_quantity": 2,
    "extra_quantity": 3,
    "unit_price": 22,
    "total_price": 66
  }
]
