import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { logger } from 'firebase-functions';
import { 
  PaymentIntent, 
  PaymentMethod, 
  Currency, 
  PaymentStatus,
  PlatformFee 
} from '@eatech/types';

interface CreatePaymentParams {
  amount: number; // in Rappen
  truckId: string;
  orderId: string;
  customerId?: string;
  paymentMethodId?: string;
  tipAmount?: number;
  metadata?: Record<string, any>;
}

interface RefundParams {
  paymentIntentId: string;
  amount?: number; // partial refund if specified
  reason?: string;
}

export class PaymentService {
  private stripe: Stripe;
  private db = admin.firestore();
  
  // Platform fee configuration
  private readonly PLATFORM_FEE_PERCENTAGE = 3; // 3%
  private readonly TRIAL_DAYS = 90; // 3 months free trial
  private readonly SUPPORTED_PAYMENT_METHODS = ['card', 'twint'];

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16',
    });
  }

  /**
   * Create a Food Truck's Stripe Connect account
   */
  async createConnectAccount(truckData: any): Promise<string> {
    try {
      const account = await this.stripe.accounts.create({
        type: 'express',
        country: 'CH',
        email: truckData.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
          twint_payments: { requested: true } // TWINT support for Switzerland
        },
        business_type: truckData.businessType || 'individual',
        business_profile: {
          mcc: '5812', // Eating places and restaurants
          name: truckData.name,
          product_description: 'Food Truck Services',
          support_phone: truckData.phone,
          url: `https://eatech.ch/truck/${truckData.slug}`
        },
        settings: {
          payouts: {
            schedule: {
              interval: 'daily', // Daily payouts
              delay_days: 2 // Standard delay
            }
          }
        },
        metadata: {
          truckId: truckData.id,
          environment: process.env.NODE_ENV
        }
      });

      // Save account ID to truck document
      await this.db.collection('foodtrucks').doc(truckData.id).update({
        stripeAccountId: account.id,
        stripeAccountStatus: 'pending',
        trial_ends_at: new Date(Date.now() + this.TRIAL_DAYS * 24 * 60 * 60 * 1000)
      });

      return account.id;
    } catch (error) {
      logger.error('Failed to create Connect account', { truckData, error });
      throw error;
    }
  }

  /**
   * Generate onboarding link for Stripe Connect
   */
  async generateOnboardingLink(accountId: string, truckId: string): Promise<string> {
    try {
      const accountLink = await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${process.env.APP_URL}/admin/onboarding/refresh?truck=${truckId}`,
        return_url: `${process.env.APP_URL}/admin/onboarding/complete?truck=${truckId}`,
        type: 'account_onboarding',
        collect: 'eventually_due' // Collect all eventually required information
      });

      return accountLink.url;
    } catch (error) {
      logger.error('Failed to generate onboarding link', { accountId, error });
      throw error;
    }
  }

  /**
   * Create payment intent with automatic platform fee
   */
  async createPayment(params: CreatePaymentParams): Promise<Stripe.PaymentIntent> {
    try {
      const truck = await this.getTruck(params.truckId);
      
      if (!truck.stripeAccountId) {
        throw new Error('Truck has no connected Stripe account');
      }

      // Check if truck is in trial period
      const isInTrial = new Date(truck.trial_ends_at) > new Date();
      const platformFeePercentage = isInTrial ? 0 : this.PLATFORM_FEE_PERCENTAGE;
      
      // Calculate fees
      const totalAmount = params.amount + (params.tipAmount || 0);
      const platformFee = Math.round(totalAmount * platformFeePercentage / 100);
      const tipPlatformFee = params.tipAmount ? Math.round(params.tipAmount * 0.03) : 0; // 3% from tip

      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: totalAmount,
        currency: 'chf',
        payment_method_types: this.SUPPORTED_PAYMENT_METHODS,
        application_fee_amount: platformFee,
        transfer_data: {
          destination: truck.stripeAccountId,
        },
        metadata: {
          orderId: params.orderId,
          truckId: params.truckId,
          orderNumber: params.metadata?.orderNumber || '',
          tipAmount: params.tipAmount?.toString() || '0',
          tipPlatformFee: tipPlatformFee.toString(),
          platformFeePercentage: platformFeePercentage.toString(),
          environment: process.env.NODE_ENV
        },
        ...(params.paymentMethodId && { payment_method: params.paymentMethodId }),
        ...(params.customerId && { customer: params.customerId })
      });

      // Log payment creation
      await this.logPayment({
        paymentIntentId: paymentIntent.id,
        orderId: params.orderId,
        truckId: params.truckId,
        amount: totalAmount,
        platformFee,
        status: 'created'
      });

      return paymentIntent;
    } catch (error) {
      logger.error('Failed to create payment', { params, error });
      throw error;
    }
  }

  /**
   * Add tip to existing payment
   */
  async addTip(paymentIntentId: string, tipAmount: number): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'requires_payment_method' && 
          paymentIntent.status !== 'requires_confirmation') {
        throw new Error('Payment already processed, cannot add tip');
      }

      const tipPlatformFee = Math.round(tipAmount * 0.03); // 3% from tip
      const newAmount = paymentIntent.amount + tipAmount;
      const newApplicationFee = (paymentIntent.application_fee_amount || 0) + tipPlatformFee;

      // Update payment intent
      const updated = await this.stripe.paymentIntents.update(paymentIntentId, {
        amount: newAmount,
        application_fee_amount: newApplicationFee,
        metadata: {
          ...paymentIntent.metadata,
          tipAmount: tipAmount.toString(),
          tipPlatformFee: tipPlatformFee.toString()
        }
      });

      return updated;
    } catch (error) {
      logger.error('Failed to add tip', { paymentIntentId, tipAmount, error });
      throw error;
    }
  }

  /**
   * Process refund
   */
  async processRefund(params: RefundParams): Promise<Stripe.Refund> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: params.paymentIntentId,
        amount: params.amount, // undefined = full refund
        reason: this.mapRefundReason(params.reason),
        metadata: {
          customReason: params.reason || '',
          refundedAt: new Date().toISOString()
        }
      });

      // Update order status
      const paymentIntent = await this.stripe.paymentIntents.retrieve(params.paymentIntentId);
      if (paymentIntent.metadata.orderId) {
        await this.updateOrderStatus(paymentIntent.metadata.orderId, 'refunded');
      }

      // Log refund
      await this.logRefund({
        refundId: refund.id,
        paymentIntentId: params.paymentIntentId,
        amount: refund.amount,
        reason: params.reason
      });

      return refund;
    } catch (error) {
      logger.error('Failed to process refund', { params, error });
      throw error;
    }
  }

  /**
   * Handle successful payment webhook
   */
  async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      const { orderId, truckId } = paymentIntent.metadata;
      
      // Update order status
      await this.db.collection(`foodtrucks/${truckId}/orders`).doc(orderId).update({
        paymentStatus: 'paid',
        paymentIntentId: paymentIntent.id,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        platformFee: paymentIntent.application_fee_amount || 0
      });

      // Track platform revenue
      await this.trackPlatformRevenue({
        paymentIntentId: paymentIntent.id,
        truckId,
        amount: paymentIntent.amount,
        platformFee: paymentIntent.application_fee_amount || 0,
        currency: paymentIntent.currency
      });

      // Send confirmation notification
      await this.sendPaymentConfirmation(orderId, truckId);
    } catch (error) {
      logger.error('Failed to handle payment success', { paymentIntent, error });
      throw error;
    }
  }

  /**
   * Check if Stripe account is fully onboarded
   */
  async checkAccountStatus(accountId: string): Promise<boolean> {
    try {
      const account = await this.stripe.accounts.retrieve(accountId);
      
      const isReady = account.charges_enabled && account.payouts_enabled;
      
      // Update truck status if ready
      if (isReady && account.metadata?.truckId) {
        await this.db.collection('foodtrucks').doc(account.metadata.truckId).update({
          stripeAccountStatus: 'active',
          stripeAccountReady: true,
          stripeAccountUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      return isReady;
    } catch (error) {
      logger.error('Failed to check account status', { accountId, error });
      return false;
    }
  }

  /**
   * Create customer for saved payment methods
   */
  async createCustomer(email: string, metadata?: any): Promise<string> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        metadata: {
          ...metadata,
          createdVia: 'eatech_platform'
        }
      });

      return customer.id;
    } catch (error) {
      logger.error('Failed to create customer', { email, error });
      throw error;
    }
  }

  /**
   * Setup TWINT payment method
   */
  async setupTwintPayment(amount: number, orderId: string): Promise<any> {
    try {
      // TWINT is handled through Stripe's payment methods
      // This would integrate with Swiss QR-bill standards
      const paymentMethod = await this.stripe.paymentMethods.create({
        type: 'twint',
        billing_details: {
          email: 'customer@example.com' // Would come from actual customer
        }
      });

      return {
        paymentMethodId: paymentMethod.id,
        qrCode: await this.generateSwissQRCode(amount, orderId)
      };
    } catch (error) {
      logger.error('Failed to setup TWINT payment', { amount, orderId, error });
      throw error;
    }
  }

  /**
   * Generate Swiss QR-bill code
   */
  private async generateSwissQRCode(amount: number, reference: string): Promise<string> {
    // Implementation would use Swiss QR-bill standards
    // This is a placeholder - actual implementation would use proper QR-bill library
    const qrData = {
      type: 'SPC', // Swiss Payment Code
      version: '0200',
      coding: 1,
      account: process.env.EATECH_IBAN,
      amount: amount / 100, // Convert from Rappen to CHF
      currency: 'CHF',
      reference: reference,
      unstructuredMessage: `Eatech Order ${reference}`
    };

    // Would use actual QR generation library
    return `data:image/png;base64,${Buffer.from(JSON.stringify(qrData)).toString('base64')}`;
  }

  /**
   * Calculate VAT based on service type
   */
  calculateVAT(amount: number, serviceType: 'takeaway' | 'dine-in'): number {
    const vatRate = serviceType === 'takeaway' ? 2.5 : 7.7; // Swiss VAT rates
    return Math.round(amount * vatRate / 100);
  }

  /**
   * Helper methods
   */
  private async getTruck(truckId: string): Promise<any> {
    const doc = await this.db.collection('foodtrucks').doc(truckId).get();
    if (!doc.exists) {
      throw new Error('Truck not found');
    }
    return { id: doc.id, ...doc.data() };
  }

  private async updateOrderStatus(orderId: string, status: string): Promise<void> {
    // Find order across all trucks (could be optimized with a global orders collection)
    const trucksSnapshot = await this.db.collection('foodtrucks').get();
    
    for (const truckDoc of trucksSnapshot.docs) {
      const orderDoc = await this.db
        .collection(`foodtrucks/${truckDoc.id}/orders`)
        .doc(orderId)
        .get();
      
      if (orderDoc.exists) {
        await orderDoc.ref.update({
          status,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        break;
      }
    }
  }

  private mapRefundReason(reason?: string): Stripe.Refund.Reason | undefined {
    const reasonMap: Record<string, Stripe.Refund.Reason> = {
      'duplicate': 'duplicate',
      'fraudulent': 'fraudulent',
      'requested': 'requested_by_customer'
    };
    
    return reason ? reasonMap[reason] || 'requested_by_customer' : undefined;
  }

  private async logPayment(data: any): Promise<void> {
    await this.db.collection('payment_logs').add({
      ...data,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  private async logRefund(data: any): Promise<void> {
    await this.db.collection('refund_logs').add({
      ...data,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  private async trackPlatformRevenue(data: any): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const docRef = this.db.collection('platform_revenue').doc(date);
    
    await docRef.set({
      date,
      totalRevenue: admin.firestore.FieldValue.increment(data.platformFee),
      transactionCount: admin.firestore.FieldValue.increment(1),
      transactions: admin.firestore.FieldValue.arrayUnion({
        paymentIntentId: data.paymentIntentId,
        truckId: data.truckId,
        amount: data.amount,
        platformFee: data.platformFee,
        timestamp: new Date()
      })
    }, { merge: true });
  }

  private async sendPaymentConfirmation(orderId: string, truckId: string): Promise<void> {
    // This would integrate with NotificationService
    logger.info('Payment confirmation would be sent', { orderId, truckId });
  }

  /**
   * Get platform statistics
   */
  async getPlatformStats(startDate: Date, endDate: Date): Promise<any> {
    const snapshot = await this.db
      .collection('platform_revenue')
      .where('date', '>=', startDate.toISOString().split('T')[0])
      .where('date', '<=', endDate.toISOString().split('T')[0])
      .get();
    
    let totalRevenue = 0;
    let totalTransactions = 0;
    
    snapshot.forEach(doc => {
      const data = doc.data();
      totalRevenue += data.totalRevenue || 0;
      totalTransactions += data.transactionCount || 0;
    });

    return {
      totalRevenue,
      totalTransactions,
      averageRevenue: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
      period: {
        start: startDate,
        end: endDate
      }
    };
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
