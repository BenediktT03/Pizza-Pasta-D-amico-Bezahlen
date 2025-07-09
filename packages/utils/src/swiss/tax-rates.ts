/**
 * Swiss tax rates and utilities
 * VAT rates and cantonal tax information
 */

export interface VATRate {
  rate: number;
  description: string;
  categories: string[];
  validFrom: Date;
  validUntil?: Date;
}

export interface CantonalTaxInfo {
  canton: string;
  incomeTaxRate: {
    min: number;
    max: number;
  };
  wealthTaxRate: {
    min: number;
    max: number;
  };
  corporateTaxRate: number;
  capitalTaxRate: number;
  realEstateTaxRate?: number;
}

// Swiss VAT rates (as of 2024)
export const SWISS_VAT_RATES: Record<string, VATRate> = {
  standard: {
    rate: 8.1,
    description: 'Standard VAT rate',
    categories: [
      'Most goods and services',
      'Restaurant services (eat-in)',
      'Alcohol',
      'Tobacco',
      'Luxury goods'
    ],
    validFrom: new Date('2024-01-01')
  },
  reduced: {
    rate: 2.6,
    description: 'Reduced VAT rate',
    categories: [
      'Food and non-alcoholic beverages',
      'Books',
      'Newspapers and magazines',
      'Medicine',
      'Restaurant services (take-away)',
      'Agricultural products'
    ],
    validFrom: new Date('2024-01-01')
  },
  lodging: {
    rate: 3.8,
    description: 'Special rate for lodging',
    categories: [
      'Hotel accommodation',
      'Holiday apartments',
      'Camping sites',
      'Bed and breakfast'
    ],
    validFrom: new Date('2024-01-01')
  },
  exempt: {
    rate: 0,
    description: 'VAT exempt',
    categories: [
      'Education services',
      'Health services',
      'Social services',
      'Cultural services',
      'Insurance',
      'Financial services',
      'Real estate transactions',
      'Exports'
    ],
    validFrom: new Date('2024-01-01')
  }
};

