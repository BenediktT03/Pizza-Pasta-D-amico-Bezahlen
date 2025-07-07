/**
 * EATECH - Share Modal Component
 * Version: 4.1.0
 * Description: Advanced social sharing modal with Swiss social platform optimization
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/components/customer/ShareModal.jsx
 * 
 * Features:
 * - Multi-platform social sharing (WhatsApp, Telegram, Facebook, Twitter, Instagram)
 * - QR code generation for easy mobile sharing
 * - Custom message templates with product information
 * - Image sharing with automatic optimization
 * - Deep link generation for app-to-app sharing
 * - Swiss privacy compliance (data minimization)
 * - Dynamic Open Graph meta data generation
 * - Referral tracking and analytics integration
 * - Multi-language sharing templates
 * - Clipboard copy functionality
 * - Email sharing with customizable templates
 * - SMS sharing for direct mobile communication
 */

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo,
  useRef,
  lazy,
  Suspense
} from 'react';
import { 
  Share2, X, Copy, Check, Mail, MessageSquare,
  Smartphone, QrCode, Link, Download, Edit3,
  Facebook, Twitter, Instagram, Send, Phone,
  Globe, Heart, Star, Camera, Image,
  ExternalLink, Users, Zap, AlertCircle
} from 'lucide-react';
import QRCode from 'qrcode.react';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAnalytics } from '../../hooks/useAnalytics';
import styles from './ShareModal.module.css';

// ============================================================================
// LAZY LOADED COMPONENTS
// ============================================================================

const CustomMessageEditor = lazy(() => import('./CustomMessageEditor'));
const SocialPreview = lazy(() => import('./SocialPreview'));
const ShareAnalytics = lazy(() => import('./ShareAnalytics'));

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const SHARE_PLATFORMS = {
  WHATSAPP: 'whatsapp',
  TELEGRAM: 'telegram',
  FACEBOOK: 'facebook',
  TWITTER: 'twitter',
  INSTAGRAM: 'instagram',
  EMAIL: 'email',
  SMS: 'sms',
  LINKEDIN: 'linkedin',
  PINTEREST: 'pinterest',
  REDDIT: 'reddit',
  COPY_LINK: 'copy_link',
  QR_CODE: 'qr_code',
  NATIVE_SHARE: 'native_share'
};

const SWISS_SOCIAL_PLATFORMS = {
  [SHARE_PLATFORMS.WHATSAPP]: {
    name: 'WhatsApp',
    icon: MessageSquare,
    color: '#25D366',
    baseUrl: 'https://wa.me/?text=',
    popular: true,
    mobile: true
  },
  [SHARE_PLATFORMS.TELEGRAM]: {
    name: 'Telegram',
    icon: Send,
    color: '#0088cc',
    baseUrl: 'https://t.me/share/url?url={url}&text=',
    popular: true,
    mobile: true
  },
  [SHARE_PLATFORMS.FACEBOOK]: {
    name: 'Facebook',
    icon: Facebook,
    color: '#1877F2',
    baseUrl: 'https://www.facebook.com/sharer/sharer.php?u=',
    popular: true,
    desktop: true
  },
  [SHARE_PLATFORMS.TWITTER]: {
    name: 'Twitter',
    icon: Twitter,
    color: '#1DA1F2',
    baseUrl: 'https://twitter.com/intent/tweet?text={text}&url=',
    popular: true,
    desktop: true
  },
  [SHARE_PLATFORMS.INSTAGRAM]: {
    name: 'Instagram',
    icon: Instagram,
    color: '#E4405F',
    baseUrl: 'https://www.instagram.com/',
    popular: true,
    mobile: true,
    imageRequired: true
  },
  [SHARE_PLATFORMS.EMAIL]: {
    name: 'E-Mail',
    icon: Mail,
    color: '#EA4335',
    baseUrl: 'mailto:?subject={subject}&body=',
    popular: true,
    universal: true
  },
  [SHARE_PLATFORMS.SMS]: {
    name: 'SMS',
    icon: Phone,
    color: '#34C759',
    baseUrl: 'sms:?body=',
    popular: true,
    mobile: true
  },
  [SHARE_PLATFORMS.LINKEDIN]: {
    name: 'LinkedIn',
    icon: Globe,
    color: '#0A66C2',
    baseUrl: 'https://www.linkedin.com/sharing/share-offsite/?url=',
    popular: false,
    desktop: true
  },
  [SHARE_PLATFORMS.PINTEREST]: {
    name: 'Pinterest',
    icon: Image,
    color: '#BD081C',
    baseUrl: 'https://pinterest.com/pin/create/button/?url={url}&media={image}&description=',
    popular: false,
    desktop: true,
    imageRequired: true
  },
  [SHARE_PLATFORMS.REDDIT]: {
    name: 'Reddit',
    icon: Globe,
    color: '#FF4500',
    baseUrl: 'https://reddit.com/submit?url={url}&title=',
    popular: false,
    desktop: true
  }
};

