/**
 * EATECH - CLOUD FUNCTIONS
 * Version: 5.0.0
 * Description: Serverless Backend für Multi-Tenant Foodtruck System
 * Features: Payment Processing, Order Management, Notifications, Analytics
 * Author: EATECH Development Team
 * Last Modified: 2025-01-04
 * 
 * 📍 Dateipfad: functions/src/index.js
 */

// ============================================================================
// IMPORTS & DEPENDENCIES
// ============================================================================
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe')(functions.config().stripe.secret_key);
const nodemailer = require('nodemailer');
const twilio = require('twilio')(
    functions.config().twilio.account_sid,
    functions.config().twilio.auth_token
);
const cors = require('cors')({ origin: true });
const express = require('express');
const { v4: uuidv4 } = require('uuid');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.database();
const auth = admin.auth();
const storage = admin.storage();

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
    region: 'europe-west1',
    timezone: 'Europe/Zurich',
    currency: 'CHF',
    
    // Swiss VAT rates
    vat: {
        standard: 8.1,
        reduced: 2.6,
        accommodation: 3.8
    },
    
    // Email configuration
    email: {
        from: 'EATECH <noreply@eatech.ch>',
        replyTo: 'support@eatech.ch'
    },
    
    // SMS configuration
    sms: {
        from: functions.config().twilio.phone_number || '+41765551234'
    },
    
    // Webhook endpoints
    webhooks: {
        stripe: '/webhooks/stripe',
        twilio: '/webhooks/twilio'
    }
};

// Email transporter
const mailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: functions.config().email.user,
        pass: functions.config().email.password
    }
});

// ============================================================================
// EXPRESS APP FOR API ENDPOINTS
// ============================================================================
const app = express();
app.use(cors);
app.use(express.json());
app.use(express.raw({ type: 'application/json' }));

// ============================================================================
// PAYMENT ENDPOINTS
// ============================================================================

/**
 * Create Payment Intent
 */
app.post('/api/create-payment-intent', async (req, res) => {
    try {
        const { amount, currency = 'chf', metadata = {} } = req.body;
        const idToken = req.headers.authorization?.split('Bearer ')[1];
        
        // Verify authentication
        const decodedToken = await auth.verifyIdToken(idToken);
        const tenantId = decodedToken.tenantId || req.headers['x-tenant-id'];
        
        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: currency.toLowerCase(),
            automatic_payment_methods: {
                enabled: true,
                allow_redirects: 'always'
            },
            metadata: {
                ...metadata,
                tenantId,
                userId: decodedToken.uid,
                timestamp: Date.now()
            },
            description: `Order from ${tenantId}`,
            
            // Swiss-specific settings
            payment_method_options: {
                card: {
                    request_three_d_secure: 'automatic'
                }
            }
        });
        
        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
        
    } catch (error) {
        console.error('Payment intent creation error:', error);
        res.status(400).json({ error: error.message });
    }
});

/**
 * Process refund
 */
app.post('/api/create-refund', async (req, res) => {
    try {
        const { payment_intent, amount, reason } = req.body;
        const idToken = req.headers.authorization?.split('Bearer ')[1];
        
        // Verify admin role
        const decodedToken = await auth.verifyIdToken(idToken);
        if (decodedToken.role !== 'admin') {
            throw new Error('Unauthorized');
        }
        
        const refund = await stripe.refunds.create({
            payment_intent,
            amount: amount ? Math.round(amount * 100) : undefined,
            reason: reason || 'requested_by_customer',
            metadata: {
                refundedBy: decodedToken.uid,
                timestamp: Date.now()
            }
        });
        
        // Update order status
        await updateOrderRefundStatus(payment_intent, refund);
        
        res.json(refund);
        
    } catch (error) {
        console.error('Refund error:', error);
        res.status(400).json({ error: error.message });
    }
});

/**
 * Stripe Webhook Handler
 */
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            functions.config().stripe.webhook_secret
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            await handlePaymentSuccess(event.data.object);
            break;
            
        case 'payment_intent.payment_failed':
            await handlePaymentFailure(event.data.object);
            break;
            
        case 'charge.dispute.created':
            await handleDispute(event.data.object);
            break;
            
        default:
            console.log(`Unhandled event type ${event.type}`);
    }
    
    res.json({ received: true });
});

// ============================================================================
// ORDER MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Create new order
 */
