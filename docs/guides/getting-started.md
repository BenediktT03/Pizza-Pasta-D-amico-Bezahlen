# EATECH V3.0 Getting Started Guide

**Willkommen bei EATECH V3.0** - Dem revolutionären Multi-Tenant Foodtruck Bestellsystem für die Schweiz!

**Version:** 3.0.0  
**Launch:** 1. August 2025  
**Support:** [benedikt@thomma.ch](mailto:benedikt@thomma.ch)

---

## 🎯 Was ist EATECH?

EATECH revolutioniert die Schweizer Foodtruck-Branche durch eine All-in-One PWA-Lösung. Keine Apps, keine Downloads - nur pure Effizienz für Foodtruck-Betreiber und ihre Kunden.

### 🌟 Key Benefits
- **100% PWA** - Funktioniert auf allen Geräten ohne App Store
- **Offline-First** - Arbeitet auch ohne Internet
- **Multi-Language** - DE/FR/IT/EN + Schweizerdeutsch Support
- **KI-Powered** - Intelligente Automatisierung und Optimierung
- **Swiss Made** - DSGVO/DSG konform, lokale Server

---

## 📋 Inhaltsverzeichnis

1. [Quick Start - 5 Minuten Setup](#quick-start---5-minuten-setup)
2. [Account Setup](#account-setup)
3. [First Steps](#first-steps)
4. [Menu Configuration](#menu-configuration)
5. [Payment Setup](#payment-setup)
6. [Staff Training](#staff-training)
7. [Go Live Checklist](#go-live-checklist)
8. [Support & Help](#support--help)

---

## ⚡ Quick Start - 5 Minuten Setup

### Schritt 1: Account erstellen (2 Min)
```bash
# Registrierung über
https://app.eatech.ch/register

# Oder direkt kontaktieren
E-Mail: benedikt@thomma.ch
Telefon: [Wird noch bekannt gegeben]
```

### Schritt 2: Basis-Konfiguration (2 Min)
1. **Foodtruck-Name** eingeben
2. **Standort** definieren (Schweiz)
3. **Öffnungszeiten** festlegen
4. **Sprache** wählen (DE/FR/IT/EN)

### Schritt 3: Erstes Produkt anlegen (1 Min)
```json
{
  "name": "Classic Burger",
  "price": 16.90,
  "category": "Hauptgericht",
  "description": "Saftiger Rindfleisch-Burger"
}
```

**🎉 Fertig! Ihr Foodtruck ist online und bereit für Bestellungen.**

---

## 🏗️ Account Setup

### 1. Registrierung

Besuchen Sie [app.eatech.ch/register](https://app.eatech.ch/register) und wählen Sie Ihren Plan:

| Plan | Preis | Features |
|------|-------|----------|
| **Free** | CHF 0/Monat | Bis 50 Bestellungen/Monat |
| **Basic** | CHF 29/Monat | Bis 200 Bestellungen/Monat |
| **Premium** | CHF 49/Monat | Unbegrenzt + KI-Features |
| **Enterprise** | Custom | White Label + API |

### 2. Verifizierung

```bash
# E-Mail Verifizierung
✅ Klicken Sie auf den Link in Ihrer E-Mail

# Telefon Verifizierung (Schweizer Nummer erforderlich)
📱 Format: +41 XX XXX XX XX
💬 SMS mit 6-stelligem Code
```

### 3. Business Registration

```json
{
  "businessName": "Burger Paradise",
  "registrationNumber": "CHE-123.456.789",
  "vatNumber": "CHE-123.456.789 MWST",
  "address": {
    "street": "Bahnhofstrasse 1",
    "city": "Zürich",
    "zip": "8001",
    "canton": "ZH"
  },
  "contact": {
    "email": "info@burgerparadise.ch",
    "phone": "+41791234567"
  }
}
```

---

## 🚀 First Steps

### Dashboard Overview

Nach dem Login sehen Sie Ihr **Dashboard** mit:

```
📊 Live Metrics
├── Heute: 0 Bestellungen, CHF 0 Umsatz
├── Diese Woche: 0 Bestellungen
├── Wartezeit: 0 Min
└── Status: 🔴 Offline

📱 Quick Actions
├── ➕ Neues Produkt
├── 📱 QR-Code generieren
├── 📊 Statistiken
└── ⚙️ Einstellungen
```

### 1. Grundeinstellungen konfigurieren

#### Tenant-Einstellungen
```javascript
// Öffnungszeiten definieren
const operatingHours = {
  monday: { open: "11:00", close: "21:00" },
  tuesday: { open: "11:00", close: "21:00" },
  wednesday: { open: "11:00", close: "21:00" },
  thursday: { open: "11:00", close: "21:00" },
  friday: { open: "11:00", close: "22:00" },
  saturday: { open: "11:00", close: "22:00" },
  sunday: { closed: true }
};

// Sprach-Einstellungen
const languages = {
  primary: "de",
  supported: ["de", "fr", "it", "en"],
  schweizerdeutsch: true
};

// Währung & Steuern
const financial = {
  currency: "CHF",
  taxRate: 7.7,
  taxIncluded: true,
  roundingRule: "0.05" // Schweizer Rappen-Rundung
};
```

#### Branding anpassen
```css
/* Ihr Foodtruck-Design */
:root {
  --primary-color: #FF6B35;    /* Ihr Hauptfarbe */
  --secondary-color: #004E89;  /* Sekundärfarbe */
  --accent-color: #F7931E;     /* Akzentfarbe */
}
```

### 2. Logo & Assets hochladen

```bash
# Unterstützte Formate
Logo: PNG, JPG, SVG (max. 2MB)
Grösse: 512x512px (quadratisch empfohlen)
Hintergrund: Transparent

# Upload via Dashboard
Gehe zu: Einstellungen > Branding > Logo hochladen
```

---

## 🍔 Menu Configuration

### Produktkategorien erstellen

```json
{
  "categories": [
    {
      "id": "hauptgerichte",
      "name": {
        "de": "Hauptgerichte",
        "fr": "Plats principaux",
        "it": "Piatti principali",
        "en": "Main Dishes"
      },
      "sortOrder": 1
    },
    {
      "id": "beilagen", 
      "name": {
        "de": "Beilagen",
        "fr": "Accompagnements",
        "it": "Contorni", 
        "en": "Sides"
      },
      "sortOrder": 2
    },
    {
      "id": "getraenke",
      "name": {
        "de": "Getränke",
        "fr": "Boissons",
        "it": "Bevande",
        "en": "Drinks"
      },
      "sortOrder": 3
    }
  ]
}
```

### Erstes Produkt anlegen

#### Basis-Produkt
```json
{
  "name": {
    "de": "Classic Burger",
    "fr": "Burger Classique",
    "it": "Burger Classico",
    "en": "Classic Burger"
  },
  "description": {
    "de": "200g Rindfleisch, Salat, Tomate, Zwiebel, Käse",
    "fr": "200g de bœuf, salade, tomate, oignon, fromage",
    "it": "200g di manzo, lattuga, pomodoro, cipolla, formaggio",
    "en": "200g beef, lettuce, tomato, onion, cheese"
  },
  "category": "hauptgerichte",
  "pricing": {
    "basePrice": 16.90,
    "currency": "CHF",
    "taxRate": 7.7,
    "cost": 5.50
  }
}
```

#### Varianten hinzufügen
```json
{
  "variants": [
    {
      "name": { "de": "Klein (150g)", "en": "Small (150g)" },
      "price": 14.90,
      "isDefault": false
    },
    {
      "name": { "de": "Normal (200g)", "en": "Regular (200g)" },
      "price": 16.90,
      "isDefault": true
    },
    {
      "name": { "de": "Gross (300g)", "en": "Large (300g)" },
      "price": 19.90,
      "isDefault": false
    }
  ]
}
```

#### Modifier-Gruppen
```json
{
  "modifierGroups": [
    {
      "name": { "de": "Fleisch wählen", "en": "Choose Meat" },
      "required": true,
      "min": 1,
      "max": 1,
      "options": [
        {
          "name": { "de": "Rindfleisch", "en": "Beef" },
          "price": 0,
          "isDefault": true
        },
        {
          "name": { "de": "Poulet", "en": "Chicken" },
          "price": 0
        },
        {
          "name": { "de": "Veggie (Beyond Meat)", "en": "Veggie" },
          "price": 2.00
        }
      ]
    },
    {
      "name": { "de": "Extras", "en": "Extras" },
      "required": false,
      "min": 0,
      "max": 5,
      "options": [
        {
          "name": { "de": "Bacon", "en": "Bacon" },
          "price": 3.50
        },
        {
          "name": { "de": "Extra Käse", "en": "Extra Cheese" },
          "price": 2.00
        },
        {
          "name": { "de": "Avocado", "en": "Avocado" },
          "price": 3.00
        }
      ]
    }
  ]
}
```

### Inventory Management

```javascript
// Lagerbestand verwalten
const inventory = {
  trackInventory: true,
  quantity: 50,
  lowStockThreshold: 10,
  autoDisable: true, // Bei 0 automatisch deaktivieren
  notifications: {
    lowStock: true,
    outOfStock: true
  }
};

// Supplier Information
const supplier = {
  name: "Metro AG",
  contact: "Hans Müller",
  phone: "+41441234567",
  email: "bestellung@metro.ch",
  leadTime: 2 // Tage
};
```

---

## 💳 Payment Setup

### 1. Stripe Integration (Empfohlen)

```bash
# Stripe Account erstellen
1. Besuchen Sie: https://dashboard.stripe.com/register
2. Verifizieren Sie Ihr Schweizer Business
3. Kopieren Sie die API Keys

# In EATECH einfügen
Gehe zu: Einstellungen > Zahlungen > Stripe
Publishable Key: pk_live_...
Secret Key: sk_live_...
```

### 2. Twint Integration

```json
{
  "twint": {
    "merchantId": "M123456",
    "apiKey": "[Erhalten von Twint]",
    "environment": "production",
    "enabled": true,
    "supportedTransactions": [
      "payment",
      "refund"
    ]
  }
}
```

### 3. Cash Management

```javascript
// Bargeld-Handling
const cashSettings = {
  enabled: true,
  changeMoney: 200.00, // CHF Wechselgeld im Register
  denominations: [
    { value: 0.05, quantity: 100 },
    { value: 0.10, quantity: 50 },
    { value: 0.20, quantity: 50 },
    { value: 0.50, quantity: 40 },
    { value: 1.00, quantity: 30 },
    { value: 2.00, quantity: 20 },
    { value: 5.00, quantity: 20 },
    { value: 10.00, quantity: 10 },
    { value: 20.00, quantity: 10 },
    { value: 50.00, quantity: 5 },
    { value: 100.00, quantity: 2 }
  ],
  roundingRules: {
    cash: "0.05", // Auf 5 Rappen runden
    card: "0.01"  // Exakt
  }
};
```

### 4. Payment Methods Configuration

```json
{
  "paymentMethods": {
    "cash": {
      "enabled": true,
      "minAmount": 0,
      "maxAmount": 500
    },
    "card": {
      "enabled": true,
      "processor": "stripe",
      "minAmount": 2.00,
      "maxAmount": 1000,
      "contactless": true
    },
    "twint": {
      "enabled": true,
      "minAmount": 1.00,
      "maxAmount": 500
    }
  }
}
```

---

## 👥 Staff Training

### 1. Rollen definieren

```json
{
  "roles": [
    {
      "name": "Besitzer",
      "permissions": ["all"]
    },
    {
      "name": "Manager", 
      "permissions": [
        "orders:manage",
        "products:manage",
        "staff:manage",
        "analytics:view"
      ]
    },
    {
      "name": "Küche",
      "permissions": [
        "orders:view",
        "orders:update_status",
        "kitchen:manage"
      ]
    },
    {
      "name": "Verkauf",
      "permissions": [
        "orders:create",
        "orders:view",
        "payments:process"
      ]
    }
  ]
}
```

### 2. Staff Accounts erstellen

```javascript
// Neuen Mitarbeiter hinzufügen
const newStaff = {
  name: "Anna Müller",
  email: "anna@burgerparadise.ch",
  phone: "+41791234568",
  role: "Küche",
  pin: "1234", // 4-stellige PIN für POS
  schedule: {
    monday: { start: "11:00", end: "19:00" },
    tuesday: { start: "11:00", end: "19:00" },
    wednesday: { off: true },
    // ...
  }
};
```

### 3. Training Materialien

#### Kitchen Display System (KDS)
```
📱 Tablet in der Küche zeigt:
├── 🔥 Neue Bestellungen (rot)
├── ⏱️ In Bearbeitung (gelb)  
├── ✅ Fertig (grün)
└── 📊 Wartezeiten

🎮 Bedienung:
- Antippen = Status ändern
- Wischen = Details anzeigen
- Doppelt tippen = Notizen hinzufügen
```

#### Order Management
```
📋 Bestellablauf:
1️⃣ Bestellung eingeht → 🔔 Benachrichtigung
2️⃣ Bestätigen → ⏱️ Timer startet
3️⃣ Zubereitung → 👨‍🍳 Status "Preparing"
4️⃣ Fertig → 📢 Kunde benachrichtigen
5️⃣ Übergabe → ✅ Abschließen

⚡ Shortcuts:
- [F1] = Neue Bestellung
- [F2] = Status ändern
- [F3] = Notizen
- [F4] = Storno
```

### 4. Mobile App Training

```bash
# PWA Installation (für Staff)
📱 iPhone:
1. Safari öffnen
2. app.eatech.ch/admin öffnen  
3. "Zum Home-Bildschirm" hinzufügen

📱 Android:
1. Chrome öffnen
2. app.eatech.ch/admin öffnen
3. "App installieren" Banner

✨ Funktioniert offline!
```

---

## ☑️ Go Live Checklist

### Pre-Launch (1 Woche vorher)

```bash
# Business Setup
☐ Business-Registrierung verifiziert
☐ Steuer-Nummern korrekt
☐ Bank-Verbindung getestet
☐ Versicherung abgeklärt

# Technical Setup  
☐ Alle Produkte angelegt
☐ Preise geprüft
☐ Fotos hochgeladen (min. 1 pro Produkt)
☐ Öffnungszeiten konfiguriert
☐ Payment Methods getestet
☐ Staff Accounts erstellt
☐ Tablet/POS eingerichtet

# Legal Compliance
☐ Datenschutzerklärung
☐ AGB definiert
☐ Impressum vollständig
☐ HACCP Zertifikat
☐ Lebensmittel-Bewilligung
```

### Launch Day

```bash
# Morning Checklist (Vor Öffnung)
☐ System Status prüfen: status.eatech.ch
☐ Internet-Verbindung testen
☐ Tablets geladen und funktional
☐ Payment Terminal bereit
☐ Wechselgeld gezählt
☐ Lager aufgefüllt
☐ Staff eingeloggt

# Erste Bestellung testen
☐ Test-Bestellung über QR-Code
☐ Payment Flow durchgehen
☐ Kitchen Display prüfen
☐ Kunde-Benachrichtigung testen

# Go Live! 
☐ Status auf "Online" setzen
☐ Social Media Post
☐ QR-Codes aufstellen
☐ Team über Launch informieren
```

### Post-Launch (Erste Woche)

```bash
# Daily Monitoring
☐ Bestellungen überprüfen
☐ Kundenfeedback sammeln
☐ System-Performance checken
☐ Staff Feedback einholen

# Weekly Review
☐ Analytics auswerten
☐ Beliebte Produkte identifizieren
☐ Preise optimieren (KI-Empfehlungen)
☐ Process Improvements

# Support
☐ Bei Problemen: benedikt@thomma.ch
☐ Feature Requests dokumentieren  
☐ Training Needs identifizieren
```

---

## 🎯 Success Metrics (Erste 30 Tage)

### Week 1 Ziele
```
📊 Minimale Ziele:
├── 5+ Bestellungen/Tag
├── 95%+ Uptime
├── <2 Min Bestellzeit
└── 0 kritische Fehler

🎯 Optimale Ziele:
├── 15+ Bestellungen/Tag  
├── 99.9% Uptime
├── <1 Min Bestellzeit
└── 4.5+ Kundenbewertung
```

### Month 1 Ziele
```
📈 Growth Targets:
├── 200+ Total Orders
├── CHF 3000+ Revenue  
├── 50+ Unique Customers
├── 30%+ Repeat Rate

💡 Optimierungen:
├── A/B Test Preise
├── Menu Optimierung (KI)
├── Staff Effizienz +20%
└── Customer Satisfaction 4.5+
```

---

## 🆘 Support & Help

### 1. Immediate Help

```bash
# Notfall-Hotline (24/7)
📞 Telefon: [Wird noch bekannt gegeben]
📧 E-Mail: support@eatech.ch
💬 Live Chat: app.eatech.ch/support

# System Status
🔗 status.eatech.ch
- Echtzeit System-Status
- Wartungsfenster
- Incident Reports
```

### 2. Knowledge Base

```bash
# Documentation Hub
📚 docs.eatech.ch
├── 🚀 Getting Started
├── 📖 User Guides
├── 🔧 API Documentation
├── 💡 Best Practices
├── ❓ FAQ
└── 🎥 Video Tutorials

# Community
💬 Discord: [Coming Soon]
📱 WhatsApp Gruppe: [Invite Only]
🐦 Twitter: @eatech_ch
```

### 3. Training Resources

```bash
# Video Academy
🎥 academy.eatech.ch
├── Setup Walkthrough (15 Min)
├── Daily Operations (10 Min)
├── Advanced Features (20 Min)
├── Troubleshooting (5 Min)
└── Success Stories (Various)

# Live Training Sessions
📅 Jeden Dienstag 14:00-15:00
🔗 Zoom Link in App
📋 Q&A Session
🎯 Hands-on Practice
```

### 4. Success Manager

```bash
# Persönlicher Success Manager (Premium+)
👤 Dedicated Account Manager
📞 Monatliche Check-ins
📊 Performance Reviews  
💡 Custom Optimizations
🎯 Growth Planning

# Kontakt für Premium Kunden
📧 success@eatech.ch
📱 WhatsApp: [Premium Support Number]
```

---

## 🚀 Was kommt als nächstes?

### Q2 2025 - Neue Features
```
🗣️ Voice Commerce
├── "Hey EATECH" Wake Word
├── Natürliche Sprachbestellungen
├── Mehrsprachige Unterstützung
└── Schweizerdeutsch Support

🤖 Advanced AI  
├── Automatische Preisoptimierung
├── Demand Forecasting
├── Customer Segmentation
└── Predictive Analytics

🎪 Event Management
├── Festival Integration
├── Multi-Location Events
├── Revenue Sharing
└── Live Analytics
```

### Q3 2025 - Platform Expansion
```
🌍 Geographic Expansion
├── Österreich Support
├── Deutschland Support
├── EU Compliance
└── Multi-Currency

🏢 Enterprise Features
├── Chain Management
├── Franchise Tools
├── White Label Solutions
└── Advanced Reporting
```

---

## 📞 Kontakt & Support

### Gründer & CEO
```
👤 Benedikt Thomma
📧 benedikt@thomma.ch
🏢 EATECH Switzerland
📍 Schweiz
```

### Technischer Support
```
📧 support@eatech.ch
📞 [Wird noch bekannt gegeben]
🕐 Montag-Freitag: 08:00-18:00
🕐 Wochenende: 10:00-16:00
```

### Sales & Partnerships
```
📧 sales@eatech.ch
💼 Partnerships: partners@eatech.ch
🎯 Enterprise: enterprise@eatech.ch
```

---

## 🎉 Willkommen bei EATECH!

Sie sind jetzt Teil der EATECH-Familie und der Revolution im Schweizer Foodtruck-Business. Mit dieser Anleitung sind Sie bestens gerüstet für Ihren erfolgreichen Start.

**Bei Fragen stehen wir Ihnen jederzeit zur Verfügung!**

---

*Last Updated: Januar 2025 - EATECH V3.0*  
*© 2025 EATECH Switzerland. Made with ❤️ in Switzerland.*