const SHARE_TEMPLATES = {
  'de-CH': {
    product: {
      title: 'Schau dir das an: {productName}',
      description: 'Entdecke {productName} bei {tenantName}. {description}',
      call_to_action: 'Jetzt bestellen!',
      email_subject: 'Tolles Essen gefunden: {productName}',
      email_body: 'Hallo!\n\nIch habe ein tolles Gericht entdeckt: {productName} bei {tenantName}.\n\n{description}\n\nPreis: CHF {price}\n\nSchau es dir hier an: {url}\n\nViele Grüsse!'
    },
    restaurant: {
      title: 'Empfehlung: {tenantName}',
      description: 'Ich empfehle dir {tenantName} - tolles Essen in {location}!',
      call_to_action: 'Jetzt entdecken!',
      email_subject: 'Restaurant-Empfehlung: {tenantName}',
      email_body: 'Hallo!\n\nIch möchte dir {tenantName} empfehlen - ein tolles Restaurant in {location}.\n\n{description}\n\nSchau es dir hier an: {url}\n\nViele Grüsse!'
    },
    order: {
      title: 'Meine Bestellung bei {tenantName}',
      description: 'Ich habe gerade bei {tenantName} bestellt - sieht lecker aus!',
      call_to_action: 'Auch bestellen!',
      email_subject: 'Leckere Bestellung bei {tenantName}',
      email_body: 'Hallo!\n\nIch habe gerade eine leckere Bestellung bei {tenantName} aufgegeben.\n\nTotal: CHF {total}\n\nMöchtest du auch bestellen? {url}\n\nViele Grüsse!'
    }
  },
  'de-DE': {
    product: {
      title: 'Schau dir das an: {productName}',
      description: 'Entdecke {productName} bei {tenantName}. {description}',
      call_to_action: 'Jetzt bestellen!',
      email_subject: 'Tolles Essen gefunden: {productName}',
      email_body: 'Hallo!\n\nIch habe ein tolles Gericht entdeckt: {productName} bei {tenantName}.\n\n{description}\n\nPreis: €{price}\n\nSchau es dir hier an: {url}\n\nViele Grüße!'
    },
    restaurant: {
      title: 'Empfehlung: {tenantName}',
      description: 'Ich empfehle dir {tenantName} - tolles Essen in {location}!',
      call_to_action: 'Jetzt entdecken!',
      email_subject: 'Restaurant-Empfehlung: {tenantName}',
      email_body: 'Hallo!\n\nIch möchte dir {tenantName} empfehlen - ein tolles Restaurant in {location}.\n\n{description}\n\nSchau es dir hier an: {url}\n\nViele Grüße!'
    },
    order: {
      title: 'Meine Bestellung bei {tenantName}',
      description: 'Ich habe gerade bei {tenantName} bestellt - sieht lecker aus!',
      call_to_action: 'Auch bestellen!',
      email_subject: 'Leckere Bestellung bei {tenantName}',
      email_body: 'Hallo!\n\nIch habe gerade eine leckere Bestellung bei {tenantName} aufgegeben.\n\nTotal: €{total}\n\nMöchtest du auch bestellen? {url}\n\nViele Grüße!'
    }
  },
  'fr-CH': {
    product: {
      title: 'Regardez ça: {productName}',
      description: 'Découvrez {productName} chez {tenantName}. {description}',
      call_to_action: 'Commander maintenant!',
      email_subject: 'Délicieux plat trouvé: {productName}',
      email_body: 'Bonjour!\n\nJ\'ai découvert un délicieux plat: {productName} chez {tenantName}.\n\n{description}\n\nPrix: CHF {price}\n\nRegardez ici: {url}\n\nCordialement!'
    },
    restaurant: {
      title: 'Recommandation: {tenantName}',
      description: 'Je vous recommande {tenantName} - excellente cuisine à {location}!',
      call_to_action: 'Découvrir maintenant!',
      email_subject: 'Recommandation restaurant: {tenantName}',
      email_body: 'Bonjour!\n\nJe voudrais vous recommander {tenantName} - un excellent restaurant à {location}.\n\n{description}\n\nRegardez ici: {url}\n\nCordialement!'
    },
    order: {
      title: 'Ma commande chez {tenantName}',
      description: 'Je viens de commander chez {tenantName} - ça a l\'air délicieux!',
      call_to_action: 'Commander aussi!',
      email_subject: 'Délicieuse commande chez {tenantName}',
      email_body: 'Bonjour!\n\nJe viens de passer une délicieuse commande chez {tenantName}.\n\nTotal: CHF {total}\n\nVoulez-vous aussi commander? {url}\n\nCordialement!'
    }
  },
  'it-CH': {
    product: {
      title: 'Guarda questo: {productName}',
      description: 'Scopri {productName} da {tenantName}. {description}',
      call_to_action: 'Ordina ora!',
      email_subject: 'Delizioso piatto trovato: {productName}',
      email_body: 'Ciao!\n\nHo scoperto un delizioso piatto: {productName} da {tenantName}.\n\n{description}\n\nPrezzo: CHF {price}\n\nGuarda qui: {url}\n\nCordiali saluti!'
    },
    restaurant: {
      title: 'Raccomandazione: {tenantName}',
      description: 'Ti raccomando {tenantName} - ottima cucina a {location}!',
      call_to_action: 'Scopri ora!',
      email_subject: 'Raccomandazione ristorante: {tenantName}',
      email_body: 'Ciao!\n\nVorrei raccomandarti {tenantName} - un ottimo ristorante a {location}.\n\n{description}\n\nGuarda qui: {url}\n\nCordiali saluti!'
    },
    order: {
      title: 'Il mio ordine da {tenantName}',
      description: 'Ho appena ordinato da {tenantName} - sembra delizioso!',
      call_to_action: 'Ordina anche tu!',
      email_subject: 'Delizioso ordine da {tenantName}',
      email_body: 'Ciao!\n\nHo appena fatto un delizioso ordine da {tenantName}.\n\nTotale: CHF {total}\n\nVuoi ordinare anche tu? {url}\n\nCordiali saluti!'
    }
  },
  'en-US': {
    product: {
      title: 'Check this out: {productName}',
      description: 'Discover {productName} at {tenantName}. {description}',
      call_to_action: 'Order now!',
      email_subject: 'Delicious food found: {productName}',
      email_body: 'Hello!\n\nI discovered a delicious dish: {productName} at {tenantName}.\n\n{description}\n\nPrice: CHF {price}\n\nCheck it out here: {url}\n\nBest regards!'
    },
    restaurant: {
      title: 'Recommendation: {tenantName}',
      description: 'I recommend {tenantName} - great food in {location}!',
      call_to_action: 'Discover now!',
      email_subject: 'Restaurant recommendation: {tenantName}',
      email_body: 'Hello!\n\nI want to recommend {tenantName} - a great restaurant in {location}.\n\n{description}\n\nCheck it out here: {url}\n\nBest regards!'
    },
    order: {
      title: 'My order from {tenantName}',
      description: 'I just ordered from {tenantName} - looks delicious!',
      call_to_action: 'Order too!',
      email_subject: 'Delicious order from {tenantName}',
      email_body: 'Hello!\n\nI just placed a delicious order at {tenantName}.\n\nTotal: CHF {total}\n\nWant to order too? {url}\n\nBest regards!'
    }
  }
};

