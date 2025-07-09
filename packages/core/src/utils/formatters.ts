import { SwissCanton } from '../services/tenant/tenant.types';

/**
 * Format currency (Swiss Francs)
 */
export function formatCurrency(
  amount: number,
  options: {
    currency?: string;
    locale?: string;
    showSymbol?: boolean;
    decimals?: number;
  } = {}
): string {
  const {
    currency = 'CHF',
    locale = 'de-CH',
    showSymbol = true,
    decimals = 2,
  } = options;

  // Round to Swiss standard (0.05 CHF)
  const rounded = Math.round(amount * 20) / 20;

  if (!showSymbol) {
    return rounded.toFixed(decimals);
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(rounded);
}

/**
 * Format percentage
 */
export function formatPercentage(
  value: number,
  options: {
    decimals?: number;
    showSign?: boolean;
  } = {}
): string {
  const { decimals = 1, showSign = false } = options;
  const formatted = value.toFixed(decimals);
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${formatted}%`;
}

/**
 * Format date
 */
export function formatDate(
  date: Date | string | number,
  format: 'short' | 'medium' | 'long' | 'full' = 'medium',
  locale: string = 'de-CH'
): string {
  const dateObj = new Date(date);
  
  const options: Intl.DateTimeFormatOptions = {
    short: { day: '2-digit', month: '2-digit', year: 'numeric' },
    medium: { day: 'numeric', month: 'short', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  }[format];

  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

/**
 * Format time
 */
export function formatTime(
  date: Date | string | number,
  options: {
    format?: '12h' | '24h';
    showSeconds?: boolean;
    locale?: string;
  } = {}
): string {
  const {
    format = '24h',
    showSeconds = false,
    locale = 'de-CH',
  } = options;

  const dateObj = new Date(date);
  
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...(showSeconds && { second: '2-digit' }),
    ...(format === '12h' && { hour12: true }),
  };

  return new Intl.DateTimeFormat(locale, timeOptions).format(dateObj);
}

/**
 * Format date and time
 */
export function formatDateTime(
  date: Date | string | number,
  options: {
    dateFormat?: 'short' | 'medium' | 'long';
    timeFormat?: '12h' | '24h';
    showSeconds?: boolean;
    locale?: string;
  } = {}
): string {
  const {
    dateFormat = 'medium',
    timeFormat = '24h',
    showSeconds = false,
    locale = 'de-CH',
  } = options;

  const dateStr = formatDate(date, dateFormat, locale);
  const timeStr = formatTime(date, { format: timeFormat, showSeconds, locale });

  return `${dateStr}, ${timeStr}`;
}

/**
 * Format relative time
 */
export function formatRelativeTime(
  date: Date | string | number,
  locale: string = 'de-CH'
): string {
  const dateObj = new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  // Future dates
  if (diffInSeconds < 0) {
    const absDiff = Math.abs(diffInSeconds);
    if (absDiff < 60) return rtf.format(-absDiff, 'second');
    if (absDiff < 3600) return rtf.format(-Math.floor(absDiff / 60), 'minute');
    if (absDiff < 86400) return rtf.format(-Math.floor(absDiff / 3600), 'hour');
    if (absDiff < 604800) return rtf.format(-Math.floor(absDiff / 86400), 'day');
    if (absDiff < 2592000) return rtf.format(-Math.floor(absDiff / 604800), 'week');
    if (absDiff < 31536000) return rtf.format(-Math.floor(absDiff / 2592000), 'month');
    return rtf.format(-Math.floor(absDiff / 31536000), 'year');
  }

  // Past dates
  if (diffInSeconds < 60) return rtf.format(-diffInSeconds, 'second');
  if (diffInSeconds < 3600) return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
  if (diffInSeconds < 86400) return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
  if (diffInSeconds < 604800) return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
  if (diffInSeconds < 2592000) return rtf.format(-Math.floor(diffInSeconds / 604800), 'week');
  if (diffInSeconds < 31536000) return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
  return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
}

/**
 * Format phone number
 */
export function formatPhoneNumber(
  phone: string,
  options: {
    format?: 'local' | 'international';
    separator?: string;
  } = {}
): string {
  const { format = 'local', separator = ' ' } = options;
  const cleaned = phone.replace(/\D/g, '');

  // Swiss phone number formatting
  if (cleaned.startsWith('41')) {
    const number = cleaned.substring(2);
    if (format === 'international') {
      return `+41${separator}${number.slice(0, 2)}${separator}${number.slice(2, 5)}${separator}${number.slice(5, 7)}${separator}${number.slice(7)}`;
    }
    return `0${number.slice(0, 2)}${separator}${number.slice(2, 5)}${separator}${number.slice(5, 7)}${separator}${number.slice(7)}`;
  }

  if (cleaned.startsWith('0041')) {
    const number = cleaned.substring(4);
    if (format === 'international') {
      return `+41${separator}${number.slice(0, 2)}${separator}${number.slice(2, 5)}${separator}${number.slice(5, 7)}${separator}${number.slice(7)}`;
    }
    return `0${number.slice(0, 2)}${separator}${number.slice(2, 5)}${separator}${number.slice(5, 7)}${separator}${number.slice(7)}`;
  }

  // Local format
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}${separator}${cleaned.slice(3, 6)}${separator}${cleaned.slice(6, 8)}${separator}${cleaned.slice(8)}`;
  }

  return phone; // Return original if not recognized
}

