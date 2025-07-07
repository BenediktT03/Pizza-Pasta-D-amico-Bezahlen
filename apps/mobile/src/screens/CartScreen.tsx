// /apps/mobile/src/screens/CartScreen.tsx

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Services & Utils
import { apiService } from '../services/api.service';
import { storage } from '../utils/storage';

// Components
import { CartItem } from '../components/CartItem';

// Types
interface Product {
  id: string;
  name: {
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
      };
    }>;
  };
  modifierGroups?: Array<{
    id: string;
    name: { [key: string]: string };
    options: Array<{
      id: string;
      name: { [key: string]: string };
      price: number;
    }>;
  }>;
}

interface CartItemData {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  modifiers: Array<{
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
    price: number;
  }>;
  unitPrice: number;
  modifiersPrice: number;
  totalPrice: number;
  notes?: string;
}

interface PromoCode {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  description: string;
  minimumAmount?: number;
}

interface CartSummary {
  subtotal: number;
  itemsTotal: number;
  modifiersTotal: number;
  discountTotal: number;
  deliveryFee: number;
  serviceFee: number;
  packagingFee: number;
  taxAmount: number;
  tipAmount: number;
  total: number;
  currency: string;
}

type RootStackParamList = {
  Menu: { tenantId?: string };
  Cart: undefined;
  Checkout: { cartData: CartItemData[]; summary: CartSummary };
  ProductDetail: { productId: string };
};

const { width: screenWidth } = Dimensions.get('window');

