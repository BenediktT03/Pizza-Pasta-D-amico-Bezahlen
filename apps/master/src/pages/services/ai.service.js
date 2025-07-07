/**
 * EATECH AI Integration Service
 * Version: 1.0.0
 * 
 * AI/ML service integration for Master Control System
 * Features:
 * - Predictive analytics
 * - Anomaly detection
 * - Natural language processing
 * - Recommendation engine
 * - Pattern recognition
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/master/src/services/ai.service.js
 */

import masterApiService from './masterApi.service';
import monitoringService from './monitoring.service';

class AIService {
  constructor() {
    this.modelEndpoints = {
      anomalyDetection: '/ai/anomaly-detection',
      demandPrediction: '/ai/demand-prediction',
      revenueForecasting: '/ai/revenue-forecast',
      userBehavior: '/ai/user-behavior',
      sentimentAnalysis: '/ai/sentiment',
      imageRecognition: '/ai/image-recognition'
    };
    
    this.modelCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.predictionHistory = [];
    this.confidenceThreshold = 0.7;
  }

  /**
   * Detect anomalies in system metrics
   */
  async detectAnomalies(metrics, options = {}) {
    const {
      sensitivity = 'medium',
      lookbackHours = 24,
      includeContext = true
    } = options;

    try {
      const response = await masterApiService.post(this.modelEndpoints.anomalyDetection, {
        metrics,
        sensitivity,
        lookbackHours,
        includeContext
      });

      const anomalies = response.anomalies.filter(a => a.confidence >= this.confidenceThreshold);
      
      // Log significant anomalies
      if (anomalies.length > 0) {
        this.logAnomalies(anomalies);
      }

      return {
        anomalies,
        summary: this.generateAnomalySummary(anomalies),
        recommendations: response.recommendations
      };
    } catch (error) {
      console.error('Anomaly detection failed:', error);
      return {
        anomalies: [],
        summary: 'Anomaly detection unavailable',
        error: error.message
      };
    }
  }

  /**
   * Predict demand for tenants
   */
  async predictDemand(tenantId, options = {}) {
    const {
      horizon = 7, // days
      includeEvents = true,
      includeWeather = true,
      includeHistorical = true
    } = options;

    const cacheKey = `demand_${tenantId}_${horizon}`;
    const cached = this.getCachedPrediction(cacheKey);
    if (cached) return cached;

    try {
      const response = await masterApiService.post(this.modelEndpoints.demandPrediction, {
        tenantId,
        horizon,
        features: {
          includeEvents,
          includeWeather,
          includeHistorical
        }
      });

      const prediction = {
        tenantId,
        predictions: response.predictions,
        confidence: response.confidence,
        factors: response.contributingFactors,
        recommendations: this.generateDemandRecommendations(response),
        generatedAt: new Date()
      };

      this.cachePrediction(cacheKey, prediction);
      this.savePredictionHistory(prediction);

      return prediction;
    } catch (error) {
      console.error('Demand prediction failed:', error);
      return null;
    }
  }

  /**
   * Forecast revenue
   */
  async forecastRevenue(params = {}) {
    const {
      tenantId = null, // null for platform-wide
      period = 'month',
      periods = 3,
      includeSeasonality = true,
      includeTrends = true
    } = params;

    try {
      const response = await masterApiService.post(this.modelEndpoints.revenueForecasting, {
        tenantId,
        period,
        periods,
        models: {
          includeSeasonality,
          includeTrends,
          includeRegression: true,
          includeTimeSeries: true
        }
      });

      return {
        forecast: response.forecast,
        confidence: response.confidence,
        methodology: response.methodology,
        risks: response.identifiedRisks,
        opportunities: response.identifiedOpportunities,
        visualization: this.prepareVisualizationData(response)
      };
    } catch (error) {
      console.error('Revenue forecasting failed:', error);
      return null;
    }
  }

  /**
   * Analyze user behavior patterns
   */
  async analyzeUserBehavior(userId = null, options = {}) {
    const {
      timeframe = '30d',
      includeSegmentation = true,
      includePredictions = true
    } = options;

    try {
      const response = await masterApiService.post(this.modelEndpoints.userBehavior, {
        userId,
        timeframe,
        analysis: {
          includeSegmentation,
          includePredictions,
          includeChurnRisk: true,
          includeLTV: true
        }
      });

      return {
        segments: response.segments,
        patterns: response.patterns,
        predictions: {
          churnRisk: response.churnRisk,
          lifetimeValue: response.lifetimeValue,
          nextPurchase: response.nextPurchasePrediction
        },
        recommendations: response.recommendations
      };
    } catch (error) {
      console.error('User behavior analysis failed:', error);
      return null;
    }
  }

