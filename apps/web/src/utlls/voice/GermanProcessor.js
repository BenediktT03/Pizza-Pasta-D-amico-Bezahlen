/**
 * EATECH - German Language Processor
 * Version: 4.1.0
 * Description: Advanced German language processing for voice recognition and TTS
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/utils/voice/GermanProcessor.js
 * 
 * Features:
 * - Standard German (de-DE) and Austrian German (de-AT) support
 * - Regional dialect recognition and processing
 * - Food and restaurant terminology optimization
 * - Phonetic corrections and word normalization
 * - Context-aware processing for restaurant orders
 * - Statistical tracking and confidence boosting
 */

// ============================================================================
// GERMAN LANGUAGE MAPPINGS & VOCABULARY
// ============================================================================

const REGIONAL_MAPPINGS = {
  // Standard German (Hochdeutsch)
  'de-DE': {
    'nee': 'nein',
    'nich': 'nicht',
    'wat': 'was',
    'det': 'das',
    'dit': 'das',
    'jut': 'gut',
    'ooch': 'auch',
    'uff': 'auf',
    'ma': 'mal',
    'ne': 'eine',
    'n': 'ein',
    'dann': 'dann',
    'kann': 'kann',
    'will': 'will',
    'soll': 'soll',
    'muss': 'muss',
    'hab': 'habe',
    'bin': 'bin',
    'is': 'ist',
    'sin': 'sind',
    'ham': 'haben',
    'warn': 'waren',
    'solln': 'sollen',
    'wolln': 'wollen',
    'müssn': 'müssen',
    'könn': 'können'
  },
  
  // Austrian German
  'de-AT': {
    'leiwand': 'toll',
    'geil': 'super',
    'ur': 'sehr',
    'schauma': 'schauen wir',
    'passt': 'okay',
    'eh': 'sowieso',
    'gschissn': 'schlecht',
    'fesch': 'hübsch',
    'deppert': 'dumm',
    'pfiat': 'tschüss',
    'servas': 'hallo',
    'griaß': 'grüß',
    'baba': 'tschüss',
    'hawara': 'freund',
    'oida': 'alter',
    'gscheit': 'gescheit',
    'hearst': 'hörst du',
    'wast': 'weißt',
    'host': 'hast',
    'sand': 'sind',
    'sama': 'sind wir',
    'hama': 'haben wir',
    'kama': 'können wir',
    'samma': 'sind wir mal'
  },
  
  // Bavarian (shared with Austrian)
  'de-BY': {
    'mia': 'wir',
    'dia': 'die',
    'des': 'das',
    'wos': 'was',
    'wo': 'wo',
    'wia': 'wie',
    'ois': 'alles',
    'nix': 'nichts',
    'ned': 'nicht',
    'net': 'nicht',
    'mog': 'mag',
    'ko': 'kann',
    'wui': 'will',
    'soi': 'soll',
    'muas': 'muss',
    'hob': 'habe',
    'bin': 'bin',
    'is': 'ist',
    'san': 'sind',
    'ham': 'haben',
    'worn': 'waren'
  }
};

