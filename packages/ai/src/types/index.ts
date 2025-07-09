// packages/ai/src/types/index.ts
// Type definitions for AI Services
// Version: 1.0.0

// ============== COMMON TYPES ==============

export interface AIServiceConfig {
  openAIKey: string;
  openAIOrgId?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  firebaseConfig?: any;
}

export interface AIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  confidence?: number;
  metadata?: Record<string, any>;
}

export interface TimeSeriesData {
  date: string | Date;
  value: number;
  metadata?: Record<string, any>;
}

// ============== EMERGENCY AI TYPES ==============

export interface EmergencyIssue {
  id?: string;
  type: EmergencyType;
  severity: EmergencySeverity;
  description: string;
  timestamp: Date;
  affectedComponents: string[];
  context?: Record<string, any>;
}

export type EmergencyType =
  | 'system_outage'
  | 'payment_failure'
  | 'inventory_shortage'
  | 'staff_shortage'
  | 'equipment_failure'
  | 'security_breach'
  | 'quality_issue'
  | 'customer_complaint'
  | 'other';

export type EmergencySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface EmergencySolution {
  id: string;
  action: string;
  priority: number;
  estimatedTime: number; // minutes
  requirements: string[];
  automatable: boolean;
  confidence: number;
}

export interface EmergencyResponse {
  issue: EmergencyIssue;
  solutions: EmergencySolution[];
  autoAdjustments: AutoAdjustment[];
  notifications: EmergencyNotification[];
  estimatedResolutionTime: number;
}

export interface AutoAdjustment {
  type: string;
  target: string;
  action: string;
  value: any;
  applied: boolean;
  timestamp?: Date;
}

export interface EmergencyNotification {
  recipient: string;
  channel: 'sms' | 'email' | 'push' | 'slack';
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  sent?: boolean;
}

// ============== PRICING TYPES ==============

export interface Product {
  id: string;
  name: string;
  category: string;
  currentPrice: number;
  cost: number;
  compareAtPrice?: number;
  rating?: number;
  monthlySales?: number;
  salesHistory?: SaleRecord[];
  location?: any;
}

export interface SaleRecord {
  date: string;
  quantity: number;
  price: number;
  revenue?: number;
}

export interface Competitor {
  name: string;
  price: number;
  distance?: number;
  rating?: number;
}

export interface PriceOptimizationRequest {
  product: Product;
  competitors?: Competitor[];
  elasticity?: ElasticityResult;
  constraints?: PricingConstraints;
  targetMargin?: number;
  enableDynamicPricing?: boolean;
  businessRules?: Record<string, any>;
}

export interface PriceOptimizationResult {
  currentPrice: number;
  recommendedPrice: number;
  confidence: number;
  projectedRevenueLift: number;
  elasticity: number;
  factors: string[];
  reasoning: string;
  priceChange: number;
  marginImprovement: number;
  competitivePosition: string;
  dynamicPricingRules?: DynamicPricingRule[];
  bundleOpportunities?: BundleOpportunity[];
  implementation?: {
    immediate: boolean;
    testRecommended: boolean;
    suggestedDuration: number;
  };
}

export interface PricingConstraints {
  minPrice: number;
  maxPrice: number;
  targetMargin: number;
  competitiveBounds?: {
    lower: number;
    upper: number;
  };
}

export interface DynamicPricingRule {
  type: string;
  condition: string;
  action: string;
  price?: number;
  percentage?: number;
}

export interface BundleOpportunity {
  bundle: string;
  items: string[];
  bundlePrice: number;
  savings: number;
  projectedUplift: number;
}

export interface ElasticityResult {
  coefficient: number;
  interpretation: string;
  confidence: number;
  priceRanges?: {
    elastic: [number, number];
    inelastic: [number, number];
    optimal: [number, number];
  };
}

export interface MarketContext {
  competitorAnalysis: {
    averagePrice: number;
    priceRange: {
      min: number;
      max: number;
    };
    positioning: string;
    priceGaps: number[];
  };
  trends: {
    categoryTrend: string;
    demandTrend: string;
    seasonalFactors: any;
    eventImpact: any;
  };
  sentiment: {
    pricePerception: string;
    valuePerception: number;
    sensitivity: 'low' | 'medium' | 'high';
  };
  marketShare?: number;
}

