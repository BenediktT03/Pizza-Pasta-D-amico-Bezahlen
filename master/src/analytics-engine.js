/**
 * EATECH - ANALYTICS ENGINE
 * Version: 5.0.0
 * Description: Business Intelligence, Predictive Analytics & Real-time Insights
 * Features: ML-based Predictions, Cross-Tenant Analytics, Live Dashboards
 * Author: EATECH Development Team
 * Last Modified: 2025-01-04
 * 
 * 📍 Dateipfad: public/js/analytics/analytics-engine.js
 */

// ============================================================================
// IMPORTS & DEPENDENCIES
// ============================================================================
import { firebaseManager } from '../firebase-config.js';
import { orderManager } from '../order-management.js';
import { paymentManager } from '../payment-manager.js';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================
const ANALYTICS_CONFIG = {
    version: '5.0.0',
    
    // Data Collection
    collection: {
        realtime: true,
        batchSize: 100,
        flushInterval: 30000, // 30 seconds
        retention: {
            raw: 30, // days
            aggregated: 365, // days
            archived: 1825 // 5 years
        }
    },
    
    // Metrics Definition
    metrics: {
        business: [
            'revenue', 'orders', 'average_order_value', 'items_per_order',
            'conversion_rate', 'cart_abandonment', 'customer_lifetime_value'
        ],
        operational: [
            'preparation_time', 'wait_time', 'order_accuracy', 'peak_hours',
            'staff_efficiency', 'kitchen_throughput', 'customer_satisfaction'
        ],
        customer: [
            'new_vs_returning', 'order_frequency', 'favorite_items',
            'dietary_preferences', 'payment_methods', 'order_channels'
        ],
        predictive: [
            'demand_forecast', 'revenue_projection', 'inventory_needs',
            'staff_requirements', 'seasonal_trends', 'growth_rate'
        ]
    },
    
    // Machine Learning Models
    ml: {
        models: {
            demandForecast: {
                type: 'timeseries',
                features: ['hour', 'dayOfWeek', 'weather', 'events', 'historicalOrders'],
                updateFrequency: 'daily'
            },
            customerChurn: {
                type: 'classification',
                features: ['orderFrequency', 'lastOrderDays', 'averageSpend', 'complaints'],
                threshold: 0.7
            },
            priceOptimization: {
                type: 'regression',
                features: ['demand', 'competition', 'costs', 'seasonality'],
                constraints: { minMargin: 0.3, maxIncrease: 0.2 }
            }
        }
    },
    
    // Real-time Thresholds
    alerts: {
        revenue: {
            dailyTarget: 5000,
            hourlyMin: 200
        },
        operations: {
            maxWaitTime: 25, // minutes
            maxQueueLength: 20,
            minStaffEfficiency: 0.8
        },
        system: {
            errorRate: 0.01,
            responseTime: 500, // ms
            uptime: 0.999
        }
    }
};

// ============================================================================
// ANALYTICS ENGINE CLASS
// ============================================================================
class AnalyticsEngine {
    constructor() {
        this.events = [];
        this.metrics = new Map();
        this.predictions = new Map();
        this.dashboards = new Map();
        this.isInitialized = false;
        
        // Real-time subscribers
        this.subscribers = new Map();
        
        // Performance tracking
        this.performanceBuffer = [];
        
        this.init();
    }
    
    /**
     * Initialize Analytics Engine
     */
    async init() {
        console.log('📊 Initializing EATECH Analytics Engine...');
        
        try {
            // Load historical data
            await this.loadHistoricalData();
            
            // Initialize ML models
            await this.initializeMLModels();
            
            // Setup real-time tracking
            this.setupRealtimeTracking();
            
            // Start data processing
            this.startDataProcessing();
            
            // Initialize dashboards
            this.initializeDashboards();
            
            // Setup performance monitoring
            this.setupPerformanceMonitoring();
            
            this.isInitialized = true;
            console.log('✅ Analytics Engine initialized');
            
        } catch (error) {
            console.error('❌ Analytics initialization failed:', error);
        }
    }
    
