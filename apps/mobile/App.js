/**
 * EATECH Mobile App - Main App Component
 * Version: 25.0.0
 * Description: Hauptkomponente der EATECH Admin Mobile App mit WebView
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/mobile/App.js
 */

// ============================================================================
// IMPORTS
// ============================================================================
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import * as QuickActions from 'expo-quick-actions';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Navigation
import RootNavigator from './src/navigation/RootNavigator';

// Providers
import { AuthProvider } from './src/contexts/AuthContext';
import { OfflineProvider } from './src/contexts/OfflineContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { ThemeProvider } from './src/contexts/ThemeContext';

// Services
import { initializeNotifications } from './src/services/notificationService';
import { setupQuickActions } from './src/services/quickActionsService';
import { initializeOfflineSync } from './src/services/offlineSyncService';
import { initializeWatchApp } from './src/services/watchService';

// Utils
import { EATECH_CONFIG } from './src/config/constants';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [networkState, setNetworkState] = useState(null);

  // Initialize app
  useEffect(() => {
    initializeApp();
  }, []);

  // Initialize all services
  const initializeApp = async () => {
    try {
      // Check network status
      const network = await Network.getNetworkStateAsync();
      setNetworkState(network);

      // Check authentication
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        const biometricAuth = await authenticateWithBiometrics();
        setIsAuthenticated(biometricAuth);
      }

      // Initialize services
      await Promise.all([
        initializeNotifications(),
        setupQuickActions(),
        initializeOfflineSync(),
        initializeWatchApp(),
      ]);

      // Setup notification listeners
      setupNotificationListeners();

      // Setup quick action listeners
      setupQuickActionListeners();

      // Hide splash screen
      await SplashScreen.hideAsync();
      setIsReady(true);
    } catch (error) {
      console.error('Error initializing app:', error);
      Alert.alert('Fehler', 'App konnte nicht initialisiert werden');
    }
  };

  // Biometric authentication
  const authenticateWithBiometrics = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'EATECH Admin Login',
          cancelLabel: 'Abbrechen',
          fallbackLabel: 'Passwort verwenden',
        });

        return result.success;
      }

      return true; // Fallback to normal auth
    } catch (error) {
      console.error('Biometric auth error:', error);
      return true; // Fallback to normal auth
    }
  };

  // Setup notification listeners
  const setupNotificationListeners = () => {
    // Handle incoming notifications
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        // Handle notification in app
      }
    );

    // Handle notification responses
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response:', response);
        // Navigate based on notification data
        const data = response.notification.request.content.data;
        if (data.orderId) {
          // Navigate to order details
        }
      }
    );

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  };

  // Setup quick action listeners
  const setupQuickActionListeners = () => {
    QuickActions.addListener((action) => {
      console.log('Quick action triggered:', action);
      
      switch (action.type) {
        case 'toggle_store':
          // Toggle store open/closed status
          handleToggleStore();
          break;
        case 'new_order':
          // Navigate to new order screen
          handleNewOrder();
          break;
        case 'daily_revenue':
          // Show daily revenue
          handleDailyRevenue();
          break;
        case 'inventory_update':
          // Quick inventory update
          handleInventoryUpdate();
          break;
      }
    });
  };

  // Quick action handlers
  const handleToggleStore = async () => {
    // Implementation for toggling store status
    console.log('Toggling store status...');
  };

  const handleNewOrder = () => {
    // Implementation for new order
    console.log('Creating new order...');
  };

  const handleDailyRevenue = () => {
    // Implementation for showing daily revenue
    console.log('Showing daily revenue...');
  };

  const handleInventoryUpdate = () => {
    // Implementation for inventory update
    console.log('Quick inventory update...');
  };

  // Don't render until ready
  if (!isReady) {
    return null;
  }

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <OfflineProvider networkState={networkState}>
            <NotificationProvider>
              <NavigationContainer>
                <StatusBar style="light" />
                <RootNavigator isAuthenticated={isAuthenticated} />
              </NavigationContainer>
            </NotificationProvider>
          </OfflineProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}