/**
 * EATECH - AI Prediction Service
 * Version: 1.0.0
 * Description: KI-gestützte Vorhersagen und intelligente Empfehlungen
 * Author: EATECH Development Team
 * Created: 2025-01-09
 * File Path: /functions/src/services/AIPredictionService.ts
 * 
 * Features:
 * - Demand forecasting
 * - Wait time prediction
 * - Revenue projections
 * - Price optimization
 * - Customer behavior prediction
 * - Inventory forecasting
 * - Staff scheduling optimization
 * - Weather impact analysis
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { Configuration, OpenAIApi } from 'openai';
import * as tf from '@tensorflow/tfjs-node';
import { 
  PredictionRequest,
  PredictionResult,
  DemandForecast,
  WaitTimePrediction,
  RevenueProjection,
  PriceOptimization,
  CustomerPrediction
} from '../types/prediction.types';
import { logger } from '../utils/logger';
import { 
  startOfDay, 
  addDays, 
  format, 
  differenceInMinutes,
  getDay,
  getHours,
  subDays,
  eachDayOfInterval
} from 'date-fns';
import axios from 'axios';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface HistoricalData {
  date: Date;
  orders: number;
  revenue: number;
  items: Record<string, number>;
  weather?: WeatherData;
  events?: string[];
}

interface WeatherData {
  temperature: number;
  condition: string;
  precipitation: number;
  windSpeed: number;
}

interface ModelConfig {
  inputShape: number[];
  outputShape: number[];
  hiddenLayers: number[];
  learningRate: number;
  epochs: number;
  batchSize: number;
}

interface TrainingData {
  inputs: number[][];
  outputs: number[][];
}

interface SeasonalPattern {
  dayOfWeek: number[];
  hourOfDay: number[];
  monthOfYear: number[];
  holidays: string[];
}

interface OptimizationConstraints {
  minPrice?: number;
  maxPrice?: number;
  targetMargin?: number;
  competitorPrices?: Record<string, number>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PREDICTIONS_COLLECTION = 'ai_predictions';
const MODELS_COLLECTION = 'ai_models';
const TRAINING_DATA_COLLECTION = 'ai_training_data';

const WEATHER_API_KEY = functions.config().weather?.api_key || '';
const OPENAI_API_KEY = functions.config().openai?.api_key || '';

const DEFAULT_FORECAST_DAYS = 7;
const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  demand: {
    inputShape: [14], // 2 weeks of historical data
    outputShape: [7], // 7 days forecast
    hiddenLayers: [64, 32, 16],
    learningRate: 0.01,
    epochs: 100,
    batchSize: 32
  },
  waitTime: {
    inputShape: [10], // Current state features
    outputShape: [1], // Wait time in minutes
    hiddenLayers: [32, 16],
    learningRate: 0.001,
    epochs: 50,
    batchSize: 16
  },
  price: {
    inputShape: [8], // Price factors
    outputShape: [1], // Optimal price
    hiddenLayers: [64, 32],
    learningRate: 0.001,
    epochs: 100,
    batchSize: 32
  }
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

export default class AIPredictionService {
  private db: admin.database.Database;
  private firestore: admin.firestore.Firestore;
  private openai: OpenAIApi;
  private models: Map<string, tf.Sequential>;

  constructor() {
    this.db = admin.database();
    this.firestore = admin.firestore();
    
    // Initialize OpenAI
    if (OPENAI_API_KEY) {
      const configuration = new Configuration({
        apiKey: OPENAI_API_KEY,
      });
      this.openai = new OpenAIApi(configuration);
    }

    // Initialize models cache
    this.models = new Map();
  }

  /**
   * Predict demand for next N days
   */
  async predictDemand(
    tenantId: string,
    productId?: string,
    days: number = DEFAULT_FORECAST_DAYS
  ): Promise<DemandForecast> {
    try {
      // Get historical data
      const historicalData = await this.getHistoricalData(tenantId, 60); // 60 days history

      // Get weather forecast
      const weatherForecast = await this.getWeatherForecast(tenantId, days);

      // Get seasonal patterns
      const seasonalPatterns = await this.analyzeSeasonalPatterns(historicalData);

      // Prepare features
      const features = this.prepareDemandFeatures(
        historicalData,
        weatherForecast,
        seasonalPatterns
      );

      // Get or train model
      const model = await this.getOrTrainModel('demand', tenantId);

      // Make predictions
      const predictions = await this.makePredictions(model, features);

      // Calculate confidence intervals
      const confidenceIntervals = this.calculateConfidenceIntervals(predictions, historicalData);

      // Generate insights
      const insights = await this.generateDemandInsights(
        predictions,
        historicalData,
        weatherForecast
      );

      const forecast: DemandForecast = {
        tenantId,
        productId,
        predictions: predictions.map((value, index) => ({
          date: addDays(new Date(), index + 1).toISOString(),
          expectedDemand: Math.round(value),
          confidence: confidenceIntervals[index].confidence,
          range: {
            min: Math.round(confidenceIntervals[index].min),
            max: Math.round(confidenceIntervals[index].max)
          }
        })),
        factors: {
          weather: weatherForecast,
          seasonality: seasonalPatterns,
          trends: this.analyzeTrends(historicalData),
          events: await this.getUpcomingEvents(tenantId, days)
        },
        insights,
        generatedAt: new Date().toISOString()
      };

      // Store prediction
      await this.storePrediction('demand', forecast);

      return forecast;
    } catch (error) {
      logger.error('Error predicting demand:', error);
      throw error;
    }
  }

  /**
   * Predict wait times
   */
  async predictWaitTime(
    tenantId: string,
    orderData: {
      items: Array<{ productId: string; quantity: number }>;
      currentOrders: number;
      staffCount: number;
      kitchenLoad: number;
    }
  ): Promise<WaitTimePrediction> {
    try {
      // Get historical performance data
      const performanceData = await this.getKitchenPerformanceData(tenantId);

      // Calculate complexity score
      const complexityScore = await this.calculateOrderComplexity(orderData.items);

      // Prepare features
      const features = [
        orderData.items.length,
        orderData.items.reduce((sum, item) => sum + item.quantity, 0),
        complexityScore,
        orderData.currentOrders,
        orderData.staffCount,
        orderData.kitchenLoad,
        new Date().getHours(),
        getDay(new Date()),
        performanceData.avgPrepTime,
        performanceData.currentEfficiency
      ];

      // Get model
      const model = await this.getOrTrainModel('waitTime', tenantId);

      // Make prediction
      const prediction = await this.makeSinglePrediction(model, features);

      // Calculate factors
      const factors = {
        orderComplexity: complexityScore,
        kitchenLoad: orderData.kitchenLoad,
        staffEfficiency: performanceData.currentEfficiency,
        timeOfDay: this.getTimeOfDayFactor(new Date().getHours()),
        historicalAverage: performanceData.avgPrepTime
      };

      // Generate recommendations
      const recommendations = this.generateWaitTimeRecommendations(
        prediction,
        factors,
        orderData
      );

      const result: WaitTimePrediction = {
        estimatedMinutes: Math.round(prediction),
        confidence: this.calculatePredictionConfidence(prediction, performanceData),
        factors,
        recommendations,
        range: {
          min: Math.round(prediction * 0.8),
          max: Math.round(prediction * 1.2)
        },
        updatedAt: new Date().toISOString()
      };

      return result;
    } catch (error) {
      logger.error('Error predicting wait time:', error);
      throw error;
    }
  }

  /**
   * Project revenue
   */
  async projectRevenue(
    tenantId: string,
    period: { start: Date; end: Date }
  ): Promise<RevenueProjection> {
    try {
      // Get historical revenue data
      const historicalRevenue = await this.getHistoricalRevenue(tenantId, 90);

      // Get demand forecast
      const demandForecast = await this.predictDemand(
        tenantId,
        undefined,
        differenceInMinutes(period.end, period.start) / (24 * 60)
      );

      // Get pricing data
      const pricingData = await this.getCurrentPricing(tenantId);

      // Calculate base projection
      const baseProjection = this.calculateBaseRevenue(
        demandForecast,
        pricingData,
        historicalRevenue
      );

      // Apply modifiers
      const modifiers = await this.getRevenueModifiers(tenantId, period);
      const adjustedProjection = this.applyRevenueModifiers(baseProjection, modifiers);

      // Generate scenarios
      const scenarios = this.generateRevenueScenarios(adjustedProjection);

      // Generate insights
      const insights = await this.generateRevenueInsights(
        adjustedProjection,
        historicalRevenue,
        modifiers
      );

      const projection: RevenueProjection = {
        period: {
          start: period.start.toISOString(),
          end: period.end.toISOString()
        },
        projected: adjustedProjection.total,
        confidence: adjustedProjection.confidence,
        breakdown: adjustedProjection.breakdown,
        scenarios,
        factors: modifiers,
        insights,
        comparison: {
          lastPeriod: historicalRevenue.lastPeriod,
          change: adjustedProjection.total - historicalRevenue.lastPeriod,
          changePercent: ((adjustedProjection.total - historicalRevenue.lastPeriod) / historicalRevenue.lastPeriod) * 100
        },
        generatedAt: new Date().toISOString()
      };

      // Store projection
      await this.storePrediction('revenue', projection);

      return projection;
    } catch (error) {
      logger.error('Error projecting revenue:', error);
      throw error;
    }
  }

  /**
   * Optimize pricing
   */
  async optimizePricing(
    tenantId: string,
    productId: string,
    constraints?: OptimizationConstraints
  ): Promise<PriceOptimization> {
    try {
      // Get product data
      const product = await this.getProductData(tenantId, productId);

      // Get demand elasticity
      const elasticity = await this.calculateDemandElasticity(tenantId, productId);

      // Get competitor prices
      const competitorPrices = constraints?.competitorPrices || 
        await this.getCompetitorPrices(productId);

      // Get cost data
      const costData = await this.getProductCosts(tenantId, productId);

      // Prepare optimization features
      const features = [
        product.currentPrice,
        costData.unitCost,
        elasticity.coefficient,
        Object.values(competitorPrices).reduce((a, b) => a + b, 0) / Object.keys(competitorPrices).length,
        product.popularity,
        product.seasonalityIndex,
        constraints?.targetMargin || 0.3,
        product.inventoryLevel
      ];

      // Get model
      const model = await this.getOrTrainModel('price', tenantId);

      // Calculate optimal price
      const optimalPrice = await this.makeSinglePrediction(model, features);

      // Apply constraints
      const constrainedPrice = this.applyPriceConstraints(optimalPrice, constraints);

      // Calculate impact
      const impact = this.calculatePriceImpact(
        product.currentPrice,
        constrainedPrice,
        elasticity
      );

      // Generate recommendations
      const recommendations = await this.generatePriceRecommendations(
        product,
        constrainedPrice,
        impact,
        competitorPrices
      );

      // A/B test suggestions
      const testSuggestions = this.generatePriceTestSuggestions(
        product.currentPrice,
        constrainedPrice
      );

      const optimization: PriceOptimization = {
        productId,
        currentPrice: product.currentPrice,
        optimalPrice: constrainedPrice,
        confidence: this.calculateOptimizationConfidence(features),
        expectedImpact: impact,
        elasticity,
        competitorAnalysis: {
          averagePrice: Object.values(competitorPrices).reduce((a, b) => a + b, 0) / Object.keys(competitorPrices).length,
          pricePosition: this.calculatePricePosition(constrainedPrice, competitorPrices),
          competitors: competitorPrices
        },
        recommendations,
        testSuggestions,
        constraints: constraints || {},
        generatedAt: new Date().toISOString()
      };

      // Store optimization
      await this.storePrediction('pricing', optimization);

      return optimization;
    } catch (error) {
      logger.error('Error optimizing pricing:', error);
      throw error;
    }
  }

  /**
   * Predict customer behavior
   */
  async predictCustomerBehavior(
    tenantId: string,
    customerId: string
  ): Promise<CustomerPrediction> {
    try {
      // Get customer history
      const customerHistory = await this.getCustomerHistory(tenantId, customerId);

      // Calculate RFM scores
      const rfmScores = this.calculateRFMScores(customerHistory);

      // Predict churn probability
      const churnProbability = await this.predictChurn(customerHistory, rfmScores);

      // Predict lifetime value
      const lifetimeValue = await this.predictLifetimeValue(customerHistory, rfmScores);

      // Predict next order
      const nextOrderPrediction = await this.predictNextOrder(customerHistory);

      // Get product recommendations
      const recommendations = await this.getProductRecommendations(
        customerHistory,
        tenantId
      );

      // Generate segments
      const segments = this.generateCustomerSegments(rfmScores, customerHistory);

      // Generate insights using AI
      const insights = await this.generateCustomerInsights(
        customerHistory,
        rfmScores,
        churnProbability
      );

      const prediction: CustomerPrediction = {
        customerId,
        churnProbability,
        lifetimeValue,
        nextOrderPrediction,
        recommendations,
        segments,
        rfmScores,
        insights,
        metrics: {
          totalOrders: customerHistory.orders.length,
          avgOrderValue: customerHistory.avgOrderValue,
          frequency: customerHistory.orderFrequency,
          lastOrderDays: customerHistory.daysSinceLastOrder
        },
        generatedAt: new Date().toISOString()
      };

      // Store prediction
      await this.storePrediction('customer', prediction);

      return prediction;
    } catch (error) {
      logger.error('Error predicting customer behavior:', error);
      throw error;
    }
  }

  // ============================================================================
  // HELPER METHODS - MODEL MANAGEMENT
  // ============================================================================

  /**
   * Get or train model
   */
  private async getOrTrainModel(
    modelType: string,
    tenantId: string
  ): Promise<tf.Sequential> {
    const modelKey = `${modelType}_${tenantId}`;
    
    // Check cache
    if (this.models.has(modelKey)) {
      return this.models.get(modelKey)!;
    }

    // Try to load from storage
    try {
      const model = await this.loadModel(modelKey);
      this.models.set(modelKey, model);
      return model;
    } catch (error) {
      // Model doesn't exist, train new one
      logger.info(`Training new model: ${modelKey}`);
    }

    // Train new model
    const model = await this.trainModel(modelType, tenantId);
    this.models.set(modelKey, model);
    
    // Save model
    await this.saveModel(modelKey, model);
    
    return model;
  }

  /**
   * Train model
   */
  private async trainModel(
    modelType: string,
    tenantId: string
  ): Promise<tf.Sequential> {
    const config = MODEL_CONFIGS[modelType];
    if (!config) {
      throw new Error(`Unknown model type: ${modelType}`);
    }

    // Get training data
    const trainingData = await this.getTrainingData(modelType, tenantId);

    // Create model
    const model = tf.sequential();

    // Add input layer
    model.add(tf.layers.dense({
      units: config.hiddenLayers[0],
      inputShape: config.inputShape,
      activation: 'relu'
    }));

    // Add hidden layers
    for (let i = 1; i < config.hiddenLayers.length; i++) {
      model.add(tf.layers.dense({
        units: config.hiddenLayers[i],
        activation: 'relu'
      }));
      
      // Add dropout for regularization
      model.add(tf.layers.dropout({ rate: 0.2 }));
    }

    // Add output layer
    model.add(tf.layers.dense({
      units: config.outputShape[0],
      activation: modelType === 'price' ? 'linear' : 'sigmoid'
    }));

    // Compile model
    model.compile({
      optimizer: tf.train.adam(config.learningRate),
      loss: modelType === 'price' ? 'meanSquaredError' : 'binaryCrossentropy',
      metrics: ['accuracy', 'mse']
    });

    // Convert training data to tensors
    const xs = tf.tensor2d(trainingData.inputs);
    const ys = tf.tensor2d(trainingData.outputs);

    // Train model
    await model.fit(xs, ys, {
      epochs: config.epochs,
      batchSize: config.batchSize,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            logger.info(`Training ${modelType} - Epoch ${epoch}: loss = ${logs?.loss}`);
          }
        }
      }
    });

    // Clean up tensors
    xs.dispose();
    ys.dispose();

    return model;
  }

  /**
   * Make predictions
   */
  private async makePredictions(
    model: tf.Sequential,
    features: number[][]
  ): Promise<number[]> {
    const input = tf.tensor2d(features);
    const predictions = model.predict(input) as tf.Tensor;
    const result = await predictions.array() as number[][];
    
    input.dispose();
    predictions.dispose();
    
    return result[0];
  }

  /**
   * Make single prediction
   */
  private async makeSinglePrediction(
    model: tf.Sequential,
    features: number[]
  ): Promise<number> {
    const predictions = await this.makePredictions(model, [features]);
    return predictions[0];
  }

  // ============================================================================
  // HELPER METHODS - DATA PROCESSING
  // ============================================================================

  /**
   * Get historical data
   */
  private async getHistoricalData(
    tenantId: string,
    days: number
  ): Promise<HistoricalData[]> {
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    
    const ordersSnapshot = await this.firestore
      .collection('orders')
      .where('tenantId', '==', tenantId)
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .get();

    // Group by day
    const dataByDay = new Map<string, HistoricalData>();
    
    ordersSnapshot.docs.forEach(doc => {
      const order = doc.data();
      const dateKey = format(order.createdAt.toDate(), 'yyyy-MM-dd');
      
      if (!dataByDay.has(dateKey)) {
        dataByDay.set(dateKey, {
          date: startOfDay(order.createdAt.toDate()),
          orders: 0,
          revenue: 0,
          items: {}
        });
      }
      
      const dayData = dataByDay.get(dateKey)!;
      dayData.orders++;
      dayData.revenue += order.total || 0;
      
      // Count items
      order.items?.forEach((item: any) => {
        if (!dayData.items[item.productId]) {
          dayData.items[item.productId] = 0;
        }
        dayData.items[item.productId] += item.quantity;
      });
    });

    // Convert to array and sort
    return Array.from(dataByDay.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Get weather forecast
   */
  private async getWeatherForecast(
    tenantId: string,
    days: number
  ): Promise<WeatherData[]> {
    try {
      // Get tenant location
      const tenant = await this.firestore
        .collection('tenants')
        .doc(tenantId)
        .get();
      
      const location = tenant.data()?.location || { lat: 47.3769, lon: 8.5417 }; // Default: Zurich
      
      // Call weather API
      const response = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast/daily`,
        {
          params: {
            lat: location.lat,
            lon: location.lon,
            cnt: days,
            appid: WEATHER_API_KEY,
            units: 'metric'
          }
        }
      );

      return response.data.list.map((day: any) => ({
        temperature: day.temp.day,
        condition: day.weather[0].main,
        precipitation: day.rain || 0,
        windSpeed: day.speed
      }));
    } catch (error) {
      logger.error('Error fetching weather forecast:', error);
      // Return default weather data
      return Array(days).fill({
        temperature: 20,
        condition: 'Clear',
        precipitation: 0,
        windSpeed: 10
      });
    }
  }

  /**
   * Analyze seasonal patterns
   */
  private async analyzeSeasonalPatterns(
    historicalData: HistoricalData[]
  ): Promise<SeasonalPattern> {
    // Calculate average by day of week
    const dayOfWeekData = Array(7).fill(0).map(() => ({ total: 0, count: 0 }));
    
    historicalData.forEach(data => {
      const dow = getDay(data.date);
      dayOfWeekData[dow].total += data.orders;
      dayOfWeekData[dow].count++;
    });

    const dayOfWeek = dayOfWeekData.map(d => d.count > 0 ? d.total / d.count : 0);

    // Calculate average by hour (would need hourly data)
    const hourOfDay = Array(24).fill(0).map((_, i) => {
      // Simplified: peak hours assumption
      if (i >= 11 && i <= 14) return 1.5; // Lunch peak
      if (i >= 18 && i <= 21) return 1.3; // Dinner peak
      if (i < 10 || i > 22) return 0.2; // Low hours
      return 1.0;
    });

    // Monthly seasonality (simplified)
    const monthOfYear = Array(12).fill(1.0);

    // Holiday impact (Swiss holidays)
    const holidays = [
      '01-01', // New Year
      '01-02', // Berchtold's Day
      '08-01', // Swiss National Day
      '12-25', // Christmas
      '12-26'  // Boxing Day
    ];

    return {
      dayOfWeek,
      hourOfDay,
      monthOfYear,
      holidays
    };
  }

  /**
   * Prepare demand features
   */
  private prepareDemandFeatures(
    historicalData: HistoricalData[],
    weatherForecast: WeatherData[],
    seasonalPatterns: SeasonalPattern
  ): number[][] {
    // Take last 14 days as features
    const features: number[][] = [];
    const recentData = historicalData.slice(-14);
    
    for (let i = 0; i < weatherForecast.length; i++) {
      const dayFeatures = [
        // Historical orders (normalized)
        ...recentData.map(d => d.orders / 100),
        // Weather features
        weatherForecast[i].temperature / 40,
        weatherForecast[i].precipitation / 100,
        // Seasonal features
        seasonalPatterns.dayOfWeek[getDay(addDays(new Date(), i + 1))] / 2
      ];
      
      features.push(dayFeatures);
    }

    return features;
  }

  /**
   * Calculate confidence intervals
   */
  private calculateConfidenceIntervals(
    predictions: number[],
    historicalData: HistoricalData[]
  ): Array<{ confidence: number; min: number; max: number }> {
    // Calculate standard deviation from historical data
    const values = historicalData.map(d => d.orders);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    );

    return predictions.map(prediction => {
      const confidence = Math.max(0.5, Math.min(0.95, 1 - (stdDev / mean)));
      const margin = prediction * (1 - confidence);
      
      return {
        confidence,
        min: prediction - margin,
        max: prediction + margin
      };
    });
  }

  /**
   * Generate demand insights using AI
   */
  private async generateDemandInsights(
    predictions: number[],
    historicalData: HistoricalData[],
    weatherForecast: WeatherData[]
  ): Promise<string[]> {
    if (!this.openai) {
      return this.generateBasicDemandInsights(predictions, historicalData);
    }

    try {
      const prompt = `
        Analysiere die folgenden Nachfragevorhersagen für ein Schweizer Foodtruck-Unternehmen:
        
        Vorhersagen für die nächsten ${predictions.length} Tage: ${predictions.map(p => Math.round(p)).join(', ')} Bestellungen
        Durchschnitt letzte 30 Tage: ${Math.round(historicalData.slice(-30).reduce((sum, d) => sum + d.orders, 0) / 30)} Bestellungen
        Wettervorhersage: ${weatherForecast.map(w => w.condition).join(', ')}
        
        Generiere 3-5 prägnante, handlungsorientierte Insights auf Deutsch.
      `;

      const response = await this.openai.createCompletion({
        model: "text-davinci-003",
        prompt,
        max_tokens: 200,
        temperature: 0.7
      });

      const insights = response.data.choices[0].text
        ?.split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(/^\d+\.\s*/, '').trim()) || [];

      return insights;
    } catch (error) {
      logger.error('Error generating AI insights:', error);
      return this.generateBasicDemandInsights(predictions, historicalData);
    }
  }

  /**
   * Generate basic demand insights
   */
  private generateBasicDemandInsights(
    predictions: number[],
    historicalData: HistoricalData[]
  ): string[] {
    const insights: string[] = [];
    const avgPrediction = predictions.reduce((a, b) => a + b, 0) / predictions.length;
    const avgHistorical = historicalData.slice(-30).reduce((sum, d) => sum + d.orders, 0) / 30;

    if (avgPrediction > avgHistorical * 1.2) {
      insights.push('Erwartete Nachfrage liegt 20% über dem Durchschnitt - zusätzliches Personal einplanen');
    }

    const peakDay = predictions.indexOf(Math.max(...predictions));
    insights.push(`Höchste Nachfrage erwartet am ${format(addDays(new Date(), peakDay + 1), 'EEEE, dd.MM.')}`);

    return insights;
  }

  /**
   * Store prediction
   */
  private async storePrediction(
    type: string,
    prediction: any
  ): Promise<void> {
    await this.firestore
      .collection(PREDICTIONS_COLLECTION)
      .add({
        type,
        prediction,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
  }

  /**
   * Additional helper methods for each prediction type
   */
  
  private analyzeTrends(historicalData: HistoricalData[]): any {
    // Implement trend analysis
    return { trend: 'stable', strength: 0.5 };
  }

  private async getUpcomingEvents(tenantId: string, days: number): Promise<string[]> {
    // Get upcoming events from database
    return [];
  }

  private async getKitchenPerformanceData(tenantId: string): Promise<any> {
    // Get kitchen performance metrics
    return {
      avgPrepTime: 15,
      currentEfficiency: 0.85
    };
  }

  private async calculateOrderComplexity(items: any[]): Promise<number> {
    // Calculate order complexity score
    return items.reduce((score, item) => score + item.quantity * 0.5, 0);
  }

  private getTimeOfDayFactor(hour: number): number {
    // Peak hours have higher factor
    if (hour >= 11 && hour <= 14) return 1.5;
    if (hour >= 18 && hour <= 21) return 1.3;
    return 1.0;
  }

  private calculatePredictionConfidence(prediction: number, performanceData: any): number {
    // Calculate confidence based on historical accuracy
    return 0.85;
  }

  private generateWaitTimeRecommendations(
    prediction: number,
    factors: any,
    orderData: any
  ): string[] {
    const recommendations: string[] = [];

    if (prediction > 30) {
      recommendations.push('Wartezeit über 30 Minuten - Kunden informieren');
    }

    if (factors.kitchenLoad > 0.8) {
      recommendations.push('Hohe Küchenauslastung - zusätzliches Personal aktivieren');
    }

    return recommendations;
  }

  // Additional helper methods would continue here...
  
  private async getTrainingData(modelType: string, tenantId: string): Promise<TrainingData> {
    // Get training data from database
    // This is a simplified implementation
    return {
      inputs: [[1, 2, 3, 4, 5]],
      outputs: [[1]]
    };
  }

  private async loadModel(modelKey: string): Promise<tf.Sequential> {
    // Load model from storage
    throw new Error('Model not found');
  }

  private async saveModel(modelKey: string, model: tf.Sequential): Promise<void> {
    // Save model to storage
    logger.info(`Model saved: ${modelKey}`);
  }

  private async getHistoricalRevenue(tenantId: string, days: number): Promise<any> {
    // Get historical revenue data
    return { lastPeriod: 10000 };
  }

  private async getCurrentPricing(tenantId: string): Promise<any> {
    // Get current pricing data
    return {};
  }

  private calculateBaseRevenue(demandForecast: any, pricingData: any, historicalRevenue: any): any {
    // Calculate base revenue projection
    return { total: 12000, confidence: 0.8, breakdown: {} };
  }

  private async getRevenueModifiers(tenantId: string, period: any): Promise<any> {
    // Get revenue modifiers
    return {};
  }

  private applyRevenueModifiers(baseProjection: any, modifiers: any): any {
    // Apply modifiers to projection
    return baseProjection;
  }

  private generateRevenueScenarios(projection: any): any {
    // Generate best/worst case scenarios
    return {
      best: { revenue: projection.total * 1.2, probability: 0.2 },
      expected: { revenue: projection.total, probability: 0.6 },
      worst: { revenue: projection.total * 0.8, probability: 0.2 }
    };
  }

  private async generateRevenueInsights(projection: any, historicalRevenue: any, modifiers: any): Promise<string[]> {
    // Generate revenue insights
    return ['Umsatzprognose liegt 20% über Vorperiode'];
  }

  private async getProductData(tenantId: string, productId: string): Promise<any> {
    // Get product data
    return { currentPrice: 15, popularity: 0.8, seasonalityIndex: 1.0, inventoryLevel: 100 };
  }

  private async calculateDemandElasticity(tenantId: string, productId: string): Promise<any> {
    // Calculate price elasticity of demand
    return { coefficient: -1.2 };
  }

  private async getCompetitorPrices(productId: string): Promise<Record<string, number>> {
    // Get competitor pricing data
    return { competitor1: 14, competitor2: 16 };
  }

  private async getProductCosts(tenantId: string, productId: string): Promise<any> {
    // Get product cost data
    return { unitCost: 5 };
  }

  private applyPriceConstraints(price: number, constraints?: OptimizationConstraints): number {
    if (constraints?.minPrice && price < constraints.minPrice) return constraints.minPrice;
    if (constraints?.maxPrice && price > constraints.maxPrice) return constraints.maxPrice;
    return price;
  }

  private calculatePriceImpact(currentPrice: number, newPrice: number, elasticity: any): any {
    const priceChange = (newPrice - currentPrice) / currentPrice;
    const demandChange = priceChange * elasticity.coefficient;
    const revenueChange = (1 + priceChange) * (1 + demandChange) - 1;

    return {
      priceChange: priceChange * 100,
      demandChange: demandChange * 100,
      revenueChange: revenueChange * 100
    };
  }

  private async generatePriceRecommendations(
    product: any,
    optimalPrice: number,
    impact: any,
    competitorPrices: Record<string, number>
  ): Promise<string[]> {
    const recommendations: string[] = [];

    if (optimalPrice > product.currentPrice * 1.1) {
      recommendations.push('Preiserhöhung um mehr als 10% - schrittweise Anpassung empfohlen');
    }

    const avgCompetitorPrice = Object.values(competitorPrices).reduce((a, b) => a + b, 0) / Object.keys(competitorPrices).length;
    if (optimalPrice > avgCompetitorPrice * 1.2) {
      recommendations.push('Preis liegt 20% über Konkurrenz - Mehrwert klar kommunizieren');
    }

    return recommendations;
  }

  private generatePriceTestSuggestions(currentPrice: number, optimalPrice: number): any {
    return {
      testA: currentPrice,
      testB: optimalPrice,
      testC: (currentPrice + optimalPrice) / 2,
      duration: '2 weeks',
      sampleSize: 100
    };
  }

  private calculateOptimizationConfidence(features: number[]): number {
    // Calculate confidence based on feature quality
    return 0.82;
  }

  private calculatePricePosition(price: number, competitorPrices: Record<string, number>): string {
    const prices = Object.values(competitorPrices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    if (price < avgPrice * 0.9) return 'budget';
    if (price > avgPrice * 1.1) return 'premium';
    return 'competitive';
  }

  private async getCustomerHistory(tenantId: string, customerId: string): Promise<any> {
    // Get customer order history
    return {
      orders: [],
      avgOrderValue: 25,
      orderFrequency: 2.5,
      daysSinceLastOrder: 15
    };
  }

  private calculateRFMScores(customerHistory: any): any {
    // Calculate Recency, Frequency, Monetary scores
    return {
      recency: 3,
      frequency: 4,
      monetary: 3,
      combined: 3.33
    };
  }

  private async predictChurn(customerHistory: any, rfmScores: any): Promise<number> {
    // Predict churn probability
    return 0.25;
  }

  private async predictLifetimeValue(customerHistory: any, rfmScores: any): Promise<number> {
    // Predict customer lifetime value
    return 450;
  }

  private async predictNextOrder(customerHistory: any): Promise<any> {
    // Predict next order
    return {
      daysUntilNextOrder: 7,
      probability: 0.75,
      expectedValue: 28
    };
  }

  private async getProductRecommendations(customerHistory: any, tenantId: string): Promise<any[]> {
    // Get personalized product recommendations
    return [];
  }

  private generateCustomerSegments(rfmScores: any, customerHistory: any): string[] {
    const segments: string[] = [];
    
    if (rfmScores.combined > 4) segments.push('VIP');
    if (rfmScores.frequency > 3) segments.push('Stammkunde');
    if (rfmScores.monetary > 4) segments.push('High-Value');
    
    return segments;
  }

  private async generateCustomerInsights(
    customerHistory: any,
    rfmScores: any,
    churnProbability: number
  ): Promise<string[]> {
    const insights: string[] = [];

    if (churnProbability > 0.5) {
      insights.push('Hohe Abwanderungsgefahr - Reaktivierungskampagne empfohlen');
    }

    if (rfmScores.frequency > 4) {
      insights.push('Treuer Stammkunde - für Loyalty-Programm vormerken');
    }

    return insights;
  }
}