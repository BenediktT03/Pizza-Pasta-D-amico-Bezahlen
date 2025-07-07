// ============================================================================
// EATECH V3.0 - ADVANCED ANIMATION & MICRO-INTERACTIONS LIBRARY
// ============================================================================
// File: /apps/web/src/utils/animations.js
// Type: Complete Animation System & Micro-interactions
// Swiss Focus: Subtle elegance, Performance optimization, Accessibility
// Features: Spring physics, Gesture animations, Performance monitoring
// ============================================================================

// ============================================================================
// IMPORTS & DEPENDENCIES
// ============================================================================

// Performance monitoring
import { measurePerformance } from './performanceUtils';

// Accessibility
import { getReducedMotionPreference, announceToScreenReader } from './accessibilityUtils';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

// Swiss Animation Principles (Subtle, Elegant, Purposeful)
export const SWISS_ANIMATION_PRINCIPLES = {
  duration: {
    micro: 150,      // Button hover, small interactions
    short: 250,      // Card animations, transitions
    medium: 350,     // Modal open/close, page transitions
    long: 500,       // Complex animations, loading states
    extended: 800    // Hero animations, special effects
  },
  
  easing: {
    // Swiss precision-inspired easing curves
    swift: 'cubic-bezier(0.4, 0.0, 0.2, 1)',           // Material design inspired
    precision: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // Swiss watch precision
    elegant: 'cubic-bezier(0.165, 0.84, 0.44, 1)',     // Elegant, smooth
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',  // Subtle bounce
    anticipation: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)' // Anticipation effect
  },
  
  spring: {
    // Spring physics for natural motion
    gentle: { tension: 120, friction: 14 },
    snappy: { tension: 180, friction: 12 },
    bouncy: { tension: 200, friction: 8 },
    wobbly: { tension: 180, friction: 6 }
  }
};

// Animation Categories
export const ANIMATION_TYPES = {
  // Entry animations
  FADE_IN: 'fadeIn',
  SLIDE_IN: 'slideIn',
  SCALE_IN: 'scaleIn',
  SLIDE_DOWN: 'slideDown',
  SLIDE_UP: 'slideUp',
  
  // Exit animations
  FADE_OUT: 'fadeOut',
  SLIDE_OUT: 'slideOut',
  SCALE_OUT: 'scaleOut',
  
  // Loading animations
  PULSE: 'pulse',
  SHIMMER: 'shimmer',
  SKELETON: 'skeleton',
  SPINNER: 'spinner',
  
  // Micro-interactions
  HOVER_LIFT: 'hoverLift',
  BUTTON_PRESS: 'buttonPress',
  HEART_BEAT: 'heartBeat',
  SHAKE: 'shake',
  WOBBLE: 'wobble',
  
  // Food-specific animations
  FOOD_REVEAL: 'foodReveal',
  CART_ADD: 'cartAdd',
  ORDER_SUCCESS: 'orderSuccess',
  COOKING_PROGRESS: 'cookingProgress'
};

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  targetFPS: 60,
  maxFrameTime: 16.67, // 60 FPS = 16.67ms per frame
  warningThreshold: 20,
  criticalThreshold: 33.33 // 30 FPS
};

