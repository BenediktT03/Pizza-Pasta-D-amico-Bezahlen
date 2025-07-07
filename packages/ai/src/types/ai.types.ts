/**
 * AI Types
 *
 * TypeScript Definitionen für EATECH V3.0 AI Package
 * Umfassende Typen für alle AI Services und Voice Commerce
 *
 * @author Benedikt Thomma <benedikt@thomma.ch>
 */

// ================================
// CORE AI TYPES
// ================================

export interface AIServiceConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
}

export interface AIResponse {
  success: boolean;
  data?: any;
  error?: string;
  confidence?: number;
  timestamp: Date;
}

// ================================
// EMERGENCY HANDLER TYPES
// ================================

export enum EmergencyType {
  KITCHEN_OVERLOAD = 'KITCHEN_OVERLOAD',
  STAFF_SHORTAGE = 'STAFF_SHORTAGE',
  INVENTORY_CRITICAL = 'INVENTORY_CRITICAL',
  EQUIPMENT_FAILURE = 'EQUIPMENT_FAILURE',
  WEATHER_EMERGENCY = 'WEATHER_EMERGENCY',
  PAYMENT_FAILURE = 'PAYMENT_FAILURE',
  SYSTEM_DOWN = 'SYSTEM_DOWN',
  CROWD_CONTROL = 'CROWD_CONTROL',
  SUPPLY_CHAIN = 'SUPPLY_CHAIN',
  UNKNOWN = 'UNKNOWN'
}

export interface EmergencyContext {
  tenantId: string;
  tenantName: string;
  currentTime: Date;

  // Orders & Queue
  currentOrders: number;
  ordersLastHour: number;
  averageOrdersThisTime: number;
  queueLength: number;

  // Kitchen & Staff
  staffPresent: number;
  staffRequired: number;
  kitchenUtilization: number;
  averagePreparationTime: number;

  // Inventory
  lowStockItems: string[];
  outOfStockItems: string[];
  criticalSupplies: string[];

  // External Factors
  weather?: WeatherData;
  location?: Coordinates;
  operatingHours?: any;

  // Financial
  revenueToday: number;
  averageOrderValue: number;

  // System Health
  systemErrors: number;
  paymentIssues: number;
}

export interface EmergencyResponse {
  id: string;
  tenantId: string;
  type: EmergencyType;
  riskLevel: number;
  confidence: number;
  reasons: string[];
  activatedAt: Date;
  status: 'active' | 'resolved' | 'dismissed';

  immediateActions: string[];
  autoAdjustments: Record<string, any>;
  notifications: string[];
  monitoringActions: string[];
}

// ================================
// PRICING OPTIMIZER TYPES
// ================================

export interface PriceOptimizationRequest {
  tenantId: string;
  productId: string;
  currentPrice: number;
  productCategory?: string;
  timeframe?: string;
}

export interface PriceOptimizationResponse {
  productId: string;
  tenantId: string;
  currentPrice: number;
  recommendedPrice: number;
  priceChange: number;
  priceChangePercent: number;
  projectedRevenueLift: number;
  projectedVolumeChange: number;
  strategy: PricingStrategy;
  reasoning: string[];
  risks: string[];
  confidence: number;

  implementationPlan: {
    timing: 'immediate' | 'peak_hours' | 'off_peak';
    duration: 'temporary' | 'permanent' | 'test';
    rollbackTriggers: string[];
    abTestRecommended: boolean;
  };

  marketConditions: MarketConditions;
  elasticityData: ElasticityAnalysis;
  competitorData: CompetitorData;

  optimizedAt: Date;
  validUntil: Date;
  algorithm: string;
}

export type PricingStrategy =
  | 'PENETRATION'
  | 'SKIMMING'
  | 'COMPETITIVE'
  | 'PSYCHOLOGICAL'
  | 'DYNAMIC'
  | 'VALUE_BASED'
  | 'RULE_BASED';

export interface ElasticityAnalysis {
  elasticity: number;
  confidence: number;
  dataPoints: number;
  timeBasedElasticity: {
    morning: number;
    lunch: number;
    evening: number;
    weekend: number;
  };
  weatherElasticity: {
    sunny: number;
    rainy: number;
    cold: number;
  };
  lastUpdated: Date;
}

