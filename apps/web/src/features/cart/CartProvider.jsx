/**
 * EATECH - Cart Provider Context
 * Version: 8.3.0
 * Description: Comprehensive Shopping Cart Management mit Lazy Loading & Persistence
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/web/src/features/cart/CartProvider.jsx
 * 
 * Features: Cart persistence, discount codes, tax calculation, real-time sync
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo, lazy } from 'react';

// Lazy loaded utilities
const storageUtils = () => import('../../utils/storageUtils');
const calculationUtils = () => import('../../utils/calculationUtils');
const validationUtils = () => import('../../utils/validationUtils');
const formattersUtils = () => import('../../utils/formattersUtils');

// Lazy loaded services
const cartService = () => import('../../services/cartService');
const discountService = () => import('../../services/discountService');
const taxService = () => import('../../services/taxService');
const analyticsService = () => import('../../services/analyticsService');
const notificationService = () => import('../../services/notificationService');
const syncService = () => import('../../services/syncService');

// Lazy loaded components
const CartNotification = lazy(() => import('./components/CartNotification'));
const DiscountBanner = lazy(() => import('./components/DiscountBanner'));

// Storage keys
const STORAGE_KEYS = {
  CART_ITEMS: '@eatech:cart_items',
  CART_METADATA: '@eatech:cart_metadata',
  DISCOUNT_CODES: '@eatech:discount_codes',
  CART_PREFERENCES: '@eatech:cart_preferences'
};

// Cart action types
const CART_ACTIONS = {
  LOAD_CART: 'LOAD_CART',
  ADD_ITEM: 'ADD_ITEM',
  UPDATE_ITEM: 'UPDATE_ITEM',
  REMOVE_ITEM: 'REMOVE_ITEM',
  CLEAR_CART: 'CLEAR_CART',
  APPLY_DISCOUNT: 'APPLY_DISCOUNT',
  REMOVE_DISCOUNT: 'REMOVE_DISCOUNT',
  UPDATE_DELIVERY_INFO: 'UPDATE_DELIVERY_INFO',
  UPDATE_PAYMENT_METHOD: 'UPDATE_PAYMENT_METHOD',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SYNC_CART: 'SYNC_CART',
  SET_PREFERENCES: 'SET_PREFERENCES'
};

// Discount types
export const DISCOUNT_TYPES = {
  PERCENTAGE: 'percentage',
  FIXED_AMOUNT: 'fixed_amount',
  FREE_DELIVERY: 'free_delivery',
  BOGO: 'buy_one_get_one',
  BULK: 'bulk_discount'
};

// Delivery methods
export const DELIVERY_METHODS = {
  PICKUP: 'pickup',
  DELIVERY: 'delivery',
  DINE_IN: 'dine_in'
};

// Payment methods
export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  TWINT: 'twint',
  PAYPAL: 'paypal',
  APPLE_PAY: 'apple_pay',
  GOOGLE_PAY: 'google_pay'
};

// Initial cart state
const initialCartState = {
  items: [],
  discounts: [],
  deliveryInfo: {
    method: DELIVERY_METHODS.PICKUP,
    address: null,
    scheduledTime: null,
    instructions: ''
  },
  paymentMethod: null,
  subtotal: 0,
  discountAmount: 0,
  taxAmount: 0,
  deliveryFee: 0,
  total: 0,
  itemCount: 0,
  loading: false,
  error: null,
  lastUpdated: null,
  syncStatus: 'synced', // 'synced', 'pending', 'failed'
  preferences: {
    autoApplyDiscounts: true,
    persistCart: true,
    syncAcrossDevices: true,
    notifications: true
  }
};

// Cart reducer
const cartReducer = (state, action) => {
  switch (action.type) {
    case CART_ACTIONS.LOAD_CART:
      return {
        ...state,
        ...action.payload,
        loading: false
      };

    case CART_ACTIONS.ADD_ITEM: {
      const existingItemIndex = state.items.findIndex(item => 
        item.id === action.payload.id && 
        JSON.stringify(item.modifiers) === JSON.stringify(action.payload.modifiers) &&
        JSON.stringify(item.customizations) === JSON.stringify(action.payload.customizations)
      );

      let newItems;
      if (existingItemIndex >= 0) {
        // Update existing item quantity
        newItems = state.items.map((item, index) => 
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + action.payload.quantity }
            : item
        );
      } else {
        // Add new item
        newItems = [...state.items, { 
          ...action.payload, 
          cartItemId: generateCartItemId(),
          addedAt: new Date().toISOString()
        }];
      }

      return {
        ...state,
        items: newItems,
        lastUpdated: new Date().toISOString(),
        syncStatus: 'pending'
      };
    }

    case CART_ACTIONS.UPDATE_ITEM:
      return {
        ...state,
        items: state.items.map(item =>
          item.cartItemId === action.payload.cartItemId
            ? { ...item, ...action.payload.updates }
            : item
        ),
        lastUpdated: new Date().toISOString(),
        syncStatus: 'pending'
      };

    case CART_ACTIONS.REMOVE_ITEM:
      return {
        ...state,
        items: state.items.filter(item => item.cartItemId !== action.payload.cartItemId),
        lastUpdated: new Date().toISOString(),
        syncStatus: 'pending'
      };

    case CART_ACTIONS.CLEAR_CART:
      return {
        ...initialCartState,
        preferences: state.preferences
      };

    case CART_ACTIONS.APPLY_DISCOUNT:
      return {
        ...state,
        discounts: [...state.discounts, action.payload],
        lastUpdated: new Date().toISOString(),
        syncStatus: 'pending'
      };

    case CART_ACTIONS.REMOVE_DISCOUNT:
      return {
        ...state,
        discounts: state.discounts.filter(discount => discount.code !== action.payload.code),
        lastUpdated: new Date().toISOString(),
        syncStatus: 'pending'
      };

    case CART_ACTIONS.UPDATE_DELIVERY_INFO:
      return {
        ...state,
        deliveryInfo: { ...state.deliveryInfo, ...action.payload },
        lastUpdated: new Date().toISOString(),
        syncStatus: 'pending'
      };

    case CART_ACTIONS.UPDATE_PAYMENT_METHOD:
      return {
        ...state,
        paymentMethod: action.payload,
        lastUpdated: new Date().toISOString(),
        syncStatus: 'pending'
      };

    case CART_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };

    case CART_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      };

    case CART_ACTIONS.SYNC_CART:
      return {
        ...state,
        syncStatus: action.payload.status,
        lastSynced: action.payload.timestamp
      };

    case CART_ACTIONS.SET_PREFERENCES:
      return {
        ...state,
        preferences: { ...state.preferences, ...action.payload }
      };

    default:
      return state;
  }
};

// Utility functions
const generateCartItemId = () => `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Create Cart Context
const CartContext = createContext();

// Cart Provider Component
export const CartProvider = ({ children, tenantId, userId }) => {
  const [cartState, dispatch] = useReducer(cartReducer, initialCartState);

  // Lazy loaded services refs
  const cartServiceRef = React.useRef(null);
  const discountServiceRef = React.useRef(null);
  const taxServiceRef = React.useRef(null);
  const analyticsServiceRef = React.useRef(null);
  const notificationServiceRef = React.useRef(null);
  const syncServiceRef = React.useRef(null);
  const storageUtilsRef = React.useRef(null);
  const calculationUtilsRef = React.useRef(null);
  const validationUtilsRef = React.useRef(null);
  const formattersRef = React.useRef(null);

  // ============================================================================
  // LAZY LOADING SETUP
  // ============================================================================
  useEffect(() => {
    const initializeLazyServices = async () => {
      try {
        // Initialize utilities
        storageUtilsRef.current = await storageUtils();
        calculationUtilsRef.current = await calculationUtils();
        validationUtilsRef.current = await validationUtils();
        formattersRef.current = await formattersUtils();

        // Initialize services
        const CartService = await cartService();
        cartServiceRef.current = new CartService.default(tenantId);

        const DiscountService = await discountService();
        discountServiceRef.current = new DiscountService.default(tenantId);

        const TaxService = await taxService();
        taxServiceRef.current = new TaxService.default(tenantId);

        const AnalyticsService = await analyticsService();
        analyticsServiceRef.current = new AnalyticsService.default();

        const NotificationService = await notificationService();
        notificationServiceRef.current = new NotificationService.default();

        if (cartState.preferences.syncAcrossDevices && userId) {
          const SyncService = await syncService();
          syncServiceRef.current = new SyncService.default(userId);
        }

        // Load persisted cart
        await loadPersistedCart();

      } catch (error) {
        console.error('Failed to initialize cart services:', error);
        dispatch({ type: CART_ACTIONS.SET_ERROR, payload: error.message });
      }
    };

    initializeLazyServices();
  }, [tenantId, userId]);

  // ============================================================================
  // CART CALCULATIONS
  // ============================================================================
  const calculatedTotals = useMemo(() => {
    if (!calculationUtilsRef.current) {
      return {
        subtotal: 0,
        discountAmount: 0,
        taxAmount: 0,
        deliveryFee: 0,
        total: 0,
        itemCount: 0
      };
    }

    try {
      const subtotal = cartState.items.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);

      const itemCount = cartState.items.reduce((sum, item) => sum + item.quantity, 0);

      // Calculate discounts
      const discountAmount = calculateDiscountAmount(subtotal, cartState.items, cartState.discounts);

      // Calculate delivery fee
      const deliveryFee = calculateDeliveryFee(cartState.deliveryInfo, subtotal);

      // Calculate tax
      const taxableAmount = subtotal - discountAmount + deliveryFee;
      const taxAmount = calculateTaxAmount(taxableAmount, cartState.deliveryInfo);

      const total = Math.max(0, subtotal - discountAmount + deliveryFee + taxAmount);

      return {
        subtotal,
        discountAmount,
        taxAmount,
        deliveryFee,
        total,
        itemCount
      };
    } catch (error) {
      console.error('Error calculating cart totals:', error);
      return initialCartState;
    }
  }, [cartState.items, cartState.discounts, cartState.deliveryInfo]);

  const calculateDiscountAmount = (subtotal, items, discounts) => {
    if (!discountServiceRef.current) return 0;

    return discounts.reduce((totalDiscount, discount) => {
      switch (discount.type) {
        case DISCOUNT_TYPES.PERCENTAGE:
          return totalDiscount + (subtotal * discount.value / 100);
        
        case DISCOUNT_TYPES.FIXED_AMOUNT:
          return totalDiscount + Math.min(discount.value, subtotal - totalDiscount);
        
        case DISCOUNT_TYPES.BOGO:
          return totalDiscount + calculateBogoDiscount(items, discount);
        
        case DISCOUNT_TYPES.BULK:
          return totalDiscount + calculateBulkDiscount(items, discount);
        
        default:
          return totalDiscount;
      }
    }, 0);
  };

  const calculateBogoDiscount = (items, discount) => {
    // Find eligible items for BOGO
    const eligibleItems = items.filter(item => 
      discount.applicableProducts?.includes(item.id) || discount.applicableCategories?.includes(item.category)
    );
    
    if (eligibleItems.length < 2) return 0;
    
    // Sort by price (descending) to discount cheapest items
    eligibleItems.sort((a, b) => b.price - a.price);
    
    let discountAmount = 0;
    let buyQuantity = 0;
    
    for (const item of eligibleItems) {
      buyQuantity += item.quantity;
      const freeItems = Math.floor(buyQuantity / 2);
      discountAmount += freeItems * item.price;
    }
    
    return discountAmount;
  };

  const calculateBulkDiscount = (items, discount) => {
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    
    if (totalQuantity >= discount.minimumQuantity) {
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return subtotal * discount.value / 100;
    }
    
    return 0;
  };

  const calculateDeliveryFee = (deliveryInfo, subtotal) => {
    if (deliveryInfo.method !== DELIVERY_METHODS.DELIVERY) return 0;
    
    // Free delivery threshold
    if (subtotal >= 50) return 0; // CHF 50 for free delivery
    
    // Base delivery fee
    return 5.90; // CHF 5.90 delivery fee
  };

  const calculateTaxAmount = (taxableAmount, deliveryInfo) => {
    if (!taxServiceRef.current) return 0;
    
    // Swiss VAT rates
    const vatRate = deliveryInfo.method === DELIVERY_METHODS.DINE_IN ? 0.077 : 0.025; // 7.7% dine-in, 2.5% takeaway
    return taxableAmount * vatRate;
  };

  // ============================================================================
  // PERSISTENCE
  // ============================================================================
  const persistCart = useCallback(async () => {
    if (!cartState.preferences.persistCart || !storageUtilsRef.current) return;

    try {
      const cartData = {
        items: cartState.items,
        discounts: cartState.discounts,
        deliveryInfo: cartState.deliveryInfo,
        paymentMethod: cartState.paymentMethod,
        lastUpdated: cartState.lastUpdated,
        preferences: cartState.preferences
      };

      await storageUtilsRef.current.setItem(STORAGE_KEYS.CART_ITEMS, cartData);
      
      // Store metadata separately for quick access
      const metadata = {
        itemCount: calculatedTotals.itemCount,
        total: calculatedTotals.total,
        lastUpdated: cartState.lastUpdated
      };
      
      await storageUtilsRef.current.setItem(STORAGE_KEYS.CART_METADATA, metadata);

    } catch (error) {
      console.error('Failed to persist cart:', error);
    }
  }, [cartState, calculatedTotals]);

  const loadPersistedCart = useCallback(async () => {
    if (!storageUtilsRef.current) return;

    try {
      const persistedCart = await storageUtilsRef.current.getItem(STORAGE_KEYS.CART_ITEMS);
      
      if (persistedCart) {
        // Validate cart items
        const validatedCart = await validateCartItems(persistedCart);
        dispatch({ type: CART_ACTIONS.LOAD_CART, payload: validatedCart });
        
        // Sync with server if enabled
        if (cartState.preferences.syncAcrossDevices && syncServiceRef.current) {
          syncWithServer();
        }
      }
    } catch (error) {
      console.error('Failed to load persisted cart:', error);
    }
  }, []);

  const validateCartItems = async (cartData) => {
    if (!validationUtilsRef.current || !cartServiceRef.current) return cartData;

    try {
      // Validate product availability and prices
      const validatedItems = await Promise.all(
        cartData.items.map(async (item) => {
          const currentProduct = await cartServiceRef.current.getProduct(item.id);
          
          if (!currentProduct || !currentProduct.available) {
            // Product no longer available
            return null;
          }
          
          // Update price if changed
          if (currentProduct.price !== item.price) {
            return { ...item, price: currentProduct.price, priceUpdated: true };
          }
          
          return item;
        })
      );

      // Filter out unavailable items
      const availableItems = validatedItems.filter(Boolean);
      
      return {
        ...cartData,
        items: availableItems
      };
    } catch (error) {
      console.error('Failed to validate cart items:', error);
      return cartData;
    }
  };

  // ============================================================================
  // SYNC OPERATIONS
  // ============================================================================
  const syncWithServer = useCallback(async () => {
    if (!syncServiceRef.current || !userId) return;

    try {
      dispatch({ type: CART_ACTIONS.SYNC_CART, payload: { status: 'syncing' } });

      const serverCart = await syncServiceRef.current.syncCart({
        items: cartState.items,
        discounts: cartState.discounts,
        deliveryInfo: cartState.deliveryInfo,
        lastUpdated: cartState.lastUpdated
      });

      if (serverCart.updated) {
        dispatch({ type: CART_ACTIONS.LOAD_CART, payload: serverCart.data });
      }

      dispatch({ 
        type: CART_ACTIONS.SYNC_CART, 
        payload: { 
          status: 'synced', 
          timestamp: new Date().toISOString() 
        } 
      });

    } catch (error) {
      console.error('Failed to sync with server:', error);
      dispatch({ type: CART_ACTIONS.SYNC_CART, payload: { status: 'failed' } });
    }
  }, [cartState, userId]);

  // Auto-persist cart when it changes
  useEffect(() => {
    if (cartState.items.length > 0 || cartState.discounts.length > 0) {
      persistCart();
    }
  }, [cartState, persistCart]);

  // Auto-sync with server
  useEffect(() => {
    if (cartState.syncStatus === 'pending' && syncServiceRef.current) {
      const syncTimeout = setTimeout(syncWithServer, 2000); // Debounce sync
      return () => clearTimeout(syncTimeout);
    }
  }, [cartState.syncStatus, syncWithServer]);

  // ============================================================================
  // CART ACTIONS
  // ============================================================================
  const addToCart = useCallback(async (product, options = {}) => {
    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });

      // Validate product
      if (validationUtilsRef.current) {
        await validationUtilsRef.current.validateProduct(product);
      }

      const cartItem = {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        category: product.category,
        quantity: options.quantity || 1,
        size: options.size,
        modifiers: options.modifiers || {},
        customizations: options.customizations || {},
        specialInstructions: options.specialInstructions || ''
      };

      dispatch({ type: CART_ACTIONS.ADD_ITEM, payload: cartItem });

      // Track analytics
      if (analyticsServiceRef.current) {
        analyticsServiceRef.current.trackEvent('cart_item_added', {
          product_id: product.id,
          product_name: product.name,
          quantity: cartItem.quantity,
          price: cartItem.price,
          total_cart_value: calculatedTotals.total
        });
      }

      // Show notification
      if (notificationServiceRef.current && cartState.preferences.notifications) {
        notificationServiceRef.current.showSuccess(
          `${product.name} added to cart`,
          { action: 'View Cart', onClick: () => window.dispatchEvent(new CustomEvent('openCart')) }
        );
      }

      return cartItem;

    } catch (error) {
      console.error('Failed to add item to cart:', error);
      dispatch({ type: CART_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    } finally {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: false });
    }
  }, [calculatedTotals.total, cartState.preferences.notifications]);

  const updateCartItem = useCallback(async (cartItemId, updates) => {
    try {
      dispatch({ type: CART_ACTIONS.UPDATE_ITEM, payload: { cartItemId, updates } });

      // Track analytics
      if (analyticsServiceRef.current) {
        analyticsServiceRef.current.trackEvent('cart_item_updated', {
          cart_item_id: cartItemId,
          updates: Object.keys(updates)
        });
      }

    } catch (error) {
      console.error('Failed to update cart item:', error);
      dispatch({ type: CART_ACTIONS.SET_ERROR, payload: error.message });
    }
  }, []);

  const removeFromCart = useCallback(async (cartItemId) => {
    try {
      const item = cartState.items.find(item => item.cartItemId === cartItemId);
      
      dispatch({ type: CART_ACTIONS.REMOVE_ITEM, payload: { cartItemId } });

      // Track analytics
      if (analyticsServiceRef.current && item) {
        analyticsServiceRef.current.trackEvent('cart_item_removed', {
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity
        });
      }

      // Show notification
      if (notificationServiceRef.current && cartState.preferences.notifications && item) {
        notificationServiceRef.current.showInfo(
          `${item.name} removed from cart`,
          { action: 'Undo', onClick: () => addToCart(item, item) }
        );
      }

    } catch (error) {
      console.error('Failed to remove item from cart:', error);
      dispatch({ type: CART_ACTIONS.SET_ERROR, payload: error.message });
    }
  }, [cartState.items, cartState.preferences.notifications, addToCart]);

  const clearCart = useCallback(async () => {
    try {
      const itemCount = cartState.items.length;
      
      dispatch({ type: CART_ACTIONS.CLEAR_CART });

      // Clear persisted cart
      if (storageUtilsRef.current) {
        await storageUtilsRef.current.removeItem(STORAGE_KEYS.CART_ITEMS);
        await storageUtilsRef.current.removeItem(STORAGE_KEYS.CART_METADATA);
      }

      // Track analytics
      if (analyticsServiceRef.current) {
        analyticsServiceRef.current.trackEvent('cart_cleared', {
          items_count: itemCount,
          total_value: calculatedTotals.total
        });
      }

    } catch (error) {
      console.error('Failed to clear cart:', error);
      dispatch({ type: CART_ACTIONS.SET_ERROR, payload: error.message });
    }
  }, [cartState.items.length, calculatedTotals.total]);

  // ============================================================================
  // DISCOUNT OPERATIONS
  // ============================================================================
  const applyDiscount = useCallback(async (discountCode) => {
    if (!discountServiceRef.current) {
      throw new Error('Discount service not available');
    }

    try {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: true });

      // Validate discount code
      const discount = await discountServiceRef.current.validateDiscount(discountCode, {
        subtotal: calculatedTotals.subtotal,
        items: cartState.items,
        userId: userId
      });

      if (!discount.valid) {
        throw new Error(discount.error || 'Invalid discount code');
      }

      // Check if already applied
      if (cartState.discounts.some(d => d.code === discountCode)) {
        throw new Error('Discount code already applied');
      }

      dispatch({ type: CART_ACTIONS.APPLY_DISCOUNT, payload: discount });

      // Track analytics
      if (analyticsServiceRef.current) {
        analyticsServiceRef.current.trackEvent('discount_applied', {
          discount_code: discountCode,
          discount_type: discount.type,
          discount_value: discount.value,
          cart_total: calculatedTotals.total
        });
      }

      // Show notification
      if (notificationServiceRef.current) {
        notificationServiceRef.current.showSuccess(
          `Discount "${discountCode}" applied!`,
          { duration: 3000 }
        );
      }

      return discount;

    } catch (error) {
      console.error('Failed to apply discount:', error);
      dispatch({ type: CART_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    } finally {
      dispatch({ type: CART_ACTIONS.SET_LOADING, payload: false });
    }
  }, [calculatedTotals, cartState.items, cartState.discounts, userId]);

  const removeDiscount = useCallback((discountCode) => {
    dispatch({ type: CART_ACTIONS.REMOVE_DISCOUNT, payload: { code: discountCode } });

    // Track analytics
    if (analyticsServiceRef.current) {
      analyticsServiceRef.current.trackEvent('discount_removed', {
        discount_code: discountCode
      });
    }
  }, []);

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================
  const contextValue = {
    // State
    ...cartState,
    ...calculatedTotals,
    
    // Actions
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    applyDiscount,
    removeDiscount,
    
    // Delivery & Payment
    updateDeliveryInfo: useCallback((info) => {
      dispatch({ type: CART_ACTIONS.UPDATE_DELIVERY_INFO, payload: info });
    }, []),
    
    updatePaymentMethod: useCallback((method) => {
      dispatch({ type: CART_ACTIONS.UPDATE_PAYMENT_METHOD, payload: method });
    }, []),
    
    // Preferences
    updatePreferences: useCallback((preferences) => {
      dispatch({ type: CART_ACTIONS.SET_PREFERENCES, payload: preferences });
    }, []),
    
    // Utilities
    syncWithServer,
    formatPrice: useCallback((amount) => {
      return formattersRef.current?.formatPrice(amount) || `CHF ${amount.toFixed(2)}`;
    }, []),
    
    isItemInCart: useCallback((productId, options = {}) => {
      return cartState.items.some(item => 
        item.id === productId &&
        JSON.stringify(item.modifiers) === JSON.stringify(options.modifiers || {}) &&
        JSON.stringify(item.customizations) === JSON.stringify(options.customizations || {})
      );
    }, [cartState.items]),
    
    getItemQuantity: useCallback((productId, options = {}) => {
      const item = cartState.items.find(item => 
        item.id === productId &&
        JSON.stringify(item.modifiers) === JSON.stringify(options.modifiers || {}) &&
        JSON.stringify(item.customizations) === JSON.stringify(options.customizations || {})
      );
      return item?.quantity || 0;
    }, [cartState.items])
  };

  return (
    <CartContext.Provider value={contextValue}>
      {children}
      
      {/* Lazy loaded notifications and banners */}
      {cartState.preferences.notifications && (
        <React.Suspense fallback={null}>
          <CartNotification />
        </React.Suspense>
      )}
      
      {cartState.discounts.length > 0 && (
        <React.Suspense fallback={null}>
          <DiscountBanner discounts={cartState.discounts} />
        </React.Suspense>
      )}
    </CartContext.Provider>
  );
};

// Custom hook to use cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartProvider;