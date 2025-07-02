// TWINT Payment Integration für Pizza&Pasta D'amico
// Schweizer Mobile Payment Standard

class TWINTPaymentService {
    constructor() {
        // TWINT API Configuration
        // Für Production: Echte TWINT Merchant Credentials verwenden
        this.config = {
            merchantId: 'YOUR_TWINT_MERCHANT_ID',
            apiKey: 'YOUR_TWINT_API_KEY',
            apiUrl: 'https://api.twint.ch/v2', // Production URL
            testMode: true, // Für Entwicklung
            webhookUrl: 'https://your-domain.com/twint-webhook',
            successUrl: 'https://your-domain.com/success.html',
            cancelUrl: 'https://your-domain.com/checkout.html'
        };
        
        // TWINT QR Code Generator
        this.qrCodeSize = 300;
        
        // Payment Status Polling
        this.pollingInterval = null;
        this.maxPollingAttempts = 60; // 5 Minuten bei 5-Sekunden-Intervallen
    }
    
    // TWINT Payment initialisieren
    async initializePayment(order) {
        try {
            const paymentData = {
                merchantId: this.config.merchantId,
                amount: Math.round(order.total * 100), // Centimes
                currency: 'CHF',
                refNo: order.id,
                orderRef: order.id,
                description: `Bestellung #${order.id} - Pizza&Pasta D'amico`,
                successUrl: `${this.config.successUrl}?orderId=${order.id}`,
                cancelUrl: this.config.cancelUrl,
                webhookUrl: this.config.webhookUrl,
                customerInfo: {
                    name: order.customerName,
                    phone: order.phone
                }
            };
            
            // In Production: API Call zu TWINT
            if (!this.config.testMode) {
                const response = await fetch(`${this.config.apiUrl}/payments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.config.apiKey}`
                    },
                    body: JSON.stringify(paymentData)
                });
                
                const result = await response.json();
                return result;
            } else {
                // Test Mode Response
                return {
                    paymentId: 'test-' + Date.now(),
                    qrCode: await this.generateTestQRCode(order),
                    deepLink: `twint://pay?amount=${order.total}&refNo=${order.id}`,
                    status: 'PENDING'
                };
            }
            
        } catch (error) {
            console.error('TWINT Payment Error:', error);
            throw error;
        }
    }
    
    // QR Code für TWINT generieren
    async generateTestQRCode(order) {
        // In Production: Echter TWINT QR Code
        // Für Test: Simulierter QR Code
        const qrData = {
            type: 'TWINT_PAYMENT',
            merchantId: this.config.merchantId,
            amount: order.total,
            currency: 'CHF',
            reference: order.id,
            timestamp: Date.now()
        };
        
        // QR Code Library verwenden (z.B. qrcode.js)
        if (typeof QRCode !== 'undefined') {
            const canvas = document.createElement('canvas');
            const qr = new QRCode(canvas, {
                text: JSON.stringify(qrData),
                width: this.qrCodeSize,
                height: this.qrCodeSize,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
            
            return canvas.toDataURL();
        }
        
        // Fallback: Platzhalter QR Code
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y0ZjRmNCIvPjx0ZXh0IHg9IjE1MCIgeT0iMTUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjMzMzIj5UV0lOVCBRUiBDb2RlPC90ZXh0Pjwvc3ZnPg==';
    }
    
    // Payment Status überprüfen
    async checkPaymentStatus(paymentId) {
        try {
            if (!this.config.testMode) {
                const response = await fetch(`${this.config.apiUrl}/payments/${paymentId}`, {
                    headers: {
                        'Authorization': `Bearer ${this.config.apiKey}`
                    }
                });
                
                const result = await response.json();
                return result.status;
            } else {
                // Test Mode: Simuliere erfolgreiche Zahlung nach 10 Sekunden
                const elapsed = Date.now() - parseInt(paymentId.split('-')[1]);
                if (elapsed > 10000) {
                    return 'SUCCESS';
                }
                return 'PENDING';
            }
        } catch (error) {
            console.error('Status Check Error:', error);
            return 'ERROR';
        }
    }
    
    // Payment Status Polling starten
    startPolling(paymentId, callbacks) {
        let attempts = 0;
        
        this.pollingInterval = setInterval(async () => {
            attempts++;
            
            try {
                const status = await this.checkPaymentStatus(paymentId);
                
                switch (status) {
                    case 'SUCCESS':
                        this.stopPolling();
                        if (callbacks.onSuccess) callbacks.onSuccess();
                        break;
                        
                    case 'CANCELLED':
                    case 'FAILED':
                        this.stopPolling();
                        if (callbacks.onError) callbacks.onError(status);
                        break;
                        
                    case 'PENDING':
                        if (callbacks.onPending) callbacks.onPending(attempts);
                        break;
                }
                
                // Timeout nach max Versuchen
                if (attempts >= this.maxPollingAttempts) {
                    this.stopPolling();
                    if (callbacks.onTimeout) callbacks.onTimeout();
                }
                
            } catch (error) {
                console.error('Polling Error:', error);
                if (attempts >= 3) {
                    this.stopPolling();
                    if (callbacks.onError) callbacks.onError(error);
                }
            }
        }, 5000); // Alle 5 Sekunden
    }
    
    // Polling stoppen
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }
    
    // TWINT Payment UI Component
    createPaymentUI(container, order) {
        const ui = document.createElement('div');
        ui.className = 'twint-payment-ui';
        ui.innerHTML = `
            <div class="twint-container">
                <div class="twint-header">
                    <img src="https://www.twint.ch/content/dam/twint/logos/twint-logo.svg" 
                         alt="TWINT" class="twint-logo">
                    <h3>Mit TWINT bezahlen</h3>
                </div>
                
                <div class="twint-amount">
                    <span class="currency">CHF</span>
                    <span class="amount">${order.total.toFixed(2)}</span>
                </div>
                
                <div class="twint-qr-section">
                    <div id="twint-qr-code" class="qr-placeholder">
                        <div class="loading-spinner"></div>
                        <p>QR-Code wird generiert...</p>
                    </div>
                    
                    <div class="twint-instructions">
                        <ol>
                            <li>Öffnen Sie die TWINT App</li>
                            <li>Scannen Sie den QR-Code</li>
                            <li>Bestätigen Sie die Zahlung</li>
                        </ol>
                    </div>
                </div>
                
                <div class="twint-alternatives">
                    <p>Oder bezahlen Sie mit der TWINT App:</p>
                    <button id="twint-deeplink" class="twint-app-button">
                        In TWINT App öffnen
                    </button>
                </div>
                
                <div class="twint-status" id="twint-status">
                    <p>Warte auf Zahlung...</p>
                    <div class="status-progress"></div>
                </div>
                
                <button id="twint-cancel" class="btn-secondary">
                    Abbrechen
                </button>
            </div>
            
            <style>
                .twint-payment-ui {
                    max-width: 400px;
                    margin: 0 auto;
                    padding: 20px;
                }
                
                .twint-container {
                    background: white;
                    border-radius: 12px;
                    padding: 30px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                }
                
                .twint-header {
                    text-align: center;
                    margin-bottom: 30px;
                }
                
                .twint-logo {
                    height: 40px;
                    margin-bottom: 15px;
                }
                
                .twint-amount {
                    text-align: center;
                    font-size: 36px;
                    font-weight: bold;
                    margin-bottom: 30px;
                    color: #333;
                }
                
                .twint-amount .currency {
                    font-size: 24px;
                    margin-right: 10px;
                }
                
                .twint-qr-section {
                    margin-bottom: 30px;
                }
                
                #twint-qr-code {
                    width: 300px;
                    height: 300px;
                    margin: 0 auto 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #f5f5f5;
                    border-radius: 8px;
                }
                
                #twint-qr-code img {
                    width: 100%;
                    height: 100%;
                    border-radius: 8px;
                }
                
                .twint-instructions {
                    background: #f0f8ff;
                    padding: 15px;
                    border-radius: 8px;
                    font-size: 14px;
                }
                
                .twint-instructions ol {
                    margin: 0;
                    padding-left: 20px;
                }
                
                .twint-alternatives {
                    text-align: center;
                    margin-bottom: 20px;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                }
                
                .twint-app-button {
                    background: #00c0ff;
                    color: white;
                    border: none;
                    padding: 12px 30px;
                    border-radius: 25px;
                    font-size: 16px;
                    cursor: pointer;
                    margin-top: 10px;
                    transition: background 0.3s;
                }
                
                .twint-app-button:hover {
                    background: #0099cc;
                }
                
                .twint-status {
                    text-align: center;
                    margin: 20px 0;
                    padding: 15px;
                    background: #f5f5f5;
                    border-radius: 8px;
                }
                
                .status-progress {
                    width: 100%;
                    height: 4px;
                    background: #e0e0e0;
                    border-radius: 2px;
                    margin-top: 10px;
                    overflow: hidden;
                }
                
                .status-progress::after {
                    content: '';
                    display: block;
                    width: 30%;
                    height: 100%;
                    background: #00c0ff;
                    animation: progress 2s ease-in-out infinite;
                }
                
                @keyframes progress {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(400%); }
                }
                
                .loading-spinner {
                    border: 3px solid #f3f3f3;
                    border-top: 3px solid #00c0ff;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 10px;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                .twint-success {
                    text-align: center;
                    padding: 40px;
                }
                
                .twint-success .icon {
                    font-size: 60px;
                    color: #4CAF50;
                    margin-bottom: 20px;
                }
                
                #twint-cancel {
                    width: 100%;
                    margin-top: 20px;
                    padding: 10px;
                    background: #f5f5f5;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                
                #twint-cancel:hover {
                    background: #e0e0e0;
                }
            </style>
        `;
        
        container.appendChild(ui);
        return ui;
    }
    
    // Payment Flow starten
    async startPaymentFlow(order, container) {
        try {
            // UI erstellen
            const ui = this.createPaymentUI(container, order);
            
            // Payment initialisieren
            const payment = await this.initializePayment(order);
            
            // QR Code anzeigen
            const qrContainer = document.getElementById('twint-qr-code');
            qrContainer.innerHTML = `<img src="${payment.qrCode}" alt="TWINT QR Code">`;
            
            // Deep Link Setup
            const deeplinkBtn = document.getElementById('twint-deeplink');
            deeplinkBtn.onclick = () => {
                window.location.href = payment.deepLink;
            };
            
            // Cancel Button
            document.getElementById('twint-cancel').onclick = () => {
                this.stopPolling();
                if (this.onCancel) this.onCancel();
            };
            
            // Status Polling starten
            this.startPolling(payment.paymentId, {
                onSuccess: () => {
                    this.showSuccess(ui, order);
                },
                onError: (error) => {
                    this.showError(ui, error);
                },
                onPending: (attempts) => {
                    this.updateStatus(ui, attempts);
                },
                onTimeout: () => {
                    this.showTimeout(ui);
                }
            });
            
            return payment;
            
        } catch (error) {
            console.error('Payment Flow Error:', error);
            this.showError(container, error);
        }
    }
    
    // Success anzeigen
    showSuccess(container, order) {
        container.innerHTML = `
            <div class="twint-success">
                <div class="icon">✅</div>
                <h3>Zahlung erfolgreich!</h3>
                <p>Vielen Dank für Ihre Bestellung.</p>
                <p>Bestellnummer: <strong>#${order.id}</strong></p>
                <button onclick="window.location.href='success.html?orderId=${order.id}'" 
                        class="btn-primary">
                    Zur Bestellbestätigung
                </button>
            </div>
        `;
        
        // Firebase Update
        firebase.database().ref(`orders/${order.id}`).update({
            paymentMethod: 'twint',
            paymentStatus: 'paid',
            paidAt: firebase.database.ServerValue.TIMESTAMP
        });
    }
    
    // Error anzeigen
    showError(container, error) {
        container.innerHTML = `
            <div class="twint-error">
                <div class="icon">❌</div>
                <h3>Zahlung fehlgeschlagen</h3>
                <p>${error.message || 'Die Zahlung konnte nicht abgeschlossen werden.'}</p>
                <button onclick="window.location.reload()" class="btn-primary">
                    Erneut versuchen
                </button>
            </div>
        `;
    }
    
    // Timeout anzeigen
    showTimeout(container) {
        container.innerHTML = `
            <div class="twint-timeout">
                <div class="icon">⏱️</div>
                <h3>Zeitüberschreitung</h3>
                <p>Die Zahlung wurde nicht rechtzeitig abgeschlossen.</p>
                <button onclick="window.location.reload()" class="btn-primary">
                    Erneut versuchen
                </button>
            </div>
        `;
    }
    
    // Status Update
    updateStatus(container, attempts) {
        const statusEl = container.querySelector('#twint-status p');
        if (statusEl) {
            const remaining = Math.ceil((this.maxPollingAttempts - attempts) * 5 / 60);
            statusEl.textContent = `Warte auf Zahlung... (${remaining} Min. verbleibend)`;
        }
    }
}

