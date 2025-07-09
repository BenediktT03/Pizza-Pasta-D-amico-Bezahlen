import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { 
  InventoryItem,
  InventoryMovement,
  InventoryAlert,
  StockLevel,
  InventoryReport
} from '@eatech/types';
import { notificationService } from './notification.service';
import { aiService } from './ai.service';

interface UpdateInventoryParams {
  truckId: string;
  productId: string;
  quantity: number;
  type: 'sale' | 'purchase' | 'adjustment' | 'waste' | 'return';
  reason?: string;
  orderId?: string;
}

interface InventoryAlertConfig {
  productId: string;
  minQuantity: number;
  reorderPoint: number;
  maxQuantity: number;
  unit: string;
}

interface InventoryPrediction {
  productId: string;
  predictedDemand: number;
  recommendedOrder: number;
  confidence: number;
  reasoning: string;
}

export class InventoryService {
  private db = admin.firestore();
  
  // Configuration
  private readonly LOW_STOCK_THRESHOLD = 0.2; // 20% of max
  private readonly CRITICAL_STOCK_THRESHOLD = 0.1; // 10% of max
  private readonly WASTE_ALERT_THRESHOLD = 0.15; // 15% waste triggers alert
  private readonly INVENTORY_CHECK_INTERVAL = 60; // minutes

