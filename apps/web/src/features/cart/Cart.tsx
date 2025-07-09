/**
 * EATECH Shopping Cart Component
 * 
 * Warenkorb-Komponente mit allen Features:
 * - Produktverwaltung (Hinzufügen, Entfernen, Mengen ändern)
 * - Modifikatoren und spezielle Anweisungen
 * - Echtzeit-Preisberechnung inkl. MwSt
 * - Trinkgeld-Option
 * - Mehrsprachigkeit
 * - Checkout-Flow Integration
 * - Feature Flags Support
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBagIcon,
  TrashIcon,
  PlusIcon,
  MinusIcon,
  XMarkIcon,
  CreditCardIcon,
  ClockIcon,
  InformationCircleIcon,
  GiftIcon,
  ReceiptPercentIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

// Core imports
import { useCart } from '@eatech/core/hooks/useCart';
import { useTruck } from '@eatech/core/hooks/useTruck';
import { useFeatureFlag } from '@eatech/core/hooks/useFeatureFlag';
import { formatPrice, formatVAT } from '@eatech/core/utils/formatters';
import { calculateOrderTotals, calculatePlatformFee } from '@eatech/core/utils/calculations';
import { CartItem, OrderTotals } from '@eatech/types';

// UI imports
import {
  Card,
  Button,
  IconButton,
  Input,
  Alert,
  Badge,
  Drawer,
  Modal,
  Tooltip,
  RadioGroup
} from '@eatech/ui';

// Services
import { analyticsService } from '../../services/analytics.service';
import { orderService } from '../../services/order.service';

// Styles
import styles from './Cart.module.css';

interface CartProps {
  isOpen?: boolean;
  onClose?: () => void;
  embedded?: boolean;
}

export const Cart: React.FC<CartProps> = ({
  isOpen = false,
  onClose,
  embedded = false
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  
  // Feature Flags
  const { enabled: tipsEnabled } = useFeatureFlag('tip_feature');
  const { enabled: specialInstructionsEnabled } = useFeatureFlag('special_instructions');
  const { enabled: modifiersEnabled } = useFeatureFlag('product_modifiers');
  const { enabled: promotionsEnabled } = useFeatureFlag('promotions');
  const { enabled: nutritionEnabled } = useFeatureFlag('nutrition_info');
  const { enabled: schedulingEnabled } = useFeatureFlag('order_scheduling');
  
  // Cart state
  const {
    items,
    totalItems,
    subtotal,
    updateQuantity,
    removeItem,
    clearCart,
    addSpecialInstructions,
    isLoading
  } = useCart();
  
  // Local state
  const [selectedTip, setSelectedTip] = useState<number>(0);
  const [customTip, setCustomTip] = useState<string>('');
  const [isCustomTip, setIsCustomTip] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [orderType, setOrderType] = useState<'takeaway' | 'dine-in'>('takeaway');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  
  // Get truck info for VAT calculation
  const { truck } = useTruck();
  
  // Tip presets
  const tipPresets = [0, 5, 10, 15]; // Percentage
  
  // Calculate totals
  const totals = useMemo((): OrderTotals => {
    const vatRate = orderType === 'takeaway' ? 2.5 : 7.7; // Swiss VAT rates
    const tipAmount = isCustomTip 
      ? parseFloat(customTip || '0') * 100 // Convert to Rappen
      : Math.round(subtotal * selectedTip / 100);
    
    return calculateOrderTotals({
      subtotal,
      tipAmount,
      vatRate,
      platformFeePercentage: truck?.trial_ends_at && new Date(truck.trial_ends_at) > new Date() ? 0 : 3
    });
  }, [subtotal, selectedTip, customTip, isCustomTip, orderType, truck]);
  
  // Track cart updates
  useEffect(() => {
    if (items.length > 0) {
      analyticsService.trackEvent('cart_updated', {
        itemCount: totalItems,
        subtotal: subtotal,
        cartValue: totals.total
      });
    }
  }, [items, totalItems, subtotal, totals.total]);
  
  // Handle quantity change
  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      removeItem(itemId);
      analyticsService.trackEvent('cart_item_removed', { itemId });
    } else {
      updateQuantity(itemId, newQuantity);
    }
  };
  
  // Handle tip selection
  const handleTipSelect = (percentage: number) => {
    setSelectedTip(percentage);
    setIsCustomTip(false);
    setCustomTip('');
  };
  
  // Handle custom tip
  const handleCustomTip = (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setCustomTip(value);
      setIsCustomTip(true);
      setSelectedTip(0);
    }
  };
  
  // Handle checkout
  const handleCheckout = async () => {
    if (items.length === 0) return;
    
    // Track checkout start
    analyticsService.trackConversion('checkout_started', {
      itemCount: totalItems,
      cartValue: totals.total,
      tipAmount: totals.tipAmount,
      orderType
    });
    
    // Prepare order data
    const orderData = {
      items: items.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        modifiers: item.modifiers,
        specialInstructions: item.specialInstructions
      })),
      orderType,
      tipAmount: totals.tipAmount,
      scheduledFor: scheduledTime || undefined,
      totals
    };
    
    // Navigate to checkout with order data
    navigate('/checkout', { 
      state: { orderData } 
    });
    
    if (onClose) onClose();
  };
  
  // Handle clear cart
  const handleClearCart = () => {
    clearCart();
    setShowClearConfirm(false);
    analyticsService.trackEvent('cart_cleared');
  };
  
  // Empty cart message
  if (items.length === 0 && !isLoading) {
    return (
      <div className={embedded ? styles.emptyCartEmbedded : styles.emptyCart}>
        <ShoppingBagIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {t('cart.empty')}
        </h3>
        <p className="text-gray-500 mb-6">
          {t('cart.emptyMessage')}
        </p>
        <Button
          onClick={() => {
            if (onClose) onClose();
            navigate('/menu');
          }}
          startIcon={<PlusIcon className="w-5 h-5" />}
        >
          {t('cart.browseMenu')}
        </Button>
      </div>
    );
  }
  
  const cartContent = (
    <div className={styles.cartContent}>
      {/* Cart Items */}
      <div className={styles.itemsSection}>
        <div className={styles.sectionHeader}>
          <h3>{t('cart.yourOrder')}</h3>
          <Badge variant="primary">{totalItems} {t('cart.items')}</Badge>
        </div>
        
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={styles.cartItem}
            >
              <Card className={styles.itemCard}>
                <div className={styles.itemContent}>
                  {/* Product Info */}
                  <div className={styles.productInfo}>
                    <h4 className={styles.productName}>
                      {item.product.name[i18n.language] || item.product.name.de}
                    </h4>
                    
                    {/* Modifiers */}
                    {modifiersEnabled && item.modifiers.length > 0 && (
                      <p className={styles.modifiers}>
                        {item.modifiers.map(m => m.name).join(', ')}
                      </p>
                    )}
                    
                    {/* Special Instructions */}
                    {specialInstructionsEnabled && item.specialInstructions && (
                      <p className={styles.specialInstructions}>
                        <InformationCircleIcon className="w-4 h-4 inline mr-1" />
                        {item.specialInstructions}
                      </p>
                    )}
                    
                    {/* Nutrition Info */}
                    {nutritionEnabled && item.product.nutritionalInfo && (
                      <p className={styles.nutritionSummary}>
                        {item.product.nutritionalInfo.calories} kcal
                      </p>
                    )}
                  </div>
                  
                  {/* Quantity Controls */}
                  <div className={styles.quantityControls}>
                    <IconButton
                      size="sm"
                      variant="ghost"
                      onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      <MinusIcon className="w-4 h-4" />
                    </IconButton>
                    
                    <span className={styles.quantity}>{item.quantity}</span>
                    
                    <IconButton
                      size="sm"
                      variant="ghost"
                      onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      disabled={item.quantity >= 99}
                    >
                      <PlusIcon className="w-4 h-4" />
                    </IconButton>
                  </div>
                  
                  {/* Price */}
                  <div className={styles.itemPrice}>
                    <p className={styles.price}>
                      {formatPrice(item.product.price * item.quantity)}
                    </p>
                    {item.quantity > 1 && (
                      <p className={styles.unitPrice}>
                        {formatPrice(item.product.price)} {t('cart.each')}
                      </p>
                    )}
                  </div>
                  
                  {/* Remove Button */}
                  <IconButton
                    size="sm"
                    variant="ghost"
                    onClick={() => removeItem(item.id)}
                    className={styles.removeButton}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </IconButton>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {/* Order Type Selection */}
      <div className={styles.orderTypeSection}>
        <h4>{t('cart.orderType')}</h4>
        <RadioGroup
          value={orderType}
          onChange={setOrderType}
          options={[
            { 
              value: 'takeaway', 
              label: t('cart.takeaway'),
              description: `${t('cart.vat')} 2.5%`
            },
            { 
              value: 'dine-in', 
              label: t('cart.dineIn'),
              description: `${t('cart.vat')} 7.7%`
            }
          ]}
        />
      </div>
      
      {/* Scheduled Order */}
      {schedulingEnabled && (
        <div className={styles.schedulingSection}>
          <h4>{t('cart.scheduleOrder')}</h4>
          <Input
            type="datetime-local"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            placeholder={t('cart.selectTime')}
            icon={<ClockIcon className="w-5 h-5" />}
          />
        </div>
      )}
      
      {/* Tip Section */}
      {tipsEnabled && (
        <div className={styles.tipSection}>
          <h4>{t('cart.addTip')}</h4>
          <div className={styles.tipOptions}>
            {tipPresets.map(percentage => (
              <Button
                key={percentage}
                variant={selectedTip === percentage && !isCustomTip ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleTipSelect(percentage)}
              >
                {percentage === 0 ? t('cart.noTip') : `${percentage}%`}
              </Button>
            ))}
            <Button
              variant={isCustomTip ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setIsCustomTip(true)}
            >
              {t('cart.customTip')}
            </Button>
          </div>
          
          {isCustomTip && (
            <Input
              type="number"
              value={customTip}
              onChange={(e) => handleCustomTip(e.target.value)}
              placeholder={t('cart.enterAmount')}
              min="0"
              step="0.50"
              icon={<span>CHF</span>}
            />
          )}
          
          {totals.tipAmount > 0 && (
            <Alert variant="info" size="sm" className="mt-2">
              <GiftIcon className="w-4 h-4" />
              <span>
                {t('cart.tipInfo', { 
                  amount: formatPrice(totals.tipAmount),
                  percentage: '97%'
                })}
              </span>
            </Alert>
          )}
        </div>
      )}
      
      {/* Promotions */}
      {promotionsEnabled && truck?.activePromotions && (
        <div className={styles.promotionsSection}>
          <Alert variant="success">
            <ReceiptPercentIcon className="w-5 h-5" />
            <span>{truck.activePromotions[0].description}</span>
          </Alert>
        </div>
      )}
      
      {/* Order Summary */}
      <div className={styles.orderSummary}>
        <h4>{t('cart.orderSummary')}</h4>
        
        <div className={styles.summaryLine}>
          <span>{t('cart.subtotal')}</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        
        {totals.tipAmount > 0 && (
          <div className={styles.summaryLine}>
            <span>{t('cart.tip')}</span>
            <span>{formatPrice(totals.tipAmount)}</span>
          </div>
        )}
        
        <div className={styles.summaryLine}>
          <span>
            {t('cart.vat')} ({totals.vatRate}%)
            <Tooltip content={t('cart.vatInfo')}>
              <InformationCircleIcon className="w-4 h-4 inline ml-1" />
            </Tooltip>
          </span>
          <span>{formatPrice(totals.vatAmount)}</span>
        </div>
        
        {truck?.trial_ends_at && new Date(truck.trial_ends_at) > new Date() && (
          <div className={styles.summaryLine}>
            <span className="text-green-600">
              {t('cart.trialPeriod')}
              <CheckCircleIcon className="w-4 h-4 inline ml-1" />
            </span>
            <span className="text-green-600">-{formatPrice(0)}</span>
          </div>
        )}
        
        <div className={styles.totalLine}>
          <span>{t('cart.total')}</span>
          <span className={styles.totalAmount}>
            {formatPrice(totals.total)}
          </span>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className={styles.actions}>
        <Button
          variant="ghost"
          onClick={() => setShowClearConfirm(true)}
          fullWidth
        >
          {t('cart.clearCart')}
        </Button>
        
        <Button
          variant="primary"
          onClick={handleCheckout}
          disabled={items.length === 0}
          fullWidth
          size="lg"
          startIcon={<CreditCardIcon className="w-5 h-5" />}
        >
          {t('cart.proceedToCheckout')}
        </Button>
      </div>
      
      {/* Clear Cart Confirmation */}
      <Modal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title={t('cart.clearCartConfirm')}
      >
        <p className="text-gray-600 mb-6">
          {t('cart.clearCartMessage')}
        </p>
        <div className="flex gap-4">
          <Button
            variant="secondary"
            onClick={() => setShowClearConfirm(false)}
            fullWidth
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={handleClearCart}
            fullWidth
          >
            {t('cart.clearCart')}
          </Button>
        </div>
      </Modal>
    </div>
  );
  
  // Render as drawer or embedded
  if (embedded) {
    return <div className={styles.embeddedCart}>{cartContent}</div>;
  }
  
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose || (() => {})}
      title={t('cart.title')}
      size="md"
    >
      {cartContent}
    </Drawer>
  );
};

// Export
export default Cart;