/**
 * EATECH - Payment Type Definitions
 * Version: 1.0.0
 * Description: Type definitions for payment processing
 * Author: EATECH Development Team
 * Created: 2025-01-09
 * File Path: /functions/src/types/payment.types.ts
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  TWINT = 'twint',
  POSTFINANCE = 'postfinance',
  PAYPAL = 'paypal',
  CASH = 'cash',
  INVOICE = 'invoice',
  VOUCHER = 'voucher',
  LOYALTY_POINTS = 'loyalty_points'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  AUTHORIZED = 'authorized',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  DISPUTED = 'disputed',
  EXPIRED = 'expired'
}

export enum RefundStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum TransactionType {
  PAYMENT = 'payment',
  REFUND = 'refund',
  PARTIAL_REFUND = 'partial_refund',
  ADJUSTMENT = 'adjustment',
  CHARGEBACK = 'chargeback',
  PAYOUT = 'payout'
}

export enum CardBrand {
  VISA = 'visa',
  MASTERCARD = 'mastercard',
  AMEX = 'amex',
  DISCOVER = 'discover',
  DINERS = 'diners',
  JCB = 'jcb',
  UNIONPAY = 'unionpay',
  UNKNOWN = 'unknown'
}

export enum Currency {
  CHF = 'CHF',
  EUR = 'EUR',
  USD = 'USD'
}

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Payment data
 */
export interface PaymentData {
  id: string;
  tenantId: string;
  orderId: string;
  customerId?: string;
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  paymentIntentId?: string;
  paymentMethodId?: string;
  description?: string;
  metadata?: PaymentMetadata;
  fees?: PaymentFees;
  refunds?: RefundData[];
  dispute?: DisputeData;
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
  failureReason?: string;
  failureCode?: string;
}

/**
 * Payment metadata
 */
export interface PaymentMetadata {
  orderNumber?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items?: number;
  source?: string;
  campaign?: string;
  notes?: string;
  [key: string]: any;
}

/**
 * Payment fees
 */
export interface PaymentFees {
  stripeFee?: number;
  processingFee?: number;
  applicationFee?: number;
  tax?: number;
  total: number;
}

/**
 * Refund data
 */
export interface RefundData {
  id: string;
  paymentId: string;
  amount: number;
  currency: Currency;
  status: RefundStatus;
  reason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  failureReason?: string;
}

/**
 * Dispute data
 */