    /**
     * Track event
     */
    track(eventName, properties = {}) {
        const event = {
            id: this.generateEventId(),
            name: eventName,
            properties: {
                ...properties,
                tenantId: firebaseManager.tenantId,
                timestamp: Date.now(),
                sessionId: this.getSessionId(),
                userId: this.getUserId(),
                device: this.getDeviceInfo(),
                location: this.getLocationInfo()
            }
        };
        
        // Add to buffer
        this.events.push(event);
        
        // Process immediately for important events
        if (this.isImportantEvent(eventName)) {
            this.processEvent(event);
        }
        
        // Batch processing
        if (this.events.length >= ANALYTICS_CONFIG.collection.batchSize) {
            this.flushEvents();
        }
        
        return event.id;
    }
    
    /**
     * Get real-time metrics
     */
    getRealtimeMetrics() {
        return {
            timestamp: Date.now(),
            business: {
                revenue: {
                    today: this.metrics.get('revenue_today') || 0,
                    hour: this.metrics.get('revenue_hour') || 0,
                    growth: this.calculateGrowth('revenue')
                },
                orders: {
                    active: orderManager.activeOrders.size,
                    today: this.metrics.get('orders_today') || 0,
                    avgValue: this.metrics.get('avg_order_value') || 0
                },
                conversion: {
                    rate: this.metrics.get('conversion_rate') || 0,
                    cartAbandonment: this.metrics.get('cart_abandonment') || 0
                }
            },
            operational: {
                waitTime: {
                    current: this.calculateCurrentWaitTime(),
                    average: this.metrics.get('avg_wait_time') || 15,
                    trend: this.metrics.get('wait_time_trend') || 'stable'
                },
                kitchen: {
                    efficiency: this.metrics.get('kitchen_efficiency') || 0.85,
                    throughput: this.metrics.get('orders_per_hour') || 0,
                    bottlenecks: this.identifyBottlenecks()
                }
            },
            customers: {
                active: this.metrics.get('active_customers') || 0,
                new: this.metrics.get('new_customers_today') || 0,
                satisfaction: this.metrics.get('satisfaction_score') || 4.5
            },
            system: {
                uptime: this.metrics.get('uptime') || 99.9,
                responseTime: this.metrics.get('avg_response_time') || 45,
                errorRate: this.metrics.get('error_rate') || 0.001
            }
        };
    }
    
    /**
     * Predictive Analytics - Demand Forecasting
     */
    async predictDemand(timeframe = 'day', date = new Date()) {
        const features = await this.extractForecastFeatures(date);
        
        // Simple linear regression model (würde in Produktion durch TensorFlow.js ersetzt)
        const historicalData = await this.getHistoricalOrders(30);
        const model = this.trainDemandModel(historicalData);
        
        const predictions = [];
        const intervals = timeframe === 'day' ? 24 : 7; // hours or days
        
        for (let i = 0; i < intervals; i++) {
            const prediction = this.applyModel(model, {
                ...features,
                interval: i,
                dayOfWeek: (date.getDay() + Math.floor(i / 24)) % 7,
                hour: timeframe === 'day' ? i : null
            });
            
            predictions.push({
                interval: i,
                predicted: Math.round(prediction.orders),
                confidence: prediction.confidence,
                revenue: prediction.orders * this.metrics.get('avg_order_value')
            });
        }
        
        return {
            timeframe,
            date: date.toISOString(),
            predictions,
            factors: features,
            accuracy: this.calculateModelAccuracy('demand'),
            recommendations: this.generateDemandRecommendations(predictions)
        };
    }
    
    /**
     * Customer Behavior Analysis
     */
    async analyzeCustomerBehavior(customerId = null) {
        const analysis = {
            segments: {},
            patterns: {},
            predictions: {},
            recommendations: []
        };
        
        if (customerId) {
            // Individual customer analysis
            const customerData = await this.getCustomerData(customerId);
            
            analysis.individual = {
                profile: this.buildCustomerProfile(customerData),
                clv: this.calculateCLV(customerData),
                churnRisk: this.predictChurnRisk(customerData),
                nextOrderPrediction: this.predictNextOrder(customerData),
                recommendations: this.getPersonalizedRecommendations(customerData)
            };
        } else {
            // Aggregate analysis
            const allCustomers = await this.getAllCustomersData();
            
            // Segment customers
            analysis.segments = this.segmentCustomers(allCustomers);
            
            // Identify patterns
            analysis.patterns = {
                orderingHabits: this.analyzeOrderingHabits(allCustomers),
                preferences: this.analyzePreferences(allCustomers),
                pricesSensitivity: this.analyzePriceSensitivity(allCustomers)
            };
            
            // Predictions
            analysis.predictions = {
                growth: this.predictCustomerGrowth(),
                seasonalTrends: this.predictSeasonalTrends(),
                lifetimeValue: this.predictAggregateCLV()
            };
        }
        
        return analysis;
    }
    
    /**
     * Revenue Optimization Engine
     */
    async optimizeRevenue() {
        const optimization = {
            pricing: {},
            promotions: {},
            menu: {},
            operations: {}
        };
        
        // Dynamic Pricing Recommendations
        optimization.pricing = await this.analyzePricing();
        
        // Promotion Effectiveness
        optimization.promotions = {
            current: await this.analyzeCurrentPromotions(),
            recommended: this.recommendPromotions(),
            timing: this.optimizePromotionTiming()
        };
        
        // Menu Optimization
        optimization.menu = {
            profitability: await this.analyzeMenuProfitability(),
            recommendations: this.optimizeMenuMix(),
            bundling: this.suggestBundles()
        };
        
        // Operational Efficiency
        optimization.operations = {
            staffing: this.optimizeStaffing(),
            inventory: await this.optimizeInventory(),
            workflow: this.optimizeKitchenWorkflow()
        };
        
        // Calculate potential impact
        optimization.impact = this.calculateOptimizationImpact(optimization);
        
        return optimization;
    }
    
    /**
     * Cross-Tenant Benchmarking (Anonymized)
     */
    async getBenchmarks(category = null) {
        // Only for master admins or with proper permissions
        if (!this.canAccessBenchmarks()) {
            throw new Error('Insufficient permissions for benchmarking');
        }
        
        const benchmarks = {
            industry: {},
            percentiles: {},
            trends: {},
            insights: []
        };
        
        // Get anonymized data from similar tenants
        const peerData = await this.getAnonymizedPeerData(category);
        
        // Calculate benchmarks
        benchmarks.industry = {
            avgRevenue: this.calculateAverage(peerData, 'daily_revenue'),
            avgOrders: this.calculateAverage(peerData, 'daily_orders'),
            avgOrderValue: this.calculateAverage(peerData, 'avg_order_value'),
            avgWaitTime: this.calculateAverage(peerData, 'avg_wait_time'),
            conversionRate: this.calculateAverage(peerData, 'conversion_rate')
        };
        
        // Calculate percentiles
        benchmarks.percentiles = this.calculatePercentiles(peerData);
        
        // Identify trends
        benchmarks.trends = {
            growth: this.analyzePeerGrowth(peerData),
            seasonal: this.analyzePeerSeasonality(peerData),
            emerging: this.identifyEmergingTrends(peerData)
        };
        
        // Generate insights
        benchmarks.insights = this.generateBenchmarkInsights(benchmarks);
        
        return benchmarks;
    }
    
