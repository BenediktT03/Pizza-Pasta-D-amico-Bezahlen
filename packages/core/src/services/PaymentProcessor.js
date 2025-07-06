/**
 * EATECH - Payment Processor
 * Version: 8.1.0
 * Description: Universeller Payment Processor mit Lazy Loading für verschiedene Zahlungsanbieter
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /packages/core/src/services/PaymentProcessor.js
 * 
 * Features: Multi-provider support, 3D Secure, fraud detection, recurring payments
 */

import { EventEmitter } from 'events';

// Lazy loaded payment providers
const stripeProvider = () => import('./providers/StripeProvider');
const twintProvider = () => import('./providers/TWINTProvider');
const postFinanceProvider = () => import('./providers/PostFinanceProvider');
const sumUpProvider = () => import('./providers/SumUpProvider');
const paypalProvider = () => import('./providers/PayPalProvider');
const applePay = () => import('./providers/ApplePayProvider');
const googlePay = () => import('./providers/GooglePayProvider');

// Lazy loaded utilities
const fraudDetection = () => import('../utils/fraudDetection');
const encryptionUtils = () => import('../utils/encryptionUtils');
const validationUtils = () => import('../utils/validationUtils');
const auditLogger = () => import('../utils/auditLogger');
const currencyConverter = () => import('../utils/currencyConverter');

// Lazy loaded services
const notificationService = () => import('./NotificationService');
const analyticsService = () => import('./AnalyticsService');
const webhookService = () => import('./WebhookService');

/**
 * Payment status constants
 */
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
  DISPUTED: 'disputed',
  REQUIRES_ACTION: 'requires_action'
};

/**
 * Payment method types
 */
export const PAYMENT_METHODS = {
  CARD: 'card',
  TWINT: 'twint',
  POSTFINANCE: 'postfinance',
  PAYPAL: 'paypal',
  APPLE_PAY: 'apple_pay',
  GOOGLE_PAY: 'google_pay',
  SUMUP: 'sumup',
  BANK_TRANSFER: 'bank_transfer',
  CASH: 'cash'
};

/**
 * Currency codes
 */
export const CURRENCIES = {
  CHF: 'CHF',
  EUR: 'EUR',
  USD: 'USD'
};

/**
 * Error codes
 */
export const ERROR_CODES = {
  INVALID_PAYMENT_METHOD: 'INVALID_PAYMENT_METHOD',
  PAYMENT_DECLINED: 'PAYMENT_DECLINED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  CARD_EXPIRED: 'CARD_EXPIRED',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  FRAUD_DETECTED: 'FRAUD_DETECTED',
  AMOUNT_TOO_LARGE: 'AMOUNT_TOO_LARGE',
  AMOUNT_TOO_SMALL: 'AMOUNT_TOO_SMALL',
  CURRENCY_NOT_SUPPORTED: 'CURRENCY_NOT_SUPPORTED',
  CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',
  PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND'
};

/**
 * Main Payment Processor Class
 */
