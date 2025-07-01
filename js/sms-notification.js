// SMS Notification System für Pizza&Pasta D'amico
// Twilio Integration für Kundenbenachrichtigungen

class SMSNotificationService {
    constructor() {
        // Twilio Credentials (sollten in einer sicheren Umgebung gespeichert werden)
        // Für Production: Diese sollten über Cloud Functions ausgeführt werden
        this.twilioConfig = {
            accountSid: 'YOUR_TWILIO_ACCOUNT_SID',
            authToken: 'YOUR_TWILIO_AUTH_TOKEN',
            fromNumber: '+41XXXXXXXXX', // Deine Twilio Schweizer Nummer
            // Für Production: Nutze Firebase Cloud Functions statt direkte API Calls
            functionUrl: 'https://your-region-your-project.cloudfunctions.net/sendSMS'
        };
        
        this.messageTemplates = {
            orderConfirmed: {
                de: "Hallo {name}! Ihre Bestellung #{orderId} wurde bestätigt. Geschätzte Wartezeit: {waitTime} Minuten. 🍕",
                fr: "Bonjour {name}! Votre commande #{orderId} est confirmée. Temps d'attente estimé: {waitTime} minutes. 🍕",
                it: "Ciao {name}! Il tuo ordine #{orderId} è confermato. Tempo di attesa stimato: {waitTime} minuti. 🍕",
                en: "Hello {name}! Your order #{orderId} is confirmed. Estimated wait time: {waitTime} minutes. 🍕"
            },
            orderReady: {
                de: "Ihre Bestellung #{orderId} ist fertig! Bitte holen Sie sie am Foodtruck ab. Guten Appetit! 🍝",
                fr: "Votre commande #{orderId} est prête! Veuillez la récupérer au food truck. Bon appétit! 🍝",
                it: "Il tuo ordine #{orderId} è pronto! Ritiralo al food truck. Buon appetito! 🍝",
                en: "Your order #{orderId} is ready! Please pick it up at the food truck. Enjoy! 🍝"
            },
            orderCancelled: {
                de: "Ihre Bestellung #{orderId} wurde storniert. Bei Fragen kontaktieren Sie uns bitte.",
                fr: "Votre commande #{orderId} a été annulée. Pour toute question, veuillez nous contacter.",
                it: "Il tuo ordine #{orderId} è stato annullato. Per domande, contattaci.",
                en: "Your order #{orderId} has been cancelled. Please contact us if you have questions."
            }
        };
    }
    
    // Firebase Cloud Function für SMS-Versand (serverseitig)
    getCloudFunctionCode() {
        return `
// Firebase Cloud Function - functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const twilio = require('twilio');

admin.initializeApp();

// Twilio initialisieren
const accountSid = functions.config().twilio.account_sid;
const authToken = functions.config().twilio.auth_token;
const twilioClient = twilio(accountSid, authToken);
const fromNumber = functions.config().twilio.from_number;

exports.sendSMS = functions.https.onCall(async (data, context) => {
    // Authentifizierung prüfen
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Not authenticated');
    }
    
    const { to, message, orderId } = data;
    
    try {
        // SMS senden
        const result = await twilioClient.messages.create({
            body: message,
            from: fromNumber,
            to: to
        });
        
        // Log in Firebase speichern
        await admin.database().ref(\`sms_logs/\${orderId}\`).push({
            timestamp: admin.database.ServerValue.TIMESTAMP,
            to: to,
            message: message,
            status: 'sent',
            messageId: result.sid
        });
        
        return { success: true, messageId: result.sid };
        
    } catch (error) {
        console.error('SMS send error:', error);
        
        // Fehler loggen
        await admin.database().ref(\`sms_logs/\${orderId}/errors\`).push({
            timestamp: admin.database.ServerValue.TIMESTAMP,
            error: error.message
        });
        
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// Webhook für Twilio Status Updates
exports.twilioWebhook = functions.https.onRequest(async (req, res) => {
    const { MessageStatus, MessageSid, To } = req.body;
    
    // Status in Firebase aktualisieren
    const logsRef = admin.database().ref('sms_logs');
    const snapshot = await logsRef.orderByChild('messageId').equalTo(MessageSid).once('value');
    
    snapshot.forEach(child => {
        child.ref.update({
            status: MessageStatus,
            updatedAt: admin.database.ServerValue.TIMESTAMP
        });
    });
    
    res.status(200).send('OK');
});
`;
    }
    