    /**
     * Advanced Visualizations
     */
    createVisualization(type, data, options = {}) {
        const visualizations = {
            // Revenue Flow Sankey Diagram
            revenueFlow: () => this.createSankeyDiagram(data, {
                source: 'channel',
                target: 'category',
                value: 'revenue',
                ...options
            }),
            
            // Customer Journey Map
            customerJourney: () => this.createJourneyMap(data, {
                stages: ['discovery', 'browse', 'cart', 'checkout', 'complete'],
                metrics: ['dropoff', 'time', 'satisfaction'],
                ...options
            }),
            
            // Heatmap (Orders by Hour/Day)
            orderHeatmap: () => this.createHeatmap(data, {
                x: 'hour',
                y: 'dayOfWeek',
                value: 'orders',
                color: 'RdYlGn',
                ...options
            }),
            
            // Predictive Chart
            forecast: () => this.createForecastChart(data, {
                actual: 'historical',
                predicted: 'forecast',
                confidence: true,
                ...options
            }),
            
            // Cohort Analysis
            cohort: () => this.createCohortChart(data, {
                metric: options.metric || 'retention',
                period: options.period || 'month',
                ...options
            })
        };
        
        return visualizations[type]?.() || null;
    }
    
    /**
     * Export Analytics Report
     */
    async exportReport(config) {
        const report = {
            metadata: {
                generated: new Date().toISOString(),
                period: config.period,
                tenant: firebaseManager.tenantId,
                version: ANALYTICS_CONFIG.version
            },
            summary: {},
            details: {},
            visualizations: [],
            recommendations: []
        };
        
        // Executive Summary
        report.summary = {
            revenue: await this.getRevenueSummary(config.period),
            operations: await this.getOperationalSummary(config.period),
            customers: await this.getCustomerSummary(config.period),
            growth: await this.getGrowthMetrics(config.period)
        };
        
        // Detailed Analysis
        if (config.includeDetails) {
            report.details = {
                sales: await this.getDetailedSales(config.period),
                products: await this.getProductAnalysis(config.period),
                customers: await this.getCustomerAnalysis(config.period),
                marketing: await this.getMarketingAnalysis(config.period)
            };
        }
        
        // Generate visualizations
        if (config.includeCharts) {
            report.visualizations = await this.generateReportCharts(config);
        }
        
        // AI-powered recommendations
        report.recommendations = await this.generateRecommendations(report);
        
        // Export format
        switch (config.format) {
            case 'pdf':
                return this.exportToPDF(report);
            case 'excel':
                return this.exportToExcel(report);
            case 'json':
                return report;
            default:
                return this.exportToHTML(report);
        }
    }
    
    /**
     * Real-time Dashboard Updates
     */
    subscribeToDashboard(dashboardId, callback) {
        if (!this.dashboards.has(dashboardId)) {
            this.dashboards.set(dashboardId, {
                subscribers: new Set(),
                config: {},
                data: {}
            });
        }
        
        const dashboard = this.dashboards.get(dashboardId);
        dashboard.subscribers.add(callback);
        
        // Send initial data
        callback(this.getDashboardData(dashboardId));
        
        // Return unsubscribe function
        return () => {
            dashboard.subscribers.delete(callback);
        };
    }
    
    /**
     * Performance Monitoring
     */
    trackPerformance(operation, duration, metadata = {}) {
        const metric = {
            operation,
            duration,
            timestamp: Date.now(),
            ...metadata
        };
        
        this.performanceBuffer.push(metric);
        
        // Real-time alerting for slow operations
        if (duration > ANALYTICS_CONFIG.alerts.system.responseTime) {
            this.handleSlowOperation(metric);
        }
        
        // Batch processing
        if (this.performanceBuffer.length >= 100) {
            this.processPerformanceMetrics();
        }
    }
    
