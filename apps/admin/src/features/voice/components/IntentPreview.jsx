    /**
 * EATECH - Intent Preview Component
 * Version: 4.0.0
 * Description: Real-time intent analysis and preview for voice commands
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/features/voice/components/IntentPreview.jsx
 * 
 * Features:
 * - Real-time intent analysis
 * - Confidence visualization
 * - Swiss German intent patterns
 * - Alternative intent suggestions
 * - Action preview
 * - Intent correction interface
 * - Performance monitoring
 */

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo, 
  useRef 
} from 'react';
import { 
  Target, 
  Brain, 
  Eye, 
  Check,
  X, 
  AlertTriangle, 
  Info,
  Zap, 
  MessageSquare, 
  ShoppingCart,
  Navigation, 
  HelpCircle, 
  Settings,
  ArrowRight, 
  RotateCcw, 
  ThumbsUp,
  ThumbsDown, 
  Edit, 
  Play,
  Pause, 
  Volume2, 
  Clock,
  TrendingUp, 
  Filter, 
  Layers
} from 'lucide-react';
import { useVoiceSettings } from '../hooks/useVoiceSettings';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import styles from './IntentPreview.module.css';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const INTENT_TYPES = {
  ORDER: {
    id: 'order',
    label: 'Bestellung',
    description: 'Produkt bestellen oder zum Warenkorb hinzufügen',
    icon: ShoppingCart,
    color: '#3b82f6',
    actionTemplate: 'Füge {product} zum Warenkorb hinzu',
    examples: [
      'Ich hätte gern eine Pizza Margherita',
      'Bestelle zwei Kaffee',
      'Chani en Burger ha?'
    ]
  },
  NAVIGATION: {
    id: 'navigation', 
    label: 'Navigation',
    description: 'Zu einer Seite oder einem Bereich navigieren',
    icon: Navigation,
    color: '#10b981',
    actionTemplate: 'Navigiere zu {target}',
    examples: [
      'Zeig mir die Speisekarte',
      'Gah zum Warenkorb',
      'Öffne mein Profil'
    ]
  },
  INFORMATION: {
    id: 'information',
    label: 'Information',
    description: 'Informationen über Produkte oder Services anfragen',
    icon: Info,
    color: '#f59e0b',
    actionTemplate: 'Zeige Information über {topic}',
    examples: [
      'Was kostet die Pizza?',
      'Welche Allergene sind enthalten?',
      'Wie lang isch d Lieferzyt?'
    ]
  },
  CONTROL: {
    id: 'control',
    label: 'Steuerung',
    description: 'Anwendung steuern oder Einstellungen ändern',
    icon: Settings,
    color: '#8b5cf6',
    actionTemplate: 'Führe {action} aus',
    examples: [
      'Mach es lauter',
      'Stopp die Spracherkennung',
      'Wechsle die Sprache'
    ]
  },
  HELP: {
    id: 'help',
    label: 'Hilfe',
    description: 'Hilfe oder Support anfordern',
    icon: HelpCircle,
    color: '#ef4444',
    actionTemplate: 'Zeige Hilfe für {topic}',
    examples: [
      'Hilfe bei der Bestellung',
      'Wie funktioniert das?',
      'Tutorial zeigen'
    ]
  },
  SOCIAL: {
    id: 'social',
    label: 'Sozial',
    description: 'Teilen, bewerten oder empfehlen',
    icon: MessageSquare,
    color: '#06b6d4',
    actionTemplate: 'Teile {content}',
    examples: [
      'Teile diese Pizza',
      'Bewerte das Restaurant',
      'Empfehle Freunden'
    ]
  }
};

const CONFIDENCE_LEVELS = {
  HIGH: { min: 0.8, color: '#22c55e', label: 'Hoch', description: 'Intent sehr wahrscheinlich korrekt' },
  MEDIUM: { min: 0.6, color: '#f59e0b', label: 'Mittel', description: 'Intent wahrscheinlich korrekt' },
  LOW: { min: 0.4, color: '#ef4444', label: 'Niedrig', description: 'Intent unsicher, Bestätigung empfohlen' },
  VERY_LOW: { min: 0, color: '#6b7280', label: 'Sehr niedrig', description: 'Intent unklar, Neuformulierung nötig' }
};

