/**
 * EATECH - Swiss German Processor Utility
 * Version: 3.1.0
 * Description: Advanced Swiss German language processing for voice recognition and TTS
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/features/voice/utils/SwissGermanProcessor.js
 */

// ============================================================================
// SWISS GERMAN LANGUAGE MAPPINGS
// ============================================================================

const DIALECT_MAPPINGS = {
  // Zürich Dialect (ZH)
  'ZH': {
    'isch': 'ist',
    'hät': 'hat',
    'git': 'gibt',
    'chunt': 'kommt',
    'gaht': 'geht',
    'chönd': 'können',
    'wänd': 'wollen',
    'söttid': 'sollten',
    'müesst': 'müssen',
    'chönt': 'könnte',
    'wött': 'wollen',
    'hei': 'haben',
    'si': 'sind',
    'öpper': 'jemand',
    'öppis': 'etwas',
    'nüt': 'nichts',
    'allne': 'allen',
    'denn': 'dann',
    'wäge': 'wegen',
    'vo': 'von',
    'mit': 'mit',
    'für': 'für',
    'ohni': 'ohne',
    'dezue': 'dazu',
    'dörfed': 'dürfen',
    'uf': 'auf',
    'ab': 'ab',
    'dur': 'durch',
    'näbed': 'neben',
    'zwüsche': 'zwischen',
    'hinde': 'hinten',
    'vorne': 'vorne',
    'obe': 'oben',
    'unde': 'unten'
  },
  
  // Bern Dialect (BE)
  'BE': {
    'isch': 'ist',
    'het': 'hat',
    'git': 'gibt',
    'chunt': 'kommt',
    'geit': 'geht',
    'chöi': 'können',
    'wei': 'wollen',
    'sötti': 'sollten',
    'müesse': 'müssen',
    'chönt': 'könnte',
    'wett': 'wollen',
    'hei': 'haben',
    'si': 'sind',
    'öpper': 'jemand',
    'öppis': 'etwas',
    'nüt': 'nichts',
    'allne': 'allen'
  },
  
  // Basel Dialect (BS)
  'BS': {
    'isch': 'ist',
    'het': 'hat',
    'git': 'gibt',
    'chunnt': 'kommt',
    'goot': 'geht',
    'chönd': 'können',
    'wänd': 'wollen',
    'sötted': 'sollten',
    'müend': 'müssen',
    'chönnt': 'könnte',
    'wött': 'wollen',
    'händ': 'haben',
    'sind': 'sind',
    'öbber': 'jemand',
    'öbbis': 'etwas',
    'nyt': 'nichts',
    'allne': 'allen'
  }
};

