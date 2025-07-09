import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import axios from 'axios';
import { PaymentIntent, PaymentMethod, Customer, Price, Product } from './payment.types';

export interface StripeConfig {
  publishableKey: string;
  apiEndpoint: string;
  webhookEndpoint?: string;
}

export interface CreatePaymentIntentParams {
  amount: number;
  currency: string;
  customerId?: string;
  metadata?: Record<string, string>;
  description?: string;
  receiptEmail?: string;
  setupFutureUsage?: 'on_session' | 'off_session';
}

export interface CreateCustomerParams {
  email: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postal_code: string;
    country: string;
  };
}

export interface CreateSubscriptionParams {
  customerId: string;
  priceId: string;
  quantity?: number;
  trialPeriodDays?: number;
  metadata?: Record<string, string>;
  paymentBehavior?: 'default_incomplete' | 'error_if_incomplete' | 'allow_incomplete';
}

export class StripeService {
  private stripe: Stripe | null = null;
  private config: StripeConfig;
  private elements: StripeElements | null = null;

  constructor(config: StripeConfig) {
    this.config = config;
    this.initializeStripe();
  }

  /**
   * Initialize Stripe
   */
  private async initializeStripe(): Promise<void> {
    try {
      this.stripe = await loadStripe(this.config.publishableKey);
      if (!this.stripe) {
        throw new Error('Failed to initialize Stripe');
      }
    } catch (error) {
      console.error('Error initializing Stripe:', error);
      throw error;
    }
  }

  /**
   * Get Stripe instance
   */
  getStripe(): Stripe | null {
    return this.stripe;
  }

  /**
   * Create Stripe Elements
   */
  createElements(options?: any): StripeElements | null {
    if (!this.stripe) {
      console.error('Stripe not initialized');
      return null;
    }
    this.elements = this.stripe.elements(options);
    return this.elements;
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntent> {
    try {
      const response = await axios.post(
        `${this.config.apiEndpoint}/create-payment-intent`,
        params
      );
      return response.data;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  /**
   * Confirm payment
   */
  async confirmPayment(
    clientSecret: string,
    paymentElement: any,
    returnUrl: string
  ): Promise<any> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    try {
      const result = await this.stripe.confirmPayment({
        elements: this.elements!,
        clientSecret,
        confirmParams: {
          return_url: returnUrl,
        },
      });

      if (result.error) {
        throw result.error;
      }

      return result;
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw error;
    }
  }

  /**
   * Confirm card payment
   */
  async confirmCardPayment(
    clientSecret: string,
    paymentMethod?: any
  ): Promise<any> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    try {
      const result = await this.stripe.confirmCardPayment(clientSecret, {
        payment_method: paymentMethod,
      });

      if (result.error) {
        throw result.error;
      }

      return result.paymentIntent;
    } catch (error) {
      console.error('Error confirming card payment:', error);
      throw error;
    }
  }

  /**
   * Create a customer
   */
  async createCustomer(params: CreateCustomerParams): Promise<Customer> {
    try {
      const response = await axios.post(
        `${this.config.apiEndpoint}/create-customer`,
        params
      );
      return response.data;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  /**
   * Get customer
   */
  async getCustomer(customerId: string): Promise<Customer> {
    try {
      const response = await axios.get(
        `${this.config.apiEndpoint}/customers/${customerId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error getting customer:', error);
      throw error;
    }
  }

  /**
   * Update customer
   */
  async updateCustomer(
    customerId: string,
    updates: Partial<CreateCustomerParams>
  ): Promise<Customer> {
    try {
      const response = await axios.put(
        `${this.config.apiEndpoint}/customers/${customerId}`,
        updates
      );
      return response.data;
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  }

  /**
   * List payment methods
   */
  async listPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    try {
      const response = await axios.get(
        `${this.config.apiEndpoint}/payment-methods`,
        {
          params: { customerId },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error listing payment methods:', error);
      throw error;
    }
  }

  /**
   * Attach payment method to customer
   */
  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string
  ): Promise<PaymentMethod> {
    try {
      const response = await axios.post(
        `${this.config.apiEndpoint}/payment-methods/${paymentMethodId}/attach`,
        { customerId }
      );
      return response.data;
    } catch (error) {
      console.error('Error attaching payment method:', error);
      throw error;
    }
  }

  /**
   * Detach payment method
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
    try {
      const response = await axios.post(
        `${this.config.apiEndpoint}/payment-methods/${paymentMethodId}/detach`
      );
      return response.data;
    } catch (error) {
      console.error('Error detaching payment method:', error);
      throw error;
    }
  }

  /**
   * Create subscription
   */
  async createSubscription(params: CreateSubscriptionParams): Promise<any> {
    try {
      const response = await axios.post(
        `${this.config.apiEndpoint}/subscriptions`,
        params
      );
      return response.data;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    immediately: boolean = false
  ): Promise<any> {
    try {
      const response = await axios.delete(
        `${this.config.apiEndpoint}/subscriptions/${subscriptionId}`,
        {
          params: { immediately },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  /**
   * Update subscription
   */
  async updateSubscription(
    subscriptionId: string,
    updates: any
  ): Promise<any> {
    try {
      const response = await axios.put(
        `${this.config.apiEndpoint}/subscriptions/${subscriptionId}`,
        updates
      );
      return response.data;
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }

  /**
   * List products
   */
  async listProducts(params?: { active?: boolean; limit?: number }): Promise<Product[]> {
    try {
      const response = await axios.get(`${this.config.apiEndpoint}/products`, {
        params,
      });
      return response.data;
    } catch (error) {
      console.error('Error listing products:', error);
      throw error;
    }
  }

  /**
   * List prices
   */
  async listPrices(productId?: string): Promise<Price[]> {
    try {
      const response = await axios.get(`${this.config.apiEndpoint}/prices`, {
        params: { productId },
      });
      return response.data;
    } catch (error) {
      console.error('Error listing prices:', error);
      throw error;
    }
  }

  /**
   * Create checkout session
   */
  async createCheckoutSession(params: any): Promise<any> {
    try {
      const response = await axios.post(
        `${this.config.apiEndpoint}/create-checkout-session`,
        params
      );
      return response.data;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Redirect to checkout
   */
  async redirectToCheckout(sessionId: string): Promise<void> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized');
    }

    try {
      const result = await this.stripe.redirectToCheckout({ sessionId });
      if (result.error) {
        throw result.error;
      }
    } catch (error) {
      console.error('Error redirecting to checkout:', error);
      throw error;
    }
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(
    rawBody: string,
    signature: string,
    endpointSecret: string
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.config.webhookEndpoint || `${this.config.apiEndpoint}/webhook`}`,
        {
          rawBody,
          signature,
          endpointSecret,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }

  /**
   * Calculate application fee
   */
  calculateApplicationFee(amount: number, percentage: number = 2.5): number {
    return Math.round(amount * (percentage / 100));
  }

  /**
   * Format amount for display
   */
  formatAmount(amount: number, currency: string = 'chf'): string {
    const formatter = new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: currency.toUpperCase(),
    });
    return formatter.format(amount / 100);
  }

  /**
   * Convert amount to smallest currency unit
   */
  convertToSmallestUnit(amount: number, currency: string = 'chf'): number {
    // Most currencies use cents (1/100)
    // Some currencies like JPY don't have decimal places
    const zeroDecimalCurrencies = ['jpy', 'krw'];
    if (zeroDecimalCurrencies.includes(currency.toLowerCase())) {
      return Math.round(amount);
    }
    return Math.round(amount * 100);
  }
}

// Export factory function
export function createStripeService(config: StripeConfig): StripeService {
  return new StripeService(config);
}
