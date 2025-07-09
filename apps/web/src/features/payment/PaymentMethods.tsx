/**
 * EATECH Payment Methods Component
 * 
 * Verwaltet alle Zahlungsmethoden:
 * - Stripe (Kreditkarte)
 * - TWINT (Schweizer Mobile Payment)
 * - Apple Pay / Google Pay
 * - QR-Rechnung (optional)
 * - Crypto (optional)
 * - 3D Secure Handling
 * - Payment Method Speicherung
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
  PaymentElement,
  LinkAuthenticationElement,
  AddressElement
} from '@stripe/react-stripe-js';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCardIcon,
  DevicePhoneMobileIcon,
  QrCodeIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  WalletIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import QRCode from 'qrcode';

// Core imports
import { useFeatureFlag } from '@eatech/core/hooks/useFeatureFlag';
import { useAuth } from '@eatech/core/hooks/useAuth';
import { formatPrice } from '@eatech/core/utils/formatters';
import { PaymentMethod, PaymentIntent } from '@eatech/types';

// UI imports
import {
  Card,
  Button,
  Alert,
  Badge,
  Spinner,
  RadioGroup,
  Checkbox,
  Modal,
  Tabs,
  TabPanel
} from '@eatech/ui';

// Services
import { paymentService } from '../../services/payment.service';
import { analyticsService } from '../../services/analytics.service';

// Styles
import styles from './PaymentMethods.module.css';

// Stripe configuration
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// TWINT Configuration
const TWINT_CONFIG = {
  merchantId: import.meta.env.VITE_TWINT_MERCHANT_ID,
  terminalId: import.meta.env.VITE_TWINT_TERMINAL_ID,
  apiUrl: import.meta.env.VITE_TWINT_API_URL
};

interface PaymentMethodsProps {
  amount: number;
  orderId: string;
  truckId: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  allowSave?: boolean;
  customerEmail?: string;
  customerPhone?: string;
}

export const PaymentMethods: React.FC<PaymentMethodsProps> = ({
  amount,
  orderId,
  truckId,
  onSuccess,
  onError,
  allowSave = true,
  customerEmail,
  customerPhone
}) => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  
  // Feature Flags
  const { enabled: twintEnabled } = useFeatureFlag('payment_twint');
  const { enabled: applePayEnabled } = useFeatureFlag('payment_apple_pay');
  const { enabled: googlePayEnabled } = useFeatureFlag('payment_google_pay');
  const { enabled: cryptoEnabled } = useFeatureFlag('payment_crypto');
  const { enabled: qrBillEnabled } = useFeatureFlag('payment_qr_bill');
  
  // State
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('card');
  const [clientSecret, setClientSecret] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveCard, setSaveCard] = useState(false);
  const [twintQrCode, setTwintQrCode] = useState<string | null>(null);
  const [twintPolling, setTwintPolling] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  
  // Create payment intent on mount
  useEffect(() => {
    createPaymentIntent();
  }, [amount, orderId]);
  
  // Create payment intent
  const createPaymentIntent = async () => {
    try {
      const intent = await paymentService.createPaymentIntent({
        amount,
        orderId,
        truckId,
        paymentMethod: selectedMethod,
        customerEmail: customerEmail || user?.email,
        savePaymentMethod: saveCard && isAuthenticated
      });
      
      setClientSecret(intent.client_secret);
      setPaymentIntent(intent);
      
      // Generate TWINT QR if needed
      if (selectedMethod === 'twint' && twintEnabled) {
        await generateTwintQr(intent);
      }
    } catch (err: any) {
      console.error('Failed to create payment intent:', err);
      setError(err.message);
      onError(err.message);
    }
  };
  
  // Generate TWINT QR Code
  const generateTwintQr = async (intent: PaymentIntent) => {
    try {
      // TWINT payment data
      const twintData = {
        amount: amount / 100, // Convert from Rappen to CHF
        reference: intent.id,
        message: `Order #${orderId}`,
        merchantId: TWINT_CONFIG.merchantId,
        terminalId: TWINT_CONFIG.terminalId
      };
      
      // Generate QR code
      const qrDataUrl = await QRCode.toDataURL(JSON.stringify(twintData), {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        width: 300,
        margin: 2
      });
      
      setTwintQrCode(qrDataUrl);
      
      // Start polling for payment confirmation
      startTwintPolling(intent.id);
    } catch (err) {
      console.error('Failed to generate TWINT QR:', err);
      setError(t('payment.twintQrError'));
    }
  };
  
  // Poll TWINT payment status
  const startTwintPolling = (paymentIntentId: string) => {
    setTwintPolling(true);
    
    const pollInterval = setInterval(async () => {
      try {
        const status = await paymentService.checkPaymentStatus(paymentIntentId);
        
        if (status.status === 'succeeded') {
          clearInterval(pollInterval);
          setTwintPolling(false);
          handlePaymentSuccess(paymentIntentId);
        } else if (status.status === 'canceled' || status.status === 'failed') {
          clearInterval(pollInterval);
          setTwintPolling(false);
          setError(t('payment.twintFailed'));
        }
      } catch (err) {
        console.error('TWINT polling error:', err);
      }
    }, 2000); // Poll every 2 seconds
    
    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (twintPolling) {
        setTwintPolling(false);
        setError(t('payment.twintTimeout'));
      }
    }, 5 * 60 * 1000);
  };
  
  // Handle payment success
  const handlePaymentSuccess = (paymentIntentId: string) => {
    analyticsService.trackEvent('payment_succeeded', {
      method: selectedMethod,
      amount,
      orderId
    });
    
    onSuccess(paymentIntentId);
  };
  
  // Render payment method content
  const renderPaymentContent = () => {
    switch (selectedMethod) {
      case 'card':
        return <StripeCardPayment 
          clientSecret={clientSecret}
          onSuccess={handlePaymentSuccess}
          onError={onError}
          isProcessing={isProcessing}
          setIsProcessing={setIsProcessing}
          saveCard={saveCard}
          setSaveCard={setSaveCard}
          allowSave={allowSave && isAuthenticated}
        />;
        
      case 'twint':
        return <TwintPayment
          qrCode={twintQrCode}
          amount={amount}
          isPolling={twintPolling}
          onCancel={() => {
            setTwintPolling(false);
            setSelectedMethod('card');
          }}
        />;
        
      case 'apple_pay':
      case 'google_pay':
        return <WalletPayment
          type={selectedMethod}
          clientSecret={clientSecret}
          amount={amount}
          onSuccess={handlePaymentSuccess}
          onError={onError}
        />;
        
      case 'qr_bill':
        return <QRBillPayment
          amount={amount}
          orderId={orderId}
          customerName={user?.displayName || 'Guest'}
          onGenerate={() => {
            analyticsService.trackEvent('qr_bill_generated', { amount, orderId });
          }}
        />;
        
      case 'crypto':
        return <CryptoPayment
          amount={amount}
          orderId={orderId}
          onSuccess={handlePaymentSuccess}
          onError={onError}
        />;
        
      default:
        return null;
    }
  };
  
  // Available payment methods
  const paymentMethods = [
    {
      id: 'card',
      name: t('payment.creditCard'),
      icon: <CreditCardIcon className="w-6 h-6" />,
      description: t('payment.cardDescription'),
      enabled: true
    },
    {
      id: 'twint',
      name: 'TWINT',
      icon: <DevicePhoneMobileIcon className="w-6 h-6" />,
      description: t('payment.twintDescription'),
      enabled: twintEnabled,
      badge: <Badge variant="success" size="sm">{t('payment.popular')}</Badge>
    },
    {
      id: 'apple_pay',
      name: 'Apple Pay',
      icon: <WalletIcon className="w-6 h-6" />,
      description: t('payment.applePayDescription'),
      enabled: applePayEnabled && window.ApplePaySession?.canMakePayments()
    },
    {
      id: 'google_pay',
      name: 'Google Pay',
      icon: <WalletIcon className="w-6 h-6" />,
      description: t('payment.googlePayDescription'),
      enabled: googlePayEnabled && window.PaymentRequest
    },
    {
      id: 'qr_bill',
      name: t('payment.qrBill'),
      icon: <QrCodeIcon className="w-6 h-6" />,
      description: t('payment.qrBillDescription'),
      enabled: qrBillEnabled
    },
    {
      id: 'crypto',
      name: t('payment.crypto'),
      icon: <BanknotesIcon className="w-6 h-6" />,
      description: t('payment.cryptoDescription'),
      enabled: cryptoEnabled,
      badge: <Badge variant="secondary" size="sm">{t('payment.new')}</Badge>
    }
  ].filter(method => method.enabled);
  
  return (
    <div className={styles.paymentMethods}>
      {/* Payment Method Selection */}
      <div className={styles.methodSelection}>
        <h3 className={styles.sectionTitle}>
          {t('payment.selectMethod')}
        </h3>
        
        <div className={styles.methodGrid}>
          {paymentMethods.map((method) => (
            <Card
              key={method.id}
              className={`${styles.methodCard} ${
                selectedMethod === method.id ? styles.selected : ''
              }`}
              onClick={() => setSelectedMethod(method.id as PaymentMethod)}
            >
              <div className={styles.methodIcon}>{method.icon}</div>
              <div className={styles.methodInfo}>
                <h4>{method.name}</h4>
                <p>{method.description}</p>
              </div>
              {method.badge && method.badge}
              {selectedMethod === method.id && (
                <CheckCircleIcon className={styles.selectedIcon} />
              )}
            </Card>
          ))}
        </div>
      </div>
      
      {/* Payment Content */}
      <div className={styles.paymentContent}>
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedMethod}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderPaymentContent()}
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Security Info */}
      <div className={styles.securityInfo}>
        <Alert variant="info" size="sm">
          <LockClosedIcon className="w-5 h-5" />
          <div>
            <p className="font-medium">{t('payment.securePayment')}</p>
            <p className="text-sm">{t('payment.securityInfo')}</p>
          </div>
        </Alert>
        
        <div className={styles.securityBadges}>
          <Badge variant="secondary">
            <ShieldCheckIcon className="w-4 h-4" />
            PCI DSS
          </Badge>
          <Badge variant="secondary">
            <LockClosedIcon className="w-4 h-4" />
            SSL/TLS
          </Badge>
          <Badge variant="secondary">
            <CheckCircleIcon className="w-4 h-4" />
            3D Secure
          </Badge>
        </div>
      </div>
      
      {/* Error Display */}
      {error && (
        <Alert variant="error" className="mt-4">
          <ExclamationCircleIcon className="w-5 h-5" />
          <span>{error}</span>
        </Alert>
      )}
    </div>
  );
};

