/**
 * EATECH - Product QR Component
 * Version: 4.1.0
 * Description: Advanced QR code generation and scanning with Swiss market optimization
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/components/customer/ProductQR.jsx
 * 
 * Features:
 * - Dynamic QR code generation with custom branding
 * - Real-time QR code scanning with camera integration
 * - Multi-format support (URL, vCard, WiFi, Payment)
 * - Swiss payment QR code generation (QR-Bill format)
 * - Offline QR code functionality
 * - Batch QR generation for multiple products
 * - Custom QR styling with tenant branding
 * - Analytics tracking for QR interactions
 * - Error correction and validation
 * - Print-optimized QR codes for physical menus
 * - NFC integration for contactless interactions
 * - Multi-language QR content generation
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
  QrCode, Camera, Download, Share2, Copy,
  Printer, Zap, Smartphone, Wifi, CreditCard,
  Eye, EyeOff, Settings, Palette, Grid,
  AlertCircle, CheckCircle, RefreshCw, X,
  Maximize2, Minimize2, RotateCcw, Save,
  Upload, FileText, Image, Link, Phone
} from 'lucide-react';
import QRCodeLib from 'qrcode';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import jsQR from 'jsqr';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAnalytics } from '../../hooks/useAnalytics';
import styles from './ProductQR.module.css';

// ============================================================================
// LAZY LOADED COMPONENTS
// ============================================================================

const QRScanner = lazy(() => import('./QRScanner'));
const QRCustomizer = lazy(() => import('./QRCustomizer'));
const QRBatchGenerator = lazy(() => import('./QRBatchGenerator'));
const QRAnalytics = lazy(() => import('./QRAnalytics'));
const QRPrintPreview = lazy(() => import('./QRPrintPreview'));

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const QR_TYPES = {
  PRODUCT: 'product',
  MENU: 'menu',
  PAYMENT: 'payment',
  CONTACT: 'contact',
  WIFI: 'wifi',
  URL: 'url',
  TEXT: 'text',
  EMAIL: 'email',
  SMS: 'sms',
  LOCATION: 'location'
};

const QR_FORMATS = {
  PNG: 'png',
  JPEG: 'jpeg',
  SVG: 'svg',
  PDF: 'pdf',
  WEBP: 'webp'
};

const QR_SIZES = {
  SMALL: { size: 128, label: 'Klein (128px)' },
  MEDIUM: { size: 256, label: 'Mittel (256px)' },
  LARGE: { size: 512, label: 'Gross (512px)' },
  XLARGE: { size: 1024, label: 'Extra Gross (1024px)' },
  PRINT: { size: 2048, label: 'Druck (2048px)' }
};

const ERROR_CORRECTION_LEVELS = {
  L: { level: 'L', label: 'Niedrig (~7%)', description: 'Für saubere Umgebungen' },
  M: { level: 'M', label: 'Mittel (~15%)', description: 'Standard für die meisten Anwendungen' },
  Q: { level: 'Q', label: 'Hoch (~25%)', description: 'Für industrielle Umgebungen' },
  H: { level: 'H', label: 'Sehr hoch (~30%)', description: 'Für raue Bedingungen' }
};

const SWISS_QR_STANDARDS = {
  // Swiss QR-Bill specifications (ISO-20022)
  PAYMENT: {
    characterSet: 'UTF-8',
    separator: '\r\n',
    maxLength: 997,
    version: '0200',
    codingType: '1'
  },
  // Swiss business standards
  BUSINESS: {
    vatFormat: 'CHE-{number}.{check}',
    phoneFormat: '+41 {area} {number}',
    addressFormat: '{street} {number}, {postal} {city}'
  }
};

const QR_TRANSLATIONS = {
  'de-CH': {
    generate_qr: 'QR-Code generieren',
    scan_qr: 'QR-Code scannen',
    download_qr: 'QR-Code herunterladen',
    print_qr: 'QR-Code drucken',
    share_qr: 'QR-Code teilen',
    copy_qr: 'QR-Code kopieren',
    customize_qr: 'QR-Code anpassen',
    qr_content: 'QR-Code Inhalt',
    error_correction: 'Fehlerkorrektur',
    qr_size: 'QR-Code Grösse',
    qr_format: 'QR-Code Format',
    foreground_color: 'Vordergrundfarbe',
    background_color: 'Hintergrundfarbe',
    add_logo: 'Logo hinzufügen',
    batch_generate: 'Stapel generieren',
    scan_result: 'Scan-Ergebnis',
    invalid_qr: 'Ungültiger QR-Code',
    camera_error: 'Kamera-Fehler',
    qr_generated: 'QR-Code generiert',
    qr_downloaded: 'QR-Code heruntergeladen',
    qr_copied: 'QR-Code kopiert',
    enable_camera: 'Kamera aktivieren',
    switch_camera: 'Kamera wechseln'
  },
  'de-DE': {
    generate_qr: 'QR-Code generieren',
    scan_qr: 'QR-Code scannen',
    download_qr: 'QR-Code herunterladen',
    print_qr: 'QR-Code drucken',
    share_qr: 'QR-Code teilen',
    copy_qr: 'QR-Code kopieren',
    customize_qr: 'QR-Code anpassen',
    qr_content: 'QR-Code Inhalt',
    error_correction: 'Fehlerkorrektur',
    qr_size: 'QR-Code Größe',
    qr_format: 'QR-Code Format',
    foreground_color: 'Vordergrundfarbe',
    background_color: 'Hintergrundfarbe',
    add_logo: 'Logo hinzufügen',
    batch_generate: 'Stapel generieren',
    scan_result: 'Scan-Ergebnis',
    invalid_qr: 'Ungültiger QR-Code',
    camera_error: 'Kamera-Fehler',
    qr_generated: 'QR-Code generiert',
    qr_downloaded: 'QR-Code heruntergeladen',
    qr_copied: 'QR-Code kopiert',
    enable_camera: 'Kamera aktivieren',
    switch_camera: 'Kamera wechseln'
  },
  'fr-CH': {
    generate_qr: 'Générer le code QR',
    scan_qr: 'Scanner le code QR',
    download_qr: 'Télécharger le code QR',
    print_qr: 'Imprimer le code QR',
    share_qr: 'Partager le code QR',
    copy_qr: 'Copier le code QR',
    customize_qr: 'Personnaliser le code QR',
    qr_content: 'Contenu du code QR',
    error_correction: 'Correction d\'erreur',
    qr_size: 'Taille du code QR',
    qr_format: 'Format du code QR',
    foreground_color: 'Couleur de premier plan',
    background_color: 'Couleur d\'arrière-plan',
    add_logo: 'Ajouter un logo',
    batch_generate: 'Génération par lots',
    scan_result: 'Résultat du scan',
    invalid_qr: 'Code QR invalide',
    camera_error: 'Erreur de caméra',
    qr_generated: 'Code QR généré',
    qr_downloaded: 'Code QR téléchargé',
    qr_copied: 'Code QR copié',
    enable_camera: 'Activer la caméra',
    switch_camera: 'Changer de caméra'
  },
  'it-CH': {
    generate_qr: 'Genera codice QR',
    scan_qr: 'Scansiona codice QR',
    download_qr: 'Scarica codice QR',
    print_qr: 'Stampa codice QR',
    share_qr: 'Condividi codice QR',
    copy_qr: 'Copia codice QR',
    customize_qr: 'Personalizza codice QR',
    qr_content: 'Contenuto codice QR',
    error_correction: 'Correzione errori',
    qr_size: 'Dimensione codice QR',
    qr_format: 'Formato codice QR',
    foreground_color: 'Colore primo piano',
    background_color: 'Colore sfondo',
    add_logo: 'Aggiungi logo',
    batch_generate: 'Generazione batch',
    scan_result: 'Risultato scansione',
    invalid_qr: 'Codice QR non valido',
    camera_error: 'Errore fotocamera',
    qr_generated: 'Codice QR generato',
    qr_downloaded: 'Codice QR scaricato',
    qr_copied: 'Codice QR copiato',
    enable_camera: 'Attiva fotocamera',
    switch_camera: 'Cambia fotocamera'
  },
  'en-US': {
    generate_qr: 'Generate QR Code',
    scan_qr: 'Scan QR Code',
    download_qr: 'Download QR Code',
    print_qr: 'Print QR Code',
    share_qr: 'Share QR Code',
    copy_qr: 'Copy QR Code',
    customize_qr: 'Customize QR Code',
    qr_content: 'QR Code Content',
    error_correction: 'Error Correction',
    qr_size: 'QR Code Size',
    qr_format: 'QR Code Format',
    foreground_color: 'Foreground Color',
    background_color: 'Background Color',
    add_logo: 'Add Logo',
    batch_generate: 'Batch Generate',
    scan_result: 'Scan Result',
    invalid_qr: 'Invalid QR Code',
    camera_error: 'Camera Error',
    qr_generated: 'QR Code Generated',
    qr_downloaded: 'QR Code Downloaded',
    qr_copied: 'QR Code Copied',
    enable_camera: 'Enable Camera',
    switch_camera: 'Switch Camera'
  }
};

const DEFAULT_QR_SETTINGS = {
  size: QR_SIZES.MEDIUM.size,
  errorCorrectionLevel: 'M',
  foregroundColor: '#000000',
  backgroundColor: '#FFFFFF',
  includeMargin: true,
  marginSize: 4,
  enableLogo: false,
  logoSize: 64,
  logoMargin: 8,
  borderRadius: 0,
  enableBranding: true,
  enableTracking: true
};

// ============================================================================
// LOADING COMPONENT
// ============================================================================

const LoadingSpinner = ({ size = 24, message }) => (
  <div className={styles.loadingContainer}>
    <div className={styles.spinner} style={{ width: size, height: size }} />
    {message && <span className={styles.loadingMessage}>{message}</span>}
  </div>
);

// ============================================================================
// QR GENERATOR COMPONENT
// ============================================================================

const QRGenerator = ({ 
  content, 
  settings, 
  onGenerated, 
  onError,
  className = '' 
}) => {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef(null);

  const generateQR = useCallback(async () => {
    if (!content) return;

    setIsGenerating(true);

    try {
      const options = {
        errorCorrectionLevel: settings.errorCorrectionLevel,
        type: 'image/png',
        quality: 0.92,
        margin: settings.includeMargin ? settings.marginSize : 0,
        color: {
          dark: settings.foregroundColor,
          light: settings.backgroundColor
        },
        width: settings.size
      };

      const dataUrl = await QRCodeLib.toDataURL(content, options);
      setQrDataUrl(dataUrl);
      onGenerated?.(dataUrl);

    } catch (error) {
      console.error('QR generation failed:', error);
      onError?.(error);
    } finally {
      setIsGenerating(false);
    }
  }, [content, settings, onGenerated, onError]);

  useEffect(() => {
    generateQR();
  }, [generateQR]);

  if (isGenerating) {
    return <LoadingSpinner message="Generiere QR-Code..." />;
  }

  if (!qrDataUrl) {
    return null;
  }

  return (
    <div className={`${styles.qrGenerator} ${className}`}>
      <QRCodeCanvas
        ref={canvasRef}
        value={content}
        size={settings.size}
        level={settings.errorCorrectionLevel}
        fgColor={settings.foregroundColor}
        bgColor={settings.backgroundColor}
        includeMargin={settings.includeMargin}
        marginSize={settings.marginSize}
        imageSettings={settings.enableLogo && settings.logoUrl ? {
          src: settings.logoUrl,
          height: settings.logoSize,
          width: settings.logoSize,
          excavate: true
        } : undefined}
      />
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ProductQR = ({
  product,
  qrType = QR_TYPES.PRODUCT,
  mode = 'generate', // 'generate', 'scan', 'both'
  language = 'de-CH',
  settings = {},
  onQRGenerated,
  onQRScanned,
  onError,
  className = '',
  enableCustomization = true,
  enableBatchGeneration = false,
  enableAnalytics = true
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [activeMode, setActiveMode] = useState(mode === 'both' ? 'generate' : mode);
  const [qrContent, setQrContent] = useState('');
  const [qrSettings, setQrSettings] = useState({ ...DEFAULT_QR_SETTINGS, ...settings });
  const [generatedQR, setGeneratedQR] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showBatchGenerator, setShowBatchGenerator] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [cameraPermission, setCameraPermission] = useState('prompt');

  // ============================================================================
  // REFS & CONTEXTS
  // ============================================================================

  const qrRef = useRef(null);
  const downloadLinkRef = useRef(null);

  const { tenant } = useTenant();
  const { user } = useAuth();
  const { trackEvent } = useAnalytics();

  // ============================================================================
  // MEMOIZED VALUES
  // ============================================================================

  const translations = useMemo(() => 
    QR_TRANSLATIONS[language] || QR_TRANSLATIONS['de-CH'], 
    [language]
  );

  const qrContentGenerated = useMemo(() => {
    if (qrContent) return qrContent;

    switch (qrType) {
      case QR_TYPES.PRODUCT:
        return generateProductURL();
      case QR_TYPES.MENU:
        return generateMenuURL();
      case QR_TYPES.PAYMENT:
        return generatePaymentQR();
      case QR_TYPES.CONTACT:
        return generateContactQR();
      case QR_TYPES.WIFI:
        return generateWiFiQR();
      default:
        return generateProductURL();
    }
  }, [qrContent, qrType, product, tenant]);

  // ============================================================================
  // QR CONTENT GENERATORS
  // ============================================================================

  const generateProductURL = useCallback(() => {
    if (!product) return '';

    const baseUrl = window.location.origin;
    const productUrl = `${baseUrl}/${tenant?.slug || 'restaurant'}/product/${product.id}`;
    
    // Add tracking parameters
    const params = new URLSearchParams();
    if (enableAnalytics) {
      params.append('utm_source', 'qr_code');
      params.append('utm_medium', 'offline');
      params.append('utm_campaign', 'product_qr');
      params.append('qr_id', `${product.id}_${Date.now()}`);
    }

    return params.toString() ? `${productUrl}?${params}` : productUrl;
  }, [product, tenant, enableAnalytics]);

  const generateMenuURL = useCallback(() => {
    if (!tenant) return '';

    const baseUrl = window.location.origin;
    const menuUrl = `${baseUrl}/${tenant.slug}/menu`;
    
    // Add tracking parameters
    const params = new URLSearchParams();
    if (enableAnalytics) {
      params.append('utm_source', 'qr_code');
      params.append('utm_medium', 'offline');
      params.append('utm_campaign', 'menu_qr');
      params.append('table', 'unknown'); // Can be customized
    }

    return params.toString() ? `${menuUrl}?${params}` : menuUrl;
  }, [tenant, enableAnalytics]);

  const generatePaymentQR = useCallback(() => {
    if (!product || !tenant) return '';

    // Swiss QR-Bill format
    const qrData = [
      'SPC', // QR Type
      '0200', // Version
      '1', // Coding Type
      tenant.bank?.iban || '', // IBAN
      'K', // Creditor Type
      tenant.name || '',
      tenant.address?.street || '',
      tenant.address?.postal || '',
      tenant.address?.city || '',
      '', // Creditor Country (CH implied)
      '', // Ultimate Creditor
      (product.price || 0).toFixed(2), // Amount
      'CHF', // Currency
      'K', // Debtor Type
      '', // Debtor Name
      '', // Debtor Street
      '', // Debtor Postal
      '', // Debtor City
      '', // Debtor Country
      'QRR', // Reference Type
      `RF${product.id}${Date.now()}`, // Reference
      `Payment for ${product.name}`, // Additional Information
      'EPD', // Trailer
      // Structured bill information
      `//S1/10/${product.id}`, // Product ID
      `//S1/11/${product.name}` // Product Name
    ];

    return qrData.join('\r\n');
  }, [product, tenant]);

  const generateContactQR = useCallback(() => {
    if (!tenant) return '';

    // vCard format
    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${tenant.name}`,
      `ORG:${tenant.name}`,
      tenant.phone ? `TEL:${tenant.phone}` : '',
      tenant.email ? `EMAIL:${tenant.email}` : '',
      tenant.website ? `URL:${tenant.website}` : '',
      tenant.address ? `ADR:;;${tenant.address.street};${tenant.address.city};;${tenant.address.postal};Switzerland` : '',
      'END:VCARD'
    ].filter(line => line !== '');

    return vcard.join('\n');
  }, [tenant]);

  const generateWiFiQR = useCallback(() => {
    const wifiConfig = tenant?.wifi;
    if (!wifiConfig) return '';

    // WiFi QR format: WIFI:T:WPA;S:mynetwork;P:mypass;H:;;
    return `WIFI:T:${wifiConfig.security || 'WPA'};S:${wifiConfig.ssid};P:${wifiConfig.password || ''};H:${wifiConfig.hidden ? 'true' : ''};`;
  }, [tenant]);

  // ============================================================================
  // QR OPERATIONS
  // ============================================================================

  const handleQRGenerated = useCallback((dataUrl) => {
    setGeneratedQR(dataUrl);
    setError(null);

    if (enableAnalytics) {
      trackEvent('qr_code_generated', {
        type: qrType,
        productId: product?.id,
        size: qrSettings.size,
        format: 'png'
      });
    }

    onQRGenerated?.(dataUrl, qrContentGenerated);
  }, [qrType, product, qrSettings, enableAnalytics, trackEvent, onQRGenerated, qrContentGenerated]);

  const handleQRError = useCallback((error) => {
    setError(error.message);
    onError?.(error);

    if (enableAnalytics) {
      trackEvent('qr_code_error', {
        type: qrType,
        error: error.message,
        source: 'generation'
      });
    }
  }, [qrType, enableAnalytics, trackEvent, onError]);

  const handleDownload = useCallback(async (format = QR_FORMATS.PNG) => {
    if (!generatedQR) return;

    try {
      setIsProcessing(true);

      let dataUrl = generatedQR;
      let filename = `${product?.name || 'qr-code'}_${Date.now()}`;

      if (format === QR_FORMATS.SVG) {
        // Generate SVG version
        const svgString = await QRCodeLib.toString(qrContentGenerated, { type: 'svg' });
        dataUrl = `data:image/svg+xml;base64,${btoa(svgString)}`;
        filename += '.svg';
      } else {
        filename += `.${format}`;
      }

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (enableAnalytics) {
        trackEvent('qr_code_downloaded', {
          type: qrType,
          format,
          productId: product?.id,
          size: qrSettings.size
        });
      }

    } catch (error) {
      console.error('Download failed:', error);
      setError('Download fehlgeschlagen');
    } finally {
      setIsProcessing(false);
    }
  }, [generatedQR, product, qrContentGenerated, qrType, qrSettings, enableAnalytics, trackEvent]);

  const handleCopy = useCallback(async () => {
    if (!generatedQR) return;

    try {
      // Convert data URL to blob
      const response = await fetch(generatedQR);
      const blob = await response.blob();

      // Copy to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);

      if (enableAnalytics) {
        trackEvent('qr_code_copied', {
          type: qrType,
          productId: product?.id
        });
      }

    } catch (error) {
      console.error('Copy failed:', error);
      setError('Kopieren fehlgeschlagen');
    }
  }, [generatedQR, qrType, product, enableAnalytics, trackEvent]);

  const handleShare = useCallback(async () => {
    if (!generatedQR || !navigator.share) return;

    try {
      const response = await fetch(generatedQR);
      const blob = await response.blob();
      const file = new File([blob], `${product?.name || 'qr-code'}.png`, { type: 'image/png' });

      await navigator.share({
        title: `QR Code - ${product?.name || 'Product'}`,
        text: `Scan this QR code to view ${product?.name || 'this product'}`,
        files: [file]
      });

      if (enableAnalytics) {
        trackEvent('qr_code_shared', {
          type: qrType,
          productId: product?.id,
          method: 'native'
        });
      }

    } catch (error) {
      console.error('Share failed:', error);
      setError('Teilen fehlgeschlagen');
    }
  }, [generatedQR, product, qrType, enableAnalytics, trackEvent]);

  const handlePrint = useCallback(() => {
    setShowPrintPreview(true);

    if (enableAnalytics) {
      trackEvent('qr_code_print_preview', {
        type: qrType,
        productId: product?.id
      });
    }
  }, [qrType, product, enableAnalytics, trackEvent]);

  // ============================================================================
  // QR SCANNING
  // ============================================================================

  const handleScanResult = useCallback((result) => {
    setScanResult(result);
    setShowScanner(false);

    if (enableAnalytics) {
      trackEvent('qr_code_scanned', {
        type: 'scan',
        contentLength: result.data?.length || 0,
        source: 'camera'
      });
    }

    onQRScanned?.(result);
  }, [enableAnalytics, trackEvent, onQRScanned]);

  const handleScanError = useCallback((error) => {
    setError(error.message);
    
    if (enableAnalytics) {
      trackEvent('qr_scan_error', {
        error: error.message,
        source: 'camera'
      });
    }
  }, [enableAnalytics, trackEvent]);

  // ============================================================================
  // CAMERA PERMISSION
  // ============================================================================

  const requestCameraPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setCameraPermission('granted');
      return true;
    } catch (error) {
      setCameraPermission('denied');
      setError('Kamera-Zugriff verweigert');
      return false;
    }
  }, []);

  // ============================================================================
  // RENDER METHODS
  // ============================================================================

  const renderModeSelector = () => {
    if (mode !== 'both') return null;

    return (
      <div className={styles.modeSelector}>
        <button
          className={`${styles.modeButton} ${activeMode === 'generate' ? styles.active : ''}`}
          onClick={() => setActiveMode('generate')}
        >
          <QrCode size={16} />
          {translations.generate_qr}
        </button>
        <button
          className={`${styles.modeButton} ${activeMode === 'scan' ? styles.active : ''}`}
          onClick={() => setActiveMode('scan')}
        >
          <Camera size={16} />
          {translations.scan_qr}
        </button>
      </div>
    );
  };

  const renderQRGenerator = () => {
    if (activeMode !== 'generate') return null;

    return (
      <div className={styles.qrGeneratorSection}>
        {/* QR Code Display */}
        <div className={styles.qrDisplay}>
          {qrContentGenerated ? (
            <QRGenerator
              content={qrContentGenerated}
              settings={qrSettings}
              onGenerated={handleQRGenerated}
              onError={handleQRError}
            />
          ) : (
            <div className={styles.qrPlaceholder}>
              <QrCode size={64} />
              <span>Kein Inhalt verfügbar</span>
            </div>
          )}
        </div>

        {/* QR Actions */}
        {generatedQR && (
          <div className={styles.qrActions}>
            <button
              className={styles.actionButton}
              onClick={() => handleDownload(QR_FORMATS.PNG)}
              disabled={isProcessing}
              title={translations.download_qr}
            >
              <Download size={16} />
              Download
            </button>

            <button
              className={styles.actionButton}
              onClick={handleCopy}
              title={translations.copy_qr}
            >
              <Copy size={16} />
              Copy
            </button>

            {navigator.share && (
              <button
                className={styles.actionButton}
                onClick={handleShare}
                title={translations.share_qr}
              >
                <Share2 size={16} />
                Share
              </button>
            )}

            <button
              className={styles.actionButton}
              onClick={handlePrint}
              title={translations.print_qr}
            >
              <Printer size={16} />
              Print
            </button>

            {enableCustomization && (
              <button
                className={styles.actionButton}
                onClick={() => setShowCustomizer(true)}
                title={translations.customize_qr}
              >
                <Palette size={16} />
                Customize
              </button>
            )}
          </div>
        )}

        {/* QR Settings Quick Controls */}
        <div className={styles.quickControls}>
          <div className={styles.controlGroup}>
            <label>Size:</label>
            <select
              value={qrSettings.size}
              onChange={(e) => setQrSettings(prev => ({ ...prev, size: parseInt(e.target.value) }))}
            >
              {Object.entries(QR_SIZES).map(([key, config]) => (
                <option key={key} value={config.size}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.controlGroup}>
            <label>Error Correction:</label>
            <select
              value={qrSettings.errorCorrectionLevel}
              onChange={(e) => setQrSettings(prev => ({ ...prev, errorCorrectionLevel: e.target.value }))}
            >
              {Object.entries(ERROR_CORRECTION_LEVELS).map(([key, config]) => (
                <option key={key} value={config.level}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  };

  const renderQRScanner = () => {
    if (activeMode !== 'scan') return null;

    return (
      <div className={styles.qrScannerSection}>
        {cameraPermission === 'prompt' && (
          <div className={styles.permissionPrompt}>
            <Camera size={48} />
            <h3>Kamera-Zugriff erforderlich</h3>
            <p>Um QR-Codes zu scannen, benötigen wir Zugriff auf Ihre Kamera.</p>
            <button
              className={styles.permissionButton}
              onClick={requestCameraPermission}
            >
              {translations.enable_camera}
            </button>
          </div>
        )}

        {cameraPermission === 'denied' && (
          <div className={styles.permissionDenied}>
            <AlertCircle size={48} />
            <h3>Kamera-Zugriff verweigert</h3>
            <p>Bitte aktivieren Sie den Kamera-Zugriff in Ihren Browser-Einstellungen.</p>
          </div>
        )}

        {cameraPermission === 'granted' && (
          <div className={styles.scannerContainer}>
            <button
              className={styles.scanButton}
              onClick={() => setShowScanner(true)}
            >
              <Camera size={24} />
              {translations.scan_qr}
            </button>

            {scanResult && (
              <div className={styles.scanResult}>
                <h4>{translations.scan_result}:</h4>
                <div className={styles.scanData}>
                  {scanResult.data}
                </div>
                <div className={styles.scanActions}>
                  <button
                    onClick={() => setScanResult(null)}
                    className={styles.clearButton}
                  >
                    <X size={16} />
                    Clear
                  </button>
                  {scanResult.data.startsWith('http') && (
                    <button
                      onClick={() => window.open(scanResult.data, '_blank')}
                      className={styles.openButton}
                    >
                      <ExternalLink size={16} />
                      Open
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className={`${styles.productQR} ${className}`}>
      {/* Header */}
      <div className={styles.qrHeader}>
        <h3>
          <QrCode size={20} />
          QR Code Manager
        </h3>
        
        {enableBatchGeneration && (
          <button
            className={styles.batchButton}
            onClick={() => setShowBatchGenerator(true)}
          >
            <Grid size={16} />
            {translations.batch_generate}
          </button>
        )}
      </div>

      {/* Mode Selector */}
      {renderModeSelector()}

      {/* Error Display */}
      {error && (
        <div className={styles.errorMessage}>
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Content */}
      <div className={styles.qrContent}>
        {renderQRGenerator()}
        {renderQRScanner()}
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <Suspense fallback={<LoadingSpinner />}>
          <QRScanner
            isOpen={showScanner}
            onClose={() => setShowScanner(false)}
            onResult={handleScanResult}
            onError={handleScanError}
            language={language}
          />
        </Suspense>
      )}

      {/* QR Customizer Modal */}
      {showCustomizer && (
        <Suspense fallback={<LoadingSpinner />}>
          <QRCustomizer
            isOpen={showCustomizer}
            onClose={() => setShowCustomizer(false)}
            settings={qrSettings}
            onSettingsChange={setQrSettings}
            content={qrContentGenerated}
            tenant={tenant}
            language={language}
          />
        </Suspense>
      )}

      {/* Batch Generator Modal */}
      {showBatchGenerator && (
        <Suspense fallback={<LoadingSpinner />}>
          <QRBatchGenerator
            isOpen={showBatchGenerator}
            onClose={() => setShowBatchGenerator(false)}
            products={[product]}
            settings={qrSettings}
            tenant={tenant}
            language={language}
          />
        </Suspense>
      )}

      {/* Print Preview Modal */}
      {showPrintPreview && (
        <Suspense fallback={<LoadingSpinner />}>
          <QRPrintPreview
            isOpen={showPrintPreview}
            onClose={() => setShowPrintPreview(false)}
            qrCode={generatedQR}
            product={product}
            settings={qrSettings}
            language={language}
          />
        </Suspense>
      )}

      {/* Analytics Dashboard */}
      {enableAnalytics && process.env.NODE_ENV === 'development' && (
        <Suspense fallback={<LoadingSpinner />}>
          <QRAnalytics
            qrType={qrType}
            productId={product?.id}
            language={language}
          />
        </Suspense>
      )}
    </div>
  );
};

export default ProductQR;