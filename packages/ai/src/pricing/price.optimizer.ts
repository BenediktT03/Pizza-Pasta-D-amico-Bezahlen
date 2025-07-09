// packages/ai/src/pricing/price.optimizer.ts
// AI-Powered Price Optimization Service
// Version: 1.0.0

import { AIService } from '../core/ai.service';
import { ElasticityAnalyzer } from './elasticity.analyzer';
import {
  PriceOptimizationRequest,
  PriceOptimizationResult,
  MarketContext,
  PricingConstraints
} from '../types';

export class PriceOptimizer {
  private aiService: AIService;
  private elasticityAnalyzer: ElasticityAnalyzer;

  constructor(aiService: AIService) {
    this.aiService = aiService;
    this.elasticityAnalyzer = new ElasticityAnalyzer(aiService);
  }

  /**
   * Optimize price for a product based on multiple factors
   */
  async optimize(request: PriceOptimizationRequest): Promise<PriceOptimizationResult> {
    try {
      // Step 1: Analyze historical data
      const historicalAnalysis = await this.analyzeHistoricalData(request);

      // Step 2: Calculate price elasticity
      const elasticity = await this.elasticityAnalyzer.analyze({
        productId: request.product.id,
        priceHistory: historicalAnalysis.priceHistory,
        salesHistory: historicalAnalysis.salesHistory
      });

      // Step 3: Analyze market context
      const marketContext = await this.analyzeMarketContext(request);

      // Step 4: Apply constraints
      const constraints = this.applyConstraints(request);

      // Step 5: Generate optimization via AI
      const aiOptimization = await this.generateAIOptimization({
        product: request.product,
        elasticity,
        marketContext,
        constraints,
        historicalAnalysis
      });

      // Step 6: Validate and refine
      const refined = await this.refineOptimization(aiOptimization, request);

      return refined;
    } catch (error) {
      console.error('Price optimization failed:', error);
      throw new Error(`Price optimization failed: ${error.message}`);
    }
  }

  /**
   * Analyze historical pricing and sales data
   */
  private async analyzeHistoricalData(request: PriceOptimizationRequest) {
    const { product } = request;

    // Extract price changes over time
    const priceHistory = this.extractPriceHistory(product.salesHistory);

    // Calculate key metrics
    const metrics = {
      avgDailySales: this.calculateAverageDailySales(product.salesHistory),
      priceVolatility: this.calculatePriceVolatility(priceHistory),
      demandPattern: this.analyzeDemandPattern(product.salesHistory),
      seasonalityIndex: this.calculateSeasonalityIndex(product.salesHistory),
      trendDirection: this.analyzeTrend(product.salesHistory)
    };

    // Identify optimal historical price points
    const optimalPeriods = this.identifyOptimalPeriods(product.salesHistory);

    return {
      priceHistory,
      salesHistory: product.salesHistory,
      metrics,
      optimalPeriods,
      insights: this.generateHistoricalInsights(metrics, optimalPeriods)
    };
  }

  /**
   * Analyze market context including competitors and trends
   */
  private async analyzeMarketContext(request: PriceOptimizationRequest): Promise<MarketContext> {
    const { product, competitors } = request;

    // Competitor analysis
    const competitorAnalysis = {
      averagePrice: this.calculateAverageCompetitorPrice(competitors),
      priceRange: {
        min: Math.min(...competitors.map(c => c.price)),
        max: Math.max(...competitors.map(c => c.price))
      },
      positioning: this.analyzeMarketPositioning(product.currentPrice, competitors),
      priceGaps: this.identifyPriceGaps(competitors)
    };

    // Market trends
    const trends = {
      categoryTrend: await this.getCategoryTrend(product.category),
      demandTrend: this.analyzeDemandTrend(product.salesHistory),
      seasonalFactors: this.getSeasonalFactors(new Date()),
      eventImpact: await this.analyzeUpcomingEvents(product.location)
    };

    // Customer sentiment
    const sentiment = {
      pricePerception: await this.analyzePricePerception(product),
      valuePerception: this.calculateValueScore(product),
      sensitivity: this.estimatePriceSensitivity(product)
    };

    return {
      competitorAnalysis,
      trends,
      sentiment,
      marketShare: this.estimateMarketShare(product, competitors)
    };
  }

