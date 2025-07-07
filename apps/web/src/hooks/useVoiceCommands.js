/**
 * EATECH - Voice Commands Hook
 * Version: 4.5.0
 * Description: Custom hook for voice command processing, routing, and execution
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/features/voice/hooks/useVoiceCommands.js
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoiceSettings } from './useVoiceSettings';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useTextToSpeech } from './useTextToSpeech';
import { VoiceCommandProcessor } from '../services/VoiceCommandProcessor';
import { NaturalLanguageProcessor } from '../services/NaturalLanguageProcessor';
import { CommandMatcher } from '../utils/CommandMatcher';
import { ContextManager } from '../utils/ContextManager';
import { useAuth } from '../../../contexts/AuthContext';
import { useCart } from '../../../contexts/CartContext';
import { useOrders } from '../../../contexts/OrdersContext';
import { debounce } from 'lodash';

// ============================================================================
// CONSTANTS & COMMAND DEFINITIONS
// ============================================================================

const COMMAND_CATEGORIES = {
  NAVIGATION: 'navigation',
  ORDERS: 'orders',
  MENU: 'menu',
  CART: 'cart',
  SEARCH: 'search',
  SETTINGS: 'settings',
  HELP: 'help',
  RESTAURANT: 'restaurant',
  ADMIN: 'admin',
  SYSTEM: 'system'
};

const COMMAND_PATTERNS = {
  // Navigation Commands
  navigation: [
    {
      patterns: ['zeige? (mir )?(das )?menü', 'menü (anzeigen|öffnen)', 'go to menu', 'open menu'],
      intent: 'navigate_menu',
      params: [],
      examples: ['Zeige mir das Menü', 'Menü öffnen', 'Go to menu']
    },
    {
      patterns: ['(gehe? )?zu(r|m)? (startseite|home)', 'go (to )?home', 'back to start'],
      intent: 'navigate_home',
      params: [],
      examples: ['Gehe zur Startseite', 'Go home', 'Back to start']
    },
    {
      patterns: ['(zeige? )?(mein )?warenkorb', '(open )?cart', 'show (my )?basket'],
      intent: 'navigate_cart',
      params: [],
      examples: ['Zeige meinen Warenkorb', 'Open cart', 'Show basket']
    },
    {
      patterns: ['(meine )?bestellungen?', '(my )?orders?', 'order history'],
      intent: 'navigate_orders',
      params: [],
      examples: ['Meine Bestellungen', 'My orders', 'Order history']
    }
  ],

  // Order Commands
  orders: [
    {
      patterns: ['neue bestellung( für tisch (?<table>\\d+))?', 'new order( for table (?<table>\\d+))?'],
      intent: 'create_order',
      params: ['table'],
      examples: ['Neue Bestellung', 'New order for table 5']
    },
    {
      patterns: ['bestellung (?<orderId>\\w+) (stornieren|löschen)', 'cancel order (?<orderId>\\w+)'],
      intent: 'cancel_order',
      params: ['orderId'],
      examples: ['Bestellung ABC123 stornieren', 'Cancel order ABC123']
    },
    {
      patterns: ['(wie ist der )?status (von )?tisch (?<table>\\d+)', 'table (?<table>\\d+) status'],
      intent: 'check_table_status',
      params: ['table'],
      examples: ['Status von Tisch 5', 'Table 3 status']
    },
    {
      patterns: ['alle? tische?( status)?', 'all tables?( status)?', 'table overview'],
      intent: 'show_all_tables',
      params: [],
      examples: ['Alle Tische', 'All tables status', 'Table overview']
    }
  ],

  // Menu & Product Commands
  menu: [
    {
      patterns: ['suche?( nach)? (?<query>[\\w\\s]+)', 'search (for )?(?<query>[\\w\\s]+)', 'find (?<query>[\\w\\s]+)'],
      intent: 'search_products',
      params: ['query'],
      examples: ['Suche nach Pizza', 'Search for pasta', 'Find vegetarian']
    },
    {
      patterns: ['zeige? (alle )?(?<category>\\w+)', 'show (all )?(?<category>\\w+)', 'list (?<category>\\w+)'],
      intent: 'show_category',
      params: ['category'],
      examples: ['Zeige Getränke', 'Show desserts', 'List appetizers']
    },
    {
      patterns: ['was ist (?<item>[\\w\\s]+)', 'what is (?<item>[\\w\\s]+)', 'tell me about (?<item>[\\w\\s]+)'],
      intent: 'product_info',
      params: ['item'],
      examples: ['Was ist Risotto', 'What is tiramisu', 'Tell me about lasagna']
    }
  ],

  // Cart Commands  
  cart: [
    {
      patterns: [
        'füge?( (?<quantity>\\d+))? (?<item>[\\w\\s]+)( hinzu| dazu)?',
        'add( (?<quantity>\\d+))? (?<item>[\\w\\s]+)( to cart)?',
        '(?<quantity>\\d+)x (?<item>[\\w\\s]+)'
      ],
      intent: 'add_to_cart',
      params: ['item', 'quantity'],
      examples: ['Füge 2 Pizza hinzu', 'Add pasta to cart', '3x Bier']
    },
    {
      patterns: ['entferne (?<item>[\\w\\s]+)', 'remove (?<item>[\\w\\s]+)', 'delete (?<item>[\\w\\s]+)'],
      intent: 'remove_from_cart',
      params: ['item'],
      examples: ['Entferne Pizza', 'Remove pasta', 'Delete salad']
    },
    {
      patterns: ['warenkorb leeren', 'clear cart', 'empty (the )?cart'],
      intent: 'clear_cart',
      params: [],
      examples: ['Warenkorb leeren', 'Clear cart', 'Empty cart']
    },
    {
      patterns: ['(ich möchte )?bezahlen', 'checkout', '(proceed to )?payment'],
      intent: 'checkout',
      params: [],
      examples: ['Ich möchte bezahlen', 'Checkout', 'Proceed to payment']
    }
  ],

  // Restaurant Commands
  restaurant: [
    {
      patterns: [
        'reservierung( für (?<date>[\\w\\s]+))?( um (?<time>\\d{1,2}:?\\d{0,2}))?( für (?<guests>\\d+) (person|personen|guest|guests))?',
        'reservation( for (?<date>[\\w\\s]+))?( at (?<time>\\d{1,2}:?\\d{0,2}))?( for (?<guests>\\d+) (person|people|guest|guests))?'
      ],
      intent: 'make_reservation',
      params: ['date', 'time', 'guests'],
      examples: ['Reservierung für heute um 19:00 für 4 Personen', 'Reservation for tomorrow at 7 PM for 2 people']
    },
    {
      patterns: ['(öffnungs)?zeiten?', '(opening )?hours?', 'when (are you )?open'],
      intent: 'opening_hours',
      params: [],
      examples: ['Öffnungszeiten', 'Opening hours', 'When are you open']
    },
    {
      patterns: ['(wo seid ihr|adresse)', '(where are you|address)', 'location'],
      intent: 'location_info',
      params: [],
      examples: ['Wo seid ihr', 'Where are you', 'Address']
    }
  ],

  // System Commands
  system: [
    {
      patterns: ['hilfe', 'help', 'was kann ich sagen', 'what can i say'],
      intent: 'show_help',
      params: [],
      examples: ['Hilfe', 'Help', 'What can I say']
    },
    {
      patterns: ['stopp?', 'stop', 'halt', 'cancel'],
      intent: 'stop_listening',
      params: [],
      examples: ['Stopp', 'Stop', 'Cancel']
    },
    {
      patterns: ['wiederhole( das)?', 'repeat( that)?', 'say (that )?again'],
      intent: 'repeat_last',
      params: [],
      examples: ['Wiederhole das', 'Repeat that', 'Say again']
    },
    {
      patterns: ['einstellungen?', 'settings?', 'konfiguration', 'configuration'],
      intent: 'open_settings',
      params: [],
      examples: ['Einstellungen', 'Settings', 'Configuration']
    }
  ]
};

const SWISS_GERMAN_COMMANDS = {
  greetings: [
    { pattern: 'grüezi( eatech)?', intent: 'greeting', response: 'Grüezi! Wie chönd mer Ihne helfe?' },
    { pattern: 'hoi( eatech)?', intent: 'greeting', response: 'Hoi! Was chönd mer für Sie tue?' },
    { pattern: 'sali( eatech)?', intent: 'greeting', response: 'Sali! Wie gaht\'s?' }
  ],
  orders: [
    { pattern: 'mer wänd (?<item>[\\w\\s]+)', intent: 'add_to_cart', response: 'Okay, ich füege {item} dezue.' },
    { pattern: 'chönd mer (?<item>[\\w\\s]+) ha', intent: 'add_to_cart', response: 'Natürli, {item} chunnt i Warenkorb.' }
  ],
  confirmation: [
    { pattern: '(ja|jo|okay|alles klar)', intent: 'confirm', response: 'Perfekt!' },
    { pattern: '(nei|nöd|nein)', intent: 'deny', response: 'Okay, verstande.' }
  ]
};

const CONTEXT_TYPES = {
  ORDER_CREATION: 'order_creation',
  PRODUCT_SELECTION: 'product_selection',
  PAYMENT: 'payment',
  RESERVATION: 'reservation',
  HELP: 'help'
};

// ============================================================================
// CUSTOM HOOK
// ============================================================================

export const useVoiceCommands = (options = {}) => {
  // ============================================================================
  // HOOKS & REFS
  // ============================================================================
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem, removeItem, clearCart } = useCart();
  const { createOrder } = useOrders();
  const { settings, updateStats } = useVoiceSettings();
  const { transcript, confidence, isListening } = useSpeechRecognition();
  const { speak, speakConfirmation, speakError } = useTextToSpeech();
  
  const processorRef = useRef(null);
  const nlpRef = useRef(null);
  const matcherRef = useRef(null);
  const contextManagerRef = useRef(null);
  const lastCommandRef = useRef(null);
  const commandHistoryRef = useRef([]);
  
  // ============================================================================
  // STATE
  // ============================================================================
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentContext, setCurrentContext] = useState(null);
  const [availableCommands, setAvailableCommands] = useState([]);
  const [lastCommand, setLastCommand] = useState(null);
  const [commandHistory, setCommandHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const isReady = useMemo(() => {
    return settings.enabled && 
           processorRef.current && 
           nlpRef.current && 
           matcherRef.current;
  }, [settings.enabled]);
  
  const currentLanguage = useMemo(() => {
    return settings.dialect || settings.language || 'de-CH';
  }, [settings.dialect, settings.language]);
  
  const isSwissGerman = useMemo(() => {
    return currentLanguage.includes('CH');
  }, [currentLanguage]);
  
  const contextualCommands = useMemo(() => {
    if (!currentContext) return availableCommands;
    
    return availableCommands.filter(cmd => {
      return cmd.contexts?.includes(currentContext.type) || !cmd.contexts;
    });
  }, [availableCommands, currentContext]);
  
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  const initializeServices = useCallback(async () => {
    try {
      // Initialize processor
      if (!processorRef.current) {
        processorRef.current = new VoiceCommandProcessor({
          language: currentLanguage,
          confidenceThreshold: settings.recognition?.confidenceThreshold || 0.7
        });
      }
      
      // Initialize NLP
      if (!nlpRef.current) {
        nlpRef.current = new NaturalLanguageProcessor({
          language: currentLanguage,
          swissGermanSupport: isSwissGerman
        });
        await nlpRef.current.initialize();
      }
      
      // Initialize command matcher
      if (!matcherRef.current) {
        matcherRef.current = new CommandMatcher({
          patterns: COMMAND_PATTERNS,
          swissPatterns: isSwissGerman ? SWISS_GERMAN_COMMANDS : null,
          language: currentLanguage
        });
      }
      
      // Initialize context manager
      if (!contextManagerRef.current) {
        contextManagerRef.current = new ContextManager();
      }
      
      // Build available commands list
      buildAvailableCommands();
      
    } catch (error) {
      console.error('Failed to initialize voice command services:', error);
      setError({
        type: 'initialization_error',
        message: error.message,
        timestamp: Date.now()
      });
    }
  }, [currentLanguage, isSwissGerman, settings.recognition?.confidenceThreshold]);
  
  const buildAvailableCommands = useCallback(() => {
    const commands = [];
    
    Object.entries(COMMAND_PATTERNS).forEach(([category, categoryCommands]) => {
      categoryCommands.forEach((cmd, index) => {
        commands.push({
          id: `${category}_${index}`,
          category: COMMAND_CATEGORIES[category.toUpperCase()],
          intent: cmd.intent,
          patterns: cmd.patterns,
          params: cmd.params,
          examples: cmd.examples,
          confidence: 0,
          contexts: cmd.contexts
        });
      });
    });
    
    // Add Swiss German commands if applicable
    if (isSwissGerman) {
      Object.entries(SWISS_GERMAN_COMMANDS).forEach(([category, categoryCommands]) => {
        categoryCommands.forEach((cmd, index) => {
          commands.push({
            id: `swiss_${category}_${index}`,
            category: COMMAND_CATEGORIES.SYSTEM,
            intent: cmd.intent,
            patterns: [cmd.pattern],
            params: [],
            examples: [cmd.pattern],
            response: cmd.response,
            isSwiss: true
          });
        });
      });
    }
    
    // Add custom commands from settings
    if (settings.advanced?.customCommands) {
      settings.advanced.customCommands.forEach((cmd, index) => {
        commands.push({
          id: `custom_${index}`,
          category: COMMAND_CATEGORIES.SYSTEM,
          intent: cmd.intent,
          patterns: [cmd.pattern],
          params: cmd.params || [],
          examples: [cmd.example || cmd.pattern],
          isCustom: true
        });
      });
    }
    
    setAvailableCommands(commands);
  }, [isSwissGerman, settings.advanced?.customCommands]);
  
  // ============================================================================
  // COMMAND PROCESSING
  // ============================================================================
  
  const processCommand = useCallback(async (inputText, options = {}) => {
    if (!isReady || !inputText?.trim()) return null;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const startTime = Date.now();
      
      // Preprocess text
      const preprocessedText = await nlpRef.current.preprocess(inputText);
      
      // Extract intent and entities
      const nlpResult = await nlpRef.current.analyze(preprocessedText);
      
      // Match against command patterns
      const matchResult = matcherRef.current.match(preprocessedText, {
        confidence: confidence || 1.0,
        context: currentContext
      });
      
      // Combine results
      const commandResult = {
        originalText: inputText,
        preprocessedText,
        intent: matchResult.intent || nlpResult.intent,
        entities: { ...nlpResult.entities, ...matchResult.params },
        confidence: Math.max(confidence || 0, matchResult.confidence || 0),
        category: matchResult.category,
        pattern: matchResult.pattern,
        isSwiss: matchResult.isSwiss,
        processingTime: Date.now() - startTime,
        timestamp: Date.now()
      };
      
      // Debug information
      if (settings.advanced?.debugMode) {
        setDebugInfo({
          nlpResult,
          matchResult,
          commandResult,
          availableCommands: contextualCommands.length
        });
      }
      
      // Validate confidence threshold
      if (commandResult.confidence < (settings.recognition?.confidenceThreshold || 0.7)) {
        await handleLowConfidence(commandResult);
        return commandResult;
      }
      
      // Execute command
      const executionResult = await executeCommand(commandResult);
      commandResult.executionResult = executionResult;
      
      // Update history and stats
      updateCommandHistory(commandResult);
      updateCommandStats(commandResult);
      
      // Set as last command for potential repeat
      setLastCommand(commandResult);
      lastCommandRef.current = commandResult;
      
      return commandResult;
      
    } catch (error) {
      console.error('Command processing failed:', error);
      setError({
        type: 'processing_error',
        message: error.message,
        timestamp: Date.now()
      });
      
      await speakError();
      return null;
      
    } finally {
      setIsProcessing(false);
    }
  }, [
    isReady,
    confidence,
    currentContext,
    settings.recognition?.confidenceThreshold,
    settings.advanced?.debugMode,
    contextualCommands.length
  ]);
  
  // ============================================================================
  // COMMAND EXECUTION
  // ============================================================================
  
  const executeCommand = useCallback(async (commandResult) => {
    const { intent, entities, category, isSwiss } = commandResult;
    
    try {
      let result = { success: false, message: '', data: null };
      
      switch (intent) {
        // Navigation Commands
        case 'navigate_menu':
          navigate('/menu');
          result = { 
            success: true, 
            message: isSwiss ? 'Gang zum Menü' : 'Gehe zum Menü',
            action: 'navigation'
          };
          break;
          
        case 'navigate_home':
          navigate('/');
          result = { 
            success: true, 
            message: isSwiss ? 'Gang zur Startsite' : 'Gehe zur Startseite',
            action: 'navigation'
          };
          break;
          
        case 'navigate_cart':
          navigate('/cart');
          result = { 
            success: true, 
            message: isSwiss ? 'Zeige Warenkorb' : 'Zeige Warenkorb',
            action: 'navigation'
          };
          break;
          
        case 'navigate_orders':
          navigate('/orders');
          result = { 
            success: true, 
            message: isSwiss ? 'Zeige Bestellige' : 'Zeige Bestellungen',
            action: 'navigation'
          };
          break;
          
        // Cart Commands
        case 'add_to_cart':
          if (entities.item) {
            const quantity = parseInt(entities.quantity) || 1;
            await addItem({
              name: entities.item,
              quantity: quantity
            });
            result = {
              success: true,
              message: isSwiss ? 
                `${quantity}x ${entities.item} isch i Warenkorb` :
                `${quantity}x ${entities.item} wurde zum Warenkorb hinzugefügt`,
              action: 'cart_add',
              data: { item: entities.item, quantity }
            };
          }
          break;
          
        case 'remove_from_cart':
          if (entities.item) {
            await removeItem(entities.item);
            result = {
              success: true,
              message: isSwiss ?
                `${entities.item} isch entfernt worde` :
                `${entities.item} wurde entfernt`,
              action: 'cart_remove',
              data: { item: entities.item }
            };
          }
          break;
          
        case 'clear_cart':
          await clearCart();
          result = {
            success: true,
            message: isSwiss ? 'Warenkorb isch glärt' : 'Warenkorb wurde geleert',
            action: 'cart_clear'
          };
          break;
          
        case 'checkout':
          navigate('/checkout');
          result = {
            success: true,
            message: isSwiss ? 'Gang zum Zahle' : 'Gehe zur Bezahlung',
            action: 'checkout'
          };
          break;
          
        // Search Commands
        case 'search_products':
          if (entities.query) {
            navigate(`/search?q=${encodeURIComponent(entities.query)}`);
            result = {
              success: true,
              message: isSwiss ?
                `Sueche nach "${entities.query}"` :
                `Suche nach "${entities.query}"`,
              action: 'search',
              data: { query: entities.query }
            };
          }
          break;
          
        // Help Commands
        case 'show_help':
          result = await showHelp();
          break;
          
        case 'repeat_last':
          if (lastCommandRef.current) {
            result = await executeCommand(lastCommandRef.current);
            result.isRepeat = true;
          } else {
            result = {
              success: false,
              message: isSwiss ?
                'Es git kei früeheri Befehl zum wiederhole' :
                'Es gibt keinen früheren Befehl zum Wiederholen'
            };
          }
          break;
          
        case 'stop_listening':
          result = {
            success: true,
            message: isSwiss ? 'Okay, ich höre uf' : 'Okay, ich höre auf',
            action: 'stop'
          };
          break;
          
        // Swiss German specific responses
        case 'greeting':
          if (isSwiss && commandResult.response) {
            result = {
              success: true,
              message: commandResult.response,
              action: 'greeting'
            };
          }
          break;
          
        case 'confirm':
        case 'deny':
          result = await handleConfirmation(intent === 'confirm', commandResult);
          break;
          
        default:
          result = {
            success: false,
            message: isSwiss ?
              'Entschuldigung, das han ich nöd verstande' :
              'Entschuldigung, das habe ich nicht verstanden'
          };
      }
      
      // Speak result if TTS is enabled
      if (result.message && settings.tts?.confirmations) {
        await speak(result.message);
      }
      
      return result;
      
    } catch (error) {
      console.error('Command execution failed:', error);
      return {
        success: false,
        message: isSwiss ?
          'Da isch öppis schiefgange' :
          'Da ist etwas schiefgelaufen',
        error: error.message
      };
    }
  }, [navigate, addItem, removeItem, clearCart, settings.tts?.confirmations, speak]);
  
  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================
  
  const handleLowConfidence = useCallback(async (commandResult) => {
    const suggestions = await generateSuggestions(commandResult.preprocessedText);
    setSuggestions(suggestions);
    
    if (settings.tts?.enabled) {
      const message = isSwissGerman ?
        'Ich bi mir nöd sicher. Wänd Sie öppis anders säge?' :
        'Ich bin mir nicht sicher. Möchten Sie etwas anderes sagen?';
      await speak(message);
    }
  }, [settings.tts?.enabled, isSwissGerman, speak]);
  
  const generateSuggestions = useCallback(async (text) => {
    if (!nlpRef.current || !matcherRef.current) return [];
    
    try {
      // Find similar commands
      const similarCommands = matcherRef.current.findSimilar(text, 3);
      
      return similarCommands.map(cmd => ({
        text: cmd.examples[0],
        confidence: cmd.similarity,
        intent: cmd.intent
      }));
      
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      return [];
    }
  }, []);
  
  const showHelp = useCallback(async () => {
    const helpMessage = isSwissGerman ?
      'Sie chönd säge: "Zeig Menü", "Füeg Pizza hinzu", "Gang zu Warenkorb", oder "Hilf mer"' :
      'Sie können sagen: "Zeige Menü", "Füge Pizza hinzu", "Gehe zu Warenkorb", oder "Hilfe"';
    
    if (settings.tts?.instructions) {
      await speak(helpMessage);
    }
    
    return {
      success: true,
      message: helpMessage,
      action: 'help',
      data: {
        commands: contextualCommands.slice(0, 5).map(cmd => cmd.examples[0])
      }
    };
  }, [isSwissGerman, settings.tts?.instructions, speak, contextualCommands]);
  
  const handleConfirmation = useCallback(async (isConfirm, commandResult) => {
    if (!currentContext) {
      return {
        success: false,
        message: isSwissGerman ?
          'Es git nüt zum bestätige' :
          'Es gibt nichts zu bestätigen'
      };
    }
    
    // Handle context-specific confirmations
    switch (currentContext.type) {
      case CONTEXT_TYPES.ORDER_CREATION:
        if (isConfirm) {
          // Complete order
          const orderResult = await createOrder(currentContext.data);
          setCurrentContext(null);
          return {
            success: true,
            message: isSwissGerman ?
              'Bestellig isch bestätigt' :
              'Bestellung ist bestätigt',
            action: 'order_confirmed',
            data: orderResult
          };
        } else {
          // Cancel order
          setCurrentContext(null);
          return {
            success: true,
            message: isSwissGerman ?
              'Bestellig isch abbroche' :
              'Bestellung ist abgebrochen',
            action: 'order_cancelled'
          };
        }
        
      default:
        setCurrentContext(null);
        return {
          success: true,
          message: isConfirm ?
            (isSwissGerman ? 'Okay, verstande' : 'Okay, verstanden') :
            (isSwissGerman ? 'Okay, abbroche' : 'Okay, abgebrochen')
        };
    }
  }, [currentContext, isSwissGerman, createOrder]);
  
  const updateCommandHistory = useCallback((commandResult) => {
    const newHistory = [commandResult, ...commandHistoryRef.current].slice(0, 50);
    commandHistoryRef.current = newHistory;
    setCommandHistory(newHistory);
  }, []);
  
  const updateCommandStats = useCallback((commandResult) => {
    updateStats({
      totalCommands: 1,
      successfulCommands: commandResult.executionResult?.success ? 1 : 0,
      averageConfidence: commandResult.confidence,
      favoriteCommands: [commandResult.intent]
    });
  }, [updateStats]);
  
  // ============================================================================
  // AUTO-PROCESSING
  // ============================================================================
  
  const debouncedProcess = useMemo(
    () => debounce((text) => {
      if (text && text.length > 2) {
        processCommand(text);
      }
    }, 500),
    [processCommand]
  );
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  useEffect(() => {
    initializeServices();
  }, [initializeServices]);
  
  useEffect(() => {
    buildAvailableCommands();
  }, [buildAvailableCommands]);
  
  // Auto-process transcript when it changes
  useEffect(() => {
    if (transcript && settings.advanced?.autoProcess !== false) {
      debouncedProcess(transcript);
    }
  }, [transcript, settings.advanced?.autoProcess, debouncedProcess]);
  
  // Clear suggestions when starting new recognition
  useEffect(() => {
    if (isListening) {
      setSuggestions([]);
    }
  }, [isListening]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      debouncedProcess.cancel();
    };
  }, [debouncedProcess]);
  
  // ============================================================================
  // RETURN API
  // ============================================================================
  
  return {
    // State
    isProcessing,
    isReady,
    error,
    debugInfo,
    
    // Current state
    currentContext,
    lastCommand,
    commandHistory,
    suggestions,
    
    // Available commands
    availableCommands,
    contextualCommands,
    
    // Actions
    processCommand,
    setCurrentContext,
    clearHistory: () => {
      commandHistoryRef.current = [];
      setCommandHistory([]);
    },
    clearError: () => setError(null),
    
    // Context management
    createContext: (type, data) => {
      const context = { type, data, timestamp: Date.now() };
      setCurrentContext(context);
      return context;
    },
    
    // Language info
    currentLanguage,
    isSwissGerman,
    
    // Constants
    COMMAND_CATEGORIES,
    CONTEXT_TYPES,
    COMMAND_PATTERNS
  };
};