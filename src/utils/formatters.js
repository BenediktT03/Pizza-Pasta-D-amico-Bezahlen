/**
 * EATECH - Formatting Utilities
 * Version: 5.0.0
 * Description: Formatierungs-Utilities für Währung, Datum, Zeit und
 *              andere Schweiz-spezifische Formatierungen
 * Author: EATECH Development Team
 * Last Modified: 2025-01-04
 * File Path: /src/utils/formatters.js
 */

// ============================================================================
// IMPORTS
// ============================================================================
import { format, formatDistance, formatRelative, parseISO } from 'date-fns';
import { de, fr, it, enUS } from 'date-fns/locale';

// ============================================================================
// LOCALE CONFIGURATION
// ============================================================================
const locales = {
    'de-CH': de,
    'fr-CH': fr,
    'it-CH': it,
    'en-US': enUS
};

// Get current locale from localStorage or default
const getCurrentLocale = () => {
    return localStorage.getItem('locale') || 'de-CH';
};

// ============================================================================
// CURRENCY FORMATTING
// ============================================================================

/**
 * Formatiert einen Betrag in Schweizer Franken
 * @param {number} amount - Betrag
 * @param {Object} options - Formatierungsoptionen
 * @returns {string} Formatierter Betrag
 */
export const formatCurrency = (amount, options = {}) => {
    const {
        currency = 'CHF',
        locale = getCurrentLocale(),
        minimumFractionDigits = 2,
        maximumFractionDigits = 2,
        showCurrency = true
    } = options;
    
    if (amount === null || amount === undefined || isNaN(amount)) {
        return showCurrency ? 'CHF 0.00' : '0.00';
    }
    
    const formatter = new Intl.NumberFormat(locale, {
        style: showCurrency ? 'currency' : 'decimal',
        currency,
        minimumFractionDigits,
        maximumFractionDigits,
        currencyDisplay: 'code'
    });
    
    return formatter.format(amount);
};

/**
 * Formatiert einen Preis mit optionalem Rabatt
 * @param {number} price - Originalpreis
 * @param {number} discountPercent - Rabatt in Prozent
 * @returns {Object} Formatierte Preise
 */
export const formatPriceWithDiscount = (price, discountPercent = 0) => {
    const originalPrice = formatCurrency(price);
    
    if (discountPercent <= 0) {
        return {
            original: originalPrice,
            final: originalPrice,
            discount: null,
            saved: null
        };
    }
    
    const discountAmount = price * (discountPercent / 100);
    const finalPrice = price - discountAmount;
    
    return {
        original: originalPrice,
        final: formatCurrency(finalPrice),
        discount: `${discountPercent}%`,
        saved: formatCurrency(discountAmount)
    };
};

// ============================================================================
// DATE & TIME FORMATTING
// ============================================================================

/**
 * Formatiert ein Datum
 * @param {Date|string|number} date - Datum
 * @param {string} formatStr - Format-String (date-fns format)
 * @param {Object} options - Formatierungsoptionen
 * @returns {string} Formatiertes Datum
 */
export const formatDate = (date, formatStr = 'dd.MM.yyyy', options = {}) => {
    const { locale = getCurrentLocale() } = options;
    
    if (!date) return '';
    
    try {
        const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
        return format(dateObj, formatStr, { locale: locales[locale] });
    } catch (error) {
        console.error('Date formatting error:', error);
        return '';
    }
};

/**
 * Formatiert eine Uhrzeit
 * @param {Date|string|number} date - Datum/Zeit
 * @param {Object} options - Formatierungsoptionen
 * @returns {string} Formatierte Zeit
 */
export const formatTime = (date, options = {}) => {
    const { format24h = true, showSeconds = false } = options;
    const formatStr = format24h 
        ? (showSeconds ? 'HH:mm:ss' : 'HH:mm')
        : (showSeconds ? 'hh:mm:ss a' : 'hh:mm a');
    
    return formatDate(date, formatStr, options);
};

/**
 * Formatiert Datum und Zeit
 * @param {Date|string|number} date - Datum/Zeit
 * @param {Object} options - Formatierungsoptionen
 * @returns {string} Formatiertes Datum und Zeit
 */
