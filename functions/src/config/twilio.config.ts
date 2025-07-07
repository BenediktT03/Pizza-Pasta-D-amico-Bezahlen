/**
 * EATECH - Twilio SMS Configuration
 * Version: 1.0.0
 * Description: Twilio SMS service configuration and initialization
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /functions/src/config/twilio.config.ts
 */

import * as twilio from 'twilio';
import * as functions from 'firebase-functions';

// ============================================================================
// TWILIO CONFIGURATION
// ============================================================================

/**
 * Twilio service configuration
 */
export const TWILIO_CONFIG = {
  // API Configuration
  apiVersion: '2010-04-01',
  region: 'ireland', // EU data residency
  edge: 'dublin',
  
  // Phone numbers (Switzerland)
  phoneNumbers: {
    default: '+41XXXXXXXXX', // Your Twilio phone number
    fallback: '+41XXXXXXXXX',
    whatsapp: 'whatsapp:+41XXXXXXXXX'
  },
  
  // Messaging configuration
  messaging: {
    validityPeriod: 14400, // 4 hours in seconds
    maxPrice: '0.50', // Maximum price per SMS in USD
    attemptLimit: 3,
    smartEncoding: true,
    shortenUrls: false
  },
  
  // SMS templates language support
  languages: {
    default: 'de',
    supported: ['de', 'fr', 'it', 'en']
  },
  
  // Rate limiting
  rateLimits: {
    perPhoneNumber: {
      hourly: 10,
      daily: 30
    },
    perAccount: {
      hourly: 100,
      daily: 1000
    }
  },
  
  // Opt-out keywords
  optOutKeywords: [
    'STOP', 'STOPP', 'ARRET', 'FERMARE',
    'UNSUBSCRIBE', 'ABMELDEN', 'DESABONNER',
    'CANCEL', 'STORNIEREN', 'ANNULER'
  ],
  
  // Compliance
  compliance: {
    gdprEnabled: true,
    retentionDays: 90,
    anonymizeAfterDays: 365
  }
};

// ============================================================================
// TWILIO CLIENT INITIALIZATION
// ============================================================================

let twilioClient: twilio.Twilio | null = null;

/**
 * Gets or creates Twilio client instance
 */
export function getTwilioClient(): twilio.Twilio {
  if (!twilioClient) {
    const accountSid = functions.config().twilio?.account_sid || process.env.TWILIO_ACCOUNT_SID;
    const authToken = functions.config().twilio?.auth_token || process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured');
    }
    
    twilioClient = twilio(accountSid, authToken, {
      region: TWILIO_CONFIG.region,
      edge: TWILIO_CONFIG.edge,
      lazyLoading: true,
      autoRetry: true,
      maxRetries: 3
    });
    
    functions.logger.info('Twilio client initialized');
  }
  
  return twilioClient;
}

// ============================================================================
// MESSAGE TEMPLATES
// ============================================================================

