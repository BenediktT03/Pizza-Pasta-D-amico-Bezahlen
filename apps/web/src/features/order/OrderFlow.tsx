/**
 * EATECH Order Flow Component
 * 
 * Hauptkomponente für den Bestellprozess.
 * Verwaltet alle Schritte vom Warenkorb bis zur Bestätigung:
 * - Kundendaten-Eingabe
 * - Zahlungsmethoden-Auswahl
 * - Bestellbestätigung
 * - Echtzeit-Updates
 * - Mehrsprachigkeit
 * - Feature Flags
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  CreditCardIcon,
  UserIcon,
  ClockIcon,
  TruckIcon,
  DocumentTextIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
  DevicePhoneMobileIcon,
  QrCodeIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Core imports
import { useCart } from '@eatech/core/hooks/useCart';
import { useTruck } from '@eatech/core/hooks/useTruck';
import { useAuth } from '@eatech/core/hooks/useAuth';
import { useFeatureFlag } from '@eatech/core/hooks/useFeatureFlag';
import { swissPhoneNumber } from '@eatech/core/utils/validators';
import { formatPrice, formatOrderNumber } from '@eatech/core/utils/formatters';
import { Order, PaymentMethod } from '@eatech/types';

// UI imports
import {
  Button,
  Input,
  Card,
  Alert,
  Stepper,
  RadioGroup,
  Checkbox,
  Spinner,
  Modal,
  CountdownTimer
} from '@eatech/ui';

// Services
import { orderService } from '../../services/order.service';
import { paymentService } from '../../services/payment.service';
import { analyticsService } from '../../services/analytics.service';
import { notificationService } from '../../services/notification.service';

// Sub-components
import { CustomerInfoForm } from './components/CustomerInfoForm';
import { PaymentMethodSelector } from './components/PaymentMethodSelector';
import { OrderSummary } from './components/OrderSummary';
import { OrderConfirmation } from './components/OrderConfirmation';
import { OrderTracking } from './components/OrderTracking';

// Styles
import styles from './OrderFlow.module.css';

// Validation schema
const orderSchema = z.object({
  customerName: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  customerPhone: swissPhoneNumber,
  customerEmail: z.string().email().optional().or(z.literal('')),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions'
  }),
  newsletterConsent: z.boolean().optional(),
  saveDetails: z.boolean().optional()
});

type OrderFormData = z.infer<typeof orderSchema>;

interface OrderFlowProps {
  embedded?: boolean;
}

export const OrderFlow: React.FC<OrderFlowProps> = ({ embedded = false }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { truckId } = useParams<{ truckId: string }>();
  
  // Feature Flags
  const { enabled: qrPaymentEnabled } = useFeatureFlag('qr_payment');
  const { enabled: cryptoEnabled } = useFeatureFlag('crypto_payments');
  const { enabled: invoiceEnabled } = useFeatureFlag('invoice_generation');
  const { enabled: loyaltyEnabled } = useFeatureFlag('loyalty_system');
  const { enabled: realtimeTrackingEnabled } = useFeatureFlag('realtime_order_tracking');
  const { enabled: smsNotificationsEnabled } = useFeatureFlag('sms_notifications');
  const { enabled: preorderEnabled } = useFeatureFlag('preorder_system');
  
  // Hooks
  const { user, isAuthenticated } = useAuth();
  const { truck } = useTruck(truckId!);
  const { items, totalItems, clearCart } = useCart();
  
  // State from navigation
  const orderData = location.state?.orderData;
  
  // Local state
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  
  // Form
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    watch
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    mode: 'onChange',
    defaultValues: {
      customerName: user?.displayName || '',
      customerPhone: user?.phoneNumber || '',
      customerEmail: user?.email || '',
      acceptTerms: false,
      newsletterConsent: false,
      saveDetails: isAuthenticated
    }
  });
  
  const formValues = watch();
  
  // Steps configuration
  const steps = [
    {
      id: 'details',
      title: t('order.customerDetails'),
      icon: <UserIcon className="w-5 h-5" />,
      component: CustomerInfoStep
    },
    {
      id: 'payment',
      title: t('order.payment'),
      icon: <CreditCardIcon className="w-5 h-5" />,
      component: PaymentStep
    },
    {
      id: 'confirmation',
      title: t('order.confirmation'),
      icon: <CheckCircleIcon className="w-5 h-5" />,
      component: ConfirmationStep
    }
  ];
  
  // Check if we have order data
  useEffect(() => {
    if (!orderData || !items.length) {
      navigate('/menu');
    }
  }, [orderData, items, navigate]);
  
  // Auto-fill from saved user data
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.displayName) setValue('customerName', user.displayName);
      if (user.phoneNumber) setValue('customerPhone', user.phoneNumber);
      if (user.email) setValue('customerEmail', user.email);
    }
  }, [isAuthenticated, user, setValue]);
  
  // Handle step navigation
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      analyticsService.trackEvent('checkout_step_completed', {
        step: steps[currentStep].id,
        nextStep: steps[currentStep + 1].id
      });
    }
  };
  
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Handle order submission
  const handleOrderSubmit = async (data: OrderFormData) => {
    setIsProcessing(true);
    setPaymentError(null);
    
    try {
      // Create order
      const orderPayload = {
        truckId: truckId!,
        items: orderData.items,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail || undefined,
        orderType: orderData.orderType,
        scheduledFor: orderData.scheduledFor,
        tipAmount: orderData.totals.tipAmount,
        paymentMethod: selectedPaymentMethod,
        saveCustomerDetails: data.saveDetails
      };
      
      const createdOrder = await orderService.createOrder(orderPayload);
      
      // Process payment
      const paymentResult = await paymentService.processPayment({
        orderId: createdOrder.id,
        amount: createdOrder.totalAmount,
        method: selectedPaymentMethod,
        savePaymentMethod: data.saveDetails
      });
      
      if (paymentResult.status === 'succeeded') {
        // Update order status
        await orderService.updateOrderStatus(createdOrder.id, 'confirmed');
        
        // Set order for confirmation
        setOrder({
          ...createdOrder,
          paymentStatus: 'paid'
        });
        
        // Clear cart
        clearCart();
        
        // Track conversion
        analyticsService.trackConversion('order_completed', {
          orderId: createdOrder.id,
          amount: createdOrder.totalAmount,
          paymentMethod: selectedPaymentMethod,
          itemCount: totalItems
        });
        
        // Send notifications
        if (smsNotificationsEnabled && data.customerPhone) {
          await notificationService.sendOrderConfirmation(
            data.customerPhone,
            createdOrder.orderNumber
          );
        }
        
        // Move to confirmation
        handleNext();
      } else if (paymentResult.status === 'requires_action') {
        // Handle 3D Secure or other authentication
        window.location.href = paymentResult.actionUrl;
      } else {
        throw new Error(paymentResult.error || 'Payment failed');
      }
    } catch (error: any) {
      console.error('Order submission error:', error);
      setPaymentError(error.message || t('order.paymentError'));
      
      analyticsService.trackEvent('order_failed', {
        error: error.message,
        step: 'payment'
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle cancel
  const handleCancel = () => {
    analyticsService.trackEvent('order_cancelled', {
      step: steps[currentStep].id
    });
    navigate('/menu');
  };
  
  // Customer Info Step
  function CustomerInfoStep() {
    return (
      <div className={styles.stepContent}>
        <CustomerInfoForm
          control={control}
          errors={errors}
          isAuthenticated={isAuthenticated}
        />
        
        <div className={styles.termsSection}>
          <Controller
            name="acceptTerms"
            control={control}
            render={({ field }) => (
              <Checkbox
                {...field}
                label={
                  <span>
                    {t('order.acceptTerms')}{' '}
                    <a href="/terms" target="_blank" className="link">
                      {t('order.termsLink')}
                    </a>
                  </span>
                }
                error={errors.acceptTerms?.message}
              />
            )}
          />
          
          {loyaltyEnabled && (
            <Controller
              name="newsletterConsent"
              control={control}
              render={({ field }) => (
                <Checkbox
                  {...field}
                  label={t('order.newsletterConsent')}
                />
              )}
            />
          )}
          
          {isAuthenticated && (
            <Controller
              name="saveDetails"
              control={control}
              render={({ field }) => (
                <Checkbox
                  {...field}
                  label={t('order.saveDetailsForNext')}
                />
              )}
            />
          )}
        </div>
      </div>
    );
  }
  
  // Payment Step
  function PaymentStep() {
    const availablePaymentMethods: Array<{
      value: PaymentMethod;
      label: string;
      icon: React.ReactNode;
      description?: string;
    }> = [
      {
        value: 'card',
        label: t('payment.creditCard'),
        icon: <CreditCardIcon className="w-6 h-6" />,
        description: t('payment.cardDescription')
      },
      {
        value: 'twint',
        label: 'TWINT',
        icon: <DevicePhoneMobileIcon className="w-6 h-6" />,
        description: t('payment.twintDescription')
      }
    ];
    
    if (qrPaymentEnabled) {
      availablePaymentMethods.push({
        value: 'qr_bill',
        label: t('payment.qrBill'),
        icon: <QrCodeIcon className="w-6 h-6" />,
        description: t('payment.qrBillDescription')
      });
    }
    
    if (cryptoEnabled) {
      availablePaymentMethods.push({
        value: 'crypto',
        label: t('payment.crypto'),
        icon: <BanknotesIcon className="w-6 h-6" />,
        description: t('payment.cryptoDescription')
      });
    }
    
    return (
      <div className={styles.stepContent}>
        <PaymentMethodSelector
          methods={availablePaymentMethods}
          selectedMethod={selectedPaymentMethod}
          onSelect={setSelectedPaymentMethod}
        />
        
        {paymentError && (
          <Alert variant="error" className="mt-4">
            <ExclamationTriangleIcon className="w-5 h-5" />
            <span>{paymentError}</span>
          </Alert>
        )}
        
        <div className={styles.paymentInfo}>
          <Alert variant="info">
            <CheckCircleIcon className="w-5 h-5" />
            <span>{t('payment.securePayment')}</span>
          </Alert>
          
          {truck?.trial_ends_at && new Date(truck.trial_ends_at) > new Date() && (
            <Alert variant="success" className="mt-2">
              <span>{t('payment.trialPeriodInfo')}</span>
            </Alert>
          )}
        </div>
      </div>
    );
  }
  
  // Confirmation Step
  function ConfirmationStep() {
    if (!order) return null;
    
    return (
      <div className={styles.stepContent}>
        <OrderConfirmation
          order={order}
          onNewOrder={() => navigate('/menu')}
          showInvoiceOption={invoiceEnabled}
        />
        
        {realtimeTrackingEnabled && (
          <OrderTracking
            orderId={order.id}
            orderNumber={order.orderNumber}
          />
        )}
      </div>
    );
  }
  
  // Render current step
  const CurrentStepComponent = steps[currentStep].component;
  
  return (
    <div className={embedded ? styles.embeddedFlow : styles.orderFlow}>
      {/* Header */}
      <div className={styles.header}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCancelModal(true)}
          startIcon={<ArrowLeftIcon className="w-4 h-4" />}
        >
          {t('common.cancel')}
        </Button>
        
        <h1 className={styles.title}>
          {t('order.checkout')}
        </h1>
        
        <div className={styles.truckInfo}>
          <TruckIcon className="w-5 h-5" />
          <span>{truck?.name}</span>
        </div>
      </div>
      
      {/* Stepper */}
      <Stepper
        steps={steps}
        currentStep={currentStep}
        className={styles.stepper}
      />
      
      {/* Content */}
      <div className={styles.content}>
        <div className={styles.mainContent}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className={styles.stepCard}>
                <h2 className={styles.stepTitle}>
                  {steps[currentStep].title}
                </h2>
                
                <CurrentStepComponent />
              </Card>
            </motion.div>
          </AnimatePresence>
          
          {/* Navigation */}
          <div className={styles.navigation}>
            {currentStep > 0 && currentStep < steps.length - 1 && (
              <Button
                variant="secondary"
                onClick={handleBack}
                startIcon={<ArrowLeftIcon className="w-5 h-5" />}
              >
                {t('common.back')}
              </Button>
            )}
            
            {currentStep === 0 && (
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={!isValid}
                endIcon={<ArrowRightIcon className="w-5 h-5" />}
              >
                {t('order.continueToPayment')}
              </Button>
            )}
            
            {currentStep === 1 && (
              <Button
                variant="primary"
                onClick={handleSubmit(handleOrderSubmit)}
                disabled={isProcessing}
                loading={isProcessing}
                endIcon={<CheckCircleIcon className="w-5 h-5" />}
              >
                {t('order.placeOrder')}
              </Button>
            )}
          </div>
        </div>
        
        {/* Order Summary Sidebar */}
        <div className={styles.sidebar}>
          <OrderSummary
            items={items}
            totals={orderData?.totals}
            orderType={orderData?.orderType}
            scheduledTime={orderData?.scheduledFor}
          />
        </div>
      </div>
      
      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title={t('order.cancelOrder')}
      >
        <p className="text-gray-600 mb-6">
          {t('order.cancelConfirmation')}
        </p>
        <div className="flex gap-4">
          <Button
            variant="secondary"
            onClick={() => setShowCancelModal(false)}
            fullWidth
          >
            {t('common.no')}
          </Button>
          <Button
            variant="danger"
            onClick={handleCancel}
            fullWidth
          >
            {t('common.yes')}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

// Export
export default OrderFlow;