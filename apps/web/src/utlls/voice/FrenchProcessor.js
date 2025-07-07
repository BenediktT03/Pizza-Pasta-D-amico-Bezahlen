/**
 * EATECH - French Language Processor
 * Version: 4.1.0
 * Description: Advanced French language processing for voice recognition and TTS
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/utils/voice/FrenchProcessor.js
 * 
 * Features:
 * - Standard French (fr-FR) and Swiss French (fr-CH) support
 * - Regional dialect recognition and processing
 * - French cuisine terminology optimization
 * - Phonetic corrections and liaison handling
 * - Context-aware processing for restaurant orders
 * - Gender and number agreement handling
 * - Statistical tracking and confidence boosting
 */

// ============================================================================
// FRENCH LANGUAGE MAPPINGS & VOCABULARY
// ============================================================================

const REGIONAL_MAPPINGS = {
  // Standard French (France)
  'fr-FR': {
    // Informal contractions
    'j\'suis': 'je suis',
    'j\'ai': 'j\'ai',
    'j\'veux': 'je veux',
    'j\'peux': 'je peux',
    'j\'dois': 'je dois',
    'j\'vais': 'je vais',
    'y\'a': 'il y a',
    'y\'en a': 'il y en a',
    'qu\'est-ce': 'qu\'est-ce que',
    'qu\'est-ce qu\'': 'qu\'est-ce que',
    'c\'est': 'c\'est',
    't\'es': 'tu es',
    't\'as': 'tu as',
    'm\'sieur': 'monsieur',
    'm\'dame': 'madame',
    'p\'tit': 'petit',
    'p\'tite': 'petite',
    
    // Regional expressions
    'ouais': 'oui',
    'nan': 'non',
    'ouaip': 'oui',
    'bah': 'bien',
    'ben': 'bien',
    'alors': 'alors',
    'donc': 'donc',
    'du coup': 'donc',
    'genre': 'comme',
    'en fait': 'en fait',
    'quoi': 'quoi',
    'hein': 'n\'est-ce pas',
    'dis donc': 'dis donc',
    'tiens': 'tiens',
    'voilà': 'voilà',
    'allez': 'allez'
  },
  
  // Swiss French (Suisse romande)
  'fr-CH': {
    // Swiss specific terms
    'septante': 'soixante-dix',
    'huitante': 'quatre-vingts',
    'octante': 'quatre-vingts',
    'nonante': 'quatre-vingt-dix',
    'déjeuner': 'petit-déjeuner',
    'dîner': 'déjeuner',
    'souper': 'dîner',
    'action': 'promotion',
    'natel': 'téléphone portable',
    'panosse': 'serpillière',
    'linge': 'vêtements',
    'cheni': 'désordre',
    'bobet': 'idiot',
    'carnotzet': 'cave à vin',
    'foehn': 'sèche-cheveux',
    'réclame': 'publicité',
    'service': 'service militaire',
    
    // Swiss French food terms
    'rösti': 'rösti',
    'fondue': 'fondue',
    'raclette': 'raclette',
    'croûte au fromage': 'croûte au fromage',
    'malakoff': 'malakoff',
    'cuchaule': 'cuchaule',
    'taillaule': 'taillaule',
    'bénichon': 'bénichon',
    'meringuette': 'meringuette',
    'vin chaud': 'vin chaud',
    'rivella': 'rivella',
    
    // German influences in Swiss French
    'putsch': 'coup d\'état',
    'vasistas': 'vasistas',
    'kitsch': 'kitsch',
    'ersatz': 'ersatz',
    'blitz': 'blitz',
    'leitmotiv': 'leitmotiv'
  }
};

