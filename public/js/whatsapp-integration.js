// ============================================================================
// FLOWBITE PRO - WHATSAPP INTEGRATION
// Version: 1.0.0
// Description: WhatsApp Business API Integration für Kundenbenachrichtigungen
// Features: Order Updates, Quick Messages, Multi-Language Support
// ============================================================================

class WhatsAppIntegration {
    constructor() {
        // WhatsApp Business API Configuration
        this.config = {
            businessNumber: '', // Wird in Settings gesetzt
            apiEndpoint: 'https://api.whatsapp.com/send',
            webApiEndpoint: 'https://web.whatsapp.com/send',
            businessApiUrl: '', // Optional: Twilio/MessageBird/etc
            defaultCountryCode: '+41', // Schweiz
            enabled: false
        };
        
        // Message Templates
        this.templates = {
            de: {
                orderConfirmed: '🍕 *Bestellung bestätigt!*\n\nHallo {name},\nIhre Bestellung #{orderNumber} wurde erfolgreich aufgenommen.\n\n📦 *Ihre Bestellung:*\n{items}\n\n💰 *Gesamt:* CHF {total}\n⏱️ *Geschätzte Wartezeit:* {waitTime} Minuten\n\n📍 *Abholort:* {location}\n\nVielen Dank für Ihre Bestellung!',
                
                orderPreparing: '👨‍🍳 *Zubereitung gestartet!*\n\nHallo {name},\nIhre Bestellung #{orderNumber} wird jetzt zubereitet.\n\n⏱️ *Fertig in ca.:* {waitTime} Minuten\n\nWir benachrichtigen Sie, sobald Ihre Bestellung fertig ist.',
                
                orderReady: '✅ *Bestellung fertig!*\n\nHallo {name},\nIhre Bestellung #{orderNumber} ist *FERTIG* und kann abgeholt werden!\n\n📍 *Abholort:* {location}\n🎯 *Bestellnummer:* #{orderNumber}\n\nBitte zeigen Sie diese Nummer bei der Abholung.\n\nGuten Appetit! 🍕',
                
                orderReminder: '🔔 *Erinnerung!*\n\nHallo {name},\nIhre Bestellung #{orderNumber} wartet auf Sie!\n\n📍 *Abholort:* {location}\n\nBitte holen Sie Ihre Bestellung ab.',
                
                waitTimeUpdate: '⏱️ *Wartezeit-Update*\n\nHallo {name},\nDie Wartezeit hat sich geändert.\n\n*Neue Wartezeit:* {waitTime} Minuten\n\nVielen Dank für Ihre Geduld!',
                
                foodtruckClosed: '😴 *Foodtruck geschlossen*\n\nLeider mussten wir früher schließen.\nIhre Bestellung #{orderNumber} wurde storniert.\n\nDer Betrag wird automatisch zurückerstattet.\n\nEntschuldigung für die Unannehmlichkeiten!'
            },
            en: {
                orderConfirmed: '🍕 *Order confirmed!*\n\nHello {name},\nYour order #{orderNumber} has been received.\n\n📦 *Your order:*\n{items}\n\n💰 *Total:* CHF {total}\n⏱️ *Estimated wait time:* {waitTime} minutes\n\n📍 *Pickup location:* {location}\n\nThank you for your order!',
                
                orderPreparing: '👨‍🍳 *Preparation started!*\n\nHello {name},\nYour order #{orderNumber} is now being prepared.\n\n⏱️ *Ready in approx.:* {waitTime} minutes\n\nWe\'ll notify you when ready.',
                
                orderReady: '✅ *Order ready!*\n\nHello {name},\nYour order #{orderNumber} is *READY* for pickup!\n\n📍 *Pickup location:* {location}\n🎯 *Order number:* #{orderNumber}\n\nPlease show this number at pickup.\n\nEnjoy your meal! 🍕',
                
                orderReminder: '🔔 *Reminder!*\n\nHello {name},\nYour order #{orderNumber} is waiting for you!\n\n📍 *Pickup location:* {location}\n\nPlease collect your order.',
                
                waitTimeUpdate: '⏱️ *Wait time update*\n\nHello {name},\nThe wait time has changed.\n\n*New wait time:* {waitTime} minutes\n\nThank you for your patience!',
                
                foodtruckClosed: '😴 *Foodtruck closed*\n\nWe had to close early.\nYour order #{orderNumber} has been cancelled.\n\nThe amount will be refunded automatically.\n\nSorry for the inconvenience!'
            },
            it: {
                orderConfirmed: '🍕 *Ordine confermato!*\n\nCiao {name},\nIl tuo ordine #{orderNumber} è stato ricevuto.\n\n📦 *Il tuo ordine:*\n{items}\n\n💰 *Totale:* CHF {total}\n⏱️ *Tempo di attesa:* {waitTime} minuti\n\n📍 *Luogo di ritiro:* {location}\n\nGrazie per il tuo ordine!',
                
                orderPreparing: '👨‍🍳 *Preparazione iniziata!*\n\nCiao {name},\nIl tuo ordine #{orderNumber} è in preparazione.\n\n⏱️ *Pronto in circa:* {waitTime} minuti\n\nTi avviseremo quando sarà pronto.',
                
                orderReady: '✅ *Ordine pronto!*\n\nCiao {name},\nIl tuo ordine #{orderNumber} è *PRONTO* per il ritiro!\n\n📍 *Luogo di ritiro:* {location}\n🎯 *Numero ordine:* #{orderNumber}\n\nMostra questo numero al ritiro.\n\nBuon appetito! 🍕',
                
                orderReminder: '🔔 *Promemoria!*\n\nCiao {name},\nIl tuo ordine #{orderNumber} ti sta aspettando!\n\n📍 *Luogo di ritiro:* {location}\n\nRitira il tuo ordine.',
                
                waitTimeUpdate: '⏱️ *Aggiornamento tempo di attesa*\n\nCiao {name},\nIl tempo di attesa è cambiato.\n\n*Nuovo tempo:* {waitTime} minuti\n\nGrazie per la pazienza!',
                
                foodtruckClosed: '😴 *Foodtruck chiuso*\n\nAbbiamo dovuto chiudere prima.\nIl tuo ordine #{orderNumber} è stato annullato.\n\nL\'importo verrà rimborsato automaticamente.\n\nCi scusiamo per l\'inconveniente!'
            }
        };
        
        // Quick Reply Options
        this.quickReplies = {
            de: {
                confirmPickup: 'Ich hole ab',
                needMoreTime: 'Brauche mehr Zeit',
                cancelOrder: 'Bestellung stornieren',
                changeOrder: 'Bestellung ändern'
            },
            en: {
                confirmPickup: 'I\'ll pick up',
                needMoreTime: 'Need more time',
                cancelOrder: 'Cancel order',
                changeOrder: 'Change order'
            },
            it: {
                confirmPickup: 'Vengo a ritirare',
                needMoreTime: 'Ho bisogno di più tempo',
                cancelOrder: 'Annulla ordine',
                changeOrder: 'Modifica ordine'
            }
        };
        
        this.loadSettings();
    }
    
