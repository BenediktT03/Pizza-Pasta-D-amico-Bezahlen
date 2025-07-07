/**
 * Wait Time Predictor
 *
 * Intelligente Wartezeit-Vorhersage für Schweizer Foodtrucks
 * Real-time Queue Management und Customer Experience Optimization
 *
 * @author Benedikt Thomma <benedikt@thomma.ch>
 */

import { getFirestore } from 'firebase-admin/firestore';
import {
  KitchenMetrics,
  OrderComplexity,
  QueueAnalysis,
  StaffEfficiency,
  WaitTimeFactors,
  WaitTimePredictionRequest,
  WaitTimePredictionResponse
} from '../types/ai.types';
import {
  getCurrentSwissTime
} from '../utils/ai.utils';

export class WaitTimePredictor {
  private db: FirebaseFirestore.Firestore;
  private predictionCache: Map<string, WaitTimePredictionResponse> = new Map();
  private kitchenMetrics: Map<string, KitchenMetrics> = new Map();
  private historicalWaitTimes: Map<string, number[]> = new Map();

  constructor() {
    this.db = getFirestore();
  }

  /**
   * Initialisiert den Wait Time Predictor
   */
  async initialize(): Promise<void> {
    console.log('⏱️ Initializing Wait Time Predictor...');

    // Lade historische Wartezeiten
    await this.loadHistoricalWaitTimes();

    // Starte Real-time Monitoring
    this.startRealTimeMonitoring();

    console.log('✅ Wait Time Predictor initialized');
  }