const SWISS_GERMAN_PATTERNS = {
  ORDER_PATTERNS: [
    /\b(hätt\s*gern|hätte\s*gern|chani\s*ha|möcht|nimm)\b/i,
    /\b(bestell|bestelle|order)\b/i,
    /\b(pizza|burger|kaffee|kafi|bier)\b/i
  ],
  NAVIGATION_PATTERNS: [
    /\b(zeig|gah|gang|öffne|wechsle)\b/i,
    /\b(menü|menu|warenkorb|profil)\b/i,
    /\b(zu|zur|zum|a|ad)\b/i
  ],
  INFORMATION_PATTERNS: [
    /\b(was|wie|wann|wo|warum)\b/i,
    /\b(kostet|chostet|preis)\b/i,
    /\b(allergene|zutaten|info)\b/i
  ]
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const analyzeIntent = (text, language = 'de-CH') => {
  if (!text || text.trim().length === 0) {
    return {
      intent: null,
      confidence: 0,
      alternatives: [],
      entities: [],
      pattern: null
    };
  }
  
  const lowerText = text.toLowerCase();
  const intentScores = {};
  
  // Analyze for each intent type
  Object.values(INTENT_TYPES).forEach(intentType => {
    let score = 0;
    
    // Check specific patterns based on intent
    switch (intentType.id) {
      case 'order':
        SWISS_GERMAN_PATTERNS.ORDER_PATTERNS.forEach(pattern => {
          if (pattern.test(lowerText)) score += 0.3;
        });
        break;
      case 'navigation':
        SWISS_GERMAN_PATTERNS.NAVIGATION_PATTERNS.forEach(pattern => {
          if (pattern.test(lowerText)) score += 0.3;
        });
        break;
      case 'information':
        SWISS_GERMAN_PATTERNS.INFORMATION_PATTERNS.forEach(pattern => {
          if (pattern.test(lowerText)) score += 0.3;
        });
        break;
    }
    
    // Check examples similarity
    intentType.examples.forEach(example => {
      const similarity = calculateSimilarity(lowerText, example.toLowerCase());
      score += similarity * 0.4;
    });
    
    // Add randomness for demo purposes
    score += Math.random() * 0.2;
    
    intentScores[intentType.id] = Math.min(score, 1.0);
  });
  
  // Sort by score
  const sortedIntents = Object.entries(intentScores)
    .sort(([,a], [,b]) => b - a)
    .map(([intentId, confidence]) => ({
      intent: INTENT_TYPES[intentId],
      confidence
    }));
  
  const primaryIntent = sortedIntents[0];
  const alternatives = sortedIntents.slice(1, 4);
  
  // Extract entities (simplified)
  const entities = extractEntities(text);
  
  return {
    intent: primaryIntent.intent,
    confidence: primaryIntent.confidence,
    alternatives,
    entities,
    pattern: detectPattern(text)
  };
};

const calculateSimilarity = (str1, str2) => {
  const words1 = str1.split(' ');
  const words2 = str2.split(' ');
  const commonWords = words1.filter(word => words2.includes(word));
  return commonWords.length / Math.max(words1.length, words2.length);
};

const extractEntities = (text) => {
  const entities = [];
  const lowerText = text.toLowerCase();
  
  // Product entities
  const products = ['pizza', 'burger', 'kaffee', 'kafi', 'bier', 'salat', 'pasta'];
  products.forEach(product => {
    if (lowerText.includes(product)) {
      entities.push({
        type: 'product',
        value: product,
        confidence: 0.9,
        position: lowerText.indexOf(product)
      });
    }
  });
  
  // Quantity entities
  const quantities = ['ein', 'eine', 'zwei', 'drei', 'vier', 'fünf', '1', '2', '3', '4', '5'];
  quantities.forEach(qty => {
    if (lowerText.includes(qty)) {
      entities.push({
        type: 'quantity',
        value: qty,
        confidence: 0.8,
        position: lowerText.indexOf(qty)
      });
    }
  });
  
  // Location entities
  const locations = ['tisch', 'table', 'theke', 'bar', 'terrasse'];
  locations.forEach(location => {
    if (lowerText.includes(location)) {
      entities.push({
        type: 'location',
        value: location,
        confidence: 0.7,
        position: lowerText.indexOf(location)
      });
    }
  });
  
  return entities.sort((a, b) => a.position - b.position);
};

const detectPattern = (text) => {
  const lowerText = text.toLowerCase();
  
  if (/\b(ich\s*(hätt|hätte)\s*gern|möcht|chani\s*ha)\b/i.test(text)) {
    return 'polite_request';
  }
  if (/\b(bestell|order)\b/i.test(text)) {
    return 'direct_command';
  }
  if (/\b(was|wie|wann|wo)\b/i.test(text)) {
    return 'question';
  }
  if (/\b(bitte|please)\b/i.test(text)) {
    return 'polite_command';
  }
  
  return 'statement';
};

const getConfidenceLevel = (confidence) => {
  return Object.values(CONFIDENCE_LEVELS).find(level => 
    confidence >= level.min
  ) || CONFIDENCE_LEVELS.VERY_LOW;
};

// ============================================================================
// COMPONENT
// ============================================================================

const IntentPreview = ({
  text = '',
  language = 'de-CH',
  isActive = false,
  showAlternatives = true,
  showEntities = true,
  showActions = true,
  onIntentConfirm,
  onIntentCorrect,
  onActionExecute,
  className = '',
  ...props
}) => {
  // ============================================================================
  // HOOKS & STATE
  // ============================================================================
  
  const { settings } = useVoiceSettings();
  const { speak, stop, isPlaying } = useTextToSpeech();
  
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedAlternative, setSelectedAlternative] = useState(null);
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [customIntent, setCustomIntent] = useState('');
  const [entityHighlight, setEntityHighlight] = useState(null);
  const [processingTime, setProcessingTime] = useState(0);
  
  // Refs
  const analysisTimeoutRef = useRef(null);
  const startTimeRef = useRef(null);
  
  // ============================================================================
  // MEMOIZED VALUES
  // ============================================================================
  
  const confidenceLevel = useMemo(() => 
    analysisResult ? getConfidenceLevel(analysisResult.confidence) : null,
    [analysisResult]
  );
  
  const actionPreview = useMemo(() => {
    if (!analysisResult?.intent) return null;
    
    const template = analysisResult.intent.actionTemplate;
    let preview = template;
    
    // Replace placeholders with entities
    analysisResult.entities.forEach(entity => {
      const placeholder = `{${entity.type}}`;
      if (preview.includes(placeholder)) {
        preview = preview.replace(placeholder, entity.value);
      }
    });
    
    // Replace remaining placeholders with generic terms
    preview = preview.replace(/\{[^}]+\}/g, '...');
    
    return preview;
  }, [analysisResult]);
  
  const highlightedText = useMemo(() => {
    if (!text || !analysisResult?.entities.length) return text;
    
    let highlighted = text;
    const sortedEntities = [...analysisResult.entities].sort((a, b) => b.position - a.position);
    
    sortedEntities.forEach(entity => {
      const start = entity.position;
      const end = start + entity.value.length;
      const before = highlighted.slice(0, start);
      const entityText = highlighted.slice(start, end);
      const after = highlighted.slice(end);
      
      highlighted = before + 
        `<span class="${styles.entityHighlight} ${styles[entity.type]}" 
               onmouseenter="handleEntityHover('${entity.type}')"
               onmouseleave="handleEntityHover(null)">
          ${entityText}
        </span>` + 
        after;
    });
    
    return highlighted;
  }, [text, analysisResult]);
  
  // ============================================================================
  // ANALYSIS FUNCTIONS
  // ============================================================================
  
  const performAnalysis = useCallback((inputText) => {
    if (!inputText || inputText.trim().length === 0) {
      setAnalysisResult(null);
      return;
    }
    
    setIsAnalyzing(true);
    startTimeRef.current = performance.now();
    
    // Clear previous timeout
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }
    
    // Debounce analysis
    analysisTimeoutRef.current = setTimeout(() => {
      try {
        const result = analyzeIntent(inputText, language);
        setAnalysisResult(result);
        
        const endTime = performance.now();
        setProcessingTime(endTime - startTimeRef.current);
        
      } catch (error) {
        console.error('Intent analysis failed:', error);
        setAnalysisResult(null);
      } finally {
        setIsAnalyzing(false);
      }
    }, 300);
  }, [language]);
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleIntentConfirm = useCallback(() => {
    if (analysisResult) {
      onIntentConfirm?.(analysisResult);
    }
  }, [analysisResult, onIntentConfirm]);
  
  const handleIntentCorrect = useCallback((correctedIntent) => {
    onIntentCorrect?.(correctedIntent, analysisResult);
    setShowCorrectionForm(false);
  }, [analysisResult, onIntentCorrect]);
  
  const handleAlternativeSelect = useCallback((alternative) => {
    setSelectedAlternative(alternative);
    setAnalysisResult(prev => ({
      ...prev,
      intent: alternative.intent,
      confidence: alternative.confidence
    }));
  }, []);
  
  const handleActionExecute = useCallback(() => {
    if (actionPreview && analysisResult) {
      onActionExecute?.(analysisResult, actionPreview);
    }
  }, [actionPreview, analysisResult, onActionExecute]);
  
  const handleTextToSpeech = useCallback(() => {
    if (isPlaying) {
      stop();
    } else if (actionPreview) {
      speak(actionPreview);
    }
  }, [isPlaying, actionPreview, speak, stop]);
  
  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  
  const renderConfidenceBar = useCallback(() => {
    if (!analysisResult) return null;
    
    return (
      <div className={styles.confidenceSection}>
        <div className={styles.confidenceHeader}>
          <span>Vertrauen</span>
          <span>{(analysisResult.confidence * 100).toFixed(1)}%</span>
        </div>
        <div className={styles.confidenceBar}>
          <div 
            className={styles.confidenceFill}
            style={{
              width: `${analysisResult.confidence * 100}%`,
              backgroundColor: confidenceLevel?.color
            }}
          />
        </div>
        <div className={styles.confidenceLabel} style={{ color: confidenceLevel?.color }}>
          {confidenceLevel?.label} - {confidenceLevel?.description}
        </div>
      </div>
    );
  }, [analysisResult, confidenceLevel]);
  
  const renderPrimaryIntent = useCallback(() => {
    if (!analysisResult?.intent) return null;
    
    const Icon = analysisResult.intent.icon;
    
    return (
      <div className={styles.primaryIntent}>
        <div className={styles.intentHeader}>
          <Icon size={20} style={{ color: analysisResult.intent.color }} />
          <span className={styles.intentLabel}>{analysisResult.intent.label}</span>
          <span className={styles.intentConfidence}>
            {(analysisResult.confidence * 100).toFixed(0)}%
          </span>
        </div>
        <div className={styles.intentDescription}>
          {analysisResult.intent.description}
        </div>
      </div>
    );
  }, [analysisResult]);
  
  const renderAlternatives = useCallback(() => {
    if (!showAlternatives || !analysisResult?.alternatives?.length) return null;
    
    return (
      <div className={styles.alternativesSection}>
        <h4>Alternative Interpretationen</h4>
        <div className={styles.alternativesList}>
          {analysisResult.alternatives.map((alt, index) => {
            const Icon = alt.intent.icon;
            return (
              <button
                key={index}
                className={`${styles.alternativeItem} ${selectedAlternative === alt ? styles.selected : ''}`}
                onClick={() => handleAlternativeSelect(alt)}
              >
                <Icon size={16} style={{ color: alt.intent.color }} />
                <span className={styles.altLabel}>{alt.intent.label}</span>
                <span className={styles.altConfidence}>{(alt.confidence * 100).toFixed(0)}%</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }, [showAlternatives, analysisResult, selectedAlternative, handleAlternativeSelect]);
  
  const renderEntities = useCallback(() => {
    if (!showEntities || !analysisResult?.entities?.length) return null;
    
    return (
      <div className={styles.entitiesSection}>
        <h4>Erkannte Entitäten</h4>
        <div className={styles.entitiesList}>
          {analysisResult.entities.map((entity, index) => (
            <div 
              key={index} 
              className={`${styles.entityItem} ${styles[entity.type]}`}
              onMouseEnter={() => setEntityHighlight(entity.type)}
              onMouseLeave={() => setEntityHighlight(null)}
            >
              <span className={styles.entityType}>{entity.type}</span>
              <span className={styles.entityValue}>"{entity.value}"</span>
              <span className={styles.entityConfidence}>
                {(entity.confidence * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }, [showEntities, analysisResult]);
  
  const renderActionPreview = useCallback(() => {
    if (!showActions || !actionPreview || !analysisResult) return null;
    
    return (
      <div className={styles.actionSection}>
        <div className={styles.actionHeader}>
          <Zap size={16} />
          <span>Aktion Vorschau</span>
        </div>
        <div className={styles.actionPreview}>
          {actionPreview}
        </div>
        <div className={styles.actionButtons}>
          <button
            className={`${styles.actionButton} ${styles.confirm}`}
            onClick={handleActionExecute}
            disabled={analysisResult.confidence < 0.6}
          >
            <Check size={16} />
            Ausführen
          </button>
          
          <button
            className={styles.actionButton}
            onClick={handleTextToSpeech}
          >
            {isPlaying ? <Pause size={16} /> : <Volume2 size={16} />}
            {isPlaying ? 'Stopp' : 'Vorlesen'}
          </button>
          
          <button
            className={styles.actionButton}
            onClick={() => setShowCorrectionForm(true)}
          >
            <Edit size={16} />
            Korrigieren
          </button>
        </div>
      </div>
    );
  }, [showActions, actionPreview, analysisResult, isPlaying, handleActionExecute, handleTextToSpeech]);
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  useEffect(() => {
    if (text && isActive) {
      performAnalysis(text);
    }
  }, [text, isActive, performAnalysis]);
  
  useEffect(() => {
    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, []);
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  if (!isActive || !text) {
    return null;
  }
  
  return (
    <div className={`${styles.intentPreview} ${className}`}>
      {/* Text Display */}
      <div className={styles.textSection}>
        <div className={styles.textHeader}>
          <MessageSquare size={16} />
          <span>Erkannter Text</span>
          {isAnalyzing && (
            <div className={styles.analyzingIndicator}>
              <Brain className={styles.spinning} size={14} />
              <span>Analysiere...</span>
            </div>
          )}
        </div>
        <div 
          className={styles.textDisplay}
          dangerouslySetInnerHTML={{ __html: highlightedText }}
        />
      </div>
      
      {/* Analysis Results */}
      {analysisResult && (
        <div className={styles.analysisResults}>
          {/* Primary Intent */}
          {renderPrimaryIntent()}
          
          {/* Confidence Bar */}
          {renderConfidenceBar()}
          
          {/* Alternatives */}
          {renderAlternatives()}
          
          {/* Entities */}
          {renderEntities()}
          
          {/* Action Preview */}
          {renderActionPreview()}
        </div>
      )}
      
      {/* Performance Info */}
      {settings.advanced?.debugMode && (
        <div className={styles.debugInfo}>
          <Clock size={12} />
          <span>Verarbeitung: {processingTime.toFixed(1)}ms</span>
        </div>
      )}
      
      {/* Correction Modal */}
      {showCorrectionForm && (
        <div className={styles.correctionModal}>
          <div className={styles.modalContent}>
            <h3>Intent korrigieren</h3>
            <select
              value={customIntent}
              onChange={(e) => setCustomIntent(e.target.value)}
            >
              <option value="">Intent auswählen...</option>
              {Object.values(INTENT_TYPES).map(intent => (
                <option key={intent.id} value={intent.id}>
                  {intent.label}
                </option>
              ))}
            </select>
            <div className={styles.modalButtons}>
              <button
                onClick={() => handleIntentCorrect(INTENT_TYPES[customIntent])}
                disabled={!customIntent}
              >
                Korrigieren
              </button>
              <button onClick={() => setShowCorrectionForm(false)}>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
        
export { IntentPreview };