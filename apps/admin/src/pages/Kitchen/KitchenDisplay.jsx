/**
 * EATECH Kitchen Display System
 * Real-time kitchen order management
 * File Path: /apps/admin/src/pages/Kitchen/KitchenDisplay.jsx
 */

import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { 
  Clock, CheckCircle, AlertCircle, Volume2,
  VolumeX, Maximize2, RefreshCw, Settings
} from 'lucide-react';
import { Button, Card, Badge, Modal, Switch } from '@eatech/ui';
import { useTenant } from '@eatech/core/contexts/TenantContext';
import { useTenantData } from '@eatech/core/hooks/useTenantData';
import OrderService from '../../services/OrderService';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

// Styled Components
const KitchenContainer = styled.div`
  padding: ${props => props.fullscreen ? '8px' : '24px'};
  background: #1a1a1a;
  min-height: 100vh;
  color: white;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px 0;
  border-bottom: 1px solid #333;
`;

const Title = styled.h1`
  font-size: ${props => props.fullscreen ? '24px' : '32px'};
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Stats = styled.div`
  display: flex;
  gap: 24px;
  align-items: center;
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: ${props => props.color || '#fff'};
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: #999;
  margin-top: 4px;
`;

const Controls = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const OrdersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(${props => props.fullscreen ? '280px' : '320px'}, 1fr));
  gap: ${props => props.fullscreen ? '12px' : '16px'};
`;

const OrderCard = styled(Card)`
  background: ${props => {
    if (props.urgent) return '#4a1d1d';
    if (props.ready) return '#1d4a1d';
    return '#2a2a2a';
  }};
  border: 2px solid ${props => {
    if (props.urgent) return '#dc2626';
    if (props.ready) return '#10b981';
    return '#444';
  }};
  color: white;
  position: relative;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }
`;

const OrderHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 16px;
`;

const OrderNumber = styled.div`
  font-size: 20px;
  font-weight: 700;
`;

const OrderTable = styled.div`
  font-size: 16px;
  color: #ccc;
  margin-top: 4px;
`;

const Timer = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: ${props => props.large ? '20px' : '16px'};
  font-weight: 600;
  color: ${props => {
    if (props.urgent) return '#ef4444';
    if (props.warning) return '#f59e0b';
    return '#10b981';
  }};
`;

const ItemsList = styled.div`
  margin: 16px 0;
  padding: 16px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
`;

const Item = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 16px;
  
  &:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
`;

const ItemName = styled.div`
  flex: 1;
  font-weight: 500;
`;

const ItemQuantity = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #ff6b6b;
`;

const ItemOptions = styled.div`
  font-size: 14px;
  color: #999;
  margin-top: 4px;
  font-style: italic;
`;

const Notes = styled.div`
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid #ffc107;
  border-radius: 8px;
  padding: 12px;
  margin: 16px 0;
  font-size: 14px;
  color: #ffc107;
`;

const OrderFooter = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
`;

const ActionButton = styled(Button)`
  flex: 1;
`;

const SettingsModal = styled(Modal)`
  .modal-content {
    background: #2a2a2a;
    color: white;
  }
`;

const SettingRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #444;
  
  &:last-child {
    border-bottom: none;
  }
`;

const SettingLabel = styled.div`
  font-size: 16px;
`;

const SettingDescription = styled.div`
  font-size: 14px;
  color: #999;
  margin-top: 4px;
`;

