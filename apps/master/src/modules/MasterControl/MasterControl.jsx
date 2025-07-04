/**
 * EATECH - MASTER CONTROL CENTER
 * Version: 5.0.0
 * Description: Revolutionäres Multi-Tenant Management System für 800+ Foodtrucks
 * Author: EATECH Development Team
 * Last Modified: 2025-01-04
 */

// ============================================================================
// IMPORTS & DEPENDENCIES
// ============================================================================
import { validateInput } from './utils/validation.js';
import { logPerformance } from './utils/monitoring.js';
import { SWISS_CONFIG } from './config/swiss-market.js';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================
const MASTER_CONFIG = {
    version: '5.0.0',
    environment: 'production',
    maxTenants: 800,
    performance: {
        targetResponseTime: 50, // ms
        maxConcurrentUsers: 80000,
        cacheTimeout: 300000 // 5 minutes
    },
    
    // Multi-Instance Firebase Configuration
    firebaseInstances: {
        'ch-central': {
            config: {
                apiKey: "AIzaSyDFBlgWE81iHnACVwOmaU0jL7FV0l_tRmU",
                authDomain: "eatech-central.firebaseapp.com",
                databaseURL: "https://eatech-central.europe-west1.firebasedatabase.app",
                projectId: "eatech-central",
                storageBucket: "eatech-central.appspot.com",
                messagingSenderId: "261222802445",
                appId: "1:261222802445:web:edde22580422fbced22144"
            },
            maxTenants: 200,
            regions: ['ZH', 'BE', 'LU', 'ZG'],
            status: 'active'
        },
        'ch-west': {
            config: {
                apiKey: "AIzaSyDFBlgWE81iHnACVwOmaU0jL7FV0l_tRmW",
                authDomain: "eatech-west.firebaseapp.com",
                databaseURL: "https://eatech-west.europe-west1.firebasedatabase.app",
                projectId: "eatech-west",
                storageBucket: "eatech-west.appspot.com",
                messagingSenderId: "261222802446",
                appId: "1:261222802446:web:edde22580422fbced22145"
            },
            maxTenants: 200,
            regions: ['GE', 'VD', 'FR', 'NE'],
            status: 'active'
        },
        'ch-east': {
            config: {
                apiKey: "AIzaSyDFBlgWE81iHnACVwOmaU0jL7FV0l_tRmE",
                authDomain: "eatech-east.firebaseapp.com",
                databaseURL: "https://eatech-east.europe-west1.firebasedatabase.app",
                projectId: "eatech-east",
                storageBucket: "eatech-east.appspot.com",
                messagingSenderId: "261222802447",
                appId: "1:261222802447:web:edde22580422fbced22146"
            },
            maxTenants: 200,
            regions: ['SG', 'GR', 'TG', 'AR'],
            status: 'active'
        },
        'ch-south': {
            config: {
                apiKey: "AIzaSyDFBlgWE81iHnACVwOmaU0jL7FV0l_tRmS",
                authDomain: "eatech-south.firebaseapp.com",
                databaseURL: "https://eatech-south.europe-west1.firebasedatabase.app",
                projectId: "eatech-south",
                storageBucket: "eatech-south.appspot.com",
                messagingSenderId: "261222802448",
                appId: "1:261222802448:web:edde22580422fbced22147"
            },
            maxTenants: 200,
            regions: ['TI', 'VS'],
            status: 'active'
        }
    }
};

// ============================================================================
// MASTER CONTROL CENTER CLASS
// ============================================================================
class MasterControlCenter {
    constructor() {
        this.instances = {};
        this.tenants = new Map();
        this.performanceMonitor = null;
        this.systemHealth = {
            status: 'initializing',
            uptime: 0,
            lastCheck: null
        };
        
        this.init();
    }
    
