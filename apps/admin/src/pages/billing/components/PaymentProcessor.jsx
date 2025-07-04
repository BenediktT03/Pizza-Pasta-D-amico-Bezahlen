/**
 * EATECH - Payment Processor Component
 * Version: 21.0.0
 * Description: Zentrale Zahlungsabwicklung mit Stripe & Alternativen
 * File Path: /apps/admin/src/pages/billing/components/PaymentProcessor.jsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Smartphone, Bitcoin, DollarSign, Shield,
  CheckCircle, XCircle, AlertCircle, Clock, RefreshCw,
  TrendingUp, Zap, Lock, Globe, ChevronRight, Info,
  ArrowRight, Copy, ExternalLink, Download
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';

// ============================================================================
// CONSTANTS
// ============================================================================
const PAYMENT_METHODS = {
  card: {
    id: 'card',
    name: 'Kreditkarte',
    icon: CreditCard,
    providers: ['stripe'],
    currencies: ['CHF', 'EUR', 'USD'],
    fee: 2.9,
    instant: true
  },
  twint: {
    id: 'twint',
    name: 'TWINT',
    icon: Smartphone,
    providers: ['twint'],
    currencies: ['CHF'],
    fee: 1.3,
    instant: true,
    popular: true
  },
  crypto: {
    id: 'crypto',
    name: 'Kryptowährung',
    icon: Bitcoin,
    providers: ['coinbase', 'binance'],
    currencies: ['BTC', 'ETH', 'USDC'],
    fee: 1.0,
    instant: true
  },
  sepa: {
    id: 'sepa',
    name: 'SEPA Lastschrift',
    icon: DollarSign,
    providers: ['stripe'],
    currencies: ['EUR'],
    fee: 0.8,
    instant: false
  }
};

const TRANSACTION_STATUSES = {
  pending: { label: 'Ausstehend', color: '#FFD93D', icon: Clock },
  processing: { label: 'In Bearbeitung', color: '#4ECDC4', icon: RefreshCw },
  completed: { label: 'Abgeschlossen', color: '#4ECDC4', icon: CheckCircle },
  failed: { label: 'Fehlgeschlagen', color: '#FF6B6B', icon: XCircle },
  refunded: { label: 'Zurückerstattet', color: '#999', icon: RefreshCw }
};

// Mock Stripe public key
const stripePromise = loadStripe('pk_test_51234567890');

// ============================================================================
// SUB-KOMPONENTEN
// ============================================================================

// Payment Method Selector
const PaymentMethodSelector = ({ selected, onChange, amount, currency }) => {
  return (
    <div className="payment-methods">
      <h3>Zahlungsmethode wählen</h3>
      <div className="methods-grid">
        {Object.entries(PAYMENT_METHODS).map(([key, method]) => {
          const Icon = method.icon;
          const isSupported = method.currencies.includes(currency);
          
          return (
            <button
              key={key}
              className={`method-card ${selected === key ? 'selected' : ''} ${!isSupported ? 'disabled' : ''}`}
              onClick={() => isSupported && onChange(key)}
              disabled={!isSupported}
            >
              {method.popular && <span className="popular-badge">Beliebt</span>}
              <Icon size={32} />
              <h4>{method.name}</h4>
              <p className="fee-info">{method.fee}% Gebühr</p>
              {method.instant && <span className="instant-badge">Sofortzahlung</span>}
              {!isSupported && <span className="unsupported">Nicht verfügbar für {currency}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Stripe Card Form
const StripeCardForm = ({ amount, currency, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    try {
      // Create payment intent on server
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency })
      });
      
      const { clientSecret } = await response.json();

      // Confirm payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: 'Customer Name',
          },
        },
      });

      if (result.error) {
        setError(result.error.message);
        onError(result.error);
      } else {
        onSuccess(result.paymentIntent);
      }
    } catch (err) {
      setError(err.message);
      onError(err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="stripe-card-form">
      <div className="card-element-wrapper">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#FFF',
                '::placeholder': {
                  color: '#666',
                },
              },
            },
          }}
        />
      </div>
      {error && (
        <div className="error-message">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      <button
        onClick={handleSubmit}
        disabled={!stripe || processing}
        className="submit-payment-btn"
      >
        {processing ? (
          <>
            <RefreshCw className="spinning" size={16} />
            Verarbeitung...
          </>
        ) : (
          <>
            <Lock size={16} />
            {currency} {amount.toFixed(2)} bezahlen
          </>
        )}
      </button>
    </div>
  );
};

// TWINT Payment
const TWINTPayment = ({ amount, currency, onSuccess, onError }) => {
  const [qrCode, setQrCode] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleGenerateQR = async () => {
    setProcessing(true);
    try {
      // Mock QR code generation
      setTimeout(() => {
        setQrCode('data:image/png;base64,mockqrcode...');
        setProcessing(false);
      }, 1000);
    } catch (err) {
      onError(err);
      setProcessing(false);
    }
  };

  return (
    <div className="twint-payment">
      <div className="twint-options">
        <div className="twint-option">
          <h4>QR-Code scannen</h4>
          {qrCode ? (
            <div className="qr-code">
              <img src={qrCode} alt="TWINT QR Code" />
              <p>Scannen Sie den Code mit Ihrer TWINT App</p>
            </div>
          ) : (
            <button
              className="generate-qr-btn"
              onClick={handleGenerateQR}
              disabled={processing}
            >
              {processing ? 'Generiere QR-Code...' : 'QR-Code generieren'}
            </button>
          )}
        </div>
        
        <div className="twint-divider">oder</div>
        
        <div className="twint-option">
          <h4>Handynummer eingeben</h4>
          <input
            type="tel"
            placeholder="+41 79 123 45 67"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <button
            className="twint-phone-btn"
            disabled={!phoneNumber || processing}
          >
            Push-Nachricht senden
          </button>
        </div>
      </div>
    </div>
  );
};

// Crypto Payment
const CryptoPayment = ({ amount, currency, onSuccess, onError }) => {
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  const [walletAddress, setWalletAddress] = useState('');
  const [exchangeRate, setExchangeRate] = useState(null);

  useEffect(() => {
    // Mock exchange rate
    const rates = {
      BTC: 0.000023,
      ETH: 0.00039,
      USDC: 1.08
    };
    setExchangeRate(rates[selectedCrypto]);
    
    // Mock wallet address
    const addresses = {
      BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      ETH: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bd52',
      USDC: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bd52'
    };
    setWalletAddress(addresses[selectedCrypto]);
  }, [selectedCrypto]);

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
  };

  return (
    <div className="crypto-payment">
      <div className="crypto-selector">
        <h4>Kryptowährung wählen</h4>
        <div className="crypto-options">
          {['BTC', 'ETH', 'USDC'].map(crypto => (
            <button
              key={crypto}
              className={`crypto-option ${selectedCrypto === crypto ? 'selected' : ''}`}
              onClick={() => setSelectedCrypto(crypto)}
            >
              {crypto}
            </button>
          ))}
        </div>
      </div>

      {exchangeRate && (
        <div className="crypto-conversion">
          <p className="conversion-rate">
            {currency} {amount} = {(amount * exchangeRate).toFixed(6)} {selectedCrypto}
          </p>
        </div>
      )}

      <div className="wallet-address">
        <h4>An folgende Adresse senden:</h4>
        <div className="address-box">
          <code>{walletAddress}</code>
          <button className="copy-btn" onClick={copyAddress}>
            <Copy size={16} />
          </button>
        </div>
        <p className="crypto-note">
          <Info size={14} />
          Bitte senden Sie exakt {(amount * exchangeRate).toFixed(6)} {selectedCrypto}
        </p>
      </div>

      <div className="crypto-qr">
        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${walletAddress}`} alt="Wallet QR Code" />
      </div>
    </div>
  );
};

// Transaction History
const TransactionHistory = ({ transactions }) => {
  return (
    <div className="transaction-history">
      <h3>Transaktionsverlauf</h3>
      <div className="transactions-list">
        {transactions.map(tx => {
          const StatusIcon = TRANSACTION_STATUSES[tx.status].icon;
          return (
            <div key={tx.id} className="transaction-item">
              <div className="tx-icon">
                <StatusIcon size={20} style={{ color: TRANSACTION_STATUSES[tx.status].color }} />
              </div>
              <div className="tx-details">
                <p className="tx-description">{tx.description}</p>
                <p className="tx-meta">
                  {tx.method} • {new Date(tx.date).toLocaleDateString('de-CH')}
                </p>
              </div>
              <div className="tx-amount">
                <span className={tx.type === 'refund' ? 'refund' : ''}>
                  {tx.type === 'refund' ? '-' : '+'}{tx.currency} {tx.amount.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// HAUPTKOMPONENTE
// ============================================================================
const PaymentProcessor = ({ amount = 299, currency = 'CHF', onSuccess, onClose }) => {
  const [selectedMethod, setSelectedMethod] = useState('card');
  const [processing, setProcessing] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);

  // Load transaction history
  useEffect(() => {
    // Mock transaction history
    setTransactions([
      {
        id: 'tx_1',
        description: 'Professional Plan - Januar 2025',
        method: 'Kreditkarte',
        amount: 299,
        currency: 'CHF',
        status: 'completed',
        type: 'payment',
        date: '2025-01-15'
      },
      {
        id: 'tx_2',
        description: 'Transaktionsgebühren',
        method: 'Kreditkarte',
        amount: 87.50,
        currency: 'CHF',
        status: 'completed',
        type: 'payment',
        date: '2025-01-15'
      },
      {
        id: 'tx_3',
        description: 'Rückerstattung - Dezember 2024',
        method: 'Kreditkarte',
        amount: 45.00,
        currency: 'CHF',
        status: 'completed',
        type: 'refund',
        date: '2024-12-20'
      }
    ]);
  }, []);

  const handlePaymentSuccess = useCallback((paymentIntent) => {
    setShowSuccess(true);
    setTimeout(() => {
      onSuccess?.(paymentIntent);
    }, 2000);
  }, [onSuccess]);

  const handlePaymentError = useCallback((error) => {
    console.error('Payment error:', error);
  }, []);

  if (showSuccess) {
    return (
      <div className="payment-success">
        <div className="success-content">
          <CheckCircle size={64} className="success-icon" />
          <h2>Zahlung erfolgreich!</h2>
          <p>Ihre Zahlung von {currency} {amount.toFixed(2)} wurde erfolgreich verarbeitet.</p>
          <button className="continue-btn" onClick={onClose}>
            Weiter <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-processor">
      {/* Header */}
      <div className="processor-header">
        <h2>Zahlung verarbeiten</h2>
        <button className="close-btn" onClick={onClose}>
          <XCircle size={20} />
        </button>
      </div>

      {/* Amount Display */}
      <div className="payment-amount">
        <h3>Zu zahlender Betrag</h3>
        <div className="amount-display">
          <span className="currency">{currency}</span>
          <span className="amount">{amount.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment Method Selection */}
      <PaymentMethodSelector
        selected={selectedMethod}
        onChange={setSelectedMethod}
        amount={amount}
        currency={currency}
      />

      {/* Payment Form */}
      <div className="payment-form-container">
        {selectedMethod === 'card' && (
          <Elements stripe={stripePromise}>
            <StripeCardForm
              amount={amount}
              currency={currency}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </Elements>
        )}
        
        {selectedMethod === 'twint' && (
          <TWINTPayment
            amount={amount}
            currency={currency}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        )}
        
        {selectedMethod === 'crypto' && (
          <CryptoPayment
            amount={amount}
            currency={currency}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        )}
        
        {selectedMethod === 'sepa' && (
          <div className="sepa-notice">
            <AlertCircle size={20} />
            <p>SEPA Lastschrift ist derzeit in Entwicklung</p>
          </div>
        )}
      </div>

      {/* Security Badge */}
      <div className="security-badge">
        <Shield size={16} />
        <span>Sichere Zahlung mit SSL-Verschlüsselung</span>
      </div>

      {/* Transaction History */}
      {transactions.length > 0 && (
        <TransactionHistory transactions={transactions} />
      )}
    </div>
  );
};