    // Settings laden
    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('whatsappSettings') || '{}');
        this.config.businessNumber = settings.businessNumber || '';
        this.config.enabled = settings.enabled || false;
        this.config.defaultCountryCode = settings.countryCode || '+41';
        this.config.businessApiUrl = settings.apiUrl || '';
    }
    
    // Settings speichern
    saveSettings(settings) {
        this.config = { ...this.config, ...settings };
        localStorage.setItem('whatsappSettings', JSON.stringify(settings));
    }
    
    // Telefonnummer formatieren
    formatPhoneNumber(phone) {
        if (!phone) return null;
        
        // Entferne alle nicht-numerischen Zeichen
        phone = phone.replace(/\D/g, '');
        
        // Füge Ländercode hinzu wenn nicht vorhanden
        if (!phone.startsWith('41') && !phone.startsWith('49') && !phone.startsWith('39')) {
            // Entferne führende 0
            if (phone.startsWith('0')) {
                phone = phone.substring(1);
            }
            // Füge Standard-Ländercode hinzu
            phone = this.config.defaultCountryCode.replace('+', '') + phone;
        }
        
        return phone;
    }
    
    // Template verarbeiten
    processTemplate(template, data) {
        let message = template;
        
        // Items formatieren
        if (data.items) {
            const itemsList = data.items
                .map(item => `• ${item.quantity}x ${item.name} (CHF ${(item.price * item.quantity).toFixed(2)})`)
                .join('\n');
            message = message.replace('{items}', itemsList);
        }
        
        // Andere Platzhalter ersetzen
        Object.keys(data).forEach(key => {
            const regex = new RegExp(`{${key}}`, 'g');
            message = message.replace(regex, data[key]);
        });
        
        return message;
    }
    
    // Nachricht senden (Web WhatsApp)
    async sendMessage(phoneNumber, message) {
        if (!this.config.enabled) {
            console.log('WhatsApp disabled');
            return false;
        }
        
        const formattedPhone = this.formatPhoneNumber(phoneNumber);
        if (!formattedPhone) {
            console.error('Invalid phone number');
            return false;
        }
        
        // URL-encode message
        const encodedMessage = encodeURIComponent(message);
        
        // Determine if mobile or desktop
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const baseUrl = isMobile ? this.config.apiEndpoint : this.config.webApiEndpoint;
        
        // Create WhatsApp URL
        const whatsappUrl = `${baseUrl}?phone=${formattedPhone}&text=${encodedMessage}`;
        
        // Open in new window/tab
        window.open(whatsappUrl, '_blank');
        
        // Log for analytics
        this.logMessage(phoneNumber, message, 'web');
        
        return true;
    }
    
    // Business API senden (wenn konfiguriert)
    async sendBusinessApiMessage(phoneNumber, message, mediaUrl = null) {
        if (!this.config.businessApiUrl) {
            return this.sendMessage(phoneNumber, message);
        }
        
        const formattedPhone = this.formatPhoneNumber(phoneNumber);
        
        try {
            const response = await fetch(this.config.businessApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}` // Wenn API Key benötigt
                },
                body: JSON.stringify({
                    to: formattedPhone,
                    body: message,
                    mediaUrl: mediaUrl,
                    from: this.config.businessNumber
                })
            });
            
            if (!response.ok) {
                throw new Error('API request failed');
            }
            
            this.logMessage(phoneNumber, message, 'api');
            return true;
            
        } catch (error) {
            console.error('WhatsApp API Error:', error);
            // Fallback to web WhatsApp
            return this.sendMessage(phoneNumber, message);
        }
    }
    
    // Bestellbestätigung senden
    async sendOrderConfirmation(order, language = 'de') {
        const template = this.templates[language].orderConfirmed;
        const message = this.processTemplate(template, {
            name: order.customerName || 'Kunde',
            orderNumber: order.orderNumber,
            items: order.items,
            total: order.total.toFixed(2),
            waitTime: order.estimatedWaitTime || 15,
            location: order.pickupLocation || 'Foodtruck am Marktplatz'
        });
        
        return this.sendBusinessApiMessage(order.phoneNumber, message);
    }
    
    // Status-Update senden
    async sendStatusUpdate(order, status, language = 'de') {
        let template;
        
        switch(status) {
            case 'preparing':
                template = this.templates[language].orderPreparing;
                break;
            case 'ready':
                template = this.templates[language].orderReady;
                break;
            default:
                return false;
        }
        
        const message = this.processTemplate(template, {
            name: order.customerName || 'Kunde',
            orderNumber: order.orderNumber,
            waitTime: order.estimatedWaitTime || 15,
            location: order.pickupLocation || 'Foodtruck am Marktplatz'
        });
        
        return this.sendBusinessApiMessage(order.phoneNumber, message);
    }
    
    // Erinnerung senden
    async sendReminder(order, language = 'de') {
        const template = this.templates[language].orderReminder;
        const message = this.processTemplate(template, {
            name: order.customerName || 'Kunde',
            orderNumber: order.orderNumber,
            location: order.pickupLocation || 'Foodtruck am Marktplatz'
        });
        
        return this.sendBusinessApiMessage(order.phoneNumber, message);
    }
    
    // Wartezeit-Update
    async sendWaitTimeUpdate(order, newWaitTime, language = 'de') {
        const template = this.templates[language].waitTimeUpdate;
        const message = this.processTemplate(template, {
            name: order.customerName || 'Kunde',
            waitTime: newWaitTime
        });
        
        return this.sendBusinessApiMessage(order.phoneNumber, message);
    }
    
    // Foodtruck geschlossen
    async sendClosedNotification(order, language = 'de') {
        const template = this.templates[language].foodtruckClosed;
        const message = this.processTemplate(template, {
            orderNumber: order.orderNumber
        });
        
        return this.sendBusinessApiMessage(order.phoneNumber, message);
    }
    
    // Quick Message Builder
    buildQuickMessage(order, type, customText = '') {
        const base = `🍕 *Pizza&Pasta D'amico*\n\n`;
        const orderInfo = `Bestellung #${order.orderNumber}\n`;
        
        let message = base + orderInfo;
        
        switch(type) {
            case 'custom':
                message += customText;
                break;
            case 'delay':
                message += '⏱️ Leider gibt es eine kleine Verzögerung.\nIhre Bestellung ist in 10 Minuten fertig.';
                break;
            case 'question':
                message += '❓ Haben Sie eine Frage zu Ihrer Bestellung?\nRufen Sie uns an: ' + this.config.businessNumber;
                break;
        }
        
        return message;
    }
    
    // Bulk Messages (für Wartezeitänderungen etc.)
    async sendBulkMessage(orders, messageTemplate, language = 'de') {
        const results = [];
        
        for (const order of orders) {
            if (order.phoneNumber && order.status !== 'completed') {
                try {
                    await this.sendBusinessApiMessage(
                        order.phoneNumber,
                        this.processTemplate(messageTemplate, order)
                    );
                    results.push({ success: true, orderId: order.id });
                } catch (error) {
                    results.push({ success: false, orderId: order.id, error });
                }
                
                // Rate limiting - wait 1 second between messages
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        return results;
    }
    
    // Message Logging
    logMessage(phoneNumber, message, method) {
        const log = {
            timestamp: Date.now(),
            phoneNumber: this.anonymizePhone(phoneNumber),
            messageLength: message.length,
            method: method,
            success: true
        };
        
        // In Firebase speichern
        if (window.firebase && firebase.database) {
            firebase.database().ref('whatsapp-logs').push(log);
        }
        
        // Local storage für Statistiken
        const logs = JSON.parse(localStorage.getItem('whatsappLogs') || '[]');
        logs.push(log);
        if (logs.length > 100) logs.shift(); // Keep last 100
        localStorage.setItem('whatsappLogs', JSON.stringify(logs));
    }
    
    // Telefonnummer anonymisieren für Logs
    anonymizePhone(phone) {
        if (!phone || phone.length < 4) return 'invalid';
        return phone.substring(0, 3) + '****' + phone.substring(phone.length - 2);
    }
    
    // Opt-in/Opt-out Management
    async checkOptInStatus(phoneNumber) {
        const optOuts = JSON.parse(localStorage.getItem('whatsappOptOuts') || '[]');
        return !optOuts.includes(this.formatPhoneNumber(phoneNumber));
    }
    
    async handleOptOut(phoneNumber) {
        const formatted = this.formatPhoneNumber(phoneNumber);
        const optOuts = JSON.parse(localStorage.getItem('whatsappOptOuts') || '[]');
        
        if (!optOuts.includes(formatted)) {
            optOuts.push(formatted);
            localStorage.setItem('whatsappOptOuts', JSON.stringify(optOuts));
        }
        
        // In Firebase speichern
        if (window.firebase && firebase.database) {
            firebase.database().ref(`whatsapp-optouts/${formatted}`).set(true);
        }
    }
    
    // UI Helper - Telefonnummer Input
    createPhoneInput(containerId, options = {}) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const html = `
            <div class="whatsapp-phone-input">
                <div class="phone-input-group">
                    <select class="country-code" id="countryCode">
                        <option value="+41">🇨🇭 +41</option>
                        <option value="+49">🇩🇪 +49</option>
                        <option value="+43">🇦🇹 +43</option>
                        <option value="+39">🇮🇹 +39</option>
                        <option value="+33">🇫🇷 +33</option>
                    </select>
                    <input type="tel" 
                           id="phoneNumber" 
                           placeholder="79 123 45 67"
                           maxlength="12"
                           pattern="[0-9\s]*">
                </div>
                <label class="whatsapp-consent">
                    <input type="checkbox" id="whatsappConsent">
                    <span>WhatsApp-Benachrichtigungen erhalten</span>
                    <i class="fab fa-whatsapp"></i>
                </label>
                ${options.showTestButton ? `
                    <button class="test-whatsapp" onclick="window.whatsApp.testMessage()">
                        <i class="fab fa-whatsapp"></i> Test-Nachricht
                    </button>
                ` : ''}
            </div>
        `;
        
        container.innerHTML = html;
        
        // Format phone number as user types
        const phoneInput = container.querySelector('#phoneNumber');
        phoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 0) {
                // Format: XX XXX XX XX
                value = value.match(/.{1,2}/g).join(' ').trim();
            }
            e.target.value = value;
        });
    }
    
    // Test Message
    async testMessage() {
        const phoneInput = document.getElementById('phoneNumber');
        const countryCode = document.getElementById('countryCode').value;
        
        if (!phoneInput || !phoneInput.value) {
            alert('Bitte Telefonnummer eingeben');
            return;
        }
        
        const testOrder = {
            orderNumber: 'TEST-' + Date.now(),
            customerName: 'Test-Kunde',
            phoneNumber: countryCode + phoneInput.value.replace(/\s/g, ''),
            items: [
                { name: 'Pizza Margherita', quantity: 1, price: 18.50 },
                { name: 'Tiramisu', quantity: 2, price: 8.50 }
            ],
            total: 35.50,
            estimatedWaitTime: 15
        };
        
        await this.sendOrderConfirmation(testOrder);
    }
    
    // Statistics
    getStatistics() {
        const logs = JSON.parse(localStorage.getItem('whatsappLogs') || '[]');
        const today = new Date().setHours(0, 0, 0, 0);
        
        const stats = {
            total: logs.length,
            today: logs.filter(l => l.timestamp >= today).length,
            successRate: logs.filter(l => l.success).length / logs.length * 100 || 0,
            byMethod: {
                web: logs.filter(l => l.method === 'web').length,
                api: logs.filter(l => l.method === 'api').length
            }
        };
        
        return stats;
    }
}

// Global Instance
window.whatsApp = new WhatsAppIntegration();

// Auto-Integration in Order Flow
document.addEventListener('DOMContentLoaded', () => {
    // Bestellbestätigung senden wenn neue Bestellung erstellt
    if (window.firebase && firebase.database) {
        firebase.database().ref('orders').on('child_added', snapshot => {
            const order = snapshot.val();
            if (order.phoneNumber && order.whatsappConsent) {
                window.whatsApp.sendOrderConfirmation(order, order.language || 'de');
            }
        });
        
        // Status Updates
        firebase.database().ref('orders').on('child_changed', snapshot => {
            const order = snapshot.val();
            const previousStatus = snapshot.child('status').changed() 
                ? snapshot.child('status').val() 
                : null;
                
            if (order.phoneNumber && order.whatsappConsent && previousStatus !== order.status) {
                window.whatsApp.sendStatusUpdate(order, order.status, order.language || 'de');
            }
        });
    }
});

// Export für Module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WhatsAppIntegration;
}