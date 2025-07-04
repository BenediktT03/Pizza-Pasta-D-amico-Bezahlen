/**
 * EATECH - Validation Utilities
 * Version: 5.0.0
 * Description: Validierungs-Utilities für Formulare, Daten und
 *              Schweiz-spezifische Validierungen
 * Author: EATECH Development Team
 * Last Modified: 2025-01-04
 * File Path: /src/utils/validation.js
 */

// ============================================================================
// CONSTANTS
// ============================================================================

// Schweizer Postleitzahlen-Bereiche
const SWISS_PLZ_RANGES = {
    '1xxx': { min: 1000, max: 1999, region: 'Westschweiz' },
    '2xxx': { min: 2000, max: 2999, region: 'Jura/Neuenburg' },
    '3xxx': { min: 3000, max: 3999, region: 'Bern' },
    '4xxx': { min: 4000, max: 4999, region: 'Basel' },
    '5xxx': { min: 5000, max: 5999, region: 'Aargau' },
    '6xxx': { min: 6000, max: 6999, region: 'Zentralschweiz' },
    '7xxx': { min: 7000, max: 7999, region: 'Graubünden' },
    '8xxx': { min: 8000, max: 8999, region: 'Zürich' },
    '9xxx': { min: 9000, max: 9999, region: 'Ostschweiz' }
};

// Regex Patterns
const PATTERNS = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    swissPhone: /^(\+41|0041|0)?[1-9]\d{1,2}\d{3}\d{2}\d{2}$/,
    swissMobile: /^(\+41|0041|0)?7[5-9]\d{7}$/,
    swissPlz: /^[1-9]\d{3}$/,
    url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
    alphanumeric: /^[a-zA-Z0-9]+$/,
    letters: /^[a-zA-Z\s\-'äöüÄÖÜéèêàâôûçÇ]+$/,
    numbers: /^\d+$/,
    decimal: /^\d+(\.\d{1,2})?$/,
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    iban: /^CH\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{1}$/,
    uid: /^CHE-\d{3}\.\d{3}\.\d{3}$/
};

// ============================================================================
// GENERAL VALIDATION FUNCTIONS
// ============================================================================

/**
 * Überprüft ob ein Wert leer ist
 * @param {any} value - Zu prüfender Wert
 * @returns {boolean} true wenn leer
 */
export const isEmpty = (value) => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
};

/**
 * Validiert eine E-Mail-Adresse
 * @param {string} email - E-Mail-Adresse
 * @returns {Object} Validierungsergebnis
 */
export const validateEmail = (email) => {
    if (isEmpty(email)) {
        return { isValid: false, error: 'E-Mail ist erforderlich' };
    }
    
    if (!PATTERNS.email.test(email.toLowerCase())) {
        return { isValid: false, error: 'Ungültige E-Mail-Adresse' };
    }
    
    return { isValid: true, error: null };
};

/**
 * Validiert ein Passwort
 * @param {string} password - Passwort
 * @param {Object} options - Validierungsoptionen
 * @returns {Object} Validierungsergebnis
 */
export const validatePassword = (password, options = {}) => {
    const {
        minLength = 8,
        requireUppercase = true,
        requireLowercase = true,
        requireNumbers = true,
        requireSpecialChars = false
    } = options;
    
    if (isEmpty(password)) {
        return { isValid: false, error: 'Passwort ist erforderlich' };
    }
    
    if (password.length < minLength) {
        return { isValid: false, error: `Passwort muss mindestens ${minLength} Zeichen lang sein` };
    }
    
    if (requireUppercase && !/[A-Z]/.test(password)) {
        return { isValid: false, error: 'Passwort muss mindestens einen Großbuchstaben enthalten' };
    }
    
    if (requireLowercase && !/[a-z]/.test(password)) {
        return { isValid: false, error: 'Passwort muss mindestens einen Kleinbuchstaben enthalten' };
    }
    
    if (requireNumbers && !/\d/.test(password)) {
        return { isValid: false, error: 'Passwort muss mindestens eine Zahl enthalten' };
    }
    
    if (requireSpecialChars && !/[@$!%*?&]/.test(password)) {
        return { isValid: false, error: 'Passwort muss mindestens ein Sonderzeichen enthalten' };
    }
    
    return { isValid: true, error: null };
};

/**
 * Validiert ob zwei Passwörter übereinstimmen
 * @param {string} password - Passwort
 * @param {string} confirmPassword - Passwort-Bestätigung
 * @returns {Object} Validierungsergebnis
 */
export const validatePasswordMatch = (password, confirmPassword) => {
    if (password !== confirmPassword) {
        return { isValid: false, error: 'Passwörter stimmen nicht überein' };
    }
    
    return { isValid: true, error: null };
};

// ============================================================================
// SWISS-SPECIFIC VALIDATIONS
// ============================================================================