const FRENCH_FOOD_TERMS = {
  // Entrées
  'entrée': 'entrée',
  'hors d\'oeuvre': 'hors d\'œuvre',
  'salade': 'salade',
  'salade verte': 'salade verte',
  'salade mixte': 'salade mixte',
  'salade niçoise': 'salade niçoise',
  'salade césar': 'salade césar',
  'soupe': 'soupe',
  'velouté': 'velouté',
  'bisque': 'bisque',
  'consommé': 'consommé',
  'potage': 'potage',
  'bouillon': 'bouillon',
  'escargots': 'escargots',
  'foie gras': 'foie gras',
  'pâté': 'pâté',
  'terrine': 'terrine',
  'rillettes': 'rillettes',
  'charcuterie': 'charcuterie',
  
  // Plats principaux
  'boeuf': 'bœuf',
  'bœuf bourguignon': 'bœuf bourguignon',
  'pot au feu': 'pot-au-feu',
  'coq au vin': 'coq au vin',
  'cassoulet': 'cassoulet',
  'choucroute': 'choucroute',
  'ratatouille': 'ratatouille',
  'bouillabaisse': 'bouillabaisse',
  'confit de canard': 'confit de canard',
  'magret de canard': 'magret de canard',
  'côte de boeuf': 'côte de bœuf',
  'entrecôte': 'entrecôte',
  'filet de boeuf': 'filet de bœuf',
  'tournedos': 'tournedos',
  'bavette': 'bavette',
  'onglet': 'onglet',
  'blanquette de veau': 'blanquette de veau',
  'escalope de veau': 'escalope de veau',
  'côtelette': 'côtelette',
  'gigot d\'agneau': 'gigot d\'agneau',
  'carré d\'agneau': 'carré d\'agneau',
  
  // Volaille
  'poulet': 'poulet',
  'poulet rôti': 'poulet rôti',
  'poulet fermier': 'poulet fermier',
  'canard': 'canard',
  'oie': 'oie',
  'dinde': 'dinde',
  'pintade': 'pintade',
  'caille': 'caille',
  'faisan': 'faisan',
  
  // Poissons et fruits de mer
  'poisson': 'poisson',
  'saumon': 'saumon',
  'truite': 'truite',
  'sole': 'sole',
  'turbot': 'turbot',
  'bar': 'bar',
  'daurade': 'daurade',
  'loup': 'loup de mer',
  'cabillaud': 'cabillaud',
  'merlan': 'merlan',
  'lieu': 'lieu',
  'colin': 'colin',
  'thon': 'thon',
  'sardine': 'sardine',
  'maquereau': 'maquereau',
  'huîtres': 'huîtres',
  'moules': 'moules',
  'coquilles saint-jacques': 'coquilles Saint-Jacques',
  'homard': 'homard',
  'langouste': 'langouste',
  'langoustines': 'langoustines',
  'crevettes': 'crevettes',
  'crabe': 'crabe',
  'tourteau': 'tourteau',
  
  // Légumes
  'légumes': 'légumes',
  'pommes de terre': 'pommes de terre',
  'purée': 'purée',
  'frites': 'frites',
  'gratin dauphinois': 'gratin dauphinois',
  'ratatouille': 'ratatouille',
  'haricots verts': 'haricots verts',
  'petits pois': 'petits pois',
  'épinards': 'épinards',
  'brocolis': 'brocolis',
  'choux-fleurs': 'choux-fleurs',
  'courgettes': 'courgettes',
  'aubergines': 'aubergines',
  'tomates': 'tomates',
  'oignons': 'oignons',
  'échalotes': 'échalotes',
  'ail': 'ail',
  'persil': 'persil',
  'ciboulette': 'ciboulette',
  'basilic': 'basilic',
  'thym': 'thym',
  'romarin': 'romarin',
  'laurier': 'laurier',
  
  // Fromages
  'fromage': 'fromage',
  'camembert': 'camembert',
  'brie': 'brie',
  'roquefort': 'roquefort',
  'comté': 'comté',
  'gruyère': 'gruyère',
  'emmental': 'emmental',
  'cantal': 'cantal',
  'reblochon': 'reblochon',
  'munster': 'munster',
  'pont l\'évêque': 'pont-l\'évêque',
  'maroilles': 'maroilles',
  'chèvre': 'fromage de chèvre',
  'crottin': 'crottin de chavignol',
  'saint-nectaire': 'saint-nectaire',
  'beaufort': 'beaufort',
  
  // Desserts
  'dessert': 'dessert',
  'tarte': 'tarte',
  'tarte tatin': 'tarte tatin',
  'tarte aux pommes': 'tarte aux pommes',
  'tarte citron': 'tarte au citron',
  'crème brûlée': 'crème brûlée',
  'mousse au chocolat': 'mousse au chocolat',
  'profiteroles': 'profiteroles',
  'éclair': 'éclair',
  'mille-feuille': 'mille-feuille',
  'saint-honoré': 'saint-honoré',
  'paris-brest': 'paris-brest',
  'religieuse': 'religieuse',
  'macaron': 'macaron',
  'madeleine': 'madeleine',
  'financier': 'financier',
  'cannelé': 'cannelé',
  'clafoutis': 'clafoutis',
  'far breton': 'far breton',
  'île flottante': 'île flottante',
  'poire belle hélène': 'poire belle hélène',
  'glace': 'glace',
  'sorbet': 'sorbet',
  
  // Boissons
  'vin': 'vin',
  'vin rouge': 'vin rouge',
  'vin blanc': 'vin blanc',
  'vin rosé': 'vin rosé',
  'champagne': 'champagne',
  'crémant': 'crémant',
  'bordeaux': 'bordeaux',
  'bourgogne': 'bourgogne',
  'beaujolais': 'beaujolais',
  'côtes du rhône': 'côtes du rhône',
  'sancerre': 'sancerre',
  'chablis': 'chablis',
  'muscadet': 'muscadet',
  'bière': 'bière',
  'eau': 'eau',
  'eau plate': 'eau plate',
  'eau gazeuse': 'eau gazeuse',
  'eau pétillante': 'eau pétillante',
  'perrier': 'perrier',
  'badoit': 'badoit',
  'jus': 'jus',
  'jus d\'orange': 'jus d\'orange',
  'jus de pomme': 'jus de pomme',
  'café': 'café',
  'expresso': 'expresso',
  'café au lait': 'café au lait',
  'cappuccino': 'cappuccino',
  'thé': 'thé',
  'infusion': 'infusion',
  'tisane': 'tisane',
  
  // Swiss French specialties
  'fondue moitié-moitié': 'fondue moitié-moitié',
  'fondue vacherin': 'fondue au vacherin',
  'raclette valaisanne': 'raclette valaisanne',
  'croûte au fromage': 'croûte au fromage',
  'malakoff': 'malakoff',
  'papet vaudois': 'papet vaudois',
  'longeole': 'longeole',
  'saucisson vaudois': 'saucisson vaudois',
  'tarte aux pruneaux': 'tarte aux pruneaux',
  'meringue double crème': 'meringue à la double crème'
};

