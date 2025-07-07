/**
 * EATECH - Analytics Type Definitions
 * Version: 1.0.0
 * Description: Type definitions for analytics and reporting
 * Author: EATECH Development Team
 * Created: 2025-01-09
 * File Path: /functions/src/types/analytics.types.ts
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum AnalyticsEventType {
  // Page Events
  PAGE_VIEW = 'page_view',
  PAGE_EXIT = 'page_exit',
  
  // User Events
  USER_SIGNUP = 'user_signup',
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  
  // Order Events
  ORDER_CREATED = 'order_created',
  ORDER_UPDATED = 'order_updated',
  ORDER_COMPLETED = 'order_completed',
  ORDER_CANCELLED = 'order_cancelled',
  
  // Product Events
  PRODUCT_VIEWED = 'product_viewed',
  PRODUCT_ADDED_TO_CART = 'product_added_to_cart',
  PRODUCT_REMOVED_FROM_CART = 'product_removed_from_cart',
  PRODUCT_SEARCH = 'product_search',
  
  // Payment Events
  PAYMENT_INITIATED = 'payment_initiated',
  PAYMENT_COMPLETED = 'payment_completed',
  PAYMENT_FAILED = 'payment_failed',
  REFUND_PROCESSED = 'refund_processed',
  
  // System Events
  ERROR_OCCURRED = 'error_occurred',
  API_CALL = 'api_call',
  FEATURE_USED = 'feature_used'
}

export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary'
}

export enum AggregationPeriod {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year'
}

export enum ComparisonType {
  ABSOLUTE = 'absolute',
  PERCENTAGE = 'percentage',
  RATIO = 'ratio'
}

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Analytics event
 */
export interface AnalyticsEvent {
  id: string;
  tenantId: string;
  type: AnalyticsEventType;
  category: string;
  action: string;
  label?: string;
  value?: number;
  userId?: string;
  sessionId?: string;
  data?: EventData;
  context?: EventContext;
  timestamp: Date;
  processed?: boolean;
  processedAt?: Date;
}

/**
 * Event data
 */
export interface EventData {
  orderId?: string;
  productId?: string;
  customerId?: string;
  amount?: number;
  currency?: string;
  items?: number;
  duration?: number;
  error?: string;
  [key: string]: any;
}

/**
 * Event context
 */
export interface EventContext {
  ip?: string;
  userAgent?: string;
  referrer?: string;
  page?: string;
  device?: DeviceInfo;
  location?: LocationInfo;
  campaign?: CampaignInfo;
}

/**
 * Device information
 */
export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet';
  os: string;
  browser: string;
  version: string;
  viewport?: {
    width: number;
    height: number;
  };
}

/**
 * Location information
 */
