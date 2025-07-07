/**
 * EATECH - Accessibility Panel Component
 * Version: 4.2.0
 * Description: Comprehensive accessibility support for voice interface
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/features/voice/components/AccessibilityPanel.jsx
 * 
 * Features:
 * - Screen reader support
 * - High contrast mode
 * - Keyboard navigation
 * - Voice status announcements
 * - Focus management
 * - Reduced motion support
 * - Live regions for dynamic content
 */

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useRef, 
  useMemo 
} from 'react';
import { 
  Eye, 
  EyeOff, 
  Keyboard, 
  Mouse,
  Volume2, 
  VolumeX, 
  Type,
  Contrast, 
  Zap, 
  Settings,
  Monitor, 
  Smartphone, 
  Headphones,
  AlertCircle, 
  CheckCircle, 
  Info,
  Play, 
  Square, 
  RotateCcw,
  Target, 
  Hand, 
  Mic
} from 'lucide-react';
import { useVoiceSettings } from '../hooks/useVoiceSettings';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import styles from './AccessibilityPanel.module.css';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const VOICE_STATES = {
  IDLE: 'idle',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  SPEAKING: 'speaking',
  ERROR: 'error',
  CALIBRATING: 'calibrating'
};

const STATE_DESCRIPTIONS = {
  [VOICE_STATES.IDLE]: 'Sprachassistent ist bereit. Sagen Sie "Hey EATECH" zum Aktivieren.',
  [VOICE_STATES.LISTENING]: 'Hört zu... Sprechen Sie Ihren Befehl.',
  [VOICE_STATES.PROCESSING]: 'Befehl wird verarbeitet... Bitte warten.',
  [VOICE_STATES.SPEAKING]: 'Sprachausgabe aktiv.',
  [VOICE_STATES.ERROR]: 'Fehler aufgetreten. Versuchen Sie es erneut.',
  [VOICE_STATES.CALIBRATING]: 'Mikrofon wird kalibriert...'
};

const ACCESSIBILITY_FEATURES = {
  SCREEN_READER: {
    id: 'screenReader',
    title: 'Screen Reader Unterstützung',
    description: 'Optimiert für Bildschirmlesegeräte',
    icon: Volume2
  },
  HIGH_CONTRAST: {
    id: 'highContrast',
    title: 'Hoher Kontrast',
    description: 'Verbesserte Sichtbarkeit',
    icon: Contrast
  },
  LARGE_TEXT: {
    id: 'largeText',
    title: 'Große Schrift',
    description: 'Vergrößerte Textdarstellung',
    icon: Type
  },
  REDUCED_MOTION: {
    id: 'reducedMotion',
    title: 'Reduzierte Animation',
    description: 'Weniger bewegte Elemente',
    icon: Zap
  },
  KEYBOARD_NAV: {
    id: 'keyboardNavigation',
    title: 'Tastatur-Navigation',
    description: 'Vollständige Tastatursteuerung',
    icon: Keyboard
  },
  FOCUS_INDICATORS: {
    id: 'focusIndicators',
    title: 'Fokus-Anzeigen',
    description: 'Deutliche Fokus-Hervorhebung',
    icon: Target
  }
};

const ANNOUNCEMENT_PRIORITIES = {
  URGENT: 'assertive',
  POLITE: 'polite',
  OFF: 'off'
};

// ============================================================================
// COMPONENT
// ============================================================================

