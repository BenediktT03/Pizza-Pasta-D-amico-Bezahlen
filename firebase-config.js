/**
 * EATECH - FIREBASE MULTI-INSTANCE CONFIGURATION
 * Version: 5.0.0
 * Description: Optimierte Multi-Instance Firebase Konfiguration für 800+ Foodtrucks
 * Features: Regional Sharding, Auto-Failover, Performance Monitoring
 * Author: EATECH Development Team
 * Last Modified: 2025-01-04
 */

// ============================================================================
// IMPORTS & DEPENDENCIES
// ============================================================================
import { initializeApp } from 'firebase/app';
import { getDatabase, goOnline, goOffline } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getPerformance } from 'firebase/performance';
import { getAnalytics } from 'firebase/analytics';

// ============================================================================
// FIREBASE MULTI-INSTANCE MANAGER
// ============================================================================
class FirebaseMultiInstanceManager {
    constructor() {
        this.instances = new Map();
        this.activeConnections = new Map();
        this.performanceMetrics = new Map();
        this.currentInstance = null;
        this.tenantId = null;
        
        // Connection pool settings
        this.maxConnectionsPerInstance = 1000;
        this.connectionTimeout = 30000; // 30 seconds
        
        // Initialize
        this.init();
    }
    
    /**
     * Initialize Firebase instances with regional optimization
     */
    async init() {
        console.log('🔥 Initializing EATECH Firebase Multi-Instance System...');
        
        try {
            // 1. Detect tenant from URL
            this.tenantId = this.detectTenant();
            
            // 2. Load tenant configuration
            const tenantConfig = await this.loadTenantConfig();
            
            // 3. Initialize appropriate instance
            if (tenantConfig) {
                await this.initializeInstance(tenantConfig.instance, tenantConfig);
            } else {
                // Default instance for public pages
                await this.initializeDefaultInstance();
            }
            
            // 4. Setup performance monitoring
            this.setupPerformanceMonitoring();
            
            // 5. Setup connection management
            this.setupConnectionManagement();
            
            // 6. Setup failover mechanism
            this.setupFailover();
            
            console.log('✅ Firebase Multi-Instance System initialized');
            
        } catch (error) {
            console.error('❌ Firebase initialization failed:', error);
            
            // Fallback to cached instance
            this.initializeCachedInstance();
        }
    }
    
    /**
     * Detect tenant from URL
     */
    detectTenant() {
        // From subdomain: tenant.eatech.ch
        const hostname = window.location.hostname;
        const subdomain = hostname.split('.')[0];
        
        if (subdomain && subdomain !== 'www' && subdomain !== 'eatech' && subdomain !== 'master') {
            return subdomain;
        }
        
        // From URL parameter: ?tenant=xyz
        const urlParams = new URLSearchParams(window.location.search);
        const tenantParam = urlParams.get('tenant');
        if (tenantParam) {
            return tenantParam;
        }
        
        // From localStorage (development)
        const localTenant = localStorage.getItem('eatech_tenant');
        if (localTenant) {
            return localTenant;
        }
        
        return null;
    }
    