    /**
     * Initialize Master Control Center with error handling
     */
    async init() {
        const perfStart = performance.now();
        
        try {
            console.log('🚀 EATECH Master Control Center v5.0.0 Initializing...');
            
            // 1. Initialize Firebase Instances
            await this.initializeFirebaseInstances();
            
            // 2. Setup Performance Monitoring
            this.setupPerformanceMonitoring();
            
            // 3. Load Existing Tenants
            await this.loadTenants();
            
            // 4. Setup Real-time Dashboard
            this.initializeDashboard();
            
            // 5. Setup Health Monitoring
            this.startHealthMonitoring();
            
            // 6. Initialize Security
            await this.initializeSecurity();
            
            const perfEnd = performance.now();
            console.log(`✅ Master Control Center initialized in ${(perfEnd - perfStart).toFixed(2)}ms`);
            
            this.systemHealth.status = 'operational';
            this.systemHealth.uptime = Date.now();
            
        } catch (error) {
            console.error('❌ Master Control Center initialization failed:', error);
            this.handleCriticalError(error);
            throw error;
        }
    }
    
    /**
     * Initialize all Firebase instances for multi-region support
     */
    async initializeFirebaseInstances() {
        console.log('🔥 Initializing Firebase instances...');
        
        for (const [region, config] of Object.entries(MASTER_CONFIG.firebaseInstances)) {
            try {
                // Initialize Firebase App for each region
                const app = firebase.initializeApp(config.config, region);
                const database = firebase.database(app);
                const auth = firebase.auth(app);
                const storage = firebase.storage(app);
                
                this.instances[region] = {
                    app,
                    database,
                    auth,
                    storage,
                    config,
                    metrics: {
                        tenantCount: 0,
                        activeConnections: 0,
                        lastLatency: 0,
                        health: 'healthy'
                    }
                };
                
                // Test connection
                await this.testInstanceConnection(region);
                
                console.log(`✅ Firebase instance ${region} initialized`);
                
            } catch (error) {
                console.error(`❌ Failed to initialize ${region}:`, error);
                this.instances[region] = { ...config, health: 'error', error };
            }
        }
    }
    
    /**
     * Test Firebase instance connection and measure latency
     */
    async testInstanceConnection(region) {
        const instance = this.instances[region];
        const startTime = performance.now();
        
        try {
            // Simple read operation to test connection
            await instance.database.ref('.info/connected').once('value');
            
            const latency = performance.now() - startTime;
            instance.metrics.lastLatency = latency;
            
            if (latency > 100) {
                console.warn(`⚠️ High latency detected for ${region}: ${latency.toFixed(2)}ms`);
            }
            
            return latency;
            
        } catch (error) {
            instance.metrics.health = 'error';
            throw error;
        }
    }
    