class PaymentProcessor extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      environment: 'production',
      defaultCurrency: CURRENCIES.CHF,
      enableFraudDetection: true,
      enableAuditLogging: true,
      timeout: 30000,
      retryAttempts: 3,
      ...config
    };
    
    this.providers = new Map();
    this.cache = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the payment processor
   */
  async initialize() {
    try {
      console.log('Initializing Payment Processor...');
      
      // Initialize audit logging
      if (this.config.enableAuditLogging) {
        const { default: auditLoggerModule } = await auditLogger();
        this.auditLogger = auditLoggerModule;
        await this.auditLogger.initialize();
      }
      
      // Initialize fraud detection
      if (this.config.enableFraudDetection) {
        const { default: fraudDetectionModule } = await fraudDetection();
        this.fraudDetector = fraudDetectionModule;
        await this.fraudDetector.initialize();
      }
      
      // Initialize encryption utilities
      const { default: encryptionUtilsModule } = await encryptionUtils();
      this.encryption = encryptionUtilsModule;
      
      // Load validation utilities
      const { default: validationUtilsModule } = await validationUtils();
      this.validator = validationUtilsModule;
      
      this.initialized = true;
      console.log('Payment Processor initialized successfully');
      
    } catch (error) {
      console.error('Payment Processor initialization failed:', error);
      throw error;
    }
  }

  /**
   * Register a payment provider
   */
  async registerProvider(method, config) {
    try {
      let provider;
      
      switch (method) {
        case PAYMENT_METHODS.CARD:
          const { default: StripeProvider } = await stripeProvider();
          provider = new StripeProvider(config);
          break;
          
        case PAYMENT_METHODS.TWINT:
          const { default: TWINTProvider } = await twintProvider();
          provider = new TWINTProvider(config);
          break;
          
        case PAYMENT_METHODS.POSTFINANCE:
          const { default: PostFinanceProvider } = await postFinanceProvider();
          provider = new PostFinanceProvider(config);
          break;
          
        case PAYMENT_METHODS.SUMUP:
          const { default: SumUpProvider } = await sumUpProvider();
          provider = new SumUpProvider(config);
          break;
          
        case PAYMENT_METHODS.PAYPAL:
          const { default: PayPalProvider } = await paypalProvider();
          provider = new PayPalProvider(config);
          break;
          
        case PAYMENT_METHODS.APPLE_PAY:
          const { default: ApplePayProvider } = await applePay();
          provider = new ApplePayProvider(config);
          break;
          
        case PAYMENT_METHODS.GOOGLE_PAY:
          const { default: GooglePayProvider } = await googlePay();
          provider = new GooglePayProvider(config);
          break;
          
        default:
          throw new Error(`Unsupported payment method: ${method}`);
      }
      
      await provider.initialize();
      this.providers.set(method, provider);
      
      console.log(`Payment provider registered: ${method}`);
      
    } catch (error) {
      console.error(`Failed to register provider ${method}:`, error);
      throw error;
    }
  }

  /**
   * Process a payment
   */
  async processPayment(paymentData) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      // Validate payment data
      await this.validatePaymentData(paymentData);
      
      // Perform fraud detection
      if (this.config.enableFraudDetection) {
        const fraudResult = await this.fraudDetector.analyze(paymentData);
        if (fraudResult.isHighRisk) {
          throw new Error(ERROR_CODES.FRAUD_DETECTED);
        }
      }
      
      // Get the appropriate provider
      const provider = this.getProvider(paymentData.paymentMethod);
      
      // Log the payment attempt
      if (this.auditLogger) {
        await this.auditLogger.logPaymentAttempt(paymentData);
      }
      
      // Process the payment
      const result = await this.executePayment(provider, paymentData);
      
      // Handle post-payment processing
      await this.handlePaymentResult(result, paymentData);
      
      return result;
      
    } catch (error) {
      console.error('Payment processing failed:', error);
      
      // Log the error
      if (this.auditLogger) {
        await this.auditLogger.logPaymentError(paymentData, error);
      }
      
      // Emit error event
      this.emit('payment_failed', { paymentData, error });
      
      throw this.normalizeError(error);
    }
  }

  /**
   * Execute payment with retry logic
   */
  async executePayment(provider, paymentData, attempt = 1) {
    try {
      const result = await Promise.race([
        provider.processPayment(paymentData),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Payment timeout')), this.config.timeout)
        )
      ]);
      
      return result;
      
    } catch (error) {
      if (attempt < this.config.retryAttempts && this.shouldRetry(error)) {
        console.log(`Retrying payment (attempt ${attempt + 1}/${this.config.retryAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        return this.executePayment(provider, paymentData, attempt + 1);
      }
      
      throw error;
    }
  }

  /**
   * Process a refund
   */
  async processRefund(refundData) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      // Validate refund data
      await this.validateRefundData(refundData);
      
      // Get the original payment
      const originalPayment = await this.getPayment(refundData.paymentId);
      if (!originalPayment) {
        throw new Error(ERROR_CODES.PAYMENT_NOT_FOUND);
      }
      
      // Get the provider
      const provider = this.getProvider(originalPayment.paymentMethod);
      
      // Process the refund
      const result = await provider.processRefund(refundData);
      
      // Log the refund
      if (this.auditLogger) {
        await this.auditLogger.logRefund(refundData, result);
      }
      
      // Emit refund event
      this.emit('refund_processed', { refundData, result });
      
      return result;
      
    } catch (error) {
      console.error('Refund processing failed:', error);
      
      // Log the error
      if (this.auditLogger) {
        await this.auditLogger.logRefundError(refundData, error);
      }
      
      throw this.normalizeError(error);
    }
  }

  /**
   * Create a payment intent (for delayed processing)
   */
  async createPaymentIntent(intentData) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      // Validate intent data
      await this.validateIntentData(intentData);
      
      // Get the provider
      const provider = this.getProvider(intentData.paymentMethod);
      
      // Create payment intent
      const intent = await provider.createPaymentIntent(intentData);
      
      // Cache the intent
      this.cache.set(intent.id, intent);
      
      // Log the intent creation
      if (this.auditLogger) {
        await this.auditLogger.logPaymentIntent(intentData, intent);
      }
      
      return intent;
      
    } catch (error) {
      console.error('Payment intent creation failed:', error);
      throw this.normalizeError(error);
    }
  }

  /**
   * Confirm a payment intent
   */
  async confirmPaymentIntent(intentId, confirmationData = {}) {
    try {
      // Get intent from cache or provider
      let intent = this.cache.get(intentId);
      
      if (!intent) {
        // Try to retrieve from provider
        const provider = this.getProvider(confirmationData.paymentMethod);
        intent = await provider.getPaymentIntent(intentId);
      }
      
      if (!intent) {
        throw new Error('Payment intent not found');
      }
      
      // Get the provider
      const provider = this.getProvider(intent.paymentMethod);
      
      // Confirm the intent
      const result = await provider.confirmPaymentIntent(intentId, confirmationData);
      
      // Remove from cache
      this.cache.delete(intentId);
      
      // Handle post-payment processing
      await this.handlePaymentResult(result, intent);
      
      return result;
      
    } catch (error) {
      console.error('Payment intent confirmation failed:', error);
      throw this.normalizeError(error);
    }
  }

  /**
   * Create a recurring payment setup
   */
  async createRecurringPayment(recurringData) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    try {
      // Validate recurring data
      await this.validateRecurringData(recurringData);
      
      // Get the provider
      const provider = this.getProvider(recurringData.paymentMethod);
      
      // Check if provider supports recurring payments
      if (!provider.supportsRecurring) {
        throw new Error('Provider does not support recurring payments');
      }
      
      // Create recurring payment
      const result = await provider.createRecurringPayment(recurringData);
      
      // Log the recurring payment setup
      if (this.auditLogger) {
        await this.auditLogger.logRecurringPayment(recurringData, result);
      }
      
      return result;
      
    } catch (error) {
      console.error('Recurring payment creation failed:', error);
      throw this.normalizeError(error);
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId, paymentMethod) {
    try {
      const provider = this.getProvider(paymentMethod);
      return await provider.getPaymentStatus(paymentId);
    } catch (error) {
      console.error('Failed to get payment status:', error);
      throw this.normalizeError(error);
    }
  }

  /**
   * Get available payment methods for a customer
   */
  async getAvailablePaymentMethods(customerData, amount, currency = this.config.defaultCurrency) {
    try {
      const availableMethods = [];
      
      for (const [method, provider] of this.providers) {
        try {
          const isAvailable = await provider.isAvailable(customerData, amount, currency);
          if (isAvailable) {
            availableMethods.push({
              method,
              displayName: provider.getDisplayName(),
              supportedCurrencies: provider.getSupportedCurrencies(),
              fees: await provider.calculateFees(amount, currency),
              processingTime: provider.getProcessingTime(),
              supports3DS: provider.supports3DSecure()
            });
          }
        } catch (error) {
          console.warn(`Provider ${method} availability check failed:`, error);
        }
      }
      
      return availableMethods;
      
    } catch (error) {
      console.error('Failed to get available payment methods:', error);
      throw error;
    }
  }

  /**
   * Calculate fees for a payment
   */
  async calculateFees(amount, currency, paymentMethod) {
    try {
      const provider = this.getProvider(paymentMethod);
      return await provider.calculateFees(amount, currency);
    } catch (error) {
      console.error('Fee calculation failed:', error);
      throw this.normalizeError(error);
    }
  }

  /**
   * Handle webhook notifications
   */
  async handleWebhook(paymentMethod, payload, signature) {
    try {
      const provider = this.getProvider(paymentMethod);
      const event = await provider.verifyWebhook(payload, signature);
      
      // Process the webhook event
      await this.processWebhookEvent(event, paymentMethod);
      
      return { status: 'success' };
      
    } catch (error) {
      console.error('Webhook handling failed:', error);
      throw error;
    }
  }

  /**
   * Process webhook events
   */
  async processWebhookEvent(event, paymentMethod) {
    try {
      // Log the webhook event
      if (this.auditLogger) {
        await this.auditLogger.logWebhookEvent(event, paymentMethod);
      }
      
      // Handle different event types
      switch (event.type) {
        case 'payment.succeeded':
          await this.handlePaymentSucceeded(event.data);
          break;
          
        case 'payment.failed':
          await this.handlePaymentFailed(event.data);
          break;
          
        case 'refund.succeeded':
          await this.handleRefundSucceeded(event.data);
          break;
          
        case 'dispute.created':
          await this.handleDisputeCreated(event.data);
          break;
          
        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }
      
      // Emit webhook event
      this.emit('webhook_received', { event, paymentMethod });
      
    } catch (error) {
      console.error('Webhook event processing failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Get provider for payment method
   */
  getProvider(paymentMethod) {
    const provider = this.providers.get(paymentMethod);
    if (!provider) {
      throw new Error(`No provider registered for payment method: ${paymentMethod}`);
    }
    return provider;
  }

  /**
   * Validate payment data
   */
  async validatePaymentData(paymentData) {
    const requiredFields = ['amount', 'currency', 'paymentMethod'];
    
    for (const field of requiredFields) {
      if (!paymentData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Validate amount
    if (paymentData.amount <= 0) {
      throw new Error(ERROR_CODES.AMOUNT_TOO_SMALL);
    }
    
    if (paymentData.amount > 100000) { // 100k CHF limit
      throw new Error(ERROR_CODES.AMOUNT_TOO_LARGE);
    }
    
    // Validate currency
    if (!Object.values(CURRENCIES).includes(paymentData.currency)) {
      throw new Error(ERROR_CODES.CURRENCY_NOT_SUPPORTED);
    }
    
    // Validate payment method
    if (!Object.values(PAYMENT_METHODS).includes(paymentData.paymentMethod)) {
      throw new Error(ERROR_CODES.INVALID_PAYMENT_METHOD);
    }
    
    // Provider-specific validation
    const provider = this.getProvider(paymentData.paymentMethod);
    await provider.validatePaymentData(paymentData);
  }

  /**
   * Validate refund data
   */
  async validateRefundData(refundData) {
    const requiredFields = ['paymentId', 'amount'];
    
    for (const field of requiredFields) {
      if (!refundData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    if (refundData.amount <= 0) {
      throw new Error('Refund amount must be positive');
    }
  }

  /**
   * Validate intent data
   */
  async validateIntentData(intentData) {
    await this.validatePaymentData(intentData);
    
    // Additional intent-specific validation
    if (intentData.setupFutureUsage && !intentData.customerId) {
      throw new Error('Customer ID required for setup future usage');
    }
  }

  /**
   * Validate recurring data
   */
  async validateRecurringData(recurringData) {
    await this.validatePaymentData(recurringData);
    
    const requiredFields = ['customerId', 'interval'];
    
    for (const field of requiredFields) {
      if (!recurringData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  /**
   * Handle payment result
   */
  async handlePaymentResult(result, paymentData) {
    try {
      // Track analytics
      const { default: analyticsServiceModule } = await analyticsService();
      await analyticsServiceModule.track('payment_processed', {
        paymentMethod: paymentData.paymentMethod,
        amount: paymentData.amount,
        currency: paymentData.currency,
        status: result.status,
        processingTime: result.processingTime
      });
      
      // Send notifications if needed
      if (result.status === PAYMENT_STATUS.SUCCEEDED) {
        this.emit('payment_succeeded', { result, paymentData });
        
        if (paymentData.notifyCustomer) {
          const { default: notificationServiceModule } = await notificationService();
          await notificationServiceModule.sendPaymentConfirmation(
            paymentData.customer,
            result
          );
        }
      } else if (result.status === PAYMENT_STATUS.FAILED) {
        this.emit('payment_failed', { result, paymentData });
      }
      
    } catch (error) {
      console.error('Error handling payment result:', error);
    }
  }

  /**
   * Normalize errors across providers
   */
  normalizeError(error) {
    const normalizedError = new Error(error.message);
    normalizedError.code = error.code || 'UNKNOWN_ERROR';
    normalizedError.details = error.details || {};
    
    // Map provider-specific error codes to standard codes
    if (error.type === 'card_error') {
      normalizedError.code = ERROR_CODES.PAYMENT_DECLINED;
    }
    
    return normalizedError;
  }

  /**
   * Determine if payment should be retried
   */
  shouldRetry(error) {
    const retryableCodes = [
      'network_error',
      'timeout',
      'temporary_failure',
      'rate_limit_error'
    ];
    
    return retryableCodes.includes(error.code);
  }

  /**
   * Handle payment succeeded webhook
   */
  async handlePaymentSucceeded(paymentData) {
    // Update payment status in database
    // Send confirmation notifications
    // Update inventory if needed
    console.log('Payment succeeded:', paymentData.id);
  }

  /**
   * Handle payment failed webhook
   */
  async handlePaymentFailed(paymentData) {
    // Update payment status in database
    // Send failure notifications
    // Release reserved inventory
    console.log('Payment failed:', paymentData.id);
  }

  /**
   * Handle refund succeeded webhook
   */
  async handleRefundSucceeded(refundData) {
    // Update refund status in database
    // Send refund confirmation
    console.log('Refund succeeded:', refundData.id);
  }

  /**
   * Handle dispute created webhook
   */
  async handleDisputeCreated(disputeData) {
    // Create dispute record
    // Notify admin team
    // Prepare evidence if available
    console.log('Dispute created:', disputeData.id);
  }

  /**
   * Get payment by ID
   */
  async getPayment(paymentId) {
    // This would typically fetch from database
    // For now, return null to indicate not found
    return null;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create and configure payment processor instance
 */
export const createPaymentProcessor = async (config = {}) => {
  const processor = new PaymentProcessor(config);
  await processor.initialize();
  return processor;
};

// ============================================================================
// EXPORTS
// ============================================================================

export default PaymentProcessor;
export {
  PAYMENT_STATUS,
  PAYMENT_METHODS,
  CURRENCIES,
  ERROR_CODES
};