export interface DisputeData {
  id: string;
  amount: number;
  currency: Currency;
  reason: string;
  status: 'warning_needs_response' | 'warning_under_review' | 'warning_closed' | 'needs_response' | 'under_review' | 'charge_refunded' | 'won' | 'lost';
  evidence?: DisputeEvidence;
  dueBy?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Dispute evidence
 */
export interface DisputeEvidence {
  receipt?: string;
  customer_communication?: string;
  service_documentation?: string;
  shipping_documentation?: string;
  refund_policy?: string;
  other?: string;
}

/**
 * Payment request
 */
export interface PaymentRequest {
  orderId: string;
  amount: number;
  currency: Currency;
  method: PaymentMethod;
  paymentMethodId?: string;
  customerId?: string;
  savePaymentMethod?: boolean;
  description?: string;
  metadata?: PaymentMetadata;
  returnUrl?: string;
  setupFutureUsage?: boolean;
  tip?: number;
}

/**
 * Payment response
 */
export interface PaymentResponse {
  success: boolean;
  paymentId: string;
  status: PaymentStatus;
  clientSecret?: string;
  redirectUrl?: string;
  requiresAction?: boolean;
  actionType?: 'redirect' | '3d_secure' | 'otp' | 'approve';
  error?: PaymentError;
}

/**
 * Payment error
 */
export interface PaymentError {
  code: string;
  message: string;
  type: 'card_error' | 'validation_error' | 'api_error' | 'authentication_error' | 'rate_limit_error';
  param?: string;
  declineCode?: string;
}

/**
 * Card details
 */
export interface CardDetails {
  brand: CardBrand;
  last4: string;
  expMonth: number;
  expYear: number;
  fingerprint?: string;
  funding?: 'credit' | 'debit' | 'prepaid' | 'unknown';
  country?: string;
  checks?: CardChecks;
  threeDSecureUsage?: ThreeDSecureUsage;
}

/**
 * Card checks
 */
export interface CardChecks {
  addressLine1Check?: 'pass' | 'fail' | 'unavailable' | 'unchecked';
  addressPostalCodeCheck?: 'pass' | 'fail' | 'unavailable' | 'unchecked';
  cvcCheck?: 'pass' | 'fail' | 'unavailable' | 'unchecked';
}

/**
 * 3D Secure usage
 */
export interface ThreeDSecureUsage {
  supported: boolean;
  required: boolean;
  succeeded?: boolean;
  authenticated?: boolean;
  version?: '1.0.2' | '2.1.0' | '2.2.0';
}

/**
 * Payment method
 */
export interface PaymentMethodData {
  id: string;
  tenantId: string;
  customerId: string;
  type: PaymentMethod;
  card?: CardDetails;
  twint?: TwintDetails;
  postfinance?: PostFinanceDetails;
  isDefault: boolean;
  billingDetails?: BillingDetails;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Twint details
 */
export interface TwintDetails {
  phoneNumber?: string;
  qrCode?: string;
  token?: string;
}

/**
 * PostFinance details
 */
export interface PostFinanceDetails {
  accountNumber?: string;
  accountHolder?: string;
}

/**
 * Billing details
 */
export interface BillingDetails {
  name?: string;
  email?: string;
  phone?: string;
  address?: BillingAddress;
}

/**
 * Billing address
 */
export interface BillingAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/**
 * Transaction record
 */
export interface Transaction {
  id: string;
  tenantId: string;
  type: TransactionType;
  paymentId?: string;
  orderId?: string;
  customerId?: string;
  amount: number;
  currency: Currency;
  status: 'pending' | 'completed' | 'failed';
  method?: PaymentMethod;
  reference?: string;
  description?: string;
  metadata?: Record<string, any>;
  balance?: TransactionBalance;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Transaction balance
 */
export interface TransactionBalance {
  before: number;
  after: number;
  change: number;
}

/**
 * Payout
 */
export interface Payout {
  id: string;
  tenantId: string;
  amount: number;
  currency: Currency;
  status: 'pending' | 'in_transit' | 'paid' | 'failed' | 'cancelled';
  method: 'standard' | 'instant';
  destination: PayoutDestination;
  transactions: string[];
  arrivalDate: Date;
  description?: string;
  metadata?: Record<string, any>;
  failureReason?: string;
  failureCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payout destination
 */
export interface PayoutDestination {
  type: 'bank_account' | 'card';
  bankAccount?: BankAccount;
  card?: CardDetails;
}

/**
 * Bank account
 */
export interface BankAccount {
  accountHolderName: string;
  accountHolderType: 'individual' | 'company';
  bankName?: string;
  country: string;
  currency: Currency;
  last4: string;
  routingNumber?: string;
  swift?: string;
  iban?: string;
}

/**
 * Payment session
 */
export interface PaymentSession {
  id: string;
  tenantId: string;
  orderId: string;
  amount: number;
  currency: Currency;
  status: 'open' | 'complete' | 'expired';
  paymentIntent?: string;
  successUrl: string;
  cancelUrl: string;
  lineItems: PaymentLineItem[];
  customerEmail?: string;
  mode: 'payment' | 'setup' | 'subscription';
  expiresAt: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Payment line item
 */
export interface PaymentLineItem {
  name: string;
  description?: string;
  amount: number;
  currency: Currency;
  quantity: number;
  images?: string[];
  tax?: TaxAmount;
}

/**
 * Tax amount
 */
export interface TaxAmount {
  amount: number;
  inclusive: boolean;
  taxRate: string;
  jurisdiction?: string;
}

/**
 * Invoice
 */
export interface Invoice {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  orderId?: string;
  customerId: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  amount: number;
  amountPaid: number;
  amountDue: number;
  currency: Currency;
  items: InvoiceItem[];
  tax?: number;
  discount?: InvoiceDiscount;
  dueDate: Date;
  paymentTerms?: string;
  notes?: string;
  footer?: string;
  metadata?: Record<string, any>;
  pdfUrl?: string;
  hostedUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
  voidedAt?: Date;
}

/**
 * Invoice item
 */
export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  tax?: number;
  discount?: number;
  metadata?: Record<string, any>;
}

/**
 * Invoice discount
 */
export interface InvoiceDiscount {
  amount?: number;
  percent?: number;
  description?: string;
}

/**
 * Subscription
 */
export interface Subscription {
  id: string;
  tenantId: string;
  customerId: string;
  status: 'trialing' | 'active' | 'past_due' | 'unpaid' | 'cancelled' | 'incomplete' | 'incomplete_expired';
  items: SubscriptionItem[];
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  billingCycleAnchor: Date;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: Date;
  endedAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  defaultPaymentMethod?: string;
  latestInvoice?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Subscription item
 */
export interface SubscriptionItem {
  id: string;
  priceId: string;
  productId: string;
  quantity: number;
  metadata?: Record<string, any>;
}

/**
 * Price
 */
export interface Price {
  id: string;
  productId: string;
  active: boolean;
  currency: Currency;
  unitAmount?: number;
  billingScheme: 'per_unit' | 'tiered';
  tiersMode?: 'graduated' | 'volume';
  tiers?: PriceTier[];
  recurring?: RecurringPrice;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Price tier
 */
export interface PriceTier {
  upTo: number | null;
  unitAmount: number;
  flatAmount?: number;
}

/**
 * Recurring price
 */
export interface RecurringPrice {
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount: number;
  usageType?: 'licensed' | 'metered';
  aggregateUsage?: 'sum' | 'last_during_period' | 'last_ever' | 'max';
}

/**
 * Checkout session
 */
export interface CheckoutSession {
  id: string;
  tenantId: string;
  orderId?: string;
  customerId?: string;
  customerEmail?: string;
  paymentStatus: 'paid' | 'unpaid' | 'no_payment_required';
  status: 'open' | 'complete' | 'expired';
  successUrl: string;
  cancelUrl: string;
  lineItems: CheckoutLineItem[];
  mode: 'payment' | 'setup' | 'subscription';
  paymentMethodTypes: PaymentMethod[];
  currency: Currency;
  amountTotal: number;
  amountSubtotal: number;
  totalDetails?: TotalDetails;
  metadata?: Record<string, any>;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Checkout line item
 */
export interface CheckoutLineItem {
  priceId?: string;
  priceData?: {
    currency: Currency;
    unitAmount: number;
    productData: {
      name: string;
      description?: string;
      images?: string[];
    };
  };
  quantity: number;
  adjustableQuantity?: {
    enabled: boolean;
    minimum?: number;
    maximum?: number;
  };
}

/**
 * Total details
 */
export interface TotalDetails {
  amountDiscount: number;
  amountShipping: number;
  amountTax: number;
}

/**
 * Webhook event
 */
export interface PaymentWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
    previousAttributes?: any;
  };
  livemode: boolean;
  pendingWebhooks: number;
  request?: {
    id: string | null;
    idempotencyKey: string | null;
  };
  created: Date;
}

/**
 * Payment report
 */
export interface PaymentReport {
  tenantId: string;
  period: {
    start: Date;
    end: Date;
  };
  summary: PaymentSummary;
  byMethod: MethodBreakdown[];
  byStatus: StatusBreakdown[];
  topCustomers: CustomerPaymentData[];
  trends: PaymentTrend[];
  fees: FeeBreakdown;
  refunds: RefundSummary;
}

/**
 * Payment summary
 */
export interface PaymentSummary {
  totalAmount: number;
  totalTransactions: number;
  averageAmount: number;
  successRate: number;
  refundRate: number;
  disputeRate: number;
}

/**
 * Method breakdown
 */
export interface MethodBreakdown {
  method: PaymentMethod;
  amount: number;
  count: number;
  percentage: number;
  avgAmount: number;
  successRate: number;
}

/**
 * Status breakdown
 */
export interface StatusBreakdown {
  status: PaymentStatus;
  amount: number;
  count: number;
  percentage: number;
}

/**
 * Customer payment data
 */
export interface CustomerPaymentData {
  customerId: string;
  customerName: string;
  totalAmount: number;
  transactionCount: number;
  avgAmount: number;
  lastPayment: Date;
}

/**
 * Payment trend
 */
export interface PaymentTrend {
  date: Date;
  amount: number;
  count: number;
  successRate: number;
  avgAmount: number;
}

/**
 * Fee breakdown
 */
export interface FeeBreakdown {
  totalFees: number;
  stripeFees: number;
  processingFees: number;
  applicationFees: number;
  taxFees: number;
  feePercentage: number;
}

/**
 * Refund summary
 */
export interface RefundSummary {
  totalAmount: number;
  count: number;
  avgAmount: number;
  reasons: RefundReason[];
}

/**
 * Refund reason
 */
export interface RefundReason {
  reason: string;
  count: number;
  amount: number;
  percentage: number;
}