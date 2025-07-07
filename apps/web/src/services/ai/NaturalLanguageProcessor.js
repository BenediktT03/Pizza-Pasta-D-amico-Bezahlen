/**
 * EATECH - Natural Language Processor Service
 * Version: 5.0.0
 * Description: AI-powered NLP for voice command interpretation with Swiss context
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/services/ai/NaturalLanguageProcessor.js
 * 
 * Features:
 * - Intent classification and entity extraction
 * - Swiss German dialect processing
 * - Context-aware command interpretation
 * - Multi-language support (DE/FR/IT/EN)
 * - Food-specific vocabulary optimization
 * - Real-time confidence scoring
 * - Fallback and error handling
 * - Performance monitoring
 */

// ============================================================================
// IMPORTS & DEPENDENCIES
// ============================================================================

import EventEmitter from 'events';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const NLP_CONFIG = {
  // Intent Categories
  INTENTS: {
    ORDER: {
      name: 'order',
      confidence: 0.8,
      patterns: {
        'de-CH': [
          /ich (möchte|hätte gern|will|würde gern)/i,
          /bestell(en)?/i,
          /(kauf|nimm|hätt gern)/i,
          /gib mir/i,
          /ich nehme/i
        ],
        'de-DE': [
          /ich (möchte|hätte gerne|will|würde gerne)/i,
          /bestell(en)?/i,
          /kaufen/i,
          /ich nehme/i
        ],
        'fr-CH': [
          /je (veux|voudrais|prends)/i,
          /commander/i,
          /acheter/i
        ],
        'it-CH': [
          /voglio/i,
          /vorrei/i,
          /ordinare/i,
          /comprare/i
        ],
        'en-US': [
          /i (want|would like|need)/i,
          /order/i,
          /buy/i,
          /get me/i
        ]
      },
      entities: ['product', 'quantity', 'modifier']
    },
    
    REMOVE: {
      name: 'remove',
      confidence: 0.85,
      patterns: {
        'de-CH': [
          /(entfern|lösch|nimm weg)/i,
          /nicht mehr/i,
          /cancel/i
        ],
        'de-DE': [
          /(entfernen|löschen|wegnehmen)/i,
          /stornieren/i
        ],
        'fr-CH': [
          /(enlever|supprimer|retirer)/i,
          /annuler/i
        ],
        'it-CH': [
          /(rimuovere|cancellare)/i,
          /togliere/i
        ],
        'en-US': [
          /(remove|delete|cancel)/i,
          /take away/i
        ]
      },
      entities: ['product', 'quantity']
    },
    
    INQUIRY: {
      name: 'inquiry',
      confidence: 0.75,
      patterns: {
        'de-CH': [
          /(was kostet|preis von|wie viel)/i,
          /(info|details|beschreibung)/i,
          /(allergen|inhaltsstoff)/i,
          /was ist/i
        ],
        'de-DE': [
          /(was kostet|preis|wie teuer)/i,
          /(information|details)/i,
          /allergene/i
        ],
        'fr-CH': [
          /(prix|coût|combien)/i,
          /(info|détails)/i,
          /allergènes/i
        ],
        'it-CH': [
          /(prezzo|costo|quanto)/i,
          /(info|dettagli)/i,
          /allergeni/i
        ],
        'en-US': [
          /(price|cost|how much)/i,
          /(info|details|description)/i,
          /(allergen|ingredient)/i
        ]
      },
      entities: ['product', 'inquiry_type']
    },
    
    NAVIGATION: {
      name: 'navigation',
      confidence: 0.8,
      patterns: {
        'de-CH': [
          /(zeig|gah zu|öffne)/i,
          /(zurück|weiter)/i,
          /(menu|menü|speisekarte)/i,
          /(warenkorb|cart)/i
        ],
        'de-DE': [
          /(zeige|gehe zu|öffne)/i,
          /(zurück|weiter|vor)/i,
          /(menü|speisekarte)/i
        ],
        'fr-CH': [
          /(montrer|aller à|ouvrir)/i,
          /(retour|suivant)/i,
          /menu/i
        ],
        'it-CH': [
          /(mostra|vai a|apri)/i,
          /(indietro|avanti)/i,
          /menu/i
        ],
        'en-US': [
          /(show|go to|open)/i,
          /(back|forward|next)/i,
          /menu/i,
          /(cart|basket)/i
        ]
      },
      entities: ['target', 'direction']
    },
    
    CHECKOUT: {
      name: 'checkout',
      confidence: 0.9,
      patterns: {
        'de-CH': [
          /(bezahl|zahl|kauf)/i,
          /(bestätig|abschliess)/i,
          /checkout/i
        ],
        'de-DE': [
          /(bezahlen|zahlen)/i,
          /(bestätigen|abschließen)/i
        ],
        'fr-CH': [
          /(payer|régler)/i,
          /(confirmer|finaliser)/i
        ],
        'it-CH': [
          /(pagare|saldare)/i,
          /(confermare|finalizzare)/i
        ],
        'en-US': [
          /(pay|checkout|purchase)/i,
          /(confirm|finalize)/i
        ]
      },
      entities: ['payment_method']
    },
    
    CONTROL: {
      name: 'control',
      confidence: 0.95,
      patterns: {
        'de-CH': [
          /(stopp|halt|abbrech)/i,
          /(hilf|help)/i,
          /(wiederhol|nochmal)/i,
          /(lut|volume)/i
        ],
        'de-DE': [
          /(stopp|halt|abbrechen)/i,
          /hilfe/i,
          /(wiederholen|nochmal)/i,
          /(lauter|leiser)/i
        ],
        'fr-CH': [
          /(stop|arrêt|annuler)/i,
          /aide/i,
          /répéter/i
        ],
        'it-CH': [
          /(stop|ferma|annulla)/i,
          /aiuto/i,
          /ripetere/i
        ],
        'en-US': [
          /(stop|halt|cancel)/i,
          /help/i,
          /(repeat|again)/i,
          /(louder|quieter)/i
        ]
      },
      entities: ['control_type', 'parameter']
    }
  },
  
  // Entity Types
  ENTITIES: {
    PRODUCT: {
      type: 'product',
      patterns: {
        'de-CH': {
          pizza: ['pizza', 'margherita', 'quattro stagioni', 'diavola'],
          burger: ['burger', 'cheeseburger', 'hamburger', 'big mac'],
          sandwich: ['sandwich', 'panini', 'club sandwich'],
          salat: ['salat', 'caesar salad', 'grüner salat'],
          getränk: ['getränk', 'cola', 'bier', 'wasser', 'kaffee', 'tee'],
          dessert: ['dessert', 'glacé', 'kuchen', 'tiramisu'],
          schweizer: ['rösti', 'fondue', 'raclette', 'cervelat', 'bratwurst']
        }
      }
    },
    
    QUANTITY: {
      type: 'quantity',
      patterns: {
        'de-CH': {
          numbers: ['ein', 'eins', 'eis', 'zwei', 'zwöi', 'drei', 'drü', 'vier', 'füf', 'fünf'],
          modifiers: ['klein', 'gross', 'mittel', 'extra', 'doppelt']
        }
      }
    },
    
    MODIFIER: {
      type: 'modifier',
      patterns: {
        'de-CH': {
          size: ['klein', 'gross', 'mittel', 'xl', 'large', 'small'],
          preparation: ['heiss', 'kalt', 'warm', 'extra scharf', 'mild'],
          extras: ['extra käse', 'ohne zwiebel', 'mit sauce', 'ohne sauce']
        }
      }
    },
    
    PAYMENT_METHOD: {
      type: 'payment_method',
      patterns: {
        'de-CH': {
          methods: ['twint', 'kreditkarte', 'bargeld', 'paypal', 'apple pay', 'google pay']
        }
      }
    }
  },
  
  // Swiss German specific mappings
  SWISS_GERMAN: {
    foodItems: {
      'rösti': { standard: 'rösti', category: 'main', price_range: '12-18' },
      'cervelat': { standard: 'cervelat', category: 'sausage', price_range: '4-8' },
      'bratwurst': { standard: 'bratwurst', category: 'sausage', price_range: '6-10' },
      'älplermagronen': { standard: 'älplermagronen', category: 'main', price_range: '14-20' },
      'zürcher geschnetzeltes': { standard: 'zürcher geschnetzeltes', category: 'main', price_range: '18-25' },
      'birchermüesli': { standard: 'birchermüesli', category: 'breakfast', price_range: '8-12' },
      'spätzli': { standard: 'spätzli', category: 'side', price_range: '6-10' }
    },
    
    quantities: {
      'eis': '1',
      'zwöi': '2',
      'drü': '3',
      'vier': '4',
      'föif': '5',
      'sächs': '6',
      'sibä': '7',
      'acht': '8',
      'nün': '9',
      'zäh': '10'
    },
    
    modifiers: {
      'gross': 'large',
      'chli': 'small',
      'mittel': 'medium',
      'extra': 'extra',
      'ohni': 'without',
      'mit': 'with',
      'heiss': 'hot',
      'chalt': 'cold'
    }
  },
  
  // Context weights
  CONTEXT_WEIGHTS: {
    current_page: 0.3,
    cart_contents: 0.2,
    user_history: 0.15,
    time_of_day: 0.1,
    seasonal: 0.05,
    trending: 0.1,
    location: 0.1
  },
  
  // Performance thresholds
  PERFORMANCE: {
    min_confidence: 0.6,
    max_processing_time: 300,
    cache_size: 1000,
    learning_rate: 0.1
  }
};

