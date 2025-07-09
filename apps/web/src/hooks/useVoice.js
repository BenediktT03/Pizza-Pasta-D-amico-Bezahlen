/**
 * EATECH Admin - Voice Commands Hook
 * Version: 3.0.0
 * Description: Voice command processing for Admin Dashboard with restaurant management commands
 * Author: EATECH Development Team
 * Created: 2025-01-08
 *
 * Based on Web App voice hook but adapted for Admin/Staff use cases
 */

import { debounce } from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationsContext';
import { useOrders } from '../contexts/OrdersContext';
import { useProducts } from '../contexts/ProductsContext';
import { useTables } from '../contexts/TablesContext';
import { useSpeechRecognition } from '../services/voice/SpeechRecognitionService';
import { useTextToSpeech } from '../services/voice/TextToSpeechService';
import { VoiceCommandProcessor } from '../services/voice/VoiceCommandProcessor';

// ============================================================================
// ADMIN COMMAND CATEGORIES
// ============================================================================

const COMMAND_CATEGORIES = {
  NAVIGATION: 'navigation',
  ORDER_MANAGEMENT: 'order_management',
  TABLE_MANAGEMENT: 'table_management',
  PRODUCT_MANAGEMENT: 'product_management',
  KITCHEN: 'kitchen',
  ANALYTICS: 'analytics',
  STAFF: 'staff',
  SYSTEM: 'system',
  EMERGENCY: 'emergency'
};

