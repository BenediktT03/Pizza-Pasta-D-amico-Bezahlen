/**
 * EATECH - Promotion Service
 * Version: 1.0.0
 * Description: Service für Promotion Engine mit Rabatten, Aktionen und Kampagnen
 * Features: Discount Calculation, Validation, Usage Tracking, Segmentation
 * 
 * Kapitel: Phase 4 - Advanced Features - Promotion Engine
 */

import { 
  getDatabase, 
  ref, 
  push, 
  set, 
  get, 
  update,
  remove,
  onValue, 
  off,
  query,
  orderByChild,
  equalTo,
  startAt,
  endAt,
  serverTimestamp
} from 'firebase/database';
import { v4 as uuidv4 } from 'uuid';
import { format, isWithinInterval, addDays, startOfDay, endOfDay } from 'date-fns';

// ============================================================================
// CONSTANTS
// ============================================================================
const PROMOTION_TYPES = {
  PERCENTAGE: 'percentage',
  FIXED_AMOUNT: 'fixed_amount',
  BUY_X_GET_Y: 'buy_x_get_y',
  HAPPY_HOUR: 'happy_hour',
  COMBO_DEAL: 'combo_deal',
  FREE_DELIVERY: 'free_delivery'
};

const PROMOTION_STATUSES = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  ACTIVE: 'active',
  PAUSED: 'paused',
  EXPIRED: 'expired'
};

const CUSTOMER_SEGMENTS = {
  ALL: 'all',
  NEW: 'new',
  RETURNING: 'returning',
  VIP: 'vip',
  INACTIVE: 'inactive'
};

const USAGE_LIMITS = {
  UNLIMITED: 'unlimited',
  ONCE_PER_CUSTOMER: 'once_per_customer',
  LIMITED_TOTAL: 'limited_total',
  LIMITED_PER_CUSTOMER: 'limited_per_customer'
};

// ============================================================================
// PROMOTION SERVICE CLASS
// ============================================================================
export class PromotionService {
  constructor(firebaseApp) {
    this.db = getDatabase(firebaseApp);
    this.currentTenantId = null;
    this.listeners = new Map();
    this.promotionCache = new Map();
  }
  
  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================
  setTenant(tenantId) {
    this.currentTenantId = tenantId;
  }
  
  validateTenant() {
    if (!this.currentTenantId) {
      throw new Error('Tenant ID not set');
    }
  }
  
