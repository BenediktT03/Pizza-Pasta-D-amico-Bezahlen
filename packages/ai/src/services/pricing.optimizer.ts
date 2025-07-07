/**
 * Pricing Optimizer Service
 *
 * KI-basierte dynamische Preisoptimierung für Schweizer Foodtrucks
 * Berücksichtigt Elastizität, Konkurrenz, Wetter und Events
 *
 * @author Benedikt Thomma <benedikt@thomma.ch>
 */

import { getFirestore } from 'firebase-admin/firestore';
import { OpenAI } from 'openai';
import { aiConfig } from '../config/ai.config';
import {
  CompetitorData,
  ElasticityAnalysis,
  MarketConditions,
  PriceOptimizationRequest,
  PriceOptimizationResponse
} from '../types/ai.types';
import { calculatePriceElasticity, formatCurrency, getSwissHolidays } from '../utils/ai.utils';

export class PricingOptimizer {
  private openai: OpenAI;
  private db: FirebaseFirestore.Firestore;
  private optimizationCache: Map<string, PriceOptimizationResponse> = new Map();
  private elasticityCache: Map<string, ElasticityAnalysis> = new Map();

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.db = getFirestore();
  }

  /**
   * Initialisiert den Pricing Optimizer
   */
  async initialize(): Promise<void> {
    console.log('💰 Initializing Pricing Optimizer...');

    // Lade historische Elastizitätsdaten
    await this.loadHistoricalElasticity();

    // Starte Competitor Monitoring
    this.startCompetitorMonitoring();

    console.log('✅ Pricing Optimizer initialized');
  }

  /**
   * Optimiert Preise für ein Produkt
   */
  async optimizePrice(request: PriceOptimizationRequest): Promise<PriceOptimizationResponse> {
    try {
      console.log(`🔍 Optimizing price for product ${request.productId}`);

      // Cache Check
      const cacheKey = this.getCacheKey(request);
      const cached = this.optimizationCache.get(cacheKey);
      if (cached && this.isCacheValid(cached, aiConfig.pricing.cacheValidityMinutes)) {
        return cached;
      }

      // Sammle Marktdaten
      const marketConditions = await this.gatherMarketConditions(request);

      // Elastizitätsanalyse
      const elasticity = await this.analyzeElasticity(request, marketConditions);

      // Konkurrenzanalyse
      const competitorData = await this.analyzeCompetitors(request);

      // AI-basierte Preisoptimierung
      const optimization = await this.performAIOptimization(
        request,
        marketConditions,
        elasticity,
        competitorData
      );

      // Validiere Swiss Pricing Rules
      const validatedOptimization = this.validateSwissPricing(optimization, request);

      // Cache Result
      this.optimizationCache.set(cacheKey, validatedOptimization);

      // Speichere Optimization Log
      await this.logOptimization(request, validatedOptimization);

      return validatedOptimization;
    } catch (error) {
      console.error(`Pricing optimization failed for ${request.productId}:`, error);
      throw error;
    }
  }

  /**
   * Sammelt aktuelle Marktbedingungen
   */
  private async gatherMarketConditions(request: PriceOptimizationRequest): Promise<MarketConditions> {
    const tenantId = request.tenantId;
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      productDoc,
      recentOrders,
      tenantDoc,
      weatherData,
      eventData,
      holidayData
    ] = await Promise.all([
      this.db.collection(`tenants/${tenantId}/products`).doc(request.productId).get(),
      this.getRecentOrdersForProduct(tenantId, request.productId, oneWeekAgo),
      this.db.collection('tenants').doc(tenantId).get(),
      this.getWeatherForecast(tenantId),
      this.getNearbyEvents(tenantId),
      this.getSwissHolidayImpact(now)
    ]);

    const product = productDoc.data();
    const tenant = tenantDoc.data();

    if (!product || !tenant) {
      throw new Error('Product or tenant not found');
    }

    // Berechne Verkaufsmetriken
    const totalSold = recentOrders.reduce((sum, order) =>
      sum + (order.items?.find(item => item.productId === request.productId)?.quantity || 0), 0
    );

    const totalRevenue = recentOrders.reduce((sum, order) => {
      const item = order.items?.find(item => item.productId === request.productId);
      return sum + (item ? item.quantity * item.unitPrice : 0);
    }, 0);

    const avgPriceThisWeek = totalSold > 0 ? totalRevenue / totalSold : product.pricing.basePrice;

    return {
      // Produkt Daten
      currentPrice: request.currentPrice || product.pricing.basePrice,
      cost: product.pricing.cost || 0,
      category: product.category,
      tags: product.tags || [],

      // Verkaufs Performance
      weeklyVolume: totalSold,
      avgPriceThisWeek,
      conversionRate: this.calculateConversionRate(recentOrders, tenantId),

      // Zeitliche Faktoren
      dayOfWeek: now.getDay(),
      hourOfDay: now.getHours(),
      isHoliday: holidayData.isHoliday,
      holidayType: holidayData.type,

      // Externe Faktoren
      weather: weatherData,
      nearbyEvents: eventData,
      seasonality: this.getSeason(now),

      // Markt Kontext
      location: tenant.locations?.[0],
      customerSegment: tenant.business?.priceRange || 2,
      cuisine: tenant.business?.cuisine || [],

      // Betriebskontext
      staffLevel: await this.getCurrentStaffLevel(tenantId),
      kitchenCapacity: await this.getKitchenCapacity(tenantId),
      queueLength: await this.getCurrentQueueLength(tenantId)
    };
  }

  /**
   * Analysiert Preiselastizität
   */
  private async analyzeElasticity(
    request: PriceOptimizationRequest,
    market: MarketConditions
  ): Promise<ElasticityAnalysis> {
    const cacheKey = `elasticity_${request.productId}`;
    const cached = this.elasticityCache.get(cacheKey);

    if (cached && this.isCacheValid(cached, 60)) { // 1 hour cache
      return cached;
    }

    // Hole historische Preis-Verkaufs-Daten
    const historicalData = await this.getHistoricalPricingData(
      request.tenantId,
      request.productId,
      90 // 3 Monate
    );

    if (historicalData.length < 10) {
      // Nicht genug Daten - verwende Kategoriedurchschnitt
      return this.getDefaultElasticity(market.category);
    }

    // Berechne Elastizität
    const elasticity = calculatePriceElasticity(historicalData);

    // AI-basierte Elastizitäts-Verfeinerung
    const refinedElasticity = await this.refineElasticityWithAI(
      elasticity,
      market,
      historicalData
    );

    const analysis: ElasticityAnalysis = {
      elasticity: refinedElasticity,
      confidence: this.calculateElasticityConfidence(historicalData),
      dataPoints: historicalData.length,

      // Segmentierte Elastizitäten
      timeBasedElasticity: {
        morning: this.calculateTimeBasedElasticity(historicalData, 'morning'),
        lunch: this.calculateTimeBasedElasticity(historicalData, 'lunch'),
        evening: this.calculateTimeBasedElasticity(historicalData, 'evening'),
        weekend: this.calculateTimeBasedElasticity(historicalData, 'weekend')
      },

      // Wetter-basierte Elastizität
      weatherElasticity: {
        sunny: this.calculateWeatherElasticity(historicalData, 'sunny'),
        rainy: this.calculateWeatherElasticity(historicalData, 'rainy'),
        cold: this.calculateWeatherElasticity(historicalData, 'cold')
      },

      lastUpdated: new Date()
    };

    this.elasticityCache.set(cacheKey, analysis);
    return analysis;
  }

  /**
   * Analysiert Konkurrenzpreise
   */
  private async analyzeCompetitors(request: PriceOptimizationRequest): Promise<CompetitorData> {
    const tenantDoc = await this.db.collection('tenants').doc(request.tenantId).get();
    const tenant = tenantDoc.data();

    if (!tenant?.locations?.[0]?.coordinates) {
      return { competitors: [], avgPrice: request.currentPrice, pricePosition: 'unknown' };
    }

    const location = tenant.locations[0].coordinates;

    // Finde Konkurrenten im Umkreis
    const nearbyCompetitors = await this.findNearbyCompetitors(
      location,
      tenant.business?.cuisine || [],
      5000 // 5km Radius
    );

    // Analysiere Konkurrenzpreise für ähnliche Produkte
    const competitorPrices = await Promise.all(
      nearbyCompetitors.map(competitor =>
        this.getCompetitorPricing(competitor.id, request.productCategory)
      )
    );

    const validPrices = competitorPrices.filter(price => price > 0);
    const avgCompetitorPrice = validPrices.length > 0
      ? validPrices.reduce((sum, price) => sum + price, 0) / validPrices.length
      : request.currentPrice;

    // Bestimme Preis-Position
    let pricePosition: 'low' | 'medium' | 'high' = 'medium';
    if (request.currentPrice < avgCompetitorPrice * 0.9) {
      pricePosition = 'low';
    } else if (request.currentPrice > avgCompetitorPrice * 1.1) {
      pricePosition = 'high';
    }

    return {
      competitors: nearbyCompetitors,
      avgPrice: avgCompetitorPrice,
      pricePosition,
      priceRange: {
        min: Math.min(...validPrices),
        max: Math.max(...validPrices),
        q25: this.calculatePercentile(validPrices, 25),
        q75: this.calculatePercentile(validPrices, 75)
      }
    };
  }

  /**
   * Führt AI-basierte Preisoptimierung durch
   */
  private async performAIOptimization(
    request: PriceOptimizationRequest,
    market: MarketConditions,
    elasticity: ElasticityAnalysis,
    competitors: CompetitorData
  ): Promise<PriceOptimizationResponse> {
    const prompt = this.buildOptimizationPrompt(request, market, elasticity, competitors);

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: `Du bist ein Experte für Schweizer Foodtruck-Preisoptimierung.
                   Berücksichtige lokale Marktbedingungen, Schweizer Kaufkraft,
                   MWST (7.7%) und kulturelle Preiserwartungen.
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
      const aiResult = JSON.parse(completion.choices[0].message.content!);

      // Erstelle strukturierte Response
      return {
        productId: request.productId,
        tenantId: request.tenantId,

        // Preisempfehlungen
        currentPrice: request.currentPrice,
        recommendedPrice: aiResult.recommendedPrice,
        priceChange: aiResult.recommendedPrice - request.currentPrice,
        priceChangePercent: ((aiResult.recommendedPrice - request.currentPrice) / request.currentPrice) * 100,

        // Forecasts
        projectedRevenueLift: aiResult.projectedRevenueLift || 0,
        projectedVolumeChange: aiResult.projectedVolumeChange || 0,

        // Begründung
        strategy: aiResult.strategy,
        reasoning: aiResult.reasoning || [],

        // Risiken
        risks: aiResult.risks || [],
        confidence: aiResult.confidence || 0.5,

        // Implementierung
        implementationPlan: {
          timing: aiResult.timing || 'immediate',
          duration: aiResult.duration || 'permanent',
          rollbackTriggers: aiResult.rollbackTriggers || [],
          abTestRecommended: aiResult.abTestRecommended || false
        },

        // Kontext
        marketConditions: market,
        elasticityData: elasticity,
        competitorData: competitors,

        // Metadata
        optimizedAt: new Date(),
        validUntil: new Date(Date.now() + aiConfig.pricing.cacheValidityMinutes * 60 * 1000),
        algorithm: 'gpt-4-turbo-pricing-v1'
      };
    } catch (error) {
      console.error('Failed to parse AI pricing optimization:', error);

      // Fallback zu regelbasierter Optimierung
      return this.performRuleBasedOptimization(request, market, elasticity, competitors);
    }
  }

  /**
   * Erstellt Prompt für AI Preisoptimierung
   */
  private buildOptimizationPrompt(
    request: PriceOptimizationRequest,
    market: MarketConditions,
    elasticity: ElasticityAnalysis,
    competitors: CompetitorData
  ): string {
    return `
PREISOPTIMIERUNG für Schweizer Foodtruck

PRODUKT:
- ID: ${request.productId}
- Aktueller Preis: ${formatCurrency(request.currentPrice, 'CHF')}
- Kategorie: ${market.category}
- Kosten: ${formatCurrency(market.cost, 'CHF')}

MARKTBEDINGUNGEN:
- Wochenverkäufe: ${market.weeklyVolume} Stück
- Durchschnittspreis: ${formatCurrency(market.avgPriceThisWeek, 'CHF')}
- Conversion Rate: ${(market.conversionRate * 100).toFixed(1)}%
- Tag: ${['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][market.dayOfWeek]}
- Zeit: ${market.hourOfDay}:00 Uhr
- Wetter: ${market.weather?.condition} (${market.weather?.temperature}°C)
- Warteschlange: ${market.queueLength} Personen

ELASTIZITÄT:
- Haupt-Elastizität: ${elasticity.elasticity.toFixed(2)}
- Konfidenz: ${(elasticity.confidence * 100).toFixed(1)}%
- Datenpunkte: ${elasticity.dataPoints}

KONKURRENZ:
- Durchschnittspreis: ${formatCurrency(competitors.avgPrice, 'CHF')}
- Position: ${competitors.pricePosition}
- Anzahl Konkurrenten: ${competitors.competitors.length}

SCHWEIZER KONTEXT:
- Kundensegment: ${['Budget', 'Standard', 'Premium', 'Luxury'][market.customerSegment - 1]}
- MWST: 7.7% (bereits inkludiert)
- Kaufkraft: Hoch (CHF-Region)

ZIELE:
1. Umsatzmaximierung
2. Marktpositionierung beibehalten
3. Schweizer Preiserwartungen erfüllen
4. Langfristige Kundenbindung

Berechne den optimalen Preis und antworte in folgendem JSON-Format:

{
  "recommendedPrice": 0.00,
  "projectedRevenueLift": 0.00,
  "projectedVolumeChange": 0.00,
  "strategy": "STRATEGY_NAME",
  "reasoning": [
    "Grund 1",
    "Grund 2"
  ],
  "risks": [
    "Risiko 1 falls vorhanden"
  ],
  "confidence": 0.0-1.0,
  "timing": "immediate|peak_hours|off_peak",
  "duration": "temporary|permanent|test",
  "abTestRecommended": true/false
}

PRICING STRATEGIEN:
- PENETRATION: Niedriger Preis für Marktanteil
- SKIMMING: Hoher Preis für Premium-Positionierung
- COMPETITIVE: Preise an Konkurrenz anpassen
- PSYCHOLOGICAL: CHF 19.90 statt CHF 20.00
- DYNAMIC: Zeitbasierte Anpassungen
- VALUE_BASED: Preis nach wahrgenommenem Wert`;
  }

  /**
   * Validiert Preise nach Schweizer Standards
   */
  private validateSwissPricing(
    optimization: PriceOptimizationResponse,
    request: PriceOptimizationRequest
  ): PriceOptimizationResponse {
    const maxChange = aiConfig.pricing.maxPriceChange;
    const minPrice = request.currentPrice * (1 - maxChange);
    const maxPrice = request.currentPrice * (1 + maxChange);

    // Begrenze Preisänderung
    if (optimization.recommendedPrice < minPrice) {
      optimization.recommendedPrice = minPrice;
      optimization.risks.push(`Preis begrenzt auf max. ${(maxChange * 100).toFixed(0)}% Reduktion`);
    }

    if (optimization.recommendedPrice > maxPrice) {
      optimization.recommendedPrice = maxPrice;
      optimization.risks.push(`Preis begrenzt auf max. ${(maxChange * 100).toFixed(0)}% Erhöhung`);
    }

    // Schweizer Preis-Rundung (5 Rappen Schritte)
    optimization.recommendedPrice = this.roundToSwissFrancs(optimization.recommendedPrice);

    // Mindestmarge prüfen
    const minimumMargin = 0.3; // 30%
    const cost = optimization.marketConditions.cost;
    const minPriceForMargin = cost / (1 - minimumMargin);

    if (optimization.recommendedPrice < minPriceForMargin) {
      optimization.recommendedPrice = this.roundToSwissFrancs(minPriceForMargin);
      optimization.risks.push('Preis angepasst für Mindestmarge von 30%');
    }

    // Aktualisiere abgeleitete Werte
    optimization.priceChange = optimization.recommendedPrice - request.currentPrice;
    optimization.priceChangePercent = (optimization.priceChange / request.currentPrice) * 100;

    return optimization;
  }

  /**
   * Rundet auf 5 Rappen (Schweizer Standard)
   */
  private roundToSwissFrancs(price: number): number {
    return Math.round(price * 20) / 20; // 0.05 CHF Schritte
  }

  /**
   * Fallback regelbasierte Optimierung
   */
  private performRuleBasedOptimization(
    request: PriceOptimizationRequest,
    market: MarketConditions,
    elasticity: ElasticityAnalysis,
    competitors: CompetitorData
  ): PriceOptimizationResponse {
    let recommendedPrice = request.currentPrice;
    const reasoning: string[] = [];

    // Basis-Regeln
    if (market.queueLength > 10) {
      recommendedPrice *= 1.05; // 5% Erhöhung bei hoher Nachfrage
      reasoning.push('Erhöhung wegen hoher Nachfrage');
    }

    if (market.weeklyVolume < 5) {
      recommendedPrice *= 0.95; // 5% Reduktion bei niedriger Nachfrage
      reasoning.push('Reduktion wegen niedriger Nachfrage');
    }

    if (competitors.pricePosition === 'high' && market.conversionRate < 0.1) {
      recommendedPrice *= 0.9; // 10% Reduktion bei hohem Preis und niedriger Conversion
      reasoning.push('Preis zu hoch im Vergleich zur Konkurrenz');
    }

    return {
      productId: request.productId,
      tenantId: request.tenantId,
      currentPrice: request.currentPrice,
      recommendedPrice: this.roundToSwissFrancs(recommendedPrice),
      priceChange: recommendedPrice - request.currentPrice,
      priceChangePercent: ((recommendedPrice - request.currentPrice) / request.currentPrice) * 100,
      projectedRevenueLift: 0,
      projectedVolumeChange: 0,
      strategy: 'RULE_BASED',
      reasoning,
      risks: ['Regelbasierte Optimierung - weniger präzise'],
      confidence: 0.6,
      implementationPlan: {
        timing: 'immediate',
        duration: 'temporary',
        rollbackTriggers: [],
        abTestRecommended: true
      },
      marketConditions: market,
      elasticityData: elasticity,
      competitorData: competitors,
      optimizedAt: new Date(),
      validUntil: new Date(Date.now() + 30 * 60 * 1000), // 30 Minuten
      algorithm: 'rule-based-v1'
    };
  }

  /**
   * Health Check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.openai.models.list();
      await this.db.collection('_health').doc('ai_pricing').set({
        lastCheck: new Date(),
        service: 'pricing-optimizer'
      });
      return true;
    } catch (error) {
      console.error('Pricing Optimizer health check failed:', error);
      return false;
    }
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    this.optimizationCache.clear();
    this.elasticityCache.clear();
    console.log('Pricing Optimizer shut down');
  }

  // Helper Methods
  private getCacheKey(request: PriceOptimizationRequest): string {
    return `${request.tenantId}_${request.productId}_${Date.now().toString().slice(0, -5)}`;
  }

  private isCacheValid(cached: any, validityMinutes: number): boolean {
    const now = new Date();
    const validUntil = new Date(cached.validUntil || cached.optimizedAt);
    return now < validUntil;
  }

  private async loadHistoricalElasticity(): Promise<void> {
    // Implementation für historische Elastizitätsdaten
  }

  private startCompetitorMonitoring(): void {
    // Implementation für Competitor Monitoring
  }

  private async getRecentOrdersForProduct(tenantId: string, productId: string, since: Date) {
    // Implementation
    return [];
  }

  private async getWeatherForecast(tenantId: string) {
    // Implementation
    return { condition: 'sunny', temperature: 22 };
  }

  private async getNearbyEvents(tenantId: string) {
    // Implementation
    return [];
  }

  private async getSwissHolidayImpact(date: Date) {
    const holidays = getSwissHolidays(date.getFullYear());
    const isHoliday = holidays.some(holiday =>
      holiday.date.toDateString() === date.toDateString()
    );
    return { isHoliday, type: isHoliday ? 'public' : null };
  }

  private calculateConversionRate(orders: any[], tenantId: string): number {
    // Implementation
    return 0.15;
  }

  private getSeason(date: Date): string {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  private async getCurrentStaffLevel(tenantId: string): Promise<number> {
    return 2;
  }

  private async getKitchenCapacity(tenantId: string): Promise<number> {
    return 0.75;
  }

  private async getCurrentQueueLength(tenantId: string): Promise<number> {
    return 3;
  }

  private async getHistoricalPricingData(tenantId: string, productId: string, days: number) {
    // Implementation
    return [];
  }

  private getDefaultElasticity(category: string): ElasticityAnalysis {
    const defaults = {
      'main': -1.2,
      'sides': -0.8,
      'drinks': -0.6,
      'desserts': -1.5
    };

    return {
      elasticity: defaults[category] || -1.0,
      confidence: 0.5,
      dataPoints: 0,
      timeBasedElasticity: {
        morning: -1.0,
        lunch: -1.2,
        evening: -0.8,
        weekend: -1.1
      },
      weatherElasticity: {
        sunny: -0.9,
        rainy: -1.3,
        cold: -1.1
      },
      lastUpdated: new Date()
    };
  }

  private async refineElasticityWithAI(elasticity: number, market: MarketConditions, data: any[]): Promise<number> {
    // Implementation für AI-basierte Elastizitäts-Verfeinerung
    return elasticity;
  }

  private calculateElasticityConfidence(data: any[]): number {
    return Math.min(data.length / 50, 1); // Mehr Daten = höhere Konfidenz
  }

  private calculateTimeBasedElasticity(data: any[], timeSegment: string): number {
    // Implementation
    return -1.0;
  }

  private calculateWeatherElasticity(data: any[], weather: string): number {
    // Implementation
    return -1.0;
  }

  private async findNearbyCompetitors(location: any, cuisine: string[], radius: number) {
    // Implementation
    return [];
  }

  private async getCompetitorPricing(competitorId: string, category: string): Promise<number> {
    // Implementation
    return 0;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  private async logOptimization(request: PriceOptimizationRequest, optimization: PriceOptimizationResponse): Promise<void> {
    await this.db.collection('pricing_optimizations').add({
      ...optimization,
      optimizedAt: new Date()
    });
  }
}