  /**
   * Sagt Wartezeit für neue Bestellung vorher
   */
  async predictWaitTime(request: WaitTimePredictionRequest): Promise<WaitTimePredictionResponse> {
    try {
      console.log(`⏱️ Predicting wait time for tenant ${request.tenantId}`);

      // Cache Check für schnelle Antworten
      const cacheKey = this.getCacheKey(request);
      const cached = this.predictionCache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        return cached;
      }

      // Sammle aktuelle Situation
      const currentState = await this.analyzeCurrentState(request.tenantId);

      // Analysiere Queue
      const queueAnalysis = await this.analyzeQueue(request.tenantId);

      // Berechne Order Complexity
      const orderComplexity = this.calculateOrderComplexity(request.orderItems || []);

      // Analysiere Kitchen Performance
      const kitchenMetrics = await this.analyzeKitchenPerformance(request.tenantId);

      // Berechne Staff Efficiency
      const staffEfficiency = await this.calculateStaffEfficiency(request.tenantId);

      // Führe Wartezeit-Vorhersage durch
      const prediction = await this.performWaitTimePrediction(
        currentState,
        queueAnalysis,
        orderComplexity,
        kitchenMetrics,
        staffEfficiency,
        request
      );

      // Cache Result
      this.predictionCache.set(cacheKey, prediction);

      // Speichere Prediction Log
      await this.logPrediction(request, prediction);

      return prediction;
    } catch (error) {
      console.error(`Wait time prediction failed for ${request.tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Analysiert aktuelle Situation
   */
  private async analyzeCurrentState(tenantId: string): Promise<{
    currentTime: Date;
    queueLength: number;
    activeOrders: number;
    staffPresent: number;
    kitchenUtilization: number;
  }> {
    const now = getCurrentSwissTime();

    // Hole aktuelle Orders
    const activeOrdersSnapshot = await this.db
      .collection(`tenants/${tenantId}/orders`)
      .where('status', 'in', ['pending', 'confirmed', 'preparing'])
      .get();

    const activeOrders = activeOrdersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate()
    }));

    // Berechne Queue Length
    const queueLength = activeOrders.filter(order =>
      ['pending', 'confirmed'].includes(order.status)
    ).length;

    // Hole Staff Status
    const staffStatus = await this.getStaffStatus(tenantId);

    // Berechne Kitchen Utilization
    const kitchenUtilization = await this.calculateKitchenUtilization(tenantId);

    return {
      currentTime: now,
      queueLength,
      activeOrders: activeOrders.length,
      staffPresent: staffStatus.present,
      kitchenUtilization
    };
  }

  /**
   * Analysiert die aktuelle Warteschlange
   */
  private async analyzeQueue(tenantId: string): Promise<QueueAnalysis> {
    const queueSnapshot = await this.db
      .collection(`tenants/${tenantId}/orders`)
      .where('status', 'in', ['pending', 'confirmed', 'preparing'])
      .orderBy('createdAt')
      .get();

    const queueOrders = queueSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate()
    }));

    // Analysiere Queue Composition
    const ordersByStatus = {
      pending: queueOrders.filter(o => o.status === 'pending').length,
      confirmed: queueOrders.filter(o => o.status === 'confirmed').length,
      preparing: queueOrders.filter(o => o.status === 'preparing').length
    };

    // Berechne durchschnittliche Wartezeit basierend auf aktueller Queue
    const avgWaitTimeInQueue = this.calculateQueueWaitTime(queueOrders);

    // Analysiere Order Komplexität in Queue
    const queueComplexity = this.analyzeQueueComplexity(queueOrders);

    // Berechne Queue Momentum (Trend)
    const queueMomentum = await this.calculateQueueMomentum(tenantId);

    return {
      totalOrders: queueOrders.length,
      ordersByStatus,
      avgWaitTimeInQueue,
      complexity: queueComplexity,
      momentum: queueMomentum,
      oldestOrder: queueOrders.length > 0 ? queueOrders[0].createdAt : null,
      estimatedClearTime: this.estimateQueueClearTime(queueOrders)
    };
  }

  /**
   * Berechnet Order Complexity Score
   */
  private calculateOrderComplexity(orderItems: any[]): OrderComplexity {
    if (orderItems.length === 0) {
      return {
        score: 1.0, // Default complexity
        factors: [],
        preparationTime: 8 // Default 8 minutes
      };
    }

    let complexityScore = 0;
    let totalPrepTime = 0;
    const factors: string[] = [];

    for (const item of orderItems) {
      // Base complexity
      let itemComplexity = 1.0;
      let itemPrepTime = 5; // Base 5 minutes

      // Item category complexity
      const categoryComplexity = {
        'main': 1.0,
        'sides': 0.5,
        'drinks': 0.2,
        'desserts': 0.7
      };

      itemComplexity *= categoryComplexity[item.category] || 1.0;

      // Modifiers increase complexity
      if (item.modifiers && item.modifiers.length > 0) {
        itemComplexity *= (1 + item.modifiers.length * 0.2);
        itemPrepTime += item.modifiers.length * 1;
        factors.push(`${item.modifiers.length} modifiers`);
      }

      // Special preparations
      if (item.tags?.includes('custom')) {
        itemComplexity *= 1.5;
        itemPrepTime += 3;
        factors.push('custom preparation');
      }

      if (item.tags?.includes('grilled')) {
        itemComplexity *= 1.3;
        itemPrepTime += 2;
        factors.push('grilled item');
      }

      // Quantity factor
      const quantity = item.quantity || 1;
      itemComplexity *= Math.sqrt(quantity); // Diminishing returns
      itemPrepTime *= quantity;

      complexityScore += itemComplexity;
      totalPrepTime += itemPrepTime;
    }

    // Normalize complexity score
    complexityScore = complexityScore / orderItems.length;

    return {
      score: Math.min(complexityScore, 3.0), // Cap at 3.0
      factors,
      preparationTime: Math.round(totalPrepTime)
    };
  }

  /**
   * Analysiert Kitchen Performance
   */
  private async analyzeKitchenPerformance(tenantId: string): Promise<KitchenMetrics> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Hole completed orders der letzten Stunde
    const completedOrdersSnapshot = await this.db
      .collection(`tenants/${tenantId}/orders`)
      .where('status', 'in', ['completed', 'ready', 'picked_up'])
      .where('fulfillment.timing.readyAt', '>=', oneHourAgo)
      .get();

    const completedOrders = completedOrdersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        confirmedAt: data.fulfillment?.timing?.confirmedAt?.toDate(),
        readyAt: data.fulfillment?.timing?.readyAt?.toDate()
      };
    }).filter(order => order.confirmedAt && order.readyAt);

    if (completedOrders.length === 0) {
      return this.getDefaultKitchenMetrics();
    }

    // Berechne Preparation Times
    const prepTimes = completedOrders.map(order => {
      const prepTime = (order.readyAt.getTime() - order.confirmedAt.getTime()) / (1000 * 60);
      return Math.max(1, prepTime); // Mindestens 1 Minute
    });

    const avgPrepTime = prepTimes.reduce((sum, time) => sum + time, 0) / prepTimes.length;
    const medianPrepTime = this.calculateMedian(prepTimes);

    // Berechne Throughput (Orders pro Stunde)
    const throughput = completedOrders.length;

    // Berechne Consistency (Standardabweichung)
    const variance = prepTimes.reduce((sum, time) => sum + Math.pow(time - avgPrepTime, 2), 0) / prepTimes.length;
    const consistency = 1 / (1 + Math.sqrt(variance)); // 0-1, höher = konsistenter

    // Berechne Efficiency Score
    const efficiency = Math.min(1, throughput / 20); // 20 orders/hour = 100% efficiency

    return {
      avgPreparationTime: avgPrepTime,
      medianPreparationTime: medianPrepTime,
      throughput,
      efficiency,
      consistency,
      lastHourOrders: completedOrders.length,
      trendDirection: this.calculateTrendDirection(prepTimes)
    };
  }

  /**
   * Berechnet Staff Efficiency
   */
  private async calculateStaffEfficiency(tenantId: string): Promise<StaffEfficiency> {
    const staffStatus = await this.getStaffStatus(tenantId);
    const kitchenMetrics = await this.analyzeKitchenPerformance(tenantId);

    // Berechne Orders pro Staff Member
    const ordersPerStaff = kitchenMetrics.throughput / Math.max(1, staffStatus.present);

    // Ideal: 8-12 orders pro Staff pro Stunde
    const idealOrdersPerStaff = 10;
    const efficiencyRatio = Math.min(1, ordersPerStaff / idealOrdersPerStaff);

    return {
      staffPresent: staffStatus.present,
      staffRequired: staffStatus.required,
      ordersPerStaff,
      efficiencyScore: efficiencyRatio,
      isOptimal: efficiencyRatio >= 0.8 && efficiencyRatio <= 1.2,
      bottleneck: this.identifyBottleneck(staffStatus, kitchenMetrics)
    };
  }

  /**
   * Führt die eigentliche Wartezeit-Vorhersage durch
   */
  private async performWaitTimePrediction(
    currentState: any,
    queueAnalysis: QueueAnalysis,
    orderComplexity: OrderComplexity,
    kitchenMetrics: KitchenMetrics,
    staffEfficiency: StaffEfficiency,
    request: WaitTimePredictionRequest
  ): Promise<WaitTimePredictionResponse> {

    // Base Wait Time: Zeit bis Order an der Reihe ist
    const queueWaitTime = this.calculateQueueWaitTime(queueAnalysis, kitchenMetrics);

    // Preparation Time: Zeit für die Zubereitung
    const preparationTime = this.calculatePreparationTime(
      orderComplexity,
      kitchenMetrics,
      staffEfficiency
    );

    // Total Wait Time
    const totalWaitTime = queueWaitTime + preparationTime;

    // Faktoren für die Vorhersage
    const factors: WaitTimeFactors = {
      queueLength: queueAnalysis.totalOrders,
      orderComplexity: orderComplexity.score,
      kitchenEfficiency: kitchenMetrics.efficiency,
      staffLevel: staffEfficiency.efficiencyScore,
      timeOfDay: this.getTimeOfDayFactor(currentState.currentTime),
      weatherImpact: await this.getWeatherImpact(request.tenantId),
      historicalAccuracy: await this.getHistoricalAccuracy(request.tenantId)
    };

    // Berechne Konfidenz
    const confidence = this.calculatePredictionConfidence(factors, kitchenMetrics);

    // Berechne Confidence Interval
    const uncertainty = totalWaitTime * (1 - confidence) * 0.5;

    return {
      tenantId: request.tenantId,
      estimatedWaitTime: Math.round(totalWaitTime),
      confidence,
      breakdown: {
        queueWaitTime: Math.round(queueWaitTime),
        preparationTime: Math.round(preparationTime),
        bufferTime: Math.round(totalWaitTime * 0.1) // 10% buffer
      },
      confidenceInterval: {
        min: Math.max(1, Math.round(totalWaitTime - uncertainty)),
        max: Math.round(totalWaitTime + uncertainty)
      },
      factors,
      recommendations: this.generateRecommendations(
        currentState,
        queueAnalysis,
        staffEfficiency
      ),
      queuePosition: queueAnalysis.totalOrders + 1,
      estimatedReadyTime: new Date(Date.now() + totalWaitTime * 60 * 1000),
      predictedAt: new Date(),
      validUntil: new Date(Date.now() + 5 * 60 * 1000) // 5 Minuten gültig
    };
  }

  /**
   * Berechnet Queue Wait Time
   */
  private calculateQueueWaitTime(
    queueAnalysis: QueueAnalysis | any[],
    kitchenMetrics: KitchenMetrics
  ): number {
    let queueOrders: any[];

    if (Array.isArray(queueAnalysis)) {
      queueOrders = queueAnalysis;
    } else {
      queueOrders = new Array(queueAnalysis.totalOrders).fill({
        complexity: queueAnalysis.complexity || 1.0
      });
    }

    if (queueOrders.length === 0) return 0;

    // Berechne Zeit basierend auf Kitchen Throughput
    const avgPrepTime = kitchenMetrics.avgPreparationTime;
    const queueLength = queueOrders.length;

    // Berücksichtige Parallelität (multiple items können gleichzeitig zubereitet werden)
    const parallelismFactor = 0.7; // 30% Zeitersparnis durch Parallelität

    return queueLength * avgPrepTime * parallelismFactor;
  }

  /**
   * Berechnet Preparation Time für neue Order
   */
  private calculatePreparationTime(
    orderComplexity: OrderComplexity,
    kitchenMetrics: KitchenMetrics,
    staffEfficiency: StaffEfficiency
  ): number {
    // Base preparation time aus Order Complexity
    let prepTime = orderComplexity.preparationTime;

    // Adjustiere basierend auf Kitchen Performance
    const performanceFactor = kitchenMetrics.avgPreparationTime / 8; // 8 min baseline
    prepTime *= performanceFactor;

    // Adjustiere basierend auf Staff Efficiency
    const staffFactor = 1 / Math.max(0.5, staffEfficiency.efficiencyScore);
    prepTime *= staffFactor;

    // Berücksichtige Kitchen Consistency
    const consistencyVariance = (1 - kitchenMetrics.consistency) * 0.3; // Max 30% Variance
    prepTime *= (1 + consistencyVariance);

    return Math.max(3, prepTime); // Mindestens 3 Minuten
  }

  /**
   * Health Check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.db.collection('_health').doc('ai_wait_predictor').set({
        lastCheck: new Date(),
        service: 'wait-time-predictor',
        predictionsInCache: this.predictionCache.size
      });
      return true;
    } catch (error) {
      console.error('Wait Time Predictor health check failed:', error);
      return false;
    }
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    this.predictionCache.clear();
    this.kitchenMetrics.clear();
    this.historicalWaitTimes.clear();
    console.log('Wait Time Predictor shut down');
  }

  // Helper Methods
  private getCacheKey(request: WaitTimePredictionRequest): string {
    return `${request.tenantId}_${Date.now().toString().slice(0, -4)}`; // 10-second precision
  }

  private isCacheValid(prediction: WaitTimePredictionResponse): boolean {
    return new Date() < new Date(prediction.validUntil);
  }

  private async loadHistoricalWaitTimes(): Promise<void> {
    // Implementation für historische Wartezeiten
  }

  private startRealTimeMonitoring(): void {
    // Implementation für Real-time Monitoring
  }

  private async getStaffStatus(tenantId: string): Promise<{ present: number; required: number }> {
    // Implementation
    return { present: 2, required: 3 };
  }

  private async calculateKitchenUtilization(tenantId: string): Promise<number> {
    // Implementation
    return 0.75;
  }

  private analyzeQueueComplexity(queueOrders: any[]): number {
    if (queueOrders.length === 0) return 1.0;

    const complexities = queueOrders.map(order => {
      const itemCount = order.items?.length || 1;
      const modifierCount = order.items?.reduce((sum, item) =>
        sum + (item.modifiers?.length || 0), 0) || 0;

      return 1 + (itemCount - 1) * 0.2 + modifierCount * 0.1;
    });

    return complexities.reduce((sum, c) => sum + c, 0) / complexities.length;
  }

  private async calculateQueueMomentum(tenantId: string): Promise<'accelerating' | 'stable' | 'slowing'> {
    // Implementation für Queue Momentum
    return 'stable';
  }

  private estimateQueueClearTime(queueOrders: any[]): Date {
    const avgTimePerOrder = 8; // 8 minutes average
    const totalMinutes = queueOrders.length * avgTimePerOrder;
    return new Date(Date.now() + totalMinutes * 60 * 1000);
  }

  private getDefaultKitchenMetrics(): KitchenMetrics {
    return {
      avgPreparationTime: 8,
      medianPreparationTime: 7,
      throughput: 10,
      efficiency: 0.7,
      consistency: 0.8,
      lastHourOrders: 0,
      trendDirection: 'stable'
    };
  }

  private calculateMedian(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private calculateTrendDirection(prepTimes: number[]): 'improving' | 'stable' | 'degrading' {
    if (prepTimes.length < 5) return 'stable';

    const firstHalf = prepTimes.slice(0, Math.floor(prepTimes.length / 2));
    const secondHalf = prepTimes.slice(Math.floor(prepTimes.length / 2));

    const firstAvg = firstHalf.reduce((sum, t) => sum + t, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, t) => sum + t, 0) / secondHalf.length;

    const threshold = 0.5; // 30 seconds threshold

    if (secondAvg < firstAvg - threshold) return 'improving';
    if (secondAvg > firstAvg + threshold) return 'degrading';
    return 'stable';
  }

  private identifyBottleneck(staffStatus: any, kitchenMetrics: KitchenMetrics): string | null {
    if (staffStatus.present < staffStatus.required) return 'staff_shortage';
    if (kitchenMetrics.efficiency < 0.6) return 'kitchen_capacity';
    if (kitchenMetrics.consistency < 0.7) return 'process_inconsistency';
    return null;
  }

  private getTimeOfDayFactor(currentTime: Date): number {
    const hour = currentTime.getHours();

    // Peak hours have higher complexity
    if (hour >= 11 && hour <= 14) return 1.2; // Lunch rush
    if (hour >= 18 && hour <= 20) return 1.1; // Dinner rush
    return 1.0;
  }

  private async getWeatherImpact(tenantId: string): Promise<number> {
    // Implementation für Weather Impact
    return 1.0;
  }

  private async getHistoricalAccuracy(tenantId: string): Promise<number> {
    // Implementation für Historical Accuracy
    return 0.85;
  }

  private calculatePredictionConfidence(factors: WaitTimeFactors, kitchenMetrics: KitchenMetrics): number {
    let confidence = 0.8; // Base confidence

    // Reduce confidence for high complexity
    if (factors.orderComplexity > 2.0) confidence -= 0.1;

    // Reduce confidence for low kitchen efficiency
    if (factors.kitchenEfficiency < 0.6) confidence -= 0.2;

    // Increase confidence for consistent kitchen performance
    if (kitchenMetrics.consistency > 0.8) confidence += 0.1;

    // Reduce confidence during peak hours
    if (factors.timeOfDay > 1.1) confidence -= 0.1;

    return Math.max(0.3, Math.min(0.95, confidence));
  }

  private generateRecommendations(
    currentState: any,
    queueAnalysis: QueueAnalysis,
    staffEfficiency: StaffEfficiency
  ): string[] {
    const recommendations: string[] = [];

    if (queueAnalysis.totalOrders > 10) {
      recommendations.push('Erwägen Sie temporär vereinfachte Menü-Options');
    }

    if (staffEfficiency.staffPresent < staffEfficiency.staffRequired) {
      recommendations.push('Zusätzliches Personal erforderlich');
    }

    if (currentState.kitchenUtilization > 0.9) {
      recommendations.push('Küchen-Kapazität erreicht - Bestellannahme verlangsamen');
    }

    return recommendations;
  }

  private async logPrediction(request: WaitTimePredictionRequest, prediction: WaitTimePredictionResponse): Promise<void> {
    await this.db.collection('wait_time_predictions').add({
      tenantId: request.tenantId,
      estimatedWaitTime: prediction.estimatedWaitTime,
      confidence: prediction.confidence,
      queuePosition: prediction.queuePosition,
      predictedAt: new Date()
    });
  }
}
