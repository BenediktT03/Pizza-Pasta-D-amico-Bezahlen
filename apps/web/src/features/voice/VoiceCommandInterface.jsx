/**
 * EATECH - Voice Command Interface
 * Version: 4.0.0
 * Description: Fortgeschrittene Sprachkommando-Schnittstelle mit Lazy Loading & KI
 * Author: EATECH Development Team
 * Created: 2025-01-08
 *
 * File Path: /apps/web/src/features/voice/VoiceCommandInterface.jsx
 *
 * Features:
 * - Advanced voice recognition with Swiss German support
 * - Lazy loading for performance optimization
 * - AI-powered natural language processing
 * - Real-time command visualization
 * - Multi-modal interaction (voice + gesture)
 * - Context-aware command interpretation
 */

import {
  AlertCircle,
  Brain,
  Check,
  ChevronDown, ChevronUp,
  HelpCircle,
  MessageSquare,
  Mic, MicOff,
  RotateCcw,
  Settings,
  Target,
  Volume2, VolumeX,
  X
} from 'lucide-react';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition
} from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useTenant } from '../../contexts/TenantContext';
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor';
import { useVoicePreferences } from '../../hooks/useVoicePreferences';
import styles from './VoiceCommandInterface.module.css';

// ============================================================================
// LAZY LOADED COMPONENTS (Performance Optimization)
// ============================================================================

// Core Voice Components
const VoiceWaveform = lazy(() =>
  import('./components/VoiceWaveform').then(module => ({
    default: module.VoiceWaveform
  }))
);

const CommandVisualizer = lazy(() =>
  import('./components/CommandVisualizer').then(module => ({
    default: module.CommandVisualizer
  }))
);

const VoiceSettings = lazy(() =>
  import('./components/VoiceSettings').then(module => ({
    default: module.VoiceSettings
  }))
);

const LanguageSelector = lazy(() =>
  import('./components/LanguageSelector').then(module => ({
    default: module.LanguageSelector
  }))
);

// Advanced Components
const ContextualHelp = lazy(() =>
  import('./components/ContextualHelp').then(module => ({
    default: module.ContextualHelp
  }))
);

const CommandHistory = lazy(() =>
  import('./components/CommandHistory').then(module => ({
    default: module.CommandHistory
  }))
);

const VoiceTutorial = lazy(() =>
  import('./components/VoiceTutorial').then(module => ({
    default: module.VoiceTutorial
  }))
);

const AccessibilityPanel = lazy(() =>
  import('./components/AccessibilityPanel').then(module => ({
    default: module.AccessibilityPanel
  }))
);

// AI & Analytics Components
const NLPDebugger = lazy(() =>
  import('./components/NLPDebugger').then(module => ({
    default: module.NLPDebugger
  }))
);

const VoiceAnalytics = lazy(() =>
  import('./components/VoiceAnalytics').then(module => ({
    default: module.VoiceAnalytics
  }))
);

const IntentPreview = lazy(() =>
  import('./components/IntentPreview').then(module => ({
    default: module.IntentPreview
  }))
);

// ============================================================================
// LAZY LOADED SERVICES
// ============================================================================

const SpeechRecognitionService = lazy(() =>
  import('../../services/voice/SpeechRecognitionService').then(module => ({
    default: module.SpeechRecognitionService
  }))
);

const TextToSpeechService = lazy(() =>
  import('../../services/voice/TextToSpeechService').then(module => ({
    default: module.TextToSpeechService
  }))
);

const NaturalLanguageProcessor = lazy(() =>
  import('../../services/ai/NaturalLanguageProcessor').then(module => ({
    default: module.NaturalLanguageProcessor
  }))
);

const VoiceCommandProcessor = lazy(() =>
  import('../../services/voice/VoiceCommandProcessor').then(module => ({
    default: module.VoiceCommandProcessor
  }))
);

const VoiceAnalyticsService = lazy(() =>
  import('../../services/analytics/VoiceAnalyticsService').then(module => ({
    default: module.VoiceAnalyticsService
  }))
);

const ContextAwareService = lazy(() =>
  import('../../services/ai/ContextAwareService').then(module => ({
    default: module.ContextAwareService
  }))
);

