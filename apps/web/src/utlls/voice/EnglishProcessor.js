/**
 * EATECH - English Language Processor
 * Version: 4.1.0
 * Description: Advanced English language processing for voice recognition and TTS
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/utils/voice/EnglishProcessor.js
 * 
 * Features:
 * - American English (en-US) and British English (en-GB) support
 * - Regional dialect recognition and processing
 * - International cuisine terminology optimization
 * - Phonetic corrections and accent handling
 * - Context-aware processing for restaurant orders
 * - Colloquial and slang recognition
 * - Statistical tracking and confidence boosting
 */

// ============================================================================
// ENGLISH LANGUAGE MAPPINGS & VOCABULARY
// ============================================================================

const REGIONAL_MAPPINGS = {
  // American English
  'en-US': {
    // American contractions and informalities
    'gonna': 'going to',
    'wanna': 'want to',
    'gotta': 'got to',
    'hafta': 'have to',
    'shoulda': 'should have',
    'coulda': 'could have',
    'woulda': 'would have',
    'dunno': 'don\'t know',
    'lemme': 'let me',
    'gimme': 'give me',
    'whatcha': 'what are you',
    'betcha': 'bet you',
    'gotcha': 'got you',
    'kinda': 'kind of',
    'sorta': 'sort of',
    'lotta': 'lot of',
    'outta': 'out of',
    'y\'all': 'you all',
    'ain\'t': 'isn\'t',
    'isn\'t': 'is not',
    'won\'t': 'will not',
    'can\'t': 'cannot',
    'don\'t': 'do not',
    'doesn\'t': 'does not',
    'didn\'t': 'did not',
    'haven\'t': 'have not',
    'hasn\'t': 'has not',
    'hadn\'t': 'had not',
    'wouldn\'t': 'would not',
    'shouldn\'t': 'should not',
    'couldn\'t': 'could not',
    
    // American food terminology
    'fries': 'french fries',
    'soda': 'soft drink',
    'cookie': 'biscuit',
    'candy': 'sweets',
    'chips': 'potato chips',
    'takeout': 'takeaway',
    'to go': 'takeaway',
    'check': 'bill',
    'appetizer': 'starter',
    'entrée': 'main course',
    'cilantro': 'coriander',
    'arugula': 'rocket',
    'zucchini': 'courgette',
    'eggplant': 'aubergine'
  },
  
  // British English
  'en-GB': {
    // British contractions and informalities
    'innit': 'isn\'t it',
    'gonna': 'going to',
    'wanna': 'want to',
    'dunno': 'don\'t know',
    'blimey': 'goodness',
    'bloody': 'very',
    'quite': 'very',
    'rather': 'quite',
    'brilliant': 'excellent',
    'lovely': 'nice',
    'proper': 'real',
    'mad': 'crazy',
    'mental': 'crazy',
    'sorted': 'organized',
    'cheers': 'thank you',
    'ta': 'thank you',
    'mate': 'friend',
    'pal': 'friend',
    'guv': 'sir',
    'gov': 'sir',
    
    // British food terminology
    'chips': 'thick fries',
    'crisps': 'potato chips',
    'biscuit': 'cookie',
    'sweets': 'candy',
    'takeaway': 'takeout',
    'bill': 'check',
    'starter': 'appetizer',
    'main': 'main course',
    'pudding': 'dessert',
    'afters': 'dessert',
    'coriander': 'cilantro',
    'rocket': 'arugula',
    'courgette': 'zucchini',
    'aubergine': 'eggplant',
    'prawns': 'shrimp',
    'mince': 'ground meat',
    'rashers': 'bacon strips',
    'bangers': 'sausages',
    'bubble and squeak': 'fried leftovers',
    'spotted dick': 'steamed pudding',
    'toad in the hole': 'sausage in yorkshire pudding',
    'cottage pie': 'shepherd\'s pie with beef',
    'fish and chips': 'fish and chips',
    'full english': 'full english breakfast',
    'jacket potato': 'baked potato',
    'beans on toast': 'baked beans on toast'
  }
};

const ENGLISH_FOOD_TERMS = {
  // Appetizers / Starters
  'appetizer': 'appetizer',
  'starter': 'starter',
  'hors d\'oeuvres': 'hors d\'oeuvres',
  'canapés': 'canapés',
  'bruschetta': 'bruschetta',
  'nachos': 'nachos',
  'wings': 'chicken wings',
  'chicken wings': 'chicken wings',
  'buffalo wings': 'buffalo wings',
  'mozzarella sticks': 'mozzarella sticks',
  'onion rings': 'onion rings',
  'garlic bread': 'garlic bread',
  'breadsticks': 'breadsticks',
  'shrimp cocktail': 'shrimp cocktail',
  'calamari': 'calamari',
  'stuffed mushrooms': 'stuffed mushrooms',
  'deviled eggs': 'deviled eggs',
  
  // Soups
  'soup': 'soup',
  'chicken soup': 'chicken soup',
  'tomato soup': 'tomato soup',
  'mushroom soup': 'mushroom soup',
  'onion soup': 'french onion soup',
  'minestrone': 'minestrone',
  'clam chowder': 'clam chowder',
  'bisque': 'bisque',
  'gazpacho': 'gazpacho',
  'pho': 'pho',
  'ramen': 'ramen',
  'miso soup': 'miso soup',
  
  // Salads
  'salad': 'salad',
  'caesar salad': 'caesar salad',
  'greek salad': 'greek salad',
  'garden salad': 'garden salad',
  'house salad': 'house salad',
  'cobb salad': 'cobb salad',
  'waldorf salad': 'waldorf salad',
  'potato salad': 'potato salad',
  'coleslaw': 'coleslaw',
  'caprese salad': 'caprese salad',
  'spinach salad': 'spinach salad',
  'arugula salad': 'arugula salad',
  'mixed greens': 'mixed greens',
  
  // Main Courses - Meat
  'steak': 'steak',
  'ribeye': 'ribeye steak',
  'filet mignon': 'filet mignon',
  'new york strip': 'new york strip',
  'sirloin': 'sirloin',
  'porterhouse': 'porterhouse',
  't-bone': 't-bone steak',
  'beef': 'beef',
  'roast beef': 'roast beef',
  'prime rib': 'prime rib',
  'brisket': 'brisket',
  'short ribs': 'short ribs',
  'meatloaf': 'meatloaf',
  'meatballs': 'meatballs',
  'burger': 'hamburger',
  'hamburger': 'hamburger',
  'cheeseburger': 'cheeseburger',
  'bacon burger': 'bacon burger',
  'turkey burger': 'turkey burger',
  'veggie burger': 'veggie burger',
  
  // Pork
  'pork': 'pork',
  'pork chops': 'pork chops',
  'ribs': 'ribs',
  'baby back ribs': 'baby back ribs',
  'spare ribs': 'spare ribs',
  'pulled pork': 'pulled pork',
  'bacon': 'bacon',
  'ham': 'ham',
  'prosciutto': 'prosciutto',
  'sausage': 'sausage',
  'bratwurst': 'bratwurst',
  'chorizo': 'chorizo',
  'pepperoni': 'pepperoni',
  
  // Poultry
  'chicken': 'chicken',
  'fried chicken': 'fried chicken',
  'grilled chicken': 'grilled chicken',
  'roast chicken': 'roast chicken',
  'chicken breast': 'chicken breast',
  'chicken thighs': 'chicken thighs',
  'chicken parmesan': 'chicken parmesan',
  'chicken marsala': 'chicken marsala',
  'chicken alfredo': 'chicken alfredo',
  'buffalo chicken': 'buffalo chicken',
  'bbq chicken': 'bbq chicken',
  'turkey': 'turkey',
  'duck': 'duck',
  'goose': 'goose',
  
  // Seafood
  'fish': 'fish',
  'salmon': 'salmon',
  'tuna': 'tuna',
  'cod': 'cod',
  'halibut': 'halibut',
  'sea bass': 'sea bass',
  'red snapper': 'red snapper',
  'trout': 'trout',
  'sole': 'sole',
  'flounder': 'flounder',
  'mahi mahi': 'mahi mahi',
  'swordfish': 'swordfish',
  'shrimp': 'shrimp',
  'prawns': 'prawns',
  'lobster': 'lobster',
  'crab': 'crab',
  'crab cakes': 'crab cakes',
  'scallops': 'scallops',
  'oysters': 'oysters',
  'mussels': 'mussels',
  'clams': 'clams',
  'fish and chips': 'fish and chips',
  
  // Pasta
  'pasta': 'pasta',
  'spaghetti': 'spaghetti',
  'fettuccine': 'fettuccine',
  'linguine': 'linguine',
  'penne': 'penne',
  'rigatoni': 'rigatoni',
  'fusilli': 'fusilli',
  'ravioli': 'ravioli',
  'tortellini': 'tortellini',
  'lasagna': 'lasagna',
  'carbonara': 'carbonara',
  'alfredo': 'alfredo',
  'marinara': 'marinara',
  'pesto': 'pesto',
  'bolognese': 'bolognese',
  'aglio e olio': 'aglio e olio',
  'mac and cheese': 'macaroni and cheese',
  
  // Pizza
  'pizza': 'pizza',
  'margherita pizza': 'margherita pizza',
  'pepperoni pizza': 'pepperoni pizza',
  'supreme pizza': 'supreme pizza',
  'meat lovers pizza': 'meat lovers pizza',
  'veggie pizza': 'vegetarian pizza',
  'hawaiian pizza': 'hawaiian pizza',
  'bbq chicken pizza': 'bbq chicken pizza',
  'white pizza': 'white pizza',
  'deep dish': 'deep dish pizza',
  'thin crust': 'thin crust pizza',
  'stuffed crust': 'stuffed crust pizza',
  
  // Asian Cuisine
  'sushi': 'sushi',
  'sashimi': 'sashimi',
  'roll': 'sushi roll',
  'california roll': 'california roll',
  'salmon roll': 'salmon roll',
  'tuna roll': 'tuna roll',
  'tempura': 'tempura',
  'teriyaki': 'teriyaki',
  'hibachi': 'hibachi',
  'pad thai': 'pad thai',
  'fried rice': 'fried rice',
  'lo mein': 'lo mein',
  'chow mein': 'chow mein',
  'kung pao': 'kung pao',
  'sweet and sour': 'sweet and sour',
  'general tso': 'general tso\'s chicken',
  'orange chicken': 'orange chicken',
  'mongolian beef': 'mongolian beef',
  
  // Mexican/Tex-Mex
  'tacos': 'tacos',
  'burritos': 'burritos',
  'quesadillas': 'quesadillas',
  'enchiladas': 'enchiladas',
  'fajitas': 'fajitas',
  'nachos': 'nachos',
  'guacamole': 'guacamole',
  'salsa': 'salsa',
  'queso': 'queso',
  'chimichanga': 'chimichanga',
  'tamales': 'tamales',
  'carnitas': 'carnitas',
  'barbacoa': 'barbacoa',
  'al pastor': 'al pastor',
  
  // Sides
  'fries': 'french fries',
  'french fries': 'french fries',
  'sweet potato fries': 'sweet potato fries',
  'mashed potatoes': 'mashed potatoes',
  'baked potato': 'baked potato',
  'rice': 'rice',
  'wild rice': 'wild rice',
  'pilaf': 'pilaf',
  'risotto': 'risotto',
  'vegetables': 'vegetables',
  'steamed vegetables': 'steamed vegetables',
  'grilled vegetables': 'grilled vegetables',
  'asparagus': 'asparagus',
  'broccoli': 'broccoli',
  'green beans': 'green beans',
  'corn': 'corn',
  'carrots': 'carrots',
  'peas': 'peas',
  'brussels sprouts': 'brussels sprouts',
  
  // Desserts
  'dessert': 'dessert',
  'cake': 'cake',
  'chocolate cake': 'chocolate cake',
  'cheesecake': 'cheesecake',
  'apple pie': 'apple pie',
  'cherry pie': 'cherry pie',
  'pumpkin pie': 'pumpkin pie',
  'pecan pie': 'pecan pie',
  'ice cream': 'ice cream',
  'vanilla ice cream': 'vanilla ice cream',
  'chocolate ice cream': 'chocolate ice cream',
  'strawberry ice cream': 'strawberry ice cream',
  'sherbet': 'sherbet',
  'sorbet': 'sorbet',
  'cookies': 'cookies',
  'brownies': 'brownies',
  'tiramisu': 'tiramisu',
  'crème brûlée': 'crème brûlée',
  'panna cotta': 'panna cotta',
  'flan': 'flan',
  'mousse': 'mousse',
  'gelato': 'gelato',
  
  // Beverages
  'water': 'water',
  'sparkling water': 'sparkling water',
  'still water': 'still water',
  'tap water': 'tap water',
  'soda': 'soda',
  'cola': 'cola',
  'pepsi': 'pepsi',
  'coke': 'coca cola',
  'sprite': 'sprite',
  'lemonade': 'lemonade',
  'iced tea': 'iced tea',
  'sweet tea': 'sweet tea',
  'hot tea': 'hot tea',
  'green tea': 'green tea',
  'black tea': 'black tea',
  'herbal tea': 'herbal tea',
  'coffee': 'coffee',
  'espresso': 'espresso',
  'cappuccino': 'cappuccino',
  'latte': 'latte',
  'americano': 'americano',
  'macchiato': 'macchiato',
  'mocha': 'mocha',
  'frappe': 'frappe',
  'iced coffee': 'iced coffee',
  'juice': 'juice',
  'orange juice': 'orange juice',
  'apple juice': 'apple juice',
  'cranberry juice': 'cranberry juice',
  'grapefruit juice': 'grapefruit juice',
  'beer': 'beer',
  'wine': 'wine',
  'red wine': 'red wine',
  'white wine': 'white wine',
  'rosé': 'rosé wine',
  'champagne': 'champagne',
  'cocktail': 'cocktail',
  'martini': 'martini',
  'margarita': 'margarita',
  'mojito': 'mojito',
  'manhattan': 'manhattan',
  'old fashioned': 'old fashioned',
  'whiskey': 'whiskey',
  'vodka': 'vodka',
  'gin': 'gin',
  'rum': 'rum',
  'tequila': 'tequila'
};