exports.createOrder = functions
    .region(CONFIG.region)
    .https.onCall(async (data, context) => {
        // Verify authentication
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'User must be authenticated'
            );
        }
        
        const { items, customer, payment, delivery, notes } = data;
        const tenantId = context.auth.token.tenantId || data.tenantId;
        
        try {
            // Calculate totals with VAT
            const totals = calculateOrderTotals(items, delivery);
            
            // Generate order number
            const orderNumber = generateOrderNumber();
            
            // Create order object
            const order = {
                id: db.ref().child('orders').push().key,
                number: orderNumber,
                tenantId,
                status: 'new',
                items,
                customer: {
                    ...customer,
                    userId: context.auth.uid
                },
                totals,
                payment,
                delivery,
                notes,
                createdAt: admin.database.ServerValue.TIMESTAMP,
                updatedAt: admin.database.ServerValue.TIMESTAMP,
                statusHistory: [{
                    status: 'new',
                    timestamp: admin.database.ServerValue.TIMESTAMP,
                    by: 'system'
                }]
            };
            
            // Save to database
            await db.ref(`tenants/${tenantId}/orders/${order.id}`).set(order);
            
            // Send notifications
            await sendOrderNotifications(order);
            
            // Track analytics
            await trackOrderAnalytics(order);
            
            return {
                success: true,
                orderId: order.id,
                orderNumber: orderNumber,
                estimatedTime: calculateEstimatedTime(items)
            };
            
        } catch (error) {
            console.error('Order creation error:', error);
            throw new functions.https.HttpsError(
                'internal',
                'Failed to create order',
                error.message
            );
        }
    });

/**
 * Update order status
 */
exports.updateOrderStatus = functions
    .region(CONFIG.region)
    .https.onCall(async (data, context) => {
        // Verify admin/staff role
        if (!context.auth || !['admin', 'staff'].includes(context.auth.token.role)) {
            throw new functions.https.HttpsError(
                'permission-denied',
                'Insufficient permissions'
            );
        }
        
        const { orderId, newStatus, note } = data;
        const tenantId = context.auth.token.tenantId;
        
        try {
            const orderRef = db.ref(`tenants/${tenantId}/orders/${orderId}`);
            const orderSnapshot = await orderRef.once('value');
            
            if (!orderSnapshot.exists()) {
                throw new Error('Order not found');
            }
            
            const order = orderSnapshot.val();
            const statusUpdate = {
                status: newStatus,
                updatedAt: admin.database.ServerValue.TIMESTAMP,
                [`statusHistory/${order.statusHistory.length}`]: {
                    status: newStatus,
                    timestamp: admin.database.ServerValue.TIMESTAMP,
                    by: context.auth.uid,
                    note
                }
            };
            
            // Special handling for 'ready' status
            if (newStatus === 'ready') {
                statusUpdate.readyAt = admin.database.ServerValue.TIMESTAMP;
                statusUpdate.actualPrepTime = Date.now() - order.createdAt;
            }
            
            await orderRef.update(statusUpdate);
            
            // Send status update notifications
            await sendStatusUpdateNotification(order, newStatus);
            
            return { success: true };
            
        } catch (error) {
            console.error('Status update error:', error);
            throw new functions.https.HttpsError(
                'internal',
                'Failed to update status',
                error.message
            );
        }
    });

// ============================================================================
// SCHEDULED FUNCTIONS
// ============================================================================

/**
 * Daily analytics aggregation
 */
exports.aggregateAnalytics = functions
    .region(CONFIG.region)
    .pubsub.schedule('0 2 * * *')
    .timeZone(CONFIG.timezone)
    .onRun(async (context) => {
        console.log('Running daily analytics aggregation');
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        
        const tenants = await db.ref('tenants').once('value');
        
        for (const tenantId in tenants.val()) {
            try {
                await aggregateTenantAnalytics(tenantId, yesterday);
            } catch (error) {
                console.error(`Analytics aggregation failed for ${tenantId}:`, error);
            }
        }
        
        return null;
    });

/**
 * Automated backups
 */
exports.performBackup = functions
    .region(CONFIG.region)
    .pubsub.schedule('0 3 * * *')
    .timeZone(CONFIG.timezone)
    .onRun(async (context) => {
        console.log('Performing automated backup');
        
        const backupId = `backup-${Date.now()}`;
        const bucket = storage.bucket();
        
        try {
            // Export database
            const data = await db.ref('/').once('value');
            const jsonData = JSON.stringify(data.val(), null, 2);
            
            // Save to Cloud Storage
            const file = bucket.file(`backups/${backupId}/database.json`);
            await file.save(jsonData, {
                metadata: {
                    contentType: 'application/json',
                    metadata: {
                        backupDate: new Date().toISOString(),
                        version: '5.0.0'
                    }
                }
            });
            
            // Clean old backups (keep last 30)
            await cleanOldBackups();
            
            console.log(`Backup ${backupId} completed successfully`);
            
        } catch (error) {
            console.error('Backup failed:', error);
            await notifyAdmins('Backup Failed', error.message);
        }
        
        return null;
    });

