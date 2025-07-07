/**
 * EATECH - Calculation Utility Functions
 * Version: 1.0.0
 * Description: Mathematical and financial calculation utilities
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/utils/calculationUtils.ts
 */

import { Order, OrderTotals } from '../types/order.types';
import { Product } from '../types/product.types';

// ============================================================================
// CONSTANTS
// ============================================================================

export const VAT_RATES = {
  STANDARD: 7.7,      // Standard VAT rate in Switzerland
  REDUCED: 2.5,       // Reduced rate (e.g., food, non-alcoholic beverages)
  SPECIAL: 3.7,       // Special rate (e.g., accommodation)
  ZERO: 0            // Zero rate (e.g., exports)
};

export const CURRENCY = {
  CHF: 'CHF',
  EUR: 'EUR',
  USD: 'USD'
};

export const EXCHANGE_RATES = {
  CHF_TO_EUR: 0.92,
  CHF_TO_USD: 1.10,
  EUR_TO_CHF: 1.09,
  EUR_TO_USD: 1.20,
  USD_TO_CHF: 0.91,
  USD_TO_EUR: 0.83
};

// ============================================================================
// FINANCIAL CALCULATIONS
// ============================================================================

/**
 * Rounds a number to specified decimal places
 */
export function roundToDecimals(value: number, decimals: number = 2): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Rounds to nearest 0.05 (Swiss rounding)
 */
export function roundToSwiss(value: number): number {
  return Math.round(value * 20) / 20;
}

/**
 * Calculates percentage
 */
export function calculatePercentage(value: number, percentage: number): number {
  return roundToDecimals((value * percentage) / 100);
}

/**
 * Calculates percentage change between two values
 */
export function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue === 0 ? 0 : 100;
  return roundToDecimals(((newValue - oldValue) / oldValue) * 100);
}

/**
 * Calculates VAT amount
 */
export function calculateVAT(
  amount: number, 
  vatRate: number = VAT_RATES.STANDARD, 
  isInclusive: boolean = true
): { net: number; vat: number; gross: number } {
  if (isInclusive) {
    // Price includes VAT
    const net = amount / (1 + vatRate / 100);
    const vat = amount - net;
    return {
      net: roundToDecimals(net),
      vat: roundToDecimals(vat),
      gross: roundToDecimals(amount)
    };
  } else {
    // Price excludes VAT
    const vat = amount * (vatRate / 100);
    const gross = amount + vat;
    return {
      net: roundToDecimals(amount),
      vat: roundToDecimals(vat),
      gross: roundToDecimals(gross)
    };
  }
}

/**
 * Converts currency
 */
export function convertCurrency(
  amount: number, 
  fromCurrency: string, 
  toCurrency: string
): number {
  if (fromCurrency === toCurrency) return amount;
  
  const rateKey = `${fromCurrency}_TO_${toCurrency}`;
  const rate = EXCHANGE_RATES[rateKey as keyof typeof EXCHANGE_RATES];
  
  if (!rate) {
    throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
  }
  
  return roundToDecimals(amount * rate);
}

// ============================================================================
// DISCOUNT CALCULATIONS
// ============================================================================

/**
 * Calculates discount amount
 */
export function calculateDiscount(
  originalPrice: number,
  discount: { type: 'percentage' | 'fixed'; value: number }
): { discountAmount: number; finalPrice: number } {
  let discountAmount = 0;
  
  if (discount.type === 'percentage') {
    discountAmount = calculatePercentage(originalPrice, discount.value);
  } else {
    discountAmount = Math.min(discount.value, originalPrice);
  }
  
  const finalPrice = Math.max(0, originalPrice - discountAmount);
  
  return {
    discountAmount: roundToDecimals(discountAmount),
    finalPrice: roundToDecimals(finalPrice)
  };
}

/**
 * Calculates compound discount (multiple discounts)
 */
export function calculateCompoundDiscount(
  originalPrice: number,
  discounts: Array<{ type: 'percentage' | 'fixed'; value: number }>
): { totalDiscount: number; finalPrice: number; breakdown: number[] } {
  let currentPrice = originalPrice;
  const breakdown: number[] = [];
  
  for (const discount of discounts) {
    const result = calculateDiscount(currentPrice, discount);
    breakdown.push(result.discountAmount);
    currentPrice = result.finalPrice;
  }
  
  const totalDiscount = originalPrice - currentPrice;
  
  return {
    totalDiscount: roundToDecimals(totalDiscount),
    finalPrice: roundToDecimals(currentPrice),
    breakdown
  };
}

/**
 * Calculates volume discount
 */