/**
 * Format postal code
 */
export function formatPostalCode(postalCode: string): string {
  const cleaned = postalCode.replace(/\s/g, '');
  if (cleaned.length === 4 && /^\d{4}$/.test(cleaned)) {
    return cleaned;
  }
  return postalCode;
}

/**
 * Format canton name
 */
export function formatCantonName(canton: SwissCanton, locale: string = 'de'): string {
  const cantonNames: Record<string, Record<SwissCanton, string>> = {
    de: {
      [SwissCanton.AG]: 'Aargau',
      [SwissCanton.AI]: 'Appenzell Innerrhoden',
      [SwissCanton.AR]: 'Appenzell Ausserrhoden',
      [SwissCanton.BE]: 'Bern',
      [SwissCanton.BL]: 'Basel-Landschaft',
      [SwissCanton.BS]: 'Basel-Stadt',
      [SwissCanton.FR]: 'Freiburg',
      [SwissCanton.GE]: 'Genf',
      [SwissCanton.GL]: 'Glarus',
      [SwissCanton.GR]: 'Graubünden',
      [SwissCanton.JU]: 'Jura',
      [SwissCanton.LU]: 'Luzern',
      [SwissCanton.NE]: 'Neuenburg',
      [SwissCanton.NW]: 'Nidwalden',
      [SwissCanton.OW]: 'Obwalden',
      [SwissCanton.SG]: 'St. Gallen',
      [SwissCanton.SH]: 'Schaffhausen',
      [SwissCanton.SO]: 'Solothurn',
      [SwissCanton.SZ]: 'Schwyz',
      [SwissCanton.TG]: 'Thurgau',
      [SwissCanton.TI]: 'Tessin',
      [SwissCanton.UR]: 'Uri',
      [SwissCanton.VD]: 'Waadt',
      [SwissCanton.VS]: 'Wallis',
      [SwissCanton.ZG]: 'Zug',
      [SwissCanton.ZH]: 'Zürich',
    },
    fr: {
      [SwissCanton.AG]: 'Argovie',
      [SwissCanton.AI]: 'Appenzell Rhodes-Intérieures',
      [SwissCanton.AR]: 'Appenzell Rhodes-Extérieures',
      [SwissCanton.BE]: 'Berne',
      [SwissCanton.BL]: 'Bâle-Campagne',
      [SwissCanton.BS]: 'Bâle-Ville',
      [SwissCanton.FR]: 'Fribourg',
      [SwissCanton.GE]: 'Genève',
      [SwissCanton.GL]: 'Glaris',
      [SwissCanton.GR]: 'Grisons',
      [SwissCanton.JU]: 'Jura',
      [SwissCanton.LU]: 'Lucerne',
      [SwissCanton.NE]: 'Neuchâtel',
      [SwissCanton.NW]: 'Nidwald',
      [SwissCanton.OW]: 'Obwald',
      [SwissCanton.SG]: 'Saint-Gall',
      [SwissCanton.SH]: 'Schaffhouse',
      [SwissCanton.SO]: 'Soleure',
      [SwissCanton.SZ]: 'Schwyz',
      [SwissCanton.TG]: 'Thurgovie',
      [SwissCanton.TI]: 'Tessin',
      [SwissCanton.UR]: 'Uri',
      [SwissCanton.VD]: 'Vaud',
      [SwissCanton.VS]: 'Valais',
      [SwissCanton.ZG]: 'Zoug',
      [SwissCanton.ZH]: 'Zurich',
    },
    it: {
      [SwissCanton.AG]: 'Argovia',
      [SwissCanton.AI]: 'Appenzello Interno',
      [SwissCanton.AR]: 'Appenzello Esterno',
      [SwissCanton.BE]: 'Berna',
      [SwissCanton.BL]: 'Basilea Campagna',
      [SwissCanton.BS]: 'Basilea Città',
      [SwissCanton.FR]: 'Friburgo',
      [SwissCanton.GE]: 'Ginevra',
      [SwissCanton.GL]: 'Glarona',
      [SwissCanton.GR]: 'Grigioni',
      [SwissCanton.JU]: 'Giura',
      [SwissCanton.LU]: 'Lucerna',
      [SwissCanton.NE]: 'Neuchâtel',
      [SwissCanton.NW]: 'Nidvaldo',
      [SwissCanton.OW]: 'Obvaldo',
      [SwissCanton.SG]: 'San Gallo',
      [SwissCanton.SH]: 'Sciaffusa',
      [SwissCanton.SO]: 'Soletta',
      [SwissCanton.SZ]: 'Svitto',
      [SwissCanton.TG]: 'Turgovia',
      [SwissCanton.TI]: 'Ticino',
      [SwissCanton.UR]: 'Uri',
      [SwissCanton.VD]: 'Vaud',
      [SwissCanton.VS]: 'Vallese',
      [SwissCanton.ZG]: 'Zugo',
      [SwissCanton.ZH]: 'Zurigo',
    },
  };

  const langCode = locale.split('-')[0];
  return cantonNames[langCode]?.[canton] || canton;
}

