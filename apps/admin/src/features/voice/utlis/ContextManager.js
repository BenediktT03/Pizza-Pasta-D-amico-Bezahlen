/**
 * EATECH - Context Manager Utility
 * Version: 3.5.0
 * Description: Advanced context management for voice commands with state tracking and transitions
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/features/voice/utils/ContextManager.js
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const CONTEXT_TYPES = {
  IDLE: 'idle',
  ORDER_CREATION: 'order_creation',
  PRODUCT_SELECTION: 'product_selection',
  CART_MANAGEMENT: 'cart_management',
  PAYMENT: 'payment',
  RESERVATION: 'reservation',
  MENU_BROWSING: 'menu_browsing',
  SEARCH: 'search',
  NAVIGATION: 'navigation',
  HELP: 'help',
  SETTINGS: 'settings',
  CONFIRMATION: 'confirmation',
  ADMIN: 'admin',
  ERROR_RECOVERY: 'error_recovery'
};

const CONTEXT_PRIORITIES = {
  [CONTEXT_TYPES.ERROR_RECOVERY]: 10,
  [CONTEXT_TYPES.CONFIRMATION]: 9,
  [CONTEXT_TYPES.PAYMENT]: 8,
  [CONTEXT_TYPES.ORDER_CREATION]: 7,
  [CONTEXT_TYPES.RESERVATION]: 6,
  [CONTEXT_TYPES.CART_MANAGEMENT]: 5,
  [CONTEXT_TYPES.PRODUCT_SELECTION]: 4,
  [CONTEXT_TYPES.SEARCH]: 3,
  [CONTEXT_TYPES.MENU_BROWSING]: 2,
  [CONTEXT_TYPES.NAVIGATION]: 1,
  [CONTEXT_TYPES.IDLE]: 0
};

const CONTEXT_TIMEOUTS = {
  [CONTEXT_TYPES.ORDER_CREATION]: 300000, // 5 minutes
  [CONTEXT_TYPES.PRODUCT_SELECTION]: 120000, // 2 minutes
  [CONTEXT_TYPES.CART_MANAGEMENT]: 180000, // 3 minutes
  [CONTEXT_TYPES.PAYMENT]: 600000, // 10 minutes
  [CONTEXT_TYPES.RESERVATION]: 300000, // 5 minutes
  [CONTEXT_TYPES.SEARCH]: 60000, // 1 minute
  [CONTEXT_TYPES.CONFIRMATION]: 30000, // 30 seconds
  [CONTEXT_TYPES.ERROR_RECOVERY]: 60000, // 1 minute
  [CONTEXT_TYPES.HELP]: 120000 // 2 minutes
};

const CONTEXT_TRANSITIONS = {
  [CONTEXT_TYPES.IDLE]: [
    CONTEXT_TYPES.ORDER_CREATION,
    CONTEXT_TYPES.MENU_BROWSING,
    CONTEXT_TYPES.SEARCH,
    CONTEXT_TYPES.NAVIGATION,
    CONTEXT_TYPES.HELP,
    CONTEXT_TYPES.SETTINGS,
    CONTEXT_TYPES.RESERVATION,
    CONTEXT_TYPES.CART_MANAGEMENT
  ],
  
  [CONTEXT_TYPES.MENU_BROWSING]: [
    CONTEXT_TYPES.PRODUCT_SELECTION,
    CONTEXT_TYPES.SEARCH,
    CONTEXT_TYPES.CART_MANAGEMENT,
    CONTEXT_TYPES.ORDER_CREATION,
    CONTEXT_TYPES.NAVIGATION,
    CONTEXT_TYPES.IDLE
  ],
  
  [CONTEXT_TYPES.PRODUCT_SELECTION]: [
    CONTEXT_TYPES.CART_MANAGEMENT,
    CONTEXT_TYPES.ORDER_CREATION,
    CONTEXT_TYPES.MENU_BROWSING,
    CONTEXT_TYPES.SEARCH,
    CONTEXT_TYPES.IDLE
  ],
  
  [CONTEXT_TYPES.CART_MANAGEMENT]: [
    CONTEXT_TYPES.PAYMENT,
    CONTEXT_TYPES.ORDER_CREATION,
    CONTEXT_TYPES.PRODUCT_SELECTION,
    CONTEXT_TYPES.MENU_BROWSING,
    CONTEXT_TYPES.IDLE
  ],
  
  [CONTEXT_TYPES.ORDER_CREATION]: [
    CONTEXT_TYPES.CONFIRMATION,
    CONTEXT_TYPES.CART_MANAGEMENT,
    CONTEXT_TYPES.PRODUCT_SELECTION,
    CONTEXT_TYPES.PAYMENT,
    CONTEXT_TYPES.IDLE
  ],
  
  [CONTEXT_TYPES.PAYMENT]: [
    CONTEXT_TYPES.CONFIRMATION,
    CONTEXT_TYPES.ORDER_CREATION,
    CONTEXT_TYPES.CART_MANAGEMENT,
    CONTEXT_TYPES.ERROR_RECOVERY,
    CONTEXT_TYPES.IDLE
  ],
  
  [CONTEXT_TYPES.RESERVATION]: [
    CONTEXT_TYPES.CONFIRMATION,
    CONTEXT_TYPES.ORDER_CREATION,
    CONTEXT_TYPES.MENU_BROWSING,
    CONTEXT_TYPES.IDLE
  ],
  
  [CONTEXT_TYPES.SEARCH]: [
    CONTEXT_TYPES.PRODUCT_SELECTION,
    CONTEXT_TYPES.MENU_BROWSING,
    CONTEXT_TYPES.CART_MANAGEMENT,
    CONTEXT_TYPES.IDLE
  ],
  
  [CONTEXT_TYPES.CONFIRMATION]: [
    CONTEXT_TYPES.IDLE,
    CONTEXT_TYPES.ORDER_CREATION,
    CONTEXT_TYPES.PAYMENT,
    CONTEXT_TYPES.ERROR_RECOVERY
  ],
  
  [CONTEXT_TYPES.ERROR_RECOVERY]: [
    CONTEXT_TYPES.IDLE,
    CONTEXT_TYPES.HELP
  ],
  
  [CONTEXT_TYPES.HELP]: [
    CONTEXT_TYPES.IDLE
  ],
  
  [CONTEXT_TYPES.NAVIGATION]: [
    CONTEXT_TYPES.IDLE
  ],
  
  [CONTEXT_TYPES.SETTINGS]: [
    CONTEXT_TYPES.IDLE
  ]
};

const CONTEXT_VARIABLES = {
  ORDER_ID: 'orderId',
  TABLE_NUMBER: 'tableNumber',
  CUSTOMER_INFO: 'customerInfo',
  SELECTED_ITEMS: 'selectedItems',
  PAYMENT_METHOD: 'paymentMethod',
  RESERVATION_DATE: 'reservationDate',
  RESERVATION_TIME: 'reservationTime',
  GUEST_COUNT: 'guestCount',
  SEARCH_QUERY: 'searchQuery',
  SEARCH_RESULTS: 'searchResults',
  CURRENT_PRODUCT: 'currentProduct',
  CART_TOTAL: 'cartTotal',
  CONFIRMATION_TYPE: 'confirmationType',
  ERROR_TYPE: 'errorType',
  RETRY_COUNT: 'retryCount',
  USER_PREFERENCES: 'userPreferences'
};

// ============================================================================
// CONTEXT MANAGER CLASS
// ============================================================================

export class ContextManager {
  constructor(options = {}) {
    this.maxHistoryLength = options.maxHistoryLength || 50;
    this.enableLogging = options.enableLogging !== false;
    this.autoCleanup = options.autoCleanup !== false;
    this.strictTransitions = options.strictTransitions !== false;
    
    // Current state
    this.currentContext = null;
    this.contextStack = [];
    this.contextHistory = [];
    this.contextVariables = new Map();
    this.globalVariables = new Map();
    
    // Timers and cleanup
    this.contextTimers = new Map();
    this.cleanupInterval = null;
    
    // Event listeners
    this.listeners = new Map();
    
    // Statistics
    this.stats = {
      totalTransitions: 0,
      contextDurations: new Map(),
      errorCount: 0,
      timeoutCount: 0,
      invalidTransitions: 0
    };
    
    this.initialize();
  }
  
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  initialize() {
    // Set initial context
    this.setContext(CONTEXT_TYPES.IDLE);
    
    // Start auto-cleanup if enabled
    if (this.autoCleanup) {
      this.cleanupInterval = setInterval(() => {
        this.performCleanup();
      }, 60000); // Cleanup every minute
    }
    
    this.log('ContextManager initialized');
  }
  
  // ============================================================================
  // CONTEXT MANAGEMENT
  // ============================================================================
  
  setContext(contextType, data = {}, options = {}) {
    const { 
      force = false, 
      preserveVariables = false,
      timeout = null,
      pushToStack = true
    } = options;
    
    // Validate context type
    if (!Object.values(CONTEXT_TYPES).includes(contextType)) {
      this.log(`Invalid context type: ${contextType}`, 'error');
      return false;
    }
    
    // Check transition validity
    if (!force && this.currentContext && this.strictTransitions) {
      if (!this.isValidTransition(this.currentContext.type, contextType)) {
        this.log(`Invalid transition from ${this.currentContext.type} to ${contextType}`, 'warn');
        this.stats.invalidTransitions++;
        return false;
      }
    }
    
    // Save current context to stack if requested
    if (pushToStack && this.currentContext) {
      this.contextStack.push({
        ...this.currentContext,
        pausedAt: Date.now()
      });
    }
    
    // Clear existing timeout
    if (this.currentContext) {
      this.clearContextTimeout(this.currentContext.id);
      
      // Add to history
      const duration = Date.now() - this.currentContext.startTime;
      this.addToHistory({
        ...this.currentContext,
        endTime: Date.now(),
        duration
      });
      
      // Update statistics
      this.updateContextDurationStats(this.currentContext.type, duration);
    }
    
    // Create new context
    const newContext = {
      id: this.generateContextId(),
      type: contextType,
      data: { ...data },
      startTime: Date.now(),
      variables: preserveVariables && this.currentContext ? 
        new Map(this.currentContext.variables) : new Map(),
      metadata: {
        previousContext: this.currentContext?.type || null,
        transitionReason: options.reason || 'manual',
        userInitiated: options.userInitiated !== false
      }
    };
    
    // Set context variables from data
    Object.entries(data).forEach(([key, value]) => {
      newContext.variables.set(key, value);
    });
    
    // Update current context
    this.currentContext = newContext;
    
    // Set timeout if specified or use default
    const timeoutDuration = timeout || CONTEXT_TIMEOUTS[contextType];
    if (timeoutDuration) {
      this.setContextTimeout(newContext.id, timeoutDuration);
    }
    
    // Update statistics
    this.stats.totalTransitions++;
    
    // Emit event
    this.emit('contextChanged', {
      newContext: newContext,
      previousContext: this.contextHistory[this.contextHistory.length - 1] || null
    });
    
    this.log(`Context changed to: ${contextType}`, 'info', newContext);
    
    return true;
  }
  
  getCurrentContext() {
    return this.currentContext;
  }
  
  getContextType() {
    return this.currentContext?.type || CONTEXT_TYPES.IDLE;
  }
  
  isInContext(contextType) {
    return this.currentContext?.type === contextType;
  }
  
  hasContext() {
    return this.currentContext !== null && this.currentContext.type !== CONTEXT_TYPES.IDLE;
  }
  
  // ============================================================================
  // CONTEXT STACK MANAGEMENT
  // ============================================================================
  
  pushContext(contextType, data = {}, options = {}) {
    return this.setContext(contextType, data, { ...options, pushToStack: true });
  }
  
  popContext(options = {}) {
    if (this.contextStack.length === 0) {
      this.log('No context to pop from stack', 'warn');
      return this.setContext(CONTEXT_TYPES.IDLE, {}, options);
    }
    
    const previousContext = this.contextStack.pop();
    const resumeData = {
      ...previousContext.data,
      resumedAt: Date.now(),
      pauseDuration: Date.now() - previousContext.pausedAt
    };
    
    return this.setContext(
      previousContext.type, 
      resumeData, 
      { ...options, pushToStack: false, preserveVariables: true }
    );
  }
  
  clearContextStack() {
    this.contextStack = [];
    this.log('Context stack cleared');
  }
  
  getContextStack() {
    return [...this.contextStack];
  }
  
  getStackDepth() {
    return this.contextStack.length;
  }
  
  // ============================================================================
  // VARIABLE MANAGEMENT
  // ============================================================================
  
  setVariable(key, value, isGlobal = false) {
    if (isGlobal) {
      this.globalVariables.set(key, {
        value,
        timestamp: Date.now(),
        contextId: this.currentContext?.id
      });
    } else if (this.currentContext) {
      this.currentContext.variables.set(key, {
        value,
        timestamp: Date.now()
      });
    }
    
    this.emit('variableChanged', { key, value, isGlobal });
    this.log(`Variable set: ${key} = ${JSON.stringify(value)}`, 'debug');
  }
  
  getVariable(key, defaultValue = null) {
    // Check current context variables first
    if (this.currentContext?.variables.has(key)) {
      return this.currentContext.variables.get(key).value;
    }
    
    // Check global variables
    if (this.globalVariables.has(key)) {
      return this.globalVariables.get(key).value;
    }
    
    return defaultValue;
  }
  
  hasVariable(key) {
    return (this.currentContext?.variables.has(key)) || this.globalVariables.has(key);
  }
  
  removeVariable(key, isGlobal = false) {
    if (isGlobal) {
      this.globalVariables.delete(key);
    } else if (this.currentContext) {
      this.currentContext.variables.delete(key);
    }
    
    this.emit('variableRemoved', { key, isGlobal });
  }
  
  getAllVariables() {
    const contextVars = this.currentContext ? 
      Object.fromEntries([...this.currentContext.variables.entries()]) : {};
    const globalVars = Object.fromEntries([...this.globalVariables.entries()]);
    
    return {
      context: contextVars,
      global: globalVars
    };
  }
  
  clearVariables(contextOnly = false) {
    if (this.currentContext) {
      this.currentContext.variables.clear();
    }
    
    if (!contextOnly) {
      this.globalVariables.clear();
    }
    
    this.log(`Variables cleared (contextOnly: ${contextOnly})`);
  }
  
  // ============================================================================
  // CONTEXT VALIDATION & TRANSITIONS
  // ============================================================================
  
  isValidTransition(fromContext, toContext) {
    if (!fromContext || !toContext) return true;
    
    const allowedTransitions = CONTEXT_TRANSITIONS[fromContext] || [];
    return allowedTransitions.includes(toContext);
  }
  
  getValidTransitions(contextType = null) {
    const context = contextType || this.getContextType();
    return CONTEXT_TRANSITIONS[context] || [];
  }
  
  canTransitionTo(contextType) {
    return this.isValidTransition(this.getContextType(), contextType);
  }
  
  suggestNextContexts() {
    const currentType = this.getContextType();
    const validTransitions = this.getValidTransitions(currentType);
    
    // Add priority-based suggestions
    const suggestions = validTransitions.map(contextType => ({
      type: contextType,
      priority: CONTEXT_PRIORITIES[contextType] || 0,
      reason: this.getTransitionReason(currentType, contextType)
    }));
    
    return suggestions.sort((a, b) => b.priority - a.priority);
  }
  
  getTransitionReason(fromContext, toContext) {
    const reasonMap = {
      [`${CONTEXT_TYPES.MENU_BROWSING}->${CONTEXT_TYPES.PRODUCT_SELECTION}`]: 'User found interesting product',
      [`${CONTEXT_TYPES.PRODUCT_SELECTION}->${CONTEXT_TYPES.CART_MANAGEMENT}`]: 'User wants to add to cart',
      [`${CONTEXT_TYPES.CART_MANAGEMENT}->${CONTEXT_TYPES.PAYMENT}`]: 'User ready to checkout',
      [`${CONTEXT_TYPES.ORDER_CREATION}->${CONTEXT_TYPES.CONFIRMATION}`]: 'Order needs confirmation',
      [`${CONTEXT_TYPES.PAYMENT}->${CONTEXT_TYPES.CONFIRMATION}`]: 'Payment needs confirmation'
    };
    
    return reasonMap[`${fromContext}->${toContext}`] || 'Natural progression';
  }
  
  // ============================================================================
  // TIMEOUT MANAGEMENT
  // ============================================================================
  
  setContextTimeout(contextId, duration) {
    this.clearContextTimeout(contextId);
    
    const timer = setTimeout(() => {
      this.handleContextTimeout(contextId);
    }, duration);
    
    this.contextTimers.set(contextId, timer);
    this.log(`Context timeout set for ${duration}ms`, 'debug');
  }
  
  clearContextTimeout(contextId) {
    if (this.contextTimers.has(contextId)) {
      clearTimeout(this.contextTimers.get(contextId));
      this.contextTimers.delete(contextId);
    }
  }
  
  extendContextTimeout(contextId, additionalTime) {
    if (this.currentContext?.id === contextId) {
      const currentTimeout = CONTEXT_TIMEOUTS[this.currentContext.type];
      if (currentTimeout) {
        this.setContextTimeout(contextId, currentTimeout + additionalTime);
        this.log(`Context timeout extended by ${additionalTime}ms`);
      }
    }
  }
  
  handleContextTimeout(contextId) {
    if (this.currentContext?.id === contextId) {
      this.stats.timeoutCount++;
      
      this.emit('contextTimeout', {
        context: this.currentContext,
        timeoutDuration: Date.now() - this.currentContext.startTime
      });
      
      this.log(`Context timed out: ${this.currentContext.type}`, 'warn');
      
      // Auto-transition to appropriate context
      this.handleTimeoutTransition();
    }
  }
  
  handleTimeoutTransition() {
    const currentType = this.getContextType();
    
    // Define timeout transition rules
    const timeoutTransitions = {
      [CONTEXT_TYPES.ORDER_CREATION]: CONTEXT_TYPES.IDLE,
      [CONTEXT_TYPES.PRODUCT_SELECTION]: CONTEXT_TYPES.MENU_BROWSING,
      [CONTEXT_TYPES.CART_MANAGEMENT]: CONTEXT_TYPES.IDLE,
      [CONTEXT_TYPES.PAYMENT]: CONTEXT_TYPES.CART_MANAGEMENT,
      [CONTEXT_TYPES.RESERVATION]: CONTEXT_TYPES.IDLE,
      [CONTEXT_TYPES.SEARCH]: CONTEXT_TYPES.MENU_BROWSING,
      [CONTEXT_TYPES.CONFIRMATION]: CONTEXT_TYPES.IDLE,
      [CONTEXT_TYPES.ERROR_RECOVERY]: CONTEXT_TYPES.IDLE
    };
    
    const nextContext = timeoutTransitions[currentType] || CONTEXT_TYPES.IDLE;
    
    this.setContext(nextContext, {
      reason: 'timeout',
      previousContext: currentType
    }, {
      reason: 'timeout_transition',
      userInitiated: false
    });
  }
  
  // ============================================================================
  // ERROR HANDLING
  // ============================================================================
  
  handleError(error, options = {}) {
    this.stats.errorCount++;
    
    const errorContext = {
      error: error.message || error,
      errorType: error.type || 'unknown',
      originalContext: this.currentContext?.type,
      timestamp: Date.now(),
      retryCount: this.getVariable(CONTEXT_VARIABLES.RETRY_COUNT, 0) + 1,
      ...options
    };
    
    this.emit('contextError', errorContext);
    this.log(`Context error: ${errorContext.error}`, 'error', errorContext);
    
    // Determine if we should enter error recovery
    if (this.shouldEnterErrorRecovery(errorContext)) {
      this.setContext(CONTEXT_TYPES.ERROR_RECOVERY, errorContext, {
        reason: 'error_handling',
        userInitiated: false,
        pushToStack: true
      });
    }
  }
  
  shouldEnterErrorRecovery(errorContext) {
    const retryCount = errorContext.retryCount || 0;
    const criticalContexts = [
      CONTEXT_TYPES.PAYMENT,
      CONTEXT_TYPES.ORDER_CREATION,
      CONTEXT_TYPES.RESERVATION
    ];
    
    return retryCount < 3 && criticalContexts.includes(errorContext.originalContext);
  }
  
  recoverFromError(recoveryAction = 'retry') {
    if (!this.isInContext(CONTEXT_TYPES.ERROR_RECOVERY)) {
      this.log('Not in error recovery context', 'warn');
      return false;
    }
    
    const errorData = this.currentContext.data;
    
    switch (recoveryAction) {
      case 'retry':
        // Return to original context with retry
        if (errorData.originalContext) {
          this.popContext({
            reason: 'error_recovery_retry'
          });
        } else {
          this.setContext(CONTEXT_TYPES.IDLE);
        }
        break;
        
      case 'abort':
        // Clear stack and go to idle
        this.clearContextStack();
        this.setContext(CONTEXT_TYPES.IDLE, {
          reason: 'error_recovery_abort'
        });
        break;
        
      case 'fallback':
        // Go to a safe context
        this.setContext(CONTEXT_TYPES.MENU_BROWSING, {
          reason: 'error_recovery_fallback'
        });
        break;
        
      default:
        this.log(`Unknown recovery action: ${recoveryAction}`, 'warn');
        return false;
    }
    
    this.log(`Recovered from error using: ${recoveryAction}`);
    return true;
  }
  
  // ============================================================================
  // HISTORY & ANALYTICS
  // ============================================================================
  
  addToHistory(contextData) {
    this.contextHistory.unshift({
      ...contextData,
      historyIndex: this.contextHistory.length
    });
    
    // Trim history if too long
    if (this.contextHistory.length > this.maxHistoryLength) {
      this.contextHistory = this.contextHistory.slice(0, this.maxHistoryLength);
    }
  }
  
  getHistory(limit = 10) {
    return this.contextHistory.slice(0, limit);
  }
  
  getContextDuration(contextType) {
    const durations = this.stats.contextDurations.get(contextType) || [];
    if (durations.length === 0) return null;
    
    const total = durations.reduce((sum, duration) => sum + duration, 0);
    return {
      average: total / durations.length,
      total,
      count: durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations)
    };
  }
  
  updateContextDurationStats(contextType, duration) {
    if (!this.stats.contextDurations.has(contextType)) {
      this.stats.contextDurations.set(contextType, []);
    }
    
    this.stats.contextDurations.get(contextType).push(duration);
  }
  
  getStatistics() {
    const contextDurationStats = {};
    
    for (const [contextType, durations] of this.stats.contextDurations.entries()) {
      contextDurationStats[contextType] = this.getContextDuration(contextType);
    }
    
    return {
      ...this.stats,
      contextDurations: contextDurationStats,
      currentContext: this.currentContext?.type || null,
      stackDepth: this.getStackDepth(),
      historyLength: this.contextHistory.length,
      activeTimers: this.contextTimers.size
    };
  }
  
  // ============================================================================
  // EVENT MANAGEMENT
  // ============================================================================
  
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }
  
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }
  
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          this.log(`Error in event listener for ${event}: ${error.message}`, 'error');
        }
      });
    }
  }
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  generateContextId() {
    return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  performCleanup() {
    // Clear old variables
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [key, data] of this.globalVariables.entries()) {
      if (now - data.timestamp > maxAge) {
        this.globalVariables.delete(key);
      }
    }
    
    // Trim history
    if (this.contextHistory.length > this.maxHistoryLength) {
      this.contextHistory = this.contextHistory.slice(0, this.maxHistoryLength);
    }
    
    this.log('Cleanup performed');
  }
  
  log(message, level = 'info', data = null) {
    if (!this.enableLogging) return;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.currentContext?.type || 'none',
      data
    };
    
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
      `[ContextManager] ${message}`,
      data ? data : ''
    );
  }
  
  reset() {
    // Clear all timers
    this.contextTimers.forEach(timer => clearTimeout(timer));
    this.contextTimers.clear();
    
    // Clear state
    this.currentContext = null;
    this.contextStack = [];
    this.contextHistory = [];
    this.contextVariables.clear();
    this.globalVariables.clear();
    
    // Reset statistics
    this.stats = {
      totalTransitions: 0,
      contextDurations: new Map(),
      errorCount: 0,
      timeoutCount: 0,
      invalidTransitions: 0
    };
    
    // Reinitialize
    this.initialize();
    
    this.log('ContextManager reset');
  }
  
  destroy() {
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Clear all timers
    this.contextTimers.forEach(timer => clearTimeout(timer));
    this.contextTimers.clear();
    
    // Clear listeners
    this.listeners.clear();
    
    this.log('ContextManager destroyed');
  }
  
  // ============================================================================
  // EXPORT/IMPORT STATE
  // ============================================================================
  
  exportState() {
    return {
      currentContext: this.currentContext,
      contextStack: this.contextStack,
      contextHistory: this.contextHistory.slice(0, 10), // Limited export
      globalVariables: Object.fromEntries(this.globalVariables),
      stats: this.stats,
      timestamp: Date.now()
    };
  }
  
  importState(state) {
    try {
      if (state.currentContext) {
        this.currentContext = state.currentContext;
      }
      
      if (state.contextStack) {
        this.contextStack = state.contextStack;
      }
      
      if (state.globalVariables) {
        this.globalVariables = new Map(Object.entries(state.globalVariables));
      }
      
      if (state.stats) {
        this.stats = { ...this.stats, ...state.stats };
      }
      
      this.log('State imported successfully');
      return true;
    } catch (error) {
      this.log(`Failed to import state: ${error.message}`, 'error');
      return false;
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ContextManager;

export {
  CONTEXT_TYPES,
  CONTEXT_PRIORITIES,
  CONTEXT_TIMEOUTS,
  CONTEXT_TRANSITIONS,
  CONTEXT_VARIABLES
};