const COMMON_SWISS_WORDS = {
  // Numbers
  'eis': 'eins',
  'zwöi': 'zwei', 
  'zwei': 'zwei',
  'drü': 'drei',
  'drüü': 'drei',
  'vier': 'vier',
  'föif': 'fünf',
  'sächs': 'sechs',
  'sibe': 'sieben',
  'acht': 'acht',
  'nüün': 'neun',
  'zäh': 'zehn',
  'elf': 'elf',
  'zwölf': 'zwölf',
  'drüzäh': 'dreizehn',
  'vierzäh': 'vierzehn',
  'füfzäh': 'fünfzehn',
  'sächzäh': 'sechzehn',
  'sibzäh': 'siebzehn',
  'achzäh': 'achtzehn',
  'nüünzäh': 'neunzehn',
  'zwänzg': 'zwanzig',
  'drüssg': 'dreissig',
  'vierzg': 'vierzig',
  'füfzg': 'fünfzig',
  'sächzg': 'sechzig',
  'sibzg': 'siebzig',
  'achzg': 'achtzig',
  'nüünzg': 'neunzig',
  'hundert': 'hundert',
  'tuusig': 'tausend',
  
  // Greetings
  'grüezi': 'guten tag',
  'grüessech': 'guten tag',
  'hoi': 'hallo',
  'sali': 'hallo',
  'chuchichäschtli': 'küchenschrank',
  'chörbli': 'körbchen',
  'müesli': 'müsli',
  'röschti': 'rösti',
  'spätzli': 'spätzle',
  'biärli': 'bierchen',
  'kafi': 'kaffee',
  'güggeli': 'hähnchen',
  'wurscht': 'wurst',
  'brot': 'brot',
  'butter': 'butter',
  'chäs': 'käse',
  'milch': 'milch',
  'zucker': 'zucker',
  'salz': 'salz',
  'pfeffer': 'pfeffer',
  
  // Food & Drinks
  'bier': 'bier',
  'wy': 'wein',
  'wasser': 'wasser',
  'mineralwasser': 'mineralwasser',
  'suppe': 'suppe',
  'salat': 'salat',
  'fleisch': 'fleisch',
  'fisch': 'fisch',
  'gmües': 'gemüse',
  'frücht': 'frucht',
  'früchte': 'früchte',
  'desert': 'dessert',
  'nachspys': 'nachtisch',
  'schoggi': 'schokolade',
  'guezi': 'kekse',
  'torte': 'torte',
  'chueche': 'kuchen',
  
  // Actions
  'luege': 'schauen',
  'säge': 'sagen',
  'mache': 'machen',
  'tue': 'tun',
  'gä': 'geben',
  'nä': 'nehmen',
  'bringe': 'bringen',
  'hole': 'holen',
  'kaufe': 'kaufen',
  'zahle': 'bezahlen',
  'bestelle': 'bestellen',
  'reserviere': 'reservieren',
  'aaruefe': 'anrufen',
  'schicke': 'schicken',
  'sende': 'senden',
  
  // Questions
  'was': 'was',
  'wär': 'wer',
  'wo': 'wo',
  'wänn': 'wann',
  'wie': 'wie',
  'wieso': 'warum',
  'worum': 'warum',
  'wieviel': 'wieviel',
  'wievill': 'wieviel',
  
  // Common phrases
  'entschuldigung': 'entschuldigung',
  'excusé': 'entschuldigung',
  'merci': 'danke',
  'danke': 'danke',
  'tank': 'danke',
  'bitte': 'bitte',
  'gern gscheh': 'gern geschehen',
  'bis spöter': 'bis später',
  'uf widerluege': 'auf wiedersehen',
  'tschüss': 'tschüss',
  'adieu': 'auf wiedersehen',
  
  // Time
  'hüt': 'heute',
  'morn': 'morgen',
  'übermorge': 'übermorgen',
  'geschter': 'gestern',
  'vorgeschter': 'vorgestern',
  'jetzt': 'jetzt',
  'spöter': 'später',
  'früeh': 'früh',
  'spat': 'spät',
  'am morge': 'am morgen',
  'am mittag': 'am mittag',
  'am abe': 'am abend',
  'i de nacht': 'in der nacht',
  
  // Money
  'franke': 'franken',
  'stutz': 'franken',
  'rappen': 'rappen',
  'füferli': 'fünf rappen',
  'zähnerli': 'zehn rappen',
  'zwänzgerli': 'zwanzig rappen',
  'füfzgerli': 'fünfzig rappen',
  
  // Locations
  'hei': 'zuhause',
  'dehei': 'zuhause',
  'daheim': 'zuhause',
  'ume': 'herum',
  'dete': 'dort',
  'dört': 'dort',
  'da': 'da',
  'do': 'hier',
  'det': 'dort'
};

const PHONETIC_REPLACEMENTS = {
  // CH sound replacements
  'chf': 'chf', // Keep CHF as is
  'ch': 'ch',   // Keep most CH sounds
  'sch': 'sch', // Keep SCH sounds
  
  // Vowel replacements
  'ää': 'ä',
  'öö': 'ö',
  'üü': 'ü',
  'ii': 'i',
  'uu': 'u',
  'oo': 'o',
  'ee': 'e',
  'aa': 'a',
  
  // Common sound patterns
  'gs': 'gs',
  'chs': 'chs',
  'sts': 'sts',
  'ngs': 'ngs'
};