// Integration in Checkout
class CheckoutTWINTIntegration {
    constructor() {
        this.twintService = new TWINTPaymentService();
    }
    
    // Payment Method Selector erweitern
    addTWINTOption() {
        const paymentHTML = `
            <div class="payment-method">
                <input type="radio" 
                       id="payment-twint" 
                       name="paymentMethod" 
                       value="twint">
                <label for="payment-twint">
                    <img src="https://www.twint.ch/content/dam/twint/logos/twint-logo.svg" 
                         alt="TWINT" 
                         style="height: 30px; vertical-align: middle;">
                    <span>TWINT - Mobile Payment</span>
                </label>
            </div>
        `;
        
        // In bestehende Payment-Optionen einfügen
        const paymentContainer = document.querySelector('.payment-methods');
        if (paymentContainer) {
            paymentContainer.insertAdjacentHTML('beforeend', paymentHTML);
        }
    }
    
    // Checkout Handler
    async handleTWINTCheckout(order) {
        // Modal für TWINT Payment
        const modal = document.createElement('div');
        modal.className = 'payment-modal';
        modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-content">
                <div id="twint-payment-container"></div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // TWINT Payment Flow starten
        const container = document.getElementById('twint-payment-container');
        
        this.twintService.onCancel = () => {
            document.body.removeChild(modal);
        };
        
        await this.twintService.startPaymentFlow(order, container);
    }
}

