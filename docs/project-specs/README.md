# 📚 EATECH Project Specifications

Dieses Verzeichnis enthält alle wichtigen Projektspezifikationen und Dokumentationen für das EATECH Food Truck System.

## 📄 Dokumente

### [MASTER_PROJECT_SPECIFICATION.md](./MASTER_PROJECT_SPECIFICATION.md)
Die komplette Projektübersicht mit:
- Vision & Ziele
- Geschäftsmodell (3% Transaktionsgebühr)
- Feature-Liste
- Hierarchie (Master-Admin → Manager → Food Truck → Kunde)
- Zeitplan (Launch: 1. August 2024)
- Erfolgsmetriken

### [TECHNICAL_IMPLEMENTATION_GUIDE.md](./TECHNICAL_IMPLEMENTATION_GUIDE.md)
Technische Implementierungsdetails:
- Architektur (Monorepo mit Turbo)
- Firebase Datenstruktur
- Stripe Connect Integration
- OpenAI Integration (Voice + KI)
- HACCP Compliance
- PWA & Offline Support
- Testing-Strategie

## 🔑 Wichtige Entscheidungen

### Business Model
- **Food Trucks:** 3% auf alle App-Umsätze
- **Erste 3 Monate:** Gratis (echte Zahlungen)
- **Manager:** Kostenlos (nur Vermittler)
- **Extras:** Whitelabel, Events (später)

### Tech Stack
- **Frontend:** React + Vite + Tailwind
- **Backend:** Firebase + Cloud Functions
- **Payments:** Stripe Connect (mit TWINT)
- **AI:** OpenAI (GPT-4 + Whisper)
- **Analytics:** Sentry + Plausible

### Features
- ✅ Mehrsprachig (DE/FR/IT/EN) von Anfang an
- ✅ Voice-Bestellung auf Schweizerdeutsch
- ✅ HACCP Automatisierung
- ✅ Dynamic Pricing mit KI
- ✅ Smart Notifications
- ✅ Predictive Maintenance
- ❌ Keine nativen Apps (nur PWA)
- ❌ Keine Tischreservierungen
- ❌ Kein Loyalty System

### Ziele
- **Jahr 1:** 20-100 Food Trucks
- **Jahr 3:** 2000+ Food Trucks
- **Umsatzziel:** 3 Mio CHF (bei 2000 Trucks)

## 🚀 Nächste Schritte

1. **Phase 3 starten:** Implementierung der Core Features
2. **Domain registrieren:** eatech.ch
3. **Stripe Connect:** Account erstellen
4. **Firebase:** Projekt konfigurieren

## 📞 Kontakt

**Master-Admin:** Benedikt
**Erster Test-Kunde:** Nachbar (Food Truck Betreiber)
**Launch:** 1. August 2024

---

*Diese Spezifikationen sind das Ergebnis einer ausführlichen Planungsphase und enthalten alle wichtigen Entscheidungen für das Projekt.*
