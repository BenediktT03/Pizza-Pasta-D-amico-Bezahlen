// Erweiterte Stripe Integration
// Diese Funktionen können in customer.js eingefügt werden

// Stripe Checkout Session erstellen (für echte Integration)
async function createStripeCheckoutSession(orderData) {
    try {
        // Diese Funktion würde normalerweise einen Server-Endpoint aufrufen
        // Da wir nur Frontend haben, simulieren wir es hier
        
        const checkoutData = {
            line_items: [{
                price_data: {
                    currency: 'chf',
                    product_data: {
                        name: orderData.pizza.name,
                        description: `Pizza Bella - ${orderData.table === 'takeaway' ? 'Takeaway' : 'Tisch ' + orderData.table}`,
                        images: ['https://your-app.web.app/images/pizza-logo.png']
                    },
                    unit_amount: Math.round(orderData.pizza.price * 100) // Rappen
                },
                quantity: 1
            }],
            mode: 'payment',
            success_url: `${window.location.origin}/success.html?order=${orderData.id}&table=${orderData.table}&payment=success`,
            cancel_url: `${window.location.origin}/index.html?table=${orderData.table}&payment=cancelled`,
            customer_email: null, // Optional: Email sammeln
            metadata: {
                order_id: orderData.id,
                table: orderData.table,
                pizza: orderData.pizza.name
            }
        };

        // Hier würdest du normalerweise deinen Server aufrufen:
        // const response = await fetch('/create-checkout-session', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(checkoutData)
        // });
        // const session = await response.json();
        
        // Für Demo: Direkt zur Success-Seite weiterleiten
        console.log('Stripe Checkout würde erstellt mit:', checkoutData);
        
        // Simuliere erfolgreiche Zahlung nach 2 Sekunden
        setTimeout(async () => {
            await saveOrder();
        }, 2000);
        
    } catch (error) {
        console.error('Stripe Checkout Fehler:', error);
        throw error;
    }
}

// Stripe Elements für eingebettete Zahlung (Alternative zu Checkout)
function setupStripeElements() {
    const elements = stripe.elements();
    
    // Card Element erstellen
    const cardElement = elements.create('card', {
        style: {
            base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                    color: '#aab7c4',
                },
                fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
            },
            invalid: {
                color: '#9e2146',
            },
        },
    });

    // Card Element mounten
    cardElement.mount('#card-element');

    // Fehler-Handling
    cardElement.on('change', ({error}) => {
        const displayError = document.getElementById('card-errors');
        if (error) {
            displayError.textContent = error.message;
        } else {
            displayError.textContent = '';
        }
    });

    return { elements, cardElement };
}

// Payment Intent erstellen (für Stripe Elements)
async function createPaymentIntent(orderData) {
    // Server-Aufruf simuliert
    const paymentIntentData = {
        amount: Math.round(orderData.pizza.price * 100), // Rappen
        currency: 'chf',
        metadata: {
            order_id: orderData.id,
            table: orderData.table,
            pizza: orderData.pizza.name
        }
    };

    // Hier würdest du deinen Server aufrufen:
    // const response = await fetch('/create-payment-intent', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(paymentIntentData)
    // });
    // const { client_secret } = await response.json();

    // Für Demo: Client Secret simulieren
    console.log('Payment Intent würde erstellt mit:', paymentIntentData);
    return 'pi_demo_client_secret';
}

// Zahlung mit Stripe Elements bestätigen
async function confirmStripePayment(cardElement, clientSecret, orderData) {
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
            card: cardElement,
            billing_details: {
                name: `${orderData.table === 'takeaway' ? 'Takeaway' : 'Tisch ' + orderData.table}`,
            },
        }
    });

    if (error) {
        console.error('Zahlungsfehler:', error);
        throw new Error(error.message);
    }

    if (paymentIntent.status === 'succeeded') {
        console.log('Zahlung erfolgreich!');
        return paymentIntent;
    }
}

// TWINT QR-Code generieren (für echte Integration)
function generateTwintQR(orderData) {
    // TWINT QR-Code Parameter
    const twintData = {
        amount: orderData.pizza.price,
        currency: 'CHF',
        reference: orderData.id,
        message: `Pizza Bella - ${orderData.pizza.name}`,
        // Merchant IBAN oder TWINT Business Account
        recipient: 'CH93 0076 2011 6238 5295 7' // Beispiel IBAN
    };

    // QR-Code String generieren (vereinfacht)
    const qrString = `BCD\n002\n2\nSCT\n${twintData.recipient}\nPizza Bella\n${twintData.amount}\n${twintData.currency}\n\n${twintData.reference}\n${twintData.message}`;
    
    console.log('TWINT QR-Code Daten:', twintData);
    console.log('QR-String:', qrString);
    
    // Hier würdest du eine QR-Code Bibliothek verwenden:
    // import QRCode from 'qrcode';
    // QRCode.toDataURL(qrString, (err, url) => {
    //     document.getElementById('twint-qr-image').src = url;
    // });
    
    return qrString;
}

