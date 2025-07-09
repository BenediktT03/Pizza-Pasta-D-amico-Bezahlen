import { faker } from 'faker';
import type { 
  Product, 
  ProductCategory, 
  ProductVariant, 
  ProductModifier,
  NutritionalInfo,
  Allergen 
} from '@eatech/types';

// Swiss food categories
const categories: ProductCategory[] = [
  { id: 'starters', name: 'Vorspeisen', nameEn: 'Starters', icon: '🥗', order: 1 },
  { id: 'soups', name: 'Suppen', nameEn: 'Soups', icon: '🍲', order: 2 },
  { id: 'salads', name: 'Salate', nameEn: 'Salads', icon: '🥗', order: 3 },
  { id: 'mains', name: 'Hauptgerichte', nameEn: 'Main Courses', icon: '🍽️', order: 4 },
  { id: 'pizza', name: 'Pizza', nameEn: 'Pizza', icon: '🍕', order: 5 },
  { id: 'pasta', name: 'Pasta', nameEn: 'Pasta', icon: '🍝', order: 6 },
  { id: 'swiss', name: 'Schweizer Spezialitäten', nameEn: 'Swiss Specialties', icon: '🇨🇭', order: 7 },
  { id: 'desserts', name: 'Desserts', nameEn: 'Desserts', icon: '🍰', order: 8 },
  { id: 'beverages', name: 'Getränke', nameEn: 'Beverages', icon: '🥤', order: 9 },
  { id: 'wine', name: 'Weine', nameEn: 'Wines', icon: '🍷', order: 10 },
  { id: 'beer', name: 'Biere', nameEn: 'Beers', icon: '🍺', order: 11 },
];

// Common allergens
const allergens: Allergen[] = [
  'gluten', 'dairy', 'eggs', 'soy', 'nuts', 'peanuts', 
  'fish', 'shellfish', 'sesame', 'celery', 'mustard', 'sulfites'
];

// Helper to generate nutritional info
const generateNutritionalInfo = (): NutritionalInfo => ({
  calories: faker.datatype.number({ min: 100, max: 800 }),
  protein: faker.datatype.number({ min: 5, max: 40 }),
  carbohydrates: faker.datatype.number({ min: 10, max: 80 }),
  fat: faker.datatype.number({ min: 5, max: 40 }),
  saturatedFat: faker.datatype.number({ min: 2, max: 20 }),
  sugar: faker.datatype.number({ min: 2, max: 30 }),
  fiber: faker.datatype.number({ min: 0, max: 10 }),
  salt: faker.datatype.number({ min: 0, max: 5 }),
});

// Helper to generate product modifiers
const generateModifiers = (category: string): ProductModifier[] => {
  const modifiersByCategory: Record<string, ProductModifier[]> = {
    pizza: [
      {
        id: 'size',
        name: 'Größe',
        nameEn: 'Size',
        required: true,
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: 'small', name: 'Klein (26cm)', nameEn: 'Small (26cm)', price: 0 },
          { id: 'medium', name: 'Mittel (30cm)', nameEn: 'Medium (30cm)', price: 3 },
          { id: 'large', name: 'Groß (35cm)', nameEn: 'Large (35cm)', price: 6 },
        ],
      },
      {
        id: 'extras',
        name: 'Extras',
        nameEn: 'Extras',
        required: false,
        minSelections: 0,
        maxSelections: 5,
        options: [
          { id: 'cheese', name: 'Extra Käse', nameEn: 'Extra Cheese', price: 2.5 },
          { id: 'pepperoni', name: 'Pepperoni', nameEn: 'Pepperoni', price: 3 },
          { id: 'mushrooms', name: 'Champignons', nameEn: 'Mushrooms', price: 2 },
          { id: 'olives', name: 'Oliven', nameEn: 'Olives', price: 2 },
        ],
      },
    ],
    beverages: [
      {
        id: 'ice',
        name: 'Eis',
        nameEn: 'Ice',
        required: false,
        minSelections: 0,
        maxSelections: 1,
        options: [
          { id: 'no-ice', name: 'Ohne Eis', nameEn: 'No Ice', price: 0 },
          { id: 'less-ice', name: 'Wenig Eis', nameEn: 'Less Ice', price: 0 },
          { id: 'normal-ice', name: 'Normal', nameEn: 'Normal', price: 0 },
          { id: 'extra-ice', name: 'Extra Eis', nameEn: 'Extra Ice', price: 0 },
        ],
      },
    ],
    mains: [
      {
        id: 'side',
        name: 'Beilage',
        nameEn: 'Side',
        required: true,
        minSelections: 1,
        maxSelections: 1,
        options: [
          { id: 'fries', name: 'Pommes Frites', nameEn: 'French Fries', price: 0 },
          { id: 'salad', name: 'Gemischter Salat', nameEn: 'Mixed Salad', price: 0 },
          { id: 'rice', name: 'Reis', nameEn: 'Rice', price: 0 },
          { id: 'vegetables', name: 'Gemüse', nameEn: 'Vegetables', price: 2 },
        ],
      },
    ],
  };

  return modifiersByCategory[category] || [];
};