const SHARE_TRANSLATIONS = {
  'de-CH': {
    share_title: 'Teilen',
    copy_link: 'Link kopieren',
    link_copied: 'Link kopiert!',
    share_via: 'Teilen über',
    custom_message: 'Nachricht anpassen',
    qr_code: 'QR-Code',
    download_qr: 'QR-Code herunterladen',
    share_image: 'Bild teilen',
    add_personal_note: 'Persönliche Notiz hinzufügen',
    preview: 'Vorschau',
    share_analytics: 'Teilen-Statistiken',
    popular_platforms: 'Beliebte Plattformen',
    more_options: 'Weitere Optionen',
    close: 'Schliessen'
  },
  'de-DE': {
    share_title: 'Teilen',
    copy_link: 'Link kopieren',
    link_copied: 'Link kopiert!',
    share_via: 'Teilen über',
    custom_message: 'Nachricht anpassen',
    qr_code: 'QR-Code',
    download_qr: 'QR-Code herunterladen',
    share_image: 'Bild teilen',
    add_personal_note: 'Persönliche Notiz hinzufügen',
    preview: 'Vorschau',
    share_analytics: 'Teilen-Statistiken',
    popular_platforms: 'Beliebte Plattformen',
    more_options: 'Weitere Optionen',
    close: 'Schließen'
  },
  'fr-CH': {
    share_title: 'Partager',
    copy_link: 'Copier le lien',
    link_copied: 'Lien copié!',
    share_via: 'Partager via',
    custom_message: 'Personnaliser le message',
    qr_code: 'Code QR',
    download_qr: 'Télécharger le code QR',
    share_image: 'Partager l\'image',
    add_personal_note: 'Ajouter une note personnelle',
    preview: 'Aperçu',
    share_analytics: 'Statistiques de partage',
    popular_platforms: 'Plateformes populaires',
    more_options: 'Plus d\'options',
    close: 'Fermer'
  },
  'it-CH': {
    share_title: 'Condividi',
    copy_link: 'Copia link',
    link_copied: 'Link copiato!',
    share_via: 'Condividi tramite',
    custom_message: 'Personalizza messaggio',
    qr_code: 'Codice QR',
    download_qr: 'Scarica codice QR',
    share_image: 'Condividi immagine',
    add_personal_note: 'Aggiungi nota personale',
    preview: 'Anteprima',
    share_analytics: 'Statistiche condivisione',
    popular_platforms: 'Piattaforme popolari',
    more_options: 'Più opzioni',
    close: 'Chiudi'
  },
  'en-US': {
    share_title: 'Share',
    copy_link: 'Copy Link',
    link_copied: 'Link Copied!',
    share_via: 'Share via',
    custom_message: 'Customize Message',
    qr_code: 'QR Code',
    download_qr: 'Download QR Code',
    share_image: 'Share Image',
    add_personal_note: 'Add Personal Note',
    preview: 'Preview',
    share_analytics: 'Share Analytics',
    popular_platforms: 'Popular Platforms',
    more_options: 'More Options',
    close: 'Close'
  }
};