const COMMON_FRENCH_WORDS = {
  // Numbers
  'zéro': '0',
  'un': '1',
  'deux': '2',
  'trois': '3',
  'quatre': '4',
  'cinq': '5',
  'six': '6',
  'sept': '7',
  'huit': '8',
  'neuf': '9',
  'dix': '10',
  'onze': '11',
  'douze': '12',
  'treize': '13',
  'quatorze': '14',
  'quinze': '15',
  'seize': '16',
  'dix-sept': '17',
  'dix-huit': '18',
  'dix-neuf': '19',
  'vingt': '20',
  'trente': '30',
  'quarante': '40',
  'cinquante': '50',
  'soixante': '60',
  'soixante-dix': '70',
  'quatre-vingts': '80',
  'quatre-vingt-dix': '90',
  'cent': '100',
  'mille': '1000',
  
  // Swiss numbers
  'septante': '70',
  'huitante': '80',
  'octante': '80',
  'nonante': '90',
  
  // Restaurant vocabulary
  'commander': 'commander',
  'je voudrais': 'je voudrais',
  'j\'aimerais': 'j\'aimerais',
  'je prends': 'je prends',
  'nous prenons': 'nous prenons',
  'payer': 'payer',
  'l\'addition': 'l\'addition',
  'la note': 'la note',
  'menu': 'menu',
  'carte': 'carte',
  'entrée': 'entrée',
  'plat principal': 'plat principal',
  'plat': 'plat',
  'dessert': 'dessert',
  'boisson': 'boisson',
  'apéritif': 'apéritif',
  'digestif': 'digestif',
  'sans': 'sans',
  'avec': 'avec',
  'en plus': 'en plus',
  'à part': 'à part',
  'supplémentaire': 'supplémentaire',
  'ajouter': 'ajouter',
  'enlever': 'enlever',
  'changer': 'changer',
  'remplacer': 'remplacer',
  's\'il vous plaît': 's\'il vous plaît',
  'merci': 'merci',
  'excusez-moi': 'excusez-moi',
  'pardon': 'pardon',
  'serveur': 'serveur',
  'serveuse': 'serveuse',
  'service': 'service',
  'table': 'table',
  'place': 'place',
  'réservation': 'réservation',
  'attendre': 'attendre',
  'tout de suite': 'tout de suite',
  'rapidement': 'rapidement',
  'lentement': 'lentement',
  'chaud': 'chaud',
  'froid': 'froid',
  'tiède': 'tiède',
  'bon': 'bon',
  'délicieux': 'délicieux',
  'excellent': 'excellent',
  'parfait': 'parfait'
};

