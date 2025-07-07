/**
 * EATECH - Command Matcher Utility
 * Version: 4.0.0
 * Description: Advanced pattern matching for voice commands with fuzzy matching and context awareness
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/features/voice/utils/CommandMatcher.js
 */

import { levenshteinDistance, jaroWinkler } from './StringSimilarity';

// ============================================================================
// CONSTANTS
// ============================================================================

const MATCH_TYPES = {
  EXACT: 'exact',
  FUZZY: 'fuzzy',
  SEMANTIC: 'semantic',
  PARTIAL: 'partial',
  REGEX: 'regex'
};

const CONFIDENCE_THRESHOLDS = {
  EXACT: 1.0,
  HIGH: 0.9,
  MEDIUM: 0.7,
  LOW: 0.5,
  MINIMUM: 0.3
};

const PARAMETER_TYPES = {
  STRING: 'string',
  NUMBER: 'number',
  DATE: 'date',
  TIME: 'time',
  BOOLEAN: 'boolean',
  ENTITY: 'entity',
  WILDCARD: 'wildcard'
};

const STOPWORDS = {
  'de': ['der', 'die', 'das', 'ein', 'eine', 'und', 'oder', 'aber', 'mit', 'von', 'zu', 'in', 'auf', 'für', 'ist', 'sind', 'hat', 'haben', 'wird', 'werden', 'kann', 'können', 'soll', 'sollen', 'will', 'wollen', 'bitte', 'danke'],
  'de-CH': ['de', 'di', 's', 'es', 'en', 'e', 'und', 'oder', 'aber', 'mit', 'vo', 'zu', 'i', 'uf', 'für', 'isch', 'si', 'hät', 'hei', 'wird', 'werde', 'cha', 'chönd', 'söll', 'sötted', 'will', 'wänd', 'bitte', 'merci'],
  'en': ['the', 'a', 'an', 'and', 'or', 'but', 'with', 'from', 'to', 'in', 'on', 'for', 'is', 'are', 'has', 'have', 'will', 'would', 'can', 'could', 'should', 'want', 'please', 'thank', 'thanks'],
  'fr': ['le', 'la', 'les', 'un', 'une', 'et', 'ou', 'mais', 'avec', 'de', 'à', 'dans', 'sur', 'pour', 'est', 'sont', 'a', 'ont', 'sera', 'seront', 'peut', 'peuvent', 'doit', 'doivent', 'veut', 'veulent', 'sil vous plaît', 'merci'],
  'it': ['il', 'la', 'lo', 'un', 'una', 'e', 'o', 'ma', 'con', 'di', 'a', 'in', 'su', 'per', 'è', 'sono', 'ha', 'hanno', 'sarà', 'saranno', 'può', 'possono', 'deve', 'devono', 'vuole', 'vogliono', 'per favore', 'grazie']
};

const ENTITY_PATTERNS = {
  number: /\b(\d+|zero|null|eins?|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|dreizehn|vierzehn|fünfzehn|sechzehn|siebzehn|achtzehn|neunzehn|zwanzig|dreißig|vierzig|fünfzig|sechzig|siebzig|achtzig|neunzig|hundert|tausend|million|milliarde|eis|zwöi|drü|drüü|föif|sächs|sibe|nüün|zäh|zwänzg|drüssg|vierzg|füfzg|sächzg|sibzg|achzg|nüünzg|tuusig)\b/gi,
  
  time: /\b(\d{1,2}:?\d{0,2}\s?(uhr|am|pm|h)?|morgen?s?|mittags?|abends?|nachts?|früh|spät|jetzt|gleich|später|hüt|morn|abe|nacht)\b/gi,
  
  date: /\b(heute|morgen|übermorgen|gestern|vorgestern|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember|\d{1,2}\.\d{1,2}\.?\d{0,4}|hüt|morn|übermorge|geschter|vorgeschter|mäntig|ziischtig|mittwuch|dunschtig|friitig|samschtig|sunntig)\b/gi,
  
  currency: /\b(\d+\.?\d*\s?(chf|franken?|rappen|euro?|dollar?|stutz|füferli|zähnerli|zwänzgerli|füfzgerli))\b/gi,
  
  quantity: /\b(\d+x?|\d+\s?(stück|portion|stück|liter|kilo|gramm|mal|mals?|x))\b/gi,
  
  table: /\b(tisch\s?\d+|table\s?\d+|\d+er?\s?tisch)\b/gi,
  
  person: /\b(\d+\s?(person|personen|leute|menschen|gäste?|guest|guests|people))\b/gi
};