// ============================================================================
// MAIN NLP SERVICE CLASS
// ============================================================================

class NaturalLanguageProcessor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Configuration
    this.config = {
      ...NLP_CONFIG,
      ...options
    };
    
    // State
    this.state = {
      isInitialized: false,
      currentLanguage: 'de-CH',
      processingCache: new Map(),
      learningData: [],
      sessionContext: {},
      userProfile: null
    };
    
    // Performance metrics
    this.metrics = {
      totalProcessed: 0,
      averageProcessingTime: 0,
      averageConfidence: 0,
      intentAccuracy: new Map(),
      entityExtractionRate: 0,
      cacheHitRate: 0
    };
    
    // Learning system
    this.learningSystem = {
      correctPredictions: [],
      incorrectPredictions: [],
      userFeedback: [],
      adaptationRules: new Map()
    };
    
    // Initialize
    this.initialize();
  }
  
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  async initialize() {
    try {
      console.log('🧠 Initializing Natural Language Processor...');
      
      // Load pre-trained models (if available)
      await this.loadModels();
      
      // Setup caching
      this.setupCache();
      
      // Initialize learning system
      this.initializeLearning();
      
      // Load user profiles
      await this.loadUserProfiles();
      
      this.state.isInitialized = true;
      this.emit('initialized');
      
      console.log('✅ Natural Language Processor initialized successfully');
      
    } catch (error) {
      console.error('❌ NLP initialization failed:', error);
      this.emit('error', error);
      throw error;
    }
  }
  
  async loadModels() {
    // In a real implementation, this would load pre-trained models
    // For now, we use pattern-based classification
    console.log('📚 Loading NLP models...');
    
    // Simulate model loading
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('✅ Models loaded');
  }
  
  setupCache() {
    // LRU cache for processed commands
    this.cache = new Map();
    this.cacheOrder = [];
    this.maxCacheSize = this.config.PERFORMANCE.cache_size;
  }
  
  initializeLearning() {
    // Initialize adaptation system
    this.learningSystem.adaptationRules.set('swiss_german_boost', {
      condition: (language) => language === 'de-CH',
      adjustment: 0.1,
      description: 'Boost confidence for Swiss German patterns'
    });
    
    this.learningSystem.adaptationRules.set('food_context_boost', {
      condition: (context) => context.page?.includes('menu'),
      adjustment: 0.15,
      description: 'Boost food-related intents on menu page'
    });
  }
  
  async loadUserProfiles() {
    // Load user-specific learning data
    try {
      const savedProfile = localStorage.getItem('nlp_user_profile');
      if (savedProfile) {
        this.state.userProfile = JSON.parse(savedProfile);
      }
    } catch (error) {
      console.warn('Could not load user profile:', error);
    }
  }
  
  // ============================================================================
  // MAIN PROCESSING METHOD
  // ============================================================================
  
  async processCommand(text, context = {}) {
    const startTime = performance.now();
    
    try {
      if (!this.state.isInitialized) {
        throw new Error('NLP service not initialized');
      }
      
      // Check cache first
      const cacheKey = this.generateCacheKey(text, context);
      if (this.cache.has(cacheKey)) {
        this.metrics.cacheHitRate++;
        return this.cache.get(cacheKey);
      }
      
      // Preprocess text
      const preprocessed = await this.preprocessText(text, context);
      
      // Extract intents
      const intents = await this.extractIntents(preprocessed, context);
      
      // Extract entities
      const entities = await this.extractEntities(preprocessed, context);
      
      // Apply context weighting
      const contextualIntent = await this.applyContextWeighting(intents, entities, context);
      
      // Post-process and validate
      const result = await this.postProcessResult(contextualIntent, entities, context);
      
      // Cache result
      this.cacheResult(cacheKey, result);
      
      // Update metrics
      const processingTime = performance.now() - startTime;
      this.updateMetrics(processingTime, result);
      
      // Emit processing event
      this.emit('processed', {
        input: text,
        result,
        processingTime,
        context
      });
      
      return result;
      
    } catch (error) {
      console.error('NLP processing failed:', error);
      this.emit('error', error);
      
      // Return fallback result
      return {
        intent: { name: 'unknown', confidence: 0 },
        entities: [],
        confidence: 0,
        error: error.message,
        fallback: true
      };
    }
  }
  
  // ============================================================================
  // TEXT PREPROCESSING
  // ============================================================================
  
  async preprocessText(text, context) {
    let processed = text.toLowerCase().trim();
    
    // Remove punctuation and normalize whitespace
    processed = processed.replace(/[.,!?;:]/g, '').replace(/\s+/g, ' ');
    
    // Swiss German normalization
    if (context.language === 'de-CH') {
      processed = this.normalizeSwissGerman(processed);
    }
    
    // Context-specific preprocessing
    processed = this.applyContextualPreprocessing(processed, context);
    
    // Spelling correction (basic)
    processed = this.correctSpelling(processed, context);
    
    return {
      original: text,
      processed,
      language: context.language || this.state.currentLanguage
    };
  }
  
  normalizeSwissGerman(text) {
    const { foodItems, quantities, modifiers } = this.config.SWISS_GERMAN;
    
    let normalized = text;
    
    // Normalize food items
    Object.entries(foodItems).forEach(([swiss, info]) => {
      const pattern = new RegExp(`\\b${swiss}\\b`, 'gi');
      normalized = normalized.replace(pattern, info.standard);
    });
    
    // Normalize quantities
    Object.entries(quantities).forEach(([swiss, standard]) => {
      const pattern = new RegExp(`\\b${swiss}\\b`, 'gi');
      normalized = normalized.replace(pattern, standard);
    });
    
    // Normalize modifiers
    Object.entries(modifiers).forEach(([swiss, standard]) => {
      const pattern = new RegExp(`\\b${swiss}\\b`, 'gi');
      normalized = normalized.replace(pattern, standard);
    });
    
    return normalized;
  }
  
  applyContextualPreprocessing(text, context) {
    // Time-based adjustments
    if (context.timeOfDay) {
      if (context.timeOfDay < 11) {
        // Morning - boost breakfast terms
        text = text.replace(/kaffee/g, 'kaffee_morning_boost');
      } else if (context.timeOfDay > 17) {
        // Evening - boost dinner terms
        text = text.replace(/bier/g, 'bier_evening_boost');
      }
    }
    
    // Page context adjustments
    if (context.currentPage?.includes('menu')) {
      // On menu page, boost food-related terms
      text = text.replace(/(\w+(pizza|burger|salat)\w*)/gi, '$1_menu_boost');
    }
    
    return text;
  }
  
  correctSpelling(text, context) {
    // Basic spelling correction for common food terms
    const corrections = {
      'piza': 'pizza',
      'burguer': 'burger',
      'cofee': 'kaffee',
      'cafe': 'kaffee',
      'bred': 'brot',
      'chees': 'käse'
    };
    
    let corrected = text;
    Object.entries(corrections).forEach(([wrong, correct]) => {
      const pattern = new RegExp(`\\b${wrong}\\b`, 'gi');
      corrected = corrected.replace(pattern, correct);
    });
    
    return corrected;
  }
  
  // ============================================================================
  // INTENT EXTRACTION
  // ============================================================================
  
  async extractIntents(preprocessed, context) {
    const { processed, language } = preprocessed;
    const intents = [];
    
    // Check each intent category
    for (const [intentName, intentConfig] of Object.entries(this.config.INTENTS)) {
      const confidence = await this.calculateIntentConfidence(
        processed,
        intentConfig,
        language,
        context
      );
      
      if (confidence > 0) {
        intents.push({
          name: intentConfig.name,
          confidence,
          category: intentName,
          patterns: intentConfig.patterns[language] || []
        });
      }
    }
    
    // Sort by confidence
    intents.sort((a, b) => b.confidence - a.confidence);
    
    return intents;
  }
  
  async calculateIntentConfidence(text, intentConfig, language, context) {
    const patterns = intentConfig.patterns[language] || [];
    let maxConfidence = 0;
    
    // Check each pattern
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        let confidence = intentConfig.confidence;
        
        // Apply context boosts
        confidence = this.applyIntentBoosts(confidence, intentConfig.name, context);
        
        // Apply learning adjustments
        confidence = this.applyLearningAdjustments(confidence, intentConfig.name, context);
        
        maxConfidence = Math.max(maxConfidence, confidence);
      }
    }
    
    // Fuzzy matching for partial matches
    if (maxConfidence === 0) {
      maxConfidence = this.calculateFuzzyIntentMatch(text, patterns, intentConfig.confidence);
    }
    
    return Math.min(maxConfidence, 1.0);
  }
  
  applyIntentBoosts(confidence, intentName, context) {
    let boosted = confidence;
    
    // Context-based boosts
    if (context.currentPage?.includes('menu') && intentName === 'order') {
      boosted += 0.1;
    }
    
    if (context.cartItems?.length > 0 && intentName === 'checkout') {
      boosted += 0.15;
    }
    
    // Time-based boosts
    if (context.timeOfDay) {
      if (context.timeOfDay < 11 && intentName === 'order') {
        boosted += 0.05; // Breakfast boost
      }
    }
    
    // User history boosts
    if (this.state.userProfile?.preferredIntents?.includes(intentName)) {
      boosted += 0.08;
    }
    
    return boosted;
  }
  
  applyLearningAdjustments(confidence, intentName, context) {
    let adjusted = confidence;
    
    // Apply adaptation rules
    for (const [ruleName, rule] of this.learningSystem.adaptationRules) {
      if (rule.condition(context)) {
        adjusted += rule.adjustment;
      }
    }
    
    // User-specific adjustments
    if (this.state.userProfile?.intentAdjustments?.[intentName]) {
      adjusted += this.state.userProfile.intentAdjustments[intentName];
    }
    
    return Math.min(adjusted, 1.0);
  }
  
  calculateFuzzyIntentMatch(text, patterns, baseConfidence) {
    let maxSimilarity = 0;
    
    for (const pattern of patterns) {
      // Convert regex to string and calculate similarity
      const patternStr = pattern.source.toLowerCase();
      const similarity = this.calculateStringSimilarity(text, patternStr);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
    
    // Return reduced confidence for fuzzy matches
    return maxSimilarity > 0.6 ? baseConfidence * 0.6 * maxSimilarity : 0;
  }
  
  calculateStringSimilarity(str1, str2) {
    // Simple Levenshtein-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }
  
  levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill(0));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  // ============================================================================
  // ENTITY EXTRACTION
  // ============================================================================
  
  async extractEntities(preprocessed, context) {
    const { processed, language } = preprocessed;
    const entities = [];
    
    // Extract each entity type
    for (const [entityType, entityConfig] of Object.entries(this.config.ENTITIES)) {
      const extractedEntities = await this.extractEntityType(
        processed,
        entityConfig,
        language,
        context
      );
      entities.push(...extractedEntities);
    }
    
    // Resolve entity conflicts and normalize
    return this.resolveEntityConflicts(entities, context);
  }
  
  async extractEntityType(text, entityConfig, language, context) {
    const entities = [];
    const patterns = entityConfig.patterns[language] || {};
    
    for (const [category, items] of Object.entries(patterns)) {
      for (const item of items) {
        const regex = new RegExp(`\\b${item}\\b`, 'gi');
        const matches = [...text.matchAll(regex)];
        
        for (const match of matches) {
          entities.push({
            type: entityConfig.type,
            category,
            value: match[0],
            normalizedValue: item,
            position: {
              start: match.index,
              end: match.index + match[0].length
            },
            confidence: 0.9
          });
        }
      }
    }
    
    return entities;
  }
  
  resolveEntityConflicts(entities, context) {
    // Remove overlapping entities (keep highest confidence)
    const resolved = [];
    const sorted = entities.sort((a, b) => b.confidence - a.confidence);
    
    for (const entity of sorted) {
      const hasOverlap = resolved.some(existing => 
        this.entitiesOverlap(entity, existing)
      );
      
      if (!hasOverlap) {
        resolved.push(entity);
      }
    }
    
    return resolved;
  }
  
  entitiesOverlap(entity1, entity2) {
    const start1 = entity1.position.start;
    const end1 = entity1.position.end;
    const start2 = entity2.position.start;
    const end2 = entity2.position.end;
    
    return !(end1 <= start2 || end2 <= start1);
  }
  
  // ============================================================================
  // CONTEXT WEIGHTING
  // ============================================================================
  
  async applyContextWeighting(intents, entities, context) {
    if (intents.length === 0) {
      return { name: 'unknown', confidence: 0 };
    }
    
    const topIntent = intents[0];
    let adjustedConfidence = topIntent.confidence;
    
    // Apply context weights
    const weights = this.config.CONTEXT_WEIGHTS;
    
    // Current page context
    if (context.currentPage) {
      adjustedConfidence += this.calculatePageContextWeight(
        topIntent.name,
        context.currentPage,
        weights.current_page
      );
    }
    
    // Cart contents context
    if (context.cartItems?.length > 0) {
      adjustedConfidence += this.calculateCartContextWeight(
        topIntent.name,
        context.cartItems,
        weights.cart_contents
      );
    }
    
    // Time of day context
    if (context.timeOfDay) {
      adjustedConfidence += this.calculateTimeContextWeight(
        topIntent.name,
        entities,
        context.timeOfDay,
        weights.time_of_day
      );
    }
    
    // User history context
    if (this.state.userProfile?.orderHistory) {
      adjustedConfidence += this.calculateHistoryContextWeight(
        topIntent.name,
        entities,
        this.state.userProfile.orderHistory,
        weights.user_history
      );
    }
    
    return {
      ...topIntent,
      confidence: Math.min(adjustedConfidence, 1.0),
      contextAdjustments: {
        original: topIntent.confidence,
        adjusted: adjustedConfidence,
        factors: this.getContextFactors(context)
      }
    };
  }
  
  calculatePageContextWeight(intentName, currentPage, weight) {
    const pageIntentBoosts = {
      '/menu': { order: 0.2, inquiry: 0.1 },
      '/cart': { checkout: 0.3, remove: 0.2 },
      '/checkout': { checkout: 0.4 },
      '/profile': { navigation: 0.1 }
    };
    
    const boosts = pageIntentBoosts[currentPage] || {};
    return (boosts[intentName] || 0) * weight;
  }
  
  calculateCartContextWeight(intentName, cartItems, weight) {
    if (cartItems.length === 0) return 0;
    
    const cartIntentBoosts = {
      checkout: 0.3,
      remove: 0.2,
      order: -0.1 // Slight negative boost if cart is full
    };
    
    const boost = cartIntentBoosts[intentName] || 0;
    return boost * weight * Math.min(cartItems.length / 5, 1);
  }
  
  calculateTimeContextWeight(intentName, entities, timeOfDay, weight) {
    // Morning (6-11): breakfast items
    // Lunch (11-14): lunch items
    // Afternoon (14-17): snacks/drinks
    // Evening (17-22): dinner items
    
    const timeBoosts = {
      morning: { order: 0.1 },
      lunch: { order: 0.2, checkout: 0.1 },
      afternoon: { inquiry: 0.1 },
      evening: { order: 0.15, checkout: 0.1 }
    };
    
    let period = 'afternoon';
    if (timeOfDay < 11) period = 'morning';
    else if (timeOfDay < 14) period = 'lunch';
    else if (timeOfDay > 17) period = 'evening';
    
    const boosts = timeBoosts[period] || {};
    return (boosts[intentName] || 0) * weight;
  }
  
  calculateHistoryContextWeight(intentName, entities, orderHistory, weight) {
    // Analyze user's order patterns
    const intentFrequency = orderHistory.reduce((freq, order) => {
      freq[order.intent] = (freq[order.intent] || 0) + 1;
      return freq;
    }, {});
    
    const totalOrders = orderHistory.length;
    const intentRatio = (intentFrequency[intentName] || 0) / totalOrders;
    
    return intentRatio * weight * 0.5; // Max 50% of weight
  }
  
  getContextFactors(context) {
    return {
      page: context.currentPage,
      cartSize: context.cartItems?.length || 0,
      timeOfDay: context.timeOfDay,
      language: context.language,
      userReturning: !!this.state.userProfile
    };
  }
  
  // ============================================================================
  // POST-PROCESSING
  // ============================================================================
  
  async postProcessResult(intent, entities, context) {
    // Validate intent-entity compatibility
    const validatedEntities = this.validateIntentEntityCompatibility(intent, entities);
    
    // Add missing entities (if possible)
    const enrichedEntities = await this.enrichEntities(intent, validatedEntities, context);
    
    // Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(intent, enrichedEntities);
    
    // Generate response structure
    return {
      intent: {
        name: intent.name,
        confidence: intent.confidence,
        category: intent.category
      },
      entities: enrichedEntities,
      confidence: overallConfidence,
      metadata: {
        language: context.language,
        processingTime: performance.now(),
        contextFactors: intent.contextAdjustments?.factors,
        sessionId: context.sessionId
      },
      suggestions: await this.generateSuggestions(intent, enrichedEntities, context)
    };
  }
  
  validateIntentEntityCompatibility(intent, entities) {
    const compatibilityRules = {
      order: ['product', 'quantity', 'modifier'],
      remove: ['product', 'quantity'],
      inquiry: ['product', 'inquiry_type'],
      navigation: ['target', 'direction'],
      checkout: ['payment_method'],
      control: ['control_type', 'parameter']
    };
    
    const allowedTypes = compatibilityRules[intent.name] || [];
    
    return entities.filter(entity => 
      allowedTypes.includes(entity.type) || allowedTypes.length === 0
    );
  }
  
  async enrichEntities(intent, entities, context) {
    const enriched = [...entities];
    
    // Add default quantities if missing
    if (intent.name === 'order' && !entities.some(e => e.type === 'quantity')) {
      enriched.push({
        type: 'quantity',
        category: 'default',
        value: '1',
        normalizedValue: '1',
        confidence: 0.8,
        inferred: true
      });
    }
    
    // Add context-based entities
    if (context.currentPage?.includes('product/')) {
      const productId = context.currentPage.split('/').pop();
      if (!entities.some(e => e.type === 'product')) {
        enriched.push({
          type: 'product',
          category: 'contextual',
          value: productId,
          normalizedValue: productId,
          confidence: 0.7,
          inferred: true
        });
      }
    }
    
    return enriched;
  }
  
  calculateOverallConfidence(intent, entities) {
    let confidence = intent.confidence;
    
    // Reduce confidence if no entities found for intent that typically requires them
    const entityRequiredIntents = ['order', 'remove', 'inquiry'];
    if (entityRequiredIntents.includes(intent.name) && entities.length === 0) {
      confidence *= 0.6;
    }
    
    // Boost confidence if entities are found with high confidence
    const highConfidenceEntities = entities.filter(e => e.confidence > 0.8);
    if (highConfidenceEntities.length > 0) {
      confidence += 0.1 * Math.min(highConfidenceEntities.length / 3, 1);
    }
    
    return Math.min(confidence, 1.0);
  }
  
  async generateSuggestions(intent, entities, context) {
    const suggestions = [];
    
    // Intent-specific suggestions
    switch (intent.name) {
      case 'order':
        if (!entities.some(e => e.type === 'product')) {
          suggestions.push({
            type: 'clarification',
            message: 'Welches Produkt möchten Sie bestellen?',
            actions: ['show_menu', 'list_popular']
          });
        }
        break;
        
      case 'inquiry':
        if (!entities.some(e => e.type === 'product')) {
          suggestions.push({
            type: 'clarification',
            message: 'Zu welchem Produkt möchten Sie Informationen?',
            actions: ['show_menu', 'search_products']
          });
        }
        break;
        
      case 'unknown':
        suggestions.push({
          type: 'help',
          message: 'Ich habe Sie nicht verstanden. Versuchen Sie: "Ich möchte eine Pizza bestellen"',
          actions: ['show_examples', 'show_help']
        });
        break;
    }
    
    return suggestions;
  }
  
  // ============================================================================
  // CACHING
  // ============================================================================
  
  generateCacheKey(text, context) {
    const keyData = {
      text: text.toLowerCase().trim(),
      language: context.language,
      page: context.currentPage,
      cartSize: context.cartItems?.length || 0
    };
    
    return JSON.stringify(keyData);
  }
  
  cacheResult(key, result) {
    // Implement LRU cache
    if (this.cache.has(key)) {
      // Move to end
      const index = this.cacheOrder.indexOf(key);
      this.cacheOrder.splice(index, 1);
    } else if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest
      const oldest = this.cacheOrder.shift();
      this.cache.delete(oldest);
    }
    
    this.cache.set(key, result);
    this.cacheOrder.push(key);
  }
  
  // ============================================================================
  // METRICS & LEARNING
  // ============================================================================
  
  updateMetrics(processingTime, result) {
    this.metrics.totalProcessed++;
    
    // Update average processing time
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime * (this.metrics.totalProcessed - 1) + processingTime) 
      / this.metrics.totalProcessed;
    
    // Update average confidence
    this.metrics.averageConfidence = 
      (this.metrics.averageConfidence * (this.metrics.totalProcessed - 1) + result.confidence)
      / this.metrics.totalProcessed;
    
    // Update intent accuracy
    const intentName = result.intent.name;
    const current = this.metrics.intentAccuracy.get(intentName) || { count: 0, totalConfidence: 0 };
    current.count++;
    current.totalConfidence += result.confidence;
    this.metrics.intentAccuracy.set(intentName, current);
    
    // Update entity extraction rate
    if (result.entities.length > 0) {
      this.metrics.entityExtractionRate = 
        (this.metrics.entityExtractionRate * (this.metrics.totalProcessed - 1) + 1)
        / this.metrics.totalProcessed;
    } else {
      this.metrics.entityExtractionRate = 
        (this.metrics.entityExtractionRate * (this.metrics.totalProcessed - 1))
        / this.metrics.totalProcessed;
    }
  }
  
  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      maxCacheSize: this.maxCacheSize,
      intentAccuracyDetails: Object.fromEntries(
        Array.from(this.metrics.intentAccuracy.entries()).map(([intent, data]) => [
          intent,
          {
            count: data.count,
            averageConfidence: data.totalConfidence / data.count
          }
        ])
      )
    };
  }
  
  async train(trainingData) {
    // Add training data to learning system
    this.learningSystem.correctPredictions.push(...trainingData.correct || []);
    this.learningSystem.incorrectPredictions.push(...trainingData.incorrect || []);
    
    // Analyze patterns and update adaptation rules
    await this.updateAdaptationRules();
    
    console.log('📈 NLP model updated with new training data');
  }
  
  async updateAdaptationRules() {
    // Analyze incorrect predictions to identify patterns
    const incorrectByIntent = {};
    
    this.learningSystem.incorrectPredictions.forEach(prediction => {
      const intent = prediction.expectedIntent;
      if (!incorrectByIntent[intent]) {
        incorrectByIntent[intent] = [];
      }
      incorrectByIntent[intent].push(prediction);
    });
    
    // Create new adaptation rules based on patterns
    Object.entries(incorrectByIntent).forEach(([intent, predictions]) => {
      if (predictions.length >= 5) {
        // Create rule to boost this intent in similar contexts
        const contexts = predictions.map(p => p.context);
        const commonContext = this.findCommonContext(contexts);
        
        if (commonContext) {
          this.learningSystem.adaptationRules.set(`learned_${intent}_${Date.now()}`, {
            condition: (context) => this.matchesContext(context, commonContext),
            adjustment: 0.1,
            description: `Learned boost for ${intent} in specific context`
          });
        }
      }
    });
  }
  
  findCommonContext(contexts) {
    // Find common patterns in contexts
    const commonProps = {};
    
    contexts.forEach(context => {
      Object.keys(context).forEach(key => {
        if (!commonProps[key]) {
          commonProps[key] = [];
        }
        commonProps[key].push(context[key]);
      });
    });
    
    // Find properties that appear in most contexts
    const threshold = Math.ceil(contexts.length * 0.6);
    const common = {};
    
    Object.entries(commonProps).forEach(([key, values]) => {
      const uniqueValues = [...new Set(values)];
      if (uniqueValues.length === 1 && values.length >= threshold) {
        common[key] = uniqueValues[0];
      }
    });
    
    return Object.keys(common).length > 0 ? common : null;
  }
  
  matchesContext(context, pattern) {
    return Object.entries(pattern).every(([key, value]) => context[key] === value);
  }
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  destroy() {
    console.log('🗑️ Destroying Natural Language Processor...');
    
    // Save user profile
    if (this.state.userProfile) {
      try {
        localStorage.setItem('nlp_user_profile', JSON.stringify(this.state.userProfile));
      } catch (error) {
        console.warn('Could not save user profile:', error);
      }
    }
    
    // Clear cache
    this.cache.clear();
    this.cacheOrder = [];
    
    // Remove listeners
    this.removeAllListeners();
    
    // Reset state
    this.state.isInitialized = false;
    
    console.log('✅ Natural Language Processor destroyed');
  }
}

// ============================================================================
// FACTORY & EXPORT
// ============================================================================

let processorInstance = null;

export const createNaturalLanguageProcessor = (options = {}) => {
  if (!processorInstance) {
    processorInstance = new NaturalLanguageProcessor(options);
  }
  return processorInstance;
};

export const getNaturalLanguageProcessor = () => {
  if (!processorInstance) {
    throw new Error('Natural Language Processor not initialized. Call createNaturalLanguageProcessor first.');
  }
  return processorInstance;
};

export default NaturalLanguageProcessor;