/**
 * EATECH - Context Aware Service
 * Version: 4.1.0
 * Description: Advanced context management for voice commands with Swiss restaurant context
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/services/ai/ContextAwareService.js
 * 
 * Features:
 * - Multi-layered context management
 * - Swiss restaurant domain knowledge
 * - User behavior learning
 * - Temporal context tracking
 * - Location-aware processing
 * - Session continuity
 * - Context prediction
 * - Performance optimization
 */

import { EventEmitter } from 'events';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONTEXT_CONFIG = {
  // Context Layers
  LAYERS: {
    GLOBAL: 0,      // Application-wide context
    SESSION: 1,     // User session context  
    PAGE: 2,        // Current page context
    TASK: 3,        // Current task context
    IMMEDIATE: 4    // Immediate interaction context
  },
  
  // Context Types
  TYPES: {
    USER: 'user',
    LOCATION: 'location', 
    TEMPORAL: 'temporal',
    BUSINESS: 'business',
    SYSTEM: 'system',
    INTERACTION: 'interaction'
  },
  
  // Swiss Context Specifics
  SWISS_CONTEXT: {
    LANGUAGES: ['de-CH', 'fr-CH', 'it-CH', 'en-US'],
    DIALECTS: {
      'de-CH-ZH': 'Zürich',
      'de-CH-BE': 'Bern', 
      'de-CH-BS': 'Basel',
      'de-CH-LU': 'Luzern',
      'de-CH-SG': 'St. Gallen'
    },
    BUSINESS_HOURS: {
      weekday: { open: '11:00', close: '23:00' },
      weekend: { open: '10:00', close: '24:00' }
    },
    MEAL_TIMES: {
      breakfast: { start: '06:00', end: '11:00' },
      lunch: { start: '11:00', end: '14:00' },
      dinner: { start: '17:00', end: '22:00' },
      late_night: { start: '22:00', end: '02:00' }
    }
  },
  
  // Performance Settings
  MAX_CONTEXT_HISTORY: 100,
  CONTEXT_TTL: 3600000, // 1 hour
  PREDICTION_THRESHOLD: 0.7,
  LEARNING_RATE: 0.1
};

const CONTEXT_PATTERNS = {
  // Restaurant Domain Patterns
  ORDERING: {
    triggers: ['bestell', 'order', 'hätt gern', 'möcht', 'nimm'],
    context_boost: ['menu', 'product', 'cart'],
    confidence: 0.9
  },
  
  NAVIGATION: {
    triggers: ['zeig', 'gah', 'öffne', 'wechsle'],
    context_boost: ['page', 'section', 'menu'],
    confidence: 0.8
  },
  
  INQUIRY: {
    triggers: ['was', 'wie', 'wann', 'wo', 'warum'],
    context_boost: ['information', 'help', 'details'],
    confidence: 0.7
  },
  
  MODIFICATION: {
    triggers: ['änder', 'entfern', 'add', 'ohne', 'mit'],
    context_boost: ['cart', 'order', 'customization'],
    confidence: 0.85
  }
};

// ============================================================================
// CONTEXT AWARE SERVICE CLASS  
// ============================================================================