/**
 * Customer retention campaigns
 */
exports.retentionCampaign = functions
    .region(CONFIG.region)
    .pubsub.schedule('0 10 * * 1')
    .timeZone(CONFIG.timezone)
    .onRun(async (context) => {
        console.log('Running weekly retention campaign');
        
        const tenants = await db.ref('tenants').once('value');
        
        for (const tenantId in tenants.val()) {
            try {
                // Find inactive customers
                const inactiveCustomers = await findInactiveCustomers(tenantId, 14); // 14 days
                
                for (const customer of inactiveCustomers) {
                    await sendRetentionEmail(customer, tenantId);
                }
                
            } catch (error) {
                console.error(`Retention campaign failed for ${tenantId}:`, error);
            }
        }
        
        return null;
    });

// ============================================================================
// NOTIFICATION FUNCTIONS
// ============================================================================

/**
 * Send order confirmation email
 */
async function sendOrderConfirmationEmail(order) {
    const mailOptions = {
        from: CONFIG.email.from,
        to: order.customer.email,
        replyTo: CONFIG.email.replyTo,
        subject: `Bestellbestätigung #${order.number} - EATECH`,
        html: await generateEmailTemplate('orderConfirmation', {
            order,
            customerName: order.customer.name,
            orderNumber: order.number,
            items: order.items,
            total: formatCurrency(order.totals.total),
            estimatedTime: order.estimatedTime || '15-20 Minuten'
        })
    };
    
    try {
        await mailTransporter.sendMail(mailOptions);
        console.log(`Order confirmation email sent to ${order.customer.email}`);
    } catch (error) {
        console.error('Email sending failed:', error);
    }
}

/**
 * Send SMS notification
 */
async function sendSMS(to, message) {
    // Format Swiss phone number
    const formattedNumber = formatSwissPhoneNumber(to);
    
    try {
        const sms = await twilio.messages.create({
            body: message,
            from: CONFIG.sms.from,
            to: formattedNumber
        });
        
        console.log(`SMS sent to ${formattedNumber}: ${sms.sid}`);
        return sms;
        
    } catch (error) {
        console.error('SMS sending failed:', error);
        throw error;
    }
}

/**
 * Send push notification
 */
async function sendPushNotification(userId, notification) {
    try {
        // Get user's FCM tokens
        const userRef = await db.ref(`users/${userId}/fcmTokens`).once('value');
        const tokens = userRef.val();
        
        if (!tokens) {
            console.log(`No FCM tokens found for user ${userId}`);
            return;
        }
        
        const message = {
            notification: {
                title: notification.title,
                body: notification.body,
                icon: '/images/logo-192.png',
                badge: '/images/badge-72.png'
            },
            data: notification.data || {},
            webpush: {
                fcmOptions: {
                    link: notification.link || '/'
                },
                notification: {
                    vibrate: [200, 100, 200],
                    requireInteraction: notification.requireInteraction || false,
                    actions: notification.actions || []
                }
            }
        };
        
        // Send to all tokens
        const tokensList = Object.keys(tokens);
        const response = await admin.messaging().sendMulticast({
            tokens: tokensList,
            ...message
        });
        
        // Clean up failed tokens
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(tokensList[idx]);
                }
            });
            
            // Remove failed tokens
            for (const token of failedTokens) {
                await db.ref(`users/${userId}/fcmTokens/${token}`).remove();
            }
        }
        
        console.log(`Push notification sent to ${userId}: ${response.successCount} success, ${response.failureCount} failed`);
        
    } catch (error) {
        console.error('Push notification failed:', error);
    }
}

// ============================================================================
// ANALYTICS FUNCTIONS
// ============================================================================

/**
 * Track order analytics
 */
async function trackOrderAnalytics(order) {
    const analytics = {
        event: 'order_created',
        tenantId: order.tenantId,
        timestamp: Date.now(),
        data: {
            orderId: order.id,
            orderNumber: order.number,
            total: order.totals.total,
            itemCount: order.items.length,
            paymentMethod: order.payment.method,
            orderType: order.delivery?.type || 'pickup',
            dayOfWeek: new Date().getDay(),
            hour: new Date().getHours()
        }
    };
    
    // Store in analytics collection
    await db.ref(`analytics/events/${order.tenantId}`).push(analytics);
    
    // Update real-time metrics
    await updateRealtimeMetrics(order.tenantId, {
        ordersToday: admin.database.ServerValue.increment(1),
        revenueToday: admin.database.ServerValue.increment(order.totals.total)
    });
}