// Cantonal tax information (simplified, rates vary by municipality)
export const CANTONAL_TAX_RATES: Record<string, CantonalTaxInfo> = {
  'ZH': {
    canton: 'Zürich',
    incomeTaxRate: { min: 2, max: 13 },
    wealthTaxRate: { min: 0.5, max: 3 },
    corporateTaxRate: 8.5,
    capitalTaxRate: 0.75
  },
  'BE': {
    canton: 'Bern',
    incomeTaxRate: { min: 1.5, max: 16 },
    wealthTaxRate: { min: 0.4, max: 3.5 },
    corporateTaxRate: 9.4,
    capitalTaxRate: 0.8
  },
  'LU': {
    canton: 'Luzern',
    incomeTaxRate: { min: 2, max: 12 },
    wealthTaxRate: { min: 0.25, max: 2.5 },
    corporateTaxRate: 7.8,
    capitalTaxRate: 0.5
  },
  'UR': {
    canton: 'Uri',
    incomeTaxRate: { min: 1.5, max: 10 },
    wealthTaxRate: { min: 0.2, max: 2 },
    corporateTaxRate: 7.2,
    capitalTaxRate: 0.4
  },
  'SZ': {
    canton: 'Schwyz',
    incomeTaxRate: { min: 1.5, max: 8 },
    wealthTaxRate: { min: 0.2, max: 1.5 },
    corporateTaxRate: 6.8,
    capitalTaxRate: 0.35
  },
  'OW': {
    canton: 'Obwalden',
    incomeTaxRate: { min: 1.5, max: 9.5 },
    wealthTaxRate: { min: 0.15, max: 1.8 },
    corporateTaxRate: 7.1,
    capitalTaxRate: 0.4
  },
  'NW': {
    canton: 'Nidwalden',
    incomeTaxRate: { min: 1.5, max: 9 },
    wealthTaxRate: { min: 0.15, max: 1.7 },
    corporateTaxRate: 6.9,
    capitalTaxRate: 0.35
  },
  'GL': {
    canton: 'Glarus',
    incomeTaxRate: { min: 1.5, max: 11 },
    wealthTaxRate: { min: 0.25, max: 2.5 },
    corporateTaxRate: 7.5,
    capitalTaxRate: 0.6
  },
  'ZG': {
    canton: 'Zug',
    incomeTaxRate: { min: 1, max: 7 },
    wealthTaxRate: { min: 0.1, max: 1 },
    corporateTaxRate: 6.2,
    capitalTaxRate: 0.3
  },
  'FR': {
    canton: 'Fribourg',
    incomeTaxRate: { min: 2, max: 14.5 },
    wealthTaxRate: { min: 0.3, max: 3.2 },
    corporateTaxRate: 8.8,
    capitalTaxRate: 0.85
  },
  'SO': {
    canton: 'Solothurn',
    incomeTaxRate: { min: 2, max: 13.5 },
    wealthTaxRate: { min: 0.4, max: 3 },
    corporateTaxRate: 8.4,
    capitalTaxRate: 0.75
  },
  'BS': {
    canton: 'Basel-Stadt',
    incomeTaxRate: { min: 2.5, max: 15 },
    wealthTaxRate: { min: 0.4, max: 4 },
    corporateTaxRate: 8.0,
    capitalTaxRate: 0.9
  },
  'BL': {
    canton: 'Basel-Landschaft',
    incomeTaxRate: { min: 2, max: 14 },
    wealthTaxRate: { min: 0.35, max: 3.5 },
    corporateTaxRate: 8.2,
    capitalTaxRate: 0.8
  },
  'SH': {
    canton: 'Schaffhausen',
    incomeTaxRate: { min: 1.8, max: 12 },
    wealthTaxRate: { min: 0.25, max: 2.8 },
    corporateTaxRate: 7.6,
    capitalTaxRate: 0.65
  },
  'AR': {
    canton: 'Appenzell Ausserrhoden',
    incomeTaxRate: { min: 1.5, max: 11.5 },
    wealthTaxRate: { min: 0.2, max: 2.5 },
    corporateTaxRate: 7.8,
    capitalTaxRate: 0.6
  },
  'AI': {
    canton: 'Appenzell Innerrhoden',
    incomeTaxRate: { min: 1, max: 9 },
    wealthTaxRate: { min: 0.15, max: 2 },
    corporateTaxRate: 7.0,
    capitalTaxRate: 0.4
  },
  'SG': {
    canton: 'St. Gallen',
    incomeTaxRate: { min: 2, max: 13 },
    wealthTaxRate: { min: 0.3, max: 3 },
    corporateTaxRate: 8.1,
    capitalTaxRate: 0.7
  },
  'GR': {
    canton: 'Graubünden',
    incomeTaxRate: { min: 1.5, max: 12.5 },
    wealthTaxRate: { min: 0.25, max: 2.8 },
    corporateTaxRate: 7.9,
    capitalTaxRate: 0.65
  },
  'AG': {
    canton: 'Aargau',
    incomeTaxRate: { min: 1.5, max: 12.5 },
    wealthTaxRate: { min: 0.3, max: 3 },
    corporateTaxRate: 8.3,
    capitalTaxRate: 0.75
  },
  'TG': {
    canton: 'Thurgau',
    incomeTaxRate: { min: 1.5, max: 12 },
    wealthTaxRate: { min: 0.25, max: 2.5 },
    corporateTaxRate: 7.7,
    capitalTaxRate: 0.6
  },
  'TI': {
    canton: 'Ticino',
    incomeTaxRate: { min: 1.5, max: 13 },
    wealthTaxRate: { min: 0.15, max: 3 },
    corporateTaxRate: 8.5,
    capitalTaxRate: 0.75
  },
  'VD': {
    canton: 'Vaud',
    incomeTaxRate: { min: 2, max: 15 },
    wealthTaxRate: { min: 0.3, max: 3.5 },
    corporateTaxRate: 8.8,
    capitalTaxRate: 0.85
  },
  'VS': {
    canton: 'Valais',
    incomeTaxRate: { min: 1.5, max: 13 },
    wealthTaxRate: { min: 0.2, max: 3 },
    corporateTaxRate: 8.5,
    capitalTaxRate: 0.7
  },
  'NE': {
    canton: 'Neuchâtel',
    incomeTaxRate: { min: 2, max: 14 },
    wealthTaxRate: { min: 0.3, max: 3.5 },
    corporateTaxRate: 8.6,
    capitalTaxRate: 0.8
  },
  'GE': {
    canton: 'Genève',
    incomeTaxRate: { min: 2.5, max: 16 },
    wealthTaxRate: { min: 0.4, max: 4.5 },
    corporateTaxRate: 9.0,
    capitalTaxRate: 0.95
  },
  'JU': {
    canton: 'Jura',
    incomeTaxRate: { min: 2, max: 14 },
    wealthTaxRate: { min: 0.35, max: 3.5 },
    corporateTaxRate: 8.7,
    capitalTaxRate: 0.85
  }
};