// Component
const KitchenDisplay = () => {
  const { currentTenant } = useTenant();
  const [fullscreen, setFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    autoAccept: false,
    urgentTime: 15, // minutes
    warningTime: 10, // minutes
    refreshInterval: 30 // seconds
  });
  
  const audioRef = useRef(new Audio('/sounds/notification.mp3'));

  // Load active orders
  const { data: orders, refresh } = useTenantData('orders', {
    realtime: true,
    filters: { 
      status: ['pending', 'preparing'] 
    }
  });

  // Convert to array and sort
  const ordersList = orders 
    ? Object.entries(orders)
        .map(([id, order]) => ({ id, ...order }))
        .filter(o => ['pending', 'preparing'].includes(o.status))
        .sort((a, b) => a.createdAt - b.createdAt)
    : [];

  // Play notification sound for new orders
  useEffect(() => {
    if (soundEnabled && ordersList.some(o => o.status === 'pending')) {
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
  }, [ordersList.length, soundEnabled]);

  // Auto refresh
  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, settings.refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [settings.refreshInterval, refresh]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  // Calculate time since order
  const getMinutesSince = (timestamp) => {
    return Math.floor((Date.now() - timestamp) / 60000);
  };

  // Check if order is urgent/warning
  const getOrderStatus = (order) => {
    const minutes = getMinutesSince(order.createdAt);
    return {
      urgent: minutes >= settings.urgentTime,
      warning: minutes >= settings.warningTime && minutes < settings.urgentTime,
      minutes
    };
  };

  // Handle order actions
  const handleAcceptOrder = async (orderId) => {
    await OrderService.updateOrderStatus(currentTenant.id, orderId, 'preparing');
  };

  const handleCompleteOrder = async (orderId) => {
    await OrderService.updateOrderStatus(currentTenant.id, orderId, 'ready');
  };

  // Calculate stats
  const stats = {
    pending: ordersList.filter(o => o.status === 'pending').length,
    preparing: ordersList.filter(o => o.status === 'preparing').length,
    avgTime: ordersList.reduce((acc, o) => acc + getMinutesSince(o.createdAt), 0) / (ordersList.length || 1)
  };

  return (
    <KitchenContainer fullscreen={fullscreen}>
      <Header>
        <Title fullscreen={fullscreen}>
          Kitchen Display
          <Badge variant={ordersList.length > 0 ? 'danger' : 'success'}>
            {ordersList.length} Aktiv
          </Badge>
        </Title>
        
        <Stats>
          <StatItem>
            <StatValue color="#3b82f6">{stats.pending}</StatValue>
            <StatLabel>Neu</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue color="#f59e0b">{stats.preparing}</StatValue>
            <StatLabel>In Arbeit</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{Math.round(stats.avgTime)} Min</StatValue>
            <StatLabel>Ø Zeit</StatLabel>
          </StatItem>
        </Stats>
        
        <Controls>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
          >
            <Maximize2 size={20} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refresh()}
          >
            <RefreshCw size={20} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(true)}
          >
            <Settings size={20} />
          </Button>
        </Controls>
      </Header>

      <OrdersGrid fullscreen={fullscreen}>
        {ordersList.map(order => {
          const { urgent, warning, minutes } = getOrderStatus(order);
          const isReady = order.status === 'preparing';
          
          return (
            <OrderCard 
              key={order.id} 
              urgent={urgent && !isReady}
              ready={isReady}
            >
              <Card.Body>
                <OrderHeader>
                  <div>
                    <OrderNumber>#{order.orderNumber}</OrderNumber>
                    <OrderTable>{order.tableName || 'Takeaway'}</OrderTable>
                  </div>
                  <Timer urgent={urgent} warning={warning} large>
                    <Clock size={20} />
                    {minutes} Min
                  </Timer>
                </OrderHeader>

                <ItemsList>
                  {order.items.map((item, index) => (
                    <Item key={index}>
                      <div style={{ flex: 1 }}>
                        <ItemName>{item.name}</ItemName>
                        {item.options && Object.keys(item.options).length > 0 && (
                          <ItemOptions>Mit Anpassungen</ItemOptions>
                        )}
                      </div>
                      <ItemQuantity>×{item.quantity}</ItemQuantity>
                    </Item>
                  ))}
                </ItemsList>

                {order.notes && (
                  <Notes>
                    <AlertCircle size={16} style={{ marginRight: 8 }} />
                    {order.notes}
                  </Notes>
                )}

                <OrderFooter>
                  {order.status === 'pending' ? (
                    <ActionButton
                      variant="primary"
                      onClick={() => handleAcceptOrder(order.id)}
                    >
                      Annehmen
                    </ActionButton>
                  ) : (
                    <ActionButton
                      variant="success"
                      onClick={() => handleCompleteOrder(order.id)}
                      leftIcon={<CheckCircle size={18} />}
                    >
                      Fertig
                    </ActionButton>
                  )}
                </OrderFooter>
              </Card.Body>
            </OrderCard>
          );
        })}
      </OrdersGrid>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Kitchen Display Einstellungen"
      >
        <div style={{ padding: 24 }}>
          <SettingRow>
            <div>
              <SettingLabel>Automatisch annehmen</SettingLabel>
              <SettingDescription>
                Neue Bestellungen automatisch in Bearbeitung nehmen
              </SettingDescription>
            </div>
            <Switch
              checked={settings.autoAccept}
              onChange={(checked) => setSettings({ ...settings, autoAccept: checked })}
            />
          </SettingRow>
          
          <SettingRow>
            <div>
              <SettingLabel>Warnung nach (Minuten)</SettingLabel>
              <SettingDescription>
                Bestellung wird gelb markiert
              </SettingDescription>
            </div>
            <input
              type="number"
              value={settings.warningTime}
              onChange={(e) => setSettings({ ...settings, warningTime: parseInt(e.target.value) })}
              style={{
                width: 60,
                padding: 8,
                background: '#444',
                border: '1px solid #666',
                borderRadius: 4,
                color: 'white',
                textAlign: 'center'
              }}
            />
          </SettingRow>
          
          <SettingRow>
            <div>
              <SettingLabel>Dringend nach (Minuten)</SettingLabel>
              <SettingDescription>
                Bestellung wird rot markiert
              </SettingDescription>
            </div>
            <input
              type="number"
              value={settings.urgentTime}
              onChange={(e) => setSettings({ ...settings, urgentTime: parseInt(e.target.value) })}
              style={{
                width: 60,
                padding: 8,
                background: '#444',
                border: '1px solid #666',
                borderRadius: 4,
                color: 'white',
                textAlign: 'center'
              }}
            />
          </SettingRow>
        </div>
      </SettingsModal>
    </KitchenContainer>
  );
};

export default KitchenDisplay;