const PHONETIC_REPLACEMENTS = {
  // Common mispronunciations and liaison issues
  'crevète': 'crevette',
  'omlet': 'omelette',
  'bœf': 'bœuf',
  'bef': 'bœuf',
  'bourg': 'bourguignon',
  'borgignon': 'bourguignon',
  'casoulet': 'cassoulet',
  'ratatouil': 'ratatouille',
  'bouillabès': 'bouillabaisse',
  'bouiyabès': 'bouillabaisse',
  'konfi': 'confit',
  'magré': 'magret',
  'rôti': 'rôti',
  'kremé': 'crémé',
  'ekspresso': 'expresso',
  'kapuchino': 'cappuccino',
  'champaigne': 'champagne',
  'bordeau': 'bordeaux',
  'borgogne': 'bourgogne',
  'bojo': 'beaujolais',
  'bojolais': 'beaujolais',
  'sansèr': 'sancerre',
  'chabli': 'chablis',
  'gruyèr': 'gruyère',
  'emmental': 'emmental',
  'kanté': 'cantal',
  'rebloshon': 'reblochon',
  'munstèr': 'munster',
  'rokefor': 'roquefort',
  'kamember': 'camembert',
  'bri': 'brie',
  
  // Swiss French specific
  'röchti': 'rösti',
  'fondü': 'fondue',
  'raklet': 'raclette',
  'malakof': 'malakoff',
  'rivèla': 'rivella',
  'kukhaule': 'cuchaule',
  'tayaule': 'taillaule',
  'bénishon': 'bénichon',
  
  // Liaison and elision corrections
  'les escargot': 'les escargots',
  'des huitre': 'des huîtres',
  'un oeuf': 'un œuf',
  'des oeuf': 'des œufs',
  'le agneau': 'l\'agneau',
  'le eau': 'l\'eau',
  'le addition': 'l\'addition'
};

const RESTAURANT_COMMANDS = {
  'commander': ['commander', 'je voudrais', 'j\'aimerais', 'je prends', 'nous prenons', 'je vais prendre', 'donnez-moi'],
  'ajouter': ['aussi', 'en plus', 'également', 'ajouter', 'avec', 'et', 'plus'],
  'enlever': ['sans', 'pas de', 'enlever', 'retirer', 'ôter', 'supprimer'],
  'changer': ['changer', 'remplacer', 'plutôt', 'à la place', 'au lieu de'],
  'payer': ['payer', 'l\'addition', 'la note', 'combien', 'le prix', 'régler'],
  'aide': ['aide', 'qu\'est-ce que', 'conseil', 'recommandation', 'expliquer', 'c\'est quoi'],
  'répéter': ['répéter', 'encore', 'redire', 'comment', 'pardon', 'excusez-moi'],
  'annuler': ['annuler', 'arrêter', 'stop', 'laissez tomber', 'tant pis', 'oublier']
};