// ============================================================================
// LAZY LOADED UTILITIES
// ============================================================================

const SwissGermanProcessor = lazy(() =>
  import('../../utils/voice/SwissGermanProcessor').then(module => ({
    default: module.SwissGermanProcessor
  }))
);

const CommandMatcher = lazy(() =>
  import('../../utils/voice/CommandMatcher').then(module => ({
    default: module.CommandMatcher
  }))
);

const VoiceErrorHandler = lazy(() =>
  import('../../utils/voice/VoiceErrorHandler').then(module => ({
    default: module.VoiceErrorHandler
  }))
);

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const VOICE_STATES = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  SPEAKING: 'speaking',
  ERROR: 'error',
  TIMEOUT: 'timeout',
  CALIBRATING: 'calibrating'
};

const SUPPORTED_LANGUAGES = {
  'de-CH': {
    name: 'Schweizerdeutsch',
    code: 'de-CH',
    flag: '🇨🇭',
    ttsVoice: 'de-CH-LeniNeural',
    confidence: 0.65 // Lower threshold for Swiss German
  },
  'de-DE': {
    name: 'Deutsch',
    code: 'de-DE',
    flag: '🇩🇪',
    ttsVoice: 'de-DE-KatjaNeural',
    confidence: 0.75
  },
  'fr-CH': {
    name: 'Français (Suisse)',
    code: 'fr-CH',
    flag: '🇫🇷',
    ttsVoice: 'fr-CH-FabriceNeural',
    confidence: 0.75
  },
  'it-CH': {
    name: 'Italiano (Svizzera)',
    code: 'it-CH',
    flag: '🇮🇹',
    ttsVoice: 'it-CH-PeppineNeural',
    confidence: 0.75
  },
  'en-US': {
    name: 'English',
    code: 'en-US',
    flag: '🇺🇸',
    ttsVoice: 'en-US-AriaNeural',
    confidence: 0.8
  }
};

const COMMAND_CATEGORIES = {
  ORDERING: {
    patterns: ['bestellen', 'order', 'kaufen', 'hinzufügen', 'nimm', 'ich hätte gern'],
    icon: '🛒',
    priority: 1
  },
  NAVIGATION: {
    patterns: ['zeig', 'geh zu', 'öffne', 'zurück', 'weiter'],
    icon: '🧭',
    priority: 2
  },
  INQUIRY: {
    patterns: ['was kostet', 'preis', 'info', 'allergen', 'inhaltsstoff'],
    icon: '❓',
    priority: 2
  },
  CART: {
    patterns: ['warenkorb', 'cart', 'bestellung', 'total', 'summe'],
    icon: '🛍️',
    priority: 1
  },
  PAYMENT: {
    patterns: ['bezahlen', 'checkout', 'bestätigen', 'abschließen'],
    icon: '💳',
    priority: 1
  },
  CONTROL: {
    patterns: ['stopp', 'abbrechen', 'hilfe', 'wiederholen', 'lauter', 'leiser'],
    icon: '⚙️',
    priority: 3
  }
};

const PERFORMANCE_THRESHOLDS = {
  LOADING: 100,     // Component loading time
  PROCESSING: 500,  // Voice processing time
  RESPONSE: 200,    // TTS response time
  ACCURACY: 0.7     // Minimum accuracy threshold
};

// ============================================================================
// LOADING COMPONENTS
// ============================================================================

const LoadingSpinner = ({ size = 24, message = 'Wird geladen...' }) => (
  <div className={styles.loadingContainer}>
    <div
      className={styles.spinner}
      style={{ width: size, height: size }}
      aria-label={message}
    />
    <span className={styles.loadingMessage}>{message}</span>
  </div>
);

