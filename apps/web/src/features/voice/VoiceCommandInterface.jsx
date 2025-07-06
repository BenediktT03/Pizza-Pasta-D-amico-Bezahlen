/**
 * EATECH - Voice Command Interface
 * Version: 4.5.0
 * Description: Interactive Voice Command Interface mit Lazy Loading & AI Integration
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/web/src/features/voice/VoiceCommandInterface.jsx
 * 
 * Features: Voice recognition, visual feedback, command suggestions, accessibility
 */

import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Volume2, VolumeX, Play, Pause, Square,
  MessageSquare, Loader, CheckCircle, AlertCircle, 
  Settings, HelpCircle, RefreshCw, Zap, Sparkles,
  Eye, EyeOff, Maximize2, Minimize2, X, Info,
  Languages, Headphones, Brain, Command, Hash,
  TrendingUp, Activity, BarChart3, Timer, Target
} from 'lucide-react';

// Hooks & Contexts
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Lazy loaded components
const VoiceVisualizer = lazy(() => import('./components/VoiceVisualizer'));
const CommandSuggestions = lazy(() => import('./components/CommandSuggestions'));
const TranscriptDisplay = lazy(() => import('./components/TranscriptDisplay'));
const VoiceSettings = lazy(() => import('./components/VoiceSettings'));
const LanguageSelector = lazy(() => import('./components/LanguageSelector'));
const CommandHistory = lazy(() => import('./components/CommandHistory'));
const VoiceAnalytics = lazy(() => import('./components/VoiceAnalytics'));
const AccessibilityPanel = lazy(() => import('./components/AccessibilityPanel'));
const VoiceTutorial = lazy(() => import('./components/VoiceTutorial'));
const ConfidenceIndicator = lazy(() => import('./components/ConfidenceIndicator'));

// Lazy loaded services
const voiceService = () => import('../../services/voiceService');
const aiService = () => import('../../services/aiService');
const analyticsService = () => import('../../services/analyticsService');
const accessibilityService = () => import('../../services/accessibilityService');

// Lazy loaded utilities
const audioUtils = () => import('../../utils/audioUtils');
const animationUtils = () => import('../../utils/animationUtils');
const keyboardUtils = () => import('../../utils/keyboardUtils');

// Interface states
export const INTERFACE_STATES = {
  IDLE: 'idle',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  SPEAKING: 'speaking',
  ERROR: 'error',
  DISABLED: 'disabled'
};

// Command categories
export const COMMAND_CATEGORIES = {
  NAVIGATION: 'navigation',
  ORDERING: 'ordering',
  SEARCH: 'search',
  CART: 'cart',
  USER: 'user',
  HELP: 'help',
  SYSTEM: 'system'
};

// Display modes
export const DISPLAY_MODES = {
  COMPACT: 'compact',
  EXPANDED: 'expanded',
  FULLSCREEN: 'fullscreen',
  MINIMAL: 'minimal'
};

const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-2">
    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
  </div>
);