export const MESSAGE_TEMPLATES = {
  // Order notifications
  ORDER_CONFIRMATION: {
    de: 'EATECH: Ihre Bestellung #{orderNumber} wurde bestätigt. Voraussichtliche Lieferzeit: {deliveryTime}. Verfolgen Sie Ihre Bestellung: {trackingUrl}',
    fr: 'EATECH: Votre commande #{orderNumber} est confirmée. Heure de livraison prévue: {deliveryTime}. Suivez votre commande: {trackingUrl}',
    it: 'EATECH: Il tuo ordine #{orderNumber} è confermato. Orario di consegna previsto: {deliveryTime}. Traccia il tuo ordine: {trackingUrl}',
    en: 'EATECH: Your order #{orderNumber} is confirmed. Estimated delivery time: {deliveryTime}. Track your order: {trackingUrl}'
  },
  
  ORDER_READY: {
    de: 'EATECH: Ihre Bestellung #{orderNumber} ist bereit zur Abholung!',
    fr: 'EATECH: Votre commande #{orderNumber} est prête à être retirée!',
    it: 'EATECH: Il tuo ordine #{orderNumber} è pronto per il ritiro!',
    en: 'EATECH: Your order #{orderNumber} is ready for pickup!'
  },
  
  ORDER_DELIVERING: {
    de: 'EATECH: Ihre Bestellung #{orderNumber} ist unterwegs! Fahrer: {driverName}, Tel: {driverPhone}',
    fr: 'EATECH: Votre commande #{orderNumber} est en route! Chauffeur: {driverName}, Tél: {driverPhone}',
    it: 'EATECH: Il tuo ordine #{orderNumber} è in consegna! Autista: {driverName}, Tel: {driverPhone}',
    en: 'EATECH: Your order #{orderNumber} is on the way! Driver: {driverName}, Tel: {driverPhone}'
  },
  
  ORDER_DELIVERED: {
    de: 'EATECH: Ihre Bestellung #{orderNumber} wurde geliefert. Guten Appetit! Bewerten Sie uns: {reviewUrl}',
    fr: 'EATECH: Votre commande #{orderNumber} a été livrée. Bon appétit! Évaluez-nous: {reviewUrl}',
    it: 'EATECH: Il tuo ordine #{orderNumber} è stato consegnato. Buon appetito! Valutaci: {reviewUrl}',
    en: 'EATECH: Your order #{orderNumber} has been delivered. Enjoy your meal! Rate us: {reviewUrl}'
  },
  
  ORDER_CANCELLED: {
    de: 'EATECH: Ihre Bestellung #{orderNumber} wurde storniert. Grund: {reason}. Erstattung erfolgt innerhalb von 3-5 Werktagen.',
    fr: 'EATECH: Votre commande #{orderNumber} a été annulée. Raison: {reason}. Remboursement sous 3-5 jours ouvrables.',
    it: 'EATECH: Il tuo ordine #{orderNumber} è stato annullato. Motivo: {reason}. Rimborso entro 3-5 giorni lavorativi.',
    en: 'EATECH: Your order #{orderNumber} has been cancelled. Reason: {reason}. Refund within 3-5 business days.'
  },
  
  // Authentication
  OTP_CODE: {
    de: 'EATECH: Ihr Verifizierungscode lautet: {code}. Gültig für 10 Minuten.',
    fr: 'EATECH: Votre code de vérification est: {code}. Valable 10 minutes.',
    it: 'EATECH: Il tuo codice di verifica è: {code}. Valido per 10 minuti.',
    en: 'EATECH: Your verification code is: {code}. Valid for 10 minutes.'
  },
  
  PASSWORD_RESET: {
    de: 'EATECH: Passwort zurücksetzen: {resetUrl}. Link gültig für 1 Stunde.',
    fr: 'EATECH: Réinitialiser le mot de passe: {resetUrl}. Lien valable 1 heure.',
    it: 'EATECH: Reimposta password: {resetUrl}. Link valido per 1 ora.',
    en: 'EATECH: Reset password: {resetUrl}. Link valid for 1 hour.'
  },
  
  // Marketing (requires opt-in)
  PROMOTION: {
    de: 'EATECH: {promoText} Code: {promoCode}. Gültig bis {expiryDate}. Abmelden: Text STOP',
    fr: 'EATECH: {promoText} Code: {promoCode}. Valable jusqu\'au {expiryDate}. Désabonner: ARRET',
    it: 'EATECH: {promoText} Codice: {promoCode}. Valido fino al {expiryDate}. Annulla: FERMARE',
    en: 'EATECH: {promoText} Code: {promoCode}. Valid until {expiryDate}. Unsubscribe: Text STOP'
  },
  
  // Reminders
  PICKUP_REMINDER: {
    de: 'EATECH: Erinnerung - Ihre Bestellung #{orderNumber} wartet auf Abholung!',
    fr: 'EATECH: Rappel - Votre commande #{orderNumber} attend d\'être retirée!',
    it: 'EATECH: Promemoria - Il tuo ordine #{orderNumber} è in attesa di ritiro!',
    en: 'EATECH: Reminder - Your order #{orderNumber} is waiting for pickup!'
  },
  
  // Event notifications
  EVENT_REMINDER: {
    de: 'EATECH: Erinnerung - Ihr Event "{eventName}" findet morgen um {eventTime} statt.',
    fr: 'EATECH: Rappel - Votre événement "{eventName}" aura lieu demain à {eventTime}.',
    it: 'EATECH: Promemoria - Il tuo evento "{eventName}" si terrà domani alle {eventTime}.',
    en: 'EATECH: Reminder - Your event "{eventName}" is tomorrow at {eventTime}.'
  }
};

// ============================================================================
// PHONE NUMBER VALIDATION
// ============================================================================

/**
 * Swiss phone number patterns
 */
const SWISS_PHONE_PATTERNS = {
  mobile: /^(\+41|0041|0)?7[6-9]\d{7}$/,
  landline: /^(\+41|0041|0)?[2-9]\d{8}$/,
  premium: /^(\+41|0041|0)?90[0-9]\d{6}$/,
  toll: /^(\+41|0041|0)?84[0-9]\d{6}$/
};

