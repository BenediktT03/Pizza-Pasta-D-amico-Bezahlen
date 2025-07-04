/**
 * EATECH - Checkout Page
 * Version: 5.0.0
 * Description: Vollständiger Checkout-Prozess mit Lieferoptionen,
 *              Zahlungsmethoden und Bestellbestätigung
 * Author: EATECH Development Team
 * Last Modified: 2025-01-04
 * File Path: /src/pages/customer/Checkout.jsx
 */

// ============================================================================
// IMPORTS
// ============================================================================
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingCart,
    User,
    MapPin,
    CreditCard,
    Clock,
    Check,
    ChevronRight,
    ChevronLeft,
    AlertCircle,
    Phone,
    Mail,
    Calendar,
    MessageSquare,
    Plus,
    Minus,
    X,
    Percent,
    Gift,
    Truck,
    Store
} from 'lucide-react';

// Hooks & Contexts
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';

// Services
import { database, cloudFunctions } from '../../config/firebase';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Utils
import { formatCurrency, formatDateTime, formatPhoneNumber } from '../../utils/formatters';
import { validateEmail, validateSwissPhone, validateForm } from '../../utils/validation';
import { trackInteraction, logError } from '../../utils/monitoring';

// Components
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';

// Styles
import styles from './Checkout.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const CHECKOUT_STEPS = [
    { id: 'cart', label: 'Warenkorb', icon: ShoppingCart },
    { id: 'delivery', label: 'Lieferung', icon: MapPin },
    { id: 'payment', label: 'Zahlung', icon: CreditCard },
    { id: 'confirm', label: 'Bestätigung', icon: Check }
];

const DELIVERY_OPTIONS = {
    pickup: {
        label: 'Abholung',
        icon: Store,
        description: 'Im Restaurant abholen',
        fee: 0
    },
    delivery: {
        label: 'Lieferung',
        icon: Truck,
        description: 'An deine Adresse liefern',
        fee: 5.00
    }
};

const PAYMENT_METHODS = {
    card: {
        label: 'Kreditkarte',
        icon: CreditCard,
        description: 'Visa, Mastercard, American Express'
    },
    twint: {
        label: 'TWINT',
        icon: Phone,
        description: 'Schweizer Mobile Payment'
    },
    cash: {
        label: 'Barzahlung',
        icon: CreditCard,
        description: 'Bei Lieferung/Abholung'
    }
};

// Stripe configuration
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

