import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js'
import { api } from './api'

// Types
export interface PaymentMethod {
  id: string
  type: 'card' | 'twint' | 'postfinance' | 'cash'
  label: string
  icon: string
  enabled: boolean
  minAmount?: number
  maxAmount?: number
  fee?: number
}

export interface PaymentIntent {
  id: string
  clientSecret: string
  amount: number
  currency: string
  status: 'requires_payment_method' | 'requires_confirmation' | 'succeeded' | 'canceled'
  paymentMethod?: string
  metadata: Record<string, string>
}

export interface PaymentResult {
  success: boolean
  paymentIntentId?: string
  error?: string
  requiresAction?: boolean
  actionUrl?: string
}

// Initialize Stripe
let stripePromise: Promise<Stripe | null> | null = null

const getStripe = () => {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLIC_KEY
    if (!key) {
      console.error('Stripe public key not found')
      return null
    }
    stripePromise = loadStripe(key)
  }
  return stripePromise
}

// Payment service class
class PaymentService {
  private stripe: Stripe | null = null
  private elements: StripeElements | null = null

  // Initialize payment service
  async initialize(): Promise<void> {
    this.stripe = await getStripe()
  }

  // Get available payment methods
  async getPaymentMethods(amount: number): Promise<PaymentMethod[]> {
    try {
      const response = await api.get<{ methods: PaymentMethod[] }>('/payment/methods', {
        params: { amount },
      })
      return response.methods.filter(method => method.enabled)
    } catch (error) {
      console.error('Error fetching payment methods:', error)
      return this.getDefaultPaymentMethods()
    }
  }

  // Create payment intent
  async createPaymentIntent(
    amount: number,
    orderId: string,
    paymentMethod: string
  ): Promise<PaymentIntent> {
    try {
      const response = await api.post<PaymentIntent>('/payment/create-intent', {
        amount,
        orderId,
        paymentMethod,
        currency: 'CHF',
      })
      return response
    } catch (error) {
      console.error('Error creating payment intent:', error)
      throw new Error('Failed to initialize payment')
    }
  }

