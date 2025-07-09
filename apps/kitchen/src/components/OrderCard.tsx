import React from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Users,
  ShoppingBag,
  Truck,
  Clock,
  MessageSquare,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { OrderTimer, DeliveryTimer } from './Timer';
import { cn } from '@/utils/cn';
import { Order } from '@eatech/types';

interface OrderCardProps {
  order: Order;
  onAction?: () => void;
  actionLabel?: string;
  showTimer?: boolean;
  variant?: 'default' | 'ready' | 'delayed';
  highlight?: boolean;
  expanded?: boolean;
  className?: string;
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onAction,
  actionLabel,
  showTimer = false,
  variant = 'default',
  highlight = false,
  expanded = false,
  className,
}) => {
  const getTypeIcon = () => {
    switch (order.type) {
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

  const getTypeLabel = () => {
    switch (order.type) {
      case 'dine-in':
        return order.tableNumber ? `Tisch ${order.tableNumber}` : 'Im Restaurant';
      case 'takeaway':
        return 'Abholung';
      case 'delivery':
        return 'Lieferung';
      default:
        return '';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400';
      default:
        return '';
    }
  };

  const getCardStyles = () => {
    const baseStyles = 'transition-all duration-200';
    
    if (variant === 'ready') {
      return cn(baseStyles, 'border-green-500 bg-green-50/50 dark:bg-green-950/20');
    }
    
    if (variant === 'delayed') {
      return cn(baseStyles, 'border-red-500 bg-red-50/50 dark:bg-red-950/20');
    }
    
    if (highlight) {
      return cn(baseStyles, 'border-primary shadow-lg scale-[1.02]');
    }
    
    return baseStyles;
  };

  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Card className={cn(getCardStyles(), className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'text-2xl font-bold',
              order.priority && getPriorityColor(order.priority)
            )}>
              {order.orderNumber}
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              {getTypeIcon()}
              {getTypeLabel()}
            </Badge>
          </div>
          
          {showTimer && (
            <OrderTimer 
              orderCreatedAt={new Date(order.createdAt)} 
              estimatedTime={order.estimatedPrepTime}
            />
          )}
        </div>
        
        {order.customerName && (
          <p className="text-sm text-muted-foreground mt-1">
            {order.customerName}
          </p>
        )}
      </CardHeader>

      <CardContent className="pb-3">
        <ScrollArea className={expanded ? 'h-auto' : 'h-[120px]'}>
          <div className="space-y-2">
            {order.items.map((item, index) => (
              <div key={item.id} className="space-y-1">
                {index > 0 && <Separator className="my-2" />}
                
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">{item.quantity}x</span>
                      <span className="font-medium">{item.name}</span>
                    </div>
                    
                    {item.modifiers && item.modifiers.length > 0 && (
                      <div className="ml-8 mt-1">
                        {item.modifiers.map((mod, i) => (
                          <div key={i} className="text-sm text-muted-foreground">
                            • {mod}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {item.notes && (
                      <div className="ml-8 mt-1 flex items-start gap-1">
                        <MessageSquare className="h-3 w-3 mt-0.5 text-primary" />
                        <span className="text-sm text-primary font-medium">
                          {item.notes}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Order metadata */}
        <div className="mt-3 pt-3 border-t space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Artikel gesamt:</span>
            <span className="font-medium">{totalItems}</span>
          </div>
          
          {order.estimatedPickupTime && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Abholung:</span>
              <DeliveryTimer targetTime={new Date(order.estimatedPickupTime)} />
            </div>
          )}
          
          {order.deliveryTime && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Lieferung:</span>
              <DeliveryTimer targetTime={new Date(order.deliveryTime)} />
            </div>
          )}
          
          {order.specialInstructions && (
            <div className="flex items-start gap-1 text-sm">
              <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
              <span className="text-yellow-700 dark:text-yellow-400">
                {order.specialInstructions}
              </span>
            </div>
          )}
        </div>
      </CardContent>

      {onAction && actionLabel && (
        <CardFooter className="pt-0">
          <Button 
            onClick={onAction} 
            className="w-full"
            variant={variant === 'ready' ? 'success' : 'default'}
            size="lg"
          >
            {actionLabel}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

// Compact version for queue views
export const OrderCardCompact: React.FC<{
  order: Order;
  onClick?: () => void;
  showStatus?: boolean;
}> = ({ order, onClick, showStatus = true }) => {
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Card 
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        onClick && 'hover:scale-[1.02]'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-xl font-bold">{order.orderNumber}</div>
            {order.type === 'dine-in' && order.tableNumber && (
              <Badge variant="outline">Tisch {order.tableNumber}</Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {showStatus && (
              <Badge variant={
                order.status === 'ready' ? 'success' :
                order.status === 'preparing' ? 'secondary' : 'default'
              }>
                {order.status === 'confirmed' ? 'Neu' :
                 order.status === 'preparing' ? 'Läuft' :
                 order.status === 'ready' ? 'Fertig' : order.status}
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {totalItems} Artikel
            </span>
          </div>
        </div>
        
        <div className="mt-2 text-sm text-muted-foreground">
          {format(new Date(order.createdAt), 'HH:mm', { locale: de })}
          {order.customerName && ` • ${order.customerName}`}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderCard;