// ============================================================================
// LOADING COMPONENT
// ============================================================================

const LoadingSpinner = ({ size = 16 }) => (
  <div className={styles.spinner} style={{ width: size, height: size }} />
);

// ============================================================================
// PLATFORM BUTTON COMPONENT
// ============================================================================

const PlatformButton = ({ 
  platform, 
  config, 
  shareUrl, 
  isDisabled,
  onClick,
  className = '' 
}) => {
  const IconComponent = config.icon;

  return (
    <button
      className={`${styles.platformButton} ${className}`}
      onClick={() => onClick(platform)}
      disabled={isDisabled}
      style={{ '--platform-color': config.color }}
      title={config.name}
    >
      <div className={styles.platformIcon}>
        <IconComponent size={20} />
      </div>
      <span className={styles.platformName}>{config.name}</span>
    </button>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ShareModal = ({
  isOpen,
  onClose,
  shareData,
  shareType = 'product', // 'product', 'restaurant', 'order'
  language = 'de-CH',
  enableAnalytics = true,
  enableCustomization = true,
  className = ''
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [activeTab, setActiveTab] = useState('platforms');
  const [customMessage, setCustomMessage] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState(new Set());
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [qrCodeData, setQrCodeData] = useState('');
  const [shareImage, setShareImage] = useState(null);
  const [personalNote, setPersonalNote] = useState('');
  const [referralCode, setReferralCode] = useState('');

  // ============================================================================
  // REFS & CONTEXTS
  // ============================================================================

  const modalRef = useRef(null);
  const qrCodeRef = useRef(null);
  
  const { tenant } = useTenant();
  const { user } = useAuth();
  const { trackEvent } = useAnalytics();

  // ============================================================================
  // MEMOIZED VALUES
  // ============================================================================

  const translations = useMemo(() => 
    SHARE_TRANSLATIONS[language] || SHARE_TRANSLATIONS['de-CH'], 
    [language]
  );

  const templates = useMemo(() => 
    SHARE_TEMPLATES[language]?.[shareType] || SHARE_TEMPLATES['de-CH'][shareType], 
    [language, shareType]
  );

  const deviceType = useMemo(() => {
    if (typeof window === 'undefined') return 'desktop';
    return window.innerWidth <= 768 ? 'mobile' : 'desktop';
  }, []);

  const availablePlatforms = useMemo(() => {
    const platforms = Object.entries(SWISS_SOCIAL_PLATFORMS).filter(([key, config]) => {
      // Filter platforms based on device type and capabilities
      if (deviceType === 'mobile' && config.desktop && !config.mobile) return false;
      if (deviceType === 'desktop' && config.mobile && !config.desktop && !config.universal) return false;
      
      // Filter out image-required platforms if no image available
      if (config.imageRequired && !shareData.image && !shareImage) return false;
      
      return true;
    });

    // Sort by popularity
    return platforms.sort((a, b) => {
      if (a[1].popular && !b[1].popular) return -1;
      if (!a[1].popular && b[1].popular) return 1;
      return 0;
    });
  }, [deviceType, shareData.image, shareImage]);

  const popularPlatforms = useMemo(() => 
    availablePlatforms.filter(([_, config]) => config.popular).slice(0, 6),
    [availablePlatforms]
  );

  const additionalPlatforms = useMemo(() => 
    availablePlatforms.filter(([_, config]) => !config.popular),
    [availablePlatforms]
  );

  // ============================================================================
  // SHARE URL GENERATION
  // ============================================================================

  const generateShareUrl = useCallback(() => {
    if (!shareData.url) return '';

    let url = shareData.url;
    
    // Add referral code if user is logged in
    if (user && enableAnalytics) {
      const referralParam = `ref=${user.id.slice(0, 8)}`;
      url += url.includes('?') ? `&${referralParam}` : `?${referralParam}`;
    }

    // Add UTM parameters for tracking
    if (enableAnalytics) {
      const utmParams = new URLSearchParams({
        utm_source: 'share_modal',
        utm_medium: 'social',
        utm_campaign: shareType,
        utm_content: shareData.id || 'unknown'
      });
      
      url += url.includes('?') ? `&${utmParams}` : `?${utmParams}`;
    }

    return url;
  }, [shareData, user, enableAnalytics, shareType]);

  const generateShareMessage = useCallback((platform) => {
    const baseMessage = customMessage || templates.description;
    const finalUrl = generatedUrl || generateShareUrl();
    
    // Replace template variables
    let message = baseMessage
      .replace(/{productName}/g, shareData.name || '')
      .replace(/{tenantName}/g, tenant?.name || '')
      .replace(/{description}/g, shareData.description || '')
      .replace(/{price}/g, shareData.price || '')
      .replace(/{total}/g, shareData.total || '')
      .replace(/{location}/g, tenant?.location || '');

    // Add personal note if provided
    if (personalNote) {
      message = `${personalNote}\n\n${message}`;
    }

    // Platform-specific formatting
    switch (platform) {
      case SHARE_PLATFORMS.TWITTER:
        // Truncate for Twitter character limit
        const maxLength = 280 - finalUrl.length - 5; // Account for URL and spacing
        if (message.length > maxLength) {
          message = message.slice(0, maxLength - 3) + '...';
        }
        return `${message} ${finalUrl}`;
        
      case SHARE_PLATFORMS.WHATSAPP:
      case SHARE_PLATFORMS.TELEGRAM:
      case SHARE_PLATFORMS.SMS:
        return `${message}\n\n${finalUrl}`;
        
      case SHARE_PLATFORMS.EMAIL:
        return {
          subject: templates.email_subject
            .replace(/{productName}/g, shareData.name || '')
            .replace(/{tenantName}/g, tenant?.name || ''),
          body: templates.email_body
            .replace(/{productName}/g, shareData.name || '')
            .replace(/{tenantName}/g, tenant?.name || '')
            .replace(/{description}/g, shareData.description || '')
            .replace(/{price}/g, shareData.price || '')
            .replace(/{total}/g, shareData.total || '')
            .replace(/{url}/g, finalUrl)
        };
        
      default:
        return message;
    }
  }, [customMessage, templates, generatedUrl, generateShareUrl, shareData, tenant, personalNote]);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  useEffect(() => {
    if (isOpen) {
      const url = generateShareUrl();
      setGeneratedUrl(url);
      setQrCodeData(url);
      
      // Set default custom message
      if (!customMessage) {
        setCustomMessage(templates.description
          .replace(/{productName}/g, shareData.name || '')
          .replace(/{tenantName}/g, tenant?.name || '')
          .replace(/{description}/g, shareData.description || '')
        );
      }

      // Track modal open
      if (enableAnalytics) {
        trackEvent('share_modal_open', {
          shareType,
          productId: shareData.id,
          source: 'modal'
        });
      }
    }
  }, [isOpen, generateShareUrl, customMessage, templates, shareData, tenant, shareType, enableAnalytics, trackEvent]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handlePlatformShare = useCallback(async (platform) => {
    const config = SWISS_SOCIAL_PLATFORMS[platform];
    if (!config) return;

    const message = generateShareMessage(platform);
    const shareUrl = generatedUrl || generateShareUrl();

    try {
      let finalUrl = '';

      switch (platform) {
        case SHARE_PLATFORMS.WHATSAPP:
          finalUrl = `${config.baseUrl}${encodeURIComponent(message)}`;
          break;
          
        case SHARE_PLATFORMS.TELEGRAM:
          finalUrl = config.baseUrl
            .replace('{url}', encodeURIComponent(shareUrl))
            .replace('{text}', encodeURIComponent(typeof message === 'string' ? message : message.body || ''));
          break;
          
        case SHARE_PLATFORMS.FACEBOOK:
          finalUrl = `${config.baseUrl}${encodeURIComponent(shareUrl)}`;
          break;
          
        case SHARE_PLATFORMS.TWITTER:
          finalUrl = config.baseUrl
            .replace('{text}', encodeURIComponent(typeof message === 'string' ? message : ''))
            .replace('{url}', encodeURIComponent(shareUrl));
          break;
          
        case SHARE_PLATFORMS.EMAIL:
          const emailData = typeof message === 'object' ? message : { subject: '', body: message };
          finalUrl = config.baseUrl
            .replace('{subject}', encodeURIComponent(emailData.subject))
            .replace('{body}', encodeURIComponent(emailData.body));
          break;
          
        case SHARE_PLATFORMS.SMS:
          finalUrl = `${config.baseUrl}${encodeURIComponent(message)}`;
          break;
          
        case SHARE_PLATFORMS.LINKEDIN:
          finalUrl = `${config.baseUrl}${encodeURIComponent(shareUrl)}`;
          break;
          
        case SHARE_PLATFORMS.PINTEREST:
          finalUrl = config.baseUrl
            .replace('{url}', encodeURIComponent(shareUrl))
            .replace('{image}', encodeURIComponent(shareData.image || ''))
            .replace('{description}', encodeURIComponent(typeof message === 'string' ? message : ''));
          break;
          
        case SHARE_PLATFORMS.REDDIT:
          finalUrl = config.baseUrl
            .replace('{url}', encodeURIComponent(shareUrl))
            .replace('{title}', encodeURIComponent(shareData.name || ''));
          break;

        case SHARE_PLATFORMS.NATIVE_SHARE:
          if (navigator.share) {
            await navigator.share({
              title: shareData.name || templates.title,
              text: typeof message === 'string' ? message : message.body,
              url: shareUrl
            });
            
            if (enableAnalytics) {
              trackEvent('share_completed', {
                platform,
                shareType,
                productId: shareData.id,
                method: 'native'
              });
            }
            return;
          }
          break;

        case SHARE_PLATFORMS.COPY_LINK:
          await navigator.clipboard.writeText(shareUrl);
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 2000);
          
          if (enableAnalytics) {
            trackEvent('share_completed', {
              platform,
              shareType,
              productId: shareData.id,
              method: 'copy'
            });
          }
          return;
      }

      if (finalUrl) {
        window.open(finalUrl, '_blank', 'noopener,noreferrer');
        
        if (enableAnalytics) {
          trackEvent('share_completed', {
            platform,
            shareType,
            productId: shareData.id,
            method: 'external'
          });
        }
      }

    } catch (error) {
      console.error('Share failed:', error);
      
      if (enableAnalytics) {
        trackEvent('share_error', {
          platform,
          shareType,
          productId: shareData.id,
          error: error.message
        });
      }
    }
  }, [generateShareMessage, generatedUrl, generateShareUrl, shareData, templates, shareType, enableAnalytics, trackEvent]);

  const handleQRCodeDownload = useCallback(() => {
    if (!qrCodeRef.current) return;

    const canvas = qrCodeRef.current.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = `${shareData.name || 'share'}-qr-code.png`;
      link.href = canvas.toDataURL();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      if (enableAnalytics) {
        trackEvent('qr_code_download', {
          shareType,
          productId: shareData.id
        });
      }
    }
  }, [shareData, shareType, enableAnalytics, trackEvent]);

  const handleClose = useCallback(() => {
    if (enableAnalytics) {
      trackEvent('share_modal_close', {
        shareType,
        productId: shareData.id,
        completedShares: selectedPlatforms.size
      });
    }
    
    onClose();
  }, [onClose, enableAnalytics, trackEvent, shareType, shareData, selectedPlatforms]);

  // ============================================================================
  // KEYBOARD HANDLERS
  // ============================================================================

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleClose]);

  // ============================================================================
  // RENDER METHODS
  // ============================================================================

  const renderPlatformGrid = (platforms, title) => (
    <div className={styles.platformSection}>
      {title && <h4 className={styles.sectionTitle}>{title}</h4>}
      <div className={styles.platformGrid}>
        {platforms.map(([platform, config]) => (
          <PlatformButton
            key={platform}
            platform={platform}
            config={config}
            shareUrl={generatedUrl}
            onClick={handlePlatformShare}
          />
        ))}
      </div>
    </div>
  );

  const renderSpecialActions = () => (
    <div className={styles.specialActions}>
      {/* Copy Link */}
      <button
        className={`${styles.specialButton} ${copiedLink ? styles.copied : ''}`}
        onClick={() => handlePlatformShare(SHARE_PLATFORMS.COPY_LINK)}
      >
        {copiedLink ? <Check size={16} /> : <Copy size={16} />}
        <span>{copiedLink ? translations.link_copied : translations.copy_link}</span>
      </button>

      {/* Native Share (if supported) */}
      {navigator.share && (
        <button
          className={styles.specialButton}
          onClick={() => handlePlatformShare(SHARE_PLATFORMS.NATIVE_SHARE)}
        >
          <Share2 size={16} />
          <span>{translations.share_via}</span>
        </button>
      )}

      {/* QR Code */}
      <div className={styles.qrCodeSection}>
        <div className={styles.qrCodeContainer} ref={qrCodeRef}>
          <QRCode
            value={qrCodeData}
            size={120}
            level="M"
            includeMargin={true}
            renderAs="canvas"
          />
        </div>
        <div className={styles.qrCodeActions}>
          <span className={styles.qrCodeLabel}>{translations.qr_code}</span>
          <button
            className={styles.qrDownloadButton}
            onClick={handleQRCodeDownload}
            title={translations.download_qr}
          >
            <Download size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderCustomization = () => (
    <div className={styles.customizationSection}>
      <h4 className={styles.sectionTitle}>{translations.custom_message}</h4>
      
      <textarea
        className={styles.customTextarea}
        value={customMessage}
        onChange={(e) => setCustomMessage(e.target.value)}
        placeholder={templates.description}
        rows={4}
      />

      {enableCustomization && (
        <>
          <div className={styles.personalNoteSection}>
            <label htmlFor="personalNote">{translations.add_personal_note}</label>
            <input
              id="personalNote"
              type="text"
              className={styles.personalNoteInput}
              value={personalNote}
              onChange={(e) => setPersonalNote(e.target.value)}
              placeholder="Füge eine persönliche Nachricht hinzu..."
              maxLength={140}
            />
            <span className={styles.charCount}>{personalNote.length}/140</span>
          </div>

          <Suspense fallback={<LoadingSpinner />}>
            <CustomMessageEditor
              message={customMessage}
              onMessageChange={setCustomMessage}
              templates={templates}
              shareData={shareData}
              language={language}
            />
          </Suspense>
        </>
      )}
    </div>
  );

  const renderPreview = () => (
    <div className={styles.previewSection}>
      <h4 className={styles.sectionTitle}>{translations.preview}</h4>
      
      <Suspense fallback={<LoadingSpinner />}>
        <SocialPreview
          shareData={shareData}
          message={customMessage}
          url={generatedUrl}
          image={shareImage}
          language={language}
        />
      </Suspense>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (!isOpen) return null;

  return (
    <div className={styles.shareModalOverlay} onClick={handleClose}>
      <div 
        className={`${styles.shareModal} ${className}`}
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            <Share2 size={20} />
            {translations.share_title}
          </h3>
          
          <button
            className={styles.closeButton}
            onClick={handleClose}
            aria-label={translations.close}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.modalContent}>
          {/* Tab Navigation */}
          <div className={styles.tabNavigation}>
            <button
              className={`${styles.tab} ${activeTab === 'platforms' ? styles.active : ''}`}
              onClick={() => setActiveTab('platforms')}
            >
              <Share2 size={16} />
              {translations.share_via}
            </button>
            
            {enableCustomization && (
              <button
                className={`${styles.tab} ${activeTab === 'customize' ? styles.active : ''}`}
                onClick={() => setActiveTab('customize')}
              >
                <Edit3 size={16} />
                {translations.custom_message}
              </button>
            )}
            
            <button
              className={`${styles.tab} ${activeTab === 'preview' ? styles.active : ''}`}
              onClick={() => setActiveTab('preview')}
            >
              <Eye size={16} />
              {translations.preview}
            </button>
          </div>

          {/* Tab Content */}
          <div className={styles.tabContent}>
            {activeTab === 'platforms' && (
              <>
                {/* Popular Platforms */}
                {renderPlatformGrid(popularPlatforms, translations.popular_platforms)}
                
                {/* Special Actions */}
                {renderSpecialActions()}
                
                {/* Additional Platforms */}
                {additionalPlatforms.length > 0 && (
                  <details className={styles.additionalPlatforms}>
                    <summary>{translations.more_options}</summary>
                    {renderPlatformGrid(additionalPlatforms)}
                  </details>
                )}
              </>
            )}

            {activeTab === 'customize' && renderCustomization()}
            
            {activeTab === 'preview' && renderPreview()}
          </div>
        </div>

        {/* Analytics */}
        {enableAnalytics && process.env.NODE_ENV === 'development' && (
          <Suspense fallback={<LoadingSpinner />}>
            <ShareAnalytics
              shareData={shareData}
              shareType={shareType}
              selectedPlatforms={selectedPlatforms}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
};

export default ShareModal;