  /**
   * Perform sentiment analysis on reviews/feedback
   */
  async analyzeSentiment(texts, options = {}) {
    const {
      language = 'de',
      includeEmotions = true,
      includeTopics = true
    } = options;

    if (!Array.isArray(texts)) {
      texts = [texts];
    }

    try {
      const response = await masterApiService.post(this.modelEndpoints.sentimentAnalysis, {
        texts,
        language,
        analysis: {
          includeEmotions,
          includeTopics,
          includeKeyPhrases: true
        }
      });

      return {
        overall: this.calculateOverallSentiment(response.results),
        details: response.results,
        emotions: response.emotions,
        topics: response.topics,
        insights: this.generateSentimentInsights(response)
      };
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
      return null;
    }
  }

  /**
   * Recognize and analyze food images
   */
  async analyzeImage(imageData, options = {}) {
    const {
      detectFood = true,
      detectQuality = true,
      detectPresentation = true
    } = options;

    try {
      const response = await masterApiService.post(this.modelEndpoints.imageRecognition, {
        image: imageData,
        analysis: {
          detectFood,
          detectQuality,
          detectPresentation,
          detectIngredients: true
        }
      });

      return {
        foodItems: response.detectedFood,
        quality: response.qualityScore,
        presentation: response.presentationScore,
        ingredients: response.possibleIngredients,
        suggestions: response.improvementSuggestions
      };
    } catch (error) {
      console.error('Image analysis failed:', error);
      return null;
    }
  }

  /**
   * Get AI insights dashboard
   */
  async getAIInsights(tenantId = null) {
    const insights = {
      anomalies: [],
      predictions: {},
      recommendations: [],
      alerts: []
    };

    // Get current metrics
    const metrics = monitoringService.getSystemStatus();
    
    // Run anomaly detection
    const anomalyResults = await this.detectAnomalies(metrics.metrics);
    insights.anomalies = anomalyResults.anomalies;

    // Get demand predictions
    if (tenantId) {
      insights.predictions.demand = await this.predictDemand(tenantId);
    }

    // Get revenue forecast
    insights.predictions.revenue = await this.forecastRevenue({ tenantId });

    // Generate AI-powered recommendations
    insights.recommendations = this.generateRecommendations({
      anomalies: anomalyResults,
      predictions: insights.predictions,
      metrics: metrics
    });

    // Generate alerts for critical insights
    insights.alerts = this.generateAIAlerts(insights);

    return insights;
  }

  /**
   * Train custom model
   */
  async trainModel(modelType, trainingData, options = {}) {
    const {
      validationSplit = 0.2,
      epochs = 100,
      batchSize = 32,
      learningRate = 0.001
    } = options;

    try {
      const response = await masterApiService.post('/ai/train', {
        modelType,
        trainingData,
        hyperparameters: {
          validationSplit,
          epochs,
          batchSize,
          learningRate
        }
      });

      return {
        modelId: response.modelId,
        trainingMetrics: response.metrics,
        validationMetrics: response.validation,
        status: response.status,
        estimatedTime: response.estimatedTime
      };
    } catch (error) {
      console.error('Model training failed:', error);
      return null;
    }
  }

  // Helper methods
  generateAnomalySummary(anomalies) {
    if (anomalies.length === 0) {
      return 'No significant anomalies detected';
    }

    const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
    const highCount = anomalies.filter(a => a.severity === 'high').length;

    return `Detected ${anomalies.length} anomalies: ${criticalCount} critical, ${highCount} high priority`;
  }

