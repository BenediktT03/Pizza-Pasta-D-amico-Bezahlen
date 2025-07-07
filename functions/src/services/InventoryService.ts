/**
 * EATECH - Inventory Service
 * Version: 1.0.0
 * Description: Intelligentes Bestandsmanagement mit Echtzeit-Tracking
 * Author: EATECH Development Team
 * Created: 2025-01-09
 * File Path: /functions/src/services/InventoryService.ts
 * 
 * Features:
 * - Real-time inventory tracking
 * - Low stock alerts
 * - Automatic reordering
 * - Expiry date management
 * - Waste tracking
 * - Multi-location support
 * - Inventory forecasting
 * - Recipe-based deduction
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { 
  InventoryItem, 
  InventoryTransaction, 
  StockLevel,
  InventoryAlert,
  RecipeIngredient,
  InventoryReport
} from '../types/inventory.types';
import { OrderItem } from '../types/order.types';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { addDays, isAfter, isBefore, differenceInDays } from 'date-fns';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface InventoryCheckResult {
  available: boolean;
  unavailableItems: string[];
  warnings: string[];
  suggestions: string[];
}

interface ReservationResult {
  reservationId: string;
  items: Array<{
    itemId: string;
    quantity: number;
    unit: string;
  }>;
  expiresAt: string;
}

interface RestockRecommendation {
  itemId: string;
  itemName: string;
  currentStock: number;
  recommendedQuantity: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  estimatedCost: number;
}

interface WasteReport {
  itemId: string;
  itemName: string;
  quantity: number;
  value: number;
  reason: string;
  recordedBy: string;
  timestamp: string;
}

interface InventoryForecast {
  itemId: string;
  currentStock: number;
  projectedUsage: number;
  daysUntilStockout: number;
  recommendedOrderDate: string;
  recommendedOrderQuantity: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const INVENTORY_COLLECTION = 'inventory';
const TRANSACTIONS_COLLECTION = 'inventory_transactions';
const ALERTS_COLLECTION = 'inventory_alerts';
const RESERVATIONS_COLLECTION = 'inventory_reservations';
const WASTE_COLLECTION = 'inventory_waste';
const RECIPES_COLLECTION = 'recipes';

const RESERVATION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const STOCK_LEVELS = {
  CRITICAL: 10,
  LOW: 25,
  MEDIUM: 50,
  HIGH: 75
};

const EXPIRY_WARNING_DAYS = 3;
const FORECAST_DAYS = 14;

const TRANSACTION_TYPES = {
  PURCHASE: 'purchase',
  SALE: 'sale',
  ADJUSTMENT: 'adjustment',
  WASTE: 'waste',
  TRANSFER: 'transfer',
  PRODUCTION: 'production',
  RETURN: 'return'
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

export default class InventoryService {
  private db: admin.database.Database;
  private firestore: admin.firestore.Firestore;

  constructor() {
    this.db = admin.database();
    this.firestore = admin.firestore();
  }

  /**
   * Check inventory availability for order items
   */
  async checkAvailability(
    tenantId: string,
    orderItems: OrderItem[]
  ): Promise<InventoryCheckResult> {
    try {
      const unavailableItems: string[] = [];
      const warnings: string[] = [];
      const suggestions: string[] = [];

      // Get all required ingredients
      const requiredIngredients = await this.getRequiredIngredients(tenantId, orderItems);

      // Check each ingredient
      for (const ingredient of requiredIngredients) {
        const inventory = await this.getInventoryItem(tenantId, ingredient.itemId);
        
        if (!inventory) {
          unavailableItems.push(`${ingredient.name} - Nicht im Bestand`);
          continue;
        }

        // Check quantity
        if (inventory.quantity < ingredient.requiredQuantity) {
          unavailableItems.push(
            `${ingredient.name} - Benötigt: ${ingredient.requiredQuantity} ${ingredient.unit}, ` +
            `Verfügbar: ${inventory.quantity} ${inventory.unit}`
          );
          
          // Add suggestion for alternative
          if (inventory.alternatives && inventory.alternatives.length > 0) {
            suggestions.push(
              `Alternative für ${ingredient.name}: ${inventory.alternatives.join(', ')}`
            );
          }
        }

        // Check expiry date
        if (inventory.expiryDate) {
          const daysUntilExpiry = differenceInDays(new Date(inventory.expiryDate), new Date());
          if (daysUntilExpiry <= 0) {
            unavailableItems.push(`${ingredient.name} - Abgelaufen`);
          } else if (daysUntilExpiry <= EXPIRY_WARNING_DAYS) {
            warnings.push(`${ingredient.name} läuft in ${daysUntilExpiry} Tagen ab`);
          }
        }

        // Check stock level
        const stockPercentage = (inventory.quantity / inventory.reorderPoint) * 100;
        if (stockPercentage <= STOCK_LEVELS.CRITICAL) {
          warnings.push(`${ingredient.name} - Kritisch niedriger Bestand`);
        } else if (stockPercentage <= STOCK_LEVELS.LOW) {
          warnings.push(`${ingredient.name} - Niedriger Bestand`);
        }
      }

      return {
        available: unavailableItems.length === 0,
        unavailableItems,
        warnings,
        suggestions
      };
    } catch (error) {
      logger.error('Error checking inventory availability:', error);
      throw error;
    }
  }

  /**
   * Reserve inventory for an order
   */
  async reserveItems(
    tenantId: string,
    orderId: string,
    orderItems: OrderItem[]
  ): Promise<ReservationResult> {
    const reservationId = uuidv4();
    const reservationItems: ReservationResult['items'] = [];

    try {
      // Start transaction
      const batch = this.firestore.batch();
      
      // Get required ingredients
      const requiredIngredients = await this.getRequiredIngredients(tenantId, orderItems);

      // Reserve each ingredient
      for (const ingredient of requiredIngredients) {
        const inventoryRef = this.firestore
          .collection(INVENTORY_COLLECTION)
          .doc(`${tenantId}_${ingredient.itemId}`);

        // Update available quantity
        batch.update(inventoryRef, {
          availableQuantity: admin.firestore.FieldValue.increment(-ingredient.requiredQuantity),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });

        reservationItems.push({
          itemId: ingredient.itemId,
          quantity: ingredient.requiredQuantity,
          unit: ingredient.unit
        });
      }

      // Create reservation record
      const reservationRef = this.firestore
        .collection(RESERVATIONS_COLLECTION)
        .doc(reservationId);

      batch.set(reservationRef, {
        id: reservationId,
        tenantId,
        orderId,
        items: reservationItems,
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + RESERVATION_TIMEOUT).toISOString()
      });

      // Commit transaction
      await batch.commit();

      // Set timeout to release reservation
      this.scheduleReservationRelease(reservationId, RESERVATION_TIMEOUT);

      return {
        reservationId,
        items: reservationItems,
        expiresAt: new Date(Date.now() + RESERVATION_TIMEOUT).toISOString()
      };
    } catch (error) {
      logger.error('Error reserving inventory items:', error);
      throw error;
    }
  }

  /**
   * Consume reserved inventory items
   */
  async consumeReservedItems(tenantId: string, orderId: string): Promise<void> {
    try {
      // Find reservation
      const reservationSnapshot = await this.firestore
        .collection(RESERVATIONS_COLLECTION)
        .where('orderId', '==', orderId)
        .where('status', '==', 'active')
        .limit(1)
        .get();

      if (reservationSnapshot.empty) {
        throw new Error('No active reservation found for order');
      }

      const reservation = reservationSnapshot.docs[0].data();
      const batch = this.firestore.batch();

      // Consume each item
      for (const item of reservation.items) {
        const inventoryRef = this.firestore
          .collection(INVENTORY_COLLECTION)
          .doc(`${tenantId}_${item.itemId}`);

        // Update quantity
        batch.update(inventoryRef, {
          quantity: admin.firestore.FieldValue.increment(-item.quantity),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });

        // Record transaction
        const transactionRef = this.firestore
          .collection(TRANSACTIONS_COLLECTION)
          .doc();

        batch.set(transactionRef, {
          id: transactionRef.id,
          tenantId,
          itemId: item.itemId,
          type: TRANSACTION_TYPES.SALE,
          quantity: -item.quantity,
          unit: item.unit,
          orderId,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      // Update reservation status
      batch.update(reservationSnapshot.docs[0].ref, {
        status: 'consumed',
        consumedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      await batch.commit();

      // Check for low stock alerts
      await this.checkLowStockAlerts(tenantId, reservation.items);

    } catch (error) {
      logger.error('Error consuming reserved items:', error);
      throw error;
    }
  }

  /**
   * Release reserved inventory items
   */
  async releaseReservedItems(tenantId: string, orderId: string): Promise<void> {
    try {
      // Find reservation
      const reservationSnapshot = await this.firestore
        .collection(RESERVATIONS_COLLECTION)
        .where('orderId', '==', orderId)
        .where('status', '==', 'active')
        .limit(1)
        .get();

      if (reservationSnapshot.empty) {
        return; // No active reservation to release
      }

      const reservation = reservationSnapshot.docs[0].data();
      const batch = this.firestore.batch();

      // Release each item
      for (const item of reservation.items) {
        const inventoryRef = this.firestore
          .collection(INVENTORY_COLLECTION)
          .doc(`${tenantId}_${item.itemId}`);

        // Restore available quantity
        batch.update(inventoryRef, {
          availableQuantity: admin.firestore.FieldValue.increment(item.quantity),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      // Update reservation status
      batch.update(reservationSnapshot.docs[0].ref, {
        status: 'released',
        releasedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      await batch.commit();

    } catch (error) {
      logger.error('Error releasing reserved items:', error);
      throw error;
    }
  }

  /**
   * Update inventory quantity
   */
  async updateQuantity(
    tenantId: string,
    itemId: string,
    quantity: number,
    type: string,
    reference?: string
  ): Promise<void> {
    try {
      const batch = this.firestore.batch();
      
      // Update inventory
      const inventoryRef = this.firestore
        .collection(INVENTORY_COLLECTION)
        .doc(`${tenantId}_${itemId}`);

      const inventoryDoc = await inventoryRef.get();
      const currentData = inventoryDoc.data() as InventoryItem;

      const newQuantity = currentData.quantity + quantity;
      const newAvailableQuantity = currentData.availableQuantity + quantity;

      batch.update(inventoryRef, {
        quantity: newQuantity,
        availableQuantity: newAvailableQuantity,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });

      // Record transaction
      const transactionRef = this.firestore
        .collection(TRANSACTIONS_COLLECTION)
        .doc();

      batch.set(transactionRef, {
        id: transactionRef.id,
        tenantId,
        itemId,
        type,
        quantity,
        unit: currentData.unit,
        reference,
        previousQuantity: currentData.quantity,
        newQuantity,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      await batch.commit();

      // Check alerts
      await this.checkInventoryAlerts(tenantId, itemId, newQuantity);

    } catch (error) {
      logger.error('Error updating inventory quantity:', error);
      throw error;
    }
  }

  /**
   * Record waste
   */
  async recordWaste(
    tenantId: string,
    wasteItems: Array<{
      itemId: string;
      quantity: number;
      reason: string;
      value?: number;
    }>,
    recordedBy: string
  ): Promise<void> {
    try {
      const batch = this.firestore.batch();

      for (const wasteItem of wasteItems) {
        // Update inventory
        await this.updateQuantity(
          tenantId,
          wasteItem.itemId,
          -wasteItem.quantity,
          TRANSACTION_TYPES.WASTE,
          wasteItem.reason
        );

        // Record waste
        const wasteRef = this.firestore
          .collection(WASTE_COLLECTION)
          .doc();

        batch.set(wasteRef, {
          id: wasteRef.id,
          tenantId,
          itemId: wasteItem.itemId,
          quantity: wasteItem.quantity,
          value: wasteItem.value || 0,
          reason: wasteItem.reason,
          recordedBy,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      await batch.commit();

    } catch (error) {
      logger.error('Error recording waste:', error);
      throw error;
    }
  }

  /**
   * Get inventory forecast
   */
  async getInventoryForecast(
    tenantId: string,
    days: number = FORECAST_DAYS
  ): Promise<InventoryForecast[]> {
    try {
      const forecasts: InventoryForecast[] = [];
      
      // Get all inventory items
      const inventorySnapshot = await this.firestore
        .collection(INVENTORY_COLLECTION)
        .where('tenantId', '==', tenantId)
        .get();

      for (const doc of inventorySnapshot.docs) {
        const item = doc.data() as InventoryItem;
        
        // Calculate average daily usage
        const avgDailyUsage = await this.calculateAverageDailyUsage(
          tenantId,
          item.id,
          30 // Last 30 days
        );

        // Project usage
        const projectedUsage = avgDailyUsage * days;
        const remainingStock = item.quantity - projectedUsage;
        const daysUntilStockout = avgDailyUsage > 0 
          ? Math.floor(item.quantity / avgDailyUsage)
          : 999;

        // Calculate recommended order
        let recommendedOrderDate = '';
        let recommendedOrderQuantity = 0;

        if (remainingStock < item.reorderPoint) {
          const leadTime = item.leadTimeDays || 3;
          recommendedOrderDate = addDays(new Date(), daysUntilStockout - leadTime).toISOString();
          recommendedOrderQuantity = item.reorderQuantity || item.reorderPoint * 2;
        }

        forecasts.push({
          itemId: item.id,
          currentStock: item.quantity,
          projectedUsage,
          daysUntilStockout,
          recommendedOrderDate,
          recommendedOrderQuantity
        });
      }

      return forecasts;
    } catch (error) {
      logger.error('Error generating inventory forecast:', error);
      throw error;
    }
  }

  /**
   * Get restock recommendations
   */
  async getRestockRecommendations(tenantId: string): Promise<RestockRecommendation[]> {
    try {
      const recommendations: RestockRecommendation[] = [];
      
      // Get all inventory items
      const inventorySnapshot = await this.firestore
        .collection(INVENTORY_COLLECTION)
        .where('tenantId', '==', tenantId)
        .get();

      for (const doc of inventorySnapshot.docs) {
        const item = doc.data() as InventoryItem;
        
        // Calculate stock percentage
        const stockPercentage = (item.quantity / item.reorderPoint) * 100;
        
        // Determine urgency
        let urgency: RestockRecommendation['urgency'] = 'low';
        let reason = '';

        if (stockPercentage <= STOCK_LEVELS.CRITICAL) {
          urgency = 'critical';
          reason = 'Kritisch niedriger Bestand';
        } else if (stockPercentage <= STOCK_LEVELS.LOW) {
          urgency = 'high';
          reason = 'Niedriger Bestand';
        } else if (stockPercentage <= STOCK_LEVELS.MEDIUM) {
          urgency = 'medium';
          reason = 'Bestand unter Normalwert';
        } else {
          continue; // Skip items with sufficient stock
        }

        // Check expiry
        if (item.expiryDate) {
          const daysUntilExpiry = differenceInDays(new Date(item.expiryDate), new Date());
          if (daysUntilExpiry <= EXPIRY_WARNING_DAYS && daysUntilExpiry > 0) {
            urgency = 'high';
            reason += ` - Läuft in ${daysUntilExpiry} Tagen ab`;
          }
        }

        // Calculate recommended quantity
        const recommendedQuantity = item.reorderQuantity || item.reorderPoint * 2;
        const estimatedCost = recommendedQuantity * (item.unitCost || 0);

        recommendations.push({
          itemId: item.id,
          itemName: item.name,
          currentStock: item.quantity,
          recommendedQuantity,
          urgency,
          reason,
          estimatedCost
        });
      }

      // Sort by urgency
      return recommendations.sort((a, b) => {
        const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      });
    } catch (error) {
      logger.error('Error getting restock recommendations:', error);
      throw error;
    }
  }

  /**
   * Generate inventory report
   */
  async generateInventoryReport(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<InventoryReport> {
    try {
      // Get inventory value
      const inventoryValue = await this.calculateInventoryValue(tenantId);
      
      // Get transactions
      const transactions = await this.getTransactions(tenantId, startDate, endDate);
      
      // Calculate metrics
      const totalPurchases = transactions
        .filter(t => t.type === TRANSACTION_TYPES.PURCHASE)
        .reduce((sum, t) => sum + Math.abs(t.quantity * (t.unitCost || 0)), 0);

      const totalSales = transactions
        .filter(t => t.type === TRANSACTION_TYPES.SALE)
        .reduce((sum, t) => sum + Math.abs(t.quantity * (t.unitCost || 0)), 0);

      const totalWaste = await this.calculateWasteValue(tenantId, startDate, endDate);

      const turnoverRate = totalSales / ((inventoryValue.current + inventoryValue.previous) / 2);

      // Get low stock items
      const lowStockItems = await this.getLowStockItems(tenantId);

      // Get expiring items
      const expiringItems = await this.getExpiringItems(tenantId, 7);

      return {
        tenantId,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        summary: {
          totalValue: inventoryValue.current,
          totalItems: inventoryValue.itemCount,
          totalPurchases,
          totalSales,
          totalWaste,
          turnoverRate
        },
        lowStockItems,
        expiringItems,
        topMovingItems: await this.getTopMovingItems(tenantId, 10),
        wasteAnalysis: await this.getWasteAnalysis(tenantId, startDate, endDate),
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error generating inventory report:', error);
      throw error;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get required ingredients for order items
   */
  private async getRequiredIngredients(
    tenantId: string,
    orderItems: OrderItem[]
  ): Promise<RecipeIngredient[]> {
    const ingredients: Map<string, RecipeIngredient> = new Map();

    for (const orderItem of orderItems) {
      // Get recipe for product
      const recipeDoc = await this.firestore
        .collection(RECIPES_COLLECTION)
        .doc(`${tenantId}_${orderItem.productId}`)
        .get();

      if (!recipeDoc.exists) {
        // If no recipe, assume direct product consumption
        ingredients.set(orderItem.productId, {
          itemId: orderItem.productId,
          name: orderItem.name,
          requiredQuantity: orderItem.quantity,
          unit: 'piece'
        });
        continue;
      }

      const recipe = recipeDoc.data();
      
      // Calculate required quantities
      for (const ingredient of recipe.ingredients) {
        const key = ingredient.itemId;
        const requiredQty = ingredient.quantity * orderItem.quantity;

        if (ingredients.has(key)) {
          const existing = ingredients.get(key)!;
          existing.requiredQuantity += requiredQty;
        } else {
          ingredients.set(key, {
            itemId: ingredient.itemId,
            name: ingredient.name,
            requiredQuantity: requiredQty,
            unit: ingredient.unit
          });
        }
      }
    }

    return Array.from(ingredients.values());
  }

  /**
   * Get inventory item
   */
  private async getInventoryItem(
    tenantId: string,
    itemId: string
  ): Promise<InventoryItem | null> {
    const doc = await this.firestore
      .collection(INVENTORY_COLLECTION)
      .doc(`${tenantId}_${itemId}`)
      .get();

    return doc.exists ? doc.data() as InventoryItem : null;
  }

  /**
   * Schedule reservation release
   */
  private scheduleReservationRelease(reservationId: string, timeout: number): void {
    setTimeout(async () => {
      try {
        const reservationDoc = await this.firestore
          .collection(RESERVATIONS_COLLECTION)
          .doc(reservationId)
          .get();

        if (reservationDoc.exists && reservationDoc.data()?.status === 'active') {
          await this.releaseReservedItems(
            reservationDoc.data()!.tenantId,
            reservationDoc.data()!.orderId
          );
        }
      } catch (error) {
        logger.error('Error releasing expired reservation:', error);
      }
    }, timeout);
  }

  /**
   * Check low stock alerts
   */
  private async checkLowStockAlerts(
    tenantId: string,
    items: Array<{ itemId: string; quantity: number }>
  ): Promise<void> {
    for (const item of items) {
      const inventory = await this.getInventoryItem(tenantId, item.itemId);
      if (!inventory) continue;

      await this.checkInventoryAlerts(tenantId, item.itemId, inventory.quantity);
    }
  }

  /**
   * Check inventory alerts
   */
  private async checkInventoryAlerts(
    tenantId: string,
    itemId: string,
    currentQuantity: number
  ): Promise<void> {
    const inventory = await this.getInventoryItem(tenantId, itemId);
    if (!inventory) return;

    const stockPercentage = (currentQuantity / inventory.reorderPoint) * 100;
    
    // Create alert if needed
    if (stockPercentage <= STOCK_LEVELS.CRITICAL) {
      await this.createAlert(tenantId, itemId, 'critical_stock', {
        currentQuantity,
        reorderPoint: inventory.reorderPoint,
        percentage: stockPercentage
      });
    } else if (stockPercentage <= STOCK_LEVELS.LOW) {
      await this.createAlert(tenantId, itemId, 'low_stock', {
        currentQuantity,
        reorderPoint: inventory.reorderPoint,
        percentage: stockPercentage
      });
    }

    // Check expiry
    if (inventory.expiryDate) {
      const daysUntilExpiry = differenceInDays(new Date(inventory.expiryDate), new Date());
      if (daysUntilExpiry <= EXPIRY_WARNING_DAYS && daysUntilExpiry > 0) {
        await this.createAlert(tenantId, itemId, 'expiry_warning', {
          expiryDate: inventory.expiryDate,
          daysRemaining: daysUntilExpiry
        });
      }
    }
  }

  /**
   * Create inventory alert
   */
  private async createAlert(
    tenantId: string,
    itemId: string,
    type: string,
    data: any
  ): Promise<void> {
    const alertRef = this.firestore.collection(ALERTS_COLLECTION).doc();
    
    await alertRef.set({
      id: alertRef.id,
      tenantId,
      itemId,
      type,
      data,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  /**
   * Calculate average daily usage
   */
  private async calculateAverageDailyUsage(
    tenantId: string,
    itemId: string,
    days: number
  ): Promise<number> {
    const startDate = addDays(new Date(), -days);
    
    const transactionsSnapshot = await this.firestore
      .collection(TRANSACTIONS_COLLECTION)
      .where('tenantId', '==', tenantId)
      .where('itemId', '==', itemId)
      .where('type', '==', TRANSACTION_TYPES.SALE)
      .where('timestamp', '>=', startDate)
      .get();

    const totalUsage = transactionsSnapshot.docs
      .reduce((sum, doc) => sum + Math.abs(doc.data().quantity), 0);

    return totalUsage / days;
  }

  /**
   * Calculate inventory value
   */
  private async calculateInventoryValue(tenantId: string): Promise<any> {
    const inventorySnapshot = await this.firestore
      .collection(INVENTORY_COLLECTION)
      .where('tenantId', '==', tenantId)
      .get();

    let currentValue = 0;
    let itemCount = 0;

    inventorySnapshot.docs.forEach(doc => {
      const item = doc.data() as InventoryItem;
      currentValue += item.quantity * (item.unitCost || 0);
      itemCount++;
    });

    return {
      current: currentValue,
      previous: currentValue * 0.9, // Simplified - should calculate from history
      itemCount
    };
  }

  /**
   * Get transactions
   */
  private async getTransactions(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<InventoryTransaction[]> {
    const snapshot = await this.firestore
      .collection(TRANSACTIONS_COLLECTION)
      .where('tenantId', '==', tenantId)
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .get();

    return snapshot.docs.map(doc => doc.data() as InventoryTransaction);
  }

  /**
   * Calculate waste value
   */
  private async calculateWasteValue(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const wasteSnapshot = await this.firestore
      .collection(WASTE_COLLECTION)
      .where('tenantId', '==', tenantId)
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .get();

    return wasteSnapshot.docs
      .reduce((sum, doc) => sum + (doc.data().value || 0), 0);
  }

  /**
   * Get low stock items
   */
  private async getLowStockItems(tenantId: string): Promise<any[]> {
    const inventorySnapshot = await this.firestore
      .collection(INVENTORY_COLLECTION)
      .where('tenantId', '==', tenantId)
      .get();

    return inventorySnapshot.docs
      .map(doc => {
        const item = doc.data() as InventoryItem;
        const stockPercentage = (item.quantity / item.reorderPoint) * 100;
        return { ...item, stockPercentage };
      })
      .filter(item => item.stockPercentage <= STOCK_LEVELS.LOW)
      .sort((a, b) => a.stockPercentage - b.stockPercentage);
  }

  /**
   * Get expiring items
   */
  private async getExpiringItems(tenantId: string, days: number): Promise<any[]> {
    const expiryDate = addDays(new Date(), days);
    
    const inventorySnapshot = await this.firestore
      .collection(INVENTORY_COLLECTION)
      .where('tenantId', '==', tenantId)
      .where('expiryDate', '<=', expiryDate.toISOString())
      .get();

    return inventorySnapshot.docs
      .map(doc => {
        const item = doc.data() as InventoryItem;
        const daysUntilExpiry = differenceInDays(new Date(item.expiryDate!), new Date());
        return { ...item, daysUntilExpiry };
      })
      .filter(item => item.daysUntilExpiry > 0)
      .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  }

  /**
   * Get top moving items
   */
  private async getTopMovingItems(tenantId: string, limit: number): Promise<any[]> {
    // This would analyze transaction history to find top moving items
    // Simplified implementation
    return [];
  }

  /**
   * Get waste analysis
   */
  private async getWasteAnalysis(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const wasteSnapshot = await this.firestore
      .collection(WASTE_COLLECTION)
      .where('tenantId', '==', tenantId)
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .get();

    const wasteByReason = new Map<string, number>();
    let totalWaste = 0;

    wasteSnapshot.docs.forEach(doc => {
      const waste = doc.data();
      const currentValue = wasteByReason.get(waste.reason) || 0;
      wasteByReason.set(waste.reason, currentValue + waste.value);
      totalWaste += waste.value;
    });

    return {
      total: totalWaste,
      byReason: Array.from(wasteByReason.entries()).map(([reason, value]) => ({
        reason,
        value,
        percentage: (value / totalWaste) * 100
      }))
    };
  }
}