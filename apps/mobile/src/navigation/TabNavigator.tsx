// /apps/mobile/src/navigation/TabNavigator.tsx

import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Screens
import { MenuScreen } from '../screens/MenuScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

// Services & Utils
import { storage } from '../utils/storage';

// Types
export type MainTabParamList = {
  MenuTab: { tenantId?: string };
  FavoritesTab: undefined;
  OrdersTab: undefined;
  ProfileTab: undefined;
};

interface TabBarIconProps {
  focused: boolean;
  color: string;
  size: number;
}

interface CartBadgeInfo {
  count: number;
  total: number;
}

const Tab = createBottomTabNavigator<MainTabParamList>();
const { width: screenWidth } = Dimensions.get('window');

// Individual Tab Screen Components
const FavoritesScreen: React.FC = () => {
  return (
    <View style={styles.placeholderContainer}>
      <Ionicons name="heart" size={48} color="#FF6B35" />
      <Text style={styles.placeholderTitle}>Favoriten</Text>
      <Text style={styles.placeholderText}>
        Ihre bevorzugten Restaurants und Gerichte finden Sie hier.
      </Text>
    </View>
  );
};

const OrdersScreen: React.FC = () => {
  return (
    <View style={styles.placeholderContainer}>
      <Ionicons name="receipt" size={48} color="#FF6B35" />
      <Text style={styles.placeholderTitle}>Bestellungen</Text>
      <Text style={styles.placeholderText}>
        Hier sehen Sie alle Ihre aktuellen und vergangenen Bestellungen.
      </Text>
    </View>
  );
};

// Custom Tab Bar Component
const CustomTabBar: React.FC<any> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const [cartBadge, setCartBadge] = useState<CartBadgeInfo>({ count: 0, total: 0 });

  // Load cart badge info
  const loadCartBadge = useCallback(async () => {
    try {
      const cart = await storage.get('cart') || [];
      const count = cart.reduce((sum: number, item: any) => sum + item.quantity, 0);
      const total = cart.reduce((sum: number, item: any) => sum + item.totalPrice, 0);

      setCartBadge({ count, total });
    } catch (error) {
      console.error('Error loading cart badge:', error);
    }
  }, []);

  // Update cart badge when any tab gains focus
  useFocusEffect(
    useCallback(() => {
      loadCartBadge();

      // Set up interval to check cart updates
      const interval = setInterval(loadCartBadge, 2000);

      return () => clearInterval(interval);
    }, [loadCartBadge])
  );

  const handleTabPress = useCallback((route: any, isFocused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate(route.name, route.params);
    }
  }, [navigation]);

  const handleCartPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Cart');
  }, [navigation]);

  const getTabConfig = useCallback((routeName: string) => {
    const configs = {
      MenuTab: {
        label: 'Speisekarte',
        icon: 'restaurant',
        iconFocused: 'restaurant',
        color: '#FF6B35'
      },
      FavoritesTab: {
        label: 'Favoriten',
        icon: 'heart-outline',
        iconFocused: 'heart',
        color: '#EF4444'
      },
      OrdersTab: {
        label: 'Bestellungen',
        icon: 'receipt-outline',
        iconFocused: 'receipt',
        color: '#3B82F6'
      },
      ProfileTab: {
        label: 'Profil',
        icon: 'person-outline',
        iconFocused: 'person',
        color: '#8B5CF6'
      }
    };

    return configs[routeName as keyof typeof configs] || configs.MenuTab;
  }, []);

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom }]}>
      {Platform.OS === 'ios' && (
        <BlurView intensity={95} style={StyleSheet.absoluteFill} />
      )}

      <View style={styles.tabBarContent}>
        {/* Regular Tabs */}
        <View style={styles.tabsContainer}>
          {state.routes.slice(0, 2).map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const config = getTabConfig(route.name);

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={() => handleTabPress(route, isFocused)}
                style={styles.tabItem}
              >
                <View style={[styles.tabContent, isFocused && styles.tabContentFocused]}>
                  <Ionicons
                    name={isFocused ? config.iconFocused : config.icon}
                    size={24}
                    color={isFocused ? config.color : '#9CA3AF'}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: isFocused ? config.color : '#9CA3AF' }
                    ]}
                  >
                    {config.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Cart Button */}
        <TouchableOpacity
          style={styles.cartButton}
          onPress={handleCartPress}
          accessibilityRole="button"
          accessibilityLabel={`Warenkorb, ${cartBadge.count} Artikel`}
        >
          <View style={styles.cartButtonContent}>
            <Ionicons name="basket" size={28} color="white" />
            {cartBadge.count > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {cartBadge.count > 99 ? '99+' : cartBadge.count}
                </Text>
              </View>
            )}
          </View>
          {cartBadge.count > 0 && (
            <Text style={styles.cartTotal}>
              CHF {cartBadge.total.toFixed(2)}
            </Text>
          )}
        </TouchableOpacity>

        {/* Remaining Tabs */}
        <View style={styles.tabsContainer}>
          {state.routes.slice(2).map((route: any, index: number) => {
            const actualIndex = index + 2;
            const { options } = descriptors[route.key];
            const isFocused = state.index === actualIndex;
            const config = getTabConfig(route.name);

            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={() => handleTabPress(route, isFocused)}
                style={styles.tabItem}
              >
                <View style={[styles.tabContent, isFocused && styles.tabContentFocused]}>
                  <Ionicons
                    name={isFocused ? config.iconFocused : config.icon}
                    size={24}
                    color={isFocused ? config.color : '#9CA3AF'}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: isFocused ? config.color : '#9CA3AF' }
                    ]}
                  >
                    {config.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

// Main Tab Navigator Component
export const TabNavigator: React.FC = () => {
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);

  // Load current tenant on mount
  useEffect(() => {
    const loadCurrentTenant = async () => {
      try {
        const tenantId = await storage.get('currentTenantId');
        setCurrentTenantId(tenantId);
      } catch (error) {
        console.error('Error loading current tenant:', error);
      }
    };

    loadCurrentTenant();
  }, []);

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: Platform.OS === 'android',
      }}
      initialRouteName="MenuTab"
    >
      <Tab.Screen
        name="MenuTab"
        component={MenuScreen}
        initialParams={{ tenantId: currentTenantId }}
        options={{
          tabBarLabel: 'Speisekarte',
          tabBarIcon: ({ focused, color, size }: TabBarIconProps) => (
            <Ionicons
              name={focused ? 'restaurant' : 'restaurant-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesScreen}
        options={{
          tabBarLabel: 'Favoriten',
          tabBarIcon: ({ focused, color, size }: TabBarIconProps) => (
            <Ionicons
              name={focused ? 'heart' : 'heart-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tab.Screen
        name="OrdersTab"
        component={OrdersScreen}
        options={{
          tabBarLabel: 'Bestellungen',
          tabBarIcon: ({ focused, color, size }: TabBarIconProps) => (
            <Ionicons
              name={focused ? 'receipt' : 'receipt-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ focused, color, size }: TabBarIconProps) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  // Placeholder screens
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 40,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Custom Tab Bar
  tabBarContainer: {
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    ...Platform.select({
      android: {
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  tabBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    minHeight: 60,
  },
  tabsContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
  },
  tabContentFocused: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },

  // Cart Button
  cartButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 28,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  cartButtonContent: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  cartBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  cartTotal: {
    position: 'absolute',
    bottom: -16,
    fontSize: 9,
    fontWeight: '600',
    color: '#FF6B35',
    backgroundColor: 'white',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
});

export default TabNavigator;
