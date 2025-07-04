/**
 * EATECH - Kitchen Display System (KDS)
 * Real-time order management for kitchen staff
 * File Path: /apps/admin/src/pages/Kitchen/KitchenDisplay.jsx
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, Timer, CheckCircle, AlertCircle, XCircle,
  ChefHat, Flame, Pause, Play, Volume2, VolumeX,
  RefreshCw, Filter, Settings, Bell, TrendingUp,
  Package, User, MapPin, Phone, MessageSquare
} from 'lucide-react';
import './KitchenDisplay.css';

// Order Status
const ORDER_STATUS = {
  NEW: 'new',
  ACCEPTED: 'accepted',
  PREPARING: 'preparing',
  READY: 'ready',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Mock Orders für Demo
const generateMockOrders = () => {
  const names = ['Emma Müller', 'Luca Schmidt', 'Mia Wagner', 'Noah Fischer', 'Lea Weber'];
  const items = [
    { name: 'Classic Burger', time: 12, emoji: '🍔' },
    { name: 'Margherita Pizza', time: 15, emoji: '🍕' },
    { name: 'Caesar Salad', time: 8, emoji: '🥗' },
    { name: 'Chicken Wings', time: 18, emoji: '🍗' },
    { name: 'Veggie Wrap', time: 10, emoji: '🌯' },
    { name: 'Fish & Chips', time: 20, emoji: '🐟' },
    { name: 'Pasta Carbonara', time: 14, emoji: '🍝' }
  ];
  
  return Array.from({ length: 12 }, (_, i) => ({
    id: `ORD-${1000 + i}`,
    customerName: names[Math.floor(Math.random() * names.length)],
    items: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () => {
      const item = items[Math.floor(Math.random() * items.length)];
      return {
        ...item,
        quantity: Math.floor(Math.random() * 3) + 1,
        notes: Math.random() > 0.7 ? 'Ohne Zwiebeln' : null
      };
    }),
    status: i < 3 ? ORDER_STATUS.NEW : 
            i < 6 ? ORDER_STATUS.ACCEPTED : 
            i < 9 ? ORDER_STATUS.PREPARING : ORDER_STATUS.READY,
    orderTime: new Date(Date.now() - (20 - i) * 60000),
    estimatedTime: 15 + Math.floor(Math.random() * 10),
    type: Math.random() > 0.5 ? 'dine-in' : 'takeaway',
    tableNumber: Math.random() > 0.5 ? Math.floor(Math.random() * 20) + 1 : null,
    priority: i === 0 || i === 3
  }));
};

const KitchenDisplay = () => {
  const [orders, setOrders] = useState(generateMockOrders());
  const [selectedView, setSelectedView] = useState('grid'); // grid, list, timeline
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoAccept, setAutoAccept] = useState(false);
  const [filter, setFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const audioRef = useRef(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Play sound for new orders
  const playNotificationSound = () => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
  };

  // Simulate new orders
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const newOrder = generateMockOrders()[0];
        newOrder.id = `ORD-${Date.now()}`;
        newOrder.orderTime = new Date();
        setOrders(prev => [newOrder, ...prev]);
        playNotificationSound();
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [soundEnabled]);

  // Calculate time elapsed
  const getElapsedTime = (orderTime) => {
    const elapsed = Math.floor((currentTime - orderTime) / 1000 / 60);
    return elapsed;
  };

  // Get time color based on urgency
  const getTimeColor = (elapsed, estimated) => {
    const percentage = (elapsed / estimated) * 100;
    if (percentage > 100) return 'danger';
    if (percentage > 80) return 'warning';
    if (percentage > 60) return 'caution';
    return 'normal';
  };

  // Update order status
  const updateOrderStatus = (orderId, newStatus) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
    
    if (newStatus === ORDER_STATUS.READY) {
      playNotificationSound();
    }
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return order.status !== ORDER_STATUS.COMPLETED;
    return order.status === filter;
  });

  // Group orders by status
  const groupedOrders = {
    new: filteredOrders.filter(o => o.status === ORDER_STATUS.NEW),
    accepted: filteredOrders.filter(o => o.status === ORDER_STATUS.ACCEPTED),
    preparing: filteredOrders.filter(o => o.status === ORDER_STATUS.PREPARING),
    ready: filteredOrders.filter(o => o.status === ORDER_STATUS.READY)
  };

  // Stats calculation
  const stats = {
    avgPrepTime: Math.floor(Math.random() * 5 + 12),
    ordersPerHour: Math.floor(Math.random() * 10 + 20),
    activeOrders: filteredOrders.length,
    readyOrders: groupedOrders.ready.length
  };

  return (
    <div className="kitchen-display">
      {/* Hidden audio element */}
      <audio ref={audioRef} src="/notification.mp3" />

      {/* Header */}
      <header className="kds-header">
        <div className="header-left">
          <h1 className="kds-title">
            <ChefHat className="title-icon" />
            Kitchen Display
          </h1>
          <div className="stats-row">
            <div className="stat-item">
              <Clock size={16} />
              <span>{currentTime.toLocaleTimeString('de-CH')}</span>
            </div>
            <div className="stat-item">
              <Timer size={16} />
              <span>Ø {stats.avgPrepTime} Min</span>
            </div>
            <div className="stat-item">
              <TrendingUp size={16} />
              <span>{stats.ordersPerHour} Orders/h</span>
            </div>
          </div>
        </div>

        <div className="header-controls">
          <button 
            className={`control-btn ${soundEnabled ? 'active' : ''}`}
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          
          <button 
            className={`control-btn ${autoAccept ? 'active' : ''}`}
            onClick={() => setAutoAccept(!autoAccept)}
          >
            <RefreshCw size={20} />
            <span>Auto</span>
          </button>

          <div className="view-toggle">
            <button 
              className={`view-btn ${selectedView === 'grid' ? 'active' : ''}`}
              onClick={() => setSelectedView('grid')}
            >
              Grid
            </button>
            <button 
              className={`view-btn ${selectedView === 'list' ? 'active' : ''}`}
              onClick={() => setSelectedView('list')}
            >
              List
            </button>
          </div>
        </div>
      </header>

      {/* Status Tabs */}
      <div className="status-tabs">
        <button
          className={`status-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Alle ({filteredOrders.length})
        </button>
        <button
          className={`status-tab new ${filter === 'new' ? 'active' : ''}`}
          onClick={() => setFilter('new')}
        >
          <Bell size={16} />
          Neu ({groupedOrders.new.length})
        </button>
        <button
          className={`status-tab accepted ${filter === 'accepted' ? 'active' : ''}`}
          onClick={() => setFilter('accepted')}
        >
          Angenommen ({groupedOrders.accepted.length})
        </button>
        <button
          className={`status-tab preparing ${filter === 'preparing' ? 'active' : ''}`}
          onClick={() => setFilter('preparing')}
        >
          <Flame size={16} />
          In Arbeit ({groupedOrders.preparing.length})
        </button>
        <button
          className={`status-tab ready ${filter === 'ready' ? 'active' : ''}`}
          onClick={() => setFilter('ready')}
        >
          <CheckCircle size={16} />
          Fertig ({groupedOrders.ready.length})
        </button>
      </div>

      {/* Orders Display */}
      <div className={`orders-container ${selectedView}`}>
        {filter === 'all' ? (
          // Kanban view for all orders
          <div className="kanban-board">
            {Object.entries(groupedOrders).map(([status, orders]) => (
              <div key={status} className="kanban-column">
                <h3 className={`column-header ${status}`}>
                  {status === 'new' && <Bell size={18} />}
                  {status === 'accepted' && <Clock size={18} />}
                  {status === 'preparing' && <Flame size={18} />}
                  {status === 'ready' && <CheckCircle size={18} />}
                  {status.charAt(0).toUpperCase() + status.slice(1)} ({orders.length})
                </h3>
                <div className="orders-list">
                  {orders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      currentTime={currentTime}
                      onStatusUpdate={updateOrderStatus}
                      onSelect={() => setSelectedOrder(order)}
                      view={selectedView}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Single status view
          <div className={`orders-${selectedView}`}>
            {filteredOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                currentTime={currentTime}
                onStatusUpdate={updateOrderStatus}
                onSelect={() => setSelectedOrder(order)}
                view={selectedView}
              />
            ))}
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusUpdate={updateOrderStatus}
        />
      )}
    </div>
  );
};

// Order Card Component
const OrderCard = ({ order, currentTime, onStatusUpdate, onSelect, view }) => {
  const elapsed = getElapsedTime(order.orderTime);
  const timeColor = getTimeColor(elapsed, order.estimatedTime);
  
  const getNextStatus = (currentStatus) => {
    switch (currentStatus) {
      case ORDER_STATUS.NEW: return ORDER_STATUS.ACCEPTED;
      case ORDER_STATUS.ACCEPTED: return ORDER_STATUS.PREPARING;
      case ORDER_STATUS.PREPARING: return ORDER_STATUS.READY;
      case ORDER_STATUS.READY: return ORDER_STATUS.COMPLETED;
      default: return null;
    }
  };

  const nextStatus = getNextStatus(order.status);

  return (
    <div 
      className={`order-card ${order.status} ${order.priority ? 'priority' : ''} ${timeColor}`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="order-header">
        <div className="order-info">
          <h4 className="order-number">{order.id}</h4>
          {order.priority && <span className="priority-badge">PRIORITÄT</span>}
        </div>
        <div className={`time-badge ${timeColor}`}>
          <Timer size={16} />
          <span>{elapsed} Min</span>
        </div>
      </div>

      {/* Customer Info */}
      <div className="customer-info">
        <User size={14} />
        <span>{order.customerName}</span>
        {order.tableNumber && (
          <>
            <span className="separator">•</span>
            <span>Tisch {order.tableNumber}</span>
          </>
        )}
      </div>

      {/* Items */}
      <div className="order-items">
        {order.items.map((item, index) => (
          <div key={index} className="item">
            <span className="item-emoji">{item.emoji}</span>
            <span className="item-quantity">{item.quantity}x</span>
            <span className="item-name">{item.name}</span>
            {item.notes && (
              <span className="item-note">
                <MessageSquare size={12} />
                {item.notes}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="order-actions">
        {order.status === ORDER_STATUS.NEW && (
          <>
            <button 
              className="action-btn reject"
              onClick={(e) => {
                e.stopPropagation();
                onStatusUpdate(order.id, ORDER_STATUS.CANCELLED);
              }}
            >
              <XCircle size={18} />
              Ablehnen
            </button>
            <button 
              className="action-btn accept"
              onClick={(e) => {
                e.stopPropagation();
                onStatusUpdate(order.id, ORDER_STATUS.ACCEPTED);
              }}
            >
              <CheckCircle size={18} />
              Annehmen
            </button>
          </>
        )}
        
        {order.status === ORDER_STATUS.ACCEPTED && (
          <button 
            className="action-btn start"
            onClick={(e) => {
              e.stopPropagation();
              onStatusUpdate(order.id, ORDER_STATUS.PREPARING);
            }}
          >
            <Flame size={18} />
            Starten
          </button>
        )}
        
        {order.status === ORDER_STATUS.PREPARING && (
          <button 
            className="action-btn ready"
            onClick={(e) => {
              e.stopPropagation();
              onStatusUpdate(order.id, ORDER_STATUS.READY);
            }}
          >
            <CheckCircle size={18} />
            Fertig
          </button>
        )}
        
        {order.status === ORDER_STATUS.READY && (
          <button 
            className="action-btn complete"
            onClick={(e) => {
              e.stopPropagation();
              onStatusUpdate(order.id, ORDER_STATUS.COMPLETED);
            }}
          >
            <Package size={18} />
            Abgeholt
          </button>
        )}
      </div>
    </div>
  );
};

// Order Detail Modal
const OrderDetailModal = ({ order, onClose, onStatusUpdate }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Bestellung {order.id}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="detail-section">
            <h3>Kundeninformationen</h3>
            <div className="detail-row">
              <User size={16} />
              <span>{order.customerName}</span>
            </div>
            {order.tableNumber && (
              <div className="detail-row">
                <MapPin size={16} />
                <span>Tisch {order.tableNumber}</span>
              </div>
            )}
          </div>

          <div className="detail-section">
            <h3>Bestelldetails</h3>
            {order.items.map((item, index) => (
              <div key={index} className="detail-item">
                <span className="item-emoji">{item.emoji}</span>
                <span className="item-quantity">{item.quantity}x</span>
                <span className="item-name">{item.name}</span>
                <span className="item-time">{item.time} Min</span>
                {item.notes && (
                  <div className="item-note-full">
                    <MessageSquare size={14} />
                    {item.notes}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="detail-section">
            <h3>Zeitverlauf</h3>
            <div className="timeline">
              <div className="timeline-item completed">
                <div className="timeline-marker" />
                <div className="timeline-content">
                  <span>Bestellt</span>
                  <time>{order.orderTime.toLocaleTimeString('de-CH')}</time>
                </div>
              </div>
              {/* Add more timeline items based on status */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KitchenDisplay;