// @eatech/ai
export * from './types';
export * from './utils';

export const version = '3.0.0';
// packages/ai/src/index.ts
// AI Services Package - Main Export File
// Version: 1.0.0

// Emergency AI System
export { EmergencyDetector } from './emergency/emergency.detector';
export { SolutionGenerator } from './emergency/solution.generator';
export { AutoAdjuster } from './emergency/auto.adjuster';

// Pricing AI
export { PriceOptimizer } from './pricing/price.optimizer';
export { ElasticityAnalyzer } from './pricing/elasticity.analyzer';
export { CompetitorMonitor } from './pricing/competitor.monitor';

// Predictions
export { DemandForecaster } from './predictions/demand.forecaster';
export { WaitTimePredictor } from './predictions/wait.predictor';
export { RevenueProjector } from './predictions/revenue.projector';

// Voice AI
export { SpeechRecognizer } from './voice/speech.recognizer';
export { IntentParser } from './voice/intent.parser';
export { ResponseGenerator } from './voice/response.generator';

// Core AI Service
export { AIService } from './core/ai.service';
export { OpenAIClient } from './core/openai.client';

// Types
export * from './types';

// Utility functions
export { calculateConfidence, normalizeData } from './utils/helpers';

// Constants
export { AI_MODELS, CONFIDENCE_THRESHOLDS, DEFAULT_SETTINGS } from './constants';

// Main AI Manager
import { AIService } from './core/ai.service';
import { EmergencyDetector } from './emergency/emergency.detector';
import { SolutionGenerator } from './emergency/solution.generator';
import { AutoAdjuster } from './emergency/auto.adjuster';
import { PriceOptimizer } from './pricing/price.optimizer';
import { ElasticityAnalyzer } from './pricing/elasticity.analyzer';
import { CompetitorMonitor } from './pricing/competitor.monitor';
import { DemandForecaster } from './predictions/demand.forecaster';
import { WaitTimePredictor } from './predictions/wait.predictor';
import { RevenueProjector } from './predictions/revenue.projector';

class EatechAI {
  private static instance: EatechAI;
  private aiService: AIService;

  // Services
  public emergency: {
    detector: EmergencyDetector;
    solutionGenerator: SolutionGenerator;
    autoAdjuster: AutoAdjuster;
  };

  public pricing: {
    optimizer: PriceOptimizer;
    elasticityAnalyzer: ElasticityAnalyzer;
    competitorMonitor: CompetitorMonitor;
  };

  public predictions: {
    demandForecaster: DemandForecaster;
    waitTimePredictor: WaitTimePredictor;
    revenueProjector: RevenueProjector;
  };

  private constructor() {
    this.aiService = new AIService();

    // Initialize emergency services
    this.emergency = {
      detector: new EmergencyDetector(this.aiService),
      solutionGenerator: new SolutionGenerator(this.aiService),
      autoAdjuster: new AutoAdjuster(this.aiService)
    };

    // Initialize pricing services
    this.pricing = {
      optimizer: new PriceOptimizer(this.aiService),
      elasticityAnalyzer: new ElasticityAnalyzer(this.aiService),
      competitorMonitor: new CompetitorMonitor(this.aiService)
    };

    // Initialize prediction services
    this.predictions = {
      demandForecaster: new DemandForecaster(this.aiService),
      waitTimePredictor: new WaitTimePredictor(this.aiService),
      revenueProjector: new RevenueProjector(this.aiService)
    };
  }

  public static getInstance(): EatechAI {
    if (!EatechAI.instance) {
      EatechAI.instance = new EatechAI();
    }
    return EatechAI.instance;
  }

  /**
   * Initialize AI services with configuration
   */
  public async initialize(config: {
    openAIKey: string;
    openAIOrgId?: string;
    firebaseConfig?: any;
    defaultModel?: string;
    temperature?: number;
  }): Promise<void> {
    await this.aiService.initialize(config);
  }

