// Platform Analytics Service for Master Admin
import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  onSnapshot,
  DocumentData,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

export interface PlatformMetrics {
  totalRevenue: number;
  totalOrders: number;
  totalTenants: number;
  activeTenants: number;
  platformFeesCollected: number;
  averageOrderValue: number;
  orderGrowthRate: number;
  revenueGrowthRate: number;
  topPerformingTenants: TenantPerformance[];
  ordersByHour: HourlyData[];
  revenueByDay: DailyData[];
  paymentMethodDistribution: PaymentMethodData[];
  geographicDistribution: GeographicData[];
}

export interface TenantPerformance {
  tenantId: string;
  tenantName: string;
  revenue: number;
  orders: number;
  avgOrderValue: number;
  platformFees: number;
  growthRate: number;
}

export interface HourlyData {
  hour: number;
  orders: number;
  revenue: number;
}

export interface DailyData {
  date: string;
  revenue: number;
  orders: number;
  newTenants: number;
}

export interface PaymentMethodData {
  method: string;
  count: number;
  percentage: number;
  totalAmount: number;
}

export interface GeographicData {
  canton: string;
  tenants: number;
  orders: number;
  revenue: number;
}

export interface LiveMetrics {
  activeOrders: number;
  ordersPerMinute: number;
  revenuePerMinute: number;
  activeTrucks: number;
  systemLoad: number;
  errorRate: number;
  avgResponseTime: number;
}

export interface AlertConfig {
  id: string;
  name: string;
  condition: 'above' | 'below' | 'equals';
  metric: string;
  threshold: number;
  enabled: boolean;
  recipients: string[];
}

class PlatformAnalyticsService {
  private metricsCache: Map<string, { data: any; timestamp: number }> = new Map();
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Get comprehensive platform metrics
  async getPlatformMetrics(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<PlatformMetrics> {
    const cacheKey = `metrics-${period}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const getMetricsFunction = httpsCallable(functions, 'getPlatformMetrics');
    const result = await getMetricsFunction({ period });
    const metrics = result.data as PlatformMetrics;

    this.setCached(cacheKey, metrics);
    return metrics;
  }

  // Get live/real-time metrics
  subscribeLiveMetrics(callback: (metrics: LiveMetrics) => void): () => void {
    const liveMetricsDoc = doc(db, 'analytics_realtime', 'platform');
    
    return onSnapshot(liveMetricsDoc, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback({
          activeOrders: data.activeOrders || 0,
          ordersPerMinute: data.ordersPerMinute || 0,
          revenuePerMinute: data.revenuePerMinute || 0,
          activeTrucks: data.activeTrucks || 0,
          systemLoad: data.systemLoad || 0,
          errorRate: data.errorRate || 0,
          avgResponseTime: data.avgResponseTime || 0
        });
      }
    });
  }

  // Get revenue analytics
  async getRevenueAnalytics(startDate: Date, endDate: Date): Promise<{
    totalRevenue: number;
    platformFees: number;
    netRevenue: number;
    breakdown: {
      date: string;
      revenue: number;
      fees: number;
      orders: number;
    }[];
  }> {
    const analyticsFunction = httpsCallable(functions, 'getRevenueAnalytics');
    const result = await analyticsFunction({ 
      startDate: startDate.toISOString(), 
      endDate: endDate.toISOString() 
    });
    return result.data as any;
  }

  // Get tenant rankings
  async getTenantRankings(metric: 'revenue' | 'orders' | 'growth', limit: number = 10): Promise<TenantPerformance[]> {
    const cacheKey = `rankings-${metric}-${limit}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const getRankingsFunction = httpsCallable(functions, 'getTenantRankings');
    const result = await getRankingsFunction({ metric, limit });
    const rankings = result.data as TenantPerformance[];

    this.setCached(cacheKey, rankings);
    return rankings;
  }

  // Get system health metrics
  async getSystemHealth(): Promise<{
    services: {
      name: string;
      status: 'healthy' | 'degraded' | 'down';
      responseTime: number;
      uptime: number;
      lastCheck: Date;
    }[];
    errors: {
      timestamp: Date;
      service: string;
      error: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }[];
    performance: {
      cpu: number;
      memory: number;
      disk: number;
      network: number;
    };
  }> {
    const healthFunction = httpsCallable(functions, 'getSystemHealth');
    const result = await healthFunction();
    return result.data as any;
  }

  // Fraud detection analytics
  async getFraudAnalytics(): Promise<{
    suspiciousActivities: {
      tenantId: string;
      tenantName: string;
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      timestamp: Date;
    }[];
    riskScore: {
      overall: number;
      byTenant: { tenantId: string; score: number }[];
    };
  }> {
    const fraudFunction = httpsCallable(functions, 'getFraudAnalytics');
    const result = await fraudFunction();
    return result.data as any;
  }

  // Get conversion funnel analytics
  async getConversionFunnel(period: 'day' | 'week' | 'month' = 'week'): Promise<{
    steps: {
      name: string;
      count: number;
      percentage: number;
      dropoff: number;
    }[];
    overallConversion: number;
    avgTimeToConvert: number;
  }> {
    const funnelFunction = httpsCallable(functions, 'getConversionFunnel');
    const result = await funnelFunction({ period });
    return result.data as any;
  }

  // Configure alerts
  async configureAlert(alert: AlertConfig): Promise<void> {
    const alertsCollection = collection(db, 'platform_alerts');
    await setDoc(doc(alertsCollection, alert.id), alert);
  }

  // Get alert configurations
  async getAlerts(): Promise<AlertConfig[]> {
    const alertsCollection = collection(db, 'platform_alerts');
    const snapshot = await getDocs(alertsCollection);
    
    const alerts: AlertConfig[] = [];
    snapshot.forEach((doc) => {
      alerts.push({ id: doc.id, ...doc.data() } as AlertConfig);
    });
    
    return alerts;
  }

  // Export analytics data
  async exportAnalytics(type: 'csv' | 'excel' | 'pdf', dateRange: { start: Date; end: Date }): Promise<string> {
    const exportFunction = httpsCallable(functions, 'exportAnalytics');
    const result = await exportFunction({
      type,
      startDate: dateRange.start.toISOString(),
      endDate: dateRange.end.toISOString()
    });
    return result.data as string; // Returns download URL
  }

  // Predictive analytics
  async getPredictiveAnalytics(): Promise<{
    revenueForcast: {
      next7Days: number;
      next30Days: number;
      next90Days: number;
      confidence: number;
    };
    churnPrediction: {
      atRiskTenants: string[];
      churnProbability: { tenantId: string; probability: number }[];
    };
    growthOpportunities: {
      tenantId: string;
      opportunity: string;
      potentialRevenue: number;
      recommendation: string;
    }[];
  }> {
    const predictiveFunction = httpsCallable(functions, 'getPredictiveAnalytics');
    const result = await predictiveFunction();
    return result.data as any;
  }

  // A/B test analytics
  async getABTestResults(testId: string): Promise<{
    variant: string;
    participants: number;
    conversions: number;
    conversionRate: number;
    avgOrderValue: number;
    confidence: number;
    winner?: string;
  }[]> {
    const abTestFunction = httpsCallable(functions, 'getABTestResults');
    const result = await abTestFunction({ testId });
    return result.data as any;
  }

  // Cache helpers
  private getCached(key: string): any {
    const cached = this.metricsCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private setCached(key: string, data: any): void {
    this.metricsCache.set(key, { data, timestamp: Date.now() });
  }

  // Clear cache
  clearCache(): void {
    this.metricsCache.clear();
  }
}

export const platformAnalyticsService = new PlatformAnalyticsService();
