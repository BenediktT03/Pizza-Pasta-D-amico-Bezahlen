import { z } from 'zod';

// Locale configuration schema
export const localesConfigSchema = z.object({
  // Default locale
  defaultLocale: z.enum(['de', 'fr', 'it', 'en']).default('de'),
  
  // Fallback locale
  fallbackLocale: z.enum(['de', 'fr', 'it', 'en']).default('en'),
  
  // Available locales
  availableLocales: z.array(z.object({
    code: z.enum(['de', 'fr', 'it', 'en']),
    name: z.string(),
    nativeName: z.string(),
    flag: z.string(),
    dateFormat: z.string(),
    timeFormat: z.string(),
    currency: z.string(),
    region: z.string(),
    enabled: z.boolean().default(true)
  })).default([]),
  
  // Regional variations
  regionalVariations: z.object({
    'de-CH': z.object({
      enabled: z.boolean().default(true),
      name: z.string().default('Schweizerdeutsch'),
      parent: z.literal('de').default('de'),
      overrides: z.record(z.string()).default({})
    }).default({}),
    'fr-CH': z.object({
      enabled: z.boolean().default(true),
      name: z.string().default('Français (Suisse)'),
      parent: z.literal('fr').default('fr'),
      overrides: z.record(z.string()).default({})
    }).default({}),
    'it-CH': z.object({
      enabled: z.boolean().default(true),
      name: z.string().default('Italiano (Svizzera)'),
      parent: z.literal('it').default('it'),
      overrides: z.record(z.string()).default({})
    }).default({})
  }).default({}),
  
  // Translation settings
  translation: z.object({
    // Translation service
    service: z.enum(['none', 'google', 'deepl', 'custom']).default('none'),
    apiKey: z.string().optional(),
    
    // Auto-translation
    autoTranslate: z.boolean().default(false),
    autoDetect: z.boolean().default(true),
    
    // Translation cache
    cache: z.object({
      enabled: z.boolean().default(true),
      ttl: z.number().default(86400), // 24 hours
      maxSize: z.number().default(1000)
    }).default({}),
    
    // Missing translations
    missingKeyHandling: z.enum(['fallback', 'key', 'empty', 'error']).default('fallback'),
    logMissingKeys: z.boolean().default(true)
  }).default({}),
  
  // Number formats
  numberFormats: z.object({
    de: z.object({
      decimal: z.string().default(','),
      thousand: z.string().default("'"),
      precision: z.number().default(2),
      grouping: z.boolean().default(true)
    }).default({}),
    fr: z.object({
      decimal: z.string().default(','),
      thousand: z.string().default(' '),
      precision: z.number().default(2),
      grouping: z.boolean().default(true)
    }).default({}),
    it: z.object({
      decimal: z.string().default(','),
      thousand: z.string().default('.'),
      precision: z.number().default(2),
      grouping: z.boolean().default(true)
    }).default({}),
    en: z.object({
      decimal: z.string().default('.'),
      thousand: z.string().default(','),
      precision: z.number().default(2),
      grouping: z.boolean().default(true)
    }).default({})
  }).default({}),
  
  // Date/time formats
  dateTimeFormats: z.object({
    de: z.object({
      short: z.string().default('dd.MM.yyyy'),
      medium: z.string().default('d. MMM yyyy'),
      long: z.string().default('d. MMMM yyyy'),
      full: z.string().default('EEEE, d. MMMM yyyy'),
      time: z.string().default('HH:mm'),
      datetime: z.string().default('dd.MM.yyyy HH:mm'),
      weekStart: z.number().default(1) // Monday
    }).default({}),
    fr: z.object({
      short: z.string().default('dd/MM/yyyy'),
      medium: z.string().default('d MMM yyyy'),
      long: z.string().default('d MMMM yyyy'),
      full: z.string().default('EEEE d MMMM yyyy'),
      time: z.string().default('HH:mm'),
      datetime: z.string().default('dd/MM/yyyy HH:mm'),
      weekStart: z.number().default(1)
    }).default({}),
    it: z.object({
      short: z.string().default('dd/MM/yyyy'),
      medium: z.string().default('d MMM yyyy'),
      long: z.string().default('d MMMM yyyy'),
      full: z.string().default('EEEE d MMMM yyyy'),
      time: z.string().default('HH:mm'),
      datetime: z.string().default('dd/MM/yyyy HH:mm'),
      weekStart: z.number().default(1)
    }).default({}),
    en: z.object({
      short: z.string().default('MM/dd/yyyy'),
      medium: z.string().default('MMM d, yyyy'),
      long: z.string().default('MMMM d, yyyy'),
      full: z.string().default('EEEE, MMMM d, yyyy'),
      time: z.string().default('h:mm a'),
      datetime: z.string().default('MM/dd/yyyy h:mm a'),
      weekStart: z.number().default(0) // Sunday
    }).default({})
  }).default({}),
  
  // Currency formats
  currencyFormats: z.object({
    de: z.object({
      symbol: z.string().default('CHF'),
      position: z.enum(['before', 'after']).default('before'),
      spacing: z.boolean().default(true),
      decimal: z.string().default(','),
      thousand: z.string().default("'")
    }).default({}),
    fr: z.object({
      symbol: z.string().default('CHF'),
      position: z.enum(['before', 'after']).default('after'),
      spacing: z.boolean().default(true),
      decimal: z.string().default(','),
      thousand: z.string().default(' ')
    }).default({}),
    it: z.object({
      symbol: z.string().default('CHF'),
      position: z.enum(['before', 'after']).default('after'),
      spacing: z.boolean().default(true),
      decimal: z.string().default(','),
      thousand: z.string().default('.')
    }).default({}),
    en: z.object({
      symbol: z.string().default('CHF'),
      position: z.enum(['before', 'after']).default('before'),
      spacing: z.boolean().default(true),
      decimal: z.string().default('.'),
      thousand: z.string().default(',')
    }).default({})
  }).default({}),
  
  // Messages and UI text
  messages: z.object({
    // Loading states
    loading: z.record(z.string()).default({
      de: 'Wird geladen...',
      fr: 'Chargement...',
      it: 'Caricamento...',
      en: 'Loading...'
    }),
    
    // Error messages
    errors: z.object({
      generic: z.record(z.string()).default({
        de: 'Ein Fehler ist aufgetreten',
        fr: 'Une erreur est survenue',
        it: 'Si è verificato un errore',
        en: 'An error occurred'
      }),
      network: z.record(z.string()).default({
        de: 'Netzwerkfehler. Bitte versuchen Sie es später erneut.',
        fr: 'Erreur réseau. Veuillez réessayer plus tard.',
        it: 'Errore di rete. Riprova più tardi.',
        en: 'Network error. Please try again later.'
      }),
      notFound: z.record(z.string()).default({
        de: 'Seite nicht gefunden',
        fr: 'Page non trouvée',
        it: 'Pagina non trovata',
        en: 'Page not found'
      })
    }).default({}),
    
    // Success messages
    success: z.object({
      saved: z.record(z.string()).default({
        de: 'Erfolgreich gespeichert',
        fr: 'Enregistré avec succès',
        it: 'Salvato con successo',
        en: 'Successfully saved'
      }),
      deleted: z.record(z.string()).default({
        de: 'Erfolgreich gelöscht',
        fr: 'Supprimé avec succès',
        it: 'Eliminato con successo',
        en: 'Successfully deleted'
      })
    }).default({}),
    
    // Common actions
    actions: z.object({
      save: z.record(z.string()).default({
        de: 'Speichern',
        fr: 'Enregistrer',
        it: 'Salva',
        en: 'Save'
      }),
      cancel: z.record(z.string()).default({
        de: 'Abbrechen',
        fr: 'Annuler',
        it: 'Annulla',
        en: 'Cancel'
      }),
      delete: z.record(z.string()).default({
        de: 'Löschen',
        fr: 'Supprimer',
        it: 'Elimina',
        en: 'Delete'
      }),
      edit: z.record(z.string()).default({
        de: 'Bearbeiten',
        fr: 'Modifier',
        it: 'Modifica',
        en: 'Edit'
      }),
      close: z.record(z.string()).default({
        de: 'Schliessen',
        fr: 'Fermer',
        it: 'Chiudi',
        en: 'Close'
      })
    }).default({})
  }).default({}),
  
  // SEO settings per locale
  seo: z.object({
    de: z.object({
      title: z.string().default('Eatech - Digitale Restaurantplattform'),
      description: z.string().default('Die führende digitale Restaurantplattform in der Schweiz'),
      keywords: z.array(z.string()).default(['restaurant', 'bestellen', 'digital', 'schweiz'])
    }).default({}),
    fr: z.object({
      title: z.string().default('Eatech - Plateforme de restaurant numérique'),
      description: z.string().default('La principale plateforme de restaurant numérique en Suisse'),
      keywords: z.array(z.string()).default(['restaurant', 'commander', 'numérique', 'suisse'])
    }).default({}),
    it: z.object({
      title: z.string().default('Eatech - Piattaforma ristorante digitale'),
      description: z.string().default('La principale piattaforma di ristorante digitale in Svizzera'),
      keywords: z.array(z.string()).default(['ristorante', 'ordinare', 'digitale', 'svizzera'])
    }).default({}),
    en: z.object({
      title: z.string().default('Eatech - Digital Restaurant Platform'),
      description: z.string().default('The leading digital restaurant platform in Switzerland'),
      keywords: z.array(z.string()).default(['restaurant', 'order', 'digital', 'switzerland'])
    }).default({})
  }).default({})
});