export interface MarketConditions {
  currentPrice: number;
  cost: number;
  category: string;
  tags: string[];
  weeklyVolume: number;
  avgPriceThisWeek: number;
  conversionRate: number;
  dayOfWeek: number;
  hourOfDay: number;
  isHoliday: boolean;
  holidayType?: string;
  weather?: WeatherData;
  nearbyEvents: EventData[];
  seasonality: string;
  location?: any;
  customerSegment: number;
  cuisine: string[];
  staffLevel: number;
  kitchenCapacity: number;
  queueLength: number;
}

// ================================
// DEMAND FORECASTING TYPES
// ================================

export interface DemandForecastRequest {
  tenantId: string;
  timeframe: '24h' | '3d' | '7d' | '1m';
  includeWeather?: boolean;
  includeEvents?: boolean;
  historicalDays?: number;
}

export interface DemandForecastResponse {
  tenantId: string;
  timeframe: string;
  method: 'time-series' | 'ai-gpt4' | 'ensemble' | 'combined';
  forecasts: {
    timestamp: Date;
    value: number;
    confidence: number;
  }[];
  accuracy: ForecastAccuracy;
  confidence: number;
  generatedAt: Date;
  validUntil: Date;
  metadata: Record<string, any>;
}

export interface TimeSeriesData {
  timestamp: Date;
  orderCount: number;
  revenue: number;
  itemsSold: number;
  avgOrderValue: number;
  weather?: WeatherData;
  events?: EventData[];
}

export interface ForecastAccuracy {
  mape: number; // Mean Absolute Percentage Error
  rmse: number; // Root Mean Square Error
  mae: number;  // Mean Absolute Error
  accuracy: number; // Overall accuracy percentage
}

export interface SeasonalPattern {
  type: 'weekly' | 'monthly' | 'yearly' | 'none';
  strength: number;
  components: number[];
}

// ================================
// PREDICTIVE FORECASTING TYPES
// ================================

export interface PredictiveForecastRequest {
  tenantId: string;
  horizon: ForecastHorizon;
  features?: string[];
  modelType?: 'neural_network' | 'ensemble' | 'auto';
}

export interface PredictiveForecastResponse {
  tenantId: string;
  horizon: ForecastHorizon;
  method: string;
  predictions: {
    timestamp: Date;
    value: number;
    confidence: number;
  }[];
  confidenceIntervals: {
    timestamp: Date;
    lower: number;
    upper: number;
  }[];
  modelMetrics: {
    accuracy: number;
    mape: number;
    rmse: number;
    lastTrained: Date;
    dataPoints: number;
  };
  features: Record<string, number>;
  generatedAt: Date;
  validUntil: Date;
}

export type ForecastHorizon = '1h' | '6h' | '24h' | '3d' | '7d' | '1m';

export interface MLModel {
  id: string;
  tenantId: string;
  type: 'neural_network' | 'random_forest' | 'linear_regression';
  architecture: string;
  hyperparameters: Record<string, any>;
  weights: number[][][];
  normalizers: any;
  performance: ModelPerformance;
  trainingDataSize: number;
  lastTrained: Date;
  version: string;
}

export interface ModelPerformance {
  accuracy: number;
  mape: number;
  rmse: number;
  mae: number;
}

export interface TrainingData {
  timestamp: Date;
  tenantId: string;
  demandValue: number;
  features: FeatureVector;
  contextData: Record<string, any>;
}

export interface FeatureVector {
  temporal: number[];
  weather: number[];
  lag: number[];
  seasonal: number[];
  events: number[];
}

// ================================
// WAIT TIME PREDICTION TYPES
// ================================

export interface WaitTimePredictionRequest {
  tenantId: string;
  orderItems?: OrderItem[];
  currentQueueLength?: number;
  customerId?: string;
  timestamp: Date;
}

export interface WaitTimePredictionResponse {
  tenantId: string;
  estimatedWaitTime: number; // in minutes
  confidence: number;
  breakdown: {
    queueWaitTime: number;
    preparationTime: number;
    bufferTime: number;
  };
  confidenceInterval: {
    min: number;
    max: number;
  };
  factors: WaitTimeFactors;
  recommendations: string[];
  queuePosition: number;
  estimatedReadyTime: Date;
  predictedAt: Date;
  validUntil: Date;
}

