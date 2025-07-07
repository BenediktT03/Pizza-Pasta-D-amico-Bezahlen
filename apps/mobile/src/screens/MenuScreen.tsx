// /apps/mobile/src/screens/MenuScreen.tsx

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Services & Utils
import { apiService } from '../services/api.service';
import { locationService } from '../services/location.service';
import { requestPermissions } from '../utils/permissions';
import { storage } from '../utils/storage';

// Components
import { ProductCard } from '../components/ProductCard';
import { VoiceButton } from '../components/VoiceButton';

// Types
interface Product {
  id: string;
  name: {
    de: string;
    fr: string;
    it: string;
    en: string;
  };
  description: {
    de: string;
    fr: string;
    it: string;
    en: string;
  };
  pricing: {
    basePrice: number;
    currency: string;
  };
  media: {
    images: Array<{
      url: string;
      thumbnails: {
        small: string;
        medium: string;
        large: string;
      };
      alt: {
        de: string;
        en: string;
      };
    }>;
  };
  category: string;
  subcategory: string;
  tags: string[];
  availability: {
    status: 'available' | 'unavailable' | 'limited';
    quantity?: number;
  };
  analytics: {
    orders: number;
    rating: number;
  };
}

interface MenuCategory {
  id: string;
  name: {
    de: string;
    fr: string;
    it: string;
    en: string;
  };
  products: Product[];
  sortOrder: number;
}

interface Tenant {
  id: string;
  name: string;
  branding: {
    colors: {
      primary: string;
      secondary: string;
      accent: string;
    };
  };
  settings: {
    language: string;
    currency: string;
  };
  locations: Array<{
    id: string;
    coordinates: {
      current: {
        lat: number;
        lng: number;
      };
    };
  }>;
}

interface CartItem {
  productId: string;
  quantity: number;
  modifiers: any[];
  totalPrice: number;
}