// Default locale configurations
export const defaultLocalesConfig = {
  defaultLocale: 'de' as const,
  fallbackLocale: 'en' as const,
  
  availableLocales: [
    {
      code: 'de' as const,
      name: 'German',
      nativeName: 'Deutsch',
      flag: '🇩🇪',
      dateFormat: 'dd.MM.yyyy',
      timeFormat: 'HH:mm',
      currency: 'CHF',
      region: 'CH-DE',
      enabled: true
    },
    {
      code: 'fr' as const,
      name: 'French',
      nativeName: 'Français',
      flag: '🇫🇷',
      dateFormat: 'dd/MM/yyyy',
      timeFormat: 'HH:mm',
      currency: 'CHF',
      region: 'CH-FR',
      enabled: true
    },
    {
      code: 'it' as const,
      name: 'Italian',
      nativeName: 'Italiano',
      flag: '🇮🇹',
      dateFormat: 'dd/MM/yyyy',
      timeFormat: 'HH:mm',
      currency: 'CHF',
      region: 'CH-IT',
      enabled: true
    },
    {
      code: 'en' as const,
      name: 'English',
      nativeName: 'English',
      flag: '🇬🇧',
      dateFormat: 'MM/dd/yyyy',
      timeFormat: 'h:mm a',
      currency: 'CHF',
      region: 'CH-EN',
      enabled: true
    }
  ],
  
  regionalVariations: {
    'de-CH': {
      enabled: true,
      name: 'Schweizerdeutsch',
      parent: 'de' as const,
      overrides: {
        'common.greeting': 'Grüezi',
        'common.goodbye': 'Uf Widerluege',
        'common.thanks': 'Merci vilmal',
        'food.potato': 'Herdöpfel',
        'food.carrot': 'Rüebli'
      }
    },
    'fr-CH': {
      enabled: true,
      name: 'Français (Suisse)',
      parent: 'fr' as const,
      overrides: {
        'numbers.seventy': 'septante',
        'numbers.eighty': 'huitante',
        'numbers.ninety': 'nonante'
      }
    },
    'it-CH': {
      enabled: true,
      name: 'Italiano (Svizzera)',
      parent: 'it' as const,
      overrides: {}
    }
  },
  
  translation: {
    service: 'none' as const,
    autoTranslate: false,
    autoDetect: true,
    cache: {
      enabled: true,
      ttl: 86400,
      maxSize: 1000
    },
    missingKeyHandling: 'fallback' as const,
    logMissingKeys: true
  }
};

