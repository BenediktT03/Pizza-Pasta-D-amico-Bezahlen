/**
 * Webhook handlers for external services
 * Handles webhooks from Stripe, Twilio, and other services
 */

import { onRequest } from 'firebase-functions/v2/https';
import * as express from 'express';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import Stripe from 'stripe';
import * as twilio from 'twilio';
import { corsOptions } from '../utils/cors';

// Initialize services
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

const app = express();

// Raw body middleware for webhook signature verification
app.use('/stripe', express.raw({ type: 'application/json' }));
app.use('/twilio', express.urlencoded({ extended: false }));
app.use(express.json());

// Webhook endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'webhooks' });
});

// Stripe webhooks
app.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('Stripe webhook received:', event.type);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoiceFailed(event.data.object as Stripe.Invoice);
        break;

      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Twilio webhooks (SMS/Voice)
app.post('/twilio/sms', twilio.webhook({ validate: true }), async (req, res) => {
  try {
    const { From, To, Body, MessageSid } = req.body;
    
    console.log('SMS received:', {
      from: From,
      to: To,
      body: Body,
      sid: MessageSid,
    });

    // Process SMS (e.g., voice ordering via SMS)
    if (Body.toLowerCase().includes('bestellen') || Body.toLowerCase().includes('order')) {
      await processSMSOrder(From, Body);
      
      // Send confirmation
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message('Danke für Ihre Bestellung! Wir haben Ihre Anfrage erhalten und werden sie umgehend bearbeiten.');
      
      res.type('text/xml');
      res.send(twiml.toString());
    } else {
      // Default response
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message('Willkommen bei EATECH! Senden Sie "bestellen" um eine Bestellung aufzugeben.');
      
      res.type('text/xml');
      res.send(twiml.toString());
    }
  } catch (error) {
    console.error('Error processing SMS webhook:', error);
    res.status(500).send('Error processing SMS');
  }
});

app.post('/twilio/voice', twilio.webhook({ validate: true }), async (req, res) => {
  try {
    const { From, To, CallSid } = req.body;
    
    console.log('Voice call received:', {
      from: From,
      to: To,
      sid: CallSid,
    });

    const twiml = new twilio.twiml.VoiceResponse();
    
    // Greeting in multiple languages
    twiml.say({
      voice: 'alice',
      language: 'de-CH',
    }, 'Willkommen bei EATECH. Bitte sagen Sie Ihre Bestellung.');
    
    // Record the order
    twiml.record({
      action: '/twilio/voice/recording',
      method: 'POST',
      maxLength: 120,
      transcribe: true,
      transcribeCallback: '/twilio/voice/transcription',
      language: 'de-CH',
    });
    
    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('Error processing voice webhook:', error);
    res.status(500).send('Error processing voice call');
  }
});

app.post('/twilio/voice/transcription', async (req, res) => {
  try {
    const { TranscriptionText, CallSid, RecordingSid } = req.body;
    
    console.log('Voice transcription received:', {
      text: TranscriptionText,
      callSid: CallSid,
      recordingSid: RecordingSid,
    });

    // Process voice order
    await processVoiceOrder(CallSid, TranscriptionText);
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing transcription:', error);
    res.status(500).send('Error processing transcription');
  }
});

