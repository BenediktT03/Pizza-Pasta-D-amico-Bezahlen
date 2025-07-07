/**
 * Competitor Monitor Service
 *
 * Automatische Überwachung und Analyse der Konkurrenz
 * Schweizer Foodtruck-Markt Intelligence
 *
 * @author Benedikt Thomma <benedikt@thomma.ch>
 */

import { getFirestore } from 'firebase-admin/firestore';
import { OpenAI } from 'openai';
import { aiConfig } from '../config/ai.config';
import {
  CompetitorAlert,
  CompetitorAnalysis,
  CompetitorData,
  PricingComparison
} from '../types/ai.types';
import {
  calculateDistance,
  formatCurrency,
  sendNotification
} from '../utils/ai.utils';

export class CompetitorMonitor {
  private openai: OpenAI;
  private db: FirebaseFirestore.Firestore;
  private competitorCache: Map<string, CompetitorData[]> = new Map();
  private analysisCache: Map<string, CompetitorAnalysis> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.db = getFirestore();
  }

  /**
   * Initialisiert den Competitor Monitor
   */
  async initialize(): Promise<void> {
    console.log('🔍 Initializing Competitor Monitor...');

    // Lade bekannte Konkurrenten
    await this.loadKnownCompetitors();

    // Starte kontinuierliches Monitoring
    this.startContinuousMonitoring();

    console.log('✅ Competitor Monitor initialized');
  }

  /**
   * Analysiert Konkurrenz für einen Tenant
   */
  async analyzeCompetitors(tenantId: string): Promise<CompetitorAnalysis> {
    try {
      console.log(`🔍 Analyzing competitors for tenant ${tenantId}`);

      // Cache Check
      const cacheKey = `analysis_${tenantId}`;
      const cached = this.analysisCache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        return cached;
      }

      // Hole Tenant Daten
      const tenantDoc = await this.db.collection('tenants').doc(tenantId).get();
      const tenant = tenantDoc.data();

      if (!tenant) {
        throw new Error(`Tenant ${tenantId} not found`);
      }

      // Finde Konkurrenten
      const competitors = await this.findCompetitors(tenant);

      // Sammle Konkurrenzdaten
      const competitorData = await this.gatherCompetitorData(competitors, tenant);

      // Führe AI-basierte Analyse durch
      const analysis = await this.performCompetitorAnalysis(tenantId, tenant, competitorData);

      // Cache Result
      this.analysisCache.set(cacheKey, analysis);

      // Speichere Analysis Log
      await this.logAnalysis(tenantId, analysis);

      return analysis;
    } catch (error) {
      console.error(`Competitor analysis failed for ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Findet relevante Konkurrenten
   */
  private async findCompetitors(tenant: any): Promise<CompetitorData[]> {
    const competitors: CompetitorData[] = [];

    if (!tenant.locations?.[0]?.coordinates) {
      console.warn('No location data for tenant, skipping competitor search');
      return competitors;
    }

    const location = tenant.locations[0].coordinates;
    const cuisine = tenant.business?.cuisine || [];

    // 1. Direkter Radius-Search (5km)
    const nearbyCompetitors = await this.findNearbyCompetitors(location, 5000);

    // 2. Cuisine-basierte Konkurrenten
    const cuisineCompetitors = await this.findCuisineCompetitors(cuisine, location, 10000);

    // 3. Ähnliche Preissegmente
    const priceSegmentCompetitors = await this.findPriceSegmentCompetitors(
      tenant.business?.priceRange || 2,
      location,
      15000
    );

    // 4. Event-basierte Konkurrenten (gleiche Events)
    const eventCompetitors = await this.findEventCompetitors(tenant);

    // Kombiniere und dedupliziere
    const allCompetitors = [
      ...nearbyCompetitors,
      ...cuisineCompetitors,
      ...priceSegmentCompetitors,
      ...eventCompetitors
    ];

    const uniqueCompetitors = this.deduplicateCompetitors(allCompetitors);

    return uniqueCompetitors.slice(0, 20); // Max 20 Konkurrenten
  }

  /**
   * Findet Konkurrenten in der Nähe
   */
  private async findNearbyCompetitors(location: { lat: number; lng: number }, radiusMeters: number): Promise<CompetitorData[]> {
    try {
      // Firestore Geo-Query Approximation
      const latDelta = radiusMeters / 111320; // ~111km per degree
      const lngDelta = radiusMeters / (111320 * Math.cos(location.lat * Math.PI / 180));

      const tenantsSnapshot = await this.db
        .collection('tenants')
        .where('status', '==', 'active')
        .get();

      const competitors: CompetitorData[] = [];

      for (const doc of tenantsSnapshot.docs) {
        const competitorTenant = doc.data();

        if (!competitorTenant.locations?.[0]?.coordinates) continue;

        const competitorLocation = competitorTenant.locations[0].coordinates;
        const distance = calculateDistance(location, competitorLocation);

        if (distance <= radiusMeters) {
          competitors.push({
            id: doc.id,
            name: competitorTenant.name,
            location: competitorLocation,
            distance,
            cuisine: competitorTenant.business?.cuisine || [],
            priceRange: competitorTenant.business?.priceRange || 2,
            lastSeen: new Date(),
            status: 'active'
          });
        }
      }

      return competitors;
    } catch (error) {
      console.error('Error finding nearby competitors:', error);
      return [];
    }
  }

  /**
   * Sammelt detaillierte Konkurrenzdaten
   */
  private async gatherCompetitorData(competitors: CompetitorData[], tenant: any): Promise<{
    pricing: PricingComparison[];
    menu: any[];
    performance: any[];
    marketing: any[];
    social: any[];
  }> {
    const pricingPromises = competitors.map(c => this.analyzeCompetitorPricing(c.id, tenant));
    const menuPromises = competitors.map(c => this.analyzeCompetitorMenu(c.id));
    const performancePromises = competitors.map(c => this.analyzeCompetitorPerformance(c.id));
    const marketingPromises = competitors.map(c => this.analyzeCompetitorMarketing(c.id));
    const socialPromises = competitors.map(c => this.analyzeCompetitorSocial(c.id));

    const [pricing, menu, performance, marketing, social] = await Promise.all([
      Promise.all(pricingPromises),
      Promise.all(menuPromises),
      Promise.all(performancePromises),
      Promise.all(marketingPromises),
      Promise.all(socialPromises)
    ]);

    return {
      pricing: pricing.filter(p => p !== null),
      menu: menu.filter(m => m !== null),
      performance: performance.filter(p => p !== null),
      marketing: marketing.filter(m => m !== null),
      social: social.filter(s => s !== null)
    };
  }

  /**
   * Analysiert Konkurrenz-Preise
   */
  private async analyzeCompetitorPricing(competitorId: string, tenant: any): Promise<PricingComparison | null> {
    try {
      const productsSnapshot = await this.db
        .collection(`tenants/${competitorId}/products`)
        .where('status', '==', 'active')
        .limit(50)
        .get();

      if (productsSnapshot.empty) return null;

      const products = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Gruppiere nach Kategorien
      const categoryPricing = {};

      for (const product of products) {
        const category = product.category || 'other';
        if (!categoryPricing[category]) {
          categoryPricing[category] = [];
        }

        categoryPricing[category].push({
          name: product.name?.de || product.name,
          price: product.pricing?.basePrice || 0,
          category: product.category,
          tags: product.tags || []
        });
      }

      // Berechne Durchschnittspreise
      const avgPricing = {};
      for (const [category, items] of Object.entries<any[]>(categoryPricing)) {
        const prices = items.map(item => item.price).filter(price => price > 0);
        if (prices.length > 0) {
          avgPricing[category] = {
            avgPrice: prices.reduce((sum, price) => sum + price, 0) / prices.length,
            minPrice: Math.min(...prices),
            maxPrice: Math.max(...prices),
            itemCount: prices.length
          };
        }
      }

      return {
        competitorId,
        categoryPricing: avgPricing,
        totalProducts: products.length,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(`Error analyzing competitor pricing for ${competitorId}:`, error);
      return null;
    }
  }

  /**
   * AI-basierte Konkurrenzanalyse
   */
  private async performCompetitorAnalysis(
    tenantId: string,
    tenant: any,
    competitorData: any
  ): Promise<CompetitorAnalysis> {
    const prompt = this.buildAnalysisPrompt(tenant, competitorData);

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: `Du bist ein Experte für Schweizer Foodtruck-Marktanalyse.
                   Analysiere die Konkurrenzsituation und gib strategische Empfehlungen.
                   Berücksichtige lokale Marktbedingungen und Schweizer Besonderheiten.
                   Antworte nur in validem JSON.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 3000
    });

    try {
      const aiAnalysis = JSON.parse(completion.choices[0].message.content!);

      return {
        tenantId,
        competitors: competitorData.pricing.length,

        // Market Position
        marketPosition: {
          ranking: aiAnalysis.marketPosition?.ranking || 'unknown',
          pricePosition: aiAnalysis.marketPosition?.pricePosition || 'medium',
          strengthAreas: aiAnalysis.marketPosition?.strengths || [],
          weaknessAreas: aiAnalysis.marketPosition?.weaknesses || [],
          opportunities: aiAnalysis.opportunities || [],
          threats: aiAnalysis.threats || []
        },

        // Pricing Analysis
        pricingAnalysis: {
          competitive: aiAnalysis.pricingAnalysis?.competitive || false,
          recommendations: aiAnalysis.pricingAnalysis?.recommendations || [],
          underpriced: aiAnalysis.pricingAnalysis?.underpriced || [],
          overpriced: aiAnalysis.pricingAnalysis?.overpriced || []
        },

        // Key Insights
        insights: aiAnalysis.insights || [],

        // Recommendations
        recommendations: aiAnalysis.recommendations || [],

        // Competitive Intelligence
        intelligence: {
          topCompetitors: this.identifyTopCompetitors(competitorData),
          marketGaps: aiAnalysis.marketGaps || [],
          emergingThreats: aiAnalysis.emergingThreats || [],
          benchmarkMetrics: this.calculateBenchmarkMetrics(tenant, competitorData)
        },

        // Alerts
        alerts: this.generateCompetitorAlerts(tenant, competitorData),

        // Metadata
        analysisDate: new Date(),
        validUntil: new Date(Date.now() + aiConfig.competitor.cacheValidityMinutes * 60 * 1000),
        dataQuality: this.assessDataQuality(competitorData),
        confidence: aiAnalysis.confidence || 0.7
      };
    } catch (error) {
      console.error('Failed to parse AI competitor analysis:', error);
      return this.createFallbackAnalysis(tenantId, tenant, competitorData);
    }
  }

  /**
   * Erstellt Analysis Prompt
   */
  private buildAnalysisPrompt(tenant: any, competitorData: any): string {
    const competitorCount = competitorData.pricing.length;
    const avgCompetitorPrice = this.calculateAvgCompetitorPrice(competitorData);

    return `
KONKURRENZANALYSE für Schweizer Foodtruck

EIGENER TRUCK:
- Name: ${tenant.name}
- Küche: ${tenant.business?.cuisine?.join(', ') || 'Unknown'}
- Preissegment: ${['Budget', 'Standard', 'Premium', 'Luxury'][tenant.business?.priceRange - 1] || 'Standard'}
- Standort: ${tenant.locations?.[0]?.address || 'Unknown'}

KONKURRENTEN (${competitorCount} gefunden):
${competitorData.pricing.map((comp, i) => `
${i + 1}. Konkurrent ID: ${comp.competitorId}
   - Durchschnittspreis Hauptgerichte: ${formatCurrency(comp.categoryPricing?.main?.avgPrice || 0, 'CHF')}
   - Produktanzahl: ${comp.totalProducts}
   - Kategorien: ${Object.keys(comp.categoryPricing || {}).join(', ')}
`).join('')}

MARKT-ÜBERSICHT:
- Durchschnittlicher Konkurrenzpreis: ${formatCurrency(avgCompetitorPrice, 'CHF')}
- Konkurrenzdichte: ${competitorCount > 10 ? 'Hoch' : competitorCount > 5 ? 'Mittel' : 'Niedrig'}

SCHWEIZER KONTEXT:
- Kaufkraft: Hoch (CHF Region)
- Lokale Präferenzen: Qualität > Preis
- Mittagsmarkt: 11:30-14:00 (Hauptgeschäft)
- Saisonalität: Outdoor-abhängig

Führe eine umfassende Konkurrenzanalyse durch und antworte in folgendem JSON-Format:

{
  "marketPosition": {
    "ranking": "leader|challenger|follower|niche",
    "pricePosition": "low|medium|high|premium",
    "strengths": ["Stärke 1", "Stärke 2"],
    "weaknesses": ["Schwäche 1", "Schwäche 2"]
  },
  "opportunities": [
    "Marktlücke 1",
    "Trend 2"
  ],
  "threats": [
    "Bedrohung 1",
    "Risiko 2"
  ],
  "pricingAnalysis": {
    "competitive": true/false,
    "recommendations": ["Empfehlung 1", "Empfehlung 2"],
    "underpriced": ["Produkt 1"],
    "overpriced": ["Produkt 2"]
  },
  "insights": [
    "Insight 1",
    "Insight 2"
  ],
  "recommendations": [
    {
      "priority": "high|medium|low",
      "action": "Beschreibung",
      "impact": "Erwarteter Impact",
      "effort": "low|medium|high"
    }
  ],
  "marketGaps": [
    "Lücke im Markt 1"
  ],
  "emergingThreats": [
    "Neue Bedrohung 1"
  ],
  "confidence": 0.0-1.0
}

Fokussiere auf:
1. Preispositionierung im Schweizer Markt
2. Einzigartige Verkaufsargumente
3. Konkrete Handlungsempfehlungen
4. Marktchancen und Risiken
5. Schweizer Kundenpräferenzen`;
  }

  /**
   * Generiert Competitor Alerts
   */
  private generateCompetitorAlerts(tenant: any, competitorData: any): CompetitorAlert[] {
    const alerts: CompetitorAlert[] = [];

    // Price Alert
    const avgCompetitorPrice = this.calculateAvgCompetitorPrice(competitorData);
    const tenantAvgPrice = this.calculateTenantAvgPrice(tenant);

    if (tenantAvgPrice > avgCompetitorPrice * 1.3) {
      alerts.push({
        type: 'pricing',
        severity: 'high',
        title: 'Preise deutlich über Konkurrenz',
        message: `Ihre Preise sind ${((tenantAvgPrice / avgCompetitorPrice - 1) * 100).toFixed(0)}% höher als der Konkurrenzdurchschnitt`,
        actionRequired: true,
        recommendations: ['Preise überprüfen', 'Value Proposition stärken']
      });
    }

    // Density Alert
    if (competitorData.pricing.length > 8) {
      alerts.push({
        type: 'market_density',
        severity: 'medium',
        title: 'Hohe Konkurrenzdichte',
        message: `${competitorData.pricing.length} Konkurrenten in der Nähe gefunden`,
        actionRequired: false,
        recommendations: ['Alleinstellungsmerkmale entwickeln', 'Nischenmärkte identifizieren']
      });
    }

    // New Competitor Alert
    const recentCompetitors = this.findRecentCompetitors(competitorData);
    if (recentCompetitors.length > 0) {
      alerts.push({
        type: 'new_competitor',
        severity: 'medium',
        title: `${recentCompetitors.length} neue Konkurrenten`,
        message: 'Neue Foodtrucks in der Nähe entdeckt',
        actionRequired: false,
        recommendations: ['Marktposition überprüfen', 'Competitive Intelligence verstärken']
      });
    }

    return alerts;
  }

  /**
   * Startet kontinuierliches Monitoring
   */
  private startContinuousMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performScheduledMonitoring();
      } catch (error) {
        console.error('Error in scheduled competitor monitoring:', error);
      }
    }, aiConfig.competitor.monitoringInterval);
  }

  /**
   * Führt geplantes Monitoring durch
   */
  private async performScheduledMonitoring(): Promise<void> {
    console.log('🔍 Performing scheduled competitor monitoring...');

    // Hole alle aktiven Tenants
    const tenantsSnapshot = await this.db
      .collection('tenants')
      .where('status', '==', 'active')
      .where('subscription.features.competitorMonitoring', '==', true)
      .get();

    // Paralleles Monitoring für alle Tenants
    const monitoringPromises = tenantsSnapshot.docs.map(doc =>
      this.monitorTenantCompetitors(doc.id).catch(error =>
        console.error(`Error monitoring tenant ${doc.id}:`, error)
      )
    );

    await Promise.all(monitoringPromises);
    console.log('✅ Scheduled competitor monitoring completed');
  }

  /**
   * Überwacht Konkurrenten für einen Tenant
   */
  private async monitorTenantCompetitors(tenantId: string): Promise<void> {
    try {
      const analysis = await this.analyzeCompetitors(tenantId);

      // Prüfe auf kritische Alerts
      const criticalAlerts = analysis.alerts.filter(alert =>
        alert.severity === 'high' && alert.actionRequired
      );

      if (criticalAlerts.length > 0) {
        // Sende Benachrichtigungen
        for (const alert of criticalAlerts) {
          await sendNotification(tenantId, {
            type: 'competitor_alert',
            title: alert.title,
            message: alert.message,
            priority: 'high',
            data: {
              alertType: alert.type,
              recommendations: alert.recommendations
            }
          });
        }
      }
    } catch (error) {
      console.error(`Competitor monitoring failed for tenant ${tenantId}:`, error);
    }
  }

  /**
   * Health Check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.openai.models.list();
      await this.db.collection('_health').doc('ai_competitor').set({
        lastCheck: new Date(),
        service: 'competitor-monitor'
      });
      return true;
    } catch (error) {
      console.error('Competitor Monitor health check failed:', error);
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

    this.competitorCache.clear();
    this.analysisCache.clear();
    console.log('Competitor Monitor shut down');
  }

  // Helper Methods
  private isCacheValid(analysis: CompetitorAnalysis): boolean {
    return new Date() < new Date(analysis.validUntil);
  }

  private async loadKnownCompetitors(): Promise<void> {
    // Implementation für bekannte Konkurrenten
  }

  private async findCuisineCompetitors(cuisine: string[], location: any, radius: number): Promise<CompetitorData[]> {
    // Implementation
    return [];
  }

  private async findPriceSegmentCompetitors(priceRange: number, location: any, radius: number): Promise<CompetitorData[]> {
    // Implementation
    return [];
  }

  private async findEventCompetitors(tenant: any): Promise<CompetitorData[]> {
    // Implementation
    return [];
  }

  private deduplicateCompetitors(competitors: CompetitorData[]): CompetitorData[] {
    const seen = new Set<string>();
    return competitors.filter(comp => {
      if (seen.has(comp.id)) return false;
      seen.add(comp.id);
      return true;
    });
  }

  private async analyzeCompetitorMenu(competitorId: string): Promise<any> {
    // Implementation
    return null;
  }

  private async analyzeCompetitorPerformance(competitorId: string): Promise<any> {
    // Implementation
    return null;
  }

  private async analyzeCompetitorMarketing(competitorId: string): Promise<any> {
    // Implementation
    return null;
  }

  private async analyzeCompetitorSocial(competitorId: string): Promise<any> {
    // Implementation
    return null;
  }

  private calculateAvgCompetitorPrice(competitorData: any): number {
    const prices = competitorData.pricing
      .map(comp => comp.categoryPricing?.main?.avgPrice)
      .filter(price => price && price > 0);

    return prices.length > 0
      ? prices.reduce((sum, price) => sum + price, 0) / prices.length
      : 0;
  }

  private calculateTenantAvgPrice(tenant: any): number {
    // Implementierung um durchschnittlichen Preis des Tenants zu berechnen
    return 16.90; // Placeholder
  }

  private identifyTopCompetitors(competitorData: any): any[] {
    return competitorData.pricing.slice(0, 3).map(comp => ({
      id: comp.competitorId,
      strength: 'pricing_competitive'
    }));
  }

  private calculateBenchmarkMetrics(tenant: any, competitorData: any): any {
    return {
      avgPrice: this.calculateAvgCompetitorPrice(competitorData),
      priceRange: { min: 12.90, max: 24.90 },
      marketShare: 'unknown'
    };
  }

  private assessDataQuality(competitorData: any): 'high' | 'medium' | 'low' {
    if (competitorData.pricing.length >= 5) return 'high';
    if (competitorData.pricing.length >= 2) return 'medium';
    return 'low';
  }

  private createFallbackAnalysis(tenantId: string, tenant: any, competitorData: any): CompetitorAnalysis {
    return {
      tenantId,
      competitors: competitorData.pricing.length,
      marketPosition: {
        ranking: 'unknown',
        pricePosition: 'medium',
        strengthAreas: [],
        weaknessAreas: [],
        opportunities: ['Marktanalyse durchführen'],
        threats: []
      },
      pricingAnalysis: {
        competitive: true,
        recommendations: ['Detaillierte Analyse erforderlich'],
        underpriced: [],
        overpriced: []
      },
      insights: ['Basis-Analyse - AI-Fehler'],
      recommendations: [{
        priority: 'medium',
        action: 'Manuelle Konkurrenzanalyse',
        impact: 'Medium',
        effort: 'medium'
      }],
      intelligence: {
        topCompetitors: [],
        marketGaps: [],
        emergingThreats: [],
        benchmarkMetrics: this.calculateBenchmarkMetrics(tenant, competitorData)
      },
      alerts: [],
      analysisDate: new Date(),
      validUntil: new Date(Date.now() + 30 * 60 * 1000),
      dataQuality: 'low',
      confidence: 0.3
    };
  }

  private findRecentCompetitors(competitorData: any): any[] {
    // Implementation für kürzlich entdeckte Konkurrenten
    return [];
  }

  private async logAnalysis(tenantId: string, analysis: CompetitorAnalysis): Promise<void> {
    await this.db.collection('competitor_analyses').add({
      tenantId,
      ...analysis,
      analysisDate: new Date()
    });
  }
}
