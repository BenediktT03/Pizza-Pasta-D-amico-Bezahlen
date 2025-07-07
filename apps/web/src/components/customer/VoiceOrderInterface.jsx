/**
 * EATECH - Voice Order Interface Component
 * Version: 4.2.0
 * Description: Interactive voice ordering interface with multi-language support
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/components/customer/VoiceOrderInterface.jsx
 * 
 * Features:
 * - Multi-language voice recognition (DE, IT, EN, FR + Swiss variants)
 * - Real-time voice-to-text transcription
 * - Intelligent order processing and confirmation
 * - Context-aware product recommendations
 * - Advanced error handling and fallback options
 * - Accessibility features for voice navigation
 * - Performance optimized with lazy loading
 */

import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Volume2, VolumeX, Play, Pause, 
  RotateCcw, Check, X, AlertCircle, Info, 
  ChevronDown, ChevronUp, Waves, Activity,
  MessageSquare, Brain, Zap, Target, Settings,
  Globe, Headphones, ShoppingCart, Plus, Minus,
  Clock, Star, Heart, ThumbsUp, HelpCircle
} from 'lucide-react';

// Hooks & Contexts
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';

// Lazy loaded services
const SpeechRecognitionService = lazy(() => import('../../services/voice/SpeechRecognitionService'));
const TextToSpeechService = lazy(() => import('../../services/voice/TextToSpeechService'));
const VoiceCommandProcessor = lazy(() => import('../../services/voice/VoiceCommandProcessor'));
const NaturalLanguageProcessor = lazy(() => import('../../services/ai/NaturalLanguageProcessor'));

// Lazy loaded language processors
const SwissGermanProcessor = lazy(() => import('../../utils/voice/SwissGermanProcessor'));
const GermanProcessor = lazy(() => import('../../utils/voice/GermanProcessor'));
const ItalianProcessor = lazy(() => import('../../utils/voice/ItalianProcessor'));
const FrenchProcessor = lazy(() => import('../../utils/voice/FrenchProcessor'));
const EnglishProcessor = lazy(() => import('../../utils/voice/EnglishProcessor'));

// Lazy loaded components
const VoiceWaveform = lazy(() => import('../voice/VoiceWaveform'));
const LanguageSelector = lazy(() => import('../voice/LanguageSelector'));
const VoiceSettings = lazy(() => import('../voice/VoiceSettings'));

// Styles
import styles from './VoiceOrderInterface.module.css';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const VOICE_STATES = {
  IDLE: 'idle',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  SPEAKING: 'speaking',
  CONFIRMING: 'confirming',
  ERROR: 'error'
};

const SUPPORTED_LANGUAGES = {
  'de-CH': {
    name: 'Schweizerdeutsch',
    nativeName: 'Schwiizerdütsch',
    flag: '🇨🇭',
    processor: 'SwissGermanProcessor',
    voiceCode: 'de-CH',
    confidence: 0.95
  },
  'de-DE': {
    name: 'Deutsch',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    processor: 'GermanProcessor',
    voiceCode: 'de-DE',
    confidence: 0.96
  },
  'it-IT': {
    name: 'Italiano',
    nativeName: 'Italiano',
    flag: '🇮🇹',
    processor: 'ItalianProcessor',
    voiceCode: 'it-IT',
    confidence: 0.95
  },
  'it-CH': {
    name: 'Italiano Svizzero',
    nativeName: 'Italiano (Svizzera)',
    flag: '🇨🇭',
    processor: 'ItalianProcessor',
    voiceCode: 'it-CH',
    confidence: 0.90
  },
  'fr-FR': {
    name: 'Français',
    nativeName: 'Français',
    flag: '🇫🇷',
    processor: 'FrenchProcessor',
    voiceCode: 'fr-FR',
    confidence: 0.96
  },
  'fr-CH': {
    name: 'Français Suisse',
    nativeName: 'Français (Suisse)',
    flag: '🇨🇭',
    processor: 'FrenchProcessor',
    voiceCode: 'fr-CH',
    confidence: 0.92
  },
  'en-US': {
    name: 'English (US)',
    nativeName: 'English (United States)',
    flag: '🇺🇸',
    processor: 'EnglishProcessor',
    voiceCode: 'en-US',
    confidence: 0.97
  },
  'en-GB': {
    name: 'English (UK)',
    nativeName: 'English (United Kingdom)',
    flag: '🇬🇧',
    processor: 'EnglishProcessor',
    voiceCode: 'en-GB',
    confidence: 0.96
  }
};