const COMMON_ENGLISH_WORDS = {
  // Numbers
  'zero': '0',
  'one': '1',
  'two': '2',
  'three': '3',
  'four': '4',
  'five': '5',
  'six': '6',
  'seven': '7',
  'eight': '8',
  'nine': '9',
  'ten': '10',
  'eleven': '11',
  'twelve': '12',
  'thirteen': '13',
  'fourteen': '14',
  'fifteen': '15',
  'sixteen': '16',
  'seventeen': '17',
  'eighteen': '18',
  'nineteen': '19',
  'twenty': '20',
  'thirty': '30',
  'forty': '40',
  'fifty': '50',
  'sixty': '60',
  'seventy': '70',
  'eighty': '80',
  'ninety': '90',
  'hundred': '100',
  'thousand': '1000',
  
  // Restaurant vocabulary
  'order': 'order',
  'i\'d like': 'i would like',
  'i want': 'i want',
  'i\'ll have': 'i will have',
  'we\'ll have': 'we will have',
  'can i get': 'can i get',
  'could i have': 'could i have',
  'may i have': 'may i have',
  'give me': 'give me',
  'bring me': 'bring me',
  'pay': 'pay',
  'bill': 'bill',
  'check': 'check',
  'tab': 'tab',
  'receipt': 'receipt',
  'menu': 'menu',
  'specials': 'specials',
  'appetizer': 'appetizer',
  'starter': 'starter',
  'main course': 'main course',
  'entrée': 'main course',
  'entree': 'main course',
  'side': 'side dish',
  'dessert': 'dessert',
  'drink': 'drink',
  'beverage': 'beverage',
  'without': 'without',
  'with': 'with',
  'extra': 'extra',
  'on the side': 'on the side',
  'add': 'add',
  'remove': 'remove',
  'substitute': 'substitute',
  'replace': 'replace',
  'change': 'change',
  'please': 'please',
  'thank you': 'thank you',
  'thanks': 'thank you',
  'excuse me': 'excuse me',
  'server': 'server',
  'waiter': 'waiter',
  'waitress': 'waitress',
  'service': 'service',
  'table': 'table',
  'seat': 'seat',
  'reservation': 'reservation',
  'wait': 'wait',
  'right away': 'right away',
  'quickly': 'quickly',
  'slowly': 'slowly',
  'hot': 'hot',
  'cold': 'cold',
  'warm': 'warm',
  'cool': 'cool',
  'good': 'good',
  'great': 'great',
  'excellent': 'excellent',
  'delicious': 'delicious',
  'tasty': 'tasty',
  'yummy': 'delicious',
  'perfect': 'perfect'
};

