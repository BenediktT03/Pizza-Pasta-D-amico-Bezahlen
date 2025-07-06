/**
 * EATECH - Customer Mobile App
 * Version: 4.7.0
 * Description: React Native Customer App mit Lazy Loading und Offline Support
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/mobile/src/pages/CustomerApp/CustomerApp.jsx
 * 
 * Features: Native navigation, offline mode, push notifications, location services
 */

import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { 
  View, Text, ScrollView, RefreshControl, 
  ActivityIndicator, Alert, Animated, 
  PanResponder, Dimensions, StatusBar,
  SafeAreaView, Platform, PermissionsAndroid
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import {
  Home, Search, ShoppingCart, User,
  MapPin, Bell, Heart, Clock,
  Wifi, WifiOff, Smartphone, Star
} from 'lucide-react-native';
import NetInfo from '@react-native-netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';
import PushNotification from 'react-native-push-notification';
import styles from './CustomerApp.module.js';

// Lazy loaded screens
const MenuScreen = lazy(() => import('./screens/MenuScreen'));
const CartScreen = lazy(() => import('./screens/CartScreen'));
const OrderHistoryScreen = lazy(() => import('./screens/OrderHistoryScreen'));
const ProfileScreen = lazy(() => import('./screens/ProfileScreen'));
const FoodtruckListScreen = lazy(() => import('./screens/FoodtruckListScreen'));
const FoodtruckDetailScreen = lazy(() => import('./screens/FoodtruckDetailScreen'));
const CheckoutScreen = lazy(() => import('./screens/CheckoutScreen'));
const OrderTrackingScreen = lazy(() => import('./screens/OrderTrackingScreen'));
const MapScreen = lazy(() => import('./screens/MapScreen'));
const PaymentScreen = lazy(() => import('./screens/PaymentScreen'));

// Lazy loaded components
const FoodtruckCard = lazy(() => import('./components/FoodtruckCard'));
const ProductCard = lazy(() => import('./components/ProductCard'));
const LoadingScreen = lazy(() => import('./components/LoadingScreen'));
const OfflineIndicator = lazy(() => import('./components/OfflineIndicator'));
const LocationPrompt = lazy(() => import('./components/LocationPrompt'));
const PushNotificationHandler = lazy(() => import('./components/PushNotificationHandler'));

// Lazy loaded services
const APIService = lazy(() => import('../../services/APIService'));
const OfflineService = lazy(() => import('../../services/OfflineService'));
const LocationService = lazy(() => import('../../services/LocationService'));
const NotificationService = lazy(() => import('../../services/NotificationService'));
const AnalyticsService = lazy(() => import('../../services/AnalyticsService'));

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const { width, height } = Dimensions.get('window');

const LoadingSpinner = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#10B981" />
    <Text style={styles.loadingText}>Lädt...</Text>
  </View>
);