// ============== PREDICTION TYPES ==============

export interface DemandForecastRequest {
  productId: string;
  historicalData: TimeSeriesData[];
  timeframe: 'day' | 'week' | 'month';
  factors?: {
    weather?: WeatherData;
    events?: EventData[];
    seasonality?: boolean;
    promotions?: PromotionData[];
  };
}

export interface DemandForecastResult {
  forecast: number[];
  confidence: number;
  factors: string[];
  recommendations: string[];
  accuracy?: {
    mape: number; // Mean Absolute Percentage Error
    rmse: number; // Root Mean Square Error
  };
}

export interface WaitTimePredictionRequest {
  currentOrders: number;
  kitchenCapacity: number;
  staffCount: number;
  orderComplexity?: number;
  historicalData?: TimeSeriesData[];
  peakHour?: boolean;
}

export interface WaitTimePredictionResult {
  estimatedWaitTime: number; // minutes
  confidence: number;
  bottlenecks: string[];
  recommendations: string[];
  breakdown?: {
    preparation: number;
    cooking: number;
    packaging: number;
    other: number;
  };
}

export interface RevenueProjectionRequest {
  historicalRevenue: TimeSeriesData[];
  currentTrends: {
    growth: number;
    volatility: number;
    seasonality: number;
  };
  plannedChanges?: PlannedChange[];
  timeframe: 'week' | 'month' | 'quarter' | 'year';
}

export interface RevenueProjectionResult {
  projection: number;
  confidence: number;
  breakdown: {
    baseline: number;
    growth: number;
    seasonal: number;
    changes: number;
  };
  opportunities: string[];
  risks: string[];
  confidenceInterval?: {
    lower: number;
    upper: number;
  };
}

export interface PlannedChange {
  type: 'price_change' | 'new_product' | 'promotion' | 'expansion';
  description: string;
  expectedImpact: number;
  startDate: Date;
  endDate?: Date;
}

// ============== VOICE AI TYPES ==============

export interface VoiceCommand {
  type: 'order' | 'navigation' | 'query' | 'action' | 'custom' | 'unknown';
  intent: string;
  entities?: Record<string, any>;
  confidence: number;
  language: string;
  raw: string;
}

export interface ParsedOrder {
  items: OrderItem[];
  modifiers?: OrderModifier[];
  specialInstructions?: string;
  confidence: number;
}

export interface OrderItem {
  product: string;
  productId?: string;
  quantity: number;
  confidence: number;
  valid?: boolean;
}

export interface OrderModifier {
  type: 'add' | 'remove' | 'extra';
  items: string[];
}

export interface IntentParseResult {
  primary: string;
  secondary?: string[];
  entities: Record<string, any>;
  confidence: number;
  alternatives?: IntentAlternative[];
}

export interface IntentAlternative {
  intent: string;
  confidence: number;
  entities: Record<string, any>;
}

export interface VoiceResponse {
  text: string;
  ssml?: string;
  language: string;
  emotion?: 'neutral' | 'happy' | 'apologetic' | 'excited';
  actions?: ResponseAction[];
}

export interface ResponseAction {
  type: string;
  payload: any;
}

// ============== ANALYTICS TYPES ==============

export interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  mse?: number;
  mae?: number;
}

export interface TrainingResult {
  modelId: string;
  version: string;
  performance: ModelPerformance;
  trainingTime: number;
  dataPoints: number;
  timestamp: Date;
}

export interface AIInsight {
  type: 'opportunity' | 'risk' | 'recommendation';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  actionable: boolean;
  actions?: string[];
}

// ============== HELPERS ==============

export interface WeatherData {
  temperature: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
  windSpeed?: number;
  humidity?: number;
}

export interface EventData {
  name: string;
  type: string;
  date: Date;
  expectedAttendance?: number;
  distance?: number;
}

export interface PromotionData {
  type: 'discount' | 'bundle' | 'bogo' | 'special';
  value: number;
  startDate: Date;
  endDate: Date;
  products?: string[];
}