export interface LocationInfo {
  country?: string;
  region?: string;
  city?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

/**
 * Campaign information
 */
export interface CampaignInfo {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

/**
 * Analytics metric
 */
export interface AnalyticsMetric {
  id: string;
  tenantId: string;
  name: string;
  type: MetricType;
  value: number;
  tags?: Record<string, string>;
  timestamp: Date;
  aggregated?: boolean;
}

/**
 * Revenue data
 */
export interface RevenueData {
  total: number;
  average: number;
  perCustomer: number;
  growth: number;
  trend: 'up' | 'down' | 'stable';
  timeSeries: TimeSeriesData[];
  byCategory: CategoryRevenue[];
  byPaymentMethod: PaymentMethodRevenue[];
  topProducts: ProductRevenue[];
  comparison: ComparisonData;
}

/**
 * Time series data point
 */
export interface TimeSeriesData {
  timestamp: string;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

/**
 * Category revenue
 */
export interface CategoryRevenue {
  category: string;
  revenue: number;
  percentage: number;
  orderCount: number;
  growth: number;
}

/**
 * Payment method revenue
 */
export interface PaymentMethodRevenue {
  method: string;
  revenue: number;
  percentage: number;
  transactionCount: number;
  avgTransaction: number;
}

/**
 * Product revenue
 */
export interface ProductRevenue {
  productId: string;
  productName: string;
  revenue: number;
  quantity: number;
  avgPrice: number;
  growth: number;
}

/**
 * Comparison data
 */
export interface ComparisonData {
  current: PeriodData;
  previous: PeriodData;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  type: ComparisonType;
}

/**
 * Period data
 */
export interface PeriodData {
  period: string;
  start: Date;
  end: Date;
  value: number;
  metadata?: Record<string, any>;
}

/**
 * Customer metrics
 */
export interface CustomerMetrics {
  total: number;
  new: number;
  returning: number;
  retentionRate: number;
  churnRate: number;
  lifetimeValue: number;
  averageOrderValue: number;
  orderFrequency: number;
  segments: CustomerSegment[];
  cohorts: CohortData[];
  growth: number;
}

/**
 * Customer segment
 */
export interface CustomerSegment {
  id: string;
  name: string;
  count: number;
  percentage: number;
  value: number;
  characteristics: Record<string, any>;
}

/**
 * Cohort data
 */
export interface CohortData {
  cohort: string;
  size: number;
  retention: RetentionData[];
  value: number;
  churn: number;
}

/**
 * Retention data
 */
export interface RetentionData {
  period: number;
  retained: number;
  percentage: number;
  value: number;
}

/**
 * Product metrics
 */
export interface ProductMetrics {
  totalSold: number;
  revenue: number;
  averagePrice: number;
  conversionRate: number;
  views: number;
  addToCartRate: number;
  bestSellers: BestSellerProduct[];
  categoryPerformance: CategoryPerformance[];
  trends: ProductTrend[];
  inventoryTurnover: number;
}

/**
 * Best seller product
 */
export interface BestSellerProduct {
  productId: string;
  name: string;
  category: string;
  quantitySold: number;
  revenue: number;
  rank: number;
  rankChange: number;
}

/**
 * Category performance
 */
export interface CategoryPerformance {
  category: string;
  products: number;
  revenue: number;
  quantity: number;
  avgPrice: number;
  growth: number;
  share: number;
}

/**
 * Product trend
 */
export interface ProductTrend {
  productId: string;
  name: string;
  trendType: 'rising' | 'falling' | 'stable';
  changePercent: number;
  momentum: number;
  forecast: number[];
}

/**
 * Order metrics
 */
export interface OrderMetrics {
  total: number;
  completed: number;
  cancelled: number;
  averageValue: number;
  averageItems: number;
  completionRate: number;
  preparationTime: number;
  peakHours: HourlyDistribution[];
  dayDistribution: DailyDistribution[];
  statusBreakdown: StatusBreakdown[];
}

/**
 * Hourly distribution
 */
export interface HourlyDistribution {
  hour: number;
  orders: number;
  revenue: number;
  avgOrderValue: number;
  peakScore: number;
}

/**
 * Daily distribution
 */
export interface DailyDistribution {
  dayOfWeek: number;
  dayName: string;
  orders: number;
  revenue: number;
  avgOrderValue: number;
}

/**
 * Status breakdown
 */
export interface StatusBreakdown {
  status: string;
  count: number;
  percentage: number;
  avgProcessingTime?: number;
}

/**
 * Operational metrics
 */
export interface OperationalMetrics {
  efficiency: number;
  throughput: number;
  utilization: number;
  waitTime: WaitTimeMetrics;
  staffPerformance: StaffPerformance[];
  kitchenMetrics: KitchenMetrics;
  serviceQuality: ServiceQualityMetrics;
}

/**
 * Wait time metrics
 */
export interface WaitTimeMetrics {
  average: number;
  median: number;
  p95: number;
  p99: number;
  distribution: TimeDistribution[];
  byHour: HourlyWaitTime[];
}

/**
 * Time distribution
 */
export interface TimeDistribution {
  range: string;
  count: number;
  percentage: number;
}

/**
 * Hourly wait time
 */
export interface HourlyWaitTime {
  hour: number;
  avgWaitTime: number;
  orders: number;
}

/**
 * Staff performance
 */
export interface StaffPerformance {
  staffId: string;
  name: string;
  ordersHandled: number;
  avgProcessingTime: number;
  efficiency: number;
  rating: number;
}

/**
 * Kitchen metrics
 */
export interface KitchenMetrics {
  avgPrepTime: number;
  throughput: number;
  utilization: number;
  qualityScore: number;
  wastePercentage: number;
  stationMetrics: StationMetrics[];
}

/**
 * Station metrics
 */
export interface StationMetrics {
  stationId: string;
  name: string;
  ordersProcessed: number;
  avgTime: number;
  efficiency: number;
  downtime: number;
}

/**
 * Service quality metrics
 */
export interface ServiceQualityMetrics {
  satisfactionScore: number;
  complaintRate: number;
  repeatOrderRate: number;
  reviewScore: number;
  responseTime: number;
}

/**
 * Trend data
 */
export interface TrendData {
  metric: string;
  period: {
    start: Date;
    end: Date;
  };
  data: TimeSeriesData[];
  forecast: TimeSeriesData[];
  seasonality: SeasonalityData;
  anomalies: AnomalyData[];
  direction: 'up' | 'down' | 'stable';
  confidence: number;
}

/**
 * Seasonality data
 */
export interface SeasonalityData {
  detected: boolean;
  pattern: 'daily' | 'weekly' | 'monthly' | 'yearly';
  strength: number;
  factors: SeasonalFactor[];
}

/**
 * Seasonal factor
 */
export interface SeasonalFactor {
  period: string;
  factor: number;
  significance: number;
}

/**
 * Anomaly data
 */
export interface AnomalyData {
  timestamp: Date;
  value: number;
  expected: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high';
  type: 'spike' | 'dip' | 'change';
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  id: string;
  tenantId: string;
  name: string;
  type: 'default' | 'custom';
  layout: DashboardLayout[];
  widgets: DashboardWidget[];
  filters: DashboardFilter[];
  refreshInterval?: number;
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Dashboard layout
 */
export interface DashboardLayout {
  widgetId: string;
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
}

/**
 * Dashboard widget
 */
export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'map' | 'custom';
  title: string;
  dataSource: string;
  config: WidgetConfig;
  refreshInterval?: number;
}

/**
 * Widget configuration
 */
export interface WidgetConfig {
  metrics?: string[];
  dimensions?: string[];
  chartType?: string;
  colors?: string[];
  showLegend?: boolean;
  showLabels?: boolean;
  aggregation?: string;
  customQuery?: string;
}

/**
 * Dashboard filter
 */
export interface DashboardFilter {
  field: string;
  label: string;
  type: 'date' | 'select' | 'multiselect' | 'range';
  defaultValue?: any;
  options?: FilterOption[];
}

/**
 * Filter option
 */
export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

/**
 * Report
 */
export interface Report {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  format: 'pdf' | 'excel' | 'csv' | 'json';
  status: 'pending' | 'generating' | 'completed' | 'failed';
  url?: string;
  size?: number;
  pages?: number;
  period: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, any>;
  generatedBy?: string;
  generatedAt: Date;
  expiresAt: Date;
  error?: string;
}

/**
 * Funnel data
 */
export interface FunnelData {
  name: string;
  steps: FunnelStep[];
  totalUsers: number;
  conversionRate: number;
  avgTime: number;
  dropoffPoints: DropoffPoint[];
}

/**
 * Funnel step
 */
export interface FunnelStep {
  name: string;
  users: number;
  conversionRate: number;
  avgTime: number;
  dropoff: number;
}

/**
 * Dropoff point
 */
export interface DropoffPoint {
  fromStep: string;
  toStep: string;
  users: number;
  percentage: number;
  reasons?: string[];
}

/**
 * A/B test result
 */
export interface ABTestResult {
  testId: string;
  name: string;
  status: 'running' | 'completed' | 'stopped';
  startDate: Date;
  endDate?: Date;
  variants: TestVariant[];
  winner?: string;
  confidence: number;
  sampleSize: number;
}

/**
 * Test variant
 */
export interface TestVariant {
  id: string;
  name: string;
  traffic: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  avgOrderValue: number;
  confidence: number;
}

/**
 * Heatmap data
 */
export interface HeatmapData {
  pageUrl: string;
  device: 'desktop' | 'mobile' | 'tablet';
  clicks: ClickData[];
  scrollDepth: ScrollData[];
  attention: AttentionData[];
  interactions: InteractionData[];
}

/**
 * Click data
 */
export interface ClickData {
  x: number;
  y: number;
  count: number;
  element?: string;
}

/**
 * Scroll data
 */
export interface ScrollData {
  depth: number;
  percentage: number;
  users: number;
}

/**
 * Attention data
 */
export interface AttentionData {
  element: string;
  avgTime: number;
  interactions: number;
  visibility: number;
}

/**
 * Interaction data
 */
export interface InteractionData {
  element: string;
  type: 'click' | 'hover' | 'focus' | 'change';
  count: number;
  avgTime: number;
}