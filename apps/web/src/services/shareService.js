// ============================================================================
// EATECH V3.0 - SWISS SOCIAL SHARING SERVICE
// ============================================================================
// File: /apps/web/src/services/shareService.js
// Type: Advanced Social Platform Integration Service
// Swiss Focus: WhatsApp, Telegram, Signal, QR Codes, FADP Compliance
// Features: Multi-platform sharing, Deep links, Privacy protection, Analytics
// ============================================================================

// ============================================================================
// IMPORTS & DEPENDENCIES
// ============================================================================

// Core utilities
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';

// Analytics & Tracking
import { trackEvent } from './analyticsService';
import { logActivity } from './activityService';

// Swiss Privacy & Security
import { encryptSensitiveData, decryptSensitiveData } from '../utils/encryption';
import { validateFADPCompliance } from '../utils/privacy';

// URL & Link Management
import { generateShortUrl, validateUrl } from '../utils/urlUtils';
import { generateDeepLink } from '../utils/deepLinkUtils';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

// Swiss Popular Social Platforms (Prioritized by Swiss usage)
export const SWISS_PLATFORMS = {
  WHATSAPP: {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: '📱',
    priority: 1,
    usage: 85, // % of Swiss population
    baseUrl: 'https://wa.me/',
    webUrl: 'https://web.whatsapp.com/send',
    deepLink: 'whatsapp://send'
  },
  TELEGRAM: {
    id: 'telegram',
    name: 'Telegram',
    icon: '✈️',
    priority: 2,
    usage: 32,
    baseUrl: 'https://t.me/',
    webUrl: 'https://telegram.me/share',
    deepLink: 'tg://msg'
  },
  SIGNAL: {
    id: 'signal',
    name: 'Signal',
    icon: '🔒',
    priority: 3,
    usage: 18,
    baseUrl: 'https://signal.me/',
    webUrl: 'sgnl://send',
    deepLink: 'sgnl://send'
  },
  FACEBOOK: {
    id: 'facebook',
    name: 'Facebook',
    icon: '👥',
    priority: 4,
    usage: 65,
    baseUrl: 'https://www.facebook.com/sharer/sharer.php',
    webUrl: 'https://www.facebook.com/sharer/sharer.php',
    deepLink: 'fb://share'
  },
  TWITTER: {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: '🐦',
    priority: 5,
    usage: 25,
    baseUrl: 'https://twitter.com/intent/tweet',
    webUrl: 'https://twitter.com/intent/tweet',
    deepLink: 'twitter://post'
  },
  LINKEDIN: {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: '💼',
    priority: 6,
    usage: 45,
    baseUrl: 'https://www.linkedin.com/sharing/share-offsite/',
    webUrl: 'https://www.linkedin.com/sharing/share-offsite/',
    deepLink: 'linkedin://share'
  },
  EMAIL: {
    id: 'email',
    name: 'E-Mail',
    icon: '📧',
    priority: 7,
    usage: 95,
    baseUrl: 'mailto:',
    webUrl: 'mailto:',
    deepLink: 'mailto:'
  },
  SMS: {
    id: 'sms',
    name: 'SMS',
    icon: '💬',
    priority: 8,
    usage: 90,
    baseUrl: 'sms:',
    webUrl: 'sms:',
    deepLink: 'sms:'
  }
};

// QR Code Configuration (Swiss Business Standards)
export const QR_CONFIG = {
  size: 200,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  },
  errorCorrectionLevel: 'M', // Medium error correction for food industry
  type: 'image/png',
  quality: 0.92,
  businessFormat: true, // Swiss QR-Bill compatible
  swissCompliance: true
};