// ============================================================================
// COMPONENT
// ============================================================================
const Checkout = () => {
    const navigate = useNavigate();
    const { user, userProfile } = useAuth();
    const { tenant } = useTenant();
    const {
        cartItems,
        subtotal,
        totalDiscount,
        tax,
        deliveryFee,
        total,
        minimumOrder,
        isMinimumOrderMet,
        notes,
        setNotes,
        selectedDeliveryTime,
        setSelectedDeliveryTime,
        clearCart,
        applyCoupon,
        removeCoupon,
        discounts
    } = useCart();
    
    // State
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Form State
    const [deliveryOption, setDeliveryOption] = useState('pickup');
    const [customerInfo, setCustomerInfo] = useState({
        name: userProfile?.displayName || '',
        email: userProfile?.email || '',
        phone: userProfile?.phoneNumber || ''
    });
    const [deliveryAddress, setDeliveryAddress] = useState({
        street: '',
        houseNumber: '',
        postalCode: '',
        city: '',
        floor: '',
        notes: ''
    });
    const [paymentMethod, setPaymentMethod] = useState('card');
    const [couponCode, setCouponCode] = useState('');
    const [showCouponInput, setShowCouponInput] = useState(false);
    const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
    const [orderConfirmation, setOrderConfirmation] = useState(null);
    
    // ============================================================================
    // EFFECTS
    // ============================================================================
    
    // Redirect if cart is empty
    useEffect(() => {
        if (cartItems.length === 0 && !orderConfirmation) {
            navigate('/');
        }
    }, [cartItems, navigate, orderConfirmation]);
    
    // Load available time slots
    useEffect(() => {
        loadAvailableTimeSlots();
    }, [deliveryOption]);
    
    // Track checkout progress
    useEffect(() => {
        trackInteraction('checkout_step', 'checkout', {
            step: CHECKOUT_STEPS[currentStep].id,
            step_number: currentStep + 1
        });
    }, [currentStep]);
    
    // ============================================================================
    // HELPERS
    // ============================================================================
    
    const loadAvailableTimeSlots = async () => {
        // Generiere verfügbare Zeitslots basierend auf aktueller Zeit
        const now = new Date();
        const slots = [];
        
        // Heute
        const todayStart = new Date(now);
        todayStart.setMinutes(Math.ceil(todayStart.getMinutes() / 15) * 15); // Runde auf 15 Min
        todayStart.setMinutes(todayStart.getMinutes() + 30); // Min. 30 Min Vorlaufzeit
        
        for (let i = 0; i < 8; i++) {
            const slotTime = new Date(todayStart);
            slotTime.setMinutes(todayStart.getMinutes() + (i * 15));
            
            if (slotTime.getHours() < 22) { // Bis 22:00
                slots.push({
                    date: slotTime.toISOString(),
                    label: `Heute, ${slotTime.toLocaleTimeString('de-CH', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    })}`
                });
            }
        }
        
        // Morgen
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(11, 0, 0, 0); // Ab 11:00
        
        for (let i = 0; i < 4; i++) {
            const slotTime = new Date(tomorrow);
            slotTime.setHours(11 + i * 2);
            
            slots.push({
                date: slotTime.toISOString(),
                label: `Morgen, ${slotTime.toLocaleTimeString('de-CH', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                })}`
            });
        }
        
        setAvailableTimeSlots(slots);
        
        // Set default if not selected
        if (!selectedDeliveryTime && slots.length > 0) {
            setSelectedDeliveryTime(slots[0].date);
        }
    };
    
    const canProceedToNextStep = () => {
        switch (currentStep) {
            case 0: // Cart
                return cartItems.length > 0 && isMinimumOrderMet;
                
            case 1: // Delivery
                const infoValid = validateEmail(customerInfo.email).isValid &&
                                 validateSwissPhone(customerInfo.phone).isValid &&
                                 customerInfo.name.length > 2;
                
                if (deliveryOption === 'delivery') {
                    return infoValid &&
                           deliveryAddress.street.length > 2 &&
                           deliveryAddress.houseNumber.length > 0 &&
                           deliveryAddress.postalCode.length === 4 &&
                           deliveryAddress.city.length > 2;
                }
                
                return infoValid && selectedDeliveryTime;
                
            case 2: // Payment
                return paymentMethod !== null;
                
            default:
                return true;
        }
    };
    
    const nextStep = () => {
        if (canProceedToNextStep() && currentStep < CHECKOUT_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
            window.scrollTo(0, 0);
        }
    };
    
    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
            window.scrollTo(0, 0);
        }
    };
    
    // ============================================================================
    // ORDER SUBMISSION
    // ============================================================================
    
    const submitOrder = async () => {
        setLoading(true);
        setError(null);
        
        try {
            // Prepare order data
            const orderData = {
                tenantId: tenant.id,
                customerId: user?.uid || null,
                customerInfo,
                items: cartItems.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    options: item.options || {}
                })),
                deliveryOption,
                deliveryAddress: deliveryOption === 'delivery' ? deliveryAddress : null,
                deliveryTime: selectedDeliveryTime,
                paymentMethod,
                notes,
                pricing: {
                    subtotal,
                    discount: totalDiscount,
                    tax,
                    deliveryFee: deliveryOption === 'delivery' ? DELIVERY_OPTIONS.delivery.fee : 0,
                    total
                },
                discounts: discounts.map(d => d.code),
                status: 'pending',
                createdAt: Date.now()
            };
            
            // Process payment if card
            let paymentIntent = null;
            if (paymentMethod === 'card') {
                const { data } = await cloudFunctions.createPaymentIntent({
                    amount: Math.round(total * 100), // Cents
                    currency: 'chf',
                    orderId: `temp-${Date.now()}`
                });
                
                paymentIntent = data.paymentIntent;
            }
            
            // Create order
            const { data: orderResult } = await cloudFunctions.processOrder({
                orderData,
                paymentIntentId: paymentIntent?.id
            });
            
            // Clear cart
            await clearCart();
            
            // Set confirmation
            setOrderConfirmation({
                orderId: orderResult.orderId,
                orderNumber: orderResult.orderNumber,
                estimatedTime: orderResult.estimatedTime
            });
            
            // Track conversion
            trackInteraction('purchase', 'checkout', {
                order_id: orderResult.orderId,
                value: total,
                currency: 'CHF',
                items: cartItems.length
            });
            
            // Navigate to confirmation
            setCurrentStep(3);
            
        } catch (err) {
            logError('Checkout.submitOrder', err);
            setError('Bestellung konnte nicht abgeschlossen werden. Bitte versuche es erneut.');
        } finally {
            setLoading(false);
        }
    };
    
    // ============================================================================
    // RENDER STEPS
    // ============================================================================
    
    const renderCartStep = () => (
        <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>Deine Bestellung</h2>
            
            <div className={styles.cartItems}>
                {cartItems.map((item, index) => (
                    <motion.div
                        key={`${item.id}-${index}`}
                        className={styles.cartItem}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <div className={styles.itemInfo}>
                            <h4>{item.name}</h4>
                            {item.options && Object.entries(item.options).map(([key, value]) => (
                                <span key={key} className={styles.itemOption}>
                                    {key}: {value}
                                </span>
                            ))}
                        </div>
                        
                        <div className={styles.itemQuantity}>
                            <span>{item.quantity}x</span>
                        </div>
                        
                        <div className={styles.itemPrice}>
                            {formatCurrency(item.price * item.quantity)}
                        </div>
                    </motion.div>
                ))}
            </div>
            
            {/* Coupon Section */}
            <div className={styles.couponSection}>
                {!showCouponInput ? (
                    <button
                        className={styles.couponToggle}
                        onClick={() => setShowCouponInput(true)}
                    >
                        <Gift size={20} />
                        Gutscheincode hinzufügen
                    </button>
                ) : (
                    <div className={styles.couponInput}>
                        <input
                            type="text"
                            placeholder="Gutscheincode eingeben"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    applyCoupon(couponCode);
                                    setCouponCode('');
                                }
                            }}
                        />
                        <button
                            onClick={() => {
                                applyCoupon(couponCode);
                                setCouponCode('');
                            }}
                        >
                            Anwenden
                        </button>
                    </div>
                )}
                
                {/* Applied Discounts */}
                {discounts.length > 0 && (
                    <div className={styles.appliedDiscounts}>
                        {discounts.map(discount => (
                            <div key={discount.code} className={styles.discountTag}>
                                <Percent size={16} />
                                {discount.code}
                                <button onClick={() => removeCoupon(discount.code)}>
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {/* Order Notes */}
            <div className={styles.notesSection}>
                <label>
                    <MessageSquare size={20} />
                    Anmerkungen zur Bestellung
                </label>
                <textarea
                    placeholder="Allergien, spezielle Wünsche..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                />
            </div>
            
            {/* Price Summary */}
            <div className={styles.priceSummary}>
                <div className={styles.priceRow}>
                    <span>Zwischensumme</span>
                    <span>{formatCurrency(subtotal)}</span>
                </div>
                
                {totalDiscount > 0 && (
                    <div className={styles.priceRow + ' ' + styles.discount}>
                        <span>Rabatt</span>
                        <span>-{formatCurrency(totalDiscount)}</span>
                    </div>
                )}
                
                <div className={styles.priceRow}>
                    <span>MwSt. (2.6%)</span>
                    <span>{formatCurrency(tax)}</span>
                </div>
                
                <div className={styles.priceRow + ' ' + styles.total}>
                    <span>Gesamt</span>
                    <span>{formatCurrency(total)}</span>
                </div>
            </div>
            
            {!isMinimumOrderMet && (
                <div className={styles.minimumOrderWarning}>
                    <AlertCircle size={20} />
                    Mindestbestellwert: {formatCurrency(minimumOrder)}
                </div>
            )}
        </div>
    );
    
    const renderDeliveryStep = () => (
        <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>Lieferdetails</h2>
            
            {/* Customer Info */}
            <div className={styles.section}>
                <h3>Kontaktinformationen</h3>
                
                <div className={styles.formGroup}>
                    <label>
                        <User size={20} />
                        Name
                    </label>
                    <input
                        type="text"
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo({
                            ...customerInfo,
                            name: e.target.value
                        })}
                        placeholder="Max Mustermann"
                    />
                </div>
                
                <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                        <label>
                            <Mail size={20} />
                            E-Mail
                        </label>
                        <input
                            type="email"
                            value={customerInfo.email}
                            onChange={(e) => setCustomerInfo({
                                ...customerInfo,
                                email: e.target.value
                            })}
                            placeholder="max@example.ch"
                        />
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label>
                            <Phone size={20} />
                            Telefon
                        </label>
                        <input
                            type="tel"
                            value={customerInfo.phone}
                            onChange={(e) => setCustomerInfo({
                                ...customerInfo,
                                phone: e.target.value
                            })}
                            placeholder="079 123 45 67"
                        />
                    </div>
                </div>
            </div>
            
            {/* Delivery Option */}
            <div className={styles.section}>
                <h3>Lieferoption</h3>
                
                <div className={styles.deliveryOptions}>
                    {Object.entries(DELIVERY_OPTIONS).map(([key, option]) => {
                        const Icon = option.icon;
                        return (
                            <label
                                key={key}
                                className={`${styles.deliveryOption} ${
                                    deliveryOption === key ? styles.selected : ''
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="deliveryOption"
                                    value={key}
                                    checked={deliveryOption === key}
                                    onChange={(e) => setDeliveryOption(e.target.value)}
                                />
                                <Icon size={24} />
                                <div>
                                    <h4>{option.label}</h4>
                                    <p>{option.description}</p>
                                    {option.fee > 0 && (
                                        <span className={styles.fee}>
                                            +{formatCurrency(option.fee)}
                                        </span>
                                    )}
                                </div>
                            </label>
                        );
                    })}
                </div>
            </div>
            
            {/* Delivery Address (if delivery selected) */}
            {deliveryOption === 'delivery' && (
                <motion.div
                    className={styles.section}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                >
                    <h3>Lieferadresse</h3>
                    
                    <div className={styles.formRow}>
                        <div className={styles.formGroup + ' ' + styles.flexGrow}>
                            <label>Straße</label>
                            <input
                                type="text"
                                value={deliveryAddress.street}
                                onChange={(e) => setDeliveryAddress({
                                    ...deliveryAddress,
                                    street: e.target.value
                                })}
                                placeholder="Bahnhofstrasse"
                            />
                        </div>
                        
                        <div className={styles.formGroup}>
                            <label>Nr.</label>
                            <input
                                type="text"
                                value={deliveryAddress.houseNumber}
                                onChange={(e) => setDeliveryAddress({
                                    ...deliveryAddress,
                                    houseNumber: e.target.value
                                })}
                                placeholder="42"
                            />
                        </div>
                    </div>
                    
                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label>PLZ</label>
                            <input
                                type="text"
                                value={deliveryAddress.postalCode}
                                onChange={(e) => setDeliveryAddress({
                                    ...deliveryAddress,
                                    postalCode: e.target.value
                                })}
                                placeholder="8001"
                                maxLength="4"
                            />
                        </div>
                        
                        <div className={styles.formGroup + ' ' + styles.flexGrow}>
                            <label>Ort</label>
                            <input
                                type="text"
                                value={deliveryAddress.city}
                                onChange={(e) => setDeliveryAddress({
                                    ...deliveryAddress,
                                    city: e.target.value
                                })}
                                placeholder="Zürich"
                            />
                        </div>
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label>Stockwerk / Zusatzinfo (optional)</label>
                        <input
                            type="text"
                            value={deliveryAddress.floor}
                            onChange={(e) => setDeliveryAddress({
                                ...deliveryAddress,
                                floor: e.target.value
                            })}
                            placeholder="3. Stock, Klingel Mustermann"
                        />
                    </div>
                </motion.div>
            )}
            
            {/* Time Selection */}
            <div className={styles.section}>
                <h3>
                    <Clock size={20} />
                    Gewünschte Zeit
                </h3>
                
                <div className={styles.timeSlots}>
                    {availableTimeSlots.map(slot => (
                        <label
                            key={slot.date}
                            className={`${styles.timeSlot} ${
                                selectedDeliveryTime === slot.date ? styles.selected : ''
                            }`}
                        >
                            <input
                                type="radio"
                                name="deliveryTime"
                                value={slot.date}
                                checked={selectedDeliveryTime === slot.date}
                                onChange={(e) => setSelectedDeliveryTime(e.target.value)}
                            />
                            {slot.label}
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
    
    const renderPaymentStep = () => (
        <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>Zahlungsmethode</h2>
            
            <div className={styles.paymentMethods}>
                {Object.entries(PAYMENT_METHODS).map(([key, method]) => {
                    const Icon = method.icon;
                    const isAvailable = key !== 'cash' || deliveryOption === 'delivery';
                    
                    return (
                        <label
                            key={key}
                            className={`${styles.paymentMethod} ${
                                paymentMethod === key ? styles.selected : ''
                            } ${!isAvailable ? styles.disabled : ''}`}
                        >
                            <input
                                type="radio"
                                name="paymentMethod"
                                value={key}
                                checked={paymentMethod === key}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                disabled={!isAvailable}
                            />
                            <Icon size={24} />
                            <div>
                                <h4>{method.label}</h4>
                                <p>{method.description}</p>
                            </div>
                        </label>
                    );
                })}
            </div>
            
            {/* Card Payment Form */}
            {paymentMethod === 'card' && (
                <Elements stripe={stripePromise}>
                    <CardPaymentForm />
                </Elements>
            )}
            
            {/* TWINT QR Code */}
            {paymentMethod === 'twint' && (
                <div className={styles.twintSection}>
                    <p>Nach Bestellbestätigung erhältst du einen QR-Code für die TWINT-Zahlung.</p>
                </div>
            )}
            
            {/* Cash Info */}
            {paymentMethod === 'cash' && (
                <div className={styles.cashInfo}>
                    <AlertCircle size={20} />
                    <p>Bitte halte den Betrag von {formatCurrency(total)} passend bereit.</p>
                </div>
            )}
        </div>
    );
    
    const renderConfirmationStep = () => (
        <div className={styles.stepContent}>
            <motion.div
                className={styles.confirmation}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                <div className={styles.confirmationIcon}>
                    <Check size={48} />
                </div>
                
                <h2>Bestellung erfolgreich!</h2>
                
                {orderConfirmation && (
                    <>
                        <p className={styles.orderNumber}>
                            Bestellnummer: <strong>{orderConfirmation.orderNumber}</strong>
                        </p>
                        
                        <p className={styles.estimatedTime}>
                            Voraussichtliche {deliveryOption === 'delivery' ? 'Lieferzeit' : 'Abholzeit'}:
                            <br />
                            <strong>{formatDateTime(orderConfirmation.estimatedTime)}</strong>
                        </p>
                        
                        <p>
                            Eine Bestätigung wurde an <strong>{customerInfo.email}</strong> gesendet.
                        </p>
                        
                        <div className={styles.confirmationActions}>
                            <button
                                className={styles.primaryButton}
                                onClick={() => navigate(`/order-status/${orderConfirmation.orderId}`)}
                            >
                                Bestellung verfolgen
                            </button>
                            
                            <button
                                className={styles.secondaryButton}
                                onClick={() => navigate('/')}
                            >
                                Neue Bestellung
                            </button>
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
    
    // ============================================================================
    // MAIN RENDER
    // ============================================================================
    
    return (
        <div className={styles.checkout}>
            {/* Progress Bar */}
            <div className={styles.progressBar}>
                {CHECKOUT_STEPS.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = index === currentStep;
                    const isCompleted = index < currentStep;
                    
                    return (
                        <div
                            key={step.id}
                            className={`${styles.progressStep} ${
                                isActive ? styles.active : ''
                            } ${isCompleted ? styles.completed : ''}`}
                        >
                            <div className={styles.stepIcon}>
                                <Icon size={20} />
                            </div>
                            <span className={styles.stepLabel}>{step.label}</span>
                            {index < CHECKOUT_STEPS.length - 1 && (
                                <div className={styles.stepConnector} />
                            )}
                        </div>
                    );
                })}
            </div>
            
            {/* Content */}
            <div className={styles.content}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {currentStep === 0 && renderCartStep()}
                        {currentStep === 1 && renderDeliveryStep()}
                        {currentStep === 2 && renderPaymentStep()}
                        {currentStep === 3 && renderConfirmationStep()}
                    </motion.div>
                </AnimatePresence>
                
                {/* Error Message */}
                {error && (
                    <div className={styles.error}>
                        <AlertCircle size={20} />
                        {error}
                    </div>
                )}
                
                {/* Navigation */}
                {currentStep < 3 && (
                    <div className={styles.navigation}>
                        {currentStep > 0 && (
                            <button
                                className={styles.backButton}
                                onClick={prevStep}
                                disabled={loading}
                            >
                                <ChevronLeft size={20} />
                                Zurück
                            </button>
                        )}
                        
                        {currentStep < 2 ? (
                            <button
                                className={styles.nextButton}
                                onClick={nextStep}
                                disabled={!canProceedToNextStep() || loading}
                            >
                                Weiter
                                <ChevronRight size={20} />
                            </button>
                        ) : (
                            <button
                                className={styles.submitButton}
                                onClick={submitOrder}
                                disabled={loading}
                            >
                                {loading ? (
                                    <LoadingSpinner size="small" />
                                ) : (
                                    <>
                                        Bestellung abschließen
                                        <Check size={20} />
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// CARD PAYMENT COMPONENT
// ============================================================================
const CardPaymentForm = () => {
    const stripe = useStripe();
    const elements = useElements();
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(false);
    
    const handleSubmit = async (event) => {
        event.preventDefault();
        
        if (!stripe || !elements) return;
        
        setProcessing(true);
        
        const card = elements.getElement(CardElement);
        
        if (card) {
            const { error } = await stripe.createToken(card);
            
            if (error) {
                setError(error.message);
                setProcessing(false);
            } else {
                // Token will be used in submitOrder
                setProcessing(false);
            }
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className={styles.cardForm}>
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
            
            {error && (
                <div className={styles.cardError}>
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}
            
            <p className={styles.securePayment}>
                <CreditCard size={16} />
                Sichere Zahlung mit Stripe
            </p>
        </form>
    );
};

// ============================================================================
// EXPORT
// ============================================================================
export default Checkout;