/**
 * Validates and formats Swiss phone number
 */
export function validateSwissPhoneNumber(phoneNumber: string): {
  isValid: boolean;
  formatted?: string;
  type?: 'mobile' | 'landline' | 'premium' | 'toll';
  error?: string;
} {
  // Remove all non-numeric characters except +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // Check patterns
  for (const [type, pattern] of Object.entries(SWISS_PHONE_PATTERNS)) {
    if (pattern.test(cleaned)) {
      // Format to international format
      let formatted = cleaned;
      
      // Convert to international format
      if (formatted.startsWith('0041')) {
        formatted = '+41' + formatted.slice(4);
      } else if (formatted.startsWith('0')) {
        formatted = '+41' + formatted.slice(1);
      } else if (!formatted.startsWith('+')) {
        formatted = '+41' + formatted;
      }
      
      return {
        isValid: true,
        formatted,
        type: type as 'mobile' | 'landline' | 'premium' | 'toll'
      };
    }
  }
  
  return {
    isValid: false,
    error: 'Invalid Swiss phone number format'
  };
}

/**
 * Checks if number can receive SMS
 */
export function canReceiveSMS(phoneNumber: string): boolean {
  const validation = validateSwissPhoneNumber(phoneNumber);
  return validation.isValid && validation.type === 'mobile';
}

// ============================================================================
// MESSAGE SENDING
// ============================================================================

/**
 * Send SMS options
 */
export interface SendSMSOptions {
  to: string;
  template: keyof typeof MESSAGE_TEMPLATES;
  language?: string;
  variables?: Record<string, string>;
  mediaUrl?: string;
  scheduleTime?: Date;
  statusCallback?: string;
  validityPeriod?: number;
}

/**
 * Prepares message content
 */
export function prepareMessage(
  template: keyof typeof MESSAGE_TEMPLATES,
  language: string,
  variables: Record<string, string> = {}
): string {
  const templates = MESSAGE_TEMPLATES[template];
  const lang = language as keyof typeof templates;
  
  let message = templates[lang] || templates[TWILIO_CONFIG.languages.default];
  
  // Replace variables
  Object.entries(variables).forEach(([key, value]) => {
    message = message.replace(new RegExp(`{${key}}`, 'g'), value);
  });
  
  return message;
}

/**
 * Creates SMS message options
 */
export function createMessageOptions(options: SendSMSOptions): twilio.Twilio.MessageListInstanceCreateOptions {
  const message = prepareMessage(
    options.template,
    options.language || TWILIO_CONFIG.languages.default,
    options.variables
  );
  
  const messageOptions: twilio.Twilio.MessageListInstanceCreateOptions = {
    to: options.to,
    from: TWILIO_CONFIG.phoneNumbers.default,
    body: message,
    validityPeriod: options.validityPeriod || TWILIO_CONFIG.messaging.validityPeriod,
    maxPrice: TWILIO_CONFIG.messaging.maxPrice,
    smartEncoded: TWILIO_CONFIG.messaging.smartEncoding
  };
  
  // Add optional parameters
  if (options.mediaUrl) {
    messageOptions.mediaUrl = [options.mediaUrl];
  }
  
  if (options.scheduleTime && options.scheduleTime > new Date()) {
    messageOptions.sendAt = options.scheduleTime;
    messageOptions.scheduleType = 'fixed';
  }
  
  if (options.statusCallback) {
    messageOptions.statusCallback = options.statusCallback;
  }
  
  return messageOptions;
}

// ============================================================================
// WEBHOOK CONFIGURATION
// ============================================================================

/**
 * Webhook event types
 */
export const WEBHOOK_EVENTS = {
  MESSAGE_SENT: 'sent',
  MESSAGE_DELIVERED: 'delivered',
  MESSAGE_FAILED: 'failed',
  MESSAGE_UNDELIVERED: 'undelivered',
  MESSAGE_RECEIVED: 'received',
  OPT_OUT: 'opt-out'
} as const;

/**
 * Validates Twilio webhook signature
 */