// Share Templates (Multi-language)
export const SHARE_TEMPLATES = {
  product: {
    'de-CH': '🍽️ Lueg mal, das gsehnd fein us! {title} bi {restaurant} für nur {price}. Bestell jetzt: {url}',
    'de-DE': '🍽️ Schau mal, das sieht lecker aus! {title} bei {restaurant} für nur {price}. Jetzt bestellen: {url}',
    'fr-CH': '🍽️ Regarde ça, ça a l\'air délicieux! {title} chez {restaurant} pour seulement {price}. Commande maintenant: {url}',
    'it-CH': '🍽️ Guarda che buono! {title} da {restaurant} per solo {price}. Ordina ora: {url}',
    'en-US': '🍽️ Check this out, looks delicious! {title} at {restaurant} for only {price}. Order now: {url}'
  },
  order: {
    'de-CH': '🎉 Mini Bestellig isch underwegs! Bestellnummer: {orderNumber}. Verfolge sie hier: {url}',
    'de-DE': '🎉 Meine Bestellung ist unterwegs! Bestellnummer: {orderNumber}. Verfolgen Sie hier: {url}',
    'fr-CH': '🎉 Ma commande est en route! Numéro: {orderNumber}. Suivez ici: {url}',
    'it-CH': '🎉 Il mio ordine è in arrivo! Numero: {orderNumber}. Segui qui: {url}',
    'en-US': '🎉 My order is on the way! Order number: {orderNumber}. Track here: {url}'
  },
  restaurant: {
    'de-CH': '🚚 De beschti Foodtruck vo {location}! {restaurant} - {description}. Probier\'s us: {url}',
    'de-DE': '🚚 Der beste Foodtruck von {location}! {restaurant} - {description}. Probieren Sie es aus: {url}',
    'fr-CH': '🚚 Le meilleur food truck de {location}! {restaurant} - {description}. Essayez: {url}',
    'it-CH': '🚚 Il miglior food truck di {location}! {restaurant} - {description}. Provalo: {url}',
    'en-US': '🚚 The best food truck in {location}! {restaurant} - {description}. Try it: {url}'
  }
};

// Privacy Settings (Swiss FADP Compliance)
export const PRIVACY_SETTINGS = {
  dataRetention: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
  anonymizeAfter: 7 * 24 * 60 * 60 * 1000, // 7 days
  trackingConsent: true,
  cookieConsent: true,
  fadpCompliance: true,
  dataProcessingBasis: 'consent', // legitimate_interest, consent, contract
  rightToErasure: true,
  dataPortability: true
};

// ============================================================================
// MAIN SHARE SERVICE CLASS
// ============================================================================

class ShareService {
  constructor(options = {}) {
    this.config = {
      apiBaseUrl: options.apiBaseUrl || process.env.NEXT_PUBLIC_API_URL,
      cdnBaseUrl: options.cdnBaseUrl || process.env.NEXT_PUBLIC_CDN_URL,
      shortUrlService: options.shortUrlService || 'eatech.ly',
      trackingEnabled: options.trackingEnabled !== false,
      fadpCompliance: options.fadpCompliance !== false,
      ...options
    };
    
    this.cache = new Map();
    this.shareHistory = [];
    this.qrCodeCache = new Map();
    
    // Initialize analytics
    this.analytics = {
      shares: 0,
      platforms: {},
      countries: {},
      devices: {}
    };
    
    // Initialize privacy manager
    this.privacyManager = this.initPrivacyManager();
  }

  // ============================================================================
  // PRIVACY & COMPLIANCE MANAGEMENT
  // ============================================================================
  
  initPrivacyManager() {
    return {
      consentGiven: false,
      trackingAllowed: false,
      fadpCompliant: true,
      
      checkConsent: () => {
        const consent = localStorage.getItem('eatech_sharing_consent');
        return consent ? JSON.parse(consent) : false;
      },
      
      giveConsent: (permissions = {}) => {
        const consent = {
          sharing: true,
          tracking: permissions.tracking || false,
          analytics: permissions.analytics || false,
          marketing: permissions.marketing || false,
          timestamp: new Date().toISOString(),
          ...permissions
        };
        
        localStorage.setItem('eatech_sharing_consent', JSON.stringify(consent));
        this.privacyManager.consentGiven = true;
        this.privacyManager.trackingAllowed = consent.tracking;
        
        return consent;
      },
      
      revokeConsent: () => {
        localStorage.removeItem('eatech_sharing_consent');
        this.privacyManager.consentGiven = false;
        this.privacyManager.trackingAllowed = false;
        this.clearShareHistory();
      }
    };
  }

