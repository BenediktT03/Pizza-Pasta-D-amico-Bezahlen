/**
 * EATECH - Kitchen Display Service
 * Version: 1.0.0
 * Description: Real-time Kitchen Display System (KDS) Management
 * Author: EATECH Development Team
 * Created: 2025-01-09
 * File Path: /functions/src/services/KitchenDisplayService.ts
 * 
 * Features:
 * - Real-time order display
 * - Kitchen workflow management
 * - Station routing
 * - Preparation timing
 * - Order prioritization
 * - Performance metrics
 * - Alert management
 * - Multi-station support
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { 
  KitchenTicket,
  KitchenStation,
  StationAssignment,
  PreparationStep,
  KitchenMetrics,
  KitchenAlert
} from '../types/kitchen.types';
import { OrderStatus } from '../types/order.types';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { 
  differenceInMinutes,
  addMinutes,
  format,
  isAfter
} from 'date-fns';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface TicketPriority {
  score: number;
  factors: {
    waitTime: number;
    orderType: number;
    customerType: number;
    itemCount: number;
    complexity: number;
  };
  level: 'low' | 'normal' | 'high' | 'urgent';
}

interface StationWorkload {
  stationId: string;
  activeTickets: number;
  estimatedTime: number;
  efficiency: number;
  available: boolean;
}

interface PreparationProgress {
  ticketId: string;
  completedSteps: number;
  totalSteps: number;
  percentage: number;
  currentStep?: PreparationStep;
  estimatedCompletion: string;
}

interface KitchenPerformance {
  avgPrepTime: number;
  avgWaitTime: number;
  throughput: number;
  efficiency: number;
  stationMetrics: Array<{
    stationId: string;
    metrics: KitchenMetrics;
  }>;
}

interface OrderRoutingResult {
  stations: Array<{
    stationId: string;
    items: string[];
    priority: number;
    estimatedTime: number;
  }>;
  totalTime: number;
  parallelizable: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TICKETS_COLLECTION = 'kitchen_tickets';
const STATIONS_COLLECTION = 'kitchen_stations';
const ALERTS_COLLECTION = 'kitchen_alerts';
const METRICS_COLLECTION = 'kitchen_metrics';

const TICKET_STATUS = {
  NEW: 'new',
  VIEWED: 'viewed',
  IN_PROGRESS: 'in_progress',
  READY: 'ready',
  SERVED: 'served',
  VOID: 'void'
};

const PRIORITY_WEIGHTS = {
  waitTime: 0.4,
  orderType: 0.2,
  customerType: 0.2,
  itemCount: 0.1,
  complexity: 0.1
};

const ORDER_TYPE_PRIORITY = {
  dineIn: 3,
  pickup: 2,
  delivery: 1
};

const CUSTOMER_TYPE_PRIORITY = {
  vip: 3,
  regular: 2,
  new: 1
};

const ALERT_THRESHOLDS = {
  prepTime: {
    warning: 20, // minutes
    critical: 30
  },
  queueLength: {
    warning: 10,
    critical: 15
  },
  efficiency: {
    warning: 0.7,
    critical: 0.5
  }
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

export default class KitchenDisplayService {
  private db: admin.database.Database;
  private firestore: admin.firestore.Firestore;

  constructor() {
    this.db = admin.database();
    this.firestore = admin.firestore();
  }

  /**
   * Create kitchen ticket
   */
  async createTicket(
    tenantId: string,
    orderData: {
      orderId: string;
      orderNumber: string;
      orderType: 'dineIn' | 'pickup' | 'delivery';
      customerName: string;
      customerType?: string;
      items: Array<{
        id: string;
        name: string;
        quantity: number;
        modifiers?: string[];
        notes?: string;
        category?: string;
      }>;
      notes?: string;
      scheduledTime?: string;
    }
  ): Promise<KitchenTicket> {
    try {
      const ticketId = uuidv4();
      const now = new Date();

      // Route items to stations
      const routing = await this.routeOrderToStations(tenantId, orderData.items);

      // Calculate priority
      const priority = this.calculatePriority({
        waitTime: 0,
        orderType: orderData.orderType,
        customerType: orderData.customerType,
        itemCount: orderData.items.length,
        complexity: this.calculateComplexity(orderData.items)
      });

      // Create preparation steps
      const steps = await this.createPreparationSteps(orderData.items);

      const ticket: KitchenTicket = {
        id: ticketId,
        tenantId,
        orderId: orderData.orderId,
        orderNumber: orderData.orderNumber,
        orderType: orderData.orderType,
        status: TICKET_STATUS.NEW,
        priority: priority.level,
        priorityScore: priority.score,
        items: orderData.items,
        stations: routing.stations,
        preparationSteps: steps,
        currentStep: 0,
        customerName: orderData.customerName,
        notes: orderData.notes,
        createdAt: now.toISOString(),
        estimatedCompletionTime: addMinutes(now, routing.totalTime).toISOString(),
        timings: {
          created: now.toISOString(),
          firstViewed: null,
          started: null,
          completed: null,
          served: null
        },
        metrics: {
          prepTime: null,
          waitTime: null,
          efficiency: null
        }
      };

      // Save ticket
      await this.firestore
        .collection(TICKETS_COLLECTION)
        .doc(ticketId)
        .set(ticket);

      // Update real-time queue
      await this.updateRealtimeQueue(tenantId, ticket);

      // Notify stations
      await this.notifyStations(ticket);

      // Check for alerts
      await this.checkKitchenAlerts(tenantId);

      logger.info(`Kitchen ticket created: ${ticketId}`);
      return ticket;
    } catch (error) {
      logger.error('Error creating kitchen ticket:', error);
      throw error;
    }
  }

  /**
   * Update ticket status
   */
  async updateTicketStatus(
    tenantId: string,
    ticketId: string,
    newStatus: string,
    metadata?: {
      stationId?: string;
      userId?: string;
      notes?: string;
    }
  ): Promise<void> {
    try {
      const ticketRef = this.firestore
        .collection(TICKETS_COLLECTION)
        .doc(ticketId);

      const ticket = (await ticketRef.get()).data() as KitchenTicket;
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      const updates: any = {
        status: newStatus,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      };

      // Update timings based on status
      const now = new Date().toISOString();
      switch (newStatus) {
        case TICKET_STATUS.VIEWED:
          if (!ticket.timings.firstViewed) {
            updates['timings.firstViewed'] = now;
          }
          break;

        case TICKET_STATUS.IN_PROGRESS:
          if (!ticket.timings.started) {
            updates['timings.started'] = now;
          }
          break;

        case TICKET_STATUS.READY:
          updates['timings.completed'] = now;
          updates['metrics.prepTime'] = differenceInMinutes(
            new Date(now),
            new Date(ticket.timings.started || ticket.createdAt)
          );
          break;

        case TICKET_STATUS.SERVED:
          updates['timings.served'] = now;
          updates['metrics.waitTime'] = differenceInMinutes(
            new Date(now),
            new Date(ticket.createdAt)
          );
          break;
      }

      // Add metadata if provided
      if (metadata) {
        updates.lastUpdateMetadata = metadata;
      }

      await ticketRef.update(updates);

      // Update real-time status
      await this.updateRealtimeStatus(tenantId, ticketId, newStatus);

      // Update metrics
      if (newStatus === TICKET_STATUS.SERVED) {
        await this.updateKitchenMetrics(tenantId, ticket, updates.metrics);
      }

      // Check for completion
      if (newStatus === TICKET_STATUS.READY) {
        await this.handleTicketCompletion(tenantId, ticket);
      }

    } catch (error) {
      logger.error('Error updating ticket status:', error);
      throw error;
    }
  }

  /**
   * Update preparation step
   */
  async updatePreparationStep(
    ticketId: string,
    stepIndex: number,
    status: 'completed' | 'skipped',
    notes?: string
  ): Promise<void> {
    try {
      const ticketRef = this.firestore
        .collection(TICKETS_COLLECTION)
        .doc(ticketId);

      const ticket = (await ticketRef.get()).data() as KitchenTicket;
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // Update step
      const updates: any = {
        [`preparationSteps.${stepIndex}.status`]: status,
        [`preparationSteps.${stepIndex}.completedAt`]: admin.firestore.FieldValue.serverTimestamp()
      };

      if (notes) {
        updates[`preparationSteps.${stepIndex}.notes`] = notes;
      }

      // Check if all steps completed
      const updatedSteps = [...ticket.preparationSteps];
      updatedSteps[stepIndex] = { ...updatedSteps[stepIndex], status };

      const allCompleted = updatedSteps.every(
        step => step.status === 'completed' || step.status === 'skipped'
      );

      if (allCompleted) {
        updates.status = TICKET_STATUS.READY;
      } else {
        // Move to next step
        const nextStepIndex = updatedSteps.findIndex(
          (step, idx) => idx > stepIndex && step.status === 'pending'
        );
        if (nextStepIndex !== -1) {
          updates.currentStep = nextStepIndex;
        }
      }

      await ticketRef.update(updates);

      // Update progress
      await this.updatePreparationProgress(ticket.tenantId, ticketId);

    } catch (error) {
      logger.error('Error updating preparation step:', error);
      throw error;
    }
  }

  /**
   * Get active tickets
   */
  async getActiveTickets(
    tenantId: string,
    stationId?: string
  ): Promise<KitchenTicket[]> {
    try {
      let query = this.firestore
        .collection(TICKETS_COLLECTION)
        .where('tenantId', '==', tenantId)
        .where('status', 'in', [
          TICKET_STATUS.NEW,
          TICKET_STATUS.VIEWED,
          TICKET_STATUS.IN_PROGRESS
        ]);

      if (stationId) {
        query = query.where('stations', 'array-contains', { stationId });
      }

      const snapshot = await query
        .orderBy('priorityScore', 'desc')
        .orderBy('createdAt', 'asc')
        .get();

      return snapshot.docs.map(doc => doc.data() as KitchenTicket);
    } catch (error) {
      logger.error('Error getting active tickets:', error);
      throw error;
    }
  }

  /**
   * Get station workload
   */
  async getStationWorkload(tenantId: string): Promise<StationWorkload[]> {
    try {
      // Get all stations
      const stationsSnapshot = await this.firestore
        .collection(STATIONS_COLLECTION)
        .where('tenantId', '==', tenantId)
        .where('active', '==', true)
        .get();

      const workloads: StationWorkload[] = [];

      for (const stationDoc of stationsSnapshot.docs) {
        const station = stationDoc.data() as KitchenStation;
        
        // Get active tickets for station
        const ticketsSnapshot = await this.firestore
          .collection(TICKETS_COLLECTION)
          .where('tenantId', '==', tenantId)
          .where('stations', 'array-contains', { stationId: station.id })
          .where('status', 'in', [TICKET_STATUS.NEW, TICKET_STATUS.IN_PROGRESS])
          .get();

        const activeTickets = ticketsSnapshot.size;
        const estimatedTime = ticketsSnapshot.docs
          .reduce((total, doc) => {
            const ticket = doc.data() as KitchenTicket;
            const stationData = ticket.stations.find(s => s.stationId === station.id);
            return total + (stationData?.estimatedTime || 0);
          }, 0);

        workloads.push({
          stationId: station.id,
          activeTickets,
          estimatedTime,
          efficiency: await this.getStationEfficiency(station.id),
          available: station.status === 'online' && activeTickets < station.capacity
        });
      }

      return workloads;
    } catch (error) {
      logger.error('Error getting station workload:', error);
      throw error;
    }
  }

  /**
   * Get kitchen performance metrics
   */
  async getPerformanceMetrics(
    tenantId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<KitchenPerformance> {
    try {
      const range = timeRange || {
        start: new Date(new Date().setHours(0, 0, 0, 0)),
        end: new Date()
      };

      // Get completed tickets in range
      const ticketsSnapshot = await this.firestore
        .collection(TICKETS_COLLECTION)
        .where('tenantId', '==', tenantId)
        .where('status', '==', TICKET_STATUS.SERVED)
        .where('createdAt', '>=', range.start)
        .where('createdAt', '<=', range.end)
        .get();

      const tickets = ticketsSnapshot.docs.map(doc => doc.data() as KitchenTicket);

      // Calculate metrics
      const avgPrepTime = tickets.length > 0
        ? tickets.reduce((sum, t) => sum + (t.metrics.prepTime || 0), 0) / tickets.length
        : 0;

      const avgWaitTime = tickets.length > 0
        ? tickets.reduce((sum, t) => sum + (t.metrics.waitTime || 0), 0) / tickets.length
        : 0;

      const throughput = tickets.length;

      const efficiency = this.calculateEfficiency(tickets);

      // Get station metrics
      const stationMetrics = await this.getStationMetrics(tenantId, range);

      return {
        avgPrepTime,
        avgWaitTime,
        throughput,
        efficiency,
        stationMetrics
      };
    } catch (error) {
      logger.error('Error getting performance metrics:', error);
      throw error;
    }
  }

  /**
   * Create kitchen alert
   */
  async createAlert(
    tenantId: string,
    alert: {
      type: 'prep_time' | 'queue_length' | 'efficiency' | 'station_offline';
      severity: 'warning' | 'critical';
      title: string;
      message: string;
      data?: any;
    }
  ): Promise<void> {
    try {
      const alertDoc: KitchenAlert = {
        id: uuidv4(),
        tenantId,
        ...alert,
        status: 'active',
        createdAt: new Date().toISOString(),
        acknowledged: false
      };

      await this.firestore
        .collection(ALERTS_COLLECTION)
        .doc(alertDoc.id)
        .set(alertDoc);

      // Send real-time notification
      await this.sendAlertNotification(alertDoc);

    } catch (error) {
      logger.error('Error creating kitchen alert:', error);
      throw error;
    }
  }

  /**
   * Optimize kitchen workflow
   */
  async optimizeWorkflow(tenantId: string): Promise<{
    recommendations: string[];
    optimizations: Array<{
      type: string;
      description: string;
      impact: string;
    }>;
  }> {
    try {
      const recommendations: string[] = [];
      const optimizations: Array<any> = [];

      // Get current performance
      const performance = await this.getPerformanceMetrics(tenantId);
      const workload = await this.getStationWorkload(tenantId);

      // Check preparation times
      if (performance.avgPrepTime > ALERT_THRESHOLDS.prepTime.warning) {
        recommendations.push('Durchschnittliche Zubereitungszeit ist hoch - zusätzliches Personal einsetzen');
        
        optimizations.push({
          type: 'staffing',
          description: 'Station mit längsten Wartezeiten verstärken',
          impact: 'Reduzierung der Zubereitungszeit um 20-30%'
        });
      }

      // Check station balance
      const imbalanced = this.checkStationBalance(workload);
      if (imbalanced) {
        recommendations.push('Ungleiche Auslastung der Stationen - Arbeitsverteilung optimieren');
        
        optimizations.push({
          type: 'routing',
          description: 'Automatische Lastverteilung aktivieren',
          impact: 'Gleichmäßigere Auslastung und kürzere Wartezeiten'
        });
      }

      // Check efficiency
      if (performance.efficiency < ALERT_THRESHOLDS.efficiency.warning) {
        recommendations.push('Niedrige Kücheneffizienz - Prozesse überprüfen');
        
        optimizations.push({
          type: 'process',
          description: 'Mise en Place optimieren und Arbeitsabläufe standardisieren',
          impact: 'Effizienzsteigerung um 15-25%'
        });
      }

      // Parallel processing opportunities
      const parallelOpportunities = await this.findParallelOpportunities(tenantId);
      if (parallelOpportunities.length > 0) {
        recommendations.push('Möglichkeiten für parallele Verarbeitung identifiziert');
        
        optimizations.push({
          type: 'parallel',
          description: 'Bestimmte Gerichte können parallel zubereitet werden',
          impact: 'Zeitersparnis von 10-15 Minuten pro Bestellung'
        });
      }

      return {
        recommendations,
        optimizations
      };
    } catch (error) {
      logger.error('Error optimizing workflow:', error);
      throw error;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Route order to stations
   */
  private async routeOrderToStations(
    tenantId: string,
    items: any[]
  ): Promise<OrderRoutingResult> {
    // Get station configurations
    const stations = await this.getStations(tenantId);
    const routing: OrderRoutingResult = {
      stations: [],
      totalTime: 0,
      parallelizable: true
    };

    // Group items by station
    const stationItems = new Map<string, any[]>();
    
    for (const item of items) {
      const station = this.findBestStation(item, stations);
      if (!station) continue;

      if (!stationItems.has(station.id)) {
        stationItems.set(station.id, []);
      }
      stationItems.get(station.id)!.push(item);
    }

    // Calculate timing for each station
    let maxTime = 0;
    for (const [stationId, stationItemList] of stationItems.entries()) {
      const station = stations.find(s => s.id === stationId)!;
      const estimatedTime = this.calculateStationTime(stationItemList, station);
      
      routing.stations.push({
        stationId,
        items: stationItemList.map(i => i.id),
        priority: this.calculateStationPriority(station, stationItemList),
        estimatedTime
      });

      maxTime = Math.max(maxTime, estimatedTime);
    }

    routing.totalTime = maxTime;
    routing.parallelizable = routing.stations.length > 1;

    return routing;
  }

  /**
   * Calculate priority
   */
  private calculatePriority(factors: {
    waitTime: number;
    orderType: string;
    customerType?: string;
    itemCount: number;
    complexity: number;
  }): TicketPriority {
    const normalizedFactors = {
      waitTime: Math.min(factors.waitTime / 30, 1), // Normalize to 0-1
      orderType: ORDER_TYPE_PRIORITY[factors.orderType as keyof typeof ORDER_TYPE_PRIORITY] / 3,
      customerType: factors.customerType 
        ? CUSTOMER_TYPE_PRIORITY[factors.customerType as keyof typeof CUSTOMER_TYPE_PRIORITY] / 3 
        : 0.5,
      itemCount: Math.min(factors.itemCount / 10, 1),
      complexity: factors.complexity
    };

    const score = Object.entries(PRIORITY_WEIGHTS).reduce((total, [key, weight]) => {
      return total + (normalizedFactors[key as keyof typeof normalizedFactors] * weight);
    }, 0);

    let level: TicketPriority['level'] = 'normal';
    if (score >= 0.8) level = 'urgent';
    else if (score >= 0.6) level = 'high';
    else if (score <= 0.3) level = 'low';

    return {
      score,
      factors: normalizedFactors as any,
      level
    };
  }

  /**
   * Calculate complexity
   */
  private calculateComplexity(items: any[]): number {
    let complexity = 0;
    
    items.forEach(item => {
      complexity += 0.1; // Base complexity per item
      
      // Add complexity for modifiers
      if (item.modifiers && item.modifiers.length > 0) {
        complexity += item.modifiers.length * 0.05;
      }
      
      // Add complexity for special notes
      if (item.notes) {
        complexity += 0.1;
      }
      
      // Add complexity for quantity
      complexity += (item.quantity - 1) * 0.05;
    });

    return Math.min(complexity, 1); // Cap at 1
  }

  /**
   * Create preparation steps
   */
  private async createPreparationSteps(items: any[]): Promise<PreparationStep[]> {
    const steps: PreparationStep[] = [];
    
    // Group items by preparation type
    const prepGroups = this.groupByPreparation(items);
    
    // Create steps for each group
    let stepIndex = 0;
    for (const [prepType, groupItems] of prepGroups.entries()) {
      steps.push({
        index: stepIndex++,
        name: this.getPreparationName(prepType),
        description: `${groupItems.map(i => `${i.quantity}x ${i.name}`).join(', ')}`,
        estimatedTime: this.estimatePreparationTime(prepType, groupItems),
        status: 'pending',
        dependencies: this.getPreparationDependencies(prepType)
      });
    }

    return steps;
  }

  /**
   * Update real-time queue
   */
  private async updateRealtimeQueue(
    tenantId: string,
    ticket: KitchenTicket
  ): Promise<void> {
    await this.db.ref(`kitchen/${tenantId}/queue/${ticket.id}`).set({
      orderNumber: ticket.orderNumber,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt
    });
  }

  /**
   * Update real-time status
   */
  private async updateRealtimeStatus(
    tenantId: string,
    ticketId: string,
    status: string
  ): Promise<void> {
    await this.db.ref(`kitchen/${tenantId}/queue/${ticketId}/status`).set(status);
    
    if (status === TICKET_STATUS.SERVED) {
      // Remove from queue after a delay
      setTimeout(async () => {
        await this.db.ref(`kitchen/${tenantId}/queue/${ticketId}`).remove();
      }, 5000);
    }
  }

  /**
   * Notify stations
   */
  private async notifyStations(ticket: KitchenTicket): Promise<void> {
    for (const station of ticket.stations) {
      await this.db.ref(`kitchen/${ticket.tenantId}/stations/${station.stationId}/newTickets`).push({
        ticketId: ticket.id,
        orderNumber: ticket.orderNumber,
        priority: ticket.priority,
        timestamp: admin.database.ServerValue.TIMESTAMP
      });
    }
  }

  /**
   * Check kitchen alerts
   */
  private async checkKitchenAlerts(tenantId: string): Promise<void> {
    // Check queue length
    const activeTickets = await this.getActiveTickets(tenantId);
    
    if (activeTickets.length >= ALERT_THRESHOLDS.queueLength.critical) {
      await this.createAlert(tenantId, {
        type: 'queue_length',
        severity: 'critical',
        title: 'Kritische Warteschlangenlänge',
        message: `${activeTickets.length} aktive Bestellungen in der Warteschlange`,
        data: { queueLength: activeTickets.length }
      });
    } else if (activeTickets.length >= ALERT_THRESHOLDS.queueLength.warning) {
      await this.createAlert(tenantId, {
        type: 'queue_length',
        severity: 'warning',
        title: 'Hohe Warteschlangenlänge',
        message: `${activeTickets.length} aktive Bestellungen in der Warteschlange`,
        data: { queueLength: activeTickets.length }
      });
    }

    // Check average prep time
    const performance = await this.getPerformanceMetrics(tenantId);
    
    if (performance.avgPrepTime >= ALERT_THRESHOLDS.prepTime.critical) {
      await this.createAlert(tenantId, {
        type: 'prep_time',
        severity: 'critical',
        title: 'Kritische Zubereitungszeit',
        message: `Durchschnittliche Zubereitungszeit: ${Math.round(performance.avgPrepTime)} Minuten`,
        data: { avgPrepTime: performance.avgPrepTime }
      });
    }
  }

  /**
   * Handle ticket completion
   */
  private async handleTicketCompletion(
    tenantId: string,
    ticket: KitchenTicket
  ): Promise<void> {
    // Notify front of house
    await this.db.ref(`kitchen/${tenantId}/ready/${ticket.id}`).set({
      orderNumber: ticket.orderNumber,
      customerName: ticket.customerName,
      completedAt: admin.database.ServerValue.TIMESTAMP
    });

    // Update order status
    // This would trigger order status update in the main system
  }

  /**
   * Update kitchen metrics
   */
  private async updateKitchenMetrics(
    tenantId: string,
    ticket: KitchenTicket,
    metrics: any
  ): Promise<void> {
    const metricsRef = this.db.ref(`kitchen/${tenantId}/metrics/daily/${format(new Date(), 'yyyy-MM-dd')}`);
    
    await metricsRef.transaction(current => {
      if (!current) {
        current = {
          totalOrders: 0,
          totalPrepTime: 0,
          totalWaitTime: 0,
          avgPrepTime: 0,
          avgWaitTime: 0
        };
      }

      current.totalOrders++;
      current.totalPrepTime += metrics.prepTime || 0;
      current.totalWaitTime += metrics.waitTime || 0;
      current.avgPrepTime = current.totalPrepTime / current.totalOrders;
      current.avgWaitTime = current.totalWaitTime / current.totalOrders;

      return current;
    });
  }

  /**
   * Get stations
   */
  private async getStations(tenantId: string): Promise<KitchenStation[]> {
    const snapshot = await this.firestore
      .collection(STATIONS_COLLECTION)
      .where('tenantId', '==', tenantId)
      .where('active', '==', true)
      .get();

    return snapshot.docs.map(doc => doc.data() as KitchenStation);
  }

  /**
   * Find best station for item
   */
  private findBestStation(item: any, stations: KitchenStation[]): KitchenStation | null {
    // Find stations that can handle this item category
    const capableStations = stations.filter(station => 
      station.capabilities.includes(item.category || 'general')
    );

    if (capableStations.length === 0) {
      // Fallback to general station
      return stations.find(s => s.capabilities.includes('general')) || null;
    }

    // Return station with lowest current load
    // In real implementation, this would check current workload
    return capableStations[0];
  }

  /**
   * Calculate station time
   */
  private calculateStationTime(items: any[], station: KitchenStation): number {
    const baseTime = items.reduce((total, item) => {
      const itemTime = station.avgPrepTimes[item.category] || station.avgPrepTimes.default || 5;
      return total + (itemTime * item.quantity);
    }, 0);

    // Apply efficiency factor
    return Math.round(baseTime / (station.efficiency || 1));
  }

  /**
   * Calculate station priority
   */
  private calculateStationPriority(station: KitchenStation, items: any[]): number {
    // Priority based on station type and items
    let priority = 1;
    
    // Hot food stations get higher priority
    if (station.type === 'hot') priority += 0.5;
    
    // More items = higher priority
    priority += Math.min(items.length * 0.1, 0.5);
    
    return priority;
  }

  /**
   * Update preparation progress
   */
  private async updatePreparationProgress(
    tenantId: string,
    ticketId: string
  ): Promise<void> {
    const ticket = await this.firestore
      .collection(TICKETS_COLLECTION)
      .doc(ticketId)
      .get();

    if (!ticket.exists) return;

    const ticketData = ticket.data() as KitchenTicket;
    const completedSteps = ticketData.preparationSteps.filter(
      s => s.status === 'completed' || s.status === 'skipped'
    ).length;

    const progress: PreparationProgress = {
      ticketId,
      completedSteps,
      totalSteps: ticketData.preparationSteps.length,
      percentage: (completedSteps / ticketData.preparationSteps.length) * 100,
      currentStep: ticketData.preparationSteps[ticketData.currentStep],
      estimatedCompletion: ticketData.estimatedCompletionTime
    };

    await this.db.ref(`kitchen/${tenantId}/progress/${ticketId}`).set(progress);
  }

  /**
   * Get station efficiency
   */
  private async getStationEfficiency(stationId: string): Promise<number> {
    // In real implementation, this would calculate based on historical data
    return 0.85;
  }

  /**
   * Calculate efficiency
   */
  private calculateEfficiency(tickets: KitchenTicket[]): number {
    if (tickets.length === 0) return 1;

    const efficiencies = tickets
      .map(t => t.metrics.efficiency)
      .filter(e => e !== null) as number[];

    if (efficiencies.length === 0) return 0.8;

    return efficiencies.reduce((sum, e) => sum + e, 0) / efficiencies.length;
  }

  /**
   * Get station metrics
   */
  private async getStationMetrics(
    tenantId: string,
    range: { start: Date; end: Date }
  ): Promise<Array<{ stationId: string; metrics: KitchenMetrics }>> {
    // In real implementation, this would aggregate metrics by station
    return [];
  }

  /**
   * Check station balance
   */
  private checkStationBalance(workload: StationWorkload[]): boolean {
    if (workload.length < 2) return false;

    const loads = workload.map(w => w.activeTickets);
    const avg = loads.reduce((sum, l) => sum + l, 0) / loads.length;
    const maxDeviation = Math.max(...loads.map(l => Math.abs(l - avg)));

    return maxDeviation > avg * 0.5; // 50% deviation threshold
  }

  /**
   * Find parallel opportunities
   */
  private async findParallelOpportunities(tenantId: string): Promise<any[]> {
    // Analyze current tickets for items that could be prepared in parallel
    return [];
  }

  /**
   * Send alert notification
   */
  private async sendAlertNotification(alert: KitchenAlert): Promise<void> {
    await this.db.ref(`kitchen/${alert.tenantId}/alerts/active`).push(alert);
  }

  /**
   * Group items by preparation type
   */
  private groupByPreparation(items: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>();
    
    items.forEach(item => {
      const prepType = this.getItemPreparationType(item);
      if (!groups.has(prepType)) {
        groups.set(prepType, []);
      }
      groups.get(prepType)!.push(item);
    });

    return groups;
  }

  /**
   * Get item preparation type
   */
  private getItemPreparationType(item: any): string {
    // Simplified - in real implementation would use item metadata
    if (item.category === 'grill') return 'grill';
    if (item.category === 'fryer') return 'fryer';
    if (item.category === 'cold') return 'cold';
    return 'general';
  }

  /**
   * Get preparation name
   */
  private getPreparationName(prepType: string): string {
    const names: Record<string, string> = {
      grill: 'Grill-Station',
      fryer: 'Fritteuse',
      cold: 'Kalte Küche',
      general: 'Allgemeine Zubereitung'
    };
    return names[prepType] || prepType;
  }

  /**
   * Estimate preparation time
   */
  private estimatePreparationTime(prepType: string, items: any[]): number {
    const baseTimes: Record<string, number> = {
      grill: 8,
      fryer: 5,
      cold: 3,
      general: 5
    };
    
    const baseTime = baseTimes[prepType] || 5;
    const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
    
    return Math.round(baseTime + (quantity - 1) * 2);
  }

  /**
   * Get preparation dependencies
   */
  private getPreparationDependencies(prepType: string): number[] {
    // Some prep types depend on others
    const dependencies: Record<string, number[]> = {
      'plating': [0, 1, 2], // Plating depends on all cooking steps
      'garnish': [0, 1] // Garnish depends on main prep
    };
    
    return dependencies[prepType] || [];
  }

  /**
   * Remove ticket from display
   */
  async removeTicket(tenantId: string, ticketId: string): Promise<void> {
    try {
      await this.updateTicketStatus(tenantId, ticketId, TICKET_STATUS.SERVED);
    } catch (error) {
      logger.error('Error removing ticket:', error);
      throw error;
    }
  }
}