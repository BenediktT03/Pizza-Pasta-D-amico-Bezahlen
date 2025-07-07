/**
 * EATECH - Product Type Definitions
 * Version: 1.0.0
 * Description: Complete type definitions for product management
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/types/product.types.ts
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued',
  COMING_SOON = 'coming_soon',
  SEASONAL = 'seasonal'
}

export enum ProductType {
  FOOD = 'food',
  BEVERAGE = 'beverage',
  DESSERT = 'dessert',
  SNACK = 'snack',
  COMBO = 'combo',
  MERCHANDISE = 'merchandise',
  GIFT_CARD = 'gift_card'
}

export enum ProductCategory {
  // Food Categories
  BURGER = 'burger',
  PIZZA = 'pizza',
  SANDWICH = 'sandwich',
  SALAD = 'salad',
  SOUP = 'soup',
  PASTA = 'pasta',
  RICE = 'rice',
  MEAT = 'meat',
  SEAFOOD = 'seafood',
  VEGETARIAN = 'vegetarian',
  VEGAN = 'vegan',
  
  // Beverage Categories
  SOFT_DRINK = 'soft_drink',
  JUICE = 'juice',
  COFFEE = 'coffee',
  TEA = 'tea',
  SMOOTHIE = 'smoothie',
  ALCOHOLIC = 'alcoholic',
  WATER = 'water',
  
  // Other Categories
  SIDE = 'side',
  SAUCE = 'sauce',
  EXTRA = 'extra',
  SPECIAL = 'special'
}

export enum SizeOption {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  EXTRA_LARGE = 'extra_large',
  FAMILY = 'family',
  PARTY = 'party'
}

export enum TemperatureOption {
  HOT = 'hot',
  COLD = 'cold',
  ROOM_TEMP = 'room_temp',
  FROZEN = 'frozen'
}

export enum SpiceLevel {
  NONE = 'none',
  MILD = 'mild',
  MEDIUM = 'medium',
  HOT = 'hot',
  EXTRA_HOT = 'extra_hot'
}

export enum PreparationMethod {
  GRILLED = 'grilled',
  FRIED = 'fried',
  BAKED = 'baked',
  STEAMED = 'steamed',
  RAW = 'raw',
  BOILED = 'boiled',
  ROASTED = 'roasted'
}

// ============================================================================
// PRODUCT INTERFACES
// ============================================================================

export interface Product {
  id: string;
  tenantId: string;
  sku: string;
  barcode?: string;
  status: ProductStatus;
  type: ProductType;
  category: ProductCategory;
  subcategory?: string;
  info: ProductInfo;
  pricing: ProductPricing;
  inventory: ProductInventory;
  options: ProductOptions;
  nutrition?: NutritionalInfo;
  allergens: Allergen[];
  images: ProductImage[];
  tags: string[];
  seo?: ProductSEO;
  analytics: ProductAnalytics;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  deletedAt?: Date;
}

export interface ProductInfo {
  name: string;
  displayName?: string;
  description: string;
  shortDescription?: string;
  ingredients?: string[];
  preparationTime?: number; // in minutes
  servingSize?: string;
  servingUnit?: string;
  brand?: string;
  origin?: string;
  certifications?: string[]; // Bio, Fairtrade, etc.
  awards?: string[];
  story?: string;
}

export interface ProductPricing {
  basePrice: number;
  currency: string;
  comparePrice?: number; // Original price for discount display
  costPrice?: number; // For margin calculation
  taxRate: number;
  taxIncluded: boolean;
  discountable: boolean;
  tiers?: PriceTier[];
  dynamicPricing?: DynamicPricing;
}

export interface PriceTier {
  minQuantity: number;
  maxQuantity?: number;
  price: number;
  label?: string;
}

export interface DynamicPricing {
  enabled: boolean;
  rules: PricingRule[];
  minimumPrice?: number;
  maximumPrice?: number;
}

export interface PricingRule {
  id: string;
  type: 'time_based' | 'demand_based' | 'weather_based' | 'event_based';
  conditions: Record<string, any>;
  adjustment: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  priority: number;
}

export interface ProductInventory {
  trackInventory: boolean;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold?: number;
  outOfStockBehavior: 'hide' | 'show_as_unavailable' | 'allow_backorder';
  locations?: InventoryLocation[];
  restockDate?: Date;
  infiniteStock: boolean;
}

export interface InventoryLocation {
  locationId: string;
  locationName: string;
  quantity: number;
  reservedQuantity: number;
}

export interface ProductOptions {
  sizes?: SizeOption[];
  customizations: ProductCustomization[];
  addons: ProductAddon[];
  variants: ProductVariant[];
  bundles?: ProductBundle[];
  modifiers: ProductModifier[];
}

export interface ProductCustomization {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  required: boolean;
  options: CustomizationOption[];
  rules?: CustomizationRule[];
}

export interface CustomizationOption {
  id: string;
  name: string;
  price: number;
  image?: string;
  available: boolean;
  preparationTime?: number;
  nutritionModifier?: Partial<NutritionalInfo>;
}

export interface CustomizationRule {
  type: 'min_selection' | 'max_selection' | 'dependency' | 'exclusion';
  value: any;
  message?: string;
}

export interface ProductAddon {
  id: string;
  productId: string;
  name: string;
  price: number;
  maxQuantity?: number;
  category?: string;
  image?: string;
  popular?: boolean;
}

export interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  attributes: Record<string, string>; // e.g., { size: 'large', color: 'red' }
  price?: number; // If different from base
  inventory?: {
    quantity: number;
    trackInventory: boolean;
  };
  image?: string;
  weight?: number;
  dimensions?: ProductDimensions;
}

export interface ProductBundle {
  id: string;
  name: string;
  description?: string;
  items: BundleItem[];
  price: number; // Bundle price
  savings: number; // Amount saved vs individual prices
  image?: string;
  available: boolean;
}

export interface BundleItem {
  productId: string;
  quantity: number;
  customizations?: Record<string, any>;
}

export interface ProductModifier {
  id: string;
  name: string;
  type: 'ingredient' | 'preparation' | 'serving' | 'packaging';
  options: ModifierOption[];
  multiSelect: boolean;
  required: boolean;
}

export interface ModifierOption {
  id: string;
  name: string;
  priceModifier: number;
  default: boolean;
  icon?: string;
}

// ============================================================================
// NUTRITION & ALLERGENS
// ============================================================================

export interface NutritionalInfo {
  servingSize: number;
  servingUnit: string;
  calories: number;
  caloriesFromFat?: number;
  totalFat: number;
  saturatedFat: number;
  transFat?: number;
  cholesterol: number;
  sodium: number;
  totalCarbohydrates: number;
  dietaryFiber: number;
  sugars: number;
  addedSugars?: number;
  protein: number;
  vitamins?: VitaminInfo[];
  minerals?: MineralInfo[];
  caffeine?: number;
  alcohol?: number;
}

export interface VitaminInfo {
  name: string;
  amount: number;
  unit: string;
  dailyValue?: number;
}

export interface MineralInfo {
  name: string;
  amount: number;
  unit: string;
  dailyValue?: number;
}

export interface Allergen {
  type: AllergenType;
  severity: 'contains' | 'may_contain' | 'free_from';
  notes?: string;
}

export enum AllergenType {
  GLUTEN = 'gluten',
  DAIRY = 'dairy',
  EGGS = 'eggs',
  SOY = 'soy',
  NUTS = 'nuts',
  PEANUTS = 'peanuts',
  FISH = 'fish',
  SHELLFISH = 'shellfish',
  SESAME = 'sesame',
  MUSTARD = 'mustard',
  CELERY = 'celery',
  LUPIN = 'lupin',
  MOLLUSCS = 'molluscs',
  SULPHITES = 'sulphites'
}

// ============================================================================
// PRODUCT MEDIA
// ============================================================================

export interface ProductImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  alt: string;
  title?: string;
  position: number;
  type: 'primary' | 'gallery' | 'variant' | 'nutrition' | 'preparation';
  width?: number;
  height?: number;
  size?: number; // in bytes
}

export interface ProductVideo {
  id: string;
  url: string;
  thumbnailUrl: string;
  title: string;
  description?: string;
  duration: number; // in seconds
  type: 'preparation' | 'story' | 'review' | 'tutorial';
}

// ============================================================================
// PRODUCT SEO & MARKETING
// ============================================================================

export interface ProductSEO {
  metaTitle?: string;
  metaDescription?: string;
  slug: string;
  canonicalUrl?: string;
  keywords?: string[];
  structuredData?: Record<string, any>;
}

export interface ProductAnalytics {
  views: number;
  sales: number;
  revenue: number;
  averageRating: number;
  reviewCount: number;
  conversionRate: number;
  popularityScore: number;
  trendingScore?: number;
  lastViewedAt?: Date;
  lastOrderedAt?: Date;
}

// ============================================================================
// PRODUCT RELATIONSHIPS
// ============================================================================

export interface ProductRelation {
  id: string;
  productId: string;
  relatedProductId: string;
  type: RelationType;
  strength: number; // 0-100
  bidirectional: boolean;
  metadata?: Record<string, any>;
}

export enum RelationType {
  SIMILAR = 'similar',
  COMPLEMENTARY = 'complementary',
  SUBSTITUTE = 'substitute',
  UPGRADE = 'upgrade',
  ACCESSORY = 'accessory',
  FREQUENTLY_BOUGHT = 'frequently_bought'
}

// ============================================================================
// PRODUCT AVAILABILITY
// ============================================================================

export interface ProductAvailability {
  productId: string;
  tenantId: string;
  schedule: AvailabilitySchedule[];
  locations: string[];
  channels: SalesChannel[];
  restrictions?: AvailabilityRestriction[];
}

export interface AvailabilitySchedule {
  dayOfWeek?: number[]; // 0-6, Sunday-Saturday
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  startDate?: Date;
  endDate?: Date;
  timezone: string;
}

export interface AvailabilityRestriction {
  type: 'age' | 'location' | 'time' | 'quantity' | 'customer_type';
  condition: Record<string, any>;
  message?: string;
}

export enum SalesChannel {
  POS = 'pos',
  ONLINE = 'online',
  MOBILE_APP = 'mobile_app',
  PHONE = 'phone',
  THIRD_PARTY = 'third_party',
  WHOLESALE = 'wholesale'
}

// ============================================================================
// PRODUCT DIMENSIONS & SHIPPING
// ============================================================================

export interface ProductDimensions {
  length: number;
  width: number;
  height: number;
  unit: 'cm' | 'inch';
  weight: number;
  weightUnit: 'g' | 'kg' | 'oz' | 'lb';
}

export interface ProductShipping {
  shippable: boolean;
  freeShipping: boolean;
  shippingClass?: string;
  dimensions?: ProductDimensions;
  requiresRefrigeration?: boolean;
  fragile?: boolean;
  hazmat?: boolean;
  shippingRestrictions?: string[];
}

// ============================================================================
// PRODUCT REVIEWS & RATINGS
// ============================================================================

export interface ProductReview {
  id: string;
  productId: string;
  customerId: string;
  customerName: string;
  orderId?: string;
  rating: number; // 1-5
  title?: string;
  review: string;
  pros?: string[];
  cons?: string[];
  images?: string[];
  verified: boolean;
  helpful: {
    yes: number;
    no: number;
  };
  response?: {
    message: string;
    responderName: string;
    respondedAt: Date;
  };
  tags?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// PRODUCT IMPORT/EXPORT
// ============================================================================

export interface ProductImportData {
  sku: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  quantity?: number;
  images?: string[];
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  customFields?: Record<string, any>;
}

export interface ProductExportData extends Product {
  categoryPath: string;
  stockLevel: number;
  salesCount: number;
  revenue: number;
  customFields?: Record<string, any>;
}