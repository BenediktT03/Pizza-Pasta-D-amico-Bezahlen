# 🚀 EATECH V3.0 - MASTER PROJECT SPECIFICATION

## 📋 Projekt-Übersicht

**Vision:** Das führende All-in-One Food Truck Management System der Schweiz
**Ziel:** 100+ Food Trucks bis Ende 2024, 2000+ in 3 Jahren
**Launch:** 1. August 2024 (MVP mit ALLEN Features - nichts kann warten!)

## 🏗️ Architektur-Entscheidungen

### Tech Stack
- **Frontend:** React + Vite + Tailwind CSS (CSS Modules für Theme-System)
- **Backend:** Firebase (Firestore, Functions, Auth)
- **Payments:** Stripe Connect (mit TWINT Integration)
- **AI/ML:** OpenAI (GPT-4, Whisper) - 10$ bereits aufgeladen
- **Monitoring:** Sentry + Plausible Analytics (selbst-hosted oder 9€/Monat)
- **Hosting:** Vercel (kostenlos bis 100GB) + Firebase (Spark Plan kostenlos)
- **CDN:** Cloudflare (kostenloser Plan)
- **Keine SSL Zertifikate vorhanden** (automatisch via Vercel/Cloudflare)

### Datenbank-Struktur (Skalierbar für 2000+ Trucks)
```
/foodtrucks/{truckId}/
    /products/{productId}
    /orders/{orderId}
    /locations/{locationId}
    
/managers/{managerId}/
    /trucks/{truckId} (nur Referenzen)
    
/orders_live/{date}/{orderId}
/orders_archive/{year}/{month}/{orderId}

/analytics_realtime/{truckId}
/analytics_aggregated/{period}
```

**Entscheidung:** Option 1 (Ein Firebase Projekt) - erstmal, dauert ja noch 3 Jahre bis 2000 Trucks

## 💰 Geschäftsmodell

### Basis-Gebühren
- **Food Trucks:** 3% auf ALLE App-Umsätze
- **Erste 3 Monate:** GRATIS (echte Zahlungen, 0% Gebühr)
- **Manager:** Kostenlos (nur Vermittler) - KEINE Lizenz, KEINE %
- **Stripe-Gebühren:** Trägt der Food Truck selbst (~2.9% + 0.30 CHF)
- **Trinkgeld:** 97% an Truck, 3% an Eatech (transparent angezeigt dem Truck)
- **Auszahlung:** Sofort via Stripe Connect, KEIN Minimum
- **Gebühren-Berechnung:** Nach Stripe-Gebühren (Truck trägt diese)

### Zusatz-Services (später)
- **Whitelabel:** Custom Domain + Branding (Preis noch nicht definiert)
- **Events:** Option B oder C wählbar:
  - B: +1% während Events (4% total)
  - C: Premium Features (500-2000 CHF)
- **Event-Preise:** Noch nicht definiert - "keine Ahnung was angemessen ist"

### Automatische Auszahlung
- Stripe Connect mit Instant Payout zu Benedikt
- 97% an Truck, 3% an Eatech
- Tägliche automatische Überweisungen
- Nur wenn andere Systeme das Geld nicht automatisch überweisen können, brauchen wir einen Tab

## 👥 Hierarchie & Rollen

```
Master-Admin (Benedikt)
    ↓ (verkauft NICHTS an Manager)
Manager (Multi-Truck-Betreiber/Vermittler)
    ↓ (verwaltet)
Food Trucks (zahlen 3% Transaktionsgebühr)
    ↓ (bedienen)
Kunden
```

### Berechtigungen
- **Master-Admin:** 
  - Vollzugriff auf ALLES
  - Sieht ALLE Daten aller Trucks
  - Kann Rabatte erstellen (Geld wird IHM abgezogen, nicht dem Truck)
  - Zugriff auf alle Statistiken
  - Sandbox-Umgebung verfügbar