    /**
     * Create new tenant with automatic region assignment
     * @param {Object} tenantData - Tenant configuration
     * @returns {Object} Created tenant with access details
     */
    async createTenant(tenantData) {
        console.log('🏪 Creating new tenant:', tenantData.name);
        
        // Validate input
        if (!this.validateTenantData(tenantData)) {
            throw new Error('Invalid tenant data');
        }
        
        const perfStart = performance.now();
        
        try {
            // 1. Find optimal instance based on location and load
            const instance = this.findOptimalInstance(tenantData.canton);
            
            // 2. Generate unique tenant ID and subdomain
            const tenantId = this.generateTenantId(tenantData.name);
            const subdomain = this.generateSubdomain(tenantData.name);
            
            // 3. Create tenant structure in database
            const tenant = {
                id: tenantId,
                subdomain,
                name: tenantData.name,
                owner: tenantData.owner,
                contact: tenantData.contact,
                address: tenantData.address,
                canton: tenantData.canton,
                plan: tenantData.plan || 'standard',
                instance: instance.region,
                created: firebase.database.ServerValue.TIMESTAMP,
                status: 'active',
                features: this.getFeaturesByPlan(tenantData.plan),
                limits: {
                    products: tenantData.plan === 'premium' ? 1000 : 200,
                    ordersPerDay: tenantData.plan === 'premium' ? 5000 : 1000,
                    storage: tenantData.plan === 'premium' ? '10GB' : '2GB'
                },
                billing: {
                    plan: tenantData.plan,
                    price: this.getPlanPrice(tenantData.plan),
                    billingCycle: 'monthly',
                    nextBilling: this.calculateNextBillingDate()
                },
                theme: tenantData.theme || 'noir-excellence'
            };
            
            // 4. Create in Master Database
            await this.instances.master.database
                .ref(`tenants/${tenantId}`)
                .set(tenant);
            
            // 5. Create tenant space in regional instance
            await instance.database
                .ref(`tenants/${tenantId}`)
                .set({
                    settings: {
                        name: tenant.name,
                        theme: tenant.theme,
                        language: 'de-CH',
                        currency: 'CHF',
                        timezone: 'Europe/Zurich'
                    },
                    products: {},
                    orders: {},
                    customers: {},
                    analytics: {}
                });
            
            // 6. Setup subdomain routing
            await this.setupSubdomainRouting(subdomain, instance.region, tenantId);
            
            // 7. Create admin user
            const adminUser = await this.createAdminUser(tenantData.owner, tenantId, instance);
            
            // 8. Send welcome email
            await this.sendWelcomeEmail(tenantData.owner.email, {
                tenantName: tenant.name,
                subdomain,
                adminCredentials: adminUser
            });
            
            const perfEnd = performance.now();
            console.log(`✅ Tenant ${tenantId} created in ${(perfEnd - perfStart).toFixed(2)}ms`);
            
            // 9. Update metrics
            this.updateTenantMetrics(instance.region, 'add');
            
            return {
                success: true,
                tenant: {
                    id: tenantId,
                    subdomain,
                    url: `https://${subdomain}.eatech.ch`,
                    adminUrl: `https://${subdomain}.eatech.ch/admin`,
                    instance: instance.region
                },
                credentials: {
                    email: adminUser.email,
                    temporaryPassword: adminUser.temporaryPassword
                }
            };
            
        } catch (error) {
            console.error('❌ Tenant creation failed:', error);
            
            // Rollback on error
            await this.rollbackTenantCreation(tenantId);
            
            throw error;
        }
    }
    
    /**
     * Find optimal Firebase instance based on location and current load
     */
    findOptimalInstance(canton) {
        let bestInstance = null;
        let lowestLoad = Infinity;
        
        for (const [region, instance] of Object.entries(this.instances)) {
            // Check if region serves this canton
            if (instance.config.regions.includes(canton)) {
                const load = instance.metrics.tenantCount / instance.config.maxTenants;
                
                if (load < lowestLoad && instance.metrics.health === 'healthy') {
                    lowestLoad = load;
                    bestInstance = { region, ...instance };
                }
            }
        }
        
        // Fallback to least loaded instance if no regional match
        if (!bestInstance) {
            for (const [region, instance] of Object.entries(this.instances)) {
                const load = instance.metrics.tenantCount / instance.config.maxTenants;
                
                if (load < lowestLoad && instance.metrics.health === 'healthy') {
                    lowestLoad = load;
                    bestInstance = { region, ...instance };
                }
            }
        }
        
        if (!bestInstance) {
            throw new Error('No available instances');
        }
        
        return bestInstance;
    }
    
    /**
     * Real-time Dashboard Data Provider
     */
    initializeDashboard() {
        // Global metrics reference
        this.metricsRef = firebase.database().ref('master/metrics');
        
        // Update dashboard every 5 seconds
        setInterval(() => {
            this.updateDashboardMetrics();
        }, 5000);
        
        // Real-time tenant activity stream
        this.startActivityStream();
    }
    
