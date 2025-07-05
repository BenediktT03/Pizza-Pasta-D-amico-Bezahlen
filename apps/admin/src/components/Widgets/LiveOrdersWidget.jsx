/**
 * EATECH Live Orders Widget
 * Real-time display of active orders
 * File Path: /apps/admin/src/components/Widgets/LiveOrdersWidget.jsx
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  Clock, ChefHat, CheckCircle, AlertCircle,
  User, Hash, MoreVertical
} from 'lucide-react';
import { Badge, Button, Empty, Dropdown } from '@eatech/ui';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

// Styled Components
const WidgetContainer = styled.div`
  max-height: 400px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${props => props.theme?.colors?.backgroundSecondary || '#f9fafb'};
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme?.colors?.border || '#e5e7eb'};
    border-radius: 3px;
  }
`;

const OrdersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const OrderCard = styled.div`
  background: ${props => props.theme?.colors?.backgroundSecondary || '#f9fafb'};
  border: 1px solid ${props => props.theme?.colors?.border || '#e5e7eb'};
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s ease;
  
  ${props => props.urgent && `
    border-color: ${props.theme?.colors?.danger || '#ef4444'};
    background: ${props.theme?.colors?.dangerLight || '#fee2e2'};
  `}
  
  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
`;

const OrderHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 12px;
`;

const OrderInfo = styled.div`
  flex: 1;
`;

const OrderNumber = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.theme?.colors?.text || '#1f2937'};
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const OrderMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 14px;
  color: ${props => props.theme?.colors?.textSecondary || '#6b7280'};
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const OrderActions = styled.div`
  display: flex;
  gap: 8px;
`;

const OrderItems = styled.div`
  background: white;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
`;

const ItemRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  
  &:not(:last-child) {
    border-bottom: 1px solid ${props => props.theme?.colors?.border || '#e5e7eb'};
  }
`;

const ItemName = styled.div`
  font-size: 14px;
  color: ${props => props.theme?.colors?.text || '#1f2937'};
  flex: 1;
`;

const ItemQuantity = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${props => props.theme?.colors?.primary || '#ff6b6b'};
`;

const OrderFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Timer = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 500;
  color: ${props => props.urgent ? props.theme?.colors?.danger || '#ef4444' : props.theme?.colors?.warning || '#f59e0b'};
`;

const StatusBadge = styled(Badge)`
  text-transform: capitalize;
`;

const EmptyContainer = styled.div`
  padding: 40px 0;
  text-align: center;
`;

// Component
const LiveOrdersWidget = ({ orders }) => {
  const [timers, setTimers] = useState({});

  // Update timers every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev => ({ ...prev, updated: Date.now() }));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Convert orders object to array and sort by creation time
  const ordersList = orders 
    ? Object.entries(orders)
        .map(([id, order]) => ({ id, ...order }))
        .sort((a, b) => a.createdAt - b.createdAt)
    : [];

  // Calculate time since order
  const getTimeSinceOrder = (createdAt) => {
    const minutes = Math.floor((Date.now() - createdAt) / 60000);
    return minutes;
  };

  // Check if order is urgent (> 15 minutes)
  const isUrgent = (createdAt) => {
    return getTimeSinceOrder(createdAt) > 15;
  };

  // Get status color
  const getStatusVariant = (status) => {
    const variants = {
      pending: 'primary',
      preparing: 'warning',
      ready: 'success',
      delivered: 'secondary',
      cancelled: 'danger'
    };
    return variants[status] || 'secondary';
  };

  // Handle status update
  const handleStatusUpdate = (orderId, newStatus) => {
    // This would trigger an update in the parent component
    console.log('Update order', orderId, 'to', newStatus);
  };

  if (ordersList.length === 0) {
    return (
      <EmptyContainer>
        <Empty
          icon={<Clock size={40} />}
          title="Keine aktiven Bestellungen"
          description="Neue Bestellungen erscheinen hier"
        />
      </EmptyContainer>
    );
  }

  return (
    <WidgetContainer>
      <OrdersList>
        {ordersList.map(order => (
          <OrderCard key={order.id} urgent={isUrgent(order.createdAt)}>
            <OrderHeader>
              <OrderInfo>
                <OrderNumber>
                  <Hash size={16} />
                  {order.orderNumber}
                  {isUrgent(order.createdAt) && (
                    <AlertCircle size={16} color="#ef4444" />
                  )}
                </OrderNumber>
                <OrderMeta>
                  <MetaItem>
                    <User size={14} />
                    {order.customer?.name || 'Gast'}
                  </MetaItem>
                  {order.tableName && (
                    <MetaItem>{order.tableName}</MetaItem>
                  )}
                </OrderMeta>
              </OrderInfo>
              
              <OrderActions>
                <StatusBadge variant={getStatusVariant(order.status)}>
                  {order.status}
                </StatusBadge>
                <Dropdown
                  trigger={
                    <Button variant="ghost" size="sm">
                      <MoreVertical size={16} />
                    </Button>
                  }
                >
                  <Dropdown.Item onClick={() => handleStatusUpdate(order.id, 'preparing')}>
                    <ChefHat size={16} />
                    In Zubereitung
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => handleStatusUpdate(order.id, 'ready')}>
                    <CheckCircle size={16} />
                    Fertig
                  </Dropdown.Item>
                </Dropdown>
              </OrderActions>
            </OrderHeader>

            <OrderItems>
              {order.items.map((item, index) => (
                <ItemRow key={index}>
                  <ItemName>{item.name}</ItemName>
                  <ItemQuantity>x{item.quantity}</ItemQuantity>
                </ItemRow>
              ))}
            </OrderItems>

            <OrderFooter>
              <Timer urgent={isUrgent(order.createdAt)}>
                <Clock size={14} />
                {getTimeSinceOrder(order.createdAt)} Min.
              </Timer>
              
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                CHF {order.totals.total.toFixed(2)}
              </div>
            </OrderFooter>
          </OrderCard>
        ))}
      </OrdersList>
    </WidgetContainer>
  );
};

export default LiveOrdersWidget;