    /**
     * Load tenant configuration from master
     */
    async loadTenantConfig() {
        if (!this.tenantId) return null;
        
        try {
            // Check localStorage cache first
            const cachedConfig = this.getCachedTenantConfig();
            if (cachedConfig && this.isCacheValid(cachedConfig)) {
                return cachedConfig;
            }
            
            // Fetch from master API
            const response = await fetch(`https://master.eatech.ch/api/tenant-config/${this.tenantId}`, {
                method: 'GET',
                headers: {
                    'X-API-Key': 'eatech-public-api-key',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                mode: 'cors',
                cache: 'default'
            });
            
            if (!response.ok) {
                throw new Error(`Failed to load tenant config: ${response.status}`);
            }
            
            const config = await response.json();
            
            // Cache configuration
            this.cacheTenantConfig(config);
            
            return config;
            
        } catch (error) {
            console.error('Failed to load tenant configuration:', error);
            
            // Try to use cached config even if expired
            return this.getCachedTenantConfig();
        }
    }
    
    /**
     * Initialize specific Firebase instance
     */
    async initializeInstance(instanceName, tenantConfig) {
        console.log(`🔥 Initializing Firebase instance: ${instanceName}`);
        
        // Instance configurations
        const instanceConfigs = {
            'ch-central': {
                apiKey: "AIzaSyDFBlgWE81iHnACVwOmaU0jL7FV0l_tRmU",
                authDomain: "eatech-central.firebaseapp.com",
                databaseURL: "https://eatech-central.europe-west1.firebasedatabase.app",
                projectId: "eatech-central",
                storageBucket: "eatech-central.appspot.com",
                messagingSenderId: "261222802445",
                appId: "1:261222802445:web:edde22580422fbced22144",
                measurementId: "G-CENTRAL123"
            },
            'ch-west': {
                apiKey: "AIzaSyDFBlgWE81iHnACVwOmaU0jL7FV0l_tRmW",
                authDomain: "eatech-west.firebaseapp.com",
                databaseURL: "https://eatech-west.europe-west1.firebasedatabase.app",
                projectId: "eatech-west",
                storageBucket: "eatech-west.appspot.com",
                messagingSenderId: "261222802446",
                appId: "1:261222802446:web:edde22580422fbced22145",
                measurementId: "G-WEST123"
            },
            'ch-east': {
                apiKey: "AIzaSyDFBlgWE81iHnACVwOmaU0jL7FV0l_tRmE",
                authDomain: "eatech-east.firebaseapp.com",
                databaseURL: "https://eatech-east.europe-west1.firebasedatabase.app",
                projectId: "eatech-east",
                storageBucket: "eatech-east.appspot.com",
                messagingSenderId: "261222802447",
                appId: "1:261222802447:web:edde22580422fbced22146",
                measurementId: "G-EAST123"
            },
            'ch-south': {
                apiKey: "AIzaSyDFBlgWE81iHnACVwOmaU0jL7FV0l_tRmS",
                authDomain: "eatech-south.firebaseapp.com",
                databaseURL: "https://eatech-south.europe-west1.firebasedatabase.app",
                projectId: "eatech-south",
                storageBucket: "eatech-south.appspot.com",
                messagingSenderId: "261222802448",
                appId: "1:261222802448:web:edde22580422fbced22147",
                measurementId: "G-SOUTH123"
            }
        };
        
        const config = instanceConfigs[instanceName];
        if (!config) {
            throw new Error(`Unknown instance: ${instanceName}`);
        }
        
        try {
            // Initialize Firebase app
            const app = initializeApp(config, instanceName);
            
            // Initialize services
            const database = getDatabase(app);
            const auth = getAuth(app);
            const storage = getStorage(app);
            const performance = getPerformance(app);
            const analytics = getAnalytics(app);
            
            // Configure database for optimal performance
            await this.optimizeDatabase(database);
            
            // Store instance
            this.instances.set(instanceName, {
                app,
                database,
                auth,
                storage,
                performance,
                analytics,
                config: tenantConfig,
                metrics: {
                    connections: 0,
                    latency: 0,
                    errors: 0,
                    lastHealthCheck: Date.now()
                }
            });
            
            // Set as current instance
            this.currentInstance = this.instances.get(instanceName);
            
            // Test connection
            await this.testConnection(instanceName);
            
            console.log(`✅ Instance ${instanceName} ready`);
            
            return this.currentInstance;
            
        } catch (error) {
            console.error(`Failed to initialize ${instanceName}:`, error);
            throw error;
        }
    }
    
    /**
     * Optimize database for performance
     */
    async optimizeDatabase(database) {
        // Enable offline persistence
        try {
            await database.enablePersistence();
            console.log('✅ Offline persistence enabled');
        } catch (error) {
            if (error.code === 'failed-precondition') {
                console.warn('Multiple tabs open, persistence disabled');
            } else if (error.code === 'unimplemented') {
                console.warn('Browser doesn\'t support persistence');
            }
        }
        
        // Configure connection pool
        database.INTERNAL.forceWebSockets();
        
        // Set memory cache size (100MB)
        database.INTERNAL.setMemoryCacheSizeBytes(100 * 1024 * 1024);
    }
    
    /**
     * Test connection and measure latency
     */
    async testConnection(instanceName) {
        const instance = this.instances.get(instanceName);
        const startTime = performance.now();
        
        try {
            // Simple read to test connection
            const snapshot = await instance.database
                .ref('.info/connected')
                .once('value');
            
            const latency = performance.now() - startTime;
            instance.metrics.latency = latency;
            
            if (!snapshot.val()) {
                throw new Error('Not connected to Firebase');
            }
            
            console.log(`✅ Connection test passed (${latency.toFixed(2)}ms)`);
            
            return latency;
            
        } catch (error) {
            instance.metrics.errors++;
            throw error;
        }
    }
    
    /**
     * Setup performance monitoring
     */
    setupPerformanceMonitoring() {
        // Monitor all Firebase operations
        this.monitoringInterval = setInterval(() => {
            this.instances.forEach((instance, name) => {
                this.measureInstancePerformance(name);
            });
        }, 10000); // Every 10 seconds
        
        // Report to master control
        this.reportingInterval = setInterval(() => {
            this.reportPerformanceMetrics();
        }, 60000); // Every minute
    }
    
    /**
     * Connection management for optimal performance
     */
    setupConnectionManagement() {
        // Monitor active connections
        if (this.currentInstance) {
            const connectedRef = this.currentInstance.database.ref('.info/connected');
            
            connectedRef.on('value', (snapshot) => {
                if (snapshot.val() === true) {
                    console.log('✅ Firebase connected');
                    this.handleReconnection();
                } else {
                    console.warn('⚠️ Firebase disconnected');
                    this.handleDisconnection();
                }
            });
        }
        
        // Implement connection pooling
        this.connectionPool = new ConnectionPool({
            maxConnections: this.maxConnectionsPerInstance,
            timeout: this.connectionTimeout,
            onConnectionCreated: (conn) => {
                console.log('New connection created:', conn.id);
            },
            onConnectionClosed: (conn) => {
                console.log('Connection closed:', conn.id);
            }
        });
    }
    
    /**
     * Failover mechanism for high availability
     */
    setupFailover() {
        this.failoverChain = ['ch-central', 'ch-west', 'ch-east', 'ch-south'];
        this.failoverAttempts = 0;
        this.maxFailoverAttempts = 3;
    }
    
    /**
     * Execute failover to backup instance
     */
    async executeFailover() {
        console.warn('🔄 Executing failover...');
        
        this.failoverAttempts++;
        
        if (this.failoverAttempts > this.maxFailoverAttempts) {
            console.error('❌ Max failover attempts reached');
            this.handleCompleteFailure();
            return;
        }
        
        // Find next available instance
        const currentIndex = this.failoverChain.indexOf(this.currentInstance?.name || '');
        const nextIndex = (currentIndex + 1) % this.failoverChain.length;
        const nextInstance = this.failoverChain[nextIndex];
        
        try {
            // Initialize backup instance
            await this.initializeInstance(nextInstance, {
                ...this.currentInstance?.config,
                instance: nextInstance
            });
            
            console.log(`✅ Failover successful to ${nextInstance}`);
            
            // Reset attempts
            this.failoverAttempts = 0;
            
            // Notify about failover
            this.notifyFailover(nextInstance);
            
        } catch (error) {
            console.error(`❌ Failover to ${nextInstance} failed:`, error);
            
            // Try next instance
            setTimeout(() => this.executeFailover(), 5000);
        }
    }
    
    /**
     * Get database reference with tenant isolation
     */
    ref(path) {
        if (!this.currentInstance) {
            throw new Error('No Firebase instance initialized');
        }
        
        // Ensure tenant isolation
        if (this.tenantId && !path.startsWith(`tenants/${this.tenantId}`)) {
            path = `tenants/${this.tenantId}/${path}`;
        }
        
        return this.currentInstance.database.ref(path);
    }
    
    /**
     * Cached operations for offline support
     */
    async cachedOperation(operation, fallbackData = null) {
        try {
            // Try online operation first
            const result = await operation();
            
            // Cache successful result
            this.cacheResult(operation.name, result);
            
            return result;
            
        } catch (error) {
            console.warn('Online operation failed, using cache:', error);
            
            // Try to get from cache
            const cached = this.getCachedResult(operation.name);
            if (cached) {
                return cached;
            }
            
            // Return fallback if no cache
            return fallbackData;
        }
    }
    
    /**
     * Performance optimization helpers
     */
    async batchWrite(updates) {
        const updatePromises = [];
        const batchSize = 100; // Firebase limit
        
        // Split into batches
        for (let i = 0; i < updates.length; i += batchSize) {
            const batch = updates.slice(i, i + batchSize);
            const batchUpdates = {};
            
            batch.forEach(update => {
                batchUpdates[update.path] = update.value;
            });
            
            updatePromises.push(
                this.currentInstance.database.ref().update(batchUpdates)
            );
        }
        
        return Promise.all(updatePromises);
    }
    
    /**
     * Cleanup and destroy
     */
    destroy() {
        // Clear intervals
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        if (this.reportingInterval) {
            clearInterval(this.reportingInterval);
        }
        
        // Close all connections
        this.instances.forEach(instance => {
            goOffline(instance.database);
        });
        
        // Clear instances
        this.instances.clear();
        
        console.log('✅ Firebase Multi-Instance Manager destroyed');
    }
}

// ============================================================================
// CONNECTION POOL IMPLEMENTATION
// ============================================================================
class ConnectionPool {
    constructor(options) {
        this.options = options;
        this.connections = new Map();
        this.available = [];
        this.inUse = new Set();
    }
    
