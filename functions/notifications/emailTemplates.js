/**
 * EATECH - EMAIL TEMPLATES
 * Version: 5.0.0
 * Description: Responsive, multilingual email templates for all notifications
 * Features: Dark/Light mode, Swiss languages, Mobile optimized
 * Author: EATECH Development Team
 * Last Modified: 2025-01-04
 * 
 * 📍 Dateipfad: functions/src/templates/email-templates.js
 */

const handlebars = require('handlebars');

// ============================================================================
// TEMPLATE CONFIGURATION
// ============================================================================
const TEMPLATE_CONFIG = {
    languages: ['de-CH', 'fr-CH', 'it-CH', 'en'],
    defaultLanguage: 'de-CH',
    
    colors: {
        primary: '#FF6B6B',
        secondary: '#4ECDC4',
        accent: '#FFE66D',
        success: '#00E676',
        warning: '#FFC107',
        error: '#F44336',
        dark: '#0A0A0A',
        light: '#FFFFFF',
        gray: '#9E9E9E'
    },
    
    fonts: {
        primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        monospace: '"SF Mono", Monaco, "Courier New", monospace'
    }
};

// ============================================================================
// TRANSLATIONS
// ============================================================================
const translations = {
    'de-CH': {
        // Common
        greeting: 'Hallo',
        regards: 'Mit freundlichen Grüssen',
        team: 'Ihr EATECH Team',
        
        // Order Confirmation
        orderConfirmation: {
            subject: 'Bestellbestätigung #{{orderNumber}}',
            title: 'Vielen Dank für Ihre Bestellung!',
            subtitle: 'Ihre Bestellung wurde erfolgreich aufgegeben.',
            orderNumber: 'Bestellnummer',
            orderDate: 'Bestelldatum',
            estimatedTime: 'Geschätzte Wartezeit',
            minutes: 'Minuten',
            items: 'Bestellte Artikel',
            subtotal: 'Zwischensumme',
            vat: 'MwSt.',
            delivery: 'Liefergebühr',
            total: 'Gesamt',
            paymentMethod: 'Zahlungsmethode',
            deliveryAddress: 'Lieferadresse',
            pickupLocation: 'Abholort',
            trackOrder: 'Bestellung verfolgen',
            needHelp: 'Brauchen Sie Hilfe?',
            contact: 'Kontaktieren Sie uns'
        },
        
        // Order Ready
        orderReady: {
            subject: '🎉 Bestellung #{{orderNumber}} ist bereit!',
            title: 'Ihre Bestellung ist fertig!',
            subtitle: 'Bitte holen Sie Ihre Bestellung ab.',
            message: 'Ihre Bestellung wartet auf Sie. Bitte kommen Sie zur Ausgabe.',
            orderNumber: 'Bestellnummer',
            showNumber: 'Zeigen Sie diese Nummer bei der Abholung',
            location: 'Abholort',
            validUntil: 'Gültig bis',
            hurry: 'Bitte holen Sie Ihre Bestellung zeitnah ab!'
        },
        
        // Status Updates
        statusUpdate: {
            subject: 'Status-Update für Bestellung #{{orderNumber}}',
            confirmed: {
                title: 'Bestellung bestätigt',
                message: 'Ihre Bestellung wurde bestätigt und wird nun zubereitet.'
            },
            preparing: {
                title: 'In Zubereitung',
                message: 'Ihre Bestellung wird gerade frisch für Sie zubereitet.'
            },
            ready: {
                title: 'Bereit zur Abholung',
                message: 'Ihre Bestellung ist fertig! Bitte holen Sie sie ab.'
            },
            completed: {
                title: 'Bestellung abgeschlossen',
                message: 'Vielen Dank! Wir hoffen, es hat Ihnen geschmeckt.'
            },
            cancelled: {
                title: 'Bestellung storniert',
                message: 'Ihre Bestellung wurde storniert. Bei Fragen kontaktieren Sie uns bitte.'
            }
        },
        
        // Welcome Email
        welcome: {
            subject: 'Willkommen bei {{businessName}}!',
            title: 'Willkommen!',
            subtitle: 'Schön, dass Sie da sind.',
            message: 'Vielen Dank für Ihre Registrierung. Entdecken Sie unsere leckeren Angebote!',
            firstOrderDiscount: 'Als Willkommensgeschenk erhalten Sie {{discount}}% Rabatt auf Ihre erste Bestellung!',
            discountCode: 'Ihr Rabattcode',
            validUntil: 'Gültig bis',
            browseMenu: 'Speisekarte ansehen',
            downloadApp: 'App herunterladen'
        },
        
        // Password Reset
        passwordReset: {
            subject: 'Passwort zurücksetzen',
            title: 'Passwort zurücksetzen',
            message: 'Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.',
            instruction: 'Klicken Sie auf den folgenden Link, um ein neues Passwort zu erstellen:',
            resetButton: 'Passwort zurücksetzen',
            validFor: 'Dieser Link ist 24 Stunden gültig.',
            notYou: 'Wenn Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.'
        },
        
        // Invoice
        invoice: {
            subject: 'Rechnung #{{invoiceNumber}}',
            title: 'Rechnung',
            invoiceNumber: 'Rechnungsnummer',
            invoiceDate: 'Rechnungsdatum',
            dueDate: 'Fälligkeitsdatum',
            billTo: 'Rechnungsempfänger',
            description: 'Beschreibung',
            quantity: 'Menge',
            unitPrice: 'Einzelpreis',
            amount: 'Betrag',
            subtotal: 'Zwischensumme',
            vat: 'MwSt. {{rate}}%',
            total: 'Gesamtbetrag',
            paymentInstructions: 'Zahlungshinweise',
            bankDetails: 'Bankverbindung',
            iban: 'IBAN',
            reference: 'Zahlungsreferenz',
            qrBill: 'QR-Rechnung'
        }
    },
    
    'fr-CH': {
        // Common
        greeting: 'Bonjour',
        regards: 'Meilleures salutations',
        team: 'Votre équipe EATECH',
        
        // Order Confirmation
        orderConfirmation: {
            subject: 'Confirmation de commande #{{orderNumber}}',
            title: 'Merci pour votre commande!',
            subtitle: 'Votre commande a été passée avec succès.',
            orderNumber: 'Numéro de commande',
            orderDate: 'Date de commande',
            estimatedTime: 'Temps d\'attente estimé',
            minutes: 'minutes',
            items: 'Articles commandés',
            subtotal: 'Sous-total',
            vat: 'TVA',
            delivery: 'Frais de livraison',
            total: 'Total',
            paymentMethod: 'Méthode de paiement',
            deliveryAddress: 'Adresse de livraison',
            pickupLocation: 'Lieu de retrait',
            trackOrder: 'Suivre la commande',
            needHelp: 'Besoin d\'aide?',
            contact: 'Contactez-nous'
        }
        // ... weitere französische Übersetzungen
    },
    
    'it-CH': {
        // Common
        greeting: 'Ciao',
        regards: 'Cordiali saluti',
        team: 'Il tuo team EATECH',
        
        // Order Confirmation
        orderConfirmation: {
            subject: 'Conferma ordine #{{orderNumber}}',
            title: 'Grazie per il tuo ordine!',
            subtitle: 'Il tuo ordine è stato effettuato con successo.',
            orderNumber: 'Numero ordine',
            orderDate: 'Data ordine',
            estimatedTime: 'Tempo di attesa stimato',
            minutes: 'minuti',
            items: 'Articoli ordinati',
            subtotal: 'Subtotale',
            vat: 'IVA',
            delivery: 'Spese di consegna',
            total: 'Totale',
            paymentMethod: 'Metodo di pagamento',
            deliveryAddress: 'Indirizzo di consegna',
            pickupLocation: 'Luogo di ritiro',
            trackOrder: 'Traccia ordine',
            needHelp: 'Hai bisogno di aiuto?',
            contact: 'Contattaci'
        }
        // ... weitere italienische Übersetzungen
    }
};

