// ============================================================================
// FLOWBITE PRO - VOICE COMMAND ENGINE
// Version: 1.0.0
// Description: Sprachsteuerung für Küchen-Tablet mit Web Speech API
// Commands: "FlowBite, Bestellung X fertig/bereit/zubereitung"
// ============================================================================

class FlowBiteVoiceCommands {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.language = 'de-DE';
        this.wakeWord = 'etech';
        this.commandTimeout = null;
        this.feedbackElement = null;
        this.statusCallback = null;
        this.lastCommand = '';
        
        // Unterstützte Befehle mit Varianten
        this.commands = {
            orderStatus: {
                patterns: [
                    /bestellung\s*(\d+)\s*(fertig|bereit|ready)/i,
                    /order\s*(\d+)\s*(fertig|bereit|ready)/i,
                    /nummer\s*(\d+)\s*(fertig|bereit|ready)/i
                ],
                action: 'setOrderReady'
            },
            orderPreparing: {
                patterns: [
                    /bestellung\s*(\d+)\s*(zubereitung|vorbereitung|preparing)/i,
                    /order\s*(\d+)\s*(zubereitung|vorbereitung|preparing)/i,
                    /nummer\s*(\d+)\s*(zubereitung|vorbereitung|preparing)/i
                ],
                action: 'setOrderPreparing'
            },
            showOrders: {
                patterns: [
                    /zeige\s*(alle\s*)?bestellungen/i,
                    /show\s*(all\s*)?orders/i,
                    /bestellungen\s*anzeigen/i,
                    /übersicht/i
                ],
                action: 'showAllOrders'
            },
            nextOrder: {
                patterns: [
                    /nächste\s*bestellung/i,
                    /next\s*order/i,
                    /weiter/i
                ],
                action: 'showNextOrder'
            },
            setWaitTime: {
                patterns: [
                    /wartezeit\s*(\d+)\s*minuten?/i,
                    /wait\s*time\s*(\d+)\s*minutes?/i,
                    /(\d+)\s*minuten?\s*wartezeit/i
                ],
                action: 'setWaitTime'
            },
            help: {
                patterns: [
                    /hilfe/i,
                    /help/i,
                    /befehle/i,
                    /commands/i
                ],
                action: 'showHelp'
            }
        };
        
