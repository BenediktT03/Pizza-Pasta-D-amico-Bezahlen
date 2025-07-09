// Checkout Page for Customer
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components/layout/Layout';
import { OrderFlow } from '../features/order/OrderFlow';
import { PaymentMethods } from '../features/payment/PaymentMethods';
import { useCartStore } from '../stores/cart.store';
import { useOrderStore } from '../stores/order.store';
import { Card, Button, Input, Alert } from '@eatech/ui';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const CheckoutPage: React.FC = () => {
  const { truckId } = useParams<{ truckId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { createOrder, loading, error } = useOrderStore();
  
  const [step, setStep] = useState<'details' | 'payment' | 'confirmation'>('details');
  const [customerData, setCustomerData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [orderNumber, setOrderNumber] = useState<string>('');

  useEffect(() => {
    if (items.length === 0 && step !== 'confirmation') {
      navigate(`/${truckId}/menu`);
    }
  }, [items, truckId, navigate, step]);

  const handleCustomerSubmit = () => {
    if (!customerData.name || !customerData.phone) {
      return;
    }
    setStep('payment');
  };

  const handlePaymentComplete = async (paymentIntentId: string) => {
    try {
      const order = await createOrder({
        truckId: truckId!,
        items: items.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          modifiers: item.modifiers || [],
          specialInstructions: item.specialInstructions
        })),
        customerName: customerData.name,
        customerPhone: customerData.phone,
        customerEmail: customerData.email,
        notes: customerData.notes,
        paymentMethod,
        paymentIntentId,
        totalAmount: getTotalPrice()
      });

      setOrderNumber(order.orderNumber);
      clearCart();
      setStep('confirmation');
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  if (!truckId) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('errors.noTruckId')}
          </h1>
        </div>
      </Layout>
    );
  }

  const totalPrice = getTotalPrice();

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate(`/${truckId}/menu`)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span>{t('checkout.backToMenu')}</span>
            </button>
            
            <h1 className="text-3xl font-bold text-gray-900">
              {t('checkout.title')}
            </h1>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className={`flex items-center ${step === 'details' ? 'text-primary' : 'text-gray-400'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  step === 'details' ? 'bg-primary text-white' : 'bg-gray-200'
                }`}>
                  1
                </div>
                <span className="ml-2 font-medium">{t('checkout.details')}</span>
              </div>
              
              <div className={`flex-1 h-1 mx-4 ${
                step !== 'details' ? 'bg-primary' : 'bg-gray-200'
              }`} />
              
              <div className={`flex items-center ${
                step === 'payment' ? 'text-primary' : step === 'confirmation' ? 'text-green-600' : 'text-gray-400'
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  step === 'payment' ? 'bg-primary text-white' : 
                  step === 'confirmation' ? 'bg-green-600 text-white' : 'bg-gray-200'
                }`}>
                  2
                </div>
                <span className="ml-2 font-medium">{t('checkout.payment')}</span>
              </div>
              
              <div className={`flex-1 h-1 mx-4 ${
                step === 'confirmation' ? 'bg-green-600' : 'bg-gray-200'
              }`} />
              
              <div className={`flex items-center ${
                step === 'confirmation' ? 'text-green-600' : 'text-gray-400'
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  step === 'confirmation' ? 'bg-green-600 text-white' : 'bg-gray-200'
                }`}>
                  3
                </div>
                <span className="ml-2 font-medium">{t('checkout.confirmation')}</span>
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="error" className="mb-6">
              {error}
            </Alert>
          )}

          {/* Content based on step */}
          {step === 'details' && (
            <div className="space-y-6">
              {/* Order Summary */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">{t('checkout.orderSummary')}</h2>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={`${item.product.id}-${item.modifiers?.join('-')}`} className="flex justify-between">
                      <div>
                        <p className="font-medium">
                          {item.quantity}x {item.product.name[t('common.language')]}
                        </p>
                        {item.modifiers && item.modifiers.length > 0 && (
                          <p className="text-sm text-gray-600">
                            {item.modifiers.join(', ')}
                          </p>
                        )}
                        {item.specialInstructions && (
                          <p className="text-sm text-gray-600 italic">
                            {item.specialInstructions}
                          </p>
                        )}
                      </div>
                      <p className="font-medium">
                        CHF {((item.product.price * item.quantity) / 100).toFixed(2)}
                      </p>
                    </div>
                  ))}
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-bold text-lg">
                      <span>{t('checkout.total')}</span>
                      <span>CHF {(totalPrice / 100).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Customer Details */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">{t('checkout.customerDetails')}</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('checkout.name')} *
                    </label>
                    <Input
                      type="text"
                      value={customerData.name}
                      onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                      placeholder={t('checkout.namePlaceholder')}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('checkout.phone')} *
                    </label>
                    <Input
                      type="tel"
                      value={customerData.phone}
                      onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                      placeholder="+41 79 123 45 67"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('checkout.email')}
                    </label>
                    <Input
                      type="email"
                      value={customerData.email}
                      onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                      placeholder={t('checkout.emailPlaceholder')}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('checkout.notes')}
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={3}
                      value={customerData.notes}
                      onChange={(e) => setCustomerData({ ...customerData, notes: e.target.value })}
                      placeholder={t('checkout.notesPlaceholder')}
                    />
                  </div>
                </div>
              </Card>

              <Button
                variant="primary"
                size="large"
                fullWidth
                onClick={handleCustomerSubmit}
                disabled={!customerData.name || !customerData.phone}
              >
                {t('checkout.continueToPayment')}
              </Button>
            </div>
          )}

          {step === 'payment' && (
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">{t('checkout.paymentMethod')}</h2>
                <PaymentMethods
                  amount={totalPrice}
                  onPaymentComplete={handlePaymentComplete}
                  onPaymentMethodSelect={setPaymentMethod}
                />
              </Card>
              
              <button
                onClick={() => setStep('details')}
                className="text-primary hover:underline"
              >
                ← {t('checkout.back')}
              </button>
            </div>
          )}

          {step === 'confirmation' && (
            <div className="text-center">
              <div className="mb-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  {t('checkout.orderConfirmed')}
                </h2>
                
                <p className="text-xl text-gray-600 mb-4">
                  {t('checkout.orderNumber')}: <span className="font-bold">{orderNumber}</span>
                </p>
                
                <p className="text-gray-600 mb-8">
                  {t('checkout.confirmationMessage')}
                </p>
              </div>

              <div className="space-y-4">
                <Button
                  variant="primary"
                  size="large"
                  fullWidth
                  onClick={() => navigate(`/${truckId}`)}
                >
                  {t('checkout.backToHome')}
                </Button>
                
                <Button
                  variant="secondary"
                  size="large"
                  fullWidth
                  onClick={() => navigate(`/${truckId}/orders/${orderNumber}`)}
                >
                  {t('checkout.viewOrder')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CheckoutPage;