// ============================================================================
// BASE EMAIL TEMPLATE
// ============================================================================
const baseTemplate = `
<!DOCTYPE html>
<html lang="{{language}}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>{{subject}}</title>
    
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    
    <style>
        /* Reset styles */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
        
        /* Remove default styling */
        body { margin: 0 !important; padding: 0 !important; width: 100% !important; min-width: 100% !important; }
        
        /* Base styles */
        body {
            font-family: ${TEMPLATE_CONFIG.fonts.primary};
            font-size: 16px;
            line-height: 1.6;
            color: #333333;
            background-color: #f4f4f4;
        }
        
        /* Container styles */
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        
        /* Header styles */
        .header {
            background: linear-gradient(135deg, ${TEMPLATE_CONFIG.colors.primary} 0%, ${TEMPLATE_CONFIG.colors.secondary} 100%);
            padding: 40px 30px;
            text-align: center;
        }
        
        .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }
        
        /* Content styles */
        .content {
            padding: 40px 30px;
        }
        
        .content h2 {
            color: ${TEMPLATE_CONFIG.colors.primary};
            font-size: 24px;
            margin-bottom: 20px;
        }
        
        .content p {
            margin-bottom: 20px;
        }
        
        /* Button styles */
        .button {
            display: inline-block;
            padding: 14px 30px;
            background-color: ${TEMPLATE_CONFIG.colors.primary};
            color: #ffffff;
            text-decoration: none;
            border-radius: 30px;
            font-weight: 600;
            margin: 20px 0;
        }
        
        .button:hover {
            background-color: ${TEMPLATE_CONFIG.colors.secondary};
        }
        
        /* Order details */
        .order-details {
            background-color: #f9f9f9;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .order-item {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .order-item:last-child {
            border-bottom: none;
        }
        
        .order-total {
            font-size: 20px;
            font-weight: bold;
            color: ${TEMPLATE_CONFIG.colors.primary};
            margin-top: 10px;
        }
        
        /* Footer styles */
        .footer {
            background-color: #f4f4f4;
            padding: 30px;
            text-align: center;
            color: #666666;
            font-size: 14px;
        }
        
        .footer a {
            color: ${TEMPLATE_CONFIG.colors.primary};
            text-decoration: none;
        }
        
        .social-links {
            margin: 20px 0;
        }
        
        .social-links a {
            display: inline-block;
            margin: 0 10px;
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
            body { background-color: #1a1a1a !important; }
            .email-container { background-color: #2a2a2a !important; }
            .content { color: #ffffff !important; }
            .order-details { background-color: #333333 !important; }
            .footer { background-color: #1a1a1a !important; color: #cccccc !important; }
        }
        
        /* Mobile styles */
        @media screen and (max-width: 600px) {
            .email-container { width: 100% !important; }
            .header { padding: 30px 20px !important; }
            .content { padding: 30px 20px !important; }
            .header h1 { font-size: 24px !important; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <img src="{{logoUrl}}" alt="{{businessName}}" style="max-width: 200px; height: auto; margin-bottom: 20px;">
            <h1>{{headerTitle}}</h1>
        </div>
        
        <!-- Content -->
        <div class="content">
            {{{content}}}
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p>{{footerText}}</p>
            
            <div class="social-links">
                {{#if socialLinks.facebook}}
                <a href="{{socialLinks.facebook}}">
                    <img src="https://cdn.eatech.ch/images/social/facebook.png" alt="Facebook" width="32" height="32">
                </a>
                {{/if}}
                {{#if socialLinks.instagram}}
                <a href="{{socialLinks.instagram}}">
                    <img src="https://cdn.eatech.ch/images/social/instagram.png" alt="Instagram" width="32" height="32">
                </a>
                {{/if}}
                {{#if socialLinks.twitter}}
                <a href="{{socialLinks.twitter}}">
                    <img src="https://cdn.eatech.ch/images/social/twitter.png" alt="Twitter" width="32" height="32">
                </a>
                {{/if}}
            </div>
            
            <p style="margin-top: 20px;">
                {{businessName}}<br>
                {{businessAddress}}<br>
                <a href="tel:{{businessPhone}}">{{businessPhone}}</a> | 
                <a href="mailto:{{businessEmail}}">{{businessEmail}}</a>
            </p>
            
            <p style="margin-top: 20px; font-size: 12px; color: #999999;">
                © {{currentYear}} {{businessName}}. Alle Rechte vorbehalten.<br>
                <a href="{{unsubscribeUrl}}">Abmelden</a> | 
                <a href="{{privacyUrl}}">Datenschutz</a>
            </p>
        </div>
    </div>
</body>
</html>
`;

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

