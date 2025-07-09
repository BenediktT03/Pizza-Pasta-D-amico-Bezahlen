/**
 * Stripe webhook handlers
 * Processes Stripe payment events
 */

import { Request, Response } from 'express';
import Stripe from 'stripe';
import { db } from '@eatech/core';
import { Order, Payment, Subscription } from '@eatech/types';
import { logger } from '@eatech/utils';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

// Webhook endpoint secret
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      endpointSecret
    );
  } catch (err: any) {
    logger.error('Stripe webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  logger.info(`Stripe webhook received: ${event.type}`, {
    eventId: event.id,
    livemode: event.livemode,
  });

  try {
    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_method.attached':
        await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
        break;

      case 'charge.succeeded':
        await handleChargeSucceeded(event.data.object as Stripe.Charge);
        break;

      case 'charge.failed':
        await handleChargeFailed(event.data.object as Stripe.Charge);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.trial_will_end':
        await handleSubscriptionTrialWillEnd(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.created':
        await handleInvoiceCreated(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'checkout.session.expired':
        await handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.created':
        await handleCustomerCreated(event.data.object as Stripe.Customer);
        break;

      case 'customer.updated':
        await handleCustomerUpdated(event.data.object as Stripe.Customer);
        break;

      case 'customer.deleted':
        await handleCustomerDeleted(event.data.object as Stripe.Customer);
        break;

      case 'payment_method.automatically_updated':
        await handlePaymentMethodAutomaticallyUpdated(event.data.object as Stripe.PaymentMethod);
        break;

      case 'setup_intent.succeeded':
        await handleSetupIntentSucceeded(event.data.object as Stripe.SetupIntent);
        break;

      default:
        logger.info(`Unhandled Stripe event type: ${event.type}`);
    }

    // Store webhook event for audit
    await storeWebhookEvent(event);

    // Return success response
    res.json({ received: true });
  } catch (error) {
    logger.error('Error processing Stripe webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// Handler functions

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const { metadata } = paymentIntent;
  
  if (!metadata.orderId || !metadata.tenantId) {
    logger.error('Missing metadata in payment intent:', paymentIntent.id);
    return;
  }

  // Update order payment status
  await db.updateOrder(metadata.tenantId, metadata.orderId, {
    paymentStatus: 'paid',
    paymentIntentId: paymentIntent.id,
    paidAmount: paymentIntent.amount / 100, // Convert from cents
    paidAt: new Date(),
    paymentMethod: paymentIntent.payment_method_types[0],
  });

  // Create payment record
  await db.createPayment({
    tenantId: metadata.tenantId,
    orderId: metadata.orderId,
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    status: 'succeeded',
    method: paymentIntent.payment_method_types[0],
    metadata: paymentIntent.metadata,
    createdAt: new Date(),
  });

  // Send confirmation email
  await sendPaymentConfirmation(metadata.tenantId, metadata.orderId, paymentIntent);

  logger.info(`Payment succeeded for order ${metadata.orderId}`, {
    amount: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
  });
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { metadata } = paymentIntent;
  
  if (!metadata.orderId || !metadata.tenantId) return;

  // Update order with failure
  await db.updateOrder(metadata.tenantId, metadata.orderId, {
    paymentStatus: 'failed',
    paymentError: paymentIntent.last_payment_error?.message,
    paymentFailedAt: new Date(),
  });

  // Notify customer of failure
  await sendPaymentFailureNotification(metadata.tenantId, metadata.orderId, paymentIntent);

  logger.warn(`Payment failed for order ${metadata.orderId}`, {
    error: paymentIntent.last_payment_error?.message,
  });
}

async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod) {
  if (!paymentMethod.customer) return;

  const customerId = typeof paymentMethod.customer === 'string' 
    ? paymentMethod.customer 
    : paymentMethod.customer.id;

  // Store payment method for future use
  await db.savePaymentMethod({
    customerId,
    paymentMethodId: paymentMethod.id,
    type: paymentMethod.type,
    card: paymentMethod.card ? {
      brand: paymentMethod.card.brand,
      last4: paymentMethod.card.last4,
      expMonth: paymentMethod.card.exp_month,
      expYear: paymentMethod.card.exp_year,
    } : undefined,
    createdAt: new Date(),
  });

  logger.info(`Payment method attached for customer ${customerId}`);
}

async function handleChargeSucceeded(charge: Stripe.Charge) {
  // Additional charge processing if needed
  logger.info(`Charge succeeded: ${charge.id}`, {
    amount: charge.amount / 100,
    currency: charge.currency,
  });
}

async function handleChargeFailed(charge: Stripe.Charge) {
  // Handle failed charges
  logger.warn(`Charge failed: ${charge.id}`, {
    failureMessage: charge.failure_message,
    failureCode: charge.failure_code,
  });
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const { metadata } = charge;
  
  if (metadata.orderId && metadata.tenantId) {
    // Update order with refund
    await db.updateOrder(metadata.tenantId, metadata.orderId, {
      refundStatus: 'refunded',
      refundAmount: (charge.amount_refunded || 0) / 100,
      refundedAt: new Date(),
    });

    // Create refund record
    await db.createRefund({
      tenantId: metadata.tenantId,
      orderId: metadata.orderId,
      chargeId: charge.id,
      amount: (charge.amount_refunded || 0) / 100,
      reason: charge.refunds?.data[0]?.reason || 'requested_by_customer',
      createdAt: new Date(),
    });
  }

  logger.info(`Charge refunded: ${charge.id}`, {
    amount: (charge.amount_refunded || 0) / 100,
  });
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const { metadata } = subscription;
  
  if (!metadata.tenantId) return;

  // Create subscription record
  await db.createSubscription({
    tenantId: metadata.tenantId,
    subscriptionId: subscription.id,
    customerId: subscription.customer as string,
    status: subscription.status,
    items: subscription.items.data.map(item => ({
      priceId: item.price.id,
      quantity: item.quantity || 1,
    })),
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    metadata: subscription.metadata,
    createdAt: new Date(),
  });

  // Update tenant subscription status
  await db.updateTenant(metadata.tenantId, {
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    subscriptionPlan: metadata.plan || 'standard',
  });

  logger.info(`Subscription created for tenant ${metadata.tenantId}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const { metadata } = subscription;
  
  if (!metadata.tenantId) return;

  // Update subscription record
  await db.updateSubscription(subscription.id, {
    status: subscription.status,
    items: subscription.items.data.map(item => ({
      priceId: item.price.id,
      quantity: item.quantity || 1,
    })),
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    updatedAt: new Date(),
  });

  // Update tenant if status changed
  await db.updateTenant(metadata.tenantId, {
    subscriptionStatus: subscription.status,
  });

  logger.info(`Subscription updated for tenant ${metadata.tenantId}`, {
    status: subscription.status,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const { metadata } = subscription;
  
  if (!metadata.tenantId) return;

  // Mark subscription as canceled
  await db.updateSubscription(subscription.id, {
    status: 'canceled',
    canceledAt: new Date(),
  });

  // Update tenant
  await db.updateTenant(metadata.tenantId, {
    subscriptionStatus: 'canceled',
    subscriptionEndedAt: new Date(),
  });

  // Send cancellation email
  await sendSubscriptionCancellationEmail(metadata.tenantId, subscription);

  logger.info(`Subscription canceled for tenant ${metadata.tenantId}`);
}

async function handleSubscriptionTrialWillEnd(subscription: Stripe.Subscription) {
  const { metadata } = subscription;
  
  if (!metadata.tenantId) return;

  // Send trial ending notification
  await sendTrialEndingNotification(metadata.tenantId, subscription);

  logger.info(`Trial ending soon for tenant ${metadata.tenantId}`);
}

async function handleInvoiceCreated(invoice: Stripe.Invoice) {
  // Store invoice for records
  if (invoice.subscription_details?.metadata?.tenantId) {
    await db.createInvoice({
      tenantId: invoice.subscription_details.metadata.tenantId,
      invoiceId: invoice.id,
      customerId: invoice.customer as string,
      subscriptionId: invoice.subscription as string,
      amount: (invoice.amount_due || 0) / 100,
      currency: invoice.currency,
      status: invoice.status || 'draft',
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : undefined,
      createdAt: new Date(),
    });
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  logger.info(`Invoice payment succeeded: ${invoice.id}`, {
    amount: (invoice.amount_paid || 0) / 100,
  });

  // Update invoice status
  await db.updateInvoice(invoice.id, {
    status: 'paid',
    paidAt: new Date(),
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  logger.warn(`Invoice payment failed: ${invoice.id}`);

  // Update invoice status
  await db.updateInvoice(invoice.id, {
    status: 'payment_failed',
  });

  // Send payment failure notification
  if (invoice.subscription_details?.metadata?.tenantId) {
    await sendInvoicePaymentFailedNotification(
      invoice.subscription_details.metadata.tenantId,
      invoice
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const { metadata } = session;

  if (metadata?.type === 'order' && metadata.orderId && metadata.tenantId) {
    // Order checkout completed
    await db.updateOrder(metadata.tenantId, metadata.orderId, {
      checkoutSessionId: session.id,
      paymentStatus: session.payment_status,
    });
  } else if (metadata?.type === 'subscription' && metadata.tenantId) {
    // Subscription checkout completed
    logger.info(`Subscription checkout completed for tenant ${metadata.tenantId}`);
  }
}

async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
  const { metadata } = session;

  if (metadata?.orderId && metadata.tenantId) {
    // Mark order as expired
    await db.updateOrder(metadata.tenantId, metadata.orderId, {
      status: 'expired',
      expiredAt: new Date(),
    });
  }

  logger.info(`Checkout session expired: ${session.id}`);
}

async function handleCustomerCreated(customer: Stripe.Customer) {
  // Store Stripe customer ID
  if (customer.metadata.userId) {
    await db.updateUser(customer.metadata.userId, {
      stripeCustomerId: customer.id,
    });
  }

  logger.info(`Stripe customer created: ${customer.id}`);
}

async function handleCustomerUpdated(customer: Stripe.Customer) {
  logger.info(`Stripe customer updated: ${customer.id}`);
}

async function handleCustomerDeleted(customer: Stripe.Customer) {
  // Clean up customer data
  if (customer.metadata.userId) {
    await db.updateUser(customer.metadata.userId, {
      stripeCustomerId: null,
    });
  }

  logger.info(`Stripe customer deleted: ${customer.id}`);
}

async function handlePaymentMethodAutomaticallyUpdated(paymentMethod: Stripe.PaymentMethod) {
  // Update stored payment method details
  await db.updatePaymentMethod(paymentMethod.id, {
    card: paymentMethod.card ? {
      brand: paymentMethod.card.brand,
      last4: paymentMethod.card.last4,
      expMonth: paymentMethod.card.exp_month,
      expYear: paymentMethod.card.exp_year,
    } : undefined,
    updatedAt: new Date(),
  });

  logger.info(`Payment method automatically updated: ${paymentMethod.id}`);
}

async function handleSetupIntentSucceeded(setupIntent: Stripe.SetupIntent) {
  logger.info(`Setup intent succeeded: ${setupIntent.id}`);
  
  // Store the payment method for future use
  if (setupIntent.payment_method && setupIntent.metadata.customerId) {
    await db.setDefaultPaymentMethod(
      setupIntent.metadata.customerId,
      setupIntent.payment_method as string
    );
  }
}

// Helper functions

async function storeWebhookEvent(event: Stripe.Event) {
  await db.createWebhookEvent({
    service: 'stripe',
    eventId: event.id,
    type: event.type,
    livemode: event.livemode,
    data: event.data,
    createdAt: new Date(event.created * 1000),
  });
}

async function sendPaymentConfirmation(tenantId: string, orderId: string, paymentIntent: Stripe.PaymentIntent) {
  // Implementation would send email via SendGrid or other service
  logger.info(`Sending payment confirmation for order ${orderId}`);
}

async function sendPaymentFailureNotification(tenantId: string, orderId: string, paymentIntent: Stripe.PaymentIntent) {
  logger.info(`Sending payment failure notification for order ${orderId}`);
}

async function sendSubscriptionCancellationEmail(tenantId: string, subscription: Stripe.Subscription) {
  logger.info(`Sending subscription cancellation email for tenant ${tenantId}`);
}

async function sendTrialEndingNotification(tenantId: string, subscription: Stripe.Subscription) {
  logger.info(`Sending trial ending notification for tenant ${tenantId}`);
}

async function sendInvoicePaymentFailedNotification(tenantId: string, invoice: Stripe.Invoice) {
  logger.info(`Sending invoice payment failed notification for tenant ${tenantId}`);
}

// Stripe webhook configuration helper
export function getStripeWebhookEndpoint(): string {
  const baseUrl = process.env.API_BASE_URL || 'https://api.eatech.ch';
  return `${baseUrl}/webhooks/stripe`;
}

// Webhook secret rotation helper
export async function rotateWebhookSecret(newSecret: string): Promise<void> {
  // This would update the webhook endpoint secret in Stripe
  // and update the environment variable
  logger.info('Rotating Stripe webhook secret');
}