type RootStackParamList = {
  Menu: { tenantId?: string };
  Cart: undefined;
  ProductDetail: { productId: string };
  OrderTracking: { orderId: string };
  Profile: undefined;
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const MenuScreen: React.FC = () => {
  // Navigation & Route
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { tenantId } = route.params as { tenantId?: string };

  // State
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  const [language, setLanguage] = useState<string>('de');

  // Computed values
  const cartItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [cart]);

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return [];
    const category = categories.find(cat => cat.id === selectedCategory);
    if (!category) return [];

    let products = category.products;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      products = products.filter(product =>
        product.name[language as keyof typeof product.name]?.toLowerCase().includes(query) ||
        product.description[language as keyof typeof product.description]?.toLowerCase().includes(query) ||
        product.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Sort by popularity
    return products.sort((a, b) => {
      // Available items first
      if (a.availability.status === 'available' && b.availability.status !== 'available') return -1;
      if (b.availability.status === 'available' && a.availability.status !== 'available') return 1;

      // Then by orders count
      return b.analytics.orders - a.analytics.orders;
    });
  }, [categories, selectedCategory, searchQuery, language]);

  // Initialize & Load Data
  const initializeScreen = useCallback(async () => {
    try {
      setIsLoading(true);

      // Request permissions
      await requestPermissions();

      // Get user location
      const location = await locationService.getCurrentLocation();
      setUserLocation(location);

      // Load cached data first for faster initial render
      const cachedTenant = await storage.get(`tenant_${tenantId}`);
      const cachedMenu = await storage.get(`menu_${tenantId}`);
      const cachedCart = await storage.get('cart');
      const cachedLanguage = await storage.get('language') || 'de';

      if (cachedTenant) setTenant(cachedTenant);
      if (cachedMenu) {
        setCategories(cachedMenu);
        if (cachedMenu.length > 0) {
          setSelectedCategory(cachedMenu[0].id);
        }
      }
      if (cachedCart) setCart(cachedCart);
      setLanguage(cachedLanguage);

      // Load fresh data
      await loadTenantData();
      await loadMenuData();

    } catch (error) {
      console.error('Error initializing menu screen:', error);
      Alert.alert(
        'Fehler',
        'Die Speisekarte konnte nicht geladen werden. Bitte versuchen Sie es erneut.',
        [
          { text: 'Wiederholen', onPress: initializeScreen },
          { text: 'Abbrechen', style: 'cancel' }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  const loadTenantData = useCallback(async () => {
    try {
      if (!tenantId) return;

      const tenantData = await apiService.get(`/tenants/${tenantId}`);
      setTenant(tenantData);

      // Cache tenant data
      await storage.set(`tenant_${tenantId}`, tenantData);

      // Set language from tenant settings
      const tenantLanguage = tenantData.settings?.language || 'de';
      setLanguage(tenantLanguage);
      await storage.set('language', tenantLanguage);

    } catch (error) {
      console.error('Error loading tenant data:', error);
    }
  }, [tenantId]);

  const loadMenuData = useCallback(async () => {
    try {
      if (!tenantId) return;

      const menuData = await apiService.get(`/tenants/${tenantId}/products`, {
        include: ['category', 'availability', 'analytics'],
        location: userLocation ? `${userLocation.lat},${userLocation.lng}` : undefined
      });

      // Group products by category
      const groupedCategories: { [key: string]: MenuCategory } = {};

      menuData.forEach((product: Product) => {
        if (!groupedCategories[product.category]) {
          groupedCategories[product.category] = {
            id: product.category,
            name: {
              de: getCategoryName(product.category, 'de'),
              fr: getCategoryName(product.category, 'fr'),
              it: getCategoryName(product.category, 'it'),
              en: getCategoryName(product.category, 'en'),
            },
            products: [],
            sortOrder: getCategorySortOrder(product.category)
          };
        }
        groupedCategories[product.category].products.push(product);
      });

      const categoriesArray = Object.values(groupedCategories)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      setCategories(categoriesArray);

      if (categoriesArray.length > 0 && !selectedCategory) {
        setSelectedCategory(categoriesArray[0].id);
      }

      // Cache menu data
      await storage.set(`menu_${tenantId}`, categoriesArray);

    } catch (error) {
      console.error('Error loading menu data:', error);
      throw error;
    }
  }, [tenantId, userLocation, selectedCategory]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadTenantData(),
        loadMenuData()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadTenantData, loadMenuData]);

  // Product Actions
  const handleProductPress = useCallback((product: Product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('ProductDetail', { productId: product.id });
  }, [navigation]);

  const handleAddToCart = useCallback((product: Product, quantity: number = 1, modifiers: any[] = []) => {
    const totalPrice = product.pricing.basePrice * quantity; // TODO: Add modifiers price calculation

    const newItem: CartItem = {
      productId: product.id,
      quantity,
      modifiers,
      totalPrice
    };

    const updatedCart = [...cart];
    const existingItemIndex = updatedCart.findIndex(
      item => item.productId === product.id &&
      JSON.stringify(item.modifiers) === JSON.stringify(modifiers)
    );

    if (existingItemIndex >= 0) {
      updatedCart[existingItemIndex].quantity += quantity;
      updatedCart[existingItemIndex].totalPrice += totalPrice;
    } else {
      updatedCart.push(newItem);
    }

    setCart(updatedCart);
    storage.set('cart', updatedCart);

    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Show brief confirmation
    // TODO: Add toast notification
  }, [cart]);

  // Voice Commerce
  const handleVoiceOrder = useCallback(async (transcription: string) => {
    try {
      setIsVoiceListening(true);

      const voiceOrderResult = await apiService.post('/ai/voice-order', {
        transcription,
        tenantId,
        language,
        menu: filteredProducts.map(p => ({
          id: p.id,
          name: p.name[language as keyof typeof p.name],
          price: p.pricing.basePrice,
          category: p.category
        }))
      });

      if (voiceOrderResult.success && voiceOrderResult.products) {
        voiceOrderResult.products.forEach((item: any) => {
          const product = filteredProducts.find(p => p.id === item.productId);
          if (product) {
            handleAddToCart(product, item.quantity, item.modifiers || []);
          }
        });

        // Voice confirmation
        // TODO: Add speech synthesis confirmation
      }

    } catch (error) {
      console.error('Voice order error:', error);
      Alert.alert('Sprachbestellung', 'Die Bestellung konnte nicht verstanden werden. Bitte versuchen Sie es erneut.');
    } finally {
      setIsVoiceListening(false);
    }
  }, [filteredProducts, tenantId, language, handleAddToCart]);

  // Category helpers
  const getCategoryName = (categoryId: string, lang: string): string => {
    const categoryNames: { [key: string]: { [key: string]: string } } = {
      'main': { de: 'Hauptgerichte', fr: 'Plats principaux', it: 'Piatti principali', en: 'Main Dishes' },
      'sides': { de: 'Beilagen', fr: 'Accompagnements', it: 'Contorni', en: 'Sides' },
      'drinks': { de: 'Getränke', fr: 'Boissons', it: 'Bevande', en: 'Drinks' },
      'desserts': { de: 'Desserts', fr: 'Desserts', it: 'Dolci', en: 'Desserts' }
    };
    return categoryNames[categoryId]?.[lang] || categoryId;
  };

  const getCategorySortOrder = (categoryId: string): number => {
    const order: { [key: string]: number } = {
      'main': 1,
      'sides': 2,
      'drinks': 3,
      'desserts': 4
    };
    return order[categoryId] || 99;
  };

  // Effects
  useEffect(() => {
    initializeScreen();
  }, [initializeScreen]);

  useFocusEffect(
    useCallback(() => {
      // Reload cart when screen comes into focus
      const loadCart = async () => {
        const cachedCart = await storage.get('cart');
        if (cachedCart) setCart(cachedCart);
      };
      loadCart();
    }, [])
  );

  // Navigation Actions
  const navigateToCart = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Cart');
  }, [navigation]);

  // Render Methods
  const renderCategoryTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoryTabs}
      contentContainerStyle={styles.categoryTabsContent}
    >
      {categories.map((category) => (
        <TouchableOpacity
          key={category.id}
          style={[
            styles.categoryTab,
            selectedCategory === category.id && styles.categoryTabActive,
            { backgroundColor: selectedCategory === category.id ? tenant?.branding.colors.primary : 'transparent' }
          ]}
          onPress={() => {
            setSelectedCategory(category.id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Text
            style={[
              styles.categoryTabText,
              selectedCategory === category.id && styles.categoryTabTextActive
            ]}
          >
            {category.name[language as keyof typeof category.name]}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderHeader = () => (
    <LinearGradient
      colors={tenant ? [tenant.branding.colors.primary, tenant.branding.colors.secondary] : ['#FF6B35', '#004E89']}
      style={styles.header}
    >
      <SafeAreaView edges={['top']}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.tenantName}>{tenant?.name || 'EATECH'}</Text>
              <Text style={styles.headerSubtitle}>
                {userLocation ? '📍 In der Nähe' : '🍴 Speisekarte'}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <VoiceButton
                onVoiceResult={handleVoiceOrder}
                isListening={isVoiceListening}
                size={40}
                style={styles.voiceButton}
              />
              {cartItemsCount > 0 && (
                <TouchableOpacity style={styles.cartButton} onPress={navigateToCart}>
                  <Ionicons name="basket" size={24} color="white" />
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>{cartItemsCount}</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
          {renderCategoryTabs()}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );

  const renderProductItem = ({ item: product }: { item: Product }) => (
    <ProductCard
      product={product}
      language={language}
      currency={tenant?.settings.currency || 'CHF'}
      onPress={() => handleProductPress(product)}
      onAddToCart={(quantity, modifiers) => handleAddToCart(product, quantity, modifiers)}
      style={styles.productCard}
    />
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={tenant?.branding.colors.primary || '#FF6B35'} />
        <Text style={styles.loadingText}>Speisekarte wird geladen...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={tenant?.branding.colors.primary || '#FF6B35'}
      />

      {renderHeader()}

      <FlashList
        data={filteredProducts}
        renderItem={renderProductItem}
        estimatedItemSize={200}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[tenant?.branding.colors.primary || '#FF6B35']}
            tintColor={tenant?.branding.colors.primary || '#FF6B35'}
          />
        }
        contentContainerStyle={styles.productsList}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'Keine Produkte gefunden' : 'Keine Produkte verfügbar'}
            </Text>
          </View>
        )}
      />

      {cartItemsCount > 0 && (
        <View style={styles.cartFloatingButton}>
          <TouchableOpacity
            style={[
              styles.cartFloatingButtonInner,
              { backgroundColor: tenant?.branding.colors.primary || '#FF6B35' }
            ]}
            onPress={navigateToCart}
          >
            <Ionicons name="basket" size={24} color="white" />
            <Text style={styles.cartFloatingButtonText}>
              {cartItemsCount} • CHF {cartTotal.toFixed(2)}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingBottom: 16,
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tenantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  voiceButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  cartButton: {
    position: 'relative',
    padding: 8,
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  categoryTabs: {
    marginTop: 8,
  },
  categoryTabsContent: {
    paddingRight: 20,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryTabActive: {
    backgroundColor: 'white',
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  categoryTabTextActive: {
    color: '#333',
  },
  productsList: {
    padding: 16,
  },
  productCard: {
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  cartFloatingButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
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
  cartFloatingButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 25,
  },
  cartFloatingButtonText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default MenuScreen;