const ORDER_INTENTS = {
  ADD_ITEM: 'add_item',
  REMOVE_ITEM: 'remove_item',
  MODIFY_ITEM: 'modify_item',
  CONFIRM_ORDER: 'confirm_order',
  CANCEL_ORDER: 'cancel_order',
  GET_HELP: 'get_help',
  REPEAT_LAST: 'repeat_last',
  SHOW_MENU: 'show_menu',
  GET_PRICE: 'get_price',
  UNKNOWN: 'unknown'
};

const VOICE_PROMPTS = {
  'de-CH': {
    welcome: 'Hallo! Ich bin Ihr digitaler Assistent. Sagen Sie mir, was Sie bestellen möchten.',
    listening: 'Ich höre zu...',
    processing: 'Einen Moment, ich verarbeite Ihre Bestellung...',
    confirm: 'Habe ich das richtig verstanden?',
    error: 'Entschuldigung, das habe ich nicht verstanden. Können Sie das wiederholen?',
    success: 'Perfekt! Ihre Bestellung wurde hinzugefügt.',
    help: 'Sie können mir sagen was Sie bestellen möchten. Zum Beispiel: "Ich hätte gern eine Pizza Margherita"'
  },
  'de-DE': {
    welcome: 'Hallo! Ich bin Ihr digitaler Assistent. Sagen Sie mir, was Sie bestellen möchten.',
    listening: 'Ich höre zu...',
    processing: 'Einen Moment, ich verarbeite Ihre Bestellung...',
    confirm: 'Habe ich das richtig verstanden?',
    error: 'Entschuldigung, das habe ich nicht verstanden. Können Sie das wiederholen?',
    success: 'Perfekt! Ihre Bestellung wurde hinzugefügt.',
    help: 'Sie können mir sagen was Sie bestellen möchten. Zum Beispiel: "Ich hätte gern ein Schnitzel"'
  },
  'it-IT': {
    welcome: 'Ciao! Sono il vostro assistente digitale. Ditemi cosa vorreste ordinare.',
    listening: 'Sto ascoltando...',
    processing: 'Un momento, sto elaborando il vostro ordine...',
    confirm: 'Ho capito bene?',
    error: 'Scusate, non ho capito. Potete ripetere?',
    success: 'Perfetto! Il vostro ordine è stato aggiunto.',
    help: 'Potete dirmi cosa vorreste ordinare. Per esempio: "Vorrei una pizza margherita"'
  },
  'it-CH': {
    welcome: 'Ciao! Sono il vostro assistente digitale. Ditemi cosa vorreste ordinare.',
    listening: 'Sto ascoltando...',
    processing: 'Un momento, sto elaborando il vostro ordine...',
    confirm: 'Ho capito bene?',
    error: 'Scusate, non ho capito. Potete ripetere?',
    success: 'Perfetto! Il vostro ordine è stato aggiunto.',
    help: 'Potete dirmi cosa vorreste ordinare. Per esempio: "Vorrei un risotto"'
  },
  'fr-FR': {
    welcome: 'Bonjour ! Je suis votre assistant numérique. Dites-moi ce que vous aimeriez commander.',
    listening: 'J\'écoute...',
    processing: 'Un moment, je traite votre commande...',
    confirm: 'Ai-je bien compris ?',
    error: 'Désolé, je n\'ai pas compris. Pouvez-vous répéter ?',
    success: 'Parfait ! Votre commande a été ajoutée.',
    help: 'Vous pouvez me dire ce que vous aimeriez commander. Par exemple : "Je voudrais un steak frites"'
  },
  'fr-CH': {
    welcome: 'Bonjour ! Je suis votre assistant numérique. Dites-moi ce que vous aimeriez commander.',
    listening: 'J\'écoute...',
    processing: 'Un moment, je traite votre commande...',
    confirm: 'Ai-je bien compris ?',
    error: 'Désolé, je n\'ai pas compris. Pouvez-vous répéter ?',
    success: 'Parfait ! Votre commande a été ajoutée.',
    help: 'Vous pouvez me dire ce que vous aimeriez commander. Par exemple : "Je voudrais une fondue"'
  },
  'en-US': {
    welcome: 'Hello! I\'m your digital assistant. Tell me what you\'d like to order.',
    listening: 'I\'m listening...',
    processing: 'One moment, I\'m processing your order...',
    confirm: 'Did I understand that correctly?',
    error: 'Sorry, I didn\'t understand that. Could you repeat it?',
    success: 'Perfect! Your order has been added.',
    help: 'You can tell me what you\'d like to order. For example: "I\'d like a cheeseburger"'
  },
  'en-GB': {
    welcome: 'Hello! I\'m your digital assistant. Tell me what you\'d like to order.',
    listening: 'I\'m listening...',
    processing: 'One moment, I\'m processing your order...',
    confirm: 'Did I understand that correctly?',
    error: 'Sorry, I didn\'t understand that. Could you repeat it?',
    success: 'Brilliant! Your order has been added.',
    help: 'You can tell me what you\'d like to order. For example: "I\'d like fish and chips"'
  }
};

