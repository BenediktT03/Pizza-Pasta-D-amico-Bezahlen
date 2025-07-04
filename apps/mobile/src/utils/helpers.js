/**
 * EATECH Mobile App - Helper Functions
 * Version: 25.0.0
 * Description: Utility Functions für die EATECH Admin App
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/mobile/src/utils/helpers.js
 */

// ============================================================================
// UUID GENERATION
// ============================================================================
export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// ============================================================================
// HASH FUNCTIONS
// ============================================================================
export const hashObject = (obj) => {
  const str = JSON.stringify(obj);
  let hash = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return hash.toString(16);
};

// ============================================================================
// DATE FORMATTING
// ============================================================================
export const formatDate = (date, format = 'DD.MM.YYYY') => {
  const d = new Date(date);
  
  const pad = (num) => num.toString().padStart(2, '0');
  
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  
  return format
    .replace('DD', day)
    .replace('MM', month)
    .replace('YYYY', year)
    .replace('HH', hours)
    .replace('mm', minutes);
};

export const formatCurrency = (amount, currency = 'CHF') => {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency,
  }).format(amount);
};

export const formatRelativeTime = (date) => {
  const now = new Date();
  const then = new Date(date);
  const diff = now - then;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Gerade eben';
  if (minutes < 60) return `vor ${minutes} Minute${minutes > 1 ? 'n' : ''}`;
  if (hours < 24) return `vor ${hours} Stunde${hours > 1 ? 'n' : ''}`;
  if (days < 7) return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
  
  return formatDate(date);
};

// ============================================================================
// VALIDATION
// ============================================================================
export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const validatePhone = (phone) => {
  const regex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{4,6}$/;
  return regex.test(phone);
};

// ============================================================================
// STRING HELPERS
// ============================================================================
export const truncate = (str, length = 50) => {
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
};

export const capitalizeFirst = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const slugify = (str) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// ============================================================================
// ARRAY HELPERS
// ============================================================================
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) result[group] = [];
    result[group].push(item);
    return result;
  }, {});
};

export const sortBy = (array, key, order = 'asc') => {
  return [...array].sort((a, b) => {
    if (order === 'asc') {
      return a[key] > b[key] ? 1 : -1;
    } else {
      return a[key] < b[key] ? 1 : -1;
    }
  });
};

// ============================================================================
// OBJECT HELPERS
// ============================================================================
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

export const debounce = (func, wait = 300) => {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const throttle = (func, limit = 300) => {
  let inThrottle;
  
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// ============================================================================
// STORAGE HELPERS
// ============================================================================
export const bytesToSize = (bytes) => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

// ============================================================================
// EXPORT
// ============================================================================
export default {
  generateUUID,
  hashObject,
  formatDate,
  formatCurrency,
  formatRelativeTime,
  validateEmail,
  validatePhone,
  truncate,
  capitalizeFirst,
  slugify,
  groupBy,
  sortBy,
  deepClone,
  debounce,
  throttle,
  bytesToSize,
};