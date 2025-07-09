import { vi } from 'vitest';
import type { Stripe, StripeElements, StripeElement } from '@stripe/stripe-js';

// Mock Stripe Element
export const mockStripeElement: Partial<StripeElement> = {
  mount: vi.fn(),
  destroy: vi.fn(),
  on: vi.fn((event, handler) => {
    if (event === 'ready') {
      setTimeout(() => handler(), 0);
    }
    return mockStripeElement as StripeElement;
  }),
  off: vi.fn(),
  once: vi.fn(),
  focus: vi.fn(),
  blur: vi.fn(),
  clear: vi.fn(),
  unmount: vi.fn(),
  update: vi.fn(),
};

// Mock Stripe Elements
export const mockStripeElements: Partial<StripeElements> = {
  create: vi.fn(() => mockStripeElement as StripeElement),
  getElement: vi.fn(() => mockStripeElement as StripeElement),
  update: vi.fn(),
  fetchUpdates: vi.fn().mockResolvedValue({
    error: null,
  }),
};

// Mock Payment Method
export const mockPaymentMethod = {
  id: 'pm_mock_123',
  object: 'payment_method',
  billing_details: {
    address: {
      city: 'Zürich',
      country: 'CH',
      line1: 'Bahnhofstrasse 1',
      line2: null,
      postal_code: '8001',
      state: 'ZH',
    },
    email: 'test@eatech.ch',
    name: 'Test User',
    phone: '+41 79 123 45 67',
  },
  card: {
    brand: 'visa',
    checks: {
      address_line1_check: 'pass',
      address_postal_code_check: 'pass',
      cvc_check: 'pass',
    },
    country: 'CH',
    exp_month: 12,
    exp_year: 2025,
    fingerprint: 'mock_fingerprint',
    funding: 'credit',
    last4: '4242',
    networks: {
      available: ['visa'],
      preferred: null,
    },
    three_d_secure_usage: {
      supported: true,
    },
    wallet: null,
  },
  created: Date.now() / 1000,
  customer: 'cus_mock_123',
  livemode: false,
  metadata: {},
  type: 'card',
};

// Mock Payment Intent
export const mockPaymentIntent = {
  id: 'pi_mock_123',
  object: 'payment_intent',
  amount: 2500, // 25.00 CHF
  amount_capturable: 0,
  amount_details: {
    tip: {},
  },
  amount_received: 0,
  application: null,
  application_fee_amount: null,
  automatic_payment_methods: null,
  canceled_at: null,
  cancellation_reason: null,
  capture_method: 'automatic',
  charges: {
    object: 'list',
    data: [],
    has_more: false,
    total_count: 0,
    url: '/v1/charges?payment_intent=pi_mock_123',
  },
  client_secret: 'pi_mock_123_secret_mock',
  confirmation_method: 'automatic',
  created: Date.now() / 1000,
  currency: 'chf',
  customer: 'cus_mock_123',
  description: 'EATECH Order #12345',
  invoice: null,
  last_payment_error: null,
  livemode: false,
  metadata: {
    orderId: '12345',
    tenantId: 'tenant-123',
  },
  next_action: null,
  on_behalf_of: null,
  payment_method: mockPaymentMethod.id,
  payment_method_options: {},
  payment_method_types: ['card'],
  processing: null,
  receipt_email: 'test@eatech.ch',
  review: null,
  setup_future_usage: null,
  shipping: null,
  source: null,
  statement_descriptor: 'EATECH',
  statement_descriptor_suffix: null,
  status: 'succeeded',
  transfer_data: null,
  transfer_group: null,
};

// Mock Stripe instance
export const mockStripe: Partial<Stripe> = {
  elements: vi.fn(() => mockStripeElements as StripeElements),
  createPaymentMethod: vi.fn().mockResolvedValue({
    paymentMethod: mockPaymentMethod,
    error: null,
  }),
  confirmCardPayment: vi.fn().mockResolvedValue({
    paymentIntent: mockPaymentIntent,
    error: null,
  }),
  confirmPayment: vi.fn().mockResolvedValue({
    paymentIntent: mockPaymentIntent,
    error: null,
  }),
  retrievePaymentIntent: vi.fn().mockResolvedValue({
    paymentIntent: mockPaymentIntent,
    error: null,
  }),
  createToken: vi.fn().mockResolvedValue({
    token: {
      id: 'tok_mock_123',
      object: 'token',
      card: mockPaymentMethod.card,
      client_ip: '127.0.0.1',
      created: Date.now() / 1000,
      livemode: false,
      type: 'card',
      used: false,
    },
    error: null,
  }),
  paymentRequest: vi.fn(() => ({
    canMakePayment: vi.fn().mockResolvedValue({ applePay: true }),
    on: vi.fn(),
    show: vi.fn(),
    update: vi.fn(),
  })),
};