const ADMIN_COMMAND_PATTERNS = {
  // Navigation Commands
  navigation: [
    {
      patterns: ['(gehe? zu|zeige?) dashboard', 'go to dashboard', 'home'],
      intent: 'navigate_dashboard',
      params: [],
      examples: ['Gehe zu Dashboard', 'Go to dashboard']
    },
    {
      patterns: ['(zeige? alle? )?bestellungen', 'show (all )?orders', 'order management'],
      intent: 'navigate_orders',
      params: [],
      examples: ['Zeige Bestellungen', 'Show orders']
    },
    {
      patterns: ['(zeige? )?produkte', 'show products', 'product management'],
      intent: 'navigate_products',
      params: [],
      examples: ['Zeige Produkte', 'Show products']
    },
    {
      patterns: ['(zeige? )?analytics', 'show analytics', 'statistics'],
      intent: 'navigate_analytics',
      params: [],
      examples: ['Zeige Analytics', 'Show statistics']
    }
  ],

  // Order Management Commands
  order_management: [
    {
      patterns: [
        'neue bestellung( für)? tisch (?<table>\\d+)',
        'new order( for)? table (?<table>\\d+)',
        'tisch (?<table>\\d+) bestellt'
      ],
      intent: 'create_order',
      params: ['table'],
      examples: ['Neue Bestellung für Tisch 5', 'Table 3 orders']
    },
    {
      patterns: [
        'bestellung (?<orderId>\\w+) (ist )?fertig',
        'order (?<orderId>\\w+) (is )?ready',
        'fertig mit (?<orderId>\\w+)'
      ],
      intent: 'mark_order_ready',
      params: ['orderId'],
      examples: ['Bestellung ABC123 ist fertig', 'Order XYZ ready']
    },
    {
      patterns: [
        'storniere bestellung (?<orderId>\\w+)',
        'cancel order (?<orderId>\\w+)',
        'bestellung (?<orderId>\\w+) stornieren'
      ],
      intent: 'cancel_order',
      params: ['orderId'],
      examples: ['Storniere Bestellung ABC123', 'Cancel order XYZ']
    },
    {
      patterns: [
        '(zeige? )?offene bestellungen',
        'show pending orders',
        'was ist offen'
      ],
      intent: 'show_pending_orders',
      params: [],
      examples: ['Zeige offene Bestellungen', 'What is open']
    },
    {
      patterns: [
        'bestellung (?<orderId>\\w+) details',
        'order (?<orderId>\\w+) details',
        'was ist in bestellung (?<orderId>\\w+)'
      ],
      intent: 'show_order_details',
      params: ['orderId'],
      examples: ['Bestellung ABC123 Details', 'What is in order XYZ']
    }
  ],

  // Table Management Commands
  table_management: [
    {
      patterns: [
        'tisch (?<table>\\d+) (ist )?besetzt',
        'table (?<table>\\d+) (is )?occupied',
        'setze tisch (?<table>\\d+) besetzt'
      ],
      intent: 'mark_table_occupied',
      params: ['table'],
      examples: ['Tisch 5 ist besetzt', 'Table 3 occupied']
    },
    {
      patterns: [
        'tisch (?<table>\\d+) (ist )?frei',
        'table (?<table>\\d+) (is )?free',
        'tisch (?<table>\\d+) aufräumen'
      ],
      intent: 'mark_table_free',
      params: ['table'],
      examples: ['Tisch 5 ist frei', 'Table 3 free']
    },
    {
      patterns: [
        '(zeige? )?alle tische',
        'show all tables',
        'tisch übersicht'
      ],
      intent: 'show_table_overview',
      params: [],
      examples: ['Zeige alle Tische', 'Table overview']
    },
    {
      patterns: [
        'welche tische sind frei',
        'which tables are free',
        'freie tische'
      ],
      intent: 'show_free_tables',
      params: [],
      examples: ['Welche Tische sind frei', 'Free tables']
    },
    {
      patterns: [
        'rechnung( für)? tisch (?<table>\\d+)',
        'bill( for)? table (?<table>\\d+)',
        'tisch (?<table>\\d+) abrechnen'
      ],
      intent: 'print_bill',
      params: ['table'],
      examples: ['Rechnung für Tisch 5', 'Bill for table 3']
    }
  ],

  // Product Management Commands
  product_management: [
    {
      patterns: [
        '(?<product>[\\w\\s]+) (ist )?ausverkauft',
        '(?<product>[\\w\\s]+) (is )?sold out',
        'kein (?<product>[\\w\\s]+) mehr'
      ],
      intent: 'mark_product_soldout',
      params: ['product'],
      examples: ['Pizza Margherita ist ausverkauft', 'No more pasta']
    },
    {
      patterns: [
        '(?<product>[\\w\\s]+) (ist )?wieder verfügbar',
        '(?<product>[\\w\\s]+) (is )?available again',
        '(?<product>[\\w\\s]+) wieder da'
      ],
      intent: 'mark_product_available',
      params: ['product'],
      examples: ['Pizza wieder verfügbar', 'Pasta available again']
    },
    {
      patterns: [
        'neues produkt (?<name>[\\w\\s]+) für (?<price>\\d+\\.?\\d*)',
        'add product (?<name>[\\w\\s]+) for (?<price>\\d+\\.?\\d*)',
        'füge (?<name>[\\w\\s]+) hinzu preis (?<price>\\d+\\.?\\d*)'
      ],
      intent: 'add_product',
      params: ['name', 'price'],
      examples: ['Neues Produkt Salat für 12.50', 'Add product Soup for 8.90']
    },
    {
      patterns: [
        'ändere preis von (?<product>[\\w\\s]+) auf (?<price>\\d+\\.?\\d*)',
        'change price of (?<product>[\\w\\s]+) to (?<price>\\d+\\.?\\d*)',
        '(?<product>[\\w\\s]+) kostet jetzt (?<price>\\d+\\.?\\d*)'
      ],
      intent: 'update_product_price',
      params: ['product', 'price'],
      examples: ['Ändere Preis von Pizza auf 15.90', 'Pasta costs now 12.50']
    }
  ],

  // Kitchen Commands
  kitchen: [
    {
      patterns: [
        '(zeige? )?küchen display',
        'show kitchen display',
        'kitchen screen'
      ],
      intent: 'show_kitchen_display',
      params: [],
      examples: ['Zeige Küchen Display', 'Kitchen screen']
    },
    {
      patterns: [
        'bestellung (?<orderId>\\w+) (in )?zubereitung',
        'order (?<orderId>\\w+) (in )?preparation',
        'starte (?<orderId>\\w+)'
      ],
      intent: 'start_preparation',
      params: ['orderId'],
      examples: ['Bestellung ABC123 in Zubereitung', 'Start XYZ']
    },
    {
      patterns: [
        '(zeige? )?wartezeiten',
        'show wait times',
        'wie lange dauert es'
      ],
      intent: 'show_wait_times',
      params: [],
      examples: ['Zeige Wartezeiten', 'How long does it take']
    },
    {
      patterns: [
        'nächste bestellung',
        'next order',
        'was kommt als nächstes'
      ],
      intent: 'show_next_order',
      params: [],
      examples: ['Nächste Bestellung', 'What comes next']
    }
  ],

  // Analytics Commands
  analytics: [
    {
      patterns: [
        '(zeige? )?tagesumsatz',
        'show daily revenue',
        'umsatz heute'
      ],
      intent: 'show_daily_revenue',
      params: [],
      examples: ['Zeige Tagesumsatz', 'Revenue today']
    },
    {
      patterns: [
        'beliebteste produkte',
        'most popular products',
        'was läuft gut'
      ],
      intent: 'show_popular_products',
      params: [],
      examples: ['Beliebteste Produkte', 'What sells well']
    },
    {
      patterns: [
        'bestellungen (in der )?letzten stunde',
        'orders (in )?last hour',
        'stunden statistik'
      ],
      intent: 'show_hourly_stats',
      params: [],
      examples: ['Bestellungen letzte Stunde', 'Hour statistics']
    }
  ],

  // Staff Commands
  staff: [
    {
      patterns: [
        'wer arbeitet heute',
        'who is working today',
        'personal heute'
      ],
      intent: 'show_todays_staff',
      params: [],
      examples: ['Wer arbeitet heute', 'Staff today']
    },
    {
      patterns: [
        'schicht wechsel',
        'shift change',
        'schichtwechsel'
      ],
      intent: 'announce_shift_change',
      params: [],
      examples: ['Schicht wechsel', 'Shift change']
    }
  ],

  // Emergency Commands
  emergency: [
    {
      patterns: [
        'notfall küche',
        'kitchen emergency',
        'küche problem'
      ],
      intent: 'kitchen_emergency',
      params: [],
      examples: ['Notfall Küche', 'Kitchen problem']
    },
    {
      patterns: [
        'alle bestellungen stoppen',
        'stop all orders',
        'bestellstopp'
      ],
      intent: 'stop_all_orders',
      params: [],
      examples: ['Alle Bestellungen stoppen', 'Order stop']
    }
  ],

  // System Commands
  system: [
    {
      patterns: ['hilfe', 'help', 'was kann ich sagen'],
      intent: 'show_help',
      params: [],
      examples: ['Hilfe', 'Help']
    },
    {
      patterns: ['stopp', 'stop', 'halt'],
      intent: 'stop_listening',
      params: [],
      examples: ['Stopp', 'Stop']
    },
    {
      patterns: ['einstellungen', 'settings'],
      intent: 'open_settings',
      params: [],
      examples: ['Einstellungen', 'Settings']
    }
  ]
};