// CSS Custom Properties for animations
export const CSS_ANIMATIONS = {
  // Keyframe definitions
  keyframes: `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slideInUp {
      from { 
        opacity: 0;
        transform: translateY(30px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes slideInDown {
      from { 
        opacity: 0;
        transform: translateY(-30px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes slideInLeft {
      from { 
        opacity: 0;
        transform: translateX(-30px);
      }
      to { 
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    @keyframes slideInRight {
      from { 
        opacity: 0;
        transform: translateX(30px);
      }
      to { 
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    @keyframes scaleIn {
      from { 
        opacity: 0;
        transform: scale(0.8);
      }
      to { 
        opacity: 1;
        transform: scale(1);
      }
    }
    
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    
    @keyframes shimmer {
      0% { background-position: -200px 0; }
      100% { background-position: calc(200px + 100%) 0; }
    }
    
    @keyframes heartBeat {
      0%, 100% { transform: scale(1); }
      25% { transform: scale(1.1); }
      50% { transform: scale(1.05); }
    }
    
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
      20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
    
    @keyframes cookingProgress {
      0% { 
        background: linear-gradient(90deg, #ff6b6b 0%, #4ecdc4 100%);
        transform: scaleX(0);
      }
      50% {
        background: linear-gradient(90deg, #feca57 0%, #ff9ff3 100%);
        transform: scaleX(0.5);
      }
      100% { 
        background: linear-gradient(90deg, #48dbfb 0%, #0abde3 100%);
        transform: scaleX(1);
      }
    }
    
    @keyframes foodReveal {
      0% { 
        opacity: 0;
        transform: scale(0.8) rotateY(180deg);
        filter: blur(10px);
      }
      50% {
        opacity: 0.7;
        transform: scale(0.95) rotateY(90deg);
        filter: blur(5px);
      }
      100% { 
        opacity: 1;
        transform: scale(1) rotateY(0deg);
        filter: blur(0);
      }
    }
    
    @keyframes cartAdd {
      0% { transform: scale(1); }
      25% { transform: scale(1.2) rotate(5deg); }
      50% { transform: scale(0.9) rotate(-5deg); }
      75% { transform: scale(1.1); }
      100% { transform: scale(1) rotate(0deg); }
    }
    
    @keyframes orderSuccess {
      0% { 
        transform: scale(0);
        opacity: 0;
      }
      50% { 
        transform: scale(1.2);
        opacity: 0.8;
      }
      100% { 
        transform: scale(1);
        opacity: 1;
      }
    }
  `
};

// ============================================================================
// MAIN ANIMATION MANAGER CLASS
// ============================================================================

class AnimationManager {
  constructor(options = {}) {
    this.config = {
      respectReducedMotion: options.respectReducedMotion !== false,
      performanceMonitoring: options.performanceMonitoring !== false,
      debugMode: options.debugMode || false,
      swissOptimization: options.swissOptimization !== false,
      ...options
    };
    
    this.activeAnimations = new Map();
    this.performanceMetrics = {
      frameCount: 0,
      droppedFrames: 0,
      averageFrameTime: 0,
      lastFrameTime: 0
    };
    
    this.animationQueue = [];
    this.isProcessingQueue = false;
    
    // Initialize performance monitoring
    if (this.config.performanceMonitoring) {
      this.initPerformanceMonitoring();
    }
    
    // Initialize reduced motion detection
    this.reducedMotion = getReducedMotionPreference();
    
    // Add CSS keyframes to document
    this.injectCSS();
  }

  // ============================================================================
  // CORE ANIMATION METHODS
  // ============================================================================
  
  /**
   * Animate element with Swiss precision
   */
  animate(element, animationType, options = {}) {
    const animationId = this.generateAnimationId();
    
    try {
      // Check reduced motion preference
      if (this.reducedMotion && !options.forceAnimation) {
        return this.handleReducedMotion(element, animationType, options);
      }
      
      // Get animation configuration
      const animConfig = this.getAnimationConfig(animationType, options);
      
      // Create animation object
      const animation = {
        id: animationId,
        element,
        type: animationType,
        config: animConfig,
        startTime: performance.now(),
        onComplete: options.onComplete,
        onProgress: options.onProgress
      };
      
      // Add to active animations
      this.activeAnimations.set(animationId, animation);
      
      // Execute animation
      return this.executeAnimation(animation);
      
    } catch (error) {
      console.error('Animation failed:', error);
      return Promise.reject(error);
    }
  }
  
  /**
   * Animate multiple elements in sequence
   */
  async animateSequence(animations, options = {}) {
    const results = [];
    const delay = options.delay || 100; // Stagger delay
    
    for (let i = 0; i < animations.length; i++) {
      const { element, type, config = {} } = animations[i];
      
      // Add stagger delay
      if (i > 0 && delay > 0) {
        await this.delay(delay);
      }
      
      try {
        const result = await this.animate(element, type, {
          ...config,
          sequenceIndex: i,
          totalSequence: animations.length
        });
        results.push(result);
      } catch (error) {
        console.warn(`Animation ${i} failed:`, error);
        results.push({ success: false, error: error.message });
      }
    }
    
    return results;
  }
  