// Firebase Cloud Function für Webhook
const twintWebhookFunction = `
// Firebase Cloud Function - functions/twintWebhook.js
exports.twintWebhook = functions.https.onRequest(async (req, res) => {
    const { paymentId, status, orderId, amount } = req.body;
    
    // Webhook Signatur verifizieren
    const signature = req.headers['x-twint-signature'];
    const isValid = verifyTWINTSignature(req.body, signature);
    
    if (!isValid) {
        res.status(401).send('Invalid signature');
        return;
    }
    
    try {
        // Order Status aktualisieren
        const orderRef = admin.database().ref(\`orders/\${orderId}\`);
        const updates = {
            paymentStatus: status.toLowerCase(),
            paymentId: paymentId,
            lastUpdated: admin.database.ServerValue.TIMESTAMP
        };
        
        if (status === 'SUCCESS') {
            updates.paidAt = admin.database.ServerValue.TIMESTAMP;
            updates.status = 'paid';
            
            // SMS-Benachrichtigung auslösen
            const order = await orderRef.once('value');
            if (order.val().phone) {
                // SMS-Service triggern
                await admin.database().ref(\`notifications/sms/\${orderId}\`).set({
                    type: 'order_confirmed',
                    timestamp: admin.database.ServerValue.TIMESTAMP
                });
            }
        }
        
        await orderRef.update(updates);
        
        // Log für Audit
        await admin.database().ref(\`payment_logs/twint/\${paymentId}\`).set({
            orderId: orderId,
            status: status,
            amount: amount,
            timestamp: admin.database.ServerValue.TIMESTAMP,
            raw: req.body
        });
        
        res.status(200).send('OK');
        
    } catch (error) {
        console.error('TWINT Webhook Error:', error);
        res.status(500).send('Internal error');
    }
});

function verifyTWINTSignature(payload, signature) {
    // TWINT Signature Verification
    const crypto = require('crypto');
    const secret = functions.config().twint.webhook_secret;
    
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
    
    return signature === expectedSignature;
}
`;