const PHONETIC_REPLACEMENTS = {
  // Common mispronunciations
  'expresso': 'espresso',
  'supposably': 'supposedly',
  'irregardless': 'regardless',
  'nucular': 'nuclear',
  'liberry': 'library',
  'febuary': 'february',
  'probly': 'probably',
  'definately': 'definitely',
  'seperate': 'separate',
  'recieve': 'receive',
  'alot': 'a lot',
  'noone': 'no one',
  'everytime': 'every time',
  'anyways': 'anyway',
  'orientated': 'oriented',
  'conversate': 'converse',
  
  // Food-specific mispronunciations
  'chipolte': 'chipotle',
  'quinoa': 'quinoa',
  'bruscheta': 'bruschetta',
  'gnocci': 'gnocchi',
  'pho': 'pho',
  'gyro': 'gyro',
  'acai': 'acai',
  'charcuterie': 'charcuterie',
  'prosciutto': 'prosciutto',
  'mascarpone': 'mascarpone',
  'ricotta': 'ricotta',
  'parmesan': 'parmesan',
  'mozzarella': 'mozzarella',
  'foccacia': 'focaccia',
  'caeser': 'caesar',
  'caprese': 'caprese',
  'antipasto': 'antipasto',
  'minestrone': 'minestrone',
  'bolognaise': 'bolognese',
  'perogies': 'pierogies',
  'hummus': 'hummus',
  'tzatziki': 'tzatziki',
  'ceviche': 'ceviche',
  'paella': 'paella',
  'jambalaya': 'jambalaya',
  'bouillabaisse': 'bouillabaisse',
  'worcestershire': 'worcestershire',
  
  // Regional variations and corrections
  'soder': 'soda',
  'pop': 'soda',
  'hoagie': 'sub sandwich',
  'grinder': 'sub sandwich',
  'hero': 'sub sandwich',
  'spukie': 'sub sandwich',
  'zeppelin': 'sub sandwich',
  'wedge': 'sub sandwich',
  'italian': 'sub sandwich',
  'torpedo': 'sub sandwich'
};