export interface WaitTimeFactors {
  queueLength: number;
  orderComplexity: number;
  kitchenEfficiency: number;
  staffLevel: number;
  timeOfDay: number;
  weatherImpact: number;
  historicalAccuracy: number;
}

export interface QueueAnalysis {
  totalOrders: number;
  ordersByStatus: {
    pending: number;
    confirmed: number;
    preparing: number;
  };
  avgWaitTimeInQueue: number;
  complexity: number;
  momentum: 'accelerating' | 'stable' | 'slowing';
  oldestOrder: Date | null;
  estimatedClearTime: Date;
}

export interface KitchenMetrics {
  avgPreparationTime: number;
  medianPreparationTime: number;
  throughput: number; // orders per hour
  efficiency: number; // 0-1
  consistency: number; // 0-1
  lastHourOrders: number;
  trendDirection: 'improving' | 'stable' | 'degrading';
}

export interface OrderComplexity {
  score: number; // 1-3
  factors: string[];
  preparationTime: number; // estimated minutes
}

export interface StaffEfficiency {
  staffPresent: number;
  staffRequired: number;
  ordersPerStaff: number;
  efficiencyScore: number; // 0-1
  isOptimal: boolean;
  bottleneck: string | null;
}

// ================================
// REVENUE PROJECTION TYPES
// ================================

export interface RevenueProjectionRequest {
  tenantId: string;
  projectionDays: number;
  lookbackDays?: number;
  includeScenarios?: boolean;
  includeMarketFactors?: boolean;
}

export interface RevenueProjectionResponse {
  tenantId: string;
  projectionPeriod: {
    startDate: Date;
    endDate: Date;
    days: number;
  };
  projections: FinancialForecast[];
  summary: {
    totalProjectedRevenue: number;
    avgDailyRevenue: number;
    confidence: number;
    growthRate: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
  methodBreakdown: {
    trend: { weight: number; projections: FinancialForecast[] };
    seasonal: { weight: number; projections: FinancialForecast[] };
    ai: { weight: number; projections: FinancialForecast[] };
    scenario: { weight: number; projections: FinancialForecast[] };
  };
  scenarios: RevenueScenario[];
  recommendations: string[];
  generatedAt: Date;
  validUntil: Date;
}

export interface RevenueMetrics {
  date: Date;
  revenue: number;
  orderCount: number;
  customerCount: number;
  avgOrderValue: number;
  itemsSold: number;
}

export interface BusinessDrivers {
  menuOptimization: number;
  priceElasticity: number;
  productMix: string;
  customerAcquisition: number;
  customerRetention: number;
  customerLifetimeValue: number;
  operationalEfficiency: number;
  capacityUtilization: number;
  serviceQuality: number;
  marketingEffectiveness: number;
  brandAwareness: number;
  seasonalTrends: any;
  competitivePosition: number;
  locationAdvantage: number;
}

export interface MarketFactors {
  gdpGrowth: number;
  inflation: number;
  unemploymentRate: number;
  consumerSpending: number;
  industryGrowth: number;
  marketSaturation: number;
  averageRevenue: number;
  localEconomyHealth: string;
  populationGrowth: number;
  touristActivity: string;
  seasonalityStrength: number;
  peakSeasons: string[];
  weatherSensitivity: number;
  upcomingEvents: number;
  foodTrends: number;
  competitionLevel: number;
}

export interface FinancialForecast {
  date: Date;
  revenue: number;
  confidence: number;
  method: string;
  factors?: string[];
  scenarios?: { name: string; revenue: number; probability: number }[];
}

export interface RevenueScenario {
  name: 'pessimistic' | 'realistic' | 'optimistic';
  description: string;
  probability: number;
  multiplier: number;
  factors: string[];
}

// ================================
// COMPETITOR MONITORING TYPES
// ================================

export interface CompetitorData {
  id: string;
  name: string;
  location: Coordinates;
  distance: number; // meters
  cuisine: string[];
  priceRange: number; // 1-4
  lastSeen: Date;
  status: 'active' | 'inactive' | 'unknown';
}

export interface CompetitorAnalysis {
  tenantId: string;
  competitors: number;
  marketPosition: {
    ranking: 'leader' | 'challenger' | 'follower' | 'niche' | 'unknown';
    pricePosition: 'low' | 'medium' | 'high' | 'premium';
    strengthAreas: string[];
    weaknessAreas: string[];
    opportunities: string[];
    threats: string[];
  };
  pricingAnalysis: {
    competitive: boolean;
    recommendations: string[];
    underpriced: string[];
    overpriced: string[];
  };
  insights: string[];
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    impact: string;
    effort: 'low' | 'medium' | 'high';
  }[];
  intelligence: {
    topCompetitors: any[];
    marketGaps: string[];
    emergingThreats: string[];
    benchmarkMetrics: any;
  };
  alerts: CompetitorAlert[];
  analysisDate: Date;
  validUntil: Date;
  dataQuality: 'high' | 'medium' | 'low';
  confidence: number;
}