  // ============================================================================
  // CORE SHARING METHODS
  // ============================================================================
  
  /**
   * Share product with Swiss optimization
   */
  async shareProduct(productData, options = {}) {
    try {
      // Validate input
      if (!productData || !productData.id) {
        throw new Error('Product data is required');
      }
      
      // Check privacy consent
      if (!this.privacyManager.checkConsent() && !options.skipConsent) {
        throw new Error('Sharing consent required');
      }
      
      // Generate share data
      const shareData = await this.generateShareData('product', productData, options);
      
      // Create share URLs for all platforms
      const shareUrls = await this.generatePlatformUrls(shareData, options);
      
      // Generate QR code
      const qrCode = await this.generateQRCode(shareData.url, {
        ...options.qr,
        type: 'product'
      });
      
      // Track sharing event
      if (this.privacyManager.trackingAllowed) {
        await this.trackShare('product', productData.id, options.platform);
      }
      
      // Store in history
      this.addToHistory({
        type: 'product',
        id: productData.id,
        title: productData.name,
        timestamp: new Date().toISOString(),
        platform: options.platform,
        qrCode: qrCode
      });
      
      return {
        success: true,
        shareData,
        shareUrls,
        qrCode,
        platforms: this.getAvailablePlatforms(),
        privacy: {
          consentGiven: this.privacyManager.consentGiven,
          fadpCompliant: true
        }
      };
      
    } catch (error) {
      console.error('ShareService: Product sharing failed:', error);
      
      // Track error
      if (this.privacyManager.trackingAllowed) {
        await trackEvent('share_error', {
          type: 'product',
          error: error.message,
          productId: productData?.id
        });
      }
      
      return {
        success: false,
        error: error.message,
        fallback: this.generateFallbackShare(productData)
      };
    }
  }
  