// Stripe Card Payment Component
const StripeCardPayment: React.FC<{
  clientSecret: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  saveCard: boolean;
  setSaveCard: (save: boolean) => void;
  allowSave: boolean;
}> = ({
  clientSecret,
  onSuccess,
  onError,
  isProcessing,
  setIsProcessing,
  saveCard,
  setSaveCard,
  allowSave
}) => {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements || !clientSecret) return;
    
    setIsProcessing(true);
    
    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
          billing_details: {
            // Add billing details if needed
          }
        },
        setup_future_usage: saveCard ? 'on_session' : undefined
      });
      
      if (error) {
        throw error;
      }
      
      if (paymentIntent?.status === 'succeeded') {
        onSuccess(paymentIntent.id);
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      onError(err.message || t('payment.genericError'));
    } finally {
      setIsProcessing(false);
    }
  };
  
  if (!clientSecret) {
    return <Spinner />;
  }
  
  return (
    <form onSubmit={handleSubmit} className={styles.stripeForm}>
      <Elements stripe={stripePromise} options={{ clientSecret }}>
        <div className={styles.cardElement}>
          <CardElement
            options={{
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
            }}
          />
        </div>
        
        {allowSave && (
          <Checkbox
            checked={saveCard}
            onChange={(e) => setSaveCard(e.target.checked)}
            label={t('payment.saveCard')}
            className="mt-4"
          />
        )}
        
        <Button
          type="submit"
          variant="primary"
          fullWidth
          size="lg"
          loading={isProcessing}
          disabled={!stripe || isProcessing}
          className="mt-6"
        >
          {isProcessing ? t('payment.processing') : t('payment.pay')}
        </Button>
      </Elements>
    </form>
  );
};

// TWINT Payment Component
const TwintPayment: React.FC<{
  qrCode: string | null;
  amount: number;
  isPolling: boolean;
  onCancel: () => void;
}> = ({ qrCode, amount, isPolling, onCancel }) => {
  const { t } = useTranslation();
  
  return (
    <div className={styles.twintPayment}>
      <Card className={styles.qrCard}>
        {qrCode ? (
          <>
            <img src={qrCode} alt="TWINT QR Code" className={styles.qrCode} />
            <div className={styles.twintInstructions}>
              <h4>{t('payment.twintInstructions')}</h4>
              <ol>
                <li>{t('payment.twintStep1')}</li>
                <li>{t('payment.twintStep2')}</li>
                <li>{t('payment.twintStep3', { amount: formatPrice(amount) })}</li>
              </ol>
            </div>
            
            {isPolling && (
              <div className={styles.pollingStatus}>
                <Spinner size="sm" />
                <span>{t('payment.waitingForPayment')}</span>
              </div>
            )}
          </>
        ) : (
          <Spinner />
        )}
      </Card>
      
      <Button
        variant="secondary"
        onClick={onCancel}
        fullWidth
        className="mt-4"
      >
        {t('payment.useAnotherMethod')}
      </Button>
    </div>
  );
};

// Wallet Payment Component (Apple Pay / Google Pay)
const WalletPayment: React.FC<{
  type: 'apple_pay' | 'google_pay';
  clientSecret: string;
  amount: number;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}> = ({ type, clientSecret, amount, onSuccess, onError }) => {
  const { t } = useTranslation();
  const stripe = useStripe();
  
  const handleWalletPayment = async () => {
    if (!stripe || !clientSecret) return;
    
    try {
      const paymentRequest = stripe.paymentRequest({
        country: 'CH',
        currency: 'chf',
        total: {
          label: t('payment.orderTotal'),
          amount: amount,
        },
        requestPayerName: true,
        requestPayerEmail: true,
      });
      
      const elements = stripe.elements({ clientSecret });
      const prButton = elements.create('paymentRequestButton', {
        paymentRequest,
      });
      
      // Check if wallet payment is available
      const result = await paymentRequest.canMakePayment();
      if (!result) {
        throw new Error(t('payment.walletNotAvailable'));
      }
      
      // Mount button
      prButton.mount('#wallet-button');
      
      // Handle payment
      paymentRequest.on('paymentmethod', async (ev) => {
        const { error, paymentIntent } = await stripe.confirmCardPayment(
          clientSecret,
          { payment_method: ev.paymentMethod.id },
          { handleActions: false }
        );
        
        if (error) {
          ev.complete('fail');
          onError(error.message);
        } else {
          ev.complete('success');
          onSuccess(paymentIntent.id);
        }
      });
    } catch (err: any) {
      onError(err.message);
    }
  };
  
  useEffect(() => {
    handleWalletPayment();
  }, [stripe, clientSecret]);
  
  return (
    <div className={styles.walletPayment}>
      <div id="wallet-button" />
      <p className={styles.walletInfo}>
        {t(`payment.${type}Info`)}
      </p>
    </div>
  );
};

