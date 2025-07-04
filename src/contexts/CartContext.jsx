/**
 * EATECH - Cart Context Provider
 * Version: 5.0.0
 * Description: Warenkorb-Context mit persistenter Speicherung,
 *              Offline-Support und Multi-Tenant Kompatibilität
 * Author: EATECH Development Team
 * Last Modified: 2025-01-04
 * File Path: /src/contexts/CartContext.jsx
 */

// ============================================================================
// IMPORTS
// ============================================================================
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useTenant } from './TenantContext';
import { useAuth } from './AuthContext';
import { database, dbRef, set, onValue, off } from '../config/firebase';
import { logInfo, logError } from '../utils/monitoring';
import toast from 'react-hot-toast';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================
const CartContext = createContext(null);

// ============================================================================
// CONSTANTS
// ============================================================================
const CART_STORAGE_KEY = 'eatech_cart';
const CART_EXPIRY_HOURS = 24;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generiert einen Cart-Schlüssel basierend auf Tenant und User
 */
const getCartKey = (tenantId, userId = null) => {
    return `${CART_STORAGE_KEY}_${tenantId}${userId ? `_${userId}` : ''}`;
};

/**
 * Prüft ob Cart-Daten abgelaufen sind
 */
const isCartExpired = (timestamp) => {
    if (!timestamp) return true;
    const expiryTime = CART_EXPIRY_HOURS * 60 * 60 * 1000;
    return Date.now() - timestamp > expiryTime;
};

/**
 * Berechnet Rabatte für Artikel
 */
