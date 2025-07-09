import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';
import { 
  Clock, 
  ChefHat, 
  CheckCircle, 
  AlertCircle,
  Flame,
  Timer,
  Users,
  RefreshCw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { OrderCard } from '@/components/OrderCard';
import { Timer as OrderTimer } from '@/components/Timer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrdersStore } from '@/stores/orders.store';
import { useSettingsStore } from '@/stores/settings.store';
import { playNotificationSound } from '@/utils/sound';
import { Order, OrderStatus } from '@eatech/types';

export const OrderDisplay: React.FC = () => {
  const queryClient = useQueryClient();
  const { soundEnabled, toggleSound, kitchenStation } = useSettingsStore();
  const { activeOrders, updateOrderStatus, setActiveOrders } = useOrdersStore();
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  // Fetch active orders
  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['kitchen-orders', kitchenStation],
    queryFn: async () => {
      // TODO: Replace with actual API call
      const mockOrders: Order[] = [
        {
          id: '1',
          orderNumber: 'B-001',
          tenantId: 'rest-001',
          customerId: 'cust-001',
          status: 'confirmed',
          type: 'dine-in',
          tableNumber: '12',
          items: [
            {
              id: '1',
              productId: 'prod-1',
              name: 'Züri Geschnetzeltes',
              quantity: 2,
              price: 28.50,
              modifiers: ['Ohne Pilze'],
              notes: 'Gut durchgebraten',
            },
            {
              id: '2',
              productId: 'prod-2',
              name: 'Rösti',
              quantity: 2,
              price: 12.00,
              modifiers: [],
            },
          ],
          total: 81.00,
          createdAt: new Date(Date.now() - 8 * 60 * 1000),
          customerName: 'Tisch 12',
          priority: 'high',
        },
        {
          id: '2',
          orderNumber: 'B-002',
          tenantId: 'rest-001',
          customerId: 'cust-002',
          status: 'preparing',
          type: 'takeaway',
          items: [
            {
              id: '3',
              productId: 'prod-3',
              name: 'Pizza Margherita',
              quantity: 1,
              price: 18.50,
              modifiers: ['Extra Käse'],
            },
            {
              id: '4',
              productId: 'prod-4',
              name: 'Insalata Mista',
              quantity: 1,
              price: 12.50,
              modifiers: ['Dressing separat'],
            },
          ],
          total: 31.00,
          createdAt: new Date(Date.now() - 15 * 60 * 1000),
          customerName: 'Max Müller',
          estimatedPickupTime: new Date(Date.now() + 10 * 60 * 1000),
        },
        {
          id: '3',
          orderNumber: 'B-003',
          tenantId: 'rest-001',
          customerId: 'cust-003',
          status: 'confirmed',
          type: 'delivery',
          items: [
            {
              id: '5',
              productId: 'prod-5',
              name: 'Burger Classic',
              quantity: 3,
              price: 19.50,
              modifiers: ['Medium', 'Ohne Zwiebeln'],
            },
            {
              id: '6',
              productId: 'prod-6',
              name: 'Pommes Frites',
              quantity: 3,
              price: 6.50,
              modifiers: [],
            },
          ],
          total: 78.00,
          createdAt: new Date(Date.now() - 3 * 60 * 1000),
          customerName: 'Anna Schmidt',
          deliveryAddress: 'Bahnhofstrasse 15, 8001 Zürich',
        },
      ];

      return mockOrders;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return { orderId, status };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
      updateOrderStatus(data.orderId, data.status);
      
      if (data.status === 'ready') {
        toast.success('Bestellung fertig!', {
          description: `Bestellung ${orders?.find(o => o.id === data.orderId)?.orderNumber} ist bereit.`,
        });
      }
    },
    onError: () => {
      toast.error('Fehler beim Aktualisieren des Bestellstatus');
    },
  });

  // Play sound for new orders
  useEffect(() => {
    if (orders && soundEnabled) {
      const newOrders = orders.filter(order => 
        order.status === 'confirmed' && 
        new Date(order.createdAt).getTime() > Date.now() - 60000
      );
      
      if (newOrders.length > 0) {
        playNotificationSound();
      }
    }
  }, [orders, soundEnabled]);

  // Group orders by status
  const confirmedOrders = orders?.filter(o => o.status === 'confirmed') || [];
  const preparingOrders = orders?.filter(o => o.status === 'preparing') || [];
  const readyOrders = orders?.filter(o => o.status === 'ready') || [];

  const handleStartPreparing = (orderId: string) => {
    updateStatusMutation.mutate({ orderId, status: 'preparing' });
  };

  const handleMarkReady = (orderId: string) => {
    updateStatusMutation.mutate({ orderId, status: 'ready' });
  };

  const handleMarkDelivered = (orderId: string) => {
    updateStatusMutation.mutate({ orderId, status: 'delivered' });
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Lade Bestellungen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ChefHat className="h-8 w-8" />
              Küchen Display
            </h1>
            <Badge variant="outline" className="text-lg px-3 py-1">
              Station: {kitchenStation || 'Hauptküche'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                {format(new Date(), 'EEEE, dd. MMMM yyyy', { locale: de })}
              </p>
              <p className="text-2xl font-bold">
                {format(new Date(), 'HH:mm')}
              </p>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSound}
            >
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => refetch()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Aktualisieren
            </Button>
          </div>
        </div>
      </div>

      {/* Order Columns */}
      <div className="flex-1 grid grid-cols-3 gap-6 p-6 overflow-hidden">
        {/* New Orders */}
        <div className="flex flex-col">
          <div className="mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-yellow-500" />
              Neue Bestellungen
              <Badge variant="destructive" className="ml-2">
                {confirmedOrders.length}
              </Badge>
            </h2>
          </div>
          
          <div className="flex-1 space-y-4 overflow-y-auto pr-2">
            {confirmedOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Keine neuen Bestellungen
              </div>
            ) : (
              confirmedOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onAction={() => handleStartPreparing(order.id)}
                  actionLabel="Zubereitung starten"
                  highlight
                />
              ))
            )}
          </div>
        </div>

        {/* In Preparation */}
        <div className="flex flex-col">
          <div className="mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Flame className="h-6 w-6 text-orange-500" />
              In Zubereitung
              <Badge variant="secondary" className="ml-2">
                {preparingOrders.length}
              </Badge>
            </h2>
          </div>
          
          <div className="flex-1 space-y-4 overflow-y-auto pr-2">
            {preparingOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Keine Bestellungen in Zubereitung
              </div>
            ) : (
              preparingOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onAction={() => handleMarkReady(order.id)}
                  actionLabel="Fertig"
                  showTimer
                />
              ))
            )}
          </div>
        </div>

        {/* Ready for Pickup/Delivery */}
        <div className="flex flex-col">
          <div className="mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              Bereit zur Ausgabe
              <Badge variant="success" className="ml-2">
                {readyOrders.length}
              </Badge>
            </h2>
          </div>
          
          <div className="flex-1 space-y-4 overflow-y-auto pr-2">
            {readyOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Keine fertigen Bestellungen
              </div>
            ) : (
              readyOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onAction={() => handleMarkDelivered(order.id)}
                  actionLabel="Ausgegeben"
                  variant="ready"
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="border-t bg-card px-6 py-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Ø Zubereitungszeit: <strong>12 Min</strong>
            </span>
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Heute bedient: <strong>142 Gäste</strong>
            </span>
          </div>
          
          <div className="flex items-center gap-6">
            <span>Offene Bestellungen: <strong>{orders?.length || 0}</strong></span>
            <span>Tagesumsatz: <strong>CHF 3,842.50</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDisplay;