const GERMAN_FOOD_TERMS = {
  // Hauptgerichte
  'schnitzel': 'schnitzel',
  'wiener schnitzel': 'wiener schnitzel',
  'bratwurst': 'bratwurst',
  'currywurst': 'currywurst',
  'döner': 'döner kebab',
  'döner kebab': 'döner kebab',
  'sauerbraten': 'sauerbraten',
  'schweinebraten': 'schweinebraten',
  'rinderbraten': 'rinderbraten',
  'kassler': 'kassler',
  'leberwurst': 'leberwurst',
  'weißwurst': 'weißwurst',
  'bockwurst': 'bockwurst',
  'knödel': 'knödel',
  'semmelknödel': 'semmelknödel',
  'spätzle': 'spätzle',
  'maultaschen': 'maultaschen',
  'flammkuchen': 'flammkuchen',
  'reibekuchen': 'reibekuchen',
  'kartoffelpuffer': 'kartoffelpuffer',
  
  // Beilagen
  'sauerkraut': 'sauerkraut',
  'rotkohl': 'rotkohl',
  'blaukraut': 'rotkohl',
  'kartoffelsalat': 'kartoffelsalat',
  'kartoffeln': 'kartoffeln',
  'pommes': 'pommes frites',
  'bratkartoffeln': 'bratkartoffeln',
  'kartoffelbrei': 'kartoffelbrei',
  'kartoffelpüree': 'kartoffelpüree',
  'nudeln': 'nudeln',
  
  // Snacks & Fast Food
  'currywurst pommes': 'currywurst mit pommes',
  'bratwurst senf': 'bratwurst mit senf',
  'fischbrötchen': 'fischbrötchen',
  'leberkäse': 'leberkäse',
  'fleischkäse': 'leberkäse',
  'leberkässemmel': 'leberkäse semmel',
  'brezel': 'brezel',
  'laugenstange': 'laugenstange',
  
  // Getränke
  'bier': 'bier',
  'weißbier': 'weißbier',
  'pils': 'pils',
  'kölsch': 'kölsch',
  'alt': 'altbier',
  'radler': 'radler',
  'alsterwasser': 'radler',
  'schorle': 'schorle',
  'apfelschorle': 'apfelschorle',
  'sprudel': 'mineralwasser',
  'selters': 'mineralwasser',
  'limo': 'limonade',
  'cola': 'cola',
  'fanta': 'fanta',
  'sprite': 'sprite',
  'kaffee': 'kaffee',
  'espresso': 'espresso',
  'cappuccino': 'cappuccino',
  'latte': 'latte macchiato',
  
  // Süßes
  'kuchen': 'kuchen',
  'torte': 'torte',
  'schwarzwälder': 'schwarzwälder kirschtorte',
  'apfelstrudel': 'apfelstrudel',
  'kaiserschmarrn': 'kaiserschmarrn',
  'pfannkuchen': 'pfannkuchen',
  'eierkuchen': 'pfannkuchen',
  'berliner': 'berliner',
  'krapfen': 'berliner',
  'lebkuchen': 'lebkuchen',
  'stollen': 'stollen'
};

const COMMON_GERMAN_WORDS = {
  // Numbers
  'eins': '1',
  'zwei': '2',
  'drei': '3',
  'vier': '4',
  'fünf': '5',
  'sechs': '6',
  'sieben': '7',
  'acht': '8',
  'neun': '9',
  'zehn': '10',
  'elf': '11',
  'zwölf': '12',
  'dreizehn': '13',
  'vierzehn': '14',
  'fünfzehn': '15',
  'sechzehn': '16',
  'siebzehn': '17',
  'achtzehn': '18',
  'neunzehn': '19',
  'zwanzig': '20',
  'dreißig': '30',
  'vierzig': '40',
  'fünfzig': '50',
  'sechzig': '60',
  'siebzig': '70',
  'achtzig': '80',
  'neunzig': '90',
  'hundert': '100',
  'tausend': '1000',
  
  // Common restaurant words
  'bestellen': 'bestellen',
  'bezahlen': 'bezahlen',
  'rechnung': 'rechnung',
  'zahlen': 'zahlen',
  'karte': 'speisekarte',
  'menü': 'menü',
  'vorspeise': 'vorspeise',
  'hauptgang': 'hauptgang',
  'nachspeise': 'nachspeise',
  'dessert': 'dessert',
  'getränk': 'getränk',
  'wasser': 'wasser',
  'ohne': 'ohne',
  'mit': 'mit',
  'extra': 'extra',
  'bitte': 'bitte',
  'danke': 'danke',
  'entschuldigung': 'entschuldigung',
  'kellner': 'kellner',
  'service': 'service',
  'tisch': 'tisch',
  'platz': 'platz',
  'reservierung': 'reservierung'
};

const PHONETIC_REPLACEMENTS = {
  // Common mispronunciations
  'schäl': 'schale',
  'gewürtz': 'gewürz',
  'ketchap': 'ketchup',
  'majonnäse': 'mayonnaise',
  'tschili': 'chili',
  'oreganno': 'oregano',
  'basilikum': 'basilikum',
  'rosmarin': 'rosmarin',
  'papricka': 'paprika',
  'tomahten': 'tomaten',
  'zwibeln': 'zwiebeln',
  'knopflauch': 'knoblauch',
  'petersillie': 'petersilie',
  'schnittlauch': 'schnittlauch',
  
  // Regional pronunciations
  'kartoffeln': 'kartoffeln',
  'erdäpfel': 'kartoffeln',
  'schrippe': 'brötchen',
  'semmel': 'brötchen',
  'weck': 'brötchen',
  'rundstück': 'brötchen',
  'mutschli': 'brötchen',
  
  // Austrian specific
  'marille': 'aprikose',
  'palatschinken': 'pfannkuchen',
  'topfen': 'quark',
  'obers': 'sahne',
  'schlagobers': 'schlagsahne',
  'faschiertes': 'hackfleisch',
  'beiried': 'roastbeef',
  'lungenbraten': 'filet'
};