// Base product creation
export const createProduct = (overrides: Partial<Product> = {}): Product => {
  const category = faker.random.arrayElement(categories);
  const name = faker.commerce.productName();
  const price = parseFloat(faker.commerce.price(8, 45, 2));

  return {
    id: faker.datatype.uuid(),
    tenantId: 'tenant-123',
    sku: faker.datatype.alphaNumeric(8).toUpperCase(),
    name,
    nameEn: name,
    nameFr: name,
    nameIt: name,
    description: faker.commerce.productDescription(),
    descriptionEn: faker.commerce.productDescription(),
    descriptionFr: faker.commerce.productDescription(),
    descriptionIt: faker.commerce.productDescription(),
    category: category.id,
    categoryName: category.name,
    price,
    currency: 'CHF',
    tax: 7.7, // Swiss VAT
    images: [faker.image.food(640, 480, true)],
    thumbnailUrl: faker.image.food(200, 200, true),
    available: true,
    featured: faker.datatype.boolean(),
    popular: faker.datatype.boolean(),
    spicyLevel: faker.datatype.number({ min: 0, max: 3 }),
    preparationTime: faker.datatype.number({ min: 10, max: 45 }),
    calories: faker.datatype.number({ min: 100, max: 800 }),
    allergens: faker.random.arrayElements(allergens, faker.datatype.number({ min: 0, max: 3 })),
    nutritionalInfo: generateNutritionalInfo(),
    modifiers: generateModifiers(category.id),
    tags: faker.random.arrayElements(['vegetarian', 'vegan', 'gluten-free', 'organic', 'local', 'seasonal']),
    metadata: {},
    stock: faker.datatype.number({ min: 0, max: 100 }),
    minStock: 10,
    sortOrder: faker.datatype.number({ min: 1, max: 100 }),
    active: true,
    createdAt: faker.date.past(1).toISOString(),
    updatedAt: faker.date.recent(30).toISOString(),
    ...overrides,
  };
};

// Predefined products
export const margheritaPizza: Product = createProduct({
  id: 'pizza-margherita',
  sku: 'PIZ-001',
  name: 'Pizza Margherita',
  nameEn: 'Margherita Pizza',
  nameFr: 'Pizza Marguerite',
  nameIt: 'Pizza Margherita',
  description: 'Klassische Pizza mit Tomatensauce, Mozzarella und frischem Basilikum',
  descriptionEn: 'Classic pizza with tomato sauce, mozzarella and fresh basil',
  category: 'pizza',
  categoryName: 'Pizza',
  price: 18.50,
  images: ['https://images.unsplash.com/photo-1574071318508-1cdbab80d002'],
  allergens: ['gluten', 'dairy'],
  tags: ['vegetarian', 'classic'],
  popular: true,
  preparationTime: 15,
  calories: 650,
});

