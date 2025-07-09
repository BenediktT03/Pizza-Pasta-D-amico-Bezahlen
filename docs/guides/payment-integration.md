# 💳 Payment Integration Guide

## Overview

EATECH supports multiple payment methods tailored for the Swiss market, including credit/debit cards via Stripe, TWINT (Swiss mobile payment), PostFinance, and traditional cash payments. This guide covers implementation, security, and compliance for all payment methods.

## Supported Payment Methods

```
┌─────────────────────────────────────────────────────┐
│                 Payment Methods                      │
├─────────────────┬───────────────┬──────────────────┤
│   Credit Cards  │     TWINT     │   PostFinance    │
│   ✓ Visa        │  ✓ QR Code    │  ✓ E-Finance     │
│   ✓ Mastercard  │  ✓ Direct     │  ✓ Card         │
│   ✓ Amex        │  ✓ Recurring  │  ✓ TWINT        │
├─────────────────┼───────────────┼──────────────────┤
│      Cash       │  Gift Cards   │    Vouchers      │
│   ✓ On Pickup   │  ✓ Digital    │  ✓ Promotional   │
│   ✓ On Delivery │  ✓ Physical   │  ✓ Loyalty       │
└─────────────────┴───────────────┴──────────────────┘
```

## Architecture

```
┌─────────────────────────────────────────────┐
│            Frontend (React)                  │
│         Payment Method Selection             │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│          Payment Service Layer               │
│    (Unified API for all providers)          │
└─────────┬───────────────┬──────────────────┘
          │               │
┌─────────▼──────┐ ┌──────▼──────────────────┐
│     Stripe     │ │        TWINT            │
│   (Cards, SEPA)│ │   (Mobile Payment)      │
└────────────────┘ └─────────────────────────┘
```

## Implementation

### 1. Payment Service Architecture

```typescript
// packages/core/src/services/payment/payment.service.ts
export interface PaymentService {
  createPaymentIntent(amount: number, currency: string, metadata?: any): Promise<PaymentIntent>;
  confirmPayment(paymentIntentId: string, paymentMethod: any): Promise<PaymentResult>;
  refundPayment(paymentId: string, amount?: number): Promise<RefundResult>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;
}

export class UnifiedPaymentService {
  private providers: Map<PaymentProvider, PaymentService>;
  
  constructor() {
    this.providers = new Map([
      [PaymentProvider.STRIPE, new StripePaymentService()],
      [PaymentProvider.TWINT, new TwintPaymentService()],
      [PaymentProvider.POSTFINANCE, new PostFinanceService()],
    ]);
  }
  
  async processPayment(
    order: Order,
    method: PaymentMethod,
    options: PaymentOptions = {}
  ): Promise<PaymentResult> {
    // Validate payment method
    if (!this.isMethodAvailable(method, order)) {
      throw new PaymentError('Payment method not available');
    }
    
    // Get appropriate provider
    const provider = this.getProvider(method);
    
    try {
      // Create payment intent
      const intent = await provider.createPaymentIntent(
        order.total,
        order.currency,
        {
          orderId: order.id,
          tenantId: order.tenantId,
          customerEmail: order.customer.email,
        }
      );
      
      // Log payment attempt
      await this.logPaymentAttempt(order, method, intent);
      
      // Process payment
      const result = await provider.confirmPayment(
        intent.id,
        options.paymentDetails
      );
      
      // Update order status
      if (result.status === 'succeeded') {
        await this.updateOrderPaymentStatus(order.id, 'paid', result);
      }
      
      return result;
    } catch (error) {
      await this.handlePaymentError(order, method, error);
      throw error;
    }
  }
  
  private isMethodAvailable(method: PaymentMethod, order: Order): boolean {
    // Check tenant configuration
    const tenantConfig = getTenantPaymentConfig(order.tenantId);
    if (!tenantConfig.enabledMethods.includes(method)) {
      return false;
    }
    
    // Check method-specific requirements
    switch (method) {
      case PaymentMethod.CASH:
        return order.type === 'pickup' || order.type === 'delivery';
        
      case PaymentMethod.TWINT:
        return order.currency === 'CHF' && order.total <= 5000;
        
      case PaymentMethod.CARD:
        return order.total >= 1; // Minimum 1 CHF
        
      default:
        return true;
    }
  }
}
```

### 2. Stripe Integration