- **Manager:** 
  - Verwaltung mehrerer Trucks
  - Kann Trucks hinzufügen/entfernen
  - Sieht Daten aller seiner Trucks
  - Hat NICHTS mit Truck-Problemen zu tun!
  - Dient NUR zur Vermittlung zwischen Benedikt und Trucks
  - Kann für Ketten oder Leute mit mehreren Trucks verkauft werden
- **Food Truck:** 
  - Eigene Daten, Produkte, Standorte
  - Kann Preise selbst ändern
  - Sieht Sensordaten
  - Nur 1-2 Personen pro Truck
- **Kunde:** 
  - Bestellen + Konto anlegen
  - Profil, Favoriten
  - Lieblings-Trucks folgen

### NICHT existierende Rollen
- **Kassierer:** Gibt's nicht
- **Koch:** Gibt's nicht  
- **Fahrer:** Gibt's nicht (noch - eigene App für später geplant)
- **Mitarbeiter:** Gibt's nicht

## 🎛️ MASTER FEATURE CONTROL SYSTEM (WICHTIGSTE FUNKTION!)

### Übersicht
**JEDE EINZELNE FUNKTION IST DEAKTIVIERBAR!** Benedikt hat die absolute Kontrolle über alle Features und kann diese granular steuern.

### Feature Flag Dashboard
- **Hierarchische Struktur:**
  ```
  ├── 🌍 Global (für alle Trucks)
  ├── 👥 Pro Manager (für alle verwalteten Trucks)
  ├── 🚚 Pro Truck (individuell)
  └── ⏰ Zeitgesteuert (automatische Aktivierung)
  ```

### Kontrollierbare Hauptkategorien
1. **Bestellsystem**
   - QR-Code Scanning
   - Digitale Speisekarte
   - Voice-Bestellung (komplett)
   - Voice-Bestellung nur Deutsch
   - Voice-Bestellung nur Schweizerdeutsch
   - Mehrsprachigkeit (global)
   - Einzelne Sprachen (DE/FR/IT/EN)
   - Allergen-Anzeige
   - Nährwertangaben
   - Produktbilder
   - Modifikatoren (ohne Zwiebeln, etc.)
   - Spezielle Anweisungen
   - Favoritensystem
   - Vorbestellungen
   - Wartezeit-Anzeige

2. **Payment System**
   - Stripe Payments (global)
   - Kreditkarten
   - TWINT
   - Apple Pay
   - Google Pay
   - Crypto (wenn implementiert)
   - Trinkgeld-Feature
   - 3% Platform Fee (kann auf 0% gesetzt werden)
   - Rechnungsstellung
   - QR-Rechnung
   - Stornierungen
   - Rückerstattungen

3. **AI Features**
   - Dynamic Pricing (komplett)
   - Preisvorschläge nur anzeigen
   - Automatische Preisanpassung
   - Voice-to-Text
   - Chat-Bot
   - Bedarfsplanung
   - Rush-Hour Vorhersage
   - Produktempfehlungen
   - Upselling-Vorschläge
   - Wetterbasierte Insights
   - Predictive Maintenance
   - Fraud Detection

4. **Kitchen Management**
   - Order Display
   - Akustische Signale
   - Voice-Ansagen
   - Bestellnummern-System
   - Vorbereitungszeit-Tracking
   - Kapazitätsanzeige
   - Rush-Hour Warnungen

5. **HACCP & Compliance**
   - Temperatur-Monitoring (komplett)
   - Einzelne Sensoren
   - Temperatur-Alarme
   - Digitale Checklisten
   - Reinigungspläne
   - Digitale Unterschrift
   - PIN-Unterschrift
   - Fingerprint-Unterschrift
   - Automatische Reports
   - 2-Jahre Aufbewahrung
   - Export-Funktionen

6. **Analytics & Reporting**
   - Live-Dashboard
   - Umsatz-Statistiken
   - Produkt-Performance
   - Standort-Analyse
   - Kundenverhalten
   - KI-Insights
   - Export zu Buchhaltung
   - Custom Reports
   - A/B Testing
   - Conversion Tracking

