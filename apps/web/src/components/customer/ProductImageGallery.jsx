/**
 * EATECH - Product Image Gallery Component
 * Version: 4.1.0
 * Description: Advanced interactive image gallery with zoom, 360° view, and AR features
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/components/customer/ProductImageGallery.jsx
 * 
 * Features:
 * - Responsive image gallery with thumbnails
 * - Pinch-to-zoom and pan functionality
 * - 360° product rotation view
 * - AR product visualization
 * - Lazy loading with progressive enhancement
 * - Accessibility support with keyboard navigation
 * - Image optimization and WebP support
 * - Fullscreen viewing mode
 * - Social sharing integration
 * - Performance optimized rendering
 */

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useRef, 
  useMemo,
  lazy,
  Suspense,
  useLayoutEffect
} from 'react';
import { 
  ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2,
  ChevronLeft, ChevronRight, Download, Share2,
  Camera, Eye, Layers, Play, Pause,
  AlertCircle, Loader, Heart, Star,
  ArrowLeft, ArrowRight, Grid3X3, List,
  Smartphone, Monitor, Tablet
} from 'lucide-react';
import { useSwipeable } from 'react-swipeable';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import styles from './ProductImageGallery.module.css';

// ============================================================================
// LAZY LOADED COMPONENTS
// ============================================================================

// Image Components
const ImageZoomViewer = lazy(() => import('./ImageZoomViewer'));
const Image360Viewer = lazy(() => import('./Image360Viewer'));
const ARViewer = lazy(() => import('./ARViewer'));
const ImageCarousel = lazy(() => import('./ImageCarousel'));

// Utility Components
const ShareModal = lazy(() => import('./ShareModal'));
const ImageEditor = lazy(() => import('./ImageEditor'));
const ImageComparison = lazy(() => import('./ImageComparison'));

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const GALLERY_MODES = {
  GRID: 'grid',
  CAROUSEL: 'carousel',
  FULLSCREEN: 'fullscreen',
  ZOOM: 'zoom',
  ROTATION_360: '360',
  AR_VIEW: 'ar'
};

const IMAGE_TYPES = {
  MAIN: 'main',
  THUMBNAIL: 'thumbnail',
  DETAIL: 'detail',
  LIFESTYLE: 'lifestyle',
  INGREDIENT: 'ingredient',
  PREPARATION: 'preparation',
  NUTRITION: 'nutrition'
};

const SUPPORTED_FORMATS = ['webp', 'jpg', 'jpeg', 'png', 'avif'];

const DEFAULT_SETTINGS = {
  autoplay: false,
  autoplayInterval: 3000,
  showThumbnails: true,
  showControls: true,
  enableZoom: true,
  enableFullscreen: true,
  enable360: true,
  enableAR: false, // Requires WebXR support
  enableShare: true,
  enableDownload: false,
  maxZoom: 3,
  transitionSpeed: 300,
  lazyLoadOffset: 100,
  imageQuality: 'high'
};

const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  large: 1440
};

// ============================================================================
// LOADING COMPONENT
// ============================================================================

const LoadingSpinner = ({ size = 24, message }) => (
  <div className={styles.loadingContainer}>
    <Loader size={size} className={styles.spinner} />
    {message && <span className={styles.loadingMessage}>{message}</span>}
  </div>
);

// ============================================================================
// IMAGE LOADING HOOK
// ============================================================================

