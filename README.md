Pizza&Pasta D'amico – Foodtruck-Bestellsystem
Projektbeschreibung
Dieses Projekt ist ein webbasiertes Bestellsystem für Foodtrucks wie „Pizza&Pasta D’amico“. Kunden können mobil per QR-Code einfach und schnell Pizza, Pasta und weitere Speisen bestellen und direkt bezahlen. Betreiber verwalten alle Bestellungen zentral über ein Admin-Panel, aktualisieren den Status und optimieren Abläufe.

Das System ist modular und kann Schritt für Schritt um neue Funktionen erweitert werden.

Inhaltsverzeichnis
Technische Basis

Kernfunktionen (MVP)

Erweiterte Funktionen

Betriebsoptimierung für Betreiber

Sicherheit & Datenschutz

UX & Design Extras

Marketing & Kundenbindung

Installation & Einrichtung

Mitwirken & Weiterentwicklung

Lizenz

Technische Basis
Frontend: HTML, CSS, JavaScript – responsives Design für Desktop und Mobilgeräte

Backend: Firebase Realtime Database für Daten, Firebase Authentication für Admin-Login

Zahlungsintegration: Schweizer Zahlungsmethoden (Twint, Kredit-/Debitkarten, Apple Pay, Google Pay, PayPal, PostFinance)

Hosting: Webserver oder Firebase Hosting

Architektur: Single Page Application (SPA)

Kernfunktionen (MVP – Must-Have)
QR-Code Bestellung:
Kunden scannen QR-Code am Foodtruck oder Tisch und greifen auf das Menü zu.

Produktwahl:
Auswahl von Pizza, Pasta und anderen Gerichten.

Sofortige Bezahlung:
Integration aller gängigen Schweizer Zahlungsmethoden.

Bestellübersicht für Betreiber:
Echtzeit-Anzeige aller Bestellungen im Admin-Panel mit Statusanzeigen.

Bestellstatus:
Statusänderungen wie „In Zubereitung“ oder „Fertig zur Abholung“ für Kunden sichtbar.

Mehrsprachigkeit:
Website und Bestellprozess mindestens in Deutsch, Französisch, Italienisch, Spanisch und Englisch.

PDF-Rechnung:
Automatische Generierung und Versand mehrsprachiger Rechnungen auf Wunsch.

Admin Analytics:
Umsatz, Bestellungen, Top-Produkte mit Exportfunktion (CSV/PDF).

Erweiterte Funktionen (Nice-to-Have)
Bewertungssystem:
Kunden können Rezensionen und Sterne auf Google abgeben (Verlinkung zum Foodtruck-Profil).

Vorbestellungen:
Auswahl eines Abholzeitfensters (z.B. 30 Minuten später).

Foodtruck-Kalender:
Standort & Öffnungszeiten als Kalender mit Google Maps-Verlinkung.

Standort-Benachrichtigungen:
Admin kann Standort manuell eintragen. Nutzer, die den Standort abonnieren, erhalten eine Benachrichtigung, wenn der Foodtruck dort ist.

Design-Themes:
Lightmode, Darkmode und weitere Farbschemata auswählbar.

Trinkgeld-Option:
Möglichkeit, beim Bezahlen Trinkgeld zu geben.

Captcha-Schutz:
Captcha aktiviert bei mehr als 2 Bestellungen in kurzer Zeit.

Benachrichtigungen:
Push- und E-Mail-Benachrichtigungen zu Bestellstatus und Standort.

Betriebsoptimierung für Betreiber
Küchenmodus:
Spezielle Ansicht für Teammitglieder mit Sortierung nach Dringlichkeit.

Digitale Küchenanzeige:
Live-Bestellungen und Statusänderungen per Klick.

Tagesabschlussbericht:
Automatischer Bericht zu Umsatz, Trinkgeldern, Top-Produkten; exportierbar.

Audit-Logs:
Protokollierung aller Admin-Aktionen.

Offline-Modus:
Zwischenspeicherung von Bestellungen bei Internetausfall.

Wetterintegration:
Wettervorhersage und Warnungen für geplante Standorte.

Sicherheit & Datenschutz
IP-Tracking & Rate Limiting:
Schutz vor Spam und Angriffen.

Automatischer Captcha:
Aktivierung bei verdächtigem Verhalten.

DSGVO-Konformität:
Datenanfragen, Export und Löschung durch Kunden möglich.

Sichere Zahlungsabwicklung:
Nutzung zertifizierter Payment-Provider.

UX & Design Extras
Barrierefreiheit:
Screenreader-Support, hoher Kontrast, einfache Navigation.

Animationen & Soundfeedback:
Visuelle und akustische Hinweise.

Progressive Web App (PWA):
Installation auf Smartphones, Offline-Funktion, Push-Benachrichtigungen.

Marketing & Kundenbindung
KI-gestützte Menüvorschläge:
Personalisierte Empfehlungen basierend auf Bestellhistorie.

Social-Media-Integration:
Teilen von Bestellungen und Bewertungen.