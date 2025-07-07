/**
 * EATECH Firebase Functions - Webhooks API
 * Version: 1.0.0
 * 
 * External webhook handlers for third-party integrations
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/api/webhooks.ts
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as crypto from 'crypto';
import { PaymentProcessor } from '../services/PaymentProcessor';
import { EmailService } from '../services/EmailService';
import { SMSService } from '../services/SMSService';
import { logger } from '../utils/logger';

// Initialize Express app
const app = express();

// Services
const paymentProcessor = new PaymentProcessor();
const emailService = new EmailService();
const smsService = new SMSService();

// Middleware for raw body (needed for Stripe webhook verification)
app.use('/stripe', express.raw({ type: 'application/json' }));
app.use(express.json());

// ============================================================================
// STRIPE WEBHOOKS
// ============================================================================
app.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = functions.config().stripe.webhook_secret;

  let event;

  try {
    // Verify webhook signature
    event = paymentProcessor.verifyWebhookSignature(
      req.body,
      sig,
      endpointSecret
    );
  } catch (err) {
    logger.error('Stripe webhook signature verification failed', { error: err });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object);
        break;
      
      case 'charge.refunded':
        await handleRefund(event.data.object);
        break;
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionCancellation(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePayment(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoiceFailure(event.data.object);
        break;
      
      default:
        logger.info(`Unhandled Stripe event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Error processing Stripe webhook', { error, eventType: event.type });
    res.status(500).send('Internal Server Error');
  }
});

// ============================================================================
// TWILIO WEBHOOKS
// ============================================================================
app.post('/twilio/sms/status', async (req, res) => {
  const twilioSignature = req.headers['x-twilio-signature'] as string;
  const url = `${functions.config().app.url}/webhooks/twilio/sms/status`;
  
  // Verify Twilio signature
  if (!smsService.verifyWebhookSignature(twilioSignature, url, req.body)) {
    logger.error('Invalid Twilio signature');
    return res.status(403).send('Forbidden');
  }

  try {
    const { MessageSid, MessageStatus, To, ErrorCode } = req.body;
    
    // Update message status in database
    await admin.firestore()
      .collection('smsLogs')
      .doc(MessageSid)
      .update({
        status: MessageStatus,
        errorCode: ErrorCode || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    logger.info('SMS status updated', { MessageSid, MessageStatus });
    res.status(200).send('OK');
  } catch (error) {
    logger.error('Error processing Twilio webhook', { error });
    res.status(500).send('Internal Server Error');
  }
});

app.post('/twilio/voice/status', async (req, res) => {
  // Similar verification as SMS
  try {
    const { CallSid, CallStatus, Direction, Duration } = req.body;
    
    // Log voice call status
    await admin.firestore()
      .collection('voiceCallLogs')
      .doc(CallSid)
      .set({
        status: CallStatus,
        direction: Direction,
        duration: parseInt(Duration) || 0,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

    res.status(200).send('OK');
  } catch (error) {
    logger.error('Error processing voice webhook', { error });
    res.status(500).send('Internal Server Error');
  }
});

// ============================================================================
// SENDGRID WEBHOOKS
// ============================================================================
app.post('/sendgrid/events', async (req, res) => {
  const signature = req.headers['x-twilio-email-event-webhook-signature'] as string;
  const timestamp = req.headers['x-twilio-email-event-webhook-timestamp'] as string;
  
  // Verify SendGrid signature
  const publicKey = functions.config().sendgrid.webhook_public_key;
  if (!verifyEmailWebhookSignature(signature, timestamp, req.body, publicKey)) {
    return res.status(403).send('Forbidden');
  }

  try {
    const events = req.body;
    const batch = admin.firestore().batch();

    for (const event of events) {
      const docRef = admin.firestore()
        .collection('emailEvents')
        .doc(`${event.sg_message_id}_${event.timestamp}`);
      
      batch.set(docRef, {
        messageId: event.sg_message_id,
        email: event.email,
        event: event.event,
        timestamp: new Date(event.timestamp * 1000),
        category: event.category,
        url: event.url,
        reason: event.reason,
        metadata: event
      });

      // Handle specific events
      if (event.event === 'bounce' || event.event === 'dropped') {
        await handleEmailBounce(event);
      } else if (event.event === 'unsubscribe') {
        await handleUnsubscribe(event);
      }
    }

    await batch.commit();
    res.status(200).send('OK');
  } catch (error) {
    logger.error('Error processing SendGrid webhook', { error });
    res.status(500).send('Internal Server Error');
  }
});

// ============================================================================
// THIRD-PARTY DELIVERY WEBHOOKS
// ============================================================================
app.post('/delivery/:provider', async (req, res) => {
  const provider = req.params.provider;
  const apiKey = req.headers['x-api-key'] as string;
  
  // Verify API key
  const expectedKey = functions.config().delivery?.[provider]?.webhook_key;
  if (!expectedKey || apiKey !== expectedKey) {
    return res.status(401).send('Unauthorized');
  }

  try {
    switch (provider) {
      case 'uber':
        await handleUberDeliveryUpdate(req.body);
        break;
      case 'justeat':
        await handleJustEatUpdate(req.body);
        break;
      default:
        logger.warn(`Unknown delivery provider: ${provider}`);
        return res.status(400).send('Unknown provider');
    }

    res.status(200).send('OK');
  } catch (error) {
    logger.error(`Error processing ${provider} webhook`, { error });
    res.status(500).send('Internal Server Error');
  }
});

// ============================================================================
// GENERIC WEBHOOK ENDPOINT
// ============================================================================
app.post('/custom/:tenantId/:integration', async (req, res) => {
  const { tenantId, integration } = req.params;
  const signature = req.headers['x-webhook-signature'] as string;

  try {
    // Get tenant webhook configuration
    const tenantDoc = await admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .get();

    if (!tenantDoc.exists) {
      return res.status(404).send('Tenant not found');
    }

    const webhookConfig = tenantDoc.data()?.integrations?.[integration]?.webhook;
    if (!webhookConfig || !webhookConfig.enabled) {
      return res.status(404).send('Webhook not configured');
    }

    // Verify signature if required
    if (webhookConfig.secret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookConfig.secret)
        .update(JSON.stringify(req.body))
        .digest('hex');
      
      if (signature !== expectedSignature) {
        return res.status(403).send('Invalid signature');
      }
    }

    // Store webhook data
    await admin.firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('webhooks')
      .add({
        integration,
        data: req.body,
        headers: req.headers,
        receivedAt: admin.firestore.FieldValue.serverTimestamp()
      });

    // Trigger processing
    await processCustomWebhook(tenantId, integration, req.body);

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error processing custom webhook', { error, tenantId, integration });
    res.status(500).send('Internal Server Error');
  }
});

// ============================================================================
// WEBHOOK HANDLERS
// ============================================================================
async function handlePaymentSuccess(paymentIntent: any) {
  const { metadata } = paymentIntent;
  
  if (!metadata.orderId || !metadata.tenantId) {
    logger.error('Missing metadata in payment intent', { paymentIntentId: paymentIntent.id });
    return;
  }

  // Update order status
  await admin.firestore()
    .collection('tenants')
    .doc(metadata.tenantId)
    .collection('orders')
    .doc(metadata.orderId)
    .update({
      paymentStatus: 'paid',
      paymentId: paymentIntent.id,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'confirmed'
    });

  // Send confirmation
  const orderDoc = await admin.firestore()
    .collection('tenants')
    .doc(metadata.tenantId)
    .collection('orders')
    .doc(metadata.orderId)
    .get();

  if (orderDoc.exists) {
    const order = orderDoc.data();
    if (order?.customer?.email) {
      await emailService.sendPaymentConfirmation({
        to: order.customer.email,
        orderNumber: order.orderNumber,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase()
      });
    }
  }
}

async function handlePaymentFailure(paymentIntent: any) {
  const { metadata } = paymentIntent;
  
  if (!metadata.orderId || !metadata.tenantId) {
    return;
  }

  // Update order status
  await admin.firestore()
    .collection('tenants')
    .doc(metadata.tenantId)
    .collection('orders')
    .doc(metadata.orderId)
    .update({
      paymentStatus: 'failed',
      paymentError: paymentIntent.last_payment_error?.message || 'Payment failed',
      status: 'payment_failed'
    });
}

async function handleRefund(charge: any) {
  const { metadata, refunds } = charge;
  
  if (!metadata.orderId || !metadata.tenantId) {
    return;
  }

  const refundAmount = refunds.data.reduce((sum: number, refund: any) => sum + refund.amount, 0);

  await admin.firestore()
    .collection('tenants')
    .doc(metadata.tenantId)
    .collection('orders')
    .doc(metadata.orderId)
    .update({
      refundStatus: refundAmount === charge.amount ? 'full' : 'partial',
      refundAmount: refundAmount / 100,
      refundedAt: admin.firestore.FieldValue.serverTimestamp()
    });
}

async function handleSubscriptionUpdate(subscription: any) {
  const { metadata } = subscription;
  
  if (!metadata.tenantId) {
    return;
  }

  await admin.firestore()
    .collection('tenants')
    .doc(metadata.tenantId)
    .update({
      'subscription.status': subscription.status,
      'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000),
      'subscription.planId': subscription.items.data[0]?.price.id,
      'subscription.subscriptionId': subscription.id
    });
}

async function handleSubscriptionCancellation(subscription: any) {
  const { metadata } = subscription;
  
  if (!metadata.tenantId) {
    return;
  }

  await admin.firestore()
    .collection('tenants')
    .doc(metadata.tenantId)
    .update({
      'subscription.status': 'cancelled',
      'subscription.cancelledAt': admin.firestore.FieldValue.serverTimestamp(),
      'subscription.cancelAtPeriodEnd': subscription.cancel_at_period_end
    });

  // Send cancellation email
  const tenantDoc = await admin.firestore()
    .collection('tenants')
    .doc(metadata.tenantId)
    .get();

  if (tenantDoc.exists) {
    const tenant = tenantDoc.data();
    await emailService.sendSubscriptionCancellation({
      to: tenant?.email,
      tenantName: tenant?.name
    });
  }
}

async function handleInvoicePayment(invoice: any) {
  logger.info('Invoice payment succeeded', { invoiceId: invoice.id });
  // Implementation for invoice payment handling
}

async function handleInvoiceFailure(invoice: any) {
  logger.error('Invoice payment failed', { invoiceId: invoice.id });
  // Implementation for invoice failure handling
}

async function handleEmailBounce(event: any) {
  // Mark email as bounced in user profile
  const usersSnapshot = await admin.firestore()
    .collection('users')
    .where('email', '==', event.email)
    .limit(1)
    .get();

  if (!usersSnapshot.empty) {
    await usersSnapshot.docs[0].ref.update({
      'emailStatus.bounced': true,
      'emailStatus.bouncedAt': admin.firestore.FieldValue.serverTimestamp(),
      'emailStatus.reason': event.reason
    });
  }
}

async function handleUnsubscribe(event: any) {
  // Update user preferences
  const usersSnapshot = await admin.firestore()
    .collection('users')
    .where('email', '==', event.email)
    .limit(1)
    .get();

  if (!usersSnapshot.empty) {
    await usersSnapshot.docs[0].ref.update({
      'preferences.marketing.email': false,
      'preferences.unsubscribedAt': admin.firestore.FieldValue.serverTimestamp()
    });
  }
}

async function handleUberDeliveryUpdate(data: any) {
  // Handle Uber delivery status updates
  const { order_id, status, courier, eta } = data;
  
  // Update delivery status in order
  await admin.firestore()
    .collectionGroup('orders')
    .where('deliveryProvider', '==', 'uber')
    .where('deliveryId', '==', order_id)
    .get()
    .then(snapshot => {
      const batch = admin.firestore().batch();
      snapshot.forEach(doc => {
        batch.update(doc.ref, {
          'delivery.status': status,
          'delivery.courier': courier,
          'delivery.eta': eta,
          'delivery.lastUpdate': admin.firestore.FieldValue.serverTimestamp()
        });
      });
      return batch.commit();
    });
}

async function handleJustEatUpdate(data: any) {
  // Handle JustEat order updates
  logger.info('JustEat webhook received', { data });
  // Implementation specific to JustEat
}

async function processCustomWebhook(tenantId: string, integration: string, data: any) {
  // Process custom webhook based on integration type
  logger.info('Processing custom webhook', { tenantId, integration });
  
  // Trigger any automated workflows
  // Update relevant data
  // Send notifications if needed
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function verifyEmailWebhookSignature(
  signature: string,
  timestamp: string,
  payload: any,
  publicKey: string
): boolean {
  try {
    const timestampPayload = timestamp + JSON.stringify(payload);
    const decodedSignature = Buffer.from(signature, 'base64');
    
    const verifier = crypto.createVerify('SHA256');
    verifier.update(timestampPayload);
    verifier.end();
    
    return verifier.verify(publicKey, decodedSignature);
  } catch (error) {
    logger.error('Error verifying email webhook signature', { error });
    return false;
  }
}

// ============================================================================
// EXPORT
// ============================================================================
export const webhooks = functions
  .region('europe-west1')
  .runWith({
    memory: '512MB',
    timeoutSeconds: 60
  })
  .https.onRequest(app);