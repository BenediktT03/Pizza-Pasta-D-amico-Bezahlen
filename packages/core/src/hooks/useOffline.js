/**
 * EATECH - useOffline Hook
 * Version: 1.0.0
 * Description: React Hook für Offline-Funktionalität und Sync-Status
 * Features: Online/Offline Status, Sync Progress, Queue Management
 * 
 * Kapitel: Phase 4 - Advanced Features - Offline Support
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { offlineService } from '../services/OfflineService';
import { useTenant } from './useTenant';

// ============================================================================
// MAIN HOOK
// ============================================================================
export function useOffline() {
  const { currentTenant } = useTenant();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);
  const [pendingActions, setPendingActions] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncError, setSyncError] = useState(null);
  
  const syncTimeoutRef = useRef(null);
  
  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  useEffect(() => {
    // Set tenant in offline service
    if (currentTenant?.id) {
      offlineService.setTenant(currentTenant.id);
    }
    
    // Status changed listener
    const handleStatusChanged = ({ online }) => {
      setIsOnline(online);
      
      if (online) {
        // Clear any sync errors when coming back online
        setSyncError(null);
        
        // Show reconnection notification
        showNotification('Verbindung wiederhergestellt', {
          body: 'Ihre Daten werden synchronisiert...',
          type: 'success'
        });
      } else {
        // Show offline notification
        showNotification('Sie sind offline', {
          body: 'Änderungen werden lokal gespeichert',
          type: 'info'
        });
      }
    };
    
    // Sync progress listener
    const handleSyncProgress = (progress) => {
      setSyncProgress(progress);
      setIsSyncing(progress.inProgress);
    };
    
    // Sync complete listener
    const handleSyncComplete = ({ timestamp }) => {
      setIsSyncing(false);
      setSyncProgress(null);
      setLastSyncTime(timestamp);
      setPendingActions(0);
      
      // Show success notification
      showNotification('Synchronisation abgeschlossen', {
        body: 'Alle Daten sind aktuell',
        type: 'success'
      });
    };
    
    // Sync error listener
    const handleSyncError = ({ error }) => {
      setIsSyncing(false);
      setSyncProgress(null);
      setSyncError(error);
      
      // Show error notification
      showNotification('Synchronisationsfehler', {
        body: error,
        type: 'error'
      });
    };
    
    // Queue updated listener
    const handleQueueUpdated = async () => {
      const count = await offlineService.getPendingActionsCount();
      setPendingActions(count);
    };
    
    // Subscribe to events
    offlineService.on('statusChanged', handleStatusChanged);
    offlineService.on('syncProgress', handleSyncProgress);
    offlineService.on('syncComplete', handleSyncComplete);
    offlineService.on('syncError', handleSyncError);
    offlineService.on('queueUpdated', handleQueueUpdated);
    
    // Initial pending actions count
    handleQueueUpdated();
    
    // Cleanup
    return () => {
      offlineService.off('statusChanged', handleStatusChanged);
      offlineService.off('syncProgress', handleSyncProgress);
      offlineService.off('syncComplete', handleSyncComplete);
      offlineService.off('syncError', handleSyncError);
      offlineService.off('queueUpdated', handleQueueUpdated);
      
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [currentTenant]);
  
  // ==========================================================================
  // MANUAL SYNC
  // ==========================================================================
  const triggerSync = useCallback(async () => {
    if (!isOnline || isSyncing) {
      return;
    }
    
    setIsSyncing(true);
    setSyncError(null);
    
    try {
      await offlineService.performSync();
    } catch (error) {
      console.error('Manual sync failed:', error);
      setSyncError(error.message);
    }
  }, [isOnline, isSyncing]);
  
  // ==========================================================================
  // RETRY SYNC
  // ==========================================================================
  const retrySync = useCallback(() => {
    setSyncError(null);
    triggerSync();
  }, [triggerSync]);
  
  // ==========================================================================
  // CLEAR OFFLINE DATA
  // ==========================================================================
  const clearOfflineData = useCallback(async () => {
    try {
      await offlineService.clearAllData();
      setPendingActions(0);
      
      showNotification('Offline-Daten gelöscht', {
        body: 'Alle lokalen Daten wurden entfernt',
        type: 'info'
      });
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      
      showNotification('Fehler beim Löschen', {
        body: 'Offline-Daten konnten nicht gelöscht werden',
        type: 'error'
      });
    }
  }, []);
  
  // ==========================================================================
  // NOTIFICATIONS
  // ==========================================================================
  const showNotification = (title, options = {}) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/images/logo-192.png',
        badge: '/images/badge-72.png',
        ...options
      });
    }
  };
  
  // ==========================================================================
  // PRODUCTS
  // ==========================================================================
  const getProducts = useCallback(async (categoryId = null) => {
    try {
      return await offlineService.getProducts(categoryId);
    } catch (error) {
      console.error('Failed to get products:', error);
      return [];
    }
  }, []);
  
  const saveProduct = useCallback(async (product) => {
    try {
      const saved = await offlineService.saveProduct(product);
      
      if (!isOnline) {
        showNotification('Produkt offline gespeichert', {
          body: 'Wird synchronisiert, sobald Sie online sind',
          type: 'info'
        });
      }
      
      return saved;
    } catch (error) {
      console.error('Failed to save product:', error);
      throw error;
    }
  }, [isOnline]);
  
  // ==========================================================================
  // ORDERS
  // ==========================================================================
  const saveOrder = useCallback(async (order) => {
    try {
      const saved = await offlineService.saveOrder(order);
      
      if (!isOnline) {
        showNotification('Bestellung offline gespeichert', {
          body: `Bestellung #${saved.orderNumber} wird später übertragen`,
          type: 'warning'
        });
      }
      
      return saved;
    } catch (error) {
      console.error('Failed to save order:', error);
      throw error;
    }
  }, [isOnline]);
  
  const getOrders = useCallback(async (status = null) => {
    try {
      return await offlineService.getOrders(status);
    } catch (error) {
      console.error('Failed to get orders:', error);
      return [];
    }
  }, []);
  
  // ==========================================================================
  // CART
  // ==========================================================================
  const addToCart = useCallback(async (productId, quantity, modifiers) => {
    try {
      return await offlineService.addToCart(productId, quantity, modifiers);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      throw error;
    }
  }, []);
  
  const updateCartItem = useCallback(async (itemId, updates) => {
    try {
      return await offlineService.updateCartItem(itemId, updates);
    } catch (error) {
      console.error('Failed to update cart item:', error);
      throw error;
    }
  }, []);
  
  const removeFromCart = useCallback(async (itemId) => {
    try {
      await offlineService.removeFromCart(itemId);
    } catch (error) {
      console.error('Failed to remove from cart:', error);
      throw error;
    }
  }, []);
  
  const getCart = useCallback(async () => {
    try {
      return await offlineService.getCart();
    } catch (error) {
      console.error('Failed to get cart:', error);
      return [];
    }
  }, []);
  
  const clearCart = useCallback(async () => {
    try {
      await offlineService.clearCart();
    } catch (error) {
      console.error('Failed to clear cart:', error);
      throw error;
    }
  }, []);
  
  // ==========================================================================
  // ANALYTICS
  // ==========================================================================
  const trackEvent = useCallback(async (event, data) => {
    try {
      await offlineService.trackEvent(event, data);
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }, []);
  
  // ==========================================================================
  // RETURN VALUE
  // ==========================================================================
  return {
    // Status
    isOnline,
    isSyncing,
    syncProgress,
    pendingActions,
    lastSyncTime,
    syncError,
    
    // Actions
    triggerSync,
    retrySync,
    clearOfflineData,
    
    // Data Operations
    products: {
      get: getProducts,
      save: saveProduct
    },
    orders: {
      get: getOrders,
      save: saveOrder
    },
    cart: {
      add: addToCart,
      update: updateCartItem,
      remove: removeFromCart,
      get: getCart,
      clear: clearCart
    },
    
    // Analytics
    trackEvent
  };
}

// ============================================================================
// OFFLINE INDICATOR COMPONENT
// ============================================================================
export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingActions, syncError, retrySync } = useOffline();
  
  if (isOnline && !isSyncing && pendingActions === 0 && !syncError) {
    return null;
  }
  
  return (
    <div className={`offline-indicator ${!isOnline ? 'offline' : ''}`}>
      <div className="offline-indicator-content">
        {!isOnline && (
          <div className="offline-status">
            <svg className="icon" viewBox="0 0 24 24">
              <path d="M1 9l2-2v8a2 2 0 002 2h14a2 2 0 002-2V7l2 2V2l-11 9L1 2z" />
            </svg>
            <span>Offline-Modus</span>
          </div>
        )}
        
        {isSyncing && (
          <div className="sync-status">
            <svg className="icon spin" viewBox="0 0 24 24">
              <path d="M21 2v6h-6M3 12a9 9 0 0115-6.7L21 8M3 22v-6h6M21 12a9 9 0 01-15 6.7L3 16" />
            </svg>
            <span>Synchronisiere...</span>
          </div>
        )}
        
        {pendingActions > 0 && !isSyncing && (
          <div className="pending-status">
            <span>{pendingActions} ausstehende Aktionen</span>
          </div>
        )}
        
        {syncError && (
          <div className="sync-error">
            <span>Sync-Fehler</span>
            <button onClick={retrySync} className="retry-button">
              Wiederholen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const offlineIndicatorStyles = `
.offline-indicator {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(59, 130, 246, 0.95);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  z-index: 9999;
  transition: all 0.3s ease;
}

.offline-indicator.offline {
  background: rgba(239, 68, 68, 0.95);
}

.offline-indicator-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.offline-status,
.sync-status,
.pending-status,
.sync-error {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.icon.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.retry-button {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.retry-button:hover {
  background: rgba(255, 255, 255, 0.3);
}

@media (max-width: 640px) {
  .offline-indicator {
    bottom: 70px;
    left: 10px;
    right: 10px;
    transform: none;
  }
}
`;