export interface CompetitorAlert {
  type: 'pricing' | 'market_density' | 'new_competitor' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  actionRequired: boolean;
  recommendations: string[];
}

export interface PricingComparison {
  competitorId: string;
  categoryPricing: Record<string, {
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    itemCount: number;
  }>;
  totalProducts: number;
  lastUpdated: Date;
}

export interface LocationCompetition {
  coordinates: Coordinates;
  radius: number;
  competitorCount: number;
  averageDistance: number;
  densityScore: number;
}

export interface MarketIntelligence {
  marketSize: number;
  growthRate: number;
  saturationLevel: number;
  entryBarriers: string[];
  trends: string[];
  opportunities: string[];
  threats: string[];
}

// ================================
// CONTEXT ANALYZER TYPES
// ================================

export interface ContextData {
  tenantId: string;
  timestamp: Date;
  location: LocationContext;
  temporal: TemporalContext;
  weather: WeatherContext;
  events: EventContext[];
  social: SocialContext;
  economic: EconomicContext;
  business: any;
}

export interface ContextAnalysis {
  tenantId: string;
  contextData: ContextData;
  situationAssessment: {
    overall: 'excellent' | 'good' | 'neutral' | 'challenging' | 'poor';
    businessOpportunity: 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
    riskLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
    confidence: number;
  };
  insights: ContextInsight[];
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    reasoning: string;
    timeframe: 'immediate' | 'short_term' | 'long_term';
  }[];
  factorImpacts: {
    location: number;
    temporal: number;
    weather: number;
    events: number;
    social: number;
    economic: number;
    business: number;
  };
  opportunityScore: number;
  risks: string[];
  nextActions: string[];
  analyzedAt: Date;
  validUntil: Date;
  confidence: number;
  dataQuality: 'high' | 'medium' | 'low';
}

export interface LocationContext {
  coordinates: Coordinates | null;
  address: string;
  district: string;
  canton: string;
  urbanity: 'urban' | 'suburban' | 'rural' | 'unknown';
  demographics: Record<string, any>;
  accessibility: Record<string, any>;
  competition: number;
  footTraffic: 'very_high' | 'high' | 'medium' | 'low' | 'very_low' | 'unknown';
  nearbyPOIs?: any[];
  publicTransport?: string;
  parking?: string;
}

export interface TemporalContext {
  hour: number;
  dayOfWeek: number;
  dayName: string;
  month: number;
  season: string;
  businessPeriod: 'breakfast' | 'lunch' | 'afternoon' | 'dinner' | 'off_hours';
  isWeekend: boolean;
  isHoliday: boolean;
  holidayInfo?: any;
  isSchoolHoliday: boolean;
  lunchRush: boolean;
  dinnerRush: boolean;
  workingHours: boolean;
}

export interface WeatherContext {
  current: {
    condition: string;
    temperature: number;
    humidity?: number;
    windSpeed?: number;
    precipitation?: number;
    visibility?: number;
    uvIndex?: number;
  };
  forecast: any[];
  impact: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
  alerts?: string[];
  comfort?: string;
}

export interface EventContext {
  id: string;
  name: string;
  type: string;
  date: Date;
  location: Coordinates;
  distance: number; // meters
  expectedAttendees: number;
  impact: string;
  relevance: number;
}

