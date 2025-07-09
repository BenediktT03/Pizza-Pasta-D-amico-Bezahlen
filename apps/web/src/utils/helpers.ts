import { format, formatDistance, formatRelative, isToday, isYesterday, parseISO } from 'date-fns'
import { de, fr, it, enGB } from 'date-fns/locale'
import { CURRENCY_SYMBOL, DECIMAL_PLACES, VAT_RATE } from './constants'

// Locale mapping for date-fns
const localeMap = {
  de: de,
  fr: fr,
  it: it,
  en: enGB,
}

// Format currency
export const formatCurrency = (amount: number): string => {
  return `${CURRENCY_SYMBOL} ${amount.toFixed(DECIMAL_PLACES)}`
}

// Format price with proper Swiss formatting
export const formatPrice = (amount: number, locale = 'de-CH'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'CHF',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Calculate VAT
export const calculateVAT = (amount: number): number => {
  return amount * VAT_RATE
}

// Calculate total with VAT
export const calculateTotalWithVAT = (amount: number): number => {
  return amount + calculateVAT(amount)
}

// Format date with locale support
export const formatDate = (date: Date | string, formatStr = 'PP', locale = 'de'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, formatStr, { locale: localeMap[locale as keyof typeof localeMap] || de })
}

// Format relative time
export const formatRelativeTime = (date: Date | string, locale = 'de'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return formatDistance(dateObj, new Date(), { 
    addSuffix: true, 
    locale: localeMap[locale as keyof typeof localeMap] || de 
  })
}

// Format order time
export const formatOrderTime = (date: Date | string, locale = 'de'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  
  if (isToday(dateObj)) {
    return `Heute, ${format(dateObj, 'HH:mm')}`
  }
  
  if (isYesterday(dateObj)) {
    return `Gestern, ${format(dateObj, 'HH:mm')}`
  }
  
  return formatRelative(dateObj, new Date(), { 
    locale: localeMap[locale as keyof typeof localeMap] || de 
  })
}

// Format phone number (Swiss format)
export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '')
  
  // Swiss mobile number format: +41 79 123 45 67
  if (digits.startsWith('41')) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`
  }
  
  // Local format: 079 123 45 67
  if (digits.startsWith('0')) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`
  }
  
  return phone
}

// Validate email
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validate Swiss phone number
export const isValidSwissPhone = (phone: string): boolean => {
  const phoneRegex = /^(\+41|0041|0)?[1-9]\d{1,2}\s?\d{3}\s?\d{2}\s?\d{2}$/
  return phoneRegex.test(phone)
}

// Validate Swiss postal code
export const isValidSwissPostalCode = (code: string): boolean => {
  const postalCodeRegex = /^[1-9]\d{3}$/
  return postalCodeRegex.test(code)
}

// Generate order number
export const generateOrderNumber = (): string => {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
  return `${year}${month}${day}-${random}`
}

// Debounce function
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Throttle function
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Group array by key
export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((result, item) => {
    const group = String(item[key])
    if (!result[group]) result[group] = []
    result[group].push(item)
    return result
  }, {} as Record<string, T[]>)
}

// Sort array by key
export const sortBy = <T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] => {
  return [...array].sort((a, b) => {
    if (a[key] < b[key]) return order === 'asc' ? -1 : 1
    if (a[key] > b[key]) return order === 'asc' ? 1 : -1
    return 0
  })
}

// Capitalize first letter
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

// Truncate text
export const truncate = (str: string, maxLength: number, suffix = '...'): string => {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - suffix.length) + suffix
}

// Generate random ID
export const generateId = (prefix = ''): string => {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 9)
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`
}

// Deep clone object
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj))
}

// Check if object is empty
export const isEmpty = (obj: any): boolean => {
  if (obj == null) return true
  if (typeof obj === 'object') {
    return Object.keys(obj).length === 0
  }
  if (Array.isArray(obj)) {
    return obj.length === 0
  }
  return false
}

// Get initials from name
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2)
}

// Parse query parameters
export const parseQueryParams = (search: string): Record<string, string> => {
  const params = new URLSearchParams(search)
  const result: Record<string, string> = {}
  params.forEach((value, key) => {
    result[key] = value
  })
  return result
}

// Build query string
export const buildQueryString = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  })
  return searchParams.toString()
}

// Calculate distance between coordinates (Haversine formula)
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371 // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // Distance in km
}

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

// Check if device is mobile
export const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

// Check if PWA
export const isPWA = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-ignore
    window.navigator.standalone === true
}

// Get device type
export const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const width = window.innerWidth
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

// Copy to clipboard
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      const success = document.execCommand('copy')
      document.body.removeChild(textArea)
      return success
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}

// Vibrate device
export const vibrate = (pattern: number | number[] = 200): void => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    return false
  }
  
  if (Notification.permission === 'granted') {
    return true
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }
  
  return false
}

// Show notification
export const showNotification = (title: string, options?: NotificationOptions): void => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      ...options,
    })
  }
}

export default {
  formatCurrency,
  formatPrice,
  calculateVAT,
  calculateTotalWithVAT,
  formatDate,
  formatRelativeTime,
  formatOrderTime,
  formatPhoneNumber,
  isValidEmail,
  isValidSwissPhone,
  isValidSwissPostalCode,
  generateOrderNumber,
  debounce,
  throttle,
  groupBy,
  sortBy,
  capitalize,
  truncate,
  generateId,
  deepClone,
  isEmpty,
  getInitials,
  parseQueryParams,
  buildQueryString,
  calculateDistance,
  formatFileSize,
  isMobile,
  isPWA,
  getDeviceType,
  copyToClipboard,
  vibrate,
  requestNotificationPermission,
  showNotification,
}