// TWINT Mock
export const mockTwintPayment = {
  id: 'twint_mock_123',
  status: 'pending',
  amount: 2500, // 25.00 CHF
  currency: 'CHF',
  qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  reference: 'EATECH-12345',
  expiresAt: new Date(Date.now() + 300000).toISOString(), // 5 minutes
  webhookUrl: 'https://api.eatech.ch/webhooks/twint',
  metadata: {
    orderId: '12345',
    tenantId: 'tenant-123',
  },
};

export const mockTwintAPI = {
  createPayment: vi.fn().mockResolvedValue(mockTwintPayment),
  getPayment: vi.fn().mockResolvedValue({
    ...mockTwintPayment,
    status: 'completed',
  }),
  cancelPayment: vi.fn().mockResolvedValue({
    ...mockTwintPayment,
    status: 'cancelled',
  }),
  refundPayment: vi.fn().mockResolvedValue({
    id: 'twint_refund_123',
    paymentId: mockTwintPayment.id,
    amount: 2500,
    status: 'completed',
    createdAt: new Date().toISOString(),
  }),
};

// PostFinance Mock
export const mockPostFinancePayment = {
  id: 'pf_mock_123',
  status: 'pending',
  amount: 2500, // 25.00 CHF
  currency: 'CHF',
  redirectUrl: 'https://checkout.postfinance.ch/mock/123',
  returnUrl: 'https://eatech.ch/order/complete',
  cancelUrl: 'https://eatech.ch/order/cancel',
  reference: 'EATECH-12345',
  metadata: {
    orderId: '12345',
    tenantId: 'tenant-123',
  },
};

export const mockPostFinanceAPI = {
  createPayment: vi.fn().mockResolvedValue(mockPostFinancePayment),
  getPayment: vi.fn().mockResolvedValue({
    ...mockPostFinancePayment,
    status: 'completed',
  }),
  refundPayment: vi.fn().mockResolvedValue({
    id: 'pf_refund_123',
    paymentId: mockPostFinancePayment.id,
    amount: 2500,
    status: 'completed',
    createdAt: new Date().toISOString(),
  }),
};

// Helper to simulate payment errors
export const simulatePaymentError = (type: 'card_declined' | 'insufficient_funds' | 'processing_error' = 'card_declined') => {
  const errors = {
    card_declined: {
      type: 'card_error',
      code: 'card_declined',
      message: 'Your card was declined.',
      decline_code: 'generic_decline',
    },
    insufficient_funds: {
      type: 'card_error',
      code: 'insufficient_funds',
      message: 'Your card has insufficient funds.',
      decline_code: 'insufficient_funds',
    },
    processing_error: {
      type: 'api_error',
      code: 'processing_error',
      message: 'An error occurred while processing your card. Try again later.',
    },
  };

  vi.mocked(mockStripe.confirmCardPayment!).mockResolvedValueOnce({
    paymentIntent: null as any,
    error: errors[type],
  });
};

// Helper to simulate 3D Secure authentication
export const simulate3DSecure = (succeed = true) => {
  const paymentIntentWith3DS = {
    ...mockPaymentIntent,
    status: 'requires_action',
    next_action: {
      type: 'use_stripe_sdk',
      use_stripe_sdk: {
        type: 'three_d_secure_redirect',
        stripe_js: 'https://hooks.stripe.com/redirect/authenticate/src_mock_123',
      },
    },
  };

  vi.mocked(mockStripe.confirmCardPayment!).mockResolvedValueOnce({
    paymentIntent: succeed ? mockPaymentIntent : paymentIntentWith3DS,
    error: succeed ? null : {
      type: 'authentication_error',
      code: 'authentication_required',
      message: '3D Secure authentication required',
    },
  });
};

// Helper to reset all payment mocks
export const resetPaymentMocks = () => {
  vi.clearAllMocks();
};

// Helper to mock different card brands
export const setCardBrand = (brand: 'visa' | 'mastercard' | 'amex' | 'discover') => {
  const brandDetails = {
    visa: { last4: '4242', brand: 'visa' },
    mastercard: { last4: '5555', brand: 'mastercard' },
    amex: { last4: '8431', brand: 'amex' },
    discover: { last4: '6011', brand: 'discover' },
  };

  mockPaymentMethod.card = {
    ...mockPaymentMethod.card,
    ...brandDetails[brand],
  };
};

// Export all payment mocks
export default {
  stripe: mockStripe,
  twint: mockTwintAPI,
  postFinance: mockPostFinanceAPI,
  // Mock data
  paymentMethod: mockPaymentMethod,
  paymentIntent: mockPaymentIntent,
  twintPayment: mockTwintPayment,
  postFinancePayment: mockPostFinancePayment,
  // Helpers
  simulatePaymentError,
  simulate3DSecure,
  resetPaymentMocks,
  setCardBrand,
};
