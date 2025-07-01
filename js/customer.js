// ============================================================================
// STRIPE PAYMENT INTEGRATION - Pizza&Pasta D'amico
// Zu integrieren in: js/customer.js (neue Datei) oder direkt in index.html
// ============================================================================

// STRIPE CONFIGURATION
const STRIPE_PUBLIC_KEY = 'pk_test_51234567890abcdef'; // TEST KEY - In Production ersetzen!
const stripe = Stripe(STRIPE_PUBLIC_KEY);

// STRIPE CHECKOUT SESSION ERSTELLEN
async function createStripeCheckoutSession(orderData) {
    try {
        // Line Items für Stripe vorbereiten
        const lineItems = orderData.items.map(item => ({
            price_data: {
                currency: 'chf',
                product_data: {
                    name: item.name,
                    description: `Pizza&Pasta D'amico - ${item.quantity}x ${item.name}`,
                    images: ['https://pizzapastadamico.web.app/images/logo.png']
                },
                unit_amount: Math.round(item.price * 100) // Rappen
            },
            quantity: item.quantity
        }));

        // Checkout Session Data
        const sessionData = {
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${window.location.origin}/success.html?session_id={CHECKOUT_SESSION_ID}&order_id=${orderData.id}`,
            cancel_url: `${window.location.origin}/index.html?payment=cancelled`,
            customer_email: null, // Optional: Email sammeln
            metadata: {
                order_id: orderData.id,
                restaurant: 'Pizza&Pasta D\'amico',
                timestamp: orderData.timestamp
            },
            payment_intent_data: {
                metadata: {
                    order_id: orderData.id,
                    total_items: orderData.items.length
                }
            }
        };

        // Da wir nur Frontend haben, simulieren wir Stripe Checkout
        // In echter Implementation würde man Server-Endpoint aufrufen:
        // const response = await fetch('/api/create-checkout-session', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(sessionData)
        // });
        
        // DEMO: Für Entwicklung - direkter Stripe Checkout
        const session = await stripe.redirectToCheckout({
            lineItems: lineItems,
            mode: 'payment',
            successUrl: `${window.location.origin}/success.html?order_id=${orderData.id}&payment=success`,
            cancelUrl: `${window.location.origin}/index.html?payment=cancelled`,
            customerEmail: null
        });

        if (session.error) {
            throw new Error(session.error.message);
        }

        return session;

    } catch (error) {
        console.error('Stripe Checkout Fehler:', error);
        throw error;
    }
}

// ERWEITERTE BESTELLFUNKTION MIT PAYMENT OPTIONS
async function placeOrderWithPayment() {
    if (Object.keys(cart).length === 0) return;
    
    // Payment Method Dialog anzeigen
    const paymentMethod = await showPaymentMethodDialog();
    
    if (!paymentMethod) return; // User cancelled
    
    const orderBtn = document.getElementById('orderBtn');
    const originalText = orderBtn.innerHTML;
    
    // Loading-Status
    orderBtn.disabled = true;
    orderBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${window.t ? window.t('order.processing') : 'Bestellung wird verarbeitet...'}`;
    
    try {
        // Bestelldaten vorbereiten
        const orderData = {
            id: generateOrderId(),
            timestamp: new Date().toISOString(),
            items: Object.entries(cart).map(([productId, quantity]) => ({
                id: productId,
                name: availableProducts[productId].name,
                price: availableProducts[productId].price,
                quantity: quantity
            })),
            total: Object.entries(cart).reduce((sum, [productId, quantity]) => {
                return sum + (availableProducts[productId].price * quantity);
            }, 0),
            note: document.getElementById('orderNote').value.trim(),
            status: 'neu',
            waitTime: calculateWaitTime(),
            paymentMethod: paymentMethod,
            paymentStatus: paymentMethod === 'cash' ? 'pending' : 'processing'
        };

        if (paymentMethod === 'card') {
            // Stripe Checkout initiieren
            await createStripeCheckoutSession(orderData);
            
            // Bestellung temporär speichern (wird bei Stripe Success finalisiert)
            await database.ref(`temp-orders/${orderData.id}`).set(orderData);
            
        } else {
            // Barzahlung - direkt speichern
            const orderRef = await database.ref('orders').push(orderData);
            currentOrderId = orderRef.key;

            // Erfolg anzeigen
            const successText = window.t 
                ? window.t('order.success', { id: orderData.id, time: orderData.waitTime })
                : `✅ Bestellung #${orderData.id} eingegangen! Geschätzte Wartezeit: ${orderData.waitTime} Min`;
            
            showNotification(successText, 'success');

            // Warenkorb leeren
            cart = {};
            updateCartDisplay();
            
            // Tracking-Popup anzeigen
            setTimeout(() => showTrackingPopup(), 2000);
        }

    } catch (error) {
        console.error('Fehler beim Aufgeben der Bestellung:', error);
        const errorText = window.t 
            ? window.t('order.error')
            : 'Fehler bei der Bestellung. Bitte versuchen Sie es erneut.';
        showNotification(errorText, 'error');
    } finally {
        orderBtn.disabled = false;
        orderBtn.innerHTML = originalText;
    }
}

// PAYMENT METHOD DIALOG
function showPaymentMethodDialog() {
    return new Promise((resolve) => {
        // Payment Dialog HTML erstellen
        const dialog = document.createElement('div');
        dialog.className = 'payment-dialog-overlay';
        dialog.innerHTML = `
            <div class="payment-dialog">
                <div class="payment-header">
                    <h3><i class="fas fa-credit-card"></i> Zahlungsmethode wählen</h3>
                    <button class="close-btn" onclick="this.closest('.payment-dialog-overlay').remove(); resolve(null);">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="payment-options">
                    <div class="payment-option" data-method="card">
                        <div class="payment-icon">
                            <i class="fas fa-credit-card"></i>
                        </div>
                        <div class="payment-details">
                            <h4>Kartenzahlung</h4>
                            <p>Sicher bezahlen mit Kreditkarte</p>
                            <div class="card-brands">
                                <i class="fab fa-cc-visa"></i>
                                <i class="fab fa-cc-mastercard"></i>
                                <i class="fab fa-cc-amex"></i>
                            </div>
                        </div>
                        <div class="payment-status">
                            <i class="fas fa-shield-alt"></i>
                        </div>
                    </div>
                    
                    <div class="payment-option" data-method="cash">
                        <div class="payment-icon">
                            <i class="fas fa-money-bill-wave"></i>
                        </div>
                        <div class="payment-details">
                            <h4>Barzahlung</h4>
                            <p>Bezahlen Sie bei der Abholung in bar</p>
                        </div>
                        <div class="payment-status">
                            <i class="fas fa-check-circle"></i>
                        </div>
                    </div>
                    
                    <div class="payment-option coming-soon" data-method="twint">
                        <div class="payment-icon">
                            <i class="fas fa-mobile-alt"></i>
                        </div>
                        <div class="payment-details">
                            <h4>TWINT</h4>
                            <p>Bald verfügbar</p>
                        </div>
                        <div class="payment-status">
                            <span class="coming-soon-badge">Bald</span>
                        </div>
                    </div>
                </div>
                
                <div class="payment-footer">
                    <div class="total-summary">
                        <span>Gesamtbetrag: </span>
                        <strong id="dialogTotal">CHF ${calculateCartTotal().toFixed(2)}</strong>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // Event Listeners für Payment Options
        dialog.querySelectorAll('.payment-option:not(.coming-soon)').forEach(option => {
            option.addEventListener('click', () => {
                const method = option.dataset.method;
                dialog.remove();
                resolve(method);
            });
        });

        // Close Dialog on Overlay Click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                dialog.remove();
                resolve(null);
            }
        });
    });
}

// CART TOTAL BERECHNEN
function calculateCartTotal() {
    return Object.entries(cart).reduce((sum, [productId, quantity]) => {
        return sum + (availableProducts[productId].price * quantity);
    }, 0);
}

// STRIPE SUCCESS HANDLER (für success.html)
async function handleStripeSuccess(sessionId, orderId) {
    try {
        // Temporäre Bestellung laden
        const tempOrderRef = await database.ref(`temp-orders/${orderId}`).once('value');
        const orderData = tempOrderRef.val();
        
        if (!orderData) {
            throw new Error('Bestellung nicht gefunden');
        }

        // Payment Status update
        orderData.paymentStatus = 'completed';
        orderData.stripeSessionId = sessionId;
        orderData.confirmedAt = new Date().toISOString();

        // Zu aktiven Bestellungen verschieben
        const orderRef = await database.ref('orders').push(orderData);
        
        // Temporäre Bestellung löschen
        await database.ref(`temp-orders/${orderId}`).remove();

        console.log('Stripe Payment erfolgreich verarbeitet:', orderId);
        return orderRef.key;

    } catch (error) {
        console.error('Fehler beim Verarbeiten der Stripe-Zahlung:', error);
        throw error;
    }
}

// URL PARAMETER HELPER
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// PAYMENT STATUS CHECK (für success.html)
async function checkPaymentStatus() {
    const sessionId = getUrlParameter('session_id');
    const orderId = getUrlParameter('order_id');
    const paymentStatus = getUrlParameter('payment');

    if (sessionId && orderId) {
        try {
            const finalOrderId = await handleStripeSuccess(sessionId, orderId);
            return { success: true, orderId: finalOrderId, paymentMethod: 'card' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    } else if (paymentStatus === 'success' && orderId) {
        // Barzahlung oder andere Methoden
        return { success: true, orderId: orderId, paymentMethod: 'cash' };
    } else if (paymentStatus === 'cancelled') {
        return { success: false, cancelled: true };
    }

    return null;
}

// CSS FÜR PAYMENT DIALOG (zu css/styles.css hinzufügen)
const paymentDialogCSS = `
.payment-dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease;
}

.payment-dialog {
    background: linear-gradient(145deg, #1a1a1a, #2a2a2a);
    border-radius: 20px;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 25px 50px rgba(0,0,0,0.5);
    border: 1px solid rgba(255,255,255,0.1);
}

.payment-header {
    padding: 25px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.payment-header h3 {
    color: #ffffff;
    font-size: 1.3rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
}

.close-btn {
    background: none;
    border: none;
    color: rgba(255,255,255,0.6);
    font-size: 1.2rem;
    cursor: pointer;
    transition: color 0.3s ease;
}

.close-btn:hover {
    color: #ffffff;
}

.payment-options {
    padding: 25px;
}

.payment-option {
    display: flex;
    align-items: center;
    padding: 20px;
    border: 2px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    margin-bottom: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
    background: rgba(255,255,255,0.02);
}

.payment-option:hover {
    border-color: rgba(59, 130, 246, 0.5);
    background: rgba(59, 130, 246, 0.05);
    transform: translateY(-2px);
}

.payment-option.coming-soon {
    opacity: 0.5;
    cursor: not-allowed;
}

.payment-option.coming-soon:hover {
    transform: none;
    border-color: rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.02);
}

.payment-icon {
    width: 60px;
    height: 60px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    margin-right: 20px;
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
}

.payment-option[data-method="cash"] .payment-icon {
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
}

.payment-option[data-method="twint"] .payment-icon {
    background: rgba(168, 85, 247, 0.1);
    color: #a855f7;
}

.payment-details {
    flex: 1;
}

.payment-details h4 {
    color: #ffffff;
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 4px;
}

.payment-details p {
    color: rgba(255,255,255,0.7);
    font-size: 0.9rem;
}

.card-brands {
    display: flex;
    gap: 8px;
    margin-top: 8px;
    font-size: 1.2rem;
}

.card-brands i {
    color: rgba(255,255,255,0.6);
}

.payment-status {
    color: #22c55e;
    font-size: 1.2rem;
}

.coming-soon-badge {
    background: rgba(251, 191, 36, 0.2);
    color: #fbbf24;
    padding: 4px 8px;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 600;
}

.payment-footer {
    padding: 25px;
    border-top: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.02);
}

.total-summary {
    text-align: center;
    font-size: 1.2rem;
    color: rgba(255,255,255,0.8);
}

.total-summary strong {
    color: #22c55e;
    font-size: 1.4rem;
}

@keyframes fadeIn {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
}
`;

// CSS zu Stylesheet hinzufügen
function addPaymentDialogStyles() {
    const style = document.createElement('style');
    style.textContent = paymentDialogCSS;
    document.head.appendChild(style);
}

// Auto-Initialize Payment Styles
document.addEventListener('DOMContentLoaded', () => {
    addPaymentDialogStyles();
});

// EXPORTS (wenn als Modul verwendet)
// export { createStripeCheckoutSession, placeOrderWithPayment, handleStripeSuccess, checkPaymentStatus };