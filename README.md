# 🍕 Pizza Restaurant Web-App

Eine vollständige Bestelllösung für Pizza-Restaurants mit QR-Code-Bestellung, Echtzeit-Updates und Zahlungsintegration.

## 🚀 Features

- **QR-Code Bestellung**: Kunden scannen Code am Tisch
- **Echtzeit Admin-Panel**: Live-Updates für neue Bestellungen
- **Zahlungsoptionen**: Stripe, TWINT, Barzahlung
- **Responsive Design**: Funktioniert auf allen Geräten
- **Kostenlos hostbar**: Firebase Hosting und Database
- **Sound-Benachrichtigungen**: Für neue Bestellungen

## 📋 Setup-Anleitung

### 1. Firebase Projekt erstellen

1. Gehe zu [Firebase Console](https://console.firebase.google.com/)
2. Klicke "Projekt hinzufügen"
3. Projektname eingeben (z.B. "pizza-restaurant-app")
4. Google Analytics optional
5. Projekt erstellen

### 2. Firebase Services konfigurieren

#### Realtime Database:
1. Im Firebase-Menü: "Realtime Database"
2. "Datenbank erstellen" → "Im Testmodus starten"
3. Region: Europe-west1 (Frankfurt)

#### Hosting:
1. Im Firebase-Menü: "Hosting"
2. "Erste Schritte" → Domain notieren

#### Web-App registrieren:
1. Projekt-Übersicht → "App hinzufügen" → Web (</> Symbol)
2. App-Name eingeben
3. Firebase Hosting aktivieren
4. **Config-Daten kopieren!**

### 3. Stripe Account setup

1. Account erstellen auf [stripe.com](https://stripe.com)
2. Dashboard → "Entwickler" → "API-Schlüssel"
3. **Publishable Key kopieren** (pk_test_... für Test)

### 4. Projekt-Setup

```bash
# Repository klonen oder Dateien erstellen
mkdir pizza-restaurant
cd pizza-restaurant

# Firebase CLI installieren
npm install -g firebase-tools

# Firebase Login
firebase login

# Projekt initialisieren
firebase init

# Hosting und Database auswählen
# Existing project wählen
# public/ als public directory
# Single-page app: Yes
# GitHub deployment: No
```

### 5. Konfiguration anpassen

**In allen HTML-Dateien (index.html, admin.html, success.html):**

```javascript
const firebaseConfig = {
    apiKey: "DEIN_API_KEY",
    authDomain: "DEIN_PROJECT_ID.firebaseapp.com", 
    databaseURL: "https://DEIN_PROJECT_ID-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "DEIN_PROJECT_ID",
    storageBucket: "DEIN_PROJECT_ID.appspot.com",
    messagingSenderId: "DEINE_SENDER_ID",
    appId: "DEINE_APP_ID"
};

// Stripe Publishable Key
const stripe = Stripe('pk_test_DEIN_STRIPE_PUBLISHABLE_KEY');
```

### 6. Database Rules setzen

```bash
firebase deploy --only database
```

### 7. App deployen

```bash
firebase deploy
```

## 🔧 Entwicklung

### Lokaler Development Server:
```bash
firebase serve
```

### Live-Logs anschauen:
```bash
firebase functions:log
```

### Deploy nach Änderungen:
```bash
firebase deploy
```

## 📱 QR-Codes generieren

### Online QR-Code Generatoren:
- [qr-code-generator.com](https://www.qr-code-generator.com/)
- [qrcode-monkey.com](https://www.qrcode-monkey.com/)

### URLs für QR-Codes:
```
Tisch 1: https://DEINE-APP.web.app/?table=1
Tisch 2: https://DEINE-APP.web.app/?table=2
Tisch 3: https://DEINE-APP.web.app/?table=3
Takeaway: https://DEINE-APP.web.app/?table=takeaway
```

## 🔐 Sicherheit

### Database Rules (Produktion):
```json
{
  "rules": {
    "orders": {
      ".read": "auth != null",
      ".write": true
    },
    "archive": {
      ".read": "auth != null", 
      ".write": "auth != null"
    }
  }
}
```

### Admin-Panel schützen:
1. Firebase Authentication aktivieren
2. Login-System implementieren
3. Admin-Rolle vergeben

## 💰 Kosten-Übersicht

### Firebase (kostenlos bis Limits):
- **Hosting**: 10GB Storage, 10GB/Monat Transfer
- **Realtime DB**: 100 gleichzeitige Verbindungen, 1GB Storage
- **Funktionen**: 125K Aufrufe/Monat

### Stripe:
- **Keine monatlichen Gebühren**
- **2.9% + CHF 0.30** pro erfolgreiche Transaktion
- Test-Modus unbegrenzt kostenlos

## 🛠 Troubleshooting

### Häufige Probleme:

**Firebase Verbindung fehlgeschlagen:**
```javascript
// Database URL überprüfen - muss europe-west1 enthalten
databaseURL: "https://PROJEKT-default-rtdb.europe-west1.firebasedatabase.app"
```

**Stripe Fehler:**
```javascript
// Publishable Key (nicht Secret Key!) verwenden
const stripe = Stripe('pk_test_...' // ✅ Richtig
const stripe = Stripe('sk_test_...' // ❌ Falsch
```

**QR-Code funktioniert nicht:**
- URL-Parameter korrekt: `?table=1`
- HTTPS verwenden (automatisch mit Firebase)
- Browser-Cache leeren

### Logs checken:
```bash
# Firebase Console → Funktionen → Logs
# Browser Console (F12)
# Network Tab für API-Calls
```

## 🚀 Produktions-Deployment

### 1. Stripe Live-Modus:
```javascript
// Test-Key ersetzen durch Live-Key
const stripe = Stripe('pk_live_DEIN_LIVE_KEY');
```

### 2. Database Rules verschärfen:
```bash
firebase deploy --only database
```

### 3. Custom Domain (optional):
1. Firebase Console → Hosting → "Custom domain"
2. Domain verbinden
3. SSL automatisch aktiviert

## 📞 Support & Erweiterungen

### Geplante Features:
- [ ] Admin-Login System
- [ ] SMS-Benachrichtigungen
- [ ] Inventory Management
- [ ] Multi-Restaurant Support
- [ ] Loyalty Program
- [ ] Analytics Dashboard

### Kontakt:
- GitHub Issues für Bugs
- Feature Requests willkommen
- Code-Beiträge erwünscht

---

**Lizenz**: MIT
**Version**: 1.0.0
**Erstellt**: 2025