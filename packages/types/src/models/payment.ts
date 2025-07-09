/**
 * Payment Model Types
 * Type definitions for payment-related data structures
 */

import { z } from 'zod';

// Payment method enum
export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  TWINT = 'twint',
  INVOICE = 'invoice',
  PAYPAL = 'paypal',
  STRIPE = 'stripe',
  APPLE_PAY = 'apple_pay',
  GOOGLE_PAY = 'google_pay',
  GIFT_CARD = 'gift_card',
  LOYALTY_POINTS = 'loyalty_points',
  CRYPTO = 'crypto',
}

// Payment provider enum
export enum PaymentProvider {
  STRIPE = 'stripe',
  TWINT = 'twint',
  PAYPAL = 'paypal',
  SQUARE = 'square',
  SUMUP = 'sumup',
  INTERNAL = 'internal',
}

// Payment status enum
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  REQUIRES_ACTION = 'requires_action',
  REQUIRES_CAPTURE = 'requires_capture',
}

// Transaction type enum
export enum TransactionType {
  CHARGE = 'charge',
  REFUND = 'refund',
  PARTIAL_REFUND = 'partial_refund',
  VOID = 'void',
  CAPTURE = 'capture',
  AUTH = 'auth',
}

// Base payment interface
export interface Payment {
  id: string;
  tenantId: string;
  orderId: string;
  customerId?: string;
  amount: number;
  currency: 'CHF' | 'EUR';
  method: PaymentMethod;
  provider: PaymentProvider;
  status: PaymentStatus;
  transactions: Transaction[];
  metadata: PaymentMetadata;
  createdAt: Date;
  updatedAt: Date;
}

// Transaction interface
export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: 'CHF' | 'EUR';
  status: TransactionStatus;
  providerTransactionId?: string;
  providerResponse?: ProviderResponse;
  processedAt: Date;
  failureReason?: string;
  metadata?: Record<string, any>;
}

// Transaction status enum
export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// Provider response interface
export interface ProviderResponse {
  provider: PaymentProvider;
  transactionId: string;
  status: string;
  raw?: Record<string, any>;
  authCode?: string;
  avsResult?: string;
  cvvResult?: string;
  riskScore?: number;
}

// Payment metadata interface
export interface PaymentMetadata {
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  sessionId?: string;
  customerEmail?: string;
  customerPhone?: string;
  billingAddress?: BillingAddress;
  shippingAddress?: ShippingAddress;
  customFields?: Record<string, any>;
}

// Billing address interface
export interface BillingAddress {
  name: string;
  company?: string;
  street: string;
  streetNumber?: string;
  apartment?: string;
  city: string;
  postalCode: string;
  canton?: string;
  country: string;
}

// Shipping address interface (same as billing for now)
export type ShippingAddress = BillingAddress;

// Card payment details
export interface CardPaymentDetails {
  last4: string;
  brand: CardBrand;
  expiryMonth: number;
  expiryYear: number;
  fingerprint?: string;
  country?: string;
  funding?: 'credit' | 'debit' | 'prepaid' | 'unknown';
  name?: string;
  tokenized?: boolean;
  token?: string;
}

// Card brand enum
export enum CardBrand {
  VISA = 'visa',
  MASTERCARD = 'mastercard',
  AMEX = 'amex',
  DISCOVER = 'discover',
  JCB = 'jcb',
  DINERS = 'diners',
  UNIONPAY = 'unionpay',
  UNKNOWN = 'unknown',
}

// TWINT payment details
export interface TwintPaymentDetails {
  phoneNumber?: string;
  qrCode?: string;
  token?: string;
  alias?: string;
}

// Invoice payment details
export interface InvoicePaymentDetails {
  invoiceNumber: string;
  dueDate: Date;
  terms: number; // days
  reference?: string;
  qrBill?: SwissQRBill;
  bankAccount?: BankAccount;
}

// Swiss QR Bill interface
export interface SwissQRBill {
  iban: string;
  creditor: QRBillParty;
  debtor?: QRBillParty;
  amount: number;
  currency: 'CHF' | 'EUR';
  reference: string;
  referenceType: 'QRR' | 'SCOR' | 'NON';
  additionalInfo?: string;
  alternativeProcedures?: string[];
}

// QR Bill party interface
export interface QRBillParty {
  name: string;
  street?: string;
  streetNumber?: string;
  postalCode: string;
  city: string;
  country: string;
}

// Bank account interface
export interface BankAccount {
  accountHolder: string;
  iban?: string;
  bic?: string;
  bankName?: string;
  accountNumber?: string;
  routingNumber?: string;
}

// Gift card payment details
export interface GiftCardPaymentDetails {
  cardNumber: string;
  pin?: string;
  balance?: number;
  expiryDate?: Date;
}

// Loyalty points payment details
export interface LoyaltyPointsPaymentDetails {
  loyaltyNumber: string;
  pointsUsed: number;
  pointsValue: number;
  remainingPoints?: number;
}

