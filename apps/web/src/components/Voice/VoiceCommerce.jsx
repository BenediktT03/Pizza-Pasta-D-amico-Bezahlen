/**
 * EATECH - Voice Commerce Component
 * Version: 3.5.0
 * Description: Sprachgesteuerte Bestellungen mit KI und Lazy Loading
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/web/src/components/Voice/VoiceCommerce.jsx
 * 
 * Features: Speech recognition, natural language processing, voice ordering
 */

import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { 
  Mic, MicOff, Volume2, VolumeX,
  Play, Pause, RotateCcw, Check,
  MessageSquare, Brain, Zap, AlertCircle,
  ShoppingCart, Clock, User, Settings
} from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import styles from './VoiceCommerce.module.css';

// Lazy loaded components
const VoiceVisualizer = lazy(() => import('./components/VoiceVisualizer'));
const CommandHistory = lazy(() => import('./components/CommandHistory'));
const VoiceSettings = lazy(() => import('./components/VoiceSettings'));
const LanguageSelector = lazy(() => import('./components/LanguageSelector'));
const VoiceTutorial = lazy(() => import('./components/VoiceTutorial'));

// Lazy loaded services
const SpeechRecognitionService = lazy(() => import('../../services/SpeechRecognitionService'));
const TextToSpeechService = lazy(() => import('../../services/TextToSpeechService'));
const NLPService = lazy(() => import('../../services/NLPService'));
const VoiceAnalyticsService = lazy(() => import('../../services/VoiceAnalyticsService'));

// Lazy loaded utilities
const VoiceCommandProcessor = lazy(() => import('../../utils/VoiceCommandProcessor'));
const IntentClassifier = lazy(() => import('../../utils/IntentClassifier'));

const LoadingSpinner = () => (
  <div className={styles.loadingContainer}>
    <div className={styles.spinner} />
  </div>
);

const VOICE_STATES = {
  IDLE: 'idle',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  SPEAKING: 'speaking',
  ERROR: 'error'
};

const SUPPORTED_LANGUAGES = {
  'de-CH': { name: 'Schweizerdeutsch', code: 'de-CH', flag: '🇨🇭' },
  'de-DE': { name: 'Deutsch', code: 'de-DE', flag: '🇩🇪' },
  'fr-CH': { name: 'Français (Suisse)', code: 'fr-CH', flag: '🇫🇷' },
  'it-CH': { name: 'Italiano (Svizzera)', code: 'it-CH', flag: '🇮🇹' },
  'en-US': { name: 'English', code: 'en-US', flag: '🇺🇸' }
};

const VOICE_COMMANDS = {
  ORDER: ['bestellen', 'order', 'kaufen', 'hinzufügen'],
  CANCEL: ['abbrechen', 'cancel', 'stopp', 'vergiss es'],
  REPEAT: ['wiederholen', 'repeat', 'nochmal'],
  HELP: ['hilfe', 'help', 'was kann ich sagen'],
  MENU: ['menü', 'menu', 'speisekarte'],
  CART: ['warenkorb', 'cart', 'bestellung'],
  TOTAL: ['total', 'summe', 'preis'],
  CHECKOUT: ['bezahlen', 'checkout', 'bestätigen']
};

