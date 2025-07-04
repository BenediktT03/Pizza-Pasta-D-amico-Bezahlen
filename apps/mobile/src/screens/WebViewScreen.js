/**
 * EATECH Mobile App - WebView Screen
 * Version: 25.0.0
 * Description: Haupt-WebView für die EATECH Admin Web-App mit Native Bridge
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/mobile/src/screens/WebViewScreen.js
 */

// ============================================================================
// IMPORTS
// ============================================================================
import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  BackHandler,
  RefreshControl,
  Text,
  TouchableOpacity,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

// Contexts
import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';

// Services
import { offlineCache } from '../services/offlineCacheService';
import { notificationService } from '../services/notificationService';

// Config
import { EATECH_CONFIG, THEME } from '../config/constants';

// ============================================================================
// WEBVIEW SCREEN COMPONENT
// ============================================================================
const WebViewScreen = ({ route }) => {
  const webViewRef = useRef(null);
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const { isOffline, syncQueue } = useOffline();
  
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);
  const [error, setError] = useState(null);
  
  // Initial URL from route params or default
  const initialUrl = route?.params?.url || EATECH_CONFIG.WEB_URL + '/admin';

  // ============================================================================
  // LIFECYCLE
  // ============================================================================
  useEffect(() => {
    // Handle Android back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [canGoBack]);

  // Check network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (!state.isConnected && !isOffline) {
        Alert.alert(
          'Offline Modus',
          'Sie sind offline. Änderungen werden gespeichert und später synchronisiert.',
          [{ text: 'OK' }]
        );
      }
    });

    return () => unsubscribe();
  }, [isOffline]);

  // ============================================================================
  // WEBVIEW MESSAGE HANDLER
  // ============================================================================
  const handleMessage = useCallback(async (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('WebView message:', message.type);

      switch (message.type) {
        case 'NOTIFICATION':
          await handleNotification(message.payload);
          break;
          
        case 'VIBRATE':
          handleVibrate(message.payload);
          break;
          
        case 'SET_QUICK_ACTIONS':
          handleSetQuickActions(message.payload);
          break;
          
        case 'SET_BADGE':
          handleSetBadge(message.payload);
          break;
          
        case 'BIOMETRIC_AUTH':
          await handleBiometricAuth();
          break;
          
        case 'STORAGE_SET':
          await handleStorageSet(message.payload);
          break;
          
        case 'STORAGE_GET':
          await handleStorageGet(message.payload);
          break;
          
        case 'CONSOLE_LOG':
          console.log('[WebView]:', message.payload.message);
          break;
          
        case 'LOGOUT':
          await handleLogout();
          break;
          
        case 'NAVIGATE':
          handleNavigate(message.payload);
          break;
          
        case 'OFFLINE_SYNC':
          await handleOfflineSync();
          break;
          
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling WebView message:', error);
    }
  }, []);

  // ============================================================================
  // MESSAGE HANDLERS
  // ============================================================================
  const handleNotification = async (payload) => {
    const { title, body, data } = payload;
    
    // Vibrate on notification
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Schedule local notification
    await notificationService.scheduleNotification({
      title,
      body,
      data,
      trigger: null, // Immediate
    });
  };

  const handleVibrate = (payload) => {
    const { pattern = [0, 100] } = payload;
    
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      // Android vibration pattern
      Vibration.vibrate(pattern);
    }
  };

  const handleSetQuickActions = async (payload) => {
    const { actions } = payload;
    // Quick actions are set in the main App.js
    await AsyncStorage.setItem('quickActions', JSON.stringify(actions));
  };

  const handleSetBadge = async (payload) => {
    const { count } = payload;
    await Notifications.setBadgeCountAsync(count);
  };

  const handleBiometricAuth = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authentifizierung erforderlich',
        cancelLabel: 'Abbrechen',
      });
      
      // Send result back to WebView
      webViewRef.current?.postMessage(JSON.stringify({
        type: 'BIOMETRIC_RESULT',
        payload: { success: result.success }
      }));
    } catch (error) {
      webViewRef.current?.postMessage(JSON.stringify({
        type: 'BIOMETRIC_RESULT',
        payload: { success: false, error: error.message }
      }));
    }
  };

  const handleStorageSet = async (payload) => {
    const { key, value } = payload;
    await AsyncStorage.setItem(`web_${key}`, JSON.stringify(value));
  };

  const handleStorageGet = async (payload) => {
    const { key } = payload;
    const value = await AsyncStorage.getItem(`web_${key}`);
    
    // Send value back to WebView
    webViewRef.current?.postMessage(JSON.stringify({
      type: 'STORAGE_RESULT',
      payload: { key, value: value ? JSON.parse(value) : null }
    }));
  };

  const handleLogout = async () => {
    await logout();
    navigation.replace('Login');
  };

  const handleNavigate = (payload) => {
    const { screen, params } = payload;
    navigation.navigate(screen, params);
  };

  const handleOfflineSync = async () => {
    if (!isOffline) {
      await syncQueue();
      Alert.alert('Sync abgeschlossen', 'Offline-Daten wurden synchronisiert.');
    }
  };

  // ============================================================================
  // WEBVIEW NAVIGATION
  // ============================================================================
  const handleNavigationStateChange = (navState) => {
    setCanGoBack(navState.canGoBack);
    
    // Update badge based on URL
    if (navState.url.includes('/orders')) {
      // Check for pending orders and update badge
      checkPendingOrders();
    }
  };

  const checkPendingOrders = async () => {
    // This would normally fetch from the API
    // For now, we'll use a placeholder
    const pendingCount = await AsyncStorage.getItem('pendingOrdersCount');
    if (pendingCount) {
      await Notifications.setBadgeCountAsync(parseInt(pendingCount));
    }
  };

  // ============================================================================
  // WEBVIEW ERROR HANDLING
  // ============================================================================
  const handleError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    setError(nativeEvent);
    setLoading(false);
  };

  const handleHttpError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('HTTP error:', nativeEvent);
    
    if (nativeEvent.statusCode === 403 || nativeEvent.statusCode === 401) {
      Alert.alert(
        'Sitzung abgelaufen',
        'Bitte melden Sie sich erneut an.',
        [{ text: 'OK', onPress: () => handleLogout() }]
      );
    }
  };

  // ============================================================================
  // REFRESH HANDLER
  // ============================================================================
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setWebViewKey(prev => prev + 1);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={THEME.colors.primary} />
      <Text style={styles.loadingText}>EATECH lädt...</Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Verbindungsfehler</Text>
      <Text style={styles.errorMessage}>
        {isOffline 
          ? 'Sie sind offline. Die App funktioniert mit eingeschränkten Funktionen.'
          : 'Die Seite konnte nicht geladen werden.'}
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
        <Text style={styles.retryButtonText}>Erneut versuchen</Text>
      </TouchableOpacity>
    </View>
  );

  const renderOfflineBanner = () => {
    if (!isOffline) return null;
    
    return (
      <View style={styles.offlineBanner}>
        <Text style={styles.offlineText}>Offline Modus - Daten werden lokal gespeichert</Text>
      </View>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderOfflineBanner()}
      
      <WebView
        key={webViewKey}
        ref={webViewRef}
        source={{ 
          uri: initialUrl,
          headers: {
            'Authorization': `Bearer ${user?.token}`,
            'X-App-Version': EATECH_CONFIG.APP_VERSION,
            'X-Platform': Platform.OS,
          }
        }}
        style={styles.webView}
        
        // JavaScript injection
        injectedJavaScript={EATECH_CONFIG.WEBVIEW_CONFIG.INJECTED_JS}
        injectedJavaScriptBeforeContentLoaded={`
          window.isEatechApp = true;
          window.appPlatform = '${Platform.OS}';
        `}
        
        // Event handlers
        onMessage={handleMessage}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={handleError}
        onHttpError={handleHttpError}
        
        // Configuration
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={renderLoading}
        renderError={renderError}
        
        // Security
        originWhitelist={['*']}
        mixedContentMode="compatibility"
        
        // Performance
        cacheEnabled={true}
        cacheMode={isOffline ? 'LOAD_CACHE_ELSE_NETWORK' : 'LOAD_DEFAULT'}
        
        // User agent
        userAgent={EATECH_CONFIG.WEBVIEW_CONFIG.USER_AGENT}
        
        // iOS specific
        allowsBackForwardNavigationGestures={true}
        allowsLinkPreview={true}
        
        // Android specific
        textZoom={100}
        allowFileAccess={true}
        scalesPageToFit={false}
        
        // Pull to refresh
        pullToRefreshEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={THEME.colors.primary}
            colors={[THEME.colors.primary]}
          />
        }
      />
      
      {loading && renderLoading()}
    </SafeAreaView>
  );
};

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  
  webView: {
    flex: 1,
  },
  
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
  },
  
  loadingText: {
    marginTop: THEME.spacing.md,
    color: THEME.colors.text,
    fontSize: THEME.typography.body1.fontSize,
  },
  
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.xl,
    backgroundColor: THEME.colors.background,
  },
  
  errorTitle: {
    fontSize: THEME.typography.h2.fontSize,
    fontWeight: THEME.typography.h2.fontWeight,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },
  
  errorMessage: {
    fontSize: THEME.typography.body1.fontSize,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginBottom: THEME.spacing.xl,
  },
  
  retryButton: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
  },
  
  retryButtonText: {
    color: THEME.colors.background,
    fontSize: THEME.typography.body1.fontSize,
    fontWeight: '600',
  },
  
  offlineBanner: {
    backgroundColor: THEME.colors.warning,
    padding: THEME.spacing.sm,
    alignItems: 'center',
  },
  
  offlineText: {
    color: THEME.colors.background,
    fontSize: THEME.typography.body2.fontSize,
    fontWeight: '500',
  },
});

// ============================================================================
// EXPORT
// ============================================================================
export default WebViewScreen;