const AccessibilityPanel = ({
  isActive = false,
  voiceState = VOICE_STATES.IDLE,
  transcript = '',
  config = {},
  isVisible = true,
  onConfigChange,
  className = '',
  ...props
}) => {
  // ============================================================================
  // HOOKS & STATE
  // ============================================================================
  
  const { settings, updateSettings } = useVoiceSettings();
  const { speak, stop, isPlaying } = useTextToSpeech();
  
  const [currentAnnouncement, setCurrentAnnouncement] = useState('');
  const [announcementHistory, setAnnouncementHistory] = useState([]);
  const [focusedElement, setFocusedElement] = useState(null);
  const [keyboardShortcuts, setKeyboardShortcuts] = useState(new Map());
  const [isAnnouncementEnabled, setIsAnnouncementEnabled] = useState(true);
  const [lastStateChange, setLastStateChange] = useState(null);
  
  // Refs for live regions
  const politeAnnouncementRef = useRef(null);
  const assertiveAnnouncementRef = useRef(null);
  const statusRef = useRef(null);
  const transcriptRef = useRef(null);
  
  // ============================================================================
  // MEMOIZED VALUES
  // ============================================================================
  
  const accessibilityConfig = useMemo(() => ({
    ...settings.accessibility,
    ...config
  }), [settings.accessibility, config]);
  
  const currentStateDescription = useMemo(() => 
    STATE_DESCRIPTIONS[voiceState] || STATE_DESCRIPTIONS[VOICE_STATES.IDLE],
    [voiceState]
  );
  
  const isHighContrastMode = useMemo(() => 
    accessibilityConfig.highContrast || 
    window.matchMedia('(prefers-contrast: high)').matches,
    [accessibilityConfig.highContrast]
  );
  
  const isReducedMotionMode = useMemo(() => 
    accessibilityConfig.reducedMotion || 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [accessibilityConfig.reducedMotion]
  );
  
  const isScreenReaderActive = useMemo(() => 
    accessibilityConfig.screenReader || 
    navigator.userAgent.includes('NVDA') ||
    navigator.userAgent.includes('JAWS') ||
    navigator.userAgent.includes('VoiceOver'),
    [accessibilityConfig.screenReader]
  );
  
  // ============================================================================
  // ANNOUNCEMENT FUNCTIONS
  // ============================================================================
  
  const announce = useCallback((message, priority = ANNOUNCEMENT_PRIORITIES.POLITE) => {
    if (!isAnnouncementEnabled || !message) return;
    
    const timestamp = new Date().toISOString();
    const announcement = {
      message,
      priority,
      timestamp,
      id: Math.random().toString(36).substr(2, 9)
    };
    
    setCurrentAnnouncement(message);
    setAnnouncementHistory(prev => [...prev.slice(-4), announcement]);
    
    // Update appropriate live region
    if (priority === ANNOUNCEMENT_PRIORITIES.ASSERTIVE && assertiveAnnouncementRef.current) {
      assertiveAnnouncementRef.current.textContent = message;
      // Clear after announcement
      setTimeout(() => {
        if (assertiveAnnouncementRef.current) {
          assertiveAnnouncementRef.current.textContent = '';
        }
      }, 1000);
    } else if (priority === ANNOUNCEMENT_PRIORITIES.POLITE && politeAnnouncementRef.current) {
      politeAnnouncementRef.current.textContent = message;
      setTimeout(() => {
        if (politeAnnouncementRef.current) {
          politeAnnouncementRef.current.textContent = '';
        }
      }, 3000);
    }
    
    // Also speak if TTS is available and screen reader is active
    if (isScreenReaderActive && !isPlaying) {
      speak(message, { rate: 1.2, volume: 0.8 });
    }
  }, [isAnnouncementEnabled, isScreenReaderActive, isPlaying, speak]);
  
  const announceStateChange = useCallback((newState, previousState) => {
    const stateMessage = STATE_DESCRIPTIONS[newState];
    if (stateMessage && newState !== previousState) {
      const priority = newState === VOICE_STATES.ERROR ? 
        ANNOUNCEMENT_PRIORITIES.ASSERTIVE : 
        ANNOUNCEMENT_PRIORITIES.POLITE;
      
      announce(stateMessage, priority);
      setLastStateChange({ newState, previousState, timestamp: Date.now() });
    }
  }, [announce]);
  
  const announceTranscriptUpdate = useCallback((newTranscript) => {
    if (newTranscript && newTranscript !== transcript) {
      // Only announce if transcript is substantially different
      const words = newTranscript.split(' ');
      if (words.length >= 3) {
        announce(`Erkannt: ${newTranscript}`, ANNOUNCEMENT_PRIORITIES.POLITE);
      }
    }
  }, [transcript, announce]);
  
  // ============================================================================
  // KEYBOARD NAVIGATION
  // ============================================================================
  
  const setupKeyboardShortcuts = useCallback(() => {
    const shortcuts = new Map([
      ['Alt+V', { action: 'toggleVoice', description: 'Spracherkennung ein/aus' }],
      ['Alt+H', { action: 'showHelp', description: 'Hilfe anzeigen' }],
      ['Alt+S', { action: 'readStatus', description: 'Status vorlesen' }],
      ['Alt+T', { action: 'readTranscript', description: 'Transkript vorlesen' }],
      ['Alt+C', { action: 'clearTranscript', description: 'Transkript löschen' }],
      ['Escape', { action: 'stopVoice', description: 'Spracherkennung stoppen' }]
    ]);
    
    setKeyboardShortcuts(shortcuts);
    return shortcuts;
  }, []);
  
  const handleKeyPress = useCallback((event) => {
    if (!accessibilityConfig.keyboardNavigation) return;
    
    const key = [
      event.ctrlKey && 'Ctrl',
      event.altKey && 'Alt', 
      event.shiftKey && 'Shift',
      event.key
    ].filter(Boolean).join('+');
    
    const shortcut = keyboardShortcuts.get(key);
    if (shortcut) {
      event.preventDefault();
      
      switch (shortcut.action) {
        case 'readStatus':
          announce(currentStateDescription, ANNOUNCEMENT_PRIORITIES.ASSERTIVE);
          break;
        case 'readTranscript':
          if (transcript) {
            announce(`Aktueller Text: ${transcript}`, ANNOUNCEMENT_PRIORITIES.ASSERTIVE);
          } else {
            announce('Kein Text erkannt', ANNOUNCEMENT_PRIORITIES.ASSERTIVE);
          }
          break;
        case 'showHelp':
          announce('Keyboard-Shortcuts: Alt+V für Voice, Alt+S für Status, Alt+T für Transkript', ANNOUNCEMENT_PRIORITIES.ASSERTIVE);
          break;
        default:
          break;
      }
    }
  }, [accessibilityConfig.keyboardNavigation, keyboardShortcuts, currentStateDescription, transcript, announce]);
  
  // ============================================================================
  // FOCUS MANAGEMENT
  // ============================================================================
  
  const manageFocus = useCallback(() => {
    if (!accessibilityConfig.focusIndicators) return;
    
    const handleFocusIn = (event) => {
      setFocusedElement(event.target);
      
      // Announce focused element if it has aria-label or accessible name
      const accessibleName = 
        event.target.getAttribute('aria-label') ||
        event.target.getAttribute('aria-labelledby') ||
        event.target.textContent?.trim();
      
      if (accessibleName && isScreenReaderActive) {
        announce(`Fokus auf: ${accessibleName}`, ANNOUNCEMENT_PRIORITIES.POLITE);
      }
    };
    
    const handleFocusOut = () => {
      setFocusedElement(null);
    };
    
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, [accessibilityConfig.focusIndicators, isScreenReaderActive, announce]);
  
  // ============================================================================
  // CONFIGURATION HANDLERS
  // ============================================================================
  
  const handleFeatureToggle = useCallback((featureId) => {
    const newSettings = {
      ...accessibilityConfig,
      [featureId]: !accessibilityConfig[featureId]
    };
    
    updateSettings({
      accessibility: newSettings
    });
    
    onConfigChange?.(newSettings);
    
    const feature = ACCESSIBILITY_FEATURES[featureId.toUpperCase()];
    if (feature) {
      announce(
        `${feature.title} ${newSettings[featureId] ? 'aktiviert' : 'deaktiviert'}`,
        ANNOUNCEMENT_PRIORITIES.POLITE
      );
    }
  }, [accessibilityConfig, updateSettings, onConfigChange, announce]);
  
  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  
  const renderFeatureToggle = useCallback((feature) => {
    const Icon = feature.icon;
    const isEnabled = accessibilityConfig[feature.id];
    
    return (
      <button
        key={feature.id}
        className={`${styles.featureToggle} ${isEnabled ? styles.enabled : styles.disabled}`}
        onClick={() => handleFeatureToggle(feature.id)}
        aria-pressed={isEnabled}
        aria-describedby={`${feature.id}-desc`}
      >
        <Icon size={16} />
        <div className={styles.featureInfo}>
          <span className={styles.featureTitle}>{feature.title}</span>
          <span 
            id={`${feature.id}-desc`}
            className={styles.featureDescription}
          >
            {feature.description}
          </span>
        </div>
        <div className={styles.toggleIndicator}>
          {isEnabled ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
        </div>
      </button>
    );
  }, [accessibilityConfig, handleFeatureToggle]);
  
  const renderKeyboardShortcuts = useCallback(() => {
    return (
      <div className={styles.shortcutsSection}>
        <h4>Tastatur-Shortcuts</h4>
        <dl className={styles.shortcutsList}>
          {Array.from(keyboardShortcuts.entries()).map(([key, shortcut]) => (
            <div key={key} className={styles.shortcutItem}>
              <dt className={styles.shortcutKey}>{key}</dt>
              <dd className={styles.shortcutDescription}>{shortcut.description}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }, [keyboardShortcuts]);
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  useEffect(() => {
    setupKeyboardShortcuts();
  }, [setupKeyboardShortcuts]);
  
  useEffect(() => {
    if (accessibilityConfig.keyboardNavigation) {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [accessibilityConfig.keyboardNavigation, handleKeyPress]);
  
  useEffect(() => {
    if (accessibilityConfig.focusIndicators) {
      return manageFocus();
    }
  }, [accessibilityConfig.focusIndicators, manageFocus]);
  
  // Announce state changes
  useEffect(() => {
    const previousState = lastStateChange?.newState;
    if (voiceState !== previousState) {
      announceStateChange(voiceState, previousState);
    }
  }, [voiceState, lastStateChange, announceStateChange]);
  
  // Announce transcript updates
  useEffect(() => {
    if (transcript && isActive) {
      announceTranscriptUpdate(transcript);
    }
  }, [transcript, isActive, announceTranscriptUpdate]);
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  if (!isVisible) {
    return (
      <>
        {/* Hidden live regions for screen readers */}
        <div
          ref={politeAnnouncementRef}
          aria-live="polite"
          aria-atomic="true"
          className={styles.srOnly}
        />
        <div
          ref={assertiveAnnouncementRef}
          aria-live="assertive"
          aria-atomic="true"
          className={styles.srOnly}
        />
      </>
    );
  }
  
  return (
    <div 
      className={`
        ${styles.accessibilityPanel} 
        ${className}
        ${isHighContrastMode ? styles.highContrast : ''}
        ${isReducedMotionMode ? styles.reducedMotion : ''}
        ${accessibilityConfig.largeText ? styles.largeText : ''}
      `}
      role="complementary"
      aria-labelledby="accessibility-title"
    >
      {/* Live Regions for Screen Readers */}
      <div
        ref={politeAnnouncementRef}
        aria-live="polite"
        aria-atomic="true"
        className={styles.srOnly}
      />
      <div
        ref={assertiveAnnouncementRef}
        aria-live="assertive"
        aria-atomic="true"
        className={styles.srOnly}
      />
      
      {/* Status Display */}
      <div className={styles.statusSection}>
        <h3 id="accessibility-title">Barrierefreiheit</h3>
        
        <div 
          ref={statusRef}
          className={styles.currentStatus}
          aria-live="polite"
          aria-atomic="true"
        >
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Voice Status:</span>
            <span className={`${styles.statusValue} ${styles[voiceState]}`}>
              {currentStateDescription}
            </span>
          </div>
          
          {transcript && (
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Erkannter Text:</span>
              <span 
                ref={transcriptRef}
                className={styles.statusValue}
                aria-live="polite"
              >
                "{transcript}"
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Accessibility Features */}
      <div className={styles.featuresSection}>
        <h4>Barrierefreiheit-Funktionen</h4>
        <div className={styles.featuresList}>
          {Object.values(ACCESSIBILITY_FEATURES).map(renderFeatureToggle)}
        </div>
      </div>
      
      {/* Keyboard Shortcuts */}
      {accessibilityConfig.keyboardNavigation && renderKeyboardShortcuts()}
      
      {/* Quick Actions */}
      <div className={styles.actionsSection}>
        <button
          className={styles.actionButton}
          onClick={() => announce(currentStateDescription, ANNOUNCEMENT_PRIORITIES.ASSERTIVE)}
          aria-label="Aktuellen Status vorlesen"
        >
          <Volume2 size={16} />
          Status vorlesen
        </button>
        
        <button
          className={styles.actionButton}
          onClick={() => setIsAnnouncementEnabled(!isAnnouncementEnabled)}
          aria-pressed={isAnnouncementEnabled}
          aria-label={`Ansagen ${isAnnouncementEnabled ? 'deaktivieren' : 'aktivieren'}`}
        >
          {isAnnouncementEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          Ansagen {isAnnouncementEnabled ? 'aus' : 'ein'}
        </button>
      </div>
      
      {/* Debug Info for Screen Reader Users */}
      {settings.advanced?.debugMode && isScreenReaderActive && (
        <div className={styles.debugSection}>
          <h4>Debug Informationen</h4>
          <div className={styles.debugInfo}>
            <div>Screen Reader: {isScreenReaderActive ? 'Aktiv' : 'Inaktiv'}</div>
            <div>Hoher Kontrast: {isHighContrastMode ? 'Aktiv' : 'Inaktiv'}</div>
            <div>Reduzierte Animation: {isReducedMotionMode ? 'Aktiv' : 'Inaktiv'}</div>
            <div>Ansagen: {isAnnouncementEnabled ? 'Aktiv' : 'Inaktiv'}</div>
            <div>Letzte Ansage: {announcementHistory[announcementHistory.length - 1]?.message || 'Keine'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export { AccessibilityPanel };