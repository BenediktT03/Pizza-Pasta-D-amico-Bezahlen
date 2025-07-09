/**
 * Product Model Types
 * Type definitions for product-related data structures
 */

import { z } from 'zod';

// Product status enum
export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued',
  SEASONAL = 'seasonal',
}

// Product type enum
export enum ProductType {
  FOOD = 'food',
  BEVERAGE = 'beverage',
  DESSERT = 'dessert',
  COMBO = 'combo',
  ADDON = 'addon',
  MERCHANDISE = 'merchandise',
}

// Base product interface
export interface Product {
  id: string;
  tenantId: string;
  sku?: string;
  name: string;
  displayName: Record<string, string>; // Multilingual: { de: "...", fr: "...", it: "...", en: "..." }
  description: Record<string, string>; // Multilingual
  shortDescription?: Record<string, string>; // Multilingual
  type: ProductType;
  status: ProductStatus;
  category: ProductCategory;
  subcategory?: string;
  tags: string[];
  images: ProductImage[];
  pricing: ProductPricing;
  inventory: ProductInventory;
  nutrition?: NutritionInfo;
  allergens: Allergen[];
  dietary: DietaryInfo;
  variants: ProductVariant[];
  addons: ProductAddon[];
  customizations: ProductCustomization[];
  availability: ProductAvailability;
  preparation: PreparationInfo;
  seo: ProductSeo;
  metadata: ProductMetadata;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// Product category interface
export interface ProductCategory {
  id: string;
  name: Record<string, string>; // Multilingual
  slug: string;
  icon?: string;
  image?: string;
  displayOrder: number;
  parentId?: string;
}

// Product image interface
export interface ProductImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  alt?: string;
  caption?: Record<string, string>; // Multilingual
  isPrimary: boolean;
  displayOrder: number;
}

// Product pricing interface
export interface ProductPricing {
  basePrice: number;
  salePrice?: number;
  costPrice?: number;
  taxRate: number;
  taxIncluded: boolean;
  currency: 'CHF' | 'EUR';
  dynamicPricing?: DynamicPricing;
}

// Dynamic pricing interface
export interface DynamicPricing {
  enabled: boolean;
  minPrice?: number;
  maxPrice?: number;
  factors: PricingFactor[];
  aiOptimized: boolean;
}

// Pricing factor interface
export interface PricingFactor {
  type: 'time' | 'demand' | 'weather' | 'inventory' | 'competition';
  weight: number;
  rules: PricingRule[];
}

// Pricing rule interface
export interface PricingRule {
  condition: string;
  adjustment: number; // percentage or fixed amount
  adjustmentType: 'percentage' | 'fixed';
}

// Product inventory interface
export interface ProductInventory {
  trackInventory: boolean;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold?: number;
  outOfStockBehavior: 'hide' | 'show_unavailable' | 'allow_backorder';
  restockDate?: Date;
  suppliers?: Supplier[];
}

// Supplier interface
export interface Supplier {
  id: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  leadTime: number; // in days
  minOrderQuantity?: number;
  cost?: number;
}

// Nutrition information interface
export interface NutritionInfo {
  servingSize: string;
  servingsPerContainer?: number;
  calories: number;
  caloriesFromFat?: number;
  totalFat?: NutrientInfo;
  saturatedFat?: NutrientInfo;
  transFat?: NutrientInfo;
  cholesterol?: NutrientInfo;
  sodium?: NutrientInfo;
  totalCarbohydrates?: NutrientInfo;
  dietaryFiber?: NutrientInfo;
  sugars?: NutrientInfo;
  protein?: NutrientInfo;
  vitamins?: VitaminInfo[];
  minerals?: MineralInfo[];
}

// Nutrient info interface
export interface NutrientInfo {
  amount: number;
  unit: 'g' | 'mg' | 'mcg' | '%';
  dailyValue?: number; // percentage
}

// Vitamin info interface
export interface VitaminInfo {
  name: string;
  amount: number;
  unit: 'mg' | 'mcg' | 'IU';
  dailyValue?: number; // percentage
}

// Mineral info interface
export interface MineralInfo {
  name: string;
  amount: number;
  unit: 'mg' | 'mcg';
  dailyValue?: number; // percentage
}

// Allergen enum
export enum Allergen {
  GLUTEN = 'gluten',
  CRUSTACEANS = 'crustaceans',
  EGGS = 'eggs',
  FISH = 'fish',
  PEANUTS = 'peanuts',
  SOY = 'soy',
  MILK = 'milk',
  NUTS = 'nuts',
  CELERY = 'celery',
  MUSTARD = 'mustard',
  SESAME = 'sesame',
  SULPHITES = 'sulphites',
  LUPIN = 'lupin',
  MOLLUSCS = 'molluscs',
}

// Dietary info interface
export interface DietaryInfo {
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isLactoseFree: boolean;
  isKosher: boolean;
  isHalal: boolean;
  isOrganic: boolean;
  isLowCarb: boolean;
  isKeto: boolean;
  isPaleo: boolean;
}

// Product variant interface
export interface ProductVariant {
  id: string;
  name: Record<string, string>; // Multilingual
  sku?: string;
  price?: number;
  priceAdjustment?: number;
  priceAdjustmentType?: 'fixed' | 'percentage';
  inventory?: ProductInventory;
  attributes: VariantAttribute[];
  image?: ProductImage;
  isDefault: boolean;
  displayOrder: number;
}