const useImageLoader = (src, options = {}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadedSrc, setLoadedSrc] = useState(null);

  useEffect(() => {
    if (!src) return;

    setLoading(true);
    setError(null);

    const img = new Image();
    
    const handleLoad = () => {
      setLoadedSrc(src);
      setLoading(false);
    };

    const handleError = () => {
      setError(new Error('Failed to load image'));
      setLoading(false);
    };

    img.onload = handleLoad;
    img.onerror = handleError;
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return { loading, error, src: loadedSrc };
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ProductImageGallery = ({
  product,
  images = [],
  settings = {},
  onImageSelect,
  onModeChange,
  onShare,
  onDownload,
  className = '',
  autoHeight = false,
  showBadges = true,
  enableAnalytics = true
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentMode, setCurrentMode] = useState(GALLERY_MODES.GRID);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [autoplayActive, setAutoplayActive] = useState(false);
  const [touchStartDistance, setTouchStartDistance] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [deviceType, setDeviceType] = useState('desktop');
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [preloadQueue, setPreloadQueue] = useState([]);

  // ============================================================================
  // REFS & CONTEXTS
  // ============================================================================

  const galleryRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const autoplayTimer = useRef(null);
  const touchStart = useRef({ x: 0, y: 0 });
  const lastPanPoint = useRef({ x: 0, y: 0 });
  const animationFrame = useRef(null);

  const { tenant } = useTenant();
  const { user } = useAuth();

  // ============================================================================
  // MEMOIZED VALUES
  // ============================================================================

  const gallerySettings = useMemo(() => ({
    ...DEFAULT_SETTINGS,
    ...settings
  }), [settings]);

  const processedImages = useMemo(() => {
    if (!images || images.length === 0) {
      return [{
        id: 'placeholder',
        src: '/images/placeholder-food.jpg',
        alt: product?.name || 'Product image',
        type: IMAGE_TYPES.MAIN,
        width: 800,
        height: 600
      }];
    }

    return images.map((img, index) => ({
      id: img.id || `image-${index}`,
      src: img.src || img.url,
      alt: img.alt || `${product?.name} - Image ${index + 1}`,
      type: img.type || IMAGE_TYPES.MAIN,
      width: img.width || 800,
      height: img.height || 600,
      thumbnail: img.thumbnail || generateThumbnailUrl(img.src || img.url),
      srcSet: img.srcSet || generateSrcSet(img.src || img.url),
      caption: img.caption,
      badges: img.badges || []
    }));
  }, [images, product?.name]);

  const currentImage = useMemo(() => 
    processedImages[currentIndex] || processedImages[0], 
    [processedImages, currentIndex]
  );

  const thumbnailImages = useMemo(() => 
    processedImages.filter(img => img.type !== IMAGE_TYPES.NUTRITION),
    [processedImages]
  );

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const generateThumbnailUrl = useCallback((url) => {
    if (!url) return '';
    const baseUrl = url.split('?')[0];
    const extension = baseUrl.split('.').pop();
    return `${baseUrl.replace(`.${extension}`, `_thumb.${extension}`)}`;
  }, []);

  const generateSrcSet = useCallback((url) => {
    if (!url) return '';
    const baseUrl = url.split('?')[0];
    const extension = baseUrl.split('.').pop();
    
    return [
      `${baseUrl.replace(`.${extension}`, `_400.${extension}`)} 400w`,
      `${baseUrl.replace(`.${extension}`, `_800.${extension}`)} 800w`,
      `${baseUrl.replace(`.${extension}`, `_1200.${extension}`)} 1200w`,
      `${baseUrl.replace(`.${extension}`, `_1600.${extension}`)} 1600w`
    ].join(', ');
  }, []);

  const detectDeviceType = useCallback(() => {
    const width = window.innerWidth;
    if (width <= BREAKPOINTS.mobile) return 'mobile';
    if (width <= BREAKPOINTS.tablet) return 'tablet';
    return 'desktop';
  }, []);

  const preloadImage = useCallback((src) => {
    if (loadedImages.has(src)) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        setLoadedImages(prev => new Set([...prev, src]));
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  }, [loadedImages]);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  useEffect(() => {
    const handleResize = () => {
      setDeviceType(detectDeviceType());
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    const handleKeyDown = (e) => {
      if (!isFullscreen) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          navigatePrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigateNext();
          break;
        case 'Escape':
          e.preventDefault();
          exitFullscreen();
          break;
        case '+':
        case '=':
          e.preventDefault();
          zoomIn();
          break;
        case '-':
          e.preventDefault();
          zoomOut();
          break;
        case '0':
          e.preventDefault();
          resetZoom();
          break;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);

    // Preload first few images
    const preloadImages = async () => {
      const imagesToPreload = processedImages.slice(0, 3);
      for (const img of imagesToPreload) {
        try {
          await preloadImage(img.src);
        } catch (error) {
          console.warn('Failed to preload image:', img.src);
        }
      }
    };

    preloadImages();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      if (autoplayTimer.current) {
        clearInterval(autoplayTimer.current);
      }
    };
  }, []);

  // ============================================================================
  // AUTOPLAY FUNCTIONALITY
  // ============================================================================

  useEffect(() => {
    if (autoplayActive && gallerySettings.autoplay) {
      autoplayTimer.current = setInterval(() => {
        setCurrentIndex(prev => 
          prev >= processedImages.length - 1 ? 0 : prev + 1
        );
      }, gallerySettings.autoplayInterval);
    } else {
      if (autoplayTimer.current) {
        clearInterval(autoplayTimer.current);
      }
    }

    return () => {
      if (autoplayTimer.current) {
        clearInterval(autoplayTimer.current);
      }
    };
  }, [autoplayActive, gallerySettings.autoplay, gallerySettings.autoplayInterval, processedImages.length]);

  // ============================================================================
  // IMAGE NAVIGATION
  // ============================================================================

  const navigateNext = useCallback(() => {
    setCurrentIndex(prev => 
      prev >= processedImages.length - 1 ? 0 : prev + 1
    );
    
    // Preload next image
    const nextIndex = (currentIndex + 1) % processedImages.length;
    const nextImage = processedImages[nextIndex + 1];
    if (nextImage && !loadedImages.has(nextImage.src)) {
      preloadImage(nextImage.src);
    }
  }, [currentIndex, processedImages, loadedImages, preloadImage]);

  const navigatePrevious = useCallback(() => {
    setCurrentIndex(prev => 
      prev <= 0 ? processedImages.length - 1 : prev - 1
    );
  }, [processedImages.length]);

  const navigateToIndex = useCallback((index) => {
    if (index >= 0 && index < processedImages.length) {
      setCurrentIndex(index);
      onImageSelect?.(processedImages[index], index);
    }
  }, [processedImages, onImageSelect]);

  // ============================================================================
  // ZOOM FUNCTIONALITY
  // ============================================================================

  const zoomIn = useCallback(() => {
    if (zoomLevel < gallerySettings.maxZoom) {
      setZoomLevel(prev => Math.min(prev + 0.5, gallerySettings.maxZoom));
    }
  }, [zoomLevel, gallerySettings.maxZoom]);

  const zoomOut = useCallback(() => {
    if (zoomLevel > 1) {
      setZoomLevel(prev => Math.max(prev - 0.5, 1));
      if (zoomLevel <= 1.5) {
        setPanPosition({ x: 0, y: 0 });
      }
    }
  }, [zoomLevel]);

  const resetZoom = useCallback(() => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  }, []);

  // ============================================================================
  // PAN FUNCTIONALITY
  // ============================================================================

  const handlePanStart = useCallback((e) => {
    if (zoomLevel <= 1) return;
    
    setIsPanning(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    touchStart.current = { x: clientX, y: clientY };
    lastPanPoint.current = panPosition;
  }, [zoomLevel, panPosition]);

  const handlePanMove = useCallback((e) => {
    if (!isPanning || zoomLevel <= 1) return;
    
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - touchStart.current.x;
    const deltaY = clientY - touchStart.current.y;
    
    const maxPanX = (containerRef.current?.offsetWidth || 0) * (zoomLevel - 1) / 2;
    const maxPanY = (containerRef.current?.offsetHeight || 0) * (zoomLevel - 1) / 2;
    
    const newX = Math.max(-maxPanX, Math.min(maxPanX, lastPanPoint.current.x + deltaX));
    const newY = Math.max(-maxPanY, Math.min(maxPanY, lastPanPoint.current.y + deltaY));
    
    setPanPosition({ x: newX, y: newY });
  }, [isPanning, zoomLevel]);

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // ============================================================================
  // TOUCH HANDLERS
  // ============================================================================

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      // Pinch to zoom
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchStartDistance(distance);
      setIsZooming(true);
    } else if (e.touches.length === 1) {
      handlePanStart(e);
    }
  }, [handlePanStart]);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && isZooming) {
      e.preventDefault();
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      
      const scale = distance / touchStartDistance;
      const newZoom = Math.max(1, Math.min(gallerySettings.maxZoom, zoomLevel * scale));
      setZoomLevel(newZoom);
    } else if (e.touches.length === 1) {
      handlePanMove(e);
    }
  }, [isZooming, touchStartDistance, zoomLevel, gallerySettings.maxZoom, handlePanMove]);

  const handleTouchEnd = useCallback((e) => {
    if (e.touches.length === 0) {
      setIsZooming(false);
      handlePanEnd();
    }
  }, [handlePanEnd]);

  // ============================================================================
  // SWIPE HANDLERS
  // ============================================================================

  const swipeHandlers = useSwipeable({
    onSwipedLeft: navigateNext,
    onSwipedRight: navigatePrevious,
    preventDefaultTouchmoveEvent: true,
    trackMouse: true
  });

  // ============================================================================
  // FULLSCREEN FUNCTIONALITY
  // ============================================================================

  const enterFullscreen = useCallback(() => {
    if (galleryRef.current?.requestFullscreen) {
      galleryRef.current.requestFullscreen();
      setIsFullscreen(true);
      setCurrentMode(GALLERY_MODES.FULLSCREEN);
      onModeChange?.(GALLERY_MODES.FULLSCREEN);
    }
  }, [onModeChange]);

  const exitFullscreen = useCallback(() => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
    setIsFullscreen(false);
    setCurrentMode(GALLERY_MODES.GRID);
    resetZoom();
    onModeChange?.(GALLERY_MODES.GRID);
  }, [onModeChange, resetZoom]);

  // ============================================================================
  // SHARE FUNCTIONALITY
  // ============================================================================

  const handleShare = useCallback(async () => {
    if (navigator.share && currentImage) {
      try {
        await navigator.share({
          title: product?.name || 'Product Image',
          text: `Check out this image of ${product?.name}`,
          url: currentImage.src
        });
      } catch (error) {
        console.log('Share failed:', error);
        setShowShareModal(true);
      }
    } else {
      setShowShareModal(true);
    }
    
    onShare?.(currentImage, currentIndex);
  }, [currentImage, product?.name, currentIndex, onShare]);

  // ============================================================================
  // DOWNLOAD FUNCTIONALITY
  // ============================================================================

  const handleDownload = useCallback(async () => {
    if (!currentImage?.src) return;

    try {
      const response = await fetch(currentImage.src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${product?.name || 'product'}-image-${currentIndex + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      onDownload?.(currentImage, currentIndex);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }, [currentImage, product?.name, currentIndex, onDownload]);

  // ============================================================================
  // MODE SWITCHING
  // ============================================================================

  const switchMode = useCallback((mode) => {
    setCurrentMode(mode);
    resetZoom();
    onModeChange?.(mode);
  }, [onModeChange, resetZoom]);

  // ============================================================================
  // RENDER METHODS
  // ============================================================================

  const renderThumbnails = () => {
    if (!gallerySettings.showThumbnails || currentMode === GALLERY_MODES.FULLSCREEN) {
      return null;
    }

    return (
      <div className={styles.thumbnailContainer}>
        <div className={styles.thumbnailScroll}>
          {thumbnailImages.map((image, index) => (
            <button
              key={image.id}
              className={`${styles.thumbnail} ${index === currentIndex ? styles.active : ''}`}
              onClick={() => navigateToIndex(index)}
              aria-label={`View image ${index + 1}: ${image.alt}`}
            >
              <img
                src={image.thumbnail}
                alt={image.alt}
                loading="lazy"
                className={styles.thumbnailImage}
                onError={(e) => {
                  e.target.src = '/images/placeholder-food.jpg';
                }}
              />
              {image.badges && image.badges.length > 0 && (
                <div className={styles.thumbnailBadges}>
                  {image.badges.map((badge, badgeIndex) => (
                    <span key={badgeIndex} className={`${styles.badge} ${styles[badge.type]}`}>
                      {badge.text}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderControls = () => {
    if (!gallerySettings.showControls) return null;

    return (
      <div className={styles.controls}>
        {/* Navigation Controls */}
        <div className={styles.navigationControls}>
          <button
            className={styles.navButton}
            onClick={navigatePrevious}
            disabled={processedImages.length <= 1}
            aria-label="Previous image"
          >
            <ChevronLeft size={20} />
          </button>
          
          <span className={styles.imageCounter}>
            {currentIndex + 1} / {processedImages.length}
          </span>
          
          <button
            className={styles.navButton}
            onClick={navigateNext}
            disabled={processedImages.length <= 1}
            aria-label="Next image"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Zoom Controls */}
        {gallerySettings.enableZoom && (
          <div className={styles.zoomControls}>
            <button
              className={styles.controlButton}
              onClick={zoomOut}
              disabled={zoomLevel <= 1}
              aria-label="Zoom out"
            >
              <ZoomOut size={18} />
            </button>
            
            <span className={styles.zoomLevel}>
              {Math.round(zoomLevel * 100)}%
            </span>
            
            <button
              className={styles.controlButton}
              onClick={zoomIn}
              disabled={zoomLevel >= gallerySettings.maxZoom}
              aria-label="Zoom in"
            >
              <ZoomIn size={18} />
            </button>
          </div>
        )}

        {/* Action Controls */}
        <div className={styles.actionControls}>
          {/* Autoplay Toggle */}
          <button
            className={`${styles.controlButton} ${autoplayActive ? styles.active : ''}`}
            onClick={() => setAutoplayActive(!autoplayActive)}
            aria-label={autoplayActive ? 'Stop autoplay' : 'Start autoplay'}
          >
            {autoplayActive ? <Pause size={18} /> : <Play size={18} />}
          </button>

          {/* 360° View */}
          {gallerySettings.enable360 && currentImage?.type === IMAGE_TYPES.MAIN && (
            <button
              className={`${styles.controlButton} ${currentMode === GALLERY_MODES.ROTATION_360 ? styles.active : ''}`}
              onClick={() => switchMode(
                currentMode === GALLERY_MODES.ROTATION_360 
                  ? GALLERY_MODES.GRID 
                  : GALLERY_MODES.ROTATION_360
              )}
              aria-label="360° view"
            >
              <RotateCw size={18} />
            </button>
          )}

          {/* Fullscreen Toggle */}
          {gallerySettings.enableFullscreen && (
            <button
              className={styles.controlButton}
              onClick={isFullscreen ? exitFullscreen : enterFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          )}

          {/* Share Button */}
          {gallerySettings.enableShare && (
            <button
              className={styles.controlButton}
              onClick={handleShare}
              aria-label="Share image"
            >
              <Share2 size={18} />
            </button>
          )}

          {/* Download Button */}
          {gallerySettings.enableDownload && (
            <button
              className={styles.controlButton}
              onClick={handleDownload}
              aria-label="Download image"
            >
              <Download size={18} />
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderMainImage = () => {
    const imageStyle = {
      transform: `scale(${zoomLevel}) translate(${panPosition.x}px, ${panPosition.y}px) rotate(${rotation}deg)`,
      transition: isPanning || isZooming ? 'none' : `transform ${gallerySettings.transitionSpeed}ms ease-out`
    };

    return (
      <div 
        className={styles.mainImageContainer}
        ref={containerRef}
        {...swipeHandlers}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
      >
        <Suspense fallback={<LoadingSpinner message="Loading image..." />}>
          <img
            ref={imageRef}
            src={currentImage.src}
            srcSet={currentImage.srcSet}
            alt={currentImage.alt}
            className={styles.mainImage}
            style={imageStyle}
            draggable={false}
            loading="eager"
            onError={(e) => {
              e.target.src = '/images/placeholder-food.jpg';
            }}
          />
        </Suspense>

        {/* Image Badges */}
        {showBadges && currentImage.badges && currentImage.badges.length > 0 && (
          <div className={styles.imageBadges}>
            {currentImage.badges.map((badge, index) => (
              <span key={index} className={`${styles.badge} ${styles[badge.type]}`}>
                {badge.text}
              </span>
            ))}
          </div>
        )}

        {/* Loading Overlay */}
        {!loadedImages.has(currentImage.src) && (
          <div className={styles.loadingOverlay}>
            <LoadingSpinner size={32} />
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div 
      ref={galleryRef}
      className={`${styles.productImageGallery} ${className}`}
      data-mode={currentMode}
      data-device={deviceType}
      data-fullscreen={isFullscreen}
      style={{
        height: autoHeight ? 'auto' : undefined
      }}
    >
      {/* Main Content Area */}
      <div className={styles.galleryContent}>
        {/* Specialized Views */}
        {currentMode === GALLERY_MODES.ROTATION_360 ? (
          <Suspense fallback={<LoadingSpinner message="Loading 360° view..." />}>
            <Image360Viewer
              images={processedImages.filter(img => img.type === IMAGE_TYPES.MAIN)}
              onClose={() => switchMode(GALLERY_MODES.GRID)}
            />
          </Suspense>
        ) : currentMode === GALLERY_MODES.AR_VIEW ? (
          <Suspense fallback={<LoadingSpinner message="Loading AR view..." />}>
            <ARViewer
              product={product}
              image={currentImage}
              onClose={() => switchMode(GALLERY_MODES.GRID)}
            />
          </Suspense>
        ) : (
          /* Standard Image Display */
          renderMainImage()
        )}

        {/* Image Caption */}
        {currentImage.caption && (
          <div className={styles.imageCaption}>
            {currentImage.caption}
          </div>
        )}
      </div>

      {/* Controls */}
      {renderControls()}

      {/* Thumbnails */}
      {renderThumbnails()}

      {/* Share Modal */}
      {showShareModal && (
        <Suspense fallback={<LoadingSpinner />}>
          <ShareModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            image={currentImage}
            product={product}
          />
        </Suspense>
      )}

      {/* Error State */}
      {processedImages.length === 0 && (
        <div className={styles.errorState}>
          <AlertCircle size={48} />
          <p>No images available</p>
        </div>
      )}
    </div>
  );
};

export default ProductImageGallery;