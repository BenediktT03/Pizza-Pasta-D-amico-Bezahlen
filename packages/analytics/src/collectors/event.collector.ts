/**
 * EATECH - Event Collector
 * Version: 6.8.0
 * Description: Analytics Event Collection mit Lazy Loading und Batching
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /packages/analytics/src/collectors/event.collector.ts
 * 
 * Features: Event batching, offline support, privacy compliance, real-time streaming
 */

import { EventEmitter } from 'events';

// Lazy loaded processors
const batchProcessor = () => import('../processors/batchProcessor');
const realtimeProcessor = () => import('../processors/realtimeProcessor');
const privacyProcessor = () => import('../processors/privacyProcessor');
const enrichmentProcessor = () => import('../processors/enrichmentProcessor');

// Lazy loaded storage
const localStorageAdapter = () => import('../storage/localStorageAdapter');
const indexedDBAdapter = () => import('../storage/indexedDBAdapter');
const cloudStorageAdapter = () => import('../storage/cloudStorageAdapter');

// Lazy loaded validators
const eventValidator = () => import('../validators/eventValidator');
const schemaValidator = () => import('../validators/schemaValidator');
const gdprValidator = () => import('../validators/gdprValidator');

// Lazy loaded utilities
const sessionManager = () => import('../utils/sessionManager');
const deviceDetector = () => import('../utils/deviceDetector');
const networkDetector = () => import('../utils/networkDetector');
const performanceMonitor = () => import('../utils/performanceMonitor');

/**
 * Event types and categories
 */
export enum EventType {
  PAGE_VIEW = 'page_view',
  USER_ACTION = 'user_action',
  TRANSACTION = 'transaction',
  ERROR = 'error',
  PERFORMANCE = 'performance',
  CUSTOM = 'custom'
}

export enum EventCategory {
  NAVIGATION = 'navigation',
  INTERACTION = 'interaction',
  COMMERCE = 'commerce',
  SYSTEM = 'system',
  MARKETING = 'marketing',
  VOICE = 'voice'
}

export enum EventPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

/**
 * Event interface
 */
export interface AnalyticsEvent {
  id: string;
  type: EventType;
  category: EventCategory;
  name: string;
  timestamp: number;
  sessionId: string;
  userId?: string;
  tenantId?: string;
  properties: Record<string, any>;
  context: EventContext;
  priority: EventPriority;
  metadata?: EventMetadata;
}

export interface EventContext {
  page: PageContext;
  user: UserContext;
  device: DeviceContext;
  session: SessionContext;
  location?: LocationContext;
  experiment?: ExperimentContext;
}

export interface PageContext {
  url: string;
  title: string;
  referrer: string;
  path: string;
  search: string;
  hash: string;
}

export interface UserContext {
  id?: string;
  anonymousId: string;
  traits?: Record<string, any>;
  consent: ConsentData;
}

export interface DeviceContext {
  userAgent: string;
  platform: string;
  vendor: string;
  model: string;
  type: 'mobile' | 'tablet' | 'desktop';
  screenResolution: string;
  viewportSize: string;
  timezone: string;
  language: string;
}

export interface SessionContext {
  id: string;
  startTime: number;
  duration: number;
  pageViews: number;
  isNew: boolean;
}

export interface LocationContext {
  country?: string;
  region?: string;
  city?: string;
  timezone: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface ExperimentContext {
  experiments: Array<{
    id: string;
    variant: string;
  }>;
}

export interface ConsentData {
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  timestamp: number;
  version: string;
}

export interface EventMetadata {
  source: string;
  version: string;
  environment: string;
  buildId?: string;
  deploymentId?: string;
}

/**
 * Collector configuration
 */
export interface CollectorConfig {
  endpoint?: string;
  apiKey?: string;
  batchSize: number;
  batchTimeout: number;
  maxRetries: number;
  enableOfflineStorage: boolean;
  enableRealtime: boolean;
  enablePrivacyMode: boolean;
  enablePerformanceMonitoring: boolean;
  maxEventsInMemory: number;
  storageQuota: number;
  debug: boolean;
  environment: 'development' | 'staging' | 'production';
}

/**
 * Main Event Collector Class
 */
export class EventCollector extends EventEmitter {
  private config: CollectorConfig;
  private eventQueue: AnalyticsEvent[] = [];
  private isInitialized = false;
  private isOnline = true;
  private batchTimer?: NodeJS.Timeout;
  private sessionManager?: any;
  private deviceDetector?: any;
  private networkDetector?: any;
  private performanceMonitor?: any;
  private storage?: any;
  private processors: Map<string, any> = new Map();