const FRENCH_GRAMMAR = {
  // Articles
  'articles': {
    'definite': {
      'masculine_singular': 'le',
      'feminine_singular': 'la',
      'plural': 'les',
      'elision': 'l\''
    },
    'indefinite': {
      'masculine_singular': 'un',
      'feminine_singular': 'une',
      'plural': 'des'
    },
    'partitive': {
      'masculine': 'du',
      'feminine': 'de la',
      'plural': 'des',
      'elision': 'de l\''
    }
  },
  
  // Common verb conjugations
  'verbs': {
    'être': {
      'je': 'suis',
      'tu': 'es',
      'il/elle': 'est',
      'nous': 'sommes',
      'vous': 'êtes',
      'ils/elles': 'sont'
    },
    'avoir': {
      'je': 'ai',
      'tu': 'as',
      'il/elle': 'a',
      'nous': 'avons',
      'vous': 'avez',
      'ils/elles': 'ont'
    },
    'vouloir': {
      'je': 'veux',
      'tu': 'veux',
      'il/elle': 'veut',
      'nous': 'voulons',
      'vous': 'voulez',
      'ils/elles': 'veulent'
    },
    'prendre': {
      'je': 'prends',
      'tu': 'prends',
      'il/elle': 'prend',
      'nous': 'prenons',
      'vous': 'prenez',
      'ils/elles': 'prennent'
    }
  },
  
  // Adjective agreement
  'adjective_endings': {
    'masculine_singular': '',
    'feminine_singular': 'e',
    'masculine_plural': 's',
    'feminine_plural': 'es'
  },
  
  // Liaison rules
  'liaison': {
    'mandatory': ['les_', 'des_', 'mes_', 'tes_', 'ses_', 'nos_', 'vos_', 'leurs_'],
    'forbidden': ['et_', 'ou_'],
    'optional': ['pas_', 'très_', 'trop_', 'bien_']
  }
};

// ============================================================================
// FRENCH PROCESSOR CLASS
// ============================================================================