const VoiceCommandInterface = ({
  onCommand,
  onTranscript,
  onError,
  initialLanguage = 'de-CH',
  showSuggestions = true,
  showHistory = true,
  showAnalytics = false,
  enableTutorial = true,
  displayMode = DISPLAY_MODES.COMPACT,
  position = 'bottom-right',
  className = ''
}) => {
  // ============================================================================
  // STATE
  // ============================================================================
  const [interfaceState, setInterfaceState] = useState(INTERFACE_STATES.IDLE);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(initialLanguage);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [lastCommand, setLastCommand] = useState(null);
  const [commandHistory, setCommandHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isVisible, setIsVisible] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [sessionStats, setSessionStats] = useState({
    commands: 0,
    successRate: 0,
    avgConfidence: 0,
    sessionTime: 0
  });
  const [settings, setSettings] = useState({
    continuousListening: false,
    enableSounds: true,
    enableVisuals: true,
    enableHaptics: true,
    confidenceThreshold: 0.7,
    autoExecute: true,
    enableShortcuts: true
  });

  // Hooks
  const { addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Refs
  const sessionStartRef = useRef(Date.now());
  const animationFrameRef = useRef(null);
  const confidenceHistoryRef = useRef([]);

  // Lazy loaded services refs
  const voiceServiceRef = useRef(null);
  const aiServiceRef = useRef(null);
  const analyticsServiceRef = useRef(null);
  const accessibilityServiceRef = useRef(null);
  const audioUtilsRef = useRef(null);
  const animationUtilsRef = useRef(null);
  const keyboardUtilsRef = useRef(null);

  // ============================================================================
  // LAZY LOADING SETUP
  // ============================================================================
  useEffect(() => {
    const initializeLazyServices = async () => {
      try {
        // Initialize utilities
        audioUtilsRef.current = await audioUtils();
        animationUtilsRef.current = await animationUtils();
        keyboardUtilsRef.current = await keyboardUtils();

        // Initialize services
        const VoiceService = await voiceService();
        voiceServiceRef.current = new VoiceService.default({
          language: currentLanguage,
          continuousListening: settings.continuousListening,
          confidenceThreshold: settings.confidenceThreshold
        });

        const AIService = await aiService();
        aiServiceRef.current = new AIService.default();

        const AnalyticsService = await analyticsService();
        analyticsServiceRef.current = new AnalyticsService.default();

        const AccessibilityService = await accessibilityService();
        accessibilityServiceRef.current = new AccessibilityService.default();

        // Setup voice service listeners
        setupVoiceListeners();

        // Setup keyboard shortcuts
        if (settings.enableShortcuts) {
          setupKeyboardShortcuts();
        }

        // Load command suggestions
        await loadSuggestions();

      } catch (error) {
        console.error('Failed to initialize voice interface:', error);
        setInterfaceState(INTERFACE_STATES.ERROR);
        onError?.(error);
      }
    };

    initializeLazyServices();
  }, [currentLanguage, settings, onError]);

  // ============================================================================
  // VOICE SERVICE SETUP
  // ============================================================================
  const setupVoiceListeners = useCallback(() => {
    if (!voiceServiceRef.current) return;

    voiceServiceRef.current.on('listening_started', () => {
      setInterfaceState(INTERFACE_STATES.LISTENING);
      startAudioVisualization();
    });

    voiceServiceRef.current.on('listening_stopped', () => {
      setInterfaceState(INTERFACE_STATES.IDLE);
      stopAudioVisualization();
    });

    voiceServiceRef.current.on('interim_result', ({ transcript, confidence }) => {
      setInterimTranscript(transcript);
      setConfidence(confidence);
      updateConfidenceHistory(confidence);
    });

    voiceServiceRef.current.on('transcript_processed', (result) => {
      handleTranscriptResult(result);
    });

    voiceServiceRef.current.on('speaking_started', () => {
      setInterfaceState(INTERFACE_STATES.SPEAKING);
    });

    voiceServiceRef.current.on('speaking_ended', () => {
      setInterfaceState(INTERFACE_STATES.IDLE);
    });

    voiceServiceRef.current.on('error', (error) => {
      setInterfaceState(INTERFACE_STATES.ERROR);
      handleVoiceError(error);
    });

    voiceServiceRef.current.on('clarification_requested', ({ transcript, confidence }) => {
      showClarificationRequest(transcript, confidence);
    });

  }, []);

  const setupKeyboardShortcuts = useCallback(() => {
    if (!keyboardUtilsRef.current) return;

    const shortcuts = {
      'ctrl+shift+v': () => toggleListening(),
      'ctrl+shift+h': () => setShowHistory(!showHistory),
      'ctrl+shift+s': () => setShowSettings(!showSettings),
      'ctrl+shift+t': () => setShowTutorial(!showTutorial),
      'escape': () => {
        if (interfaceState === INTERFACE_STATES.LISTENING) {
          stopListening();
        }
        setIsExpanded(false);
        setIsFullscreen(false);
      }
    };

    keyboardUtilsRef.current.registerShortcuts(shortcuts);
  }, [interfaceState, showHistory, showSettings, showTutorial]);

  // ============================================================================
  // VOICE CONTROL
  // ============================================================================
  const startListening = useCallback(async () => {
    if (!voiceServiceRef.current || interfaceState === INTERFACE_STATES.LISTENING) return;

    try {
      setInterfaceState(INTERFACE_STATES.LISTENING);
      await voiceServiceRef.current.startListening({
        language: currentLanguage,
        continuous: settings.continuousListening
      });

      // Track analytics
      if (analyticsServiceRef.current) {
        analyticsServiceRef.current.trackEvent('voice_listening_started', {
          language: currentLanguage,
          mode: settings.continuousListening ? 'continuous' : 'single'
        });
      }

    } catch (error) {
      setInterfaceState(INTERFACE_STATES.ERROR);
      handleVoiceError(error);
    }
  }, [interfaceState, currentLanguage, settings.continuousListening]);

  const stopListening = useCallback(() => {
    if (!voiceServiceRef.current || interfaceState !== INTERFACE_STATES.LISTENING) return;

    voiceServiceRef.current.stopListening();
    setInterfaceState(INTERFACE_STATES.IDLE);
    setInterimTranscript('');
    stopAudioVisualization();
  }, [interfaceState]);

  const toggleListening = useCallback(() => {
    if (interfaceState === INTERFACE_STATES.LISTENING) {
      stopListening();
    } else {
      startListening();
    }
  }, [interfaceState, startListening, stopListening]);

  // ============================================================================
  // TRANSCRIPT PROCESSING
  // ============================================================================
  const handleTranscriptResult = useCallback(async (result) => {
    const { transcript, confidence, analysis, result: commandResult } = result;

    setTranscript(transcript);
    setInterimTranscript('');
    setConfidence(confidence);
    setLastCommand(commandResult);

    // Add to history
    const historyItem = {
      id: Date.now(),
      transcript,
      confidence,
      command: commandResult,
      timestamp: new Date().toISOString(),
      success: commandResult?.success || false
    };

    setCommandHistory(prev => [historyItem, ...prev.slice(0, 49)]); // Keep last 50

    // Update session stats
    updateSessionStats(historyItem);

    // Call callbacks
    onTranscript?.(transcript, confidence);
    
    if (commandResult) {
      onCommand?.(commandResult, analysis);
    }

    // Execute command if auto-execute is enabled
    if (settings.autoExecute && commandResult?.success) {
      await executeCommand(commandResult);
    }

    // Provide audio feedback
    if (settings.enableSounds && commandResult?.success) {
      playSuccessSound();
    } else if (settings.enableSounds && !commandResult?.success) {
      playErrorSound();
    }

    // Provide haptic feedback
    if (settings.enableHaptics && 'vibrate' in navigator) {
      navigator.vibrate(commandResult?.success ? [50] : [100, 50, 100]);
    }

  }, [settings, onTranscript, onCommand]);

  const executeCommand = useCallback(async (command) => {
    try {
      switch (command.type) {
        case 'navigation':
          navigate(command.target);
          break;

        case 'order':
          if (command.items && command.items.length > 0) {
            for (const item of command.items) {
              await addToCart(item);
            }
          }
          break;

        case 'command':
          // Handle system commands
          switch (command.action) {
            case 'SHOW_CART':
              // Emit event to show cart
              window.dispatchEvent(new CustomEvent('showCart'));
              break;
            case 'SHOW_MENU':
              navigate('/menu');
              break;
            case 'CHECKOUT':
              navigate('/checkout');
              break;
          }
          break;

        case 'help':
          if (enableTutorial) {
            setShowTutorial(true);
          }
          break;
      }

    } catch (error) {
      console.error('Failed to execute command:', error);
    }
  }, [navigate, addToCart, enableTutorial]);

  // ============================================================================
  // SUGGESTIONS & HELP
  // ============================================================================
  const loadSuggestions = useCallback(async () => {
    if (!aiServiceRef.current) return;

    try {
      const contextualSuggestions = await aiServiceRef.current.getVoiceCommandSuggestions({
        language: currentLanguage,
        userHistory: commandHistory.slice(0, 10),
        currentPage: window.location.pathname
      });

      setSuggestions(contextualSuggestions);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  }, [currentLanguage, commandHistory]);

  const showClarificationRequest = useCallback((transcript, confidence) => {
    // Show UI for clarification
    setTranscript(`Did you say "${transcript}"?`);
    setConfidence(confidence);
    
    // Provide clarification options
    const clarificationSuggestions = [
      `Yes, I said "${transcript}"`,
      'No, let me try again',
      'Show me voice commands'
    ];
    
    setSuggestions(clarificationSuggestions);
  }, []);

  // ============================================================================
  // AUDIO VISUALIZATION
  // ============================================================================
  const startAudioVisualization = useCallback(() => {
    if (!audioUtilsRef.current || !settings.enableVisuals) return;

    const updateVisualization = () => {
      if (interfaceState === INTERFACE_STATES.LISTENING) {
        // Simulate audio level for visualization
        const level = Math.random() * 0.8 + 0.2;
        setAudioLevel(level);
        
        animationFrameRef.current = requestAnimationFrame(updateVisualization);
      }
    };

    updateVisualization();
  }, [interfaceState, settings.enableVisuals]);

  const stopAudioVisualization = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  // ============================================================================
  // ANALYTICS & STATS
  // ============================================================================
  const updateSessionStats = useCallback((command) => {
    setSessionStats(prev => {
      const newStats = {
        commands: prev.commands + 1,
        successRate: ((prev.successRate * prev.commands) + (command.success ? 1 : 0)) / (prev.commands + 1),
        avgConfidence: ((prev.avgConfidence * prev.commands) + command.confidence) / (prev.commands + 1),
        sessionTime: Date.now() - sessionStartRef.current
      };

      // Track analytics
      if (analyticsServiceRef.current) {
        analyticsServiceRef.current.trackEvent('voice_command_executed', {
          success: command.success,
          confidence: command.confidence,
          session_stats: newStats
        });
      }

      return newStats;
    });
  }, []);

  const updateConfidenceHistory = useCallback((confidence) => {
    confidenceHistoryRef.current.push(confidence);
    if (confidenceHistoryRef.current.length > 100) {
      confidenceHistoryRef.current = confidenceHistoryRef.current.slice(-50);
    }
  }, []);

  // ============================================================================
  // AUDIO FEEDBACK
  // ============================================================================
  const playSuccessSound = useCallback(() => {
    if (audioUtilsRef.current) {
      audioUtilsRef.current.playTone(800, 100); // High tone for success
    }
  }, []);

  const playErrorSound = useCallback(() => {
    if (audioUtilsRef.current) {
      audioUtilsRef.current.playTone(300, 200); // Low tone for error
    }
  }, []);

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================
  const handleVoiceError = useCallback((error) => {
    console.error('Voice interface error:', error);
    
    let errorMessage = 'Voice recognition error';
    
    if (error.message.includes('not-allowed')) {
      errorMessage = 'Microphone permission denied';
    } else if (error.message.includes('no-speech')) {
      errorMessage = 'No speech detected';
    } else if (error.message.includes('network')) {
      errorMessage = 'Network error';
    }

    setTranscript(errorMessage);
    onError?.(error);

    // Auto-recover after error
    setTimeout(() => {
      if (interfaceState === INTERFACE_STATES.ERROR) {
        setInterfaceState(INTERFACE_STATES.IDLE);
        setTranscript('');
      }
    }, 3000);
  }, [interfaceState, onError]);

  // ============================================================================
  // DISPLAY MODES
  // ============================================================================
  const getInterfaceSize = () => {
    if (isFullscreen) return 'fixed inset-0';
    if (isExpanded) return 'w-96 h-80';
    return 'w-16 h-16';
  };

  const getPositionClasses = () => {
    const positions = {
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
      'center': 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
    };
    
    return positions[position] || positions['bottom-right'];
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  const renderMainButton = () => {
    const stateConfig = {
      [INTERFACE_STATES.IDLE]: {
        icon: Mic,
        color: 'bg-primary hover:bg-primary-dark',
        text: 'Start Voice Command'
      },
      [INTERFACE_STATES.LISTENING]: {
        icon: MicOff,
        color: 'bg-red-500 hover:bg-red-600 animate-pulse',
        text: 'Stop Listening'
      },
      [INTERFACE_STATES.PROCESSING]: {
        icon: Loader,
        color: 'bg-blue-500',
        text: 'Processing...'
      },
      [INTERFACE_STATES.SPEAKING]: {
        icon: Volume2,
        color: 'bg-green-500 animate-pulse',
        text: 'Speaking...'
      },
      [INTERFACE_STATES.ERROR]: {
        icon: AlertCircle,
        color: 'bg-red-500 hover:bg-red-600',
        text: 'Error - Click to retry'
      },
      [INTERFACE_STATES.DISABLED]: {
        icon: MicOff,
        color: 'bg-gray-400 cursor-not-allowed',
        text: 'Voice commands unavailable'
      }
    };

    const config = stateConfig[interfaceState];
    const Icon = config.icon;

    return (
      <motion.button
        onClick={interfaceState === INTERFACE_STATES.LISTENING ? stopListening : startListening}
        disabled={interfaceState === INTERFACE_STATES.DISABLED}
        className={`
          ${getInterfaceSize()} ${config.color} text-white rounded-full shadow-lg 
          transition-all duration-300 flex items-center justify-center
          focus:outline-none focus:ring-4 focus:ring-blue-300
        `}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={config.text}
      >
        {interfaceState === INTERFACE_STATES.PROCESSING ? (
          <LoadingSpinner />
        ) : (
          <Icon className={`${isExpanded || isFullscreen ? 'w-8 h-8' : 'w-6 h-6'}`} />
        )}
      </motion.button>
    );
  };

  const renderExpandedInterface = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-primary" />
          <span className="font-semibold text-gray-900">Voice Commands</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 hover:bg-gray-200 rounded"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 hover:bg-gray-200 rounded"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1 hover:bg-gray-200 rounded"
            title="Minimize"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Status Display */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Suspense fallback={<div className="h-8 bg-gray-100 rounded animate-pulse"></div>}>
              <TranscriptDisplay
                transcript={transcript}
                interimTranscript={interimTranscript}
                confidence={confidence}
                state={interfaceState}
              />
            </Suspense>
          </div>
          
          <Suspense fallback={null}>
            <ConfidenceIndicator
              confidence={confidence}
              threshold={settings.confidenceThreshold}
            />
          </Suspense>
        </div>

        {/* Voice Visualizer */}
        {settings.enableVisuals && (
          <Suspense fallback={<div className="h-12 bg-gray-100 rounded"></div>}>
            <VoiceVisualizer
              audioLevel={audioLevel}
              isListening={interfaceState === INTERFACE_STATES.LISTENING}
              confidenceHistory={confidenceHistoryRef.current}
            />
          </Suspense>
        )}

        {/* Command Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <Suspense fallback={<LoadingSpinner />}>
            <CommandSuggestions
              suggestions={suggestions}
              onSuggestionClick={(suggestion) => {
                setTranscript(suggestion);
                if (settings.autoExecute) {
                  // Process suggestion as voice command
                  voiceServiceRef.current?.processTranscript(suggestion, 1.0);
                }
              }}
            />
          </Suspense>
        )}

        {/* Quick Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowTutorial(true)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <HelpCircle className="w-4 h-4" />
            Help
          </button>
          
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
          >
            <MessageSquare className="w-4 h-4" />
            History
          </button>
          
          <Suspense fallback={null}>
            <LanguageSelector
              currentLanguage={currentLanguage}
              onLanguageChange={(lang) => {
                setCurrentLanguage(lang);
                if (voiceServiceRef.current) {
                  voiceServiceRef.current.setLanguage(lang);
                }
              }}
            />
          </Suspense>
        </div>
      </div>

      {/* Command History */}
      {showHistory && (
        <Suspense fallback={<LoadingSpinner />}>
          <CommandHistory
            history={commandHistory}
            onCommandReplay={(command) => {
              if (voiceServiceRef.current) {
                voiceServiceRef.current.processTranscript(command.transcript, command.confidence);
              }
            }}
            onClearHistory={() => setCommandHistory([])}
          />
        </Suspense>
      )}
    </motion.div>
  );

  const renderFullscreenInterface = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
    >
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
        {renderExpandedInterface()}
        
        {/* Additional fullscreen content */}
        {showAnalytics && (
          <Suspense fallback={<LoadingSpinner />}>
            <VoiceAnalytics
              sessionStats={sessionStats}
              commandHistory={commandHistory}
              confidenceHistory={confidenceHistoryRef.current}
            />
          </Suspense>
        )}
      </div>
    </motion.div>
  );

  // ============================================================================
  // RENDER
  // ============================================================================
  if (!isVisible) return null;

  return (
    <>
      <div className={`fixed z-50 ${getPositionClasses()} ${className}`}>
        <AnimatePresence>
          {!isExpanded && !isFullscreen && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              onDoubleClick={() => setIsExpanded(true)}
            >
              {renderMainButton()}
            </motion.div>
          )}
          
          {isExpanded && !isFullscreen && renderExpandedInterface()}
        </AnimatePresence>
      </div>

      {/* Fullscreen Mode */}
      <AnimatePresence>
        {isFullscreen && renderFullscreenInterface()}
      </AnimatePresence>

      {/* Settings Modal */}
      {showSettings && (
        <Suspense fallback={null}>
          <VoiceSettings
            isOpen={showSettings}
            settings={settings}
            onSettingsChange={setSettings}
            onClose={() => setShowSettings(false)}
          />
        </Suspense>
      )}

      {/* Tutorial Modal */}
      {showTutorial && enableTutorial && (
        <Suspense fallback={null}>
          <VoiceTutorial
            isOpen={showTutorial}
            language={currentLanguage}
            onClose={() => setShowTutorial(false)}
          />
        </Suspense>
      )}

      {/* Accessibility Panel */}
      <Suspense fallback={null}>
        <AccessibilityPanel
          voiceEnabled={interfaceState !== INTERFACE_STATES.DISABLED}
          onToggleVoice={() => setIsVisible(!isVisible)}
          settings={settings}
          onSettingsChange={setSettings}
        />
      </Suspense>
    </>
  );
};

export default VoiceCommandInterface;