    /**
     * Anomaly Detection
     */
    async detectAnomalies() {
        const anomalies = [];
        
        // Revenue anomalies
        const revenueData = await this.getRevenueTimeSeries(7);
        const revenueAnomalies = this.detectTimeSeriesAnomalies(revenueData);
        anomalies.push(...revenueAnomalies.map(a => ({ type: 'revenue', ...a })));
        
        // Order pattern anomalies
        const orderData = await this.getOrderPatterns(7);
        const orderAnomalies = this.detectPatternAnomalies(orderData);
        anomalies.push(...orderAnomalies.map(a => ({ type: 'orders', ...a })));
        
        // System performance anomalies
        const perfData = this.getPerformanceMetrics();
        const perfAnomalies = this.detectPerformanceAnomalies(perfData);
        anomalies.push(...perfAnomalies.map(a => ({ type: 'performance', ...a })));
        
        // Alert on critical anomalies
        const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
        if (criticalAnomalies.length > 0) {
            await this.alertAnomalies(criticalAnomalies);
        }
        
        return {
            anomalies,
            timestamp: Date.now(),
            actions: this.recommendAnomalyActions(anomalies)
        };
    }
    
    /**
     * Helper: Calculate Customer Lifetime Value
     */
    calculateCLV(customerData) {
        const { orders, firstOrder, lastOrder } = customerData;
        
        // Calculate metrics
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const orderCount = orders.length;
        const timespan = (lastOrder - firstOrder) / (1000 * 60 * 60 * 24); // days
        
        // Average order value
        const avgOrderValue = totalRevenue / orderCount;
        
        // Purchase frequency (orders per month)
        const purchaseFrequency = orderCount / (timespan / 30);
        
        // Predicted lifespan (based on churn probability)
        const churnProbability = this.calculateChurnProbability(customerData);
        const expectedLifespan = 1 / churnProbability; // months
        
        // CLV calculation
        const clv = avgOrderValue * purchaseFrequency * expectedLifespan;
        
        return {
            value: Math.round(clv),
            confidence: this.calculateCLVConfidence(customerData),
            breakdown: {
                avgOrderValue,
                purchaseFrequency,
                expectedLifespan,
                totalToDate: totalRevenue
            }
        };
    }
    
    /**
     * Helper: Generate Smart Recommendations
     */
    generateRecommendations(data) {
        const recommendations = [];
        
        // Revenue optimization
        if (data.summary.revenue.growth < 0.05) {
            recommendations.push({
                category: 'revenue',
                priority: 'high',
                title: 'Umsatzsteigerung empfohlen',
                description: 'Der Umsatz wächst unter 5%. Erwägen Sie Promotionen oder neue Produkte.',
                actions: [
                    'Happy Hour zwischen 15-17 Uhr einführen',
                    'Bundle-Angebote für beliebte Kombinationen erstellen',
                    'Treueprogramm aktivieren'
                ],
                impact: '+10-15% Umsatz erwartet'
            });
        }
        
        // Operational efficiency
        if (data.summary.operations.avgWaitTime > 20) {
            recommendations.push({
                category: 'operations',
                priority: 'medium',
                title: 'Wartezeiten optimieren',
                description: 'Die durchschnittliche Wartezeit liegt über 20 Minuten.',
                actions: [
                    'Zusätzliches Personal während Stosszeiten',
                    'Vorbestellung-Option aktivieren',
                    'Menü-Komplexität reduzieren'
                ],
                impact: '-5-8 Minuten Wartezeit'
            });
        }
        
        // Customer retention
        const returnRate = data.summary.customers.returningRate;
        if (returnRate < 0.3) {
            recommendations.push({
                category: 'customers',
                priority: 'high',
                title: 'Kundenbindung verbessern',
                description: 'Nur 30% der Kunden kommen wieder.',
                actions: [
                    'Follow-up Email nach erster Bestellung',
                    'Rabatt für zweite Bestellung anbieten',
                    'Feedback aktiv einholen'
                ],
                impact: '+15% Wiederkehrrate'
            });
        }
        
        return recommendations;
    }
}

