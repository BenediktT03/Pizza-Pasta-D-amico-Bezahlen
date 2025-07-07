/**
 * Context Analyzer Service
 *
 * Intelligente Kontext-Analyse für situationsbewusste AI-Entscheidungen
 * Schweizer Foodtruck Multi-Tenant System
 *
 * @author Benedikt Thomma <benedikt@thomma.ch>
 */

import { getFirestore } from 'firebase-admin/firestore';
import { OpenAI } from 'openai';
import { aiConfig } from '../config/ai.config';
import {
  ContextAnalysis,
  ContextData,
  ContextInsight,
  EconomicContext,
  EventContext,
  LocationContext,
  SocialContext,
  TemporalContext,
  WeatherContext
} from '../types/ai.types';
import {
  formatCurrency,
  getCurrentSwissTime,
  getSwissHolidays
} from '../utils/ai.utils';

export class ContextAnalyzer {
  private openai: OpenAI;
  private db: FirebaseFirestore.Firestore;
  private contextCache: Map<string, ContextAnalysis> = new Map();
  private locationData: Map<string, LocationContext> = new Map();
  private eventCache: Map<string, EventContext[]> = new Map();

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.db = getFirestore();
  }

  /**
   * Initialisiert den Context Analyzer
   */
  async initialize(): Promise<void> {
    console.log('🧠 Initializing Context Analyzer...');

    // Lade Schweizer Geodaten
    await this.loadSwissLocationData();

    // Lade Event-Kalender
    await this.loadEventCalendar();

    console.log('✅ Context Analyzer initialized');
  }

  /**
   * Analysiert den aktuellen Kontext für einen Tenant
   */
  async analyzeContext(tenantId: string): Promise<ContextAnalysis> {
    try {
      console.log(`🧠 Analyzing context for tenant ${tenantId}`);

      // Cache Check
      const cacheKey = `context_${tenantId}`;
      const cached = this.contextCache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        return cached;
      }

      // Sammle Kontext-Daten
      const contextData = await this.gatherContextData(tenantId);

      // Führe AI-basierte Kontext-Analyse durch
      const analysis = await this.performContextAnalysis(tenantId, contextData);

      // Cache Result
      this.contextCache.set(cacheKey, analysis);

      // Speichere Analysis Log
      await this.logContextAnalysis(tenantId, analysis);

      return analysis;
    } catch (error) {
      console.error(`Context analysis failed for ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Sammelt umfassende Kontext-Daten
   */
  private async gatherContextData(tenantId: string): Promise<ContextData> {
    const tenantDoc = await this.db.collection('tenants').doc(tenantId).get();
    const tenant = tenantDoc.data();

    if (!tenant) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    const now = getCurrentSwissTime();

    // Parallele Datensammlung
    const [
      locationContext,
      temporalContext,
      weatherContext,
      eventContext,
      socialContext,
      economicContext,
      businessContext
    ] = await Promise.all([
      this.analyzeLocationContext(tenant),
      this.analyzeTemporalContext(now),
      this.analyzeWeatherContext(tenant),
      this.analyzeEventContext(tenant, now),
      this.analyzeSocialContext(tenant),
      this.analyzeEconomicContext(),
      this.analyzeBusinessContext(tenantId)
    ]);

    return {
      tenantId,
      timestamp: now,
      location: locationContext,
      temporal: temporalContext,
      weather: weatherContext,
      events: eventContext,
      social: socialContext,
      economic: economicContext,
      business: businessContext
    };
  }

  /**
   * Analysiert Standort-Kontext
   */
  private async analyzeLocationContext(tenant: any): Promise<LocationContext> {
    if (!tenant.locations?.[0]?.coordinates) {
      return {
        coordinates: null,
        address: 'Unknown',
        district: 'Unknown',
        canton: 'Unknown',
        urbanity: 'unknown',
        demographics: {},
        accessibility: {},
        competition: 0,
        footTraffic: 'unknown'
      };
    }

    const location = tenant.locations[0];
    const coordinates = location.coordinates;

    // Reverse Geocoding für detaillierte Standort-Info
    const locationDetails = await this.reverseGeocode(coordinates);

    // Analysiere Umgebung
    const surroundings = await this.analyzeSurroundings(coordinates);

    // Berechne Accessibility Score
    const accessibility = await this.calculateAccessibility(coordinates);

    // Analysiere Fußgängerverkehr
    const footTraffic = await this.analyzeFootTraffic(coordinates);

    return {
      coordinates,
      address: location.address || locationDetails.address,
      district: locationDetails.district,
      canton: locationDetails.canton,
      urbanity: this.classifyUrbanity(locationDetails),
      demographics: await this.getDemographics(locationDetails.district),
      accessibility,
      competition: await this.calculateCompetitionDensity(coordinates),
      footTraffic,
      nearbyPOIs: surroundings.pointsOfInterest,
      publicTransport: surroundings.publicTransport,
      parking: surroundings.parking
    };
  }

  /**
   * Analysiert zeitlichen Kontext
   */
  private async analyzeTemporalContext(now: Date): Promise<TemporalContext> {
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const month = now.getMonth();

    // Schweizer Feiertage
    const holidays = getSwissHolidays(now.getFullYear());
    const isHoliday = holidays.some(holiday =>
      holiday.date.toDateString() === now.toDateString()
    );

    // Schulferien
    const isSchoolHoliday = await this.checkSchoolHolidays(now);

    // Business Hours Classification
    const businessPeriod = this.classifyBusinessPeriod(hour, dayOfWeek);

    // Seasonal Context
    const season = this.getSeason(month);

    return {
      hour,
      dayOfWeek,
      dayName: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][dayOfWeek],
      month,
      season,
      businessPeriod,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      isHoliday,
      holidayInfo: isHoliday ? holidays.find(h => h.date.toDateString() === now.toDateString()) : null,
      isSchoolHoliday,
      lunchRush: hour >= 11 && hour <= 14,
      dinnerRush: hour >= 17 && hour <= 20,
      workingHours: hour >= 8 && hour <= 18 && dayOfWeek >= 1 && dayOfWeek <= 5
    };
  }

  /**
   * Analysiert Wetter-Kontext
   */
  private async analyzeWeatherContext(tenant: any): Promise<WeatherContext> {
    if (!tenant.locations?.[0]?.coordinates) {
      return {
        current: { condition: 'unknown', temperature: 0 },
        forecast: [],
        impact: 'neutral'
      };
    }

    try {
      // MeteoSwiss API Call
      const weatherData = await this.fetchSwissWeatherData(tenant.locations[0].coordinates);

      // Berechne Business Impact
      const impact = this.calculateWeatherImpact(weatherData.current);

      return {
        current: {
          condition: weatherData.current.condition,
          temperature: weatherData.current.temperature,
          humidity: weatherData.current.humidity,
          windSpeed: weatherData.current.windSpeed,
          precipitation: weatherData.current.precipitation,
          visibility: weatherData.current.visibility
        },
        forecast: weatherData.forecast,
        impact,
        alerts: weatherData.alerts || [],
        uvIndex: weatherData.current.uvIndex,
        comfort: this.calculateComfortIndex(weatherData.current)
      };
    } catch (error) {
      console.error('Weather analysis failed:', error);
      return {
        current: { condition: 'unknown', temperature: 15 },
        forecast: [],
        impact: 'neutral'
      };
    }
  }

  /**
   * Analysiert Event-Kontext
   */
  private async analyzeEventContext(tenant: any, now: Date): Promise<EventContext[]> {
    if (!tenant.locations?.[0]?.coordinates) {
      return [];
    }

    const coordinates = tenant.locations[0].coordinates;
    const radiusKm = 10; // 10km Radius

    try {
      // Suche nach Events in der Nähe
      const nearbyEvents = await this.findNearbyEvents(coordinates, radiusKm, now);

      // Analysiere Event Impact
      const eventsWithImpact = await Promise.all(
        nearbyEvents.map(async event => ({
          ...event,
          impact: await this.calculateEventImpact(event, coordinates),
          relevance: this.calculateEventRelevance(event, tenant)
        }))
      );

      return eventsWithImpact.filter(event => event.relevance > 0.3);
    } catch (error) {
      console.error('Event analysis failed:', error);
      return [];
    }
  }

  /**
   * Analysiert sozialen Kontext
   */
  private async analyzeSocialContext(tenant: any): Promise<SocialContext> {
    try {
      // Social Media Mentions
      const socialMentions = await this.analyzeSocialMentions(tenant.name);

      // Trend Analysis
      const trends = await this.analyzeFoodTrends();

      // Customer Sentiment
      const sentiment = await this.analyzeCustomerSentiment(tenant.id);

      return {
        socialMentions,
        trending: trends.filter(trend => trend.relevance > 0.5),
        sentiment,
        viralPotential: this.calculateViralPotential(socialMentions, trends),
        influencerActivity: await this.checkInfluencerActivity(tenant.locations?.[0])
      };
    } catch (error) {
      console.error('Social context analysis failed:', error);
      return {
        socialMentions: 0,
        trending: [],
        sentiment: 'neutral',
        viralPotential: 0,
        influencerActivity: false
      };
    }
  }

  /**
   * Analysiert wirtschaftlichen Kontext
   */
  private async analyzeEconomicContext(): Promise<EconomicContext> {
    try {
      // Schweizer Wirtschaftsdaten
      const economicData = await this.fetchSwissEconomicData();

      return {
        inflation: economicData.inflation,
        unemploymentRate: economicData.unemployment,
        consumerConfidence: economicData.consumerConfidence,
        purchasingPower: economicData.purchasingPower,
        seasonalSpending: this.getSeasonalSpendingPattern(),
        businessSentiment: economicData.businessSentiment
      };
    } catch (error) {
      console.error('Economic context analysis failed:', error);
      return {
        inflation: 2.1, // Schweizer Durchschnitt
        unemploymentRate: 2.8,
        consumerConfidence: 102,
        purchasingPower: 'high',
        seasonalSpending: 'normal',
        businessSentiment: 'positive'
      };
    }
  }

  /**
   * Analysiert Business-Kontext
   */
  private async analyzeBusinessContext(tenantId: string): Promise<any> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      recentOrders,
      staffStatus,
      inventoryStatus,
      customerFeedback
    ] = await Promise.all([
      this.getRecentOrders(tenantId, oneDayAgo),
      this.getStaffStatus(tenantId),
      this.getInventoryStatus(tenantId),
      this.getRecentFeedback(tenantId, oneWeekAgo)
    ]);

    return {
      currentOrders: recentOrders.filter(o => ['pending', 'preparing'].includes(o.status)).length,
      dailyRevenue: recentOrders.reduce((sum, order) => sum + (order.total || 0), 0),
      staffPresent: staffStatus.present,
      staffRequired: staffStatus.required,
      inventoryLevel: inventoryStatus.overallLevel,
      lowStockItems: inventoryStatus.lowStock.length,
      customerSatisfaction: this.calculateAvgRating(customerFeedback),
      queueLength: await this.getCurrentQueueLength(tenantId),
      kitchenCapacity: await this.getKitchenCapacity(tenantId)
    };
  }

  /**
   * Führt AI-basierte Kontext-Analyse durch
   */
  private async performContextAnalysis(tenantId: string, contextData: ContextData): Promise<ContextAnalysis> {
    const prompt = this.buildContextAnalysisPrompt(contextData);

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: `Du bist ein Experte für Schweizer Foodtruck-Kontext-Analyse.
                   Analysiere die Gesamtsituation und gib strategische Empfehlungen.
                   Berücksichtige alle Kontext-Faktoren und deren Interaktionen.
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
        contextData,

        // Overall Situation Assessment
        situationAssessment: {
          overall: aiAnalysis.situationAssessment?.overall || 'neutral',
          businessOpportunity: aiAnalysis.situationAssessment?.businessOpportunity || 'medium',
          riskLevel: aiAnalysis.situationAssessment?.riskLevel || 'low',
          confidence: aiAnalysis.situationAssessment?.confidence || 0.7
        },

        // Key Insights
        insights: this.generateInsights(contextData, aiAnalysis.insights || []),

        // Recommendations
        recommendations: aiAnalysis.recommendations || [],

        // Context Factors Impact
        factorImpacts: {
          location: this.calculateLocationImpact(contextData.location),
          temporal: this.calculateTemporalImpact(contextData.temporal),
          weather: this.calculateWeatherImpactScore(contextData.weather),
          events: this.calculateEventsImpact(contextData.events),
          social: this.calculateSocialImpact(contextData.social),
          economic: this.calculateEconomicImpact(contextData.economic),
          business: this.calculateBusinessImpact(contextData.business)
        },

        // Opportunity Score
        opportunityScore: this.calculateOpportunityScore(contextData),

        // Risk Assessment
        risks: this.identifyRisks(contextData),

        // Next Actions
        nextActions: aiAnalysis.nextActions || [],

        // Metadata
        analyzedAt: new Date(),
        validUntil: new Date(Date.now() + aiConfig.context.cacheValidityMinutes * 60 * 1000),
        confidence: aiAnalysis.confidence || 0.8,
        dataQuality: this.assessContextDataQuality(contextData)
      };
    } catch (error) {
      console.error('Failed to parse AI context analysis:', error);
      return this.createFallbackAnalysis(tenantId, contextData);
    }
  }

  /**
   * Erstellt Context Analysis Prompt
   */
  private buildContextAnalysisPrompt(contextData: ContextData): string {
    return `
KONTEXT-ANALYSE für Schweizer Foodtruck

STANDORT-KONTEXT:
- Adresse: ${contextData.location.address}
- Kanton: ${contextData.location.canton}
- Urbanität: ${contextData.location.urbanity}
- Fußgängerverkehr: ${contextData.location.footTraffic}
- Konkurrenz in der Nähe: ${contextData.location.competition}
- ÖV-Anbindung: ${contextData.location.accessibility?.publicTransport || 'unknown'}

ZEIT-KONTEXT:
- Tag: ${contextData.temporal.dayName}
- Zeit: ${contextData.temporal.hour}:00 Uhr
- Saison: ${contextData.temporal.season}
- Geschäftsperiode: ${contextData.temporal.businessPeriod}
- Feiertag: ${contextData.temporal.isHoliday ? 'Ja' : 'Nein'}
- Mittagsrush: ${contextData.temporal.lunchRush ? 'Ja' : 'Nein'}

WETTER:
- Bedingungen: ${contextData.weather.current.condition}
- Temperatur: ${contextData.weather.current.temperature}°C
- Business-Impact: ${contextData.weather.impact}
- Komfort-Index: ${contextData.weather.comfort || 'unknown'}

EVENTS:
${contextData.events.length > 0 ?
  contextData.events.map(event =>
    `- ${event.name}: ${event.expectedAttendees} Besucher, ${event.distance}m entfernt`
  ).join('\n') :
  '- Keine Events in der Nähe'
}

BUSINESS-STATUS:
- Aktuelle Bestellungen: ${contextData.business.currentOrders}
- Tagesumsatz: ${formatCurrency(contextData.business.dailyRevenue, 'CHF')}
- Personal: ${contextData.business.staffPresent}/${contextData.business.staffRequired}
- Warteschlange: ${contextData.business.queueLength} Personen
- Küchen-Kapazität: ${Math.round(contextData.business.kitchenCapacity * 100)}%

SOZIAL/WIRTSCHAFTLICH:
- Kundenzufriedenheit: ${contextData.business.customerSatisfaction}/5
- Social Mentions: ${contextData.social.socialMentions}
- Kaufkraft: ${contextData.economic.purchasingPower}
- Konsumentenvertrauen: ${contextData.economic.consumerConfidence}

Analysiere die Gesamtsituation und antworte in folgendem JSON-Format:

{
  "situationAssessment": {
    "overall": "excellent|good|neutral|challenging|poor",
    "businessOpportunity": "very_high|high|medium|low|very_low",
    "riskLevel": "very_low|low|medium|high|very_high",
    "confidence": 0.0-1.0
  },
  "insights": [
    "Insight 1",
    "Insight 2"
  ],
  "recommendations": [
    {
      "priority": "high|medium|low",
      "action": "Konkrete Handlung",
      "reasoning": "Begründung",
      "timeframe": "immediate|short_term|long_term"
    }
  ],
  "nextActions": [
    "Sofortige Aktion 1",
    "Sofortige Aktion 2"
  ],
  "confidence": 0.0-1.0
}

Fokussiere auf:
1. Optimale Nutzung der aktuellen Situation
2. Risiko-Minimierung
3. Umsatz-Maximierung
4. Kundenerfahrung-Optimierung
5. Operative Effizienz`;
  }

  /**
   * Health Check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.openai.models.list();
      await this.db.collection('_health').doc('ai_context').set({
        lastCheck: new Date(),
        service: 'context-analyzer'
      });
      return true;
    } catch (error) {
      console.error('Context Analyzer health check failed:', error);
      return false;
    }
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    this.contextCache.clear();
    this.locationData.clear();
    this.eventCache.clear();
    console.log('Context Analyzer shut down');
  }

  // Helper Methods
  private isCacheValid(analysis: ContextAnalysis): boolean {
    return new Date() < new Date(analysis.validUntil);
  }

  private async loadSwissLocationData(): Promise<void> {
    // Lade Schweizer Geodaten, PLZ, Kantone etc.
  }

  private async loadEventCalendar(): Promise<void> {
    // Lade Event-Kalender für die Schweiz
  }

  private async reverseGeocode(coordinates: { lat: number; lng: number }): Promise<any> {
    // Implementation für Reverse Geocoding
    return {
      address: 'Bahnhofstrasse 1, 8001 Zürich',
      district: 'Zürich',
      canton: 'ZH'
    };
  }

  private async analyzeSurroundings(coordinates: { lat: number; lng: number }): Promise<any> {
    // Analysiere Umgebung (POIs, ÖV, Parking)
    return {
      pointsOfInterest: [],
      publicTransport: 'excellent',
      parking: 'limited'
    };
  }

  private async calculateAccessibility(coordinates: { lat: number; lng: number }): Promise<any> {
    // Berechne Accessibility Score
    return {
      publicTransport: 'excellent',
      walkability: 'high',
      bikeability: 'medium',
      carAccess: 'good'
    };
  }

  private async analyzeFootTraffic(coordinates: { lat: number; lng: number }): Promise<string> {
    // Analysiere Fußgängerverkehr
    return 'high';
  }

  private classifyUrbanity(locationDetails: any): string {
    // Klassifiziere Urbanität
    return 'urban';
  }

  private async getDemographics(district: string): Promise<any> {
    // Hole demographische Daten
    return {};
  }

  private async calculateCompetitionDensity(coordinates: { lat: number; lng: number }): Promise<number> {
    // Berechne Konkurrenzdichte
    return 3;
  }

  private classifyBusinessPeriod(hour: number, dayOfWeek: number): string {
    if (hour >= 6 && hour <= 10) return 'breakfast';
    if (hour >= 11 && hour <= 14) return 'lunch';
    if (hour >= 15 && hour <= 17) return 'afternoon';
    if (hour >= 18 && hour <= 22) return 'dinner';
    return 'off_hours';
  }

  private getSeason(month: number): string {
    if (month >= 2 && month <= 4) return 'Frühling';
    if (month >= 5 && month <= 7) return 'Sommer';
    if (month >= 8 && month <= 10) return 'Herbst';
    return 'Winter';
  }

  private async checkSchoolHolidays(date: Date): Promise<boolean> {
    // Prüfe Schweizer Schulferien
    return false;
  }

  private async fetchSwissWeatherData(coordinates: { lat: number; lng: number }): Promise<any> {
    // MeteoSwiss API Call
    return {
      current: {
        condition: 'sunny',
        temperature: 22,
        humidity: 65,
        windSpeed: 5,
        precipitation: 0,
        visibility: 10,
        uvIndex: 6
      },
      forecast: [],
      alerts: []
    };
  }

  private calculateWeatherImpact(weather: any): string {
    if (weather.temperature > 25 && weather.condition === 'sunny') return 'very_positive';
    if (weather.temperature > 20 && weather.condition === 'sunny') return 'positive';
    if (weather.precipitation > 5) return 'negative';
    return 'neutral';
  }

  private calculateComfortIndex(weather: any): string {
    // Berechne Komfort-Index basierend auf Wetter
    return 'comfortable';
  }

  private async findNearbyEvents(coordinates: any, radiusKm: number, date: Date): Promise<any[]> {
    // Finde Events in der Nähe
    return [];
  }

  private async calculateEventImpact(event: any, coordinates: any): Promise<string> {
    // Berechne Event Impact
    return 'medium';
  }

  private calculateEventRelevance(event: any, tenant: any): number {
    // Berechne Event Relevanz
    return 0.5;
  }

  private async analyzeSocialMentions(tenantName: string): Promise<number> {
    // Analysiere Social Media Mentions
    return 5;
  }

  private async analyzeFoodTrends(): Promise<any[]> {
    // Analysiere Food Trends
    return [];
  }

  private async analyzeCustomerSentiment(tenantId: string): Promise<string> {
    // Analysiere Kundenstimmung
    return 'positive';
  }

  private calculateViralPotential(mentions: number, trends: any[]): number {
    // Berechne Viral Potential
    return mentions * 0.1;
  }

  private async checkInfluencerActivity(location: any): Promise<boolean> {
    // Prüfe Influencer Activity
    return false;
  }

  private async fetchSwissEconomicData(): Promise<any> {
    // Hole Schweizer Wirtschaftsdaten
    return {
      inflation: 2.1,
      unemployment: 2.8,
      consumerConfidence: 102,
      purchasingPower: 'high',
      businessSentiment: 'positive'
    };
  }

  private getSeasonalSpendingPattern(): string {
    // Hole saisonales Ausgabenmuster
    return 'normal';
  }

  private generateInsights(contextData: ContextData, aiInsights: string[]): ContextInsight[] {
    // Generiere strukturierte Insights
    return aiInsights.map(insight => ({
      type: 'general',
      message: insight,
      confidence: 0.8,
      impact: 'medium'
    }));
  }

  private calculateLocationImpact(location: LocationContext): number {
    // Berechne Location Impact Score
    return 0.8;
  }

  private calculateTemporalImpact(temporal: TemporalContext): number {
    // Berechne Temporal Impact Score
    return temporal.lunchRush ? 0.9 : 0.6;
  }

  private calculateWeatherImpactScore(weather: WeatherContext): number {
    // Berechne Weather Impact Score
    return weather.impact === 'positive' ? 0.8 : 0.5;
  }

  private calculateEventsImpact(events: EventContext[]): number {
    // Berechne Events Impact Score
    return events.length > 0 ? 0.7 : 0.3;
  }

  private calculateSocialImpact(social: SocialContext): number {
    // Berechne Social Impact Score
    return 0.6;
  }

  private calculateEconomicImpact(economic: EconomicContext): number {
    // Berechne Economic Impact Score
    return 0.7;
  }

  private calculateBusinessImpact(business: any): number {
    // Berechne Business Impact Score
    return business.queueLength > 5 ? 0.9 : 0.6;
  }

  private calculateOpportunityScore(contextData: ContextData): number {
    // Berechne Overall Opportunity Score
    return 0.75;
  }

  private identifyRisks(contextData: ContextData): string[] {
    const risks: string[] = [];

    if (contextData.weather.current.precipitation > 5) {
      risks.push('Starker Regen kann Umsatz reduzieren');
    }

    if (contextData.business.staffPresent < contextData.business.staffRequired) {
      risks.push('Personalmangel kann Service beeinträchtigen');
    }

    return risks;
  }

  private assessContextDataQuality(contextData: ContextData): 'high' | 'medium' | 'low' {
    // Bewerte Datenqualität
    return 'high';
  }

  private createFallbackAnalysis(tenantId: string, contextData: ContextData): ContextAnalysis {
    return {
      tenantId,
      contextData,
      situationAssessment: {
        overall: 'neutral',
        businessOpportunity: 'medium',
        riskLevel: 'low',
        confidence: 0.5
      },
      insights: [{
        type: 'general',
        message: 'Basis-Analyse - AI-Fehler aufgetreten',
        confidence: 0.3,
        impact: 'low'
      }],
      recommendations: [{
        priority: 'medium',
        action: 'Manuelle Kontextprüfung',
        reasoning: 'AI-Analyse fehlgeschlagen',
        timeframe: 'immediate'
      }],
      factorImpacts: {
        location: 0.5,
        temporal: 0.5,
        weather: 0.5,
        events: 0.3,
        social: 0.5,
        economic: 0.5,
        business: 0.5
      },
      opportunityScore: 0.5,
      risks: ['AI-Analyse nicht verfügbar'],
      nextActions: ['System prüfen'],
      analyzedAt: new Date(),
      validUntil: new Date(Date.now() + 10 * 60 * 1000),
      confidence: 0.3,
      dataQuality: 'low'
    };
  }

  private async getRecentOrders(tenantId: string, since: Date): Promise<any[]> {
    // Implementation
    return [];
  }

  private async getStaffStatus(tenantId: string): Promise<any> {
    // Implementation
    return { present: 2, required: 3 };
  }

  private async getInventoryStatus(tenantId: string): Promise<any> {
    // Implementation
    return { overallLevel: 0.8, lowStock: [] };
  }

  private async getRecentFeedback(tenantId: string, since: Date): Promise<any[]> {
    // Implementation
    return [];
  }

  private calculateAvgRating(feedback: any[]): number {
    if (feedback.length === 0) return 0;
    const ratings = feedback.map(f => f.rating).filter(r => r > 0);
    return ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
  }

  private async getCurrentQueueLength(tenantId: string): Promise<number> {
    return 3;
  }

  private async getKitchenCapacity(tenantId: string): Promise<number> {
    return 0.75;
  }

  private async logContextAnalysis(tenantId: string, analysis: ContextAnalysis): Promise<void> {
    await this.db.collection('context_analyses').add({
      tenantId,
      ...analysis,
      analyzedAt: new Date()
    });
  }
}
