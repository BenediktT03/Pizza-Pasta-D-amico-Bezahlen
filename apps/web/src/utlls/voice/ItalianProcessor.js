/**
 * EATECH - Italian Language Processor
 * Version: 4.1.0
 * Description: Advanced Italian language processing for voice recognition and TTS
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/utils/voice/ItalianProcessor.js
 * 
 * Features:
 * - Standard Italian (it-IT) and Swiss Italian (it-CH) support
 * - Regional dialect recognition and processing
 * - Italian cuisine terminology optimization
 * - Phonetic corrections and word normalization
 * - Context-aware processing for restaurant orders
 * - Gender and number agreement handling
 * - Statistical tracking and confidence boosting
 */

// ============================================================================
// ITALIAN LANGUAGE MAPPINGS & VOCABULARY
// ============================================================================

const REGIONAL_MAPPINGS = {
  // Standard Italian
  'it-IT': {
    // Northern Italian variations
    'xe': 'è',
    'ghe': 'c\'è',
    'no ghe': 'non c\'è',
    'massa': 'troppo',
    'tanto': 'molto',
    'parecchio': 'molto',
    'assai': 'molto',
    'bello': 'molto',
    'mo': 'adesso',
    'nennanche': 'neanche',
    'gnente': 'niente',
    'gnun': 'nessuno',
    
    // Southern Italian variations
    'nu poco': 'un poco',
    'nu sacco': 'molto',
    'nu casino': 'molto',
    'mo\' mo\'': 'subito',
    'accussì': 'così',
    'pure': 'anche',
    'mica': 'non',
    'annamo': 'andiamo',
    'famo': 'facciamo',
    'damo': 'diamo',
    'stamo': 'stiamo',
    
    // Roman dialect
    'de': 'di',
    'pe': 'per',
    'co': 'con',
    'sò': 'sono',
    'faccio': 'faccio',
    'dico': 'dico',
    'vado': 'vado',
    'vengo': 'vengo',
    'porto': 'porto'
  },
  
  // Swiss Italian (Ticino)
  'it-CH': {
    'natel': 'cellulare',
    'azione': 'offerta',
    'posto': 'posto di lavoro',
    'formazione': 'formazione',
    'buongiorno': 'buongiorno',
    'buonasera': 'buonasera',
    'prego': 'prego',
    'grazie': 'grazie',
    'scusi': 'scusi',
    'permesso': 'permesso',
    
    // Ticino specific food terms
    'polenta': 'polenta',
    'risotto': 'risotto',
    'ossobuco': 'ossobuco',
    'cotoletta': 'cotoletta',
    'brasato': 'brasato',
    'agnolotti': 'agnolotti',
    'gnocchi': 'gnocchi',
    
    // Swiss-Italian mixed terms
    'rösti': 'rösti',
    'fondue': 'fonduta',
    'raclette': 'raclette',
    'bratwurst': 'salsiccia tedesca',
    'schnitzel': 'cotoletta viennese'
  }
};

