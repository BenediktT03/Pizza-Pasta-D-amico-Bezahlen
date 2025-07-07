/**
 * Emergency Handler Service
 *
 * Automatische Notfall-Erkennung und Reaktion für Foodtrucks
 * Schweizer Multi-Tenant System mit FADP Compliance
 *
 * @author Benedikt Thomma <benedikt@thomma.ch>
 */

import { getFirestore } from 'firebase-admin/firestore';
import { OpenAI } from 'openai';
import { aiConfig } from '../config/ai.config';
import {
  EmergencyContext,
  EmergencyResponse,
  EmergencyType,
  NotificationChannel
} from '../types/ai.types';
import { formatCurrency, getCurrentSwissTime, sendNotification } from '../utils/ai.utils';

export class EmergencyHandler {
  private openai: OpenAI;
  private db: FirebaseFirestore.Firestore;
  private emergencyThreshold: number;
  private activeEmergencies: Map<string, EmergencyResponse> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.db = getFirestore();
    this.emergencyThreshold = aiConfig.emergency.threshold;
  }

  /**
   * Initialisiert den Emergency Handler
   */
  async initialize(): Promise<void> {
    console.log('🚨 Initializing Emergency Handler...');

    // Start continuous monitoring
    if (aiConfig.emergency.continuousMonitoring) {
      this.startContinuousMonitoring();
    }

    console.log('✅ Emergency Handler initialized');
  }

  /**
   * Startet kontinuierliches Monitoring
   */
  private startContinuousMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.monitorAllTenants();
      } catch (error) {
        console.error('Error in continuous monitoring:', error);
      }
    }, aiConfig.emergency.monitoringInterval);
  }

  /**
   * Überwacht alle aktiven Tenants
   */
  private async monitorAllTenants(): Promise<void> {
    const tenantsSnapshot = await this.db
      .collection('tenants')
      .where('status', '==', 'active')
      .get();

    const monitoringPromises = tenantsSnapshot.docs.map(doc =>
      this.checkTenantEmergency(doc.id).catch(error =>
        console.error(`Error monitoring tenant ${doc.id}:`, error)
      )
    );

    await Promise.all(monitoringPromises);
  }

  /**
   * Prüft spezifischen Tenant auf Notfälle
   */
  async checkTenantEmergency(tenantId: string): Promise<EmergencyResponse | null> {
    try {
      // Sammle aktuelle Metriken
      const context = await this.gatherEmergencyContext(tenantId);

      // AI-basierte Notfall-Analyse
      const emergencyAnalysis = await this.analyzeEmergencyRisk(context);

      if (emergencyAnalysis.riskLevel >= this.emergencyThreshold) {
        return await this.activateEmergencyMode(tenantId, emergencyAnalysis);
      }

      return null;
    } catch (error) {
      console.error(`Emergency check failed for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Sammelt Kontext für Notfall-Analyse
   */
  private async gatherEmergencyContext(tenantId: string): Promise<EmergencyContext> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Parallele Datensammlung
    const [
      tenantDoc,
      recentOrders,
      staffStatus,
      kitchenMetrics,
      inventoryStatus,
      weatherData
    ] = await Promise.all([
      this.db.collection('tenants').doc(tenantId).get(),
      this.getRecentOrders(tenantId, oneHourAgo),
      this.getStaffStatus(tenantId),
      this.getKitchenMetrics(tenantId, oneHourAgo),
      this.getInventoryStatus(tenantId),
      this.getCurrentWeatherData(tenantId)
    ]);

    const tenant = tenantDoc.data();
    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    // Historische Vergleichsdaten
    const historicalOrders = await this.getHistoricalOrderPattern(tenantId, oneDayAgo);

    return {
      tenantId,
      tenantName: tenant.name,
      currentTime: getCurrentSwissTime(),

      // Orders & Queue
      currentOrders: recentOrders.length,
      ordersLastHour: recentOrders.length,
      averageOrdersThisTime: historicalOrders.averageForTimeOfDay,
      queueLength: recentOrders.filter(o => ['pending', 'preparing'].includes(o.status)).length,

      // Kitchen & Staff
      staffPresent: staffStatus.present,
      staffRequired: staffStatus.required,
      kitchenUtilization: kitchenMetrics.utilization,
      averagePreparationTime: kitchenMetrics.avgPrepTime,

      // Inventory
      lowStockItems: inventoryStatus.lowStock,
      outOfStockItems: inventoryStatus.outOfStock,
      criticalSupplies: inventoryStatus.critical,

      // External Factors
      weather: weatherData,
      location: tenant.locations?.[0]?.coordinates,
      operatingHours: tenant.operatingHours,

      // Financial
      revenueToday: recentOrders.reduce((sum, order) => sum + (order.total || 0), 0),
      averageOrderValue: recentOrders.length > 0
        ? recentOrders.reduce((sum, order) => sum + (order.total || 0), 0) / recentOrders.length
        : 0,

      // System Health
      systemErrors: await this.getSystemErrors(tenantId, oneHourAgo),
      paymentIssues: await this.getPaymentIssues(tenantId, oneHourAgo)
    };
  }

  /**
   * AI-basierte Notfall-Risikoanalyse
   */
  private async analyzeEmergencyRisk(context: EmergencyContext): Promise<{
    riskLevel: number;
    emergencyType: EmergencyType;
    confidence: number;
    reasons: string[];
    recommendations: string[];
  }> {
    const prompt = this.buildEmergencyAnalysisPrompt(context);

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: `Du bist ein AI-Experte für Schweizer Foodtruck-Notfall-Management.
                   Analysiere die Situation und bewerte das Notfall-Risiko.
                   Berücksichtige Swiss Standards, Arbeitszeit-Gesetze und kulturelle Faktoren.
                   Antworte nur in validem JSON.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    try {
      const analysis = JSON.parse(completion.choices[0].message.content!);
      return {
        riskLevel: analysis.riskLevel || 0,
        emergencyType: analysis.emergencyType || EmergencyType.UNKNOWN,
        confidence: analysis.confidence || 0,
        reasons: analysis.reasons || [],
        recommendations: analysis.recommendations || []
      };
    } catch (error) {
      console.error('Failed to parse AI emergency analysis:', error);
      return {
        riskLevel: 0,
        emergencyType: EmergencyType.UNKNOWN,
        confidence: 0,
        reasons: ['AI Analysis Error'],
        recommendations: ['Manual Review Required']
      };
    }
  }

  /**
   * Erstellt Prompt für Emergency Analysis
   */
  private buildEmergencyAnalysisPrompt(context: EmergencyContext): string {
    return `
Analyse die folgende Foodtruck-Situation für potentielle Notfälle:

AKTUELLER KONTEXT:
- Tenant: ${context.tenantName} (${context.tenantId})
- Zeit: ${context.currentTime}
- Aktuelle Bestellungen: ${context.currentOrders}
- Warteschlange: ${context.queueLength}
- Durchschnitt für diese Tageszeit: ${context.averageOrdersThisTime}

PERSONAL & KÜCHE:
- Personal anwesend: ${context.staffPresent}/${context.staffRequired}
- Küchen-Auslastung: ${Math.round(context.kitchenUtilization * 100)}%
- Ø Zubereitungszeit: ${context.averagePreparationTime}min

INVENTAR:
- Wenig Vorrat: ${context.lowStockItems.length} Artikel
- Ausverkauft: ${context.outOfStockItems.length} Artikel
- Kritische Supplies: ${context.criticalSupplies.length}

EXTERNE FAKTOREN:
- Wetter: ${context.weather?.condition} (${context.weather?.temperature}°C)
- System-Fehler letzte Stunde: ${context.systemErrors}
- Payment-Probleme: ${context.paymentIssues}

FINANZEN:
- Umsatz heute: ${formatCurrency(context.revenueToday, 'CHF')}
- Ø Bestellwert: ${formatCurrency(context.averageOrderValue, 'CHF')}

Bewerte das Notfall-Risiko (0.0-1.0) und identifiziere den Notfall-Typ:

NOTFALL-TYPEN:
- KITCHEN_OVERLOAD: Küche überlastet
- STAFF_SHORTAGE: Personalmangel
- INVENTORY_CRITICAL: Kritischer Inventar-Mangel
- EQUIPMENT_FAILURE: Geräte-Ausfall
- WEATHER_EMERGENCY: Wetter-Notfall
- PAYMENT_FAILURE: Zahlungs-Probleme
- SYSTEM_DOWN: System-Ausfall
- CROWD_CONTROL: Besucherandrang
- SUPPLY_CHAIN: Lieferketten-Problem

Antworte in folgendem JSON-Format:
{
  "riskLevel": 0.0-1.0,
  "emergencyType": "EMERGENCY_TYPE",
  "confidence": 0.0-1.0,
  "reasons": ["Grund 1", "Grund 2"],
  "recommendations": ["Empfehlung 1", "Empfehlung 2"]
}`;
  }

  /**
   * Aktiviert Emergency Mode
   */
  async activateEmergencyMode(
    tenantId: string,
    analysis: any
  ): Promise<EmergencyResponse> {
    console.log(`🚨 EMERGENCY DETECTED for ${tenantId}: ${analysis.emergencyType}`);

    const emergencyId = `emrg_${tenantId}_${Date.now()}`;
    const activatedAt = new Date();

    // Erstelle Emergency Response
    const emergencyResponse: EmergencyResponse = {
      id: emergencyId,
      tenantId,
      type: analysis.emergencyType,
      riskLevel: analysis.riskLevel,
      confidence: analysis.confidence,
      reasons: analysis.reasons,
      activatedAt,
      status: 'active',

      // AI-generierte Sofortmaßnahmen
      immediateActions: await this.generateImmediateActions(tenantId, analysis),

      // Automatische Anpassungen
      autoAdjustments: await this.applyAutoAdjustments(tenantId, analysis),

      // Kommunikation
      notifications: await this.sendEmergencyNotifications(tenantId, analysis),

      // Monitoring
      monitoringActions: this.setupEmergencyMonitoring(tenantId, analysis)
    };

    // Speichere Emergency Response
    await this.db.collection('emergencies').doc(emergencyId).set({
      ...emergencyResponse,
      activatedAt: activatedAt
    });

    // Cache active emergency
    this.activeEmergencies.set(tenantId, emergencyResponse);

    // Update Tenant Status
    await this.db.collection('tenants').doc(tenantId).update({
      'status.emergency': {
        active: true,
        type: analysis.emergencyType,
        activatedAt,
        emergencyId
      }
    });

    return emergencyResponse;
  }

  /**
   * Generiert Sofortmaßnahmen
   */
  private async generateImmediateActions(
    tenantId: string,
    analysis: any
  ): Promise<string[]> {
    const baseActions = this.getBaseEmergencyActions(analysis.emergencyType);

    // AI-basierte Anpassung der Maßnahmen
    const prompt = `
Tenant ${tenantId} hat einen ${analysis.emergencyType} Notfall.
Gründe: ${analysis.reasons.join(', ')}

Basis-Maßnahmen: ${baseActions.join(', ')}

Generiere 3-5 spezifische, sofort umsetzbare Maßnahmen für diese Situation.
Berücksichtige Schweizer Arbeitsgesetze und Foodtruck-Standards.

Antworte als JSON Array: ["Maßnahme 1", "Maßnahme 2", ...]`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: 'Du bist ein Experte für Foodtruck-Notfall-Management.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 1000
      });

      const aiActions = JSON.parse(completion.choices[0].message.content!);
      return [...baseActions, ...aiActions];
    } catch (error) {
      console.error('Failed to generate AI actions:', error);
      return baseActions;
    }
  }

  /**
   * Basis Emergency Actions je Typ
   */
  private getBaseEmergencyActions(emergencyType: EmergencyType): string[] {
    const actions = {
      [EmergencyType.KITCHEN_OVERLOAD]: [
        'Bestellannahme temporär pausieren',
        'Einfache Menü-Items priorisieren',
        'Zusätzliches Personal rufen',
        'Wartezeiten an Kunden kommunizieren'
      ],
      [EmergencyType.STAFF_SHORTAGE]: [
        'Backup-Personal kontaktieren',
        'Menü vereinfachen',
        'Schichten umorganisieren',
        'Öffnungszeiten anpassen'
      ],
      [EmergencyType.INVENTORY_CRITICAL]: [
        'Betroffene Items deaktivieren',
        'Notfall-Lieferung organisieren',
        'Alternative Zutaten nutzen',
        'Kunden über Verfügbarkeit informieren'
      ],
      [EmergencyType.EQUIPMENT_FAILURE]: [
        'Backup-Equipment aktivieren',
        'Techniker rufen',
        'Menü an verfügbare Geräte anpassen',
        'Alternative Standorte prüfen'
      ],
      [EmergencyType.WEATHER_EMERGENCY]: [
        'Wetterschutz aktivieren',
        'Sicherheit des Personals prüfen',
        'Evtl. Location wechseln',
        'Kunden warnen'
      ],
      [EmergencyType.PAYMENT_FAILURE]: [
        'Backup-Zahlungsanbieter aktivieren',
        'Nur-Bar-Modus aktivieren',
        'IT-Support kontaktieren',
        'Kunden über Zahlungsoptionen informieren'
      ]
    };

    return actions[emergencyType] || ['Manuelle Überprüfung erforderlich'];
  }

  /**
   * Wendet automatische Anpassungen an
   */
  private async applyAutoAdjustments(
    tenantId: string,
    analysis: any
  ): Promise<Record<string, any>> {
    const adjustments: Record<string, any> = {};

    try {
      switch (analysis.emergencyType) {
        case EmergencyType.KITCHEN_OVERLOAD:
          // Reduziere komplexe Items
          adjustments.menuReduction = await this.reduceComplexMenuItems(tenantId);
          // Erhöhe Wartezeiten
          adjustments.waitTimeIncrease = await this.adjustWaitTimes(tenantId, 1.5);
          break;

        case EmergencyType.STAFF_SHORTAGE:
          // Vereinfache Menü drastisch
          adjustments.menuSimplification = await this.simplifyMenu(tenantId);
          // Reduziere Kapazität
          adjustments.capacityReduction = await this.reduceCapacity(tenantId, 0.6);
          break;

        case EmergencyType.INVENTORY_CRITICAL:
          // Deaktiviere betroffene Items
          adjustments.itemDeactivation = await this.deactivateAffectedItems(tenantId);
          break;

        case EmergencyType.PAYMENT_FAILURE:
          // Aktiviere nur Cash
          adjustments.cashOnlyMode = await this.activateCashOnlyMode(tenantId);
          break;
      }

      return adjustments;
    } catch (error) {
      console.error('Failed to apply auto adjustments:', error);
      return {};
    }
  }

  /**
   * Sendet Emergency Notifications
   */
  private async sendEmergencyNotifications(
    tenantId: string,
    analysis: any
  ): Promise<string[]> {
    const sentNotifications: string[] = [];

    try {
      // Owner/Manager Benachrichtigung
      const ownerNotification = await sendNotification(tenantId, {
        type: 'emergency_alert',
        channel: NotificationChannel.SMS,
        recipient: 'owner',
        title: `🚨 NOTFALL: ${analysis.emergencyType}`,
        message: `Automatischer Notfall erkannt. Sofortmaßnahmen wurden eingeleitet. Gründe: ${analysis.reasons.join(', ')}`,
        priority: 'critical',
        actions: [
          { label: 'Details anzeigen', url: `/emergency/${tenantId}` },
          { label: 'Deaktivieren', action: 'deactivate_emergency' }
        ]
      });
      sentNotifications.push(ownerNotification);

      // Staff Benachrichtigung
      const staffNotification = await sendNotification(tenantId, {
        type: 'emergency_staff',
        channel: NotificationChannel.PUSH,
        recipient: 'staff',
        title: `Notfall-Modus aktiviert`,
        message: `Bitte folgt den Emergency Procedures. Typ: ${analysis.emergencyType}`,
        priority: 'high'
      });
      sentNotifications.push(staffNotification);

      // Kunden Information (wenn nötig)
      if (this.shouldNotifyCustomers(analysis.emergencyType)) {
        const customerNotification = await sendNotification(tenantId, {
          type: 'service_disruption',
          channel: NotificationChannel.APP,
          recipient: 'customers',
          title: 'Service-Information',
          message: 'Aufgrund hoher Nachfrage kann es zu längeren Wartezeiten kommen. Danke für Ihr Verständnis.',
          priority: 'medium'
        });
        sentNotifications.push(customerNotification);
      }

      return sentNotifications;
    } catch (error) {
      console.error('Failed to send emergency notifications:', error);
      return [];
    }
  }

  /**
   * Deaktiviert Emergency Mode
   */
  async deactivateEmergencyMode(tenantId: string, reason?: string): Promise<void> {
    const activeEmergency = this.activeEmergencies.get(tenantId);
    if (!activeEmergency) {
      throw new Error(`No active emergency found for tenant ${tenantId}`);
    }

    // Update Emergency Record
    await this.db.collection('emergencies').doc(activeEmergency.id).update({
      status: 'resolved',
      resolvedAt: new Date(),
      resolvedBy: 'manual',
      resolutionReason: reason || 'Manual deactivation'
    });

    // Update Tenant Status
    await this.db.collection('tenants').doc(tenantId).update({
      'status.emergency': {
        active: false,
        lastEmergency: activeEmergency.type,
        resolvedAt: new Date()
      }
    });

    // Remove from active emergencies
    this.activeEmergencies.delete(tenantId);

    // Revert auto adjustments
    await this.revertAutoAdjustments(tenantId, activeEmergency);

    console.log(`✅ Emergency mode deactivated for tenant ${tenantId}`);
  }

  /**
   * Health Check
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test OpenAI connection
      await this.openai.models.list();

      // Test Firestore connection
      await this.db.collection('_health').doc('ai_emergency').set({
        lastCheck: new Date(),
        service: 'emergency-handler'
      });

      return true;
    } catch (error) {
      console.error('Emergency Handler health check failed:', error);
      return false;
    }
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.activeEmergencies.clear();
    console.log('Emergency Handler shut down');
  }

  // Helper Methods
  private async getRecentOrders(tenantId: string, since: Date) {
    const snapshot = await this.db
      .collection(`tenants/${tenantId}/orders`)
      .where('createdAt', '>=', since)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  private async getStaffStatus(tenantId: string) {
    // Implementation für Staff Status
    return { present: 2, required: 3 };
  }

  private async getKitchenMetrics(tenantId: string, since: Date) {
    // Implementation für Kitchen Metrics
    return { utilization: 0.85, avgPrepTime: 12 };
  }

  private async getInventoryStatus(tenantId: string) {
    // Implementation für Inventory Status
    return { lowStock: [], outOfStock: [], critical: [] };
  }

  private async getCurrentWeatherData(tenantId: string) {
    // Implementation für Weather Data
    return { condition: 'sunny', temperature: 22 };
  }

  private async getHistoricalOrderPattern(tenantId: string, since: Date) {
    // Implementation für Historical Pattern
    return { averageForTimeOfDay: 15 };
  }

  private async getSystemErrors(tenantId: string, since: Date): Promise<number> {
    return 0;
  }

  private async getPaymentIssues(tenantId: string, since: Date): Promise<number> {
    return 0;
  }

  private shouldNotifyCustomers(emergencyType: EmergencyType): boolean {
    return [
      EmergencyType.KITCHEN_OVERLOAD,
      EmergencyType.EQUIPMENT_FAILURE,
      EmergencyType.WEATHER_EMERGENCY
    ].includes(emergencyType);
  }

  private setupEmergencyMonitoring(tenantId: string, analysis: any): string[] {
    return ['monitor_queue_length', 'monitor_preparation_times', 'monitor_staff_status'];
  }

  private async reduceComplexMenuItems(tenantId: string): Promise<any> {
    // Implementation
    return { itemsReduced: 5 };
  }

  private async adjustWaitTimes(tenantId: string, multiplier: number): Promise<any> {
    // Implementation
    return { newWaitTime: 15 };
  }

  private async simplifyMenu(tenantId: string): Promise<any> {
    // Implementation
    return { itemsRemaining: 8 };
  }

  private async reduceCapacity(tenantId: string, factor: number): Promise<any> {
    // Implementation
    return { newCapacity: 30 };
  }

  private async deactivateAffectedItems(tenantId: string): Promise<any> {
    // Implementation
    return { itemsDeactivated: 3 };
  }

  private async activateCashOnlyMode(tenantId: string): Promise<any> {
    // Implementation
    return { cashOnlyActive: true };
  }

  private async revertAutoAdjustments(tenantId: string, emergency: EmergencyResponse): Promise<void> {
    // Implementation
  }
}