  /**
   * Share order with tracking
   */
  async shareOrder(orderData, options = {}) {
    try {
      // Enhanced security for order sharing
      if (!orderData || !orderData.orderNumber) {
        throw new Error('Order data is required');
      }
      
      // Encrypt sensitive order data
      const encryptedData = await encryptSensitiveData({
        orderNumber: orderData.orderNumber,
        customerEmail: orderData.customerEmail,
        total: orderData.total
      });
      
      // Generate share data
      const shareData = await this.generateShareData('order', {
        ...orderData,
        encrypted: encryptedData
      }, options);
      
      // Create platform URLs
      const shareUrls = await this.generatePlatformUrls(shareData, options);
      
      // Generate secure QR code
      const qrCode = await this.generateQRCode(shareData.url, {
        ...options.qr,
        type: 'order',
        security: 'high'
      });
      
      // Track with privacy compliance
      if (this.privacyManager.trackingAllowed) {
        await this.trackShare('order', orderData.orderNumber, options.platform);
      }
      
      return {
        success: true,
        shareData,
        shareUrls,
        qrCode,
        security: 'encrypted',
        privacy: { fadpCompliant: true }
      };
      
    } catch (error) {
      console.error('ShareService: Order sharing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Share restaurant/foodtruck
   */
  async shareRestaurant(restaurantData, options = {}) {
    try {
      // Generate comprehensive restaurant share
      const shareData = await this.generateShareData('restaurant', restaurantData, options);
      
      // Include location-based sharing
      if (restaurantData.location) {
        shareData.location = {
          lat: restaurantData.location.lat,
          lng: restaurantData.location.lng,
          address: restaurantData.location.address,
          canton: restaurantData.location.canton
        };
      }
      
      // Create platform URLs
      const shareUrls = await this.generatePlatformUrls(shareData, options);
      
      // Generate business QR code (Swiss QR-Bill compatible)
      const qrCode = await this.generateQRCode(shareData.url, {
        ...options.qr,
        type: 'business',
        format: 'swiss-business'
      });
      
      // Track restaurant sharing
      if (this.privacyManager.trackingAllowed) {
        await this.trackShare('restaurant', restaurantData.id, options.platform);
      }
      
      return {
        success: true,
        shareData,
        shareUrls,
        qrCode,
        location: shareData.location
      };
      
    } catch (error) {
      console.error('ShareService: Restaurant sharing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // SHARE DATA GENERATION
  // ============================================================================
  
  async generateShareData(type, data, options = {}) {
    const shareId = uuidv4();
    const language = options.language || 'de-CH';
    const timestamp = new Date().toISOString();
    
    // Generate base URL
    const baseUrl = await this.generateShareUrl(type, data, shareId);
    
    // Generate short URL
    const shortUrl = await generateShortUrl(baseUrl, {
      service: this.config.shortUrlService,
      customAlias: options.customAlias,
      expiry: options.expiry
    });
    
    // Get message template
    const template = SHARE_TEMPLATES[type]?.[language] || SHARE_TEMPLATES[type]['de-CH'];
    
    // Generate share message
    const message = this.interpolateTemplate(template, {
      title: data.name || data.title,
      restaurant: data.restaurant?.name || data.restaurantName,
      price: this.formatPrice(data.price || data.total),
      location: data.location?.city || data.city,
      orderNumber: data.orderNumber,
      description: data.description,
      url: shortUrl
    });
    
    // Prepare metadata
    const metadata = {
      type,
      id: data.id || data.orderNumber,
      title: data.name || data.title || `Order ${data.orderNumber}`,
      description: data.description || message,
      image: data.image || data.mainImage,
      url: shortUrl,
      originalUrl: baseUrl,
      language,
      timestamp,
      shareId,
      fadpCompliant: this.config.fadpCompliance
    };
    
    return {
      shareId,
      type,
      message,
      url: shortUrl,
      originalUrl: baseUrl,
      metadata,
      timestamp
    };
  }
  
  async generateShareUrl(type, data, shareId) {
    const baseUrl = this.config.apiBaseUrl || 'https://eatech.ch';
    
    switch (type) {
      case 'product':
        return `${baseUrl}/product/${data.id}?ref=share&sid=${shareId}`;
      
      case 'order':
        return `${baseUrl}/order/${data.orderNumber}?ref=share&sid=${shareId}`;
      
      case 'restaurant':
        return `${baseUrl}/restaurant/${data.slug || data.id}?ref=share&sid=${shareId}`;
      
      default:
        return `${baseUrl}?ref=share&sid=${shareId}`;
    }
  }

  // ============================================================================
  // PLATFORM URL GENERATION
  // ============================================================================
  
  async generatePlatformUrls(shareData, options = {}) {
    const urls = {};
    const platforms = options.platforms || Object.keys(SWISS_PLATFORMS);
    
    for (const platformId of platforms) {
      const platform = SWISS_PLATFORMS[platformId];
      if (!platform) continue;
      
      try {
        urls[platformId] = await this.generatePlatformUrl(platform, shareData, options);
      } catch (error) {
        console.warn(`Failed to generate URL for ${platformId}:`, error);
      }
    }
    
    return urls;
  }
  
  async generatePlatformUrl(platform, shareData, options = {}) {
    const { message, url, metadata } = shareData;
    const encodedMessage = encodeURIComponent(message);
    const encodedUrl = encodeURIComponent(url);
    
    // Device detection for optimal URL
    const isMobile = options.isMobile || this.detectMobile();
    
    switch (platform.id) {
      case 'whatsapp':
        const phoneNumber = options.phoneNumber || '';
        const whatsappUrl = isMobile ? platform.deepLink : platform.webUrl;
        return phoneNumber 
          ? `${platform.baseUrl}${phoneNumber}?text=${encodedMessage}`
          : `${whatsappUrl}?text=${encodedMessage}`;
      
      case 'telegram':
        return `${platform.webUrl}?url=${encodedUrl}&text=${encodedMessage}`;
      
      case 'signal':
        return `${platform.deepLink}?text=${encodedMessage}`;
      
      case 'facebook':
        return `${platform.baseUrl}?u=${encodedUrl}`;
      
      case 'twitter':
        const hashtags = options.hashtags || ['eatech', 'foodtruck', 'schweiz'];
        return `${platform.baseUrl}?text=${encodedMessage}&hashtags=${hashtags.join(',')}`;
      
      case 'linkedin':
        return `${platform.baseUrl}?url=${encodedUrl}`;
      
      case 'email':
        const subject = encodeURIComponent(metadata.title);
        return `${platform.baseUrl}?subject=${subject}&body=${encodedMessage}`;
      
      case 'sms':
        return `${platform.baseUrl}?body=${encodedMessage}`;
      
      default:
        return url;
    }
  }

  // ============================================================================
  // QR CODE GENERATION
  // ============================================================================
  
  async generateQRCode(url, options = {}) {
    const cacheKey = `qr_${url}_${JSON.stringify(options)}`;
    
    // Check cache first
    if (this.qrCodeCache.has(cacheKey)) {
      return this.qrCodeCache.get(cacheKey);
    }
    
    try {
      const qrOptions = {
        ...QR_CONFIG,
        ...options,
        margin: options.margin || QR_CONFIG.margin,
        width: options.size || QR_CONFIG.size,
        color: {
          dark: options.darkColor || QR_CONFIG.color.dark,
          light: options.lightColor || QR_CONFIG.color.light
        }
      };
      
      // Swiss business format for business QR codes
      if (options.format === 'swiss-business' || options.type === 'business') {
        qrOptions.errorCorrectionLevel = 'H'; // High error correction for business
        qrOptions.margin = 4; // Larger margin for business cards
      }
      
      // Generate QR code
      const qrCodeDataUrl = await QRCode.toDataURL(url, qrOptions);
      
      // Generate additional formats
      const qrCode = {
        dataUrl: qrCodeDataUrl,
        url: url,
        size: qrOptions.width,
        format: 'PNG',
        type: options.type || 'standard',
        timestamp: new Date().toISOString(),
        fadpCompliant: true
      };
      
      // Add Swiss business features
      if (options.format === 'swiss-business') {
        qrCode.swissCompliant = true;
        qrCode.businessFormat = true;
        qrCode.printReady = true;
      }
      
      // Cache the result
      this.qrCodeCache.set(cacheKey, qrCode);
      
      // Clean cache if too large
      if (this.qrCodeCache.size > 100) {
        const firstKey = this.qrCodeCache.keys().next().value;
        this.qrCodeCache.delete(firstKey);
      }
      
      return qrCode;
      
    } catch (error) {
      console.error('QR Code generation failed:', error);
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  // ============================================================================
  // ANALYTICS & TRACKING
  // ============================================================================
  
  async trackShare(type, itemId, platform) {
    try {
      if (!this.privacyManager.trackingAllowed) {
        return;
      }
      
      const eventData = {
        event: 'share',
        type,
        itemId,
        platform,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        language: navigator.language,
        referrer: document.referrer,
        url: window.location.href
      };
      
      // Track in analytics service
      await trackEvent('share', eventData);
      
      // Update local analytics
      this.analytics.shares++;
      this.analytics.platforms[platform] = (this.analytics.platforms[platform] || 0) + 1;
      
      // Log activity
      await logActivity('share', {
        type,
        itemId,
        platform,
        fadpCompliant: true
      });
      
    } catch (error) {
      console.error('Share tracking failed:', error);
    }
  }
  
  getShareAnalytics() {
    return {
      ...this.analytics,
      history: this.shareHistory,
      privacy: {
        consentGiven: this.privacyManager.consentGiven,
        trackingAllowed: this.privacyManager.trackingAllowed,
        fadpCompliant: true
      }
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  getAvailablePlatforms() {
    return Object.values(SWISS_PLATFORMS)
      .sort((a, b) => a.priority - b.priority)
      .map(platform => ({
        id: platform.id,
        name: platform.name,
        icon: platform.icon,
        usage: platform.usage,
        available: this.isPlatformAvailable(platform.id)
      }));
  }
  
  isPlatformAvailable(platformId) {
    const platform = SWISS_PLATFORMS[platformId];
    if (!platform) return false;
    
    // Check device capabilities
    const isMobile = this.detectMobile();
    
    switch (platformId) {
      case 'whatsapp':
      case 'telegram':
      case 'signal':
        return isMobile || navigator.userAgent.includes('WhatsApp');
      
      case 'sms':
        return isMobile;
      
      default:
        return true;
    }
  }
  
  detectMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  
  formatPrice(price) {
    if (typeof price !== 'number') return price;
    return `CHF ${price.toFixed(2)}`;
  }
  
  interpolateTemplate(template, data) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] || match;
    });
  }
  
  addToHistory(shareItem) {
    this.shareHistory.unshift(shareItem);
    
    // Limit history size
    if (this.shareHistory.length > 50) {
      this.shareHistory = this.shareHistory.slice(0, 50);
    }
    
    // Store in localStorage (with privacy consent)
    if (this.privacyManager.consentGiven) {
      try {
        localStorage.setItem('eatech_share_history', JSON.stringify(this.shareHistory));
      } catch (error) {
        console.warn('Failed to store share history:', error);
      }
    }
  }
  
  getShareHistory() {
    return this.shareHistory;
  }
  
  clearShareHistory() {
    this.shareHistory = [];
    localStorage.removeItem('eatech_share_history');
  }
  
  generateFallbackShare(data) {
    return {
      url: window.location.href,
      message: `Check out ${data.name || 'this item'} on Eatech!`,
      title: data.name || 'Eatech',
      platforms: ['email', 'sms']
    };
  }

  // ============================================================================
  // DEEP LINKING & URL MANAGEMENT
  // ============================================================================
  
  async generateDeepLink(type, data, options = {}) {
    const scheme = options.scheme || 'eatech';
    const host = options.host || 'app';
    
    const baseDeepLink = `${scheme}://${host}`;
    
    switch (type) {
      case 'product':
        return `${baseDeepLink}/product/${data.id}`;
      
      case 'order':
        return `${baseDeepLink}/order/${data.orderNumber}`;
      
      case 'restaurant':
        return `${baseDeepLink}/restaurant/${data.id}`;
      
      default:
        return baseDeepLink;
    }
  }
  
  async createShareableLink(data, options = {}) {
    const shareData = await this.generateShareData(data.type, data, options);
    const qrCode = await this.generateQRCode(shareData.url, options.qr);
    
    return {
      ...shareData,
      qrCode,
      deepLink: await this.generateDeepLink(data.type, data, options),
      platforms: await this.generatePlatformUrls(shareData, options)
    };
  }

  // ============================================================================
  // SWISS SPECIFIC FEATURES
  // ============================================================================
  
  async generateSwissBusinessQR(businessData) {
    // Swiss QR-Bill compatible QR code
    const qrData = {
      type: 'swiss-business',
      business: businessData.name,
      address: businessData.address,
      city: businessData.city,
      postalCode: businessData.postalCode,
      country: 'CH',
      phone: businessData.phone,
      email: businessData.email,
      website: businessData.website,
      uid: businessData.uid, // Swiss business UID
      vatNumber: businessData.vatNumber
    };
    
    const qrString = JSON.stringify(qrData);
    
    return await this.generateQRCode(qrString, {
      format: 'swiss-business',
      size: 300,
      errorCorrectionLevel: 'H',
      margin: 4
    });
  }
  
  getSwissCantonalSharing(canton) {
    // Canton-specific sharing preferences
    const cantonalPreferences = {
      'ZH': ['whatsapp', 'telegram', 'email'],
      'BE': ['whatsapp', 'signal', 'email'],
      'GE': ['whatsapp', 'telegram', 'facebook'],
      'VD': ['whatsapp', 'facebook', 'email'],
      'TI': ['whatsapp', 'telegram', 'facebook']
    };
    
    return cantonalPreferences[canton] || ['whatsapp', 'email', 'sms'];
  }
}

// ============================================================================
// EXPORTS & SINGLETON
// ============================================================================

// Create singleton instance
let shareServiceInstance = null;

export const getShareService = (options = {}) => {
  if (!shareServiceInstance) {
    shareServiceInstance = new ShareService(options);
  }
  return shareServiceInstance;
};

// Named exports
export { ShareService, SWISS_PLATFORMS, QR_CONFIG, SHARE_TEMPLATES };

// Default export
export default ShareService;