  generateDemandRecommendations(prediction) {
    const recommendations = [];
    
    // Check for demand spikes
    const spikes = prediction.predictions.filter(p => p.value > p.average * 1.5);
    if (spikes.length > 0) {
      recommendations.push({
        type: 'preparation',
        priority: 'high',
        message: `Prepare for ${spikes.length} demand spikes in the next ${prediction.horizon} days`,
        actions: ['Increase inventory', 'Schedule additional staff', 'Prepare backup suppliers']
      });
    }

    // Check for low demand periods
    const lows = prediction.predictions.filter(p => p.value < p.average * 0.5);
    if (lows.length > 0) {
      recommendations.push({
        type: 'optimization',
        priority: 'medium',
        message: `${lows.length} low demand periods predicted`,
        actions: ['Consider promotions', 'Reduce operating hours', 'Minimize inventory']
      });
    }

    return recommendations;
  }

  generateSentimentInsights(sentimentData) {
    const insights = [];
    
    const avgSentiment = sentimentData.results.reduce((sum, r) => sum + r.score, 0) / sentimentData.results.length;
    
    if (avgSentiment < 0.3) {
      insights.push({
        type: 'alert',
        message: 'Overall sentiment is negative',
        recommendation: 'Immediate action required to address customer concerns'
      });
    }

    // Topic-based insights
    if (sentimentData.topics) {
      const negativeTopics = sentimentData.topics.filter(t => t.sentiment < 0.3);
      negativeTopics.forEach(topic => {
        insights.push({
          type: 'improvement',
          message: `Negative sentiment detected for: ${topic.name}`,
          recommendation: `Review and improve ${topic.name} based on customer feedback`
        });
      });
    }

    return insights;
  }

  prepareVisualizationData(forecastData) {
    return {
      historical: forecastData.historical.map(point => ({
        date: point.date,
        value: point.value,
        type: 'actual'
      })),
      forecast: forecastData.forecast.map(point => ({
        date: point.date,
        value: point.value,
        confidence: point.confidence,
        type: 'forecast'
      })),
      confidenceBands: forecastData.confidenceBands
    };
  }

  calculateOverallSentiment(results) {
    const total = results.reduce((sum, r) => sum + r.score, 0);
    const average = total / results.length;
    
    return {
      score: average,
      label: average >= 0.7 ? 'positive' : average >= 0.4 ? 'neutral' : 'negative',
      distribution: {
        positive: results.filter(r => r.score >= 0.7).length,
        neutral: results.filter(r => r.score >= 0.4 && r.score < 0.7).length,
        negative: results.filter(r => r.score < 0.4).length
      }
    };
  }

  generateRecommendations(data) {
    const recommendations = [];
    
    // Based on anomalies
    if (data.anomalies.anomalies.length > 0) {
      recommendations.push({
        category: 'system',
        priority: 'high',
        title: 'Address System Anomalies',
        description: `${data.anomalies.anomalies.length} anomalies detected requiring attention`,
        actions: data.anomalies.recommendations
      });
    }

    // Based on predictions
    if (data.predictions.revenue && data.predictions.revenue.risks) {
      data.predictions.revenue.risks.forEach(risk => {
        recommendations.push({
          category: 'revenue',
          priority: risk.severity,
          title: risk.title,
          description: risk.description,
          actions: risk.mitigationSteps
        });
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  generateAIAlerts(insights) {
    const alerts = [];
    
    // Critical anomalies
    const criticalAnomalies = insights.anomalies.filter(a => a.severity === 'critical');
    if (criticalAnomalies.length > 0) {
      alerts.push({
        type: 'anomaly',
        severity: 'critical',
        message: `${criticalAnomalies.length} critical anomalies detected`,
        timestamp: new Date()
      });
    }

    // Low confidence predictions
    if (insights.predictions.revenue && insights.predictions.revenue.confidence < 0.6) {
      alerts.push({
        type: 'prediction',
        severity: 'warning',
        message: 'Low confidence in revenue predictions - consider updating model',
        timestamp: new Date()
      });
    }

    return alerts;
  }

  logAnomalies(anomalies) {
    anomalies.forEach(anomaly => {
      console.log(`Anomaly detected: ${anomaly.metric} - ${anomaly.description}`);
    });
  }

  getCachedPrediction(key) {
    const cached = this.modelCache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.modelCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  cachePrediction(key, data) {
    this.modelCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  savePredictionHistory(prediction) {
    this.predictionHistory.push(prediction);
    
    // Keep only last 1000 predictions
    if (this.predictionHistory.length > 1000) {
      this.predictionHistory = this.predictionHistory.slice(-1000);
    }
  }
}

// Create singleton instance
const aiService = new AIService();

export default aiService;