export const CartScreen: React.FC = () => {
  // Navigation
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // State
  const [cartItems, setCartItems] = useState<CartItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingCart, setIsUpdatingCart] = useState(false);
  const [promoCode, setPromoCode] = useState<string>('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [tipPercentage, setTipPercentage] = useState<number>(0);
  const [customTip, setCustomTip] = useState<number>(0);
  const [language, setLanguage] = useState<string>('de');
  const [tenantId, setTenantId] = useState<string>('');
  const [isPromoLoading, setIsPromoLoading] = useState(false);

  // Computed values
  const cartSummary = useMemo((): CartSummary => {
    const itemsTotal = cartItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const modifiersTotal = cartItems.reduce((sum, item) => sum + (item.modifiersPrice * item.quantity), 0);
    const subtotal = itemsTotal + modifiersTotal;

    // Calculate discount
    let discountTotal = 0;
    if (appliedPromo) {
      if (appliedPromo.type === 'percentage') {
        discountTotal = subtotal * (appliedPromo.value / 100);
      } else {
        discountTotal = appliedPromo.value;
      }
      // Don't let discount exceed subtotal
      discountTotal = Math.min(discountTotal, subtotal);
    }

    // Fees (configurable by tenant)
    const deliveryFee = 0; // Pickup order
    const serviceFee = 0;
    const packagingFee = cartItems.length > 0 ? 0.50 : 0; // CHF 0.50 packaging

    // Tax (Swiss VAT 7.7%)
    const taxableAmount = subtotal - discountTotal + deliveryFee + serviceFee + packagingFee;
    const taxAmount = taxableAmount * 0.077;

    // Tip calculation
    const tipBaseAmount = subtotal - discountTotal;
    const tipAmount = tipPercentage > 0 ?
      tipBaseAmount * (tipPercentage / 100) :
      customTip;

    const total = taxableAmount + taxAmount + tipAmount;

    return {
      subtotal,
      itemsTotal,
      modifiersTotal,
      discountTotal,
      deliveryFee,
      serviceFee,
      packagingFee,
      taxAmount,
      tipAmount,
      total,
      currency: 'CHF'
    };
  }, [cartItems, appliedPromo, tipPercentage, customTip]);

  const isEmpty = cartItems.length === 0;

  // Load data
  const loadCartData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Load cached data
      const cachedCart = await storage.get('cart') || [];
      const cachedLanguage = await storage.get('language') || 'de';
      const cachedTenantId = await storage.get('currentTenantId') || '';
      const cachedPromo = await storage.get('appliedPromo');
      const cachedTip = await storage.get('tipSettings');

      setLanguage(cachedLanguage);
      setTenantId(cachedTenantId);

      if (cachedPromo) {
        setAppliedPromo(cachedPromo);
        setPromoCode(cachedPromo.code);
      }

      if (cachedTip) {
        setTipPercentage(cachedTip.percentage || 0);
        setCustomTip(cachedTip.custom || 0);
      }

      if (cachedCart.length > 0) {
        // Load product details for cart items
        const enrichedCartItems = await Promise.all(
          cachedCart.map(async (item: any) => {
            try {
              const product = await apiService.get(`/tenants/${cachedTenantId}/products/${item.productId}`);
              return {
                ...item,
                id: item.id || `${item.productId}_${Date.now()}`,
                product
              };
            } catch (error) {
              console.error(`Error loading product ${item.productId}:`, error);
              return {
                ...item,
                id: item.id || `${item.productId}_${Date.now()}`,
              };
            }
          })
        );

        setCartItems(enrichedCartItems);
      }

    } catch (error) {
      console.error('Error loading cart data:', error);
      Alert.alert('Fehler', 'Der Warenkorb konnte nicht geladen werden.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save cart to storage
  const saveCartToStorage = useCallback(async (items: CartItemData[]) => {
    try {
      const cartDataForStorage = items.map(item => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        modifiers: item.modifiers,
        unitPrice: item.unitPrice,
        modifiersPrice: item.modifiersPrice,
        totalPrice: item.totalPrice,
        notes: item.notes
      }));

      await storage.set('cart', cartDataForStorage);
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  }, []);

  // Cart actions
  const updateItemQuantity = useCallback(async (itemId: string, newQuantity: number) => {
    if (newQuantity < 0) return;

    try {
      setIsUpdatingCart(true);

      let updatedItems: CartItemData[];

      if (newQuantity === 0) {
        // Remove item
        updatedItems = cartItems.filter(item => item.id !== itemId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        // Update quantity
        updatedItems = cartItems.map(item => {
          if (item.id === itemId) {
            const totalPrice = (item.unitPrice + item.modifiersPrice) * newQuantity;
            return {
              ...item,
              quantity: newQuantity,
              totalPrice
            };
          }
          return item;
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      setCartItems(updatedItems);
      await saveCartToStorage(updatedItems);

    } catch (error) {
      console.error('Error updating item quantity:', error);
      Alert.alert('Fehler', 'Die Menge konnte nicht aktualisiert werden.');
    } finally {
      setIsUpdatingCart(false);
    }
  }, [cartItems, saveCartToStorage]);

  const removeItem = useCallback(async (itemId: string) => {
    Alert.alert(
      'Artikel entfernen',
      'Möchten Sie diesen Artikel aus dem Warenkorb entfernen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Entfernen',
          style: 'destructive',
          onPress: () => updateItemQuantity(itemId, 0)
        }
      ]
    );
  }, [updateItemQuantity]);

  const clearCart = useCallback(async () => {
    Alert.alert(
      'Warenkorb leeren',
      'Möchten Sie alle Artikel aus dem Warenkorb entfernen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Leeren',
          style: 'destructive',
          onPress: async () => {
            setCartItems([]);
            await storage.set('cart', []);
            await storage.remove('appliedPromo');
            setAppliedPromo(null);
            setPromoCode('');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      ]
    );
  }, []);

  // Promo code handling
  const applyPromoCode = useCallback(async () => {
    if (!promoCode.trim()) return;

    try {
      setIsPromoLoading(true);

      const promoResult = await apiService.post(`/tenants/${tenantId}/promocodes/validate`, {
        code: promoCode.trim(),
        cartTotal: cartSummary.subtotal,
        itemCount: cartItems.length
      });

      if (promoResult.valid) {
        const promo: PromoCode = {
          code: promoCode.trim(),
          type: promoResult.type,
          value: promoResult.value,
          description: promoResult.description,
          minimumAmount: promoResult.minimumAmount
        };

        setAppliedPromo(promo);
        await storage.set('appliedPromo', promo);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Erfolg', `Rabattcode "${promo.code}" wurde angewendet!`);
      } else {
        Alert.alert('Ungültiger Code', promoResult.message || 'Der Rabattcode ist ungültig oder abgelaufen.');
      }

    } catch (error) {
      console.error('Error applying promo code:', error);
      Alert.alert('Fehler', 'Der Rabattcode konnte nicht überprüft werden.');
    } finally {
      setIsPromoLoading(false);
    }
  }, [promoCode, tenantId, cartSummary.subtotal, cartItems.length]);

  const removePromoCode = useCallback(async () => {
    setAppliedPromo(null);
    setPromoCode('');
    await storage.remove('appliedPromo');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Tip handling
  const setTip = useCallback(async (percentage: number, custom: number = 0) => {
    setTipPercentage(percentage);
    setCustomTip(custom);

    await storage.set('tipSettings', {
      percentage,
      custom
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Navigation
  const navigateToMenu = useCallback(() => {
    navigation.navigate('Menu', { tenantId });
  }, [navigation, tenantId]);

  const navigateToCheckout = useCallback(() => {
    if (isEmpty) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Checkout', {
      cartData: cartItems,
      summary: cartSummary
    });
  }, [navigation, cartItems, cartSummary, isEmpty]);

  // Effects
  useFocusEffect(
    useCallback(() => {
      loadCartData();
    }, [loadCartData])
  );

  // Render methods
  const renderCartItem = ({ item }: { item: CartItemData }) => (
    <CartItem
      item={item}
      language={language}
      onUpdateQuantity={(quantity) => updateItemQuantity(item.id, quantity)}
      onRemove={() => removeItem(item.id)}
      isUpdating={isUpdatingCart}
    />
  );

  const renderPromoCodeSection = () => (
    <View style={styles.promoSection}>
      <Text style={styles.sectionTitle}>Rabattcode</Text>
      {appliedPromo ? (
        <View style={styles.appliedPromoContainer}>
          <View style={styles.appliedPromoContent}>
            <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
            <View style={styles.appliedPromoText}>
              <Text style={styles.appliedPromoCode}>{appliedPromo.code}</Text>
              <Text style={styles.appliedPromoDescription}>{appliedPromo.description}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={removePromoCode} style={styles.removePromoButton}>
            <Ionicons name="close" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.promoInputContainer}>
          <TextInput
            style={styles.promoInput}
            value={promoCode}
            onChangeText={setPromoCode}
            placeholder="Rabattcode eingeben"
            placeholderTextColor="#999"
            autoCapitalize="characters"
            returnKeyType="done"
            onSubmitEditing={applyPromoCode}
          />
          <TouchableOpacity
            style={[styles.promoApplyButton, !promoCode.trim() && styles.promoApplyButtonDisabled]}
            onPress={applyPromoCode}
            disabled={!promoCode.trim() || isPromoLoading}
          >
            {isPromoLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.promoApplyButtonText}>Anwenden</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderTipSection = () => (
    <View style={styles.tipSection}>
      <Text style={styles.sectionTitle}>Trinkgeld</Text>
      <View style={styles.tipOptions}>
        {[0, 5, 10, 15].map((percentage) => (
          <TouchableOpacity
            key={percentage}
            style={[
              styles.tipOption,
              tipPercentage === percentage && styles.tipOptionActive
            ]}
            onPress={() => setTip(percentage, 0)}
          >
            <Text
              style={[
                styles.tipOptionText,
                tipPercentage === percentage && styles.tipOptionTextActive
              ]}
            >
              {percentage === 0 ? 'Kein' : `${percentage}%`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderOrderSummary = () => (
    <View style={styles.summarySection}>
      <Text style={styles.sectionTitle}>Bestellübersicht</Text>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Zwischensumme</Text>
        <Text style={styles.summaryValue}>CHF {cartSummary.subtotal.toFixed(2)}</Text>
      </View>

      {cartSummary.discountTotal > 0 && (
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, styles.discountLabel]}>Rabatt</Text>
          <Text style={[styles.summaryValue, styles.discountValue]}>
            -CHF {cartSummary.discountTotal.toFixed(2)}
          </Text>
        </View>
      )}

      {cartSummary.packagingFee > 0 && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Verpackung</Text>
          <Text style={styles.summaryValue}>CHF {cartSummary.packagingFee.toFixed(2)}</Text>
        </View>
      )}

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>MwSt. (7.7%)</Text>
        <Text style={styles.summaryValue}>CHF {cartSummary.taxAmount.toFixed(2)}</Text>
      </View>

      {cartSummary.tipAmount > 0 && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Trinkgeld</Text>
          <Text style={styles.summaryValue}>CHF {cartSummary.tipAmount.toFixed(2)}</Text>
        </View>
      )}

      <View style={[styles.summaryRow, styles.totalRow]}>
        <Text style={styles.totalLabel}>Gesamt</Text>
        <Text style={styles.totalValue}>CHF {cartSummary.total.toFixed(2)}</Text>
      </View>
    </View>
  );

  const renderEmptyCart = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="basket-outline" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>Ihr Warenkorb ist leer</Text>
      <Text style={styles.emptySubtitle}>
        Fügen Sie Artikel aus der Speisekarte hinzu, um eine Bestellung aufzugeben.
      </Text>
      <TouchableOpacity style={styles.continueShoppingButton} onPress={navigateToMenu}>
        <Text style={styles.continueShoppingButtonText}>Zur Speisekarte</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Warenkorb wird geladen...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Warenkorb</Text>
        {!isEmpty && (
          <TouchableOpacity onPress={clearCart} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Leeren</Text>
          </TouchableOpacity>
        )}
      </View>

      {isEmpty ? (
        renderEmptyCart()
      ) : (
        <>
          <FlashList
            data={cartItems}
            renderItem={renderCartItem}
            estimatedItemSize={120}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.cartList}
            ListFooterComponent={() => (
              <View style={styles.footerSections}>
                {renderPromoCodeSection()}
                {renderTipSection()}
                {renderOrderSummary()}
              </View>
            )}
          />

          {/* Checkout Button */}
          <View style={styles.checkoutContainer}>
            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={navigateToCheckout}
              disabled={isEmpty}
            >
              <Text style={styles.checkoutButtonText}>
                Zur Kasse • CHF {cartSummary.total.toFixed(2)}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '500',
  },
  cartList: {
    padding: 16,
  },
  footerSections: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  promoSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  appliedPromoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#22C55E',
    borderRadius: 8,
    padding: 12,
  },
  appliedPromoContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  appliedPromoText: {
    marginLeft: 8,
    flex: 1,
  },
  appliedPromoCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22C55E',
  },
  appliedPromoDescription: {
    fontSize: 12,
    color: '#16A34A',
    marginTop: 2,
  },
  removePromoButton: {
    padding: 4,
  },
  promoInputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  promoApplyButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  promoApplyButtonDisabled: {
    backgroundColor: '#ccc',
  },
  promoApplyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  tipSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tipOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  tipOption: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
  },
  tipOptionActive: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF3F0',
  },
  tipOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  tipOptionTextActive: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  summarySection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  discountLabel: {
    color: '#22C55E',
  },
  discountValue: {
    color: '#22C55E',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 24,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  continueShoppingButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 25,
    paddingHorizontal: 32,
    paddingVertical: 16,
    marginTop: 32,
  },
  continueShoppingButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  checkoutContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  checkoutButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default CartScreen;