/**
 * Order Confirmation Template
 */
const orderConfirmationTemplate = `
<p>{{t.greeting}} {{customerName}},</p>

<p>{{t.orderConfirmation.subtitle}}</p>

<div class="order-details">
    <h3>{{t.orderConfirmation.orderNumber}}: <strong>#{{orderNumber}}</strong></h3>
    <p>{{t.orderConfirmation.orderDate}}: {{orderDate}}</p>
    <p>{{t.orderConfirmation.estimatedTime}}: <strong>{{estimatedTime}} {{t.orderConfirmation.minutes}}</strong></p>
    
    <h4>{{t.orderConfirmation.items}}:</h4>
    {{#each items}}
    <div class="order-item">
        <span>{{this.quantity}}x {{this.name}}</span>
        <span>CHF {{this.total}}</span>
    </div>
    {{/each}}
    
    <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e0e0e0;">
        <div class="order-item">
            <span>{{t.orderConfirmation.subtotal}}:</span>
            <span>CHF {{subtotal}}</span>
        </div>
        {{#if vat}}
        <div class="order-item">
            <span>{{t.orderConfirmation.vat}}:</span>
            <span>CHF {{vat}}</span>
        </div>
        {{/if}}
        {{#if deliveryFee}}
        <div class="order-item">
            <span>{{t.orderConfirmation.delivery}}:</span>
            <span>CHF {{deliveryFee}}</span>
        </div>
        {{/if}}
        <div class="order-item order-total">
            <span>{{t.orderConfirmation.total}}:</span>
            <span>CHF {{total}}</span>
        </div>
    </div>
    
    <p style="margin-top: 20px;">
        <strong>{{t.orderConfirmation.paymentMethod}}:</strong> {{paymentMethod}}
    </p>
    
    {{#if deliveryAddress}}
    <p>
        <strong>{{t.orderConfirmation.deliveryAddress}}:</strong><br>
        {{deliveryAddress}}
    </p>
    {{else}}
    <p>
        <strong>{{t.orderConfirmation.pickupLocation}}:</strong><br>
        {{pickupLocation}}
    </p>
    {{/if}}
</div>

<div style="text-align: center;">
    <a href="{{trackingUrl}}" class="button">{{t.orderConfirmation.trackOrder}}</a>
</div>

<p>{{t.orderConfirmation.needHelp}} <a href="mailto:{{supportEmail}}">{{t.orderConfirmation.contact}}</a></p>

<p>{{t.regards}},<br>{{t.team}}</p>
`;