    async getConnection() {
        // Return available connection
        if (this.available.length > 0) {
            const conn = this.available.pop();
            this.inUse.add(conn);
            return conn;
        }
        
        // Create new connection if under limit
        if (this.connections.size < this.options.maxConnections) {
            const conn = await this.createConnection();
            this.inUse.add(conn);
            return conn;
        }
        
        // Wait for available connection
        return this.waitForConnection();
    }
    
    releaseConnection(conn) {
        this.inUse.delete(conn);
        this.available.push(conn);
    }
    
    async createConnection() {
        const conn = {
            id: `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            created: Date.now(),
            lastUsed: Date.now()
        };
        
        this.connections.set(conn.id, conn);
        
        if (this.options.onConnectionCreated) {
            this.options.onConnectionCreated(conn);
        }
        
        return conn;
    }
    
    async waitForConnection() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (this.available.length > 0) {
                    clearInterval(checkInterval);
                    resolve(this.getConnection());
                }
            }, 100);
            
            // Timeout
            setTimeout(() => {
                clearInterval(checkInterval);
                throw new Error('Connection timeout');
            }, this.options.timeout);
        });
    }
}

// ============================================================================
// OPTIMIZED QUERY BUILDER
// ============================================================================
class OptimizedQueryBuilder {
    constructor(firebaseManager) {
        this.firebase = firebaseManager;
        this.queryCache = new Map();
        this.cacheTimeout = 60000; // 1 minute
    }
    
    /**
     * Paginated query with caching
     */
    async paginatedQuery(path, options = {}) {
        const {
            orderBy = 'timestamp',
            limit = 20,
            startAfter = null,
            direction = 'desc',
            cache = true
        } = options;
        
        // Generate cache key
        const cacheKey = `${path}-${orderBy}-${limit}-${startAfter}-${direction}`;
        
        // Check cache
        if (cache) {
            const cached = this.getFromCache(cacheKey);
            if (cached) return cached;
        }
        
        // Build query
        let query = this.firebase.ref(path);
        
        // Order
        query = query.orderByChild(orderBy);
        
        // Direction
        if (direction === 'desc') {
            query = query.limitToLast(limit);
        } else {
            query = query.limitToFirst(limit);
        }
        
        // Pagination
        if (startAfter) {
            if (direction === 'desc') {
                query = query.endBefore(startAfter);
            } else {
                query = query.startAfter(startAfter);
            }
        }
        
        // Execute
        const snapshot = await query.once('value');
        const results = [];
        
        snapshot.forEach(child => {
            results.push({
                id: child.key,
                ...child.val()
            });
        });
        
        // Reverse if desc
        if (direction === 'desc') {
            results.reverse();
        }
        
        // Cache results
        if (cache) {
            this.cacheResults(cacheKey, results);
        }
        
        return {
            data: results,
            hasMore: results.length === limit,
            lastKey: results.length > 0 ? results[results.length - 1].id : null
        };
    }
    
    /**
     * Real-time subscription with automatic reconnection
     */
    subscribe(path, callbacks, options = {}) {
        const {
            orderBy = null,
            limit = null,
            filters = []
        } = options;
        
        // Build query
        let query = this.firebase.ref(path);
        
        if (orderBy) {
            query = query.orderByChild(orderBy);
        }
        
        if (limit) {
            query = query.limitToLast(limit);
        }
        
        // Apply filters
        filters.forEach(filter => {
            switch (filter.operator) {
                case '==':
                    query = query.equalTo(filter.value);
                    break;
                case '>=':
                    query = query.startAt(filter.value);
                    break;
                case '<=':
                    query = query.endAt(filter.value);
                    break;
            }
        });
        
        // Subscription handlers
        const handlers = {
            added: query.on('child_added', snapshot => {
                callbacks.onAdded?.({
                    id: snapshot.key,
                    ...snapshot.val()
                });
            }),
            
            changed: query.on('child_changed', snapshot => {
                callbacks.onChanged?.({
                    id: snapshot.key,
                    ...snapshot.val()
                });
            }),
            
            removed: query.on('child_removed', snapshot => {
                callbacks.onRemoved?.(snapshot.key);
            }),
            
            error: query.on('value', null, error => {
                callbacks.onError?.(error);
            })
        };
        
        // Return unsubscribe function
        return () => {
            Object.values(handlers).forEach(handler => {
                query.off(handler);
            });
        };
    }
    
    /**
     * Cache management
     */
    cacheResults(key, data) {
        this.queryCache.set(key, {
            data,
            timestamp: Date.now()
        });
        
        // Auto cleanup old cache
        setTimeout(() => {
            this.queryCache.delete(key);
        }, this.cacheTimeout);
    }
    
    getFromCache(key) {
        const cached = this.queryCache.get(key);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        
        return null;
    }
}

// ============================================================================
// EXPORT & INITIALIZATION
// ============================================================================

// Create singleton instance
const firebaseManager = new FirebaseMultiInstanceManager();
const queryBuilder = new OptimizedQueryBuilder(firebaseManager);

// Export for use
export { firebaseManager, queryBuilder };

// Make available globally
if (typeof window !== 'undefined') {
    window.EATECH_FIREBASE = firebaseManager;
    window.EATECH_QUERY = queryBuilder;
}