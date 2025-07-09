/**
 * Swiss QR-Bill utilities
 * Implementation according to Swiss QR-bill standards
 */

export interface QRBillData {
  // Creditor information
  creditor: {
    name: string;
    address: string;
    houseNumber?: string;
    postalCode: string;
    city: string;
    country: string;
    iban: string;
  };
  
  // Debtor information (optional)
  debtor?: {
    name: string;
    address: string;
    houseNumber?: string;
    postalCode: string;
    city: string;
    country: string;
  };
  
  // Payment information
  amount?: number;
  currency: 'CHF' | 'EUR';
  reference: string;
  referenceType: 'QRR' | 'SCOR' | 'NON';
  additionalInfo?: string;
  
  // Alternative procedures
  alternativeProcedures?: string[];
}

/**
 * Generate QR-bill reference number (QRR)
 * @param customerNumber Customer number (max 6 digits)
 * @param invoiceNumber Invoice number (max 10 digits)
 * @returns QR reference number (27 digits)
 */
export function generateQRReference(
  customerNumber: string,
  invoiceNumber: string
): string {
  // Pad numbers
  const customer = customerNumber.padStart(6, '0').slice(0, 6);
  const invoice = invoiceNumber.padStart(10, '0').slice(0, 10);
  
  // Create base reference (26 digits)
  const baseRef = `00000000000${customer}${invoice}`;
  
  // Calculate check digit using modulo 10 recursive
  const checkDigit = calculateCheckDigit(baseRef);
  
  return baseRef + checkDigit;
}

/**
 * Calculate check digit for QR reference
 * @param reference The reference without check digit
 * @returns Check digit
 */
function calculateCheckDigit(reference: string): string {
  const table = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];
  let carry = 0;
  
  for (const digit of reference) {
    carry = table[(carry + parseInt(digit, 10)) % 10];
  }
  
  return ((10 - carry) % 10).toString();
}

/**
 * Validate QR reference
 * @param reference The QR reference to validate
 * @returns Whether the reference is valid
 */
export function validateQRReference(reference: string): boolean {
  // Must be 27 digits
  if (!/^\d{27}$/.test(reference)) return false;
  
  // Check digit validation
  const baseRef = reference.slice(0, 26);
  const checkDigit = reference.slice(26);
  
  return calculateCheckDigit(baseRef) === checkDigit;
}

/**
 * Format QR reference for display
 * @param reference The QR reference
 * @returns Formatted reference
 */
export function formatQRReference(reference: string): string {
  if (!validateQRReference(reference)) return reference;
  
  // Format as: XX XXXXX XXXXX XXXXX XXXXX XXXXX
  const parts = [];
  parts.push(reference.slice(0, 2));
  
  for (let i = 2; i < 27; i += 5) {
    parts.push(reference.slice(i, i + 5));
  }
  
  return parts.join(' ');
}

/**
 * Generate SCOR reference
 * @param reference The original reference
 * @returns SCOR reference with check digits
 */
export function generateSCORReference(reference: string): string {
  // Remove any non-alphanumeric characters
  const cleaned = reference.replace(/[^A-Z0-9]/g, '').toUpperCase();
  
  // SCOR references use mod 97 check digits (similar to IBAN)
  const numericString = cleaned.replace(/[A-Z]/g, char => 
    (char.charCodeAt(0) - 55).toString()
  );
  
  // Calculate mod 97
  let remainder = '';
  for (const digit of numericString) {
    remainder = (parseInt(remainder + digit, 10) % 97).toString();
  }
  
  const checkDigits = (98 - parseInt(remainder, 10)).toString().padStart(2, '0');
  
  return `RF${checkDigits}${cleaned}`;
}

/**
 * Validate Swiss IBAN
 * @param iban The IBAN to validate
 * @returns Whether the IBAN is valid
 */
export function validateSwissIBAN(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  
  // Swiss IBAN format: CH + 2 check digits + 5 bank code + 12 account number
  if (!/^CH\d{2}\d{5}\d{12}$/.test(cleaned)) return false;
  
  // Move first 4 chars to end
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  
  // Convert letters to numbers
  const numeric = rearranged.replace(/[A-Z]/g, char => 
    (char.charCodeAt(0) - 55).toString()
  );
  
  // Calculate mod 97
  let remainder = '';
  for (const digit of numeric) {
    remainder = (parseInt(remainder + digit, 10) % 97).toString();
  }
  
  return remainder === '1';
}

/**
 * Format Swiss IBAN
 * @param iban The IBAN to format
 * @returns Formatted IBAN
 */
export function formatSwissIBAN(iban: string): string {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  
  if (!validateSwissIBAN(cleaned)) return iban;
  
  // Format as: CH00 0000 0000 0000 0000 0
  const parts = [];
  for (let i = 0; i < cleaned.length; i += 4) {
    parts.push(cleaned.slice(i, i + 4));
  }
  
  return parts.join(' ');
}

/**
 * Generate QR-bill payload
 * @param data The QR-bill data
 * @returns QR code payload string
 */