export interface SocialContext {
  socialMentions: number;
  trending: any[];
  sentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
  viralPotential: number;
  influencerActivity: boolean;
}

export interface EconomicContext {
  inflation: number;
  unemploymentRate: number;
  consumerConfidence: number;
  purchasingPower: 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
  seasonalSpending: 'very_high' | 'high' | 'normal' | 'low' | 'very_low';
  businessSentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
}

export interface ContextInsight {
  type: 'opportunity' | 'threat' | 'trend' | 'general';
  message: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
}

// ================================
// VOICE COMMERCE TYPES
// ================================

export interface SpeechRecognitionRequest {
  tenantId: string;
  audioData: Buffer;
  audioFormat?: 'wav' | 'mp3' | 'webm' | 'flac';
  sampleRate?: number;
  channels?: number;
  duration?: number;
  language?: string;
  customerId?: string;
  sessionId: string;
  requireWakeWord?: boolean;
  preferredLanguage?: string;
  timestamp: Date;
}

export interface SpeechRecognitionResponse {
  tenantId: string;
  transcript: string;
  originalTranscript: string;
  confidence: number;
  language: LanguageDetection;
  wakeWordDetected: boolean;
  voiceProfile?: VoiceProfile;
  audioMetrics: {
    duration: number;
    sampleRate: number;
    channels: number;
    format: string;
  };
  processingTime: number;
  recognizedAt: Date;
  error?: string;
}

export interface LanguageDetection {
  code: string;
  name: string;
  confidence: number;
  dialect?: string;
  dialectConfidence?: number;
}

export interface VoiceProfile {
  id: string;
  characteristics: {
    pitch?: string;
    tone?: string;
    speed?: string;
  };
  recognitionAccuracy: number;
  preferredLanguage: string;
  dialectPreference: string;
  createdAt: Date;
  lastUsed: Date;
}

export interface AudioProcessing {
  noiseReduction: boolean;
  volumeNormalization: boolean;
  enhancementLevel: 'none' | 'light' | 'medium' | 'aggressive';
}

export interface RecognitionMetrics {
  accuracy: number;
  latency: number;
  errorRate: number;
  dialectSupport: number;
}

// ================================
// INTENT PARSING TYPES
// ================================

export interface IntentParsingRequest {
  text: string;
  language?: string;
  tenantId: string;
  sessionId: string;
  context?: any;
  entities?: Entity[];
  timestamp: Date;
}

export interface IntentParsingResponse {
  sessionId: string;
  tenantId: string;
  originalText: string;
  normalizedText: string;
  intent: Intent;
  entities: Entity[];
  orderIntent?: OrderIntent;
  confidence: number;
  language: string;
  conversationContext: ConversationContext;
  parsedAt: Date;
  needsClarification: boolean;
  suggestedResponses: string[];
}

export interface Intent {
  type: string;
  confidence: number;
  category: 'order' | 'inquiry' | 'payment' | 'social' | 'general';
  matched_pattern?: string;
  match_text?: string;
  reasoning?: string[];
  ai_analysis?: boolean;
  detected_entities?: string[];
  error?: string;
}

export interface Entity {
  type: 'product' | 'quantity' | 'modifier' | 'payment_method' | 'time' | 'location';
  value: string;
  confidence: number;
  start: number;
  end: number;
  metadata?: Record<string, any>;
}

export interface OrderIntent {
  items: OrderItem[];
  totalAmount: number;
  currency: string;
  orderType: 'pickup' | 'delivery' | 'dine_in';
  confidence: number;
  needsConfirmation: boolean;
}

export interface OrderItem {
  productId?: string;
  productName: string;
  quantity: number;
  modifiers: {
    type?: string;
    value: string;
    operation: 'add' | 'remove';
  }[];
  price: number;
}

export interface SwissLanguageContext {
  dialect: 'zurich' | 'bern' | 'basel' | 'geneva' | 'standard';
  formality: 'formal' | 'informal';
  localExpressions: string[];
}

export interface IntentConfidence {
  overall: number;
  pattern: number;
  entity: number;
  context: number;
}

