/**
 * EATECH - Floating Cart Component
 * Version: 16.0.0
 * Description: Schwebendes Warenkorb-Widget mit Slide-In Panel
 * Author: EATECH Development Team
 * Created: 2025-07-05
 * File Path: /apps/web/src/components/cart/FloatingCart.jsx
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, 
  X, 
  Plus, 
  Minus, 
  Trash2, 
  ArrowRight,
  Package,
  Clock,
  MapPin
} from 'lucide-react';
import styles from './FloatingCart.module.css';

const FloatingCart = () => {
  const { 
    cartItems, 
    cartCount, 
    cartTotal, 
    updateQuantity, 
    removeFromCart, 
    clearCart 
  } = useCart();
  
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deliveryType, setDeliveryType] = useState('pickup'); // 'pickup' oder 'delivery'
  const [estimatedTime, setEstimatedTime] = useState(25); // Minuten

  // Öffne Cart automatisch bei erstem Item
  useEffect(() => {
    if (cartCount === 1 && !isOpen) {
      setIsOpen(true);
      // Vibriere auf Mobile
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  }, [cartCount, isOpen]);

  // Format Währung
  const formatPrice = (price) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF'
    }).format(price);
  };

  // Handle Checkout
  const handleCheckout = () => {
    // Speichere Bestelldetails
    localStorage.setItem('currentOrder', JSON.stringify({
      items: cartItems,
      total: cartTotal,
      deliveryType,
      estimatedTime,
      timestamp: new Date().toISOString()
    }));
    
    // Navigiere zu Checkout
    window.location.href = '/checkout';
  };

  // Handle Clear Cart
  const handleClearCart = () => {
    setShowConfirm(true);
  };

  const confirmClearCart = () => {
    clearCart();
    setShowConfirm(false);
    setIsOpen(false);
  };

  // Render nichts wenn Cart leer
  if (cartCount === 0 && !isOpen) {
    return null;
  }

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {cartCount > 0 && !isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className={styles.floatingButton}
          >
            <ShoppingCart size={24} />
            <span className={styles.badge}>{cartCount}</span>
            <span className={styles.total}>{formatPrice(cartTotal)}</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Cart Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className={styles.backdrop}
            />

            {/* Cart Slide-In Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={styles.cartPanel}
            >
              {/* Header */}
              <div className={styles.header}>
                <h2>
                  <ShoppingCart size={20} />
                  Warenkorb ({cartCount})
                </h2>
                <button 
                  onClick={() => setIsOpen(false)}
                  className={styles.closeButton}
                >
                  <X size={24} />
                </button>
              </div>

              {/* Delivery Options */}
              <div className={styles.deliveryOptions}>
                <button
                  className={`${styles.deliveryOption} ${deliveryType === 'pickup' ? styles.active : ''}`}
                  onClick={() => setDeliveryType('pickup')}
                >
                  <Package size={18} />
                  <span>Abholung</span>
                </button>
                <button
                  className={`${styles.deliveryOption} ${deliveryType === 'delivery' ? styles.active : ''}`}
                  onClick={() => setDeliveryType('delivery')}
                >
                  <MapPin size={18} />
                  <span>Lieferung</span>
                </button>
              </div>

              {/* Estimated Time */}
              <div className={styles.estimatedTime}>
                <Clock size={16} />
                <span>Bereit in ca. {estimatedTime} Minuten</span>
              </div>

              {/* Cart Items */}
              <div className={styles.cartItems}>
                {cartItems.length === 0 ? (
                  <div className={styles.emptyCart}>
                    <Package size={48} />
                    <p>Dein Warenkorb ist leer</p>
                    <button 
                      onClick={() => setIsOpen(false)}
                      className={styles.continueButton}
                    >
                      Weiter einkaufen
                    </button>
                  </div>
                ) : (
                  <>
                    {cartItems.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        className={styles.cartItem}
                      >
                        <div className={styles.itemImage}>
                          <img src={item.image} alt={item.name} />
                        </div>
                        
                        <div className={styles.itemDetails}>
                          <h4>{item.name}</h4>
                          <p className={styles.itemOptions}>
                            {item.selectedOptions?.map(opt => opt.value).join(', ')}
                          </p>
                          <p className={styles.itemNote}>
                            {item.specialInstructions}
                          </p>
                        </div>

                        <div className={styles.itemActions}>
                          <div className={styles.quantityControl}>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              <Minus size={16} />
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                          
                          <div className={styles.itemPrice}>
                            {formatPrice(item.price * item.quantity)}
                          </div>
                          
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className={styles.removeButton}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </>
                )}
              </div>

              {/* Footer */}
              {cartItems.length > 0 && (
                <div className={styles.footer}>
                  {/* Clear Cart Button */}
                  <button 
                    onClick={handleClearCart}
                    className={styles.clearButton}
                  >
                    Warenkorb leeren
                  </button>

                  {/* Price Summary */}
                  <div className={styles.priceSummary}>
                    <div className={styles.priceRow}>
                      <span>Zwischensumme</span>
                      <span>{formatPrice(cartTotal)}</span>
                    </div>
                    {deliveryType === 'delivery' && (
                      <div className={styles.priceRow}>
                        <span>Liefergebühr</span>
                        <span>{formatPrice(5)}</span>
                      </div>
                    )}
                    <div className={styles.totalRow}>
                      <span>Gesamt</span>
                      <span>{formatPrice(cartTotal + (deliveryType === 'delivery' ? 5 : 0))}</span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <button 
                    onClick={handleCheckout}
                    className={styles.checkoutButton}
                  >
                    <span>Zur Kasse</span>
                    <ArrowRight size={20} />
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Clear Cart Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={styles.modalBackdrop}
              onClick={() => setShowConfirm(false)}
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className={styles.confirmModal}
            >
              <h3>Warenkorb leeren?</h3>
              <p>Alle Artikel werden aus dem Warenkorb entfernt.</p>
              <div className={styles.modalButtons}>
                <button 
                  onClick={() => setShowConfirm(false)}
                  className={styles.cancelButton}
                >
                  Abbrechen
                </button>
                <button 
                  onClick={confirmClearCart}
                  className={styles.confirmButton}
                >
                  Ja, leeren
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingCart;