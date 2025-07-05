/**
 * EATECH Payment Service
 * Handles payment processing with Stripe and other providers
 * File Path: /apps/web/src/services/PaymentService.js
 */

import { loadStripe } from '@stripe/stripe-js';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Initialize Stripe
const stripePromise = loadStripe(process.env.VITE_STRIPE_PUBLISHABLE_KEY);

class PaymentService {
  constructor() {
    this.functions = getFunctions();
    this.stripe = null;
  }

  /**
   * Initialize Stripe instance
   */
  async initStripe() {
    if (!this.stripe) {
      this.stripe = await stripePromise;
    }
    return this.stripe;
  }

  /**
   * Process card payment with Stripe
   */
  async processCardPayment({ amount, currency = 'CHF', description, customer }) {
    try {
      // Create payment intent on backend
      const createPaymentIntent = httpsCallable(this.functions, 'createPaymentIntent');
      const { data } = await createPaymentIntent({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        description,
        customer
      });

      if (!data.clientSecret) {
        throw new Error('Failed to create payment intent');
      }

      // Initialize Stripe
      const stripe = await this.initStripe();

      // Create payment element
      const elements = stripe.elements({
        clientSecret: data.clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#ff6b6b',
            colorBackground: '#ffffff',
            colorText: '#1f2937',
            colorDanger: '#ef4444',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            borderRadius: '8px'
          }
        }
      });

      // Mount payment element (this would be done in a modal/component)
      // For now, we'll simulate the payment flow
      const paymentElement = elements.create('payment');
      
      // In a real implementation, this would be handled by a payment modal
      // For demo purposes, we'll simulate a successful payment
      const mockPaymentResult = await this.mockPaymentFlow(data.clientSecret);

      if (mockPaymentResult.error) {
        throw new Error(mockPaymentResult.error.message);
      }

      return {
        success: true,
        transactionId: data.paymentIntentId,
        status: 'succeeded',
        amount,
        currency
      };

    } catch (error) {
      console.error('Card payment error:', error);
      return {
        success: false,
        error: error.message || 'Zahlung fehlgeschlagen'
      };
    }
  }

  /**
   * Process TWINT payment
   */
  async processTwintPayment({ amount, phone }) {
    try {
      // In production, this would integrate with TWINT API
      // For demo, we'll simulate the payment flow
      
      const processTwint = httpsCallable(this.functions, 'processTwintPayment');
      const { data } = await processTwint({
        amount: Math.round(amount * 100),
        phone,
        currency: 'CHF'
      });

      // Simulate TWINT QR code generation and payment
      await this.simulateTwintFlow();

      return {
        success: true,
        transactionId: data.transactionId || `twint_${Date.now()}`,
        status: 'succeeded',
        amount
      };

    } catch (error) {
      console.error('TWINT payment error:', error);
      return {
        success: false,
        error: error.message || 'TWINT-Zahlung fehlgeschlagen'
      };
    }
  }

  /**
   * Create a subscription for recurring payments
   */
  async createSubscription({ customerId, priceId, paymentMethodId }) {
    try {
      const createSubscription = httpsCallable(this.functions, 'createSubscription');
      const { data } = await createSubscription({
        customerId,
        priceId,
        paymentMethodId
      });

      return {
        success: true,
        subscriptionId: data.subscriptionId,
        status: data.status
      };

    } catch (error) {
      console.error('Subscription creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process refund
   */
  async processRefund({ paymentIntentId, amount, reason }) {
    try {
      const processRefund = httpsCallable(this.functions, 'processRefund');
      const { data } = await processRefund({
        paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
        reason
      });

      return {
        success: true,
        refundId: data.refundId,
        status: data.status,
        amount: data.amount / 100
      };

    } catch (error) {
      console.error('Refund error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get payment methods for customer
   */
  async getPaymentMethods(customerId) {
    try {
      const getPaymentMethods = httpsCallable(this.functions, 'getPaymentMethods');
      const { data } = await getPaymentMethods({ customerId });

      return {
        success: true,
        paymentMethods: data.paymentMethods
      };

    } catch (error) {
      console.error('Get payment methods error:', error);
      return {
        success: false,
        error: error.message,
        paymentMethods: []
      };
    }
  }

  /**
   * Save card for future use
   */
  async saveCard({ customerId, paymentMethodId }) {
    try {
      const attachPaymentMethod = httpsCallable(this.functions, 'attachPaymentMethod');
      const { data } = await attachPaymentMethod({
        customerId,
        paymentMethodId
      });

      return {
        success: true,
        paymentMethod: data.paymentMethod
      };

    } catch (error) {
      console.error('Save card error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate fees and commissions
   */
  calculateFees(amount, paymentMethod = 'card') {
    const fees = {
      card: {
        percentage: 2.9, // 2.9%
        fixed: 0.30, // 30 cents
      },
      twint: {
        percentage: 1.3, // 1.3%
        fixed: 0,
      },
      cash: {
        percentage: 0,
        fixed: 0,
      }
    };

    const fee = fees[paymentMethod] || fees.card;
    const processingFee = (amount * fee.percentage / 100) + fee.fixed;
    const platformCommission = amount * 0.03; // 3% platform commission
    const netAmount = amount - processingFee - platformCommission;

    return {
      amount,
      processingFee: Math.round(processingFee * 100) / 100,
      platformCommission: Math.round(platformCommission * 100) / 100,
      netAmount: Math.round(netAmount * 100) / 100,
      total: amount
    };
  }

  /**
   * Mock payment flow for demo
   */
  async mockPaymentFlow(clientSecret) {
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate successful payment
    return {
      paymentIntent: {
        id: `pi_${Date.now()}`,
        status: 'succeeded',
        client_secret: clientSecret
      }
    };
  }

  /**
   * Simulate TWINT flow
   */
  async simulateTwintFlow() {
    // Simulate QR code generation and payment confirmation
    await new Promise(resolve => setTimeout(resolve, 3000));
    return true;
  }

  /**
   * Validate card number (Luhn algorithm)
   */
  validateCardNumber(cardNumber) {
    const digits = cardNumber.replace(/\D/g, '');
    
    if (digits.length < 13 || digits.length > 19) {
      return false;
    }

    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits.charAt(i), 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Get card type from number
   */
  getCardType(cardNumber) {
    const patterns = {
      visa: /^4/,
      mastercard: /^5[1-5]/,
      amex: /^3[47]/,
      discover: /^6(?:011|5)/,
      diners: /^3(?:0[0-5]|[68])/,
      jcb: /^35/
    };

    const digits = cardNumber.replace(/\D/g, '');

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(digits)) {
        return type;
      }
    }

    return 'unknown';
  }
}

export default new PaymentService();