7. **Benachrichtigungen**
   - Push Notifications (global)
   - E-Mail Notifications
   - SMS (wenn aktiviert)
   - Kunden-Benachrichtigungen
   - Betreiber-Benachrichtigungen
   - Smart Notifications
   - Marketing-Nachrichten
   - System-Alarme

8. **Standort-Features**
   - Standort-Management
   - Kartenanzeige
   - Öffnungszeiten
   - "Truck in der Nähe"
   - Routenplanung
   - Event-Modus
   - Festival-Übersicht

9. **Branding & Customization**
   - Logo-Upload
   - Farbschema
   - Custom Fonts
   - Whitelabel
   - Custom Domain
   - E-Mail Branding
   - Karten-Designer

10. **Community & Social**
    - Lieblings-Trucks
    - Follower-System
    - Bewertungs-Integration
    - Social Media Links
    - Share-Funktionen

### Kontrollebenen
- **Ein/Aus:** Komplette Deaktivierung
- **Eingeschränkt:** Teilfunktionen aktiv
- **Test-Modus:** Nur für bestimmte Nutzer
- **A/B Test:** Prozentuale Verteilung
- **Zeitgesteuert:** Automatische Aktivierung/Deaktivierung
- **Regelbasiert:** Bedingungsabhängig (z.B. nur bei Events)

### Sofortige Auswirkungen
- Änderungen wirken SOFORT ohne Neustart
- Betroffene Nutzer sehen Änderungen in Echtzeit
- Automatisches UI-Update
- Keine Unterbrechung laufender Bestellungen

### Audit & Rollback
- Vollständiges Änderungsprotokoll
- Wer hat was wann geändert
- Ein-Klick Rollback
- Backup der letzten 30 Konfigurationen
- Export/Import von Konfigurationen

### Notfall-Features
- "PANIC BUTTON": Alle Features auf Minimal-Modus
- Einzelne Trucks isolieren
- Globale Deaktivierung bei Problemen
- Automatische Deaktivierung bei Fehlerrate > X%

## 🌍 Lokalisierung

### Sprachen (ALLE von Anfang an)
- Deutsch (inkl. Schweizerdeutsch für Voice - "Chuchichäschtli")
- Französisch
- Italienisch
- Englisch

### Schweiz-Spezifisch
- TWINT als primäre Zahlungsmethode
- MwSt: 2.5% (Takeaway) / 7.7% (vor Ort) - automatische Auswahl
- QR-Rechnung Support
- Schweizer Allergen-Liste (gemäss LMG/LIV)
- Herkunftsland für Fleisch (Pflicht!)
- Nährwertangaben (KI-berechnet)
- Bio/Label-Zertifikate verwaltbar
- KEIN Bargeld (komplett bargeldlos)

## 🎯 Core Features

### 0. Basis-System (immer aktiv)
- Grundlegende Bestellfunktion
- Einfache Produktanzeige
- Basis-Payment (mindestens eine Methode)
- Minimales Admin-Interface

**ALLES ANDERE IST DEAKTIVIERBAR!** (siehe Master Feature Control System oben)

### 1. Digitale Bestellung
- EIN Master-QR pro Truck + EIN QR für Festival-Übersicht
- Direkt zur Bestellung (erst Sprache wählen)
- Mehrsprachige Menüs (automatische Übersetzung)
- Allergen-Management (14 EU + CH-Spezifisch, KEINE Spuren)
- Voice-Bestellung (OpenAI Whisper - alle Sprachen + Dialekte)
- Smart Notifications: "Dein Lieblingsburger ist wieder da!"
- Stammkunden-Erkennung
- Bestätigung via Screen (nicht vorlesen)

### 2. Kitchen Management
- Echtzeit Order-Display (Tablet/iPad)
- Bestellnummern täglich ab 100 (geht über 999 hinaus: 1000, 1001...)
- Akustische Signale bei Fertigstellung
- "Holen Sie Ihr Essen ab" Voice-Ansage (mehrsprachig, Lautstärke, verschiedene Stimmen, lustige Sounds)
- Vorbereitungszeiten-KI
- KEINE verschiedenen Stationen (Grill, Fritteuse)
- KEINE spezielle Reihenfolge
- KEINE Pausen-Zeiten zwischen Gerichten
- KEIN Kundendisplay (noch nicht)
- KEINE Hardware-Integration (Drucker, Buzzer)