export function generateQRBillPayload(data: QRBillData): string {
  const lines: string[] = [
    'SPC', // QR-Type
    '0200', // Version
    '1', // Character set (1 = UTF-8)
  ];
  
  // IBAN
  lines.push(data.creditor.iban.replace(/\s/g, ''));
  
  // Creditor
  lines.push('K'); // Address type (K = Combined)
  lines.push(data.creditor.name);
  lines.push(data.creditor.address + (data.creditor.houseNumber ? ' ' + data.creditor.houseNumber : ''));
  lines.push(data.creditor.postalCode + ' ' + data.creditor.city);
  lines.push(''); // Empty line
  lines.push(''); // Empty line  
  lines.push(data.creditor.country);
  
  // Ultimate creditor (not used)
  lines.push('');
  lines.push('');
  lines.push('');
  lines.push('');
  lines.push('');
  lines.push('');
  lines.push('');
  
  // Payment amount
  lines.push(data.amount ? data.amount.toFixed(2) : '');
  lines.push(data.currency);
  
  // Debtor
  if (data.debtor) {
    lines.push('K'); // Address type
    lines.push(data.debtor.name);
    lines.push(data.debtor.address + (data.debtor.houseNumber ? ' ' + data.debtor.houseNumber : ''));
    lines.push(data.debtor.postalCode + ' ' + data.debtor.city);
    lines.push('');
    lines.push('');
    lines.push(data.debtor.country);
  } else {
    lines.push('');
    lines.push('');
    lines.push('');
    lines.push('');
    lines.push('');
    lines.push('');
    lines.push('');
  }
  
  // Reference
  lines.push(data.referenceType);
  lines.push(data.reference);
  
  // Additional information
  lines.push(data.additionalInfo || '');
  lines.push('EPD'); // End Payment Data
  
  // Alternative procedures
  if (data.alternativeProcedures && data.alternativeProcedures.length > 0) {
    lines.push(data.alternativeProcedures.join('\n'));
  } else {
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Parse QR-bill payload
 * @param payload The QR code payload
 * @returns Parsed QR-bill data or null
 */
export function parseQRBillPayload(payload: string): QRBillData | null {
  const lines = payload.split('\n');
  
  // Validate header
  if (lines[0] !== 'SPC' || lines[1] !== '0200') {
    return null;
  }
  
  try {
    // Parse creditor address
    const creditorAddress = lines[6].split(' ');
    const creditorPostalCity = lines[7].split(' ');
    
    const data: QRBillData = {
      creditor: {
        name: lines[5],
        address: creditorAddress[0],
        houseNumber: creditorAddress[1],
        postalCode: creditorPostalCity[0],
        city: creditorPostalCity.slice(1).join(' '),
        country: lines[10],
        iban: lines[3]
      },
      amount: lines[18] ? parseFloat(lines[18]) : undefined,
      currency: lines[19] as 'CHF' | 'EUR',
      referenceType: lines[28] as 'QRR' | 'SCOR' | 'NON',
      reference: lines[29],
      additionalInfo: lines[30] || undefined
    };
    
    // Parse debtor if present
    if (lines[21]) {
      const debtorAddress = lines[22].split(' ');
      const debtorPostalCity = lines[23].split(' ');
      
      data.debtor = {
        name: lines[21],
        address: debtorAddress[0],
        houseNumber: debtorAddress[1],
        postalCode: debtorPostalCity[0],
        city: debtorPostalCity.slice(1).join(' '),
        country: lines[26]
      };
    }
    
    // Parse alternative procedures
    if (lines[32]) {
      data.alternativeProcedures = lines[32].split('\n');
    }
    
    return data;
  } catch {
    return null;
  }
}

/**
 * Calculate QR-bill amount with rounding
 * @param amount The amount to round
 * @returns Rounded amount (to 0.05 CHF)
 */
export function roundQRBillAmount(amount: number): number {
  return Math.round(amount * 20) / 20;
}

/**
 * Validate QR-bill data
 * @param data The QR-bill data to validate
 * @returns Validation result
 */
export function validateQRBillData(data: QRBillData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Validate IBAN
  if (!validateSwissIBAN(data.creditor.iban)) {
    errors.push('Invalid IBAN');
  }
  
  // Validate amount
  if (data.amount !== undefined) {
    if (data.amount < 0 || data.amount > 999999999.99) {
      errors.push('Amount must be between 0 and 999999999.99');
    }
  }
  
  // Validate reference
  if (data.referenceType === 'QRR') {
    if (!validateQRReference(data.reference)) {
      errors.push('Invalid QR reference');
    }
  } else if (data.referenceType === 'SCOR') {
    if (!/^RF\d{2}[A-Z0-9]+$/.test(data.reference)) {
      errors.push('Invalid SCOR reference');
    }
  }
  
  // Validate addresses
  if (data.creditor.name.length > 70) {
    errors.push('Creditor name too long (max 70 characters)');
  }
  
  if (data.debtor && data.debtor.name.length > 70) {
    errors.push('Debtor name too long (max 70 characters)');
  }
  
  // Validate additional info
  if (data.additionalInfo && data.additionalInfo.length > 140) {
    errors.push('Additional info too long (max 140 characters)');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Export all QR-bill utilities
export default {
  generateQRReference,
  validateQRReference,
  formatQRReference,
  generateSCORReference,
  validateSwissIBAN,
  formatSwissIBAN,
  generateQRBillPayload,
  parseQRBillPayload,
  roundQRBillAmount,
  validateQRBillData
};