/**
 * Format address
 */
export function formatAddress(address: {
  street: string;
  postalCode: string;
  city: string;
  canton?: SwissCanton;
  country?: string;
}): string {
  const parts = [
    address.street,
    `${formatPostalCode(address.postalCode)} ${address.city}`,
  ];

  if (address.canton) {
    parts.push(address.canton);
  }

  if (address.country && address.country !== 'CH') {
    parts.push(address.country);
  }

  return parts.filter(Boolean).join(', ');
}

/**
 * Format IBAN
 */
export function formatIBAN(iban: string): string {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  const groups = cleaned.match(/.{1,4}/g) || [];
  return groups.join(' ');
}

/**
 * Format order number
 */
export function formatOrderNumber(orderId: string, prefix: string = '#'): string {
  // Extract numeric part if exists
  const numeric = orderId.replace(/\D/g, '');
  if (numeric.length >= 4) {
    return `${prefix}${numeric.slice(-4)}`;
  }
  return `${prefix}${orderId.slice(-6)}`;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(size < 10 && unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

/**
 * Format duration
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return remainingSeconds > 0 
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours < 24) {
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  return remainingHours > 0
    ? `${days}d ${remainingHours}h`
    : `${days}d`;
}

/**
 * Format business hours
 */
export function formatBusinessHours(
  hours: { open: string; close: string; closed?: boolean },
  locale: string = 'de-CH'
): string {
  if (hours.closed) {
    return locale.startsWith('de') ? 'Geschlossen' : 
           locale.startsWith('fr') ? 'Fermé' :
           locale.startsWith('it') ? 'Chiuso' : 'Closed';
  }
  
  return `${hours.open} - ${hours.close}`;
}

/**
 * Format order status
 */
export function formatOrderStatus(
  status: string,
  locale: string = 'de-CH'
): string {
  const statusMap: Record<string, Record<string, string>> = {
    de: {
      pending: 'Ausstehend',
      confirmed: 'Bestätigt',
      preparing: 'In Zubereitung',
      ready: 'Bereit',
      delivering: 'In Lieferung',
      completed: 'Abgeschlossen',
      cancelled: 'Storniert',
    },
    fr: {
      pending: 'En attente',
      confirmed: 'Confirmé',
      preparing: 'En préparation',
      ready: 'Prêt',
      delivering: 'En livraison',
      completed: 'Terminé',
      cancelled: 'Annulé',
    },
    it: {
      pending: 'In attesa',
      confirmed: 'Confermato',
      preparing: 'In preparazione',
      ready: 'Pronto',
      delivering: 'In consegna',
      completed: 'Completato',
      cancelled: 'Annullato',
    },
    en: {
      pending: 'Pending',
      confirmed: 'Confirmed',
      preparing: 'Preparing',
      ready: 'Ready',
      delivering: 'Delivering',
      completed: 'Completed',
      cancelled: 'Cancelled',
    },
  };

  const langCode = locale.split('-')[0];
  return statusMap[langCode]?.[status] || status;
}

/**
 * Format quantity with unit
 */
export function formatQuantity(
  quantity: number,
  unit?: string,
  locale: string = 'de-CH'
): string {
  const formatted = new Intl.NumberFormat(locale).format(quantity);
  return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Format distance
 */
export function formatDistance(
  meters: number,
  options: {
    unit?: 'metric' | 'imperial';
    precision?: number;
  } = {}
): string {
  const { unit = 'metric', precision = 1 } = options;

  if (unit === 'metric') {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(precision)} km`;
  }

  // Imperial
  const feet = meters * 3.28084;
  if (feet < 5280) {
    return `${Math.round(feet)} ft`;
  }
  const miles = feet / 5280;
  return `${miles.toFixed(precision)} mi`;
}

/**
 * Format rating
 */
export function formatRating(
  rating: number,
  options: {
    showStars?: boolean;
    maxStars?: number;
  } = {}
): string {
  const { showStars = false, maxStars = 5 } = options;
  
  if (showStars) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5 ? 1 : 0;
    const emptyStars = maxStars - fullStars - halfStar;
    
    return '★'.repeat(fullStars) + 
           (halfStar ? '☆' : '') + 
           '☆'.repeat(emptyStars);
  }
  
  return rating.toFixed(1);
}

/**
 * Format list (with proper conjunctions)
 */
export function formatList(
  items: string[],
  options: {
    locale?: string;
    type?: 'conjunction' | 'disjunction';
  } = {}
): string {
  const { locale = 'de-CH', type = 'conjunction' } = options;
  
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  
  const formatter = new Intl.ListFormat(locale, { 
    style: 'long', 
    type 
  });
  
  return formatter.format(items);
}

/**
 * Truncate text
 */
export function truncateText(
  text: string,
  maxLength: number,
  options: {
    ellipsis?: string;
    breakWords?: boolean;
  } = {}
): string {
  const { ellipsis = '...', breakWords = false } = options;
  
  if (text.length <= maxLength) return text;
  
  const truncateLength = maxLength - ellipsis.length;
  
  if (breakWords) {
    return text.substring(0, truncateLength) + ellipsis;
  }
  
  // Find last space before truncate length
  const lastSpace = text.lastIndexOf(' ', truncateLength);
  if (lastSpace > 0) {
    return text.substring(0, lastSpace) + ellipsis;
  }
  
  return text.substring(0, truncateLength) + ellipsis;
}

/**
 * Format slug
 */
export function formatSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[äöü]/g, (match) => {
      const map: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue' };
      return map[match] || match;
    })
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Format initials
 */
export function formatInitials(name: string, maxChars: number = 2): string {
  const parts = name.trim().split(/\s+/);
  const initials = parts
    .map(part => part[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, maxChars)
    .join('');
  
  return initials;
}