export const formatDateTime = (date, options = {}) => {
    const { 
        dateFormat = 'dd.MM.yyyy',
        timeFormat = 'HH:mm',
        separator = ', '
    } = options;
    
    return formatDate(date, `${dateFormat}'${separator}'${timeFormat}`, options);
};

/**
 * Formatiert relative Zeit (z.B. "vor 5 Minuten")
 * @param {Date|string|number} date - Datum
 * @param {Object} options - Formatierungsoptionen
 * @returns {string} Relative Zeit
 */
export const formatRelativeTime = (date, options = {}) => {
    const { locale = getCurrentLocale(), baseDate = new Date() } = options;
    
    if (!date) return '';
    
    try {
        const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
        return formatDistance(dateObj, baseDate, { 
            addSuffix: true,
            locale: locales[locale]
        });
    } catch (error) {
        console.error('Relative time formatting error:', error);
        return '';
    }
};

/**
 * Formatiert Wartezeit in Minuten
 * @param {number} minutes - Wartezeit in Minuten
 * @returns {string} Formatierte Wartezeit
 */
export const formatWaitTime = (minutes) => {
    if (!minutes || minutes < 1) return 'Sofort';
    
    if (minutes < 60) {
        return `${minutes} Min.`;
    }
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (mins === 0) {
        return hours === 1 ? '1 Stunde' : `${hours} Stunden`;
    }
    
    return `${hours} Std. ${mins} Min.`;
};

// ============================================================================
// NUMBER FORMATTING
// ============================================================================

/**
 * Formatiert eine Zahl
 * @param {number} value - Zahl
 * @param {Object} options - Formatierungsoptionen
 * @returns {string} Formatierte Zahl
 */
export const formatNumber = (value, options = {}) => {
    const {
        locale = getCurrentLocale(),
        minimumFractionDigits = 0,
        maximumFractionDigits = 2,
        notation = 'standard'
    } = options;
    
    if (value === null || value === undefined || isNaN(value)) {
        return '0';
    }
    
    const formatter = new Intl.NumberFormat(locale, {
        minimumFractionDigits,
        maximumFractionDigits,
        notation
    });
    
    return formatter.format(value);
};

/**
 * Formatiert eine Prozentzahl
 * @param {number} value - Wert (0-1 oder 0-100)
 * @param {Object} options - Formatierungsoptionen
 * @returns {string} Formatierte Prozentzahl
 */
export const formatPercent = (value, options = {}) => {
    const {
        locale = getCurrentLocale(),
        minimumFractionDigits = 0,
        maximumFractionDigits = 1,
        isDecimal = true // true wenn value zwischen 0-1, false wenn 0-100
    } = options;
    
    const percentValue = isDecimal ? value : value / 100;
    
    const formatter = new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits,
        maximumFractionDigits
    });
    
    return formatter.format(percentValue);
};

/**
 * Formatiert eine Menge mit Einheit
 * @param {number} quantity - Menge
 * @param {string} unit - Einheit
 * @param {Object} options - Formatierungsoptionen
 * @returns {string} Formatierte Menge
 */
export const formatQuantity = (quantity, unit, options = {}) => {
    const { locale = getCurrentLocale() } = options;
    
    const formattedNumber = formatNumber(quantity, options);
    
    // Pluralisierung für deutsche Einheiten
    if (locale.startsWith('de') && quantity !== 1) {
        const pluralUnits = {
            'Stück': 'Stück', // Gleich bleibend
            'Liter': 'Liter',
            'Kilogramm': 'Kilogramm',
            'Gramm': 'Gramm',
            'Portion': 'Portionen',
            'Flasche': 'Flaschen',
            'Dose': 'Dosen',
            'Packung': 'Packungen'
        };
        
        unit = pluralUnits[unit] || unit;
    }
    
    return `${formattedNumber} ${unit}`;
};

// ============================================================================
// STRING FORMATTING
// ============================================================================

/**
 * Formatiert eine Telefonnummer (Schweizer Format)
 * @param {string} phone - Telefonnummer
 * @returns {string} Formatierte Telefonnummer
 */