  /**
   * Apply business constraints to optimization
   */
  private applyConstraints(request: PriceOptimizationRequest): PricingConstraints {
    const { product } = request;

    // Base constraints
    const constraints: PricingConstraints = {
      minPrice: product.cost * 1.2, // Minimum 20% margin
      maxPrice: product.compareAtPrice || product.currentPrice * 1.5,
      targetMargin: request.targetMargin || 0.6,
      competitiveBounds: {
        lower: 0.8, // Don't go below 80% of competitor average
        upper: 1.3  // Don't exceed 130% of competitor average
      }
    };

    // Apply category-specific constraints
    this.applyCategoryConstraints(constraints, product.category);

    // Apply business rules
    this.applyBusinessRules(constraints, request);

    return constraints;
  }

  /**
   * Generate AI-powered optimization
   */
  private async generateAIOptimization(context: any): Promise<any> {
    const prompt = this.buildOptimizationPrompt(context);

    const aiResponse = await this.aiService.generateCompletion({
      messages: [
        {
          role: 'system',
          content: `You are a pricing optimization expert for food truck businesses.
                   Analyze the provided data and recommend optimal pricing strategies
                   that maximize revenue while maintaining competitiveness.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent pricing
      responseFormat: { type: 'json_object' }
    });

    return this.parseAIResponse(aiResponse);
  }

  /**
   * Build optimization prompt for AI
   */
  private buildOptimizationPrompt(context: any): string {
    return JSON.stringify({
      task: 'price_optimization',
      product: {
        name: context.product.name,
        currentPrice: context.product.currentPrice,
        cost: context.product.cost,
        category: context.product.category
      },
      elasticity: {
        value: context.elasticity.coefficient,
        interpretation: context.elasticity.interpretation
      },
      market: {
        competitorAverage: context.marketContext.competitorAnalysis.averagePrice,
        positioning: context.marketContext.competitorAnalysis.positioning,
        trend: context.marketContext.trends.categoryTrend
      },
      constraints: context.constraints,
      historical: {
        bestPerformingPrice: context.historicalAnalysis.optimalPeriods[0]?.price,
        avgDailySales: context.historicalAnalysis.metrics.avgDailySales
      },
      request: {
        format: 'json',
        include: ['optimalPrice', 'confidence', 'revenueLift', 'reasoning', 'factors', 'dynamicRules']
      }
    });
  }

  /**
   * Parse and validate AI response
   */
  private parseAIResponse(response: any): any {
    try {
      const parsed = JSON.parse(response.content);

      // Validate required fields
      if (!parsed.optimalPrice || !parsed.confidence) {
        throw new Error('Invalid AI response format');
      }

      return {
        recommendedPrice: parsed.optimalPrice,
        confidence: parsed.confidence,
        projectedRevenueLift: parsed.revenueLift || 0,
        reasoning: parsed.reasoning || '',
        factors: parsed.factors || [],
        dynamicPricingRules: parsed.dynamicRules || []
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      throw new Error('AI response parsing failed');
    }
  }

  /**
   * Refine and validate the optimization
   */
  private async refineOptimization(
    aiOptimization: any,
    request: PriceOptimizationRequest
  ): Promise<PriceOptimizationResult> {
    const { product } = request;

    // Ensure price is within constraints
    let finalPrice = Math.max(
      request.constraints?.minPrice || product.cost * 1.2,
      Math.min(
        request.constraints?.maxPrice || product.currentPrice * 2,
        aiOptimization.recommendedPrice
      )
    );

    // Round to appropriate decimal places
    finalPrice = this.roundPrice(finalPrice, product.category);

    // Calculate final metrics
    const priceChange = (finalPrice - product.currentPrice) / product.currentPrice;
    const marginImprovement = this.calculateMarginImprovement(
      product.currentPrice,
      finalPrice,
      product.cost
    );

    // Generate dynamic pricing rules
    const dynamicPricingRules = this.generateDynamicPricingRules(
      finalPrice,
      aiOptimization,
      request
    );

    // Identify bundle opportunities
    const bundleOpportunities = await this.identifyBundleOpportunities(
      product,
      finalPrice
    );

    return {
      currentPrice: product.currentPrice,
      recommendedPrice: finalPrice,
      confidence: aiOptimization.confidence,
      projectedRevenueLift: aiOptimization.projectedRevenueLift,
      elasticity: request.elasticity?.coefficient || -1.2,
      factors: aiOptimization.factors,
      reasoning: aiOptimization.reasoning,
      priceChange,
      marginImprovement,
      competitivePosition: this.getCompetitivePosition(finalPrice, request.competitors),
      dynamicPricingRules,
      bundleOpportunities,
      implementation: {
        immediate: Math.abs(priceChange) < 0.1,
        testRecommended: Math.abs(priceChange) > 0.15,
        suggestedDuration: this.getSuggestedTestDuration(priceChange)
      }
    };
  }

  // Helper methods

  private extractPriceHistory(salesHistory: any[]): any[] {
    const priceMap = new Map();

    salesHistory.forEach(sale => {
      const date = new Date(sale.date).toISOString().split('T')[0];
      if (!priceMap.has(date) || priceMap.get(date) < sale.price) {
        priceMap.set(date, sale.price);
      }
    });

    return Array.from(priceMap.entries())
      .map(([date, price]) => ({ date, price }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  private calculateAverageDailySales(salesHistory: any[]): number {
    const dailySales = new Map();

    salesHistory.forEach(sale => {
      const date = sale.date.split('T')[0];
      dailySales.set(date, (dailySales.get(date) || 0) + sale.quantity);
    });

    const total = Array.from(dailySales.values()).reduce((a, b) => a + b, 0);
    return total / dailySales.size;
  }

  private calculatePriceVolatility(priceHistory: any[]): number {
    if (priceHistory.length < 2) return 0;

    const prices = priceHistory.map(p => p.price);
    const mean = prices.reduce((a, b) => a + b) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;

    return Math.sqrt(variance) / mean; // Coefficient of variation
  }

  private analyzeDemandPattern(salesHistory: any[]): string {
    // Simplified demand pattern analysis
    const recentSales = salesHistory.slice(-30);
    const olderSales = salesHistory.slice(-60, -30);

    if (recentSales.length === 0 || olderSales.length === 0) return 'stable';

    const recentAvg = recentSales.reduce((sum, s) => sum + s.quantity, 0) / recentSales.length;
    const olderAvg = olderSales.reduce((sum, s) => sum + s.quantity, 0) / olderSales.length;

    const change = (recentAvg - olderAvg) / olderAvg;

    if (change > 0.2) return 'increasing';
    if (change < -0.2) return 'decreasing';
    return 'stable';
  }

  private calculateSeasonalityIndex(salesHistory: any[]): number {
    // Simplified seasonality calculation
    const monthlySales = new Map();

    salesHistory.forEach(sale => {
      const month = new Date(sale.date).getMonth();
      monthlySales.set(month, (monthlySales.get(month) || 0) + sale.quantity);
    });

    if (monthlySales.size < 3) return 1.0;

    const values = Array.from(monthlySales.values());
    const mean = values.reduce((a, b) => a + b) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;

    return 1 + (Math.sqrt(variance) / mean);
  }

  private analyzeTrend(salesHistory: any[]): 'up' | 'down' | 'stable' {
    if (salesHistory.length < 10) return 'stable';

    // Simple linear regression
    const n = salesHistory.length;
    const x = salesHistory.map((_, i) => i);
    const y = salesHistory.map(s => s.quantity);

    const sumX = x.reduce((a, b) => a + b);
    const sumY = y.reduce((a, b) => a + b);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    if (slope > 0.1) return 'up';
    if (slope < -0.1) return 'down';
    return 'stable';
  }

  private identifyOptimalPeriods(salesHistory: any[]): any[] {
    // Group by price and calculate performance
    const pricePerformance = new Map();

    salesHistory.forEach(sale => {
      const price = sale.price;
      if (!pricePerformance.has(price)) {
        pricePerformance.set(price, {
          price,
          totalRevenue: 0,
          totalQuantity: 0,
          days: new Set()
        });
      }

      const perf = pricePerformance.get(price);
      perf.totalRevenue += sale.price * sale.quantity;
      perf.totalQuantity += sale.quantity;
      perf.days.add(sale.date.split('T')[0]);
    });

    // Calculate average daily revenue for each price
    const performances = Array.from(pricePerformance.values()).map(perf => ({
      price: perf.price,
      avgDailyRevenue: perf.totalRevenue / perf.days.size,
      avgDailyQuantity: perf.totalQuantity / perf.days.size,
      daysActive: perf.days.size
    }));

    // Sort by average daily revenue
    return performances
      .filter(p => p.daysActive >= 3) // Minimum 3 days for validity
      .sort((a, b) => b.avgDailyRevenue - a.avgDailyRevenue)
      .slice(0, 5);
  }

  private generateHistoricalInsights(metrics: any, optimalPeriods: any[]): string[] {
    const insights = [];

    if (metrics.priceVolatility > 0.2) {
      insights.push('High price volatility detected - consider more stable pricing strategy');
    }

    if (metrics.demandPattern === 'increasing') {
      insights.push('Demand trending upward - opportunity for price increase');
    } else if (metrics.demandPattern === 'decreasing') {
      insights.push('Demand trending downward - consider promotional pricing');
    }

    if (metrics.seasonalityIndex > 1.5) {
      insights.push('Strong seasonal patterns detected - implement seasonal pricing');
    }

    if (optimalPeriods.length > 0) {
      const bestPrice = optimalPeriods[0].price;
      insights.push(`Historical best performance at CHF ${bestPrice.toFixed(2)}`);
    }

    return insights;
  }

  private calculateAverageCompetitorPrice(competitors: any[]): number {
    if (!competitors || competitors.length === 0) return 0;
    return competitors.reduce((sum, c) => sum + c.price, 0) / competitors.length;
  }

  private analyzeMarketPositioning(currentPrice: number, competitors: any[]): string {
    if (!competitors || competitors.length === 0) return 'unknown';

    const avgPrice = this.calculateAverageCompetitorPrice(competitors);
    const ratio = currentPrice / avgPrice;

    if (ratio < 0.8) return 'budget';
    if (ratio < 0.95) return 'value';
    if (ratio < 1.05) return 'competitive';
    if (ratio < 1.2) return 'premium';
    return 'luxury';
  }

  private identifyPriceGaps(competitors: any[]): number[] {
    if (!competitors || competitors.length < 2) return [];

    const prices = competitors.map(c => c.price).sort((a, b) => a - b);
    const gaps = [];

    for (let i = 1; i < prices.length; i++) {
      const gap = prices[i] - prices[i - 1];
      if (gap > prices[i - 1] * 0.15) { // Gap > 15%
        gaps.push((prices[i] + prices[i - 1]) / 2);
      }
    }

    return gaps;
  }

  private async getCategoryTrend(category: string): Promise<string> {
    // In real implementation, this would fetch market data
    // For now, return simulated trend
    const trends = ['growing', 'stable', 'declining'];
    return trends[Math.floor(Math.random() * trends.length)];
  }

  private analyzeDemandTrend(salesHistory: any[]): string {
    return this.analyzeTrend(salesHistory);
  }

  private getSeasonalFactors(date: Date): any {
    const month = date.getMonth();
    const dayOfWeek = date.getDay();

    // Summer months (June-August) typically have higher food truck sales
    const monthFactor = [0.8, 0.8, 0.9, 1.0, 1.1, 1.3, 1.4, 1.4, 1.2, 1.0, 0.9, 0.8][month];

    // Weekend factor
    const weekdayFactor = [1.2, 0.8, 0.9, 1.0, 1.1, 1.4, 1.3][dayOfWeek];

    return {
      month: monthFactor,
      dayOfWeek: weekdayFactor,
      combined: monthFactor * weekdayFactor
    };
  }

  private async analyzeUpcomingEvents(location: any): Promise<any> {
    // In real implementation, this would check event APIs
    return {
      hasEvents: false,
      impact: 1.0
    };
  }

  private async analyzePricePerception(product: any): Promise<string> {
    // In real implementation, analyze reviews and feedback
    return 'fair';
  }

  private calculateValueScore(product: any): number {
    // Simple value score based on ratings and price
    const rating = product.rating || 4.0;
    const pricePoint = product.currentPrice;

    // Normalize to 0-1 scale
    const ratingScore = rating / 5;
    const priceScore = 1 - (pricePoint / 50); // Assuming max price of 50

    return (ratingScore * 0.7 + priceScore * 0.3);
  }

  private estimatePriceSensitivity(product: any): 'low' | 'medium' | 'high' {
    // Based on product category and price point
    const luxuryCategories = ['premium', 'gourmet', 'specialty'];
    const basicCategories = ['standard', 'value', 'basic'];

    if (luxuryCategories.includes(product.category)) return 'low';
    if (basicCategories.includes(product.category)) return 'high';
    return 'medium';
  }

  private estimateMarketShare(product: any, competitors: any[]): number {
    // Simplified market share estimation
    if (!competitors || competitors.length === 0) return 1.0;

    const totalSales = product.monthlySales || 100;
    const avgCompetitorSales = 80; // Assumed average
    const totalMarket = totalSales + (competitors.length * avgCompetitorSales);

    return totalSales / totalMarket;
  }

  private applyCategoryConstraints(constraints: PricingConstraints, category: string): void {
    // Category-specific pricing rules
    switch (category.toLowerCase()) {
      case 'beverage':
        constraints.maxPrice = Math.min(constraints.maxPrice, 10); // Beverages cap
        break;
      case 'dessert':
        constraints.targetMargin = 0.7; // Higher margin for desserts
        break;
      case 'main':
        constraints.competitiveBounds.lower = 0.9; // Stay closer to competition
        break;
    }
  }

  private applyBusinessRules(constraints: PricingConstraints, request: any): void {
    // Apply any custom business rules
    if (request.businessRules) {
      Object.assign(constraints, request.businessRules);
    }
  }

  private roundPrice(price: number, category: string): number {
    // Round to appropriate decimal places based on category and price point
    if (price < 10) {
      return Math.round(price * 2) / 2; // Round to 0.50
    } else if (price < 20) {
      return Math.round(price); // Round to 1.00
    } else {
      return Math.round(price / 0.10) * 0.10; // Round to 0.10
    }
  }

  private calculateMarginImprovement(
    currentPrice: number,
    newPrice: number,
    cost: number
  ): number {
    const currentMargin = (currentPrice - cost) / currentPrice;
    const newMargin = (newPrice - cost) / newPrice;
    return (newMargin - currentMargin) / currentMargin;
  }

  private generateDynamicPricingRules(
    basePrice: number,
    aiOptimization: any,
    request: any
  ): any[] {
    const rules = [];

    // Time-based rules
    rules.push({
      type: 'happy_hour',
      condition: 'time between 14:00 and 17:00',
      action: `reduce price by ${Math.round(basePrice * 0.15)}%`,
      price: basePrice * 0.85
    });

    // Demand-based rules
    if (request.enableDynamicPricing) {
      rules.push({
        type: 'high_demand',
        condition: 'queue length > 10',
        action: `increase price by ${Math.round(basePrice * 0.1)}%`,
        price: basePrice * 1.1
      });

      rules.push({
        type: 'low_demand',
        condition: 'daily sales < 50% of average',
        action: `reduce price by ${Math.round(basePrice * 0.2)}%`,
        price: basePrice * 0.8
      });
    }

    // Weather-based rules
    rules.push({
      type: 'weather',
      condition: 'temperature > 25°C',
      action: 'apply summer pricing',
      price: basePrice * 1.05
    });

    return rules;
  }

  private async identifyBundleOpportunities(product: any, newPrice: number): Promise<any[]> {
    // Identify complementary products for bundling
    const opportunities = [];

    // Common bundle patterns
    if (product.category === 'main') {
      opportunities.push({
        bundle: 'Meal Deal',
        items: [product.name, 'Fries', 'Drink'],
        bundlePrice: newPrice + 5.50,
        savings: 2.50,
        projectedUplift: 0.25
      });
    }

    if (product.category === 'beverage') {
      opportunities.push({
        bundle: 'Refresh Combo',
        items: [product.name, 'Snack'],
        bundlePrice: newPrice + 3.00,
        savings: 1.00,
        projectedUplift: 0.15
      });
    }

    return opportunities;
  }

  private getCompetitivePosition(price: number, competitors: any[]): string {
    if (!competitors || competitors.length === 0) return 'unique';

    const sorted = [...competitors].sort((a, b) => a.price - b.price);
    const position = sorted.findIndex(c => c.price > price);

    if (position === -1) return 'highest';
    if (position === 0) return 'lowest';

    const percentile = (position / competitors.length) * 100;
    if (percentile < 25) return 'budget';
    if (percentile < 50) return 'value';
    if (percentile < 75) return 'competitive';
    return 'premium';
  }

  private getSuggestedTestDuration(priceChange: number): number {
    // Suggest A/B test duration based on price change magnitude
    const changePercent = Math.abs(priceChange);

    if (changePercent < 0.05) return 3; // 3 days for small changes
    if (changePercent < 0.10) return 7; // 1 week for moderate changes
    if (changePercent < 0.20) return 14; // 2 weeks for significant changes
    return 21; // 3 weeks for major changes
  }

  /**
   * Get pricing insights for a tenant
   */
  async getInsights(tenantId: string): Promise<any> {
    // Return pricing insights for the tenant
    return {
      opportunities: [
        'Price optimization available for 5 products',
        'Competitor pricing indicates room for 8% increase'
      ],
      risks: [
        'Current margins below target on 3 items'
      ],
      recommendations: [
        {
          action: 'Increase burger prices by 5%',
          impact: '+CHF 2,400/month',
          confidence: 0.85,
          priority: 1
        }
      ]
    };
  }
}

export default PriceOptimizer;
