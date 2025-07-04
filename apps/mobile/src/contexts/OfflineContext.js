/**
 * EATECH Mobile App - Offline Context
 * Version: 25.0.0
 * Description: Offline State Management für die EATECH Admin App
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/mobile/src/contexts/OfflineContext.js
 */

// ============================================================================
// IMPORTS
// ============================================================================
import React, { createContext, useContext, useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

// Services
import { offlineSyncService, offlineQueue } from '../services/offlineSyncService';

// ============================================================================
// CONTEXT
// ============================================================================
const OfflineContext = createContext({});

// ============================================================================
// OFFLINE PROVIDER
// ============================================================================
export const OfflineProvider = ({ children, networkState: initialNetworkState }) => {
  const [isOffline, setIsOffline] = useState(!initialNetworkState?.isConnected);
  const [queueStatus, setQueueStatus] = useState({ count: 0, pending: 0, failed: 0 });
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // ============================================================================
  // LIFECYCLE
  // ============================================================================
  useEffect(() => {
    setupNetworkListener();
    updateQueueStatus();
    loadLastSyncTime();
    
    return () => {
      // Cleanup if needed
    };
  }, []);

  // ============================================================================
  // NETWORK MONITORING
  // ============================================================================
  const setupNetworkListener = () => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = isOffline;
      const nowOffline = !state.isConnected;
      
      setIsOffline(nowOffline);
      
      // Trigger sync when coming back online
      if (wasOffline && !nowOffline) {
        console.log('Back online, triggering sync');
        syncQueue();
      }
    });

    return unsubscribe;
  };

  // ============================================================================
  // QUEUE MANAGEMENT
  // ============================================================================
  const updateQueueStatus = async () => {
    const status = await offlineQueue.getStatus();
    setQueueStatus(status);
  };

  const addToQueue = async (action) => {
    const id = await offlineQueue.add(action);
    await updateQueueStatus();
    return id;
  };

  const syncQueue = async () => {
    if (syncInProgress || isOffline) return;
    
    setSyncInProgress(true);
    
    try {
      await offlineQueue.sync();
      setLastSyncTime(new Date());
      await updateQueueStatus();
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setSyncInProgress(false);
    }
  };

  // ============================================================================
  // SYNC TIME
  // ============================================================================
  const loadLastSyncTime = async () => {
    const syncStatus = await offlineSyncService.getSyncStatus();
    if (syncStatus?.completed) {
      setLastSyncTime(new Date(syncStatus.completed));
    }
  };

  // ============================================================================
  // OFFLINE ACTIONS
  // ============================================================================
  const executeOfflineAction = async (type, payload) => {
    if (isOffline) {
      // Add to queue for later sync
      return await addToQueue({ type, payload });
    } else {
      // Execute immediately if online
      throw new Error('Should execute action directly when online');
    }
  };

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================
  const value = {
    isOffline,
    queueStatus,
    syncInProgress,
    lastSyncTime,
    syncQueue,
    addToQueue,
    executeOfflineAction,
  };

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
};

// ============================================================================
// HOOK
// ============================================================================
export const useOffline = () => {
  const context = useContext(OfflineContext);
  
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  
  return context;
};

// ============================================================================
// EXPORT
// ============================================================================
export default OfflineContext;