export const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    
    // Entferne alle Nicht-Ziffern
    const cleaned = phone.replace(/\D/g, '');
    
    // Schweizer Mobilnummer (07X XXX XX XX)
    if (cleaned.startsWith('41')) {
        // +41 Format
        const number = cleaned.substring(2);
        if (number.length === 9) {
            return `+41 ${number.substring(0, 2)} ${number.substring(2, 5)} ${number.substring(5, 7)} ${number.substring(7)}`;
        }
    } else if (cleaned.startsWith('07') && cleaned.length === 10) {
        return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6, 8)} ${cleaned.substring(8)}`;
    }
    
    // Fallback
    return phone;
};

/**
 * Formatiert eine Postleitzahl (Schweizer Format)
 * @param {string|number} plz - Postleitzahl
 * @returns {string} Formatierte PLZ
 */
export const formatPostalCode = (plz) => {
    if (!plz) return '';
    
    const cleaned = String(plz).replace(/\D/g, '');
    
    // Schweizer PLZ sind 4-stellig
    if (cleaned.length === 4) {
        return cleaned;
    }
    
    return plz;
};

/**
 * Formatiert einen Namen (Erste Buchstaben groß)
 * @param {string} name - Name
 * @returns {string} Formatierter Name
 */
export const formatName = (name) => {
    if (!name) return '';
    
    return name
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

/**
 * Truncates text with ellipsis
 * @param {string} text - Text
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix (default: '...')
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength, suffix = '...') => {
    if (!text || text.length <= maxLength) return text;
    
    return text.substring(0, maxLength - suffix.length) + suffix;
};

// ============================================================================
// ORDER FORMATTING
// ============================================================================

/**
 * Formatiert eine Bestellnummer
 * @param {string|number} orderNumber - Bestellnummer
 * @returns {string} Formatierte Bestellnummer
 */
export const formatOrderNumber = (orderNumber) => {
    if (!orderNumber) return '';
    
    const str = String(orderNumber);
    
    // 6-stellige Nummer: XX-XXXX
    if (str.length === 6) {
        return `${str.substring(0, 2)}-${str.substring(2)}`;
    }
    
    return str;
};

/**
 * Formatiert einen Bestellstatus
 * @param {string} status - Status-Code
 * @param {Object} options - Formatierungsoptionen
 * @returns {string} Formatierter Status
 */
export const formatOrderStatus = (status, options = {}) => {
    const { locale = getCurrentLocale() } = options;
    
    const statusTranslations = {
        'de-CH': {
            'pending': 'Ausstehend',
            'confirmed': 'Bestätigt',
            'preparing': 'In Zubereitung',
            'ready': 'Bereit',
            'delivered': 'Geliefert',
            'cancelled': 'Storniert',
            'refunded': 'Erstattet'
        },
        'fr-CH': {
            'pending': 'En attente',
            'confirmed': 'Confirmé',
            'preparing': 'En préparation',
            'ready': 'Prêt',
            'delivered': 'Livré',
            'cancelled': 'Annulé',
            'refunded': 'Remboursé'
        },
        'it-CH': {
            'pending': 'In attesa',
            'confirmed': 'Confermato',
            'preparing': 'In preparazione',
            'ready': 'Pronto',
            'delivered': 'Consegnato',
            'cancelled': 'Annullato',
            'refunded': 'Rimborsato'
        }
    };
    
    const translations = statusTranslations[locale] || statusTranslations['de-CH'];
    return translations[status] || status;
};

// ============================================================================
// FILE SIZE FORMATTING
// ============================================================================

/**
 * Formatiert eine Dateigröße
 * @param {number} bytes - Größe in Bytes
 * @param {number} decimals - Anzahl Dezimalstellen
 * @returns {string} Formatierte Größe
 */
export const formatFileSize = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// ============================================================================
// EXPORT ALL
// ============================================================================
export default {
    formatCurrency,
    formatPriceWithDiscount,
    formatDate,
    formatTime,
    formatDateTime,
    formatRelativeTime,
    formatWaitTime,
    formatNumber,
    formatPercent,
    formatQuantity,
    formatPhoneNumber,
    formatPostalCode,
    formatName,
    truncateText,
    formatOrderNumber,
    formatOrderStatus,
    formatFileSize
};