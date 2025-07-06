/**
 * EATECH - Offline Indicator Component
 * Version: 3.9.0
 * Description: React Native Offline Indicator mit Smart Sync und Lazy Loading
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/mobile/src/components/OfflineIndicator.jsx
 * 
 * Features: Network status, sync progress, offline queue management
 */

import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import {
  View,
  Text,
  Animated,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform
} from 'react-native';
import NetInfo from '@react-native-netinfo/netinfo';
import {
  WifiOff,
  Wifi,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
  Download
} from 'lucide-react-native';

// Lazy loaded components
const SyncProgressModal = lazy(() => import('./SyncProgressModal'));
const OfflineQueueModal = lazy(() => import('./OfflineQueueModal'));
const NetworkStatusModal = lazy(() => import('./NetworkStatusModal'));

// Lazy loaded services
const offlineSyncService = () => import('../services/OfflineSyncService');
const networkMonitor = () => import('../services/NetworkMonitor');
const queueManager = () => import('../services/QueueManager');

const { width } = Dimensions.get('window');

const INDICATOR_STATES = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  SYNCING: 'syncing',
  ERROR: 'error'
};

const NETWORK_TYPES = {
  WIFI: 'wifi',
  CELLULAR: 'cellular',
  NONE: 'none',
  UNKNOWN: 'unknown'
};

