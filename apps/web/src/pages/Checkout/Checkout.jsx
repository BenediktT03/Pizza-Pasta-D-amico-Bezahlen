/**
 * EATECH - Customer Checkout
 * Version: 3.0.0
 * Description: Checkout-Prozess ohne Bargeld-Option mit Lazy Loading
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/web/src/pages/Checkout/Checkout.jsx
 * 
 * Changes: Cash payment removed, lazy loading implemented
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, Smartphone, FileText, 
  ChevronLeft, ShoppingCart, Clock,
  MapPin, Phone, Mail, User,
  AlertCircle, CheckCircle, Info
} from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Checkout.module.css';

// Lazy loaded components
const PaymentMethodSelector = lazy(() => import('./components/PaymentMethodSelector'));
const OrderSummary = lazy(() => import('./components/OrderSummary'));
const ContactForm = lazy(() => import('./components/ContactForm'));
const PaymentProcessor = lazy(() => import('./components/PaymentProcessor'));

// Lazy loaded services
const PaymentService = lazy(() => import('../../services/PaymentService'));
const OrderService = lazy(() => import('../../services/OrderService'));

const LoadingSpinner = () => (
  <div className={styles.loadingContainer}>
    <div className={styles.spinner} />
  </div>
);

const PAYMENT_METHODS = {
  card: {
    id: 'card',
    name: 'Kreditkarte',
    icon: CreditCard,
    description: 'Visa, Mastercard, Amex'
  },
  twint: {
    id: 'twint',
    name: 'TWINT',
    icon: Smartphone,
    description: 'Bezahle mit deinem Smartphone'
  },
  invoice: {
    id: 'invoice',
    name: 'Rechnung',
    icon: FileText,
    description: 'Auf Rechnung (nur für Firmenkunden)'
  }
};

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, totalAmount, clearCart } = useCart();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    notes: '',
    paymentMethod: 'card'
  });
  
  const [errors, setErrors] = useState({});
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [servicesLoaded, setServicesLoaded] = useState(false);

  const commission = useMemo(() => totalAmount * 0.03, [totalAmount]);
  const finalAmount = useMemo(() => totalAmount + commission, [totalAmount, commission]);

  useEffect(() => {
    if (cart.length === 0) {
      navigate('/menu');
    }
  }, [cart, navigate]);

  useEffect(() => {
    // Preload critical services
    Promise.all([
      import('../../services/PaymentService'),
      import('../../services/OrderService')
    ]).then(() => {
      setServicesLoaded(true);
    });
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name ist erforderlich';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-Mail ist erforderlich';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Ungültige E-Mail-Adresse';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefonnummer ist erforderlich';
    } else if (!/^(\+41|0041|0)?[1-9]\d{8}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Ungültige Schweizer Telefonnummer';
    }

    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Bitte wähle eine Zahlungsmethode';
    }

    if (formData.paymentMethod === 'invoice' && !user?.isB2B) {
      newErrors.paymentMethod = 'Rechnung nur für Firmenkunden verfügbar';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, user]);

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  }, [errors]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validateForm() || !servicesLoaded) {
      return;
    }

    setProcessing(true);
    setPaymentError(null);

    try {
      const [PaymentServiceModule, OrderServiceModule] = await Promise.all([
        import('../../services/PaymentService'),
        import('../../services/OrderService')
      ]);

      const PaymentService = PaymentServiceModule.default;
      const OrderService = OrderServiceModule.default;

      const orderData = {
        customer: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone
        },
        items: cart,
        subtotal: totalAmount,
        commission: commission,
        total: finalAmount,
        notes: formData.notes,
        paymentMethod: formData.paymentMethod
      };

      const order = await OrderService.createOrder(orderData);

      if (formData.paymentMethod === 'card') {
        const paymentResult = await PaymentService.processCardPayment({
          orderId: order.id,
          amount: finalAmount
        });

        if (paymentResult.success) {
          clearCart();
          navigate(`/order-success/${order.id}`);
        } else {
          throw new Error(paymentResult.error || 'Zahlung fehlgeschlagen');
        }
      } else if (formData.paymentMethod === 'twint') {
        const twintResult = await PaymentService.processTwintPayment({
          orderId: order.id,
          amount: finalAmount,
          phone: formData.phone
        });

        if (twintResult.success) {
          clearCart();
          navigate(`/order-success/${order.id}`);
        } else {
          throw new Error(twintResult.error || 'TWINT-Zahlung fehlgeschlagen');
        }
      } else if (formData.paymentMethod === 'invoice') {
        await OrderService.updateOrderStatus(order.id, 'pending_payment');
        clearCart();
        navigate(`/order-success/${order.id}?invoice=true`);
      }

      if (window.Sentry) {
        window.Sentry.captureMessage('Order completed successfully', 'info', {
          extra: { orderId: order.id, method: formData.paymentMethod }
        });
      }
    } catch (error) {
      console.error('Checkout error:', error);
      setPaymentError(error.message || 'Ein Fehler ist aufgetreten');
      
      if (window.Sentry) {
        window.Sentry.captureException(error);
      }
    } finally {
      setProcessing(false);
    }
  }, [formData, cart, totalAmount, commission, finalAmount, validateForm, clearCart, navigate, servicesLoaded]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => navigate('/cart')} className={styles.backButton}>
          <ChevronLeft size={20} />
          Zurück zum Warenkorb
        </button>
        <h1>Checkout</h1>
      </div>

      <div className={styles.content}>
        <div className={styles.mainSection}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <Suspense fallback={<LoadingSpinner />}>
              <ContactForm
                formData={formData}
                errors={errors}
                onChange={handleInputChange}
              />
            </Suspense>

            <Suspense fallback={<LoadingSpinner />}>
              <PaymentMethodSelector
                selectedMethod={formData.paymentMethod}
                onChange={(method) => handleInputChange('paymentMethod', method)}
                errors={errors}
                isB2B={user?.isB2B}
                paymentMethods={PAYMENT_METHODS}
              />
            </Suspense>

            <section className={styles.section}>
              <h2>Bemerkungen</h2>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Spezielle Wünsche oder Anmerkungen..."
                rows={3}
                className={styles.textarea}
              />
            </section>

            {paymentError && (
              <div className={styles.errorAlert}>
                <AlertCircle size={18} />
                {paymentError}
              </div>
            )}

            <button
              type="submit"
              className={styles.submitButton}
              disabled={processing || cart.length === 0 || !servicesLoaded}
            >
              {processing ? (
                <>
                  <div className={styles.spinner} />
                  Verarbeite Zahlung...
                </>
              ) : (
                <>
                  Jetzt bezahlen
                  <span className={styles.amount}>CHF {finalAmount.toFixed(2)}</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className={styles.sidebar}>
          <Suspense fallback={<LoadingSpinner />}>
            <OrderSummary
              cart={cart}
              subtotal={totalAmount}
              commission={commission}
              total={finalAmount}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

// Fallback components for code splitting
export const ContactFormComponent = ({ formData, errors, onChange }) => (
  <section className={styles.section}>
    <h2>Kontaktinformationen</h2>
    
    <div className={styles.formGroup}>
      <label htmlFor="name">
        <User size={18} />
        Name
      </label>
      <input
        type="text"
        id="name"
        value={formData.name}
        onChange={(e) => onChange('name', e.target.value)}
        className={errors.name ? styles.error : ''}
        placeholder="Max Mustermann"
      />
      {errors.name && <span className={styles.errorMessage}>{errors.name}</span>}
    </div>

    <div className={styles.formGroup}>
      <label htmlFor="email">
        <Mail size={18} />
        E-Mail
      </label>
      <input
        type="email"
        id="email"
        value={formData.email}
        onChange={(e) => onChange('email', e.target.value)}
        className={errors.email ? styles.error : ''}
        placeholder="max@beispiel.ch"
      />
      {errors.email && <span className={styles.errorMessage}>{errors.email}</span>}
    </div>

    <div className={styles.formGroup}>
      <label htmlFor="phone">
        <Phone size={18} />
        Telefon
      </label>
      <input
        type="tel"
        id="phone"
        value={formData.phone}
        onChange={(e) => onChange('phone', e.target.value)}
        className={errors.phone ? styles.error : ''}
        placeholder="+41 79 123 45 67"
      />
      {errors.phone && <span className={styles.errorMessage}>{errors.phone}</span>}
    </div>
  </section>
);

export const PaymentMethodSelectorComponent = ({ selectedMethod, onChange, errors, isB2B, paymentMethods }) => (
  <section className={styles.section}>
    <h2>Zahlungsmethode</h2>
    {errors.paymentMethod && (
      <div className={styles.errorAlert}>
        <AlertCircle size={18} />
        {errors.paymentMethod}
      </div>
    )}
    
    <div className={styles.paymentMethods}>
      {Object.values(paymentMethods).map(method => (
        <label
          key={method.id}
          className={`${styles.paymentMethod} ${
            selectedMethod === method.id ? styles.selected : ''
          } ${method.id === 'invoice' && !isB2B ? styles.disabled : ''}`}
        >
          <input
            type="radio"
            name="paymentMethod"
            value={method.id}
            checked={selectedMethod === method.id}
            onChange={(e) => onChange(e.target.value)}
            disabled={method.id === 'invoice' && !isB2B}
          />
          <div className={styles.methodContent}>
            <method.icon size={24} />
            <div>
              <h3>{method.name}</h3>
              <p>{method.description}</p>
            </div>
          </div>
        </label>
      ))}
    </div>
  </section>
);

export const OrderSummaryComponent = ({ cart, subtotal, commission, total }) => (
  <div className={styles.orderSummary}>
    <h2>Bestellübersicht</h2>
    
    <div className={styles.items}>
      {cart.map((item, index) => (
        <div key={index} className={styles.item}>
          <div className={styles.itemInfo}>
            <h4>{item.name}</h4>
            <p>{item.quantity}x</p>
          </div>
          <span className={styles.itemPrice}>
            CHF {(item.price * item.quantity).toFixed(2)}
          </span>
        </div>
      ))}
    </div>

    <div className={styles.totals}>
      <div className={styles.totalRow}>
        <span>Zwischensumme</span>
        <span>CHF {subtotal.toFixed(2)}</span>
      </div>
      <div className={styles.totalRow}>
        <span>Service-Gebühr (3%)</span>
        <span>CHF {commission.toFixed(2)}</span>
      </div>
      <div className={`${styles.totalRow} ${styles.finalTotal}`}>
        <span>Gesamt</span>
        <span>CHF {total.toFixed(2)}</span>
      </div>
    </div>

    <div className={styles.info}>
      <Info size={16} />
      <p>Die Bestellung kann nach der Zahlung nicht mehr storniert werden.</p>
    </div>
  </div>
);

export default Checkout;