### 3. HACCP Compliance
- Temperatur-Monitoring (alle 15 Minuten)
- Temperaturzonen: Kühlschrank 2-5°C, Gefrierfach -18°C
- Sensoren: Testo Saveris 2 oder HACCP24 (alle möglichen unterstützen)
- Batterie-Warnung für Sensoren
- Digitale Reinigungspläne (täglich/wöchentlich/monatlich)
- Digitale Unterschrift mit Fingerabdruck oder PIN
- Automatische Dokumentation
- 2 Jahre Aufbewahrung
- Export: PDF, Excel, CSV (ALLE Formate)
- KEINE Luftfeuchtigkeit-Sensoren
- KEINE Türöffnungs-Sensoren
- KEINE Strom-Ausfall Detektion
- KEIN GPS-Tracker für Trucks

### 4. Standort-Management
- Adresse mit Kartenanzeige (nicht nur GPS)
- Planung: Verantwortung des Food Trucks
- Spontane Standortwechsel möglich
- Max. 20 Standorte pro Tag (theoretisches Limit)
- Öffnungszeiten pro Standort einzeln
- Push bei "Truck in der Nähe"
- Push "Truck kommt morgen in Ihre Nähe"
- Vorbestellungen: Max. 1 Tag im Voraus
- Stornierung: Entscheidung noch offen
- Automatische Rückerstattung wenn Truck nicht kommt
- KEINE Multi-Location gleichzeitig

### 5. AI-Features (OpenAI GPT-4 + Whisper)
- **Budget:** KEIN Limit gesetzt (10$ aufgeladen)
- **Voice für:** Voice-to-Text UND intelligente Bestellvorschläge
- **Dynamic Pricing (automatisch aktiviert, nicht nur Vorschläge):**
  - Psychologie: 15.90 statt 16.00
  - "Nur 19.-" statt "19.00"
  - Teures zuerst zeigen (Anker-Effekt)
  - Bündelung vorschlagen
  - KEINE künstliche Verknappung
- **Bedarfsplanung:** "Morgen brauchst du 50kg Pommes"
- **Rush-Hour Management:**
  - System erkennt Muster (Di-Fr 12-13 Uhr = +50%)
  - Automatische Wartezeit-Anpassung (10 Min → 20 Min)
  - Vorwarnung 30 Min vorher: "In 30 Min beginnt Rush Hour"
  - Optimierung: "Bereite 10 Burger vor"
- **Event-Kalender Integration** (Google/Facebook Events API)
- **Wetter-API** für Prognosen (NICHT für Menü-Anpassung)
- **Kapazität:** 100-200 Bestellungen/Stunde max
- **Chat-Bot Fähigkeiten:**
  - Fragen beantworten ("Was ist glutenfrei?")
  - Ernährungsberatung ("Was hat wenig Kalorien?")
  - Empfehlungen ("Was passt zu Pommes?")
  - Beschwerde-Management → Automatisches Ticket
  - KEIN Smalltalk ("Wie ist das Wetter?")
- **Voice in 4 Sprachen + Schweizerdeutsch**
- **Bestätigung via Screen** (nicht vorlesen)
- **Korrektur:** "Nicht 2 sondern 3 Burger"

### 6. Analytics & Reporting
- **Master-Admin sieht ALLES:**
  - Live-Dashboard aller Trucks
  - Umsatz-Ticker in Echtzeit
  - Alle möglichen Statistiken
  - Fraud Detection
  - Alarm bei Problemen
  - Automatische Reports
- **Echtzeit-Stats:**
  - Aktuelle Bestellungen live
  - Auslastung in %
  - Wartezeit-Durchschnitt
  - Beliebtestes Produkt heute