  constructor(config: Partial<CollectorConfig> = {}) {
    super();
    
    this.config = {
      batchSize: 50,
      batchTimeout: 5000,
      maxRetries: 3,
      enableOfflineStorage: true,
      enableRealtime: false,
      enablePrivacyMode: true,
      enablePerformanceMonitoring: true,
      maxEventsInMemory: 1000,
      storageQuota: 10 * 1024 * 1024, // 10MB
      debug: false,
      environment: 'production',
      ...config
    };
  }

  /**
   * Initialize the event collector
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing Event Collector...');
      
      // Initialize core utilities
      await this.initializeUtilities();
      
      // Initialize storage
      await this.initializeStorage();
      
      // Initialize processors
      await this.initializeProcessors();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Start batch processing
      this.startBatchProcessing();
      
      // Load offline events
      if (this.config.enableOfflineStorage) {
        await this.loadOfflineEvents();
      }
      
      this.isInitialized = true;
      console.log('Event Collector initialized successfully');
      
      // Track initialization
      this.track('collector_initialized', {
        config: this.sanitizeConfig(),
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Event Collector initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize core utilities
   */
  private async initializeUtilities(): Promise<void> {
    try {
      // Session Manager
      const { default: SessionManager } = await sessionManager();
      this.sessionManager = new SessionManager();
      await this.sessionManager.initialize();
      
      // Device Detector
      const { default: DeviceDetector } = await deviceDetector();
      this.deviceDetector = new DeviceDetector();
      
      // Network Detector
      const { default: NetworkDetector } = await networkDetector();
      this.networkDetector = new NetworkDetector();
      this.networkDetector.on('online', () => {
        this.isOnline = true;
        this.processOfflineEvents();
      });
      this.networkDetector.on('offline', () => {
        this.isOnline = false;
      });
      
      // Performance Monitor
      if (this.config.enablePerformanceMonitoring) {
        const { default: PerformanceMonitor } = await performanceMonitor();
        this.performanceMonitor = new PerformanceMonitor();
        this.performanceMonitor.on('metric', (metric: any) => {
          this.track('performance_metric', metric);
        });
      }
      
    } catch (error) {
      console.error('Error initializing utilities:', error);
      throw error;
    }
  }

  /**
   * Initialize storage adapters
   */
  private async initializeStorage(): Promise<void> {
    try {
      if (this.config.enableOfflineStorage) {
        // Try IndexedDB first, fallback to localStorage
        try {
          const { default: IndexedDBAdapter } = await indexedDBAdapter();
          this.storage = new IndexedDBAdapter('eatech_analytics');
          await this.storage.initialize();
        } catch (error) {
          console.warn('IndexedDB not available, falling back to localStorage');
          const { default: LocalStorageAdapter } = await localStorageAdapter();
          this.storage = new LocalStorageAdapter('eatech_analytics');
          await this.storage.initialize();
        }
      }
    } catch (error) {
      console.error('Error initializing storage:', error);
    }
  }

  /**
   * Initialize event processors
   */
  private async initializeProcessors(): Promise<void> {
    try {
      // Batch Processor
      const { default: BatchProcessor } = await batchProcessor();
      const batchProc = new BatchProcessor({
        batchSize: this.config.batchSize,
        timeout: this.config.batchTimeout
      });
      this.processors.set('batch', batchProc);
      
      // Realtime Processor
      if (this.config.enableRealtime) {
        const { default: RealtimeProcessor } = await realtimeProcessor();
        const realtimeProc = new RealtimeProcessor({
          endpoint: this.config.endpoint
        });
        this.processors.set('realtime', realtimeProc);
      }
      
      // Privacy Processor
      if (this.config.enablePrivacyMode) {
        const { default: PrivacyProcessor } = await privacyProcessor();
        const privacyProc = new PrivacyProcessor();
        this.processors.set('privacy', privacyProc);
      }
      
      // Enrichment Processor
      const { default: EnrichmentProcessor } = await enrichmentProcessor();
      const enrichmentProc = new EnrichmentProcessor();
      this.processors.set('enrichment', enrichmentProc);
      
    } catch (error) {
      console.error('Error initializing processors:', error);
      throw error;
    }
  }

  /**
   * Track an event
   */
  async track(
    eventName: string,
    properties: Record<string, any> = {},
    options: {
      type?: EventType;
      category?: EventCategory;
      priority?: EventPriority;
      userId?: string;
      tenantId?: string;
    } = {}
  ): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      // Create event
      const event = await this.createEvent(eventName, properties, options);
      
      // Validate event
      await this.validateEvent(event);
      