    /**
     * Update dashboard with real-time metrics
     */
    async updateDashboardMetrics() {
        const metrics = {
            timestamp: Date.now(),
            global: {
                totalTenants: this.tenants.size,
                activeOrders: 0,
                totalRevenue: 0,
                systemLoad: 0,
                avgResponseTime: 0
            },
            instances: {},
            topTenants: [],
            alerts: []
        };
        
        // Collect metrics from all instances
        for (const [region, instance] of Object.entries(this.instances)) {
            if (instance.metrics) {
                metrics.instances[region] = {
                    tenantCount: instance.metrics.tenantCount,
                    activeConnections: instance.metrics.activeConnections,
                    latency: instance.metrics.lastLatency,
                    health: instance.metrics.health
                };
                
                // Aggregate global metrics
                metrics.global.systemLoad += (instance.metrics.tenantCount / instance.config.maxTenants) * 100;
            }
        }
        
        // Calculate averages
        metrics.global.systemLoad /= Object.keys(this.instances).length;
        metrics.global.avgResponseTime = await this.calculateAverageResponseTime();
        
        // Get top performing tenants
        metrics.topTenants = await this.getTopTenants(5);
        
        // Check for alerts
        metrics.alerts = this.checkSystemAlerts(metrics);
        
        // Push to Firebase
        await this.metricsRef.set(metrics);
    }
    
    /**
     * Advanced Analytics Engine
     */
    async generateCrossTenantAnalytics() {
        console.log('📊 Generating cross-tenant analytics...');
        
        const analytics = {
            generated: Date.now(),
            period: {
                start: Date.now() - (30 * 24 * 60 * 60 * 1000), // 30 days
                end: Date.now()
            },
            insights: {
                revenue: {
                    total: 0,
                    byRegion: {},
                    byPlan: {},
                    growth: 0
                },
                orders: {
                    total: 0,
                    avgPerTenant: 0,
                    peakHours: [],
                    popularProducts: []
                },
                tenants: {
                    total: this.tenants.size,
                    active: 0,
                    churnRate: 0,
                    satisfaction: 0
                },
                performance: {
                    avgResponseTime: 0,
                    uptime: 99.99,
                    incidents: 0
                }
            },
            predictions: {
                revenueNext30Days: 0,
                expectedNewTenants: 0,
                capacityWarning: null
            },
            recommendations: []
        };
        
        // Analyze each tenant
        for (const [tenantId, tenant] of this.tenants) {
            try {
                const tenantAnalytics = await this.analyzeTenant(tenantId);
                
                // Aggregate revenue
                analytics.insights.revenue.total += tenantAnalytics.revenue;
                analytics.insights.revenue.byRegion[tenant.canton] = 
                    (analytics.insights.revenue.byRegion[tenant.canton] || 0) + tenantAnalytics.revenue;
                analytics.insights.revenue.byPlan[tenant.plan] = 
                    (analytics.insights.revenue.byPlan[tenant.plan] || 0) + tenantAnalytics.revenue;
                
                // Aggregate orders
                analytics.insights.orders.total += tenantAnalytics.orderCount;
                
                // Mark active tenants
                if (tenantAnalytics.lastOrder > Date.now() - (7 * 24 * 60 * 60 * 1000)) {
                    analytics.insights.tenants.active++;
                }
                
            } catch (error) {
                console.error(`Failed to analyze tenant ${tenantId}:`, error);
            }
        }
        
        // Calculate derived metrics
        analytics.insights.orders.avgPerTenant = 
            analytics.insights.orders.total / analytics.insights.tenants.active;
        
        analytics.insights.tenants.churnRate = 
            this.calculateChurnRate();
        
        // Generate predictions using simple linear regression
        analytics.predictions = await this.generatePredictions(analytics);
        
        // Generate recommendations
        analytics.recommendations = this.generateRecommendations(analytics);
        
        return analytics;
    }
    