const RESTAURANT_TERMS = {
  'tisch': 'tisch',
  'reservierig': 'reservierung',
  'bestellig': 'bestellung',
  'rächnig': 'rechnung',
  'zahle': 'bezahlen',
  'trinkgäld': 'trinkgeld',
  'servicepersonal': 'servicepersonal',
  'choch': 'koch',
  'chöchin': 'köchin',
  'kellner': 'kellner',
  'kellnerin': 'kellnerin',
  'serviererin': 'serviererin',
  'gast': 'gast',
  'chund': 'kunde',
  'kundin': 'kundin',
  'bsuch': 'besuch',
  'bsucher': 'besucher',
  'gsellschaft': 'gesellschaft',
  'gruppe': 'gruppe',
  'familie': 'familie',
  'paar': 'paar',
  'person': 'person',
  'lüt': 'leute',
  'mänsch': 'mensch',
  'speisekarte': 'speisekarte',
  'menü': 'menü',
  'tagesmenu': 'tagesmenü',
  'vorspyse': 'vorspeise',
  'hauptgang': 'hauptgang',
  'nachspyse': 'nachspeise',
  'getränk': 'getränk',
  'apéro': 'aperitif',
  'digestif': 'digestif'
};

// ============================================================================
// SWISS GERMAN PROCESSOR CLASS
// ============================================================================

export class SwissGermanProcessor {
  constructor(options = {}) {
    this.dialect = options.dialect || 'ZH'; // Default to Zurich
    this.strictMode = options.strictMode || false;
    this.preserveOriginal = options.preserveOriginal || false;
    this.contextAware = options.contextAware !== false;
    
    // Initialize mappings based on dialect
    this.dialectMap = DIALECT_MAPPINGS[this.dialect] || DIALECT_MAPPINGS['ZH'];
    this.commonWords = COMMON_SWISS_WORDS;
    this.phoneticMap = PHONETIC_REPLACEMENTS;
    this.restaurantTerms = RESTAURANT_TERMS;
    
    // Compile regex patterns for efficiency
    this.regexPatterns = this.compilePatterns();
    
    // Context-aware processing
    this.currentContext = null;
    this.vocabularyBoost = new Map();
    
    // Statistics
    this.stats = {
      totalProcessed: 0,
      dialectWordsFound: 0,
      replacementsMade: 0,
      confidenceBoosts: 0
    };
  }
  
  // ============================================================================
  // PATTERN COMPILATION
  // ============================================================================
  
  compilePatterns() {
    const patterns = {};
    
    // Compile word boundary patterns for better matching
    for (const [swiss, standard] of Object.entries(this.dialectMap)) {
      patterns[swiss] = new RegExp(`\\b${this.escapeRegex(swiss)}\\b`, 'gi');
    }
    
    for (const [swiss, standard] of Object.entries(this.commonWords)) {
      patterns[swiss] = new RegExp(`\\b${this.escapeRegex(swiss)}\\b`, 'gi');
    }
    
    // Special patterns for common Swiss German constructions
    patterns.diminutive = /(\w+)li\b/gi; // -li endings
    patterns.question = /\b(was|wär|wo|wänn|wie|wieso|worum)\b/gi;
    patterns.numbers = /\b(eis|zwöi|drü|drüü|föif|sächs|sibe|nüün|zäh|zwänzg|drüssg|vierzg|füfzg|sächzg|sibzg|achzg|nüünzg|tuusig)\b/gi;
    
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
    normalized = normalized.replace(/\bchf\b/gi, 'franken');
    normalized = normalized.replace(/\bfr\.\b/gi, 'franken');
    normalized = normalized.replace(/\b&\b/gi, 'und');
    
    // Normalize punctuation
    normalized = normalized.replace(/[.,!?;:]/g, '');
    
    return normalized;
  }
  