export const rösti: Product = createProduct({
  id: 'swiss-roesti',
  sku: 'SWI-001',
  name: 'Rösti mit Spiegelei',
  nameEn: 'Rösti with Fried Egg',
  nameFr: 'Rösti avec œuf au plat',
  nameIt: 'Rösti con uovo fritto',
  description: 'Traditionelle Schweizer Rösti mit knusprigen Kartoffeln und Spiegelei',
  descriptionEn: 'Traditional Swiss rösti with crispy potatoes and fried egg',
  category: 'swiss',
  categoryName: 'Schweizer Spezialitäten',
  price: 22.50,
  images: ['https://images.unsplash.com/photo-1693200931504-821091305744'],
  allergens: ['eggs'],
  tags: ['vegetarian', 'traditional', 'swiss'],
  featured: true,
  preparationTime: 20,
  calories: 450,
});

export const züriGeschnetzelte: Product = createProduct({
  id: 'zueri-geschnetzeltes',
  sku: 'SWI-002',
  name: 'Zürcher Geschnetzeltes',
  nameEn: 'Zurich-Style Veal',
  nameFr: 'Émincé de veau à la zurichoise',
  nameIt: 'Scaloppine alla zurighese',
  description: 'Kalbfleisch in Rahmsauce mit Champignons, serviert mit Rösti',
  descriptionEn: 'Veal in cream sauce with mushrooms, served with rösti',
  category: 'swiss',
  categoryName: 'Schweizer Spezialitäten',
  price: 38.50,
  images: ['https://images.unsplash.com/photo-1693200931542-37d5de78e46f'],
  allergens: ['dairy', 'celery'],
  tags: ['traditional', 'swiss', 'signature'],
  featured: true,
  popular: true,
  preparationTime: 25,
  calories: 780,
});

export const caesarSalad: Product = createProduct({
  id: 'caesar-salad',
  sku: 'SAL-001',
  name: 'Caesar Salat',
  nameEn: 'Caesar Salad',
  nameFr: 'Salade César',
  nameIt: 'Insalata Caesar',
  description: 'Römersalat mit Parmesan, Croutons und Caesar-Dressing',
  descriptionEn: 'Romaine lettuce with parmesan, croutons and caesar dressing',
  category: 'salads',
  categoryName: 'Salate',
  price: 16.50,
  variants: [
    { id: 'regular', name: 'Normal', price: 0 },
    { id: 'chicken', name: 'Mit Hühnchen', nameEn: 'With Chicken', price: 6 },
    { id: 'shrimp', name: 'Mit Garnelen', nameEn: 'With Shrimp', price: 8 },
  ],
  allergens: ['gluten', 'dairy', 'eggs', 'fish'],
  tags: ['salad'],
  preparationTime: 10,
  calories: 380,
});

export const craftBeer: Product = createProduct({
  id: 'craft-beer-ipa',
  sku: 'BEE-001',
  name: 'Lokales IPA',
  nameEn: 'Local IPA',
  nameFr: 'IPA Local',
  nameIt: 'IPA Locale',
  description: 'Hausgebrautes India Pale Ale mit Hopfen aus der Region',
  descriptionEn: 'House-brewed India Pale Ale with local hops',
  category: 'beer',
  categoryName: 'Biere',
  price: 7.50,
  variants: [
    { id: 'small', name: '0.3L', price: 0 },
    { id: 'large', name: '0.5L', price: 2 },
  ],
  tags: ['local', 'craft', 'alcohol'],
  metadata: {
    alcoholContent: '6.5%',
    brewery: 'EATECH Brewery',
    ibu: '45',
  },
});

export const mineralWater: Product = createProduct({
  id: 'mineral-water',
  sku: 'BEV-001',
  name: 'Mineralwasser',
  nameEn: 'Mineral Water',
  nameFr: 'Eau minérale',
  nameIt: 'Acqua minerale',
  description: 'Schweizer Mineralwasser',
  descriptionEn: 'Swiss mineral water',
  category: 'beverages',
  categoryName: 'Getränke',
  price: 4.50,
  variants: [
    { id: 'still', name: 'Still', nameEn: 'Still', price: 0 },
    { id: 'sparkling', name: 'Mit Kohlensäure', nameEn: 'Sparkling', price: 0 },
  ],
  tags: ['non-alcoholic', 'swiss'],
});

