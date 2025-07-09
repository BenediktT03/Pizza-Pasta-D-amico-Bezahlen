# 📋 EATECH Feature Requirements

## ✅ Features die MÜSSEN (MVP - 1. August 2024)

### 🛒 Bestellsystem
- [x] QR-Code Scanner (ein Master-QR pro Truck)
- [x] Mehrsprachige Menüs (DE/FR/IT/EN von Anfang an)
- [x] Allergen-Management (14 EU Allergene, keine Spuren)
- [x] Voice-Bestellung (Schweizerdeutsch Support)
- [x] Smart Notifications ("Dein Lieblingsburger ist wieder da!")
- [x] Bestellnummern täglich ab 100 (geht über 999 hinaus)
- [x] Vorbestellungen (max. 1 Tag im Voraus)
- [x] Automatische Rückerstattung wenn Truck nicht kommt

### 💳 Payment
- [x] Stripe Connect mit TWINT
- [x] 3% Gebühr (97% Truck, 3% Eatech)
- [x] Trinkgeld-System (auch 3% an Eatech)
- [x] Instant Payout
- [x] KEIN Bargeld (komplett bargeldlos)
- [x] 3 Monate gratis Trial (echte Zahlungen, 0% Gebühr)

### 🍔 Kitchen Management  
- [x] Tablet/iPad Display
- [x] Akustische Signale
- [x] "Holen Sie Ihr Essen ab" Voice-Ansage
- [x] KEINE verschiedenen Stationen
- [x] KEIN Kundendisplay

### 🌡️ HACCP Compliance
- [x] Temperatur-Monitoring (15 Min)
- [x] Sensoren: Testo/HACCP24
- [x] Digitale Reinigungspläne
- [x] Fingerabdruck/PIN Signatur
- [x] 2 Jahre Aufbewahrung
- [x] Export: PDF/Excel/CSV

### 📍 Standort-Management
- [x] Adresse mit Karte
- [x] Spontane Standortwechsel
- [x] Max. 20 Standorte/Tag
- [x] Öffnungszeiten pro Standort
- [x] Push-Notifications

### 🤖 AI-Features (OpenAI)
- [x] Voice mit Whisper
- [x] Chat mit GPT-4 
- [x] Dynamic Pricing (automatisch)
- [x] Bedarfsplanung
- [x] Rush-Hour Management
- [x] Event-Integration
- [x] Beschwerde → Ticket

### 📊 Analytics
- [x] ALLE Statistiken für Master-Admin
- [x] Echtzeit-Dashboard
- [x] KI-Insights
- [x] Export zu Buchhaltung
- [x] Tagesabschluss 23:59

### 🎨 Branding
- [x] Theme-System (Swiss, Dark, etc.)
- [x] Custom Themes
- [x] Whitelabel (später, kostet extra)
- [x] Drag & Drop Karten-Designer

### 👥 Hierarchie
- [x] Master-Admin → Manager → Truck → Kunde
- [x] Manager nur Vermittler
- [x] Selbst-Registrierung
- [x] Interaktives Tutorial

### 🔔 Benachrichtigungen
- [x] Push + E-Mail
- [x] SMS vorbereitet
- [x] Eskalations-System
- [x] Smart Notifications

### 🎪 Events
- [x] Option B oder C wählbar
- [x] Festival-Übersicht
- [x] Provisionsverteilung

### 🚀 Weitere Must-Haves
- [x] PWA (keine native App)
- [x] Offline-Modus
- [x] Mehrsprachigkeit
- [x] Sandbox für alle
- [x] Inventar-Tracking
- [x] Ticket-System
- [x] Voice-Feedback
- [x] Predictive Maintenance
- [x] Community Features (Follower)
- [x] Rezept-Verwaltung
- [x] Schweizer Compliance (MwSt, Allergene, etc.)

## ❌ Features die NICHT kommen

### Generell
- [ ] Native Apps
- [ ] Tischreservierung
- [ ] Loyalty/Punkte
- [ ] Social Feed
- [ ] AR/VR Menüs
- [ ] Gruppen-Bestellung
- [ ] Abo-Modelle
- [ ] Gamification
- [ ] Mitarbeiter-Rollen
- [ ] Bargeld-Tracking

### Spezifisch  
- [ ] Food Truck Tinder
- [ ] Truck-Battles
- [ ] Loyalty Tiers
- [ ] Gruppen-Rabatte
- [ ] Surprise Me Feature
- [ ] Meal Prep Mode
- [ ] Truck des Monats

### Hardware/Sensoren
- [ ] Luftfeuchtigkeit
- [ ] Türöffnung
- [ ] Stromausfall
- [ ] GPS-Tracker
- [ ] Kundendisplay
- [ ] Drucker/Buzzer

### Business
- [ ] Saison-Artikel
- [ ] Wetter-Verkäufe
- [ ] Mitarbeiter-Performance
- [ ] Tagesgerichte-News
- [ ] Geburtstags-Specials
- [ ] Foto-Upload Burger
- [ ] Franchise-Modell
- [ ] Marketing-Pakete
- [ ] Sensor-Vermietung
- [ ] Truck-Academy
- [ ] Rezept-Marktplatz
- [ ] Ghost Kitchens
- [ ] Energie-Monitoring
- [ ] Food-Truck-Börse
- [ ] Lieferanten-Integration

### Support
- [ ] Hotline
- [ ] Notstrom-Modus
- [ ] Backup-Kasse
- [ ] Live-Chat (erstmal Benedikt alleine)

### Payment
- [ ] SumUp
- [ ] Einzelne Preisschilder

## 🔄 Features für später

### Fahrer-App
- Eigene App geplant
- Bewertungssystem
- Selbstauswahl
- NOCH NICHT UMSETZEN!

### Lieferung
- Vorbereitung da
- Uber Eats API oder billiger
- Gebühren-Kalkulation
- Mindestbestellwert

### Catering
- Muss genauer angeschaut werden
- Noch nicht definiert

### Marketing
- Whitelabel (Preis TBD)
- Events (Preis TBD)
- Noch kein Plan

## 📝 Offene Entscheidungen

- Stornierungsfristen genau
- SLA-Zeiten genau  
- Event-Preise genau
- Whitelabel-Preise
- Erste echte Kunden wann
- Konkurrenz-Analyse
- Versicherung
- Marketing-Plan

## 🎯 Wichtige Details

### Bestellnummern
- Täglich ab 100
- Geht über 999 hinaus (1000, 1001...)
- KEIN Reset bei 999

### Manager
- NUR Vermittler
- Hat NICHTS mit Truck-Problemen zu tun
- Zahlt NICHTS
- Kann mehrere Trucks verwalten

### Trial
- 3 Monate GRATIS
- Echte Zahlungen
- 0% Gebühr
- Danach automatisch 3%

### Sprachen
- ALLE von Anfang an
- Auch Schweizerdeutsch für Voice
- Automatische Übersetzung

### Keine Rollen für
- Kassierer
- Koch
- Mitarbeiter
- Fahrer (noch nicht)

### Budget
- OpenAI: 10$ aufgeladen
- Kein Limit gesetzt
- Muss billig sein
- Sensoren zahlt Truck

### Support
- Erstmal Benedikt alleine
- Keine Hotline
- Keine Backup-Systeme

### Rechtliches
- Benedikt entscheidet
- Haftung möglichst nicht er
- AGB generieren lassen