  /**
   * Initialize inventory for a product
   */
  async initializeInventory(
    truckId: string,
    productId: string,
    initialQuantity: number,
    config: InventoryAlertConfig
  ): Promise<void> {
    try {
      const inventoryItem: InventoryItem = {
        id: `${productId}_inventory`,
        truckId,
        productId,
        currentQuantity: initialQuantity,
        unit: config.unit,
        minQuantity: config.minQuantity,
        reorderPoint: config.reorderPoint,
        maxQuantity: config.maxQuantity,
        lastRestocked: new Date(),
        lastSold: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.db
        .collection(`foodtrucks/${truckId}/inventory`)
        .doc(inventoryItem.id)
        .set(inventoryItem);

      // Create initial movement record
      await this.recordMovement({
        truckId,
        productId,
        quantity: initialQuantity,
        type: 'purchase',
        reason: 'Initial stock'
      });

      // Set up monitoring
      await this.setupInventoryMonitoring(truckId, productId);
    } catch (error) {
      logger.error('Failed to initialize inventory', { truckId, productId, error });
      throw error;
    }
  }

  /**
   * Update inventory quantity
   */
  async updateInventory(params: UpdateInventoryParams): Promise<void> {
    try {
      const inventoryRef = this.db
        .collection(`foodtrucks/${params.truckId}/inventory`)
        .doc(`${params.productId}_inventory`);

      await this.db.runTransaction(async (transaction) => {
        const doc = await transaction.get(inventoryRef);
        
        if (!doc.exists) {
          throw new Error('Inventory item not found');
        }

        const current = doc.data() as InventoryItem;
        let newQuantity = current.currentQuantity;

        // Calculate new quantity based on movement type
        switch (params.type) {
          case 'sale':
          case 'waste':
            newQuantity -= params.quantity;
            break;
          case 'purchase':
          case 'return':
            newQuantity += params.quantity;
            break;
          case 'adjustment':
            newQuantity = params.quantity; // Direct set
            break;
        }

        // Validate quantity
        if (newQuantity < 0) {
          logger.warn('Inventory would go negative', { 
            ...params, 
            currentQuantity: current.currentQuantity 
          });
          newQuantity = 0;
        }

        // Update inventory
        transaction.update(inventoryRef, {
          currentQuantity: newQuantity,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          ...(params.type === 'sale' && { lastSold: admin.firestore.FieldValue.serverTimestamp() }),
          ...(params.type === 'purchase' && { lastRestocked: admin.firestore.FieldValue.serverTimestamp() })
        });

        // Check stock levels
        await this.checkStockLevels(params.truckId, params.productId, newQuantity, current);
      });

      // Record movement
      await this.recordMovement(params);

      // Update analytics
      await this.updateInventoryAnalytics(params);
    } catch (error) {
      logger.error('Failed to update inventory', { params, error });
      throw error;
    }
  }

  /**
   * Process order inventory updates
   */
  async processOrderInventory(
    truckId: string,
    orderId: string,
    items: any[],
    reverse: boolean = false
  ): Promise<void> {
    try {
      const updates = items.map(item => {
        // Get product ingredients/components
        return this.updateInventory({
          truckId,
          productId: item.productId,
          quantity: item.quantity,
          type: reverse ? 'return' : 'sale',
          orderId
        });
      });

      await Promise.all(updates);

      // Check if any items need restocking
      await this.checkRestockNeeds(truckId);
    } catch (error) {
      logger.error('Failed to process order inventory', { truckId, orderId, error });
      throw error;
    }
  }

  /**
   * Perform inventory count
   */
  async performInventoryCount(
    truckId: string,
    counts: Array<{ productId: string; actualQuantity: number; }>
  ): Promise<InventoryReport> {
    try {
      const discrepancies: any[] = [];
      const movements: any[] = [];

      for (const count of counts) {
        const inventoryDoc = await this.db
          .collection(`foodtrucks/${truckId}/inventory`)
          .doc(`${count.productId}_inventory`)
          .get();

        if (!inventoryDoc.exists) continue;

        const current = inventoryDoc.data() as InventoryItem;
        const difference = count.actualQuantity - current.currentQuantity;

        if (difference !== 0) {
          discrepancies.push({
            productId: count.productId,
            expected: current.currentQuantity,
            actual: count.actualQuantity,
            difference,
            percentage: Math.abs(difference / current.currentQuantity * 100)
          });

          // Record adjustment
          movements.push(this.updateInventory({
            truckId,
            productId: count.productId,
            quantity: count.actualQuantity,
            type: 'adjustment',
            reason: 'Inventory count'
          }));
        }
      }

      await Promise.all(movements);

      // Generate report
      const report: InventoryReport = {
        id: this.generateReportId(),
        truckId,
        type: 'count',
        date: new Date(),
        totalItems: counts.length,
        discrepancies,
        accuracy: this.calculateAccuracy(discrepancies, counts.length),
        performedBy: 'system', // Would be actual user
        notes: `Found ${discrepancies.length} discrepancies`
      };

      // Save report
      await this.saveInventoryReport(truckId, report);

      // Alert if significant discrepancies
      if (report.accuracy < 90) {
        await this.alertSignificantDiscrepancy(truckId, report);
      }

      return report;
    } catch (error) {
      logger.error('Failed to perform inventory count', { truckId, error });
      throw error;
    }
  }

  /**
   * Get inventory predictions using AI
   */
  async getInventoryPredictions(
    truckId: string,
    days: number = 7
  ): Promise<InventoryPrediction[]> {
    try {
      const predictions = await aiService.generatePredictions({
        truckId,
        type: 'inventory',
        historicalDays: 30
      });

      const inventoryPredictions: InventoryPrediction[] = [];

      for (const [productId, prediction] of Object.entries(predictions.predictions.tomorrow)) {
        const pred = prediction as any;
        
        inventoryPredictions.push({
          productId,
          predictedDemand: parseInt(pred.amount),
          recommendedOrder: this.calculateRecommendedOrder(
            parseInt(pred.amount),
            await this.getCurrentStock(truckId, productId)
          ),
          confidence: predictions.confidence,
          reasoning: pred.reasoning
        });
      }

      // Save predictions
      await this.savePredictions(truckId, inventoryPredictions);

      return inventoryPredictions;
    } catch (error) {
      logger.error('Failed to get inventory predictions', { truckId, error });
      throw error;
    }
  }

  /**
   * Generate restock suggestions
   */
  async generateRestockSuggestions(truckId: string): Promise<any> {
    try {
      const inventory = await this.getAllInventory(truckId);
      const predictions = await this.getInventoryPredictions(truckId);
      const suggestions: any[] = [];

      for (const item of inventory) {
        const prediction = predictions.find(p => p.productId === item.productId);
        const stockPercentage = item.currentQuantity / item.maxQuantity;

        if (stockPercentage <= this.LOW_STOCK_THRESHOLD || 
            (prediction && item.currentQuantity < prediction.predictedDemand)) {
          
          const suggestedQuantity = prediction 
            ? prediction.recommendedOrder 
            : item.maxQuantity - item.currentQuantity;

          suggestions.push({
            productId: item.productId,
            productName: await this.getProductName(truckId, item.productId),
            currentStock: item.currentQuantity,
            unit: item.unit,
            suggestedOrder: suggestedQuantity,
            urgency: stockPercentage <= this.CRITICAL_STOCK_THRESHOLD ? 'critical' : 'normal',
            reasoning: prediction?.reasoning || 'Low stock level'
          });
        }
      }

      // Sort by urgency
      suggestions.sort((a, b) => {
        if (a.urgency === 'critical' && b.urgency !== 'critical') return -1;
        if (b.urgency === 'critical' && a.urgency !== 'critical') return 1;
        return b.suggestedOrder - a.suggestedOrder;
      });

      return {
        suggestions,
        totalItems: suggestions.length,
        criticalItems: suggestions.filter(s => s.urgency === 'critical').length,
        estimatedCost: await this.estimateRestockCost(truckId, suggestions),
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Failed to generate restock suggestions', { truckId, error });
      throw error;
    }
  }

  /**
   * Track waste and analyze patterns
   */
  async trackWaste(
    truckId: string,
    productId: string,
    quantity: number,
    reason: 'expired' | 'damaged' | 'quality' | 'other',
    notes?: string
  ): Promise<void> {
    try {
      // Update inventory
      await this.updateInventory({
        truckId,
        productId,
        quantity,
        type: 'waste',
        reason: `${reason}: ${notes || ''}`
      });

      // Record waste entry
      const wasteEntry = {
        id: this.generateWasteId(),
        truckId,
        productId,
        quantity,
        reason,
        notes,
        cost: await this.calculateWasteCost(truckId, productId, quantity),
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      };

      await this.db
        .collection(`foodtrucks/${truckId}/waste_tracking`)
        .doc(wasteEntry.id)
        .set(wasteEntry);

      // Analyze waste patterns
      await this.analyzeWastePatterns(truckId, productId);
    } catch (error) {
      logger.error('Failed to track waste', { truckId, productId, quantity, error });
      throw error;
    }
  }

  /**
   * Set up automated inventory alerts
   */
  async setupInventoryAlerts(
    truckId: string,
    productId: string,
    config: {
      lowStockAlert: boolean;
      criticalStockAlert: boolean;
      overstockAlert: boolean;
      expirationAlert: boolean;
      alertChannels: ('push' | 'email' | 'sms')[];
    }
  ): Promise<void> {
    try {
      await this.db
        .collection(`foodtrucks/${truckId}/inventory_alerts`)
        .doc(productId)
        .set({
          ...config,
          enabled: true,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
      logger.error('Failed to setup inventory alerts', { truckId, productId, error });
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private async recordMovement(params: UpdateInventoryParams): Promise<void> {
    const movement: InventoryMovement = {
      id: this.generateMovementId(),
      truckId: params.truckId,
      productId: params.productId,
      quantity: params.quantity,
      type: params.type,
      reason: params.reason,
      orderId: params.orderId,
      timestamp: new Date(),
      performedBy: 'system' // Would be actual user
    };

    await this.db
      .collection(`foodtrucks/${params.truckId}/inventory_movements`)
      .doc(movement.id)
      .set(movement);
  }

  private async checkStockLevels(
    truckId: string,
    productId: string,
    currentQuantity: number,
    config: InventoryItem
  ): Promise<void> {
    const stockPercentage = currentQuantity / config.maxQuantity;

    if (currentQuantity <= config.minQuantity) {
      await this.createStockAlert(truckId, productId, 'critical', currentQuantity);
    } else if (currentQuantity <= config.reorderPoint) {
      await this.createStockAlert(truckId, productId, 'low', currentQuantity);
    } else if (currentQuantity >= config.maxQuantity * 0.9) {
      await this.createStockAlert(truckId, productId, 'overstock', currentQuantity);
    }
  }

  private async createStockAlert(
    truckId: string,
    productId: string,
    level: 'low' | 'critical' | 'overstock',
    currentQuantity: number
  ): Promise<void> {
    const productName = await this.getProductName(truckId, productId);
    
    const alert: InventoryAlert = {
      id: this.generateAlertId(),
      truckId,
      productId,
      level,
      currentQuantity,
      message: this.getAlertMessage(level, productName, currentQuantity),
      createdAt: new Date(),
      acknowledged: false
    };

    await this.db
      .collection(`foodtrucks/${truckId}/inventory_alerts_log`)
      .doc(alert.id)
      .set(alert);

    // Send notification
    await notificationService.send({
      type: 'inventory_alert',
      recipient: truckId,
      channel: 'push',
      title: '📦 Lagerbestand-Warnung',
      body: alert.message,
      data: {
        productId,
        level,
        currentQuantity: currentQuantity.toString()
      },
      priority: level === 'critical' ? 'high' : 'medium'
    });
  }

  private getAlertMessage(level: string, productName: string, quantity: number): string {
    switch (level) {
      case 'critical':
        return `KRITISCH: ${productName} - nur noch ${quantity} auf Lager!`;
      case 'low':
        return `Niedriger Bestand: ${productName} - ${quantity} verbleibend`;
      case 'overstock':
        return `Überbestand: ${productName} - ${quantity} auf Lager`;
      default:
        return `Lagerbestand-Warnung für ${productName}`;
    }
  }

  private async setupInventoryMonitoring(truckId: string, productId: string): Promise<void> {
    // This would set up scheduled functions to monitor inventory
    await this.db.collection('inventory_monitoring').add({
      truckId,
      productId,
      checkInterval: this.INVENTORY_CHECK_INTERVAL,
      enabled: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  private async checkRestockNeeds(truckId: string): Promise<void> {
    const inventory = await this.getAllInventory(truckId);
    const needsRestock = inventory.filter(item => 
      item.currentQuantity <= item.reorderPoint
    );

    if (needsRestock.length > 0) {
      const suggestions = await this.generateRestockSuggestions(truckId);
      
      // Create daily restock reminder if needed
      await this.createRestockReminder(truckId, suggestions);
    }
  }

  private async getAllInventory(truckId: string): Promise<InventoryItem[]> {
    const snapshot = await this.db
      .collection(`foodtrucks/${truckId}/inventory`)
      .get();

    return snapshot.docs.map(doc => doc.data() as InventoryItem);
  }

  private calculateRecommendedOrder(
    predictedDemand: number,
    currentStock: number
  ): number {
    const safetyStock = Math.ceil(predictedDemand * 0.2); // 20% safety
    const needed = predictedDemand + safetyStock - currentStock;
    return Math.max(0, needed);
  }

  private async getCurrentStock(truckId: string, productId: string): Promise<number> {
    const doc = await this.db
      .collection(`foodtrucks/${truckId}/inventory`)
      .doc(`${productId}_inventory`)
      .get();

    return doc.exists ? doc.data()!.currentQuantity : 0;
  }

  private async getProductName(truckId: string, productId: string): Promise<string> {
    const doc = await this.db
      .collection(`foodtrucks/${truckId}/products`)
      .doc(productId)
      .get();

    return doc.exists ? doc.data()!.name.de : productId;
  }

  private async savePredictions(
    truckId: string,
    predictions: InventoryPrediction[]
  ): Promise<void> {
    await this.db
      .collection(`foodtrucks/${truckId}/inventory_predictions`)
      .add({
        predictions,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
  }

  private async estimateRestockCost(
    truckId: string,
    suggestions: any[]
  ): Promise<number> {
    let totalCost = 0;

    for (const suggestion of suggestions) {
      const productCost = await this.getProductCost(truckId, suggestion.productId);
      totalCost += productCost * suggestion.suggestedOrder;
    }

    return Math.round(totalCost * 100) / 100;
  }

  private async getProductCost(truckId: string, productId: string): Promise<number> {
    // This would get the cost from product data
    const doc = await this.db
      .collection(`foodtrucks/${truckId}/products`)
      .doc(productId)
      .get();

    return doc.exists ? (doc.data()!.cost || 0) : 0;
  }

  private calculateAccuracy(discrepancies: any[], totalItems: number): number {
    if (totalItems === 0) return 100;
    
    const accurateItems = totalItems - discrepancies.length;
    return Math.round((accurateItems / totalItems) * 100);
  }

  private async saveInventoryReport(truckId: string, report: InventoryReport): Promise<void> {
    await this.db
      .collection(`foodtrucks/${truckId}/inventory_reports`)
      .doc(report.id)
      .set(report);
  }

  private async alertSignificantDiscrepancy(
    truckId: string,
    report: InventoryReport
  ): Promise<void> {
    await notificationService.send({
      type: 'inventory_discrepancy',
      recipient: truckId,
      channel: 'email',
      title: '⚠️ Erhebliche Bestandsabweichungen',
      body: `Bestandszählung zeigt ${report.accuracy}% Genauigkeit mit ${report.discrepancies.length} Abweichungen`,
      data: {
        reportId: report.id,
        accuracy: report.accuracy.toString()
      },
      priority: 'high'
    });
  }

  private async calculateWasteCost(
    truckId: string,
    productId: string,
    quantity: number
  ): Promise<number> {
    const cost = await this.getProductCost(truckId, productId);
    return cost * quantity;
  }

  private async analyzeWastePatterns(truckId: string, productId: string): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const wasteSnapshot = await this.db
      .collection(`foodtrucks/${truckId}/waste_tracking`)
      .where('productId', '==', productId)
      .where('timestamp', '>=', thirtyDaysAgo)
      .get();

    const totalWaste = wasteSnapshot.docs.reduce((sum, doc) => 
      sum + doc.data().quantity, 0
    );

    // Get total sold in same period
    const movements = await this.db
      .collection(`foodtrucks/${truckId}/inventory_movements`)
      .where('productId', '==', productId)
      .where('type', '==', 'sale')
      .where('timestamp', '>=', thirtyDaysAgo)
      .get();

    const totalSold = movements.docs.reduce((sum, doc) => 
      sum + doc.data().quantity, 0
    );

    const wastePercentage = totalSold > 0 ? (totalWaste / totalSold) * 100 : 0;

    if (wastePercentage > this.WASTE_ALERT_THRESHOLD * 100) {
      await this.createWasteAlert(truckId, productId, wastePercentage);
    }
  }

  private async createWasteAlert(
    truckId: string,
    productId: string,
    wastePercentage: number
  ): Promise<void> {
    const productName = await this.getProductName(truckId, productId);
    
    await notificationService.send({
      type: 'high_waste',
      recipient: truckId,
      channel: 'push',
      title: '♻️ Hohe Abfallquote',
      body: `${productName}: ${wastePercentage.toFixed(1)}% Abfall in den letzten 30 Tagen`,
      data: {
        productId,
        wastePercentage: wastePercentage.toString()
      }
    });
  }

  private async createRestockReminder(truckId: string, suggestions: any): Promise<void> {
    if (suggestions.criticalItems > 0) {
      await notificationService.send({
        type: 'restock_reminder',
        recipient: truckId,
        channel: 'push',
        title: '🛒 Bestellung erforderlich',
        body: `${suggestions.criticalItems} kritische Artikel müssen nachbestellt werden`,
        data: {
          totalItems: suggestions.totalItems.toString(),
          criticalItems: suggestions.criticalItems.toString(),
          estimatedCost: suggestions.estimatedCost.toString()
        },
        priority: 'high'
      });
    }
  }

  private async updateInventoryAnalytics(params: UpdateInventoryParams): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const analyticsRef = this.db
      .collection(`foodtrucks/${params.truckId}/inventory_analytics`)
      .doc(date);

    const updates: any = {
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    };

    if (params.type === 'sale') {
      updates[`products.${params.productId}.sold`] = admin.firestore.FieldValue.increment(params.quantity);
    } else if (params.type === 'waste') {
      updates[`products.${params.productId}.wasted`] = admin.firestore.FieldValue.increment(params.quantity);
    } else if (params.type === 'purchase') {
      updates[`products.${params.productId}.purchased`] = admin.firestore.FieldValue.increment(params.quantity);
    }

    await analyticsRef.set(updates, { merge: true });
  }

  // ID generators
  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMovementId(): string {
    return `movement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateWasteId(): string {
    return `waste_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const inventoryService = new InventoryService();