const VoiceCommerce = ({ 
  products = [], 
  onProductAdd, 
  onOrderComplete,
  className = '',
  autoStart = false 
}) => {
  const [voiceState, setVoiceState] = useState(VOICE_STATES.IDLE);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [lastCommand, setLastCommand] = useState(null);
  const [commandHistory, setCommandHistory] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState('de-CH');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  const [processingResult, setProcessingResult] = useState(null);

  const recognitionRef = useRef(null);
  const synthesisRef = useRef(null);
  const processingTimeoutRef = useRef(null);
  const { addToCart, cart } = useCart();
  const { user } = useAuth();

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  useEffect(() => {
    initializeVoiceCommerce();
    
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (autoStart && isInitialized) {
      startListening();
    }
  }, [autoStart, isInitialized]);

  const initializeVoiceCommerce = async () => {
    try {
      console.log('Initializing Voice Commerce...');
      
      // Check browser support
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        throw new Error('Browser does not support speech recognition');
      }
      
      if (!('speechSynthesis' in window)) {
        throw new Error('Browser does not support speech synthesis');
      }
      
      // Initialize services
      await initializeSpeechServices();
      await initializeNLPService();
      await initializeAnalytics();
      
      // Load user preferences
      await loadUserPreferences();
      
      setIsInitialized(true);
      console.log('Voice Commerce initialized successfully');
      
    } catch (error) {
      console.error('Voice Commerce initialization failed:', error);
      setError(error.message);
    }
  };

  const initializeSpeechServices = async () => {
    try {
      // Initialize Speech Recognition
      const { default: SpeechRecognitionServiceModule } = await SpeechRecognitionService();
      recognitionRef.current = new SpeechRecognitionServiceModule({
        language: selectedLanguage,
        continuous: false,
        interimResults: true,
        maxAlternatives: 3
      });
      
      // Set up recognition event handlers
      recognitionRef.current.onresult = handleSpeechResult;
      recognitionRef.current.onerror = handleSpeechError;
      recognitionRef.current.onstart = () => setVoiceState(VOICE_STATES.LISTENING);
      recognitionRef.current.onend = () => setVoiceState(VOICE_STATES.IDLE);
      
      // Initialize Text-to-Speech
      const { default: TextToSpeechServiceModule } = await TextToSpeechService();
      synthesisRef.current = new TextToSpeechServiceModule({
        language: selectedLanguage,
        rate: 1.0,
        pitch: 1.0,
        volume: 0.8
      });
      
    } catch (error) {
      console.error('Speech services initialization failed:', error);
      throw error;
    }
  };

  const initializeNLPService = async () => {
    try {
      const { default: NLPServiceModule } = await NLPService();
      await NLPServiceModule.initialize({
        language: selectedLanguage,
        domain: 'food_ordering',
        products: products
      });
    } catch (error) {
      console.error('NLP service initialization failed:', error);
    }
  };

  const initializeAnalytics = async () => {
    try {
      const { default: VoiceAnalyticsServiceModule } = await VoiceAnalyticsService();
      await VoiceAnalyticsServiceModule.initialize();
    } catch (error) {
      console.error('Voice analytics initialization failed:', error);
    }
  };

  const loadUserPreferences = async () => {
    try {
      const preferences = localStorage.getItem('voice_preferences');
      if (preferences) {
        const parsed = JSON.parse(preferences);
        setSelectedLanguage(parsed.language || 'de-CH');
        setVoiceEnabled(parsed.enabled !== false);
      }
    } catch (error) {
      console.error('Error loading voice preferences:', error);
    }
  };

  const cleanup = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
    }
    
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }
  };

  // ============================================================================
  // SPEECH RECOGNITION
  // ============================================================================
  const startListening = useCallback(async () => {
    if (!isInitialized || !voiceEnabled || isListening) return;
    
    try {
      setError(null);
      setTranscript('');
      setConfidence(0);
      
      // Track analytics
      const { default: VoiceAnalyticsServiceModule } = await VoiceAnalyticsService();
      VoiceAnalyticsServiceModule.track('voice_session_started', {
        language: selectedLanguage,
        user_id: user?.id
      });
      
      await recognitionRef.current.start();
      setIsListening(true);
      setVoiceState(VOICE_STATES.LISTENING);
      
    } catch (error) {
      console.error('Failed to start listening:', error);
      setError('Mikrofon konnte nicht gestartet werden');
    }
  }, [isInitialized, voiceEnabled, isListening, selectedLanguage, user]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      setVoiceState(VOICE_STATES.IDLE);
    }
  }, [isListening]);

  const handleSpeechResult = useCallback(async (event) => {
    try {
      const result = event.results[event.results.length - 1];
      const transcriptText = result[0].transcript;
      const confidenceScore = result[0].confidence;
      
      setTranscript(transcriptText);
      setConfidence(confidenceScore);
      
      if (result.isFinal) {
        setVoiceState(VOICE_STATES.PROCESSING);
        await processVoiceCommand(transcriptText, confidenceScore);
      }
      
    } catch (error) {
      console.error('Error handling speech result:', error);
      setError('Sprachverarbeitung fehlgeschlagen');
    }
  }, []);

  const handleSpeechError = useCallback((error) => {
    console.error('Speech recognition error:', error);
    setIsListening(false);
    setVoiceState(VOICE_STATES.ERROR);
    
    const errorMessages = {
      'network': 'Netzwerkfehler bei der Spracherkennung',
      'not-allowed': 'Mikrofon-Zugriff wurde verweigert',
      'no-speech': 'Keine Sprache erkannt',
      'audio-capture': 'Mikrofon nicht verfügbar'
    };
    
    setError(errorMessages[error.error] || 'Spracherkennungsfehler');
  }, []);

  // ============================================================================
  // COMMAND PROCESSING
  // ============================================================================
  const processVoiceCommand = useCallback(async (transcript, confidence) => {
    try {
      if (confidence < 0.6) {
        await speak('Entschuldigung, ich habe Sie nicht verstanden. Können Sie das wiederholen?');
        setVoiceState(VOICE_STATES.IDLE);
        return;
      }
      
      // Process with NLP service
      const { default: NLPServiceModule } = await NLPService();
      const intent = await NLPServiceModule.processCommand(transcript);
      
      // Process with command processor
      const { default: VoiceCommandProcessorModule } = await VoiceCommandProcessor();
      const result = await VoiceCommandProcessorModule.process(intent, {
        products,
        cart,
        user,
        context: 'food_ordering'
      });
      
      setLastCommand({ transcript, intent, result, timestamp: Date.now() });
      setCommandHistory(prev => [
        { transcript, intent, result, timestamp: Date.now() },
        ...prev.slice(0, 9) // Keep last 10 commands
      ]);
      
      // Execute the command
      await executeCommand(result);
      
      // Track analytics
      const { default: VoiceAnalyticsServiceModule } = await VoiceAnalyticsService();
      VoiceAnalyticsServiceModule.track('voice_command_processed', {
        transcript,
        intent: intent.name,
        confidence,
        success: result.success,
        language: selectedLanguage
      });
      
      setProcessingResult(result);
      setVoiceState(VOICE_STATES.IDLE);
      
    } catch (error) {
      console.error('Command processing failed:', error);
      await speak('Es gab einen Fehler bei der Verarbeitung Ihres Befehls.');
      setVoiceState(VOICE_STATES.ERROR);
    } finally {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    }
  }, [products, cart, user, selectedLanguage]);

  const executeCommand = useCallback(async (commandResult) => {
    try {
      switch (commandResult.action) {
        case 'ADD_PRODUCT':
          await handleAddProduct(commandResult);
          break;
          
        case 'REMOVE_PRODUCT':
          await handleRemoveProduct(commandResult);
          break;
          
        case 'SHOW_MENU':
          await handleShowMenu(commandResult);
          break;
          
        case 'SHOW_CART':
          await handleShowCart(commandResult);
          break;
          
        case 'CHECKOUT':
          await handleCheckout(commandResult);
          break;
          
        case 'HELP':
          await handleHelp(commandResult);
          break;
          
        case 'REPEAT':
          await handleRepeat(commandResult);
          break;
          
        default:
          await speak('Dieser Befehl wird noch nicht unterstützt.');
      }
    } catch (error) {
      console.error('Command execution failed:', error);
      await speak('Es gab einen Fehler beim Ausführen des Befehls.');
    }
  }, []);

  // ============================================================================
  // COMMAND HANDLERS
  // ============================================================================
  const handleAddProduct = useCallback(async (commandResult) => {
    const { product, quantity = 1 } = commandResult.parameters;
    
    if (product) {
      addToCart(product, quantity);
      onProductAdd?.(product, quantity);
      
      await speak(
        quantity === 1 
          ? `${product.name} wurde zum Warenkorb hinzugefügt.`
          : `${quantity} ${product.name} wurden zum Warenkorb hinzugefügt.`
      );
    } else {
      await speak('Produkt nicht gefunden. Können Sie den Namen wiederholen?');
    }
  }, [addToCart, onProductAdd]);

  const handleRemoveProduct = useCallback(async (commandResult) => {
    const { product } = commandResult.parameters;
    
    if (product) {
      // Remove logic would go here
      await speak(`${product.name} wurde aus dem Warenkorb entfernt.`);
    } else {
      await speak('Produkt im Warenkorb nicht gefunden.');
    }
  }, []);

  const handleShowMenu = useCallback(async (commandResult) => {
    const { category } = commandResult.parameters;
    
    if (category) {
      const categoryProducts = products.filter(p => 
        p.category.toLowerCase().includes(category.toLowerCase())
      );
      
      if (categoryProducts.length > 0) {
        const productNames = categoryProducts.slice(0, 5).map(p => p.name).join(', ');
        await speak(`In der Kategorie ${category} haben wir: ${productNames}`);
      } else {
        await speak(`Keine Produkte in der Kategorie ${category} gefunden.`);
      }
    } else {
      await speak('Welche Kategorie möchten Sie sehen? Zum Beispiel Pizza, Burger oder Salate.');
    }
  }, [products]);

  const handleShowCart = useCallback(async (commandResult) => {
    if (cart.length === 0) {
      await speak('Ihr Warenkorb ist leer.');
      return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    await speak(
      `Sie haben ${itemCount} Artikel im Warenkorb für insgesamt ${total.toFixed(2)} Franken.`
    );
  }, [cart]);

  const handleCheckout = useCallback(async (commandResult) => {
    if (cart.length === 0) {
      await speak('Ihr Warenkorb ist leer. Fügen Sie erst Produkte hinzu.');
      return;
    }
    
    await speak('Ich leite Sie zur Kasse weiter.');
    onOrderComplete?.();
  }, [cart, onOrderComplete]);

  const handleHelp = useCallback(async (commandResult) => {
    const helpText = `
      Sie können folgende Befehle verwenden:
      "Pizza bestellen" um Produkte hinzuzufügen,
      "Warenkorb zeigen" für Ihre Bestellung,
      "Menü zeigen" für alle Produkte,
      "Bezahlen" um zur Kasse zu gehen.
    `;
    
    await speak(helpText);
  }, []);

  const handleRepeat = useCallback(async (commandResult) => {
    if (lastCommand) {
      await speak(`Sie haben gesagt: ${lastCommand.transcript}`);
    } else {
      await speak('Es gibt nichts zu wiederholen.');
    }
  }, [lastCommand]);

  // ============================================================================
  // TEXT-TO-SPEECH
  // ============================================================================
  const speak = useCallback(async (text) => {
    if (!voiceEnabled || !synthesisRef.current) return;
    
    try {
      setIsSpeaking(true);
      setVoiceState(VOICE_STATES.SPEAKING);
      
      await synthesisRef.current.speak(text);
      
      setIsSpeaking(false);
      setVoiceState(VOICE_STATES.IDLE);
      
    } catch (error) {
      console.error('Text-to-speech failed:', error);
      setIsSpeaking(false);
      setVoiceState(VOICE_STATES.IDLE);
    }
  }, [voiceEnabled]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  const handleLanguageChange = useCallback(async (language) => {
    setSelectedLanguage(language);
    
    // Update services
    if (recognitionRef.current) {
      recognitionRef.current.updateLanguage(language);
    }
    
    if (synthesisRef.current) {
      synthesisRef.current.updateLanguage(language);
    }
    
    // Save preference
    const preferences = { language, enabled: voiceEnabled };
    localStorage.setItem('voice_preferences', JSON.stringify(preferences));
    
    await speak('Sprache wurde geändert.');
  }, [voiceEnabled]);

  const handleToggleVoice = useCallback(() => {
    const newEnabled = !voiceEnabled;
    setVoiceEnabled(newEnabled);
    
    if (!newEnabled && isListening) {
      stopListening();
    }
    
    // Save preference
    const preferences = { language: selectedLanguage, enabled: newEnabled };
    localStorage.setItem('voice_preferences', JSON.stringify(preferences));
  }, [voiceEnabled, isListening, selectedLanguage, stopListening]);

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  const renderVoiceButton = () => (
    <button
      className={`${styles.voiceButton} ${styles[voiceState]} ${isListening ? styles.listening : ''}`}
      onClick={isListening ? stopListening : startListening}
      disabled={!isInitialized || !voiceEnabled}
    >
      <div className={styles.buttonIcon}>
        {isListening ? <MicOff size={24} /> : <Mic size={24} />}
      </div>
      
      {isListening && (
        <Suspense fallback={null}>
          <VoiceVisualizer 
            isActive={isListening}
            amplitude={confidence}
          />
        </Suspense>
      )}
      
      <div className={styles.buttonText}>
        {voiceState === VOICE_STATES.LISTENING && 'Ich höre...'}
        {voiceState === VOICE_STATES.PROCESSING && 'Verstehe...'}
        {voiceState === VOICE_STATES.SPEAKING && 'Spreche...'}
        {voiceState === VOICE_STATES.IDLE && 'Sprechen Sie jetzt'}
        {voiceState === VOICE_STATES.ERROR && 'Fehler'}
      </div>
    </button>
  );

  const renderTranscript = () => (
    <div className={styles.transcriptContainer}>
      {transcript && (
        <div className={styles.transcript}>
          <MessageSquare size={16} />
          <span>"{transcript}"</span>
          <div className={styles.confidence}>
            {Math.round(confidence * 100)}%
          </div>
        </div>
      )}
      
      {processingResult && (
        <div className={`${styles.result} ${processingResult.success ? styles.success : styles.error}`}>
          {processingResult.success ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{processingResult.message}</span>
        </div>
      )}
    </div>
  );

  const renderControls = () => (
    <div className={styles.controls}>
      <button
        className={styles.controlButton}
        onClick={() => setShowSettings(true)}
        title="Voice Einstellungen"
      >
        <Settings size={16} />
      </button>
      
      <button
        className={styles.controlButton}
        onClick={handleToggleVoice}
        title={voiceEnabled ? 'Voice deaktivieren' : 'Voice aktivieren'}
      >
        {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </button>
      
      <button
        className={styles.controlButton}
        onClick={() => setShowTutorial(true)}
        title="Voice Tutorial"
      >
        <Brain size={16} />
      </button>
      
      <Suspense fallback={null}>
        <LanguageSelector
          selectedLanguage={selectedLanguage}
          languages={SUPPORTED_LANGUAGES}
          onChange={handleLanguageChange}
        />
      </Suspense>
    </div>
  );

  const renderError = () => error && (
    <div className={styles.errorContainer}>
      <AlertCircle size={16} />
      <span>{error}</span>
      <button onClick={() => setError(null)}>
        <RotateCcw size={14} />
      </button>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  if (!isInitialized) {
    return (
      <div className={`${styles.voiceCommerce} ${className}`}>
        <LoadingSpinner />
        <p>Voice Commerce wird initialisiert...</p>
      </div>
    );
  }

  return (
    <div className={`${styles.voiceCommerce} ${className}`}>
      {/* Main Voice Interface */}
      <div className={styles.voiceInterface}>
        {renderVoiceButton()}
        {renderTranscript()}
        {renderError()}
      </div>
      
      {/* Controls */}
      {renderControls()}
      
      {/* Command History */}
      {commandHistory.length > 0 && (
        <Suspense fallback={<LoadingSpinner />}>
          <CommandHistory
            commands={commandHistory}
            onCommandSelect={(command) => console.log('Selected command:', command)}
          />
        </Suspense>
      )}
      
      {/* Settings Modal */}
      {showSettings && (
        <Suspense fallback={<LoadingSpinner />}>
          <VoiceSettings
            language={selectedLanguage}
            enabled={voiceEnabled}
            onLanguageChange={handleLanguageChange}
            onEnabledChange={handleToggleVoice}
            onClose={() => setShowSettings(false)}
          />
        </Suspense>
      )}
      
      {/* Tutorial Modal */}
      {showTutorial && (
        <Suspense fallback={<LoadingSpinner />}>
          <VoiceTutorial
            language={selectedLanguage}
            commands={VOICE_COMMANDS}
            onClose={() => setShowTutorial(false)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default VoiceCommerce;