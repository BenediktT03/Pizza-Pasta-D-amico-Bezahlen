/**
 * EATECH - Kitchen Display System
 * Version: 1.0.0
 * Description: Real-time Kitchen Display für Bestellverwaltung
 * Features: Order Queue, Timer, Station Management, Sound Alerts
 * 
 * Kapitel: Phase 4 - Advanced Features - Kitchen Display
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Clock, 
  Bell, 
  CheckCircle, 
  AlertCircle, 
  Timer,
  Utensils,
  ChefHat,
  Package,
  Volume2,
  VolumeX,
  Settings,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { format, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { de } from 'date-fns/locale';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

// Hooks
import { useKitchen } from '../../../packages/core/src/hooks/useKitchen';
import { useTenant } from '../../../packages/core/src/hooks/useTenant';
import { useSound } from '../../../packages/core/src/hooks/useSound';

// Components
import OrderCard from '../../components/Kitchen/OrderCard';
import StationColumn from '../../components/Kitchen/StationColumn';
import KitchenSettings from '../../components/Kitchen/KitchenSettings';
import PrepTimeIndicator from '../../components/Kitchen/PrepTimeIndicator';

// Styles
import styles from './KitchenDisplay.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const STATIONS = {
  NEW: {
    id: 'new',
    name: 'Neue Bestellungen',
    icon: Bell,
    color: '#3b82f6',
    maxItems: null
  },
  PREPARATION: {
    id: 'preparation',
    name: 'In Zubereitung',
    icon: ChefHat,
    color: '#f59e0b',
    maxItems: null,
    subStations: [
      { id: 'grill', name: 'Grill', icon: Utensils },
      { id: 'fryer', name: 'Fritteuse', icon: Utensils },
      { id: 'salad', name: 'Salat', icon: Utensils },
      { id: 'drinks', name: 'Getränke', icon: Utensils }
    ]
  },
  QUALITY_CHECK: {
    id: 'quality_check',
    name: 'Qualitätskontrolle',
    icon: CheckCircle,
    color: '#8b5cf6',
    maxItems: 5
  },
  READY: {
    id: 'ready',
    name: 'Abholbereit',
    icon: Package,
    color: '#10b981',
    maxItems: null
  }
};

const PREP_TIME_THRESHOLDS = {
  normal: 15, // minutes
  warning: 20,
  critical: 25
};

const SOUND_EFFECTS = {
  newOrder: '/sounds/new-order.mp3',
  orderReady: '/sounds/order-ready.mp3',
  warning: '/sounds/warning.mp3',
  urgent: '/sounds/urgent.mp3'
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function KitchenDisplay() {
  const { currentTenant } = useTenant();
  const kitchen = useKitchen();
  const { playSound, toggleMute, isMuted } = useSound();
  
  // State
  const [orders, setOrders] = useState({
    new: [],
    preparation: [],
    quality_check: [],
    ready: []
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    autoAccept: false,
    soundEnabled: true,
    showPrepTime: true,
    groupByStation: false,
    largeDisplay: false,
    darkMode: false
  });
  const [stats, setStats] = useState({
    averagePrepTime: 0,
    ordersCompleted: 0,
    ordersInProgress: 0,
    peakTime: false
  });
  
  // Refs
  const timerRef = useRef(null);
  const soundQueueRef = useRef([]);
  
  // ==========================================================================
  // EFFECTS
  // ==========================================================================
  useEffect(() => {
    if (!currentTenant?.id) return;
    
    // Subscribe to real-time orders
    const unsubscribe = kitchen.subscribeToOrders(currentTenant.id, (newOrders) => {
      handleOrdersUpdate(newOrders);
    });
    
    // Start timer for prep time updates
    timerRef.current = setInterval(updatePrepTimes, 1000);
    
    return () => {
      unsubscribe();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentTenant]);
  
  // ==========================================================================
  // ORDER HANDLING
  // ==========================================================================
  const handleOrdersUpdate = useCallback((newOrders) => {
    const categorizedOrders = {
      new: [],
      preparation: [],
      quality_check: [],
      ready: []
    };
    
    newOrders.forEach(order => {
      const enrichedOrder = {
        ...order,
        prepTime: calculatePrepTime(order),
        priority: calculatePriority(order),
        items: groupItemsByStation(order.items)
      };
      
      switch (order.status) {
        case 'pending':
        case 'confirmed':
          categorizedOrders.new.push(enrichedOrder);
          break;
        case 'preparing':
          categorizedOrders.preparation.push(enrichedOrder);
          break;
        case 'quality_check':
          categorizedOrders.quality_check.push(enrichedOrder);
          break;
        case 'ready':
          categorizedOrders.ready.push(enrichedOrder);
          break;
      }
    });
    
    // Sort by priority and time
    Object.keys(categorizedOrders).forEach(status => {
      categorizedOrders[status].sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
    });
    
    // Check for new orders
    const currentNewOrders = orders.new.map(o => o.id);
    const incomingNewOrders = categorizedOrders.new.map(o => o.id);
    const hasNewOrders = incomingNewOrders.some(id => !currentNewOrders.includes(id));
    
    if (hasNewOrders && settings.soundEnabled) {
      playSound(SOUND_EFFECTS.newOrder);
    }
    
    setOrders(categorizedOrders);
    updateStats(categorizedOrders);
  }, [orders, settings.soundEnabled, playSound]);
  
  const calculatePrepTime = useCallback((order) => {
    const created = new Date(order.createdAt);
    const now = new Date();
    return differenceInMinutes(now, created);
  }, []);
  
  const calculatePriority = useCallback((order) => {
    let priority = 0;
    
    // Time-based priority
    const prepTime = calculatePrepTime(order);
    if (prepTime > PREP_TIME_THRESHOLDS.critical) {
      priority += 3;
    } else if (prepTime > PREP_TIME_THRESHOLDS.warning) {
      priority += 2;
    } else if (prepTime > PREP_TIME_THRESHOLDS.normal) {
      priority += 1;
    }
    
    // Order type priority
    if (order.isUrgent) priority += 2;
    if (order.isVIP) priority += 1;
    if (order.deliveryMethod === 'dine_in') priority += 1;
    
    return priority;
  }, []);
  
  const groupItemsByStation = useCallback((items) => {
    if (!settings.groupByStation) return items;
    
    const grouped = {};
    
    items.forEach(item => {
      const station = item.station || 'general';
      if (!grouped[station]) {
        grouped[station] = [];
      }
      grouped[station].push(item);
    });
    
    return grouped;
  }, [settings.groupByStation]);
  
  const updatePrepTimes = useCallback(() => {
    setOrders(prev => {
      const updated = { ...prev };
      
      Object.keys(updated).forEach(status => {
        updated[status] = updated[status].map(order => ({
          ...order,
          prepTime: calculatePrepTime(order),
          priority: calculatePriority(order)
        }));
      });
      
      return updated;
    });
  }, [calculatePrepTime, calculatePriority]);
  
  const updateStats = useCallback((categorizedOrders) => {
    const inProgress = 
      categorizedOrders.new.length + 
      categorizedOrders.preparation.length + 
      categorizedOrders.quality_check.length;
    
    const completed = categorizedOrders.ready.filter(o => 
      differenceInMinutes(new Date(), new Date(o.readyAt)) < 30
    ).length;
    
    const avgPrepTime = kitchen.getAveragePrepTime();
    const isPeakTime = kitchen.isPeakTime();
    
    setStats({
      averagePrepTime: avgPrepTime,
      ordersCompleted: completed,
      ordersInProgress: inProgress,
      peakTime: isPeakTime
    });
  }, [kitchen]);
  
  // ==========================================================================
  // DRAG & DROP
  // ==========================================================================
  const handleDragEnd = useCallback(async (result) => {
    if (!result.destination) return;
    
    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId) {
      // Reorder within same column
      const items = Array.from(orders[source.droppableId]);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);
      
      setOrders(prev => ({
        ...prev,
        [source.droppableId]: items
      }));
    } else {
      // Move between columns
      const sourceItems = Array.from(orders[source.droppableId]);
      const destItems = Array.from(orders[destination.droppableId]);
      const [movedItem] = sourceItems.splice(source.index, 1);
      
      // Update order status
      const newStatus = getStatusFromColumn(destination.droppableId);
      movedItem.status = newStatus;
      
      destItems.splice(destination.index, 0, movedItem);
      
      setOrders(prev => ({
        ...prev,
        [source.droppableId]: sourceItems,
        [destination.droppableId]: destItems
      }));
      
      // Update in backend
      await kitchen.updateOrderStatus(movedItem.id, newStatus);
      
      // Play sound for status changes
      if (newStatus === 'ready' && settings.soundEnabled) {
        playSound(SOUND_EFFECTS.orderReady);
      }
    }
  }, [orders, kitchen, settings.soundEnabled, playSound]);
  
  const getStatusFromColumn = (columnId) => {
    const statusMap = {
      new: 'confirmed',
      preparation: 'preparing',
      quality_check: 'quality_check',
      ready: 'ready'
    };
    return statusMap[columnId] || 'pending';
  };
  
  // ==========================================================================
  // ACTIONS
  // ==========================================================================
  const handleAcceptOrder = useCallback(async (orderId) => {
    await kitchen.acceptOrder(orderId);
  }, [kitchen]);
  
  const handleCompleteOrder = useCallback(async (orderId) => {
    await kitchen.completeOrder(orderId);
    
    if (settings.soundEnabled) {
      playSound(SOUND_EFFECTS.orderReady);
    }
  }, [kitchen, settings.soundEnabled, playSound]);
  
  const handleRecallOrder = useCallback(async (orderId) => {
    // Move order back to preparation
    const order = orders.ready.find(o => o.id === orderId);
    if (order) {
      await kitchen.updateOrderStatus(orderId, 'preparing');
    }
  }, [orders, kitchen]);
  
  const handleBumpOrder = useCallback(async (orderId) => {
    // Remove from display (mark as picked up)
    await kitchen.markAsPickedUp(orderId);
  }, [kitchen]);
  
  const handleRefreshDisplay = useCallback(() => {
    window.location.reload();
  }, []);
  
  // ==========================================================================
  // RENDER
  // ==========================================================================
  const renderOrdersByStation = (orderList, status) => {
    if (!settings.groupByStation || status !== 'preparation') {
      return orderList.map((order, index) => (
        <Draggable key={order.id} draggableId={order.id} index={index}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}
            >
              <OrderCard
                order={order}
                onSelect={() => setSelectedOrder(order)}
                onAccept={() => handleAcceptOrder(order.id)}
                onComplete={() => handleCompleteOrder(order.id)}
                onRecall={() => handleRecallOrder(order.id)}
                onBump={() => handleBumpOrder(order.id)}
                isLarge={settings.largeDisplay}
                showPrepTime={settings.showPrepTime}
                isDragging={snapshot.isDragging}
              />
            </div>
          )}
        </Draggable>
      ));
    }
    
    // Group by station for preparation column
    const stations = STATIONS.PREPARATION.subStations || [];
    
    return stations.map(station => {
      const stationOrders = orderList.filter(order => 
        order.items[station.id]?.length > 0
      );
      
      if (stationOrders.length === 0) return null;
      
      return (
        <div key={station.id} className={styles.stationGroup}>
          <div className={styles.stationHeader}>
            <station.icon size={16} />
            <span>{station.name}</span>
            <span className={styles.stationCount}>{stationOrders.length}</span>
          </div>
          
          {stationOrders.map((order, index) => (
            <Draggable key={order.id} draggableId={order.id} index={index}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                >
                  <OrderCard
                    order={order}
                    station={station.id}
                    onSelect={() => setSelectedOrder(order)}
                    onAccept={() => handleAcceptOrder(order.id)}
                    onComplete={() => handleCompleteOrder(order.id)}
                    isLarge={settings.largeDisplay}
                    showPrepTime={settings.showPrepTime}
                    isDragging={snapshot.isDragging}
                  />
                </div>
              )}
            </Draggable>
          ))}
        </div>
      );
    }).filter(Boolean);
  };
  
  return (
    <div className={`${styles.kitchenDisplay} ${settings.darkMode ? styles.dark : ''} ${settings.largeDisplay ? styles.large : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Küchendisplay</h1>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <Clock size={16} />
              <span>{format(new Date(), 'HH:mm:ss', { locale: de })}</span>
            </div>
            <div className={styles.stat}>
              <Timer size={16} />
              <span>Ø {stats.averagePrepTime} min</span>
            </div>
            <div className={styles.stat}>
              <Package size={16} />
              <span>{stats.ordersInProgress} aktiv</span>
            </div>
            {stats.peakTime && (
              <div className={`${styles.stat} ${styles.peakTime}`}>
                <Zap size={16} />
                <span>Stoßzeit</span>
              </div>
            )}
          </div>
        </div>
        
        <div className={styles.headerRight}>
          <button
            className={styles.iconButton}
            onClick={() => toggleMute()}
            title={isMuted ? 'Ton einschalten' : 'Ton ausschalten'}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          
          <button
            className={styles.iconButton}
            onClick={handleRefreshDisplay}
            title="Aktualisieren"
          >
            <RefreshCw size={20} />
          </button>
          
          <button
            className={styles.iconButton}
            onClick={() => setShowSettings(true)}
            title="Einstellungen"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>
      
      {/* Main Display */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className={styles.columnsContainer}>
          {Object.entries(STATIONS).map(([key, station]) => {
            const columnOrders = orders[station.id] || [];
            const hasCapacity = !station.maxItems || columnOrders.length < station.maxItems;
            
            return (
              <div 
                key={station.id} 
                className={`${styles.column} ${!hasCapacity ? styles.full : ''}`}
              >
                <div 
                  className={styles.columnHeader}
                  style={{ borderBottomColor: station.color }}
                >
                  <div className={styles.columnTitle}>
                    <station.icon size={20} />
                    <span>{station.name}</span>
                    <span className={styles.columnCount}>
                      {columnOrders.length}
                      {station.maxItems && ` / ${station.maxItems}`}
                    </span>
                  </div>
                  
                  {key === 'NEW' && settings.autoAccept && (
                    <div className={styles.autoAcceptBadge}>
                      Auto
                    </div>
                  )}
                </div>
                
                <Droppable droppableId={station.id}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`${styles.columnContent} ${snapshot.isDraggingOver ? styles.draggingOver : ''}`}
                    >
                      {renderOrdersByStation(columnOrders, station.id)}
                      {provided.placeholder}
                      
                      {columnOrders.length === 0 && (
                        <div className={styles.emptyState}>
                          <station.icon size={32} />
                          <span>Keine Bestellungen</span>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
                
                {/* Capacity Warning */}
                {!hasCapacity && (
                  <div className={styles.capacityWarning}>
                    <AlertTriangle size={16} />
                    <span>Kapazität erreicht</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DragDropContext>
      
      {/* Settings Modal */}
      {showSettings && (
        <KitchenSettings
          settings={settings}
          onUpdate={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
      
      {/* Order Details Modal */}
      {selectedOrder && (
        <div className={styles.orderDetailsModal} onClick={() => setSelectedOrder(null)}>
          <div className={styles.orderDetails} onClick={e => e.stopPropagation()}>
            <div className={styles.orderDetailsHeader}>
              <h2>Bestellung #{selectedOrder.orderNumber}</h2>
              <button 
                className={styles.closeButton}
                onClick={() => setSelectedOrder(null)}
              >
                ×
              </button>
            </div>
            
            <div className={styles.orderDetailsContent}>
              <div className={styles.detailSection}>
                <h3>Kunde</h3>
                <p>{selectedOrder.customer?.name || 'Gast'}</p>
                {selectedOrder.customer?.notes && (
                  <p className={styles.notes}>{selectedOrder.customer.notes}</p>
                )}
              </div>
              
              <div className={styles.detailSection}>
                <h3>Artikel</h3>
                {Object.entries(selectedOrder.items).map(([station, items]) => (
                  <div key={station} className={styles.stationItems}>
                    <h4>{station}</h4>
                    {items.map((item, index) => (
                      <div key={index} className={styles.itemDetail}>
                        <span className={styles.itemQuantity}>{item.quantity}x</span>
                        <span className={styles.itemName}>{item.name}</span>
                        {item.modifiers?.length > 0 && (
                          <ul className={styles.modifiers}>
                            {item.modifiers.map((mod, i) => (
                              <li key={i}>{mod}</li>
                            ))}
                          </ul>
                        )}
                        {item.notes && (
                          <p className={styles.itemNotes}>{item.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              
              <div className={styles.detailSection}>
                <h3>Zeiten</h3>
                <p>Bestellt: {format(new Date(selectedOrder.createdAt), 'HH:mm:ss', { locale: de })}</p>
                <p>Zubereitungszeit: {selectedOrder.prepTime} Minuten</p>
                {selectedOrder.estimatedReadyTime && (
                  <p>Geschätzt fertig: {format(new Date(selectedOrder.estimatedReadyTime), 'HH:mm', { locale: de })}</p>
                )}
              </div>
            </div>
            
            <div className={styles.orderDetailsActions}>
              {selectedOrder.status === 'new' && (
                <button 
                  className={`${styles.actionButton} ${styles.accept}`}
                  onClick={() => {
                    handleAcceptOrder(selectedOrder.id);
                    setSelectedOrder(null);
                  }}
                >
                  <CheckCircle size={20} />
                  Annehmen
                </button>
              )}
              
              {selectedOrder.status === 'preparation' && (
                <button 
                  className={`${styles.actionButton} ${styles.complete}`}
                  onClick={() => {
                    handleCompleteOrder(selectedOrder.id);
                    setSelectedOrder(null);
                  }}
                >
                  <CheckCircle size={20} />
                  Fertig
                </button>
              )}
              
              {selectedOrder.status === 'ready' && (
                <>
                  <button 
                    className={`${styles.actionButton} ${styles.recall}`}
                    onClick={() => {
                      handleRecallOrder(selectedOrder.id);
                      setSelectedOrder(null);
                    }}
                  >
                    <RefreshCw size={20} />
                    Zurück
                  </button>
                  
                  <button 
                    className={`${styles.actionButton} ${styles.bump}`}
                    onClick={() => {
                      handleBumpOrder(selectedOrder.id);
                      setSelectedOrder(null);
                    }}
                  >
                    <ChevronRight size={20} />
                    Abgeholt
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Prep Time Alerts */}
      <PrepTimeIndicator 
        orders={[...orders.new, ...orders.preparation]}
        thresholds={PREP_TIME_THRESHOLDS}
        onAlert={(order) => {
          if (settings.soundEnabled) {
            if (order.prepTime > PREP_TIME_THRESHOLDS.critical) {
              playSound(SOUND_EFFECTS.urgent);
            } else if (order.prepTime > PREP_TIME_THRESHOLDS.warning) {
              playSound(SOUND_EFFECTS.warning);
            }
          }
        }}
      />
    </div>
  );
}