export class FrenchProcessor {
  constructor(options = {}) {
    this.variant = options.variant || 'fr-FR'; // 'fr-FR', 'fr-CH'
    this.strictMode = options.strictMode || false;
    this.preserveOriginal = options.preserveOriginal || false;
    this.contextAware = options.contextAware !== false;
    this.enableRegionalDialects = options.enableRegionalDialects !== false;
    this.handleGrammar = options.handleGrammar !== false;
    this.handleLiaison = options.handleLiaison !== false;
    
    // Initialize mappings based on variant
    this.regionalMap = REGIONAL_MAPPINGS[this.variant] || REGIONAL_MAPPINGS['fr-FR'];
    this.foodTerms = FRENCH_FOOD_TERMS;
    this.commonWords = COMMON_FRENCH_WORDS;
    this.phoneticMap = PHONETIC_REPLACEMENTS;
    this.restaurantCommands = RESTAURANT_COMMANDS;
    this.grammar = FRENCH_GRAMMAR;
    
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
      grammarCorrections: 0,
      liaisonCorrections: 0
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
    
    // Special French patterns
    patterns.elision = /(le|la|de|se|me|te|ce|que|ne|si)\s+([aeiouhy])/gi;
    patterns.liaison = /([sz])\s+([aeiouhy])/gi;
    patterns.accents = /[àâäéèêëïîôùûüÿç]/g;
    patterns.articles = /\b(le|la|les|un|une|des|du|de\s+la|de\s+l'|au|aux|à\s+la|à\s+l')\b/gi;
    patterns.contractions = /\b(j'|d'|l'|m'|t'|s'|c'|n'|qu')\b/gi;
    patterns.numbers = /\b(zéro|un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|dix-sept|dix-huit|dix-neuf|vingt|trente|quarante|cinquante|soixante|soixante-dix|quatre-vingts|quatre-vingt-dix|cent|mille|septante|huitante|octante|nonante)\b/gi;
    
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
    normalized = normalized.replace(/\bchf\b/gi, 'franc');
    normalized = normalized.replace(/\b&\b/gi, 'et');
    normalized = normalized.replace(/\betc\./gi, 'et cetera');
    normalized = normalized.replace(/\bm\./gi, 'monsieur');
    normalized = normalized.replace(/\bmme\./gi, 'madame');
    normalized = normalized.replace(/\bmlle\./gi, 'mademoiselle');
    
    // Handle French contractions and elisions properly
    normalized = this.handleFrenchContractions(normalized);
    
    // Normalize punctuation
    normalized = normalized.replace(/[.,!?;:]/g, '');
    
    return normalized;
  }
  
  handleFrenchContractions(text) {
    let result = text;
    
    // Handle elisions that might be incorrectly separated
    const elisions = {
      'le eau': 'l\'eau',
      'le addition': 'l\'addition',
      'le agneau': 'l\'agneau',
      'le orange': 'l\'orange',
      'la eau': 'l\'eau',
      'de eau': 'de l\'eau',
      'que est-ce': 'qu\'est-ce',
      'que il': 'qu\'il',
      'que elle': 'qu\'elle',
      'je ai': 'j\'ai',
      'je aime': 'j\'aime',
      'tu as': 'tu as',
      'ne est': 'n\'est',
      'se il': 's\'il',
      'ce est': 'c\'est'
    };
    
    for (const [separated, contracted] of Object.entries(elisions)) {
      const pattern = new RegExp(`\\b${this.escapeRegex(separated)}\\b`, 'gi');
      result = result.replace(pattern, contracted);
    }
    
    return result;
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
    
    // Handle French grammar if enabled
    if (this.handleGrammar) {
      processed = this.handleFrenchGrammar(processed);
    }
    
    // Handle liaison if enabled
    if (this.handleLiaison) {
      processed = this.handleFrenchLiaison(processed);
    }
    
    // Handle special French constructions
    processed = this.handleFrenchConstructions(processed);
    
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
  
  handleFrenchGrammar(text) {
    let result = text;
    
    // Handle article agreement
    result = this.correctArticleAgreement(result);
    
    // Handle adjective agreement
    result = this.correctAdjectiveAgreement(result);
    
    // Handle verb conjugations
    result = this.correctVerbConjugations(result);
    
    // Handle partitive articles
    result = this.correctPartitiveArticles(result);
    
    return result;
  }
  
  correctArticleAgreement(text) {
    let result = text;
    
    // Simple article corrections for common food items
    const corrections = {
      'un salade': 'une salade',
      'un eau': 'une eau',
      'un entrée': 'une entrée',
      'le salade': 'la salade',
      'le eau': 'l\'eau',
      'le entrée': 'l\'entrée',
      'un orange': 'une orange',
      'le orange': 'l\'orange'
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
  
  correctPartitiveArticles(text) {
    let result = text;
    
    // Handle partitive articles for food and drinks
    const partitives = {
      'de le vin': 'du vin',
      'de le pain': 'du pain',
      'de le fromage': 'du fromage',
      'de la l\'eau': 'de l\'eau',
      'de les légumes': 'des légumes',
      'de les frites': 'des frites'
    };
    
    for (const [wrong, correct] of Object.entries(partitives)) {
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
    
    // Handle basic adjective agreement for food descriptions
    const adjectives = {
      'bon': { 'm_s': 'bon', 'f_s': 'bonne', 'm_p': 'bons', 'f_p': 'bonnes' },
      'froid': { 'm_s': 'froid', 'f_s': 'froide', 'm_p': 'froids', 'f_p': 'froides' },
      'chaud': { 'm_s': 'chaud', 'f_s': 'chaude', 'm_p': 'chauds', 'f_p': 'chaudes' }
    };
    
    // Basic corrections for common food adjectives
    const basicCorrections = {
      'eau chaud': 'eau chaude',
      'salade froid': 'salade froide',
      'soupe froid': 'soupe froide',
      'bière chaud': 'bière chaude'
    };
    
    for (const [wrong, correct] of Object.entries(basicCorrections)) {
      const pattern = new RegExp(`\\b${this.escapeRegex(wrong)}\\b`, 'gi');
      if (pattern.test(result)) {
        result = result.replace(pattern, correct);
        this.stats.grammarCorrections++;
      }
    }
    
    return result;
  }
  
  correctVerbConjugations(text) {
    let result = text;
    
    // Handle common verb conjugation errors
    const verbCorrections = {
      'je veut': 'je veux',
      'je peut': 'je peux',
      'je sait': 'je sais',
      'tu veut': 'tu veux',
      'tu peut': 'tu peux',
      'tu sait': 'tu sais',
      'nous veut': 'nous voulons',
      'vous veut': 'vous voulez',
      'je prend': 'je prends',
      'tu prend': 'tu prends'
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
  
  handleFrenchLiaison(text) {
    let result = text;
    
    // Handle basic liaison corrections
    const liaisonCorrections = {
      'les escargot': 'les escargots',
      'des huitre': 'des huîtres',
      'mes ami': 'mes amis',
      'tes enfant': 'tes enfants',
      'nous avon': 'nous avons',
      'vous ete': 'vous êtes',
      'ils ont': 'ils ont',
      'elles ont': 'elles ont'
    };
    
    for (const [wrong, correct] of Object.entries(liaisonCorrections)) {
      const pattern = new RegExp(`\\b${this.escapeRegex(wrong)}\\b`, 'gi');
      if (pattern.test(result)) {
        result = result.replace(pattern, correct);
        this.stats.liaisonCorrections++;
      }
    }
    
    return result;
  }
  
  handleFrenchConstructions(text) {
    let result = text;
    
    // Handle compound dish names
    result = result.replace(/(tarte|soupe|crème|mousse)\s+(au|aux|à\s+la|de)\s+(\w+)/gi, (match, dish, prep, ingredient) => {
      return `${dish} ${prep} ${ingredient}`;
    });
    
    // Handle wine appellations
    result = result.replace(/\b(vin|côtes?)\s+(de|du|des)\s+(\w+)/gi, (match, type, prep, region) => {
      return `${type} ${prep} ${region}`;
    });
    
    // Handle "à la" constructions
    result = result.replace(/\b(\w+)\s+(à\s+la)\s+(\w+)/gi, (match, dish, prep, style) => {
      return `${dish} ${prep} ${style}`;
    });
    
    return result;
  }
  
  processNumbers(text) {
    let result = text;
    
    // Convert spelled-out numbers to digits
    const numberMap = {
      'zéro': '0', 'un': '1', 'deux': '2', 'trois': '3', 'quatre': '4',
      'cinq': '5', 'six': '6', 'sept': '7', 'huit': '8', 'neuf': '9',
      'dix': '10', 'onze': '11', 'douze': '12', 'treize': '13',
      'quatorze': '14', 'quinze': '15', 'seize': '16', 'dix-sept': '17',
      'dix-huit': '18', 'dix-neuf': '19', 'vingt': '20', 'trente': '30',
      'quarante': '40', 'cinquante': '50', 'soixante': '60',
      'soixante-dix': '70', 'quatre-vingts': '80', 'quatre-vingt-dix': '90',
      'cent': '100', 'mille': '1000',
      // Swiss French numbers
      'septante': '70', 'huitante': '80', 'octante': '80', 'nonante': '90'
    };
    
    for (const [word, number] of Object.entries(numberMap)) {
      const pattern = new RegExp(`\\b${word}\\b`, 'gi');
      result = result.replace(pattern, number);
    }
    
    // Handle compound numbers (e.g., "vingt-et-un" -> "21")
    result = result.replace(/\b(vingt|trente|quarante|cinquante|soixante|septante)[-\s]?(et[-\s]?)?(un|deux|trois|quatre|cinq|six|sept|huit|neuf)\b/gi, (match, tens, et, ones) => {
      const tensNum = numberMap[tens.toLowerCase()];
      const onesNum = numberMap[ones.toLowerCase()];
      
      if (tensNum && onesNum) {
        return (parseInt(tensNum) + parseInt(onesNum)).toString();
      }
      
      return match;
    });
    
    // Handle "quatre-vingt" compounds
    result = result.replace(/\bquatre-vingt[-\s]?(un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|dix-sept|dix-huit|dix-neuf)\b/gi, (match, ones) => {
      const onesNum = numberMap[ones.toLowerCase()] || ones;
      return (80 + parseInt(onesNum)).toString();
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
    
    // Handle French capitalization rules
    result = this.applyFrenchCapitalization(result);
    
    return result;
  }
  
  applyFrenchCapitalization(text) {
    let result = text;
    
    // Capitalize proper nouns (wine regions, cheese names, etc.)
    const properNouns = [
      'bordeaux', 'bourgogne', 'champagne', 'beaujolais', 'sancerre', 'chablis',
      'roquefort', 'camembert', 'brie', 'comté', 'reblochon', 'munster',
      'saint-jacques', 'saint-honoré', 'saint-nectaire', 'pont-l\'évêque',
      'paris-brest', 'belle hélène'
    ];
    
    properNouns.forEach(noun => {
      const pattern = new RegExp(`\\b${this.escapeRegex(noun)}\\b`, 'gi');
      result = result.replace(pattern, noun.split(/[\s-]/).map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(noun.includes('-') ? '-' : ' '));
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
    
    // Boost confidence for proper French grammar
    let grammarBoost = 0;
    if (this.hasProperFrenchStructure(text)) {
      grammarBoost = 0.1;
    }
    
    return Math.min(1.0, baseConfidence + lengthBoost + contextBoost + grammarBoost);
  }
  
  hasProperFrenchStructure(text) {
    // Check for proper French sentence structure
    const hasArticles = this.regexPatterns.articles.test(text);
    const hasProperVerbs = /\b(suis|es|est|sommes|êtes|sont|ai|as|a|avons|avez|ont|veux|veux|veut|voulons|voulez|veulent)\b/i.test(text);
    const hasFrenchWords = Object.keys(this.commonWords).some(word => text.includes(word));
    const hasContractions = this.regexPatterns.contractions.test(text);
    
    return hasArticles || hasProperVerbs || hasFrenchWords || hasContractions;
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
    
    // Extract modifiers (avec, sans, en plus)
    const modifierPatterns = ['avec', 'sans', 'en plus', 'à part', 'supplémentaire'];
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
    if (food.includes('vin') || food.includes('bière') || food.includes('eau') || food.includes('café') || food.includes('thé')) return 'boisson';
    if (food.includes('fromage') || food.includes('camembert') || food.includes('brie') || food.includes('roquefort')) return 'fromage';
    if (food.includes('tarte') || food.includes('gâteau') || food.includes('glace') || food.includes('dessert')) return 'dessert';
    if (food.includes('salade') || food.includes('soupe') || food.includes('entrée')) return 'entrée';
    if (food.includes('bœuf') || food.includes('porc') || food.includes('agneau') || food.includes('poulet')) return 'viande';
    if (food.includes('poisson') || food.includes('saumon') || food.includes('sole') || food.includes('huîtres')) return 'poisson';
    if (food.includes('légumes') || food.includes('pommes de terre') || food.includes('haricots')) return 'légumes';
    return 'plat';
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
        (this.stats.grammarCorrections / this.stats.totalProcessed) : 0,
      liaisonAccuracy: this.stats.totalProcessed > 0 ? 
        (this.stats.liaisonCorrections / this.stats.totalProcessed) : 0
    };
  }
  
  resetStatistics() {
    this.stats = {
      totalProcessed: 0,
      dialectWordsFound: 0,
      replacementsMade: 0,
      confidenceBoosts: 0,
      contextMatches: 0,
      grammarCorrections: 0,
      liaisonCorrections: 0
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
      handleGrammar: this.handleGrammar,
      handleLiaison: this.handleLiaison
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
      
      if (typeof config.handleLiaison === 'boolean') {
        this.handleLiaison = config.handleLiaison;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import French processor configuration:', error);
      return false;
    }
  }
}

// ============================================================================
// STATIC INITIALIZATION METHODS
// ============================================================================

export const initialize = async (options = {}) => {
  const processor = new FrenchProcessor(options);
  
  // Set default context for restaurant use
  processor.setContext('restaurant');
  
  return processor;
};

export const getSupportedVariants = () => Object.keys(REGIONAL_MAPPINGS);

export const getFoodTerms = () => FRENCH_FOOD_TERMS;

export const getRestaurantCommands = () => RESTAURANT_COMMANDS;

export const getGrammar = () => FRENCH_GRAMMAR;

// ============================================================================
// EXPORTS
// ============================================================================

export default FrenchProcessor;

export {
  REGIONAL_MAPPINGS,
  FRENCH_FOOD_TERMS,
  COMMON_FRENCH_WORDS,
  PHONETIC_REPLACEMENTS,
  RESTAURANT_COMMANDS,
  FRENCH_GRAMMAR
};