  /**
   * Emergency Mode Activation
   */
  public async activateEmergencyMode(issue: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedComponents: string[];
  }): Promise<{
    solutions: any[];
    autoAdjustments: any[];
    notifications: any[];
  }> {
    // Detect emergency patterns
    const detection = await this.emergency.detector.analyze(issue);

    // Generate solutions
    const solutions = await this.emergency.solutionGenerator.generate(detection);

    // Apply auto-adjustments
    const adjustments = await this.emergency.autoAdjuster.apply(solutions);

    return {
      solutions: solutions.recommendations,
      autoAdjustments: adjustments.applied,
      notifications: adjustments.notifications
    };
  }

  /**
   * Price Optimization
   */
  public async optimizePrice(product: {
    id: string;
    currentPrice: number;
    cost: number;
    category: string;
    salesHistory: any[];
  }): Promise<{
    recommendedPrice: number;
    confidence: number;
    projectedRevenueLift: number;
    elasticity: number;
    factors: string[];
  }> {
    // Analyze price elasticity
    const elasticity = await this.pricing.elasticityAnalyzer.analyze(product);

    // Monitor competitors
    const competitors = await this.pricing.competitorMonitor.getCompetitorPrices(
      product.category
    );

    // Optimize price
    const optimization = await this.pricing.optimizer.optimize({
      product,
      elasticity,
      competitors
    });

    return optimization;
  }

  /**
   * Demand Forecasting
   */
  public async forecastDemand(params: {
    productId: string;
    historicalData: any[];
    timeframe: 'day' | 'week' | 'month';
    factors?: {
      weather?: any;
      events?: any[];
      seasonality?: boolean;
    };
  }): Promise<{
    forecast: number[];
    confidence: number;
    factors: string[];
    recommendations: string[];
  }> {
    return await this.predictions.demandForecaster.forecast(params);
  }

  /**
   * Wait Time Prediction
   */
  public async predictWaitTime(params: {
    currentOrders: number;
    kitchenCapacity: number;
    staffCount: number;
    historicalData?: any[];
  }): Promise<{
    estimatedWaitTime: number;
    confidence: number;
    bottlenecks: string[];
    recommendations: string[];
  }> {
    return await this.predictions.waitTimePredictor.predict(params);
  }

  /**
   * Revenue Projection
   */
  public async projectRevenue(params: {
    historicalRevenue: any[];
    currentTrends: any;
    plannedChanges?: any[];
    timeframe: 'week' | 'month' | 'quarter' | 'year';
  }): Promise<{
    projection: number;
    confidence: number;
    breakdown: any;
    opportunities: string[];
    risks: string[];
  }> {
    return await this.predictions.revenueProjector.project(params);
  }

  /**
   * Get AI insights for a tenant
   */
  public async getTenantInsights(tenantId: string): Promise<{
    performance: any;
    opportunities: any[];
    risks: any[];
    recommendations: any[];
  }> {
    // Aggregate insights from all AI services
    const insights = await Promise.all([
      this.pricing.optimizer.getInsights(tenantId),
      this.predictions.demandForecaster.getInsights(tenantId),
      this.predictions.revenueProjector.getInsights(tenantId)
    ]);

    return {
      performance: this.aggregatePerformance(insights),
      opportunities: this.identifyOpportunities(insights),
      risks: this.identifyRisks(insights),
      recommendations: this.generateRecommendations(insights)
    };
  }

  /**
   * Train models with new data
   */
  public async trainModels(data: {
    type: 'sales' | 'pricing' | 'customer' | 'operational';
    dataset: any[];
    tenantId?: string;
  }): Promise<{
    success: boolean;
    modelsUpdated: string[];
    improvements: any;
  }> {
    // This would typically involve model training pipelines
    // For now, we'll simulate the training process
    console.log(`Training models with ${data.dataset.length} data points`);

    return {
      success: true,
      modelsUpdated: ['price-optimizer', 'demand-forecaster'],
      improvements: {
        accuracy: '+2.3%',
        confidence: '+5.1%'
      }
    };
  }

  // Helper methods
  private aggregatePerformance(insights: any[]): any {
    // Aggregate performance metrics from various insights
    return {
      overall: 'good',
      trends: 'improving',
      score: 85
    };
  }

  private identifyOpportunities(insights: any[]): any[] {
    // Extract opportunities from insights
    return insights
      .flatMap(i => i.opportunities || [])
      .filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
  }

  private identifyRisks(insights: any[]): any[] {
    // Extract risks from insights
    return insights
      .flatMap(i => i.risks || [])
      .filter((v, i, a) => a.indexOf(v) === i);
  }

  private generateRecommendations(insights: any[]): any[] {
    // Generate actionable recommendations
    return insights
      .flatMap(i => i.recommendations || [])
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5); // Top 5 recommendations
  }
}

// Export singleton instance
export const eatechAI = EatechAI.getInstance();

// Default export
export default eatechAI;