  processTranscript(transcript) {
    if (!transcript) return '';
    
    this.stats.totalProcessed++;
    
    let processed = this.normalizeText(transcript);
    let originalProcessed = processed;
    
    // Apply dialect-specific mappings first
    processed = this.applyDialectMappings(processed);
    
    // Apply common Swiss German word mappings
    processed = this.applyCommonMappings(processed);
    
    // Apply restaurant-specific terms if in restaurant context
    if (this.currentContext === 'restaurant') {
      processed = this.applyRestaurantTerms(processed);
    }
    
    // Apply phonetic corrections
    processed = this.applyPhoneticCorrections(processed);
    
    // Handle special constructions
    processed = this.handleSpecialConstructions(processed);
    
    // Apply vocabulary boost if available
    processed = this.applyVocabularyBoost(processed);
    
    // Clean up result
    processed = this.cleanupResult(processed);
    
    // Update statistics
    if (processed !== originalProcessed) {
      this.stats.replacementsMade++;
    }
    
    return processed;
  }
  
  applyDialectMappings(text) {
    let result = text;
    
    for (const [swiss, standard] of Object.entries(this.dialectMap)) {
      const pattern = this.regexPatterns[swiss];
      if (pattern && pattern.test(result)) {
        result = result.replace(pattern, standard);
        this.stats.dialectWordsFound++;
      }
    }
    
    return result;
  }
  
  applyCommonMappings(text) {
    let result = text;
    
    for (const [swiss, standard] of Object.entries(this.commonWords)) {
      const pattern = this.regexPatterns[swiss] || 
                     new RegExp(`\\b${this.escapeRegex(swiss)}\\b`, 'gi');
      
      if (pattern.test(result)) {
        result = result.replace(pattern, standard);
        this.stats.dialectWordsFound++;
      }
    }
    
    return result;
  }
  