        this.initializeSpeechRecognition();
    }
    
    // Browser-Kompatibilität prüfen und initialisieren
    initializeSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.error('❌ Spracherkennung wird nicht unterstützt');
            this.showNotification('Spracherkennung nicht verfügbar', 'error');
            return false;
        }
        
        this.recognition = new SpeechRecognition();
        this.setupRecognition();
        return true;
    }
    
    // Speech Recognition konfigurieren
    setupRecognition() {
        if (!this.recognition) return;
        
        // Konfiguration
        this.recognition.lang = this.language;
        this.recognition.continuous = true; // Kontinuierliches Zuhören
        this.recognition.interimResults = true; // Zwischenergebnisse
        this.recognition.maxAlternatives = 3; // Mehrere Interpretationen
        
        // Event Handlers
        this.recognition.onstart = () => {
            this.isListening = true;
            console.log('🎤 Voice Commands aktiviert');
            this.updateUI('listening');
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            console.log('🔇 Voice Commands pausiert');
            this.updateUI('stopped');
            
            // Auto-Restart wenn gewünscht
            if (this.shouldRestart) {
                setTimeout(() => this.start(), 1000);
            }
        };
        
        this.recognition.onerror = (event) => {
            console.error('❌ Spracherkennungsfehler:', event.error);
            this.handleError(event.error);
        };
        
        this.recognition.onresult = (event) => {
            this.processResults(event);
        };
    }
    
    // Sprachergebnisse verarbeiten
    processResults(event) {
        const results = event.results;
        const lastResult = results[results.length - 1];
        
        if (lastResult.isFinal) {
            // Finale Ergebnisse - alle Alternativen prüfen
            for (let i = 0; i < lastResult.length; i++) {
                const transcript = lastResult[i].transcript.toLowerCase().trim();
                console.log(`🎯 Erkannt (${Math.round(lastResult[i].confidence * 100)}%):`, transcript);
                
                if (this.processCommand(transcript)) {
                    break; // Befehl erfolgreich verarbeitet
                }
            }
        } else {
            // Zwischenergebnis für Live-Feedback
            const transcript = lastResult[0].transcript.toLowerCase().trim();
            this.showLiveFeedback(transcript);
        }
    }
    
    // Befehl verarbeiten
    processCommand(transcript) {
        // Wake Word Check
        if (!transcript.includes(this.wakeWord)) {
            return false;
        }
        
        // Wake Word entfernen für Command-Parsing
        const command = transcript.replace(this.wakeWord, '').trim();
        
        // Duplikate vermeiden
        if (command === this.lastCommand && Date.now() - this.lastCommandTime < 2000) {
            return false;
        }
        
        // Commands durchgehen
        for (const [key, config] of Object.entries(this.commands)) {
            for (const pattern of config.patterns) {
                const match = command.match(pattern);
                if (match) {
                    this.lastCommand = command;
                    this.lastCommandTime = Date.now();
                    this.executeCommand(config.action, match);
                    return true;
                }
            }
        }
        
        // Kein Befehl erkannt
        this.showNotification(`Befehl nicht verstanden: "${command}"`, 'warning');
        return false;
    }
    
    // Befehl ausführen
    async executeCommand(action, match) {
        console.log(`🚀 Führe aus: ${action}`, match);
        
        switch (action) {
            case 'setOrderReady':
                await this.setOrderStatus(match[1], 'ready');
                break;
                
            case 'setOrderPreparing':
                await this.setOrderStatus(match[1], 'preparing');
                break;
                
            case 'showAllOrders':
                this.scrollToSection('ordersList');
                this.showNotification('Zeige alle Bestellungen', 'success');
                break;
                
            case 'showNextOrder':
                this.focusNextOrder();
                break;
                
            case 'setWaitTime':
                await this.updateWaitTime(parseInt(match[1]));
                break;
                
            case 'showHelp':
                this.showHelpCommands();
                break;
        }
        
        // Audio-Feedback
        this.playSound('success');
    }
    
    // Bestellstatus ändern
    async setOrderStatus(orderNumber, status) {
        try {
            // Firebase Update
            const ordersRef = firebase.database().ref('orders');
            const snapshot = await ordersRef.orderByChild('orderNumber').equalTo(parseInt(orderNumber)).once('value');
            
            if (snapshot.exists()) {
                const orderId = Object.keys(snapshot.val())[0];
                const order = snapshot.val()[orderId];
                
                // Status Update
                await firebase.database().ref(`orders/${orderId}`).update({
                    status: status,
                    updatedAt: firebase.database.ServerValue.TIMESTAMP
                });
                
                // Notification
                const statusText = status === 'ready' ? 'fertig' : 'in Zubereitung';
                this.showNotification(`Bestellung #${orderNumber} ist ${statusText}!`, 'success');
                
                // UI Update triggern
                if (this.statusCallback) {
                    this.statusCallback(orderId, status);
                }
                
                // Customer Notification
                if (status === 'ready' && order.phoneNumber) {
                    this.sendCustomerNotification(order);
                }
            } else {
                this.showNotification(`Bestellung #${orderNumber} nicht gefunden`, 'error');
                this.playSound('error');
            }
        } catch (error) {
            console.error('Status Update Fehler:', error);
            this.showNotification('Fehler beim Status-Update', 'error');
        }
    }
    
    // Wartezeit aktualisieren
    async updateWaitTime(minutes) {
        try {
            await firebase.database().ref('settings/waitTime').set(minutes);
            this.showNotification(`Wartezeit auf ${minutes} Minuten gesetzt`, 'success');
            
            // UI Update
            const waitTimeElement = document.getElementById('currentWaitTime');
            if (waitTimeElement) {
                waitTimeElement.textContent = minutes;
            }
        } catch (error) {
            console.error('Wartezeit Update Fehler:', error);
            this.showNotification('Fehler beim Wartezeit-Update', 'error');
        }
    }
    
    // UI Feedback
    createFeedbackUI() {
        // Hauptcontainer
        const container = document.createElement('div');
        container.id = 'voiceCommandFeedback';
        container.className = 'voice-feedback-container';
        container.innerHTML = `
            <div class="voice-indicator">
                <div class="voice-icon">
                    <i class="fas fa-microphone"></i>
                </div>
                <div class="voice-waves">
                    <div class="wave"></div>
                    <div class="wave"></div>
                    <div class="wave"></div>
                </div>
            </div>
            <div class="voice-text">
                <div class="voice-status">Voice Commands bereit</div>
                <div class="voice-transcript"></div>
            </div>
            <button class="voice-toggle" onclick="window.voiceCommands.toggle()">
                <i class="fas fa-microphone-slash"></i>
            </button>
        `;
        
        document.body.appendChild(container);
        this.feedbackElement = container;
    }
    
    // Live Feedback anzeigen
    showLiveFeedback(text) {
        if (!this.feedbackElement) return;
        
        const transcript = this.feedbackElement.querySelector('.voice-transcript');
        if (transcript) {
            transcript.textContent = text;
            transcript.style.opacity = '0.7';
        }
    }
    
    // Notification anzeigen
    showNotification(message, type = 'info') {
        // Toast Notification
        const toast = document.createElement('div');
        toast.className = `voice-toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        // Animation
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // Hilfe anzeigen
    showHelpCommands() {
        const helpText = `
            <h3>🎤 Voice Commands</h3>
            <ul>
                <li><strong>"FlowBite, Bestellung 123 fertig"</strong> - Als fertig markieren</li>
                <li><strong>"FlowBite, Bestellung 123 Zubereitung"</strong> - In Zubereitung</li>
                <li><strong>"FlowBite, zeige Bestellungen"</strong> - Alle anzeigen</li>
                <li><strong>"FlowBite, nächste Bestellung"</strong> - Nächste offene</li>
                <li><strong>"FlowBite, Wartezeit 20 Minuten"</strong> - Wartezeit ändern</li>
                <li><strong>"FlowBite, Hilfe"</strong> - Diese Übersicht</li>
            </ul>
        `;
        
        // Modal oder Alert
        const modal = document.createElement('div');
        modal.className = 'voice-help-modal';
        modal.innerHTML = `
            <div class="modal-content">
                ${helpText}
                <button onclick="this.parentElement.parentElement.remove()">Schließen</button>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    // Sound abspielen
    playSound(type) {
        const audio = new Audio();
        switch (type) {
            case 'success':
                audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhCbDBzvJHGQJLSAz';
                break;
            case 'error':
                audio.src = 'data:audio/wav;base64,UklGRrgCAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YZQCAADcq3AX/hH+jf7x/vP+jAAAASEIiSL9TG2C6Zzhq+WLZU/dQ9sA1jnOl7+nzKjVktmR25PYg8cqrLOb3IugjO6Y1Kb2uRjQU/Ln/kEIIAl8AxH8Ovl8+wj/jwNnCHMMJw7DC9wCjfoq9azuEO+R9cX9qAW';
                break;
        }
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Fehler ignorieren
    }
    
    // Scroll zu Sektion
    scrollToSection(sectionId) {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    // Nächste offene Bestellung fokussieren
    focusNextOrder() {
        const pendingOrders = document.querySelectorAll('.order-card[data-status="pending"], .order-card[data-status="preparing"]');
        if (pendingOrders.length > 0) {
            pendingOrders[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            pendingOrders[0].classList.add('highlight');
            setTimeout(() => pendingOrders[0].classList.remove('highlight'), 2000);
            this.showNotification(`Nächste Bestellung: #${pendingOrders[0].dataset.orderNumber}`, 'info');
        } else {
            this.showNotification('Keine offenen Bestellungen', 'info');
        }
    }
    
    // Customer Notification senden
    async sendCustomerNotification(order) {
        // Push Notification
        if ('serviceWorker' in navigator && order.notificationToken) {
            try {
                await fetch('/api/send-notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: order.notificationToken,
                        title: '🍕 Bestellung fertig!',
                        body: `Ihre Bestellung #${order.orderNumber} ist abholbereit!`,
                        data: { orderId: order.id }
                    })
                });
            } catch (error) {
                console.error('Push Notification Fehler:', error);
            }
        }
    }
    
    // Fehlerbehandlung
    handleError(error) {
        switch (error) {
            case 'no-speech':
                // Stille - Normal, kein Fehler anzeigen
                break;
            case 'audio-capture':
                this.showNotification('Kein Mikrofon gefunden', 'error');
                break;
            case 'not-allowed':
                this.showNotification('Mikrofon-Zugriff verweigert', 'error');
                break;
            default:
                this.showNotification(`Fehler: ${error}`, 'error');
        }
    }
    
    // UI Status Update
    updateUI(status) {
        if (!this.feedbackElement) return;
        
        const indicator = this.feedbackElement.querySelector('.voice-indicator');
        const statusText = this.feedbackElement.querySelector('.voice-status');
        const toggleBtn = this.feedbackElement.querySelector('.voice-toggle');
        
        switch (status) {
            case 'listening':
                indicator.classList.add('active');
                statusText.textContent = 'Höre zu...';
                toggleBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                break;
            case 'stopped':
                indicator.classList.remove('active');
                statusText.textContent = 'Voice Commands pausiert';
                toggleBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
                break;
        }
    }
    
    // Public Methods
    start() {
        if (!this.recognition) {
            this.showNotification('Spracherkennung nicht verfügbar', 'error');
            return;
        }
        
        this.shouldRestart = true;
        
        try {
            this.recognition.start();
            console.log('🎤 Voice Commands gestartet');
        } catch (error) {
            if (error.name === 'InvalidStateError') {
                // Bereits gestartet
                console.log('Voice Commands laufen bereits');
            } else {
                console.error('Start-Fehler:', error);
            }
        }
    }
    
    stop() {
        this.shouldRestart = false;
        
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            console.log('🔇 Voice Commands gestoppt');
        }
    }
    
    toggle() {
        if (this.isListening) {
            this.stop();
        } else {
            this.start();
        }
    }
    
    // Status Callback setzen
    onStatusChange(callback) {
        this.statusCallback = callback;
    }
    
    // Sprache wechseln
    setLanguage(lang) {
        this.language = lang;
        if (this.recognition) {
            this.recognition.lang = lang;
            
            // Restart wenn aktiv
            if (this.isListening) {
                this.stop();
                setTimeout(() => this.start(), 500);
            }
        }
    }
}

// Auto-Initialize bei DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    // Nur auf Admin-Dashboard initialisieren
    if (window.location.pathname.includes('admin-dashboard')) {
        window.voiceCommands = new FlowBiteVoiceCommands();
        window.voiceCommands.createFeedbackUI();
        
        // Optional: Auto-Start
        // window.voiceCommands.start();
        
        console.log('✅ FlowBite Voice Commands bereit');
    }
});

// Export für Module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FlowBiteVoiceCommands;
}