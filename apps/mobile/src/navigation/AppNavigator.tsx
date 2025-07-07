    // /apps/mobile/src/navigation/AppNavigator.tsx

import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Screens
import { CartScreen } from '../screens/CartScreen';
import { CheckoutScreen } from '../screens/CheckoutScreen';
import { OrderTrackingScreen } from '../screens/OrderTrackingScreen';

// Services & Utils
import { apiService } from '../services/api.service';
import { locationService } from '../services/location.service';
import { pushService } from '../services/push.service';
import { storage } from '../utils/storage';

// Tab Navigator
import { TabNavigator } from './TabNavigator';

// Types
export type RootStackParamList = {
  // Auth Stack
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;

  // Main App Stack
  MainTabs: undefined;

  // Shared Modals/Screens
  ProductDetail: { productId: string; tenantId?: string };
  Cart: undefined;
  Checkout: { cartData: any[]; summary: any };
  OrderTracking: { orderId: string };
  OrderConfirmation: { orderId: string; orderNumber: string };

  // QR Scanner
  QRScanner: undefined;
  TenantSelection: { location?: { lat: number; lng: number } };

  // Profile Stack
  EditProfile: undefined;
  OrderHistory: undefined;
  Favorites: undefined;
  Settings: undefined;
  Language: undefined;
  Notifications: undefined;

  // Support & Info
  Support: { orderId?: string };
  FAQ: undefined;
  Legal: { type: 'terms' | 'privacy' | 'imprint' };
  About: undefined;

  // Onboarding
  Onboarding: undefined;
  LocationPermission: undefined;
  NotificationPermission: undefined;
};

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  MenuTab: { tenantId?: string };
  FavoritesTab: undefined;
  OrdersTab: undefined;
  ProfileTab: undefined;
};

// Navigation Theme
const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#FF6B35',
    background: '#f8f9fa',
    card: '#ffffff',
    text: '#333333',
    border: '#e5e7eb',
    notification: '#ef4444',
  },
};

// Create Navigators
const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

// Auth Navigator Component
const AuthNavigator: React.FC = () => {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: 'slide_from_right',
      }}
    >
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
};