const ITALIAN_FOOD_TERMS = {
  // Primi piatti (First courses)
  'pasta': 'pasta',
  'spaghetti': 'spaghetti',
  'penne': 'penne',
  'fusilli': 'fusilli',
  'rigatoni': 'rigatoni',
  'farfalle': 'farfalle',
  'linguine': 'linguine',
  'fettuccine': 'fettuccine',
  'tagliatelle': 'tagliatelle',
  'lasagne': 'lasagne',
  'ravioli': 'ravioli',
  'tortellini': 'tortellini',
  'gnocchi': 'gnocchi',
  'risotto': 'risotto',
  'risotto milanese': 'risotto alla milanese',
  'risotto funghi': 'risotto ai funghi',
  'risotto mare': 'risotto ai frutti di mare',
  
  // Secondi piatti (Main courses)
  'pizza': 'pizza',
  'pizza margherita': 'pizza margherita',
  'pizza marinara': 'pizza marinara',
  'pizza quattro stagioni': 'pizza quattro stagioni',
  'pizza quattro formaggi': 'pizza ai quattro formaggi',
  'pizza diavola': 'pizza diavola',
  'pizza capricciosa': 'pizza capricciosa',
  'pizza napoletana': 'pizza napoletana',
  'calzone': 'calzone',
  'focaccia': 'focaccia',
  
  // Carne (Meat)
  'bistecca': 'bistecca',
  'bistecca fiorentina': 'bistecca alla fiorentina',
  'ossobuco': 'ossobuco',
  'cotoletta': 'cotoletta',
  'cotoletta milanese': 'cotoletta alla milanese',
  'scaloppine': 'scaloppine',
  'saltimbocca': 'saltimbocca alla romana',
  'brasato': 'brasato',
  'spezzatino': 'spezzatino',
  'agnello': 'agnello',
  'vitello': 'vitello',
  'maiale': 'maiale',
  'pollo': 'pollo',
  'pollo parmigiana': 'pollo alla parmigiana',
  'pollo cacciatore': 'pollo alla cacciatora',
  
  // Pesce (Fish)
  'pesce': 'pesce',
  'branzino': 'branzino',
  'orata': 'orata',
  'salmone': 'salmone',
  'tonno': 'tonno',
  'baccalà': 'baccalà',
  'frutti di mare': 'frutti di mare',
  'vongole': 'vongole',
  'cozze': 'cozze',
  'gamberi': 'gamberi',
  'calamari': 'calamari',
  'polpo': 'polpo',
  'aragosta': 'aragosta',
  
  // Contorni (Side dishes)
  'insalata': 'insalata',
  'insalata mista': 'insalata mista',
  'insalata verde': 'insalata verde',
  'insalata caprese': 'insalata caprese',
  'verdure': 'verdure',
  'verdure grigliate': 'verdure grigliate',
  'patate': 'patate',
  'patate al forno': 'patate al forno',
  'patate fritte': 'patate fritte',
  'patatine': 'patatine fritte',
  'spinaci': 'spinaci',
  'zucchine': 'zucchine',
  'melanzane': 'melanzane',
  'peperoni': 'peperoni',
  'pomodori': 'pomodori',
  
  // Antipasti
  'antipasto': 'antipasto',
  'antipasto misto': 'antipasto misto',
  'bruschetta': 'bruschetta',
  'antipasto italiano': 'antipasto all\'italiana',
  'prosciutto': 'prosciutto',
  'prosciutto crudo': 'prosciutto crudo',
  'prosciutto cotto': 'prosciutto cotto',
  'salame': 'salame',
  'mortadella': 'mortadella',
  'bresaola': 'bresaola',
  'mozzarella': 'mozzarella',
  'mozzarella bufala': 'mozzarella di bufala',
  'burrata': 'burrata',
  'parmigiano': 'parmigiano reggiano',
  'gorgonzola': 'gorgonzola',
  'pecorino': 'pecorino',
  'ricotta': 'ricotta',
  
  // Dolci (Desserts)
  'tiramisù': 'tiramisù',
  'panna cotta': 'panna cotta',
  'gelato': 'gelato',
  'sorbetto': 'sorbetto',
  'cannoli': 'cannoli',
  'cassata': 'cassata',
  'sfogliatelle': 'sfogliatelle',
  'baba': 'babà',
  'pandoro': 'pandoro',
  'panettone': 'panettone',
  'crostata': 'crostata',
  'millefoglie': 'millefoglie',
  
  // Bevande (Drinks)
  'vino': 'vino',
  'vino rosso': 'vino rosso',
  'vino bianco': 'vino bianco',
  'prosecco': 'prosecco',
  'champagne': 'champagne',
  'spumante': 'spumante',
  'birra': 'birra',
  'acqua': 'acqua',
  'acqua naturale': 'acqua naturale',
  'acqua frizzante': 'acqua frizzante',
  'acqua gassata': 'acqua gassata',
  'spremuta': 'spremuta',
  'succo': 'succo di frutta',
  'caffè': 'caffè',
  'espresso': 'espresso',
  'cappuccino': 'cappuccino',
  'caffè latte': 'caffè latte',
  'macchiato': 'macchiato',
  'corretto': 'caffè corretto',
  'americano': 'caffè americano',
  'tè': 'tè',
  'camomilla': 'camomilla',
  'tisana': 'tisana'
};