export function validateWebhookSignature(
  authToken: string,
  twilioSignature: string,
  url: string,
  params: any
): boolean {
  return twilio.validateRequest(authToken, twilioSignature, url, params);
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Maps Twilio error codes to user-friendly messages
 */
export function mapTwilioError(error: any): {
  code: string;
  message: string;
  isRetryable: boolean;
} {
  const errorMap: Record<number, { code: string; message: string; isRetryable: boolean }> = {
    21211: {
      code: 'INVALID_PHONE_NUMBER',
      message: 'Die Telefonnummer ist ungültig',
      isRetryable: false
    },
    21612: {
      code: 'CANNOT_ROUTE_TO_NUMBER',
      message: 'Die Nachricht kann nicht an diese Nummer gesendet werden',
      isRetryable: false
    },
    21408: {
      code: 'PERMISSION_DENIED',
      message: 'Keine Berechtigung zum Senden an diese Nummer',
      isRetryable: false
    },
    21610: {
      code: 'RECIPIENT_BLOCKED',
      message: 'Der Empfänger hat SMS-Nachrichten blockiert',
      isRetryable: false
    },
    30007: {
      code: 'MESSAGE_FILTERED',
      message: 'Die Nachricht wurde vom Carrier gefiltert',
      isRetryable: true
    },
    30008: {
      code: 'UNKNOWN_ERROR',
      message: 'Unbekannter Fehler beim Senden der Nachricht',
      isRetryable: true
    }
  };
  
  const errorCode = error.code || error.status;
  return errorMap[errorCode] || {
    code: 'SMS_SEND_FAILED',
    message: 'Fehler beim Senden der SMS',
    isRetryable: true
  };
}

// ============================================================================
// ANALYTICS & REPORTING
// ============================================================================

/**
 * SMS analytics data structure
 */
export interface SMSAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  averageDeliveryTime: number;
  costPerSMS: number;
  totalCost: number;
  byCountry: Record<string, number>;
  byTemplate: Record<string, number>;
  byHour: Record<number, number>;
}

/**
 * Calculates SMS cost (approximate)
 */
export function calculateSMSCost(
  to: string,
  messageLength: number,
  mediaIncluded: boolean = false
): {
  segments: number;
  costPerSegment: number;
  totalCost: number;
  currency: string;
} {
  // SMS segment calculation
  const singleSMSLength = 160;
  const multiSMSLength = 153;
  const segments = messageLength <= singleSMSLength ? 1 : 
    Math.ceil(messageLength / multiSMSLength);
  
  // Switzerland SMS pricing (approximate)
  let costPerSegment = 0.075; // USD
  
  // Add MMS cost if media included
  if (mediaIncluded) {
    costPerSegment = 0.15; // USD for MMS
  }
  
  return {
    segments,
    costPerSegment,
    totalCost: segments * costPerSegment,
    currency: 'USD'
  };
}

// ============================================================================
// COMPLIANCE HELPERS
// ============================================================================

/**
 * Checks if message contains opt-out keyword
 */
export function containsOptOutKeyword(message: string): boolean {
  const normalizedMessage = message.toUpperCase().trim();
  return TWILIO_CONFIG.optOutKeywords.some(keyword => 
    normalizedMessage === keyword || 
    normalizedMessage.startsWith(keyword + ' ')
  );
}

/**
 * Adds compliance footer to marketing messages
 */
export function addComplianceFooter(
  message: string,
  language: string = 'de'
): string {
  const footers = {
    de: '\n\nAbmelden: STOP an diese Nummer',
    fr: '\n\nDésabonner: ARRET à ce numéro',
    it: '\n\nAnnulla: FERMARE a questo numero',
    en: '\n\nUnsubscribe: Text STOP to this number'
  };
  
  return message + (footers[language as keyof typeof footers] || footers.de);
}

// ============================================================================
// CONVERSATION API (for WhatsApp Business)
// ============================================================================

export const WHATSAPP_CONFIG = {
  templates: {
    ORDER_UPDATE: 'order_update_v1',
    DELIVERY_STATUS: 'delivery_status_v1',
    PAYMENT_REMINDER: 'payment_reminder_v1'
  },
  
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  
  mediaTypes: {
    image: ['jpg', 'jpeg', 'png'],
    document: ['pdf'],
    audio: ['mp3', 'ogg'],
    video: ['mp4']
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Configuration
  TWILIO_CONFIG,
  MESSAGE_TEMPLATES,
  WEBHOOK_EVENTS,
  WHATSAPP_CONFIG,
  
  // Client
  getTwilioClient,
  
  // Validation
  validateSwissPhoneNumber,
  canReceiveSMS,
  validateWebhookSignature,
  
  // Messaging
  prepareMessage,
  createMessageOptions,
  
  // Error handling
  mapTwilioError,
  
  // Analytics
  calculateSMSCost,
  
  // Compliance
  containsOptOutKeyword,
  addComplianceFooter
};