#### Setup Stripe

```typescript
// packages/core/src/services/payment/stripe.service.ts
import Stripe from 'stripe';

export class StripePaymentService implements PaymentService {
  private stripe: Stripe;
  
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16',
      typescript: true,
    });
  }
  
  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata?: any
  ): Promise<PaymentIntent> {
    const intent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never', // For Swiss market
      },
      metadata: {
        ...metadata,
        integration: 'eatech',
      },
      // Swiss-specific settings
      payment_method_options: {
        card: {
          request_three_d_secure: 'automatic',
        },
        sepa_debit: {
          mandate_options: {
            notification_method: 'email',
          },
        },
      },
    });
    
    return {
      id: intent.id,
      clientSecret: intent.client_secret!,
      amount: intent.amount / 100,
      currency: intent.currency,
      status: intent.status,
    };
  }
  
  async confirmPayment(
    paymentIntentId: string,
    paymentMethod: any
  ): Promise<PaymentResult> {
    try {
      const intent = await this.stripe.paymentIntents.confirm(
        paymentIntentId,
        {
          payment_method: paymentMethod.id,
          return_url: `${process.env.APP_URL}/payment/return`,
        }
      );
      
      return {
        status: intent.status === 'succeeded' ? 'succeeded' : 'processing',
        paymentId: intent.id,
        amount: intent.amount / 100,
        currency: intent.currency,
        paymentMethod: intent.payment_method as string,
      };
    } catch (error) {
      if (error.type === 'StripeCardError') {
        throw new PaymentError(
          this.getReadableError(error.code),
          error.code
        );
      }
      throw error;
    }
  }
  
  private getReadableError(code: string): string {
    const errorMessages: Record<string, string> = {
      'insufficient_funds': 'Insufficient funds on card',
      'card_declined': 'Card was declined',
      'expired_card': 'Card has expired',
      'incorrect_cvc': 'Incorrect security code',
      'processing_error': 'Processing error, please try again',
    };
    
    return errorMessages[code] || 'Payment failed';
  }
  
  async createCustomer(customerData: CustomerData): Promise<string> {
    const customer = await this.stripe.customers.create({
      email: customerData.email,
      name: customerData.name,
      phone: customerData.phone,
      preferred_locales: ['de-CH', 'fr-CH', 'it-CH'],
      metadata: {
        tenantId: customerData.tenantId,
      },
    });
    
    return customer.id;
  }
  
  async savePaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<void> {
    await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
    
    // Set as default if it's the first one
    const methods = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    
    if (methods.data.length === 1) {
      await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    }
  }
}
```

#### Frontend Stripe Integration

```typescript
// apps/web/src/components/payment/StripePayment.tsx
import React, { useState, useEffect } from 'react';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import styles from './StripePayment.module.css';

const stripePromise = loadStripe(process.env.VITE_STRIPE_PUBLIC_KEY!);

interface StripePaymentFormProps {
  amount: number;
  onSuccess: (paymentMethod: any) => void;
  onError: (error: Error) => void;
}

const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
  amount,
  onSuccess,
  onError,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) return;
    
    setProcessing(true);
    setError(null);
    
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;
    
    try {
      // Create payment method
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          email: getCurrentUser().email,
        },
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      onSuccess(paymentMethod);
    } catch (err) {
      setError(err.message);
      onError(err);
    } finally {
      setProcessing(false);
    }
  };
  
  const cardElementOptions = {
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
    hidePostalCode: false, // Show for Swiss market
  };
  
  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.cardElement}>
        <CardElement options={cardElementOptions} />
      </div>
      
      {error && (
        <div className={styles.error}>
          <p>{error}</p>
        </div>
      )}
      
      <button
        type="submit"
        disabled={!stripe || processing}
        className={styles.submitButton}
      >
        {processing ? 'Processing...' : `Pay CHF ${amount.toFixed(2)}`}
      </button>
      
      <div className={styles.securityInfo}>
        <span>🔒 Secure payment powered by Stripe</span>
      </div>
    </form>
  );
};

export const StripePayment: React.FC<StripePaymentFormProps> = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <StripePaymentForm {...props} />
    </Elements>
  );
};
```

### 3. TWINT Integration

#### TWINT Service

