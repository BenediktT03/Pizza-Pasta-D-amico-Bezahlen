/**
 * EATECH - Payment Service
 * Version: 3.0.0
 * Description: Zahlungsabwicklung ohne Bargeld mit Lazy Loading
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /packages/core/src/services/PaymentService.js
 * 
 * Changes: Cash handling removed, lazy loading for Stripe
 */

import { getDatabase, ref, push, update, serverTimestamp, get } from 'firebase/database';

// Lazy load Stripe
let stripePromise = null;
const loadStripe = async () => {
  if (!stripePromise) {
    const { loadStripe: stripeLoader } = await import('@stripe/stripe-js');
    stripePromise = stripeLoader(process.env.REACT_APP_STRIPE_PUBLIC_KEY);
  }
  return stripePromise;
};

class PaymentService {
  constructor() {
    this.db = getDatabase();
    this.commissionRate = 0.03; // 3% EATECH commission
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    // Preload critical dependencies
    await Promise.all([
      loadStripe(),
      this.initializeWebhooks()
    ]);
    
    this.initialized = true;
  }

  async initializeWebhooks() {
    // Setup webhook listeners for payment providers
    if (window.Sentry) {
      window.Sentry.setContext('payment_service', {
        version: '3.0.0',
        providers: ['stripe', 'twint', 'invoice']
      });
    }
  }