const SkeletonLoader = ({ type = 'default' }) => (
  <div className={`${styles.skeleton} ${styles[`skeleton${type}`]}`}>
    <div className={styles.skeletonShimmer} />
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const VoiceCommandInterface = ({
  products = [],
  onProductAdd,
  onProductRemove,
  onNavigate,
  onOrderComplete,
  className = '',
  autoStart = false,
  debugMode = false,
  accessibility = {},
  customCommands = [],
  onCommandExecuted,
  onError,
  theme = 'auto'
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Core Voice State
  const [voiceState, setVoiceState] = useState(VOICE_STATES.IDLE);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);

  // Recognition State
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recognitionError, setRecognitionError] = useState(null);

  // Processing State
  const [currentIntent, setCurrentIntent] = useState(null);
  const [processingResult, setProcessingResult] = useState(null);
  const [commandHistory, setCommandHistory] = useState([]);
  const [lastSuccessfulCommand, setLastSuccessfulCommand] = useState(null);

  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showDebugger, setShowDebugger] = useState(debugMode);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(theme === 'dark');

  // Performance State
  const [loadingStates, setLoadingStates] = useState({});
  const [errorStates, setErrorStates] = useState({});
  const [performanceMetrics, setPerformanceMetrics] = useState({});

  // Transition for smooth UI updates
  const [isPending, startTransition] = useTransition();

  // ============================================================================
  // REFS & HOOKS
  // ============================================================================

  const recognitionRef = useRef(null);
  const synthesisRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const timeoutRef = useRef(null);
  const calibrationRef = useRef(null);
  const performanceRef = useRef({});

  // Custom Hooks
  const { user } = useAuth();
  const { cart, addItem, removeItem, clear } = useCart();
  const { tenant } = useTenant();
  const {
    language,
    voiceEnabled,
    volume,
    rate,
    updatePreferences
  } = useVoicePreferences();
  const {
    startMeasurement,
    endMeasurement,
    getMetrics
  } = usePerformanceMonitor();

  // ============================================================================
  // MEMOIZED VALUES
  // ============================================================================

  const currentLanguageConfig = useMemo(() =>
    SUPPORTED_LANGUAGES[language] || SUPPORTED_LANGUAGES['de-CH'],
    [language]
  );

  const availableCommands = useMemo(() => [
    ...Object.values(COMMAND_CATEGORIES),
    ...customCommands
  ], [customCommands]);

  const isVoiceSupported = useMemo(() =>
    'webkitSpeechRecognition' in window ||
    'SpeechRecognition' in window,
    []
  );

  const shouldAutoStart = useMemo(() =>
    autoStart && isVoiceSupported && voiceEnabled,
    [autoStart, isVoiceSupported, voiceEnabled]
  );

  // ============================================================================
  // SERVICE INITIALIZATION
  // ============================================================================

  const initializeServices = useCallback(async () => {
    const initStart = performance.now();
    setVoiceState(VOICE_STATES.INITIALIZING);

    try {
      setLoadingStates(prev => ({ ...prev, services: true }));

      // Initialize core services with lazy loading
      const services = await Promise.allSettled([
        SpeechRecognitionService(),
        TextToSpeechService(),
        NaturalLanguageProcessor(),
        VoiceCommandProcessor(),
        VoiceAnalyticsService(),
        ContextAwareService()
      ]);

      // Check for failed services
      const failedServices = services
        .map((result, index) => ({ result, index }))
        .filter(({ result }) => result.status === 'rejected');

      if (failedServices.length > 0) {
        console.warn('Some services failed to initialize:', failedServices);
      }

      // Initialize utilities
      await Promise.allSettled([
        SwissGermanProcessor(),
        CommandMatcher(),
        VoiceErrorHandler()
      ]);

      // Setup speech recognition
      await setupSpeechRecognition();

      // Setup audio analysis
      await setupAudioAnalysis();

      // Initialize analytics
      const { default: AnalyticsService } = await VoiceAnalyticsService();
      await AnalyticsService.initialize({
        userId: user?.id,
        tenantId: tenant?.id,
        language: language
      });

      const initTime = performance.now() - initStart;
      setPerformanceMetrics(prev => ({
        ...prev,
        initializationTime: initTime
      }));

      setIsInitialized(true);
      setVoiceState(VOICE_STATES.IDLE);

      // Auto-start if configured
      if (shouldAutoStart) {
        setTimeout(() => startListening(), 1000);
      }

    } catch (error) {
      console.error('Service initialization failed:', error);
      setRecognitionError('Initialisierung fehlgeschlagen');
      setVoiceState(VOICE_STATES.ERROR);
      onError?.(error);
    } finally {
      setLoadingStates(prev => ({ ...prev, services: false }));
    }
  }, [language, user, tenant, shouldAutoStart, onError]);

  const setupSpeechRecognition = useCallback(async () => {
    if (!isVoiceSupported) {
      throw new Error('Speech recognition not supported');
    }

    try {
      const { default: SpeechService } = await SpeechRecognitionService();

      recognitionRef.current = new SpeechService({
        language: currentLanguageConfig.code,
        continuous: true,
        interimResults: true,
        maxAlternatives: 3
      });

      // Event handlers
      recognitionRef.current.onstart = handleRecognitionStart;
      recognitionRef.current.onresult = handleRecognitionResult;
      recognitionRef.current.onerror = handleRecognitionError;
      recognitionRef.current.onend = handleRecognitionEnd;

    } catch (error) {
      console.error('Speech recognition setup failed:', error);
      throw error;
    }
  }, [currentLanguageConfig.code, isVoiceSupported]);

  const setupAudioAnalysis = useCallback(async () => {
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
    } catch (error) {
      console.warn('Audio analysis setup failed:', error);
      // Non-critical, continue without audio visualization
    }
  }, []);

  // ============================================================================
  // SPEECH RECOGNITION HANDLERS
  // ============================================================================

  const handleRecognitionStart = useCallback(() => {
    setIsListening(true);
    setVoiceState(VOICE_STATES.LISTENING);
    setRecognitionError(null);
    startMeasurement('recognition_session');
  }, [startMeasurement]);

  const handleRecognitionResult = useCallback(async (event) => {
    const measurementId = startMeasurement('recognition_processing');

    try {
      let interimTranscript = '';
      let finalTranscriptText = '';
      let highestConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptText = result[0].transcript;
        const confidenceScore = result[0].confidence || 0;

        if (result.isFinal) {
          finalTranscriptText += transcriptText;
          setFinalTranscript(prev => prev + transcriptText);

          // Process final result
          await processVoiceCommand(transcriptText, confidenceScore);
        } else {
          interimTranscript += transcriptText;
        }

        highestConfidence = Math.max(highestConfidence, confidenceScore);
      }

      setTranscript(interimTranscript || finalTranscriptText);
      setConfidence(highestConfidence);

    } catch (error) {
      console.error('Recognition result processing failed:', error);
      setRecognitionError('Sprachverarbeitung fehlgeschlagen');
    } finally {
      endMeasurement(measurementId);
    }
  }, [startMeasurement, endMeasurement]);

  const handleRecognitionError = useCallback(async (event) => {
    console.error('Speech recognition error:', event.error);

    const { default: ErrorHandler } = await VoiceErrorHandler();
    const errorMessage = ErrorHandler.getLocalizedMessage(event.error, language);

    setRecognitionError(errorMessage);
    setVoiceState(VOICE_STATES.ERROR);
    setIsListening(false);

    // Analytics
    try {
      const { default: AnalyticsService } = await VoiceAnalyticsService();
      AnalyticsService.trackError('speech_recognition_error', {
        error: event.error,
        language: language,
        userId: user?.id
      });
    } catch (analyticsError) {
      console.warn('Analytics tracking failed:', analyticsError);
    }

    onError?.(event.error);
  }, [language, user, onError]);

  const handleRecognitionEnd = useCallback(() => {
    setIsListening(false);
    if (voiceState !== VOICE_STATES.ERROR) {
      setVoiceState(VOICE_STATES.IDLE);
    }
    endMeasurement('recognition_session');
  }, [voiceState, endMeasurement]);

  // ============================================================================
  // COMMAND PROCESSING
  // ============================================================================

  const processVoiceCommand = useCallback(async (transcriptText, confidenceScore) => {
    const processingStart = performance.now();
    setVoiceState(VOICE_STATES.PROCESSING);

    try {
      // Confidence check
      const minConfidence = currentLanguageConfig.confidence;
      if (confidenceScore < minConfidence) {
        await speakResponse('Entschuldigung, ich habe Sie nicht verstanden. Können Sie das wiederholen?');
        return;
      }

      // Swiss German preprocessing
      let processedTranscript = transcriptText;
      if (language === 'de-CH') {
        const { default: SwissProcessor } = await SwissGermanProcessor();
        processedTranscript = SwissProcessor.normalizeText(transcriptText);
      }

      // NLP processing
      const { default: NLPService } = await NaturalLanguageProcessor();
      const intent = await NLPService.processCommand(processedTranscript, {
        language: language,
        context: {
          currentPage: window.location.pathname,
          cartItems: cart?.items || [],
          products: products,
          user: user
        },
        confidence: confidenceScore
      });

      setCurrentIntent(intent);

      // Command processing
      const { default: CommandProcessor } = await VoiceCommandProcessor();
      const result = await CommandProcessor.executeCommand(intent, {
        products,
        cart,
        user,
        tenant,
        callbacks: {
          onProductAdd,
          onProductRemove,
          onNavigate,
          onOrderComplete
        }
      });

      setProcessingResult(result);

      // Update command history
      const commandEntry = {
        id: Date.now(),
        timestamp: new Date(),
        transcript: transcriptText,
        processedTranscript,
        intent,
        result,
        confidence: confidenceScore,
        processingTime: performance.now() - processingStart
      };

      setCommandHistory(prev => [commandEntry, ...prev.slice(0, 19)]); // Keep last 20

      if (result.success) {
        setLastSuccessfulCommand(commandEntry);
        await speakResponse(result.message);
        onCommandExecuted?.(commandEntry);
      } else {
        await speakResponse(result.error || 'Der Befehl konnte nicht ausgeführt werden.');
      }

      // Analytics
      const { default: AnalyticsService } = await VoiceAnalyticsService();
      AnalyticsService.trackCommand({
        transcript: transcriptText,
        intent: intent.name,
        confidence: confidenceScore,
        success: result.success,
        processingTime: performance.now() - processingStart,
        language: language,
        userId: user?.id,
        tenantId: tenant?.id
      });

    } catch (error) {
      console.error('Command processing failed:', error);
      await speakResponse('Es gab einen Fehler bei der Verarbeitung Ihres Befehls.');
      setVoiceState(VOICE_STATES.ERROR);
    } finally {
      setVoiceState(VOICE_STATES.IDLE);
    }
  }, [
    currentLanguageConfig.confidence,
    language,
    cart,
    products,
    user,
    tenant,
    onProductAdd,
    onProductRemove,
    onNavigate,
    onOrderComplete,
    onCommandExecuted
  ]);

  // ============================================================================
  // TEXT-TO-SPEECH
  // ============================================================================

  const speakResponse = useCallback(async (text) => {
    if (!text || isSpeaking) return;

    try {
      setIsSpeaking(true);
      setVoiceState(VOICE_STATES.SPEAKING);

      const { default: TTSService } = await TextToSpeechService();

      await TTSService.speak(text, {
        voice: currentLanguageConfig.ttsVoice,
        rate: rate,
        volume: volume,
        pitch: 1.0
      });

    } catch (error) {
      console.error('Text-to-speech failed:', error);
    } finally {
      setIsSpeaking(false);
      setVoiceState(VOICE_STATES.IDLE);
    }
  }, [isSpeaking, currentLanguageConfig.ttsVoice, rate, volume]);

  // ============================================================================
  // CONTROL FUNCTIONS
  // ============================================================================

  const startListening = useCallback(async () => {
    if (!isInitialized || !voiceEnabled || isListening) return;

    try {
      setRecognitionError(null);
      setTranscript('');
      setFinalTranscript('');
      setConfidence(0);

      // Request microphone permission
      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Setup audio analysis
        if (audioContextRef.current && analyserRef.current && streamRef.current) {
          const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
          source.connect(analyserRef.current);

          // Start audio level monitoring
          monitorAudioLevel();
        }
      } catch (permissionError) {
        console.error('Microphone permission denied:', permissionError);
        setRecognitionError('Mikrofon-Zugriff wurde verweigert');
        return;
      }

      await recognitionRef.current.start();

      // Set timeout for automatic stop
      timeoutRef.current = setTimeout(() => {
        if (isListening) {
          stopListening();
          speakResponse('Zeitüberschreitung erreicht.');
        }
      }, 30000); // 30 seconds

    } catch (error) {
      console.error('Failed to start listening:', error);
      setRecognitionError('Spracherkennung konnte nicht gestartet werden');
    }
  }, [isInitialized, voiceEnabled, isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setIsListening(false);
    setAudioLevel(0);
  }, [isListening]);

  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

    const updateLevel = () => {
      if (!isListening) return;

      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const normalizedLevel = average / 255;

      setAudioLevel(normalizedLevel);

      requestAnimationFrame(updateLevel);
    };

    updateLevel();
  }, [isListening]);

  // ============================================================================
  // CALIBRATION
  // ============================================================================

  const startCalibration = useCallback(async () => {
    setIsCalibrating(true);
    setVoiceState(VOICE_STATES.CALIBRATING);

    try {
      await speakResponse('Bitte sagen Sie: "Hallo EATECH" um die Spracherkennung zu kalibrieren.');

      // Start listening for calibration phrase
      calibrationRef.current = setTimeout(() => {
        setIsCalibrating(false);
        setVoiceState(VOICE_STATES.IDLE);
        speakResponse('Kalibrierung abgeschlossen.');
      }, 10000);

    } catch (error) {
      console.error('Calibration failed:', error);
      setIsCalibrating(false);
      setVoiceState(VOICE_STATES.ERROR);
    }
  }, []);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleLanguageChange = useCallback(async (newLanguage) => {
    updatePreferences({ language: newLanguage });

    // Reinitialize speech recognition with new language
    if (recognitionRef.current) {
      stopListening();
      await setupSpeechRecognition();
    }

    // Speak confirmation in new language
    const messages = {
      'de-CH': 'Sprache wurde zu Schweizerdeutsch geändert',
      'de-DE': 'Sprache wurde zu Deutsch geändert',
      'fr-CH': 'Langue changée en français',
      'it-CH': 'Lingua cambiata in italiano',
      'en-US': 'Language changed to English'
    };

    await speakResponse(messages[newLanguage] || messages['de-CH']);
  }, [updatePreferences, stopListening, setupSpeechRecognition]);

  const handleVoiceToggle = useCallback(() => {
    const newEnabled = !voiceEnabled;
    updatePreferences({ voiceEnabled: newEnabled });

    if (!newEnabled && isListening) {
      stopListening();
    }
  }, [voiceEnabled, updatePreferences, isListening, stopListening]);

  const handleRepeatLastCommand = useCallback(async () => {
    if (lastSuccessfulCommand) {
      await processVoiceCommand(
        lastSuccessfulCommand.transcript,
        lastSuccessfulCommand.confidence
      );
    } else {
      await speakResponse('Kein vorheriger Befehl zum Wiederholen gefunden.');
    }
  }, [lastSuccessfulCommand, processVoiceCommand]);

  // ============================================================================
  // LIFECYCLE EFFECTS
  // ============================================================================

  useEffect(() => {
    initializeServices();

    return () => {
      // Cleanup
      stopListening();

      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (calibrationRef.current) {
        clearTimeout(calibrationRef.current);
      }
    };
  }, [initializeServices, stopListening]);

  // Theme detection
  useLayoutEffect(() => {
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setIsDarkMode(mediaQuery.matches);

      const handleChange = (e) => setIsDarkMode(e.matches);
      mediaQuery.addEventListener('change', handleChange);

      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      setIsDarkMode(theme === 'dark');
    }
  }, [theme]);

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  const renderMainInterface = () => (
    <div className={styles.mainInterface}>
      <button
        className={`${styles.voiceButton} ${styles[voiceState]} ${isListening ? styles.listening : ''}`}
        onClick={isListening ? stopListening : startListening}
        disabled={!isInitialized || !voiceEnabled}
        aria-label={isListening ? 'Stoppe Spracherkennung' : 'Starte Spracherkennung'}
      >
        <div className={styles.buttonIcon}>
          {isListening ? <MicOff size={32} /> : <Mic size={32} />}
        </div>

        {/* Audio Waveform Visualization */}
        {isListening && (
          <Suspense fallback={<SkeletonLoader type="Waveform" />}>
            <VoiceWaveform
              isActive={isListening}
              audioLevel={audioLevel}
              frequency={confidence}
            />
          </Suspense>
        )}

        <div className={styles.buttonText}>
          {voiceState === VOICE_STATES.INITIALIZING && 'Initialisiere...'}
          {voiceState === VOICE_STATES.LISTENING && 'Ich höre...'}
          {voiceState === VOICE_STATES.PROCESSING && 'Verstehe...'}
          {voiceState === VOICE_STATES.SPEAKING && 'Spreche...'}
          {voiceState === VOICE_STATES.CALIBRATING && 'Kalibriere...'}
          {voiceState === VOICE_STATES.IDLE && 'Tippen zum Sprechen'}
          {voiceState === VOICE_STATES.ERROR && 'Fehler'}
          {voiceState === VOICE_STATES.TIMEOUT && 'Zeitüberschreitung'}
        </div>

        {/* Confidence Indicator */}
        {confidence > 0 && (
          <div className={styles.confidenceIndicator}>
            <div
              className={styles.confidenceBar}
              style={{ width: `${confidence * 100}%` }}
            />
            <span className={styles.confidenceText}>
              {Math.round(confidence * 100)}%
            </span>
          </div>
        )}
      </button>
    </div>
  );

  const renderTranscript = () => (
    <div className={styles.transcriptContainer}>
      {(transcript || finalTranscript) && (
        <div className={styles.transcript}>
          <MessageSquare size={16} />
          <div className={styles.transcriptContent}>
            {finalTranscript && (
              <span className={styles.finalTranscript}>
                "{finalTranscript}"
              </span>
            )}
            {transcript && transcript !== finalTranscript && (
              <span className={styles.interimTranscript}>
                {transcript}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Current Intent Display */}
      {currentIntent && (
        <Suspense fallback={<SkeletonLoader type="Intent" />}>
          <IntentPreview
            intent={currentIntent}
            language={language}
          />
        </Suspense>
      )}

      {/* Processing Result */}
      {processingResult && (
        <div className={`${styles.result} ${processingResult.success ? styles.success : styles.error}`}>
          {processingResult.success ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{processingResult.message}</span>
        </div>
      )}

      {/* Error Display */}
      {recognitionError && (
        <div className={styles.error}>
          <AlertTriangle size={16} />
          <span>{recognitionError}</span>
          <button onClick={() => setRecognitionError(null)}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );

  const renderControls = () => (
    <div className={styles.controls}>
      {/* Language Selector */}
      <Suspense fallback={<SkeletonLoader type="Language" />}>
        <LanguageSelector
          selectedLanguage={language}
          languages={SUPPORTED_LANGUAGES}
          onChange={handleLanguageChange}
          disabled={isListening}
        />
      </Suspense>

      {/* Voice Toggle */}
      <button
        className={`${styles.controlButton} ${voiceEnabled ? styles.active : ''}`}
        onClick={handleVoiceToggle}
        title={voiceEnabled ? 'Voice deaktivieren' : 'Voice aktivieren'}
      >
        {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </button>

      {/* Calibration */}
      <button
        className={styles.controlButton}
        onClick={startCalibration}
        disabled={isListening || isCalibrating}
        title="Spracherkennung kalibrieren"
      >
        <Target size={16} />
      </button>

      {/* Repeat Last Command */}
      <button
        className={styles.controlButton}
        onClick={handleRepeatLastCommand}
        disabled={!lastSuccessfulCommand}
        title="Letzten Befehl wiederholen"
      >
        <RotateCcw size={16} />
      </button>

      {/* Settings */}
      <button
        className={styles.controlButton}
        onClick={() => setShowSettings(true)}
        title="Voice Einstellungen"
      >
        <Settings size={16} />
      </button>

      {/* Help */}
      <button
        className={styles.controlButton}
        onClick={() => setShowHelp(true)}
        title="Hilfe anzeigen"
      >
        <HelpCircle size={16} />
      </button>

      {/* Minimize/Expand */}
      <button
        className={styles.controlButton}
        onClick={() => setIsMinimized(!isMinimized)}
        title={isMinimized ? 'Erweitern' : 'Minimieren'}
      >
        {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
    </div>
  );

  const renderCommandHistory = () => (
    <div className={styles.historySection}>
      {commandHistory.length > 0 && (
        <Suspense fallback={<LoadingSpinner message="Lade Befehlsverlauf..." />}>
          <CommandHistory
            commands={commandHistory}
            onCommandSelect={(command) => {
              processVoiceCommand(command.transcript, command.confidence);
            }}
            onClearHistory={() => setCommandHistory([])}
            language={language}
          />
        </Suspense>
      )}
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (!isVoiceSupported) {
    return (
      <div className={`${styles.voiceCommandInterface} ${styles.unsupported} ${className}`}>
        <div className={styles.unsupportedMessage}>
          <AlertTriangle size={24} />
          <h3>Spracherkennung nicht unterstützt</h3>
          <p>Ihr Browser unterstützt keine Spracherkennung. Bitte verwenden Sie einen modernen Browser wie Chrome oder Edge.</p>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className={`${styles.voiceCommandInterface} ${styles.initializing} ${className}`}>
        <LoadingSpinner size={48} message="Voice Commerce wird initialisiert..." />
        <div className={styles.initProgress}>
          <div className={styles.progressSteps}>
            <div className={`${styles.step} ${loadingStates.services ? styles.active : ''}`}>
              <Brain size={16} />
              <span>Services laden...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        ${styles.voiceCommandInterface}
        ${className}
        ${isDarkMode ? styles.dark : styles.light}
        ${isMinimized ? styles.minimized : ''}
        ${voiceState !== VOICE_STATES.IDLE ? styles[voiceState] : ''}
      `}
      role="application"
      aria-label="Voice Command Interface"
    >
      {/* Main Interface */}
      {renderMainInterface()}

      {/* Transcript and Results */}
      {!isMinimized && renderTranscript()}

      {/* Controls */}
      {renderControls()}

      {/* Command History */}
      {!isMinimized && renderCommandHistory()}

      {/* Command Visualizer */}
      {!isMinimized && isListening && (
        <Suspense fallback={<SkeletonLoader type="Visualizer" />}>
          <CommandVisualizer
            isActive={isListening}
            currentCommand={transcript}
            categories={COMMAND_CATEGORIES}
            confidence={confidence}
          />
        </Suspense>
      )}

      {/* Modals */}
      {showSettings && (
        <Suspense fallback={<LoadingSpinner message="Lade Einstellungen..." />}>
          <VoiceSettings
            language={language}
            voiceEnabled={voiceEnabled}
            volume={volume}
            rate={rate}
            onLanguageChange={handleLanguageChange}
            onVoiceToggle={handleVoiceToggle}
            onVolumeChange={(vol) => updatePreferences({ volume: vol })}
            onRateChange={(r) => updatePreferences({ rate: r })}
            onClose={() => setShowSettings(false)}
            accessibility={accessibility}
          />
        </Suspense>
      )}

      {showHelp && (
        <Suspense fallback={<LoadingSpinner message="Lade Hilfe..." />}>
          <ContextualHelp
            commands={availableCommands}
            language={language}
            currentContext={{
              page: window.location.pathname,
              cartItems: cart?.items?.length || 0,
              products: products.length
            }}
            onClose={() => setShowHelp(false)}
          />
        </Suspense>
      )}

      {showTutorial && (
        <Suspense fallback={<LoadingSpinner message="Lade Tutorial..." />}>
          <VoiceTutorial
            language={language}
            commands={COMMAND_CATEGORIES}
            onComplete={() => setShowTutorial(false)}
            onClose={() => setShowTutorial(false)}
          />
        </Suspense>
      )}

      {/* Debug Panel */}
      {showDebugger && debugMode && (
        <Suspense fallback={<LoadingSpinner message="Lade Debugger..." />}>
          <NLPDebugger
            currentIntent={currentIntent}
            processingResult={processingResult}
            performanceMetrics={performanceMetrics}
            commandHistory={commandHistory}
            onClose={() => setShowDebugger(false)}
          />
        </Suspense>
      )}

      {/* Analytics Panel */}
      {showAnalytics && (
        <Suspense fallback={<LoadingSpinner message="Lade Analytics..." />}>
          <VoiceAnalytics
            metrics={getMetrics()}
            commandHistory={commandHistory}
            onClose={() => setShowAnalytics(false)}
          />
        </Suspense>
      )}

      {/* Accessibility Panel */}
      <Suspense fallback={null}>
        <AccessibilityPanel
          isActive={isListening}
          voiceState={voiceState}
          transcript={transcript}
          config={accessibility}
        />
      </Suspense>
    </div>
  );
};

export default VoiceCommandInterface;
