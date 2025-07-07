/**
 * EATECH - Command Visualizer Component
 * Version: 4.1.0
 * Description: Interactive command visualization with intent analysis and Swiss German support
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/features/voice/components/CommandVisualizer.jsx
 * 
 * Features:
 * - Real-time command visualization
 * - Intent confidence display
 * - Swiss German dialect recognition
 * - Interactive command suggestions
 * - Performance monitoring
 * - Accessibility support
 */

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo, 
  useRef,
  memo
} from 'react';
import { 
  Target, 
  Brain, 
  Zap, 
  CheckCircle, 
  AlertCircle,
  MessageSquare, 
  Mic, 
  Volume2,
  TrendingUp, 
  Activity, 
  BarChart3,
  PieChart, 
  Eye, 
  Lightbulb,
  ArrowRight,
  Clock,
  Award,
  Filter
} from 'lucide-react';
import { useVoiceSettings } from '../hooks/useVoiceSettings';
import { usePerformanceMonitor } from '../../../hooks/usePerformanceMonitor';
import styles from './CommandVisualizer.module.css';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const VISUALIZATION_MODES = {
  REALTIME: 'realtime',
  CONFIDENCE: 'confidence', 
  INTENT: 'intent',
  TIMELINE: 'timeline',
  HEATMAP: 'heatmap'
};

const CONFIDENCE_LEVELS = {
  HIGH: { min: 0.8, color: '#10b981', label: 'Hoch' },
  MEDIUM: { min: 0.6, color: '#f59e0b', label: 'Mittel' },
  LOW: { min: 0.4, color: '#ef4444', label: 'Niedrig' },
  VERY_LOW: { min: 0, color: '#6b7280', label: 'Sehr niedrig' }
};

const INTENT_CATEGORIES = {
  ORDER: { color: '#3b82f6', icon: 'ShoppingCart', label: 'Bestellung' },
  NAVIGATION: { color: '#8b5cf6', icon: 'Navigation', label: 'Navigation' },
  INFORMATION: { color: '#06b6d4', icon: 'Info', label: 'Information' },
  CONTROL: { color: '#10b981', icon: 'Settings', label: 'Steuerung' },
  SOCIAL: { color: '#f59e0b', icon: 'Users', label: 'Sozial' },
  HELP: { color: '#ef4444', icon: 'HelpCircle', label: 'Hilfe' }
};