// ============================================================================
// COMMAND MATCHER CLASS
// ============================================================================

export class CommandMatcher {
  constructor(options = {}) {
    this.patterns = options.patterns || {};
    this.swissPatterns = options.swissPatterns || null;
    this.language = options.language || 'de-CH';
    this.fuzzyThreshold = options.fuzzyThreshold || CONFIDENCE_THRESHOLDS.MEDIUM;
    this.contextEnabled = options.contextEnabled !== false;
    this.semanticEnabled = options.semanticEnabled !== false;
    
    // Compiled patterns for performance
    this.compiledPatterns = new Map();
    this.entityPatterns = new Map();
    
    // Stopwords for language
    this.stopwords = new Set(
      STOPWORDS[this.language] || 
      STOPWORDS[this.language.split('-')[0]] || 
      STOPWORDS['en']
    );
    
    // Context and history
    this.currentContext = null;
    this.matchHistory = [];
    this.entityCache = new Map();
    
    // Statistics
    this.stats = {
      totalMatches: 0,
      exactMatches: 0,
      fuzzyMatches: 0,
      semanticMatches: 0,
      partialMatches: 0,
      failedMatches: 0,
      averageConfidence: 0
    };
    
    this.initialize();
  }
  
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  initialize() {
    this.compilePatterns();
    this.compileEntityPatterns();
  }
  
  compilePatterns() {
    this.compiledPatterns.clear();
    
    // Compile main patterns
    Object.entries(this.patterns).forEach(([category, commands]) => {
      commands.forEach((command, index) => {
        const id = `${category}_${index}`;
        const compiledCommand = this.compileCommand(command);
        this.compiledPatterns.set(id, {
          ...command,
          ...compiledCommand,
          category,
          id
        });
      });
    });
    
    // Compile Swiss German patterns if available
    if (this.swissPatterns) {
      Object.entries(this.swissPatterns).forEach(([category, commands]) => {
        commands.forEach((command, index) => {
          const id = `swiss_${category}_${index}`;
          const compiledCommand = this.compileCommand(command);
          this.compiledPatterns.set(id, {
            ...command,
            ...compiledCommand,
            category,
            id,
            isSwiss: true
          });
        });
      });
    }
  }
  
  compileCommand(command) {
    const compiledPatterns = command.patterns.map(pattern => {
      // Handle named capture groups
      const regex = new RegExp(pattern, 'gi');
      
      // Extract parameter placeholders
      const paramPlaceholders = this.extractParameterPlaceholders(pattern);
      
      return {
        original: pattern,
        regex,
        paramPlaceholders
      };
    });
    
    return {
      compiledPatterns,
      paramTypes: this.inferParameterTypes(command.params || []),
      confidence: command.confidence || 1.0
    };
  }
  