      // Process event through pipelines
      const processedEvent = await this.processEvent(event);
      
      // Add to queue
      this.addToQueue(processedEvent);
      
      // Emit event for listeners
      this.emit('event_tracked', processedEvent);
      
      if (this.config.debug) {
        console.log('Event tracked:', processedEvent);
      }
      
    } catch (error) {
      console.error('Error tracking event:', error);
      this.emit('tracking_error', { eventName, properties, error });
    }
  }

  /**
   * Track page view
   */
  async trackPageView(
    page: string,
    properties: Record<string, any> = {}
  ): Promise<void> {
    const pageProperties = {
      ...properties,
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
      path: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash
    };
    
    await this.track('page_viewed', pageProperties, {
      type: EventType.PAGE_VIEW,
      category: EventCategory.NAVIGATION,
      priority: EventPriority.MEDIUM
    });
  }

  /**
   * Track user action
   */
  async trackAction(
    action: string,
    element?: Element,
    properties: Record<string, any> = {}
  ): Promise<void> {
    const actionProperties = {
      ...properties,
      action,
      timestamp: Date.now()
    };
    
    if (element) {
      actionProperties.element = {
        tagName: element.tagName,
        id: element.id,
        className: element.className,
        textContent: element.textContent?.substring(0, 100)
      };
    }
    
    await this.track('user_action', actionProperties, {
      type: EventType.USER_ACTION,
      category: EventCategory.INTERACTION,
      priority: EventPriority.LOW
    });
  }

  /**
   * Track transaction
   */
  async trackTransaction(
    transactionId: string,
    revenue: number,
    currency: string = 'CHF',
    items: any[] = [],
    properties: Record<string, any> = {}
  ): Promise<void> {
    const transactionProperties = {
      ...properties,
      transactionId,
      revenue,
      currency,
      items,
      itemCount: items.length
    };
    
    await this.track('transaction_completed', transactionProperties, {
      type: EventType.TRANSACTION,
      category: EventCategory.COMMERCE,
      priority: EventPriority.HIGH
    });
  }

  /**
   * Track error
   */
  async trackError(
    error: Error | string,
    context: Record<string, any> = {}
  ): Promise<void> {
    const errorProperties = {
      ...context,
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    };
    
    await this.track('error_occurred', errorProperties, {
      type: EventType.ERROR,
      category: EventCategory.SYSTEM,
      priority: EventPriority.CRITICAL
    });
  }

  /**
   * Create event object
   */
  private async createEvent(
    eventName: string,
    properties: Record<string, any>,
    options: any
  ): Promise<AnalyticsEvent> {
    const eventId = this.generateEventId();
    const timestamp = Date.now();
    
    // Get context data
    const context = await this.buildEventContext();
    
    return {
      id: eventId,
      type: options.type || EventType.CUSTOM,
      category: options.category || EventCategory.INTERACTION,
      name: eventName,
      timestamp,
      sessionId: this.sessionManager.getSessionId(),
      userId: options.userId,
      tenantId: options.tenantId,
      properties,
      context,
      priority: options.priority || EventPriority.MEDIUM,
      metadata: {
        source: 'eatech-web',
        version: '3.0.0',
        environment: this.config.environment
      }
    };
  }

  /**
   * Build event context
   */
  private async buildEventContext(): Promise<EventContext> {
    return {
      page: {
        url: window.location.href,
        title: document.title,
        referrer: document.referrer,
        path: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash
      },
      user: {
        anonymousId: this.sessionManager.getAnonymousId(),
        consent: this.getConsentData()
      },
      device: this.deviceDetector.getDeviceInfo(),
      session: this.sessionManager.getSessionInfo()
    };
  }

  /**
   * Validate event
   */
  private async validateEvent(event: AnalyticsEvent): Promise<void> {
    try {
      const { default: EventValidator } = await eventValidator();
      const { default: SchemaValidator } = await schemaValidator();
      const { default: GDPRValidator } = await gdprValidator();
      
      // Basic validation
      EventValidator.validate(event);
      
      // Schema validation
      SchemaValidator.validateEventSchema(event);
      
      // GDPR compliance
      if (this.config.enablePrivacyMode) {
        GDPRValidator.validateCompliance(event);
      }
      
    } catch (error) {
      console.error('Event validation failed:', error);
      throw error;
    }
  }

  /**
   * Process event through pipeline
   */
  private async processEvent(event: AnalyticsEvent): Promise<AnalyticsEvent> {
    let processedEvent = { ...event };
    
    try {
      // Enrichment
      const enrichmentProcessor = this.processors.get('enrichment');
      if (enrichmentProcessor) {
        processedEvent = await enrichmentProcessor.process(processedEvent);
      }
      
      // Privacy processing
      const privacyProcessor = this.processors.get('privacy');
      if (privacyProcessor && this.config.enablePrivacyMode) {
        processedEvent = await privacyProcessor.process(processedEvent);
      }
      
      return processedEvent;
      
    } catch (error) {
      console.error('Event processing failed:', error);
      return event; // Return original event if processing fails
    }
  }

  /**
   * Add event to queue
   */
  private addToQueue(event: AnalyticsEvent): void {
    // Check memory limits
    if (this.eventQueue.length >= this.config.maxEventsInMemory) {
      // Remove oldest events
      this.eventQueue.splice(0, this.config.batchSize);
    }
    
    this.eventQueue.push(event);
    
    // Immediate processing for critical events
    if (event.priority === EventPriority.CRITICAL) {
      this.processCriticalEvent(event);
    }
    
    // Check if batch is ready
    if (this.eventQueue.length >= this.config.batchSize) {
      this.processBatch();
    }
  }

  /**
   * Start batch processing timer
   */
  private startBatchProcessing(): void {
    this.batchTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.processBatch();
      }
    }, this.config.batchTimeout);
  }

  /**
   * Process event batch
   */
  private async processBatch(): Promise<void> {
    if (this.eventQueue.length === 0) return;
    
    const batchProcessor = this.processors.get('batch');
    if (!batchProcessor) return;
    
    try {
      const batch = this.eventQueue.splice(0, this.config.batchSize);
      
      if (this.isOnline) {
        // Send to server
        await batchProcessor.processBatch(batch);
        this.emit('batch_sent', { eventCount: batch.length });
      } else if (this.storage) {
        // Store offline
        await this.storage.storeBatch(batch);
        this.emit('batch_stored_offline', { eventCount: batch.length });
      }
      
    } catch (error) {
      console.error('Batch processing failed:', error);
      this.emit('batch_failed', { error });
    }
  }

  /**
   * Process critical event immediately
   */
  private async processCriticalEvent(event: AnalyticsEvent): Promise<void> {
    try {
      if (this.isOnline && this.config.enableRealtime) {
        const realtimeProcessor = this.processors.get('realtime');
        if (realtimeProcessor) {
          await realtimeProcessor.sendEvent(event);
        }
      } else if (this.storage) {
        await this.storage.storeEvent(event);
      }
    } catch (error) {
      console.error('Critical event processing failed:', error);
    }
  }

  /**
   * Load offline events
   */
  private async loadOfflineEvents(): Promise<void> {
    if (!this.storage) return;
    
    try {
      const offlineEvents = await this.storage.getOfflineEvents();
      if (offlineEvents.length > 0) {
        this.eventQueue.unshift(...offlineEvents);
        await this.storage.clearOfflineEvents();
        console.log(`Loaded ${offlineEvents.length} offline events`);
      }
    } catch (error) {
      console.error('Error loading offline events:', error);
    }
  }

  /**
   * Process offline events when back online
   */
  private async processOfflineEvents(): Promise<void> {
    if (this.eventQueue.length > 0) {
      this.processBatch();
    }
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.track('page_hidden');
        this.flush(); // Send remaining events
      } else {
        this.track('page_visible');
      }
    });
    
    // Before unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
    
    // Error tracking
    window.addEventListener('error', (event) => {
      this.trackError(event.error || event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });
    
    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(event.reason, {
        type: 'unhandled_promise_rejection'
      });
    });
  }

  /**
   * Flush all pending events
   */
  async flush(): Promise<void> {
    if (this.eventQueue.length > 0) {
      await this.processBatch();
    }
  }

  /**
   * Get consent data
   */
  private getConsentData(): ConsentData {
    // This would integrate with your consent management platform
    return {
      analytics: true,
      marketing: false,
      functional: true,
      timestamp: Date.now(),
      version: '1.0'
    };
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize config for tracking
   */
  private sanitizeConfig(): any {
    const { apiKey, ...safeConfig } = this.config;
    return safeConfig;
  }

  /**
   * Destroy collector
   */
  destroy(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    
    this.flush();
    this.removeAllListeners();
    this.isInitialized = false;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create and initialize event collector
 */
export const createEventCollector = async (config: Partial<CollectorConfig> = {}): Promise<EventCollector> => {
  const collector = new EventCollector(config);
  await collector.initialize();
  return collector;
};

// ============================================================================
// EXPORTS
// ============================================================================

export default EventCollector;
export { EventType, EventCategory, EventPriority };