// ============================================================================
// ANALYTICS DASHBOARD COMPONENT
// ============================================================================
class AnalyticsDashboard {
    constructor(analyticsEngine) {
        this.analytics = analyticsEngine;
        this.charts = new Map();
        this.updateInterval = null;
        
        this.init();
    }
    
    init() {
        this.render();
        this.initializeCharts();
        this.startRealtimeUpdates();
    }
    
    render() {
        const dashboard = document.createElement('div');
        dashboard.className = 'analytics-dashboard';
        dashboard.innerHTML = `
            <div class="dashboard-header">
                <h1>Business Analytics</h1>
                <div class="dashboard-controls">
                    <select id="timeRange" onchange="analyticsEngine.updateTimeRange(this.value)">
                        <option value="today">Heute</option>
                        <option value="week">Diese Woche</option>
                        <option value="month">Dieser Monat</option>
                        <option value="year">Dieses Jahr</option>
                    </select>
                    <button onclick="analyticsEngine.exportReport()" class="btn-export">
                        <i class="fas fa-download"></i> Export
                    </button>
                </div>
            </div>
            
            <div class="metrics-grid">
                <div class="metric-card revenue">
                    <div class="metric-icon">💰</div>
                    <div class="metric-content">
                        <h3>Umsatz</h3>
                        <div class="metric-value" id="revenueMetric">CHF 0</div>
                        <div class="metric-change positive">+0%</div>
                    </div>
                    <canvas id="revenueSparkline"></canvas>
                </div>
                
                <div class="metric-card orders">
                    <div class="metric-icon">📦</div>
                    <div class="metric-content">
                        <h3>Bestellungen</h3>
                        <div class="metric-value" id="ordersMetric">0</div>
                        <div class="metric-change">+0%</div>
                    </div>
                    <canvas id="ordersSparkline"></canvas>
                </div>
                
                <div class="metric-card customers">
                    <div class="metric-icon">👥</div>
                    <div class="metric-content">
                        <h3>Kunden</h3>
                        <div class="metric-value" id="customersMetric">0</div>
                        <div class="metric-change">+0%</div>
                    </div>
                    <canvas id="customersSparkline"></canvas>
                </div>
                
                <div class="metric-card efficiency">
                    <div class="metric-icon">⚡</div>
                    <div class="metric-content">
                        <h3>Effizienz</h3>
                        <div class="metric-value" id="efficiencyMetric">0%</div>
                        <div class="metric-change">+0%</div>
                    </div>
                    <canvas id="efficiencySparkline"></canvas>
                </div>
            </div>
            
            <div class="charts-grid">
                <div class="chart-container full-width">
                    <h3>Umsatz & Bestellungen</h3>
                    <canvas id="revenueOrdersChart"></canvas>
                </div>
                
                <div class="chart-container">
                    <h3>Beliebte Produkte</h3>
                    <canvas id="topProductsChart"></canvas>
                </div>
                
                <div class="chart-container">
                    <h3>Bestellzeiten Heatmap</h3>
                    <canvas id="orderHeatmap"></canvas>
                </div>
                
                <div class="chart-container">
                    <h3>Kundenanalyse</h3>
                    <canvas id="customerAnalysis"></canvas>
                </div>
                
                <div class="chart-container">
                    <h3>Vorhersage</h3>
                    <canvas id="forecastChart"></canvas>
                </div>
            </div>
            
            <div class="insights-section">
                <h3>KI-gestützte Empfehlungen</h3>
                <div id="insightsList" class="insights-list">
                    <!-- Insights will be loaded here -->
                </div>
            </div>
        `;
        
        document.getElementById('analyticsContainer')?.appendChild(dashboard);
    }
}

// ============================================================================
// EXPORT & INITIALIZATION
// ============================================================================

// Create singleton instance
const analyticsEngine = new AnalyticsEngine();

// Export for use
export { analyticsEngine, AnalyticsDashboard };

// Make available globally
if (typeof window !== 'undefined') {
    window.EATECH_ANALYTICS = analyticsEngine;
}