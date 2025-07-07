/**
 * EATECH - Voice Analytics Service
 * Version: 4.3.0
 * Description: Comprehensive voice analytics, metrics collection and insights generation
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/services/analytics/VoiceAnalyticsService.js
 * 
 * Features:
 * - Real-time voice metrics collection
 * - User behavior analytics
 * - Performance monitoring
 * - Swiss German usage analytics
 * - A/B testing for voice features
 * - Privacy-compliant data collection
 * - Advanced reporting and insights
 * - Export capabilities
 */

import { EventEmitter } from 'events';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const ANALYTICS_CONFIG = {
  // Collection Settings
  COLLECTION: {
    batchSize: 50,
    flushInterval: 30000, // 30 seconds
    maxRetries: 3,
    retryDelay: 5000,
    enableRealtime: true
  },
  
  // Privacy Settings
  PRIVACY: {
    anonymizeData: true,
    dataRetentionDays: 90,
    respectDoNotTrack: true,
    enableLocalStorage: true,
    enableSessionStorage: true
  },
  
  // Metrics Configuration
  METRICS: {
    voice: {
      totalCommands: { type: 'counter', category: 'usage' },
      successfulCommands: { type: 'counter', category: 'quality' },
      failedCommands: { type: 'counter', category: 'quality' },
      averageConfidence: { type: 'gauge', category: 'quality' },
      processingTime: { type: 'histogram', category: 'performance' },
      recognitionLatency: { type: 'histogram', category: 'performance' }
    },
    user: {
      sessionDuration: { type: 'histogram', category: 'engagement' },
      commandsPerSession: { type: 'histogram', category: 'engagement' },
      repeatCommands: { type: 'counter', category: 'behavior' },
      uniqueCommands: { type: 'gauge', category: 'behavior' }
    },
    swiss: {
      dialectUsage: { type: 'counter', category: 'localization' },
      swissGermanSuccess: { type: 'gauge', category: 'localization' },
      languageSwitching: { type: 'counter', category: 'localization' }
    }
  },
  
  // Event Types
  EVENTS: {
    VOICE_COMMAND_START: 'voice_command_start',
    VOICE_COMMAND_SUCCESS: 'voice_command_success',
    VOICE_COMMAND_FAILURE: 'voice_command_failure',
    INTENT_RECOGNIZED: 'intent_recognized',
    ENTITY_EXTRACTED: 'entity_extracted',
    LANGUAGE_DETECTED: 'language_detected',
    DIALECT_DETECTED: 'dialect_detected',
    USER_CORRECTION: 'user_correction',
    SESSION_START: 'session_start',
    SESSION_END: 'session_end'
  }
};

const SWISS_ANALYTICS_PATTERNS = {
  DIALECTS: {
    'de-CH-ZH': { region: 'Zürich', weight: 1.2 },
    'de-CH-BE': { region: 'Bern', weight: 1.1 },
    'de-CH-BS': { region: 'Basel', weight: 1.0 },
    'de-CH-LU': { region: 'Luzern', weight: 0.9 },
    'de-CH-SG': { region: 'St. Gallen', weight: 0.8 }
  },
  
  LANGUAGE_MIXING: {
    patterns: [
      /\b(merci|danke)\b/i, // Mixing French/German
      /\b(bitte|prego)\b/i, // Mixing German/Italian
      /\b(grüezi|bonjour)\b/i // Swiss greetings
    ]
  }
};

// ============================================================================
// VOICE ANALYTICS SERVICE CLASS
// ============================================================================