export function calculateVolumeDiscount(
  unitPrice: number,
  quantity: number,
  tiers: Array<{ minQuantity: number; discount: number }>
): { originalPrice: number; discountedPrice: number; savings: number } {
  const originalPrice = unitPrice * quantity;
  
  // Find applicable tier
  const applicableTier = tiers
    .filter(tier => quantity >= tier.minQuantity)
    .sort((a, b) => b.minQuantity - a.minQuantity)[0];
  
  if (!applicableTier) {
    return {
      originalPrice: roundToDecimals(originalPrice),
      discountedPrice: roundToDecimals(originalPrice),
      savings: 0
    };
  }
  
  const discountAmount = calculatePercentage(originalPrice, applicableTier.discount);
  const discountedPrice = originalPrice - discountAmount;
  
  return {
    originalPrice: roundToDecimals(originalPrice),
    discountedPrice: roundToDecimals(discountedPrice),
    savings: roundToDecimals(discountAmount)
  };
}

// ============================================================================
// MARGIN & PROFIT CALCULATIONS
// ============================================================================

/**
 * Calculates profit margin
 */
export function calculateProfitMargin(
  revenue: number,
  cost: number
): { profit: number; margin: number; markup: number } {
  const profit = revenue - cost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const markup = cost > 0 ? (profit / cost) * 100 : 0;
  
  return {
    profit: roundToDecimals(profit),
    margin: roundToDecimals(margin),
    markup: roundToDecimals(markup)
  };
}

/**
 * Calculates selling price based on desired margin
 */
export function calculateSellingPrice(
  cost: number,
  desiredMargin: number
): number {
  if (desiredMargin >= 100) {
    throw new Error('Margin must be less than 100%');
  }
  
  const sellingPrice = cost / (1 - desiredMargin / 100);
  return roundToDecimals(sellingPrice);
}

/**
 * Calculates break-even point
 */
export function calculateBreakEven(
  fixedCosts: number,
  variableCostPerUnit: number,
  pricePerUnit: number
): { units: number; revenue: number } {
  const contributionMargin = pricePerUnit - variableCostPerUnit;
  
  if (contributionMargin <= 0) {
    throw new Error('Price must be greater than variable cost');
  }
  
  const breakEvenUnits = Math.ceil(fixedCosts / contributionMargin);
  const breakEvenRevenue = breakEvenUnits * pricePerUnit;
  
  return {
    units: breakEvenUnits,
    revenue: roundToDecimals(breakEvenRevenue)
  };
}

// ============================================================================
// DELIVERY CALCULATIONS
// ============================================================================

/**
 * Calculates delivery fee based on distance
 */
export function calculateDeliveryFee(
  distance: number, // in km
  options: {
    baseFee: number;
    perKmRate: number;
    minFee: number;
    maxFee: number;
    freeDeliveryThreshold?: number;
    orderValue?: number;
  }
): number {
  // Check for free delivery
  if (options.freeDeliveryThreshold && 
      options.orderValue && 
      options.orderValue >= options.freeDeliveryThreshold) {
    return 0;
  }
  
  const calculatedFee = options.baseFee + (distance * options.perKmRate);
  const constrainedFee = Math.max(options.minFee, Math.min(calculatedFee, options.maxFee));
  
  return roundToDecimals(constrainedFee);
}

/**
 * Calculates distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return roundToDecimals(distance, 1);
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// ============================================================================
// SERVICE FEE CALCULATIONS
// ============================================================================

/**
 * Calculates service fee
 */
export function calculateServiceFee(
  subtotal: number,
  options: {
    type: 'percentage' | 'fixed' | 'tiered';
    value?: number;
    tiers?: Array<{ threshold: number; fee: number }>;
    minFee?: number;
    maxFee?: number;
  }
): number {
  let fee = 0;
  
  switch (options.type) {
    case 'percentage':
      fee = calculatePercentage(subtotal, options.value || 0);
      break;
      
    case 'fixed':
      fee = options.value || 0;
      break;
      
    case 'tiered':
      if (options.tiers) {
        const applicableTier = options.tiers
          .filter(tier => subtotal >= tier.threshold)
          .sort((a, b) => b.threshold - a.threshold)[0];
        fee = applicableTier ? applicableTier.fee : 0;
      }
      break;
  }
  
  // Apply min/max constraints
  if (options.minFee !== undefined) {
    fee = Math.max(fee, options.minFee);
  }
  if (options.maxFee !== undefined) {
    fee = Math.min(fee, options.maxFee);
  }
  
  return roundToDecimals(fee);
}

// ============================================================================
// TIP CALCULATIONS
// ============================================================================

/**
 * Calculates suggested tip amounts
 */
export function calculateSuggestedTips(
  amount: number,
  percentages: number[] = [10, 15, 20]
): Array<{ percentage: number; amount: number }> {
  return percentages.map(percentage => ({
    percentage,
    amount: roundToDecimals(calculatePercentage(amount, percentage))
  }));
}

/**
 * Distributes tips among staff
 */