const RESTAURANT_COMMANDS = {
  'bestellen': ['bestellen', 'ordern', 'nehmen', 'hätte gern', 'möchte', 'ich will'],
  'hinzufügen': ['dazu', 'auch', 'außerdem', 'zusätzlich', 'noch', 'extra'],
  'entfernen': ['ohne', 'weg', 'nicht', 'kein', 'keine', 'weglassen'],
  'ändern': ['ändern', 'anders', 'stattdessen', 'lieber', 'tauschen'],
  'bezahlen': ['bezahlen', 'zahlen', 'rechnung', 'kasse', 'abrechnen'],
  'hilfe': ['hilfe', 'was gibt es', 'empfehlung', 'was ist', 'erklären'],
  'wiederholen': ['nochmal', 'wiederholen', 'noch einmal', 'wie war das'],
  'abbrechen': ['abbrechen', 'stopp', 'cancel', 'vergiss es', 'egal']
};

// ============================================================================
// GERMAN PROCESSOR CLASS
// ============================================================================

export class GermanProcessor {
  constructor(options = {}) {
    this.variant = options.variant || 'de-DE'; // 'de-DE', 'de-AT', 'de-BY'
    this.strictMode = options.strictMode || false;
    this.preserveOriginal = options.preserveOriginal || false;
    this.contextAware = options.contextAware !== false;
    this.enableRegionalDialects = options.enableRegionalDialects !== false;
    
    // Initialize mappings based on variant
    this.regionalMap = REGIONAL_MAPPINGS[this.variant] || REGIONAL_MAPPINGS['de-DE'];
    this.foodTerms = GERMAN_FOOD_TERMS;
    this.commonWords = COMMON_GERMAN_WORDS;
    this.phoneticMap = PHONETIC_REPLACEMENTS;
    this.restaurantCommands = RESTAURANT_COMMANDS;
    
    // Compile regex patterns for efficiency
    this.regexPatterns = this.compilePatterns();
    
    // Context tracking
    this.currentContext = null;
    this.vocabularyBoost = new Map();
    
    // Statistics
    this.stats = {
      totalProcessed: 0,
      dialectWordsFound: 0,
      replacementsMade: 0,
      confidenceBoosts: 0,
      contextMatches: 0
    };
  }
  
  // ============================================================================
  // PATTERN COMPILATION
  // ============================================================================
  
  compilePatterns() {
    const patterns = {};
    
    // Regional dialect patterns
    for (const [dialect, standard] of Object.entries(this.regionalMap)) {
      patterns[dialect] = new RegExp(`\\b${this.escapeRegex(dialect)}\\b`, 'gi');
    }
    
    // Food terms patterns
    for (const [food, standard] of Object.entries(this.foodTerms)) {
      patterns[food] = new RegExp(`\\b${this.escapeRegex(food)}\\b`, 'gi');
    }
    
    // Common words patterns
    for (const [word, standard] of Object.entries(this.commonWords)) {
      patterns[word] = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'gi');
    }
    
    // Phonetic correction patterns
    for (const [wrong, correct] of Object.entries(this.phoneticMap)) {
      patterns[wrong] = new RegExp(`\\b${this.escapeRegex(wrong)}\\b`, 'gi');
    }
    
    // Special German patterns
    patterns.umlaut = /[äöüÄÖÜß]/g;
    patterns.compound = /(\w+)(\w{3,})/g; // Compound word detection
    patterns.separableVerb = /\b(ab|an|auf|aus|bei|ein|mit|nach|vor|zu)(\w+)\b/gi;
    patterns.article = /\b(der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines)\b/gi;
    patterns.modal = /\b(kann|könnte|will|würde|soll|sollte|muss|müsste|darf|dürfte|mag|möchte)\b/gi;
    patterns.numbers = /\b(null|eins?|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|dreizehn|vierzehn|fünfzehn|sechzehn|siebzehn|achtzehn|neunzehn|zwanzig|dreißig|vierzig|fünfzig|sechzig|siebzig|achtzig|neunzig|hundert|tausend)\b/gi;
    