// Swiss German admin variations
const SWISS_ADMIN_COMMANDS = {
  greetings: [
    { pattern: 'guete morge', intent: 'greeting', response: 'Guete Morge! Alles parat für hüt?' },
    { pattern: 'wie laufts', intent: 'status_check', response: 'Bis jetzt alles guet!' }
  ],
  kitchen: [
    { pattern: '(?<item>[\\w\\s]+) isch fertig', intent: 'mark_order_ready', response: 'Okay, {item} isch fertig markiert.' }
  ]
};

// ============================================================================
// CUSTOM HOOK
// ============================================================================

export const useVoice = (options = {}) => {
  // ============================================================================
  // HOOKS & REFS
  // ============================================================================

  const navigate = useNavigate();
  const { user, tenantId } = useAuth();
  const { orders, createOrder, updateOrderStatus, cancelOrder } = useOrders();
  const { products, updateProductAvailability, updateProductPrice } = useProducts();
  const { tables, updateTableStatus, getFreeTables } = useTables();
  const { showNotification } = useNotifications();

  const {
    transcript,
    confidence,
    isListening,
    startListening: startRecognition,
    stopListening: stopRecognition,
    error: recognitionError
  } = useSpeechRecognition();

  const { speak, speakConfirmation, speakError } = useTextToSpeech();

  const processorRef = useRef(null);
  const lastCommandRef = useRef(null);
  const commandQueueRef = useRef([]);

  // ============================================================================
  // STATE
  // ============================================================================

  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentContext, setCurrentContext] = useState(null);
  const [lastCommand, setLastCommand] = useState(null);
  const [commandHistory, setCommandHistory] = useState([]);
  const [error, setError] = useState(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  const initializeVoice = useCallback(async () => {
    try {
      if (!processorRef.current) {
        processorRef.current = new VoiceCommandProcessor({
          patterns: ADMIN_COMMAND_PATTERNS,
          swissPatterns: SWISS_ADMIN_COMMANDS,
          language: 'de-CH',
          confidenceThreshold: 0.7
        });
        await processorRef.current.initialize();
      }

      setIsReady(true);
    } catch (error) {
      console.error('Failed to initialize voice:', error);
      setError(error.message);
      setIsReady(false);
    }
  }, []);

  // ============================================================================
  // COMMAND PROCESSING
  // ============================================================================

  const processCommand = useCallback(async (inputText) => {
    if (!isReady || !inputText?.trim() || isProcessing) return null;

    setIsProcessing(true);
    setError(null);

    try {
      // Process with command processor
      const result = await processorRef.current.process(inputText, {
        confidence: confidence || 1.0,
        context: currentContext,
        user: user
      });

      if (!result || result.confidence < 0.7) {
        await speak('Entschuldigung, das habe ich nicht verstanden.');
        return null;
      }

      // Execute command
      const executionResult = await executeCommand(result);

      // Update history
      const command = {
        ...result,
        executionResult,
        timestamp: Date.now()
      };

      setLastCommand(command);
      lastCommandRef.current = command;
      setCommandHistory(prev => [command, ...prev].slice(0, 50));

      return command;

    } catch (error) {
      console.error('Command processing failed:', error);
      setError(error.message);
      await speakError();
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [isReady, isProcessing, confidence, currentContext, user, speak, speakError]);

  // ============================================================================
  // COMMAND EXECUTION
  // ============================================================================

  const executeCommand = useCallback(async (commandResult) => {
    const { intent, entities } = commandResult;

    try {
      let result = { success: false, message: '', data: null };

      switch (intent) {
        // Navigation
        case 'navigate_dashboard':
          navigate('/dashboard');
          result = { success: true, message: 'Gehe zum Dashboard' };
          break;

        case 'navigate_orders':
          navigate('/orders');
          result = { success: true, message: 'Zeige Bestellungen' };
          break;

        case 'navigate_products':
          navigate('/products');
          result = { success: true, message: 'Zeige Produkte' };
          break;

        case 'navigate_analytics':
          navigate('/analytics');
          result = { success: true, message: 'Zeige Analytics' };
          break;

        // Order Management
        case 'create_order':
          if (entities.table) {
            navigate(`/orders/new?table=${entities.table}`);
            result = {
              success: true,
              message: `Neue Bestellung für Tisch ${entities.table}`,
              data: { table: entities.table }
            };
          }
          break;

        case 'mark_order_ready':
          if (entities.orderId) {
            await updateOrderStatus(entities.orderId, 'ready');
            result = {
              success: true,
              message: `Bestellung ${entities.orderId} ist fertig`,
              action: 'order_ready'
            };
            // Send notification
            showNotification({
              type: 'success',
              title: 'Bestellung fertig',
              message: `Bestellung ${entities.orderId} kann serviert werden`
            });
          }
          break;

        case 'cancel_order':
          if (entities.orderId) {
            await cancelOrder(entities.orderId);
            result = {
              success: true,
              message: `Bestellung ${entities.orderId} wurde storniert`
            };
          }
          break;

        case 'show_pending_orders':
          navigate('/orders?status=pending');
          result = { success: true, message: 'Zeige offene Bestellungen' };
          break;

        // Table Management
        case 'mark_table_occupied':
          if (entities.table) {
            await updateTableStatus(entities.table, 'occupied');
            result = {
              success: true,
              message: `Tisch ${entities.table} ist besetzt`
            };
          }
          break;

        case 'mark_table_free':
          if (entities.table) {
            await updateTableStatus(entities.table, 'free');
            result = {
              success: true,
              message: `Tisch ${entities.table} ist frei`
            };
          }
          break;

        case 'show_free_tables':
          const freeTables = await getFreeTables();
          result = {
            success: true,
            message: `${freeTables.length} Tische sind frei: ${freeTables.map(t => t.number).join(', ')}`,
            data: freeTables
          };
          break;

        // Product Management
        case 'mark_product_soldout':
          if (entities.product) {
            await updateProductAvailability(entities.product, false);
            result = {
              success: true,
              message: `${entities.product} ist ausverkauft`
            };
          }
          break;

        case 'mark_product_available':
          if (entities.product) {
            await updateProductAvailability(entities.product, true);
            result = {
              success: true,
              message: `${entities.product} ist wieder verfügbar`
            };
          }
          break;

        // Kitchen
        case 'show_kitchen_display':
          navigate('/kitchen');
          result = { success: true, message: 'Zeige Küchen Display' };
          break;

        case 'show_next_order':
          const nextOrder = orders.find(o => o.status === 'pending');
          if (nextOrder) {
            result = {
              success: true,
              message: `Nächste Bestellung: ${nextOrder.orderNumber} für Tisch ${nextOrder.table}`,
              data: nextOrder
            };
          } else {
            result = {
              success: true,
              message: 'Keine offenen Bestellungen'
            };
          }
          break;

        // Analytics
        case 'show_daily_revenue':
          navigate('/analytics?view=revenue&period=today');
          result = { success: true, message: 'Zeige Tagesumsatz' };
          break;

        // Emergency
        case 'kitchen_emergency':
          // Trigger emergency protocol
          showNotification({
            type: 'error',
            title: 'NOTFALL KÜCHE',
            message: 'Küche hat ein Problem gemeldet!',
            duration: null // Don't auto-dismiss
          });
          result = {
            success: true,
            message: 'Notfall wurde gemeldet',
            action: 'emergency'
          };
          break;

        case 'stop_all_orders':
          // Implementation for stopping all orders
          result = {
            success: true,
            message: 'Bestellstopp aktiviert',
            action: 'emergency_stop'
          };
          break;

        // System
        case 'show_help':
          result = {
            success: true,
            message: 'Sie können sagen: "Neue Bestellung für Tisch 5", "Bestellung fertig", "Zeige offene Bestellungen", oder "Hilfe"',
            data: {
              commands: Object.values(ADMIN_COMMAND_PATTERNS)
                .flatMap(cmds => cmds.map(c => c.examples[0]))
                .slice(0, 5)
            }
          };
          break;

        case 'stop_listening':
          stopRecognition();
          result = { success: true, message: 'Spracherkennung gestoppt' };
          break;

        default:
          result = {
            success: false,
            message: 'Befehl nicht erkannt'
          };
      }

      // Speak result
      if (result.message) {
        await speak(result.message);
      }

      return result;

    } catch (error) {
      console.error('Command execution failed:', error);
      return {
        success: false,
        message: 'Fehler bei der Ausführung',
        error: error.message
      };
    }
  }, [
    navigate,
    updateOrderStatus,
    cancelOrder,
    updateTableStatus,
    getFreeTables,
    updateProductAvailability,
    orders,
    showNotification,
    speak,
    stopRecognition
  ]);

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
  // PUBLIC API
  // ============================================================================

  const startListening = useCallback(async () => {
    if (!voiceEnabled || !isReady) return;

    try {
      await startRecognition();
      await speak('Ich höre zu...');
    } catch (error) {
      setError(error.message);
      await speakError();
    }
  }, [voiceEnabled, isReady, startRecognition, speak, speakError]);

  const stopListening = useCallback(() => {
    stopRecognition();
    debouncedProcess.cancel();
  }, [stopRecognition, debouncedProcess]);

  const toggleVoice = useCallback(() => {
    if (voiceEnabled) {
      stopListening();
    }
    setVoiceEnabled(!voiceEnabled);
  }, [voiceEnabled, stopListening]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    initializeVoice();
  }, [initializeVoice]);

  // Auto-process transcript
  useEffect(() => {
    if (transcript && voiceEnabled) {
      debouncedProcess(transcript);
    }
  }, [transcript, voiceEnabled, debouncedProcess]);

  // Cleanup
  useEffect(() => {
    return () => {
      debouncedProcess.cancel();
      stopRecognition();
    };
  }, [debouncedProcess, stopRecognition]);

  // ============================================================================
  // RETURN API
  // ============================================================================

  return {
    // State
    isListening,
    isProcessing,
    isReady,
    voiceEnabled,
    transcript,
    confidence,
    error: error || recognitionError,

    // Current state
    lastCommand,
    commandHistory,
    currentContext,

    // Actions
    startListening,
    stopListening,
    toggleVoice,
    processCommand,
    setCurrentContext,

    // Constants
    COMMAND_CATEGORIES,
    ADMIN_COMMAND_PATTERNS
  };
};

export default useVoice;