const COMMON_ITALIAN_WORDS = {
  // Numbers
  'zero': '0',
  'uno': '1',
  'due': '2',
  'tre': '3',
  'quattro': '4',
  'cinque': '5',
  'sei': '6',
  'sette': '7',
  'otto': '8',
  'nove': '9',
  'dieci': '10',
  'undici': '11',
  'dodici': '12',
  'tredici': '13',
  'quattordici': '14',
  'quindici': '15',
  'sedici': '16',
  'diciassette': '17',
  'diciotto': '18',
  'diciannove': '19',
  'venti': '20',
  'trenta': '30',
  'quaranta': '40',
  'cinquanta': '50',
  'sessanta': '60',
  'settanta': '70',
  'ottanta': '80',
  'novanta': '90',
  'cento': '100',
  'mille': '1000',
  
  // Restaurant words
  'ordinare': 'ordinare',
  'vorrei': 'vorrei',
  'prendo': 'prendo',
  'prendiamo': 'prendiamo',
  'pagare': 'pagare',
  'conto': 'conto',
  'menu': 'menu',
  'carta': 'carta',
  'antipasto': 'antipasto',
  'primo': 'primo piatto',
  'secondo': 'secondo piatto',
  'contorno': 'contorno',
  'dolce': 'dolce',
  'bevanda': 'bevanda',
  'vino': 'vino',
  'acqua': 'acqua',
  'senza': 'senza',
  'con': 'con',
  'extra': 'extra',
  'aggiungere': 'aggiungere',
  'togliere': 'togliere',
  'cambiare': 'cambiare',
  'prego': 'prego',
  'grazie': 'grazie',
  'scusi': 'scusi',
  'cameriere': 'cameriere',
  'servizio': 'servizio',
  'tavolo': 'tavolo',
  'posto': 'posto',
  'prenotazione': 'prenotazione',
  'aspettare': 'aspettare',
  'subito': 'subito',
  'veloce': 'veloce',
  'lento': 'lento',
  'caldo': 'caldo',
  'freddo': 'freddo',
  'buono': 'buono',
  'ottimo': 'ottimo',
  'perfetto': 'perfetto'
};

const PHONETIC_REPLACEMENTS = {
  // Common mispronunciations
  'bruscheta': 'bruschetta',
  'spagheti': 'spaghetti',
  'rigatoni': 'rigatoni',
  'gnocci': 'gnocchi',
  'tiramisu': 'tiramisù',
  'pana cota': 'panna cotta',
  'mozarela': 'mozzarella',
  'parmiggiano': 'parmigiano',
  'prosciuto': 'prosciutto',
  'capuccino': 'cappuccino',
  'machato': 'macchiato',
  'espreso': 'espresso',
  'marinara': 'marinara',
  'margherita': 'margherita',
  'napoletana': 'napoletana',
  'caprichosa': 'capricciosa',
  'diavola': 'diavola',
  
  // Regional pronunciations
  'pomodoro': 'pomodoro',
  'basilico': 'basilico',
  'origano': 'origano',
  'rosmarino': 'rosmarino',
  'prezzemolo': 'prezzemolo',
  'aglio': 'aglio',
  'cipolla': 'cipolla',
  'peperoncino': 'peperoncino',
  'parmigiano': 'parmigiano reggiano',
  'pecorino': 'pecorino romano',
  
  // Swiss-Italian adaptations
  'fondu': 'fonduta',
  'raclette': 'raclette',
  'rosti': 'rösti',
  'bratwurst': 'salsiccia tedesca',
  'schnitzel': 'cotoletta viennese'
};

const RESTAURANT_COMMANDS = {
  'ordinare': ['ordinare', 'vorrei', 'prendo', 'prendiamo', 'desidero', 'voglio', 'mi porta'],
  'aggiungere': ['anche', 'inoltre', 'in più', 'aggiungere', 'extra', 'di più'],
  'togliere': ['senza', 'non', 'togliere', 'levare', 'via', 'eliminare'],
  'cambiare': ['cambiare', 'invece', 'piuttosto', 'al posto di', 'sostituire'],
  'pagare': ['pagare', 'conto', 'il conto', 'quanto costa', 'prezzo'],
  'aiuto': ['aiuto', 'che cosa', 'consiglio', 'cosa è', 'spiegare', 'come'],
  'ripetere': ['ripetere', 'ancora', 'di nuovo', 'come ha detto', 'scusi'],
  'annullare': ['annullare', 'basta', 'cancellare', 'lasciamo perdere', 'niente']
};