export const chocolateMousse: Product = createProduct({
  id: 'chocolate-mousse',
  sku: 'DES-001',
  name: 'Schokoladenmousse',
  nameEn: 'Chocolate Mousse',
  nameFr: 'Mousse au chocolat',
  nameIt: 'Mousse al cioccolato',
  description: 'Hausgemachte Schokoladenmousse mit Schweizer Schokolade',
  descriptionEn: 'Homemade chocolate mousse with Swiss chocolate',
  category: 'desserts',
  categoryName: 'Desserts',
  price: 12.50,
  allergens: ['dairy', 'eggs'],
  tags: ['vegetarian', 'homemade'],
  popular: true,
  preparationTime: 5,
  calories: 420,
});

// Product with variants
export const coffee: Product = createProduct({
  id: 'coffee',
  sku: 'BEV-010',
  name: 'Kaffee',
  nameEn: 'Coffee',
  nameFr: 'Café',
  nameIt: 'Caffè',
  description: 'Frisch gebrühter Kaffee',
  descriptionEn: 'Freshly brewed coffee',
  category: 'beverages',
  categoryName: 'Getränke',
  price: 4.50,
  variants: [
    { id: 'espresso', name: 'Espresso', price: 0 },
    { id: 'americano', name: 'Americano', price: 0 },
    { id: 'cappuccino', name: 'Cappuccino', price: 1 },
    { id: 'latte', name: 'Latte Macchiato', price: 1.5 },
  ],
  modifiers: [
    {
      id: 'milk',
      name: 'Milch',
      nameEn: 'Milk',
      required: false,
      minSelections: 0,
      maxSelections: 1,
      options: [
        { id: 'regular', name: 'Vollmilch', nameEn: 'Whole Milk', price: 0 },
        { id: 'skim', name: 'Magermilch', nameEn: 'Skim Milk', price: 0 },
        { id: 'soy', name: 'Sojamilch', nameEn: 'Soy Milk', price: 0.5 },
        { id: 'oat', name: 'Hafermilch', nameEn: 'Oat Milk', price: 0.5 },
      ],
    },
    {
      id: 'extras',
      name: 'Extras',
      nameEn: 'Extras',
      required: false,
      minSelections: 0,
      maxSelections: 3,
      options: [
        { id: 'sugar', name: 'Zucker', nameEn: 'Sugar', price: 0 },
        { id: 'sweetener', name: 'Süßstoff', nameEn: 'Sweetener', price: 0 },
        { id: 'syrup', name: 'Sirup', nameEn: 'Syrup', price: 1 },
        { id: 'decaf', name: 'Entkoffeiniert', nameEn: 'Decaf', price: 0 },
      ],
    },
  ],
  allergens: ['dairy'],
  tags: ['hot-beverage'],
});

// Out of stock product
export const limitedSpecial: Product = createProduct({
  id: 'limited-special',
  name: 'Tagesspezialität',
  nameEn: 'Daily Special',
  category: 'mains',
  price: 28.50,
  available: false,
  stock: 0,
  metadata: {
    reason: 'Sold out for today',
  },
});

// Create multiple products
export const createProducts = (count: number, category?: string): Product[] => {
  return Array.from({ length: count }, () => 
    createProduct(category ? { category, categoryName: categories.find(c => c.id === category)?.name } : {})
  );
};

// Export all fixtures
export const productFixtures = {
  margheritaPizza,
  rösti,
  züriGeschnetzelte,
  caesarSalad,
  craftBeer,
  mineralWater,
  chocolateMousse,
  coffee,
  limitedSpecial,
  // Data
  categories,
  allergens,
  // Helpers
  createProduct,
  createProducts,
  generateNutritionalInfo,
  generateModifiers,
};

export default productFixtures;