const DEFAULT_SETTINGS = {
  language: 'de-CH',
  voiceEnabled: true,
  volume: 0.8,
  rate: 1.0,
  autoStart: false,
  confirmationRequired: true,
  backgroundNoise: 'auto',
  sensitivity: 0.7
};

// ============================================================================
// LOADING COMPONENT
// ============================================================================

const LoadingSpinner = ({ message = 'Loading...' }) => (
  <div className={styles.loadingContainer}>
    <div className={styles.spinner} />
    <span className={styles.loadingMessage}>{message}</span>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const VoiceOrderInterface = ({
  product,
  isOpen,
  onClose,
  onOrderComplete,
  onOrderUpdate,
  settings = DEFAULT_SETTINGS,
  className = ''
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [voiceState, setVoiceState] = useState(VOICE_STATES.IDLE);
  const [currentLanguage, setCurrentLanguage] = useState(settings.language);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Voice recognition state
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  
  // Order processing state
  const [currentOrder, setCurrentOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [processingResult, setProcessingResult] = useState(null);
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  
  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [error, setError] = useState(null);
  
  // Performance state
  const [lastProcessingTime, setLastProcessingTime] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  
  // ============================================================================
  // REFS & SERVICES
  // ============================================================================
  
  const recognitionRef = useRef(null);
  const synthesisRef = useRef(null);
  const processorRef = useRef(null);
  const nlpRef = useRef(null);
  const languageProcessorRef = useRef(null);
  const timeoutRef = useRef(null);
  const retryCountRef = useRef(0);
  
  // Context hooks
  const { addItem, cart } = useCart();
  const { user } = useAuth();
  const { tenant } = useTenant();
  
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const currentLanguageConfig = useMemo(() => 
    SUPPORTED_LANGUAGES[currentLanguage] || SUPPORTED_LANGUAGES['de-CH'],
    [currentLanguage]
  );
  
  const currentPrompts = useMemo(() => 
    VOICE_PROMPTS[currentLanguage] || VOICE_PROMPTS['de-CH'],
    [currentLanguage]
  );
  
  const isVoiceSupported = useMemo(() => 
    'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
    []
  );
  
  const canSpeak = useMemo(() => 
    'speechSynthesis' in window && settings.voiceEnabled,
    [settings.voiceEnabled]
  );
  
  const orderSummary = useMemo(() => {
    if (!orderItems.length) return null;
    
    const total = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const itemCount = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    
    return {
      items: orderItems,
      itemCount,
      total,
      formattedTotal: new Intl.NumberFormat('de-CH', {
        style: 'currency',
        currency: 'CHF'
      }).format(total)
    };
  }, [orderItems]);
  
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  useEffect(() => {
    if (isOpen && !isInitialized) {
      initializeVoiceInterface();
    }
    
    return () => {
      if (isInitialized) {
        cleanup();
      }
    };
  }, [isOpen, isInitialized]);
  
  const initializeVoiceInterface = useCallback(async () => {
    try {
      setError(null);
      
      if (!isVoiceSupported) {
        throw new Error('Voice recognition not supported in this browser');
      }
      
      // Initialize speech recognition
      const { default: SpeechRecognitionServiceModule } = await SpeechRecognitionService();
      recognitionRef.current = new SpeechRecognitionServiceModule({
        language: currentLanguageConfig.voiceCode,
        continuous: false,
        interimResults: true,
        maxAlternatives: 3
      });
      
      // Set up recognition event handlers
      recognitionRef.current.onresult = handleSpeechResult;
      recognitionRef.current.onerror = handleSpeechError;
      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setVoiceState(VOICE_STATES.LISTENING);
      };
      recognitionRef.current.onend = () => {
        setIsListening(false);
        if (voiceState === VOICE_STATES.LISTENING) {
          setVoiceState(VOICE_STATES.IDLE);
        }
      };
      
      // Initialize text-to-speech
      if (canSpeak) {
        const { default: TextToSpeechServiceModule } = await TextToSpeechService();
        synthesisRef.current = new TextToSpeechServiceModule({
          language: currentLanguageConfig.voiceCode,
          rate: settings.rate,
          volume: settings.volume
        });
      }
      
      // Initialize voice command processor
      const { default: VoiceCommandProcessorModule } = await VoiceCommandProcessor();
      processorRef.current = new VoiceCommandProcessorModule({
        language: currentLanguage,
        context: 'restaurant_ordering'
      });
      
      // Initialize NLP processor
      const { default: NaturalLanguageProcessorModule } = await NaturalLanguageProcessor();
      nlpRef.current = new NaturalLanguageProcessorModule({
        language: currentLanguage
      });
      
      // Initialize language-specific processor
      await initializeLanguageProcessor();
      
      setIsInitialized(true);
      
      // Auto-start if enabled
      if (settings.autoStart) {
        setTimeout(() => {
          startListening();
        }, 1000);
      } else {
        // Give welcome message
        speak(currentPrompts.welcome);
      }
      
    } catch (error) {
      console.error('Failed to initialize voice interface:', error);
      setError(error.message);
    }
  }, [currentLanguage, currentLanguageConfig, canSpeak, settings, currentPrompts, isVoiceSupported]);
  
  const initializeLanguageProcessor = useCallback(async () => {
    try {
      const processorName = currentLanguageConfig.processor;
      
      let ProcessorModule;
      switch (processorName) {
        case 'SwissGermanProcessor':
          ProcessorModule = await SwissGermanProcessor();
          break;
        case 'GermanProcessor':
          ProcessorModule = await GermanProcessor();
          break;
        case 'ItalianProcessor':
          ProcessorModule = await ItalianProcessor();
          break;
        case 'FrenchProcessor':
          ProcessorModule = await FrenchProcessor();
          break;
        case 'EnglishProcessor':
          ProcessorModule = await EnglishProcessor();
          break;
        default:
          throw new Error(`Unknown processor: ${processorName}`);
      }
      
      languageProcessorRef.current = await ProcessorModule.default.initialize({
        variant: currentLanguage,
        context: 'restaurant'
      });
      
    } catch (error) {
      console.error('Failed to initialize language processor:', error);
      // Fall back to basic processing
      languageProcessorRef.current = null;
    }
  }, [currentLanguage, currentLanguageConfig.processor]);
  
  // ============================================================================
  // VOICE RECOGNITION HANDLERS
  // ============================================================================
  
  const handleSpeechResult = useCallback((event) => {
    let interimTranscript = '';
    let finalTranscript = '';
    let maxConfidence = 0;
    
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const result = event.results[i];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence || 0;
      
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
      }
      
      if (result.isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    
    setTranscript(interimTranscript);
    setConfidence(maxConfidence);
    
    if (finalTranscript) {
      setFinalTranscript(finalTranscript);
      processVoiceCommand(finalTranscript, maxConfidence);
    }
  }, []);
  
  const handleSpeechError = useCallback((event) => {
    console.error('Speech recognition error:', event.error);
    setError(`Voice recognition error: ${event.error}`);
    setVoiceState(VOICE_STATES.ERROR);
    setIsListening(false);
    
    // Retry logic
    if (retryCountRef.current < 3 && event.error !== 'not-allowed') {
      retryCountRef.current++;
      setTimeout(() => {
        startListening();
      }, 2000);
    } else {
      speak(currentPrompts.error);
    }
  }, [currentPrompts.error]);
  
  // ============================================================================
  // VOICE PROCESSING
  // ============================================================================
  
  const processVoiceCommand = useCallback(async (transcript, confidence) => {
    try {
      setVoiceState(VOICE_STATES.PROCESSING);
      const startTime = performance.now();
      
      // Process with language-specific processor first
      let processedTranscript = transcript;
      if (languageProcessorRef.current) {
        processedTranscript = languageProcessorRef.current.processTranscript(transcript);
      }
      
      // Classify intent with NLP
      let intent = null;
      if (nlpRef.current) {
        intent = await nlpRef.current.classifyIntent(processedTranscript, {
          context: 'restaurant_ordering',
          product,
          cart: cart?.items || []
        });
      }
      
      // Process command with voice processor
      let commandResult = null;
      if (processorRef.current) {
        commandResult = await processorRef.current.executeCommand(intent || {
          intent: ORDER_INTENTS.UNKNOWN,
          transcript: processedTranscript,
          confidence
        }, {
          product,
          cart: cart?.items || [],
          user,
          tenant
        });
      }
      
      const processingTime = performance.now() - startTime;
      setLastProcessingTime(processingTime);
      
      // Handle the result
      await handleCommandResult(commandResult, processedTranscript, confidence);
      
      setProcessingResult(commandResult);
      setSuccessCount(prev => prev + 1);
      
    } catch (error) {
      console.error('Voice command processing failed:', error);
      setError(error.message);
      setErrorCount(prev => prev + 1);
      speak(currentPrompts.error);
    } finally {
      setVoiceState(VOICE_STATES.IDLE);
    }
  }, [product, cart, user, tenant, currentPrompts.error, nlpRef, processorRef, languageProcessorRef]);
  
  const handleCommandResult = useCallback(async (result, transcript, confidence) => {
    if (!result || !result.success) {
      speak(currentPrompts.error);
      return;
    }
    
    switch (result.intent) {
      case ORDER_INTENTS.ADD_ITEM:
        await handleAddItem(result);
        break;
        
      case ORDER_INTENTS.REMOVE_ITEM:
        await handleRemoveItem(result);
        break;
        
      case ORDER_INTENTS.MODIFY_ITEM:
        await handleModifyItem(result);
        break;
        
      case ORDER_INTENTS.CONFIRM_ORDER:
        await handleConfirmOrder(result);
        break;
        
      case ORDER_INTENTS.CANCEL_ORDER:
        await handleCancelOrder(result);
        break;
        
      case ORDER_INTENTS.GET_HELP:
        await handleGetHelp(result);
        break;
        
      case ORDER_INTENTS.REPEAT_LAST:
        await handleRepeatLast(result);
        break;
        
      case ORDER_INTENTS.SHOW_MENU:
        await handleShowMenu(result);
        break;
        
      case ORDER_INTENTS.GET_PRICE:
        await handleGetPrice(result);
        break;
        
      default:
        speak(currentPrompts.error);
    }
  }, [currentPrompts]);
  
  // ============================================================================
  // COMMAND HANDLERS
  // ============================================================================
  
  const handleAddItem = useCallback(async (result) => {
    try {
      const { entities, quantity = 1, modifiers = [], size = null } = result;
      
      // Create order item
      const orderItem = {
        id: Date.now(),
        product: product,
        quantity: quantity,
        size: size,
        modifiers: modifiers,
        price: calculateItemPrice(product, size, modifiers),
        timestamp: new Date().toISOString()
      };
      
      if (settings.confirmationRequired) {
        setPendingConfirmation({
          type: 'add_item',
          item: orderItem,
          transcript: result.originalTranscript
        });
        
        const confirmationMessage = generateConfirmationMessage(orderItem);
        await speak(confirmationMessage);
        setVoiceState(VOICE_STATES.CONFIRMING);
        
        // Auto-confirm after timeout
        timeoutRef.current = setTimeout(() => {
          confirmPendingAction();
        }, 10000);
        
      } else {
        await addItemToOrder(orderItem);
      }
      
    } catch (error) {
      console.error('Failed to handle add item:', error);
      speak(currentPrompts.error);
    }
  }, [product, settings.confirmationRequired, currentPrompts.error]);
  
  const handleRemoveItem = useCallback(async (result) => {
    try {
      const { entities } = result;
      
      // Find and remove item from order
      const itemToRemove = findItemInOrder(entities);
      
      if (itemToRemove) {
        setOrderItems(prev => prev.filter(item => item.id !== itemToRemove.id));
        speak(currentPrompts.success);
      } else {
        speak('Item not found in your order.');
      }
      
    } catch (error) {
      console.error('Failed to handle remove item:', error);
      speak(currentPrompts.error);
    }
  }, [currentPrompts]);
  
  const handleConfirmOrder = useCallback(async (result) => {
    try {
      if (pendingConfirmation) {
        await confirmPendingAction();
      } else if (orderItems.length > 0) {
        await finalizeOrder();
      } else {
        speak('You don\'t have any items in your order yet.');
      }
    } catch (error) {
      console.error('Failed to handle confirm order:', error);
      speak(currentPrompts.error);
    }
  }, [pendingConfirmation, orderItems, currentPrompts.error]);
  
  const handleGetHelp = useCallback(async (result) => {
    speak(currentPrompts.help);
    setShowHelp(true);
  }, [currentPrompts.help]);
  
  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  const calculateItemPrice = useCallback((product, size, modifiers) => {
    let basePrice = product.price;
    
    // Add size price modifier
    if (size && product.sizes) {
      const sizeOption = product.sizes.find(s => s.name === size);
      if (sizeOption) {
        basePrice = sizeOption.price;
      }
    }
    
    // Add modifier prices
    let modifierPrice = 0;
    modifiers.forEach(modifier => {
      if (product.modifierGroups) {
        product.modifierGroups.forEach(group => {
          const option = group.options.find(opt => opt.name === modifier);
          if (option) {
            modifierPrice += option.price || 0;
          }
        });
      }
    });
    
    return basePrice + modifierPrice;
  }, []);
  
  const generateConfirmationMessage = useCallback((orderItem) => {
    const { product, quantity, size, modifiers } = orderItem;
    
    let message = `${quantity} ${product.name}`;
    
    if (size) {
      message += ` ${size}`;
    }
    
    if (modifiers.length > 0) {
      message += ` with ${modifiers.join(', ')}`;
    }
    
    message += `? ${currentPrompts.confirm}`;
    
    return message;
  }, [currentPrompts.confirm]);
  
  const addItemToOrder = useCallback(async (orderItem) => {
    setOrderItems(prev => [...prev, orderItem]);
    
    // Add to cart if callback provided
    if (addItem) {
      addItem({
        productId: orderItem.product.id,
        quantity: orderItem.quantity,
        size: orderItem.size,
        modifiers: orderItem.modifiers
      });
    }
    
    speak(currentPrompts.success);
    
    // Notify parent component
    if (onOrderUpdate) {
      onOrderUpdate(orderItem);
    }
  }, [addItem, currentPrompts.success, onOrderUpdate]);
  
  const confirmPendingAction = useCallback(async () => {
    if (!pendingConfirmation) return;
    
    try {
      switch (pendingConfirmation.type) {
        case 'add_item':
          await addItemToOrder(pendingConfirmation.item);
          break;
        default:
          console.warn('Unknown confirmation type:', pendingConfirmation.type);
      }
    } catch (error) {
      console.error('Failed to confirm pending action:', error);
      speak(currentPrompts.error);
    } finally {
      setPendingConfirmation(null);
      setVoiceState(VOICE_STATES.IDLE);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [pendingConfirmation, addItemToOrder, currentPrompts.error]);
  
  const finalizeOrder = useCallback(async () => {
    try {
      if (onOrderComplete) {
        await onOrderComplete(orderItems);
      }
      
      speak('Thank you! Your order has been placed.');
      
      // Reset state
      setOrderItems([]);
      setCurrentOrder(null);
      setPendingConfirmation(null);
      
      // Close interface after delay
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (error) {
      console.error('Failed to finalize order:', error);
      speak(currentPrompts.error);
    }
  }, [orderItems, onOrderComplete, onClose, currentPrompts.error]);
  
  // ============================================================================
  // VOICE CONTROLS
  // ============================================================================
  
  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    
    try {
      setError(null);
      setTranscript('');
      setFinalTranscript('');
      recognitionRef.current.start();
      retryCountRef.current = 0;
    } catch (error) {
      console.error('Failed to start listening:', error);
      setError(error.message);
    }
  }, [isListening]);
  
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);
  
  const speak = useCallback(async (text) => {
    if (!canSpeak || !synthesisRef.current) return;
    
    try {
      setIsSpeaking(true);
      setVoiceState(VOICE_STATES.SPEAKING);
      
      await synthesisRef.current.speak(text);
      
    } catch (error) {
      console.error('Speech synthesis failed:', error);
    } finally {
      setIsSpeaking(false);
      if (voiceState === VOICE_STATES.SPEAKING) {
        setVoiceState(VOICE_STATES.IDLE);
      }
    }
  }, [canSpeak, voiceState]);
  
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  const cleanup = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setIsListening(false);
    setIsSpeaking(false);
    setVoiceState(VOICE_STATES.IDLE);
  }, []);
  
  // ============================================================================
  // RENDER METHODS
  // ============================================================================
  
  const renderVoiceButton = () => (
    <motion.button
      className={`${styles.voiceButton} ${styles[voiceState]}`}
      onClick={toggleListening}
      disabled={!isInitialized || voiceState === VOICE_STATES.PROCESSING}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      animate={{
        scale: isListening ? [1, 1.1, 1] : 1,
        backgroundColor: isListening ? '#ef4444' : '#10b981'
      }}
      transition={{
        scale: {
          duration: 1,
          repeat: isListening ? Infinity : 0,
          ease: 'easeInOut'
        },
        backgroundColor: {
          duration: 0.3
        }
      }}
    >
      {isListening ? <MicOff size={32} /> : <Mic size={32} />}
      <span className={styles.buttonLabel}>
        {isListening ? 'Stop' : 'Speak'}
      </span>
    </motion.button>
  );
  
  const renderTranscript = () => (
    <AnimatePresence>
      {showTranscript && (transcript || finalTranscript) && (
        <motion.div
          className={styles.transcriptContainer}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <div className={styles.transcriptHeader}>
            <MessageSquare size={16} />
            <span>Transcript</span>
            <span className={styles.confidence}>
              {Math.round(confidence * 100)}% confidence
            </span>
          </div>
          
          <div className={styles.transcriptContent}>
            {finalTranscript && (
              <div className={styles.finalTranscript}>
                {finalTranscript}
              </div>
            )}
            {transcript && (
              <div className={styles.interimTranscript}>
                {transcript}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
  
  const renderOrderSummary = () => (
    <AnimatePresence>
      {orderSummary && (
        <motion.div
          className={styles.orderSummary}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <div className={styles.summaryHeader}>
            <ShoppingCart size={16} />
            <span>Your Order ({orderSummary.itemCount} items)</span>
            <span className={styles.total}>{orderSummary.formattedTotal}</span>
          </div>
          
          <div className={styles.summaryItems}>
            {orderSummary.items.map((item, index) => (
              <motion.div
                key={item.id}
                className={styles.summaryItem}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <span className={styles.itemQuantity}>{item.quantity}x</span>
                <span className={styles.itemName}>{item.product.name}</span>
                {item.size && (
                  <span className={styles.itemSize}>({item.size})</span>
                )}
                <span className={styles.itemPrice}>
                  {new Intl.NumberFormat('de-CH', {
                    style: 'currency',
                    currency: 'CHF'
                  }).format(item.price * item.quantity)}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
  
  const renderPendingConfirmation = () => (
    <AnimatePresence>
      {pendingConfirmation && (
        <motion.div
          className={styles.confirmationContainer}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <div className={styles.confirmationHeader}>
            <AlertCircle size={20} />
            <span>Confirmation Required</span>
          </div>
          
          <div className={styles.confirmationContent}>
            <p>Did you want to add:</p>
            <div className={styles.confirmationItem}>
              <strong>
                {pendingConfirmation.item.quantity}x {pendingConfirmation.item.product.name}
              </strong>
              {pendingConfirmation.item.size && (
                <span> ({pendingConfirmation.item.size})</span>
              )}
            </div>
          </div>
          
          <div className={styles.confirmationActions}>
            <button
              className={styles.confirmButton}
              onClick={confirmPendingAction}
            >
              <Check size={16} />
              Yes, Add It
            </button>
            <button
              className={styles.cancelButton}
              onClick={() => {
                setPendingConfirmation(null);
                setVoiceState(VOICE_STATES.IDLE);
                speak('Order cancelled.');
              }}
            >
              <X size={16} />
              Cancel
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
  
  const renderControls = () => (
    <div className={styles.controls}>
      <button
        className={styles.controlButton}
        onClick={() => setShowSettings(true)}
        title="Voice Settings"
      >
        <Settings size={16} />
      </button>
      
      <Suspense fallback={null}>
        <LanguageSelector
          selectedLanguage={currentLanguage}
          languages={SUPPORTED_LANGUAGES}
          onChange={setCurrentLanguage}
        />
      </Suspense>
      
      <button
        className={styles.controlButton}
        onClick={() => setShowHelp(true)}
        title="Help"
      >
        <HelpCircle size={16} />
      </button>
      
      <button
        className={styles.controlButton}
        onClick={() => setShowTranscript(!showTranscript)}
        title="Toggle Transcript"
      >
        <MessageSquare size={16} />
      </button>
      
      <button
        className={styles.controlButton}
        onClick={() => setIsMinimized(!isMinimized)}
        title={isMinimized ? 'Expand' : 'Minimize'}
      >
        {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
    </div>
  );
  
  const renderError = () => (
    <AnimatePresence>
      {error && (
        <motion.div
          className={styles.errorContainer}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className={styles.errorDismiss}
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
  
  const renderPerformanceStats = () => (
    <div className={styles.performanceStats}>
      <span>Processing: {lastProcessingTime.toFixed(0)}ms</span>
      <span>Success: {successCount}</span>
      <span>Errors: {errorCount}</span>
    </div>
  );
  
  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  if (!isOpen) return null;
  
  if (!isVoiceSupported) {
    return (
      <div className={`${styles.voiceOrderInterface} ${styles.unsupported} ${className}`}>
        <div className={styles.unsupportedMessage}>
          <AlertCircle size={32} />
          <h3>Voice Not Supported</h3>
          <p>Your browser doesn't support voice recognition. Please use a modern browser like Chrome or Edge.</p>
          <button onClick={onClose} className={styles.closeButton}>
            Close
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <motion.div
      className={`${styles.voiceOrderInterface} ${className} ${isMinimized ? styles.minimized : ''}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerIcon}>
            <Brain size={24} />
          </div>
          <div className={styles.headerInfo}>
            <h2 className={styles.title}>Voice Order Assistant</h2>
            <div className={styles.status}>
              <div className={`${styles.statusIndicator} ${styles[voiceState]}`} />
              <span className={styles.statusText}>
                {voiceState === VOICE_STATES.IDLE && 'Ready'}
                {voiceState === VOICE_STATES.LISTENING && currentPrompts.listening}
                {voiceState === VOICE_STATES.PROCESSING && currentPrompts.processing}
                {voiceState === VOICE_STATES.SPEAKING && 'Speaking...'}
                {voiceState === VOICE_STATES.CONFIRMING && 'Awaiting confirmation...'}
                {voiceState === VOICE_STATES.ERROR && 'Error occurred'}
              </span>
            </div>
          </div>
        </div>
        
        <button
          className={styles.closeButton}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      
      {/* Main Content */}
      {!isMinimized && (
        <div className={styles.content}>
          {!isInitialized ? (
            <LoadingSpinner message="Initializing voice interface..." />
          ) : (
            <>
              {/* Voice Button */}
              <div className={styles.voiceSection}>
                {renderVoiceButton()}
                
                {/* Waveform Visualization */}
                {isListening && (
                  <Suspense fallback={null}>
                    <VoiceWaveform
                      isActive={isListening}
                      audioLevel={audioLevel}
                      className={styles.waveform}
                    />
                  </Suspense>
                )}
              </div>
              
              {/* Transcript */}
              {renderTranscript()}
              
              {/* Pending Confirmation */}
              {renderPendingConfirmation()}
              
              {/* Order Summary */}
              {renderOrderSummary()}
              
              {/* Error Display */}
              {renderError()}
              
              {/* Performance Stats (debug mode) */}
              {process.env.NODE_ENV === 'development' && renderPerformanceStats()}
            </>
          )}
        </div>
      )}
      
      {/* Controls */}
      {renderControls()}
      
      {/* Settings Modal */}
      {showSettings && (
        <Suspense fallback={<LoadingSpinner />}>
          <VoiceSettings
            language={currentLanguage}
            onLanguageChange={setCurrentLanguage}
            onClose={() => setShowSettings(false)}
          />
        </Suspense>
      )}
      
      {/* Help Modal */}
      {showHelp && (
        <div className={styles.helpModal}>
          <div className={styles.helpContent}>
            <h3>Voice Commands Help</h3>
            <div className={styles.helpCommands}>
              <div className={styles.helpCommand}>
                <strong>Order items:</strong>
                <span>"I'd like a pizza margherita"</span>
                <span>"Add two burgers to my order"</span>
              </div>
              <div className={styles.helpCommand}>
                <strong>Modify order:</strong>
                <span>"Remove the fries"</span>
                <span>"Change that to large size"</span>
              </div>
              <div className={styles.helpCommand}>
                <strong>Get help:</strong>
                <span>"What can I order?"</span>
                <span>"Show me the menu"</span>
              </div>
            </div>
            <button
              className={styles.helpClose}
              onClick={() => setShowHelp(false)}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default VoiceOrderInterface;