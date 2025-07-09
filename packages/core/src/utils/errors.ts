/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly details?: any;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      details: this.details,
      stack: this.stack,
    };
  }
}

/**
 * Authentication error
 */
export class AuthError extends AppError {
  constructor(message: string, code: string = 'AUTH_ERROR', details?: any) {
    super(message, code, 401, true, details);
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends AppError {
  constructor(message: string, code: string = 'AUTHORIZATION_ERROR', details?: any) {
    super(message, code, 403, true, details);
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  public readonly fields: Record<string, string[]>;

  constructor(
    message: string,
    fields: Record<string, string[]> = {},
    code: string = 'VALIDATION_ERROR'
  ) {
    super(message, code, 400, true, { fields });
    this.fields = fields;
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(
    resource: string,
    identifier?: string,
    code: string = 'NOT_FOUND'
  ) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    
    super(message, code, 404, true, { resource, identifier });
  }
}

/**
 * Conflict error
 */
export class ConflictError extends AppError {
  constructor(message: string, code: string = 'CONFLICT', details?: any) {
    super(message, code, 409, true, details);
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(
    message: string = 'Too many requests',
    retryAfter?: number,
    code: string = 'RATE_LIMIT_EXCEEDED'
  ) {
    super(message, code, 429, true, { retryAfter });
    this.retryAfter = retryAfter;
  }
}

/**
 * Payment error
 */
export class PaymentError extends AppError {
  public readonly paymentProvider?: string;
  public readonly paymentMethod?: string;

  constructor(
    message: string,
    code: string = 'PAYMENT_ERROR',
    details?: {
      provider?: string;
      method?: string;
      [key: string]: any;
    }
  ) {
    super(message, code, 402, true, details);
    this.paymentProvider = details?.provider;
    this.paymentMethod = details?.method;
  }
}

/**
 * External service error
 */
export class ExternalServiceError extends AppError {
  public readonly service: string;
  public readonly originalError?: any;

  constructor(
    service: string,
    message: string,
    originalError?: any,
    code: string = 'EXTERNAL_SERVICE_ERROR'
  ) {
    super(message, code, 503, true, { service, originalError });
    this.service = service;
    this.originalError = originalError;
  }
}

/**
 * Database error
 */
export class DatabaseError extends AppError {
  public readonly operation?: string;
  public readonly collection?: string;

  constructor(
    message: string,
    operation?: string,
    collection?: string,
    code: string = 'DATABASE_ERROR'
  ) {
    super(message, code, 500, false, { operation, collection });
    this.operation = operation;
    this.collection = collection;
  }
}

/**
 * Business logic error
 */
export class BusinessError extends AppError {
  constructor(message: string, code: string = 'BUSINESS_ERROR', details?: any) {
    super(message, code, 400, true, details);
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends AppError {
  constructor(
    message: string,
    missingConfig?: string[],
    code: string = 'CONFIGURATION_ERROR'
  ) {
    super(message, code, 500, false, { missingConfig });
  }
}

/**
 * Feature not enabled error
 */
export class FeatureNotEnabledError extends AppError {
  public readonly feature: string;
  public readonly requiredPlan?: string;

  constructor(
    feature: string,
    requiredPlan?: string,
    code: string = 'FEATURE_NOT_ENABLED'
  ) {
    const message = requiredPlan
      ? `Feature '${feature}' requires ${requiredPlan} plan or higher`
      : `Feature '${feature}' is not enabled for this tenant`;
    
    super(message, code, 403, true, { feature, requiredPlan });
    this.feature = feature;
    this.requiredPlan = requiredPlan;
  }
}

/**
 * Error handler utility
 */
export class ErrorHandler {
  /**
   * Handle error and return appropriate response
   */
  static handle(error: unknown): {
    message: string;
    code: string;
    statusCode: number;
    details?: any;
  } {
    // Handle known AppError instances
    if (error instanceof AppError) {
      return {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
      };
    }

    // Handle Firebase errors
    if (error && typeof error === 'object' && 'code' in error) {
      const firebaseError = error as { code: string; message?: string };
      return this.handleFirebaseError(firebaseError);
    }

    // Handle generic errors
    if (error instanceof Error) {
      return {
        message: error.message,
        code: 'INTERNAL_ERROR',
        statusCode: 500,
      };
    }

    // Handle unknown errors
    return {
      message: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      statusCode: 500,
    };
  }

  /**
   * Handle Firebase-specific errors
   */
  private static handleFirebaseError(error: { code: string; message?: string }) {
    const errorMappings: Record<string, { message: string; statusCode: number }> = {
      // Auth errors
      'auth/email-already-in-use': {
        message: 'Diese E-Mail-Adresse wird bereits verwendet',
        statusCode: 409,
      },
      'auth/invalid-email': {
        message: 'Ungültige E-Mail-Adresse',
        statusCode: 400,
      },
      'auth/operation-not-allowed': {
        message: 'Diese Operation ist nicht erlaubt',
        statusCode: 403,
      },
      'auth/weak-password': {
        message: 'Das Passwort ist zu schwach',
        statusCode: 400,
      },
      'auth/user-disabled': {
        message: 'Dieses Konto wurde deaktiviert',
        statusCode: 403,
      },
      'auth/user-not-found': {
        message: 'Benutzer nicht gefunden',
        statusCode: 404,
      },
      'auth/wrong-password': {
        message: 'Falsches Passwort',
        statusCode: 401,
      },
      'auth/too-many-requests': {
        message: 'Zu viele fehlgeschlagene Anmeldeversuche. Bitte versuchen Sie es später erneut',
        statusCode: 429,
      },
      'auth/requires-recent-login': {
        message: 'Diese Operation erfordert eine erneute Anmeldung',
        statusCode: 401,
      },
      
      // Firestore errors
      'permission-denied': {
        message: 'Keine Berechtigung für diese Operation',
        statusCode: 403,
      },
      'not-found': {
        message: 'Dokument nicht gefunden',
        statusCode: 404,
      },
      'already-exists': {
        message: 'Dokument existiert bereits',
        statusCode: 409,
      },
      'resource-exhausted': {
        message: 'Quota überschritten',
        statusCode: 429,
      },
      'failed-precondition': {
        message: 'Vorbedingung nicht erfüllt',
        statusCode: 412,
      },
      'aborted': {
        message: 'Operation abgebrochen',
        statusCode: 409,
      },
      'out-of-range': {
        message: 'Wert ausserhalb des gültigen Bereichs',
        statusCode: 400,
      },
      'unimplemented': {
        message: 'Operation nicht implementiert',
        statusCode: 501,
      },
      'internal': {
        message: 'Interner Fehler',
        statusCode: 500,
      },
      'unavailable': {
        message: 'Service vorübergehend nicht verfügbar',
        statusCode: 503,
      },
      'data-loss': {
        message: 'Datenverlust oder -beschädigung',
        statusCode: 500,
      },
      'unauthenticated': {
        message: 'Nicht authentifiziert',
        statusCode: 401,
      },
    };

    const mapping = errorMappings[error.code];
    
    return {
      message: mapping?.message || error.message || 'Ein Fehler ist aufgetreten',
      code: error.code,
      statusCode: mapping?.statusCode || 500,
    };
  }

  /**
   * Check if error is operational (safe to expose to client)
   */
  static isOperational(error: unknown): boolean {
    if (error instanceof AppError) {
      return error.isOperational;
    }
    return false;
  }

  /**
   * Log error appropriately
   */
  static log(error: unknown, context?: any): void {
    if (error instanceof AppError) {
      if (error.isOperational) {
        console.warn('Operational error:', {
          ...error.toJSON(),
          context,
        });
      } else {
        console.error('System error:', {
          ...error.toJSON(),
          context,
        });
      }
    } else {
      console.error('Unknown error:', {
        error,
        context,
      });
    }
  }

  /**
   * Create user-friendly error message
   */
  static getUserMessage(error: unknown, locale: string = 'de'): string {
    const messages: Record<string, Record<string, string>> = {
      de: {
        NETWORK_ERROR: 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.',
        SERVER_ERROR: 'Serverfehler. Bitte versuchen Sie es später erneut.',
        VALIDATION_ERROR: 'Bitte überprüfen Sie Ihre Eingaben.',
        AUTH_ERROR: 'Anmeldefehler. Bitte melden Sie sich erneut an.',
        PERMISSION_ERROR: 'Sie haben keine Berechtigung für diese Aktion.',
        NOT_FOUND: 'Die angeforderte Ressource wurde nicht gefunden.',
        TIMEOUT: 'Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es erneut.',
        DEFAULT: 'Ein unerwarteter Fehler ist aufgetreten.',
      },
      fr: {
        NETWORK_ERROR: 'Erreur réseau. Veuillez vérifier votre connexion Internet.',
        SERVER_ERROR: 'Erreur serveur. Veuillez réessayer plus tard.',
        VALIDATION_ERROR: 'Veuillez vérifier vos entrées.',
        AUTH_ERROR: 'Erreur de connexion. Veuillez vous reconnecter.',
        PERMISSION_ERROR: "Vous n'avez pas l'autorisation pour cette action.",
        NOT_FOUND: 'La ressource demandée est introuvable.',
        TIMEOUT: 'La demande a pris trop de temps. Veuillez réessayer.',
        DEFAULT: 'Une erreur inattendue s\'est produite.',
      },
      it: {
        NETWORK_ERROR: 'Errore di rete. Controlla la tua connessione Internet.',
        SERVER_ERROR: 'Errore del server. Riprova più tardi.',
        VALIDATION_ERROR: 'Controlla i tuoi dati.',
        AUTH_ERROR: 'Errore di accesso. Effettua nuovamente l\'accesso.',
        PERMISSION_ERROR: 'Non hai l\'autorizzazione per questa azione.',
        NOT_FOUND: 'La risorsa richiesta non è stata trovata.',
        TIMEOUT: 'La richiesta ha richiesto troppo tempo. Riprova.',
        DEFAULT: 'Si è verificato un errore imprevisto.',
      },
      en: {
        NETWORK_ERROR: 'Network error. Please check your internet connection.',
        SERVER_ERROR: 'Server error. Please try again later.',
        VALIDATION_ERROR: 'Please check your input.',
        AUTH_ERROR: 'Authentication error. Please sign in again.',
        PERMISSION_ERROR: 'You don\'t have permission for this action.',
        NOT_FOUND: 'The requested resource was not found.',
        TIMEOUT: 'The request took too long. Please try again.',
        DEFAULT: 'An unexpected error occurred.',
      },
    };

    const langMessages = messages[locale] || messages.de;

    if (error instanceof AppError) {
      // Map error codes to message keys
      const codeMap: Record<string, string> = {
        'NETWORK_ERROR': 'NETWORK_ERROR',
        'INTERNAL_ERROR': 'SERVER_ERROR',
        'VALIDATION_ERROR': 'VALIDATION_ERROR',
        'AUTH_ERROR': 'AUTH_ERROR',
        'AUTHORIZATION_ERROR': 'PERMISSION_ERROR',
        'NOT_FOUND': 'NOT_FOUND',
        'TIMEOUT': 'TIMEOUT',
      };

      const messageKey = codeMap[error.code] || 'DEFAULT';
      return langMessages[messageKey];
    }

    return langMessages.DEFAULT;
  }
}

/**
 * Async error wrapper for Express routes
 */
export function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
    onRetry?: (error: any, attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    onRetry,
  } = options;

  let lastError: any;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }

      if (onRetry) {
        onRetry(error, attempt);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * factor, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Circuit breaker pattern
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime: number | null = null;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000, // 1 minute
    private readonly resetTimeout: number = 30000 // 30 seconds
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - (this.lastFailureTime || 0) > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new AppError(
          'Circuit breaker is open',
          'CIRCUIT_BREAKER_OPEN',
          503
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.state = 'closed';
    }
    this.failures = 0;
    this.lastFailureTime = null;
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.failures = 0;
    this.lastFailureTime = null;
    this.state = 'closed';
  }
}