const RESTAURANT_COMMANDS = {
  'order': ['order', 'i\'d like', 'i want', 'i\'ll have', 'we\'ll have', 'can i get', 'could i have', 'may i have', 'give me', 'bring me'],
  'add': ['also', 'and', 'plus', 'with', 'add', 'extra', 'more', 'additional'],
  'remove': ['without', 'no', 'remove', 'take off', 'hold', 'skip', 'omit'],
  'change': ['change', 'substitute', 'replace', 'switch', 'instead of', 'rather than'],
  'pay': ['pay', 'bill', 'check', 'tab', 'receipt', 'how much', 'total', 'cost'],
  'help': ['help', 'what is', 'recommend', 'suggest', 'what\'s good', 'explain', 'tell me about'],
  'repeat': ['repeat', 'again', 'come again', 'say that again', 'pardon', 'excuse me'],
  'cancel': ['cancel', 'stop', 'never mind', 'forget it', 'scratch that', 'actually']
};

const ENGLISH_GRAMMAR = {
  // Common contractions
  'contractions': {
    'i\'m': 'i am',
    'you\'re': 'you are',
    'he\'s': 'he is',
    'she\'s': 'she is',
    'it\'s': 'it is',
    'we\'re': 'we are',
    'they\'re': 'they are',
    'i\'ve': 'i have',
    'you\'ve': 'you have',
    'we\'ve': 'we have',
    'they\'ve': 'they have',
    'i\'ll': 'i will',
    'you\'ll': 'you will',
    'he\'ll': 'he will',
    'she\'ll': 'she will',
    'we\'ll': 'we will',
    'they\'ll': 'they will',
    'i\'d': 'i would',
    'you\'d': 'you would',
    'he\'d': 'he would',
    'she\'d': 'she would',
    'we\'d': 'we would',
    'they\'d': 'they would'
  },
  
  // Articles
  'articles': ['a', 'an', 'the'],
  
  // Common prepositions
  'prepositions': ['in', 'on', 'at', 'by', 'for', 'with', 'without', 'to', 'from', 'of', 'about', 'over', 'under', 'through', 'during', 'before', 'after'],
  
  // Modal verbs
  'modals': ['can', 'could', 'may', 'might', 'will', 'would', 'shall', 'should', 'must']
};

// ============================================================================
// ENGLISH PROCESSOR CLASS
// ============================================================================

