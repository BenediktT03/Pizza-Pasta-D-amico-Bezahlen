/**
 * EATECH - Voice Command Processor Service
 * Version: 4.5.0
 * Description: Advanced voice command processing engine with context awareness and machine learning
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/features/voice/services/VoiceCommandProcessor.js
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const PROCESSING_STAGES = {
  PREPROCESSING: 'preprocessing',
  INTENT_RECOGNITION: 'intent_recognition',
  ENTITY_EXTRACTION: 'entity_extraction',
  CONTEXT_ANALYSIS: 'context_analysis',
  COMMAND_VALIDATION: 'command_validation',
  EXECUTION_PLANNING: 'execution_planning',
  RESULT_FORMATTING: 'result_formatting'
};

const CONFIDENCE_LEVELS = {
  VERY_HIGH: 0.9,
  HIGH: 0.8,
  MEDIUM: 0.7,
  LOW: 0.5,
  VERY_LOW: 0.3
};

const INTENT_CATEGORIES = {
  NAVIGATION: 'navigation',
  TRANSACTION: 'transaction',
  INFORMATION: 'information',
  CONTROL: 'control',
  CREATION: 'creation',
  MODIFICATION: 'modification',
  DELETION: 'deletion',
  SEARCH: 'search',
  SYSTEM: 'system'
};

const ENTITY_TYPES = {
  PRODUCT: 'product',
  QUANTITY: 'quantity',
  PRICE: 'price',
  TIME: 'time',
  DATE: 'date',
  PERSON: 'person',
  LOCATION: 'location',
  TABLE: 'table',
  ORDER: 'order',
  PAYMENT_METHOD: 'payment_method',
  CURRENCY: 'currency'
};

const CONTEXT_FACTORS = {
  USER_HISTORY: 'user_history',
  CURRENT_PAGE: 'current_page',
  CART_STATE: 'cart_state',
  ORDER_STATE: 'order_state',
  TIME_OF_DAY: 'time_of_day',
  USER_PREFERENCES: 'user_preferences',
  BUSINESS_RULES: 'business_rules',
  SEASONAL_FACTORS: 'seasonal_factors'
};

const EXECUTION_STRATEGIES = {
  IMMEDIATE: 'immediate',
  QUEUED: 'queued',
  CONFIRMED: 'confirmed',
  SCHEDULED: 'scheduled',
  CONDITIONAL: 'conditional'
};

// ============================================================================
// VOICE COMMAND PROCESSOR CLASS
// ============================================================================

export class VoiceCommandProcessor {
  constructor(options = {}) {
    this.language = options.language || 'de-CH';
    this.confidenceThreshold = options.confidenceThreshold || CONFIDENCE_LEVELS.MEDIUM;
    this.enableMachineLearning = options.enableMachineLearning !== false;
    this.enableContextAwareness = options.enableContextAwareness !== false;
    this.enableUserPersonalization = options.enableUserPersonalization !== false;
    
    // Processing configuration
    this.maxProcessingTime = options.maxProcessingTime || 5000;
    this.enableParallelProcessing = options.enableParallelProcessing !== false;
    this.enableCaching = options.enableCaching !== false;
    
    // Machine Learning models
    this.intentClassifier = null;
    this.entityExtractor = null;
    this.contextAnalyzer = null;
    this.userProfiler = null;
    
    // Natural Language Processing
    this.nlpProcessor = null;
    this.swissGermanProcessor = null;
    
    // Context management
    this.contextManager = null;
    this.conversationHistory = [];
    this.userProfile = null;
    
    // Command registry
    this.commandRegistry = new Map();
    this.customCommands = new Map();
    this.commandGroups = new Map();
    
    // Processing pipeline
    this.processingPipeline = [];
    this.middlewares = [];
    
    // Performance monitoring
    this.performanceMetrics = {
      totalCommands: 0,
      successfulCommands: 0,
      failedCommands: 0,
      averageProcessingTime: 0,
      confidenceDistribution: new Map(),
      intentDistribution: new Map(),
      errorTypes: new Map()
    };
    
    // Caching
    this.processedCommandsCache = new Map();
    this.intentCache = new Map();
    this.entityCache = new Map();
    
    // Event handling
    this.eventHandlers = new Map();
    
    this.initialize();
  }
  
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  async initialize() {
    try {
      // Initialize NLP components
      await this.initializeNLP();
      
      // Load machine learning models
      if (this.enableMachineLearning) {
        await this.loadMLModels();
      }
      
      // Initialize context management
      if (this.enableContextAwareness) {
        await this.initializeContextManagement();
      }
      
      // Build processing pipeline
      this.buildProcessingPipeline();
      
      // Register default commands
      this.registerDefaultCommands();
      
      console.log('VoiceCommandProcessor initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize VoiceCommandProcessor:', error);
      throw error;
    }
  }
  
  async initializeNLP() {
    try {
      // Initialize NLP processor
      const { NaturalLanguageProcessor } = await import('./NaturalLanguageProcessor');
      this.nlpProcessor = new NaturalLanguageProcessor({
        language: this.language,
        enableSwissGerman: this.language.includes('CH')
      });
      
      // Initialize Swiss German processor if needed
      if (this.language.includes('CH')) {
        const { SwissGermanProcessor } = await import('../utils/SwissGermanProcessor');
        this.swissGermanProcessor = new SwissGermanProcessor();
      }
      
      console.log('NLP components initialized');
    } catch (error) {
      console.error('Failed to initialize NLP:', error);
    }
  }
  
  async loadMLModels() {
    try {
      // Load intent classification model
      this.intentClassifier = await this.loadIntentClassifier();
      
      // Load entity extraction model
      this.entityExtractor = await this.loadEntityExtractor();
      
      // Load context analyzer
      this.contextAnalyzer = await this.loadContextAnalyzer();
      
      // Load user profiler if personalization is enabled
      if (this.enableUserPersonalization) {
        this.userProfiler = await this.loadUserProfiler();
      }
      
      console.log('ML models loaded successfully');
    } catch (error) {
      console.error('Failed to load ML models:', error);
      this.enableMachineLearning = false;
    }
  }
  
  async loadIntentClassifier() {
    // Mock intent classifier - in production, load actual ML model
    return {
      classify: async (text) => {
        const intents = this.getKnownIntents();
        const matches = intents.filter(intent => 
          text.toLowerCase().includes(intent.keywords.find(k => text.toLowerCase().includes(k)))
        );
        
        if (matches.length > 0) {
          return {
            intent: matches[0].name,
            confidence: 0.85,
            alternatives: matches.slice(1, 3)
          };
        }
        
        return { intent: 'unknown', confidence: 0.1, alternatives: [] };
      }
    };
  }
  
  async loadEntityExtractor() {
    // Mock entity extractor
    return {
      extract: async (text) => {
        const entities = [];
        
        // Extract quantities
        const quantityMatch = text.match(/(\d+)\s*(stück|mal|x)?/i);
        if (quantityMatch) {
          entities.push({
            type: ENTITY_TYPES.QUANTITY,
            value: parseInt(quantityMatch[1]),
            start: quantityMatch.index,
            end: quantityMatch.index + quantityMatch[0].length
          });
        }
        
        // Extract prices
        const priceMatch = text.match(/(\d+(?:\.\d{2})?)\s*(chf|franken?|€|euro?)/i);
        if (priceMatch) {
          entities.push({
            type: ENTITY_TYPES.PRICE,
            value: parseFloat(priceMatch[1]),
            currency: priceMatch[2],
            start: priceMatch.index,
            end: priceMatch.index + priceMatch[0].length
          });
        }
        
        // Extract table numbers
        const tableMatch = text.match(/tisch\s*(\d+)/i);
        if (tableMatch) {
          entities.push({
            type: ENTITY_TYPES.TABLE,
            value: parseInt(tableMatch[1]),
            start: tableMatch.index,
            end: tableMatch.index + tableMatch[0].length
          });
        }
        
        return entities;
      }
    };
  }
  
  async loadContextAnalyzer() {
    // Mock context analyzer
    return {
      analyze: async (text, context) => {
        const score = this.calculateContextRelevance(text, context);
        
        return {
          relevanceScore: score,
          contextFactors: this.identifyContextFactors(text, context),
          recommendations: this.generateContextRecommendations(text, context)
        };
      }
    };
  }
  
  async loadUserProfiler() {
    // Mock user profiler
    return {
      updateProfile: (userId, commandData) => {
        // Update user preferences based on command usage
      },
      getPreferences: (userId) => {
        // Return user preferences for command interpretation
        return {};
      }
    };
  }
  
  async initializeContextManagement() {
    try {
      const { ContextManager } = await import('../utils/ContextManager');
      this.contextManager = new ContextManager();
      
      console.log('Context management initialized');
    } catch (error) {
      console.error('Failed to initialize context management:', error);
      this.enableContextAwareness = false;
    }
  }
  
  buildProcessingPipeline() {
    this.processingPipeline = [
      this.preprocessingStage.bind(this),
      this.intentRecognitionStage.bind(this),
      this.entityExtractionStage.bind(this),
      this.contextAnalysisStage.bind(this),
      this.commandValidationStage.bind(this),
      this.executionPlanningStage.bind(this),
      this.resultFormattingStage.bind(this)
    ];
  }
  
  // ============================================================================
  // COMMAND REGISTRATION
  // ============================================================================
  
  registerDefaultCommands() {
    // Navigation commands
    this.registerCommandGroup('navigation', [
      {
        name: 'navigate_home',
        patterns: ['startseite', 'home', 'hauptseite'],
        intent: 'navigation',
        category: INTENT_CATEGORIES.NAVIGATION,
        confidence: 0.9,
        execution: async () => ({ action: 'navigate', target: '/' })
      },
      {
        name: 'navigate_menu',
        patterns: ['menü', 'menu', 'speisekarte'],
        intent: 'navigation',
        category: INTENT_CATEGORIES.NAVIGATION,
        confidence: 0.9,
        execution: async () => ({ action: 'navigate', target: '/menu' })
      }
    ]);
    
    // Order commands
    this.registerCommandGroup('orders', [
      {
        name: 'add_to_cart',
        patterns: ['hinzufügen', 'bestellen', 'add', 'order'],
        intent: 'add_item',
        category: INTENT_CATEGORIES.TRANSACTION,
        confidence: 0.85,
        requiredEntities: [ENTITY_TYPES.PRODUCT],
        optionalEntities: [ENTITY_TYPES.QUANTITY],
        execution: async (entities) => ({
          action: 'add_to_cart',
          product: entities.product,
          quantity: entities.quantity || 1
        })
      },
      {
        name: 'checkout',
        patterns: ['bezahlen', 'checkout', 'kasse', 'zahlen'],
        intent: 'checkout',
        category: INTENT_CATEGORIES.TRANSACTION,
        confidence: 0.9,
        execution: async () => ({ action: 'navigate', target: '/checkout' })
      }
    ]);
    
    // Information commands
    this.registerCommandGroup('information', [
      {
        name: 'product_info',
        patterns: ['was ist', 'information', 'details', 'beschreibung'],
        intent: 'get_info',
        category: INTENT_CATEGORIES.INFORMATION,
        confidence: 0.8,
        requiredEntities: [ENTITY_TYPES.PRODUCT],
        execution: async (entities) => ({
          action: 'show_product_info',
          product: entities.product
        })
      }
    ]);
  }
  
  registerCommand(command) {
    this.commandRegistry.set(command.name, {
      ...command,
      registeredAt: Date.now()
    });
  }
  
  registerCommandGroup(groupName, commands) {
    this.commandGroups.set(groupName, commands);
    commands.forEach(command => this.registerCommand(command));
  }
  
  registerCustomCommand(userId, command) {
    const userCommands = this.customCommands.get(userId) || new Map();
    userCommands.set(command.name, {
      ...command,
      isCustom: true,
      userId,
      createdAt: Date.now()
    });
    this.customCommands.set(userId, userCommands);
  }
  
  // ============================================================================
  // MAIN PROCESSING METHOD
  // ============================================================================
  
  async processCommand(input, context = {}) {
    const startTime = Date.now();
    this.performanceMetrics.totalCommands++;
    
    try {
      // Create processing context
      const processingContext = {
        input,
        originalInput: input,
        context,
        userId: context.userId,
        timestamp: startTime,
        language: this.language,
        stage: null,
        confidence: 0,
        intent: null,
        entities: [],
        command: null,
        executionPlan: null,
        result: null,
        errors: [],
        warnings: []
      };
      
      // Check cache first
      const cacheKey = this.generateCacheKey(input, context);
      const cachedResult = this.getCachedResult(cacheKey);
      
      if (cachedResult && this.enableCaching) {
        this.performanceMetrics.successfulCommands++;
        return {
          ...cachedResult,
          cached: true,
          processingTime: Date.now() - startTime
        };
      }
      
      // Run through processing pipeline
      for (const stage of this.processingPipeline) {
        await stage(processingContext);
        
        // Check for early termination conditions
        if (processingContext.errors.length > 0 && 
            processingContext.confidence < this.confidenceThreshold) {
          break;
        }
        
        // Timeout check
        if (Date.now() - startTime > this.maxProcessingTime) {
          throw new Error('Processing timeout exceeded');
        }
      }
      
      // Cache successful result
      if (processingContext.result && this.enableCaching) {
        this.cacheResult(cacheKey, processingContext.result);
      }
      
      // Update performance metrics
      const processingTime = Date.now() - startTime;
      this.updatePerformanceMetrics(processingContext, processingTime);
      
      // Add to conversation history
      this.addToConversationHistory(processingContext);
      
      return {
        ...processingContext.result,
        processingTime,
        confidence: processingContext.confidence,
        intent: processingContext.intent,
        entities: processingContext.entities,
        warnings: processingContext.warnings
      };
      
    } catch (error) {
      console.error('Command processing failed:', error);
      this.performanceMetrics.failedCommands++;
      
      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }
  
  // ============================================================================
  // PROCESSING STAGES
  // ============================================================================
  
  async preprocessingStage(context) {
    context.stage = PROCESSING_STAGES.PREPROCESSING;
    
    try {
      let processedInput = context.input.trim().toLowerCase();
      
      // Swiss German processing
      if (this.swissGermanProcessor && this.language.includes('CH')) {
        processedInput = this.swissGermanProcessor.processTranscript(processedInput);
      }
      
      // Text normalization
      processedInput = this.normalizeText(processedInput);
      
      // Apply user-specific preprocessing
      if (context.userId && this.userProfiler) {
        const userPrefs = this.userProfiler.getPreferences(context.userId);
        processedInput = this.applyUserPreprocessing(processedInput, userPrefs);
      }
      
      context.input = processedInput;
      
    } catch (error) {
      context.errors.push({
        stage: PROCESSING_STAGES.PREPROCESSING,
        error: error.message
      });
    }
  }
  
  async intentRecognitionStage(context) {
    context.stage = PROCESSING_STAGES.INTENT_RECOGNITION;
    
    try {
      let intentResult;
      
      // Use ML model if available
      if (this.intentClassifier && this.enableMachineLearning) {
        intentResult = await this.intentClassifier.classify(context.input);
      } else {
        // Fallback to pattern matching
        intentResult = await this.classifyIntentByPatterns(context.input);
      }
      
      context.intent = intentResult.intent;
      context.confidence = Math.max(context.confidence, intentResult.confidence);
      
      // Apply context boost
      if (this.enableContextAwareness && context.context) {
        const contextBoost = this.calculateContextBoost(intentResult.intent, context.context);
        context.confidence = Math.min(context.confidence + contextBoost, 1.0);
      }
      
    } catch (error) {
      context.errors.push({
        stage: PROCESSING_STAGES.INTENT_RECOGNITION,
        error: error.message
      });
    }
  }
  
  async entityExtractionStage(context) {
    context.stage = PROCESSING_STAGES.ENTITY_EXTRACTION;
    
    try {
      let entities = [];
      
      // Use ML model if available
      if (this.entityExtractor && this.enableMachineLearning) {
        entities = await this.entityExtractor.extract(context.input);
      } else {
        // Fallback to rule-based extraction
        entities = this.extractEntitiesByRules(context.input);
      }
      
      // Validate and enhance entities
      entities = this.validateEntities(entities, context);
      
      context.entities = entities;
      
    } catch (error) {
      context.errors.push({
        stage: PROCESSING_STAGES.ENTITY_EXTRACTION,
        error: error.message
      });
    }
  }
  
  async contextAnalysisStage(context) {
    context.stage = PROCESSING_STAGES.CONTEXT_ANALYSIS;
    
    if (!this.enableContextAwareness) return;
    
    try {
      const contextAnalysis = await this.contextAnalyzer.analyze(
        context.input,
        context.context
      );
      
      context.contextAnalysis = contextAnalysis;
      
      // Apply context-based confidence adjustment
      const contextConfidence = contextAnalysis.relevanceScore * 0.2;
      context.confidence = Math.min(context.confidence + contextConfidence, 1.0);
      
    } catch (error) {
      context.errors.push({
        stage: PROCESSING_STAGES.CONTEXT_ANALYSIS,
        error: error.message
      });
    }
  }
  
  async commandValidationStage(context) {
    context.stage = PROCESSING_STAGES.COMMAND_VALIDATION;
    
    try {
      // Find matching command
      const command = this.findMatchingCommand(context.intent, context.entities, context.userId);
      
      if (!command) {
        throw new Error(`No command found for intent: ${context.intent}`);
      }
      
      // Validate required entities
      if (command.requiredEntities) {
        const missingEntities = command.requiredEntities.filter(entityType =>
          !context.entities.some(entity => entity.type === entityType)
        );
        
        if (missingEntities.length > 0) {
          context.warnings.push(`Missing required entities: ${missingEntities.join(', ')}`);
          
          // Try to resolve from context
          const resolvedEntities = this.resolveEntitiesFromContext(missingEntities, context);
          context.entities.push(...resolvedEntities);
        }
      }
      
      context.command = command;
      
    } catch (error) {
      context.errors.push({
        stage: PROCESSING_STAGES.COMMAND_VALIDATION,
        error: error.message
      });
    }
  }
  
  async executionPlanningStage(context) {
    context.stage = PROCESSING_STAGES.EXECUTION_PLANNING;
    
    try {
      if (!context.command) {
        throw new Error('No valid command for execution planning');
      }
      
      const executionPlan = {
        command: context.command,
        strategy: this.determineExecutionStrategy(context),
        parameters: this.prepareExecutionParameters(context),
        validation: this.validateExecution(context),
        dependencies: this.identifyDependencies(context)
      };
      
      context.executionPlan = executionPlan;
      
    } catch (error) {
      context.errors.push({
        stage: PROCESSING_STAGES.EXECUTION_PLANNING,
        error: error.message
      });
    }
  }
  
  async resultFormattingStage(context) {
    context.stage = PROCESSING_STAGES.RESULT_FORMATTING;
    
    try {
      if (!context.executionPlan) {
        throw new Error('No execution plan for result formatting');
      }
      
      // Execute the command
      const executionResult = await this.executeCommand(context.executionPlan);
      
      // Format the result
      const formattedResult = {
        success: true,
        action: executionResult.action,
        data: executionResult.data || {},
        message: this.generateResponseMessage(context, executionResult),
        suggestions: this.generateSuggestions(context),
        nextActions: this.suggestNextActions(context)
      };
      
      context.result = formattedResult;
      
    } catch (error) {
      context.errors.push({
        stage: PROCESSING_STAGES.RESULT_FORMATTING,
        error: error.message
      });
      
      context.result = {
        success: false,
        error: error.message,
        suggestions: this.generateErrorRecoverySuggestions(context)
      };
    }
  }
  
  // ============================================================================
  // HELPER METHODS
  // ============================================================================
  
  normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/[.,!?;:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  async classifyIntentByPatterns(input) {
    let bestMatch = { intent: 'unknown', confidence: 0 };
    
    for (const [commandName, command] of this.commandRegistry.entries()) {
      const patternMatches = command.patterns?.filter(pattern =>
        input.includes(pattern.toLowerCase())
      ) || [];
      
      if (patternMatches.length > 0) {
        const confidence = command.confidence * (patternMatches.length / command.patterns.length);
        
        if (confidence > bestMatch.confidence) {
          bestMatch = {
            intent: command.intent,
            confidence,
            command: commandName
          };
        }
      }
    }
    
    return bestMatch;
  }
  
  extractEntitiesByRules(input) {
    const entities = [];
    
    // Product names (simplified)
    const productPatterns = [
      /pizza/i, /pasta/i, /salat/i, /suppe/i, /brot/i,
      /kaffee/i, /tee/i, /bier/i, /wein/i, /wasser/i
    ];
    
    productPatterns.forEach(pattern => {
      const match = input.match(pattern);
      if (match) {
        entities.push({
          type: ENTITY_TYPES.PRODUCT,
          value: match[0],
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.8
        });
      }
    });
    
    // Quantities
    const quantityMatch = input.match(/(\d+)\s*(stück|mal|x)?/i);
    if (quantityMatch) {
      entities.push({
        type: ENTITY_TYPES.QUANTITY,
        value: parseInt(quantityMatch[1]),
        start: quantityMatch.index,
        end: quantityMatch.index + quantityMatch[0].length,
        confidence: 0.9
      });
    }
    
    return entities;
  }
  
  validateEntities(entities, context) {
    return entities.filter(entity => {
      // Basic validation
      if (!entity.type || !entity.value) return false;
      
      // Type-specific validation
      switch (entity.type) {
        case ENTITY_TYPES.QUANTITY:
          return Number.isInteger(entity.value) && entity.value > 0;
        case ENTITY_TYPES.PRICE:
          return typeof entity.value === 'number' && entity.value >= 0;
        case ENTITY_TYPES.TABLE:
          return Number.isInteger(entity.value) && entity.value > 0 && entity.value <= 100;
        default:
          return true;
      }
    });
  }
  
  findMatchingCommand(intent, entities, userId = null) {
    // Check custom commands first
    if (userId && this.customCommands.has(userId)) {
      const userCommands = this.customCommands.get(userId);
      for (const [commandName, command] of userCommands.entries()) {
        if (command.intent === intent) {
          return command;
        }
      }
    }
    
    // Check registered commands
    for (const [commandName, command] of this.commandRegistry.entries()) {
      if (command.intent === intent) {
        return command;
      }
    }
    
    return null;
  }
  
  resolveEntitiesFromContext(missingEntityTypes, context) {
    const resolvedEntities = [];
    
    // Try to resolve from conversation history
    const recentContext = this.conversationHistory.slice(-3);
    
    for (const entityType of missingEntityTypes) {
      for (const previousContext of recentContext) {
        const entity = previousContext.entities?.find(e => e.type === entityType);
        if (entity) {
          resolvedEntities.push({
            ...entity,
            resolvedFromContext: true
          });
          break;
        }
      }
    }
    
    return resolvedEntities;
  }
  
  determineExecutionStrategy(context) {
    // Determine execution strategy based on command type and context
    if (context.command.category === INTENT_CATEGORIES.TRANSACTION) {
      return EXECUTION_STRATEGIES.CONFIRMED;
    }
    
    if (context.command.category === INTENT_CATEGORIES.NAVIGATION) {
      return EXECUTION_STRATEGIES.IMMEDIATE;
    }
    
    return EXECUTION_STRATEGIES.IMMEDIATE;
  }
  
  prepareExecutionParameters(context) {
    const parameters = {};
    
    // Map entities to parameters
    context.entities.forEach(entity => {
      parameters[entity.type] = entity.value;
    });
    
    // Add context information
    parameters.context = context.context;
    parameters.userId = context.userId;
    parameters.timestamp = context.timestamp;
    
    return parameters;
  }
  
  validateExecution(context) {
    const validation = {
      canExecute: true,
      blockers: [],
      warnings: []
    };
    
    // Check business rules
    if (context.command.category === INTENT_CATEGORIES.TRANSACTION) {
      if (!context.userId) {
        validation.blockers.push('User authentication required for transactions');
        validation.canExecute = false;
      }
    }
    
    return validation;
  }
  
  identifyDependencies(context) {
    const dependencies = [];
    
    // Add dependencies based on command type
    if (context.command.name === 'add_to_cart') {
      dependencies.push('product_availability_check');
      dependencies.push('price_validation');
    }
    
    if (context.command.name === 'checkout') {
      dependencies.push('cart_validation');
      dependencies.push('payment_method_validation');
    }
    
    return dependencies;
  }
  
  async executeCommand(executionPlan) {
    const { command, parameters } = executionPlan;
    
    if (!command.execution || typeof command.execution !== 'function') {
      throw new Error('Command has no execution function');
    }
    
    try {
      const result = await command.execution(parameters);
      return result;
    } catch (error) {
      throw new Error(`Command execution failed: ${error.message}`);
    }
  }
  
  generateResponseMessage(context, executionResult) {
    const templates = {
      'add_to_cart': 'Ich habe {quantity} {product} zum Warenkorb hinzugefügt.',
      'navigate_menu': 'Hier ist das Menü.',
      'checkout': 'Gehe zur Kasse.',
      'product_info': 'Hier sind die Informationen zu {product}.'
    };
    
    let template = templates[context.command.name] || 'Befehl wurde ausgeführt.';
    
    // Replace placeholders
    context.entities.forEach(entity => {
      template = template.replace(`{${entity.type}}`, entity.value);
    });
    
    return template;
  }
  
  generateSuggestions(context) {
    const suggestions = [];
    
    // Context-based suggestions
    if (context.command.name === 'add_to_cart') {
      suggestions.push('Möchten Sie zur Kasse gehen?');
      suggestions.push('Möchten Sie noch etwas hinzufügen?');
    }
    
    if (context.command.category === INTENT_CATEGORIES.NAVIGATION) {
      suggestions.push('Was möchten Sie als nächstes tun?');
    }
    
    return suggestions;
  }
  
  suggestNextActions(context) {
    const nextActions = [];
    
    if (context.command.name === 'add_to_cart') {
      nextActions.push({ action: 'checkout', label: 'Zur Kasse' });
      nextActions.push({ action: 'continue_shopping', label: 'Weiter einkaufen' });
    }
    
    return nextActions;
  }
  
  generateErrorRecoverySuggestions(context) {
    return [
      'Versuchen Sie es mit anderen Worten.',
      'Sagen Sie "Hilfe" für verfügbare Befehle.',
      'Sprechen Sie deutlicher und wiederholen Sie den Befehl.'
    ];
  }
  
  // ============================================================================
  // CACHING
  // ============================================================================
  
  generateCacheKey(input, context) {
    const keyData = {
      input: input.toLowerCase().trim(),
      userId: context.userId,
      language: this.language
    };
    
    return btoa(JSON.stringify(keyData)).replace(/[^a-zA-Z0-9]/g, '');
  }
  
  getCachedResult(key) {
    const cached = this.processedCommandsCache.get(key);
    
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes
      return cached.result;
    }
    
    return null;
  }
  
  cacheResult(key, result) {
    if (!this.enableCaching) return;
    
    this.processedCommandsCache.set(key, {
      result,
      timestamp: Date.now()
    });
    
    // Cleanup old cache entries
    if (this.processedCommandsCache.size > 100) {
      const oldestKey = this.processedCommandsCache.keys().next().value;
      this.processedCommandsCache.delete(oldestKey);
    }
  }
  
  // ============================================================================
  // PERFORMANCE & ANALYTICS
  // ============================================================================
  
  updatePerformanceMetrics(context, processingTime) {
    this.performanceMetrics.successfulCommands++;
    
    // Update average processing time
    const totalProcessed = this.performanceMetrics.successfulCommands;
    this.performanceMetrics.averageProcessingTime = 
      (this.performanceMetrics.averageProcessingTime * (totalProcessed - 1) + processingTime) / totalProcessed;
    
    // Update confidence distribution
    const confidenceBucket = Math.floor(context.confidence * 10) / 10;
    const currentCount = this.performanceMetrics.confidenceDistribution.get(confidenceBucket) || 0;
    this.performanceMetrics.confidenceDistribution.set(confidenceBucket, currentCount + 1);
    
    // Update intent distribution
    const intentCount = this.performanceMetrics.intentDistribution.get(context.intent) || 0;
    this.performanceMetrics.intentDistribution.set(context.intent, intentCount + 1);
  }
  
  addToConversationHistory(context) {
    this.conversationHistory.push({
      timestamp: context.timestamp,
      input: context.originalInput,
      intent: context.intent,
      entities: context.entities,
      confidence: context.confidence,
      result: context.result
    });
    
    // Keep only last 50 conversations
    if (this.conversationHistory.length > 50) {
      this.conversationHistory = this.conversationHistory.slice(-50);
    }
  }
  
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      successRate: this.performanceMetrics.totalCommands > 0 ?
        (this.performanceMetrics.successfulCommands / this.performanceMetrics.totalCommands * 100).toFixed(2) + '%' :
        '0%'
    };
  }
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  getKnownIntents() {
    return [
      {
        name: 'add_to_cart',
        keywords: ['hinzufügen', 'bestellen', 'kaufen', 'add', 'order']
      },
      {
        name: 'navigation',
        keywords: ['gehen', 'zeigen', 'öffnen', 'navigate', 'show']
      },
      {
        name: 'get_info',
        keywords: ['was ist', 'information', 'details', 'what is']
      },
      {
        name: 'checkout',
        keywords: ['bezahlen', 'checkout', 'kasse', 'payment']
      }
    ];
  }
  
  calculateContextRelevance(text, context) {
    // Simple context relevance calculation
    let score = 0.5; // Base score
    
    if (context.currentPage?.includes('menu') && text.includes('bestellen')) {
      score += 0.3;
    }
    
    if (context.cartItems?.length > 0 && text.includes('bezahlen')) {
      score += 0.3;
    }
    
    return Math.min(score, 1.0);
  }
  
  identifyContextFactors(text, context) {
    const factors = [];
    
    if (context.currentPage) {
      factors.push({
        type: CONTEXT_FACTORS.CURRENT_PAGE,
        value: context.currentPage,
        weight: 0.3
      });
    }
    
    if (context.cartItems) {
      factors.push({
        type: CONTEXT_FACTORS.CART_STATE,
        value: context.cartItems.length,
        weight: 0.2
      });
    }
    
    return factors;
  }
  
  generateContextRecommendations(text, context) {
    const recommendations = [];
    
    if (context.currentPage === '/menu' && !text.includes('bestell')) {
      recommendations.push('Consider using ordering-related commands');
    }
    
    return recommendations;
  }
  
  calculateContextBoost(intent, context) {
    let boost = 0;
    
    // Page-specific boosts
    if (context.currentPage === '/menu' && intent === 'add_to_cart') {
      boost += 0.2;
    }
    
    if (context.currentPage === '/cart' && intent === 'checkout') {
      boost += 0.3;
    }
    
    return boost;
  }
  
  // ============================================================================
  // EVENT HANDLING
  // ============================================================================
  
  on(event, callback) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(callback);
  }
  
  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  destroy() {
    this.processedCommandsCache.clear();
    this.intentCache.clear();
    this.entityCache.clear();
    this.conversationHistory = [];
    this.eventHandlers.clear();
    
    console.log('VoiceCommandProcessor destroyed');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default VoiceCommandProcessor;

export {
  PROCESSING_STAGES,
  CONFIDENCE_LEVELS,
  INTENT_CATEGORIES,
  ENTITY_TYPES,
  CONTEXT_FACTORS,
  EXECUTION_STRATEGIES
};