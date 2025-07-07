/**
 * EATECH - Stripe Payment Configuration
 * Version: 1.0.0
 * Description: Stripe payment gateway configuration and initialization
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/config/stripe.config.ts
 */

import Stripe from 'stripe';
import * as functions from 'firebase-functions';

// ============================================================================
// STRIPE CONFIGURATION
// ============================================================================

/**
 * Stripe API configuration
 */
export const STRIPE_CONFIG = {
  // API Version
  apiVersion: '2023-10-16' as Stripe.LatestApiVersion,
  
  // Webhook endpoints
  webhooks: {
    paymentIntent: '/stripe/webhook/payment-intent',
    customer: '/stripe/webhook/customer',
    subscription: '/stripe/webhook/subscription',
    invoice: '/stripe/webhook/invoice',
    payout: '/stripe/webhook/payout'
  },
  
  // Supported currencies
  currencies: {
    default: 'chf',
    supported: ['chf', 'eur', 'usd']
  },
  
  // Payment method types
  paymentMethods: {
    card: {
      enabled: true,
      brands: ['visa', 'mastercard', 'amex'],
      requiresCvc: true,
      saveByDefault: true
    },
    sepa_debit: {
      enabled: true,
      countries: ['CH', 'DE', 'AT', 'FR', 'IT']
    },
    bancontact: {
      enabled: true,
      countries: ['BE']
    },
    ideal: {
      enabled: true,
      countries: ['NL']
    },
    giropay: {
      enabled: true,
      countries: ['DE']
    },
    eps: {
      enabled: true,
      countries: ['AT']
    },
    p24: {
      enabled: true,
      countries: ['PL']
    },
    klarna: {
      enabled: true,
      countries: ['DE', 'AT', 'CH']
    },
    afterpay_clearpay: {
      enabled: false,
      countries: ['US', 'CA', 'AU', 'NZ', 'GB']
    }
  },
  
  // Fee structure (for Switzerland)
  fees: {
    card: {
      percentage: 2.9,
      fixed: 0.30
    },
    sepa: {
      percentage: 0.8,
      fixed: 0.30,
      cap: 5.00
    },
    international: {
      percentage: 3.9,
      fixed: 0.30
    },
    currency_conversion: 2.0,
    dispute: 15.00,
    payout: 0.00
  }
};

// ============================================================================
// STRIPE CLIENT INITIALIZATION
// ============================================================================

let stripeClient: Stripe | null = null;

/**
 * Gets or creates Stripe client instance
 */
export function getStripeClient(): Stripe {
  if (!stripeClient) {
    const secretKey = functions.config().stripe?.secret_key || process.env.STRIPE_SECRET_KEY;
    
    if (!secretKey) {
      throw new Error('Stripe secret key not configured');
    }
    
    stripeClient = new Stripe(secretKey, {
      apiVersion: STRIPE_CONFIG.apiVersion,
      typescript: true,
      telemetry: false, // Disable telemetry in Cloud Functions
      maxNetworkRetries: 3,
      timeout: 20000 // 20 seconds
    });
    
    functions.logger.info('Stripe client initialized');
  }
  
  return stripeClient;
}

// ============================================================================
// WEBHOOK CONFIGURATION
// ============================================================================

/**
 * Stripe webhook event types to handle
 */
export const WEBHOOK_EVENTS = {
  // Payment Intent events
  PAYMENT_INTENT_SUCCEEDED: 'payment_intent.succeeded',
  PAYMENT_INTENT_FAILED: 'payment_intent.payment_failed',
  PAYMENT_INTENT_CANCELED: 'payment_intent.canceled',
  PAYMENT_INTENT_PROCESSING: 'payment_intent.processing',
  PAYMENT_INTENT_REQUIRES_ACTION: 'payment_intent.requires_action',
  
  // Charge events
  CHARGE_SUCCEEDED: 'charge.succeeded',
  CHARGE_FAILED: 'charge.failed',
  CHARGE_REFUNDED: 'charge.refunded',
  CHARGE_DISPUTE_CREATED: 'charge.dispute.created',
  CHARGE_DISPUTE_UPDATED: 'charge.dispute.updated',
  
  // Customer events
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',
  CUSTOMER_DELETED: 'customer.deleted',
  
  // Payment Method events
  PAYMENT_METHOD_ATTACHED: 'payment_method.attached',
  PAYMENT_METHOD_DETACHED: 'payment_method.detached',
  PAYMENT_METHOD_UPDATED: 'payment_method.updated',
  
  // Subscription events
  SUBSCRIPTION_CREATED: 'customer.subscription.created',
  SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
  SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
  SUBSCRIPTION_TRIAL_ENDING: 'customer.subscription.trial_will_end',
  
  // Invoice events
  INVOICE_CREATED: 'invoice.created',
  INVOICE_PAID: 'invoice.paid',
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
  INVOICE_FINALIZED: 'invoice.finalized',
  
  // Payout events
  PAYOUT_CREATED: 'payout.created',
  PAYOUT_PAID: 'payout.paid',
  PAYOUT_FAILED: 'payout.failed',
  
  // Account events
  ACCOUNT_UPDATED: 'account.updated',
  ACCOUNT_APPLICATION_DEAUTHORIZED: 'account.application.deauthorized'
} as const;

