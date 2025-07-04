/**
 * EATECH - Cart Context
 * Version: 16.0.0
 * Description: Globale Warenkorb-Verwaltung mit LocalStorage
 * Author: EATECH Development Team
 * Created: 2025-07-05
 * File Path: /apps/web/src/contexts/CartContext.jsx
 */

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const CartContext = createContext({});

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  
  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('eatech-cart');
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error loading cart:', error);
      }
    }
  }, []);
  
  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem('eatech-cart', JSON.stringify(items));
    } else {
      localStorage.removeItem('eatech-cart');
    }
  }, [items]);
  
  const addToCart = (product, quantity = 1) => {
    setItems(currentItems => {
      const existingItem = currentItems.find(item => item.id === product.id);
      
      if (existingItem) {
        return currentItems.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      
      return [...currentItems, { ...product, quantity }];
    });
  };
  
  const removeFromCart = (productId) => {
    setItems(currentItems => {
      const existingItem = currentItems.find(item => item.id === productId);
      
      if (existingItem && existingItem.quantity > 1) {
        return currentItems.map(item =>
          item.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      }
      
      return currentItems.filter(item => item.id !== productId);
    });
  };
  
  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setItems(currentItems => currentItems.filter(item => item.id !== productId));
      return;
    }
    
    setItems(currentItems =>
      currentItems.map(item =>
        item.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };
  
  const clearCart = () => {
    setItems([]);
    localStorage.removeItem('eatech-cart');
    toast.success('Warenkorb geleert');
  };
  
  const getItemQuantity = (productId) => {
    const item = items.find(item => item.id === productId);
    return item?.quantity || 0;
  };
  
  const getCartTotal = () => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  };
  
  const getItemCount = () => {
    return items.reduce((count, item) => count + item.quantity, 0);
  };
  
  const value = {
    items,
    isOpen,
    setIsOpen,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getItemQuantity,
    getCartTotal,
    getItemCount
  };
  
  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};