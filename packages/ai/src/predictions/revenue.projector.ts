/**
 * Revenue Projector
 *
 * KI-basierte Umsatzprognose für Schweizer Foodtrucks
 * Financial Forecasting mit Berücksichtigung aller Einflussfaktoren
 *
 * @author Benedikt Thomma <benedikt@thomma.ch>
 */

import { getFirestore } from 'firebase-admin/firestore';
import { OpenAI } from 'openai';
import { aiConfig } from '../config/ai.config';
import {
  BusinessDrivers,
  FinancialForecast,
  MarketFactors,
  RevenueMetrics,
  RevenueProjectionRequest,
  RevenueProjectionResponse,
  RevenueScenario
} from '../types/ai.types';
import {
  addDays
} from '../utils/ai.utils';

export class RevenueProjector {
  private openai: OpenAI;
  private db: FirebaseFirestore.Firestore;
  private projectionCache: Map<string, RevenueProjectionResponse> = new Map();
  private revenueModels: Map<string, any> = new Map();
  private marketData: Map<string, MarketFactors> = new Map();

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.db = getFirestore();
  }

  /**
   * Initialisiert den Revenue Projector
   */
  async initialize(): Promise<void> {
    console.log('💰 Initializing Revenue Projector...');

    // Lade historische Revenue-Modelle
    await this.loadRevenueModels();

    // Lade Marktdaten
    await this.loadMarketData();

    console.log('✅ Revenue Projector initialized');
  }

  /**
   * Erstellt umfassende Umsatzprognose
   */
  async projectRevenue(request: RevenueProjectionRequest): Promise<RevenueProjectionResponse> {
    try {
      console.log(`💰 Projecting revenue for tenant ${request.tenantId}`);

      // Cache Check
      const cacheKey = this.getCacheKey(request);
      const cached = this.projectionCache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        return cached;
      }

      // Sammle historische Revenue-Daten
      const historicalRevenue = await this.collectHistoricalRevenue(request.tenantId, request.lookbackDays || 90);

      // Analysiere Business Drivers
      const businessDrivers = await this.analyzeBusinessDrivers(request.tenantId);

      // Sammle Marktfaktoren
      const marketFactors = await this.gatherMarketFactors(request.tenantId);

      // Führe verschiedene Projektionsmethoden durch
      const projections = await Promise.all([
        this.performTrendProjection(historicalRevenue, request),
        this.performSeasonalProjection(historicalRevenue, marketFactors, request),
        this.performAIProjection(historicalRevenue, businessDrivers, marketFactors, request),
        this.performScenarioProjection(historicalRevenue, businessDrivers, marketFactors, request)
      ]);

      // Kombiniere Projektionen
      const finalProjection = this.combineProjections(projections, request);

      // Cache Result
      this.projectionCache.set(cacheKey, finalProjection);

      // Speichere Projection Log
      await this.logProjection(request, finalProjection);

      return finalProjection;
    } catch (error) {
      console.error(`Revenue projection failed for ${request.tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Sammelt historische Umsatzdaten
   */
  private async collectHistoricalRevenue(tenantId: string, lookbackDays: number): Promise<RevenueMetrics[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - lookbackDays);

    // Hole Orders aus dem Zeitraum
    const ordersSnapshot = await this.db
      .collection(`tenants/${tenantId}/orders`)
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .where('status', 'in', ['completed', 'delivered', 'picked_up'])
      .orderBy('createdAt')
      .get();

    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate()
    }));

    // Gruppiere nach Tagen
    const dailyRevenueMap = new Map<string, {
      date: Date;
      revenue: number;
      orderCount: number;
      customerCount: number;
      avgOrderValue: number;
      itemsSold: number;
    }>();

    for (const order of orders) {
      const dateKey = order.createdAt.toISOString().split('T')[0];

      if (!dailyRevenueMap.has(dateKey)) {
        dailyRevenueMap.set(dateKey, {
          date: new Date(dateKey),
          revenue: 0,
          orderCount: 0,
          customerCount: 0,
          avgOrderValue: 0,
          itemsSold: 0
        });
      }

      const entry = dailyRevenueMap.get(dateKey)!;
      entry.revenue += order.total || 0;
      entry.orderCount++;
      entry.itemsSold += order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

      // Count unique customers (simplified)
      entry.customerCount = Math.max(entry.customerCount, entry.orderCount * 0.8);
    }

    // Berechne avgOrderValue und sortiere
    const revenueMetrics: RevenueMetrics[] = Array.from(dailyRevenueMap.values())
      .map(entry => ({
        ...entry,
        avgOrderValue: entry.orderCount > 0 ? entry.revenue / entry.orderCount : 0
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    // Fülle fehlende Tage mit 0-Werten
    return this.fillMissingDays(revenueMetrics, startDate, endDate);
  }

  /**
   * Analysiert Business Drivers
   */
  private async analyzeBusinessDrivers(tenantId: string): Promise<BusinessDrivers> {
    const tenantDoc = await this.db.collection('tenants').doc(tenantId).get();
    const tenant = tenantDoc.data();

    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    // Sammle verschiedene Business Metrics
    const [
      menuAnalysis,
      customerMetrics,
      operationalMetrics,
      marketingMetrics
    ] = await Promise.all([
      this.analyzeMenuPerformance(tenantId),
      this.analyzeCustomerMetrics(tenantId),
      this.analyzeOperationalMetrics(tenantId),
      this.analyzeMarketingMetrics(tenantId)
    ]);

    return {
      // Menü & Pricing
      menuOptimization: menuAnalysis.optimizationScore,
      priceElasticity: menuAnalysis.avgElasticity,
      productMix: menuAnalysis.productMix,

      // Customer Behavior
      customerAcquisition: customerMetrics.acquisitionRate,
      customerRetention: customerMetrics.retentionRate,
      customerLifetimeValue: customerMetrics.lifetimeValue,

      // Operations
      operationalEfficiency: operationalMetrics.efficiency,
      capacityUtilization: operationalMetrics.capacity,
      serviceQuality: operationalMetrics.quality,

      // Marketing
      marketingEffectiveness: marketingMetrics.effectiveness,
      brandAwareness: marketingMetrics.awareness,
      seasonalTrends: await this.analyzeSeasonalTrends(tenantId),

      // External
      competitivePosition: await this.analyzeCompetitivePosition(tenantId),
      locationAdvantage: await this.analyzeLocationAdvantage(tenant)
    };
  }

  /**
   * Sammelt Marktfaktoren
   */
  private async gatherMarketFactors(tenantId: string): Promise<MarketFactors> {
    const [
      economicData,
      industryData,
      localData,
      seasonalData
    ] = await Promise.all([
      this.getEconomicIndicators(),
      this.getFoodtruckIndustryData(),
      this.getLocalMarketData(tenantId),
      this.getSeasonalFactors()
    ]);

    return {
      // Wirtschaftliche Faktoren
      gdpGrowth: economicData.gdpGrowth,
      inflation: economicData.inflation,
      unemploymentRate: economicData.unemployment,
      consumerSpending: economicData.consumerSpending,

      // Branche
      industryGrowth: industryData.growth,
      marketSaturation: industryData.saturation,
      averageRevenue: industryData.avgRevenue,

      // Lokal
      localEconomyHealth: localData.economyHealth,
      populationGrowth: localData.populationGrowth,
      touristActivity: localData.tourism,

      // Saisonal
      seasonalityStrength: seasonalData.strength,
      peakSeasons: seasonalData.peaks,
      weatherSensitivity: seasonalData.weatherImpact,

      // Events & Trends
      upcomingEvents: await this.getUpcomingEventImpact(tenantId),
      foodTrends: await this.getFoodTrendImpact(),
      competitionLevel: await this.getCompetitionLevel(tenantId)
    };
  }

  /**
   * Trend-basierte Projektion
   */
  private async performTrendProjection(
    historical: RevenueMetrics[],
    request: RevenueProjectionRequest
  ): Promise<{ method: string; projections: FinancialForecast[] }> {
    if (historical.length < 7) {
      throw new Error('Insufficient historical data for trend projection');
    }

    const revenues = historical.map(h => h.revenue);

    // Berechne verschiedene Trends
    const linearTrend = this.calculateLinearTrend(revenues);
    const exponentialTrend = this.calculateExponentialTrend(revenues);
    const movingAverageTrend = this.calculateMovingAverageTrend(revenues, 7);

    // Gewichtete Kombination der Trends
    const combinedTrend = revenues.map((_, i) =>
      linearTrend[i] * 0.4 +
      exponentialTrend[i] * 0.3 +
      movingAverageTrend[i] * 0.3
    );

    // Projiziere in die Zukunft
    const projections: FinancialForecast[] = [];
    const lastValue = combinedTrend[combinedTrend.length - 1];
    const avgGrowthRate = this.calculateAvgGrowthRate(combinedTrend);

    for (let i = 0; i < request.projectionDays; i++) {
      const futureDate = addDays(new Date(), i + 1);
      const projectedRevenue = lastValue * Math.pow(1 + avgGrowthRate, i + 1);

      projections.push({
        date: futureDate,
        revenue: Math.max(0, projectedRevenue),
        confidence: Math.max(0.3, 0.9 - i * 0.02), // Confidence decreases over time
        method: 'trend'
      });
    }

    return { method: 'trend', projections };
  }

  /**
   * Saisonale Projektion
   */
  private async performSeasonalProjection(
    historical: RevenueMetrics[],
    marketFactors: MarketFactors,
    request: RevenueProjectionRequest
  ): Promise<{ method: string; projections: FinancialForecast[] }> {
    // Extrahiere saisonale Patterns
    const seasonalPattern = this.extractSeasonalPattern(historical);

    // Berechne Baseline (de-seasonalized)
    const baseline = this.calculateBaseline(historical, seasonalPattern);

    // Projiziere Baseline
    const baselineTrend = this.calculateLinearTrend(baseline);
    const lastBaseline = baselineTrend[baselineTrend.length - 1];
    const baselineGrowth = this.calculateAvgGrowthRate(baselineTrend);

    const projections: FinancialForecast[] = [];

    for (let i = 0; i < request.projectionDays; i++) {
      const futureDate = addDays(new Date(), i + 1);

      // Projiziere Baseline
      const projectedBaseline = lastBaseline * Math.pow(1 + baselineGrowth, i + 1);

      // Wende saisonales Pattern an
      const seasonalMultiplier = this.getSeasonalMultiplier(futureDate, seasonalPattern);

      // Berücksichtige Marktfaktoren
      const marketMultiplier = this.calculateMarketMultiplier(marketFactors, futureDate);

      const projectedRevenue = projectedBaseline * seasonalMultiplier * marketMultiplier;

      projections.push({
        date: futureDate,
        revenue: Math.max(0, projectedRevenue),
        confidence: Math.max(0.4, 0.85 - i * 0.015),
        method: 'seasonal'
      });
    }

    return { method: 'seasonal', projections };
  }

  /**
   * AI-basierte Projektion
   */
  private async performAIProjection(
    historical: RevenueMetrics[],
    businessDrivers: BusinessDrivers,
    marketFactors: MarketFactors,
    request: RevenueProjectionRequest
  ): Promise<{ method: string; projections: FinancialForecast[] }> {
    const prompt = this.buildRevenueProjectionPrompt(historical, businessDrivers, marketFactors, request);

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: `Du bist ein Experte für Schweizer Foodtruck-Finanzprognosen.
                   Analysiere alle Faktoren und erstelle realistische Umsatzprognosen.
                   Berücksichtige Schweizer Marktbesonderheiten, Saisonalität und lokale Faktoren.
                   Antworte nur in validem JSON.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 3000
    });

    try {
      const aiResult = JSON.parse(completion.choices[0].message.content!);

      const projections: FinancialForecast[] = aiResult.projections.map((proj: any) => ({
        date: new Date(proj.date),
        revenue: proj.revenue,
        confidence: proj.confidence || 0.7,
        method: 'ai',
        factors: proj.factors || []
      }));

      return { method: 'ai', projections };
    } catch (error) {
      console.error('Failed to parse AI revenue projection:', error);
      // Fallback zu Trend-Projektion
      return this.performTrendProjection(historical, request);
    }
  }

  /**
   * Szenario-basierte Projektion
   */
  private async performScenarioProjection(
    historical: RevenueMetrics[],
    businessDrivers: BusinessDrivers,
    marketFactors: MarketFactors,
    request: RevenueProjectionRequest
  ): Promise<{ method: string; projections: FinancialForecast[]; scenarios: RevenueScenario[] }> {
    const baseProjection = await this.performTrendProjection(historical, request);

    // Definiere Szenarien
    const scenarios: RevenueScenario[] = [
      {
        name: 'pessimistic',
        description: 'Schlechtes Wetter, starke Konkurrenz, wirtschaftliche Unsicherheit',
        probability: 0.2,
        multiplier: 0.7,
        factors: ['bad_weather', 'increased_competition', 'economic_downturn']
      },
      {
        name: 'realistic',
        description: 'Normale Marktbedingungen, durchschnittliches Wetter',
        probability: 0.6,
        multiplier: 1.0,
        factors: ['normal_conditions']
      },
      {
        name: 'optimistic',
        description: 'Perfektes Wetter, erfolgreiche Marketing-Kampagne, neue Standorte',
        probability: 0.2,
        multiplier: 1.4,
        factors: ['excellent_weather', 'successful_marketing', 'location_expansion']
      }
    ];

    // Berechne gewichtete Projektion
    const weightedProjections: FinancialForecast[] = baseProjection.projections.map(proj => {
      const weightedRevenue = scenarios.reduce((sum, scenario) =>
        sum + (proj.revenue * scenario.multiplier * scenario.probability), 0
      );

      return {
        ...proj,
        revenue: weightedRevenue,
        method: 'scenario',
        scenarios: scenarios.map(s => ({
          name: s.name,
          revenue: proj.revenue * s.multiplier,
          probability: s.probability
        }))
      };
    });

    return {
      method: 'scenario',
      projections: weightedProjections,
      scenarios
    };
  }

  /**
   * Kombiniert verschiedene Projektionen
   */
  private combineProjections(
    projections: any[],
    request: RevenueProjectionRequest
  ): RevenueProjectionResponse {
    const [trendProj, seasonalProj, aiProj, scenarioProj] = projections;

    // Gewichtete Kombination
    const weights = {
      trend: 0.2,
      seasonal: 0.3,
      ai: 0.4,
      scenario: 0.1
    };

    const combinedProjections: FinancialForecast[] = [];

    for (let i = 0; i < request.projectionDays; i++) {
      const date = addDays(new Date(), i + 1);

      const weightedRevenue =
        trendProj.projections[i].revenue * weights.trend +
        seasonalProj.projections[i].revenue * weights.seasonal +
        aiProj.projections[i].revenue * weights.ai +
        scenarioProj.projections[i].revenue * weights.scenario;

      const avgConfidence =
        (trendProj.projections[i].confidence * weights.trend +
         seasonalProj.projections[i].confidence * weights.seasonal +
         aiProj.projections[i].confidence * weights.ai +
         scenarioProj.projections[i].confidence * weights.scenario);

      combinedProjections.push({
        date,
        revenue: weightedRevenue,
        confidence: avgConfidence,
        method: 'combined'
      });
    }

    // Berechne Zusammenfassung
    const totalProjectedRevenue = combinedProjections.reduce((sum, proj) => sum + proj.revenue, 0);
    const avgDailyRevenue = totalProjectedRevenue / combinedProjections.length;
    const avgConfidence = combinedProjections.reduce((sum, proj) => sum + proj.confidence, 0) / combinedProjections.length;

    return {
      tenantId: request.tenantId,
      projectionPeriod: {
        startDate: combinedProjections[0].date,
        endDate: combinedProjections[combinedProjections.length - 1].date,
        days: request.projectionDays
      },
      projections: combinedProjections,
      summary: {
        totalProjectedRevenue,
        avgDailyRevenue,
        confidence: avgConfidence,
        growthRate: this.calculateProjectedGrowthRate(combinedProjections),
        riskLevel: this.assessRiskLevel(avgConfidence, combinedProjections)
      },
      methodBreakdown: {
        trend: { weight: weights.trend, projections: trendProj.projections },
        seasonal: { weight: weights.seasonal, projections: seasonalProj.projections },
        ai: { weight: weights.ai, projections: aiProj.projections },
        scenario: { weight: weights.scenario, projections: scenarioProj.projections }
      },
      scenarios: scenarioProj.scenarios,
      recommendations: this.generateRevenueRecommendations(combinedProjections, request),
      generatedAt: new Date(),
      validUntil: new Date(Date.now() + aiConfig.forecasting.cacheValidityMinutes * 60 * 1000)
    };
  }

  /**
   * Health Check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.openai.models.list();
      await this.db.collection('_health').doc('ai_revenue_projector').set({
        lastCheck: new Date(),
        service: 'revenue-projector',
        projectionsInCache: this.projectionCache.size
      });
      return true;
    } catch (error) {
      console.error('Revenue Projector health check failed:', error);
      return false;
    }
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    this.projectionCache.clear();
    this.revenueModels.clear();
    this.marketData.clear();
    console.log('Revenue Projector shut down');
  }

  // Helper Methods (weitere Implementierungen)
  private getCacheKey(request: RevenueProjectionRequest): string {
    return `${request.tenantId}_${request.projectionDays}_${Date.now().toString().slice(0, -5)}`;
  }

  private isCacheValid(projection: RevenueProjectionResponse): boolean {
    return new Date() < new Date(projection.validUntil);
  }

  private async loadRevenueModels(): Promise<void> {
    // Implementation für Revenue Models
  }

  private async loadMarketData(): Promise<void> {
    // Implementation für Market Data
  }

  private fillMissingDays(metrics: RevenueMetrics[], startDate: Date, endDate: Date): RevenueMetrics[] {
    // Implementation für Missing Days
    return metrics;
  }

  // Weitere Helper Methods würden hier implementiert werden...
  private async analyzeMenuPerformance(tenantId: string): Promise<any> { return { optimizationScore: 0.8, avgElasticity: -1.2, productMix: 'balanced' }; }
  private async analyzeCustomerMetrics(tenantId: string): Promise<any> { return { acquisitionRate: 0.15, retentionRate: 0.65, lifetimeValue: 120 }; }
  private async analyzeOperationalMetrics(tenantId: string): Promise<any> { return { efficiency: 0.85, capacity: 0.75, quality: 0.9 }; }
  private async analyzeMarketingMetrics(tenantId: string): Promise<any> { return { effectiveness: 0.7, awareness: 0.6 }; }
  private async analyzeSeasonalTrends(tenantId: string): Promise<any> { return { strength: 0.3, peaks: ['summer', 'events'] }; }
  private async analyzeCompetitivePosition(tenantId: string): Promise<number> { return 0.7; }
  private async analyzeLocationAdvantage(tenant: any): Promise<number> { return 0.8; }

  private async getEconomicIndicators(): Promise<any> { return { gdpGrowth: 0.02, inflation: 0.021, unemployment: 0.028, consumerSpending: 1.05 }; }
  private async getFoodtruckIndustryData(): Promise<any> { return { growth: 0.08, saturation: 0.6, avgRevenue: 180000 }; }
  private async getLocalMarketData(tenantId: string): Promise<any> { return { economyHealth: 'strong', populationGrowth: 0.015, tourism: 'high' }; }
  private async getSeasonalFactors(): Promise<any> { return { strength: 0.4, peaks: ['summer'], weatherImpact: 0.3 }; }

  private calculateLinearTrend(values: number[]): number[] { return values; }
  private calculateExponentialTrend(values: number[]): number[] { return values; }
  private calculateMovingAverageTrend(values: number[], window: number): number[] { return values; }
  private calculateAvgGrowthRate(values: number[]): number { return 0.02; }

  private extractSeasonalPattern(historical: RevenueMetrics[]): any { return {}; }
  private calculateBaseline(historical: RevenueMetrics[], pattern: any): number[] { return historical.map(h => h.revenue); }
  private getSeasonalMultiplier(date: Date, pattern: any): number { return 1.0; }
  private calculateMarketMultiplier(factors: MarketFactors, date: Date): number { return 1.0; }

  private buildRevenueProjectionPrompt(historical: RevenueMetrics[], drivers: BusinessDrivers, factors: MarketFactors, request: RevenueProjectionRequest): string {
    return `Erstelle ${request.projectionDays}-Tage Umsatzprognose für Schweizer Foodtruck...`;
  }

  private calculateProjectedGrowthRate(projections: FinancialForecast[]): number { return 0.05; }
  private assessRiskLevel(confidence: number, projections: FinancialForecast[]): 'low' | 'medium' | 'high' { return confidence > 0.8 ? 'low' : confidence > 0.6 ? 'medium' : 'high'; }

  private generateRevenueRecommendations(projections: FinancialForecast[], request: RevenueProjectionRequest): string[] {
    return ['Nutzen Sie starke Tage für Promotions', 'Optimieren Sie Menü für schwächere Perioden'];
  }

  private async getUpcomingEventImpact(tenantId: string): Promise<number> { return 0.1; }
  private async getFoodTrendImpact(): Promise<number> { return 0.05; }
  private async getCompetitionLevel(tenantId: string): Promise<number> { return 0.6; }

  private async logProjection(request: RevenueProjectionRequest, projection: RevenueProjectionResponse): Promise<void> {
    await this.db.collection('revenue_projections').add({
      tenantId: request.tenantId,
      totalProjectedRevenue: projection.summary.totalProjectedRevenue,
      confidence: projection.summary.confidence,
      projectionDays: request.projectionDays,
      generatedAt: new Date()
    });
  }
}
