/**
 * EATECH - Voice Command Processor Service
 * Version: 4.5.0
 * Description: Advanced command execution engine for voice commerce
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/services/voice/VoiceCommandProcessor.js
 * 
 * Features:
 * - Intent-based command execution
 * - Context-aware action routing
 * - Multi-step transaction handling
 * - Error recovery and fallbacks
 * - Analytics and performance tracking
 * - Swiss-specific business logic
 * - Real-time feedback generation
 */

// ============================================================================
// IMPORTS & DEPENDENCIES
// ============================================================================

import EventEmitter from 'events';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const COMMAND_CONFIG = {
  // Command categories with priorities
  CATEGORIES: {
    CRITICAL: {
      priority: 1,
      timeout: 5000,
      retries: 3,
      commands: ['emergency_stop', 'payment_cancel', 'order_cancel']
    },
    HIGH: {
      priority: 2,
      timeout: 3000,
      retries: 2,
      commands: ['checkout', 'payment', 'order_complete']
    },
    NORMAL: {
      priority: 3,
      timeout: 2000,
      retries: 1,
      commands: ['add_product', 'remove_product', 'navigate', 'inquiry']
    },
    LOW: {
      priority: 4,
      timeout: 1000,
      retries: 0,
      commands: ['help', 'repeat', 'settings']
    }
  },
  
  // Execution strategies
  STRATEGIES: {
    IMMEDIATE: 'immediate',
    QUEUED: 'queued',
    BATCH: 'batch',
    SCHEDULED: 'scheduled'
  },
  
  // Response templates
  RESPONSES: {
    'de-CH': {
      success: {
        add_product: 'Ich habe {product} zum Warenkorb hinzugefügt.',
        remove_product: '{product} wurde aus dem Warenkorb entfernt.',
        navigate: 'Navigiere zu {target}.',
        checkout: 'Leite zur Bezahlung weiter.',
        inquiry: 'Hier sind die Informationen zu {product}.',
        help: 'Ich kann Ihnen beim Bestellen helfen. Sagen Sie zum Beispiel: "Ich möchte eine Pizza".'
      },
      error: {
        product_not_found: 'Das Produkt "{product}" konnte nicht gefunden werden.',
        cart_empty: 'Ihr Warenkorb ist leer.',
        payment_failed: 'Die Bezahlung konnte nicht verarbeitet werden.',
        navigation_failed: 'Navigation zu {target} nicht möglich.',
        generic: 'Es gab einen Fehler bei der Ausführung des Befehls.'
      },
      clarification: {
        ambiguous_product: 'Welches {category} meinen Sie genau?',
        missing_quantity: 'Wie viele möchten Sie?',
        confirm_action: 'Soll ich {action} ausführen?'
      }
    },
    'de-DE': {
      success: {
        add_product: 'Ich habe {product} zum Warenkorb hinzugefügt.',
        remove_product: '{product} wurde aus dem Warenkorb entfernt.',
        navigate: 'Navigiere zu {target}.',
        checkout: 'Leite zur Bezahlung weiter.',
        inquiry: 'Hier sind die Informationen zu {product}.',
        help: 'Ich kann Ihnen beim Bestellen helfen.'
      }
    },
    'fr-CH': {
      success: {
        add_product: 'J\'ai ajouté {product} au panier.',
        remove_product: '{product} a été retiré du panier.',
        navigate: 'Navigation vers {target}.',
        checkout: 'Redirection vers le paiement.',
        inquiry: 'Voici les informations sur {product}.',
        help: 'Je peux vous aider à commander.'
      }
    },
    'it-CH': {
      success: {
        add_product: 'Ho aggiunto {product} al carrello.',
        remove_product: '{product} è stato rimosso dal carrello.',
        navigate: 'Navigazione verso {target}.',
        checkout: 'Reindirizzamento al pagamento.',
        inquiry: 'Ecco le informazioni su {product}.',
        help: 'Posso aiutarti con l\'ordine.'
      }
    },
    'en-US': {
      success: {
        add_product: 'I\'ve added {product} to your cart.',
        remove_product: '{product} has been removed from your cart.',
        navigate: 'Navigating to {target}.',
        checkout: 'Proceeding to checkout.',
        inquiry: 'Here\'s the information about {product}.',
        help: 'I can help you with ordering.'
      }
    }
  },
  
  // Swiss-specific configurations
  SWISS_CONFIG: {
    currency: 'CHF',
    tax_rate: 0.077, // 7.7% VAT
    payment_methods: ['twint', 'postcard', 'credit_card', 'cash'],
    delivery_zones: {
      'zurich': { base_fee: 3.50, free_threshold: 25.00 },
      'basel': { base_fee: 4.00, free_threshold: 30.00 },
      'geneva': { base_fee: 4.50, free_threshold: 35.00 },
      'bern': { base_fee: 3.50, free_threshold: 25.00 }
    },
    business_hours: {
      weekday: { open: '10:00', close: '22:00' },
      weekend: { open: '11:00', close: '23:00' }
    }
  },
  
  // Performance thresholds
  PERFORMANCE: {
    max_execution_time: 2000,
    max_queue_size: 100,
    batch_size: 10,
    cache_ttl: 300000 // 5 minutes
  }
};