  applyRestaurantTerms(text) {
    let result = text;
    
    for (const [swiss, standard] of Object.entries(this.restaurantTerms)) {
      const pattern = new RegExp(`\\b${this.escapeRegex(swiss)}\\b`, 'gi');
      if (pattern.test(result)) {
        result = result.replace(pattern, standard);
        this.stats.dialectWordsFound++;
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
  
  handleSpecialConstructions(text) {
    let result = text;
    
    // Handle diminutive forms (-li endings)
    result = result.replace(this.regexPatterns.diminutive, (match, root) => {
      if (root.length > 2) {
        return root + 'chen'; // German diminutive
      }
      return match;
    });
    
    // Handle question words
    result = result.replace(/\bwär\b/gi, 'wer');
    result = result.replace(/\bwänn\b/gi, 'wann');
    
    // Handle common contractions
    result = result.replace(/\bi(n) de(r|m)\b/gi, 'in der');
    result = result.replace(/\buf(em|ere|e)\b/gi, 'auf dem');
    result = result.replace(/\bvo(m|re)\b/gi, 'von dem');
    
    return result;
  }
  
  applyVocabularyBoost(text) {
    if (this.vocabularyBoost.size === 0) return text;
    
    let result = text;
    
    for (const [term, boost] of this.vocabularyBoost.entries()) {
      if (result.includes(term.toLowerCase())) {
        this.stats.confidenceBoosts++;
        // Mark boosted terms (could be used for confidence calculation)
        result = result.replace(
          new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'gi'),
          `${term}[+${boost}]`
        );
      }
    }
    
    return result;
  }
  
  cleanupResult(text) {
    let result = text;
    
    // Remove boost markers if they exist
    result = result.replace(/\[\+\d+\.?\d*\]/g, '');
    
    // Normalize whitespace
    result = result.replace(/\s+/g, ' ').trim();
    
    // Capitalize first letter
    if (result.length > 0) {
      result = result.charAt(0).toUpperCase() + result.slice(1);
    }
    
    return result;
  }
  
  // ============================================================================
  // TTS PREPROCESSING
  // ============================================================================
  
  preprocessForTTS(text) {
    if (!text) return '';
    
    let processed = text;
    
    // Convert standard German back to Swiss German for more natural TTS
    if (this.shouldUseSwissGermanTTS()) {
      processed = this.convertToSwissGermanTTS(processed);
    }
    
    // Handle pronunciation guides
    processed = this.addPronunciationGuides(processed);
    
    // Handle Swiss German specific phonemes
    processed = this.handleSwissPhonemes(processed);
    
    return processed;
  }
  
  shouldUseSwissGermanTTS() {
    // Use Swiss German TTS if we have a Swiss voice selected
    return this.dialect && this.dialect.includes('CH');
  }
  
  convertToSwissGermanTTS(text) {
    let result = text;
    
    // Convert some standard German back to Swiss for natural pronunciation
    const ttsReversions = {
      'können': 'chönd',
      'wollen': 'wänd',
      'haben': 'hei',
      'sind': 'si',
      'ist': 'isch',
      'gibt': 'git',
      'kommt': 'chunt',
      'geht': 'gaht',
      'nichts': 'nüt',
      'etwas': 'öppis',
      'jemand': 'öpper'
    };
    
    for (const [standard, swiss] of Object.entries(ttsReversions)) {
      const pattern = new RegExp(`\\b${this.escapeRegex(standard)}\\b`, 'gi');
      result = result.replace(pattern, swiss);
    }
    
    return result;
  }
  
  addPronunciationGuides(text) {
    let result = text;
    
    // Add pronunciation guides for difficult Swiss words
    const pronunciationGuides = {
      'chuchichäschtli': 'chu-chi-chäscht-li',
      'chörbli': 'chörb-li',
      'grüezi': 'grüe-zi',
      'öppis': 'öp-pis',
      'öpper': 'öp-per',
      'chönd': 'chönd',
      'wänd': 'wänd'
    };
    
    for (const [word, guide] of Object.entries(pronunciationGuides)) {
      const pattern = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'gi');
      result = result.replace(pattern, guide);
    }
    
    return result;
  }
  
  handleSwissPhonemes(text) {
    let result = text;
    
    // Handle specific Swiss German sounds that need special TTS treatment
    const phonemeAdjustments = {
      'ch': 'kh', // Make CH sound more guttural
      'sch': 'sh', // Soften SCH sounds
      'üe': 'ue',  // Handle diphthongs
      'ie': 'i',   // Simplify some diphthongs
      'ei': 'ai'   // Adjust diphthong pronunciation
    };
    
    // Apply only if strict pronunciation is needed
    if (this.strictMode) {
      for (const [original, adjusted] of Object.entries(phonemeAdjustments)) {
        const pattern = new RegExp(this.escapeRegex(original), 'gi');
        result = result.replace(pattern, adjusted);
      }
    }
    
    return result;
  }
  
  // ============================================================================
  // CONTEXT MANAGEMENT
  // ============================================================================
  
  setContext(context) {
    this.currentContext = context;
    
    // Adjust vocabulary boost based on context
    this.updateVocabularyBoost(context);
  }
  
  updateVocabularyBoost(context) {
    this.vocabularyBoost.clear();
    
    switch (context) {
      case 'restaurant':
        // Boost restaurant-related terms
        const restaurantBoosts = {
          'tisch': 0.2,
          'bestellung': 0.3,
          'menü': 0.2,
          'rechnung': 0.3,
          'reservierung': 0.3,
          'kellner': 0.2,
          'service': 0.2,
          'essen': 0.1,
          'trinken': 0.1,
          'zahlen': 0.2
        };
        
        for (const [term, boost] of Object.entries(restaurantBoosts)) {
          this.vocabularyBoost.set(term, boost);
        }
        break;
        
      case 'shopping':
        // Boost shopping-related terms
        const shoppingBoosts = {
          'kaufen': 0.3,
          'bezahlen': 0.3,
          'warenkorb': 0.3,
          'artikel': 0.2,
          'produkt': 0.2,
          'preis': 0.2,
          'franken': 0.2,
          'rabatt': 0.2
        };
        
        for (const [term, boost] of Object.entries(shoppingBoosts)) {
          this.vocabularyBoost.set(term, boost);
        }
        break;
        
      case 'navigation':
        // Boost navigation-related terms
        const navigationBoosts = {
          'gehen': 0.2,
          'zeigen': 0.2,
          'öffnen': 0.2,
          'schließen': 0.2,
          'zurück': 0.2,
          'weiter': 0.2,
          'suchen': 0.2
        };
        
        for (const [term, boost] of Object.entries(navigationBoosts)) {
          this.vocabularyBoost.set(term, boost);
        }
        break;
    }
  }
  
  // ============================================================================
  // CONFIDENCE CALCULATION
  // ============================================================================
  
  calculateSwissConfidence(originalText, processedText) {
    if (!originalText || !processedText) return 0;
    
    let confidence = 0.5; // Base confidence
    
    // Check for Swiss German markers
    const swissMarkers = this.findSwissMarkers(originalText);
    confidence += swissMarkers.length * 0.1;
    
    // Check if processing made meaningful changes
    if (originalText !== processedText) {
      confidence += 0.2;
    }
    
    // Check for context relevance
    if (this.currentContext && this.isContextRelevant(processedText)) {
      confidence += 0.1;
    }
    
    // Check vocabulary boost hits
    for (const [term, boost] of this.vocabularyBoost.entries()) {
      if (processedText.toLowerCase().includes(term.toLowerCase())) {
        confidence += boost;
      }
    }
    
    return Math.min(confidence, 1.0);
  }
  
  findSwissMarkers(text) {
    const markers = [];
    const lowerText = text.toLowerCase();
    
    // Check for dialect-specific words
    for (const swiss of Object.keys(this.dialectMap)) {
      if (lowerText.includes(swiss.toLowerCase())) {
        markers.push(swiss);
      }
    }
    
    // Check for common Swiss words
    for (const swiss of Object.keys(this.commonWords)) {
      if (lowerText.includes(swiss.toLowerCase())) {
        markers.push(swiss);
      }
    }
    
    return markers;
  }
  
  isContextRelevant(text) {
    if (!this.currentContext) return false;
    
    const contextWords = {
      'restaurant': ['tisch', 'menü', 'bestellung', 'essen', 'trinken'],
      'shopping': ['kaufen', 'warenkorb', 'bezahlen', 'artikel'],
      'navigation': ['gehen', 'zeigen', 'öffnen', 'suchen']
    };
    
    const relevantWords = contextWords[this.currentContext] || [];
    const lowerText = text.toLowerCase();
    
    return relevantWords.some(word => lowerText.includes(word));
  }
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  getStatistics() {
    return {
      ...this.stats,
      dialectWordsRatio: this.stats.totalProcessed > 0 ? 
        (this.stats.dialectWordsFound / this.stats.totalProcessed) : 0,
      replacementRatio: this.stats.totalProcessed > 0 ? 
        (this.stats.replacementsMade / this.stats.totalProcessed) : 0
    };
  }
  
  resetStatistics() {
    this.stats = {
      totalProcessed: 0,
      dialectWordsFound: 0,
      replacementsMade: 0,
      confidenceBoosts: 0
    };
  }
  
  getSupportedDialects() {
    return Object.keys(DIALECT_MAPPINGS);
  }
  
  setDialect(dialect) {
    if (DIALECT_MAPPINGS[dialect]) {
      this.dialect = dialect;
      this.dialectMap = DIALECT_MAPPINGS[dialect];
      this.regexPatterns = this.compilePatterns();
      return true;
    }
    return false;
  }
  
  // ============================================================================
  // EXPORT/IMPORT CUSTOM MAPPINGS
  // ============================================================================
  
  exportCustomMappings() {
    return {
      dialect: this.dialect,
      customWords: this.vocabularyBoost,
      stats: this.stats
    };
  }
  
  importCustomMappings(mappings) {
    try {
      if (mappings.dialect) {
        this.setDialect(mappings.dialect);
      }
      
      if (mappings.customWords) {
        this.vocabularyBoost = new Map(mappings.customWords);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import custom mappings:', error);
      return false;
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default SwissGermanProcessor;

export {
  DIALECT_MAPPINGS,
  COMMON_SWISS_WORDS,
  PHONETIC_REPLACEMENTS,
  RESTAURANT_TERMS
};