// Admin Dashboard Integration
class TWINTDashboard {
    constructor() {
        this.stats = {
            totalPayments: 0,
            totalAmount: 0,
            successRate: 0,
            averageAmount: 0
        };
    }
    
    // Dashboard Widget für Admin
    createDashboardWidget() {
        return `
            <div class="payment-widget twint-widget">
                <div class="widget-header">
                    <img src="https://www.twint.ch/content/dam/twint/logos/twint-logo.svg" 
                         alt="TWINT" style="height: 30px;">
                    <h3>TWINT Zahlungen</h3>
                </div>
                
                <div class="widget-stats">
                    <div class="stat">
                        <span class="label">Heute</span>
                        <span class="value" id="twint-today">CHF 0.00</span>
                    </div>
                    <div class="stat">
                        <span class="label">Diese Woche</span>
                        <span class="value" id="twint-week">CHF 0.00</span>
                    </div>
                    <div class="stat">
                        <span class="label">Erfolgsrate</span>
                        <span class="value" id="twint-success">0%</span>
                    </div>
                </div>
                
                <div class="widget-actions">
                    <button onclick="viewTWINTTransactions()" class="btn-secondary">
                        Transaktionen anzeigen
                    </button>
                </div>
            </div>
        `;
    }
    
    // Statistiken laden
    async loadStats(period = 'today') {
        const now = new Date();
        let startTime;
        
        switch (period) {
            case 'today':
                startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                break;
            case 'week':
                startTime = now.getTime() - (7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startTime = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
                break;
        }
        
        const paymentsRef = firebase.database().ref('payment_logs/twint');
        const snapshot = await paymentsRef
            .orderByChild('timestamp')
            .startAt(startTime)
            .once('value');
        
        const payments = snapshot.val() || {};
        let total = 0;
        let successful = 0;
        
        Object.values(payments).forEach(payment => {
            if (payment.status === 'SUCCESS') {
                total += payment.amount;
                successful++;
            }
        });
        
        return {
            totalAmount: total,
            successCount: successful,
            totalCount: Object.keys(payments).length,
            successRate: Object.keys(payments).length > 0 
                ? (successful / Object.keys(payments).length * 100).toFixed(1) 
                : 0
        };
    }
}

// Refund Management
class TWINTRefundService {
    constructor() {
        this.config = {
            apiUrl: 'https://api.twint.ch/v2/refunds',
            apiKey: 'YOUR_TWINT_API_KEY'
        };
    }
    
