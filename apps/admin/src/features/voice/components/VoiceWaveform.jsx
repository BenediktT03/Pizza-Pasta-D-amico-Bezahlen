/**
 * EATECH - Voice Waveform Component
 * Version: 3.8.0
 * Description: Real-time audio visualization for voice interface
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/features/voice/components/VoiceWaveform.jsx
 * 
 * Features:
 * - Real-time audio visualization
 * - Multiple waveform styles (bars, line, circular)
 * - Customizable colors and animations
 * - Performance optimized rendering
 * - Accessibility support
 * - Touch and gesture interaction
 * - Recording state indicators
 */

import React, { 
  useRef, 
  useEffect, 
  useState, 
  useCallback, 
  useMemo,
  useLayoutEffect,
  forwardRef,
  useImperativeHandle
} from 'react';
import { Activity, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import styles from './VoiceWaveform.module.css';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const WAVEFORM_CONFIG = {
  // Visual styles
  STYLES: {
    BARS: 'bars',
    LINE: 'line',
    CIRCULAR: 'circular',
    PULSE: 'pulse',
    SPECTRUM: 'spectrum'
  },
  
  // Animation settings
  ANIMATION: {
    smoothing: 0.8,
    decay: 0.95,
    minHeight: 2,
    maxHeight: 100,
    barCount: 32,
    linePoints: 64,
    frameRate: 60
  },
  
  // Color themes
  THEMES: {
    DEFAULT: {
      primary: '#ff6b35',
      secondary: '#2c5aa0',
      background: 'rgba(255, 255, 255, 0.1)',
      accent: '#10b981'
    },
    DARK: {
      primary: '#ff8c5a',
      secondary: '#4a7bc8',
      background: 'rgba(0, 0, 0, 0.2)',
      accent: '#34d399'
    },
    SWISS: {
      primary: '#dc143c',
      secondary: '#ffffff',
      background: 'rgba(220, 20, 60, 0.1)',
      accent: '#ffd700'
    },
    RAINBOW: {
      primary: 'hsl(var(--hue), 70%, 50%)',
      secondary: 'hsl(calc(var(--hue) + 120), 70%, 50%)',
      background: 'rgba(255, 255, 255, 0.05)',
      accent: 'hsl(calc(var(--hue) + 240), 70%, 50%)'
    }
  },
  
  // Performance settings
  PERFORMANCE: {
    maxFPS: 60,
    bufferSize: 1024,
    fftSize: 512,
    smoothingTimeConstant: 0.8,
    enableGPUAcceleration: true
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const lerp = (start, end, factor) => start + (end - start) * factor;

const getFrequencyBins = (dataArray, binCount) => {
  const bins = new Array(binCount);
  const binSize = Math.floor(dataArray.length / binCount);
  
  for (let i = 0; i < binCount; i++) {
    let sum = 0;
    const start = i * binSize;
    const end = Math.min(start + binSize, dataArray.length);
    
    for (let j = start; j < end; j++) {
      sum += dataArray[j];
    }
    
    bins[i] = sum / (end - start);
  }
  
  return bins;
};

const normalizeAudioData = (data, sensitivity = 1.0) => {
  return data.map(value => {
    const normalized = (value / 255) * sensitivity;
    return clamp(normalized, 0, 1);
  });
};

// ============================================================================
// WAVEFORM RENDERERS
// ============================================================================

class WaveformRenderer {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.config = config;
    this.animationFrame = null;
    this.lastFrameTime = 0;
    this.frameCount = 0;
    
    // Enable performance optimizations
    if (config.enableGPUAcceleration) {
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
    }
  }
  
  render(audioData, style, theme, options = {}) {
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    
    // Frame rate limiting
    if (deltaTime < 1000 / WAVEFORM_CONFIG.PERFORMANCE.maxFPS) {
      return;
    }
    
    this.lastFrameTime = now;
    this.frameCount++;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Render based on style
    switch (style) {
      case WAVEFORM_CONFIG.STYLES.BARS:
        this.renderBars(audioData, theme, options);
        break;
      case WAVEFORM_CONFIG.STYLES.LINE:
        this.renderLine(audioData, theme, options);
        break;
      case WAVEFORM_CONFIG.STYLES.CIRCULAR:
        this.renderCircular(audioData, theme, options);
        break;
      case WAVEFORM_CONFIG.STYLES.PULSE:
        this.renderPulse(audioData, theme, options);
        break;
      case WAVEFORM_CONFIG.STYLES.SPECTRUM:
        this.renderSpectrum(audioData, theme, options);
        break;
      default:
        this.renderBars(audioData, theme, options);
    }
  }
  
  renderBars(audioData, theme, options) {
    const { width, height } = this.canvas;
    const barCount = options.barCount || WAVEFORM_CONFIG.ANIMATION.barCount;
    const barWidth = width / barCount;
    const barSpacing = barWidth * 0.1;
    const actualBarWidth = barWidth - barSpacing;
    
    // Get frequency bins
    const bins = getFrequencyBins(audioData, barCount);
    const normalizedBins = normalizeAudioData(bins, options.sensitivity || 1.0);
    
    this.ctx.save();
    
    // Set gradient
    const gradient = this.ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, theme.primary);
    gradient.addColorStop(0.5, theme.secondary);
    gradient.addColorStop(1, theme.accent);
    
    this.ctx.fillStyle = gradient;
    
    // Draw bars
    normalizedBins.forEach((amplitude, index) => {
      const barHeight = Math.max(
        amplitude * height * 0.8,
        WAVEFORM_CONFIG.ANIMATION.minHeight
      );
      
      const x = index * barWidth + barSpacing / 2;
      const y = height - barHeight;
      
      // Add rounded corners
      this.ctx.beginPath();
      this.ctx.roundRect(x, y, actualBarWidth, barHeight, actualBarWidth / 4);
      this.ctx.fill();
      
      // Add glow effect
      if (amplitude > 0.5) {
        this.ctx.shadowColor = theme.primary;
        this.ctx.shadowBlur = 10;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      }
    });
    
    this.ctx.restore();
  }
  
  renderLine(audioData, theme, options) {
    const { width, height } = this.canvas;
    const pointCount = options.pointCount || WAVEFORM_CONFIG.ANIMATION.linePoints;
    const centerY = height / 2;
    
    // Get data points
    const bins = getFrequencyBins(audioData, pointCount);
    const normalizedBins = normalizeAudioData(bins, options.sensitivity || 1.0);
    
    this.ctx.save();
    
    // Set line style
    this.ctx.strokeStyle = theme.primary;
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    // Draw waveform line
    this.ctx.beginPath();
    normalizedBins.forEach((amplitude, index) => {
      const x = (index / (pointCount - 1)) * width;
      const y = centerY + (amplitude - 0.5) * height * 0.6;
      
      if (index === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    });
    this.ctx.stroke();
    
    // Add filled area under the line
    this.ctx.globalAlpha = 0.3;
    this.ctx.fillStyle = theme.primary;
    this.ctx.lineTo(width, centerY);
    this.ctx.lineTo(0, centerY);
    this.ctx.closePath();
    this.ctx.fill();
    
    this.ctx.restore();
  }
  
  renderCircular(audioData, theme, options) {
    const { width, height } = this.canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.3;
    const barCount = options.barCount || WAVEFORM_CONFIG.ANIMATION.barCount;
    
    // Get frequency bins
    const bins = getFrequencyBins(audioData, barCount);
    const normalizedBins = normalizeAudioData(bins, options.sensitivity || 1.0);
    
    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    
    // Set gradient
    const gradient = this.ctx.createRadialGradient(0, 0, radius, 0, 0, radius * 2);
    gradient.addColorStop(0, theme.primary);
    gradient.addColorStop(1, theme.secondary);
    
    this.ctx.fillStyle = gradient;
    
    // Draw circular bars
    normalizedBins.forEach((amplitude, index) => {
      const angle = (index / barCount) * Math.PI * 2;
      const barHeight = amplitude * radius * 0.5;
      
      const x1 = Math.cos(angle) * radius;
      const y1 = Math.sin(angle) * radius;
      const x2 = Math.cos(angle) * (radius + barHeight);
      const y2 = Math.sin(angle) * (radius + barHeight);
      
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.lineWidth = 4;
      this.ctx.strokeStyle = theme.primary;
      this.ctx.stroke();
    });
    
    // Draw center circle
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius * 0.8, 0, Math.PI * 2);
    this.ctx.fillStyle = theme.background;
    this.ctx.fill();
    this.ctx.strokeStyle = theme.secondary;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    this.ctx.restore();
  }
  
  renderPulse(audioData, theme, options) {
    const { width, height } = this.canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Calculate average amplitude
    const average = audioData.reduce((sum, val) => sum + val, 0) / audioData.length;
    const normalizedAverage = average / 255;
    
    this.ctx.save();
    
    // Create pulsing circles
    const maxRadius = Math.min(width, height) * 0.4;
    const pulseRadius = normalizedAverage * maxRadius;
    
    // Outer glow
    for (let i = 0; i < 3; i++) {
      const alpha = 0.3 - (i * 0.1);
      const radius = pulseRadius + (i * 10);
      
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `${theme.primary}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
      this.ctx.fill();
    }
    
    // Main pulse
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = theme.primary;
    this.ctx.fill();
    
    // Center icon
    const iconSize = 20;
    this.ctx.fillStyle = theme.secondary;
    this.ctx.fillRect(
      centerX - iconSize / 2,
      centerY - iconSize / 2,
      iconSize,
      iconSize
    );
    
    this.ctx.restore();
  }
  
  renderSpectrum(audioData, theme, options) {
    const { width, height } = this.canvas;
    const barCount = Math.min(audioData.length, 128);
    const barWidth = width / barCount;
    
    this.ctx.save();
    
    // Create spectrum analyzer
    for (let i = 0; i < barCount; i++) {
      const amplitude = audioData[i] / 255;
      const barHeight = amplitude * height;
      
      // Color based on frequency
      const hue = (i / barCount) * 360;
      this.ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
      
      this.ctx.fillRect(
        i * barWidth,
        height - barHeight,
        barWidth - 1,
        barHeight
      );
    }
    
    this.ctx.restore();
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const VoiceWaveform = forwardRef(({
  isActive = false,
  audioLevel = 0,
  frequency = 0,
  audioData = null,
  style = WAVEFORM_CONFIG.STYLES.BARS,
  theme = 'DEFAULT',
  width = 200,
  height = 60,
  sensitivity = 1.0,
  showControls = false,
  showMetrics = false,
  autoResize = true,
  className = '',
  onVisualizationClick,
  onSensitivityChange,
  ...props
}, ref) => {
  
  // ============================================================================
  // REFS & STATE
  // ============================================================================
  
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioDataRef = useRef(new Array(WAVEFORM_CONFIG.ANIMATION.barCount).fill(0));
  const smoothedDataRef = useRef(new Array(WAVEFORM_CONFIG.ANIMATION.barCount).fill(0));
  
  const [currentTheme, setCurrentTheme] = useState(theme);
  const [isAnimating, setIsAnimating] = useState(false);
  const [dimensions, setDimensions] = useState({ width, height });
  const [fps, setFps] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const themeConfig = useMemo(() => 
    WAVEFORM_CONFIG.THEMES[currentTheme] || WAVEFORM_CONFIG.THEMES.DEFAULT,
    [currentTheme]
  );
  
  const canvasStyle = useMemo(() => ({
    filter: isActive ? 'brightness(1.2) saturate(1.1)' : 'brightness(0.8) saturate(0.7)',
    transition: 'filter 0.3s ease'
  }), [isActive]);
  
  // ============================================================================
  // ANIMATION LOOP
  // ============================================================================
  
  const animate = useCallback(() => {
    if (!rendererRef.current || !isActive) {
      setIsAnimating(false);
      return;
    }
    
    // Generate or use provided audio data
    let currentAudioData;
    
    if (audioData && Array.isArray(audioData)) {
      currentAudioData = audioData;
    } else {
      // Generate simulated data based on audioLevel and frequency
      currentAudioData = generateSimulatedAudioData(audioLevel, frequency);
    }
    
    // Smooth the data for better visual appeal
    const smoothedData = smoothAudioData(currentAudioData, smoothedDataRef.current);
    smoothedDataRef.current = smoothedData;
    
    // Render the waveform
    rendererRef.current.render(smoothedData, style, themeConfig, {
      sensitivity,
      barCount: WAVEFORM_CONFIG.ANIMATION.barCount,
      pointCount: WAVEFORM_CONFIG.ANIMATION.linePoints
    });
    
    // Update metrics
    setFrameCount(prev => prev + 1);
    
    // Continue animation
    animationFrameRef.current = requestAnimationFrame(animate);
    
  }, [isActive, audioData, audioLevel, frequency, style, themeConfig, sensitivity]);
  
  const generateSimulatedAudioData = useCallback((level, freq) => {
    const data = new Array(WAVEFORM_CONFIG.ANIMATION.barCount);
    const time = Date.now() * 0.001;
    
    for (let i = 0; i < data.length; i++) {
      // Base noise
      let value = Math.random() * 0.1;
      
      // Add level-based amplitude
      if (level > 0) {
        value += level * 0.8;
        
        // Add frequency-based pattern
        const freqComponent = Math.sin(time * 2 + i * 0.1) * level * 0.3;
        const harmonic = Math.sin(time * 4 + i * 0.2) * level * 0.1;
        
        value += freqComponent + harmonic;
      }
      
      // Add some variation based on frequency
      if (freq > 0) {
        const freqInfluence = Math.sin(i * freq * 0.01 + time) * 0.2;
        value += freqInfluence;
      }
      
      data[i] = clamp(value * 255, 0, 255);
    }
    
    return data;
  }, []);
  
  const smoothAudioData = useCallback((newData, previousData) => {
    const smoothing = WAVEFORM_CONFIG.ANIMATION.smoothing;
    const decay = WAVEFORM_CONFIG.ANIMATION.decay;
    
    return newData.map((value, index) => {
      const previous = previousData[index] || 0;
      const smoothed = lerp(previous, value, 1 - smoothing);
      return smoothed * decay;
    });
  }, []);
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  // Initialize renderer
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set canvas size
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;
    
    // Create renderer
    rendererRef.current = new WaveformRenderer(canvas, WAVEFORM_CONFIG.PERFORMANCE);
    
    // Scale context for high DPI
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    
  }, [dimensions]);
  
  // Handle animation lifecycle
  useEffect(() => {
    if (isActive && !isAnimating) {
      setIsAnimating(true);
      animate();
    } else if (!isActive && animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      setIsAnimating(false);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, isAnimating, animate]);
  
  // Auto-resize handling
  useEffect(() => {
    if (!autoResize || !containerRef.current) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        const { width: newWidth, height: newHeight } = entry.contentRect;
        setDimensions({
          width: newWidth || width,
          height: newHeight || height
        });
      }
    });
    
    resizeObserver.observe(containerRef.current);
    
    return () => resizeObserver.disconnect();
  }, [autoResize, width, height]);
  
  // FPS calculation
  useEffect(() => {
    const interval = setInterval(() => {
      setFps(frameCount);
      setFrameCount(0);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [frameCount]);
  
  // Theme updates
  useEffect(() => {
    setCurrentTheme(theme);
  }, [theme]);
  
  // ============================================================================
  // IMPERATIVE HANDLE
  // ============================================================================
  
  useImperativeHandle(ref, () => ({
    // Control methods
    start: () => setIsAnimating(true),
    stop: () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setIsAnimating(false);
    },
    
    // Configuration methods
    setTheme: (newTheme) => setCurrentTheme(newTheme),
    setDimensions: (newDimensions) => setDimensions(newDimensions),
    
    // Data methods
    updateAudioData: (data) => {
      audioDataRef.current = data;
    },
    
    // Export methods
    exportFrame: () => {
      return canvasRef.current?.toDataURL('image/png');
    },
    
    // Metrics
    getMetrics: () => ({
      fps,
      isAnimating,
      dimensions,
      theme: currentTheme
    })
  }), [fps, isAnimating, dimensions, currentTheme]);
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleCanvasClick = useCallback((event) => {
    if (onVisualizationClick) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      onVisualizationClick({
        x: x / rect.width,
        y: y / rect.height,
        style,
        isActive
      });
    }
  }, [onVisualizationClick, style, isActive]);
  
  const handleSensitivitySlider = useCallback((event) => {
    const newSensitivity = parseFloat(event.target.value);
    onSensitivityChange?.(newSensitivity);
  }, [onSensitivityChange]);
  
  // ============================================================================
  // RENDER CONTROLS
  // ============================================================================
  
  const renderControls = () => {
    if (!showControls) return null;
    
    return (
      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>
            <Activity size={16} />
            Sensitivity
          </label>
          <input
            type="range"
            min="0.1"
            max="3.0"
            step="0.1"
            value={sensitivity}
            onChange={handleSensitivitySlider}
            className={styles.slider}
          />
          <span className={styles.value}>{sensitivity.toFixed(1)}</span>
        </div>
        
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>
            Theme
          </label>
          <select
            value={currentTheme}
            onChange={(e) => setCurrentTheme(e.target.value)}
            className={styles.select}
          >
            {Object.keys(WAVEFORM_CONFIG.THEMES).map(themeName => (
              <option key={themeName} value={themeName}>
                {themeName}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  };
  
  const renderMetrics = () => {
    if (!showMetrics) return null;
    
    return (
      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>FPS:</span>
          <span className={styles.metricValue}>{fps}</span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Level:</span>
          <span className={styles.metricValue}>
            {Math.round(audioLevel * 100)}%
          </span>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Style:</span>
          <span className={styles.metricValue}>{style}</span>
        </div>
      </div>
    );
  };
  
  const renderStatusIndicator = () => (
    <div className={`${styles.statusIndicator} ${isActive ? styles.active : ''}`}>
      {isActive ? (
        <>
          <Mic size={16} />
          <span className={styles.statusText}>Listening</span>
        </>
      ) : (
        <>
          <MicOff size={16} />
          <span className={styles.statusText}>Inactive</span>
        </>
      )}
    </div>
  );
  
  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  return (
    <div
      ref={containerRef}
      className={`${styles.voiceWaveform} ${className} ${isActive ? styles.active : styles.inactive}`}
      {...props}
    >
      {/* Status Indicator */}
      {renderStatusIndicator()}
      
      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        style={canvasStyle}
        onClick={handleCanvasClick}
        role="img"
        aria-label={`Voice waveform visualization, ${isActive ? 'active' : 'inactive'}`}
      />
      
      {/* Controls */}
      {renderControls()}
      
      {/* Metrics */}
      {renderMetrics()}
      
      {/* Accessibility Info */}
      <div className={styles.accessibilityInfo} aria-live="polite">
        {isActive ? 
          `Voice visualization active, audio level ${Math.round(audioLevel * 100)}%` :
          'Voice visualization inactive'
        }
      </div>
    </div>
  );
});

VoiceWaveform.displayName = 'VoiceWaveform';

// ============================================================================
// EXPORTS
// ============================================================================

export default VoiceWaveform;
export { WAVEFORM_CONFIG };