    return patterns;
  }
  
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  // ============================================================================
  // CORE PROCESSING METHODS
  // ============================================================================
  
  normalizeText(text) {
    if (!text || typeof text !== 'string') return '';
    
    let normalized = text.toLowerCase().trim();
    
    // Remove extra whitespace
    normalized = normalized.replace(/\s+/g, ' ');
    
    // Handle common abbreviations
    normalized = normalized.replace(/\beur\b/gi, 'euro');
    normalized = normalized.replace(/\b€\b/gi, 'euro');
    normalized = normalized.replace(/\bchf\b/gi, 'franken');
    normalized = normalized.replace(/\b&\b/gi, 'und');
    normalized = normalized.replace(/\bu\.\s*a\./gi, 'unter anderem');
    normalized = normalized.replace(/\bz\.\s*b\./gi, 'zum beispiel');
    normalized = normalized.replace(/\bd\.\s*h\./gi, 'das heißt');
    
    // Normalize umlauts for better recognition
    normalized = normalized.replace(/ä/g, 'ae');
    normalized = normalized.replace(/ö/g, 'oe');
    normalized = normalized.replace(/ü/g, 'ue');
    normalized = normalized.replace(/ß/g, 'ss');
    
    // Normalize punctuation
    normalized = normalized.replace(/[.,!?;:]/g, '');
    
    return normalized;
  }
  
  processTranscript(transcript) {
    if (!transcript) return '';
    
    this.stats.totalProcessed++;
    
    let processed = this.normalizeText(transcript);
    const originalProcessed = processed;
    
    // Apply regional dialect mappings
    if (this.enableRegionalDialects) {
      processed = this.applyRegionalMappings(processed);
    }
    
    // Apply food terminology processing
    if (this.currentContext === 'restaurant' || this.currentContext === 'food') {
      processed = this.applyFoodTerms(processed);
    }
    
    // Apply common word mappings
    processed = this.applyCommonMappings(processed);
    
    // Apply phonetic corrections
    processed = this.applyPhoneticCorrections(processed);
    
    // Handle special German constructions
    processed = this.handleGermanConstructions(processed);
    
    // Apply vocabulary boost if available
    processed = this.applyVocabularyBoost(processed);
    
    // Handle numbers and quantities
    processed = this.processNumbers(processed);
    
    // Clean up result
    processed = this.cleanupResult(processed);
    
    // Update statistics
    if (processed !== originalProcessed) {
      this.stats.replacementsMade++;
    }
    
    return processed;
  }
  
  applyRegionalMappings(text) {
    let result = text;
    
    for (const [regional, standard] of Object.entries(this.regionalMap)) {
      const pattern = this.regexPatterns[regional];
      if (pattern && pattern.test(result)) {
        result = result.replace(pattern, standard);
        this.stats.dialectWordsFound++;
      }
    }
    
    return result;
  }
  
  applyFoodTerms(text) {
    let result = text;
    
    for (const [food, standard] of Object.entries(this.foodTerms)) {
      const pattern = this.regexPatterns[food] || 
                     new RegExp(`\\b${this.escapeRegex(food)}\\b`, 'gi');
      
      if (pattern.test(result)) {
        result = result.replace(pattern, standard);
        this.stats.contextMatches++;
      }
    }
    
    return result;
  }
  
  applyCommonMappings(text) {
    let result = text;
    
    for (const [word, standard] of Object.entries(this.commonWords)) {
      const pattern = this.regexPatterns[word] || 
                     new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'gi');
      
      if (pattern.test(result)) {
        result = result.replace(pattern, standard);
      }
    }
    
    return result;
  }
  
  applyPhoneticCorrections(text) {
    let result = text;
    
    for (const [wrong, correct] of Object.entries(this.phoneticMap)) {
      const pattern = new RegExp(this.escapeRegex(wrong), 'gi');
      result = result.replace(pattern, correct);
    }
    
    return result;
  }
  
  handleGermanConstructions(text) {
    let result = text;
    
    // Handle separable verbs (e.g., "aufstehen" -> "stehen auf")
    result = result.replace(this.regexPatterns.separableVerb, (match, prefix, verb) => {
      return `${verb} ${prefix}`;
    });
    
    // Handle modal verbs with infinitives
    result = result.replace(/\b(möchte|will|kann|soll|muss)\s+(\w+)en\b/gi, (match, modal, verb) => {
      return `${modal} ${verb}en`;
    });
    
    // Handle articles properly
    result = result.replace(/\b(der|die|das)\s+(\w+)\b/gi, (match, article, noun) => {
      return `${article} ${noun}`;
    });
    
    return result;
  }
  
  processNumbers(text) {
    let result = text;
    
    // Convert spelled-out numbers to digits
    const numberMap = {
      'null': '0', 'eins': '1', 'zwei': '2', 'drei': '3', 'vier': '4',
      'fünf': '5', 'sechs': '6', 'sieben': '7', 'acht': '8', 'neun': '9',
      'zehn': '10', 'elf': '11', 'zwölf': '12', 'dreizehn': '13',
      'vierzehn': '14', 'fünfzehn': '15', 'sechzehn': '16', 'siebzehn': '17',
      'achtzehn': '18', 'neunzehn': '19', 'zwanzig': '20', 'dreißig': '30',
      'vierzig': '40', 'fünfzig': '50', 'sechzig': '60', 'siebzig': '70',
      'achtzig': '80', 'neunzig': '90', 'hundert': '100', 'tausend': '1000'
    };
    
    for (const [word, number] of Object.entries(numberMap)) {
      const pattern = new RegExp(`\\b${word}\\b`, 'gi');
      result = result.replace(pattern, number);
    }
    
    // Handle compound numbers (e.g., "einundzwanzig" -> "21")
    result = result.replace(/\b(\w+)und(\w+)\b/gi, (match, ones, tens) => {
      const onesNum = numberMap[ones.toLowerCase()];
      const tensNum = numberMap[tens.toLowerCase()];
      
      if (onesNum && tensNum && parseInt(tensNum) >= 20) {
        return (parseInt(tensNum) + parseInt(onesNum)).toString();
      }
      
      return match;
    });
    
    return result;
  }
  
  applyVocabularyBoost(text) {
    let result = text;
    
    this.vocabularyBoost.forEach((replacement, word) => {
      const pattern = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'gi');
      if (pattern.test(result)) {
        result = result.replace(pattern, replacement);
        this.stats.confidenceBoosts++;
      }
    });
    
    return result;
  }
  
  cleanupResult(text) {
    let result = text;
    
    // Remove extra spaces
    result = result.replace(/\s+/g, ' ').trim();
    
    // Capitalize first letter
    result = result.charAt(0).toUpperCase() + result.slice(1);
    
    return result;
  }
  
  // ============================================================================
  // COMMAND & INTENT RECOGNITION
  // ============================================================================
  
  classifyIntent(text) {
    const normalizedText = this.normalizeText(text);
    
    for (const [intent, patterns] of Object.entries(this.restaurantCommands)) {
      for (const pattern of patterns) {
        if (normalizedText.includes(pattern)) {
          return {
            intent,
            confidence: this.calculateConfidence(normalizedText, pattern),
            matchedPattern: pattern,
            originalText: text,
            processedText: normalizedText
          };
        }
      }
    }
    
    return {
      intent: 'unknown',
      confidence: 0,
      matchedPattern: null,
      originalText: text,
      processedText: normalizedText
    };
  }
  
  calculateConfidence(text, pattern) {
    const words = text.split(' ');
    const patternWords = pattern.split(' ');
    
    let matches = 0;
    patternWords.forEach(patternWord => {
      if (words.some(word => word.includes(patternWord))) {
        matches++;
      }
    });
    
    const baseConfidence = matches / patternWords.length;
    
    // Boost confidence for exact matches
    if (text.includes(pattern)) {
      return Math.min(1.0, baseConfidence + 0.3);
    }
    
    // Boost confidence for longer texts (more context)
    const lengthBoost = Math.min(0.2, words.length / 20);
    
    // Boost confidence for food context
    let contextBoost = 0;
    if (this.currentContext === 'restaurant') {
      contextBoost = 0.1;
    }
    
    return Math.min(1.0, baseConfidence + lengthBoost + contextBoost);
  }
  
  extractEntities(text) {
    const entities = {
      foods: [],
      drinks: [],
      numbers: [],
      modifiers: [],
      commands: []
    };
    
    const normalizedText = this.normalizeText(text);
    const words = normalizedText.split(' ');
    
    // Extract food items
    Object.keys(this.foodTerms).forEach(food => {
      if (normalizedText.includes(food)) {
        entities.foods.push({
          name: food,
          standardName: this.foodTerms[food],
          position: normalizedText.indexOf(food)
        });
      }
    });
    
    // Extract numbers
    words.forEach((word, index) => {
      if (/^\d+$/.test(word)) {
        entities.numbers.push({
          value: parseInt(word),
          position: index,
          text: word
        });
      }
    });
    
    // Extract modifiers (mit, ohne, extra)
    const modifierPatterns = ['mit', 'ohne', 'extra', 'zusätzlich', 'dazu'];
    modifierPatterns.forEach(modifier => {
      if (normalizedText.includes(modifier)) {
        entities.modifiers.push({
          type: modifier,
          position: normalizedText.indexOf(modifier)
        });
      }
    });
    
    return entities;
  }
  
  // ============================================================================
  // CONTEXT MANAGEMENT
  // ============================================================================
  
  setContext(context) {
    this.currentContext = context;
    
    if (context === 'restaurant') {
      // Boost restaurant-specific vocabulary
      Object.entries(this.foodTerms).forEach(([food, standard]) => {
        this.vocabularyBoost.set(food, standard);
      });
    }
  }
  
  getContext() {
    return this.currentContext;
  }
  
  clearContext() {
    this.currentContext = null;
    this.vocabularyBoost.clear();
  }
  
  // ============================================================================
  // VOCABULARY LEARNING
  // ============================================================================
  
  addCustomVocabulary(word, replacement, confidence = 0.8) {
    this.vocabularyBoost.set(word.toLowerCase(), replacement);
    
    // Update regex patterns
    this.regexPatterns[word] = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'gi');
    
    return true;
  }
  
  removeCustomVocabulary(word) {
    this.vocabularyBoost.delete(word.toLowerCase());
    delete this.regexPatterns[word];
    
    return true;
  }
  
  getCustomVocabulary() {
    return Array.from(this.vocabularyBoost.entries()).map(([word, replacement]) => ({
      word,
      replacement
    }));
  }
  
  // ============================================================================
  // STATISTICS & ANALYTICS
  // ============================================================================
  
  getStatistics() {
    return {
      ...this.stats,
      dialectCoverage: this.stats.totalProcessed > 0 ? 
        (this.stats.dialectWordsFound / this.stats.totalProcessed) : 0,
      replacementRatio: this.stats.totalProcessed > 0 ? 
        (this.stats.replacementsMade / this.stats.totalProcessed) : 0,
      contextAccuracy: this.stats.totalProcessed > 0 ? 
        (this.stats.contextMatches / this.stats.totalProcessed) : 0
    };
  }
  
  resetStatistics() {
    this.stats = {
      totalProcessed: 0,
      dialectWordsFound: 0,
      replacementsMade: 0,
      confidenceBoosts: 0,
      contextMatches: 0
    };
  }
  
  getSupportedVariants() {
    return Object.keys(REGIONAL_MAPPINGS);
  }
  
  setVariant(variant) {
    if (REGIONAL_MAPPINGS[variant]) {
      this.variant = variant;
      this.regionalMap = REGIONAL_MAPPINGS[variant];
      this.regexPatterns = this.compilePatterns();
      return true;
    }
    return false;
  }
  
  // ============================================================================
  // EXPORT/IMPORT FUNCTIONALITY
  // ============================================================================
  
  exportConfiguration() {
    return {
      variant: this.variant,
      customVocabulary: Array.from(this.vocabularyBoost.entries()),
      stats: this.stats,
      context: this.currentContext
    };
  }
  
  importConfiguration(config) {
    try {
      if (config.variant) {
        this.setVariant(config.variant);
      }
      
      if (config.customVocabulary) {
        this.vocabularyBoost = new Map(config.customVocabulary);
      }
      
      if (config.context) {
        this.setContext(config.context);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import German processor configuration:', error);
      return false;
    }
  }
}

// ============================================================================
// STATIC INITIALIZATION METHODS
// ============================================================================

export const initialize = async (options = {}) => {
  const processor = new GermanProcessor(options);
  
  // Set default context for restaurant use
  processor.setContext('restaurant');
  
  return processor;
};

export const getSupportedVariants = () => Object.keys(REGIONAL_MAPPINGS);

export const getFoodTerms = () => GERMAN_FOOD_TERMS;

export const getRestaurantCommands = () => RESTAURANT_COMMANDS;

// ============================================================================
// EXPORTS
// ============================================================================

export default GermanProcessor;

export {
  REGIONAL_MAPPINGS,
  GERMAN_FOOD_TERMS,
  COMMON_GERMAN_WORDS,
  PHONETIC_REPLACEMENTS,
  RESTAURANT_COMMANDS
};