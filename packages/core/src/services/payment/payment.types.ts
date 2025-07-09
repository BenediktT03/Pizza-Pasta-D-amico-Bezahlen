// Common payment types used across different payment providers

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'canceled'
  | 'succeeded'
  | 'failed';

export type PaymentMethodType = 
  | 'card'
  | 'sepa_debit'
  | 'twint'
  | 'postfinance'
  | 'swiss_qr_bill'
  | 'paypal'
  | 'klarna'
  | 'cash'
  | 'invoice';

export type Currency = 'CHF' | 'EUR' | 'USD';

export interface Money {
  amount: number;
  currency: Currency;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
}

export interface Customer {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  address?: Address;
  metadata?: Record<string, any>;
  created: Date;
  updated: Date;
}

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  customerId?: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    funding: 'credit' | 'debit' | 'prepaid' | 'unknown';
  };
  sepaDebit?: {
    last4: string;
    bankCode: string;
    country: string;
  };
  billing?: Address;
  created: Date;
  metadata?: Record<string, any>;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  clientSecret?: string;
  paymentMethodId?: string;
  customerId?: string;
  description?: string;
  metadata?: Record<string, any>;
  receiptEmail?: string;
  created: Date;
  captureMethod: 'automatic' | 'manual';
}

export interface Charge {
  id: string;
  amount: number;
  currency: Currency;
  status: 'pending' | 'succeeded' | 'failed';
  paymentIntentId: string;
  paymentMethodId: string;
  customerId?: string;
  description?: string;
  receiptUrl?: string;
  refunded: boolean;
  refunds?: Refund[];
  metadata?: Record<string, any>;
  created: Date;
}

export interface Refund {
  id: string;
  amount: number;
  currency: Currency;
  chargeId: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  metadata?: Record<string, any>;
  created: Date;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  images?: string[];
  metadata?: Record<string, any>;
  created: Date;
  updated: Date;
}

export interface Price {
  id: string;
  productId: string;
  active: boolean;
  currency: Currency;
  unitAmount?: number;
  recurring?: {
    interval: 'day' | 'week' | 'month' | 'year';
    intervalCount: number;
  };
  metadata?: Record<string, any>;
  created: Date;
}

export interface Subscription {
  id: string;
  customerId: string;
  status: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'trialing';
  items: SubscriptionItem[];
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  canceledAt?: Date;
  cancelAtPeriodEnd: boolean;
  trialStart?: Date;
  trialEnd?: Date;
  metadata?: Record<string, any>;
  created: Date;
}

export interface SubscriptionItem {
  id: string;
  priceId: string;
  quantity: number;
}

export interface Invoice {
  id: string;
  customerId: string;
  subscriptionId?: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  amountDue: number;
  amountPaid: number;
  currency: Currency;
  dueDate?: Date;
  lines: InvoiceLineItem[];
  metadata?: Record<string, any>;
  created: Date;
}

export interface InvoiceLineItem {
  id: string;
  amount: number;
  currency: Currency;
  description: string;
  quantity: number;
  priceId?: string;
}

// Swiss-specific payment types

export interface SwissQRBill {
  iban: string;
  creditor: {
    name: string;
    address: Address;
  };
  reference: string;
  amount?: Money;
  message?: string;
  billInformation?: string;
}

export interface SwissQRBillPayment {
  id: string;
  qrBill: SwissQRBill;
  status: PaymentStatus;
  paidAt?: Date;
  metadata?: Record<string, any>;
}

// TWINT-specific types

export interface TwintPaymentRequest {
  merchantId: string;
  storeId: string;
  terminalId: string;
  amount: number;
  currency: string;
  refNo: string;
  purpose?: string;
  customerInfo?: {
    email?: string;
    phone?: string;
  };
  webhookUrl?: string;
  expirationTime?: string;
  paymentMethod?: 'QR' | 'APP';
}

export interface TwintPaymentResponse {
  paymentId: string;
  status: PaymentStatus;
  qrCode?: string;
  redirectUrl?: string;
  token: string;
}

export interface TwintRefundRequest {
  merchantId: string;
  originalTransactionId: string;
  amount: number;
  reason?: string;
  refNo: string;
}

// PostFinance-specific types

export interface PostFinancePayment {
  id: string;
  amount: Money;
  status: PaymentStatus;
  accountNumber?: string;
  reference?: string;
  payerInfo?: {
    name?: string;
    address?: Address;
  };
}

// Payment processing types

export interface PaymentProcessor {
  createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent>;
  confirmPayment(paymentIntentId: string, paymentMethodId: string): Promise<PaymentIntent>;
  capturePayment(paymentIntentId: string, amount?: number): Promise<PaymentIntent>;
  cancelPayment(paymentIntentId: string): Promise<PaymentIntent>;
  createRefund(chargeId: string, amount?: number, reason?: string): Promise<Refund>;
}

export interface CreatePaymentParams {
  amount: number;
  currency: Currency;
  paymentMethod?: PaymentMethodType;
  customerId?: string;
  description?: string;
  metadata?: Record<string, any>;
  captureMethod?: 'automatic' | 'manual';
  setupFutureUsage?: boolean;
}

export interface PaymentWebhookEvent {
  id: string;
  type: string;
  data: any;
  created: Date;
}

export interface PaymentConfiguration {
  supportedMethods: PaymentMethodType[];
  supportedCurrencies: Currency[];
  minimumAmount: Record<Currency, number>;
  maximumAmount: Record<Currency, number>;
  fees: {
    percentage: number;
    fixed: Record<Currency, number>;
  };
}

// Transaction types for reporting

export interface Transaction {
  id: string;
  type: 'payment' | 'refund' | 'payout';
  amount: Money;
  status: 'pending' | 'completed' | 'failed';
  paymentMethodType: PaymentMethodType;
  customerId?: string;
  orderId?: string;
  description?: string;
  fees?: Money;
  netAmount?: Money;
  metadata?: Record<string, any>;
  created: Date;
  completed?: Date;
}

export interface PaymentReport {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalTransactions: number;
    totalAmount: Money;
    totalFees: Money;
    netAmount: Money;
  };
  byPaymentMethod: Record<PaymentMethodType, {
    count: number;
    amount: Money;
    fees: Money;
  }>;
  byStatus: Record<string, {
    count: number;
    amount: Money;
  }>;
  transactions: Transaction[];
}