// Payment intent (for 2-step payments)
export interface PaymentIntent {
  id: string;
  tenantId: string;
  amount: number;
  currency: 'CHF' | 'EUR';
  method: PaymentMethod;
  status: PaymentIntentStatus;
  captureMethod: 'automatic' | 'manual';
  confirmationMethod: 'automatic' | 'manual';
  clientSecret?: string;
  nextAction?: PaymentNextAction;
  expiresAt: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Payment intent status enum
export enum PaymentIntentStatus {
  REQUIRES_PAYMENT_METHOD = 'requires_payment_method',
  REQUIRES_CONFIRMATION = 'requires_confirmation',
  REQUIRES_ACTION = 'requires_action',
  PROCESSING = 'processing',
  REQUIRES_CAPTURE = 'requires_capture',
  CANCELLED = 'cancelled',
  SUCCEEDED = 'succeeded',
}

// Payment next action interface
export interface PaymentNextAction {
  type: 'redirect' | '3d_secure' | 'use_sdk' | 'display_details';
  redirectUrl?: string;
  sdkData?: Record<string, any>;
  displayDetails?: Record<string, any>;
}

// Refund interface
export interface Refund {
  id: string;
  paymentId: string;
  amount: number;
  currency: 'CHF' | 'EUR';
  reason: RefundReason;
  status: RefundStatus;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  processedAt?: Date;
  failureReason?: string;
}

// Refund reason enum
export enum RefundReason {
  REQUESTED_BY_CUSTOMER = 'requested_by_customer',
  DUPLICATE = 'duplicate',
  FRAUDULENT = 'fraudulent',
  DEFECTIVE_PRODUCT = 'defective_product',
  WRONG_PRODUCT = 'wrong_product',
  ORDER_CANCELLED = 'order_cancelled',
  OTHER = 'other',
}

// Refund status enum
export enum RefundStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// Payment method configuration
export interface PaymentMethodConfig {
  method: PaymentMethod;
  enabled: boolean;
  provider?: PaymentProvider;
  configuration: Record<string, any>;
  countriesAllowed?: string[];
  countriesBlocked?: string[];
  minAmount?: number;
  maxAmount?: number;
  currencies?: ('CHF' | 'EUR')[];
}

// Create payment input
export interface CreatePaymentInput {
  tenantId: string;
  orderId: string;
  customerId?: string;
  amount: number;
  currency: 'CHF' | 'EUR';
  method: PaymentMethod;
  paymentDetails?: 
    | CardPaymentDetails 
    | TwintPaymentDetails 
    | InvoicePaymentDetails 
    | GiftCardPaymentDetails 
    | LoyaltyPointsPaymentDetails;
  metadata?: Partial<PaymentMetadata>;
}

// Process payment input
export interface ProcessPaymentInput {
  paymentId: string;
  action: 'capture' | 'void' | 'confirm';
  amount?: number; // For partial capture
}

// Create refund input
export interface CreateRefundInput {
  paymentId: string;
  amount: number;
  reason: RefundReason;
  description?: string;
  metadata?: Record<string, any>;
}

// Validation schemas
export const paymentSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  orderId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  amount: z.number().positive(),
  currency: z.enum(['CHF', 'EUR']),
  method: z.nativeEnum(PaymentMethod),
  provider: z.nativeEnum(PaymentProvider),
  status: z.nativeEnum(PaymentStatus),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const cardPaymentDetailsSchema = z.object({
  last4: z.string().length(4),
  brand: z.nativeEnum(CardBrand),
  expiryMonth: z.number().min(1).max(12),
  expiryYear: z.number().min(new Date().getFullYear()),
  name: z.string().optional(),
});

// Helpers
export function formatAmount(amount: number, currency: 'CHF' | 'EUR'): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: currency,
  }).format(amount / 100); // Assuming amount is in cents
}

export function isPaymentSuccessful(payment: Payment): boolean {
  return payment.status === PaymentStatus.SUCCEEDED;
}

export function canRefundPayment(payment: Payment): boolean {
  return [PaymentStatus.SUCCEEDED, PaymentStatus.PARTIALLY_REFUNDED].includes(payment.status);
}

export function calculateRefundableAmount(payment: Payment): number {
  const refundedAmount = payment.transactions
    .filter(t => [TransactionType.REFUND, TransactionType.PARTIAL_REFUND].includes(t.type))
    .filter(t => t.status === TransactionStatus.SUCCEEDED)
    .reduce((sum, t) => sum + t.amount, 0);
  
  return payment.amount - refundedAmount;
}

export function maskCardNumber(cardNumber: string): string {
  if (cardNumber.length < 8) return cardNumber;
  const first4 = cardNumber.slice(0, 4);
  const last4 = cardNumber.slice(-4);
  const masked = '*'.repeat(cardNumber.length - 8);
  return `${first4}${masked}${last4}`;
}

export function detectCardBrand(cardNumber: string): CardBrand {
  const patterns: Record<CardBrand, RegExp[]> = {
    [CardBrand.VISA]: [/^4/],
    [CardBrand.MASTERCARD]: [/^5[1-5]/, /^2[2-7]/],
    [CardBrand.AMEX]: [/^3[47]/],
    [CardBrand.DISCOVER]: [/^6011/, /^65/, /^64[4-9]/],
    [CardBrand.JCB]: [/^35/],
    [CardBrand.DINERS]: [/^36/, /^300/, /^301/, /^302/, /^303/, /^304/, /^305/],
    [CardBrand.UNIONPAY]: [/^62/],
    [CardBrand.UNKNOWN]: [],
  };
  
  for (const [brand, brandPatterns] of Object.entries(patterns)) {
    if (brandPatterns.some(pattern => pattern.test(cardNumber))) {
      return brand as CardBrand;
    }
  }
  
  return CardBrand.UNKNOWN;
}