- **Historische Stats:**
  - Umsatz pro Standort
  - Beliebte Kombinationen (Burger + Cola = 80%)
  - Stosszeiten-Analyse
  - Durchschnittlicher Warenkorb
  - Wiederkehr-Rate
  - Conversion-Rate
  - A/B Test Results
- **KI-Insights (MEGA WICHTIG!):**
  - "Dienstags verkaufst du 40% mehr Salate"
  - "Bei Regen -30% Umsatz"
  - "Kunden die X kaufen, kaufen oft auch Y"
- **Export:** Bexio, Abacus, SAP Business One, CSV/Excel
- **Kostenstellen** pro Truck für Profit-Center
- **Wareneinsatz-Berechnung** mit KI-Warnung bei >45%
- **Tagesabschluss** automatisch um 23:59
- KEINE Wetterabhängige Verkaufsanalyse
- KEINE Mitarbeiter-Performance

### 7. Onboarding (Schritt für Schritt)
- Selbst-Registrierung möglich
- **Interaktives Tutorial (PFLICHT für alle!):**
  - Moderner Stil (KEINE alten Textbubbles)
  - Hintergrund wird dunkel
  - Fahrender Truck als Fortschrittsanzeige 🚚
  - Schritt 1: "Willkommen! Lass uns deinen Truck einrichten"
  - Schritt 2: "Lade dein Logo hoch" (Drag & Drop)
  - Schritt 3: "Erstelle dein erstes Produkt" (Burger Tutorial)
  - Schritt 4: "Setze deinen ersten Standort"
  - Schritt 5: "Mache eine Test-Bestellung" (PFLICHT!)
  - Schritt 6: "Verbinde deine Zahlungsmethode" (PFLICHT!)
  - Schritt 7: "Geschafft! 3 Monate gratis starten"
- Alle Daten MÜSSEN eingegeben werden
- Ohne hinterlegte Bezahlmethode geht NICHTS
- Echte Zahlungen während Trial (0% Gebühr)
- KEIN Test-Badge auf Profil

### 8. Zusätzliche Features
- **Voice-Feedback** nach dem Essen ("Hey Siri, der Burger war top!")
- **Predictive Maintenance:**
  - Basiert auf Bestellzahlen + manuelle Wartungseingabe
  - "Dein Grill braucht bald Wartung"
  - Erinnerungen per Push/Email
- **Zusätzliche Voice-Features:**
  - Warteschlangen-Ansagen
  - Öffnungszeiten-Erinnerung
  - Spezial-Angebote ankündigen
- **Drag & Drop Karten-Designer:**
  - Mehrere Templates (Klassisch, Modern, Festival)
  - Digitale Karte → Druckbare Karte mit QR
  - QR-Code Position/Grösse anpassbar
  - Automatische Übersetzung für mehrsprachige Karten
  - Formate: A4, A5 (KEINE Einzelpreisschilder)
  - Direkt drucken + PDF Export
  - Profi-Druck Service Integration
- **Rezept-Verwaltung:**
  - NUR Admin pflegt Rezepte
  - Versions-Historie
  - Alle Gerichte flexibel
  - KEINE Saison-Artikel
  - Automatische Allergen-Berechnung bei Änderungen
- **Lieferung (für später vorbereitet):**
  - Integration vorbereiten (Uber Eats API oder was billiger)
  - Liefergebühren-Kalkulation
  - Mindestbestellwert
  - KEINE Lieferzonen
  - Fahrer wählen selbst
- **Routenplanung/Optimierung** (geplant)
- **Community Features:**
  - Kunden können Lieblings-Trucks folgen
  - Benachrichtigung wenn in der Nähe
  - Bewertungen auf Google Maps/anderen Plattformen (Truck verlinkt sich)
  - KEIN internes Bewertungssystem

## 🔔 Benachrichtigungen

### An Kunden
- "Truck ist jetzt am Standort"
- "Ihre Bestellung ist fertig"
- "Truck kommt morgen in Ihre Nähe"
- Smart: "Dein Lieblingsburger ist wieder da!"
- Via: Push + E-Mail (SMS später integriert)
- KEINE Tagesgerichte-Benachrichtigungen