// Webhook Handler (Server-seitig - nur Beispiel)
function handleStripeWebhook(event) {
    // Diese Funktion würde auf deinem Server laufen
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('Zahlung erfolgreich:', paymentIntent.id);
            
            // Bestellstatus in Firebase aktualisieren
            const orderId = paymentIntent.metadata.order_id;
            // updateOrderPaymentStatus(orderId, 'paid');
            break;
            
        case 'payment_intent.payment_failed':
            const failedPayment = event.data.object;
            console.log('Zahlung fehlgeschlagen:', failedPayment.id);
            
            // Bestellstatus in Firebase aktualisieren
            const failedOrderId = failedPayment.metadata.order_id;
            // updateOrderPaymentStatus(failedOrderId, 'failed');
            break;
            
        default:
            console.log(`Unbekannter Event Type: ${event.type}`);
    }
}

// Zahlungsstatus in Firebase aktualisieren
async function updateOrderPaymentStatus(orderId, paymentStatus) {
    try {
        await database.ref(`orders/${orderId}/paymentStatus`).set(paymentStatus);
        await database.ref(`orders/${orderId}/paymentTimestamp`).set(new Date().toISOString());
        console.log(`Zahlungsstatus für Bestellung ${orderId}: ${paymentStatus}`);
    } catch (error) {
        console.error('Fehler beim Aktualisieren des Zahlungsstatus:', error);
    }
}

// Stripe Test-Karten für Development
const STRIPE_TEST_CARDS = {
    success: '4242424242424242',
    decline: '4000000000000002',
    require_authentication: '4000002500003155',
    insufficient_funds: '4000000000009995'
};

// Test-Zahlung für Development
async function simulateTestPayment(cardNumber = STRIPE_TEST_CARDS.success) {
    console.log('Simuliere Test-Zahlung mit Karte:', cardNumber);
    
    // Verschiedene Test-Szenarien
    switch (cardNumber) {
        case STRIPE_TEST_CARDS.success:
            console.log('✅ Test-Zahlung erfolgreich');
            return { success: true };
            
        case STRIPE_TEST_CARDS.decline:
            console.log('❌ Test-Zahlung abgelehnt');
            throw new Error('Ihre Karte wurde abgelehnt');
            
        case STRIPE_TEST_CARDS.require_authentication:
            console.log('🔐 Test-Zahlung benötigt Authentifizierung');
            return { success: true, requires_action: true };
            
        case STRIPE_TEST_CARDS.insufficient_funds:
            console.log('💳 Test-Zahlung: Unzureichende Deckung');
            throw new Error('Unzureichende Deckung');
            
        default:
            return { success: true };
    }
}

// Apple Pay / Google Pay Setup
function setupDigitalWallets() {
    const paymentRequest = stripe.paymentRequest({
        country: 'CH',
        currency: 'chf',
        total: {
            label: 'Pizza Bella',
            amount: 0, // Wird dynamisch gesetzt
        },
        requestPayerName: false,
        requestPayerEmail: false,
    });

    const elements = stripe.elements();
    const prButton = elements.create('paymentRequestButton', {
        paymentRequest,
        style: {
            paymentRequestButton: {
                type: 'default', // 'default' | 'book' | 'buy' | 'donate'
                theme: 'dark', // 'dark' | 'light' | 'light-outline'
                height: '40px',
            },
        },
    });

    // Prüfen ob Apple Pay / Google Pay verfügbar
    paymentRequest.canMakePayment().then(function(result) {
        if (result) {
            prButton.mount('#payment-request-button');
        } else {
            document.getElementById('payment-request-button').style.display = 'none';
        }
    });

    return { paymentRequest, prButton };
}

// Beispiel Server-Code (Node.js/Express - nur Referenz)
const serverExample = `
// server.js (Beispiel für Backend)
const express = require('express');
const stripe = require('stripe')('sk_test_DEIN_SECRET_KEY');
const admin = require('firebase-admin');

const app = express();
app.use(express.json());

// Payment Intent erstellen
app.post('/create-payment-intent', async (req, res) => {
    try {
        const { amount, currency, metadata } = req.body;
        
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
            metadata,
            automatic_payment_methods: {
                enabled: true,
            },
        });

        res.send({
            client_secret: paymentIntent.client_secret
        });
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

// Stripe Webhook
app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.log('Webhook signature verification failed.', err.message);
        return res.status(400).send('Webhook Error: ' + err.message);
    }

    handleStripeWebhook(event);
    res.json({received: true});
});

app.listen(3000, () => console.log('Server läuft auf Port 3000'));
`;

console.log('Stripe Integration bereit für erweiterte Funktionen');
console.log('Server-Beispiel:', serverExample);