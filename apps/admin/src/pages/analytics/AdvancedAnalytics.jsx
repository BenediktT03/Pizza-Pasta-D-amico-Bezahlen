/**
 * EATECH - Advanced Analytics
 * Version: 7.2.0
 * Description: Erweiterte Analytics mit KI-Insights und Lazy Loading
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/admin/src/pages/Analytics/AdvancedAnalytics.jsx
 * 
 * Features: Real-time analytics, predictive insights, custom dashboards
 */

import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { 
  BarChart3, TrendingUp, TrendingDown, Activity,
  Users, ShoppingCart, DollarSign, Clock,
  Brain, Target, Zap, Eye,
  Calendar, Filter, Download, Settings,
  RefreshCw, AlertTriangle, CheckCircle, Info,
  PieChart, LineChart, BarChart, Layers
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import styles from './AdvancedAnalytics.module.css';

// Lazy loaded components
const RealtimeChart = lazy(() => import('./components/RealtimeChart'));
const PredictiveInsights = lazy(() => import('./components/PredictiveInsights'));
const CustomerSegmentation = lazy(() => import('./components/CustomerSegmentation'));
const RevenueForecast = lazy(() => import('./components/RevenueForecast'));
const HeatmapAnalysis = lazy(() => import('./components/HeatmapAnalysis'));
const ABTestResults = lazy(() => import('./components/ABTestResults'));
const CustomDashboard = lazy(() => import('./components/CustomDashboard'));
const PerformanceMetrics = lazy(() => import('./components/PerformanceMetrics'));
const CompetitorAnalysis = lazy(() => import('./components/CompetitorAnalysis'));
const SeasonalTrends = lazy(() => import('./components/SeasonalTrends'));

// Lazy loaded services
const AnalyticsEngine = lazy(() => import('../../services/AnalyticsEngine'));
const AIInsightsService = lazy(() => import('../../services/AIInsightsService'));
const PredictionService = lazy(() => import('../../services/PredictionService'));
const ReportingService = lazy(() => import('../../services/ReportingService'));

const firebaseConfig = {
  apiKey: "AIzaSyDFBlgWE81iHnACVwOmaU0jL7FV0l_tRmU",
  authDomain: "eatech-foodtruck.firebaseapp.com",
  databaseURL: "https://eatech-foodtruck-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "eatech-foodtruck",
  storageBucket: "eatech-foodtruck.firebasestorage.app",
  messagingSenderId: "261222802445",
  appId: "1:261222802445:web:edde22580422fbced22144"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const LoadingSpinner = () => (
  <div className={styles.loadingContainer}>
    <div className={styles.spinner} />
  </div>
);

const ANALYTICS_PERIODS = {
  '24h': { name: '24 Stunden', days: 1 },
  '7d': { name: '7 Tage', days: 7 },
  '30d': { name: '30 Tage', days: 30 },
  '90d': { name: '3 Monate', days: 90 },
  '365d': { name: '1 Jahr', days: 365 },
  'custom': { name: 'Benutzerdefiniert', days: 0 }
};

const ANALYTICS_VIEWS = {
  overview: { name: 'Übersicht', icon: BarChart3 },
  realtime: { name: 'Echtzeit', icon: Activity },
  predictions: { name: 'Vorhersagen', icon: Brain },
  customers: { name: 'Kunden', icon: Users },
  performance: { name: 'Performance', icon: TrendingUp },
  competitors: { name: 'Konkurrenz', icon: Target },
  custom: { name: 'Custom', icon: Settings }
};

const METRIC_TYPES = {
  revenue: { name: 'Umsatz', icon: DollarSign, color: '#10B981', format: 'currency' },
  orders: { name: 'Bestellungen', icon: ShoppingCart, color: '#3B82F6', format: 'number' },
  customers: { name: 'Kunden', icon: Users, color: '#8B5CF6', format: 'number' },
  avgOrder: { name: 'Ø Bestellung', icon: TrendingUp, color: '#F59E0B', format: 'currency' },
  waitTime: { name: 'Wartezeit', icon: Clock, color: '#EF4444', format: 'time' },
  satisfaction: { name: 'Zufriedenheit', icon: CheckCircle, color: '#10B981', format: 'percentage' }
};

const AdvancedAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [customDateRange, setCustomDateRange] = useState({
    start: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [realtimeData, setRealtimeData] = useState({});
  const [analyticsData, setAnalyticsData] = useState({});
  const [insights, setInsights] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [selectedMetrics, setSelectedMetrics] = useState(['revenue', 'orders', 'customers']);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonPeriod, setComparisonPeriod] = useState('7d');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');

  const refreshTimer = useRef(null);
  const webSocketRef = useRef(null);
  const tenantId = 'demo-restaurant';

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  useEffect(() => {
    initializeAnalytics();
    setupRealtimeConnection();
    
    if (isAutoRefresh) {
      startAutoRefresh();
    }
    
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod, customDateRange]);

  const initializeAnalytics = async () => {
    try {
      setLoading(true);
      
      // Load cached analytics first
      await loadCachedAnalytics();
      
      // Initialize AI services
      await initializeAIServices();
      
      // Load fresh data
      await loadAnalyticsData();
      
      // Generate insights
      await generateInsights();
    } catch (error) {
      console.error('Analytics initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCachedAnalytics = async () => {
    try {
      const cached = localStorage.getItem('analytics_cache');
      if (cached) {
        const data = JSON.parse(cached);
        setAnalyticsData(data);
      }
    } catch (error) {
      console.error('Error loading cached analytics:', error);
    }
  };

  const initializeAIServices = async () => {
    try {
      const AIInsightsServiceModule = await import('../../services/AIInsightsService');
      await AIInsightsServiceModule.default.initialize();
    } catch (error) {
      console.error('AI services initialization error:', error);
    }
  };

  // ============================================================================
  // REALTIME CONNECTION
  // ============================================================================
  const setupRealtimeConnection = () => {
    try {
      // WebSocket for real-time updates
      webSocketRef.current = new WebSocket(process.env.REACT_APP_WS_URL);
      
      webSocketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        updateRealtimeData(data);
      };
      
      webSocketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Realtime connection error:', error);
    }
  };

  const updateRealtimeData = (data) => {
    setRealtimeData(prev => ({
      ...prev,
      ...data,
      timestamp: new Date().toISOString()
    }));
  };

  const startAutoRefresh = () => {
    refreshTimer.current = setInterval(() => {
      loadAnalyticsData();
    }, refreshInterval * 1000);
  };

  const stopAutoRefresh = () => {
    if (refreshTimer.current) {
      clearInterval(refreshTimer.current);
      refreshTimer.current = null;
    }
  };

  const cleanup = () => {
    stopAutoRefresh();
    if (webSocketRef.current) {
      webSocketRef.current.close();
    }
  };

  // ============================================================================
  // DATA LOADING
  // ============================================================================
  const loadAnalyticsData = async () => {
    try {
      const dateRange = selectedPeriod === 'custom' 
        ? customDateRange 
        : {
            start: format(subDays(new Date(), ANALYTICS_PERIODS[selectedPeriod].days), 'yyyy-MM-dd'),
            end: format(new Date(), 'yyyy-MM-dd')
          };

      // Load from Firebase
      const [ordersData, customersData, revenueData] = await Promise.all([
        loadOrdersData(dateRange),
        loadCustomersData(dateRange),
        loadRevenueData(dateRange)
      ]);

      const processedData = {
        orders: ordersData,
        customers: customersData,
        revenue: revenueData,
        period: dateRange,
        timestamp: new Date().toISOString()
      };

      setAnalyticsData(processedData);
      
      // Cache the data
      localStorage.setItem('analytics_cache', JSON.stringify(processedData));
      
      // Update predictions
      await updatePredictions(processedData);
      
    } catch (error) {
      console.error('Error loading analytics data:', error);
    }
  };

  const loadOrdersData = async (dateRange) => {
    return new Promise((resolve) => {
      const ordersRef = ref(database, `tenants/${tenantId}/orders`);
      const ordersQuery = query(ordersRef, orderByChild('createdAt'));
      
      onValue(ordersQuery, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const orders = Object.entries(data)
            .map(([id, order]) => ({ id, ...order }))
            .filter(order => {
              const orderDate = parseISO(order.createdAt);
              const startDate = parseISO(dateRange.start);
              const endDate = parseISO(dateRange.end);
              return orderDate >= startDate && orderDate <= endDate;
            });
          resolve(orders);
        } else {
          resolve([]);
        }
      });
    });
  };

  const loadCustomersData = async (dateRange) => {
    return new Promise((resolve) => {
      const customersRef = ref(database, `tenants/${tenantId}/customers`);
      
      onValue(customersRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const customers = Object.entries(data)
            .map(([id, customer]) => ({ id, ...customer }))
            .filter(customer => {
              if (!customer.registeredAt) return false;
              const regDate = parseISO(customer.registeredAt);
              const startDate = parseISO(dateRange.start);
              const endDate = parseISO(dateRange.end);
              return regDate >= startDate && regDate <= endDate;
            });
          resolve(customers);
        } else {
          resolve([]);
        }
      });
    });
  };

  const loadRevenueData = async (dateRange) => {
    // Calculate revenue from orders
    const orders = await loadOrdersData(dateRange);
    
    const revenueByDay = orders.reduce((acc, order) => {
      const day = format(parseISO(order.createdAt), 'yyyy-MM-dd');
      acc[day] = (acc[day] || 0) + (order.total || 0);
      return acc;
    }, {});
    
    return revenueByDay;
  };

  // ============================================================================
  // AI INSIGHTS & PREDICTIONS
  // ============================================================================
  const generateInsights = async () => {
    try {
      const AIInsightsServiceModule = await import('../../services/AIInsightsService');
      const newInsights = await AIInsightsServiceModule.default.generateInsights(analyticsData);
      setInsights(newInsights);
    } catch (error) {
      console.error('Error generating insights:', error);
    }
  };

  const updatePredictions = async (data) => {
    try {
      const PredictionServiceModule = await import('../../services/PredictionService');
      const newPredictions = await PredictionServiceModule.default.generatePredictions(data);
      setPredictions(newPredictions);
    } catch (error) {
      console.error('Error updating predictions:', error);
    }
  };

  // ============================================================================
  // CALCULATED METRICS
  // ============================================================================
  const calculatedMetrics = useMemo(() => {
    if (!analyticsData.orders) return {};
    
    const orders = analyticsData.orders || [];
    const revenue = analyticsData.revenue || {};
    const customers = analyticsData.customers || [];
    
    const totalRevenue = Object.values(revenue).reduce((sum, val) => sum + val, 0);
    const totalOrders = orders.length;
    const totalCustomers = customers.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    const avgWaitTime = orders.reduce((sum, order) => sum + (order.waitTime || 0), 0) / totalOrders || 0;
    const avgSatisfaction = orders.reduce((sum, order) => sum + (order.rating || 0), 0) / totalOrders || 0;
    
    return {
      revenue: totalRevenue,
      orders: totalOrders,
      customers: totalCustomers,
      avgOrder: avgOrderValue,
      waitTime: avgWaitTime,
      satisfaction: (avgSatisfaction / 5) * 100 // Convert to percentage
    };
  }, [analyticsData]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  const handleViewChange = useCallback((view) => {
    setActiveView(view);
  }, []);

  const handlePeriodChange = useCallback((period) => {
    setSelectedPeriod(period);
  }, []);

  const handleRefresh = useCallback(async () => {
    await loadAnalyticsData();
    await generateInsights();
  }, []);

  const handleExport = useCallback(async (format) => {
    try {
      const ReportingServiceModule = await import('../../services/ReportingService');
      const report = await ReportingServiceModule.default.generateReport({
        data: analyticsData,
        insights,
        predictions,
        format,
        period: selectedPeriod
      });
      
      // Download the report
      const blob = new Blob([report], { type: format === 'pdf' ? 'application/pdf' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report-${format}-${format(new Date(), 'yyyy-MM-dd')}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
  }, [analyticsData, insights, predictions, selectedPeriod]);

  const handleMetricToggle = useCallback((metric) => {
    setSelectedMetrics(prev => 
      prev.includes(metric) 
        ? prev.filter(m => m !== metric)
        : [...prev, metric]
    );
  }, []);

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  const renderMetricCards = () => {
    return (
      <div className={styles.metricsGrid}>
        {Object.entries(METRIC_TYPES).map(([key, metric]) => {
          if (!selectedMetrics.includes(key)) return null;
          
          const value = calculatedMetrics[key] || 0;
          const IconComponent = metric.icon;
          
          let formattedValue = value;
          switch (metric.format) {
            case 'currency':
              formattedValue = `${value.toFixed(2)} CHF`;
              break;
            case 'percentage':
              formattedValue = `${value.toFixed(1)}%`;
              break;
            case 'time':
              formattedValue = `${Math.round(value)} Min`;
              break;
            default:
              formattedValue = Math.round(value).toLocaleString();
          }
          
          return (
            <div key={key} className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <div className={styles.metricIcon} style={{ color: metric.color }}>
                  <IconComponent size={24} />
                </div>
                <div className={styles.metricTrend}>
                  <TrendingUp size={16} className={styles.trendUp} />
                  <span className={styles.trendValue}>+12%</span>
                </div>
              </div>
              <div className={styles.metricContent}>
                <h3 className={styles.metricValue}>{formattedValue}</h3>
                <p className={styles.metricLabel}>{metric.name}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderControlPanel = () => (
    <div className={styles.controlPanel}>
      <div className={styles.viewTabs}>
        {Object.entries(ANALYTICS_VIEWS).map(([key, view]) => {
          const IconComponent = view.icon;
          return (
            <button
              key={key}
              onClick={() => handleViewChange(key)}
              className={`${styles.viewTab} ${activeView === key ? styles.active : ''}`}
            >
              <IconComponent size={16} />
              <span>{view.name}</span>
            </button>
          );
        })}
      </div>
      
      <div className={styles.controls}>
        <div className={styles.periodSelector}>
          {Object.entries(ANALYTICS_PERIODS).map(([key, period]) => (
            <button
              key={key}
              onClick={() => handlePeriodChange(key)}
              className={`${styles.periodButton} ${selectedPeriod === key ? styles.active : ''}`}
            >
              {period.name}
            </button>
          ))}
        </div>
        
        <div className={styles.actionButtons}>
          <button
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            className={`${styles.actionButton} ${isAutoRefresh ? styles.active : ''}`}
          >
            <RefreshCw size={16} />
            Auto-Refresh
          </button>
          
          <button
            onClick={() => setShowAdvancedFilters(true)}
            className={styles.actionButton}
          >
            <Filter size={16} />
            Filter
          </button>
          
          <button
            onClick={() => handleExport(exportFormat)}
            className={styles.actionButton}
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>
    </div>
  );

  const renderActiveView = () => {
    switch (activeView) {
      case 'realtime':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <RealtimeChart data={realtimeData} />
          </Suspense>
        );
      
      case 'predictions':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <PredictiveInsights 
              predictions={predictions}
              historicalData={analyticsData}
            />
          </Suspense>
        );
      
      case 'customers':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <CustomerSegmentation 
              customers={analyticsData.customers}
              orders={analyticsData.orders}
            />
          </Suspense>
        );
      
      case 'performance':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <PerformanceMetrics 
              metrics={calculatedMetrics}
              historicalData={analyticsData}
            />
          </Suspense>
        );
      
      case 'competitors':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <CompetitorAnalysis 
              ownData={analyticsData}
              period={selectedPeriod}
            />
          </Suspense>
        );
      
      case 'custom':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <CustomDashboard 
              data={analyticsData}
              insights={insights}
              onConfigChange={(config) => console.log('Dashboard config:', config)}
            />
          </Suspense>
        );
      
      default:
        return (
          <div className={styles.overviewContent}>
            {renderMetricCards()}
            
            <div className={styles.chartsGrid}>
              <Suspense fallback={<LoadingSpinner />}>
                <RevenueForecast 
                  revenueData={analyticsData.revenue}
                  predictions={predictions}
                />
              </Suspense>
              
              <Suspense fallback={<LoadingSpinner />}>
                <HeatmapAnalysis 
                  orders={analyticsData.orders}
                  period={selectedPeriod}
                />
              </Suspense>
              
              <Suspense fallback={<LoadingSpinner />}>
                <SeasonalTrends 
                  data={analyticsData}
                  insights={insights}
                />
              </Suspense>
            </div>
          </div>
        );
    }
  };

  const renderInsights = () => (
    <div className={styles.insightsPanel}>
      <h3>KI-Insights</h3>
      {insights.length > 0 ? (
        insights.slice(0, 3).map((insight, index) => (
          <div key={index} className={`${styles.insightCard} ${styles[insight.type]}`}>
            <div className={styles.insightIcon}>
              {insight.type === 'warning' && <AlertTriangle size={16} />}
              {insight.type === 'success' && <CheckCircle size={16} />}
              {insight.type === 'info' && <Info size={16} />}
            </div>
            <div className={styles.insightContent}>
              <h4>{insight.title}</h4>
              <p>{insight.description}</p>
              {insight.action && (
                <button className={styles.insightAction}>
                  {insight.action}
                </button>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className={styles.noInsights}>
          <Brain size={32} />
          <p>Insights werden generiert...</p>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className={styles.advancedAnalytics}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Advanced Analytics</h1>
          <p>KI-gestützte Einblicke in Ihr Business</p>
        </div>
        <div className={styles.headerStats}>
          <div className={styles.statItem}>
            <Activity size={16} />
            <span>Live</span>
          </div>
          <div className={styles.statItem}>
            <Users size={16} />
            <span>{analyticsData.orders?.length || 0} Bestellungen</span>
          </div>
          <div className={styles.statItem}>
            <DollarSign size={16} />
            <span>{calculatedMetrics.revenue?.toFixed(0) || 0} CHF</span>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      {renderControlPanel()}

      {/* Main Content */}
      <div className={styles.mainContent}>
        <div className={styles.analyticsContent}>
          {renderActiveView()}
        </div>
        
        <div className={styles.sidebar}>
          {renderInsights()}
          
          {activeView === 'predictions' && (
            <Suspense fallback={<LoadingSpinner />}>
              <ABTestResults />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalytics;