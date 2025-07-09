import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow, addMinutes } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  Clock,
  Filter,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Timer,
  Users,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Order, OrderStatus } from '@eatech/types';

interface OrderQueueItem extends Order {
  estimatedCompletionTime: Date;
  preparationProgress: number;
  assignedChef?: string;
}

export const OrderQueue: React.FC = () => {
  const [filterType, setFilterType] = useState<'all' | 'dine-in' | 'takeaway' | 'delivery'>('all');
  const [sortBy, setSortBy] = useState<'time' | 'priority' | 'status'>('time');

  // Fetch order queue data
  const { data: queueData, isLoading } = useQuery({
    queryKey: ['kitchen-queue'],
    queryFn: async () => {
      // TODO: Replace with actual API call
      const mockQueue: OrderQueueItem[] = [
        {
          id: '1',
          orderNumber: 'B-001',
          tenantId: 'rest-001',
          customerId: 'cust-001',
          status: 'preparing',
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
            },
          ],
          total: 57.00,
          createdAt: new Date(Date.now() - 15 * 60 * 1000),
          estimatedCompletionTime: addMinutes(new Date(), 5),
          preparationProgress: 75,
          assignedChef: 'Marco',
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
              id: '2',
              productId: 'prod-2',
              name: 'Pizza Margherita',
              quantity: 1,
              price: 18.50,
            },
          ],
          total: 18.50,
          createdAt: new Date(Date.now() - 10 * 60 * 1000),
          estimatedCompletionTime: addMinutes(new Date(), 8),
          preparationProgress: 50,
          assignedChef: 'Luigi',
          estimatedPickupTime: addMinutes(new Date(), 15),
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
              id: '3',
              productId: 'prod-3',
              name: 'Burger Classic',
              quantity: 3,
              price: 19.50,
            },
          ],
          total: 58.50,
          createdAt: new Date(Date.now() - 5 * 60 * 1000),
          estimatedCompletionTime: addMinutes(new Date(), 12),
          preparationProgress: 0,
          priority: 'medium',
        },
        {
          id: '4',
          orderNumber: 'B-004',
          tenantId: 'rest-001',
          customerId: 'cust-004',
          status: 'ready',
          type: 'dine-in',
          tableNumber: '8',
          items: [
            {
              id: '4',
              productId: 'prod-4',
              name: 'Caesar Salad',
              quantity: 2,
              price: 16.50,
            },
          ],
          total: 33.00,
          createdAt: new Date(Date.now() - 20 * 60 * 1000),
          estimatedCompletionTime: new Date(Date.now() - 2 * 60 * 1000),
          preparationProgress: 100,
          assignedChef: 'Sarah',
        },
      ];

      return mockQueue;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Calculate queue statistics
  const queueStats = useMemo(() => {
    if (!queueData) return null;

    const activeOrders = queueData.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
    const avgPrepTime = 15; // minutes
    const onTimePercentage = 85;

    return {
      totalOrders: activeOrders.length,
      preparing: activeOrders.filter(o => o.status === 'preparing').length,
      waiting: activeOrders.filter(o => o.status === 'confirmed').length,
      ready: activeOrders.filter(o => o.status === 'ready').length,
      avgPrepTime,
      onTimePercentage,
    };
  }, [queueData]);

  // Filter and sort orders
  const filteredAndSortedOrders = useMemo(() => {
    if (!queueData) return [];

    let filtered = queueData;
    
    // Apply filter
    if (filterType !== 'all') {
      filtered = filtered.filter(order => order.type === filterType);
    }

    // Apply sort
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return (priorityOrder[a.priority || 'low'] || 2) - (priorityOrder[b.priority || 'low'] || 2);
        case 'status':
          const statusOrder = { ready: 0, preparing: 1, confirmed: 2 };
          return (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3);
        case 'time':
        default:
          return a.createdAt.getTime() - b.createdAt.getTime();
      }
    });
  }, [queueData, filterType, sortBy]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'dine-in':
        return <Users className="h-4 w-4" />;
      case 'takeaway':
        return <ShoppingBag className="h-4 w-4" />;
      case 'delivery':
        return <Truck className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'confirmed':
        return 'text-yellow-500';
      case 'preparing':
        return 'text-blue-500';
      case 'ready':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  const getPriorityBadgeVariant = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Lade Warteschlange...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Bestellungen Warteschlange</h1>
          
          <div className="flex items-center gap-4">
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter nach Typ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Typen</SelectItem>
                <SelectItem value="dine-in">Im Restaurant</SelectItem>
                <SelectItem value="takeaway">Abholung</SelectItem>
                <SelectItem value="delivery">Lieferung</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sortieren nach" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time">Zeit</SelectItem>
                <SelectItem value="priority">Priorität</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {queueStats && (
        <div className="grid grid-cols-6 gap-4 p-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Gesamt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{queueStats.totalOrders}</div>
              <p className="text-xs text-muted-foreground">Aktive Bestellungen</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Wartend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{queueStats.waiting}</div>
              <p className="text-xs text-muted-foreground">Neue Bestellungen</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">In Zubereitung</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{queueStats.preparing}</div>
              <p className="text-xs text-muted-foreground">Wird zubereitet</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Fertig</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{queueStats.ready}</div>
              <p className="text-xs text-muted-foreground">Zur Ausgabe bereit</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ø Zeit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{queueStats.avgPrepTime} Min</div>
              <p className="text-xs text-muted-foreground">Zubereitungszeit</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pünktlichkeit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{queueStats.onTimePercentage}%</div>
              <Progress value={queueStats.onTimePercentage} className="mt-1 h-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Order List */}
      <div className="flex-1 px-6 pb-6">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Bestellungen Timeline</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-400px)]">
              <div className="space-y-4 p-6">
                {filteredAndSortedOrders.map((order) => (
                  <Card key={order.id} className="overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full bg-muted ${getStatusColor(order.status)}`}>
                            {order.status === 'confirmed' && <AlertCircle className="h-5 w-5" />}
                            {order.status === 'preparing' && <Clock className="h-5 w-5" />}
                            {order.status === 'ready' && <CheckCircle className="h-5 w-5" />}
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">{order.orderNumber}</h3>
                              <Badge variant="outline" className="flex items-center gap-1">
                                {getTypeIcon(order.type)}
                                {order.type === 'dine-in' ? `Tisch ${order.tableNumber}` :
                                 order.type === 'takeaway' ? 'Abholung' : 'Lieferung'}
                              </Badge>
                              {order.priority && (
                                <Badge variant={getPriorityBadgeVariant(order.priority)}>
                                  {order.priority === 'high' ? 'Hoch' : 
                                   order.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Bestellt {formatDistanceToNow(order.createdAt, { locale: de, addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Geschätzte Zeit</p>
                          <p className="font-semibold">
                            {format(order.estimatedCompletionTime, 'HH:mm')}
                          </p>
                        </div>
                      </div>
                      
                      {/* Items */}
                      <div className="mb-3 space-y-1">
                        {order.items.map((item) => (
                          <div key={item.id} className="text-sm">
                            <span className="font-medium">{item.quantity}x</span> {item.name}
                            {item.modifiers && item.modifiers.length > 0 && (
                              <span className="text-muted-foreground ml-2">
                                ({item.modifiers.join(', ')})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {/* Progress */}
                      {order.status === 'preparing' && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Fortschritt</span>
                            <span className="font-medium">{order.preparationProgress}%</span>
                          </div>
                          <Progress value={order.preparationProgress} className="h-2" />
                          {order.assignedChef && (
                            <p className="text-sm text-muted-foreground">
                              Zubereitet von: <span className="font-medium">{order.assignedChef}</span>
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Pickup/Delivery Time */}
                      {order.estimatedPickupTime && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm">
                            <Timer className="inline h-4 w-4 mr-1" />
                            Abholung um {format(order.estimatedPickupTime, 'HH:mm')}
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrderQueue;