// QR Bill Payment Component
const QRBillPayment: React.FC<{
  amount: number;
  orderId: string;
  customerName: string;
  onGenerate: () => void;
}> = ({ amount, orderId, customerName, onGenerate }) => {
  const { t } = useTranslation();
  const [qrBillUrl, setQrBillUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const generateQrBill = async () => {
    setIsGenerating(true);
    try {
      const billData = await paymentService.generateQrBill({
        amount,
        orderId,
        customerName,
        reference: orderId,
        message: `Order #${orderId}`
      });
      
      setQrBillUrl(billData.url);
      onGenerate();
    } catch (err) {
      console.error('Failed to generate QR bill:', err);
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div className={styles.qrBillPayment}>
      <Alert variant="info">
        <InformationCircleIcon className="w-5 h-5" />
        <span>{t('payment.qrBillInfo')}</span>
      </Alert>
      
      {!qrBillUrl ? (
        <Button
          variant="primary"
          onClick={generateQrBill}
          loading={isGenerating}
          fullWidth
          className="mt-4"
        >
          {t('payment.generateQrBill')}
        </Button>
      ) : (
        <div className={styles.qrBillDisplay}>
          <iframe
            src={qrBillUrl}
            className={styles.qrBillFrame}
            title="QR Bill"
          />
          <div className={styles.qrBillActions}>
            <Button
              variant="primary"
              onClick={() => window.open(qrBillUrl, '_blank')}
            >
              {t('payment.downloadQrBill')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.print()}
            >
              {t('payment.printQrBill')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// Crypto Payment Component
const CryptoPayment: React.FC<{
  amount: number;
  orderId: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}> = ({ amount, orderId, onSuccess, onError }) => {
  const { t } = useTranslation();
  const [selectedCrypto, setSelectedCrypto] = useState<'btc' | 'eth'>('btc');
  const [cryptoAddress, setCryptoAddress] = useState<string>('');
  const [cryptoAmount, setCryptoAmount] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  
  useEffect(() => {
    // Fetch crypto address and exchange rate
    fetchCryptoDetails();
  }, [selectedCrypto]);
  
  const fetchCryptoDetails = async () => {
    try {
      const details = await paymentService.getCryptoPaymentDetails({
        amount,
        orderId,
        currency: selectedCrypto
      });
      
      setCryptoAddress(details.address);
      setCryptoAmount(details.cryptoAmount);
      setExchangeRate(details.exchangeRate);
    } catch (err) {
      console.error('Failed to fetch crypto details:', err);
      onError(t('payment.cryptoError'));
    }
  };
  
  const copyAddress = () => {
    navigator.clipboard.writeText(cryptoAddress);
    // Show toast notification
  };
  
  return (
    <div className={styles.cryptoPayment}>
      <Tabs
        value={selectedCrypto}
        onChange={(value) => setSelectedCrypto(value as 'btc' | 'eth')}
      >
        <TabPanel value="btc" label="Bitcoin">
          <div className={styles.cryptoDetails}>
            <QRCode value={`bitcoin:${cryptoAddress}?amount=${cryptoAmount}`} />
            <div className={styles.cryptoInfo}>
              <p className={styles.cryptoAmount}>
                {cryptoAmount} BTC
              </p>
              <p className={styles.exchangeRate}>
                1 BTC = {formatPrice(exchangeRate * 100)} CHF
              </p>
              <div className={styles.addressBox}>
                <code>{cryptoAddress}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyAddress}
                >
                  {t('common.copy')}
                </Button>
              </div>
            </div>
          </div>
        </TabPanel>
        
        <TabPanel value="eth" label="Ethereum">
          <div className={styles.cryptoDetails}>
            <QRCode value={`ethereum:${cryptoAddress}?value=${cryptoAmount}`} />
            <div className={styles.cryptoInfo}>
              <p className={styles.cryptoAmount}>
                {cryptoAmount} ETH
              </p>
              <p className={styles.exchangeRate}>
                1 ETH = {formatPrice(exchangeRate * 100)} CHF
              </p>
              <div className={styles.addressBox}>
                <code>{cryptoAddress}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyAddress}
                >
                  {t('common.copy')}
                </Button>
              </div>
            </div>
          </div>
        </TabPanel>
      </Tabs>
      
      <Alert variant="warning" className="mt-4">
        <ExclamationTriangleIcon className="w-5 h-5" />
        <span>{t('payment.cryptoWarning')}</span>
      </Alert>
    </div>
  );
};

// QR Code Component
const QRCode: React.FC<{ value: string }> = ({ value }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  
  useEffect(() => {
    QRCode.toDataURL(value, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 200,
      margin: 2
    }).then(setQrDataUrl);
  }, [value]);
  
  return <img src={qrDataUrl} alt="QR Code" className={styles.qrCode} />;
};

// Export
export default PaymentMethods;