  /**
   * Animate elements in parallel with Swiss coordination
   */
  async animateParallel(animations, options = {}) {
    const promises = animations.map(({ element, type, config = {} }, index) => 
      this.animate(element, type, {
        ...config,
        parallelIndex: index,
        totalParallel: animations.length
      })
    );
    
    try {
      return await Promise.all(promises);
    } catch (error) {
      console.error('Parallel animation failed:', error);
      return promises.map(promise => 
        promise.catch(error => ({ success: false, error: error.message }))
      );
    }
  }

  // ============================================================================
  // ANIMATION EXECUTION
  // ============================================================================
  
  executeAnimation(animation) {
    const { element, type, config } = animation;
    
    return new Promise((resolve, reject) => {
      try {
        // Apply initial styles
        this.applyInitialStyles(element, type, config);
        
        // Start performance monitoring for this animation
        if (this.config.performanceMonitoring) {
          this.startAnimationPerformanceTracking(animation);
        }
        
        // Execute based on animation type
        switch (type) {
          case ANIMATION_TYPES.FADE_IN:
            this.executeFadeIn(element, config, resolve);
            break;
            
          case ANIMATION_TYPES.SLIDE_IN:
            this.executeSlideIn(element, config, resolve);
            break;
            
          case ANIMATION_TYPES.SCALE_IN:
            this.executeScaleIn(element, config, resolve);
            break;
            
          case ANIMATION_TYPES.FOOD_REVEAL:
            this.executeFoodReveal(element, config, resolve);
            break;
            
          case ANIMATION_TYPES.CART_ADD:
            this.executeCartAdd(element, config, resolve);
            break;
            
          case ANIMATION_TYPES.HEART_BEAT:
            this.executeHeartBeat(element, config, resolve);
            break;
            
          case ANIMATION_TYPES.SHIMMER:
            this.executeShimmer(element, config, resolve);
            break;
            
          default:
            this.executeGenericAnimation(element, type, config, resolve);
        }
        
        // Set up completion handler
        const handleComplete = () => {
          this.completeAnimation(animation);
          resolve({ success: true, animationId: animation.id });
        };
        
        // Auto-complete after duration
        setTimeout(handleComplete, config.duration);
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  executeFadeIn(element, config, resolve) {
    element.style.opacity = '0';
    element.style.transition = `opacity ${config.duration}ms ${config.easing}`;
    
    // Trigger animation
    requestAnimationFrame(() => {
      element.style.opacity = '1';
    });
  }
  
  executeSlideIn(element, config, resolve) {
    const direction = config.direction || 'up';
    const distance = config.distance || 30;
    
    const transforms = {
      up: `translateY(${distance}px)`,
      down: `translateY(-${distance}px)`,
      left: `translateX(${distance}px)`,
      right: `translateX(-${distance}px)`
    };
    
    element.style.opacity = '0';
    element.style.transform = transforms[direction];
    element.style.transition = `all ${config.duration}ms ${config.easing}`;
    
    requestAnimationFrame(() => {
      element.style.opacity = '1';
      element.style.transform = 'translate(0, 0)';
    });
  }
  
  executeScaleIn(element, config, resolve) {
    element.style.opacity = '0';
    element.style.transform = `scale(${config.initialScale || 0.8})`;
    element.style.transition = `all ${config.duration}ms ${config.easing}`;
    
    requestAnimationFrame(() => {
      element.style.opacity = '1';
      element.style.transform = 'scale(1)';
    });
  }
  
  executeFoodReveal(element, config, resolve) {
    // Swiss food presentation animation
    element.style.opacity = '0';
    element.style.transform = 'scale(0.8) rotateY(180deg)';
    element.style.filter = 'blur(10px)';
    element.style.transition = `all ${config.duration}ms ${config.easing}`;
    
    // Multi-stage animation
    requestAnimationFrame(() => {
      element.style.opacity = '0.7';
      element.style.transform = 'scale(0.95) rotateY(90deg)';
      element.style.filter = 'blur(5px)';
      
      setTimeout(() => {
        element.style.opacity = '1';
        element.style.transform = 'scale(1) rotateY(0deg)';
        element.style.filter = 'blur(0)';
      }, config.duration * 0.5);
    });
  }
  
  executeCartAdd(element, config, resolve) {
    const originalTransform = element.style.transform;
    element.style.transition = `transform ${config.duration}ms ${config.easing}`;
    
    const keyframes = [
      { transform: 'scale(1)' },
      { transform: 'scale(1.2) rotate(5deg)' },
      { transform: 'scale(0.9) rotate(-5deg)' },
      { transform: 'scale(1.1)' },
      { transform: 'scale(1) rotate(0deg)' }
    ];
    
    element.animate(keyframes, {
      duration: config.duration,
      easing: config.easing,
      fill: 'forwards'
    });
  }
  
  executeHeartBeat(element, config, resolve) {
    const keyframes = [
      { transform: 'scale(1)' },
      { transform: 'scale(1.1)' },
      { transform: 'scale(1.05)' },
      { transform: 'scale(1)' }
    ];
    
    element.animate(keyframes, {
      duration: config.duration,
      easing: config.easing,
      iterations: config.iterations || 1,
      fill: 'forwards'
    });
  }
  
  executeShimmer(element, config, resolve) {
    element.style.background = `
      linear-gradient(90deg, 
        transparent 0%, 
        rgba(255,255,255,0.4) 50%, 
        transparent 100%)
    `;
    element.style.backgroundSize = '200px 100%';
    element.style.backgroundRepeat = 'no-repeat';
    element.style.animation = `shimmer ${config.duration}ms infinite`;
  }

  // ============================================================================
  // MICRO-INTERACTIONS
  // ============================================================================
  
  /**
   * Button press micro-interaction
   */
  buttonPress(element, options = {}) {
    const duration = options.duration || SWISS_ANIMATION_PRINCIPLES.duration.micro;
    
    return this.animate(element, ANIMATION_TYPES.BUTTON_PRESS, {
      duration,
      easing: SWISS_ANIMATION_PRINCIPLES.easing.swift,
      scaleDown: options.scaleDown || 0.95,
      ...options
    });
  }
  
  /**
   * Hover lift effect for cards
   */
  hoverLift(element, options = {}) {
    const duration = options.duration || SWISS_ANIMATION_PRINCIPLES.duration.micro;
    
    element.style.transition = `transform ${duration}ms ${SWISS_ANIMATION_PRINCIPLES.easing.elegant}`;
    element.style.transform = `translateY(${options.liftDistance || -4}px)`;
    
    // Add shadow enhancement
    if (options.enhanceShadow !== false) {
      element.style.boxShadow = options.hoverShadow || '0 12px 24px rgba(0,0,0,0.15)';
    }
  }
  
  /**
   * Reset hover effects
   */
  resetHover(element, options = {}) {
    const duration = options.duration || SWISS_ANIMATION_PRINCIPLES.duration.micro;
    
    element.style.transition = `all ${duration}ms ${SWISS_ANIMATION_PRINCIPLES.easing.elegant}`;
    element.style.transform = 'translateY(0)';
    element.style.boxShadow = options.originalShadow || '0 4px 8px rgba(0,0,0,0.1)';
  }

  // ============================================================================
  // FOOD-SPECIFIC ANIMATIONS
  // ============================================================================
  
  /**
   * Cooking progress animation
   */
  cookingProgress(element, progress = 0, options = {}) {
    const duration = options.duration || SWISS_ANIMATION_PRINCIPLES.duration.medium;
    
    element.style.transition = `all ${duration}ms ${SWISS_ANIMATION_PRINCIPLES.easing.precision}`;
    element.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    
    // Color progression based on cooking stage
    const colors = {
      0: '#ff6b6b',    // Raw - red
      25: '#feca57',   // Cooking - yellow
      50: '#ff9ff3',   // Half done - pink
      75: '#48dbfb',   // Almost done - blue
      100: '#0abde3'   // Done - deep blue
    };
    
    const colorKey = Object.keys(colors).reverse().find(key => progress >= parseInt(key));
    element.style.backgroundColor = colors[colorKey] || colors[0];
  }
  
  /**
   * Order success celebration
   */
  orderSuccess(element, options = {}) {
    return this.animate(element, ANIMATION_TYPES.ORDER_SUCCESS, {
      duration: SWISS_ANIMATION_PRINCIPLES.duration.long,
      easing: SWISS_ANIMATION_PRINCIPLES.easing.bounce,
      onComplete: () => {
        // Announce to screen readers
        announceToScreenReader('Order placed successfully!');
      },
      ...options
    });
  }

  // ============================================================================
  // LOADING & SKELETON ANIMATIONS
  // ============================================================================
  
  /**
   * Create skeleton loading animation
   */
  createSkeleton(element, options = {}) {
    const skeletonConfig = {
      baseColor: options.baseColor || '#f0f0f0',
      highlightColor: options.highlightColor || '#e0e0e0',
      duration: options.duration || 1500,
      borderRadius: options.borderRadius || '4px'
    };
    
    element.style.background = `
      linear-gradient(90deg, 
        ${skeletonConfig.baseColor} 25%, 
        ${skeletonConfig.highlightColor} 50%, 
        ${skeletonConfig.baseColor} 75%)
    `;
    element.style.backgroundSize = '200% 100%';
    element.style.borderRadius = skeletonConfig.borderRadius;
    element.style.animation = `shimmer ${skeletonConfig.duration}ms ease-in-out infinite`;
    
    return {
      stop: () => {
        element.style.animation = '';
        element.style.background = '';
      }
    };
  }
  
  /**
   * Pulse loading animation
   */
  pulse(element, options = {}) {
    const duration = options.duration || SWISS_ANIMATION_PRINCIPLES.duration.medium;
    const intensity = options.intensity || 1.05;
    
    element.style.animation = `pulse ${duration}ms ease-in-out infinite`;
    element.style.setProperty('--pulse-scale', intensity);
  }

  // ============================================================================
  // PERFORMANCE MONITORING
  // ============================================================================
  
  initPerformanceMonitoring() {
    let lastTime = performance.now();
    
    const monitorFrame = (currentTime) => {
      const frameTime = currentTime - lastTime;
      
      this.performanceMetrics.frameCount++;
      this.performanceMetrics.lastFrameTime = frameTime;
      
      // Update average frame time
      this.performanceMetrics.averageFrameTime = 
        (this.performanceMetrics.averageFrameTime * (this.performanceMetrics.frameCount - 1) + frameTime) / 
        this.performanceMetrics.frameCount;
      
      // Detect dropped frames
      if (frameTime > PERFORMANCE_THRESHOLDS.warningThreshold) {
        this.performanceMetrics.droppedFrames++;
        
        if (this.config.debugMode) {
          console.warn(`Dropped frame detected: ${frameTime.toFixed(2)}ms`);
        }
      }
      
      lastTime = currentTime;
      requestAnimationFrame(monitorFrame);
    };
    
    requestAnimationFrame(monitorFrame);
  }
  
  getPerformanceReport() {
    const fps = this.performanceMetrics.frameCount > 0 ? 
      1000 / this.performanceMetrics.averageFrameTime : 0;
    
    return {
      totalFrames: this.performanceMetrics.frameCount,
      droppedFrames: this.performanceMetrics.droppedFrames,
      averageFrameTime: this.performanceMetrics.averageFrameTime,
      currentFPS: Math.round(fps),
      frameDropRate: this.performanceMetrics.frameCount > 0 ? 
        (this.performanceMetrics.droppedFrames / this.performanceMetrics.frameCount) * 100 : 0,
      activeAnimations: this.activeAnimations.size
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  getAnimationConfig(type, options = {}) {
    const baseConfig = {
      duration: options.duration || SWISS_ANIMATION_PRINCIPLES.duration.short,
      easing: options.easing || SWISS_ANIMATION_PRINCIPLES.easing.swift,
      delay: options.delay || 0,
      ...options
    };
    
    // Type-specific configurations
    switch (type) {
      case ANIMATION_TYPES.FADE_IN:
        return { ...baseConfig, opacity: { from: 0, to: 1 } };
        
      case ANIMATION_TYPES.SLIDE_IN:
        return { 
          ...baseConfig, 
          direction: options.direction || 'up',
          distance: options.distance || 30
        };
        
      case ANIMATION_TYPES.SCALE_IN:
        return { 
          ...baseConfig, 
          initialScale: options.initialScale || 0.8,
          finalScale: options.finalScale || 1
        };
        
      case ANIMATION_TYPES.FOOD_REVEAL:
        return { 
          ...baseConfig, 
          duration: options.duration || SWISS_ANIMATION_PRINCIPLES.duration.long,
          easing: SWISS_ANIMATION_PRINCIPLES.easing.elegant
        };
        
      default:
        return baseConfig;
    }
  }
  
  applyInitialStyles(element, type, config) {
    // Ensure element is ready for animation
    element.style.willChange = 'transform, opacity';
    
    // Apply performance optimizations
    if (this.config.swissOptimization) {
      element.style.backfaceVisibility = 'hidden';
      element.style.perspective = '1000px';
    }
  }
  
  completeAnimation(animation) {
    // Clean up
    animation.element.style.willChange = 'auto';
    
    // Remove from active animations
    this.activeAnimations.delete(animation.id);
    
    // Call completion callback
    if (animation.onComplete) {
      animation.onComplete(animation);
    }
    
    // Performance logging
    if (this.config.performanceMonitoring) {
      const duration = performance.now() - animation.startTime;
      console.log(`Animation ${animation.id} completed in ${duration.toFixed(2)}ms`);
    }
  }
  
  handleReducedMotion(element, type, options) {
    // Respect user's reduced motion preference
    switch (type) {
      case ANIMATION_TYPES.FADE_IN:
        element.style.opacity = '1';
        break;
        
      case ANIMATION_TYPES.SLIDE_IN:
      case ANIMATION_TYPES.SCALE_IN:
        element.style.opacity = '1';
        element.style.transform = 'none';
        break;
        
      default:
        // Instantly show final state
        element.style.opacity = '1';
        element.style.transform = 'none';
    }
    
    // Still call completion callback
    if (options.onComplete) {
      setTimeout(options.onComplete, 0);
    }
    
    return Promise.resolve({ success: true, reducedMotion: true });
  }
  
  generateAnimationId() {
    return `anim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  injectCSS() {
    if (typeof document === 'undefined') return;
    
    const styleSheet = document.createElement('style');
    styleSheet.innerHTML = CSS_ANIMATIONS.keyframes;
    document.head.appendChild(styleSheet);
  }
  
  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  /**
   * Cancel specific animation
   */
  cancelAnimation(animationId) {
    const animation = this.activeAnimations.get(animationId);
    if (animation) {
      animation.element.style.animation = '';
      animation.element.style.transition = '';
      this.activeAnimations.delete(animationId);
      return true;
    }
    return false;
  }
  
  /**
   * Cancel all animations
   */
  cancelAllAnimations() {
    this.activeAnimations.forEach((animation, id) => {
      this.cancelAnimation(id);
    });
  }
  
  /**
   * Get current animation status
   */
  getAnimationStatus() {
    return {
      activeAnimations: this.activeAnimations.size,
      queuedAnimations: this.animationQueue.length,
      performance: this.getPerformanceReport(),
      reducedMotion: this.reducedMotion
    };
  }
}

// ============================================================================
// EXPORTS & SINGLETON
// ============================================================================

// Create singleton instance
let animationManagerInstance = null;

export const getAnimationManager = (options = {}) => {
  if (!animationManagerInstance) {
    animationManagerInstance = new AnimationManager(options);
  }
  return animationManagerInstance;
};

// Convenience functions
export const animate = (element, type, options) => {
  return getAnimationManager().animate(element, type, options);
};

export const animateSequence = (animations, options) => {
  return getAnimationManager().animateSequence(animations, options);
};

export const animateParallel = (animations, options) => {
  return getAnimationManager().animateParallel(animations, options);
};

// Named exports
export { 
  AnimationManager, 
  SWISS_ANIMATION_PRINCIPLES, 
  ANIMATION_TYPES,
  CSS_ANIMATIONS 
};

// Default export
export default AnimationManager;