export class ContextAwareService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = { ...CONTEXT_CONFIG, ...options };
    this.contextStack = new Map();
    this.contextHistory = [];
    this.userProfile = null;
    this.sessionData = new Map();
    this.predictions = new Map();
    
    // Performance metrics
    this.metrics = {
      totalContextUpdates: 0,
      averageProcessingTime: 0,
      predictionAccuracy: 0,
      cacheHitRate: 0
    };
    
    // State management
    this.state = {
      isInitialized: false,
      currentSession: null,
      lastActivity: null,
      activeContexts: new Set()
    };
    
    this.initialize();
  }
  
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  async initialize() {
    try {
      console.log('🧠 Initializing Context Aware Service...');
      
      // Load user profile from storage
      await this.loadUserProfile();
      
      // Initialize session context
      await this.initializeSession();
      
      // Load context patterns
      await this.loadContextPatterns();
      
      // Start context monitoring
      this.startContextMonitoring();
      
      this.state.isInitialized = true;
      this.emit('initialized');
      
      console.log('✅ Context Aware Service initialized');
      
    } catch (error) {
      console.error('Failed to initialize Context Aware Service:', error);
      throw error;
    }
  }
  
  async loadUserProfile() {
    try {
      const savedProfile = localStorage.getItem('context_user_profile');
      if (savedProfile) {
        this.userProfile = JSON.parse(savedProfile);
      } else {
        this.userProfile = this.createDefaultUserProfile();
      }
    } catch (error) {
      console.warn('Could not load user profile:', error);
      this.userProfile = this.createDefaultUserProfile();
    }
  }
  
  createDefaultUserProfile() {
    return {
      id: this.generateUserId(),
      preferences: {
        language: 'de-CH',
        dialect: null,
        currency: 'CHF',
        location: null
      },
      behavior: {
        averageOrderValue: 0,
        favoriteCategories: [],
        orderingPatterns: {},
        sessionDuration: 0,
        preferredTimes: []
      },
      context: {
        lastVisitedPages: [],
        recentCommands: [],
        frequentActions: new Map(),
        learningData: {}
      },
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
  }
  
  async initializeSession() {
    const sessionId = this.generateSessionId();
    this.state.currentSession = sessionId;
    
    this.sessionData.set(sessionId, {
      id: sessionId,
      startTime: new Date(),
      contexts: [],
      interactions: [],
      currentPage: window.location.pathname,
      userAgent: navigator.userAgent,
      language: navigator.language,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  }
  
  // ============================================================================
  // CONTEXT MANAGEMENT
  // ============================================================================
  
  async addContext(type, data, layer = this.config.LAYERS.IMMEDIATE) {
    const startTime = performance.now();
    
    try {
      const contextId = this.generateContextId();
      const timestamp = new Date();
      
      const context = {
        id: contextId,
        type,
        layer,
        data,
        timestamp,
        ttl: timestamp.getTime() + this.config.CONTEXT_TTL,
        source: this.getContextSource(),
        confidence: 1.0,
        active: true
      };
      
      // Add to context stack
      this.contextStack.set(contextId, context);
      
      // Add to history
      this.contextHistory.push(context);
      if (this.contextHistory.length > this.config.MAX_CONTEXT_HISTORY) {
        this.contextHistory.shift();
      }
      
      // Update session data
      this.updateSessionContext(context);
      
      // Trigger context analysis
      await this.analyzeContextChange(context);
      
      // Clean expired contexts
      this.cleanExpiredContexts();
      
      // Update metrics
      const processingTime = performance.now() - startTime;
      this.updateMetrics(processingTime);
      
      this.emit('contextAdded', context);
      
      return contextId;
      
    } catch (error) {
      console.error('Failed to add context:', error);
      throw error;
    }
  }
  
  async getContext(filters = {}) {
    const filteredContexts = Array.from(this.contextStack.values())
      .filter(context => {
        // Apply filters
        if (filters.type && context.type !== filters.type) return false;
        if (filters.layer !== undefined && context.layer !== filters.layer) return false;
        if (filters.active !== undefined && context.active !== filters.active) return false;
        if (filters.minConfidence && context.confidence < filters.minConfidence) return false;
        
        // Check TTL
        if (Date.now() > context.ttl) return false;
        
        return true;
      })
      .sort((a, b) => {
        // Sort by layer (higher layer = more specific)
        if (a.layer !== b.layer) return b.layer - a.layer;
        // Then by timestamp (newer first)
        return b.timestamp.getTime() - a.timestamp.getTime();
      });
    
    return filteredContexts;
  }
  
  async getCurrentContext() {
    const contexts = await this.getContext({ active: true });
    
    return {
      immediate: contexts.filter(c => c.layer === this.config.LAYERS.IMMEDIATE),
      task: contexts.filter(c => c.layer === this.config.LAYERS.TASK),
      page: contexts.filter(c => c.layer === this.config.LAYERS.PAGE),
      session: contexts.filter(c => c.layer === this.config.LAYERS.SESSION),
      global: contexts.filter(c => c.layer === this.config.LAYERS.GLOBAL)
    };
  }
  
  // ============================================================================
  // CONTEXT ANALYSIS
  // ============================================================================
  
  async analyzeContextChange(newContext) {
    try {
      // Detect context patterns
      const patterns = await this.detectContextPatterns(newContext);
      
      // Update user behavior model
      await this.updateUserBehavior(newContext, patterns);
      
      // Generate context predictions
      const predictions = await this.generateContextPredictions(newContext);
      
      // Store predictions
      this.predictions.set(newContext.id, predictions);
      
      // Trigger pattern-based actions
      await this.triggerContextActions(newContext, patterns);
      
    } catch (error) {
      console.error('Context analysis failed:', error);
    }
  }
  
  async detectContextPatterns(context) {
    const patterns = [];
    
    // Check against known patterns
    for (const [patternName, patternConfig] of Object.entries(CONTEXT_PATTERNS)) {
      const confidence = await this.matchContextPattern(context, patternConfig);
      
      if (confidence > patternConfig.confidence) {
        patterns.push({
          name: patternName,
          confidence,
          context: patternConfig.context_boost,
          triggers: patternConfig.triggers
        });
      }
    }
    
    // Detect temporal patterns
    const temporalPattern = await this.detectTemporalPattern(context);
    if (temporalPattern) {
      patterns.push(temporalPattern);
    }
    
    // Detect sequential patterns
    const sequentialPattern = await this.detectSequentialPattern(context);
    if (sequentialPattern) {
      patterns.push(sequentialPattern);
    }
    
    return patterns;
  }
  
  async matchContextPattern(context, patternConfig) {
    let confidence = 0;
    
    // Check context data against pattern triggers
    const contextText = JSON.stringify(context.data).toLowerCase();
    
    patternConfig.triggers.forEach(trigger => {
      if (contextText.includes(trigger.toLowerCase())) {
        confidence += 0.3;
      }
    });
    
    // Check recent context history for pattern reinforcement
    const recentContexts = this.contextHistory.slice(-5);
    const contextBoostCount = recentContexts.filter(c => {
      const cText = JSON.stringify(c.data).toLowerCase();
      return patternConfig.context_boost.some(boost => 
        cText.includes(boost.toLowerCase())
      );
    }).length;
    
    confidence += (contextBoostCount / 5) * 0.4;
    
    // Swiss context adjustments
    if (this.isSwissContext(context)) {
      confidence = this.adjustForSwissContext(confidence, context);
    }
    
    return Math.min(confidence, 1.0);
  }
  
  async detectTemporalPattern(context) {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    // Detect meal time context
    for (const [mealTime, timeRange] of Object.entries(this.config.SWISS_CONTEXT.MEAL_TIMES)) {
      if (this.isTimeInRange(hour, timeRange)) {
        return {
          name: 'temporal_meal',
          confidence: 0.8,
          context: [mealTime],
          data: {
            mealTime,
            hour,
            day,
            isWeekend: day === 0 || day === 6
          }
        };
      }
    }
    
    return null;
  }
  
  async detectSequentialPattern(context) {
    if (this.contextHistory.length < 3) return null;
    
    const recentContexts = this.contextHistory.slice(-3);
    const contextTypes = recentContexts.map(c => c.type);
    
    // Common sequential patterns in restaurant ordering
    const sequentialPatterns = {
      'menu_browse_order': ['page', 'user', 'business'],
      'order_modify_confirm': ['business', 'interaction', 'business'],
      'browse_inquire_order': ['page', 'interaction', 'business']
    };
    
    for (const [patternName, expectedTypes] of Object.entries(sequentialPatterns)) {
      if (this.arraysMatch(contextTypes, expectedTypes)) {
        return {
          name: 'sequential_' + patternName,
          confidence: 0.85,
          context: [patternName],
          data: { sequence: contextTypes }
        };
      }
    }
    
    return null;
  }
  
  // ============================================================================
  // CONTEXT PREDICTION
  // ============================================================================
  
  async generateContextPredictions(currentContext) {
    const predictions = [];
    
    // Predict next likely contexts based on patterns
    const patterns = await this.getRelevantPatterns(currentContext);
    
    for (const pattern of patterns) {
      const prediction = await this.predictFromPattern(pattern, currentContext);
      if (prediction && prediction.confidence > this.config.PREDICTION_THRESHOLD) {
        predictions.push(prediction);
      }
    }
    
    // Predict based on user behavior
    const behaviorPrediction = await this.predictFromUserBehavior(currentContext);
    if (behaviorPrediction) {
      predictions.push(behaviorPrediction);
    }
    
    // Predict based on temporal context
    const temporalPrediction = await this.predictFromTemporalContext(currentContext);
    if (temporalPrediction) {
      predictions.push(temporalPrediction);
    }
    
    return predictions.sort((a, b) => b.confidence - a.confidence);
  }
  
  async predictFromPattern(pattern, currentContext) {
    // Predict next context based on pattern analysis
    const nextContextTypes = this.getNextContextFromPattern(pattern);
    
    if (nextContextTypes.length > 0) {
      return {
        type: 'pattern',
        confidence: pattern.confidence * 0.8,
        predictedContexts: nextContextTypes,
        reasoning: `Based on pattern: ${pattern.name}`,
        timeFrame: 'immediate'
      };
    }
    
    return null;
  }
  
  async predictFromUserBehavior(currentContext) {
    if (!this.userProfile.behavior.orderingPatterns) return null;
    
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();
    
    // Look for similar historical contexts
    const similarContexts = this.findSimilarHistoricalContexts(currentContext);
    
    if (similarContexts.length > 2) {
      const commonNextActions = this.analyzeCommonNextActions(similarContexts);
      
      return {
        type: 'behavior',
        confidence: 0.75,
        predictedActions: commonNextActions,
        reasoning: `Based on ${similarContexts.length} similar past interactions`,
        timeFrame: 'short'
      };
    }
    
    return null;
  }
  
  // ============================================================================
  // SWISS CONTEXT HANDLING
  // ============================================================================
  
  isSwissContext(context) {
    // Check if context indicates Swiss locale
    return (
      context.data?.language?.startsWith('de-CH') ||
      context.data?.language?.startsWith('fr-CH') ||
      context.data?.language?.startsWith('it-CH') ||
      context.data?.location?.country === 'CH' ||
      this.userProfile?.preferences?.language?.includes('-CH')
    );
  }
  
  adjustForSwissContext(confidence, context) {
    let adjusted = confidence;
    
    // Boost confidence for Swiss-specific patterns
    if (context.data?.dialect) {
      adjusted += 0.1;
    }
    
    // Check for Swiss German markers
    if (context.data?.text) {
      const swissMarkers = ['gaht', 'hätt', 'chönd', 'zäme', 'isch'];
      const markerCount = swissMarkers.filter(marker => 
        context.data.text.toLowerCase().includes(marker)
      ).length;
      
      adjusted += (markerCount / swissMarkers.length) * 0.15;
    }
    
    // Time-based adjustments for Swiss business hours
    const now = new Date();
    const isBusinessHours = this.isSwissBusinessHours(now);
    if (!isBusinessHours) {
      adjusted *= 0.9; // Slightly reduce confidence outside business hours
    }
    
    return Math.min(adjusted, 1.0);
  }
  
  isSwissBusinessHours(date) {
    const hour = date.getHours();
    const day = date.getDay();
    const isWeekend = day === 0 || day === 6;
    
    const hours = isWeekend ? 
      this.config.SWISS_CONTEXT.BUSINESS_HOURS.weekend :
      this.config.SWISS_CONTEXT.BUSINESS_HOURS.weekday;
    
    const openHour = parseInt(hours.open.split(':')[0]);
    const closeHour = parseInt(hours.close.split(':')[0]);
    
    return hour >= openHour && hour < closeHour;
  }
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  updateSessionContext(context) {
    const session = this.sessionData.get(this.state.currentSession);
    if (session) {
      session.contexts.push(context);
      session.interactions.push({
        timestamp: new Date(),
        type: context.type,
        layer: context.layer
      });
    }
  }
  
  cleanExpiredContexts() {
    const now = Date.now();
    for (const [id, context] of this.contextStack.entries()) {
      if (now > context.ttl) {
        this.contextStack.delete(id);
        this.emit('contextExpired', context);
      }
    }
  }
  
  getContextSource() {
    return {
      page: window.location.pathname,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent.substring(0, 100)
    };
  }
  
  generateContextId() {
    return 'ctx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  isTimeInRange(hour, timeRange) {
    const startHour = parseInt(timeRange.start.split(':')[0]);
    const endHour = parseInt(timeRange.end.split(':')[0]);
    
    if (endHour < startHour) {
      // Range crosses midnight
      return hour >= startHour || hour < endHour;
    } else {
      return hour >= startHour && hour < endHour;
    }
  }
  
  arraysMatch(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((val, index) => val === arr2[index]);
  }
  
  updateMetrics(processingTime) {
    this.metrics.totalContextUpdates++;
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime * (this.metrics.totalContextUpdates - 1) + processingTime) / 
      this.metrics.totalContextUpdates;
  }
  
  startContextMonitoring() {
    // Monitor page changes
    window.addEventListener('popstate', () => {
      this.addContext(this.config.TYPES.SYSTEM, {
        event: 'page_change',
        page: window.location.pathname
      }, this.config.LAYERS.PAGE);
    });
    
    // Monitor user activity
    ['click', 'keypress', 'scroll'].forEach(eventType => {
      document.addEventListener(eventType, () => {
        this.state.lastActivity = new Date();
      });
    });
  }
  
  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================
  
  async enhanceVoiceCommand(text, baseContext = {}) {
    const enhancedContext = { ...baseContext };
    
    // Add current context layers
    const currentContext = await this.getCurrentContext();
    enhancedContext.contextLayers = currentContext;
    
    // Add user profile context
    enhancedContext.userProfile = this.userProfile;
    
    // Add session context
    enhancedContext.session = this.sessionData.get(this.state.currentSession);
    
    // Add predictions
    const predictions = Array.from(this.predictions.values()).flat();
    enhancedContext.predictions = predictions;
    
    // Add Swiss context if applicable
    if (this.isSwissContext({ data: enhancedContext })) {
      enhancedContext.swissContext = this.getSwissContextData();
    }
    
    return enhancedContext;
  }
  
  getSwissContextData() {
    const now = new Date();
    return {
      language: this.userProfile?.preferences?.language || 'de-CH',
      dialect: this.userProfile?.preferences?.dialect,
      businessHours: this.isSwissBusinessHours(now),
      mealTime: this.getCurrentMealTime(),
      timeZone: 'Europe/Zurich'
    };
  }
  
  getCurrentMealTime() {
    const hour = new Date().getHours();
    
    for (const [mealTime, timeRange] of Object.entries(this.config.SWISS_CONTEXT.MEAL_TIMES)) {
      if (this.isTimeInRange(hour, timeRange)) {
        return mealTime;
      }
    }
    
    return 'other';
  }
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  async destroy() {
    console.log('🗑️ Destroying Context Aware Service...');
    
    // Save user profile
    try {
      localStorage.setItem('context_user_profile', JSON.stringify(this.userProfile));
    } catch (error) {
      console.warn('Could not save user profile:', error);
    }
    
    // Clear all contexts
    this.contextStack.clear();
    this.contextHistory = [];
    this.sessionData.clear();
    this.predictions.clear();
    
    // Remove event listeners
    this.removeAllListeners();
    
    this.state.isInitialized = false;
    
    console.log('✅ Context Aware Service destroyed');
  }
}

// ============================================================================
// FACTORY & EXPORT
// ============================================================================

let serviceInstance = null;

export const createContextAwareService = (options = {}) => {
  if (!serviceInstance) {
    serviceInstance = new ContextAwareService(options);
  }
  return serviceInstance;
};

export const getContextAwareService = () => {
  if (!serviceInstance) {
    throw new Error('Context Aware Service not initialized. Call createContextAwareService first.');
  }
  return serviceInstance;
};

export default ContextAwareService;