const calculateItemDiscount = (item, discounts = []) => {
    let discount = 0;
    
    // Produkt-spezifischer Rabatt
    if (item.discount) {
        discount = item.discount;
    }
    
    // Globale Rabatte prüfen
    discounts.forEach(d => {
        if (d.type === 'percentage' && d.appliesTo?.includes(item.category)) {
            discount = Math.max(discount, d.value);
        }
    });
    
    return discount;
};

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================
export const CartProvider = ({ children }) => {
    const { tenant } = useTenant();
    const { user } = useAuth();
    
    // State
    const [cartItems, setCartItems] = useState([]);
    const [discounts, setDiscounts] = useState([]);
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [minimumOrder, setMinimumOrder] = useState(0);
    const [notes, setNotes] = useState('');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
    const [selectedDeliveryTime, setSelectedDeliveryTime] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // ============================================================================
    // CART PERSISTENCE
    // ============================================================================
    
    /**
     * Lädt den Warenkorb aus localStorage oder Firebase
     */
    const loadCart = useCallback(async () => {
        if (!tenant?.id) return;
        
        try {
            setLoading(true);
            
            // Wenn User eingeloggt, aus Firebase laden
            if (user?.uid) {
                const cartRef = dbRef(`tenants/${tenant.id}/carts/${user.uid}`);
                const unsubscribe = onValue(cartRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data && !isCartExpired(data.updatedAt)) {
                        setCartItems(data.items || []);
                        setNotes(data.notes || '');
                        setSelectedPaymentMethod(data.paymentMethod || null);
                        setSelectedDeliveryTime(data.deliveryTime || null);
                    } else {
                        // Cart ist abgelaufen oder existiert nicht
                        clearCart();
                    }
                });
                
                return () => off(cartRef, 'value', unsubscribe);
            } else {
                // Aus localStorage laden
                const cartKey = getCartKey(tenant.id);
                const storedCart = localStorage.getItem(cartKey);
                
                if (storedCart) {
                    const cartData = JSON.parse(storedCart);
                    if (!isCartExpired(cartData.updatedAt)) {
                        setCartItems(cartData.items || []);
                        setNotes(cartData.notes || '');
                    } else {
                        localStorage.removeItem(cartKey);
                    }
                }
            }
        } catch (error) {
            logError('CartContext.loadCart', error);
        } finally {
            setLoading(false);
        }
    }, [tenant, user]);
    
    /**
     * Speichert den Warenkorb
     */
    const saveCart = useCallback(async (items) => {
        if (!tenant?.id) return;
        
        const cartData = {
            items,
            notes,
            paymentMethod: selectedPaymentMethod,
            deliveryTime: selectedDeliveryTime,
            updatedAt: Date.now(),
            tenantId: tenant.id
        };
        
        try {
            if (user?.uid) {
                // In Firebase speichern
                await set(dbRef(`tenants/${tenant.id}/carts/${user.uid}`), cartData);
            } else {
                // In localStorage speichern
                const cartKey = getCartKey(tenant.id);
                localStorage.setItem(cartKey, JSON.stringify(cartData));
            }
            
            logInfo('Cart saved', { itemCount: items.length });
        } catch (error) {
            logError('CartContext.saveCart', error);
        }
    }, [tenant, user, notes, selectedPaymentMethod, selectedDeliveryTime]);
    
    // ============================================================================
    // CART OPERATIONS
    // ============================================================================
    
    /**
     * Fügt ein Item zum Warenkorb hinzu
     */
    const addItem = useCallback((product, quantity = 1, options = {}) => {
        setCartItems(prevItems => {
            const existingItemIndex = prevItems.findIndex(
                item => item.id === product.id && 
                JSON.stringify(item.options) === JSON.stringify(options)
            );
            
            let newItems;
            if (existingItemIndex > -1) {
                // Item existiert bereits - Menge erhöhen
                newItems = [...prevItems];
                newItems[existingItemIndex].quantity += quantity;
            } else {
                // Neues Item hinzufügen
                const newItem = {
                    ...product,
                    quantity,
                    options,
                    addedAt: Date.now()
                };
                newItems = [...prevItems, newItem];
            }
            
            saveCart(newItems);
            
            toast.success(`${product.name} wurde zum Warenkorb hinzugefügt`, {
                icon: '🛒',
                duration: 2000
            });
            
            return newItems;
        });
    }, [saveCart]);
    
    /**
     * Aktualisiert die Menge eines Items
     */
    const updateQuantity = useCallback((productId, quantity, options = {}) => {
        if (quantity < 0) return;
        
        setCartItems(prevItems => {
            let newItems;
            
            if (quantity === 0) {
                // Item entfernen
                newItems = prevItems.filter(
                    item => !(item.id === productId && 
                    JSON.stringify(item.options) === JSON.stringify(options))
                );
            } else {
                // Menge aktualisieren
                newItems = prevItems.map(item => {
                    if (item.id === productId && 
                        JSON.stringify(item.options) === JSON.stringify(options)) {
                        return { ...item, quantity };
                    }
                    return item;
                });
            }
            
            saveCart(newItems);
            return newItems;
        });
    }, [saveCart]);
    
    /**
     * Entfernt ein Item aus dem Warenkorb
     */
    const removeItem = useCallback((productId, options = {}) => {
        setCartItems(prevItems => {
            const newItems = prevItems.filter(
                item => !(item.id === productId && 
                JSON.stringify(item.options) === JSON.stringify(options))
            );
            
            saveCart(newItems);
            
            toast.success('Artikel entfernt', {
                icon: '🗑️',
                duration: 2000
            });
            
            return newItems;
        });
    }, [saveCart]);
    
    /**
     * Leert den gesamten Warenkorb
     */
    const clearCart = useCallback(async () => {
        setCartItems([]);
        setNotes('');
        setSelectedPaymentMethod(null);
        setSelectedDeliveryTime(null);
        
        if (tenant?.id) {
            if (user?.uid) {
                // Aus Firebase löschen
                try {
                    await set(dbRef(`tenants/${tenant.id}/carts/${user.uid}`), null);
                } catch (error) {
                    logError('CartContext.clearCart', error);
                }
            } else {
                // Aus localStorage löschen
                const cartKey = getCartKey(tenant.id);
                localStorage.removeItem(cartKey);
            }
        }
        
        logInfo('Cart cleared');
    }, [tenant, user]);
    
    /**
     * Holt die Menge eines bestimmten Produkts
     */
    const getItemQuantity = useCallback((productId, options = {}) => {
        const item = cartItems.find(
            item => item.id === productId && 
            JSON.stringify(item.options) === JSON.stringify(options)
        );
        return item?.quantity || 0;
    }, [cartItems]);
    
    // ============================================================================
    // CALCULATIONS
    // ============================================================================
    
    /**
     * Berechnet den Subtotal (ohne Rabatte)
     */
    const subtotal = useMemo(() => {
        return cartItems.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);
    }, [cartItems]);
    
    /**
     * Berechnet die Gesamtrabatte
     */
    const totalDiscount = useMemo(() => {
        return cartItems.reduce((sum, item) => {
            const discountPercent = calculateItemDiscount(item, discounts);
            const discountAmount = (item.price * item.quantity) * (discountPercent / 100);
            return sum + discountAmount;
        }, 0);
    }, [cartItems, discounts]);
    
    /**
     * Berechnet die MwSt
     */
    const tax = useMemo(() => {
        const taxableAmount = subtotal - totalDiscount;
        const taxRate = tenant?.settings?.taxRate || 2.6; // 2.6% für Take-Away in CH
        return taxableAmount * (taxRate / 100);
    }, [subtotal, totalDiscount, tenant]);
    
    /**
     * Berechnet den Gesamtbetrag
     */
    const total = useMemo(() => {
        return subtotal - totalDiscount + tax + deliveryFee;
    }, [subtotal, totalDiscount, tax, deliveryFee]);
    
    /**
     * Anzahl der Items im Warenkorb
     */
    const cartCount = useMemo(() => {
        return cartItems.reduce((sum, item) => sum + item.quantity, 0);
    }, [cartItems]);
    
    /**
     * Prüft ob Mindestbestellwert erreicht ist
     */
    const isMinimumOrderMet = useMemo(() => {
        return subtotal >= minimumOrder;
    }, [subtotal, minimumOrder]);
    
    // ============================================================================
    // COUPON & DISCOUNT MANAGEMENT
    // ============================================================================
    
    /**
     * Wendet einen Coupon-Code an
     */
    const applyCoupon = useCallback(async (couponCode) => {
        if (!tenant?.id || !couponCode) return false;
        
        try {
            // Coupon aus Datenbank laden
            const couponRef = dbRef(`tenants/${tenant.id}/coupons/${couponCode}`);
            const snapshot = await couponRef.once('value');
            const coupon = snapshot.val();
            
            if (!coupon) {
                toast.error('Ungültiger Gutscheincode');
                return false;
            }
            
            // Validierungen
            if (!coupon.active) {
                toast.error('Dieser Gutschein ist nicht mehr gültig');
                return false;
            }
            
            if (coupon.validFrom && Date.now() < coupon.validFrom) {
                toast.error('Dieser Gutschein ist noch nicht gültig');
                return false;
            }
            
            if (coupon.validUntil && Date.now() > coupon.validUntil) {
                toast.error('Dieser Gutschein ist abgelaufen');
                return false;
            }
            
            if (coupon.minimumOrder && subtotal < coupon.minimumOrder) {
                toast.error(`Mindestbestellwert: ${formatCurrency(coupon.minimumOrder)}`);
                return false;
            }
            
            if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
                toast.error('Dieser Gutschein wurde bereits zu oft verwendet');
                return false;
            }
            
            // Coupon anwenden
            setDiscounts(prev => [...prev, {
                code: couponCode,
                type: coupon.type,
                value: coupon.value,
                appliesTo: coupon.appliesTo || []
            }]);
            
            toast.success(`Gutschein "${couponCode}" wurde angewendet`);
            return true;
            
        } catch (error) {
            logError('CartContext.applyCoupon', error);
            toast.error('Fehler beim Anwenden des Gutscheins');
            return false;
        }
    }, [tenant, subtotal]);
    
    /**
     * Entfernt einen angewendeten Coupon
     */
    const removeCoupon = useCallback((couponCode) => {
        setDiscounts(prev => prev.filter(d => d.code !== couponCode));
        toast.success('Gutschein entfernt');
    }, []);
    
    // ============================================================================
    // EFFECTS
    // ============================================================================
    
    // Lade Cart bei Mount oder Tenant-Wechsel
    useEffect(() => {
        loadCart();
    }, [loadCart]);
    
    // Lade Tenant-Settings
    useEffect(() => {
        if (!tenant?.id) return;
        
        // Liefergebühr und Mindestbestellwert
        setDeliveryFee(tenant.settings?.deliveryFee || 0);
        setMinimumOrder(tenant.settings?.minimumOrder || 0);
    }, [tenant]);
    
    // ============================================================================
    // CONTEXT VALUE
    // ============================================================================
    const value = {
        // State
        cartItems,
        loading,
        notes,
        selectedPaymentMethod,
        selectedDeliveryTime,
        discounts,
        
        // Calculations
        subtotal,
        totalDiscount,
        tax,
        deliveryFee,
        total,
        cartCount,
        minimumOrder,
        isMinimumOrderMet,
        
        // Actions
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        getItemQuantity,
        setNotes,
        setSelectedPaymentMethod,
        setSelectedDeliveryTime,
        applyCoupon,
        removeCoupon
    };
    
    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
};

// ============================================================================
// CUSTOM HOOK
// ============================================================================
export const useCart = () => {
    const context = useContext(CartContext);
    
    if (!context) {
        throw new Error('useCart must be used within CartProvider');
    }
    
    return context;
};

// ============================================================================
// EXPORT
// ============================================================================
export default CartContext;