  // Process card payment with Stripe
  async processCardPayment(
    clientSecret: string,
    cardElement: any,
    billingDetails?: {
      name?: string
      email?: string
      phone?: string
      address?: {
        line1?: string
        city?: string
        postal_code?: string
        country?: string
      }
    }
  ): Promise<PaymentResult> {
    if (!this.stripe) {
      return {
        success: false,
        error: 'Payment service not initialized',
      }
    }

    try {
      const result = await this.stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: billingDetails,
        },
      })

      if (result.error) {
        return {
          success: false,
          error: result.error.message,
        }
      }

      if (result.paymentIntent.status === 'succeeded') {
        return {
          success: true,
          paymentIntentId: result.paymentIntent.id,
        }
      }

      // Handle 3D Secure or other actions
      return {
        success: false,
        requiresAction: true,
        paymentIntentId: result.paymentIntent.id,
      }
    } catch (error) {
      console.error('Error processing card payment:', error)
      return {
        success: false,
        error: 'Payment processing failed',
      }
    }
  }

  // Process TWINT payment
  async processTwintPayment(
    amount: number,
    orderId: string,
    phoneNumber?: string
  ): Promise<PaymentResult> {
    try {
      const response = await api.post<{
        success: boolean
        paymentId: string
        qrCode?: string
        deepLink?: string
      }>('/payment/twint/initiate', {
        amount,
        orderId,
        phoneNumber,
      })

      if (response.success) {
        return {
          success: false, // Payment not yet completed
          requiresAction: true,
          actionUrl: response.deepLink || response.qrCode,
          paymentIntentId: response.paymentId,
        }
      }

      return {
        success: false,
        error: 'Failed to initiate TWINT payment',
      }
    } catch (error) {
      console.error('Error processing TWINT payment:', error)
      return {
        success: false,
        error: 'TWINT payment failed',
      }
    }
  }

  // Process PostFinance payment
  async processPostFinancePayment(
    amount: number,
    orderId: string
  ): Promise<PaymentResult> {
    try {
      const response = await api.post<{
        success: boolean
        paymentId: string
        redirectUrl: string
      }>('/payment/postfinance/initiate', {
        amount,
        orderId,
      })

      if (response.success) {
        // Redirect to PostFinance
        window.location.href = response.redirectUrl
        return {
          success: false,
          requiresAction: true,
          actionUrl: response.redirectUrl,
          paymentIntentId: response.paymentId,
        }
      }

      return {
        success: false,
        error: 'Failed to initiate PostFinance payment',
      }
    } catch (error) {
      console.error('Error processing PostFinance payment:', error)
      return {
        success: false,
        error: 'PostFinance payment failed',
      }
    }
  }

  // Process cash payment
  async processCashPayment(amount: number, orderId: string): Promise<PaymentResult> {
    try {
      const response = await api.post<{
        success: boolean
        paymentId: string
      }>('/payment/cash/confirm', {
        amount,
        orderId,
      })

      return {
        success: response.success,
        paymentIntentId: response.paymentId,
      }
    } catch (error) {
      console.error('Error processing cash payment:', error)
      return {
        success: false,
        error: 'Cash payment failed',
      }
    }
  }

  // Check payment status
  async checkPaymentStatus(paymentId: string): Promise<{
    status: 'pending' | 'succeeded' | 'failed'
    message?: string
  }> {
    try {
      const response = await api.get<{
        status: 'pending' | 'succeeded' | 'failed'
        message?: string
      }>(`/payment/status/${paymentId}`)
      return response
    } catch (error) {
      console.error('Error checking payment status:', error)
      return {
        status: 'failed',
        message: 'Failed to check payment status',
      }
    }
  }

  // Create Stripe elements
  createElements(options?: any): StripeElements | null {
    if (!this.stripe) {
      console.error('Stripe not initialized')
      return null
    }

    this.elements = this.stripe.elements(options)
    return this.elements
  }

  // Create card element
  createCardElement(options?: any): any {
    if (!this.elements) {
      console.error('Stripe elements not initialized')
      return null
    }

    return this.elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: '#424770',
          '::placeholder': {
            color: '#aab7c4',
          },
        },
        invalid: {
          color: '#9e2146',
        },
      },
      ...options,
    })
  }

  // Validate Swiss QR-Bill
  async validateQRBill(qrData: string): Promise<{
    valid: boolean
    amount?: number
    reference?: string
  }> {
    try {
      const response = await api.post<{
        valid: boolean
        amount?: number
        reference?: string
      }>('/payment/qr-bill/validate', {
        qrData,
      })
      return response
    } catch (error) {
      console.error('Error validating QR-Bill:', error)
      return { valid: false }
    }
  }

  // Get default payment methods
  private getDefaultPaymentMethods(): PaymentMethod[] {
    return [
      {
        id: 'card',
        type: 'card',
        label: 'Credit/Debit Card',
        icon: '💳',
        enabled: true,
      },
      {
        id: 'twint',
        type: 'twint',
        label: 'TWINT',
        icon: '📱',
        enabled: true,
      },
      {
        id: 'postfinance',
        type: 'postfinance',
        label: 'PostFinance',
        icon: '🏦',
        enabled: true,
      },
      {
        id: 'cash',
        type: 'cash',
        label: 'Cash',
        icon: '💵',
        enabled: true,
      },
    ]
  }

  // Poll payment status (for TWINT/PostFinance)
  async pollPaymentStatus(
    paymentId: string,
    maxAttempts = 60,
    interval = 2000
  ): Promise<'succeeded' | 'failed' | 'timeout'> {
    let attempts = 0

    return new Promise((resolve) => {
      const checkStatus = async () => {
        attempts++

        const { status } = await this.checkPaymentStatus(paymentId)

        if (status === 'succeeded') {
          resolve('succeeded')
          return
        }

        if (status === 'failed') {
          resolve('failed')
          return
        }

        if (attempts >= maxAttempts) {
          resolve('timeout')
          return
        }

        setTimeout(checkStatus, interval)
      }

      checkStatus()
    })
  }
}

// Export singleton instance
export const paymentService = new PaymentService()

export default paymentService