    /**
     * Emergency Control System
     */
    async emergencyShutdown(reason, options = {}) {
        console.error('🚨 EMERGENCY SHUTDOWN INITIATED:', reason);
        
        const shutdownLog = {
            timestamp: Date.now(),
            reason,
            initiatedBy: options.initiatedBy || 'system',
            options
        };
        
        try {
            // 1. Stop accepting new orders globally
            await this.setGlobalFlag('acceptingOrders', false);
            
            // 2. Notify all active tenants
            const notifications = [];
            for (const [tenantId, tenant] of this.tenants) {
                notifications.push(
                    this.notifyTenant(tenantId, {
                        type: 'emergency_shutdown',
                        reason,
                        message: options.message || 'System emergency maintenance',
                        estimatedDowntime: options.estimatedDowntime || 'Unknown'
                    })
                );
            }
            
            await Promise.all(notifications);
            
            // 3. Backup critical data
            if (options.backup !== false) {
                await this.performEmergencyBackup();
            }
            
            // 4. Set system status
            this.systemHealth.status = 'emergency_shutdown';
            
            // 5. Log to audit trail
            await this.logAuditEvent('emergency_shutdown', shutdownLog);
            
            // 6. Send alerts to administrators
            await this.sendAdminAlerts({
                level: 'critical',
                subject: 'EATECH Emergency Shutdown',
                body: `System shutdown initiated. Reason: ${reason}`
            });
            
            return {
                success: true,
                shutdownId: shutdownLog.timestamp,
                affectedTenants: this.tenants.size
            };
            
        } catch (error) {
            console.error('❌ Emergency shutdown failed:', error);
            
            // Last resort: hard shutdown
            this.performHardShutdown();
            
            throw error;
        }
    }
    
    /**
     * Health Monitoring System
     */
    startHealthMonitoring() {
        // Main health check every 30 seconds
        setInterval(() => {
            this.performHealthCheck();
        }, 30000);
        
        // Instance latency check every 5 seconds
        setInterval(() => {
            this.checkInstanceLatencies();
        }, 5000);
        
        // Memory and performance check every minute
        setInterval(() => {
            this.checkSystemResources();
        }, 60000);
    }
    
    /**
     * Comprehensive health check
     */
    async performHealthCheck() {
        const healthReport = {
            timestamp: Date.now(),
            overall: 'healthy',
            instances: {},
            services: {
                database: 'operational',
                authentication: 'operational',
                storage: 'operational',
                functions: 'operational'
            },
            metrics: {
                cpu: 0,
                memory: 0,
                diskUsage: 0,
                networkLatency: 0
            },
            alerts: []
        };
        
        try {
            // Check each Firebase instance
            for (const [region, instance] of Object.entries(this.instances)) {
                const instanceHealth = await this.checkInstanceHealth(region);
                healthReport.instances[region] = instanceHealth;
                
                if (instanceHealth.status !== 'healthy') {
                    healthReport.overall = 'degraded';
                    healthReport.alerts.push({
                        level: 'warning',
                        message: `Instance ${region} is ${instanceHealth.status}`,
                        details: instanceHealth
                    });
                }
            }
            
            // Check system resources
            healthReport.metrics = await this.getSystemMetrics();
            
            // Check if any metric exceeds threshold
            if (healthReport.metrics.cpu > 80) {
                healthReport.alerts.push({
                    level: 'warning',
                    message: 'High CPU usage detected',
                    value: healthReport.metrics.cpu
                });
            }
            
            if (healthReport.metrics.memory > 85) {
                healthReport.alerts.push({
                    level: 'critical',
                    message: 'High memory usage detected',
                    value: healthReport.metrics.memory
                });
                healthReport.overall = 'critical';
            }
            
            // Update system health
            this.systemHealth = {
                ...this.systemHealth,
                ...healthReport,
                lastCheck: Date.now()
            };
            
            // Store health report
            await firebase.database()
                .ref('master/health/current')
                .set(healthReport);
            
            // Alert if critical
            if (healthReport.overall === 'critical') {
                await this.handleCriticalHealth(healthReport);
            }
            
        } catch (error) {
            console.error('Health check failed:', error);
            this.systemHealth.status = 'error';
        }
    }
    