// Get locales configuration
export const getLocalesConfig = () => {
  try {
    const config = {
      ...defaultLocalesConfig,
      // Add runtime overrides here
      translation: {
        ...defaultLocalesConfig.translation,
        service: process.env.VITE_TRANSLATION_SERVICE as any || 'none',
        apiKey: process.env.VITE_TRANSLATION_API_KEY
      }
    };
    
    return localesConfigSchema.parse(config);
  } catch (error) {
    console.error('Invalid locales configuration:', error);
    return defaultLocalesConfig;
  }
};

// Locale utilities
export const getAvailableLocales = (config = getLocalesConfig()) => {
  return config.availableLocales.filter(locale => locale.enabled);
};

export const getLocaleByCode = (code: string, config = getLocalesConfig()) => {
  return config.availableLocales.find(locale => locale.code === code);
};

export const isLocaleAvailable = (code: string, config = getLocalesConfig()) => {
  const locale = getLocaleByCode(code, config);
  return locale?.enabled || false;
};

export const getDefaultLocale = (config = getLocalesConfig()) => {
  return config.defaultLocale;
};

export const getFallbackLocale = (config = getLocalesConfig()) => {
  return config.fallbackLocale;
};

export const formatNumber = (
  value: number,
  locale: string,
  config = getLocalesConfig()
): string => {
  const format = config.numberFormats[locale as keyof typeof config.numberFormats];
  if (!format) return value.toString();
  
  const parts = value.toFixed(format.precision).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];
  
  if (format.grouping && format.thousand) {
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, format.thousand);
  }
  
  return decimalPart
    ? `${integerPart}${format.decimal}${decimalPart}`
    : integerPart;
};

export const formatCurrency = (
  value: number,
  locale: string,
  currency: string = 'CHF',
  config = getLocalesConfig()
): string => {
  const format = config.currencyFormats[locale as keyof typeof config.currencyFormats];
  if (!format) return `${currency} ${value.toFixed(2)}`;
  
  const formattedNumber = formatNumber(value, locale, config);
  const symbol = format.symbol || currency;
  const space = format.spacing ? ' ' : '';
  
  return format.position === 'before'
    ? `${symbol}${space}${formattedNumber}`
    : `${formattedNumber}${space}${symbol}`;
};

export const getMessage = (
  key: string,
  locale: string,
  config = getLocalesConfig()
): string => {
  const keys = key.split('.');
  let current: any = config.messages;
  
  for (const k of keys) {
    if (!current || typeof current !== 'object') break;
    current = current[k];
  }
  
  if (current && typeof current === 'object' && current[locale]) {
    return current[locale];
  }
  
  // Try fallback locale
  if (current && typeof current === 'object' && current[config.fallbackLocale]) {
    return current[config.fallbackLocale];
  }
  
  // Return key if nothing found
  return key;
};

// Export default configuration
export default getLocalesConfig();