// Main App Navigator Component
export const AppNavigator: React.FC = () => {
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('MainTabs');
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  // Initialize app
  const initializeApp = useCallback(async () => {
    try {
      // Keep splash screen visible while loading
      await SplashScreen.preventAutoHideAsync();

      // Check authentication status
      const authToken = await storage.get('authToken');
      const user = await storage.get('user');

      if (authToken && user) {
        // Validate token with server
        try {
          await apiService.get('/auth/verify');
          setIsAuthenticated(true);
        } catch (error) {
          // Token invalid, clear storage
          await storage.multiRemove(['authToken', 'user']);
          setIsAuthenticated(false);
        }
      }

      // Check onboarding status
      const onboardingCompleted = await storage.get('onboardingCompleted');
      setHasCompletedOnboarding(!!onboardingCompleted);

      // Initialize services
      await Promise.all([
        initializePushNotifications(),
        initializeLocationServices(),
        initializeDeepLinking(),
      ]);

      // Set initial route based on app state
      if (!onboardingCompleted) {
        setInitialRoute('Onboarding');
      } else if (!isAuthenticated) {
        setInitialRoute('Welcome');
      } else {
        // Check if we have a deep link or should go to main tabs
        setInitialRoute('MainTabs');
      }

    } catch (error) {
      console.error('Error initializing app:', error);

      // On error, go to welcome screen
      setInitialRoute('Welcome');
      setIsAuthenticated(false);

    } finally {
      setIsLoading(false);
      await SplashScreen.hideAsync();
    }
  }, []);

  // Initialize push notifications
  const initializePushNotifications = useCallback(async () => {
    try {
      // Configure notification behavior
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Register for push notifications
      if (isAuthenticated) {
        await pushService.initialize();
      }

      // Handle notification received while app is running
      const notificationListener = Notifications.addNotificationReceivedListener(
        (notification) => {
          console.log('Notification received:', notification);
          // Handle in-app notification display
        }
      );

      // Handle notification tap
      const responseListener = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          console.log('Notification response:', response);
          handleNotificationTap(response.notification);
        }
      );

      return () => {
        Notifications.removeNotificationSubscription(notificationListener);
        Notifications.removeNotificationSubscription(responseListener);
      };

    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }, [isAuthenticated]);

  // Initialize location services
  const initializeLocationServices = useCallback(async () => {
    try {
      const hasPermission = await locationService.checkPermission();

      if (hasPermission) {
        // Get current location for nearby restaurants
        const location = await locationService.getCurrentLocation();
        await storage.set('lastKnownLocation', location);
      }
    } catch (error) {
      console.error('Error initializing location services:', error);
    }
  }, []);

  // Initialize deep linking
  const initializeDeepLinking = useCallback(async () => {
    try {
      // Handle initial URL if app was opened via deep link
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }

      // Listen for deep links while app is running
      const linkingListener = Linking.addEventListener('url', (event) => {
        handleDeepLink(event.url);
      });

      return () => {
        linkingListener.remove();
      };

    } catch (error) {
      console.error('Error initializing deep linking:', error);
    }
  }, []);

  // Handle deep link navigation
  const handleDeepLink = useCallback((url: string) => {
    try {
      const parsedUrl = new URL(url);
      const { pathname, searchParams } = parsedUrl;

      console.log('Deep link received:', url);

      // Handle different deep link patterns
      if (pathname.startsWith('/restaurant/')) {
        const tenantId = pathname.split('/')[2];
        // Navigate to restaurant menu
        // This would be handled in the navigation container

      } else if (pathname.startsWith('/order/')) {
        const orderId = pathname.split('/')[2];
        // Navigate to order tracking

      } else if (pathname.startsWith('/qr')) {
        const tableId = searchParams.get('table');
        const tenantId = searchParams.get('restaurant');
        // Navigate to QR scan result

      }

    } catch (error) {
      console.error('Error handling deep link:', error);
    }
  }, []);

  // Handle notification tap
  const handleNotificationTap = useCallback((notification: Notifications.Notification) => {
    try {
      const data = notification.request.content.data;

      if (data.orderId) {
        // Navigate to order tracking
        console.log('Navigate to order:', data.orderId);

      } else if (data.tenantId) {
        // Navigate to restaurant
        console.log('Navigate to restaurant:', data.tenantId);

      } else if (data.type === 'promotion') {
        // Navigate to promotions
        console.log('Navigate to promotion:', data.promotionId);
      }

    } catch (error) {
      console.error('Error handling notification tap:', error);
    }
  }, []);

  // App state change handler
  const handleAppStateChange = useCallback((nextAppState: string) => {
    if (nextAppState === 'active') {
      // App became active - refresh data if needed
      console.log('App became active');

    } else if (nextAppState === 'background') {
      // App went to background - save state if needed
      console.log('App went to background');
    }
  }, []);

  // Effects
  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // Linking configuration for deep links
  const linking = {
    prefixes: ['eatech://', 'https://app.eatech.ch'],
    config: {
      screens: {
        MainTabs: {
          screens: {
            MenuTab: 'restaurant/:tenantId',
            OrdersTab: 'orders',
            ProfileTab: 'profile',
          },
        },
        OrderTracking: 'order/:orderId',
        QRScanner: 'qr',
        TenantSelection: 'restaurants',
        Support: 'support',
        // Auth screens
        Welcome: 'welcome',
        Login: 'login',
        Register: 'register',
      },
    },
  };

  if (isLoading) {
    // SplashScreen is handling the loading state
    return null;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={AppTheme} linking={linking}>
        <StatusBar
          barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
          backgroundColor={AppTheme.colors.primary}
        />

        <RootStack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerShown: false,
            gestureEnabled: true,
            animation: 'slide_from_right',
          }}
        >
          {/* Onboarding Flow */}
          {!hasCompletedOnboarding && (
            <>
              <RootStack.Screen
                name="Onboarding"
                component={OnboardingScreen}
                options={{ gestureEnabled: false }}
              />
              <RootStack.Screen name="LocationPermission" component={LocationPermissionScreen} />
              <RootStack.Screen name="NotificationPermission" component={NotificationPermissionScreen} />
            </>
          )}

          {/* Auth Flow */}
          {!isAuthenticated ? (
            <RootStack.Screen
              name="Auth"
              component={AuthNavigator}
              options={{ headerShown: false }}
            />
          ) : (
            <>
              {/* Main App Flow */}
              <RootStack.Screen name="MainTabs" component={TabNavigator} />

              {/* Modal Screens */}
              <RootStack.Group screenOptions={{ presentation: 'modal' }}>
                <RootStack.Screen
                  name="QRScanner"
                  component={QRScannerScreen}
                  options={{
                    headerShown: true,
                    title: 'QR-Code scannen',
                    headerStyle: { backgroundColor: AppTheme.colors.primary },
                    headerTintColor: 'white',
                  }}
                />

                <RootStack.Screen
                  name="TenantSelection"
                  component={TenantSelectionScreen}
                  options={{
                    headerShown: true,
                    title: 'Restaurant wählen',
                    headerStyle: { backgroundColor: AppTheme.colors.primary },
                    headerTintColor: 'white',
                  }}
                />
              </RootStack.Group>

              {/* Stack Screens */}
              <RootStack.Screen
                name="ProductDetail"
                component={ProductDetailScreen}
                options={{
                  headerShown: true,
                  title: 'Produktdetails',
                  headerBackTitle: 'Zurück',
                }}
              />

              <RootStack.Screen
                name="Cart"
                component={CartScreen}
                options={{
                  headerShown: false,
                }}
              />

              <RootStack.Screen
                name="Checkout"
                component={CheckoutScreen}
                options={{
                  headerShown: false,
                }}
              />

              <RootStack.Screen
                name="OrderTracking"
                component={OrderTrackingScreen}
                options={{
                  headerShown: false,
                }}
              />

              <RootStack.Screen
                name="OrderConfirmation"
                component={OrderConfirmationScreen}
                options={{
                  headerShown: false,
                  gestureEnabled: false,
                }}
              />

              {/* Profile Stack */}
              <RootStack.Screen
                name="EditProfile"
                component={EditProfileScreen}
                options={{
                  headerShown: true,
                  title: 'Profil bearbeiten',
                }}
              />

              <RootStack.Screen
                name="OrderHistory"
                component={OrderHistoryScreen}
                options={{
                  headerShown: true,
                  title: 'Bestellhistorie',
                }}
              />

              <RootStack.Screen
                name="Favorites"
                component={FavoritesScreen}
                options={{
                  headerShown: true,
                  title: 'Favoriten',
                }}
              />

              <RootStack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                  headerShown: true,
                  title: 'Einstellungen',
                }}
              />

              <RootStack.Screen
                name="Language"
                component={LanguageScreen}
                options={{
                  headerShown: true,
                  title: 'Sprache',
                }}
              />

              <RootStack.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{
                  headerShown: true,
                  title: 'Benachrichtigungen',
                }}
              />

              {/* Support & Info */}
              <RootStack.Screen
                name="Support"
                component={SupportScreen}
                options={{
                  headerShown: true,
                  title: 'Hilfe & Support',
                }}
              />

              <RootStack.Screen
                name="FAQ"
                component={FAQScreen}
                options={{
                  headerShown: true,
                  title: 'Häufige Fragen',
                }}
              />

              <RootStack.Screen
                name="Legal"
                component={LegalScreen}
                options={{
                  headerShown: true,
                  title: 'Rechtliches',
                }}
              />

              <RootStack.Screen
                name="About"
                component={AboutScreen}
                options={{
                  headerShown: true,
                  title: 'Über EATECH',
                }}
              />
            </>
          )}
        </RootStack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

// Placeholder screen components (these would be implemented separately)
const WelcomeScreen = () => null;
const LoginScreen = () => null;
const RegisterScreen = () => null;
const ForgotPasswordScreen = () => null;
const OnboardingScreen = () => null;
const LocationPermissionScreen = () => null;
const NotificationPermissionScreen = () => null;
const QRScannerScreen = () => null;
const TenantSelectionScreen = () => null;
const ProductDetailScreen = () => null;
const OrderConfirmationScreen = () => null;
const EditProfileScreen = () => null;
const OrderHistoryScreen = () => null;
const FavoritesScreen = () => null;
const SettingsScreen = () => null;
const LanguageScreen = () => null;
const NotificationsScreen = () => null;
const SupportScreen = () => null;
const FAQScreen = () => null;
const LegalScreen = () => null;
const AboutScreen = () => null;

export default AppNavigator;