export function distributeTips(
  totalTips: number,
  staff: Array<{ id: string; hours: number; role: string }>,
  distribution: { [role: string]: number } // percentage per role
): Array<{ staffId: string; amount: number }> {
  // Calculate total weighted hours
  const weightedHours = staff.reduce((total, member) => {
    const weight = distribution[member.role] || 100;
    return total + (member.hours * weight / 100);
  }, 0);
  
  // Distribute tips
  return staff.map(member => {
    const weight = distribution[member.role] || 100;
    const weightedMemberHours = member.hours * weight / 100;
    const amount = (weightedMemberHours / weightedHours) * totalTips;
    
    return {
      staffId: member.id,
      amount: roundToDecimals(amount)
    };
  });
}

// ============================================================================
// ANALYTICS CALCULATIONS
// ============================================================================

/**
 * Calculates average order value
 */
export function calculateAverageOrderValue(orders: Order[]): number {
  if (orders.length === 0) return 0;
  
  const totalRevenue = orders.reduce((sum, order) => sum + order.totals.total, 0);
  return roundToDecimals(totalRevenue / orders.length);
}

/**
 * Calculates conversion rate
 */
export function calculateConversionRate(visitors: number, conversions: number): number {
  if (visitors === 0) return 0;
  return roundToDecimals((conversions / visitors) * 100);
}

/**
 * Calculates customer lifetime value
 */
export function calculateCustomerLifetimeValue(
  averageOrderValue: number,
  purchaseFrequency: number, // purchases per year
  customerLifespan: number   // in years
): number {
  return roundToDecimals(averageOrderValue * purchaseFrequency * customerLifespan);
}

/**
 * Calculates inventory turnover ratio
 */
export function calculateInventoryTurnover(
  costOfGoodsSold: number,
  averageInventory: number
): number {
  if (averageInventory === 0) return 0;
  return roundToDecimals(costOfGoodsSold / averageInventory, 1);
}

/**
 * Calculates days sales of inventory
 */
export function calculateDaysSalesOfInventory(
  inventoryTurnover: number
): number {
  if (inventoryTurnover === 0) return 0;
  return Math.round(365 / inventoryTurnover);
}

// ============================================================================
// STATISTICAL CALCULATIONS
// ============================================================================

/**
 * Calculates mean (average)
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return roundToDecimals(sum / values.length);
}

/**
 * Calculates median
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return roundToDecimals((sorted[middle - 1] + sorted[middle]) / 2);
  }
  
  return sorted[middle];
}

/**
 * Calculates standard deviation
 */
export function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = calculateMean(values);
  const squaredDifferences = values.map(val => Math.pow(val - mean, 2));
  const variance = calculateMean(squaredDifferences);
  
  return roundToDecimals(Math.sqrt(variance));
}

/**
 * Calculates percentile
 */
export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  if (percentile < 0 || percentile > 100) {
    throw new Error('Percentile must be between 0 and 100');
  }
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;
  
  if (lower === upper) {
    return sorted[lower];
  }
  
  return roundToDecimals(sorted[lower] * (1 - weight) + sorted[upper] * weight);
}

// ============================================================================
// COMPOUND CALCULATIONS
// ============================================================================

/**
 * Calculates compound interest
 */
export function calculateCompoundInterest(
  principal: number,
  rate: number,        // Annual interest rate as percentage
  time: number,        // Time in years
  compound: number = 12 // Compounding frequency per year
): { amount: number; interest: number } {
  const amount = principal * Math.pow(1 + (rate / 100 / compound), compound * time);
  const interest = amount - principal;
  
  return {
    amount: roundToDecimals(amount),
    interest: roundToDecimals(interest)
  };
}

/**
 * Calculates ROI (Return on Investment)
 */
export function calculateROI(
  initialInvestment: number,
  finalValue: number,
  additionalCosts: number = 0
): number {
  const totalInvestment = initialInvestment + additionalCosts;
  if (totalInvestment === 0) return 0;
  
  const roi = ((finalValue - totalInvestment) / totalInvestment) * 100;
  return roundToDecimals(roi);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Basic
  roundToDecimals,
  roundToSwiss,
  calculatePercentage,
  calculatePercentageChange,
  
  // Financial
  calculateVAT,
  convertCurrency,
  
  // Discounts
  calculateDiscount,
  calculateCompoundDiscount,
  calculateVolumeDiscount,
  
  // Margins
  calculateProfitMargin,
  calculateSellingPrice,
  calculateBreakEven,
  
  // Delivery
  calculateDeliveryFee,
  calculateDistance,
  
  // Service & Tips
  calculateServiceFee,
  calculateSuggestedTips,
  distributeTips,
  
  // Analytics
  calculateAverageOrderValue,
  calculateConversionRate,
  calculateCustomerLifetimeValue,
  calculateInventoryTurnover,
  calculateDaysSalesOfInventory,
  
  // Statistics
  calculateMean,
  calculateMedian,
  calculateStandardDeviation,
  calculatePercentile,
  
  // Compound
  calculateCompoundInterest,
  calculateROI,
  
  // Constants
  VAT_RATES,
  CURRENCY,
  EXCHANGE_RATES
};