// Twint webhooks
app.post('/twint', async (req, res) => {
  try {
    const signature = req.headers['x-twint-signature'] as string;
    const payload = JSON.stringify(req.body);
    
    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.TWINT_WEBHOOK_SECRET || '')
      .update(payload)
      .digest('hex');
    
    if (signature !== expectedSignature) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { event, data } = req.body;
    
    console.log('Twint webhook received:', event);

    switch (event) {
      case 'payment.completed':
        await handleTwintPaymentComplete(data);
        break;
      
      case 'payment.failed':
        await handleTwintPaymentFailed(data);
        break;
      
      case 'refund.completed':
        await handleTwintRefundComplete(data);
        break;
      
      default:
        console.log(`Unhandled Twint event: ${event}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing Twint webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// SendGrid webhooks (Email events)
app.post('/sendgrid', async (req, res) => {
  try {
    const events = Array.isArray(req.body) ? req.body : [req.body];
    
    for (const event of events) {
      console.log('SendGrid event:', event.event);
      
      switch (event.event) {
        case 'delivered':
          await updateEmailStatus(event.sg_message_id, 'delivered', event.timestamp);
          break;
        
        case 'open':
          await trackEmailOpen(event.sg_message_id, event.timestamp);
          break;
        
        case 'click':
          await trackEmailClick(event.sg_message_id, event.url, event.timestamp);
          break;
        
        case 'bounce':
        case 'dropped':
          await handleEmailBounce(event.sg_message_id, event.reason);
          break;
        
        case 'unsubscribe':
          await handleUnsubscribe(event.email);
          break;
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing SendGrid webhook:', error);
    res.status(500).send('Error processing webhook');
  }
});

// Helper functions
async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { metadata } = paymentIntent;
  
  if (!metadata.orderId || !metadata.tenantId) {
    console.error('Missing metadata in payment intent');
    return;
  }

  await admin.firestore()
    .collection('tenants')
    .doc(metadata.tenantId)
    .collection('orders')
    .doc(metadata.orderId)
    .update({
      paymentStatus: 'paid',
      paymentIntentId: paymentIntent.id,
      paidAmount: paymentIntent.amount / 100,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  console.log(`Order ${metadata.orderId} payment successful`);
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { metadata } = paymentIntent;
  
  if (!metadata.orderId || !metadata.tenantId) {
    return;
  }

  await admin.firestore()
    .collection('tenants')
    .doc(metadata.tenantId)
    .collection('orders')
    .doc(metadata.orderId)
    .update({
      paymentStatus: 'failed',
      paymentError: paymentIntent.last_payment_error?.message,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const { metadata } = subscription;
  
  if (!metadata.tenantId) {
    return;
  }

  await admin.firestore()
    .collection('tenants')
    .doc(metadata.tenantId)
    .update({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        items: subscription.items.data.map(item => ({
          id: item.id,
          priceId: item.price.id,
          quantity: item.quantity,
        })),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const { metadata } = subscription;
  
  if (!metadata.tenantId) {
    return;
  }

  await admin.firestore()
    .collection('tenants')
    .doc(metadata.tenantId)
    .update({
      subscription: {
        id: subscription.id,
        status: 'canceled',
        canceledAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Log invoice payment for accounting
  await admin.firestore()
    .collection('invoices')
    .doc(invoice.id)
    .set({
      ...invoice,
      paidAt: new Date(invoice.status_transitions.paid_at! * 1000),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  // Handle failed subscription payment
  console.error('Invoice payment failed:', invoice.id);
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const { metadata } = session;
  
  if (metadata?.type === 'subscription') {
    // Handle subscription checkout
    console.log('Subscription checkout completed:', session.id);
  } else if (metadata?.type === 'order') {
    // Handle order checkout
    console.log('Order checkout completed:', session.id);
  }
}

async function processSMSOrder(from: string, message: string) {
  // Parse and process SMS order
  console.log('Processing SMS order from:', from);
  
  // Create order record
  await admin.firestore()
    .collection('voice_orders')
    .add({
      type: 'sms',
      from,
      message,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

async function processVoiceOrder(callSid: string, transcription: string) {
  // Process voice order transcription
  console.log('Processing voice order:', transcription);
  
  // Create order record
  await admin.firestore()
    .collection('voice_orders')
    .add({
      type: 'voice',
      callSid,
      transcription,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

async function handleTwintPaymentComplete(data: any) {
  // Handle Twint payment completion
  console.log('Twint payment completed:', data);
}

async function handleTwintPaymentFailed(data: any) {
  // Handle Twint payment failure
  console.log('Twint payment failed:', data);
}

async function handleTwintRefundComplete(data: any) {
  // Handle Twint refund completion
  console.log('Twint refund completed:', data);
}

async function updateEmailStatus(messageId: string, status: string, timestamp: number) {
  // Update email delivery status
  console.log(`Email ${messageId} status: ${status}`);
}

async function trackEmailOpen(messageId: string, timestamp: number) {
  // Track email open event
  console.log(`Email ${messageId} opened`);
}

async function trackEmailClick(messageId: string, url: string, timestamp: number) {
  // Track email click event
  console.log(`Email ${messageId} clicked: ${url}`);
}

async function handleEmailBounce(messageId: string, reason: string) {
  // Handle email bounce
  console.log(`Email ${messageId} bounced: ${reason}`);
}

async function handleUnsubscribe(email: string) {
  // Handle email unsubscribe
  console.log(`Email unsubscribed: ${email}`);
  
  // Update user preferences
  const userSnapshot = await admin.firestore()
    .collection('users')
    .where('email', '==', email)
    .limit(1)
    .get();
  
  if (!userSnapshot.empty) {
    const userDoc = userSnapshot.docs[0];
    await userDoc.ref.update({
      emailSubscribed: false,
      unsubscribedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

// Export the webhook handler
export const webhooks = onRequest({
  region: 'europe-west6',
  timeoutSeconds: 60,
  memory: '512MiB',
  maxInstances: 50,
}, app);