// ============================================================================
// COMMAND EXECUTION RESULTS
// ============================================================================

const createResult = (success, action, message, data = {}) => ({
  success,
  action,
  message,
  data,
  timestamp: Date.now(),
  executionTime: 0
});

const createError = (action, error, code = 'EXECUTION_ERROR') => ({
  success: false,
  action,
  error,
  code,
  timestamp: Date.now(),
  retryable: ['NETWORK_ERROR', 'TIMEOUT', 'TEMPORARY_ERROR'].includes(code)
});

// ============================================================================
// MAIN PROCESSOR CLASS
// ============================================================================

class VoiceCommandProcessor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Configuration
    this.config = {
      ...COMMAND_CONFIG,
      ...options
    };
    
    // State management
    this.state = {
      isInitialized: false,
      currentLanguage: 'de-CH',
      executionQueue: [],
      activeCommands: new Map(),
      commandHistory: [],
      sessionContext: {},
      userPreferences: {}
    };
    
    // Command handlers registry
    this.handlers = new Map();
    
    // Performance tracking
    this.metrics = {
      totalCommands: 0,
      successfulCommands: 0,
      failedCommands: 0,
      averageExecutionTime: 0,
      commandsByType: new Map(),
      errorsByType: new Map()
    };
    
    // Caching system
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    
    // Transaction management
    this.transactions = new Map();
    this.transactionCounter = 0;
    
    // Initialize
    this.initialize();
  }
  
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  async initialize() {
    try {
      console.log('⚡ Initializing Voice Command Processor...');
      
      // Register command handlers
      this.registerHandlers();
      
      // Setup performance monitoring
      this.setupPerformanceMonitoring();
      
      // Load user preferences
      await this.loadUserPreferences();
      
      // Initialize transaction system
      this.initializeTransactionSystem();
      
      this.state.isInitialized = true;
      this.emit('initialized');
      
      console.log('✅ Voice Command Processor initialized successfully');
      
    } catch (error) {
      console.error('❌ Command Processor initialization failed:', error);
      this.emit('error', error);
      throw error;
    }
  }
  
  registerHandlers() {
    // Order management commands
    this.handlers.set('order', this.handleOrderCommand.bind(this));
    this.handlers.set('add_product', this.handleAddProduct.bind(this));
    this.handlers.set('remove_product', this.handleRemoveProduct.bind(this));
    this.handlers.set('update_quantity', this.handleUpdateQuantity.bind(this));
    
    // Navigation commands
    this.handlers.set('navigation', this.handleNavigationCommand.bind(this));
    this.handlers.set('show_menu', this.handleShowMenu.bind(this));
    this.handlers.set('show_cart', this.handleShowCart.bind(this));
    this.handlers.set('go_back', this.handleGoBack.bind(this));
    
    // Inquiry commands
    this.handlers.set('inquiry', this.handleInquiryCommand.bind(this));
    this.handlers.set('product_info', this.handleProductInfo.bind(this));
    this.handlers.set('price_check', this.handlePriceCheck.bind(this));
    this.handlers.set('allergen_info', this.handleAllergenInfo.bind(this));
    
    // Checkout commands
    this.handlers.set('checkout', this.handleCheckoutCommand.bind(this));
    this.handlers.set('payment', this.handlePaymentCommand.bind(this));
    this.handlers.set('order_complete', this.handleOrderComplete.bind(this));
    
    // Control commands
    this.handlers.set('control', this.handleControlCommand.bind(this));
    this.handlers.set('help', this.handleHelpCommand.bind(this));
    this.handlers.set('repeat', this.handleRepeatCommand.bind(this));
    this.handlers.set('cancel', this.handleCancelCommand.bind(this));
    
    console.log(`📋 Registered ${this.handlers.size} command handlers`);
  }
  
  setupPerformanceMonitoring() {
    // Performance monitoring interval
    setInterval(() => {
      this.updatePerformanceMetrics();
      this.cleanupCache();
      this.processQueue();
    }, 1000);
    
    // Queue size monitoring
    setInterval(() => {
      if (this.state.executionQueue.length > this.config.PERFORMANCE.max_queue_size) {
        console.warn(`⚠️ Command queue is getting large: ${this.state.executionQueue.length} items`);
        this.emit('queueOverflow', { size: this.state.executionQueue.length });
      }
    }, 5000);
  }
  
  async loadUserPreferences() {
    try {
      const saved = localStorage.getItem('voice_command_preferences');
      if (saved) {
        this.state.userPreferences = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Could not load user preferences:', error);
    }
  }
  
  initializeTransactionSystem() {
    // Cleanup old transactions every 5 minutes
    setInterval(() => {
      const now = Date.now();
      const expiredTransactions = [];
      
      this.transactions.forEach((transaction, id) => {
        if (now - transaction.created > 300000) { // 5 minutes
          expiredTransactions.push(id);
        }
      });
      
      expiredTransactions.forEach(id => {
        this.transactions.delete(id);
      });
      
      if (expiredTransactions.length > 0) {
        console.log(`🗑️ Cleaned up ${expiredTransactions.length} expired transactions`);
      }
    }, 300000);
  }
  
  // ============================================================================
  // MAIN EXECUTION METHOD
  // ============================================================================
  
  async executeCommand(intent, context = {}) {
    const startTime = performance.now();
    const commandId = this.generateCommandId();
    
    try {
      if (!this.state.isInitialized) {
        throw new Error('Command processor not initialized');
      }
      
      // Validate input
      this.validateInput(intent, context);
      
      // Determine execution strategy
      const strategy = this.determineExecutionStrategy(intent, context);
      
      // Create command context
      const commandContext = this.createCommandContext(intent, context, commandId);
      
      // Execute based on strategy
      let result;
      switch (strategy) {
        case this.config.STRATEGIES.IMMEDIATE:
          result = await this.executeImmediate(commandContext);
          break;
        case this.config.STRATEGIES.QUEUED:
          result = await this.executeQueued(commandContext);
          break;
        case this.config.STRATEGIES.BATCH:
          result = await this.executeBatch(commandContext);
          break;
        case this.config.STRATEGIES.SCHEDULED:
          result = await this.executeScheduled(commandContext);
          break;
        default:
          result = await this.executeImmediate(commandContext);
      }
      
      // Calculate execution time
      const executionTime = performance.now() - startTime;
      result.executionTime = executionTime;
      
      // Update metrics
      this.updateCommandMetrics(result, executionTime);
      
      // Store in history
      this.addToHistory(commandContext, result);
      
      // Emit events
      this.emit('commandExecuted', {
        command: commandContext,
        result,
        executionTime
      });
      
      return result;
      
    } catch (error) {
      const executionTime = performance.now() - startTime;
      console.error('Command execution failed:', error);
      
      const errorResult = createError(
        intent.name,
        error.message,
        error.code || 'EXECUTION_ERROR'
      );
      errorResult.executionTime = executionTime;
      
      this.metrics.failedCommands++;
      this.updateErrorMetrics(error);
      
      this.emit('commandFailed', {
        commandId,
        intent,
        error: errorResult,
        executionTime
      });
      
      return errorResult;
    }
  }
  
  // ============================================================================
  // EXECUTION STRATEGIES
  // ============================================================================
  
  async executeImmediate(commandContext) {
    const { intent, entities, context } = commandContext;
    
    // Check cache first
    const cacheKey = this.generateCacheKey(intent, entities);
    if (this.cache.has(cacheKey) && this.isCacheValid(cacheKey)) {
      const cachedResult = this.cache.get(cacheKey);
      cachedResult.fromCache = true;
      return cachedResult;
    }
    
    // Get handler
    const handler = this.getHandler(intent.name);
    if (!handler) {
      throw new Error(`No handler found for intent: ${intent.name}`);
    }
    
    // Execute command
    const result = await handler(intent, entities, context);
    
    // Cache result if appropriate
    if (this.shouldCache(intent, result)) {
      this.cacheResult(cacheKey, result);
    }
    
    return result;
  }
  
  async executeQueued(commandContext) {
    return new Promise((resolve, reject) => {
      const queueItem = {
        ...commandContext,
        resolve,
        reject,
        priority: this.getCommandPriority(commandContext.intent.name),
        timestamp: Date.now()
      };
      
      // Insert into queue based on priority
      this.insertIntoQueue(queueItem);
      
      // Emit queue update
      this.emit('queueUpdated', {
        size: this.state.executionQueue.length,
        item: queueItem
      });
    });
  }
  
  async executeBatch(commandContext) {
    // For batch execution, commands are grouped and executed together
    // This is useful for operations that can be optimized when done in bulk
    
    const batchId = this.generateBatchId();
    const batchItem = {
      ...commandContext,
      batchId,
      timestamp: Date.now()
    };
    
    // Add to batch queue
    if (!this.state.batchQueue) {
      this.state.batchQueue = [];
    }
    
    this.state.batchQueue.push(batchItem);
    
    // If batch is full or timeout reached, execute batch
    if (this.state.batchQueue.length >= this.config.PERFORMANCE.batch_size) {
      return await this.processBatch();
    }
    
    // Return pending result
    return createResult(true, 'batch_queued', 'Command added to batch queue', {
      batchId,
      position: this.state.batchQueue.length
    });
  }
  
  async executeScheduled(commandContext) {
    // For scheduled execution (e.g., reminder commands)
    const scheduleTime = this.getScheduleTime(commandContext);
    const scheduledItem = {
      ...commandContext,
      scheduleTime,
      timestamp: Date.now()
    };
    
    // Add to scheduled commands
    if (!this.state.scheduledCommands) {
      this.state.scheduledCommands = [];
    }
    
    this.state.scheduledCommands.push(scheduledItem);
    
    return createResult(true, 'scheduled', 'Command scheduled for execution', {
      scheduleTime,
      commandId: commandContext.commandId
    });
  }
  
  // ============================================================================
  // COMMAND HANDLERS
  // ============================================================================
  
  async handleOrderCommand(intent, entities, context) {
    try {
      // Determine specific order action
      const action = this.determineOrderAction(intent, entities);
      
      switch (action) {
        case 'add_product':
          return await this.handleAddProduct(intent, entities, context);
        case 'remove_product':
          return await this.handleRemoveProduct(intent, entities, context);
        case 'update_quantity':
          return await this.handleUpdateQuantity(intent, entities, context);
        default:
          return await this.handleAddProduct(intent, entities, context);
      }
      
    } catch (error) {
      return createError('order', error.message);
    }
  }
  
  async handleAddProduct(intent, entities, context) {
    try {
      // Extract product information
      const productEntity = entities.find(e => e.type === 'product');
      const quantityEntity = entities.find(e => e.type === 'quantity');
      const modifierEntities = entities.filter(e => e.type === 'modifier');
      
      if (!productEntity) {
        return createError('add_product', 'No product specified', 'MISSING_PRODUCT');
      }
      
      // Find product in catalog
      const product = await this.findProduct(productEntity.value, context);
      if (!product) {
        return createError(
          'add_product',
          this.formatMessage('error.product_not_found', { product: productEntity.value }),
          'PRODUCT_NOT_FOUND'
        );
      }
      
      // Parse quantity
      const quantity = quantityEntity ? this.parseQuantity(quantityEntity.value) : 1;
      
      // Parse modifiers
      const modifiers = this.parseModifiers(modifierEntities);
      
      // Check availability
      if (!this.isProductAvailable(product, quantity, context)) {
        return createError('add_product', 'Product not available', 'PRODUCT_UNAVAILABLE');
      }
      
      // Create cart item
      const cartItem = {
        product,
        quantity,
        modifiers,
        price: this.calculatePrice(product, quantity, modifiers),
        timestamp: Date.now()
      };
      
      // Add to cart via context callback
      if (context.callbacks?.onProductAdd) {
        await context.callbacks.onProductAdd(cartItem);
      }
      
      // Create success response
      const message = this.formatMessage('success.add_product', {
        product: product.name,
        quantity: quantity > 1 ? ` (${quantity}x)` : ''
      });
      
      return createResult(true, 'add_product', message, {
        product,
        quantity,
        modifiers,
        cartItem
      });
      
    } catch (error) {
      return createError('add_product', error.message);
    }
  }
  
  async handleRemoveProduct(intent, entities, context) {
    try {
      const productEntity = entities.find(e => e.type === 'product');
      const quantityEntity = entities.find(e => e.type === 'quantity');
      
      if (!productEntity) {
        return createError('remove_product', 'No product specified', 'MISSING_PRODUCT');
      }
      
      // Find product in cart
      const cartItems = context.cart?.items || [];
      const cartItem = cartItems.find(item => 
        item.product.name.toLowerCase().includes(productEntity.value.toLowerCase())
      );
      
      if (!cartItem) {
        return createError(
          'remove_product',
          this.formatMessage('error.product_not_in_cart', { product: productEntity.value }),
          'PRODUCT_NOT_IN_CART'
        );
      }
      
      // Parse quantity to remove
      const quantityToRemove = quantityEntity ? 
        this.parseQuantity(quantityEntity.value) : cartItem.quantity;
      
      // Remove from cart via context callback
      if (context.callbacks?.onProductRemove) {
        await context.callbacks.onProductRemove(cartItem, quantityToRemove);
      }
      
      const message = this.formatMessage('success.remove_product', {
        product: cartItem.product.name
      });
      
      return createResult(true, 'remove_product', message, {
        product: cartItem.product,
        removedQuantity: quantityToRemove
      });
      
    } catch (error) {
      return createError('remove_product', error.message);
    }
  }
  
  async handleNavigationCommand(intent, entities, context) {
    try {
      const targetEntity = entities.find(e => e.type === 'target');
      const directionEntity = entities.find(e => e.type === 'direction');
      
      let target = targetEntity?.value || 'menu';
      
      // Handle direction-based navigation
      if (directionEntity) {
        target = this.resolveDirectionalNavigation(directionEntity.value, context);
      }
      
      // Validate navigation target
      const validTargets = ['menu', 'cart', 'checkout', 'profile', 'orders', 'settings'];
      if (!validTargets.includes(target)) {
        return createError('navigation', `Invalid navigation target: ${target}`, 'INVALID_TARGET');
      }
      
      // Execute navigation via callback
      if (context.callbacks?.onNavigate) {
        await context.callbacks.onNavigate(target);
      }
      
      const message = this.formatMessage('success.navigate', { target });
      
      return createResult(true, 'navigation', message, { target });
      
    } catch (error) {
      return createError('navigation', error.message);
    }
  }
  
  async handleInquiryCommand(intent, entities, context) {
    try {
      const productEntity = entities.find(e => e.type === 'product');
      const inquiryTypeEntity = entities.find(e => e.type === 'inquiry_type');
      
      if (!productEntity) {
        return createError('inquiry', 'No product specified for inquiry', 'MISSING_PRODUCT');
      }
      
      // Find product
      const product = await this.findProduct(productEntity.value, context);
      if (!product) {
        return createError('inquiry', 'Product not found', 'PRODUCT_NOT_FOUND');
      }
      
      // Determine inquiry type
      const inquiryType = inquiryTypeEntity?.value || 'general';
      
      // Get appropriate information
      let information;
      switch (inquiryType) {
        case 'price':
          information = this.getProductPriceInfo(product);
          break;
        case 'allergen':
          information = this.getProductAllergenInfo(product);
          break;
        case 'ingredient':
          information = this.getProductIngredientInfo(product);
          break;
        default:
          information = this.getProductGeneralInfo(product);
      }
      
      const message = this.formatMessage('success.inquiry', { product: product.name });
      
      return createResult(true, 'inquiry', message, {
        product,
        inquiryType,
        information
      });
      
    } catch (error) {
      return createError('inquiry', error.message);
    }
  }
  
  async handleCheckoutCommand(intent, entities, context) {
    try {
      // Check if cart has items
      const cartItems = context.cart?.items || [];
      if (cartItems.length === 0) {
        return createError('checkout', this.formatMessage('error.cart_empty'), 'CART_EMPTY');
      }
      
      // Create transaction
      const transactionId = this.createTransaction(cartItems, context);
      
      // Calculate totals
      const totals = this.calculateOrderTotals(cartItems, context);
      
      // Validate business hours
      if (!this.isWithinBusinessHours()) {
        return createError('checkout', 'Outside business hours', 'BUSINESS_HOURS');
      }
      
      // Check minimum order value
      if (totals.subtotal < 10.00) {
        return createError('checkout', 'Minimum order value is CHF 10.00', 'MINIMUM_ORDER');
      }
      
      // Execute checkout via callback
      if (context.callbacks?.onOrderComplete) {
        await context.callbacks.onOrderComplete({
          transactionId,
          items: cartItems,
          totals
        });
      }
      
      const message = this.formatMessage('success.checkout');
      
      return createResult(true, 'checkout', message, {
        transactionId,
        totals,
        itemCount: cartItems.length
      });
      
    } catch (error) {
      return createError('checkout', error.message);
    }
  }
  
  async handleControlCommand(intent, entities, context) {
    try {
      const controlTypeEntity = entities.find(e => e.type === 'control_type');
      const controlType = controlTypeEntity?.value || 'help';
      
      switch (controlType) {
        case 'help':
          return await this.handleHelpCommand(intent, entities, context);
        case 'repeat':
          return await this.handleRepeatCommand(intent, entities, context);
        case 'cancel':
          return await this.handleCancelCommand(intent, entities, context);
        case 'volume':
          return await this.handleVolumeControl(intent, entities, context);
        default:
          return await this.handleHelpCommand(intent, entities, context);
      }
      
    } catch (error) {
      return createError('control', error.message);
    }
  }
  
  async handleHelpCommand(intent, entities, context) {
    try {
      const helpMessage = this.formatMessage('success.help');
      const examples = this.getCommandExamples(context.language);
      
      return createResult(true, 'help', helpMessage, {
        examples,
        availableCommands: this.getAvailableCommands(context)
      });
      
    } catch (error) {
      return createError('help', error.message);
    }
  }
  
  async handleRepeatCommand(intent, entities, context) {
    try {
      // Get last command from history
      const lastCommand = this.state.commandHistory[this.state.commandHistory.length - 1];
      
      if (!lastCommand) {
        return createError('repeat', 'No previous command to repeat', 'NO_PREVIOUS_COMMAND');
      }
      
      // Re-execute last command
      return await this.executeCommand(lastCommand.intent, lastCommand.context);
      
    } catch (error) {
      return createError('repeat', error.message);
    }
  }
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  validateInput(intent, context) {
    if (!intent || typeof intent !== 'object') {
      throw new Error('Invalid intent object');
    }
    
    if (!intent.name) {
      throw new Error('Intent name is required');
    }
    
    if (!context || typeof context !== 'object') {
      throw new Error('Invalid context object');
    }
  }
  
  determineExecutionStrategy(intent, context) {
    // Determine strategy based on intent and context
    const criticalCommands = this.config.CATEGORIES.CRITICAL.commands;
    const highPriorityCommands = this.config.CATEGORIES.HIGH.commands;
    
    if (criticalCommands.includes(intent.name)) {
      return this.config.STRATEGIES.IMMEDIATE;
    }
    
    if (highPriorityCommands.includes(intent.name)) {
      return this.config.STRATEGIES.IMMEDIATE;
    }
    
    // Check if command can benefit from batching
    if (this.canBeBatched(intent)) {
      return this.config.STRATEGIES.BATCH;
    }
    
    return this.config.STRATEGIES.IMMEDIATE;
  }
  
  createCommandContext(intent, context, commandId) {
    return {
      commandId,
      intent,
      entities: context.entities || [],
      context: {
        ...context,
        language: this.state.currentLanguage,
        timestamp: Date.now(),
        sessionId: context.sessionId
      }
    };
  }
  
  getHandler(intentName) {
    // Try exact match first
    if (this.handlers.has(intentName)) {
      return this.handlers.get(intentName);
    }
    
    // Try category-based matching
    const categories = ['order', 'navigation', 'inquiry', 'checkout', 'control'];
    for (const category of categories) {
      if (intentName.startsWith(category) && this.handlers.has(category)) {
        return this.handlers.get(category);
      }
    }
    
    return null;
  }
  
  determineOrderAction(intent, entities) {
    // Analyze entities to determine specific order action
    const hasProduct = entities.some(e => e.type === 'product');
    const hasQuantity = entities.some(e => e.type === 'quantity');
    
    if (intent.name.includes('remove')) {
      return 'remove_product';
    }
    
    if (intent.name.includes('update') || (hasProduct && hasQuantity)) {
      return 'update_quantity';
    }
    
    return 'add_product';
  }
  
  async findProduct(productName, context) {
    const products = context.products || [];
    
    // Exact match first
    let product = products.find(p => 
      p.name.toLowerCase() === productName.toLowerCase()
    );
    
    if (product) return product;
    
    // Partial match
    product = products.find(p => 
      p.name.toLowerCase().includes(productName.toLowerCase()) ||
      productName.toLowerCase().includes(p.name.toLowerCase())
    );
    
    if (product) return product;
    
    // Fuzzy search (simple implementation)
    const fuzzyMatches = products.filter(p => {
      const similarity = this.calculateSimilarity(p.name.toLowerCase(), productName.toLowerCase());
      return similarity > 0.6;
    });
    
    return fuzzyMatches.length > 0 ? fuzzyMatches[0] : null;
  }
  
  calculateSimilarity(str1, str2) {
    // Simple Jaccard similarity
    const set1 = new Set(str1.split(''));
    const set2 = new Set(str2.split(''));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }
  
  parseQuantity(quantityStr) {
    // Parse different quantity formats
    const numberMap = {
      'ein': 1, 'eins': 1, 'eis': 1, 'eine': 1,
      'zwei': 2, 'zwöi': 2,
      'drei': 3, 'drü': 3,
      'vier': 4,
      'fünf': 5, 'föif': 5,
      'sechs': 6, 'sächs': 6,
      'sieben': 7, 'sibä': 7,
      'acht': 8,
      'neun': 9, 'nün': 9,
      'zehn': 10, 'zäh': 10
    };
    
    // Try number mapping first
    const normalized = quantityStr.toLowerCase();
    if (numberMap[normalized]) {
      return numberMap[normalized];
    }
    
    // Try parsing as number
    const parsed = parseInt(quantityStr);
    if (!isNaN(parsed) && parsed > 0) {
      return Math.min(parsed, 99); // Maximum 99 items
    }
    
    return 1; // Default to 1
  }
  
  parseModifiers(modifierEntities) {
    return modifierEntities.map(entity => ({
      type: entity.category,
      value: entity.normalizedValue,
      price_adjustment: this.getModifierPriceAdjustment(entity)
    }));
  }
  
  getModifierPriceAdjustment(modifier) {
    // Swiss-specific modifier pricing
    const adjustments = {
      'extra_cheese': 2.00,
      'extra_sauce': 1.00,
      'large_size': 3.00,
      'small_size': -2.00,
      'extra_spicy': 0.50
    };
    
    return adjustments[modifier.normalizedValue] || 0;
  }
  
  calculatePrice(product, quantity, modifiers) {
    let basePrice = product.price * quantity;
    
    // Add modifier adjustments
    const modifierAdjustment = modifiers.reduce((total, modifier) => 
      total + (modifier.price_adjustment * quantity), 0
    );
    
    return basePrice + modifierAdjustment;
  }
  
  calculateOrderTotals(cartItems, context) {
    const subtotal = cartItems.reduce((total, item) => total + item.price, 0);
    const tax = subtotal * this.config.SWISS_CONFIG.tax_rate;
    
    // Calculate delivery fee based on location
    const deliveryFee = this.calculateDeliveryFee(subtotal, context.location);
    
    const total = subtotal + tax + deliveryFee;
    
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      deliveryFee: Math.round(deliveryFee * 100) / 100,
      total: Math.round(total * 100) / 100,
      currency: this.config.SWISS_CONFIG.currency
    };
  }
  
  calculateDeliveryFee(subtotal, location) {
    const locationKey = location?.city?.toLowerCase() || 'zurich';
    const deliveryConfig = this.config.SWISS_CONFIG.delivery_zones[locationKey] || 
                          this.config.SWISS_CONFIG.delivery_zones.zurich;
    
    if (subtotal >= deliveryConfig.free_threshold) {
      return 0;
    }
    
    return deliveryConfig.base_fee;
  }
  
  isWithinBusinessHours() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const hours = isWeekend ? 
      this.config.SWISS_CONFIG.business_hours.weekend : 
      this.config.SWISS_CONFIG.business_hours.weekday;
    
    const openTime = parseInt(hours.open.replace(':', ''));
    const closeTime = parseInt(hours.close.replace(':', ''));
    
    return currentTime >= openTime && currentTime <= closeTime;
  }
  
  formatMessage(key, params = {}) {
    const language = this.state.currentLanguage;
    const messages = this.config.RESPONSES[language] || this.config.RESPONSES['de-CH'];
    
    const template = this.getNestedValue(messages, key);
    if (!template) {
      return `Message not found: ${key}`;
    }
    
    // Replace parameters
    return template.replace(/\{(\w+)\}/g, (match, param) => params[param] || match);
  }
  
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
  
  // ============================================================================
  // QUEUE MANAGEMENT
  // ============================================================================
  
  insertIntoQueue(queueItem) {
    // Insert based on priority (lower number = higher priority)
    let insertIndex = 0;
    for (let i = 0; i < this.state.executionQueue.length; i++) {
      if (this.state.executionQueue[i].priority > queueItem.priority) {
        break;
      }
      insertIndex = i + 1;
    }
    
    this.state.executionQueue.splice(insertIndex, 0, queueItem);
  }
  
  async processQueue() {
    if (this.state.executionQueue.length === 0) return;
    
    const item = this.state.executionQueue.shift();
    
    try {
      const result = await this.executeImmediate(item);
      item.resolve(result);
    } catch (error) {
      item.reject(error);
    }
  }
  
  getCommandPriority(intentName) {
    for (const [category, config] of Object.entries(this.config.CATEGORIES)) {
      if (config.commands.includes(intentName)) {
        return config.priority;
      }
    }
    return this.config.CATEGORIES.NORMAL.priority;
  }
  
  // ============================================================================
  // CACHING
  // ============================================================================
  
  generateCacheKey(intent, entities) {
    const entityStr = entities.map(e => `${e.type}:${e.value}`).join(',');
    return `${intent.name}|${entityStr}`;
  }
  
  shouldCache(intent, result) {
    // Cache successful inquiry results
    if (intent.name === 'inquiry' && result.success) {
      return true;
    }
    
    // Don't cache user-specific or time-sensitive commands
    const nonCacheableCommands = ['checkout', 'add_product', 'remove_product'];
    return !nonCacheableCommands.includes(intent.name);
  }
  
  cacheResult(key, result) {
    this.cache.set(key, { ...result });
    this.cacheTimestamps.set(key, Date.now());
  }
  
  isCacheValid(key) {
    const timestamp = this.cacheTimestamps.get(key);
    if (!timestamp) return false;
    
    return Date.now() - timestamp < this.config.PERFORMANCE.cache_ttl;
  }
  
  cleanupCache() {
    const now = Date.now();
    const keysToDelete = [];
    
    this.cacheTimestamps.forEach((timestamp, key) => {
      if (now - timestamp > this.config.PERFORMANCE.cache_ttl) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.cacheTimestamps.delete(key);
    });
  }
  
  // ============================================================================
  // METRICS & ANALYTICS
  // ============================================================================
  
  updateCommandMetrics(result, executionTime) {
    this.metrics.totalCommands++;
    
    if (result.success) {
      this.metrics.successfulCommands++;
    }
    
    // Update average execution time
    this.metrics.averageExecutionTime = 
      (this.metrics.averageExecutionTime * (this.metrics.totalCommands - 1) + executionTime) 
      / this.metrics.totalCommands;
    
    // Update command type metrics
    const commandType = result.action;
    const current = this.metrics.commandsByType.get(commandType) || 0;
    this.metrics.commandsByType.set(commandType, current + 1);
  }
  
  updateErrorMetrics(error) {
    const errorType = error.code || 'UNKNOWN_ERROR';
    const current = this.metrics.errorsByType.get(errorType) || 0;
    this.metrics.errorsByType.set(errorType, current + 1);
  }
  
  updatePerformanceMetrics() {
    this.emit('metricsUpdate', {
      ...this.metrics,
      queueSize: this.state.executionQueue.length,
      cacheSize: this.cache.size,
      activeTransactions: this.transactions.size
    });
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      queueSize: this.state.executionQueue.length,
      cacheSize: this.cache.size,
      cacheHitRate: this.metrics.totalCommands > 0 ? 
        (this.metrics.totalCommands - this.metrics.failedCommands) / this.metrics.totalCommands : 0,
      successRate: this.metrics.totalCommands > 0 ? 
        this.metrics.successfulCommands / this.metrics.totalCommands : 0
    };
  }
  
  // ============================================================================
  // UTILITY GENERATORS
  // ============================================================================
  
  generateCommandId() {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  generateBatchId() {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }
  
  createTransaction(cartItems, context) {
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.transactions.set(transactionId, {
      id: transactionId,
      items: cartItems,
      context,
      created: Date.now(),
      status: 'pending'
    });
    
    return transactionId;
  }
  
  addToHistory(commandContext, result) {
    this.state.commandHistory.push({
      ...commandContext,
      result,
      timestamp: Date.now()
    });
    
    // Keep only last 50 commands
    if (this.state.commandHistory.length > 50) {
      this.state.commandHistory.shift();
    }
  }
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  destroy() {
    console.log('🗑️ Destroying Voice Command Processor...');
    
    // Save user preferences
    try {
      localStorage.setItem('voice_command_preferences', JSON.stringify(this.state.userPreferences));
    } catch (error) {
      console.warn('Could not save preferences:', error);
    }
    
    // Clear caches and queues
    this.cache.clear();
    this.cacheTimestamps.clear();
    this.state.executionQueue = [];
    this.transactions.clear();
    
    // Remove all listeners
    this.removeAllListeners();
    
    // Reset state
    this.state.isInitialized = false;
    
    console.log('✅ Voice Command Processor destroyed');
  }
}

// ============================================================================
// FACTORY & EXPORT
// ============================================================================

let processorInstance = null;

export const createVoiceCommandProcessor = (options = {}) => {
  if (!processorInstance) {
    processorInstance = new VoiceCommandProcessor(options);
  }
  return processorInstance;
};

export const getVoiceCommandProcessor = () => {
  if (!processorInstance) {
    throw new Error('Voice Command Processor not initialized. Call createVoiceCommandProcessor first.');
  }
  return processorInstance;
};

export default VoiceCommandProcessor;