// Order Status Page for Customer
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components/layout/Layout';
import { Card, Button } from '@eatech/ui';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  ClockIcon, 
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface Order {
  id: string;
  orderNumber: string;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
    modifiers?: string[];
    specialInstructions?: string;
  }>;
  totalAmount: number;
  customerName: string;
  createdAt: Date;
  estimatedReadyTime?: Date;
  completedAt?: Date;
}

const OrderStatusPage: React.FC = () => {
  const { truckId, orderNumber } = useParams<{ truckId: string; orderNumber: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!truckId || !orderNumber) {
      setError(t('errors.invalidOrder'));
      setLoading(false);
      return;
    }

    // Subscribe to order updates
    const unsubscribe = onSnapshot(
      doc(db, `foodtrucks/${truckId}/orders`, orderNumber),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setOrder({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            estimatedReadyTime: data.estimatedReadyTime?.toDate(),
            completedAt: data.completedAt?.toDate()
          } as Order);
          setError(null);
        } else {
          setError(t('errors.orderNotFound'));
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching order:', error);
        setError(t('errors.loadingError'));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [truckId, orderNumber, t]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-8 w-8 text-yellow-500" />;
      case 'preparing':
        return (
          <div className="relative">
            <ClockIcon className="h-8 w-8 text-blue-500 animate-pulse" />
          </div>
        );
      case 'ready':
        return <CheckCircleIcon className="h-8 w-8 text-green-500" />;
      case 'completed':
        return <CheckCircleIcon className="h-8 w-8 text-green-600" />;
      case 'cancelled':
        return <XCircleIcon className="h-8 w-8 text-red-500" />;
      default:
        return <ClockIcon className="h-8 w-8 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    return t(`orderStatus.${status}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'preparing':
        return 'text-blue-600 bg-blue-50';
      case 'ready':
        return 'text-green-600 bg-green-50';
      case 'completed':
        return 'text-green-700 bg-green-100';
      case 'cancelled':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getEstimatedTime = () => {
    if (!order) return null;
    
    if (order.status === 'ready') {
      return t('orderStatus.readyForPickup');
    }
    
    if (order.estimatedReadyTime && order.status !== 'completed' && order.status !== 'cancelled') {
      const now = new Date();
      const diffMs = order.estimatedReadyTime.getTime() - now.getTime();
      const diffMins = Math.round(diffMs / 60000);
      
      if (diffMins > 0) {
        return t('orderStatus.readyIn', { minutes: diffMins });
      } else {
        return t('orderStatus.shouldBeReady');
      }
    }
    
    return null;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (error || !order) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error || t('errors.orderNotFound')}
          </h1>
          <Button onClick={() => navigate(`/${truckId}`)}>
            {t('common.backToHome')}
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('orderStatus.title')}
            </h1>
            <p className="text-xl text-gray-600">
              {t('orderStatus.orderNumber')}: <span className="font-bold">{order.orderNumber}</span>
            </p>
          </div>

          {/* Status Card */}
          <Card className="p-8 mb-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                {getStatusIcon(order.status)}
              </div>
              
              <div className={`inline-block px-4 py-2 rounded-full ${getStatusColor(order.status)} mb-4`}>
                <span className="font-semibold text-lg">
                  {getStatusText(order.status)}
                </span>
              </div>
              
              {order.status === 'ready' && (
                <div className="animate-pulse mb-4">
                  <p className="text-2xl font-bold text-green-600">
                    {t('orderStatus.pleasePickUp')}
                  </p>
                </div>
              )}
              
              {getEstimatedTime() && (
                <p className="text-lg text-gray-600">
                  {getEstimatedTime()}
                </p>
              )}
            </div>
          </Card>

          {/* Order Timeline */}
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">{t('orderStatus.timeline')}</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-4 h-4 rounded-full bg-green-500 mt-1"></div>
                <div className="flex-1">
                  <p className="font-medium">{t('orderStatus.orderPlaced')}</p>
                  <p className="text-sm text-gray-600">
                    {order.createdAt.toLocaleTimeString('de-CH', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
              
              {(order.status !== 'pending' && order.status !== 'cancelled') && (
                <div className="flex items-start gap-4">
                  <div className={`w-4 h-4 rounded-full ${
                    ['preparing', 'ready', 'completed'].includes(order.status) 
                      ? 'bg-green-500' 
                      : 'bg-gray-300'
                  } mt-1`}></div>
                  <div className="flex-1">
                    <p className="font-medium">{t('orderStatus.preparationStarted')}</p>
                  </div>
                </div>
              )}
              
              {['ready', 'completed'].includes(order.status) && (
                <div className="flex items-start gap-4">
                  <div className="w-4 h-4 rounded-full bg-green-500 mt-1"></div>
                  <div className="flex-1">
                    <p className="font-medium">{t('orderStatus.orderReady')}</p>
                  </div>
                </div>
              )}
              
              {order.status === 'completed' && order.completedAt && (
                <div className="flex items-start gap-4">
                  <div className="w-4 h-4 rounded-full bg-green-500 mt-1"></div>
                  <div className="flex-1">
                    <p className="font-medium">{t('orderStatus.orderCompleted')}</p>
                    <p className="text-sm text-gray-600">
                      {order.completedAt.toLocaleTimeString('de-CH', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              )}
              
              {order.status === 'cancelled' && (
                <div className="flex items-start gap-4">
                  <div className="w-4 h-4 rounded-full bg-red-500 mt-1"></div>
                  <div className="flex-1">
                    <p className="font-medium text-red-600">{t('orderStatus.orderCancelled')}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Order Details */}
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">{t('orderStatus.orderDetails')}</h2>
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between">
                  <div>
                    <p className="font-medium">
                      {item.quantity}x {item.productName}
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
                    CHF {((item.price * item.quantity) / 100).toFixed(2)}
                  </p>
                </div>
              ))}
              <div className="border-t pt-3">
                <div className="flex justify-between font-bold text-lg">
                  <span>{t('common.total')}</span>
                  <span>CHF {(order.totalAmount / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="space-y-3">
            {order.status === 'ready' && (
              <Button
                variant="primary"
                size="large"
                fullWidth
                onClick={() => {
                  // Show pickup confirmation
                  alert(t('orderStatus.showThisToStaff'));
                }}
              >
                {t('orderStatus.imHere')}
              </Button>
            )}
            
            <Button
              variant="secondary"
              size="large"
              fullWidth
              onClick={() => navigate(`/${truckId}`)}
            >
              {t('common.backToHome')}
            </Button>
            
            {['pending', 'preparing'].includes(order.status) && (
              <Button
                variant="secondary"
                size="large"
                fullWidth
                onClick={() => navigate(`/${truckId}/menu`)}
              >
                {t('orderStatus.orderMore')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default OrderStatusPage;
