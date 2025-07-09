// Pricing Types
export interface PricingRecommendation {
  recommendedPrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  confidence: number;
  reasoning: string[];
  marketPosition: 'budget' | 'value' | 'premium' | 'luxury';
  expectedImpact: {
    priceChange: string;
    expectedVolumeChange: string;
    expectedRevenueChange: string;
    confidence: 'low' | 'medium' | 'high';
  };
  competitors?: CompetitorPricing;
  seasonalAdjustment: number;
}

export interface PricingAnalysis {
  metrics: PricingMetrics;
  opportunities: PricingOpportunity[];
  recommendations: StrategicRecommendation[];
  topPerformers: ProductPerformance[];
  underperformers: ProductPerformance[];
  seasonalTrends: SeasonalTrend[];
  competitorComparison: CompetitorAnalysis;
}

export interface PricingMetrics {
  averageOrderValue: number;
  priceElasticity: number;
  profitMargin: number;
  competitiveIndex: number;
  revenueGrowth: number;
  customerSatisfaction: number;
}

export interface MarketData {
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  priceDistribution: Record<string, number>;
  lastUpdated: Date;
}

export interface CompetitorPricing {
  competitors: Array<{
    name: string;
    price: number;
    distance: number;
    rating: number;
  }>;
  averagePrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  lastUpdated: Date;
}

export interface DynamicPricingRule {
  id: string;
  name: string;
  type: 'time_based' | 'demand_based' | 'inventory_based' | 'weather_based' | 'event_based';
  conditions: any;
  adjustment: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  maxAdjustment?: number;
  categories: string[];
  products?: string[];
  active: boolean;
  priority?: number;
  validFrom?: Date;
  validUntil?: Date;
}

export interface PriceOptimizationStrategy {
  enableTimeBased: boolean;
  enableDemandBased: boolean;
  enableInventoryBased: boolean;
  enableWeatherBased: boolean;
  enableCompetitorBased: boolean;
  maxIncreasePercentage: number;
  maxDecreasePercentage: number;
  updateFrequency: 'realtime' | 'hourly' | 'daily';
  notifyCustomers: boolean;
}

export interface SeasonalPricing {
  season: 'winter' | 'spring' | 'summer' | 'autumn';
  generalAdjustment: number;
  categoryAdjustments: Record<string, number>;
  specialEvents: Array<{
    name: string;
    date: string;
    impact: number;
  }>;
  recommendations: string[];
}

// Prediction Types
export interface SalesPrediction {
  predictions: Array<{
    date: Date;
    value: number;
    confidence: number;
    factors: {
      base: number;
      trend: number;
      seasonal: number;
      special: any[];
    };
  }>;
  confidence: PredictionConfidence;
  factors?: PredictionFactors;
  patterns: any;
  seasonality: SeasonalPattern;
  trend: TrendData;
  accuracy: number;
}

export interface InventoryPrediction {
  currentLevel: number;
  predictions: Array<{
    date: Date;
    expectedInventory: number;
    expectedDemand: number;
    needsReorder: boolean;
    reorderQuantity: number;
  }>;
  reorderPoints: Array<{
    date: Date;
    quantity: number;
    urgency: 'normal' | 'high' | 'critical';
  }>;
  recommendations: string[];
  wasteFactor: number;
  confidence: PredictionConfidence;
}

export interface CustomerBehaviorPrediction {
  patterns: {
    orderFrequency: any;
    preferredTimes: number[];
    preferredDays: number[];
    averageSpend: number;
    favoriteItems: any[];
    seasonalPreferences: any;
  };
  nextOrderPrediction: {
    expectedDate: Date;
    expectedValue: number;
    recommendedItems: any[];
  };
  churnRisk: number;
  lifetimeValue: number;
  recommendations: string[];
  confidence: number;
}

export interface DemandForecast {
  productId: string;
  forecasts: Array<{
    date: Date;
    expectedDemand: number;
    confidence: number;
    factors: {
      trend: number;
      seasonal: number;
      dayOfWeek: number;
    };
  }>;
  accuracy: number;
  recommendations: string[];
}

