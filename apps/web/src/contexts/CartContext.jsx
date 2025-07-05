/**
 * EATECH Cart Context
 * Manages shopping cart state and operations
 * File Path: /apps/web/src/contexts/CartContext.jsx
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { toast } from 'react-hot-toast';

// Create Context
const CartContext = createContext({});

// Custom Hook
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

// Cart Provider Component
export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useLocalStorage('eatech_cart', []);
  const [isOpen, setIsOpen] = useState(false);
  const [promoCode, setPromoCode] = useState(null);
  const [notes, setNotes] = useState('');

  // Calculate totals
  const calculateTotals = useCallback(() => {
    const subtotal = cartItems.reduce((sum, item) => {
      let itemPrice = item.price * item.quantity;
      
      // Add option prices
      if (item.options) {
        Object.entries(item.options).forEach(([groupId, optionIds]) => {
          const optionIdArray = Array.isArray(optionIds) ? optionIds : [optionIds];
          optionIdArray.forEach(optionId => {
            const group = item.product?.options?.find(g => g.id === groupId);
            const option = group?.items?.find(opt => opt.id === optionId);
            if (option?.price) {
              itemPrice += option.price * item.quantity;
            }
          });
        });
      }
      
      return sum + itemPrice;
    }, 0);

    // Calculate discount
    let discount = 0;
    if (promoCode) {
      if (promoCode.type === 'percentage') {
        discount = subtotal * (promoCode.value / 100);
      } else {
        discount = promoCode.value;
      }
      discount = Math.min(discount, subtotal);
    }

    const total = subtotal - discount;

    return {
      subtotal,
      discount,
      total,
      itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0)
    };
  }, [cartItems, promoCode]);

  // Add item to cart
  const addItem = useCallback((product, quantity = 1, options = {}) => {
    setCartItems(prevItems => {
      // Check if item with same options already exists
      const existingItemIndex = prevItems.findIndex(item => 
        item.id === product.id && 
        JSON.stringify(item.options) === JSON.stringify(options)
      );

      if (existingItemIndex > -1) {
        // Update quantity of existing item
        const newItems = [...prevItems];
        newItems[existingItemIndex].quantity += quantity;
        return newItems;
      } else {
        // Add new item
        const newItem = {
          ...product,
          cartId: `${product.id}_${Date.now()}`,
          quantity,
          options,
          addedAt: Date.now()
        };
        return [...prevItems, newItem];
      }
    });

    toast.success(`${product.name} wurde zum Warenkorb hinzugefügt`, {
      position: 'bottom-center',
      duration: 2000
    });
  }, [setCartItems]);

  // Update item quantity
  const updateQuantity = useCallback((cartId, newQuantity) => {
    if (newQuantity <= 0) {
      removeItem(cartId);
      return;
    }

    setCartItems(prevItems =>
      prevItems.map(item =>
        item.cartId === cartId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  }, [setCartItems]);

  // Remove item from cart
  const removeItem = useCallback((cartId) => {
    setCartItems(prevItems => prevItems.filter(item => item.cartId !== cartId));
    
    toast.success('Artikel entfernt', {
      position: 'bottom-center',
      duration: 2000
    });
  }, [setCartItems]);

  // Clear entire cart
  const clearCart = useCallback(() => {
    setCartItems([]);
    setPromoCode(null);
    setNotes('');
    
    toast.success('Warenkorb geleert', {
      position: 'bottom-center',
      duration: 2000
    });
  }, [setCartItems]);

  // Apply promo code
  const applyPromoCode = useCallback(async (code) => {
    // In a real app, this would validate with backend
    const validCodes = {
      'WELCOME10': { type: 'percentage', value: 10 },
      'SAVE5': { type: 'fixed', value: 5 },
      'STUDENT20': { type: 'percentage', value: 20 }
    };

    const promo = validCodes[code.toUpperCase()];
    if (promo) {
      setPromoCode({ code, ...promo });
      toast.success('Gutschein angewendet!');
      return true;
    } else {
      toast.error('Ungültiger Gutscheincode');
      return false;
    }
  }, []);

  // Remove promo code
  const removePromoCode = useCallback(() => {
    setPromoCode(null);
    toast.success('Gutschein entfernt');
  }, []);

  // Get cart item by ID
  const getItem = useCallback((cartId) => {
    return cartItems.find(item => item.cartId === cartId);
  }, [cartItems]);

  // Check if product is in cart
  const isInCart = useCallback((productId) => {
    return cartItems.some(item => item.id === productId);
  }, [cartItems]);

  // Get item quantity in cart
  const getItemQuantity = useCallback((productId) => {
    return cartItems
      .filter(item => item.id === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  // Format price
  const formatPrice = useCallback((price) => {
    return `CHF ${price.toFixed(2)}`;
  }, []);

  // Get cart summary for display
  const getCartSummary = useCallback(() => {
    const totals = calculateTotals();
    return {
      items: cartItems,
      ...totals,
      hasItems: cartItems.length > 0,
      promoCode,
      notes
    };
  }, [cartItems, calculateTotals, promoCode, notes]);

  // Helper methods for common operations
  const incrementQuantity = useCallback((cartId) => {
    const item = getItem(cartId);
    if (item) {
      updateQuantity(cartId, item.quantity + 1);
    }
  }, [getItem, updateQuantity]);

  const decrementQuantity = useCallback((cartId) => {
    const item = getItem(cartId);
    if (item) {
      updateQuantity(cartId, item.quantity - 1);
    }
  }, [getItem, updateQuantity]);

  // Get total items count
  const getTotalItems = useCallback(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  // Get total price
  const getTotalPrice = useCallback(() => {
    return calculateTotals().total;
  }, [calculateTotals]);

  // Context value
  const value = {
    // State
    cartItems,
    isOpen,
    promoCode,
    notes,
    
    // Setters
    setIsOpen,
    setNotes,
    
    // Actions
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    applyPromoCode,
    removePromoCode,
    incrementQuantity,
    decrementQuantity,
    
    // Getters
    getItem,
    isInCart,
    getItemQuantity,
    formatPrice,
    getCartSummary,
    getTotalItems,
    getTotalPrice,
    calculateTotals
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export default CartContext;