// ============================================================================
// STYLES
// ============================================================================
const styles = `
  .payment-processor {
    background: #0A0A0A;
    color: #FFF;
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  }

  /* Header */
  .processor-header {
    background: linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%);
    padding: 2rem;
    border-bottom: 1px solid #333;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .processor-header h2 {
    margin: 0;
    font-size: 1.75rem;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: #999;
    cursor: pointer;
    padding: 0.5rem;
    transition: color 0.2s;
  }

  .close-btn:hover {
    color: #FFF;
  }

  /* Amount Display */
  .payment-amount {
    text-align: center;
    padding: 3rem 2rem;
    background: #1A1A1A;
    margin: 2rem;
    border-radius: 12px;
    border: 1px solid #333;
  }

  .payment-amount h3 {
    margin: 0 0 1rem 0;
    color: #999;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .amount-display {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 0.5rem;
  }

  .amount-display .currency {
    font-size: 1.5rem;
    color: #999;
  }

  .amount-display .amount {
    font-size: 3rem;
    font-weight: 700;
    background: linear-gradient(135deg, #4ECDC4 0%, #44A3AA 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  /* Payment Methods */
  .payment-methods {
    padding: 0 2rem;
    margin-bottom: 2rem;
  }

  .payment-methods h3 {
    margin: 0 0 1.5rem 0;
  }

  .methods-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .method-card {
    position: relative;
    background: #1A1A1A;
    border: 2px solid #333;
    border-radius: 12px;
    padding: 2rem 1rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s;
  }

  .method-card:hover:not(.disabled) {
    border-color: #4ECDC4;
    transform: translateY(-2px);
  }

  .method-card.selected {
    border-color: #4ECDC4;
    background: rgba(78, 205, 196, 0.1);
  }

  .method-card.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .popular-badge {
    position: absolute;
    top: -8px;
    right: 10px;
    background: #FFD93D;
    color: #0A0A0A;
    padding: 0.25rem 0.75rem;
    border-radius: 100px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .method-card svg {
    color: #4ECDC4;
    margin-bottom: 1rem;
  }

  .method-card h4 {
    margin: 0 0 0.5rem 0;
    font-size: 1.125rem;
  }

  .fee-info {
    margin: 0 0 0.5rem 0;
    color: #999;
    font-size: 0.875rem;
  }

  .instant-badge {
    display: inline-block;
    background: #2D2D2D;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    color: #4ECDC4;
  }

  .unsupported {
    display: block;
    margin-top: 0.5rem;
    color: #FF6B6B;
    font-size: 0.75rem;
  }

  /* Payment Form Container */
  .payment-form-container {
    max-width: 600px;
    margin: 0 auto 2rem;
    padding: 0 2rem;
  }

  /* Stripe Card Form */
  .stripe-card-form {
    background: #1A1A1A;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 2rem;
  }

  .card-element-wrapper {
    background: #2D2D2D;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1.5rem;
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #FF6B6B;
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }

  .submit-payment-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem;
    background: #4ECDC4;
    color: #0A0A0A;
    border: none;
    border-radius: 8px;
    font-size: 1.125rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .submit-payment-btn:hover:not(:disabled) {
    background: #44A3AA;
    transform: translateY(-1px);
  }

  .submit-payment-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .spinning {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* TWINT Payment */
  .twint-payment {
    background: #1A1A1A;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 2rem;
  }

  .twint-options {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 2rem;
    align-items: center;
  }

  .twint-option h4 {
    margin: 0 0 1rem 0;
    text-align: center;
  }

  .qr-code {
    text-align: center;
  }

  .qr-code img {
    width: 200px;
    height: 200px;
    margin-bottom: 1rem;
    border-radius: 8px;
  }

  .qr-code p {
    color: #999;
    font-size: 0.875rem;
  }

  .generate-qr-btn,
  .twint-phone-btn {
    width: 100%;
    padding: 0.75rem;
    background: #2D2D2D;
    border: 1px solid #333;
    color: #FFF;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .generate-qr-btn:hover,
  .twint-phone-btn:hover:not(:disabled) {
    background: #333;
    border-color: #4ECDC4;
  }

  .twint-phone-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .twint-divider {
    text-align: center;
    color: #666;
    font-size: 0.875rem;
  }

  .twint-option input {
    width: 100%;
    padding: 0.75rem;
    background: #2D2D2D;
    border: 1px solid #333;
    border-radius: 8px;
    color: #FFF;
    margin-bottom: 1rem;
  }

  /* Crypto Payment */
  .crypto-payment {
    background: #1A1A1A;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 2rem;
  }

  .crypto-selector h4 {
    margin: 0 0 1rem 0;
  }

  .crypto-options {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .crypto-option {
    flex: 1;
    padding: 0.75rem;
    background: #2D2D2D;
    border: 2px solid #333;
    border-radius: 8px;
    color: #FFF;
    cursor: pointer;
    transition: all 0.2s;
  }

  .crypto-option:hover {
    border-color: #4ECDC4;
  }

  .crypto-option.selected {
    border-color: #4ECDC4;
    background: rgba(78, 205, 196, 0.1);
  }

  .crypto-conversion {
    background: #2D2D2D;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 2rem;
    text-align: center;
  }

  .conversion-rate {
    margin: 0;
    font-size: 1.125rem;
    color: #4ECDC4;
  }

  .wallet-address h4 {
    margin: 0 0 1rem 0;
  }

  .address-box {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #2D2D2D;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .address-box code {
    flex: 1;
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    color: #4ECDC4;
    word-break: break-all;
  }

  .copy-btn {
    background: #333;
    border: none;
    color: #FFF;
    padding: 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .copy-btn:hover {
    background: #4ECDC4;
    color: #0A0A0A;
  }

  .crypto-note {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #999;
    font-size: 0.875rem;
    margin-bottom: 2rem;
  }

  .crypto-qr {
    text-align: center;
  }

  .crypto-qr img {
    border-radius: 8px;
  }

  /* SEPA Notice */
  .sepa-notice {
    background: #1A1A1A;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    color: #999;
  }

  /* Security Badge */
  .security-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem;
    color: #666;
    font-size: 0.875rem;
  }

  .security-badge svg {
    color: #4ECDC4;
  }

  /* Transaction History */
  .transaction-history {
    max-width: 600px;
    margin: 2rem auto;
    padding: 0 2rem;
  }

  .transaction-history h3 {
    margin: 0 0 1.5rem 0;
  }

  .transactions-list {
    background: #1A1A1A;
    border: 1px solid #333;
    border-radius: 12px;
    overflow: hidden;
  }

  .transaction-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #222;
    transition: background 0.2s;
  }

  .transaction-item:last-child {
    border-bottom: none;
  }

  .transaction-item:hover {
    background: rgba(78, 205, 196, 0.05);
  }

  .tx-icon {
    flex-shrink: 0;
  }

  .tx-details {
    flex: 1;
  }

  .tx-description {
    margin: 0 0 0.25rem 0;
    font-weight: 500;
  }

  .tx-meta {
    margin: 0;
    font-size: 0.875rem;
    color: #666;
  }

  .tx-amount {
    text-align: right;
    font-weight: 600;
  }

  .tx-amount .refund {
    color: #FF6B6B;
  }

  /* Success Screen */
  .payment-success {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: #0A0A0A;
  }

  .success-content {
    text-align: center;
    padding: 3rem;
    background: #1A1A1A;
    border: 1px solid #333;
    border-radius: 16px;
    max-width: 400px;
  }

  .success-icon {
    color: #4ECDC4;
    margin-bottom: 1.5rem;
  }

  .success-content h2 {
    margin: 0 0 1rem 0;
    font-size: 1.75rem;
  }

  .success-content p {
    margin: 0 0 2rem 0;
    color: #999;
  }

  .continue-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 2rem;
    background: #4ECDC4;
    color: #0A0A0A;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .continue-btn:hover {
    background: #44A3AA;
    transform: translateY(-1px);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .processor-header {
      padding: 1rem;
    }

    .payment-amount {
      margin: 1rem;
      padding: 2rem 1rem;
    }

    .amount-display .amount {
      font-size: 2.5rem;
    }

    .methods-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .twint-options {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .twint-divider {
      padding: 1rem 0;
    }

    .crypto-options {
      flex-direction: column;
    }

    .transaction-item {
      padding: 1rem;
    }
  }
`;

// Styles hinzufügen
const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

export default PaymentProcessor;