/**
 * Validiert eine Schweizer Telefonnummer
 * @param {string} phone - Telefonnummer
 * @returns {Object} Validierungsergebnis
 */
export const validateSwissPhone = (phone) => {
    if (isEmpty(phone)) {
        return { isValid: false, error: 'Telefonnummer ist erforderlich' };
    }
    
    // Entferne alle Leerzeichen und Bindestriche
    const cleaned = phone.replace(/[\s\-]/g, '');
    
    if (!PATTERNS.swissPhone.test(cleaned)) {
        return { isValid: false, error: 'Ungültige Schweizer Telefonnummer' };
    }
    
    // Prüfe ob es eine Mobilnummer ist
    const isMobile = PATTERNS.swissMobile.test(cleaned);
    
    return { 
        isValid: true, 
        error: null,
        isMobile,
        formatted: formatSwissPhone(cleaned)
    };
};

/**
 * Formatiert eine Schweizer Telefonnummer
 * @param {string} phone - Telefonnummer
 * @returns {string} Formatierte Nummer
 */
const formatSwissPhone = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('41')) {
        // +41 Format
        const number = cleaned.substring(2);
        return `+41 ${number.substring(0, 2)} ${number.substring(2, 5)} ${number.substring(5, 7)} ${number.substring(7)}`;
    } else if (cleaned.startsWith('0')) {
        // 0XX Format
        return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6, 8)} ${cleaned.substring(8)}`;
    }
    
    return phone;
};

/**
 * Validiert eine Schweizer Postleitzahl
 * @param {string|number} plz - Postleitzahl
 * @returns {Object} Validierungsergebnis
 */
export const validateSwissPlz = (plz) => {
    if (isEmpty(plz)) {
        return { isValid: false, error: 'Postleitzahl ist erforderlich' };
    }
    
    const cleaned = String(plz).trim();
    
    if (!PATTERNS.swissPlz.test(cleaned)) {
        return { isValid: false, error: 'Ungültige Schweizer Postleitzahl' };
    }
    
    const plzNumber = parseInt(cleaned);
    
    // Finde die Region
    let region = null;
    for (const [key, range] of Object.entries(SWISS_PLZ_RANGES)) {
        if (plzNumber >= range.min && plzNumber <= range.max) {
            region = range.region;
            break;
        }
    }
    
    return { 
        isValid: true, 
        error: null,
        region 
    };
};

/**
 * Validiert eine Schweizer IBAN
 * @param {string} iban - IBAN
 * @returns {Object} Validierungsergebnis
 */
export const validateSwissIban = (iban) => {
    if (isEmpty(iban)) {
        return { isValid: false, error: 'IBAN ist erforderlich' };
    }
    
    const cleaned = iban.replace(/\s/g, '').toUpperCase();
    
    if (!cleaned.startsWith('CH') || cleaned.length !== 21) {
        return { isValid: false, error: 'Ungültige Schweizer IBAN' };
    }
    
    // Prüfziffern-Validierung (modulo 97)
    const rearranged = cleaned.substring(4) + cleaned.substring(0, 4);
    const numeric = rearranged.replace(/[A-Z]/g, char => char.charCodeAt(0) - 55);
    const remainder = BigInt(numeric) % 97n;
    
    if (remainder !== 1n) {
        return { isValid: false, error: 'Ungültige IBAN-Prüfziffer' };
    }
    
    return { 
        isValid: true, 
        error: null,
        formatted: formatIban(cleaned)
    };
};

/**
 * Formatiert eine IBAN
 * @param {string} iban - IBAN
 * @returns {string} Formatierte IBAN
 */
const formatIban = (iban) => {
    const cleaned = iban.replace(/\s/g, '');
    return cleaned.match(/.{1,4}/g).join(' ');
};

/**
 * Validiert eine Schweizer UID-Nummer
 * @param {string} uid - UID-Nummer
 * @returns {Object} Validierungsergebnis
 */
export const validateSwissUid = (uid) => {
    if (isEmpty(uid)) {
        return { isValid: false, error: 'UID ist erforderlich' };
    }
    
    const cleaned = uid.toUpperCase().replace(/\s/g, '');
    
    if (!PATTERNS.uid.test(cleaned)) {
        return { isValid: false, error: 'Ungültige UID-Nummer (Format: CHE-123.456.789)' };
    }
    
    return { isValid: true, error: null };
};

// ============================================================================
// FORM VALIDATIONS
// ============================================================================

/**
 * Validiert einen Namen
 * @param {string} name - Name
 * @param {Object} options - Validierungsoptionen
 * @returns {Object} Validierungsergebnis
 */
export const validateName = (name, options = {}) => {
    const { 
        minLength = 2, 
        maxLength = 50,
        required = true 
    } = options;
    
    if (required && isEmpty(name)) {
        return { isValid: false, error: 'Name ist erforderlich' };
    }
    
    if (!required && isEmpty(name)) {
        return { isValid: true, error: null };
    }
    
    if (name.length < minLength) {
        return { isValid: false, error: `Name muss mindestens ${minLength} Zeichen lang sein` };
    }
    
    if (name.length > maxLength) {
        return { isValid: false, error: `Name darf maximal ${maxLength} Zeichen lang sein` };
    }
    
    if (!PATTERNS.letters.test(name)) {
        return { isValid: false, error: 'Name darf nur Buchstaben enthalten' };
    }
    
    return { isValid: true, error: null };
};

/**
 * Validiert eine URL
 * @param {string} url - URL
 * @returns {Object} Validierungsergebnis
 */
export const validateUrl = (url) => {
    if (isEmpty(url)) {
        return { isValid: false, error: 'URL ist erforderlich' };
    }
    
    if (!PATTERNS.url.test(url)) {
        return { isValid: false, error: 'Ungültige URL' };
    }
    
    return { isValid: true, error: null };
};

/**
 * Validiert eine Zahl
 * @param {any} value - Wert
 * @param {Object} options - Validierungsoptionen
 * @returns {Object} Validierungsergebnis
 */
export const validateNumber = (value, options = {}) => {
    const { 
        min = null, 
        max = null,
        integer = false,
        required = true 
    } = options;
    
    if (required && isEmpty(value)) {
        return { isValid: false, error: 'Wert ist erforderlich' };
    }
    
    if (!required && isEmpty(value)) {
        return { isValid: true, error: null };
    }
    
    const num = Number(value);
    
    if (isNaN(num)) {
        return { isValid: false, error: 'Ungültige Zahl' };
    }
    
    if (integer && !Number.isInteger(num)) {
        return { isValid: false, error: 'Nur ganze Zahlen erlaubt' };
    }
    
    if (min !== null && num < min) {
        return { isValid: false, error: `Wert muss mindestens ${min} sein` };
    }
    
    if (max !== null && num > max) {
        return { isValid: false, error: `Wert darf maximal ${max} sein` };
    }
    
    return { isValid: true, error: null };
};

/**
 * Validiert einen Preis
 * @param {any} value - Preis
 * @param {Object} options - Validierungsoptionen
 * @returns {Object} Validierungsergebnis
 */
export const validatePrice = (value, options = {}) => {
    const { 
        min = 0, 
        max = 999999.99,
        required = true 
    } = options;
    
    if (required && isEmpty(value)) {
        return { isValid: false, error: 'Preis ist erforderlich' };
    }
    
    if (!required && isEmpty(value)) {
        return { isValid: true, error: null };
    }
    
    if (!PATTERNS.decimal.test(String(value))) {
        return { isValid: false, error: 'Ungültiger Preis (Format: 00.00)' };
    }
    
    const num = Number(value);
    
    if (num < min) {
        return { isValid: false, error: `Preis muss mindestens CHF ${min} sein` };
    }
    
    if (num > max) {
        return { isValid: false, error: `Preis darf maximal CHF ${max} sein` };
    }
    
    return { isValid: true, error: null };
};

// ============================================================================
// DATE VALIDATIONS
// ============================================================================

/**
 * Validiert ein Datum
 * @param {any} value - Datum
 * @param {Object} options - Validierungsoptionen
 * @returns {Object} Validierungsergebnis
 */
export const validateDate = (value, options = {}) => {
    const { 
        minDate = null, 
        maxDate = null,
        required = true,
        futureOnly = false,
        pastOnly = false
    } = options;
    
    if (required && isEmpty(value)) {
        return { isValid: false, error: 'Datum ist erforderlich' };
    }
    
    if (!required && isEmpty(value)) {
        return { isValid: true, error: null };
    }
    
    const date = new Date(value);
    
    if (isNaN(date.getTime())) {
        return { isValid: false, error: 'Ungültiges Datum' };
    }
    
    const now = new Date();
    
    if (futureOnly && date <= now) {
        return { isValid: false, error: 'Datum muss in der Zukunft liegen' };
    }
    
    if (pastOnly && date >= now) {
        return { isValid: false, error: 'Datum muss in der Vergangenheit liegen' };
    }
    
    if (minDate && date < new Date(minDate)) {
        return { isValid: false, error: `Datum muss nach ${new Date(minDate).toLocaleDateString('de-CH')} sein` };
    }
    
    if (maxDate && date > new Date(maxDate)) {
        return { isValid: false, error: `Datum muss vor ${new Date(maxDate).toLocaleDateString('de-CH')} sein` };
    }
    
    return { isValid: true, error: null };
};

/**
 * Validiert ein Ablaufdatum (Kreditkarte, Produkt, etc.)
 * @param {string} month - Monat (MM)
 * @param {string} year - Jahr (YY oder YYYY)
 * @returns {Object} Validierungsergebnis
 */
export const validateExpiryDate = (month, year) => {
    if (isEmpty(month) || isEmpty(year)) {
        return { isValid: false, error: 'Ablaufdatum ist erforderlich' };
    }
    
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    const expMonth = parseInt(month);
    let expYear = parseInt(year);
    
    // Konvertiere 2-stelliges Jahr
    if (expYear < 100) {
        expYear += 2000;
    }
    
    if (expMonth < 1 || expMonth > 12) {
        return { isValid: false, error: 'Ungültiger Monat' };
    }
    
    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
        return { isValid: false, error: 'Karte ist abgelaufen' };
    }
    
    return { isValid: true, error: null };
};

// ============================================================================
// COMPLEX VALIDATIONS
// ============================================================================

/**
 * Validiert eine komplette Adresse
 * @param {Object} address - Adressobjekt
 * @returns {Object} Validierungsergebnis mit Feldfehlern
 */
export const validateAddress = (address) => {
    const errors = {};
    
    // Straße
    if (isEmpty(address.street)) {
        errors.street = 'Straße ist erforderlich';
    } else if (address.street.length < 3) {
        errors.street = 'Straße muss mindestens 3 Zeichen lang sein';
    }
    
    // Hausnummer
    if (isEmpty(address.houseNumber)) {
        errors.houseNumber = 'Hausnummer ist erforderlich';
    }
    
    // PLZ
    const plzValidation = validateSwissPlz(address.postalCode);
    if (!plzValidation.isValid) {
        errors.postalCode = plzValidation.error;
    }
    
    // Stadt
    if (isEmpty(address.city)) {
        errors.city = 'Stadt ist erforderlich';
    }
    
    // Land (optional, default Schweiz)
    if (address.country && address.country !== 'CH' && address.country !== 'Schweiz') {
        errors.country = 'Nur Schweizer Adressen werden unterstützt';
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

/**
 * Validiert Öffnungszeiten
 * @param {Object} hours - Öffnungszeiten-Objekt
 * @returns {Object} Validierungsergebnis
 */
export const validateBusinessHours = (hours) => {
    const errors = {};
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    days.forEach(day => {
        if (hours[day] && hours[day].isOpen) {
            const { openTime, closeTime } = hours[day];
            
            if (!openTime || !closeTime) {
                errors[day] = 'Öffnungs- und Schließzeit erforderlich';
            } else {
                const open = new Date(`2000-01-01 ${openTime}`);
                const close = new Date(`2000-01-01 ${closeTime}`);
                
                if (open >= close) {
                    errors[day] = 'Schließzeit muss nach Öffnungszeit sein';
                }
            }
        }
    });
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

// ============================================================================
// FORM VALIDATION HELPER
// ============================================================================

/**
 * Validiert ein komplettes Formular
 * @param {Object} values - Formularwerte
 * @param {Object} rules - Validierungsregeln
 * @returns {Object} Validierungsergebnis
 */
export const validateForm = (values, rules) => {
    const errors = {};
    
    Object.keys(rules).forEach(field => {
        const value = values[field];
        const fieldRules = rules[field];
        
        // Required
        if (fieldRules.required && isEmpty(value)) {
            errors[field] = fieldRules.message || `${field} ist erforderlich`;
            return;
        }
        
        // Custom validator
        if (fieldRules.validator) {
            const result = fieldRules.validator(value, values);
            if (result !== true) {
                errors[field] = result;
            }
        }
        
        // Pattern
        if (fieldRules.pattern && !fieldRules.pattern.test(value)) {
            errors[field] = fieldRules.message || `${field} hat ungültiges Format`;
        }
        
        // Min/Max length
        if (fieldRules.minLength && value.length < fieldRules.minLength) {
            errors[field] = `Mindestens ${fieldRules.minLength} Zeichen erforderlich`;
        }
        
        if (fieldRules.maxLength && value.length > fieldRules.maxLength) {
            errors[field] = `Maximal ${fieldRules.maxLength} Zeichen erlaubt`;
        }
    });
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

// ============================================================================
// EXPORT
// ============================================================================
export default {
    // General
    isEmpty,
    validateEmail,
    validatePassword,
    validatePasswordMatch,
    
    // Swiss specific
    validateSwissPhone,
    validateSwissPlz,
    validateSwissIban,
    validateSwissUid,
    
    // Form fields
    validateName,
    validateUrl,
    validateNumber,
    validatePrice,
    
    // Dates
    validateDate,
    validateExpiryDate,
    
    // Complex
    validateAddress,
    validateBusinessHours,
    validateForm,
    
    // Patterns (for custom use)
    PATTERNS,
    SWISS_PLZ_RANGES
};