const CustomerApp = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [nearbyFoodtrucks, setNearbyFoodtrucks] = useState([]);
  const [favoriteStores, setFavoriteStores] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [appState, setAppState] = useState('active');

  const scrollY = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  useEffect(() => {
    initializeApp();
    setupNetworkListener();
    setupLocationServices();
    setupPushNotifications();
    setupAppStateListener();
    
    return () => {
      cleanup();
    };
  }, []);

  const initializeApp = async () => {
    try {
      setLoading(true);
      
      // Load cached data first
      await loadCachedData();
      
      // Initialize services
      await Promise.all([
        initializeOfflineService(),
        initializeAnalytics(),
        loadUserProfile(),
        loadCartItems()
      ]);
      
      // Load fresh data if online
      if (isOnline) {
        await loadFreshData();
      }
    } catch (error) {
      console.error('App initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCachedData = async () => {
    try {
      const [cachedFoodtrucks, cachedOrders, cachedFavorites] = await Promise.all([
        AsyncStorage.getItem('cached_foodtrucks'),
        AsyncStorage.getItem('cached_orders'),
        AsyncStorage.getItem('favorite_stores')
      ]);
      
      if (cachedFoodtrucks) {
        setNearbyFoodtrucks(JSON.parse(cachedFoodtrucks));
      }
      
      if (cachedOrders) {
        setRecentOrders(JSON.parse(cachedOrders));
      }
      
      if (cachedFavorites) {
        setFavoriteStores(JSON.parse(cachedFavorites));
      }
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  };

  const initializeOfflineService = async () => {
    try {
      const OfflineServiceModule = await import('../../services/OfflineService');
      await OfflineServiceModule.default.initialize();
    } catch (error) {
      console.error('Offline service initialization error:', error);
    }
  };

  const initializeAnalytics = async () => {
    try {
      const AnalyticsServiceModule = await import('../../services/AnalyticsService');
      await AnalyticsServiceModule.default.initialize();
      AnalyticsServiceModule.default.track('app_opened', {
        platform: Platform.OS,
        version: '4.7.0'
      });
    } catch (error) {
      console.error('Analytics initialization error:', error);
    }
  };

  // ============================================================================
  // NETWORK MANAGEMENT
  // ============================================================================
  const setupNetworkListener = () => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
      
      if (state.isConnected && !isOnline) {
        // Connection restored - sync offline data
        syncOfflineData();
      }
    });
    
    return unsubscribe;
  };

  const syncOfflineData = async () => {
    try {
      const OfflineServiceModule = await import('../../services/OfflineService');
      await OfflineServiceModule.default.syncPendingData();
      await loadFreshData();
    } catch (error) {
      console.error('Sync error:', error);
    }
  };

  // ============================================================================
  // LOCATION SERVICES
  // ============================================================================
  const setupLocationServices = async () => {
    try {
      const hasPermission = await requestLocationPermission();
      
      if (hasPermission) {
        getCurrentLocation();
      } else {
        setShowLocationPrompt(true);
      }
    } catch (error) {
      console.error('Location setup error:', error);
    }
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true; // iOS handled in Info.plist
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ latitude, longitude });
        loadNearbyFoodtrucks(latitude, longitude);
      },
      (error) => {
        console.error('Location error:', error);
        setShowLocationPrompt(true);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  // ============================================================================
  // PUSH NOTIFICATIONS
  // ============================================================================
  const setupPushNotifications = async () => {
    try {
      PushNotification.requestPermissions().then((permissions) => {
        setNotificationPermission(permissions.alert);
      });
      
      PushNotification.configure({
        onNotification: handlePushNotification,
        requestPermissions: Platform.OS === 'ios'
      });
    } catch (error) {
      console.error('Push notification setup error:', error);
    }
  };

  const handlePushNotification = (notification) => {
    if (notification.data?.orderId) {
      // Navigate to order tracking
      setActiveOrder(notification.data.orderId);
    }
  };

  // ============================================================================
  // DATA LOADING
  // ============================================================================
  const loadFreshData = async () => {
    try {
      if (!isOnline) return;
      
      const APIServiceModule = await import('../../services/APIService');
      
      const [foodtrucksResponse, ordersResponse] = await Promise.all([
        currentLocation 
          ? APIServiceModule.default.getNearbyFoodtrucks(currentLocation)
          : APIServiceModule.default.getAllFoodtrucks(),
        APIServiceModule.default.getUserOrders()
      ]);
      
      setNearbyFoodtrucks(foodtrucksResponse.data);
      setRecentOrders(ordersResponse.data);
      
      // Cache the data
      await AsyncStorage.multiSet([
        ['cached_foodtrucks', JSON.stringify(foodtrucksResponse.data)],
        ['cached_orders', JSON.stringify(ordersResponse.data)]
      ]);
    } catch (error) {
      console.error('Error loading fresh data:', error);
    }
  };

  const loadNearbyFoodtrucks = async (latitude, longitude) => {
    try {
      if (!isOnline) return;
      
      const APIServiceModule = await import('../../services/APIService');
      const response = await APIServiceModule.default.getNearbyFoodtrucks({
        latitude,
        longitude,
        radius: 5000 // 5km radius
      });
      
      setNearbyFoodtrucks(response.data);
      
      // Cache the data
      await AsyncStorage.setItem('cached_foodtrucks', JSON.stringify(response.data));
    } catch (error) {
      console.error('Error loading nearby foodtrucks:', error);
    }
  };

  const loadUserProfile = async () => {
    try {
      const profileData = await AsyncStorage.getItem('user_profile');
      if (profileData) {
        setUserProfile(JSON.parse(profileData));
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadCartItems = async () => {
    try {
      const cartData = await AsyncStorage.getItem('cart_items');
      if (cartData) {
        setCartItems(JSON.parse(cartData));
      }
    } catch (error) {
      console.error('Error loading cart items:', error);
    }
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadFreshData();
      if (currentLocation) {
        await loadNearbyFoodtrucks(currentLocation.latitude, currentLocation.longitude);
      }
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, [currentLocation, isOnline]);

  const handleAddToCart = useCallback(async (product, quantity = 1) => {
    try {
      const existingItem = cartItems.find(item => item.id === product.id);
      let newCartItems;
      
      if (existingItem) {
        newCartItems = cartItems.map(item =>
          item.id === product.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        newCartItems = [...cartItems, { ...product, quantity }];
      }
      
      setCartItems(newCartItems);
      await AsyncStorage.setItem('cart_items', JSON.stringify(newCartItems));
      
      // Track analytics
      const AnalyticsServiceModule = await import('../../services/AnalyticsService');
      AnalyticsServiceModule.default.track('product_added_to_cart', {
        product_id: product.id,
        product_name: product.name,
        quantity,
        price: product.price
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  }, [cartItems]);

  const handleToggleFavorite = useCallback(async (foodtruckId) => {
    try {
      const isFavorite = favoriteStores.includes(foodtruckId);
      const newFavorites = isFavorite
        ? favoriteStores.filter(id => id !== foodtruckId)
        : [...favoriteStores, foodtruckId];
      
      setFavoriteStores(newFavorites);
      await AsyncStorage.setItem('favorite_stores', JSON.stringify(newFavorites));
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }, [favoriteStores]);

  const setupAppStateListener = () => {
    const handleAppStateChange = (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to foreground
        if (isOnline) {
          loadFreshData();
        }
      }
      setAppState(nextAppState);
    };
    
    return () => {
      // Cleanup if needed
    };
  };

  const cleanup = () => {
    // Cleanup listeners and services
  };

  // ============================================================================
  // NAVIGATION COMPONENTS
  // ============================================================================
  const HomeStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeMainScreen} />
      <Stack.Screen name="FoodtruckDetail" component={FoodtruckDetailScreen} />
      <Stack.Screen name="Menu" component={MenuScreen} />
    </Stack.Navigator>
  );

  const SearchStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SearchMain" component={SearchMainScreen} />
      <Stack.Screen name="Map" component={MapScreen} />
    </Stack.Navigator>
  );

  const CartStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CartMain" component={CartScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
    </Stack.Navigator>
  );

  const ProfileStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
    </Stack.Navigator>
  );

  const TabNavigator = () => (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let IconComponent;
          
          switch (route.name) {
            case 'Home':
              IconComponent = Home;
              break;
            case 'Search':
              IconComponent = Search;
              break;
            case 'Cart':
              IconComponent = ShoppingCart;
              break;
            case 'Profile':
              IconComponent = User;
              break;
          }
          
          return <IconComponent size={size} color={color} />;
        },
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#6B7280',
        headerShown: false
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStack}
        options={{
          tabBarBadge: nearbyFoodtrucks.length > 0 ? nearbyFoodtrucks.length : null
        }}
      />
      <Tab.Screen name="Search" component={SearchStack} />
      <Tab.Screen 
        name="Cart" 
        component={CartStack}
        options={{
          tabBarBadge: cartItems.length > 0 ? cartItems.length : null
        }}
      />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );

  // ============================================================================
  // SCREEN COMPONENTS
  // ============================================================================
  const HomeMainScreen = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#10B981" />
      
      <Animated.ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.welcomeText}>
            Willkommen{userProfile?.name ? `, ${userProfile.name}` : ''}!
          </Text>
          <Text style={styles.heroDescription}>
            Entdecken Sie die besten Foodtrucks in Ihrer Nähe
          </Text>
          
          {currentLocation && (
            <View style={styles.locationInfo}>
              <MapPin size={16} color="#10B981" />
              <Text style={styles.locationText}>
                {currentLocation.address || 'Aktuelle Position'}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Schnellzugriff</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionCard}>
              <MapPin size={24} color="#10B981" />
              <Text style={styles.actionText}>In der Nähe</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <Heart size={24} color="#EF4444" />
              <Text style={styles.actionText}>Favoriten</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <Clock size={24} color="#F59E0B" />
              <Text style={styles.actionText}>Bestellungen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard}>
              <Star size={24} color="#8B5CF6" />
              <Text style={styles.actionText}>Bewertungen</Text>
            </TouchableOpacity>
          </View>
        </div>

        {/* Nearby Foodtrucks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Foodtrucks in der Nähe</Text>
          <Suspense fallback={<LoadingSpinner />}>
            <FlatList
              horizontal
              data={nearbyFoodtrucks}
              renderItem={({ item }) => (
                <FoodtruckCard
                  foodtruck={item}
                  onPress={() => navigation.navigate('FoodtruckDetail', { id: item.id })}
                  onToggleFavorite={() => handleToggleFavorite(item.id)}
                  isFavorite={favoriteStores.includes(item.id)}
                />
              )}
              keyExtractor={item => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          </Suspense>
        </View>

        {/* Recent Orders */}
        {recentOrders.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Letzte Bestellungen</Text>
            {recentOrders.slice(0, 3).map(order => (
              <TouchableOpacity 
                key={order.id} 
                style={styles.orderCard}
                onPress={() => navigation.navigate('OrderTracking', { orderId: order.id })}
              >
                <View style={styles.orderInfo}>
                  <Text style={styles.orderTitle}>{order.restaurantName}</Text>
                  <Text style={styles.orderDate}>
                    {new Date(order.createdAt).toLocaleDateString('de-CH')}
                  </Text>
                </View>
                <Text style={styles.orderPrice}>{order.total} CHF</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Animated.ScrollView>
    </SafeAreaView>
  );

  const SearchMainScreen = () => (
    <Suspense fallback={<LoadingSpinner />}>
      <FoodtruckListScreen
        foodtrucks={nearbyFoodtrucks}
        onFoodtruckPress={(foodtruck) => 
          navigation.navigate('FoodtruckDetail', { id: foodtruck.id })
        }
        onToggleFavorite={handleToggleFavorite}
        favoriteStores={favoriteStores}
      />
    </Suspense>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  if (loading) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <LoadingScreen />
      </Suspense>
    );
  }

  return (
    <NavigationContainer>
      <View style={styles.appContainer}>
        <TabNavigator />
        
        {/* Offline Indicator */}
        {!isOnline && (
          <Suspense fallback={null}>
            <OfflineIndicator />
          </Suspense>
        )}
        
        {/* Location Prompt */}
        {showLocationPrompt && (
          <Suspense fallback={null}>
            <LocationPrompt
              onAllow={() => {
                setShowLocationPrompt(false);
                setupLocationServices();
              }}
              onDeny={() => setShowLocationPrompt(false)}
            />
          </Suspense>
        )}
        
        {/* Push Notification Handler */}
        <Suspense fallback={null}>
          <PushNotificationHandler
            onNotification={handlePushNotification}
            hasPermission={notificationPermission}
          />
        </Suspense>
      </View>
    </NavigationContainer>
  );
};

export default CustomerApp;