/**
 * Get VAT rate for a category
 * @param category The product/service category
 * @returns VAT rate information
 */
export function getVATRateForCategory(category: string): VATRate | null {
  const lowerCategory = category.toLowerCase();
  
  for (const [key, rate] of Object.entries(SWISS_VAT_RATES)) {
    if (rate.categories.some(cat => cat.toLowerCase().includes(lowerCategory))) {
      return rate;
    }
  }
  
  // Default to standard rate
  return SWISS_VAT_RATES.standard;
}

/**
 * Calculate VAT amount
 * @param amount The base amount
 * @param vatType The VAT type
 * @param isInclusive Whether the amount includes VAT
 * @returns VAT calculation result
 */
export function calculateVAT(
  amount: number,
  vatType: keyof typeof SWISS_VAT_RATES = 'standard',
  isInclusive: boolean = false
): {
  baseAmount: number;
  vatAmount: number;
  totalAmount: number;
  vatRate: number;
} {
  const rate = SWISS_VAT_RATES[vatType].rate;
  
  if (isInclusive) {
    // Amount includes VAT
    const baseAmount = amount / (1 + rate / 100);
    const vatAmount = amount - baseAmount;
    
    return {
      baseAmount: Math.round(baseAmount * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      totalAmount: amount,
      vatRate: rate
    };
  } else {
    // Amount excludes VAT
    const vatAmount = amount * (rate / 100);
    const totalAmount = amount + vatAmount;
    
    return {
      baseAmount: amount,
      vatAmount: Math.round(vatAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      vatRate: rate
    };
  }
}

/**
 * Get cantonal tax info
 * @param canton The canton code
 * @returns Cantonal tax information
 */
export function getCantonalTaxInfo(canton: string): CantonalTaxInfo | null {
  return CANTONAL_TAX_RATES[canton.toUpperCase()] || null;
}

/**
 * Calculate withholding tax
 * @param amount The gross amount
 * @param taxRate The withholding tax rate (default 35% for Switzerland)
 * @returns Withholding tax calculation
 */
export function calculateWithholdingTax(
  amount: number,
  taxRate: number = 35
): {
  grossAmount: number;
  taxAmount: number;
  netAmount: number;
  taxRate: number;
} {
  const taxAmount = amount * (taxRate / 100);
  const netAmount = amount - taxAmount;
  
  return {
    grossAmount: amount,
    taxAmount: Math.round(taxAmount * 100) / 100,
    netAmount: Math.round(netAmount * 100) / 100,
    taxRate
  };
}

/**
 * Estimate income tax
 * @param income Annual income
 * @param canton Canton code
 * @param isMarried Whether the person is married
 * @param children Number of children
 * @returns Estimated tax amount (simplified)
 */
export function estimateIncomeTax(
  income: number,
  canton: string,
  isMarried: boolean = false,
  children: number = 0
): {
  federalTax: number;
  cantonalTax: number;
  municipalTax: number;
  totalTax: number;
  effectiveRate: number;
} {
  // Federal tax calculation (simplified)
  let federalTax = 0;
  const deduction = isMarried ? 2600 : 0;
  const childDeduction = children * 6500;
  const taxableIncome = Math.max(0, income - deduction - childDeduction);
  
  if (isMarried) {
    // Married rates
    if (taxableIncome > 895900) federalTax = 103880 + (taxableIncome - 895900) * 0.115;
    else if (taxableIncome > 148300) federalTax = 17766 + (taxableIncome - 148300) * 0.13;
    else if (taxableIncome > 103600) federalTax = 11956 + (taxableIncome - 103600) * 0.13;
    else if (taxableIncome > 78300) federalTax = 5937 + (taxableIncome - 78300) * 0.08;
    else if (taxableIncome > 55200) federalTax = 3907 + (taxableIncome - 55200) * 0.088;
    else if (taxableIncome > 31600) federalTax = 1735 + (taxableIncome - 31600) * 0.094;
    else if (taxableIncome > 17800) federalTax = 0 + (taxableIncome - 17800) * 0.01;
  } else {
    // Single rates
    if (taxableIncome > 755200) federalTax = 76453 + (taxableIncome - 755200) * 0.115;
    else if (taxableIncome > 124200) federalTax = 17079 + (taxableIncome - 124200) * 0.117;
    else if (taxableIncome > 103400) federalTax = 13892 + (taxableIncome - 103400) * 0.128;
    else if (taxableIncome > 78100) federalTax = 10620 + (taxableIncome - 78100) * 0.128;
    else if (taxableIncome > 57900) federalTax = 8004 + (taxableIncome - 57900) * 0.13;
    else if (taxableIncome > 48300) federalTax = 6703 + (taxableIncome - 48300) * 0.136;
    else if (taxableIncome > 40400) federalTax = 5606 + (taxableIncome - 40400) * 0.139;
    else if (taxableIncome > 31600) federalTax = 4380 + (taxableIncome - 31600) * 0.144;
    else if (taxableIncome > 14500) federalTax = 0 + (taxableIncome - 14500) * 0.0077;
  }
  
  // Cantonal tax (simplified using average rate)
  const cantonInfo = CANTONAL_TAX_RATES[canton.toUpperCase()];
  if (!cantonInfo) {
    throw new Error(`Unknown canton: ${canton}`);
  }
  
  // Use progressive rate based on income
  let cantonalRate = cantonInfo.incomeTaxRate.min;
  if (income > 200000) {
    cantonalRate = cantonInfo.incomeTaxRate.max;
  } else if (income > 100000) {
    cantonalRate = (cantonInfo.incomeTaxRate.min + cantonInfo.incomeTaxRate.max) / 2;
  }
  
  const cantonalTax = taxableIncome * (cantonalRate / 100);
  
  // Municipal tax (typically 100-150% of cantonal tax)
  const municipalTax = cantonalTax * 1.2; // Average multiplier
  
  const totalTax = federalTax + cantonalTax + municipalTax;
  const effectiveRate = (totalTax / income) * 100;
  
  return {
    federalTax: Math.round(federalTax),
    cantonalTax: Math.round(cantonalTax),
    municipalTax: Math.round(municipalTax),
    totalTax: Math.round(totalTax),
    effectiveRate: Math.round(effectiveRate * 100) / 100
  };
}

/**
 * Get tax-friendly cantons
 * @param type Type of tax to consider
 * @returns Array of cantons sorted by tax rate
 */
export function getTaxFriendlyCantons(
  type: 'income' | 'wealth' | 'corporate' = 'income'
): Array<{ canton: string; name: string; rate: number }> {
  const cantons = Object.entries(CANTONAL_TAX_RATES).map(([code, info]) => {
    let rate: number;
    
    switch (type) {
      case 'income':
        rate = (info.incomeTaxRate.min + info.incomeTaxRate.max) / 2;
        break;
      case 'wealth':
        rate = (info.wealthTaxRate.min + info.wealthTaxRate.max) / 2;
        break;
      case 'corporate':
        rate = info.corporateTaxRate;
        break;
    }
    
    return {
      canton: code,
      name: info.canton,
      rate
    };
  });
  
  return cantons.sort((a, b) => a.rate - b.rate);
}

// Export all tax utilities
export default {
  SWISS_VAT_RATES,
  CANTONAL_TAX_RATES,
  getVATRateForCategory,
  calculateVAT,
  getCantonalTaxInfo,
  calculateWithholdingTax,
  estimateIncomeTax,
  getTaxFriendlyCantons
};