/**
 * Order Ready Template
 */
const orderReadyTemplate = `
<div style="text-align: center; margin-bottom: 30px;">
    <div style="font-size: 72px;">🎉</div>
</div>

<p>{{t.greeting}} {{customerName}},</p>

<h2 style="text-align: center; color: #00E676;">{{t.orderReady.title}}</h2>

<p style="text-align: center; font-size: 18px;">{{t.orderReady.message}}</p>

<div class="order-details" style="text-align: center; background-color: #E8F5E9;">
    <p style="font-size: 14px; color: #666; margin-bottom: 10px;">{{t.orderReady.orderNumber}}</p>
    <div style="font-size: 48px; font-weight: bold; color: #00E676; margin: 20px 0;">
        #{{orderNumber}}
    </div>
    <p style="font-size: 14px; color: #666;">{{t.orderReady.showNumber}}</p>
</div>

{{#if pickupLocation}}
<div style="margin: 30px 0; text-align: center;">
    <p><strong>{{t.orderReady.location}}:</strong></p>
    <p style="font-size: 18px;">{{pickupLocation}}</p>
</div>
{{/if}}

<p style="text-align: center; color: #F44336; font-weight: bold;">
    {{t.orderReady.hurry}}
</p>

<div style="text-align: center;">
    <a href="{{trackingUrl}}" class="button" style="background-color: #00E676;">
        {{t.orderConfirmation.trackOrder}}
    </a>
</div>

<p>{{t.regards}},<br>{{t.team}}</p>
`;

/**
 * Welcome Email Template
 */
const welcomeTemplate = `
<div style="text-align: center; margin-bottom: 30px;">
    <div style="font-size: 72px;">👋</div>
</div>

<p>{{t.greeting}} {{customerName}},</p>

<h2 style="text-align: center;">{{t.welcome.title}}</h2>

<p>{{t.welcome.message}}</p>

{{#if discountCode}}
<div class="order-details" style="text-align: center; background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%); color: white;">
    <p style="font-size: 18px; margin-bottom: 10px;">{{t.welcome.firstOrderDiscount}}</p>
    <p style="font-size: 14px;">{{t.welcome.discountCode}}:</p>
    <div style="font-size: 32px; font-weight: bold; margin: 10px 0; font-family: monospace;">
        {{discountCode}}
    </div>
    <p style="font-size: 14px;">{{t.welcome.validUntil}}: {{validUntil}}</p>
</div>
{{/if}}

<div style="text-align: center; margin: 40px 0;">
    <a href="{{menuUrl}}" class="button">{{t.welcome.browseMenu}}</a>
</div>

<div style="background-color: #f9f9f9; border-radius: 10px; padding: 20px; margin: 20px 0;">
    <h3>Was Sie bei uns erwartet:</h3>
    <ul style="list-style: none; padding: 0;">
        <li style="padding: 10px 0;">✅ Frisch zubereitete Speisen</li>
        <li style="padding: 10px 0;">🚚 Schnelle Lieferung oder Abholung</li>
        <li style="padding: 10px 0;">💳 Sichere Zahlungsmethoden</li>
        <li style="padding: 10px 0;">🎁 Regelmässige Angebote</li>
        <li style="padding: 10px 0;">⭐ Treueprogramm</li>
    </ul>
</div>

{{#if hasApp}}
<div style="text-align: center; margin-top: 40px;">
    <p>Noch bequemer mit unserer App:</p>
    <a href="{{appStoreUrl}}" style="display: inline-block; margin: 10px;">
        <img src="https://cdn.eatech.ch/images/app-store-badge.png" alt="App Store" height="40">
    </a>
    <a href="{{playStoreUrl}}" style="display: inline-block; margin: 10px;">
        <img src="https://cdn.eatech.ch/images/google-play-badge.png" alt="Google Play" height="40">
    </a>
</div>
{{/if}}

<p>{{t.regards}},<br>{{t.team}}</p>
`;