  async processCardPayment({ orderId, amount, customerId, saveCard = false }) {
    try {
      await this.initialize();
      const stripe = await loadStripe();
      
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amount: Math.round(amount * 100), // Convert to cents
          customerId,
          saveCard,
          metadata: {
            commission: Math.round(amount * this.commissionRate * 100)
          }
        })
      });

      const { clientSecret, error } = await response.json();
      
      if (error) {
        throw new Error(error);
      }

      const result = await stripe.confirmCardPayment(clientSecret);
      
      if (result.error) {
        await this.logPaymentAttempt(orderId, 'card', 'failed', result.error.message);
        return { success: false, error: result.error.message };
      }

      await this.recordPayment({
        orderId,
        method: 'card',
        amount,
        stripePaymentId: result.paymentIntent.id,
        status: 'completed'
      });

      return { success: true, paymentId: result.paymentIntent.id };
    } catch (error) {
      console.error('Card payment error:', error);
      
      if (window.Sentry) {
        window.Sentry.captureException(error, {
          tags: { payment_method: 'card' },
          extra: { orderId, amount }
        });
      }
      
      return { success: false, error: error.message };
    }
  }

  async processTwintPayment({ orderId, amount, phone }) {
    try {
      const response = await fetch('/api/payments/twint/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amount: Math.round(amount * 100),
          phone: this.formatSwissPhone(phone),
          metadata: {
            commission: Math.round(amount * this.commissionRate * 100)
          }
        })
      });

      const { qrCode, token, error } = await response.json();
      
      if (error) {
        throw new Error(error);
      }

      await this.recordPayment({
        orderId,
        method: 'twint',
        amount,
        twintToken: token,
        status: 'pending'
      });

      // Start polling for payment status
      this.pollTwintStatus(token, orderId);

      return { 
        success: true, 
        qrCode,
        token,
        checkStatusUrl: `/api/payments/twint/status/${token}`
      };
    } catch (error) {
      console.error('TWINT payment error:', error);
      
      if (window.Sentry) {
        window.Sentry.captureException(error, {
          tags: { payment_method: 'twint' },
          extra: { orderId, amount }
        });
      }
      
      return { success: false, error: error.message };
    }
  }

  async pollTwintStatus(token, orderId) {
    const maxAttempts = 60; // 5 minutes
    let attempts = 0;

    const checkStatus = async () => {
      if (attempts >= maxAttempts) {
        await this.updatePaymentStatus(orderId, 'twint', 'timeout');
        return;
      }

      try {
        const response = await fetch(`/api/payments/twint/status/${token}`);
        const { status } = await response.json();

        if (status === 'completed') {
          await this.updatePaymentStatus(orderId, 'twint', 'completed');
        } else if (status === 'failed') {
          await this.updatePaymentStatus(orderId, 'twint', 'failed');
        } else {
          attempts++;
          setTimeout(checkStatus, 5000); // Check every 5 seconds
        }
      } catch (error) {
        console.error('TWINT status check error:', error);
        attempts++;
        setTimeout(checkStatus, 5000);
      }
    };

    checkStatus();
  }

  async processInvoicePayment({ orderId, amount, customerId, billingAddress }) {
    try {
      const invoiceData = {
        orderId,
        amount,
        customerId,
        billingAddress,
        dueDate: this.calculateDueDate(30), // 30 days payment term
        invoiceNumber: await this.generateInvoiceNumber(),
        metadata: {
          commission: amount * this.commissionRate
        }
      };

      const response = await fetch('/api/payments/invoice/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
      });

      const { invoiceId, pdfUrl, error } = await response.json();
      
      if (error) {
        throw new Error(error);
      }

      await this.recordPayment({
        orderId,
        method: 'invoice',
        amount,
        invoiceId,
        status: 'pending'
      });

      return { 
        success: true, 
        invoiceId,
        pdfUrl 
      };
    } catch (error) {
      console.error('Invoice payment error:', error);
      
      if (window.Sentry) {
        window.Sentry.captureException(error, {
          tags: { payment_method: 'invoice' },
          extra: { orderId, amount }
        });
      }
      
      return { success: false, error: error.message };
    }
  }

  async recordPayment(paymentData) {
    const payment = {
      ...paymentData,
      commission: paymentData.amount * this.commissionRate,
      netAmount: paymentData.amount * (1 - this.commissionRate),
      timestamp: serverTimestamp(),
      currency: 'CHF'
    };

    const paymentRef = await push(ref(this.db, 'payments'), payment);
    
    await update(ref(this.db, `orders/${paymentData.orderId}`), {
      paymentId: paymentRef.key,
      paymentStatus: paymentData.status,
      paymentMethod: paymentData.method,
      commissionAmount: payment.commission,
      commissionStatus: 'pending'
    });

    // Track commission
    await push(ref(this.db, `commissions/${paymentData.tenantId || 'default'}`), {
      orderId: paymentData.orderId,
      paymentId: paymentRef.key,
      amount: payment.commission,
      status: 'pending',
      createdAt: serverTimestamp()
    });

    return paymentRef.key;
  }

  async updatePaymentStatus(orderId, method, status) {
    await update(ref(this.db, `orders/${orderId}`), {
      paymentStatus: status,
      paymentUpdatedAt: serverTimestamp()
    });

    if (window.Sentry) {
      window.Sentry.addBreadcrumb({
        category: 'payment',
        message: `Payment status updated: ${status}`,
        level: 'info',
        data: { orderId, method }
      });
    }
  }

  async refundPayment(paymentId, amount = null) {
    try {
      const paymentSnapshot = await get(ref(this.db, `payments/${paymentId}`));
      const payment = paymentSnapshot.val();
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      const refundAmount = amount || payment.amount;

      let refundResult;
      switch (payment.method) {
        case 'card':
          refundResult = await this.refundStripePayment(payment.stripePaymentId, refundAmount);
          break;
        case 'twint':
          refundResult = await this.refundTwintPayment(payment.twintToken, refundAmount);
          break;
        case 'invoice':
          refundResult = await this.createCreditNote(payment.invoiceId, refundAmount);
          break;
        default:
          throw new Error('Unknown payment method');
      }

      if (refundResult.success) {
        await update(ref(this.db, `payments/${paymentId}`), {
          refunded: true,
          refundAmount,
          refundedAt: serverTimestamp()
        });

        // Update commission
        const commissionRefund = refundAmount * this.commissionRate;
        await push(ref(this.db, `commissions/${payment.tenantId || 'default'}`), {
          type: 'refund',
          originalPaymentId: paymentId,
          amount: -commissionRefund,
          status: 'completed',
          createdAt: serverTimestamp()
        });
      }

      return refundResult;
    } catch (error) {
      console.error('Refund error:', error);
      
      if (window.Sentry) {
        window.Sentry.captureException(error, {
          tags: { operation: 'refund' },
          extra: { paymentId, amount }
        });
      }
      
      return { success: false, error: error.message };
    }
  }

  formatSwissPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('41')) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith('0')) {
      return `+41${cleaned.substring(1)}`;
    }
    return `+41${cleaned}`;
  }

  calculateDueDate(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  }

  async generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Get counter from database
    const counterRef = ref(this.db, 'invoiceCounter');
    const counterSnapshot = await get(counterRef);
    let counter = (counterSnapshot.val() || 0) + 1;
    
    await update(counterRef, counter);
    
    return `INV-${year}${month}-${String(counter).padStart(4, '0')}`;
  }

  async logPaymentAttempt(orderId, method, status, error = null) {
    await push(ref(this.db, 'paymentLogs'), {
      orderId,
      method,
      status,
      error,
      timestamp: serverTimestamp()
    });
  }

  // API calls to backend services
  async refundStripePayment(paymentIntentId, amount) {
    const response = await fetch('/api/payments/stripe/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentIntentId,
        amount: Math.round(amount * 100)
      })
    });
    return response.json();
  }

  async refundTwintPayment(token, amount) {
    const response = await fetch('/api/payments/twint/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        amount: Math.round(amount * 100)
      })
    });
    return response.json();
  }

  async createCreditNote(invoiceId, amount) {
    const response = await fetch('/api/payments/invoice/credit-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceId,
        amount
      })
    });
    return response.json();
  }

  // Utility methods
  async getPaymentMethods(tenantId) {
    const settingsRef = ref(this.db, `tenants/${tenantId}/settings/payment`);
    const snapshot = await get(settingsRef);
    const settings = snapshot.val() || {};
    
    const methods = [];
    if (settings.enabled?.stripe) methods.push('card');
    if (settings.enabled?.twint) methods.push('twint');
    if (settings.enabled?.invoice) methods.push('invoice');
    
    return methods;
  }

  async validatePaymentMethod(tenantId, method) {
    const availableMethods = await this.getPaymentMethods(tenantId);
    return availableMethods.includes(method);
  }

  async calculateFees(amount, method) {
    const fees = {
      card: {
        percentage: 0.029, // 2.9%
        fixed: 0.30 // 30 Rappen
      },
      twint: {
        percentage: 0.013, // 1.3%
        fixed: 0
      },
      invoice: {
        percentage: 0,
        fixed: 0
      }
    };

    const methodFees = fees[method] || { percentage: 0, fixed: 0 };
    const providerFee = (amount * methodFees.percentage) + methodFees.fixed;
    const commission = amount * this.commissionRate;
    
    return {
      providerFee,
      commission,
      total: providerFee + commission,
      netAmount: amount - providerFee - commission
    };
  }
}

// Singleton instance
const paymentService = new PaymentService();

// Auto-initialize on first import
if (typeof window !== 'undefined') {
  paymentService.initialize().catch(console.error);
}

export default paymentService;