/**
 * Gets webhook endpoint secret
 */
export function getWebhookSecret(endpoint: string): string {
  const secrets = {
    'payment-intent': functions.config().stripe?.webhook_payment_secret,
    'customer': functions.config().stripe?.webhook_customer_secret,
    'subscription': functions.config().stripe?.webhook_subscription_secret,
    'invoice': functions.config().stripe?.webhook_invoice_secret,
    'payout': functions.config().stripe?.webhook_payout_secret
  };
  
  const secret = secrets[endpoint as keyof typeof secrets] || 
                 process.env[`STRIPE_WEBHOOK_${endpoint.toUpperCase().replace('-', '_')}_SECRET`];
  
  if (!secret) {
    throw new Error(`Webhook secret not configured for endpoint: ${endpoint}`);
  }
  
  return secret;
}

// ============================================================================
// PAYMENT INTENT CONFIGURATION
// ============================================================================

/**
 * Default payment intent options
 */
export const PAYMENT_INTENT_OPTIONS: Partial<Stripe.PaymentIntentCreateParams> = {
  payment_method_types: ['card', 'sepa_debit'],
  capture_method: 'automatic',
  setup_future_usage: 'off_session',
  statement_descriptor_suffix: 'EATECH'
};

/**
 * Creates payment intent metadata
 */
export function createPaymentMetadata(data: {
  tenantId: string;
  orderId: string;
  customerId?: string;
  channel?: string;
  type?: string;
}): Stripe.MetadataParam {
  return {
    tenant_id: data.tenantId,
    order_id: data.orderId,
    customer_id: data.customerId || '',
    channel: data.channel || 'web',
    type: data.type || 'order',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  };
}

// ============================================================================
// CUSTOMER CONFIGURATION
// ============================================================================

/**
 * Default customer options
 */
export const CUSTOMER_OPTIONS: Partial<Stripe.CustomerCreateParams> = {
  payment_method: undefined,
  invoice_settings: {
    default_payment_method: undefined
  },
  tax_exempt: 'none'
};

/**
 * Creates customer metadata
 */
export function createCustomerMetadata(data: {
  tenantId: string;
  userId?: string;
  type?: string;
  channel?: string;
}): Stripe.MetadataParam {
  return {
    tenant_id: data.tenantId,
    user_id: data.userId || '',
    type: data.type || 'individual',
    channel: data.channel || 'web',
    created_via: 'eatech_platform',
    timestamp: new Date().toISOString()
  };
}

// ============================================================================
// SUBSCRIPTION CONFIGURATION
// ============================================================================

/**
 * Subscription billing intervals
 */
export const BILLING_INTERVALS = {
  MONTHLY: 'month',
  QUARTERLY: 'quarter',  // Custom implementation needed
  YEARLY: 'year'
} as const;

/**
 * Default subscription options
 */
export const SUBSCRIPTION_OPTIONS: Partial<Stripe.SubscriptionCreateParams> = {
  collection_method: 'charge_automatically',
  payment_behavior: 'default_incomplete',
  expand: ['latest_invoice.payment_intent'],
  trial_from_plan: true
};

// ============================================================================
// PRODUCT & PRICE CONFIGURATION
// ============================================================================

/**
 * Product types for Stripe
 */
export const PRODUCT_TYPES = {
  SUBSCRIPTION: 'service',
  ONE_TIME: 'good',
  USAGE_BASED: 'service'
} as const;

/**
 * Creates product metadata
 */
export function createProductMetadata(data: {
  tenantId: string;
  category?: string;
  features?: string[];
}): Stripe.MetadataParam {
  return {
    tenant_id: data.tenantId,
    category: data.category || 'general',
    features: JSON.stringify(data.features || []),
    platform: 'eatech'
  };
}

// ============================================================================
// REFUND CONFIGURATION
// ============================================================================

/**
 * Refund reasons mapping
 */
export const REFUND_REASONS: Record<string, Stripe.RefundCreateParams.Reason> = {
  DUPLICATE: 'duplicate',
  FRAUDULENT: 'fraudulent',
  REQUESTED: 'requested_by_customer',
  EXPIRED_UNCAPTURED: 'expired_uncaptured_charge'
};

/**
 * Default refund options
 */
export const REFUND_OPTIONS: Partial<Stripe.RefundCreateParams> = {
  refund_application_fee: false,
  reverse_transfer: false
};

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Maps Stripe errors to custom error codes
 */