  extractParameterPlaceholders(pattern) {
    const placeholders = [];
    const namedGroupRegex = /\(\?\<(\w+)\>/g;
    let match;
    
    while ((match = namedGroupRegex.exec(pattern)) !== null) {
      placeholders.push({
        name: match[1],
        position: match.index
      });
    }
    
    return placeholders;
  }
  
  inferParameterTypes(params) {
    const types = {};
    
    params.forEach(param => {
      if (param.includes('number') || param.includes('quantity') || param.includes('amount')) {
        types[param] = PARAMETER_TYPES.NUMBER;
      } else if (param.includes('date')) {
        types[param] = PARAMETER_TYPES.DATE;
      } else if (param.includes('time')) {
        types[param] = PARAMETER_TYPES.TIME;
      } else if (param.includes('table') || param.includes('id')) {
        types[param] = PARAMETER_TYPES.ENTITY;
      } else {
        types[param] = PARAMETER_TYPES.STRING;
      }
    });
    
    return types;
  }
  
  compileEntityPatterns() {
    this.entityPatterns.clear();
    
    Object.entries(ENTITY_PATTERNS).forEach(([type, pattern]) => {
      this.entityPatterns.set(type, pattern);
    });
  }
  
  // ============================================================================
  // MAIN MATCHING METHODS
  // ============================================================================
  
  match(inputText, options = {}) {
    if (!inputText || typeof inputText !== 'string') {
      return this.createEmptyResult();
    }
    
    this.stats.totalMatches++;
    
    const preprocessed = this.preprocessText(inputText);
    const context = options.context || this.currentContext;
    
    // Try different matching strategies in order of preference
    let result = this.exactMatch(preprocessed, context);
    
    if (!result || result.confidence < this.fuzzyThreshold) {
      const fuzzyResult = this.fuzzyMatch(preprocessed, context);
      if (fuzzyResult && fuzzyResult.confidence > (result?.confidence || 0)) {
        result = fuzzyResult;
      }
    }
    
    if (!result || result.confidence < CONFIDENCE_THRESHOLDS.LOW) {
      const partialResult = this.partialMatch(preprocessed, context);
      if (partialResult && partialResult.confidence > (result?.confidence || 0)) {
        result = partialResult;
      }
    }
    
    if (this.semanticEnabled && (!result || result.confidence < CONFIDENCE_THRESHOLDS.MEDIUM)) {
      const semanticResult = this.semanticMatch(preprocessed, context);
      if (semanticResult && semanticResult.confidence > (result?.confidence || 0)) {
        result = semanticResult;
      }
    }
    
    // Finalize result
    result = result || this.createEmptyResult();
    result.originalText = inputText;
    result.preprocessedText = preprocessed;
    result.matchType = result.matchType || MATCH_TYPES.FUZZY;
    
    // Update statistics
    this.updateStatistics(result);
    
    // Add to history
    this.addToHistory(result);
    
    return result;
  }
  
  // ============================================================================
  // MATCHING STRATEGIES
  // ============================================================================
  
  exactMatch(text, context) {
    let bestMatch = null;
    let highestConfidence = 0;
    
    for (const [id, command] of this.compiledPatterns.entries()) {
      if (context && !this.isContextRelevant(command, context)) {
        continue;
      }
      
      for (const compiledPattern of command.compiledPatterns) {
        const match = compiledPattern.regex.exec(text);
        
        if (match) {
          const confidence = this.calculateExactConfidence(match, text, command);
          
          if (confidence > highestConfidence) {
            const params = this.extractParameters(match, compiledPattern, command);
            
            bestMatch = {
              intent: command.intent,
              confidence,
              matchType: MATCH_TYPES.EXACT,
              pattern: compiledPattern.original,
              category: command.category,
              params,
              command,
              match: match[0]
            };
            
            highestConfidence = confidence;
          }
        }
        
        // Reset regex for next iteration
        compiledPattern.regex.lastIndex = 0;
      }
    }
    
    if (bestMatch) {
      this.stats.exactMatches++;
    }
    
    return bestMatch;
  }
  
  fuzzyMatch(text, context) {
    let bestMatch = null;
    let highestConfidence = 0;
    
    const textWords = this.tokenize(text);
    
    for (const [id, command] of this.compiledPatterns.entries()) {
      if (context && !this.isContextRelevant(command, context)) {
        continue;
      }
      
      for (const compiledPattern of command.compiledPatterns) {
        // Convert regex pattern to words for fuzzy matching
        const patternText = this.regexToText(compiledPattern.original);
        const patternWords = this.tokenize(patternText);
        
        const similarity = this.calculateWordSimilarity(textWords, patternWords);
        
        if (similarity >= this.fuzzyThreshold) {
          const confidence = this.calculateFuzzyConfidence(similarity, command);
          
          if (confidence > highestConfidence) {
            const params = this.extractFuzzyParameters(text, command);
            
            bestMatch = {
              intent: command.intent,
              confidence,
              matchType: MATCH_TYPES.FUZZY,
              pattern: compiledPattern.original,
              category: command.category,
              params,
              command,
              similarity
            };
            
            highestConfidence = confidence;
          }
        }
      }
    }
    
    if (bestMatch) {
      this.stats.fuzzyMatches++;
    }
    
    return bestMatch;
  }
  
  partialMatch(text, context) {
    let bestMatch = null;
    let highestConfidence = 0;
    
    const textWords = this.tokenize(text);
    
    for (const [id, command] of this.compiledPatterns.entries()) {
      if (context && !this.isContextRelevant(command, context)) {
        continue;
      }
      
      // Check if any example contains keywords from the input
      const keywordMatches = this.findKeywordMatches(textWords, command);
      
      if (keywordMatches.length > 0) {
        const confidence = this.calculatePartialConfidence(keywordMatches, textWords, command);
        
        if (confidence > highestConfidence && confidence >= CONFIDENCE_THRESHOLDS.LOW) {
          const params = this.extractPartialParameters(text, command);
          
          bestMatch = {
            intent: command.intent,
            confidence,
            matchType: MATCH_TYPES.PARTIAL,
            category: command.category,
            params,
            command,
            keywordMatches
          };
          
          highestConfidence = confidence;
        }
      }
    }
    
    if (bestMatch) {
      this.stats.partialMatches++;
    }
    
    return bestMatch;
  }
  
  semanticMatch(text, context) {
    // This is a placeholder for semantic matching
    // In a real implementation, you would use NLP embeddings
    // or a semantic similarity service
    
    let bestMatch = null;
    let highestConfidence = 0;
    
    const semanticKeywords = this.extractSemanticKeywords(text);
    
    for (const [id, command] of this.compiledPatterns.entries()) {
      if (context && !this.isContextRelevant(command, context)) {
        continue;
      }
      
      const commandKeywords = this.getCommandSemanticKeywords(command);
      const semanticSimilarity = this.calculateSemanticSimilarity(semanticKeywords, commandKeywords);
      
      if (semanticSimilarity >= CONFIDENCE_THRESHOLDS.LOW) {
        const confidence = this.calculateSemanticConfidence(semanticSimilarity, command);
        
        if (confidence > highestConfidence) {
          const params = this.extractSemanticParameters(text, command);
          
          bestMatch = {
            intent: command.intent,
            confidence,
            matchType: MATCH_TYPES.SEMANTIC,
            category: command.category,
            params,
            command,
            semanticSimilarity
          };
          
          highestConfidence = confidence;
        }
      }
    }
    
    if (bestMatch) {
      this.stats.semanticMatches++;
    }
    
    return bestMatch;
  }
  
  // ============================================================================
  // PARAMETER EXTRACTION
  // ============================================================================
  
  extractParameters(match, compiledPattern, command) {
    const params = {};
    
    // Extract named groups
    if (match.groups) {
      Object.entries(match.groups).forEach(([name, value]) => {
        if (value) {
          params[name] = this.processParameterValue(value, command.paramTypes[name]);
        }
      });
    }
    
    // Extract entities from the full text
    const entities = this.extractEntities(match.input || '');
    Object.assign(params, entities);
    
    return params;
  }
  
  extractFuzzyParameters(text, command) {
    const params = {};
    
    // Extract entities from the text
    const entities = this.extractEntities(text);
    
    // Map entities to expected parameters
    if (command.params) {
      command.params.forEach(param => {
        const paramType = command.paramTypes?.[param];
        const entityValue = this.findBestEntityMatch(entities, paramType, param);
        
        if (entityValue) {
          params[param] = entityValue;
        }
      });
    }
    
    return params;
  }
  
  extractPartialParameters(text, command) {
    return this.extractFuzzyParameters(text, command);
  }
  
  extractSemanticParameters(text, command) {
    return this.extractFuzzyParameters(text, command);
  }
  
  extractEntities(text) {
    if (this.entityCache.has(text)) {
      return this.entityCache.get(text);
    }
    
    const entities = {};
    
    // Extract different types of entities
    for (const [type, pattern] of this.entityPatterns.entries()) {
      const matches = [...text.matchAll(pattern)];
      
      if (matches.length > 0) {
        entities[type] = matches.map(match => ({
          value: match[0],
          normalized: this.normalizeEntityValue(match[0], type),
          position: match.index
        }));
      }
    }
    
    // Cache result
    this.entityCache.set(text, entities);
    
    return entities;
  }
  
  normalizeEntityValue(value, type) {
    switch (type) {
      case 'number':
        return this.normalizeNumber(value);
      case 'time':
        return this.normalizeTime(value);
      case 'date':
        return this.normalizeDate(value);
      case 'currency':
        return this.normalizeCurrency(value);
      case 'quantity':
        return this.normalizeQuantity(value);
      default:
        return value.toLowerCase().trim();
    }
  }
  
  // ============================================================================
  // ENTITY NORMALIZATION
  // ============================================================================
  
  normalizeNumber(value) {
    const numberMap = {
      'null': 0, 'zero': 0,
      'eins': 1, 'eis': 1, 'ein': 1, 'eine': 1,
      'zwei': 2, 'zwöi': 2,
      'drei': 3, 'drü': 3, 'drüü': 3,
      'vier': 4,
      'fünf': 5, 'föif': 5,
      'sechs': 6, 'sächs': 6,
      'sieben': 7, 'sibe': 7,
      'acht': 8,
      'neun': 9, 'nüün': 9,
      'zehn': 10, 'zäh': 10,
      'elf': 11,
      'zwölf': 12,
      'dreizehn': 13, 'drüzäh': 13,
      'vierzehn': 14, 'vierzäh': 14,
      'fünfzehn': 15, 'füfzäh': 15,
      'sechzehn': 16, 'sächzäh': 16,
      'siebzehn': 17, 'sibzäh': 17,
      'achtzehn': 18, 'achzäh': 18,
      'neunzehn': 19, 'nüünzäh': 19,
      'zwanzig': 20, 'zwänzg': 20,
      'dreißig': 30, 'drüssg': 30,
      'vierzig': 40, 'vierzg': 40,
      'fünfzig': 50, 'füfzg': 50,
      'sechzig': 60, 'sächzg': 60,
      'siebzig': 70, 'sibzg': 70,
      'achtzig': 80, 'achzg': 80,
      'neunzig': 90, 'nüünzg': 90,
      'hundert': 100,
      'tausend': 1000, 'tuusig': 1000,
      'million': 1000000,
      'milliarde': 1000000000
    };
    
    const cleaned = value.toLowerCase().trim();
    
    if (numberMap[cleaned] !== undefined) {
      return numberMap[cleaned];
    }
    
    const numericValue = parseInt(cleaned);
    return isNaN(numericValue) ? value : numericValue;
  }
  
  normalizeTime(value) {
    // Basic time normalization
    const timeRegex = /(\d{1,2}):?(\d{0,2})\s?(uhr|am|pm|h)?/i;
    const match = value.match(timeRegex);
    
    if (match) {
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2] || '0');
      const period = match[3]?.toLowerCase();
      
      let normalizedHours = hours;
      
      if (period === 'pm' && hours < 12) {
        normalizedHours += 12;
      } else if (period === 'am' && hours === 12) {
        normalizedHours = 0;
      }
      
      return `${normalizedHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    return value;
  }
  
  normalizeDate(value) {
    const dateMap = {
      'heute': 'today', 'hüt': 'today',
      'morgen': 'tomorrow', 'morn': 'tomorrow',
      'übermorgen': 'day_after_tomorrow', 'übermorge': 'day_after_tomorrow',
      'gestern': 'yesterday', 'geschter': 'yesterday',
      'vorgestern': 'day_before_yesterday', 'vorgeschter': 'day_before_yesterday'
    };
    
    const cleaned = value.toLowerCase().trim();
    return dateMap[cleaned] || value;
  }
  
  normalizeCurrency(value) {
    const amount = parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.'));
    return isNaN(amount) ? value : amount;
  }
  
  normalizeQuantity(value) {
    const quantityRegex = /(\d+)x?/i;
    const match = value.match(quantityRegex);
    
    if (match) {
      return parseInt(match[1]);
    }
    
    return this.normalizeNumber(value);
  }
  
  // ============================================================================
  // CONFIDENCE CALCULATION
  // ============================================================================
  
  calculateExactConfidence(match, text, command) {
    let confidence = CONFIDENCE_THRESHOLDS.EXACT;
    
    // Adjust based on match length vs text length
    const matchRatio = match[0].length / text.length;
    confidence *= Math.min(matchRatio * 1.2, 1.0);
    
    // Boost for command-specific confidence
    confidence *= (command.confidence || 1.0);
    
    // Context boost
    if (this.currentContext && this.isContextRelevant(command, this.currentContext)) {
      confidence *= 1.1;
    }
    
    return Math.min(confidence, 1.0);
  }
  
  calculateFuzzyConfidence(similarity, command) {
    let confidence = similarity * 0.8; // Base fuzzy confidence penalty
    
    // Command-specific confidence
    confidence *= (command.confidence || 1.0);
    
    // Context boost
    if (this.currentContext && this.isContextRelevant(command, this.currentContext)) {
      confidence *= 1.1;
    }
    
    return Math.min(confidence, 0.95); // Cap fuzzy matches below exact
  }
  
  calculatePartialConfidence(keywordMatches, textWords, command) {
    const matchRatio = keywordMatches.length / textWords.length;
    let confidence = matchRatio * 0.6; // Base partial confidence
    
    // Boost for important keywords
    const importantKeywords = ['bestellen', 'kaufen', 'zeigen', 'gehen', 'öffnen', 'schließen'];
    const hasImportantKeyword = keywordMatches.some(match => 
      importantKeywords.some(keyword => match.includes(keyword))
    );
    
    if (hasImportantKeyword) {
      confidence *= 1.3;
    }
    
    // Command-specific confidence
    confidence *= (command.confidence || 1.0);
    
    return Math.min(confidence, 0.8); // Cap partial matches
  }
  
  calculateSemanticConfidence(semanticSimilarity, command) {
    let confidence = semanticSimilarity * 0.7; // Base semantic confidence
    
    // Command-specific confidence
    confidence *= (command.confidence || 1.0);
    
    return Math.min(confidence, 0.85); // Cap semantic matches
  }
  
  // ============================================================================
  // HELPER METHODS
  // ============================================================================
  
  preprocessText(text) {
    let processed = text.toLowerCase().trim();
    
    // Remove punctuation
    processed = processed.replace(/[.,!?;:]/g, ' ');
    
    // Normalize whitespace
    processed = processed.replace(/\s+/g, ' ');
    
    // Remove stopwords (optional, can be disabled for better context)
    if (this.removeStopwords) {
      const words = processed.split(' ');
      const filteredWords = words.filter(word => !this.stopwords.has(word));
      processed = filteredWords.join(' ');
    }
    
    return processed.trim();
  }
  
  tokenize(text) {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }
  
  regexToText(regexPattern) {
    // Convert regex pattern to readable text for fuzzy matching
    return regexPattern
      .replace(/\(\?\<\w+\>/g, '') // Remove named group syntax
      .replace(/[\(\)\[\]]/g, ' ') // Remove grouping
      .replace(/[.*+?^${}|\\]/g, ' ') // Remove regex metacharacters
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  calculateWordSimilarity(words1, words2) {
    if (words1.length === 0 || words2.length === 0) return 0;
    
    let totalSimilarity = 0;
    let comparisons = 0;
    
    for (const word1 of words1) {
      let bestSimilarity = 0;
      
      for (const word2 of words2) {
        const similarity = jaroWinkler(word1, word2);
        bestSimilarity = Math.max(bestSimilarity, similarity);
      }
      
      totalSimilarity += bestSimilarity;
      comparisons++;
    }
    
    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }
  
  findKeywordMatches(textWords, command) {
    const keywordMatches = [];
    
    // Extract keywords from command examples
    const commandKeywords = new Set();
    
    if (command.examples) {
      command.examples.forEach(example => {
        const exampleWords = this.tokenize(example);
        exampleWords.forEach(word => {
          if (!this.stopwords.has(word) && word.length > 2) {
            commandKeywords.add(word);
          }
        });
      });
    }
    
    // Find matches
    textWords.forEach(word => {
      if (commandKeywords.has(word)) {
        keywordMatches.push(word);
      }
    });
    
    return keywordMatches;
  }
  
  extractSemanticKeywords(text) {
    // Extract meaningful words for semantic matching
    const words = this.tokenize(text);
    return words.filter(word => 
      !this.stopwords.has(word) && 
      word.length > 2 &&
      !/^\d+$/.test(word) // Not just numbers
    );
  }
  
  getCommandSemanticKeywords(command) {
    const keywords = new Set();
    
    // Extract from intent
    if (command.intent) {
      keywords.add(command.intent.replace(/_/g, ' '));
    }
    
    // Extract from examples
    if (command.examples) {
      command.examples.forEach(example => {
        const words = this.extractSemanticKeywords(example);
        words.forEach(word => keywords.add(word));
      });
    }
    
    return Array.from(keywords);
  }
  
  calculateSemanticSimilarity(keywords1, keywords2) {
    if (keywords1.length === 0 || keywords2.length === 0) return 0;
    
    let matches = 0;
    
    for (const keyword1 of keywords1) {
      for (const keyword2 of keywords2) {
        if (jaroWinkler(keyword1, keyword2) > 0.8) {
          matches++;
          break;
        }
      }
    }
    
    return matches / Math.max(keywords1.length, keywords2.length);
  }
  
  findBestEntityMatch(entities, paramType, paramName) {
    if (!entities || !paramType) return null;
    
    // Map parameter types to entity types
    const typeMapping = {
      [PARAMETER_TYPES.NUMBER]: ['number', 'quantity'],
      [PARAMETER_TYPES.DATE]: ['date'],
      [PARAMETER_TYPES.TIME]: ['time'],
      [PARAMETER_TYPES.ENTITY]: ['table', 'person', 'currency']
    };
    
    const relevantTypes = typeMapping[paramType] || ['string'];
    
    for (const type of relevantTypes) {
      if (entities[type] && entities[type].length > 0) {
        return entities[type][0].normalized;
      }
    }
    
    return null;
  }
  
  isContextRelevant(command, context) {
    if (!context || !this.contextEnabled) return true;
    
    // Check if command is relevant to current context
    if (command.contexts && !command.contexts.includes(context.type)) {
      return false;
    }
    
    // Check category relevance
    const contextRelevantCategories = {
      'order_creation': ['orders', 'cart', 'menu'],
      'navigation': ['navigation', 'system'],
      'restaurant': ['restaurant', 'orders', 'menu']
    };
    
    const relevantCategories = contextRelevantCategories[context.type];
    if (relevantCategories && !relevantCategories.includes(command.category)) {
      return false;
    }
    
    return true;
  }
  
  processParameterValue(value, paramType) {
    switch (paramType) {
      case PARAMETER_TYPES.NUMBER:
        return this.normalizeNumber(value);
      case PARAMETER_TYPES.DATE:
        return this.normalizeDate(value);
      case PARAMETER_TYPES.TIME:
        return this.normalizeTime(value);
      case PARAMETER_TYPES.BOOLEAN:
        return ['ja', 'yes', 'true', '1', 'wahr'].includes(value.toLowerCase());
      default:
        return value.trim();
    }
  }
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  findSimilar(inputText, maxResults = 5) {
    const results = [];
    
    for (const [id, command] of this.compiledPatterns.entries()) {
      if (!command.examples) continue;
      
      for (const example of command.examples) {
        const similarity = jaroWinkler(inputText.toLowerCase(), example.toLowerCase());
        
        if (similarity > 0.3) {
          results.push({
            ...command,
            example,
            similarity,
            id
          });
        }
      }
    }
    
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);
  }
  
  setContext(context) {
    this.currentContext = context;
  }
  
  createEmptyResult() {
    this.stats.failedMatches++;
    
    return {
      intent: null,
      confidence: 0,
      matchType: null,
      pattern: null,
      category: null,
      params: {},
      command: null
    };
  }
  
  updateStatistics(result) {
    if (result.confidence > 0) {
      this.stats.averageConfidence = 
        (this.stats.averageConfidence * (this.stats.totalMatches - 1) + result.confidence) / 
        this.stats.totalMatches;
    }
  }
  
  addToHistory(result) {
    this.matchHistory.unshift({
      ...result,
      timestamp: Date.now()
    });
    
    // Keep only last 100 matches
    if (this.matchHistory.length > 100) {
      this.matchHistory = this.matchHistory.slice(0, 100);
    }
  }
  
  getStatistics() {
    return {
      ...this.stats,
      successRate: this.stats.totalMatches > 0 ? 
        ((this.stats.totalMatches - this.stats.failedMatches) / this.stats.totalMatches) : 0
    };
  }
  
  clearHistory() {
    this.matchHistory = [];
  }
  
  clearCache() {
    this.entityCache.clear();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default CommandMatcher;

export {
  MATCH_TYPES,
  CONFIDENCE_THRESHOLDS,
  PARAMETER_TYPES,
  ENTITY_PATTERNS
};