    /**
     * Billing and Subscription Management
     */
    async processTenantBilling() {
        console.log('💰 Processing tenant billing...');
        
        const billingRun = {
            id: `BILL-${Date.now()}`,
            timestamp: Date.now(),
            processed: 0,
            failed: 0,
            total: 0,
            revenue: 0
        };
        
        for (const [tenantId, tenant] of this.tenants) {
            try {
                // Check if billing is due
                if (this.isBillingDue(tenant)) {
                    const invoice = await this.generateInvoice(tenant);
                    const payment = await this.processPayment(tenant, invoice);
                    
                    if (payment.success) {
                        billingRun.processed++;
                        billingRun.revenue += invoice.total;
                        
                        // Update tenant billing info
                        await this.updateTenantBilling(tenantId, {
                            lastBilled: Date.now(),
                            nextBilling: this.calculateNextBillingDate(tenant.billing.billingCycle),
                            status: 'active'
                        });
                        
                    } else {
                        billingRun.failed++;
                        
                        // Handle failed payment
                        await this.handleFailedPayment(tenantId, payment.error);
                    }
                }
                
                billingRun.total++;
                
            } catch (error) {
                console.error(`Billing failed for tenant ${tenantId}:`, error);
                billingRun.failed++;
            }
        }
        
        // Store billing run report
        await firebase.database()
            .ref(`master/billing/runs/${billingRun.id}`)
            .set(billingRun);
        
        console.log(`✅ Billing completed: ${billingRun.processed} processed, ${billingRun.failed} failed`);
        
        return billingRun;
    }
    
    /**
     * Advanced Security Implementation
     */
    async initializeSecurity() {
        console.log('🔒 Initializing security systems...');
        
        // 1. Setup intrusion detection
        this.setupIntrusionDetection();
        
        // 2. Initialize rate limiting
        this.initializeRateLimiting();
        
        // 3. Setup audit logging
        this.setupAuditLogging();
        
        // 4. Initialize encryption
        await this.initializeEncryption();
        
        // 5. Setup DDoS protection
        this.setupDDoSProtection();
        
        console.log('✅ Security systems initialized');
    }
    
    /**
     * Backup Management System
     */
    async performScheduledBackup() {
        console.log('💾 Starting scheduled backup...');
        
        const backup = {
            id: `BACKUP-${Date.now()}`,
            timestamp: Date.now(),
            type: 'scheduled',
            status: 'in_progress',
            size: 0,
            tenants: []
        };
        
        try {
            // 1. Backup master database
            const masterBackup = await this.backupMasterDatabase();
            backup.master = masterBackup;
            
            // 2. Backup each tenant
            for (const [tenantId, tenant] of this.tenants) {
                try {
                    const tenantBackup = await this.backupTenant(tenantId);
                    backup.tenants.push({
                        id: tenantId,
                        success: true,
                        size: tenantBackup.size
                    });
                    backup.size += tenantBackup.size;
                    
                } catch (error) {
                    backup.tenants.push({
                        id: tenantId,
                        success: false,
                        error: error.message
                    });
                }
            }
            
            // 3. Upload to secure storage
            const storageResult = await this.uploadBackupToStorage(backup);
            
            backup.status = 'completed';
            backup.location = storageResult.location;
            
            // 4. Cleanup old backups
            await this.cleanupOldBackups();
            
            console.log(`✅ Backup completed: ${backup.size} bytes backed up`);
            
        } catch (error) {
            console.error('❌ Backup failed:', error);
            backup.status = 'failed';
            backup.error = error.message;
        }
        
        // Store backup metadata
        await firebase.database()
            .ref(`master/backups/${backup.id}`)
            .set(backup);
        
        return backup;
    }
}

// ============================================================================
// GLOBAL DASHBOARD COMPONENTS
// ============================================================================

/**
 * Live Activity Stream Component
 */
class ActivityStream {
    constructor(masterControl) {
        this.master = masterControl;
        this.activities = [];
        this.maxActivities = 100;
    }
    
    start() {
        // Monitor all tenant activities
        for (const [region, instance] of Object.entries(this.master.instances)) {
            instance.database.ref('tenants').on('child_added', snapshot => {
                const tenantId = snapshot.key;
                
                // Monitor orders
                snapshot.ref.child('orders').on('child_added', orderSnapshot => {
                    this.addActivity({
                        type: 'new_order',
                        tenantId,
                        region,
                        data: orderSnapshot.val(),
                        timestamp: Date.now()
                    });
                });
                
                // Monitor products
                snapshot.ref.child('products').on('child_changed', productSnapshot => {
                    this.addActivity({
                        type: 'product_update',
                        tenantId,
                        region,
                        data: productSnapshot.val(),
                        timestamp: Date.now()
                    });
                });
            });
        }
    }
    
