/**
 * EATECH - Payment Processor Service
 * Version: 1.0.0
 * Description: Zentrale Zahlungsverarbeitung für alle Zahlungsmethoden
 * Author: EATECH Development Team
 * Created: 2025-01-09
 * File Path: /functions/src/services/PaymentProcessor.ts
 * 
 * Features:
 * - Stripe integration
 * - Twint support
 * - PostFinance integration
 * - Payment validation
 * - Refund processing
 * - Transaction logging
 * - Fraud detection
 * - Multi-currency support
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import Stripe from 'stripe';
import { PaymentMethod, PaymentStatus, PaymentData, RefundData } from '../types/payment.types';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import crypto from 'crypto';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface PaymentRequest {
  amount: number;
  currency: string;
  method: PaymentMethod;
  orderId: string;
  tenantId: string;
  customerId: string;
  description?: string;
  metadata?: Record<string, any>;
  paymentMethodId?: string;
  returnUrl?: string;
}

interface PaymentResponse {
  id: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  method: PaymentMethod;
  transactionId?: string;
  clientSecret?: string;
  redirectUrl?: string;
  error?: string;
  metadata?: Record<string, any>;
  created: string;
}

interface RefundRequest {
  paymentId: string;
  amount?: number;
  reason?: string;
  metadata?: Record<string, any>;
}

interface RefundResponse {
  id: string;
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  reason?: string;
  created: string;
}

interface TwintConfig {
  merchantId: string;
  apiKey: string;
  apiSecret: string;
  webhookSecret: string;
  baseUrl: string;
}

interface PostFinanceConfig {
  pspid: string;
  userId: string;
  password: string;
  shaInPassphrase: string;
  shaOutPassphrase: string;
  baseUrl: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STRIPE_API_VERSION = '2023-10-16';
const SUPPORTED_CURRENCIES = ['CHF', 'EUR'];
const DEFAULT_CURRENCY = 'CHF';

const PAYMENT_INTENTS_COLLECTION = 'payment_intents';
const TRANSACTIONS_COLLECTION = 'transactions';
const REFUNDS_COLLECTION = 'refunds';

const PAYMENT_STATUS_MAP = {
  stripe: {
    'requires_payment_method': PaymentStatus.PENDING,
    'requires_confirmation': PaymentStatus.PENDING,
    'requires_action': PaymentStatus.PENDING,
    'processing': PaymentStatus.PROCESSING,
    'requires_capture': PaymentStatus.AUTHORIZED,
    'succeeded': PaymentStatus.SUCCEEDED,
    'canceled': PaymentStatus.CANCELLED,
    'failed': PaymentStatus.FAILED
  },
  twint: {
    'initiated': PaymentStatus.PENDING,
    'pending': PaymentStatus.PENDING,
    'confirmed': PaymentStatus.SUCCEEDED,
    'cancelled': PaymentStatus.CANCELLED,
    'failed': PaymentStatus.FAILED
  },
  postfinance: {
    '0': PaymentStatus.PENDING,
    '5': PaymentStatus.AUTHORIZED,
    '9': PaymentStatus.SUCCEEDED,
    '1': PaymentStatus.CANCELLED,
    '2': PaymentStatus.FAILED
  }
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

export default class PaymentProcessor {
  private stripe: Stripe;
  private db: admin.database.Database;
  private twintConfig: TwintConfig;
  private postFinanceConfig: PostFinanceConfig;
  private webhookHandlers: Map<string, Function>;

  constructor() {
    // Initialize Stripe
    const stripeSecretKey = functions.config().stripe?.secret_key;
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured');
    }
    
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: STRIPE_API_VERSION,
      typescript: true
    });

    // Initialize database
    this.db = admin.database();

    // Initialize Twint config
    this.twintConfig = {
      merchantId: functions.config().twint?.merchant_id || '',
      apiKey: functions.config().twint?.api_key || '',
      apiSecret: functions.config().twint?.api_secret || '',
      webhookSecret: functions.config().twint?.webhook_secret || '',
      baseUrl: functions.config().twint?.base_url || 'https://api.twint.ch'
    };

    // Initialize PostFinance config
    this.postFinanceConfig = {
      pspid: functions.config().postfinance?.pspid || '',
      userId: functions.config().postfinance?.user_id || '',
      password: functions.config().postfinance?.password || '',
      shaInPassphrase: functions.config().postfinance?.sha_in || '',
      shaOutPassphrase: functions.config().postfinance?.sha_out || '',
      baseUrl: functions.config().postfinance?.base_url || 'https://e-payment.postfinance.ch'
    };

    // Initialize webhook handlers
    this.webhookHandlers = new Map();
    this.setupWebhookHandlers();
  }

  /**
   * Process payment based on payment method
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Validate request
      this.validatePaymentRequest(request);

      // Log payment attempt
      await this.logPaymentAttempt(request);

      // Process based on payment method
      let response: PaymentResponse;
      
      switch (request.method) {
        case PaymentMethod.CREDIT_CARD:
        case PaymentMethod.DEBIT_CARD:
          response = await this.processStripePayment(request);
          break;
          
        case PaymentMethod.TWINT:
          response = await this.processTwintPayment(request);
          break;
          
        case PaymentMethod.POSTFINANCE:
          response = await this.processPostFinancePayment(request);
          break;
          
        case PaymentMethod.CASH:
          response = await this.processCashPayment(request);
          break;
          
        default:
          throw new Error(`Unsupported payment method: ${request.method}`);
      }

      // Store payment intent
      await this.storePaymentIntent(response, request);

      // Log successful payment
      await this.logPaymentSuccess(response);

      return response;
    } catch (error) {
      logger.error('Payment processing failed:', error);
      const errorResponse = this.createErrorResponse(request, error);
      await this.logPaymentFailure(errorResponse, error);
      return errorResponse;
    }
  }

  /**
   * Process refund
   */
  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    try {
      // Get original payment
      const payment = await this.getPayment(request.paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      // Validate refund amount
      const refundAmount = request.amount || payment.amount;
      if (refundAmount > payment.amount) {
        throw new Error('Refund amount exceeds original payment');
      }

      // Process based on payment method
      let response: RefundResponse;
      
      switch (payment.method) {
        case PaymentMethod.CREDIT_CARD:
        case PaymentMethod.DEBIT_CARD:
          response = await this.processStripeRefund(payment, request);
          break;
          
        case PaymentMethod.TWINT:
          response = await this.processTwintRefund(payment, request);
          break;
          
        case PaymentMethod.POSTFINANCE:
          response = await this.processPostFinanceRefund(payment, request);
          break;
          
        case PaymentMethod.CASH:
          response = await this.processCashRefund(payment, request);
          break;
          
        default:
          throw new Error(`Refunds not supported for payment method: ${payment.method}`);
      }

      // Store refund record
      await this.storeRefund(response, payment);

      // Update payment status
      await this.updatePaymentStatus(payment.id, PaymentStatus.REFUNDED);

      return response;
    } catch (error) {
      logger.error('Refund processing failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // STRIPE PAYMENTS
  // ============================================================================

  /**
   * Process Stripe payment
   */
  private async processStripePayment(request: PaymentRequest): Promise<PaymentResponse> {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(request.amount * 100), // Convert to cents
      currency: request.currency.toLowerCase(),
      payment_method: request.paymentMethodId,
      confirmation_method: 'manual',
      confirm: false,
      metadata: {
        orderId: request.orderId,
        tenantId: request.tenantId,
        customerId: request.customerId,
        ...request.metadata
      },
      description: request.description || `Order ${request.orderId}`
    });

    return {
      id: paymentIntent.id,
      status: this.mapStripeStatus(paymentIntent.status),
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      method: request.method,
      transactionId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret || undefined,
      created: new Date().toISOString()
    };
  }

  /**
   * Process Stripe refund
   */
  private async processStripeRefund(
    payment: PaymentData,
    request: RefundRequest
  ): Promise<RefundResponse> {
    const refund = await this.stripe.refunds.create({
      payment_intent: payment.transactionId,
      amount: request.amount ? Math.round(request.amount * 100) : undefined,
      reason: this.mapRefundReason(request.reason),
      metadata: request.metadata
    });

    return {
      id: refund.id,
      status: refund.status as any,
      amount: refund.amount / 100,
      currency: refund.currency.toUpperCase(),
      reason: request.reason,
      created: new Date().toISOString()
    };
  }

  /**
   * Map Stripe refund reason
   */
  private mapRefundReason(reason?: string): Stripe.RefundCreateParams.Reason | undefined {
    const reasonMap: Record<string, Stripe.RefundCreateParams.Reason> = {
      'duplicate': 'duplicate',
      'fraudulent': 'fraudulent',
      'requested': 'requested_by_customer'
    };
    
    return reason ? reasonMap[reason] || 'requested_by_customer' : undefined;
  }

  /**
   * Map Stripe payment status
   */
  private mapStripeStatus(status: string): PaymentStatus {
    return PAYMENT_STATUS_MAP.stripe[status] || PaymentStatus.PENDING;
  }

  // ============================================================================
  // TWINT PAYMENTS
  // ============================================================================

  /**
   * Process Twint payment
   */
  private async processTwintPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const twintRequest = {
      merchantId: this.twintConfig.merchantId,
      amount: request.amount,
      currency: request.currency,
      orderId: request.orderId,
      description: request.description || `Order ${request.orderId}`,
      callbackUrl: `https://api.eatech.ch/webhooks/twint`,
      returnUrl: request.returnUrl || `https://app.eatech.ch/orders/${request.orderId}`
    };

    const signature = this.generateTwintSignature(twintRequest);
    
    const response = await axios.post(
      `${this.twintConfig.baseUrl}/v1/payments`,
      twintRequest,
      {
        headers: {
          'X-API-Key': this.twintConfig.apiKey,
          'X-Signature': signature,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      id: response.data.id,
      status: this.mapTwintStatus(response.data.status),
      amount: request.amount,
      currency: request.currency,
      method: PaymentMethod.TWINT,
      transactionId: response.data.transactionId,
      redirectUrl: response.data.paymentUrl,
      created: new Date().toISOString()
    };
  }

  /**
   * Process Twint refund
   */
  private async processTwintRefund(
    payment: PaymentData,
    request: RefundRequest
  ): Promise<RefundResponse> {
    const twintRequest = {
      originalTransactionId: payment.transactionId,
      amount: request.amount || payment.amount,
      reason: request.reason
    };

    const signature = this.generateTwintSignature(twintRequest);
    
    const response = await axios.post(
      `${this.twintConfig.baseUrl}/v1/refunds`,
      twintRequest,
      {
        headers: {
          'X-API-Key': this.twintConfig.apiKey,
          'X-Signature': signature,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      id: response.data.id,
      status: response.data.status,
      amount: response.data.amount,
      currency: payment.currency,
      reason: request.reason,
      created: new Date().toISOString()
    };
  }

  /**
   * Generate Twint signature
   */
  private generateTwintSignature(data: any): string {
    const payload = JSON.stringify(data);
    const hmac = crypto.createHmac('sha256', this.twintConfig.apiSecret);
    hmac.update(payload);
    return hmac.digest('hex');
  }

  /**
   * Map Twint payment status
   */
  private mapTwintStatus(status: string): PaymentStatus {
    return PAYMENT_STATUS_MAP.twint[status] || PaymentStatus.PENDING;
  }

  // ============================================================================
  // POSTFINANCE PAYMENTS
  // ============================================================================

  /**
   * Process PostFinance payment
   */
  private async processPostFinancePayment(request: PaymentRequest): Promise<PaymentResponse> {
    const postFinanceRequest = {
      PSPID: this.postFinanceConfig.pspid,
      ORDERID: request.orderId,
      AMOUNT: Math.round(request.amount * 100),
      CURRENCY: request.currency,
      LANGUAGE: 'de_CH',
      CN: request.customerId,
      EMAIL: request.metadata?.email || '',
      ACCEPTURL: `https://app.eatech.ch/payment/success`,
      DECLINEURL: `https://app.eatech.ch/payment/failure`,
      EXCEPTIONURL: `https://app.eatech.ch/payment/exception`,
      CANCELURL: `https://app.eatech.ch/payment/cancel`,
      BACKURL: request.returnUrl || `https://app.eatech.ch/orders/${request.orderId}`
    };

    // Generate SHA signature
    const shasign = this.generatePostFinanceSignature(postFinanceRequest, 'in');
    postFinanceRequest['SHASIGN'] = shasign;

    // Create form data
    const formData = new URLSearchParams();
    Object.entries(postFinanceRequest).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    return {
      id: uuidv4(),
      status: PaymentStatus.PENDING,
      amount: request.amount,
      currency: request.currency,
      method: PaymentMethod.POSTFINANCE,
      redirectUrl: `${this.postFinanceConfig.baseUrl}/ncol/prod/orderstandard.asp`,
      metadata: {
        formData: postFinanceRequest
      },
      created: new Date().toISOString()
    };
  }

  /**
   * Process PostFinance refund
   */
  private async processPostFinanceRefund(
    payment: PaymentData,
    request: RefundRequest
  ): Promise<RefundResponse> {
    const refundRequest = {
      PSPID: this.postFinanceConfig.pspid,
      USERID: this.postFinanceConfig.userId,
      PSWD: this.postFinanceConfig.password,
      PAYID: payment.transactionId,
      AMOUNT: request.amount ? Math.round(request.amount * 100) : undefined,
      OPERATION: 'RFD' // Refund operation
    };

    const response = await axios.post(
      `${this.postFinanceConfig.baseUrl}/ncol/prod/maintenancedirect.asp`,
      new URLSearchParams(refundRequest as any),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    // Parse XML response
    const status = this.parsePostFinanceResponse(response.data);

    return {
      id: uuidv4(),
      status: status === '9' ? 'succeeded' : 'failed',
      amount: request.amount || payment.amount,
      currency: payment.currency,
      reason: request.reason,
      created: new Date().toISOString()
    };
  }

  /**
   * Generate PostFinance signature
   */
  private generatePostFinanceSignature(
    data: Record<string, any>,
    direction: 'in' | 'out'
  ): string {
    const passphrase = direction === 'in' 
      ? this.postFinanceConfig.shaInPassphrase 
      : this.postFinanceConfig.shaOutPassphrase;

    // Sort parameters alphabetically
    const sortedParams = Object.keys(data)
      .filter(key => data[key] !== '' && data[key] !== null)
      .sort()
      .map(key => `${key.toUpperCase()}=${data[key]}${passphrase}`)
      .join('');

    // Generate SHA-512 hash
    return crypto.createHash('sha512').update(sortedParams).digest('hex').toUpperCase();
  }

  /**
   * Parse PostFinance XML response
   */
  private parsePostFinanceResponse(xml: string): string {
    // Simple XML parsing - in production use proper XML parser
    const statusMatch = xml.match(/<STATUS>(\d+)<\/STATUS>/);
    return statusMatch ? statusMatch[1] : '0';
  }

  /**
   * Map PostFinance payment status
   */
  private mapPostFinanceStatus(status: string): PaymentStatus {
    return PAYMENT_STATUS_MAP.postfinance[status] || PaymentStatus.PENDING;
  }

  // ============================================================================
  // CASH PAYMENTS
  // ============================================================================

  /**
   * Process cash payment
   */
  private async processCashPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // Cash payments are marked as pending until confirmed by staff
    return {
      id: uuidv4(),
      status: PaymentStatus.PENDING,
      amount: request.amount,
      currency: request.currency,
      method: PaymentMethod.CASH,
      metadata: {
        requiresConfirmation: true
      },
      created: new Date().toISOString()
    };
  }

  /**
   * Process cash refund
   */
  private async processCashRefund(
    payment: PaymentData,
    request: RefundRequest
  ): Promise<RefundResponse> {
    // Cash refunds require manual processing
    return {
      id: uuidv4(),
      status: 'pending',
      amount: request.amount || payment.amount,
      currency: payment.currency,
      reason: request.reason,
      created: new Date().toISOString()
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Validate payment request
   */
  private validatePaymentRequest(request: PaymentRequest): void {
    if (!request.amount || request.amount <= 0) {
      throw new Error('Invalid payment amount');
    }

    if (!SUPPORTED_CURRENCIES.includes(request.currency)) {
      throw new Error(`Unsupported currency: ${request.currency}`);
    }

    if (!request.orderId || !request.tenantId || !request.customerId) {
      throw new Error('Missing required fields');
    }

    if (!Object.values(PaymentMethod).includes(request.method)) {
      throw new Error(`Invalid payment method: ${request.method}`);
    }
  }

  /**
   * Get payment by ID
   */
  private async getPayment(paymentId: string): Promise<PaymentData | null> {
    const snapshot = await this.db
      .ref(`${PAYMENT_INTENTS_COLLECTION}/${paymentId}`)
      .once('value');
    
    return snapshot.val();
  }

  /**
   * Store payment intent
   */
  private async storePaymentIntent(
    response: PaymentResponse,
    request: PaymentRequest
  ): Promise<void> {
    await this.db.ref(`${PAYMENT_INTENTS_COLLECTION}/${response.id}`).set({
      ...response,
      orderId: request.orderId,
      tenantId: request.tenantId,
      customerId: request.customerId,
      createdAt: admin.database.ServerValue.TIMESTAMP
    });
  }

  /**
   * Store refund record
   */
  private async storeRefund(
    response: RefundResponse,
    payment: PaymentData
  ): Promise<void> {
    await this.db.ref(`${REFUNDS_COLLECTION}/${response.id}`).set({
      ...response,
      paymentId: payment.id,
      orderId: payment.orderId,
      tenantId: payment.tenantId,
      createdAt: admin.database.ServerValue.TIMESTAMP
    });
  }

  /**
   * Update payment status
   */
  private async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus
  ): Promise<void> {
    await this.db.ref(`${PAYMENT_INTENTS_COLLECTION}/${paymentId}`).update({
      status,
      updatedAt: admin.database.ServerValue.TIMESTAMP
    });
  }

  /**
   * Log payment attempt
   */
  private async logPaymentAttempt(request: PaymentRequest): Promise<void> {
    await this.db.ref(`${TRANSACTIONS_COLLECTION}/attempts`).push({
      ...request,
      timestamp: admin.database.ServerValue.TIMESTAMP
    });
  }

  /**
   * Log payment success
   */
  private async logPaymentSuccess(response: PaymentResponse): Promise<void> {
    await this.db.ref(`${TRANSACTIONS_COLLECTION}/success`).push({
      ...response,
      timestamp: admin.database.ServerValue.TIMESTAMP
    });
  }

  /**
   * Log payment failure
   */
  private async logPaymentFailure(response: PaymentResponse, error: any): Promise<void> {
    await this.db.ref(`${TRANSACTIONS_COLLECTION}/failures`).push({
      ...response,
      error: error.message,
      timestamp: admin.database.ServerValue.TIMESTAMP
    });
  }

  /**
   * Create error response
   */
  private createErrorResponse(request: PaymentRequest, error: any): PaymentResponse {
    return {
      id: uuidv4(),
      status: PaymentStatus.FAILED,
      amount: request.amount,
      currency: request.currency,
      method: request.method,
      error: error.message,
      created: new Date().toISOString()
    };
  }

  // ============================================================================
  // WEBHOOK HANDLERS
  // ============================================================================

  /**
   * Setup webhook handlers
   */
  private setupWebhookHandlers(): void {
    this.webhookHandlers.set('stripe', this.handleStripeWebhook.bind(this));
    this.webhookHandlers.set('twint', this.handleTwintWebhook.bind(this));
    this.webhookHandlers.set('postfinance', this.handlePostFinanceWebhook.bind(this));
  }

  /**
   * Handle Stripe webhook
   */
  async handleStripeWebhook(body: string, signature: string): Promise<void> {
    try {
      const webhookSecret = functions.config().stripe?.webhook_secret;
      const event = this.stripe.webhooks.constructEvent(body, signature, webhookSecret);

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object.id, PaymentMethod.CREDIT_CARD);
          break;
          
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object.id, PaymentMethod.CREDIT_CARD);
          break;
          
        case 'charge.refunded':
          await this.handleRefundComplete(event.data.object.payment_intent as string);
          break;
      }
    } catch (error) {
      logger.error('Stripe webhook error:', error);
      throw error;
    }
  }

  /**
   * Handle Twint webhook
   */
  async handleTwintWebhook(body: any, signature: string): Promise<void> {
    try {
      // Verify signature
      const expectedSignature = this.generateTwintSignature(body);
      if (signature !== expectedSignature) {
        throw new Error('Invalid webhook signature');
      }

      const { transactionId, status } = body;
      const paymentStatus = this.mapTwintStatus(status);

      if (paymentStatus === PaymentStatus.SUCCEEDED) {
        await this.handlePaymentSuccess(transactionId, PaymentMethod.TWINT);
      } else if (paymentStatus === PaymentStatus.FAILED) {
        await this.handlePaymentFailure(transactionId, PaymentMethod.TWINT);
      }
    } catch (error) {
      logger.error('Twint webhook error:', error);
      throw error;
    }
  }

  /**
   * Handle PostFinance webhook
   */
  async handlePostFinanceWebhook(params: any): Promise<void> {
    try {
      // Verify SHA signature
      const signature = params.SHASIGN;
      delete params.SHASIGN;
      
      const expectedSignature = this.generatePostFinanceSignature(params, 'out');
      if (signature !== expectedSignature) {
        throw new Error('Invalid webhook signature');
      }

      const { PAYID, STATUS, ORDERID } = params;
      const paymentStatus = this.mapPostFinanceStatus(STATUS);

      if (paymentStatus === PaymentStatus.SUCCEEDED) {
        await this.handlePaymentSuccess(ORDERID, PaymentMethod.POSTFINANCE);
      } else if (paymentStatus === PaymentStatus.FAILED) {
        await this.handlePaymentFailure(ORDERID, PaymentMethod.POSTFINANCE);
      }
    } catch (error) {
      logger.error('PostFinance webhook error:', error);
      throw error;
    }
  }

  /**
   * Handle payment success webhook
   */
  private async handlePaymentSuccess(
    paymentId: string,
    method: PaymentMethod
  ): Promise<void> {
    await this.updatePaymentStatus(paymentId, PaymentStatus.SUCCEEDED);
    logger.info(`Payment ${paymentId} succeeded via ${method}`);
  }

  /**
   * Handle payment failure webhook
   */
  private async handlePaymentFailure(
    paymentId: string,
    method: PaymentMethod
  ): Promise<void> {
    await this.updatePaymentStatus(paymentId, PaymentStatus.FAILED);
    logger.error(`Payment ${paymentId} failed via ${method}`);
  }

  /**
   * Handle refund complete webhook
   */
  private async handleRefundComplete(paymentId: string): Promise<void> {
    await this.updatePaymentStatus(paymentId, PaymentStatus.REFUNDED);
    logger.info(`Payment ${paymentId} refunded`);
  }

  /**
   * Process webhook
   */
  async processWebhook(
    provider: string,
    body: any,
    headers: Record<string, string>
  ): Promise<void> {
    const handler = this.webhookHandlers.get(provider);
    if (!handler) {
      throw new Error(`Unknown webhook provider: ${provider}`);
    }

    await handler(body, headers);
  }
}