export class EnglishProcessor {
  constructor(options = {}) {
    this.variant = options.variant || 'en-US'; // 'en-US', 'en-GB'
    this.strictMode = options.strictMode || false;
    this.preserveOriginal = options.preserveOriginal || false;
    this.contextAware = options.contextAware !== false;
    this.enableRegionalDialects = options.enableRegionalDialects !== false;
    this.handleContractions = options.handleContractions !== false;
    this.handleSlang = options.handleSlang !== false;
    
    // Initialize mappings based on variant
    this.regionalMap = REGIONAL_MAPPINGS[this.variant] || REGIONAL_MAPPINGS['en-US'];
    this.foodTerms = ENGLISH_FOOD_TERMS;
    this.commonWords = COMMON_ENGLISH_WORDS;
    this.phoneticMap = PHONETIC_REPLACEMENTS;
    this.restaurantCommands = RESTAURANT_COMMANDS;
    this.grammar = ENGLISH_GRAMMAR;
    
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
      contractionExpansions: 0,
      slangCorrections: 0
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
    
    // Grammar patterns
    for (const [contraction, expansion] of Object.entries(this.grammar.contractions)) {
      patterns[contraction] = new RegExp(`\\b${this.escapeRegex(contraction)}\\b`, 'gi');
    }
    
    // Special English patterns
    patterns.contractions = /\b\w+'\w+\b/g;
    patterns.articles = /\b(a|an|the)\b/gi;
    patterns.prepositions = /\b(in|on|at|by|for|with|without|to|from|of|about|over|under|through|during|before|after)\b/gi;
    patterns.modals = /\b(can|could|may|might|will|would|shall|should|must)\b/gi;
    patterns.numbers = /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)\b/gi;
    patterns.plurals = /\b(\w+)s\b/gi;
    patterns.pastTense = /\b(\w+)ed\b/gi;
    patterns.progressive = /\b(\w+)ing\b/gi;
    
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
    normalized = normalized.replace(/\b&\b/gi, 'and');
    normalized = normalized.replace(/\betc\./gi, 'et cetera');
    normalized = normalized.replace(/\bvs\./gi, 'versus');
    normalized = normalized.replace(/\be\.g\./gi, 'for example');
    normalized = normalized.replace(/\bi\.e\./gi, 'that is');
    normalized = normalized.replace(/\bmr\./gi, 'mister');
    normalized = normalized.replace(/\bmrs\./gi, 'missus');
    normalized = normalized.replace(/\bms\./gi, 'miss');
    normalized = normalized.replace(/\bdr\./gi, 'doctor');
    
    // Handle contractions if enabled
    if (this.handleContractions) {
      normalized = this.expandContractions(normalized);
    }
    
    // Normalize punctuation
    normalized = normalized.replace(/[.,!?;:]/g, '');
    