### An Betreiber
- "Temperatur-Alarm!"
- "Produkt fast ausverkauft"
- "Reinigung fällig"
- "Wartung nötig" (Predictive)
- KEINE "Neue Bewertung"

### Eskalation (WICHTIG: Manager hat NICHTS mit Truck-Problemen zu tun!)
```
Temperatur zu hoch (NICHT kritisch bei 8°C):
- Sofort: Push an Truck + Kitchen Display Warnung
- Nach 10 Min: SMS an Truck-Betreiber
- Nach 20 Min: Push an Master-Admin (Benedikt)
- Nach 30 Min: Produkte als "gesperrt" markieren

Bestellung nicht bearbeitet:
- Nach 5 Min: Akustisches Signal verstärken
- Nach 10 Min: Push an Truck
- Nach 15 Min: Kunde informieren + Rückerstattung Option

Truck nicht am angekündigten Standort:
- Nach 15 Min: Automatisch als "geschlossen" markieren
- Kunden-Benachrichtigung mit Rückerstattung
- Alert an Master-Admin
```

**SLA-Zeiten:** Noch nicht definiert (Temperatur ist NICHT kritisch)

## 🛡️ Sicherheit & Compliance

### Datenschutz
- DSGVO/DSG konform (wie Benedikt will)
- Daten-Löschung/Anonymisierung nach 30 Tagen
- Hosting in der Schweiz (Google Cloud Zürich)
- Automatisch generierte AGB/Datenschutz
- Haftung bei Ausfall: "im besten Fall nicht ich"
- Versicherung: "keine Ahnung"
- Cookie-Banner wenn nötig
- Auskunftsrecht-Tool

### Payment Security
- PCI-DSS SAQ-A (nur Stripe iframe) - "einfachste Stufe"
- Keine Kartendaten gespeichert
- 3D Secure für alle Zahlungen
- Crypto-Ready (Bitcoin/ETH)
- "Keine Ahnung was am meisten genutzt wird"

### Backup & Recovery
- Stündliche Snapshots (Firestore automatisch)
- Multi-Region: europe-west1 + europe-west6
- RTO/RPO: 1 Stunde
- Disaster Recovery Plan
- Daten-Export für Trucks (CSV/PDF)

## 📱 Platform Features

### Web App (PWA)
- Offline-fähig (bis Internet wieder da)
- Bestellungen lokal speichern
- Sync wenn wieder online
- Payment offline = Bargeld (wird uns egal sein)
- KEINE manuelle Eingabe möglich
- Push Notifications
- App-like Experience
- Responsive Design

### Kitchen Display
- Tablet/iPad-optimiert
- Gross & übersichtlich
- Touch-Bedienung
- Offline-Sync

### Manager Dashboard
- Multi-Truck Übersicht
- Consolidated Reports
- Whitelabel später möglich
- Eigenes Branding
- Multi-Truck unter einer Marke verwalten

### Master-Admin Panel (Benedikt)
- Vollständige Kontrolle über ALLES
- Live-Monitoring aller Trucks
- Alle Statistiken und Metriken
- Fraud Detection
- System Health
- Kann Rabatte erstellen (Geld wird ihm abgezogen)
- Sieht alle Daten aller Trucks
- Sandbox-Umgebung verfügbar
- Support-Tickets Management
- ALLE möglichen Statistiken
- **WICHTIGSTER PUNKT:** Zugriff auf das Master Feature Control System (siehe oben)

## 🎪 Event-System

### Für Veranstalter
- Kann zwischen Option B oder C wählen
- Festival-Übersicht = mehrere Trucks auf einer Page
- KEINE gemeinsame Bezahlung
- Veranstalter kann Provision mit Trucks aushandeln
- Event-Manager-Fenster für Provisionsverteilung
- "Ich weiss nicht wie viel ich berechnen soll"
- Trucks zahlen IMMER 3% an Benedikt

### Event-Features
- Custom Landing Page (bei Option C)
- Live-Statistiken für Veranstalter
- Gemeinsame Promotions
- Besucher-Heatmap

## 🎨 Branding & Whitelabel