export function mapStripeError(error: Stripe.StripeError): {
  code: string;
  message: string;
  statusCode: number;
} {
  const errorMap: Record<string, { code: string; message: string; statusCode: number }> = {
    card_declined: {
      code: 'PAYMENT_CARD_DECLINED',
      message: 'Die Karte wurde abgelehnt',
      statusCode: 402
    },
    expired_card: {
      code: 'PAYMENT_CARD_EXPIRED',
      message: 'Die Karte ist abgelaufen',
      statusCode: 402
    },
    insufficient_funds: {
      code: 'PAYMENT_INSUFFICIENT_FUNDS',
      message: 'Unzureichende Deckung',
      statusCode: 402
    },
    invalid_cvc: {
      code: 'PAYMENT_INVALID_CVC',
      message: 'Ungültiger Sicherheitscode',
      statusCode: 400
    },
    processing_error: {
      code: 'PAYMENT_PROCESSING_ERROR',
      message: 'Fehler bei der Zahlungsverarbeitung',
      statusCode: 500
    },
    rate_limit: {
      code: 'PAYMENT_RATE_LIMIT',
      message: 'Zu viele Anfragen',
      statusCode: 429
    }
  };
  
  return errorMap[error.code || ''] || {
    code: 'PAYMENT_UNKNOWN_ERROR',
    message: error.message || 'Unbekannter Zahlungsfehler',
    statusCode: 500
  };
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates Stripe webhook signature
 */
export function validateWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  const stripe = getStripeClient();
  
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (err: any) {
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }
}

/**
 * Validates currency code
 */
export function isValidCurrency(currency: string): boolean {
  return STRIPE_CONFIG.currencies.supported.includes(currency.toLowerCase());
}

/**
 * Validates payment method type
 */
export function isValidPaymentMethod(type: string): boolean {
  return Object.keys(STRIPE_CONFIG.paymentMethods).includes(type);
}

// ============================================================================
// CALCULATION HELPERS
// ============================================================================

/**
 * Calculates Stripe fees
 */
export function calculateStripeFees(
  amount: number,
  currency: string = 'chf',
  paymentMethod: string = 'card',
  international: boolean = false
): {
  stripeFee: number;
  netAmount: number;
  feeDetails: {
    percentage: number;
    fixed: number;
  };
} {
  const fees = international ? 
    STRIPE_CONFIG.fees.international : 
    STRIPE_CONFIG.fees[paymentMethod as keyof typeof STRIPE_CONFIG.fees] || STRIPE_CONFIG.fees.card;
  
  const percentageFee = (amount * fees.percentage) / 100;
  const fixedFee = fees.fixed;
  const totalFee = Math.round((percentageFee + fixedFee) * 100) / 100;
  
  return {
    stripeFee: totalFee,
    netAmount: amount - totalFee,
    feeDetails: {
      percentage: fees.percentage,
      fixed: fees.fixed
    }
  };
}

/**
 * Converts amount to Stripe format (smallest currency unit)
 */
export function toStripeAmount(amount: number, currency: string = 'chf'): number {
  // Zero-decimal currencies
  const zeroDecimalCurrencies = ['jpy', 'krw', 'vnd', 'clp', 'pyg', 'xaf', 'xof', 'xpf'];
  
  if (zeroDecimalCurrencies.includes(currency.toLowerCase())) {
    return Math.round(amount);
  }
  
  // Most currencies use 2 decimal places
  return Math.round(amount * 100);
}

/**
 * Converts from Stripe format to normal amount
 */
export function fromStripeAmount(amount: number, currency: string = 'chf'): number {
  const zeroDecimalCurrencies = ['jpy', 'krw', 'vnd', 'clp', 'pyg', 'xaf', 'xof', 'xpf'];
  
  if (zeroDecimalCurrencies.includes(currency.toLowerCase())) {
    return amount;
  }
  
  return amount / 100;
}

// ============================================================================
// CONNECT CONFIGURATION (for marketplace features)
// ============================================================================

export const CONNECT_CONFIG = {
  // Account types
  accountTypes: {
    standard: 'standard',
    express: 'express',
    custom: 'custom'
  },
  
  // Capabilities required
  capabilities: {
    card_payments: 'active',
    transfers: 'active',
    tax_reporting_ch: 'active'
  },
  
  // Commission structure
  commission: {
    percentage: 10, // Platform takes 10%
    minimum: 0.50  // Minimum commission in CHF
  },
  
  // Payout schedule
  payoutSchedule: {
    interval: 'daily',
    delay_days: 2
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Configuration
  STRIPE_CONFIG,
  WEBHOOK_EVENTS,
  PAYMENT_INTENT_OPTIONS,
  CUSTOMER_OPTIONS,
  SUBSCRIPTION_OPTIONS,
  BILLING_INTERVALS,
  PRODUCT_TYPES,
  REFUND_REASONS,
  REFUND_OPTIONS,
  CONNECT_CONFIG,
  
  // Client
  getStripeClient,
  
  // Webhooks
  getWebhookSecret,
  validateWebhookSignature,
  
  // Metadata helpers
  createPaymentMetadata,
  createCustomerMetadata,
  createProductMetadata,
  
  // Error handling
  mapStripeError,
  
  // Validation
  isValidCurrency,
  isValidPaymentMethod,
  
  // Calculations
  calculateStripeFees,
  toStripeAmount,
  fromStripeAmount
};