    return normalized;
  }
  
  expandContractions(text) {
    let result = text;
    
    for (const [contraction, expansion] of Object.entries(this.grammar.contractions)) {
      const pattern = new RegExp(`\\b${this.escapeRegex(contraction)}\\b`, 'gi');
      if (pattern.test(result)) {
        result = result.replace(pattern, expansion);
        this.stats.contractionExpansions++;
      }
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
    
    // Apply slang corrections if enabled
    if (this.handleSlang) {
      processed = this.applySlangCorrections(processed);
    }
    
    // Apply food terminology processing
    if (this.currentContext === 'restaurant' || this.currentContext === 'food') {
      processed = this.applyFoodTerms(processed);
    }
    
    // Apply common word mappings
    processed = this.applyCommonMappings(processed);
    
    // Apply phonetic corrections
    processed = this.applyPhoneticCorrections(processed);
    
    // Handle special English constructions
    processed = this.handleEnglishConstructions(processed);
    
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
  
  applySlangCorrections(text) {
    let result = text;
    
    // Handle informal English and slang
    const slangMap = {
      'yeah': 'yes',
      'yep': 'yes',
      'yup': 'yes',
      'uh huh': 'yes',
      'mm hmm': 'yes',
      'nah': 'no',
      'nope': 'no',
      'uh uh': 'no',
      'awesome': 'great',
      'cool': 'good',
      'sweet': 'good',
      'sick': 'good',
      'dope': 'good',
      'lit': 'good',
      'fire': 'excellent',
      'bomb': 'excellent',
      'legit': 'legitimate',
      'def': 'definitely',
      'totes': 'totally',
      'obvs': 'obviously',
      'whatev': 'whatever',
      'whatevs': 'whatever',
      'prolly': 'probably',
      'def': 'definitely',
      'perf': 'perfect',
      'amaze': 'amazing',
      'ridic': 'ridiculous',
      'cray': 'crazy',
      'cray cray': 'crazy',
      'salty': 'upset',
      'basic': 'simple',
      'extra': 'excessive',
      'bougie': 'fancy',
      'boujee': 'fancy',
      'flex': 'show off',
      'lowkey': 'somewhat',
      'highkey': 'definitely',
      'mood': 'relatable',
      'vibe': 'feeling',
      'salty': 'bitter',
      'shook': 'shocked',
      'stan': 'admire',
      'ship': 'support',
      'periodt': 'period',
      'bet': 'okay',
      'say less': 'understood',
      'no cap': 'no lie',
      'cap': 'lie',
      'facts': 'true',
      'fam': 'family',
      'squad': 'group',
      'crew': 'group',
      'gang': 'group',
      'homie': 'friend',
      'bro': 'brother',
      'sis': 'sister'
    };
    
    for (const [slang, standard] of Object.entries(slangMap)) {
      const pattern = new RegExp(`\\b${this.escapeRegex(slang)}\\b`, 'gi');
      if (pattern.test(result)) {
        result = result.replace(pattern, standard);
        this.stats.slangCorrections++;
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
  
  handleEnglishConstructions(text) {
    let result = text;
    
    // Handle compound food names and descriptions
    result = result.replace(/\b(chicken|beef|pork|fish|turkey)\s+(and)\s+(\w+)/gi, (match, protein, conjunction, side) => {
      return `${protein} ${conjunction} ${side}`;
    });
    
    // Handle size descriptions
    result = result.replace(/\b(small|medium|large|extra large|xl|jumbo|king size)\s+(\w+)/gi, (match, size, item) => {
      return `${size} ${item}`;
    });
    
    // Handle cooking methods
    result = result.replace(/\b(grilled|fried|baked|roasted|steamed|sautéed|broiled|blackened|cajun)\s+(\w+)/gi, (match, method, item) => {
      return `${method} ${item}`;
    });
    
    // Handle "with" constructions
    result = result.replace(/\b(\w+)\s+with\s+(\w+)/gi, (match, main, addition) => {
      return `${main} with ${addition}`;
    });
    
    return result;
  }
  
  processNumbers(text) {
    let result = text;
    
    // Convert spelled-out numbers to digits
    const numberMap = {
      'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
      'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
      'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
      'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
      'eighteen': '18', 'nineteen': '19', 'twenty': '20', 'thirty': '30',
      'forty': '40', 'fifty': '50', 'sixty': '60', 'seventy': '70',
      'eighty': '80', 'ninety': '90', 'hundred': '100', 'thousand': '1000'
    };
    
    for (const [word, number] of Object.entries(numberMap)) {
      const pattern = new RegExp(`\\b${word}\\b`, 'gi');
      result = result.replace(pattern, number);
    }
    
    // Handle compound numbers (e.g., "twenty-one" -> "21")
    result = result.replace(/\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[-\s]?(one|two|three|four|five|six|seven|eight|nine)\b/gi, (match, tens, ones) => {
      const tensNum = numberMap[tens.toLowerCase()];
      const onesNum = numberMap[ones.toLowerCase()];
      
      if (tensNum && onesNum) {
        return (parseInt(tensNum) + parseInt(onesNum)).toString();
      }
      
      return match;
    });
    
    // Handle "a/an" meaning "one"
    result = result.replace(/\b(a|an)\s+(\w+)/gi, (match, article, noun) => {
      // Only convert to "one" if it makes sense in context
      if (['dozen', 'hundred', 'thousand', 'million', 'billion'].includes(noun.toLowerCase())) {
        return `1 ${noun}`;
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
    
    // Handle English capitalization rules
    result = this.applyEnglishCapitalization(result);
    
    return result;
  }
  
  applyEnglishCapitalization(text) {
    let result = text;
    
    // Capitalize proper nouns (brand names, specific dishes, etc.)
    const properNouns = [
      'coca cola', 'pepsi', 'sprite', 'dr pepper', 'mountain dew',
      'mcdonald\'s', 'burger king', 'kfc', 'taco bell', 'subway',
      'pizza hut', 'domino\'s', 'papa john\'s', 'little caesars',
      'starbucks', 'dunkin', 'tim hortons',
      'new york', 'california', 'texas', 'florida', 'chicago',
      'italian', 'mexican', 'chinese', 'japanese', 'indian', 'thai',
      'french', 'greek', 'german', 'spanish', 'korean'
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
    const lengthBoost = Math.min(0.2, words.length / 12);
    
    // Boost confidence for food context
    let contextBoost = 0;
    if (this.currentContext === 'restaurant') {
      contextBoost = 0.1;
    }
    
    // Boost confidence for proper English grammar
    let grammarBoost = 0;
    if (this.hasProperEnglishStructure(text)) {
      grammarBoost = 0.1;
    }
    
    return Math.min(1.0, baseConfidence + lengthBoost + contextBoost + grammarBoost);
  }
  
  hasProperEnglishStructure(text) {
    // Check for proper English sentence structure
    const hasArticles = this.regexPatterns.articles.test(text);
    const hasModals = this.regexPatterns.modals.test(text);
    const hasProperVerbs = /\b(am|is|are|was|were|have|has|had|do|does|did|will|would|can|could|should|may|might)\b/i.test(text);
    const hasEnglishWords = Object.keys(this.commonWords).some(word => text.includes(word));
    
    return hasArticles || hasModals || hasProperVerbs || hasEnglishWords;
  }
  
  extractEntities(text) {
    const entities = {
      foods: [],
      drinks: [],
      numbers: [],
      modifiers: [],
      commands: [],
      sizes: [],
      cookingMethods: []
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
    
    // Extract modifiers (with, without, extra)
    const modifierPatterns = ['with', 'without', 'extra', 'on the side', 'add', 'no'];
    modifierPatterns.forEach(modifier => {
      if (normalizedText.includes(modifier)) {
        entities.modifiers.push({
          type: modifier,
          position: normalizedText.indexOf(modifier)
        });
      }
    });
    
    // Extract sizes
    const sizes = ['small', 'medium', 'large', 'extra large', 'xl', 'jumbo', 'king size'];
    sizes.forEach(size => {
      if (normalizedText.includes(size)) {
        entities.sizes.push({
          size,
          position: normalizedText.indexOf(size)
        });
      }
    });
    
    // Extract cooking methods
    const cookingMethods = ['grilled', 'fried', 'baked', 'roasted', 'steamed', 'sautéed', 'broiled', 'blackened', 'cajun'];
    cookingMethods.forEach(method => {
      if (normalizedText.includes(method)) {
        entities.cookingMethods.push({
          method,
          position: normalizedText.indexOf(method)
        });
      }
    });
    
    return entities;
  }
  
  categorizeFood(food) {
    if (food.includes('water') || food.includes('soda') || food.includes('juice') || food.includes('coffee') || food.includes('tea') || food.includes('beer') || food.includes('wine')) return 'beverage';
    if (food.includes('cake') || food.includes('pie') || food.includes('ice cream') || food.includes('dessert') || food.includes('cookie')) return 'dessert';
    if (food.includes('salad') || food.includes('soup') || food.includes('appetizer') || food.includes('starter')) return 'appetizer';
    if (food.includes('beef') || food.includes('chicken') || food.includes('pork') || food.includes('turkey') || food.includes('steak')) return 'meat';
    if (food.includes('fish') || food.includes('salmon') || food.includes('shrimp') || food.includes('lobster') || food.includes('seafood')) return 'seafood';
    if (food.includes('pasta') || food.includes('spaghetti') || food.includes('pizza') || food.includes('burger')) return 'main_course';
    if (food.includes('fries') || food.includes('rice') || food.includes('vegetables') || food.includes('potato')) return 'side';
    return 'other';
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
      contractionRate: this.stats.totalProcessed > 0 ? 
        (this.stats.contractionExpansions / this.stats.totalProcessed) : 0,
      slangCorrectionRate: this.stats.totalProcessed > 0 ? 
        (this.stats.slangCorrections / this.stats.totalProcessed) : 0
    };
  }
  
  resetStatistics() {
    this.stats = {
      totalProcessed: 0,
      dialectWordsFound: 0,
      replacementsMade: 0,
      confidenceBoosts: 0,
      contextMatches: 0,
      contractionExpansions: 0,
      slangCorrections: 0
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
      handleContractions: this.handleContractions,
      handleSlang: this.handleSlang
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
      
      if (typeof config.handleContractions === 'boolean') {
        this.handleContractions = config.handleContractions;
      }
      
      if (typeof config.handleSlang === 'boolean') {
        this.handleSlang = config.handleSlang;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import English processor configuration:', error);
      return false;
    }
  }
}

// ============================================================================
// STATIC INITIALIZATION METHODS
// ============================================================================

export const initialize = async (options = {}) => {
  const processor = new EnglishProcessor(options);
  
  // Set default context for restaurant use
  processor.setContext('restaurant');
  
  return processor;
};

export const getSupportedVariants = () => Object.keys(REGIONAL_MAPPINGS);

export const getFoodTerms = () => ENGLISH_FOOD_TERMS;

export const getRestaurantCommands = () => RESTAURANT_COMMANDS;

export const getGrammar = () => ENGLISH_GRAMMAR;

// ============================================================================
// EXPORTS
// ============================================================================

export default EnglishProcessor;

export {
  REGIONAL_MAPPINGS,
  ENGLISH_FOOD_TERMS,
  COMMON_ENGLISH_WORDS,
  PHONETIC_REPLACEMENTS,
  RESTAURANT_COMMANDS,
  ENGLISH_GRAMMAR
};