const ITALIAN_GRAMMAR = {
  // Articles
  'articles': {
    'masculine_singular': ['il', 'lo', 'l\'', 'un', 'uno'],
    'feminine_singular': ['la', 'l\'', 'una'],
    'masculine_plural': ['i', 'gli'],
    'feminine_plural': ['le']
  },
  
  // Common verb conjugations
  'verbs': {
    'essere': {
      'io': 'sono',
      'tu': 'sei',
      'lui/lei': 'è',
      'noi': 'siamo',
      'voi': 'siete',
      'loro': 'sono'
    },
    'avere': {
      'io': 'ho',
      'tu': 'hai',
      'lui/lei': 'ha',
      'noi': 'abbiamo',
      'voi': 'avete',
      'loro': 'hanno'
    },
    'volere': {
      'io': 'voglio',
      'tu': 'vuoi',
      'lui/lei': 'vuole',
      'noi': 'vogliamo',
      'voi': 'volete',
      'loro': 'vogliono'
    }
  },
  
  // Adjective endings
  'adjective_endings': {
    'masculine_singular': ['o'],
    'feminine_singular': ['a'],
    'masculine_plural': ['i'],
    'feminine_plural': ['e']
  }
};

// ============================================================================
// ITALIAN PROCESSOR CLASS
// ============================================================================