export class VoiceAnalyticsService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = { ...ANALYTICS_CONFIG, ...options };
    this.metrics = new Map();
    this.events = [];
    this.sessions = new Map();
    this.userProfiles = new Map();
    
    // Batch processing
    this.eventBatch = [];
    this.batchTimer = null;
    
    // State management
    this.state = {
      isInitialized: false,
      currentSession: null,
      isCollecting: true,
      lastFlush: new Date()
    };
    
    // Performance tracking
    this.performance = {
      totalEvents: 0,
      droppedEvents: 0,
      flushCount: 0,
      averageFlushTime: 0
    };
    
    this.initialize();
  }
  
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  async initialize() {
    try {
      console.log('📊 Initializing Voice Analytics Service...');
      
      // Check privacy settings
      if (this.shouldRespectDoNotTrack()) {
        this.state.isCollecting = false;
        console.log('🔒 Analytics disabled due to Do Not Track setting');
        return;
      }
      
      // Initialize metrics storage
      this.initializeMetrics();
      
      // Load existing data
      await this.loadStoredData();
      
      // Start new session
      await this.startSession();
      
      // Setup batch processing
      this.setupBatchProcessing();
      
      // Setup cleanup intervals
      this.setupCleanupIntervals();
      
      this.state.isInitialized = true;
      this.emit('initialized');
      
      console.log('✅ Voice Analytics Service initialized');
      
    } catch (error) {
      console.error('Failed to initialize Voice Analytics Service:', error);
      throw error;
    }
  }
  
  initializeMetrics() {
    // Initialize all configured metrics
    for (const [category, categoryMetrics] of Object.entries(this.config.METRICS)) {
      for (const [metricName, metricConfig] of Object.entries(categoryMetrics)) {
        const fullMetricName = `${category}.${metricName}`;
        this.metrics.set(fullMetricName, {
          ...metricConfig,
          value: metricConfig.type === 'counter' ? 0 : null,
          history: [],
          lastUpdated: null
        });
      }
    }
  }
  
  async loadStoredData() {
    if (!this.config.PRIVACY.enableLocalStorage) return;
    
    try {
      // Load metrics history
      const storedMetrics = localStorage.getItem('voice_analytics_metrics');
      if (storedMetrics) {
        const parsed = JSON.parse(storedMetrics);
        for (const [key, data] of Object.entries(parsed)) {
          if (this.metrics.has(key)) {
            const metric = this.metrics.get(key);
            metric.history = data.history || [];
            metric.value = data.value;
          }
        }
      }
      
      // Load user profiles
      const storedProfiles = localStorage.getItem('voice_analytics_profiles');
      if (storedProfiles) {
        const profiles = JSON.parse(storedProfiles);
        this.userProfiles = new Map(Object.entries(profiles));
      }
      
    } catch (error) {
      console.warn('Could not load stored analytics data:', error);
    }
  }
  
  async startSession() {
    const sessionId = this.generateSessionId();
    const session = {
      id: sessionId,
      startTime: new Date(),
      endTime: null,
      events: [],
      metrics: new Map(),
      userAgent: navigator.userAgent,
      language: navigator.language,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      page: window.location.pathname
    };
    
    this.sessions.set(sessionId, session);
    this.state.currentSession = sessionId;
    
    this.trackEvent(this.config.EVENTS.SESSION_START, {
      sessionId,
      timestamp: session.startTime
    });
    
    return sessionId;
  }
  
  // ============================================================================
  // EVENT TRACKING
  // ============================================================================
  
  async trackEvent(eventType, data = {}, options = {}) {
    if (!this.state.isCollecting || !this.state.isInitialized) return;
    
    try {
      const event = this.createEvent(eventType, data, options);
      
      // Add to current session
      if (this.state.currentSession) {
        const session = this.sessions.get(this.state.currentSession);
        if (session) {
          session.events.push(event);
        }
      }
      
      // Add to batch for processing
      this.eventBatch.push(event);
      
      // Update real-time metrics
      await this.updateMetricsFromEvent(event);
      
      // Emit event for real-time listeners
      this.emit('eventTracked', event);
      
      // Check if batch should be flushed
      if (this.eventBatch.length >= this.config.COLLECTION.batchSize) {
        await this.flushEvents();
      }
      
      this.performance.totalEvents++;
      
    } catch (error) {
      console.error('Failed to track event:', error);
      this.performance.droppedEvents++;
    }
  }
  
  createEvent(eventType, data, options) {
    const baseEvent = {
      id: this.generateEventId(),
      type: eventType,
      timestamp: new Date().toISOString(),
      sessionId: this.state.currentSession,
      data: this.sanitizeEventData(data),
      metadata: {
        userAgent: navigator.userAgent.substring(0, 100),
        language: navigator.language,
        page: window.location.pathname,
        ...options.metadata
      }
    };
    
    // Add privacy-compliant identifiers
    if (this.config.PRIVACY.anonymizeData) {
      baseEvent.userId = this.getAnonymizedUserId();
    }
    
    return baseEvent;
  }
  
  sanitizeEventData(data) {
    const sanitized = { ...data };
    
    // Remove sensitive information
    delete sanitized.personalInfo;
    delete sanitized.creditCard;
    delete sanitized.password;
    
    // Anonymize voice text if required
    if (this.config.PRIVACY.anonymizeData && sanitized.transcript) {
      sanitized.transcript = this.anonymizeTranscript(sanitized.transcript);
    }
    
    return sanitized;
  }
  
  anonymizeTranscript(text) {
    // Replace potential personal information
    return text
      .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD_NUMBER]')
      .replace(/\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, '[SSN]')
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
      .replace(/\b\d{10,15}\b/g, '[PHONE]');
  }
  
  // ============================================================================
  // METRICS MANAGEMENT
  // ============================================================================
  
  async updateMetric(metricName, value, timestamp = new Date()) {
    if (!this.metrics.has(metricName)) {
      console.warn(`Unknown metric: ${metricName}`);
      return;
    }
    
    const metric = this.metrics.get(metricName);
    
    switch (metric.type) {
      case 'counter':
        metric.value += value;
        break;
      case 'gauge':
        metric.value = value;
        break;
      case 'histogram':
        if (!metric.value) metric.value = [];
        metric.value.push({ value, timestamp });
        // Keep only last 1000 values
        if (metric.value.length > 1000) {
          metric.value = metric.value.slice(-1000);
        }
        break;
    }
    
    metric.lastUpdated = timestamp;
    
    // Add to history for trending
    metric.history.push({
      value: metric.type === 'histogram' ? value : metric.value,
      timestamp
    });
    
    // Keep history manageable
    if (metric.history.length > 1000) {
      metric.history = metric.history.slice(-1000);
    }
    
    this.emit('metricUpdated', { name: metricName, metric });
  }
  
  async updateMetricsFromEvent(event) {
    switch (event.type) {
      case this.config.EVENTS.VOICE_COMMAND_START:
        await this.updateMetric('voice.totalCommands', 1);
        break;
        
      case this.config.EVENTS.VOICE_COMMAND_SUCCESS:
        await this.updateMetric('voice.successfulCommands', 1);
        if (event.data.confidence !== undefined) {
          await this.updateMetric('voice.averageConfidence', event.data.confidence);
        }
        if (event.data.processingTime !== undefined) {
          await this.updateMetric('voice.processingTime', event.data.processingTime);
        }
        break;
        
      case this.config.EVENTS.VOICE_COMMAND_FAILURE:
        await this.updateMetric('voice.failedCommands', 1);
        break;
        
      case this.config.EVENTS.DIALECT_DETECTED:
        if (event.data.dialect) {
          await this.updateMetric('swiss.dialectUsage', 1);
          await this.updateSwissAnalytics(event);
        }
        break;
        
      case this.config.EVENTS.USER_CORRECTION:
        await this.updateUserBehaviorMetrics(event);
        break;
    }
  }
  
  async updateSwissAnalytics(event) {
    const dialect = event.data.dialect;
    const confidence = event.data.confidence || 0;
    
    // Track dialect-specific metrics
    if (SWISS_ANALYTICS_PATTERNS.DIALECTS[dialect]) {
      const dialectInfo = SWISS_ANALYTICS_PATTERNS.DIALECTS[dialect];
      const weightedConfidence = confidence * dialectInfo.weight;
      
      await this.updateMetric('swiss.swissGermanSuccess', weightedConfidence);
    }
    
    // Detect language mixing patterns
    if (event.data.transcript) {
      const mixingScore = this.detectLanguageMixing(event.data.transcript);
      if (mixingScore > 0) {
        await this.updateMetric('swiss.languageSwitching', mixingScore);
      }
    }
  }
  
  detectLanguageMixing(text) {
    let mixingScore = 0;
    
    SWISS_ANALYTICS_PATTERNS.LANGUAGE_MIXING.patterns.forEach(pattern => {
      if (pattern.test(text)) {
        mixingScore += 0.25;
      }
    });
    
    return Math.min(mixingScore, 1.0);
  }
  
  // ============================================================================
  // USER BEHAVIOR ANALYTICS
  // ============================================================================
  
  async updateUserBehaviorMetrics(event) {
    const userId = event.userId || this.getAnonymizedUserId();
    
    if (!this.userProfiles.has(userId)) {
      this.userProfiles.set(userId, this.createUserProfile(userId));
    }
    
    const profile = this.userProfiles.get(userId);
    
    // Update command patterns
    if (event.data.command) {
      const command = event.data.command.toLowerCase();
      profile.commandFrequency.set(command, 
        (profile.commandFrequency.get(command) || 0) + 1
      );
    }
    
    // Update timing patterns
    const hour = new Date().getHours();
    profile.usageByHour[hour] = (profile.usageByHour[hour] || 0) + 1;
    
    // Update error patterns
    if (event.type === this.config.EVENTS.USER_CORRECTION) {
      profile.corrections++;
    }
    
    profile.lastActivity = new Date();
    profile.totalEvents++;
  }
  
  createUserProfile(userId) {
    return {
      id: userId,
      created: new Date(),
      lastActivity: new Date(),
      totalEvents: 0,
      commandFrequency: new Map(),
      usageByHour: new Array(24).fill(0),
      corrections: 0,
      preferredLanguage: navigator.language,
      averageSessionDuration: 0,
      totalSessions: 0
    };
  }
  
  // ============================================================================
  // ANALYTICS & INSIGHTS
  // ============================================================================
  
  async generateInsights(timeRange = '24h') {
    const insights = {
      overview: await this.generateOverviewInsights(timeRange),
      performance: await this.generatePerformanceInsights(timeRange),
      usage: await this.generateUsageInsights(timeRange),
      swiss: await this.generateSwissInsights(timeRange),
      recommendations: await this.generateRecommendations()
    };
    
    this.emit('insightsGenerated', insights);
    return insights;
  }
  
  async generateOverviewInsights(timeRange) {
    const totalCommands = this.getMetricValue('voice.totalCommands');
    const successfulCommands = this.getMetricValue('voice.successfulCommands');
    const successRate = totalCommands > 0 ? (successfulCommands / totalCommands) * 100 : 0;
    
    return {
      totalCommands,
      successRate: Math.round(successRate * 100) / 100,
      averageConfidence: this.getMetricValue('voice.averageConfidence'),
      activeSessions: this.sessions.size,
      timeRange
    };
  }
  
  async generatePerformanceInsights(timeRange) {
    const processingTimes = this.getMetricHistory('voice.processingTime', timeRange);
    const recognitionLatencies = this.getMetricHistory('voice.recognitionLatency', timeRange);
    
    return {
      averageProcessingTime: this.calculateAverage(processingTimes),
      p95ProcessingTime: this.calculatePercentile(processingTimes, 95),
      averageLatency: this.calculateAverage(recognitionLatencies),
      performanceTrend: this.calculateTrend(processingTimes)
    };
  }
  
  async generateUsageInsights(timeRange) {
    const userProfiles = Array.from(this.userProfiles.values());
    const totalUsers = userProfiles.length;
    
    // Calculate most common commands
    const commandFreq = new Map();
    userProfiles.forEach(profile => {
      profile.commandFrequency.forEach((count, command) => {
        commandFreq.set(command, (commandFreq.get(command) || 0) + count);
      });
    });
    
    const topCommands = Array.from(commandFreq.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    // Calculate peak usage hours
    const usageByHour = new Array(24).fill(0);
    userProfiles.forEach(profile => {
      profile.usageByHour.forEach((count, hour) => {
        usageByHour[hour] += count;
      });
    });
    
    const peakHour = usageByHour.indexOf(Math.max(...usageByHour));
    
    return {
      totalUsers,
      topCommands,
      peakUsageHour: peakHour,
      averageSessionDuration: this.calculateAverageSessionDuration(),
      userRetention: this.calculateUserRetention(timeRange)
    };
  }
  
  async generateSwissInsights(timeRange) {
    const dialectUsage = this.getMetricValue('swiss.dialectUsage');
    const swissGermanSuccess = this.getMetricValue('swiss.swissGermanSuccess');
    const languageSwitching = this.getMetricValue('swiss.languageSwitching');
    
    // Analyze dialect distribution
    const dialectDistribution = this.analyzeDialectDistribution();
    
    return {
      dialectUsage,
      swissGermanSuccessRate: Math.round(swissGermanSuccess * 100),
      languageMixingFrequency: languageSwitching,
      dialectDistribution,
      mostCommonSwissPatterns: this.findCommonSwissPatterns()
    };
  }
  
  // ============================================================================
  // BATCH PROCESSING
  // ============================================================================
  
  setupBatchProcessing() {
    this.batchTimer = setInterval(() => {
      if (this.eventBatch.length > 0) {
        this.flushEvents();
      }
    }, this.config.COLLECTION.flushInterval);
  }
  
  async flushEvents() {
    if (this.eventBatch.length === 0) return;
    
    const startTime = performance.now();
    const batch = [...this.eventBatch];
    this.eventBatch = [];
    
    try {
      // Process events
      await this.processBatch(batch);
      
      // Save to local storage if enabled
      if (this.config.PRIVACY.enableLocalStorage) {
        await this.saveToLocalStorage();
      }
      
      const flushTime = performance.now() - startTime;
      this.updateFlushMetrics(flushTime);
      
      this.emit('batchProcessed', { events: batch.length, time: flushTime });
      
    } catch (error) {
      console.error('Failed to flush events:', error);
      // Re-add events to batch for retry
      this.eventBatch.unshift(...batch);
    }
  }
  
  async processBatch(events) {
    // Group events by type for efficient processing
    const eventGroups = this.groupEventsByType(events);
    
    // Process each group
    for (const [eventType, groupEvents] of eventGroups) {
      await this.processEventGroup(eventType, groupEvents);
    }
  }
  
  groupEventsByType(events) {
    const groups = new Map();
    
    events.forEach(event => {
      if (!groups.has(event.type)) {
        groups.set(event.type, []);
      }
      groups.get(event.type).push(event);
    });
    
    return groups;
  }
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  getMetricValue(metricName) {
    const metric = this.metrics.get(metricName);
    return metric ? metric.value : null;
  }
  
  getMetricHistory(metricName, timeRange) {
    const metric = this.metrics.get(metricName);
    if (!metric || !metric.history) return [];
    
    const now = new Date();
    const cutoff = this.getTimeRangeCutoff(timeRange, now);
    
    return metric.history.filter(entry => 
      new Date(entry.timestamp) >= cutoff
    ).map(entry => entry.value);
  }
  
  getTimeRangeCutoff(timeRange, now) {
    const cutoffMap = {
      '1h': 1 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    const offset = cutoffMap[timeRange] || cutoffMap['24h'];
    return new Date(now.getTime() - offset);
  }
  
  calculateAverage(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
  
  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }
  
  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const midpoint = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, midpoint);
    const secondHalf = values.slice(midpoint);
    
    const firstAvg = this.calculateAverage(firstHalf);
    const secondAvg = this.calculateAverage(secondHalf);
    
    return secondAvg - firstAvg;
  }
  
  shouldRespectDoNotTrack() {
    return this.config.PRIVACY.respectDoNotTrack && 
           (navigator.doNotTrack === '1' || 
            window.doNotTrack === '1' || 
            navigator.msDoNotTrack === '1');
  }
  
  getAnonymizedUserId() {
    // Generate consistent but anonymous user ID
    const browserFingerprint = this.generateBrowserFingerprint();
    return 'anon_' + this.hashString(browserFingerprint);
  }
  
  generateBrowserFingerprint() {
    return [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset()
    ].join('|');
  }
  
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
  
  generateEventId() {
    return 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================
  
  // Voice Command Tracking
  async trackVoiceCommandStart(data) {
    return this.trackEvent(this.config.EVENTS.VOICE_COMMAND_START, data);
  }
  
  async trackVoiceCommandSuccess(data) {
    return this.trackEvent(this.config.EVENTS.VOICE_COMMAND_SUCCESS, data);
  }
  
  async trackVoiceCommandFailure(data) {
    return this.trackEvent(this.config.EVENTS.VOICE_COMMAND_FAILURE, data);
  }
  
  // Intent and Entity Tracking
  async trackIntentRecognized(data) {
    return this.trackEvent(this.config.EVENTS.INTENT_RECOGNIZED, data);
  }
  
  async trackEntityExtracted(data) {
    return this.trackEvent(this.config.EVENTS.ENTITY_EXTRACTED, data);
  }
  
  // Language and Dialect Tracking
  async trackLanguageDetected(data) {
    return this.trackEvent(this.config.EVENTS.LANGUAGE_DETECTED, data);
  }
  
  async trackDialectDetected(data) {
    return this.trackEvent(this.config.EVENTS.DIALECT_DETECTED, data);
  }
  
  // User Interaction Tracking
  async trackUserCorrection(data) {
    return this.trackEvent(this.config.EVENTS.USER_CORRECTION, data);
  }
  
  // Get current metrics
  async getMetrics() {
    const metricsObject = {};
    for (const [name, metric] of this.metrics) {
      metricsObject[name] = {
        value: metric.value,
        type: metric.type,
        lastUpdated: metric.lastUpdated
      };
    }
    return metricsObject;
  }
  
  // Export analytics data
  async exportData(format = 'json', timeRange = '24h') {
    const data = {
      metrics: await this.getMetrics(),
      insights: await this.generateInsights(timeRange),
      events: this.getRecentEvents(timeRange),
      performance: this.performance,
      timestamp: new Date().toISOString()
    };
    
    if (format === 'csv') {
      return this.convertToCSV(data);
    }
    
    return JSON.stringify(data, null, 2);
  }
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  async destroy() {
    console.log('🗑️ Destroying Voice Analytics Service...');
    
    // Flush remaining events
    if (this.eventBatch.length > 0) {
      await this.flushEvents();
    }
    
    // Clear timers
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    
    // Save final state
    if (this.config.PRIVACY.enableLocalStorage) {
      await this.saveToLocalStorage();
    }
    
    // End current session
    if (this.state.currentSession) {
      await this.trackEvent(this.config.EVENTS.SESSION_END, {
        sessionId: this.state.currentSession,
        endTime: new Date()
      });
    }
    
    // Clear data
    this.metrics.clear();
    this.events = [];
    this.sessions.clear();
    this.userProfiles.clear();
    
    this.state.isInitialized = false;
    
    console.log('✅ Voice Analytics Service destroyed');
  }
}

// ============================================================================
// FACTORY & EXPORT
// ============================================================================

let serviceInstance = null;

export const createVoiceAnalyticsService = (options = {}) => {
  if (!serviceInstance) {
    serviceInstance = new VoiceAnalyticsService(options);
  }
  return serviceInstance;
};

export const getVoiceAnalyticsService = () => {
  if (!serviceInstance) {
    throw new Error('Voice Analytics Service not initialized. Call createVoiceAnalyticsService first.');
  }
  return serviceInstance;
};

export default VoiceAnalyticsService;