  // ==========================================================================
  // PROMOTION MANAGEMENT
  // ==========================================================================
  async createPromotion(promotionData) {
    this.validateTenant();
    
    const promotionId = uuidv4();
    const newPromotion = {
      id: promotionId,
      tenantId: this.currentTenantId,
      ...promotionData,
      status: promotionData.status || PROMOTION_STATUSES.DRAFT,
      redemptions: 0,
      views: 0,
      totalSavings: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Generate unique code if not provided
    if (!newPromotion.code && newPromotion.requiresCode) {
      newPromotion.code = await this.generateUniqueCode();
    }
    
    // Validate promotion data
    this.validatePromotion(newPromotion);
    
    const promotionRef = ref(this.db, `tenants/${this.currentTenantId}/promotions/${promotionId}`);
    await set(promotionRef, newPromotion);
    
    // Update cache
    this.promotionCache.set(promotionId, newPromotion);
    
    // Track event
    this.trackPromotionEvent('promotion_created', { promotionId, type: newPromotion.type });
    
    return { ...newPromotion, id: promotionId };
  }
  
  async updatePromotion(promotionId, updates) {
    this.validateTenant();
    
    const promotionRef = ref(this.db, `tenants/${this.currentTenantId}/promotions/${promotionId}`);
    
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    // Validate if updating critical fields
    if (updates.type || updates.value || updates.conditions) {
      const current = await this.getPromotion(promotionId);
      this.validatePromotion({ ...current, ...updates });
    }
    
    await update(promotionRef, updateData);
    
    // Update cache
    const cachedPromotion = this.promotionCache.get(promotionId);
    if (cachedPromotion) {
      this.promotionCache.set(promotionId, { ...cachedPromotion, ...updateData });
    }
    
    // Track event
    this.trackPromotionEvent('promotion_updated', { promotionId, updates: Object.keys(updates) });
    
    return updateData;
  }
  
  async deletePromotion(promotionId) {
    this.validateTenant();
    
    // Check if promotion has been used
    const promotion = await this.getPromotion(promotionId);
    if (promotion.redemptions > 0) {
      throw new Error('Cannot delete promotion that has been used');
    }
    
    const promotionRef = ref(this.db, `tenants/${this.currentTenantId}/promotions/${promotionId}`);
    await remove(promotionRef);
    
    // Remove from cache
    this.promotionCache.delete(promotionId);
    
    // Track event
    this.trackPromotionEvent('promotion_deleted', { promotionId });
  }
  
  async getPromotions(filters = {}) {
    this.validateTenant();
    
    const promotionsRef = ref(this.db, `tenants/${this.currentTenantId}/promotions`);
    const snapshot = await get(promotionsRef);
    
    const promotions = [];
    
    if (snapshot.exists()) {
      const now = new Date();
      
      snapshot.forEach(child => {
        const promotion = {
          id: child.key,
          ...child.val()
        };
        
        // Update status based on dates
        if (promotion.status === PROMOTION_STATUSES.SCHEDULED && new Date(promotion.startDate) <= now) {
          promotion.status = PROMOTION_STATUSES.ACTIVE;
        } else if (promotion.status === PROMOTION_STATUSES.ACTIVE && new Date(promotion.endDate) < now) {
          promotion.status = PROMOTION_STATUSES.EXPIRED;
        }
        
        // Apply filters
        let include = true;
        
        if (filters.status && promotion.status !== filters.status) {
          include = false;
        }
        
        if (filters.type && promotion.type !== filters.type) {
          include = false;
        }
        
        if (filters.active) {
          include = promotion.status === PROMOTION_STATUSES.ACTIVE;
        }
        
        if (include) {
          promotions.push(promotion);
          
          // Update cache
          this.promotionCache.set(promotion.id, promotion);
        }
      });
    }
    
    return promotions;
  }
  
  async getPromotion(promotionId) {
    this.validateTenant();
    
    // Check cache first
    if (this.promotionCache.has(promotionId)) {
      return this.promotionCache.get(promotionId);
    }
    
    const promotionRef = ref(this.db, `tenants/${this.currentTenantId}/promotions/${promotionId}`);
    const snapshot = await get(promotionRef);
    
    if (!snapshot.exists()) {
      throw new Error('Promotion not found');
    }
    
    const promotion = {
      id: promotionId,
      ...snapshot.val()
    };
    
    // Update cache
    this.promotionCache.set(promotionId, promotion);
    
    return promotion;
  }
  
  async getPromotionByCode(code) {
    this.validateTenant();
    
    const promotionsRef = ref(this.db, `tenants/${this.currentTenantId}/promotions`);
    const codeQuery = query(promotionsRef, orderByChild('code'), equalTo(code.toUpperCase()));
    const snapshot = await get(codeQuery);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    let promotion = null;
    snapshot.forEach(child => {
      promotion = {
        id: child.key,
        ...child.val()
      };
    });
    
    return promotion;
  }
  
  // ==========================================================================
  // VALIDATION & APPLICATION
  // ==========================================================================
  validatePromotion(promotion) {
    // Basic validation
    if (!promotion.name || !promotion.type || !promotion.value) {
      throw new Error('Missing required promotion fields');
    }
    
    // Type-specific validation
    switch (promotion.type) {
      case PROMOTION_TYPES.PERCENTAGE:
        if (promotion.value <= 0 || promotion.value > 100) {
          throw new Error('Percentage must be between 1 and 100');
        }
        break;
        
      case PROMOTION_TYPES.FIXED_AMOUNT:
        if (promotion.value <= 0) {
          throw new Error('Fixed amount must be greater than 0');
        }
        break;
        
      case PROMOTION_TYPES.BUY_X_GET_Y:
        if (!promotion.buyQuantity || !promotion.getQuantity) {
          throw new Error('Buy X Get Y requires quantities');
        }
        break;
        
      case PROMOTION_TYPES.HAPPY_HOUR:
        if (!promotion.timeStart || !promotion.timeEnd) {
          throw new Error('Happy Hour requires time range');
        }
        break;
    }
    
    // Date validation
    if (new Date(promotion.startDate) >= new Date(promotion.endDate)) {
      throw new Error('End date must be after start date');
    }
  }
  
  async validatePromotionUsage(promotionId, customerId, order) {
    const promotion = await this.getPromotion(promotionId);
    const now = new Date();
    
    // Check if promotion is active
    if (promotion.status !== PROMOTION_STATUSES.ACTIVE) {
      throw new Error('Promotion is not active');
    }
    
    // Check date range
    if (!isWithinInterval(now, {
      start: new Date(promotion.startDate),
      end: new Date(promotion.endDate)
    })) {
      throw new Error('Promotion is not valid at this time');
    }
    
    // Check usage limits
    if (promotion.usageLimit !== USAGE_LIMITS.UNLIMITED) {
      const usage = await this.getPromotionUsage(promotionId, customerId);
      
      switch (promotion.usageLimit) {
        case USAGE_LIMITS.ONCE_PER_CUSTOMER:
          if (usage.customerRedemptions > 0) {
            throw new Error('Promotion already used by customer');
          }
          break;
          
        case USAGE_LIMITS.LIMITED_TOTAL:
          if (usage.totalRedemptions >= promotion.maxRedemptions) {
            throw new Error('Promotion usage limit reached');
          }
          break;
          
        case USAGE_LIMITS.LIMITED_PER_CUSTOMER:
          if (usage.customerRedemptions >= promotion.maxRedemptionsPerCustomer) {
            throw new Error('Customer usage limit reached');
          }
          break;
      }
    }
    
    // Check minimum order amount
    if (promotion.minimumOrderAmount && order.subtotal < promotion.minimumOrderAmount) {
      throw new Error(`Minimum order amount of CHF ${promotion.minimumOrderAmount} required`);
    }
    
    // Check customer segment
    if (promotion.customerSegment !== CUSTOMER_SEGMENTS.ALL) {
      const isEligible = await this.checkCustomerSegment(customerId, promotion.customerSegment);
      if (!isEligible) {
        throw new Error('Customer not eligible for this promotion');
      }
    }
    
    // Check product restrictions
    if (promotion.productRestrictions) {
      const eligible = this.checkProductRestrictions(order.items, promotion.productRestrictions);
      if (!eligible) {
        throw new Error('Promotion not valid for these products');
      }
    }
    
    return true;
  }
  
  async applyPromotion(promotionId, order, customerId) {
    await this.validatePromotionUsage(promotionId, customerId, order);
    
    const promotion = await this.getPromotion(promotionId);
    let discount = 0;
    let appliedItems = [];
    
    switch (promotion.type) {
      case PROMOTION_TYPES.PERCENTAGE:
        discount = (order.subtotal * promotion.value) / 100;
        if (promotion.maxDiscount) {
          discount = Math.min(discount, promotion.maxDiscount);
        }
        break;
        
      case PROMOTION_TYPES.FIXED_AMOUNT:
        discount = Math.min(promotion.value, order.subtotal);
        break;
        
      case PROMOTION_TYPES.BUY_X_GET_Y:
        const result = this.calculateBuyXGetY(order.items, promotion);
        discount = result.discount;
        appliedItems = result.appliedItems;
        break;
        
      case PROMOTION_TYPES.FREE_DELIVERY:
        discount = order.deliveryFee || 0;
        break;
        
      case PROMOTION_TYPES.COMBO_DEAL:
        const comboResult = this.calculateComboDeal(order.items, promotion);
        discount = comboResult.discount;
        appliedItems = comboResult.appliedItems;
        break;
    }
    
    // Track view
    await this.trackPromotionView(promotionId);
    
    return {
      promotionId,
      promotionName: promotion.name,
      type: promotion.type,
      discount: Math.round(discount * 100) / 100,
      appliedItems
    };
  }
  
  calculateBuyXGetY(items, promotion) {
    // Implementation for Buy X Get Y calculation
    let discount = 0;
    const appliedItems = [];
    
    // Group eligible items
    const eligibleItems = items.filter(item => 
      !promotion.productRestrictions || 
      promotion.productRestrictions.includes(item.productId)
    );
    
    // Sort by price (descending) to give away cheapest items
    eligibleItems.sort((a, b) => b.price - a.price);
    
    // Calculate how many free items
    const totalQuantity = eligibleItems.reduce((sum, item) => sum + item.quantity, 0);
    const freeQuantity = Math.floor(totalQuantity / promotion.buyQuantity) * promotion.getQuantity;
    
    // Apply discount to cheapest items
    let remainingFree = freeQuantity;
    for (let i = eligibleItems.length - 1; i >= 0 && remainingFree > 0; i--) {
      const item = eligibleItems[i];
      const freeFromThisItem = Math.min(item.quantity, remainingFree);
      
      discount += item.price * freeFromThisItem;
      appliedItems.push({
        productId: item.productId,
        quantity: freeFromThisItem
      });
      
      remainingFree -= freeFromThisItem;
    }
    
    return { discount, appliedItems };
  }
  
  calculateComboDeal(items, promotion) {
    // Implementation for combo deal calculation
    const { comboProducts, comboPrice } = promotion;
    let discount = 0;
    const appliedItems = [];
    
    // Check if all combo products are in the order
    const hasAllProducts = comboProducts.every(productId =>
      items.some(item => item.productId === productId)
    );
    
    if (hasAllProducts) {
      // Calculate original price
      const originalPrice = comboProducts.reduce((sum, productId) => {
        const item = items.find(i => i.productId === productId);
        return sum + (item ? item.price : 0);
      }, 0);
      
      discount = originalPrice - comboPrice;
      appliedItems.push(...comboProducts.map(productId => ({ productId, quantity: 1 })));
    }
    
    return { discount, appliedItems };
  }
  
  checkProductRestrictions(items, restrictions) {
    const { includeProducts, excludeProducts, includeCategories, excludeCategories } = restrictions;
    
    return items.some(item => {
      // Check product inclusion
      if (includeProducts && !includeProducts.includes(item.productId)) {
        return false;
      }
      
      // Check product exclusion
      if (excludeProducts && excludeProducts.includes(item.productId)) {
        return false;
      }
      
      // Check category inclusion
      if (includeCategories && !includeCategories.includes(item.categoryId)) {
        return false;
      }
      
      // Check category exclusion
      if (excludeCategories && excludeCategories.includes(item.categoryId)) {
        return false;
      }
      
      return true;
    });
  }
  
  // ==========================================================================
  // USAGE TRACKING
  // ==========================================================================
  async redeemPromotion(promotionId, orderId, customerId, discount) {
    this.validateTenant();
    
    const redemptionId = uuidv4();
    const redemption = {
      id: redemptionId,
      promotionId,
      orderId,
      customerId,
      discount,
      redeemedAt: serverTimestamp()
    };
    
    // Save redemption
    const redemptionRef = ref(this.db, `tenants/${this.currentTenantId}/promotionRedemptions/${redemptionId}`);
    await set(redemptionRef, redemption);
    
    // Update promotion stats
    const promotion = await this.getPromotion(promotionId);
    await this.updatePromotion(promotionId, {
      redemptions: (promotion.redemptions || 0) + 1,
      totalSavings: (promotion.totalSavings || 0) + discount
    });
    
    // Track event
    this.trackPromotionEvent('promotion_redeemed', {
      promotionId,
      orderId,
      discount
    });
  }
  
  async trackPromotionView(promotionId) {
    const promotion = await this.getPromotion(promotionId);
    await this.updatePromotion(promotionId, {
      views: (promotion.views || 0) + 1
    });
  }
  
  async getPromotionUsage(promotionId, customerId = null) {
    this.validateTenant();
    
    const redemptionsRef = ref(this.db, `tenants/${this.currentTenantId}/promotionRedemptions`);
    const promotionQuery = query(redemptionsRef, orderByChild('promotionId'), equalTo(promotionId));
    const snapshot = await get(promotionQuery);
    
    let totalRedemptions = 0;
    let customerRedemptions = 0;
    
    if (snapshot.exists()) {
      snapshot.forEach(child => {
        totalRedemptions++;
        
        const redemption = child.val();
        if (customerId && redemption.customerId === customerId) {
          customerRedemptions++;
        }
      });
    }
    
    return { totalRedemptions, customerRedemptions };
  }
  
  // ==========================================================================
  // CUSTOMER SEGMENTATION
  // ==========================================================================
  async checkCustomerSegment(customerId, segment) {
    // This would check customer data to determine segment eligibility
    // For now, return true for all customers
    return true;
  }
  
  // ==========================================================================
  // STATISTICS
  // ==========================================================================
  async getPromotionStats(timeRange = 'all') {
    this.validateTenant();
    
    const promotions = await this.getPromotions();
    
    const stats = {
      totalPromotions: promotions.length,
      activePromotions: 0,
      totalRedemptions: 0,
      totalSavings: 0,
      averageDiscount: 0,
      conversionRate: 0,
      topPromotions: []
    };
    
    promotions.forEach(promotion => {
      if (promotion.status === PROMOTION_STATUSES.ACTIVE) {
        stats.activePromotions++;
      }
      
      stats.totalRedemptions += promotion.redemptions || 0;
      stats.totalSavings += promotion.totalSavings || 0;
    });
    
    // Calculate average discount
    if (stats.totalRedemptions > 0) {
      stats.averageDiscount = stats.totalSavings / stats.totalRedemptions;
    }
    
    // Calculate conversion rate
    const totalViews = promotions.reduce((sum, p) => sum + (p.views || 0), 0);
    if (totalViews > 0) {
      stats.conversionRate = (stats.totalRedemptions / totalViews) * 100;
    }
    
    // Top promotions by redemptions
    stats.topPromotions = promotions
      .filter(p => p.redemptions > 0)
      .sort((a, b) => b.redemptions - a.redemptions)
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        name: p.name,
        redemptions: p.redemptions,
        savings: p.totalSavings
      }));
    
    return stats;
  }
  
  // ==========================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ==========================================================================
  subscribeToPromotions(tenantId, callback) {
    const promotionsRef = ref(this.db, `tenants/${tenantId}/promotions`);
    
    const listener = onValue(promotionsRef, (snapshot) => {
      const promotions = [];
      const now = new Date();
      
      if (snapshot.exists()) {
        snapshot.forEach(child => {
          const promotion = {
            id: child.key,
            ...child.val()
          };
          
          // Update status based on dates
          if (promotion.status === PROMOTION_STATUSES.SCHEDULED && new Date(promotion.startDate) <= now) {
            promotion.status = PROMOTION_STATUSES.ACTIVE;
          } else if (promotion.status === PROMOTION_STATUSES.ACTIVE && new Date(promotion.endDate) < now) {
            promotion.status = PROMOTION_STATUSES.EXPIRED;
          }
          
          promotions.push(promotion);
          
          // Update cache
          this.promotionCache.set(promotion.id, promotion);
        });
      }
      
      callback(promotions);
    });
    
    this.listeners.set(`promotions_${tenantId}`, { ref: promotionsRef, listener });
    
    return () => this.unsubscribeFromPromotions(tenantId);
  }
  
  unsubscribeFromPromotions(tenantId) {
    const key = `promotions_${tenantId}`;
    const subscription = this.listeners.get(key);
    
    if (subscription) {
      off(subscription.ref, 'value', subscription.listener);
      this.listeners.delete(key);
    }
  }
  
  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================
  async generateUniqueCode(length = 8) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    let isUnique = false;
    
    while (!isUnique) {
      code = '';
      for (let i = 0; i < length; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      // Check if code already exists
      const existing = await this.getPromotionByCode(code);
      if (!existing) {
        isUnique = true;
      }
    }
    
    return code;
  }
  
  trackPromotionEvent(event, data) {
    // This would integrate with analytics service
    console.log('Promotion event:', event, data);
  }
  
  // ==========================================================================
  // CLEANUP
  // ==========================================================================
  clearCache() {
    this.promotionCache.clear();
  }
  
  destroy() {
    // Unsubscribe from all listeners
    this.listeners.forEach((subscription) => {
      off(subscription.ref, 'value', subscription.listener);
    });
    this.listeners.clear();
    this.clearCache();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================
let promotionServiceInstance = null;

export function initializePromotionService(firebaseApp) {
  if (!promotionServiceInstance) {
    promotionServiceInstance = new PromotionService(firebaseApp);
  }
  return promotionServiceInstance;
}

export function getPromotionService() {
  if (!promotionServiceInstance) {
    throw new Error('PromotionService not initialized. Call initializePromotionService first.');
  }
  return promotionServiceInstance;
}