// Variant attribute interface
export interface VariantAttribute {
  name: string;
  value: string;
  displayName?: Record<string, string>; // Multilingual
}

// Product addon interface
export interface ProductAddon {
  id: string;
  productId: string; // Reference to another product
  name: Record<string, string>; // Multilingual
  price: number;
  maxQuantity?: number;
  isRequired: boolean;
  displayOrder: number;
}

// Product customization interface
export interface ProductCustomization {
  id: string;
  name: Record<string, string>; // Multilingual
  type: 'single' | 'multiple' | 'text';
  isRequired: boolean;
  options: CustomizationOption[];
  displayOrder: number;
}

// Customization option interface
export interface CustomizationOption {
  id: string;
  name: Record<string, string>; // Multilingual
  price?: number;
  priceAdjustment?: number;
  priceAdjustmentType?: 'fixed' | 'percentage';
  isDefault: boolean;
  maxSelections?: number; // for multiple type
}

// Product availability interface
export interface ProductAvailability {
  alwaysAvailable: boolean;
  schedule?: AvailabilitySchedule;
  locations?: string[]; // Location IDs where available
  channels: ('pos' | 'online' | 'app' | 'kiosk')[];
  startDate?: Date;
  endDate?: Date;
}

// Availability schedule interface
export interface AvailabilitySchedule {
  monday?: TimeSlot[];
  tuesday?: TimeSlot[];
  wednesday?: TimeSlot[];
  thursday?: TimeSlot[];
  friday?: TimeSlot[];
  saturday?: TimeSlot[];
  sunday?: TimeSlot[];
}

// Time slot interface
export interface TimeSlot {
  start: string; // HH:mm format
  end: string; // HH:mm format
}

// Preparation info interface
export interface PreparationInfo {
  time: number; // in minutes
  instructions?: string;
  station?: string; // kitchen station
  equipment?: string[];
  batchSize?: number;
  canBePreparedInAdvance: boolean;
  shelfLife?: number; // in hours
}

// Product SEO interface
export interface ProductSeo {
  metaTitle?: Record<string, string>; // Multilingual
  metaDescription?: Record<string, string>; // Multilingual
  metaKeywords?: Record<string, string[]>; // Multilingual
  slug: string;
  canonicalUrl?: string;
}

// Product metadata interface
export interface ProductMetadata {
  featured: boolean;
  bestseller: boolean;
  new: boolean;
  spicy?: number; // 0-5 scale
  popularity?: number; // 0-100 scale
  preparationDifficulty?: number; // 1-5 scale
  customFields?: Record<string, any>;
}

// Create product input
export interface CreateProductInput {
  tenantId: string;
  name: string;
  displayName: Record<string, string>;
  description: Record<string, string>;
  type: ProductType;
  category: string; // category ID
  pricing: Omit<ProductPricing, 'dynamicPricing'>;
  images?: Omit<ProductImage, 'id'>[];
  inventory?: Partial<ProductInventory>;
}

// Update product input
export interface UpdateProductInput {
  name?: string;
  displayName?: Record<string, string>;
  description?: Record<string, string>;
  shortDescription?: Record<string, string>;
  status?: ProductStatus;
  category?: string;
  subcategory?: string;
  tags?: string[];
  pricing?: Partial<ProductPricing>;
  inventory?: Partial<ProductInventory>;
  nutrition?: NutritionInfo;
  allergens?: Allergen[];
  dietary?: Partial<DietaryInfo>;
  availability?: Partial<ProductAvailability>;
  preparation?: Partial<PreparationInfo>;
  seo?: Partial<ProductSeo>;
  metadata?: Partial<ProductMetadata>;
}

// Validation schemas
export const productSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  sku: z.string().optional(),
  name: z.string().min(1),
  displayName: z.record(z.string()),
  description: z.record(z.string()),
  type: z.nativeEnum(ProductType),
  status: z.nativeEnum(ProductStatus),
  pricing: z.object({
    basePrice: z.number().min(0),
    salePrice: z.number().min(0).optional(),
    costPrice: z.number().min(0).optional(),
    taxRate: z.number().min(0).max(100),
    taxIncluded: z.boolean(),
    currency: z.enum(['CHF', 'EUR']),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional(),
});

// Helpers
export function calculatePrice(product: Product, quantity: number = 1): number {
  const price = product.pricing.salePrice || product.pricing.basePrice;
  return price * quantity;
}

export function isAvailable(product: Product): boolean {
  if (product.status !== ProductStatus.ACTIVE) return false;
  if (product.inventory.trackInventory && product.inventory.availableQuantity <= 0) {
    return product.inventory.outOfStockBehavior === 'allow_backorder';
  }
  return true;
}

export function isInSeason(product: Product): boolean {
  if (!product.availability.startDate || !product.availability.endDate) return true;
  const now = new Date();
  return now >= product.availability.startDate && now <= product.availability.endDate;
}

export function hasAllergen(product: Product, allergen: Allergen): boolean {
  return product.allergens.includes(allergen);
}

export function matchesDietaryRequirement(product: Product, requirement: keyof DietaryInfo): boolean {
  return product.dietary[requirement] === true;
}