/**
 * Aggregate tenant analytics
 */
async function aggregateTenantAnalytics(tenantId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get all orders for the day
    const ordersSnapshot = await db.ref(`tenants/${tenantId}/orders`)
        .orderByChild('createdAt')
        .startAt(startOfDay.getTime())
        .endAt(endOfDay.getTime())
        .once('value');
    
    const orders = ordersSnapshot.val() || {};
    const ordersList = Object.values(orders);
    
    // Calculate metrics
    const metrics = {
        date: date.toISOString().split('T')[0],
        orders: {
            total: ordersList.length,
            completed: ordersList.filter(o => o.status === 'completed').length,
            cancelled: ordersList.filter(o => o.status === 'cancelled').length
        },
        revenue: {
            total: ordersList.reduce((sum, o) => sum + (o.totals?.total || 0), 0),
            average: ordersList.length > 0 ? 
                ordersList.reduce((sum, o) => sum + (o.totals?.total || 0), 0) / ordersList.length : 0
        },
        products: {},
        customers: {
            unique: new Set(ordersList.map(o => o.customer?.userId || o.customer?.email)).size,
            new: 0, // Calculate based on first order
            returning: 0
        },
        performance: {
            avgPrepTime: calculateAveragePrepTime(ordersList),
            peakHour: findPeakHour(ordersList)
        }
    };
    
    // Store aggregated data
    await db.ref(`analytics/daily/${tenantId}/${date.toISOString().split('T')[0]}`).set(metrics);
    
    // Update monthly aggregates
    await updateMonthlyAggregates(tenantId, date, metrics);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate order totals with Swiss VAT
 */
function calculateOrderTotals(items, delivery) {
    let subtotal = 0;
    let vatAmounts = {};
    
    // Calculate item totals
    items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        
        // Determine VAT rate
        const vatRate = item.isTakeaway ? CONFIG.vat.reduced : CONFIG.vat.standard;
        const vatKey = `vat_${vatRate}`;
        
        if (!vatAmounts[vatKey]) {
            vatAmounts[vatKey] = 0;
        }
        
        // VAT is included in price (Swiss style)
        const vatAmount = itemTotal - (itemTotal / (1 + vatRate / 100));
        vatAmounts[vatKey] += vatAmount;
    });
    
    // Add delivery fee if applicable
    let deliveryFee = 0;
    if (delivery && delivery.type === 'delivery') {
        deliveryFee = delivery.fee || 5;
        subtotal += deliveryFee;
        
        // Delivery is a service, standard VAT
        const deliveryVat = deliveryFee - (deliveryFee / (1 + CONFIG.vat.standard / 100));
        vatAmounts[`vat_${CONFIG.vat.standard}`] = 
            (vatAmounts[`vat_${CONFIG.vat.standard}`] || 0) + deliveryVat;
    }
    
    // Round to 5 cents (Swiss rounding)
    const total = Math.round(subtotal * 20) / 20;
    
    return {
        subtotal: subtotal,
        vatAmounts: vatAmounts,
        deliveryFee: deliveryFee,
        total: total
    };
}

/**
 * Generate unique order number
 */
function generateOrderNumber() {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 100)).padStart(2, '0');
    
    return `${day}${hour}${minute.charAt(0)}${random}`;
}

/**
 * Format currency for Switzerland
 */
function formatCurrency(amount) {
    return `CHF ${amount.toFixed(2)}`;
}

/**
 * Format Swiss phone number
 */
function formatSwissPhoneNumber(phone) {
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle Swiss numbers
    if (cleaned.startsWith('41')) {
        return `+${cleaned}`;
    } else if (cleaned.startsWith('0')) {
        // Replace leading 0 with +41
        return `+41${cleaned.substring(1)}`;
    } else if (cleaned.length === 9) {
        // Assume Swiss number without country code or 0
        return `+41${cleaned}`;
    }
    
    // Default: return with + prefix
    return `+${cleaned}`;
}

/**
 * Generate email template
 */