export interface TrendAnalysis {
  metric: string;
  timeRange: { start: Date; end: Date };
  currentValue: number;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  growthRate: number;
  decomposition: {
    trend: number[];
    seasonal: number[];
    residual: number[];
  };
  changePoints: Array<{
    date: Date;
    oldValue: number;
    newValue: number;
    significance: number;
  }>;
  forecast: Array<{
    date: Date;
    value: number;
    confidence: number;
  }>;
  anomalies: any[];
  insights: string[];
}

export interface AnomalyDetection {
  anomalies: Array<{
    timestamp: Date;
    metric: string;
    actualValue: number;
    expectedValue: number;
    deviation: number;
    severity: number;
    type: 'statistical' | 'pattern' | 'contextual';
    explanation?: string;
  }>;
  alerts: Array<{
    level: 'info' | 'warning' | 'critical';
    message: string;
    action: string;
  }>;
  explanations: Array<{
    anomalyId: string;
    possibleCauses: string[];
    recommendations: string[];
  }>;
  summary: {
    total: number;
    critical: number;
    warning: number;
    info: number;
  };
}

// Shared Types
export interface PredictionModel {
  id: string;
  name: string;
  type: 'timeseries' | 'regression' | 'classification' | 'clustering';
  algorithm: string;
  features: string[];
  accuracy: number;
  lastTrained: Date;
  parameters: any;
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  metadata?: any;
}

export interface SeasonalPattern {
  pattern: 'additive' | 'multiplicative';
  factors: Record<number, number>; // month -> factor
  strength: number;
}

export interface PredictionConfidence {
  overall: number;
  factors: {
    dataQuality: number;
    patternStrength: number;
    forecastHorizon: number;
  };
}

export interface PredictionFactors {
  weather?: any;
  events?: any[];
  holidays?: any[];
  competition?: any;
  economic?: any;
}

export interface TrendData {
  direction: 'increasing' | 'decreasing' | 'stable';
  slope: number;
  intercept: number;
  strength: number;
}

// Analytics Types
export interface PricingOpportunity {
  productId: string;
  productName: string;
  currentPrice: number;
  suggestedPrice: number;
  expectedRevenueIncrease: number;
  confidence: number;
  reason: string;
}

export interface StrategicRecommendation {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  category: 'pricing' | 'promotion' | 'inventory' | 'menu';
  expectedROI: number;
}

export interface ProductPerformance {
  productId: string;
  productName: string;
  revenue: number;
  quantity: number;
  margin: number;
  trend: 'up' | 'down' | 'stable';
  elasticity: number;
}

export interface SeasonalTrend {
  period: string;
  impact: number;
  categories: string[];
  recommendations: string[];
}

export interface CompetitorAnalysis {
  position: 'above' | 'at' | 'below';
  averageDifference: number;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
}

// AI Model Configuration
export interface AIConfiguration {
  tenantId: string;
  models: {
    pricing: {
      enabled: boolean;
      updateFrequency: 'realtime' | 'hourly' | 'daily';
      factors: string[];
      constraints: any;
    };
    prediction: {
      enabled: boolean;
      horizonDays: number;
      confidence: number;
      models: string[];
    };
    anomaly: {
      enabled: boolean;
      sensitivity: 'low' | 'medium' | 'high';
      alertThreshold: number;
      channels: string[];
    };
  };
  dataRetention: {
    rawData: number; // days
    aggregatedData: number; // days
    predictions: number; // days
  };
}

// Training Data
export interface TrainingData {
  id: string;
  tenantId: string;
  modelType: string;
  data: any[];
  labels?: any[];
  metadata: {
    source: string;
    quality: number;
    processed: boolean;
    features: string[];
  };
  createdAt: Date;
  processedAt?: Date;
}

// Model Performance
export interface ModelPerformance {
  modelId: string;
  metrics: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
    mse?: number;
    mae?: number;
    r2?: number;
  };
  confusionMatrix?: number[][];
  featureImportance?: Record<string, number>;
  evaluatedAt: Date;
}

// Insights
export interface AIInsight {
  id: string;
  tenantId: string;
  type: 'opportunity' | 'warning' | 'trend' | 'anomaly';
  category: 'pricing' | 'inventory' | 'customer' | 'operations';
  title: string;
  description: string;
  impact: {
    revenue?: number;
    cost?: number;
    efficiency?: number;
  };
  confidence: number;
  actions: Array<{
    title: string;
    description: string;
    automated: boolean;
  }>;
  validUntil: Date;
  createdAt: Date;
}