const SWISS_GERMAN_PATTERNS = {
  'de-CH-ZH': { accent: '#dc2626', region: 'Zürich' },
  'de-CH-BE': { accent: '#059669', region: 'Bern' },
  'de-CH-BS': { accent: '#7c3aed', region: 'Basel' },
  'de-CH-LU': { accent: '#ea580c', region: 'Luzern' },
  'de-CH-SG': { accent: '#0891b2', region: 'St. Gallen' }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getConfidenceLevel = (confidence) => {
  return Object.entries(CONFIDENCE_LEVELS).find(([_, level]) => 
    confidence >= level.min
  )?.[1] || CONFIDENCE_LEVELS.VERY_LOW;
};

const analyzeIntent = (text) => {
  const orderWords = ['bestell', 'kauf', 'nimm', 'hätt gern', 'möcht'];
  const navigationWords = ['gah', 'zeig', 'öffne', 'wechsle'];
  const infoWords = ['was', 'wie', 'wann', 'wo', 'warum'];
  const controlWords = ['stopp', 'pause', 'wiederhole', 'lauter'];
  const socialWords = ['teile', 'send', 'empfehl'];
  const helpWords = ['hilf', 'erkläre', 'tutorial', 'anleitung'];
  
  const lowerText = text.toLowerCase();
  
  if (orderWords.some(word => lowerText.includes(word))) return 'ORDER';
  if (navigationWords.some(word => lowerText.includes(word))) return 'NAVIGATION';
  if (infoWords.some(word => lowerText.includes(word))) return 'INFORMATION';
  if (controlWords.some(word => lowerText.includes(word))) return 'CONTROL';
  if (socialWords.some(word => lowerText.includes(word))) return 'SOCIAL';
  if (helpWords.some(word => lowerText.includes(word))) return 'HELP';
  
  return 'INFORMATION'; // Default
};

const detectDialect = (text) => {
  const dialectPatterns = {
    'de-CH-ZH': ['gaht', 'hät', 'chönd', 'zäme'],
    'de-CH-BE': ['geit', 'het', 'chöi', 'zäme'],
    'de-CH-BS': ['goht', 'het', 'chönd', 'zämme'],
    'de-CH-LU': ['gaat', 'hät', 'chönd', 'zäme'],
    'de-CH-SG': ['gaht', 'hend', 'chönd', 'zäme']
  };
  
  const lowerText = text.toLowerCase();
  
  for (const [dialect, patterns] of Object.entries(dialectPatterns)) {
    const matches = patterns.filter(pattern => lowerText.includes(pattern)).length;
    if (matches > 0) {
      return { dialect, confidence: matches / patterns.length };
    }
  }
  
  return null;
};

// ============================================================================
// COMPONENT
// ============================================================================

const CommandVisualizer = memo(({
  isActive = false,
  currentCommand = '',
  categories = {},
  confidence = 0,
  mode = VISUALIZATION_MODES.REALTIME,
  showDialectInfo = true,
  showIntentAnalysis = true,
  showConfidenceBar = true,
  showSuggestions = true,
  onCommandSelect,
  onModeChange,
  className = '',
  ...props
}) => {
  // ============================================================================
  // HOOKS & STATE
  // ============================================================================
  
  const { settings } = useVoiceSettings();
  const { startMeasurement, endMeasurement } = usePerformanceMonitor();
  
  const [currentIntent, setCurrentIntent] = useState(null);
  const [dialectInfo, setDialectInfo] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [visualizationData, setVisualizationData] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    renderTime: 0,
    updateFrequency: 0
  });
  
  // Refs
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastUpdateRef = useRef(0);
  const processingTimeoutRef = useRef(null);
  
  // ============================================================================
  // MEMOIZED VALUES
  // ============================================================================
  
  const confidenceLevel = useMemo(() => 
    getConfidenceLevel(confidence), 
    [confidence]
  );
  
  const intentCategory = useMemo(() => 
    currentIntent ? INTENT_CATEGORIES[currentIntent] : null,
    [currentIntent]
  );
  
  const dialectPattern = useMemo(() => 
    dialectInfo ? SWISS_GERMAN_PATTERNS[dialectInfo.dialect] : null,
    [dialectInfo]
  );
  
  const accessibilitySettings = useMemo(() => ({
    reducedMotion: settings.accessibility?.reducedMotion || false,
    highContrast: settings.accessibility?.highContrast || false,
    screenReader: settings.accessibility?.screenReader || false
  }), [settings.accessibility]);
  
  // ============================================================================
  // COMMAND ANALYSIS
  // ============================================================================
  
  const analyzeCommand = useCallback((command) => {
    if (!command.trim()) return;
    
    const perfId = startMeasurement('command-analysis');
    setIsProcessing(true);
    
    // Clear previous timeout
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }
    
    processingTimeoutRef.current = setTimeout(() => {
      try {
        // Analyze intent
        const intent = analyzeIntent(command);
        setCurrentIntent(intent);
        
        // Detect dialect
        if (showDialectInfo) {
          const dialect = detectDialect(command);
          setDialectInfo(dialect);
        }
        
        // Generate suggestions
        if (showSuggestions) {
          const newSuggestions = generateSuggestions(command, intent);
          setSuggestions(newSuggestions);
        }
        
        // Update visualization data
        setVisualizationData(prev => [...prev.slice(-19), {
          timestamp: Date.now(),
          command,
          intent,
          confidence,
          dialect: dialectInfo?.dialect
        }]);
        
      } catch (error) {
        console.error('Command analysis error:', error);
      } finally {
        setIsProcessing(false);
        endMeasurement(perfId);
      }
    }, 300); // Debounce analysis
    
  }, [confidence, dialectInfo, showDialectInfo, showSuggestions, startMeasurement, endMeasurement]);
  
  const generateSuggestions = useCallback((command, intent) => {
    const suggestions = [];
    const lowerCommand = command.toLowerCase();
    
    // Intent-based suggestions
    switch (intent) {
      case 'ORDER':
        if (!lowerCommand.includes('pizza')) {
          suggestions.push({ text: 'Pizza Margherita bestelle', confidence: 0.9 });
        }
        if (!lowerCommand.includes('getränk')) {
          suggestions.push({ text: 'Getränk dezue', confidence: 0.8 });
        }
        break;
        
      case 'NAVIGATION':
        suggestions.push({ text: 'Zeig mir d Speisekarte', confidence: 0.85 });
        suggestions.push({ text: 'Gang zum Warenkorb', confidence: 0.8 });
        break;
        
      case 'INFORMATION':
        suggestions.push({ text: 'Was chostet das?', confidence: 0.9 });
        suggestions.push({ text: 'Allergie-Infos', confidence: 0.75 });
        break;
        
      default:
        suggestions.push({ text: 'Hilf mir', confidence: 0.7 });
    }
    
    return suggestions.slice(0, 3);
  }, []);
  
  // ============================================================================
  // VISUALIZATION RENDERING
  // ============================================================================
  
  const renderRealtimeMode = useCallback(() => {
    return (
      <div className={styles.realtimeContainer}>
        {/* Current Command Display */}
        <div className={styles.commandDisplay}>
          <div className={styles.commandText}>
            {currentCommand || 'Sprechen Sie einen Befehl...'}
          </div>
          {isProcessing && (
            <div className={styles.processingIndicator}>
              <Brain className={styles.processingIcon} size={16} />
              <span>Analysiere...</span>
            </div>
          )}
        </div>
        
        {/* Confidence Bar */}
        {showConfidenceBar && (
          <div className={styles.confidenceContainer}>
            <div className={styles.confidenceLabel}>
              Vertrauen: {Math.round(confidence * 100)}%
            </div>
            <div className={styles.confidenceBar}>
              <div 
                className={styles.confidenceFill}
                style={{
                  width: `${confidence * 100}%`,
                  backgroundColor: confidenceLevel.color
                }}
              />
            </div>
            <div 
              className={styles.confidenceLevel}
              style={{ color: confidenceLevel.color }}
            >
              {confidenceLevel.label}
            </div>
          </div>
        )}
        
        {/* Intent Analysis */}
        {showIntentAnalysis && intentCategory && (
          <div className={styles.intentContainer}>
            <div className={styles.intentHeader}>
              <Target size={16} style={{ color: intentCategory.color }} />
              <span>Erkannte Absicht</span>
            </div>
            <div 
              className={styles.intentTag}
              style={{ 
                backgroundColor: `${intentCategory.color}20`,
                borderColor: intentCategory.color 
              }}
            >
              {intentCategory.label}
            </div>
          </div>
        )}
        
        {/* Dialect Information */}
        {showDialectInfo && dialectInfo && dialectPattern && (
          <div className={styles.dialectContainer}>
            <div className={styles.dialectHeader}>
              <MessageSquare size={16} style={{ color: dialectPattern.accent }} />
              <span>Dialekt erkannt</span>
            </div>
            <div className={styles.dialectInfo}>
              <span className={styles.dialectRegion}>
                {dialectPattern.region}
              </span>
              <span className={styles.dialectConfidence}>
                {Math.round(dialectInfo.confidence * 100)}% sicher
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }, [
    currentCommand, 
    isProcessing, 
    confidence, 
    confidenceLevel, 
    intentCategory, 
    dialectInfo, 
    dialectPattern,
    showConfidenceBar,
    showIntentAnalysis,
    showDialectInfo
  ]);
  
  const renderConfidenceMode = useCallback(() => {
    return (
      <div className={styles.confidenceModeContainer}>
        <div className={styles.confidenceChart}>
          <canvas 
            ref={canvasRef}
            className={styles.confidenceCanvas}
            width={300}
            height={150}
          />
        </div>
        <div className={styles.confidenceStats}>
          <div className={styles.stat}>
            <span>Durchschnitt</span>
            <span>{Math.round(confidence * 100)}%</span>
          </div>
          <div className={styles.stat}>
            <span>Maximum</span>
            <span>{Math.round(Math.max(...visualizationData.map(d => d.confidence || 0)) * 100)}%</span>
          </div>
          <div className={styles.stat}>
            <span>Trends</span>
            <TrendingUp size={16} color={confidence > 0.7 ? '#10b981' : '#ef4444'} />
          </div>
        </div>
      </div>
    );
  }, [confidence, visualizationData]);
  
  const renderSuggestions = useCallback(() => {
    if (!showSuggestions || suggestions.length === 0) return null;
    
    return (
      <div className={styles.suggestionsContainer}>
        <div className={styles.suggestionsHeader}>
          <Lightbulb size={16} />
          <span>Vorschläge</span>
        </div>
        <div className={styles.suggestionsList}>
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              className={styles.suggestionItem}
              onClick={() => onCommandSelect?.(suggestion.text)}
              disabled={!onCommandSelect}
            >
              <span className={styles.suggestionText}>
                {suggestion.text}
              </span>
              <span className={styles.suggestionConfidence}>
                {Math.round(suggestion.confidence * 100)}%
              </span>
              <ArrowRight size={14} className={styles.suggestionArrow} />
            </button>
          ))}
        </div>
      </div>
    );
  }, [suggestions, showSuggestions, onCommandSelect]);
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  useEffect(() => {
    if (currentCommand) {
      analyzeCommand(currentCommand);
    }
  }, [currentCommand, analyzeCommand]);
  
  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <div 
      className={`
        ${styles.commandVisualizer} 
        ${className}
        ${isActive ? styles.active : styles.inactive}
        ${accessibilitySettings.highContrast ? styles.highContrast : ''}
        ${accessibilitySettings.reducedMotion ? styles.reducedMotion : ''}
      `}
      role="region"
      aria-label="Befehlsvisualisierung"
      aria-live={isActive ? "polite" : "off"}
    >
      {/* Mode Selector */}
      <div className={styles.modeSelector}>
        {Object.entries(VISUALIZATION_MODES).map(([key, modeValue]) => (
          <button
            key={key}
            className={`
              ${styles.modeButton} 
              ${mode === modeValue ? styles.active : ''}
            `}
            onClick={() => onModeChange?.(modeValue)}
            disabled={!onModeChange}
            aria-pressed={mode === modeValue}
          >
            {key.charAt(0) + key.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      
      {/* Visualization Content */}
      <div className={styles.visualizationContent}>
        {mode === VISUALIZATION_MODES.REALTIME && renderRealtimeMode()}
        {mode === VISUALIZATION_MODES.CONFIDENCE && renderConfidenceMode()}
        {/* Add other modes as needed */}
      </div>
      
      {/* Suggestions */}
      {renderSuggestions()}
      
      {/* Performance Metrics (for debugging) */}
      {settings.advanced?.debugMode && (
        <div className={styles.debugInfo}>
          <div>Render: {performanceMetrics.renderTime}ms</div>
          <div>Updates: {performanceMetrics.updateFrequency}/s</div>
        </div>
      )}
    </div>
  );
});

CommandVisualizer.displayName = 'CommandVisualizer';

export { CommandVisualizer };