export interface ConversationContext {
  sessionId: string;
  startedAt: Date;
  lastIntent: Intent | null;
  entities: Entity[];
  orderInProgress: OrderIntent | null;
}

// ================================
// RESPONSE GENERATION TYPES
// ================================

export interface ResponseGenerationRequest {
  tenantId: string;
  sessionId: string;
  intent: Intent;
  entities: Entity[];
  context?: any;
  orderData?: OrderIntent;
  waitTime?: number;
  language?: string;
  generateAudio?: boolean;
  timestamp: Date;
}

export interface ResponseGenerationResponse {
  sessionId: string;
  tenantId: string;
  textResponse: string;
  audioResponse?: VoiceResponse;
  intent: Intent;
  language: string;
  responseStrategy: any;
  conversationFlow: ConversationFlow;
  metadata: {
    generatedAt: Date;
    processingTime: number;
    templateUsed?: string;
    aiEnhanced?: boolean;
  };
  nextExpectedIntents: string[];
  suggestedActions: string[];
}

export interface VoiceResponse {
  audioContent: Buffer;
  audioFormat: 'mp3' | 'wav' | 'ogg';
  duration: number; // seconds
  language: string;
  voiceSettings: {
    name: string;
    gender: string;
    speakingRate: number;
    pitch: number;
  };
}

export interface SwissLanguageResponse {
  standardGerman: string;
  swissGerman?: string;
  swissFrench?: string;
  swissItalian?: string;
  formality: 'formal' | 'informal';
  regionalAdaptation: boolean;
}

export interface ResponseTemplate {
  id: string;
  intentType: string;
  language: string;
  templates: string[];
  priority: number;
}

export interface ConversationFlow {
  sessionId: string;
  steps: {
    intent: string;
    response: string;
    timestamp: Date;
  }[];
  currentStep: number;
  isComplete: boolean;
}

export interface AudioSettings {
  voice: string;
  speed: number;
  pitch: number;
  volume: number;
  language: string;
}

// ================================
// SHARED UTILITY TYPES
// ================================

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface WeatherData {
  condition: string;
  temperature: number;
  humidity?: number;
  windSpeed?: number;
  precipitation?: number;
}

export interface EventData {
  id: string;
  name: string;
  type: string;
  date: Date;
  location?: Coordinates;
  expectedAttendees?: number;
  distance?: number;
}

export interface TenantMetrics {
  id: string;
  name: string;
  revenue: number;
  orders: number;
  customers: number;
  rating: number;
}

export enum NotificationChannel {
  SMS = 'sms',
  EMAIL = 'email',
  PUSH = 'push',
  APP = 'app',
  WEBHOOK = 'webhook'
}

export interface WeatherImpact {
  condition: string;
  multiplier: number;
  confidence: number;
}

// ================================
// CONFIGURATION TYPES
// ================================

export interface AIConfig {
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  emergency: {
    threshold: number;
    autoActivate: boolean;
    continuousMonitoring: boolean;
    monitoringInterval: number;
  };
  pricing: {
    maxPriceChange: number;
    updateInterval: number;
    abTestEnabled: boolean;
    cacheValidityMinutes: number;
  };
  forecasting: {
    horizon: string;
    accuracy: number;
    weatherEnabled: boolean;
    eventsEnabled: boolean;
    cacheValidityMinutes: number;
    retrainingInterval: number;
    minTrainingDataPoints: number;
    trainingDataDays: number;
  };
  voice: {
    languages: string[];
    confidence: number;
    timeout: number;
    wakeWords: string[];
  };
  competitor: {
    monitoringInterval: number;
    cacheValidityMinutes: number;
    maxCompetitors: number;
  };
  context: {
    cacheValidityMinutes: number;
    dataRetentionDays: number;
  };
}

// ================================
// ERROR TYPES
// ================================

export interface AIError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  service: string;
}

export class AIServiceError extends Error {
  public code: string;
  public service: string;
  public details?: any;

  constructor(code: string, message: string, service: string, details?: any) {
    super(message);
    this.name = 'AIServiceError';
    this.code = code;
    this.service = service;
    this.details = details;
  }
}

// ================================
// EXPORT ALL TYPES
// ================================

export * from './ai.types';
