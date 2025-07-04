/**
 * EATECH - Floating Cart Component
 * Version: 16.0.0
 * Description: Schwebendes Warenkorb-Widget mit Slide-In Panel
 * Author: EATECH Development Team
 * Created: 2025-07-05
 * File Path: /apps/web/src/components/cart/FloatingCart.jsx
 */

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, 
  X, 
  Plus, 
  Minus, 
  Trash2,
  ArrowRight,
  ShoppingBag
} from 'lucide-react';
import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';
import { useRouter } from 'next/navigation';

export default function FloatingCart() {
  const router = useRouter();
  const {
    items,
    isOpen,
    setIsOpen,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getItemCount
  } = useCart();
  
  const itemCount = getItemCount();
  const total = getCartTotal();
  
  // Don't show if empty and closed
  if (itemCount === 0