    // SMS Template mit Variablen füllen
    fillTemplate(template, variables, language = 'de') {
        let message = template[language] || template.de;
        
        Object.keys(variables).forEach(key => {
            message = message.replace(`{${key}}`, variables[key]);
        });
        
        return message;
    }
    
    // Telefonnummer validieren und formatieren (Schweiz)
    formatPhoneNumber(phone) {
        // Entferne alle nicht-numerischen Zeichen
        let cleaned = phone.replace(/\D/g, '');
        
        // Schweizer Nummern
        if (cleaned.startsWith('41')) {
            return '+' + cleaned;
        } else if (cleaned.startsWith('0')) {
            // Ersetze führende 0 mit +41
            return '+41' + cleaned.substring(1);
        } else if (cleaned.length === 9) {
            // Nur die Nummer ohne Vorwahl
            return '+41' + cleaned;
        }
        
        // Internationale Nummern
        if (!cleaned.startsWith('+')) {
            cleaned = '+' + cleaned;
        }
        
        return cleaned;
    }
    
    // SMS senden (Client-seitig)
    async sendSMS(phoneNumber, message, orderId) {
        try {
            const formattedNumber = this.formatPhoneNumber(phoneNumber);
            
            // Für Production: Cloud Function aufrufen
            if (firebase.functions) {
                const sendSMS = firebase.functions().httpsCallable('sendSMS');
                const result = await sendSMS({
                    to: formattedNumber,
                    message: message,
                    orderId: orderId
                });
                
                return result.data;
            } else {
                // Development/Test Mode
                console.log('SMS würde gesendet werden an:', formattedNumber);
                console.log('Nachricht:', message);
                
                // Simuliere SMS-Versand
                return {
                    success: true,
                    messageId: 'test-' + Date.now(),
                    testMode: true
                };
            }
            
        } catch (error) {
            console.error('SMS Fehler:', error);
            throw error;
        }
    }
    
    // Bestellbestätigung senden
    async sendOrderConfirmation(order, language = 'de') {
        const message = this.fillTemplate(
            this.messageTemplates.orderConfirmed,
            {
                name: order.customerName,
                orderId: order.id,
                waitTime: order.estimatedWaitTime || 15
            },
            language
        );
        
        return await this.sendSMS(order.phone, message, order.id);
    }
    
    // Bestellung fertig Benachrichtigung
    async sendOrderReady(order, language = 'de') {
        const message = this.fillTemplate(
            this.messageTemplates.orderReady,
            {
                orderId: order.id
            },
            language
        );
        
        return await this.sendSMS(order.phone, message, order.id);
    }
    
    // Bestellung storniert Benachrichtigung
    async sendOrderCancelled(order, language = 'de') {
        const message = this.fillTemplate(
            this.messageTemplates.orderCancelled,
            {
                orderId: order.id
            },
            language
        );
        
        return await this.sendSMS(order.phone, message, order.id);
    }
    
    // Batch SMS für Marketing (mit Opt-in Prüfung)
    async sendMarketingSMS(customers, message) {
        const results = [];
        
        for (const customer of customers) {
            if (customer.smsOptIn) {
                try {
                    const result = await this.sendSMS(
                        customer.phone,
                        message,
                        'marketing-' + Date.now()
                    );
                    results.push({ customer: customer.id, ...result });
                } catch (error) {
                    results.push({ 
                        customer: customer.id, 
                        error: error.message 
                    });
                }
                
                // Rate limiting - 1 SMS pro Sekunde
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        return results;
    }
}

// Integration in bestehende Order-Verwaltung
class OrderSMSIntegration {
    constructor() {
        this.smsService = new SMSNotificationService();
    }
    
    // In admin-orders.html integrieren
    initializeOrderHandlers() {
        // Bestellung annehmen mit SMS
        window.acceptOrderWithSMS = async (orderId) => {
            try {
                const orderRef = firebase.database().ref(`orders/${orderId}`);
                const snapshot = await orderRef.once('value');
                const order = snapshot.val();
                
                if (order && order.phone) {
                    // Status aktualisieren
                    await orderRef.update({
                        status: 'preparing',
                        acceptedAt: firebase.database.ServerValue.TIMESTAMP
                    });
                    
                    // SMS senden
                    await this.smsService.sendOrderConfirmation(order, order.language || 'de');
                    
                    // UI Feedback
                    showNotification('Bestellung angenommen und SMS gesendet!', 'success');
                }
            } catch (error) {
                console.error('Fehler:', error);
                showNotification('Fehler beim SMS-Versand', 'error');
            }
        };
        
        // Bestellung fertig mit SMS
        window.completeOrderWithSMS = async (orderId) => {
            try {
                const orderRef = firebase.database().ref(`orders/${orderId}`);
                const snapshot = await orderRef.once('value');
                const order = snapshot.val();
                
                if (order && order.phone) {
                    // Status aktualisieren
                    await orderRef.update({
                        status: 'ready',
                        readyAt: firebase.database.ServerValue.TIMESTAMP
                    });
                    
                    // SMS senden
                    await this.smsService.sendOrderReady(order, order.language || 'de');
                    
                    // UI Feedback
                    showNotification('Kunde wurde per SMS benachrichtigt!', 'success');
                }
            } catch (error) {
                console.error('Fehler:', error);
                showNotification('Fehler beim SMS-Versand', 'error');
            }
        };
    }
}

// Checkout-Formular Erweiterung für Telefonnummer
function extendCheckoutForm() {
    // Diese Funktion sollte in index.html integriert werden
    const phoneFieldHTML = `
        <div class="form-group">
            <label for="phone">Telefonnummer für SMS-Benachrichtigung</label>
            <input type="tel" 
                   id="phone" 
                   name="phone" 
                   placeholder="+41 79 123 45 67"
                   pattern="[+]?[0-9]{10,15}"
                   required>
            <small>Sie erhalten eine SMS, wenn Ihre Bestellung fertig ist</small>
        </div>
        
        <div class="form-group">
            <label>
                <input type="checkbox" id="smsOptIn" name="smsOptIn">
                Ich möchte SMS-Angebote und Neuigkeiten erhalten
            </label>
        </div>
    `;
    
    // Telefonnummer-Validierung
    document.getElementById('phone')?.addEventListener('input', (e) => {
        const phone = e.target.value;
        const smsService = new SMSNotificationService();
        const formatted = smsService.formatPhoneNumber(phone);
        
        // Live-Formatierung (optional)
        if (phone !== formatted) {
            e.target.value = formatted;
        }
    });
}

// SMS-Dashboard für Admin
class SMSDashboard {
    constructor() {
        this.container = null;
    }
    
    render() {
        return `
            <div class="sms-dashboard">
                <h3>SMS Verwaltung</h3>
                
                <div class="sms-stats">
                    <div class="stat-card">
                        <h4>Heute gesendet</h4>
                        <p class="stat-number" id="sms-sent-today">0</p>
                    </div>
                    <div class="stat-card">
                        <h4>Diesen Monat</h4>
                        <p class="stat-number" id="sms-sent-month">0</p>
                    </div>
                    <div class="stat-card">
                        <h4>Opt-in Kunden</h4>
                        <p class="stat-number" id="sms-optin-count">0</p>
                    </div>
                </div>
                
                <div class="sms-actions">
                    <button onclick="openSMSCampaign()" class="btn-primary">
                        📱 SMS-Kampagne starten
                    </button>
                    <button onclick="viewSMSLogs()" class="btn-secondary">
                        📊 SMS-Logs anzeigen
                    </button>
                </div>
                
                <div id="sms-campaign-modal" class="modal">
                    <div class="modal-content">
                        <h3>SMS-Kampagne erstellen</h3>
                        <textarea id="campaign-message" 
                                  placeholder="Nachricht eingeben..." 
                                  maxlength="160"></textarea>
                        <p class="char-count">0 / 160 Zeichen</p>
                        <button onclick="sendSMSCampaign()">Senden</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    async loadStats() {
        // SMS-Statistiken aus Firebase laden
        const logsRef = firebase.database().ref('sms_logs');
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        
        // Queries für Statistiken
        // ... Implementation
    }
}

// Export für Integration
window.SMSNotificationService = SMSNotificationService;
window.OrderSMSIntegration = OrderSMSIntegration;
window.SMSDashboard = SMSDashboard;