export class ItalianProcessor {
  constructor(options = {}) {
    this.variant = options.variant || 'it-IT'; // 'it-IT', 'it-CH'
    this.strictMode = options.strictMode || false;
    this.preserveOriginal = options.preserveOriginal || false;
    this.contextAware = options.contextAware !== false;
    this.enableRegionalDialects = options.enableRegionalDialects !== false;
    this.handleGrammar = options.handleGrammar !== false;
    
    // Initialize mappings based on variant
    this.regionalMap = REGIONAL_MAPPINGS[this.variant] || REGIONAL_MAPPINGS['it-IT'];
    this.foodTerms = ITALIAN_FOOD_TERMS;
    this.commonWords = COMMON_ITALIAN_WORDS;
    this.phoneticMap = PHONETIC_REPLACEMENTS;
    this.restaurantCommands = RESTAURANT_COMMANDS;
    this.grammar = ITALIAN_GRAMMAR;
    
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
      contextMatches: 0,
      grammarCorrections: 0
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
    
    // Special Italian patterns
    patterns.apostrophe = /(\w+)'(\w+)/g; // Handle l'acqua, dell'olio, etc.
    patterns.doubleConsonant = /([bcdfghjklmnpqrstvwxyz])\1/gi; // Italian double consonants
    patterns.articles = /\b(il|la|lo|gli|le|un|una|uno|del|della|dello|degli|delle|al|alla|allo|agli|alle|dal|dalla|dallo|dagli|dalle|nel|nella|nello|negli|nelle|sul|sulla|sullo|sugli|sulle)\b/gi;
    patterns.prepositions = /\b(di|a|da|in|con|su|per|tra|fra|sotto|sopra|dentro|fuori|davanti|dietro|accanto|vicino|lontano)\b/gi;
    patterns.numbers = /\b(zero|uno|due|tre|quattro|cinque|sei|sette|otto|nove|dieci|undici|dodici|tredici|quattordici|quindici|sedici|diciassette|diciotto|diciannove|venti|trenta|quaranta|cinquanta|sessanta|settanta|ottanta|novanta|cento|mille)\b/gi;
    
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
    normalized = normalized.replace(/\bchf\b/gi, 'franchi');
    normalized = normalized.replace(/\b&\b/gi, 'e');
    normalized = normalized.replace(/\becc\./gi, 'eccetera');
    normalized = normalized.replace(/\betc\./gi, 'eccetera');
    
    // Handle Italian apostrophes properly
    normalized = normalized.replace(/(\w+)'(\w+)/g, '$1 $2');
    
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
    
    // Handle Italian grammar if enabled
    if (this.handleGrammar) {
      processed = this.handleItalianGrammar(processed);
    }
    
    // Handle special Italian constructions
    processed = this.handleItalianConstructions(processed);
    
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
  
  handleItalianGrammar(text) {
    let result = text;
    
    // Handle article agreement
    result = this.correctArticleAgreement(result);
    
    // Handle adjective agreement
    result = this.correctAdjectiveAgreement(result);
    
    // Handle verb conjugations
    result = this.correctVerbConjugations(result);
    
    return result;
  }
  
  correctArticleAgreement(text) {
    let result = text;
    
    // Simple article corrections for common food items
    const corrections = {
      'un pizza': 'una pizza',
      'un insalata': 'un\'insalata',
      'un acqua': 'un\'acqua',
      'il pizza': 'la pizza',
      'il pasta': 'la pasta',
      'il carne': 'la carne'
    };
    
    for (const [wrong, correct] of Object.entries(corrections)) {
      const pattern = new RegExp(`\\b${this.escapeRegex(wrong)}\\b`, 'gi');
      if (pattern.test(result)) {
        result = result.replace(pattern, correct);
        this.stats.grammarCorrections++;
      }
    }
    
    return result;
  }
  
  correctAdjectiveAgreement(text) {
    let result = text;
    
    // Handle basic adjective agreement for food
    const adjectives = {
      'buono': { 'm_s': 'buono', 'f_s': 'buona', 'm_p': 'buoni', 'f_p': 'buone' },
      'freddo': { 'm_s': 'freddo', 'f_s': 'fredda', 'm_p': 'freddi', 'f_p': 'fredde' },
      'caldo': { 'm_s': 'caldo', 'f_s': 'calda', 'm_p': 'caldi', 'f_p': 'calde' }
    };
    
    // This would need more sophisticated grammar analysis
    // For now, just basic corrections
    return result;
  }
  
  correctVerbConjugations(text) {
    let result = text;
    
    // Handle common verb corrections
    const verbCorrections = {
      'io vuole': 'io voglio',
      'io è': 'io sono',
      'io ha': 'io ho',
      'tu sono': 'tu sei',
      'tu ho': 'tu hai'
    };
    
    for (const [wrong, correct] of Object.entries(verbCorrections)) {
      const pattern = new RegExp(`\\b${this.escapeRegex(wrong)}\\b`, 'gi');
      if (pattern.test(result)) {
        result = result.replace(pattern, correct);
        this.stats.grammarCorrections++;
      }
    }
    
    return result;
  }
  
  handleItalianConstructions(text) {
    let result = text;
    
    // Handle compound food names
    result = result.replace(/pizza\s+([a-z]+)/gi, (match, topping) => {
      if (this.foodTerms[`pizza ${topping}`]) {
        return this.foodTerms[`pizza ${topping}`];
      }
      return match;
    });
    
    // Handle "al" and "alla" constructions
    result = result.replace(/\b(pasta|risotto|pizza)\s+(al|alla)\s+(\w+)/gi, (match, food, prep, ingredient) => {
      return `${food} ${prep} ${ingredient}`;
    });
    
    // Handle diminutives
    result = result.replace(/(\w+)ino\b/gi, (match, base) => {
      // Handle common diminutives like cappuccino
      if (this.foodTerms[match.toLowerCase()]) {
        return this.foodTerms[match.toLowerCase()];
      }
      return match;
    });
    
    return result;
  }
  
  processNumbers(text) {
    let result = text;
    
    // Convert spelled-out numbers to digits
    const numberMap = {
      'zero': '0', 'uno': '1', 'due': '2', 'tre': '3', 'quattro': '4',
      'cinque': '5', 'sei': '6', 'sette': '7', 'otto': '8', 'nove': '9',
      'dieci': '10', 'undici': '11', 'dodici': '12', 'tredici': '13',
      'quattordici': '14', 'quindici': '15', 'sedici': '16', 'diciassette': '17',
      'diciotto': '18', 'diciannove': '19', 'venti': '20', 'trenta': '30',
      'quaranta': '40', 'cinquanta': '50', 'sessanta': '60', 'settanta': '70',
      'ottanta': '80', 'novanta': '90', 'cento': '100', 'mille': '1000'
    };
    
    for (const [word, number] of Object.entries(numberMap)) {
      const pattern = new RegExp(`\\b${word}\\b`, 'gi');
      result = result.replace(pattern, number);
    }
    
    // Handle compound numbers (e.g., "ventuno" -> "21")
    result = result.replace(/\b(venti|trenta|quaranta|cinquanta|sessanta|settanta|ottanta|novanta)(uno|due|tre|quattro|cinque|sei|sette|otto|nove)\b/gi, (match, tens, ones) => {
      const tensNum = numberMap[tens.toLowerCase()];
      const onesNum = numberMap[ones.toLowerCase()];
      
      if (tensNum && onesNum) {
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
    
    // Handle Italian capitalization rules
    result = this.applyItalianCapitalization(result);
    
    return result;
  }
  
  applyItalianCapitalization(text) {
    let result = text;
    
    // Capitalize proper nouns (pizza names, etc.)
    const properNouns = [
      'margherita', 'marinara', 'napoletana', 'capricciosa', 'quattro stagioni',
      'quattro formaggi', 'parmigiana', 'milanese', 'fiorentina', 'romana',
      'gorgonzola', 'mozzarella', 'parmigiano', 'prosciutto', 'bresaola'
    ];
    
    properNouns.forEach(noun => {
      const pattern = new RegExp(`\\b${this.escapeRegex(noun)}\\b`, 'gi');
      result = result.replace(pattern, noun.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' '));
    });
    
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
    const lengthBoost = Math.min(0.2, words.length / 15);
    
    // Boost confidence for food context
    let contextBoost = 0;
    if (this.currentContext === 'restaurant') {
      contextBoost = 0.1;
    }
    
    // Boost confidence for proper Italian grammar
    let grammarBoost = 0;
    if (this.hasProperItalianStructure(text)) {
      grammarBoost = 0.1;
    }
    
    return Math.min(1.0, baseConfidence + lengthBoost + contextBoost + grammarBoost);
  }
  
  hasProperItalianStructure(text) {
    // Check for proper Italian sentence structure
    const hasArticles = this.regexPatterns.articles.test(text);
    const hasProperVerbs = /\b(sono|è|ho|ha|voglio|vuole|prendo|prendiamo)\b/i.test(text);
    const hasItalianWords = Object.keys(this.commonWords).some(word => text.includes(word));
    
    return hasArticles || hasProperVerbs || hasItalianWords;
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
          position: normalizedText.indexOf(food),
          category: this.categorizeFood(food)
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
    
    // Extract modifiers (con, senza, extra)
    const modifierPatterns = ['con', 'senza', 'extra', 'in più', 'anche'];
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
  
  categorizeFood(food) {
    if (food.includes('pizza')) return 'pizza';
    if (food.includes('pasta') || food.includes('spaghetti') || food.includes('penne')) return 'pasta';
    if (food.includes('risotto')) return 'risotto';
    if (food.includes('carne') || food.includes('pollo') || food.includes('bistecca')) return 'carne';
    if (food.includes('pesce') || food.includes('salmone') || food.includes('tonno')) return 'pesce';
    if (food.includes('dolce') || food.includes('gelato') || food.includes('tiramisù')) return 'dolce';
    if (food.includes('vino') || food.includes('birra') || food.includes('acqua')) return 'bevanda';
    return 'altro';
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
        (this.stats.contextMatches / this.stats.totalProcessed) : 0,
      grammarAccuracy: this.stats.totalProcessed > 0 ? 
        (this.stats.grammarCorrections / this.stats.totalProcessed) : 0
    };
  }
  
  resetStatistics() {
    this.stats = {
      totalProcessed: 0,
      dialectWordsFound: 0,
      replacementsMade: 0,
      confidenceBoosts: 0,
      contextMatches: 0,
      grammarCorrections: 0
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
      context: this.currentContext,
      handleGrammar: this.handleGrammar
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
      
      if (typeof config.handleGrammar === 'boolean') {
        this.handleGrammar = config.handleGrammar;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import Italian processor configuration:', error);
      return false;
    }
  }
}

// ============================================================================
// STATIC INITIALIZATION METHODS
// ============================================================================

export const initialize = async (options = {}) => {
  const processor = new ItalianProcessor(options);
  
  // Set default context for restaurant use
  processor.setContext('restaurant');
  
  return processor;
};

export const getSupportedVariants = () => Object.keys(REGIONAL_MAPPINGS);

export const getFoodTerms = () => ITALIAN_FOOD_TERMS;

export const getRestaurantCommands = () => RESTAURANT_COMMANDS;

export const getGrammar = () => ITALIAN_GRAMMAR;

// ============================================================================
// EXPORTS
// ============================================================================

export default ItalianProcessor;

export {
  REGIONAL_MAPPINGS,
  ITALIAN_FOOD_TERMS,
  COMMON_ITALIAN_WORDS,
  PHONETIC_REPLACEMENTS,
  RESTAURANT_COMMANDS,
  ITALIAN_GRAMMAR
};