/**
 * Invoice Template
 */
const invoiceTemplate = `
<div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
    <div>
        <h2 style="margin: 0;">{{t.invoice.title}}</h2>
        <p style="margin: 5px 0;">{{t.invoice.invoiceNumber}}: <strong>{{invoiceNumber}}</strong></p>
        <p style="margin: 5px 0;">{{t.invoice.invoiceDate}}: {{invoiceDate}}</p>
        <p style="margin: 5px 0;">{{t.invoice.dueDate}}: <strong>{{dueDate}}</strong></p>
    </div>
    <div style="text-align: right;">
        <img src="{{businessLogo}}" alt="{{businessName}}" style="max-width: 150px;">
    </div>
</div>

<div style="margin-bottom: 40px;">
    <h3>{{t.invoice.billTo}}:</h3>
    <p>
        {{customerName}}<br>
        {{#if customerCompany}}{{customerCompany}}<br>{{/if}}
        {{customerAddress}}<br>
        {{#if customerVatId}}UID: {{customerVatId}}{{/if}}
    </p>
</div>

<table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
    <thead>
        <tr style="background-color: #f4f4f4;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">{{t.invoice.description}}</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">{{t.invoice.quantity}}</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">{{t.invoice.unitPrice}}</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">{{t.invoice.amount}}</th>
        </tr>
    </thead>
    <tbody>
        {{#each items}}
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">{{this.description}}</td>
            <td style="padding: 10px; text-align: center; border-bottom: 1px solid #eee;">{{this.quantity}}</td>
            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">CHF {{this.unitPrice}}</td>
            <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">CHF {{this.amount}}</td>
        </tr>
        {{/each}}
    </tbody>
    <tfoot>
        <tr>
            <td colspan="3" style="padding: 10px; text-align: right;"><strong>{{t.invoice.subtotal}}:</strong></td>
            <td style="padding: 10px; text-align: right;">CHF {{subtotal}}</td>
        </tr>
        {{#each vatRates}}
        <tr>
            <td colspan="3" style="padding: 10px; text-align: right;">{{../t.invoice.vat}} ({{this.amount}} CHF @ {{this.rate}}%):</td>
            <td style="padding: 10px; text-align: right;">CHF {{this.tax}}</td>
        </tr>
        {{/each}}
        <tr style="background-color: #f4f4f4;">
            <td colspan="3" style="padding: 10px; text-align: right; font-size: 18px;"><strong>{{t.invoice.total}}:</strong></td>
            <td style="padding: 10px; text-align: right; font-size: 18px;"><strong>CHF {{total}}</strong></td>
        </tr>
    </tfoot>
</table>

<div style="margin-bottom: 40px;">
    <h3>{{t.invoice.paymentInstructions}}:</h3>
    <p>{{paymentInstructions}}</p>
    
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px;">
        <h4>{{t.invoice.bankDetails}}:</h4>
        <p>
            {{businessName}}<br>
            {{businessAddress}}<br>
            {{t.invoice.iban}}: <strong>{{iban}}</strong><br>
            {{t.invoice.reference}}: <strong>{{paymentReference}}</strong>
        </p>
    </div>
</div>

{{#if qrBillData}}
<div style="page-break-before: always; margin-top: 40px;">
    <h3>{{t.invoice.qrBill}}:</h3>
    <div style="text-align: center;">
        <img src="{{qrBillImage}}" alt="QR-Rechnung" style="max-width: 100%; height: auto;">
    </div>
</div>
{{/if}}

<div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #ddd; font-size: 12px; color: #666;">
    <p>
        {{businessName}} | {{businessAddress}}<br>
        UID: {{businessVatId}} | Tel: {{businessPhone}} | E-Mail: {{businessEmail}}
    </p>
</div>