async function generateEmailTemplate(templateName, data) {
    // In production, these would be stored in Firestore or Cloud Storage
    const templates = {
        orderConfirmation: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
                    .content { background: #f5f5f5; padding: 30px; }
                    .order-details { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
                    .item { padding: 10px 0; border-bottom: 1px solid #eee; }
                    .total { font-size: 20px; font-weight: bold; color: #FF6B6B; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Bestellbestätigung</h1>
                        <p>Vielen Dank für Ihre Bestellung!</p>
                    </div>
                    <div class="content">
                        <p>Hallo ${data.customerName},</p>
                        <p>Ihre Bestellung #${data.orderNumber} wurde erfolgreich aufgegeben.</p>
                        
                        <div class="order-details">
                            <h3>Bestelldetails:</h3>
                            ${data.items.map(item => `
                                <div class="item">
                                    <strong>${item.quantity}x ${item.name}</strong><br>
                                    CHF ${(item.price * item.quantity).toFixed(2)}
                                </div>
                            `).join('')}
                            
                            <div class="total">
                                Gesamt: ${data.total}
                            </div>
                        </div>
                        
                        <p><strong>Geschätzte Wartezeit:</strong> ${data.estimatedTime}</p>
                        <p>Sie erhalten eine Benachrichtigung, sobald Ihre Bestellung bereit ist.</p>
                        
                        <p>Mit freundlichen Grüssen,<br>
                        Ihr EATECH Team</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        
        orderReady: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #00E676; color: white; padding: 30px; border-radius: 10px; text-align: center; }
                    .content { padding: 30px; text-align: center; }
                    .order-number { font-size: 48px; font-weight: bold; color: #00E676; margin: 20px 0; }
                    .cta { display: inline-block; background: #00E676; color: white; padding: 15px 30px; border-radius: 30px; text-decoration: none; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Ihre Bestellung ist bereit!</h1>
                    </div>
                    <div class="content">
                        <p>Hallo ${data.customerName},</p>
                        <div class="order-number">#${data.orderNumber}</div>
                        <p>Ihre Bestellung ist fertig und wartet auf Sie!</p>
                        <p>Bitte holen Sie Ihre Bestellung am Ausgabefenster ab.</p>
                        <a href="${data.trackingUrl}" class="cta">Bestellung verfolgen</a>
                    </div>
                </div>
            </body>
            </html>
        `
    };
    
    return templates[templateName] || '';
}

// ============================================================================
// TENANT MANAGEMENT
// ============================================================================

/**
 * Create new tenant (Master admin only)
 */
exports.createTenant = functions
    .region(CONFIG.region)
    .https.onCall(async (data, context) => {
        // Verify master admin
        if (!context.auth || !context.auth.token.isMasterAdmin) {
            throw new functions.https.HttpsError(
                'permission-denied',
                'Only master admins can create tenants'
            );
        }
        
        const { name, subdomain, owner, plan } = data;
        
        try {
            // Generate tenant ID
            const tenantId = subdomain.toLowerCase().replace(/[^a-z0-9]/g, '');
            
            // Check if subdomain is available
            const existing = await db.ref(`tenants/${tenantId}`).once('value');
            if (existing.exists()) {
                throw new Error('Subdomain already taken');
            }
            
            // Create tenant structure
            const tenant = {
                id: tenantId,
                name,
                subdomain,
                plan: plan || 'standard',
                status: 'active',
                created: admin.database.ServerValue.TIMESTAMP,
                owner: {
                    email: owner.email,
                    name: owner.name
                },
                settings: {
                    currency: 'CHF',
                    timezone: 'Europe/Zurich',
                    language: 'de-CH',
                    theme: 'noir-excellence'
                },
                limits: getPlanLimits(plan),
                billing: {
                    plan: plan || 'standard',
                    status: 'active',
                    nextBilling: getNextBillingDate()
                }
            };
            
            // Create tenant in database
            await db.ref(`tenants/${tenantId}`).set(tenant);
            
            // Create admin user
            const adminUser = await createTenantAdmin(tenantId, owner);
            
            // Setup default data
            await setupDefaultTenantData(tenantId);
            
            // Send welcome email
            await sendWelcomeEmail(owner.email, {
                tenantName: name,
                subdomain,
                loginUrl: `https://${subdomain}.eatech.ch/admin`
            });
            
            return {
                success: true,
                tenantId,
                subdomain,
                adminUserId: adminUser.uid
            };
            
        } catch (error) {
            console.error('Tenant creation error:', error);
            throw new functions.https.HttpsError(
                'internal',
                'Failed to create tenant',
                error.message
            );
        }
    });

// ============================================================================
// EXPORT MAIN APP
// ============================================================================
exports.api = functions
    .region(CONFIG.region)
    .https.onRequest(app);

// ============================================================================
// ERROR MONITORING
// ============================================================================
process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
    // In production: Send to error tracking service
});