    // Rückerstattung initiieren
    async initiateRefund(orderId, amount, reason) {
        try {
            // Original Payment finden
            const orderSnapshot = await firebase.database()
                .ref(`orders/${orderId}`)
                .once('value');
            
            const order = orderSnapshot.val();
            if (!order || !order.paymentId) {
                throw new Error('Payment not found');
            }
            
            const refundData = {
                originalPaymentId: order.paymentId,
                amount: Math.round(amount * 100), // Centimes
                currency: 'CHF',
                reason: reason,
                refNo: `refund-${orderId}-${Date.now()}`
            };
            
            // API Call
            const response = await fetch(this.config.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify(refundData)
            });
            
            const result = await response.json();
            
            // Log Refund
            await firebase.database().ref(`refunds/${result.refundId}`).set({
                orderId: orderId,
                amount: amount,
                reason: reason,
                status: result.status,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                processedBy: firebase.auth().currentUser.uid
            });
            
            return result;
            
        } catch (error) {
            console.error('Refund Error:', error);
            throw error;
        }
    }
    
    // Refund UI für Admin
    createRefundUI(orderId) {
        return `
            <div class="refund-dialog">
                <h3>TWINT Rückerstattung</h3>
                <form id="twint-refund-form">
                    <div class="form-group">
                        <label>Betrag (CHF)</label>
                        <input type="number" 
                               id="refund-amount" 
                               step="0.01" 
                               min="0.01"
                               required>
                    </div>
                    
                    <div class="form-group">
                        <label>Grund</label>
                        <select id="refund-reason" required>
                            <option value="">Bitte wählen...</option>
                            <option value="cancelled">Bestellung storniert</option>
                            <option value="quality">Qualitätsproblem</option>
                            <option value="wrong_order">Falsche Bestellung</option>
                            <option value="other">Andere</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Bemerkung</label>
                        <textarea id="refund-note"></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn-primary">
                            Rückerstattung durchführen
                        </button>
                        <button type="button" onclick="closeRefundDialog()" class="btn-secondary">
                            Abbrechen
                        </button>
                    </div>
                </form>
            </div>
        `;
    }
}

// Export für globale Nutzung
window.TWINTPaymentService = TWINTPaymentService;
window.CheckoutTWINTIntegration = CheckoutTWINTIntegration;
window.TWINTDashboard = TWINTDashboard;
window.TWINTRefundService = TWINTRefundService;