    addActivity(activity) {
        this.activities.unshift(activity);
        
        // Keep only recent activities
        if (this.activities.length > this.maxActivities) {
            this.activities = this.activities.slice(0, this.maxActivities);
        }
        
        // Emit to dashboard
        this.emit('activity', activity);
    }
    
    emit(event, data) {
        // Send to real-time dashboard
        firebase.database()
            .ref('master/dashboard/activities')
            .push(data);
    }
}

/**
 * Predictive Analytics Engine
 */
class PredictiveAnalytics {
    constructor() {
        this.models = {
            revenue: null,
            orders: null,
            churn: null
        };
    }
    
    /**
     * Predict revenue for next period using linear regression
     */
    predictRevenue(historicalData, days = 30) {
        // Simple linear regression
        const n = historicalData.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        
        historicalData.forEach((point, i) => {
            sumX += i;
            sumY += point.revenue;
            sumXY += i * point.revenue;
            sumX2 += i * i;
        });
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // Predict future values
        const predictions = [];
        for (let i = 0; i < days; i++) {
            const day = n + i;
            const predictedRevenue = slope * day + intercept;
            predictions.push({
                day: i + 1,
                revenue: Math.max(0, predictedRevenue),
                confidence: this.calculateConfidence(historicalData, slope, intercept)
            });
        }
        
        return {
            predictions,
            model: { slope, intercept },
            accuracy: this.calculateAccuracy(historicalData, slope, intercept)
        };
    }
    
    /**
     * Detect anomalies in tenant behavior
     */
    detectAnomalies(tenantMetrics) {
        const anomalies = [];
        
        // Check for sudden drops in orders
        if (tenantMetrics.ordersToday < tenantMetrics.avgDailyOrders * 0.5) {
            anomalies.push({
                type: 'low_orders',
                severity: 'warning',
                message: 'Orders 50% below average',
                recommendation: 'Check if tenant is experiencing issues'
            });
        }
        
        // Check for unusual refund rate
        if (tenantMetrics.refundRate > 0.1) {
            anomalies.push({
                type: 'high_refunds',
                severity: 'critical',
                message: 'High refund rate detected',
                recommendation: 'Review recent orders for quality issues'
            });
        }
        
        // Check for payment failures
        if (tenantMetrics.paymentFailureRate > 0.05) {
            anomalies.push({
                type: 'payment_issues',
                severity: 'warning',
                message: 'Elevated payment failure rate',
                recommendation: 'Check payment gateway configuration'
            });
        }
        
        return anomalies;
    }
}

// ============================================================================
// EXPORT & INITIALIZATION
// ============================================================================

// Create singleton instance
const masterControl = new MasterControlCenter();

// Export for use in other modules
export default masterControl;

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
    window.EATECH_MASTER = masterControl;
    
    // Add to performance monitoring
    window.__EATECH_MODULES__ = window.__EATECH_MODULES__ || {};
    window.__EATECH_MODULES__.MasterControl = {
        version: MASTER_CONFIG.version,
        initialized: Date.now(),
        instance: masterControl
    };
}

// CLI Interface for direct management
if (typeof process !== 'undefined' && process.argv) {
    const command = process.argv[2];
    
    switch (command) {
        case 'create-tenant':
            // node master-control.js create-tenant "Burger King Zürich" zurich@example.com
            const tenantData = {
                name: process.argv[3],
                owner: {
                    email: process.argv[4],
                    name: process.argv[5] || 'Admin'
                },
                canton: process.argv[6] || 'ZH'
            };
            
            masterControl.createTenant(tenantData)
                .then(result => {
                    console.log('Tenant created:', result);
                    process.exit(0);
                })
                .catch(error => {
                    console.error('Failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'health':
            masterControl.performHealthCheck()
                .then(() => {
                    console.log('Health:', masterControl.systemHealth);
                    process.exit(0);
                });
            break;
            
        case 'backup':
            masterControl.performScheduledBackup()
                .then(result => {
                    console.log('Backup completed:', result);
                    process.exit(0);
                });
            break;
    }
}