### Truck-Level
- Logo Upload
- Farben (Primary, Secondary, Accent)
- Schriftarten
- Custom Domain (burger-max.eatech.ch)
- Whitelabel kostet extra (Preis noch nicht definiert)

### Manager-Level
- Überschreibt NICHT Truck-Branding
- Eigenes Dashboard-Design später
- Multi-Truck unter einer Marke

### Whitelabel-Details
- KEINE eigene App im Store
- Nur Web mit eigenem Design
- Rechtfertigung für Extra-Kosten: Eigenes Logo, Domain, etc.

## 🎫 Ticket-System

### Funktionen
- Prioritäten: Kritisch/Hoch/Normal
- Automatische Übersetzung bei Fremdsprachen
- KI erkennt Empfänger:
  - An Truck
  - An Manager
  - An Admin (Benedikt)
  - An beide
  - An alle 3
- Integration mit Beschwerde-Management

## 🚫 Explizit NICHT im Scope

### Generell
- Native Mobile Apps (nur PWA)
- Tischreservierungen
- Punkte/Loyalty System  
- Social Features
- AR/VR Menüs (kein AR-Menü mit 3D Burger)
- Gruppen-Bestellungen (kein QR teilen)
- Abo-Modelle (kein Coffee-Pass)
- Gamification
- Mitarbeiter-Verwaltung (gibt keine)
- Kassierer-Rolle (gibt's nicht)
- Koch-Rolle (gibt's nicht)
- Lieferanten-Verwaltung
- Bargeld-Tracking (komplett bargeldlos)

### Spezifische Features
- "Food Truck Tinder" (Swipe durch Gerichte)
- Truck-Battles/Challenges
- Loyalty Tiers (Bronze/Silber/Gold)
- Gruppen-Rabatte ("Ab 5 Personen -10%")
- "Surprise Me" Feature (KI wählt zufällig)
- Meal Prep Mode (Vorbestellung für ganze Woche)
- "Truck des Monats" Voting
- Social Feed ("Max hat gerade einen Mega-Burger bestellt!")

### Sensoren & Hardware
- Luftfeuchtigkeit-Sensoren
- Türöffnungs-Sensoren  
- Strom-Ausfall Detektion
- GPS-Tracker für Trucks
- Kitchen Hardware (Drucker, Buzzer, Scanner)
- Kundendisplay für Bestellnummern

### Business Features
- Saison-Artikel Verwaltung
- Wetterabhängige Verkaufsanalysen
- Mitarbeiter-Performance Tracking
- Tagesgerichte-Benachrichtigungen
- Neue Bewertung-Benachrichtigungen
- Geburtstags-Specials (automatisch)
- Wetter-basierte Menü-Anpassung
- Foto-Upload für Custom-Burger
- Franchise-Modell
- Marketing-Pakete
- Sensor-Vermietung
- Versicherungs-Vermittlung

### Erweiterte Features
- Truck-Academy (Schulungen)
- Rezept-Marktplatz
- Ghost Kitchens
- Franchise-Finder
- Energie-Monitoring
- Food-Truck-Börse
- Automatische Bestellung bei Lieferanten
- Catering-Modul (muss genauer angeschaut werden)

### Support & Notfall
- Hotline für Trucks
- Notstrom-Modus
- Backup-Kasse
- Live-Chat Support (erstmal macht Benedikt alleine)

### Payment & Integration
- SumUp Integration
- Einzelne Preisschilder drucken
- Tischaufsteller (A5/A6 Dreiecke geht)

## 📅 Zeitplan

### Phase 1: Basis (März)
- Projekt-Cleanup ✓
- Architektur-Setup
- Auth-System
- Basis UI/UX

### Phase 2: Core (April)
- Bestell-System
- Payment Integration
- Kitchen Display
- Multi-Language

### Phase 3: Advanced (Mai)
- HACCP Features
- AI Integration
- Analytics
- Manager System

### Phase 4: Polish (Juni)
- Testing
- Performance
- Documentation
- Beta mit Nachbar

### Phase 5: Launch (Juli)
- Marketing Prep (noch nicht geplant)
- Final Testing
- Go-Live 1. August

**MVP:** ALLE Features müssen rein, NICHTS kann warten!

## 🎯 Erfolgs-Metriken

### Jahr 1
- 20 Trucks (Minimum)
- 50 Trucks (Gut)  
- 100 Trucks (Traum)

### Jahr 3
- 2000+ Trucks (Ziel)
- Ganze Schweiz (nicht nur Deutschschweiz)
- 3 Mio CHF Umsatz (bei 2000 Trucks × 3% × 50k Jahresumsatz)

### Zeitplan Unsicherheiten
- Wann erste echte Kunden: "keine Ahnung"
- Marketing: "erstmal egal"

## 🔗 Wichtige Links & Konfiguration

- Firebase Project ID: eatech-foodtruck ✓ (existiert bereits)
- Domain: eatech.ch (MUSS registriert werden)
- Staging: app-staging.eatech.ch
- Status: status.eatech.ch
- Docs: docs.eatech.ch
- Hosting: Vercel (kostenlos) + Firebase
- CDN: Cloudflare (kostenlos)
- Analytics: Plausible (selbst-hosted oder 9€/Monat)

### Konkurrenz-Analyse
- "Such selber" - Benedikt will recherchiert haben:
  - Ähnliche Systeme
  - Was machen die schlecht
  - Unser USP

## 📝 Wichtige Details & Offene Punkte

### Was Benedikt NICHT weiss
- Wieviel für Whitelabel verlangen
- Wieviel für Event-Teilnahme verlangen  
- Genaue Event-Preise ("keine Ahnung was angemessen")
- Konkurrenz-Details
- Versicherungs-Details
- Marketing-Plan
- Wann erste echte Kunden kommen
- SLA-Zeiten genau
- Stornierungsfristen genau

### Spezielle Implementierungen
- Voice-Feedback nach dem Essen ("Hey Siri, der Burger war top!")
- "Holen Sie Ihr Essen ab" Button + AI Voice wenn Kunde nicht auftaucht
- Routenplanung/Optimierung (geplant)
- Community Features mit externen Plattformen

### Support & Kommunikation
- Initial: Benedikt macht Support alleine
- Später: Support-System aufbauen
- Bei kritischen Updates: Push + SMS + Status-Page
- KEINE Hotline, KEIN Live-Chat (erstmal)

### Fahrer-System (für später gespeichert)
- Eigene Fahrer-App geplant (eigenes UI)
- Bewertungssystem für Fahrer
- Fahrer wählen Lieferungen selbst
- Noch nichts umsetzen!

### Rechtliches (Benedikt entscheidet)
- AGB/Datenschutz: "mach du"
- Haftung bei Ausfall: "keine Ahnung, im besten Fall nicht ich"
- Versicherung: "keine Ahnung"
- Verträge: Digital via DocuSign

### Budget & Kosten
- OpenAI: 10$ aufgeladen ("mal schauen wie lange reicht")
- KEIN Budget-Limit für OpenAI gesetzt
- GPT-4 nur wenn kostenlos (sonst günstigere Variante)
- Muss erstmal kostenlos/billig sein
- Sensor-Budget: Truck zahlt selbst alles (kein Miet-Modell)

### Performance & Limits
- Max Bestellungen/Minute: "müssen wir testen"
- Max Trucks pro System: Skalierbar bis 2000+
- Max Produkte pro Truck: Kein hartes Limit
- Offline bis Internet wieder da

### Sandbox & Testing
- Sandbox für: Benedikt, Manager, Food Truck
- Mit allem drum und dran
- Test-Zahlungen möglich
- Reset-Funktion

### Inventar/Lager
- Automatischer Abzug bei Bestellung
- Low-Stock Warnungen
- Inventur-Funktion
- KEINE Lieferanten-Verwaltung

---

**Letztes Update:** Nach ausführlicher Diskussion mit Benedikt
**Nächster Schritt:** Domain eatech.ch registrieren und mit Phase 3 beginnen!