```typescript
// packages/core/src/services/payment/twint.service.ts
import crypto from 'crypto';
import QRCode from 'qrcode';

export class TwintPaymentService implements PaymentService {
  private apiUrl: string;
  private merchantId: string;
  private apiKey: string;
  
  constructor() {
    this.apiUrl = process.env.TWINT_API_URL!;
    this.merchantId = process.env.TWINT_MERCHANT_ID!;
    this.apiKey = process.env.TWINT_API_KEY!;
  }
  
  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata?: any
  ): Promise<PaymentIntent> {
    if (currency !== 'CHF') {
      throw new Error('TWINT only supports CHF');
    }
    
    const reference = this.generateReference();
    
    const payload = {
      merchantId: this.merchantId,
      amount: amount,
      currency: 'CHF',
      reference: reference,
      message: `Order ${metadata.orderId}`,
      webhook: `${process.env.API_URL}/webhooks/twint`,
    };
    
    const signature = this.signRequest(payload);
    
    const response = await fetch(`${this.apiUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error('TWINT payment creation failed');
    }
    
    const data = await response.json();
    
    return {
      id: data.transactionId,
      clientSecret: data.qrData,
      amount: amount,
      currency: 'CHF',
      status: 'pending',
      qrCode: await this.generateQRCode(data.qrData),
    };
  }
  
  private generateReference(): string {
    return `EATECH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private signRequest(payload: any): string {
    const message = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', this.apiKey);
    hmac.update(message);
    return hmac.digest('hex');
  }
  
  private async generateQRCode(data: string): Promise<string> {
    return QRCode.toDataURL(data, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 2,
    });
  }
  
  async confirmPayment(
    transactionId: string,
    paymentMethod: any
  ): Promise<PaymentResult> {
    // TWINT confirmation happens via webhook
    // This method polls for status
    const maxAttempts = 60; // 5 minutes
    const pollInterval = 5000; // 5 seconds
    
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.checkPaymentStatus(transactionId);
      
      if (status.state === 'SUCCESS') {
        return {
          status: 'succeeded',
          paymentId: transactionId,
          amount: status.amount,
          currency: 'CHF',
          paymentMethod: 'twint',
        };
      }
      
      if (status.state === 'FAILED' || status.state === 'CANCELLED') {
        throw new PaymentError('TWINT payment failed');
      }
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new PaymentError('TWINT payment timeout');
  }
  
  private async checkPaymentStatus(transactionId: string): Promise<any> {
    const response = await fetch(`${this.apiUrl}/payments/${transactionId}`, {
      headers: {
        'X-Merchant-ID': this.merchantId,
        'X-API-Key': this.apiKey,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to check TWINT status');
    }
    
    return response.json();
  }
  
  async handleWebhook(payload: any, signature: string): Promise<void> {
    // Verify webhook signature
    if (!this.verifyWebhookSignature(payload, signature)) {
      throw new Error('Invalid webhook signature');
    }
    
    const { transactionId, state, amount } = payload;
    
    // Update payment status in database
    await db.collection('payments').doc(transactionId).update({
      status: state.toLowerCase(),
      updatedAt: new Date(),
      webhookData: payload,
    });
    
    // Trigger order status update if successful
    if (state === 'SUCCESS') {
      await this.updateOrderStatus(transactionId, 'paid');
    }
  }
  
  private verifyWebhookSignature(payload: any, signature: string): boolean {
    const expectedSignature = this.signRequest(payload);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}
```

#### TWINT Frontend Component

```typescript
// apps/web/src/components/payment/TwintPayment.tsx
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';
import { Smartphone, CheckCircle, XCircle } from 'lucide-react';
import styles from './TwintPayment.module.css';

interface TwintPaymentProps {
  amount: number;
  orderId: string;
  onSuccess: () => void;
  onError: (error: Error) => void;
}

export const TwintPayment: React.FC<TwintPaymentProps> = ({
  amount,
  orderId,
  onSuccess,
  onError,
}) => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [useQr, setUseQr] = useState(true);
  
  useEffect(() => {
    if (useQr) {
      initializeQrPayment();
    }
  }, [useQr]);
  
  useEffect(() => {
    if (transactionId && status === 'pending') {
      const interval = setInterval(checkPaymentStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [transactionId, status]);
  
  const initializeQrPayment = async () => {
    try {
      const response = await fetch('/api/payments/twint/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, orderId }),
      });
      
      if (!response.ok) throw new Error('Failed to create TWINT payment');
      
      const data = await response.json();
      setQrCode(data.qrCode);
      setTransactionId(data.transactionId);
    } catch (error) {
      onError(error);
    }
  };
  
  const checkPaymentStatus = async () => {
    if (!transactionId) return;
    
    try {
      const response = await fetch(`/api/payments/twint/${transactionId}/status`);
      const data = await response.json();
      
      if (data.status === 'success') {
        setStatus('success');
        onSuccess();
      } else if (data.status === 'failed') {
        setStatus('failed');
        onError(new Error('TWINT payment failed'));
      }
    } catch (error) {
      console.error('Status check failed:', error);
    }
  };
  
  const handlePhonePayment = async () => {
    try {
      const response = await fetch('/api/payments/twint/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          orderId,
          phoneNumber: phoneNumber.replace(/\s/g, ''),
        }),
      });
      
      if (!response.ok) throw new Error('Failed to send TWINT request');
      
      const data = await response.json();
      setTransactionId(data.transactionId);
      setStatus('pending');
    } catch (error) {
      onError(error);
    }
  };
  
  if (status === 'success') {
    return (
      <motion.div
        className={styles.success}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <CheckCircle size={64} color="#4CAF50" />
        <h3>Zahlung erfolgreich!</h3>
        <p>Vielen Dank für Ihre Bestellung.</p>
      </motion.div>
    );
  }
  
  if (status === 'failed') {
    return (
      <motion.div
        className={styles.failed}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <XCircle size={64} color="#f44336" />
        <h3>Zahlung fehlgeschlagen</h3>
        <p>Bitte versuchen Sie es erneut.</p>
        <button onClick={() => window.location.reload()}>Erneut versuchen</button>
      </motion.div>
    );
  }
  
  return (
    <div className={styles.twintPayment}>
      <div className={styles.header}>
        <img src="/images/twint-logo.svg" alt="TWINT" />
        <p className={styles.amount}>CHF {amount.toFixed(2)}</p>
      </div>
      
      <div className={styles.methodToggle}>
        <button
          className={useQr ? styles.active : ''}
          onClick={() => setUseQr(true)}
        >
          QR-Code
        </button>
        <button
          className={!useQr ? styles.active : ''}
          onClick={() => setUseQr(false)}
        >
          Handynummer
        </button>
      </div>
      
      {useQr ? (
        <div className={styles.qrContainer}>
          {qrCode ? (
            <>
              <QRCodeSVG
                value={qrCode}
                size={200}
                level="M"
                includeMargin={true}
              />
              <p>Scannen Sie den QR-Code mit Ihrer TWINT App</p>
              <div className={styles.loader}>
                <div className={styles.spinner} />
                <span>Warte auf Zahlung...</span>
              </div>
            </>
          ) : (
            <div className={styles.loading}>Lade QR-Code...</div>
          )}
        </div>
      ) : (
        <div className={styles.phoneContainer}>
          <div className={styles.phoneInput}>
            <span>+41</span>
            <input
              type="tel"
              placeholder="79 123 45 67"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              maxLength={11}
            />
          </div>
          <button
            onClick={handlePhonePayment}
            disabled={phoneNumber.replace(/\s/g, '').length < 9}
            className={styles.sendButton}
          >
            <Smartphone size={20} />
            TWINT-Anfrage senden
          </button>
          <p className={styles.hint}>
            Sie erhalten eine Zahlungsanfrage in Ihrer TWINT App
          </p>
        </div>
      )}
    </div>
  );
};
```

### 4. Payment Method Selection

```typescript
// apps/web/src/components/payment/PaymentMethodSelector.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Smartphone,
  Building,
  Banknote,
  Gift,
} from 'lucide-react';
import styles from './PaymentMethodSelector.module.css';

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  available: boolean;
  fee?: number;
}

interface PaymentMethodSelectorProps {
  amount: number;
  deliveryType: 'pickup' | 'delivery' | 'dine-in';
  onSelect: (method: string) => void;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  amount,
  deliveryType,
  onSelect,
}) => {
  const [selected, setSelected] = useState<string | null>(null);
  
  const paymentMethods: PaymentMethod[] = [
    {
      id: 'card',
      name: 'Kredit-/Debitkarte',
      icon: <CreditCard size={24} />,
      description: 'Visa, Mastercard, American Express',
      available: true,
    },
    {
      id: 'twint',
      name: 'TWINT',
      icon: <Smartphone size={24} />,
      description: 'Bezahlen mit dem Smartphone',
      available: amount <= 5000,
    },
    {
      id: 'postfinance',
      name: 'PostFinance',
      icon: <Building size={24} />,
      description: 'E-Finance oder PostFinance Card',
      available: true,
    },
    {
      id: 'cash',
      name: 'Barzahlung',
      icon: <Banknote size={24} />,
      description: deliveryType === 'pickup' ? 'Bei Abholung' : 'Bei Lieferung',
      available: deliveryType !== 'dine-in',
    },
    {
      id: 'voucher',
      name: 'Gutschein',
      icon: <Gift size={24} />,
      description: 'Gutscheincode einlösen',
      available: true,
    },
  ];
  
  const handleSelect = (methodId: string) => {
    setSelected(methodId);
    onSelect(methodId);
  };
  
  return (
    <div className={styles.container}>
      <h3>Zahlungsmethode wählen</h3>
      
      <div className={styles.methods}>
        {paymentMethods.map((method) => (
          <motion.button
            key={method.id}
            className={`${styles.method} ${
              selected === method.id ? styles.selected : ''
            } ${!method.available ? styles.disabled : ''}`}
            onClick={() => method.available && handleSelect(method.id)}
            whileHover={method.available ? { scale: 1.02 } : {}}
            whileTap={method.available ? { scale: 0.98 } : {}}
            disabled={!method.available}
          >
            <div className={styles.icon}>{method.icon}</div>
            <div className={styles.info}>
              <h4>{method.name}</h4>
              <p>{method.description}</p>
              {method.fee && (
                <span className={styles.fee}>
                  + CHF {method.fee.toFixed(2)} Gebühr
                </span>
              )}
            </div>
            {!method.available && (
              <div className={styles.unavailable}>
                {method.id === 'twint' && amount > 5000
                  ? 'Max. CHF 5000'
                  : 'Nicht verfügbar'}
              </div>
            )}
          </motion.button>
        ))}
      </div>
      
      <div className={styles.security}>
        <span>🔒</span>
        <p>Alle Zahlungen sind verschlüsselt und sicher</p>
      </div>
    </div>
  );
};
```

### 5. Payment Processing Flow

```typescript
// apps/web/src/features/checkout/PaymentProcessor.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PaymentMethodSelector } from '@/components/payment/PaymentMethodSelector';
import { StripePayment } from '@/components/payment/StripePayment';
import { TwintPayment } from '@/components/payment/TwintPayment';
import { PostFinancePayment } from '@/components/payment/PostFinancePayment';
import { useOrder } from '@/hooks/useOrder';
import { usePayment } from '@/hooks/usePayment';
import styles from './PaymentProcessor.module.css';

export const PaymentProcessor: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrder } = useOrder();
  const { processPayment, loading, error } = usePayment();
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  
  if (!currentOrder) {
    navigate('/cart');
    return null;
  }
  
  const handlePaymentMethodSelect = (method: string) => {
    setPaymentMethod(method);
  };
  
  const handlePaymentSuccess = async (paymentDetails: any) => {
    setProcessing(true);
    
    try {
      const result = await processPayment({
        orderId: currentOrder.id,
        method: paymentMethod!,
        amount: currentOrder.total,
        paymentDetails,
      });
      
      if (result.success) {
        // Save successful payment
        await savePaymentRecord(result);
        
        // Redirect to success page
        navigate(`/order/${currentOrder.id}/success`, {
          state: { payment: result },
        });
      } else {
        throw new Error(result.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      setError(error.message);
    } finally {
      setProcessing(false);
    }
  };
  
  const renderPaymentForm = () => {
    if (!paymentMethod) return null;
    
    switch (paymentMethod) {
      case 'card':
        return (
          <StripePayment
            amount={currentOrder.total}
            onSuccess={handlePaymentSuccess}
            onError={setError}
          />
        );
        
      case 'twint':
        return (
          <TwintPayment
            amount={currentOrder.total}
            orderId={currentOrder.id}
            onSuccess={() => handlePaymentSuccess({ method: 'twint' })}
            onError={setError}
          />
        );
        
      case 'postfinance':
        return (
          <PostFinancePayment
            amount={currentOrder.total}
            orderId={currentOrder.id}
            onSuccess={handlePaymentSuccess}
            onError={setError}
          />
        );
        
      case 'cash':
        return (
          <div className={styles.cashPayment}>
            <h3>Barzahlung</h3>
            <p>
              Bitte bezahlen Sie den Betrag von{' '}
              <strong>CHF {currentOrder.total.toFixed(2)}</strong>{' '}
              bei {currentOrder.type === 'pickup' ? 'Abholung' : 'Lieferung'}.
            </p>
            <button
              onClick={() => handlePaymentSuccess({ method: 'cash' })}
              className={styles.confirmButton}
            >
              Bestellung bestätigen
            </button>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className={styles.container}>
      <div className={styles.orderSummary}>
        <h2>Bestellübersicht</h2>
        <div className={styles.items}>
          {currentOrder.items.map((item) => (
            <div key={item.id} className={styles.item}>
              <span>{item.quantity}x {item.name}</span>
              <span>CHF {item.total.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className={styles.total}>
          <span>Gesamt</span>
          <span>CHF {currentOrder.total.toFixed(2)}</span>
        </div>
      </div>
      
      <div className={styles.payment}>
        {!paymentMethod ? (
          <PaymentMethodSelector
            amount={currentOrder.total}
            deliveryType={currentOrder.type}
            onSelect={handlePaymentMethodSelect}
          />
        ) : (
          <>
            <button
              onClick={() => setPaymentMethod(null)}
              className={styles.changeMethod}
            >
              ← Andere Zahlungsmethode wählen
            </button>
            {renderPaymentForm()}
          </>
        )}
      </div>
      
      {error && (
        <div className={styles.error}>
          <p>{error}</p>
        </div>
      )}
      
      {processing && (
        <div className={styles.processing}>
          <div className={styles.spinner} />
          <p>Zahlung wird verarbeitet...</p>
        </div>
      )}
    </div>
  );
};
```

### 6. Webhook Handling

```typescript
// services/functions/src/webhooks/payment-webhooks.ts
import { Request, Response } from 'express';
import { verifyWebhookSignature } from '../utils/webhook-security';

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'] as string;
  
  try {
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    
    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
        
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
        
      case 'charge.dispute.created':
        await handleDispute(event.data.object);
        break;
        
      case 'charge.refunded':
        await handleRefund(event.data.object);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
}

async function handlePaymentSuccess(paymentIntent: any) {
  const orderId = paymentIntent.metadata.orderId;
  
  // Update order status
  await db.collection('orders').doc(orderId).update({
    paymentStatus: 'paid',
    paymentId: paymentIntent.id,
    paidAt: new Date(),
  });
  
  // Send confirmation email
  await sendOrderConfirmation(orderId);
  
  // Notify kitchen
  await notifyKitchen(orderId);
}

async function handlePaymentFailed(paymentIntent: any) {
  const orderId = paymentIntent.metadata.orderId;
  
  // Update order status
  await db.collection('orders').doc(orderId).update({
    paymentStatus: 'failed',
    paymentError: paymentIntent.last_payment_error?.message,
  });
  
  // Notify customer
  await sendPaymentFailedNotification(orderId);
}
```

### 7. Refund Processing

```typescript
// packages/core/src/services/payment/refund.service.ts
export class RefundService {
  async processRefund(
    orderId: string,
    amount?: number,
    reason?: string
  ): Promise<RefundResult> {
    // Get order details
    const order = await getOrder(orderId);
    if (!order) throw new Error('Order not found');
    
    // Validate refund amount
    const refundAmount = amount || order.total;
    if (refundAmount > order.total) {
      throw new Error('Refund amount exceeds order total');
    }
    
    // Check if already refunded
    if (order.refundStatus === 'full') {
      throw new Error('Order already fully refunded');
    }
    
    try {
      // Process refund based on payment method
      let refundResult;
      
      switch (order.paymentMethod) {
        case 'card':
          refundResult = await this.refundStripePayment(
            order.paymentId,
            refundAmount
          );
          break;
          
        case 'twint':
          refundResult = await this.refundTwintPayment(
            order.paymentId,
            refundAmount
          );
          break;
          
        case 'cash':
          refundResult = await this.processCashRefund(
            order,
            refundAmount
          );
          break;
          
        default:
          throw new Error(`Refund not supported for ${order.paymentMethod}`);
      }
      
      // Update order status
      await this.updateOrderRefundStatus(orderId, refundResult);
      
      // Log refund
      await this.logRefund({
        orderId,
        amount: refundAmount,
        reason,
        method: order.paymentMethod,
        refundId: refundResult.id,
        processedBy: getCurrentUser().id,
      });
      
      // Send notification
      await this.sendRefundNotification(order, refundResult);
      
      return refundResult;
    } catch (error) {
      console.error('Refund processing error:', error);
      throw new Error(`Refund failed: ${error.message}`);
    }
  }
  
  private async refundStripePayment(
    paymentIntentId: string,
    amount: number
  ): Promise<RefundResult> {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: Math.round(amount * 100),
      reason: 'requested_by_customer',
    });
    
    return {
      id: refund.id,
      amount: refund.amount / 100,
      currency: refund.currency,
      status: refund.status,
      createdAt: new Date(refund.created * 1000),
    };
  }
}
```

## Security Best Practices

### 1. PCI Compliance

```typescript
// Never store card details
// Always use tokenization

// Bad ❌
const cardNumber = req.body.cardNumber;
const cvv = req.body.cvv;

// Good ✅
const paymentMethodId = req.body.paymentMethodId;
// Let Stripe handle the sensitive data
```

### 2. Secure Communication

```typescript
// Always use HTTPS
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});

// Validate webhook signatures
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### 3. Rate Limiting

```typescript
// Limit payment attempts
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many payment attempts',
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/payments', paymentLimiter, processPayment);
```

## Testing Payments

### Test Cards

```typescript
// Stripe test cards for Swiss market
const testCards = {
  success: '4242 4242 4242 4242',
  authentication: '4000 0025 0000 3155',
  declined: '4000 0000 0000 9995',
  insufficientFunds: '4000 0000 0000 9995',
};

// TWINT test mode
const testTwintNumbers = {
  success: '+41 79 999 99 99',
  declined: '+41 79 999 99 98',
  timeout: '+41 79 999 99 97',
};
```

### Integration Tests

```typescript
describe('Payment Integration', () => {
  it('should process card payment successfully', async () => {
    const order = await createTestOrder();
    
    const payment = await processPayment({
      orderId: order.id,
      method: 'card',
      amount: 50.00,
      paymentDetails: {
        paymentMethodId: 'pm_card_visa',
      },
    });
    
    expect(payment.status).toBe('succeeded');
    expect(payment.amount).toBe(50.00);
  });
  
  it('should handle payment failures gracefully', async () => {
    const order = await createTestOrder();
    
    await expect(
      processPayment({
        orderId: order.id,
        method: 'card',
        amount: 50.00,
        paymentDetails: {
          paymentMethodId: 'pm_card_declined',
        },
      })
    ).rejects.toThrow('Card declined');
  });
});
```

## Compliance

### Swiss Financial Regulations

1. **Data Residency**: Payment data processed in Switzerland
2. **Customer Authentication**: Strong Customer Authentication (SCA)
3. **Transaction Limits**: Comply with Swiss payment limits
4. **Reporting**: Automatic tax reporting for Swiss authorities

### GDPR/DSG Compliance

```typescript
// Anonymize payment data
async function anonymizeOldPayments() {
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - 7); // 7 years retention
  
  const oldPayments = await db.collection('payments')
    .where('createdAt', '<', cutoffDate)
    .get();
    
  const batch = db.batch();
  
  oldPayments.forEach(doc => {
    batch.update(doc.ref, {
      customerEmail: 'ANONYMIZED',
      customerName: 'ANONYMIZED',
      metadata: {},
    });
  });
  
  await batch.commit();
}
```

## Monitoring & Analytics

```typescript
// Track payment metrics
interface PaymentMetrics {
  totalProcessed: number;
  successRate: number;
  averageAmount: number;
  popularMethods: Record<string, number>;
  failureReasons: Record<string, number>;
}

async function trackPaymentMetrics(payment: PaymentResult) {
  await analytics.track('Payment Processed', {
    orderId: payment.orderId,
    method: payment.method,
    amount: payment.amount,
    currency: payment.currency,
    success: payment.status === 'succeeded',
    processingTime: payment.processingTime,
    failureReason: payment.error?.code,
  });
}
```

---

For more details on API implementation, see the [API Documentation](../API.md).
