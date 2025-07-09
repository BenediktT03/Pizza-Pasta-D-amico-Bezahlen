# 🎛️ EATECH - KOMPLETTE FEATURE FLAGS LISTE

## 📋 Übersicht
Dieses Dokument listet ALLE Features auf, die im Master Control Panel aktiviert/deaktiviert werden können.
**JEDE FUNKTION IST EINZELN STEUERBAR!**

## 🛒 Bestellsystem (ordering)

### Basis-Bestellung
- `basic_ordering` - Grundlegende Bestellfunktion (IMMER AKTIV)
- `qr_code_scanning` - QR-Code Scanner aktivieren
- `digital_menu` - Digitale Speisekarte anzeigen
- `multi_language_menu` - Mehrsprachige Menüs
- `language_selector` - Sprachauswahl beim Start
- `language_de` - Deutsch aktivieren
- `language_fr` - Französisch aktivieren
- `language_it` - Italienisch aktivieren  
- `language_en` - Englisch aktivieren

### Voice-Bestellung
- `voice_ordering` - Voice-Bestellung Hauptfunktion
- `voice_to_text` - Sprache zu Text Konvertierung
- `voice_swiss_german` - Schweizerdeutsch Unterstützung
- `voice_correction` - Sprachkorrektur ("Nicht 2 sondern 3")
- `voice_confirmation_screen` - Bestätigung via Screen
- `voice_multilingual` - Mehrsprachige Voice-Unterstützung

### Produkt-Features
- `product_images` - Produktbilder anzeigen
- `product_modifiers` - Modifikatoren (ohne Zwiebeln, extra Käse)
- `special_instructions` - Spezielle Anweisungen Textfeld
- `special_instructions_limit` - 200 Zeichen Limit
- `allergen_display` - Allergen-Anzeige
- `nutritional_info` - Nährwertangaben
- `product_origin` - Herkunftsland (Fleisch)
- `product_labels` - Bio/Label-Zertifikate

### Bestell-Features
- `favorites_system` - Favoriten speichern
- `reorder_previous` - Vorherige Bestellung wiederholen
- `pre_ordering` - Vorbestellungen
- `pre_order_max_days` - Max 1 Tag im Voraus
- `waiting_time_display` - Wartezeit-Anzeige
- `order_tracking` - Bestellverfolgung
- `order_number_system` - Bestellnummern (ab 100)

### Kunden-Features
- `customer_accounts` - Kundenkonten
- `customer_profiles` - Kundenprofile
- `follow_trucks` - Lieblings-Trucks folgen
- `smart_notifications` - "Dein Lieblingsburger ist wieder da!"
- `customer_recognition` - Stammkunden-Erkennung

## 💳 Payment System (payment)

### Zahlungsmethoden
- `payment_processing` - Basis Payment (IMMER AKTIV)
- `stripe_payments` - Stripe Integration
- `credit_cards` - Kreditkarten
- `twint_payment` - TWINT
- `apple_pay` - Apple Pay
- `google_pay` - Google Pay
- `crypto_payments` - Bitcoin/ETH (wenn implementiert)

### Gebühren & Extras
- `tip_feature` - Trinkgeld-Feature
- `tip_percentage_buttons` - Schnellauswahl (5%, 10%, 15%)
- `custom_tip_amount` - Eigener Trinkgeldbetrag
- `platform_fee` - 3% Platform Fee
- `platform_fee_display` - Gebühren transparent anzeigen
- `trial_mode` - 3 Monate gratis Trial

### Rechnungen & Stornierung
- `invoice_generation` - Rechnungsstellung
- `qr_bill` - QR-Rechnung
- `order_cancellation` - Stornierungen
- `auto_refunds` - Automatische Rückerstattungen
- `refund_if_truck_no_show` - Rückerstattung wenn Truck nicht kommt

## 🤖 AI Features (ai)

### Dynamic Pricing
- `dynamic_pricing` - Dynamic Pricing Hauptfunktion
- `price_suggestions` - Preisvorschläge anzeigen
- `auto_price_adjustment` - Automatische Preisanpassung
- `psychological_pricing` - Psychologische Preise (X.90)
- `bundle_suggestions` - Bündelungsvorschläge
- `rush_hour_pricing` - Rush Hour Preisanpassung
- `event_pricing` - Event-basierte Preise
- `weather_pricing` - Wetterbasierte Preise

### Intelligente Assistenz
- `ai_chatbot` - Chat-Bot für Kundenfragen
- `nutrition_advice` - Ernährungsberatung
- `product_recommendations` - Produktempfehlungen
- `upselling_suggestions` - Upselling-Vorschläge
- `complaint_detection` - Beschwerde-Erkennung
- `auto_ticket_creation` - Automatische Ticket-Erstellung

### Vorhersagen & Planung
- `demand_planning` - Bedarfsplanung
- `inventory_predictions` - "Morgen brauchst du 50kg Pommes"
- `rush_hour_prediction` - Rush-Hour Vorhersage
- `capacity_planning` - Kapazitätsplanung
- `weather_insights` - Wetter-basierte Insights
- `event_calendar_integration` - Event-Kalender Integration

### Wartung & Optimierung
- `predictive_maintenance` - Predictive Maintenance
- `maintenance_reminders` - Wartungserinnerungen
- `fraud_detection` - Betrugs-Erkennung
- `