const OfflineIndicator = ({
  onSyncComplete,
  onSyncError,
  showDetails = true,
  autoSync = true,
  style = {}
}) => {
  const [networkState, setNetworkState] = useState({
    isConnected: true,
    type: NETWORK_TYPES.WIFI,
    isInternetReachable: true,
    details: {}
  });
  const [indicatorState, setIndicatorState] = useState(INDICATOR_STATES.ONLINE);
  const [syncProgress, setSyncProgress] = useState(0);
  const [queueCount, setQueueCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  // Animation refs
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Service refs
  const syncServiceRef = useRef(null);
  const networkMonitorRef = useRef(null);
  const queueManagerRef = useRef(null);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  useEffect(() => {
    initializeServices();
    setupNetworkListener();
    
    return () => {
      cleanup();
    };
  }, []);

  const initializeServices = async () => {
    try {
      // Initialize Offline Sync Service
      const { default: OfflineSyncService } = await offlineSyncService();
      syncServiceRef.current = new OfflineSyncService();
      await syncServiceRef.current.initialize();
      
      syncServiceRef.current.on('syncStarted', handleSyncStarted);
      syncServiceRef.current.on('syncProgress', handleSyncProgress);
      syncServiceRef.current.on('syncCompleted', handleSyncCompleted);
      syncServiceRef.current.on('syncError', handleSyncError);
      
      // Initialize Network Monitor
      const { default: NetworkMonitor } = await networkMonitor();
      networkMonitorRef.current = new NetworkMonitor();
      await networkMonitorRef.current.initialize();
      
      // Initialize Queue Manager
      const { default: QueueManager } = await queueManager();
      queueManagerRef.current = new QueueManager();
      await queueManagerRef.current.initialize();
      
      queueManagerRef.current.on('queueUpdated', handleQueueUpdated);
      
      // Load initial queue count
      const initialCount = await queueManagerRef.current.getQueueCount();
      setQueueCount(initialCount);
      
    } catch (error) {
      console.error('Error initializing offline indicator services:', error);
    }
  };

  const setupNetworkListener = () => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const newNetworkState = {
        isConnected: state.isConnected,
        type: state.type,
        isInternetReachable: state.isInternetReachable,
        details: state.details
      };
      
      setNetworkState(newNetworkState);
      handleNetworkChange(newNetworkState);
    });
    
    return unsubscribe;
  };

  const cleanup = () => {
    if (syncServiceRef.current) {
      syncServiceRef.current.removeAllListeners();
    }
    if (queueManagerRef.current) {
      queueManagerRef.current.removeAllListeners();
    }
  };

  // ============================================================================
  // NETWORK HANDLING
  // ============================================================================
  const handleNetworkChange = useCallback((newState) => {
    const wasOffline = indicatorState === INDICATOR_STATES.OFFLINE;
    const isNowOnline = newState.isConnected && newState.isInternetReachable;
    
    if (isNowOnline) {
      setIndicatorState(INDICATOR_STATES.ONLINE);
      
      // If we were offline and now online, trigger sync if auto-sync is enabled
      if (wasOffline && autoSync && queueCount > 0) {
        triggerSync();
      }
      
      // Hide indicator after a delay when online
      setTimeout(() => hideIndicator(), 2000);
    } else {
      setIndicatorState(INDICATOR_STATES.OFFLINE);
      showIndicator();
    }
  }, [indicatorState, autoSync, queueCount]);

  // ============================================================================
  // SYNC HANDLING
  // ============================================================================
  const handleSyncStarted = useCallback(() => {
    setIndicatorState(INDICATOR_STATES.SYNCING);
    setSyncProgress(0);
    setSyncError(null);
    showIndicator();
    startSyncAnimation();
  }, []);

  const handleSyncProgress = useCallback((progress) => {
    setSyncProgress(progress);
  }, []);

  const handleSyncCompleted = useCallback(() => {
    setIndicatorState(INDICATOR_STATES.ONLINE);
    setSyncProgress(100);
    setLastSyncTime(new Date());
    stopSyncAnimation();
    
    // Hide indicator after success
    setTimeout(() => hideIndicator(), 3000);
    
    onSyncComplete?.();
  }, [onSyncComplete]);

  const handleSyncError = useCallback((error) => {
    setIndicatorState(INDICATOR_STATES.ERROR);
    setSyncError(error);
    stopSyncAnimation();
    
    onSyncError?.(error);
  }, [onSyncError]);

  const handleQueueUpdated = useCallback((count) => {
    setQueueCount(count);
    
    // Show indicator if there are items in queue and we're offline
    if (count > 0 && !networkState.isConnected) {
      showIndicator();
    }
  }, [networkState.isConnected]);

  // ============================================================================
  // SYNC ACTIONS
  // ============================================================================
  const triggerSync = useCallback(async () => {
    if (!syncServiceRef.current || !networkState.isConnected) {
      return;
    }
    
    try {
      await syncServiceRef.current.startSync();
    } catch (error) {
      console.error('Error triggering sync:', error);
      handleSyncError(error);
    }
  }, [networkState.isConnected]);

  const retrySync = useCallback(async () => {
    setSyncError(null);
    await triggerSync();
  }, [triggerSync]);

  // ============================================================================
  // ANIMATIONS
  // ============================================================================
  const showIndicator = useCallback(() => {
    if (isVisible) return;
    
    setIsVisible(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8
    }).start();
    
    // Start pulse animation for offline state
    if (indicatorState === INDICATOR_STATES.OFFLINE) {
      startPulseAnimation();
    }
  }, [isVisible, indicatorState, slideAnim]);

  const hideIndicator = useCallback(() => {
    if (!isVisible) return;
    
    Animated.timing(slideAnim, {
      toValue: -60,
      duration: 300,
      useNativeDriver: true
    }).start(() => {
      setIsVisible(false);
      stopAllAnimations();
    });
  }, [isVisible, slideAnim]);

  const startPulseAnimation = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        })
      ])
    ).start();
  }, [pulseAnim]);

  const startSyncAnimation = useCallback(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true
      })
    ).start();
  }, [rotateAnim]);

  const stopSyncAnimation = useCallback(() => {
    rotateAnim.stopAnimation();
    rotateAnim.setValue(0);
  }, [rotateAnim]);

  const stopAllAnimations = useCallback(() => {
    pulseAnim.stopAnimation();
    rotateAnim.stopAnimation();
    pulseAnim.setValue(1);
    rotateAnim.setValue(0);
  }, [pulseAnim, rotateAnim]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  const getIndicatorConfig = () => {
    switch (indicatorState) {
      case INDICATOR_STATES.ONLINE:
        return {
          icon: Wifi,
          color: '#10B981',
          text: 'Online',
          backgroundColor: '#ECFDF5'
        };
      case INDICATOR_STATES.OFFLINE:
        return {
          icon: WifiOff,
          color: '#EF4444',
          text: `Offline${queueCount > 0 ? ` (${queueCount} wartend)` : ''}`,
          backgroundColor: '#FEF2F2'
        };
      case INDICATOR_STATES.SYNCING:
        return {
          icon: RefreshCw,
          color: '#3B82F6',
          text: `Synchronisierung... ${Math.round(syncProgress)}%`,
          backgroundColor: '#EFF6FF'
        };
      case INDICATOR_STATES.ERROR:
        return {
          icon: AlertCircle,
          color: '#F59E0B',
          text: 'Sync-Fehler',
          backgroundColor: '#FFFBEB'
        };
      default:
        return {
          icon: Wifi,
          color: '#6B7280',
          text: 'Unbekannt',
          backgroundColor: '#F9FAFB'
        };
    }
  };

  const getNetworkTypeIcon = () => {
    switch (networkState.type) {
      case NETWORK_TYPES.WIFI:
        return Wifi;
      case NETWORK_TYPES.CELLULAR:
        return Upload;
      default:
        return WifiOff;
    }
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  const config = getIndicatorConfig();
  const IconComponent = config.icon;
  const NetworkIcon = getNetworkTypeIcon();

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  if (!isVisible && indicatorState === INDICATOR_STATES.ONLINE) {
    return null;
  }

  return (
    <>
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: config.backgroundColor,
            transform: [{ translateY: slideAnim }, { scale: pulseAnim }]
          },
          style
        ]}
      >
        <TouchableOpacity
          style={styles.touchable}
          onPress={() => {
            if (showDetails) {
              if (indicatorState === INDICATOR_STATES.SYNCING) {
                setShowProgressModal(true);
              } else if (queueCount > 0) {
                setShowQueueModal(true);
              } else {
                setShowNetworkModal(true);
              }
            }
          }}
          activeOpacity={0.8}
        >
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              {indicatorState === INDICATOR_STATES.SYNCING ? (
                <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                  <IconComponent size={16} color={config.color} />
                </Animated.View>
              ) : (
                <IconComponent size={16} color={config.color} />
              )}
            </View>
            
            <Text style={[styles.text, { color: config.color }]}>
              {config.text}
            </Text>
            
            {networkState.isConnected && showDetails && (
              <View style={styles.networkTypeContainer}>
                <NetworkIcon size={12} color={config.color} />
              </View>
            )}
            
            {indicatorState === INDICATOR_STATES.ERROR && (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={retrySync}
              >
                <RefreshCw size={14} color={config.color} />
              </TouchableOpacity>
            )}
          </View>
          
          {indicatorState === INDICATOR_STATES.SYNCING && (
            <View style={styles.progressContainer}>
              <View 
                style={[
                  styles.progressBar,
                  { 
                    width: `${syncProgress}%`,
                    backgroundColor: config.color
                  }
                ]}
              />
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Lazy Loaded Modals */}
      {showProgressModal && (
        <Suspense fallback={null}>
          <SyncProgressModal
            progress={syncProgress}
            queueCount={queueCount}
            onClose={() => setShowProgressModal(false)}
          />
        </Suspense>
      )}

      {showQueueModal && (
        <Suspense fallback={null}>
          <OfflineQueueModal
            queueCount={queueCount}
            queueManager={queueManagerRef.current}
            onSync={triggerSync}
            onClose={() => setShowQueueModal(false)}
          />
        </Suspense>
      )}

      {showNetworkModal && (
        <Suspense fallback={null}>
          <NetworkStatusModal
            networkState={networkState}
            lastSyncTime={lastSyncTime}
            onClose={() => setShowNetworkModal(false)}
          />
        </Suspense>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 25,
    left: 0,
    right: 0,
    zIndex: 1000,
    marginHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  touchable: {
    padding: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  networkTypeContainer: {
    marginLeft: 8,
  },
  retryButton: {
    marginLeft: 8,
    padding: 4,
  },
  progressContainer: {
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginTop: 4,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 1,
  },
});

export default OfflineIndicator;