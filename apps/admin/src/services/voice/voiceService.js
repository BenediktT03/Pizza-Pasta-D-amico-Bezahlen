/**
 * EATECH Admin - Voice Service
 * Version: 3.0.0
 * Description: Main voice service orchestrator for Admin Dashboard
 * Author: EATECH Development Team
 * Created: 2025-01-08
 *
 * Simplified version for admin use - focuses on direct commands and efficiency
 */

import { EventEmitter } from 'events';

// Service imports
import SpeechRecognitionService from './SpeechRecognitionService';
import TextToSpeechService from './TextToSpeechService';
import VoiceCommandProcessor from './VoiceCommandProcessor';

// Constants
export const SUPPORTED_LANGUAGES = {
  'de-CH': { name: 'Schweizerdeutsch', flag: '🇨🇭' },
  'de-DE': { name: 'Deutsch', flag: '🇩🇪' },
  'fr-CH': { name: 'Français (Suisse)', flag: '🇨🇭' },
  'it-CH': { name: 'Italiano (Svizzera)', flag: '🇨🇭' },
  'en-US': { name: 'English', flag: '🇺🇸' }
};

export const VOICE_STATES = {
  IDLE: 'idle',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  SPEAKING: 'speaking',
  ERROR: 'error',
  UNAVAILABLE: 'unavailable'
};

export const ADMIN_VOICE_COMMANDS = {
  // Order Management
  NEW_ORDER: ['neue bestellung', 'new order', 'nouvelle commande'],
  ORDER_READY: ['bestellung fertig', 'order ready', 'commande prête'],
  CANCEL_ORDER: ['bestellung stornieren', 'cancel order', 'annuler commande'],

  // Table Management
  TABLE_OCCUPIED: ['tisch besetzt', 'table occupied', 'table occupée'],
  TABLE_FREE: ['tisch frei', 'table free', 'table libre'],

  // Product Management
  PRODUCT_SOLDOUT: ['ausverkauft', 'sold out', 'épuisé'],
  PRODUCT_AVAILABLE: ['wieder verfügbar', 'available again', 'disponible'],

  // Navigation
  GO_TO_DASHBOARD: ['dashboard', 'übersicht', 'overview'],
  GO_TO_ORDERS: ['bestellungen', 'orders', 'commandes'],
  GO_TO_KITCHEN: ['küche', 'kitchen', 'cuisine'],

  // Emergency
  EMERGENCY: ['notfall', 'emergency', 'urgence'],
  STOP_ALL: ['alles stoppen', 'stop all', 'tout arrêter'],

  // System
  HELP: ['hilfe', 'help', 'aide'],
  CANCEL: ['abbrechen', 'cancel', 'annuler']
};

class VoiceService extends EventEmitter {
  constructor(options = {}) {
    super();

    this.options = {
      language: 'de-CH',
      continuous: false,
      interimResults: true,
      confidenceThreshold: 0.7,
      autoRestart: true,
      feedbackSounds: true,
      ...options
    };

    // State
    this.state = VOICE_STATES.IDLE;
    this.isInitialized = false;
    this.currentLanguage = this.options.language;
    this.lastTranscript = '';
    this.lastCommand = null;
    this.sessionActive = false;

    // Services
    this.speechRecognition = null;
    this.textToSpeech = null;
    this.commandProcessor = null;

    // Initialize immediately
    this.initialize();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  async initialize() {
    try {
      // Check browser support
      if (!this.checkBrowserSupport()) {
        this.state = VOICE_STATES.UNAVAILABLE;
        this.emit('error', new Error('Voice features not supported in this browser'));
        return false;
      }

      // Initialize services
      await this.initializeServices();

      this.isInitialized = true;
      this.state = VOICE_STATES.IDLE;
      this.emit('initialized');

      return true;

    } catch (error) {
      console.error('Voice service initialization failed:', error);
      this.state = VOICE_STATES.ERROR;
      this.emit('error', error);
      return false;
    }
  }

  checkBrowserSupport() {
    return !!(
      window.SpeechRecognition ||
      window.webkitSpeechRecognition
    ) && 'speechSynthesis' in window;
  }

  async initializeServices() {
    // Initialize speech recognition
    this.speechRecognition = new SpeechRecognitionService({
      language: this.currentLanguage,
      continuous: this.options.continuous,
      interimResults: this.options.interimResults
    });

    // Initialize text-to-speech
    this.textToSpeech = new TextToSpeechService({
      language: this.currentLanguage,
      rate: 1.1, // Slightly faster for efficiency
      pitch: 1.0,
      volume: 0.9
    });

    // Initialize command processor
    this.commandProcessor = new VoiceCommandProcessor({
      commands: ADMIN_VOICE_COMMANDS,
      language: this.currentLanguage,
      confidenceThreshold: this.options.confidenceThreshold
    });

    // Setup event handlers
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Speech recognition events
    this.speechRecognition.on('start', () => {
      this.state = VOICE_STATES.LISTENING;
      this.emit('listening');
      if (this.options.feedbackSounds) {
        this.playSound('start');
      }
    });

    this.speechRecognition.on('result', async (data) => {
      await this.handleSpeechResult(data);
    });

    this.speechRecognition.on('error', (error) => {
      this.handleError(error);
    });

    this.speechRecognition.on('end', () => {
      if (this.state === VOICE_STATES.LISTENING && this.options.autoRestart && this.sessionActive) {
        // Auto-restart if session is still active
        setTimeout(() => this.startListening(), 100);
      } else {
        this.state = VOICE_STATES.IDLE;
        this.emit('stopped');
      }
    });

    // Text-to-speech events
    this.textToSpeech.on('start', () => {
      this.state = VOICE_STATES.SPEAKING;
      this.emit('speaking');
    });

    this.textToSpeech.on('end', () => {
      if (!this.sessionActive) {
        this.state = VOICE_STATES.IDLE;
      } else if (this.state === VOICE_STATES.SPEAKING) {
        this.state = VOICE_STATES.LISTENING;
        // Resume listening after speaking
        if (this.options.autoRestart) {
          this.startListening();
        }
      }
    });
  }

  // ============================================================================
  // SPEECH RECOGNITION
  // ============================================================================

  async startListening() {
    if (!this.isInitialized || this.state === VOICE_STATES.LISTENING) {
      return false;
    }

    try {
      this.sessionActive = true;
      await this.speechRecognition.start();
      return true;
    } catch (error) {
      this.handleError(error);
      return false;
    }
  }

  stopListening() {
    this.sessionActive = false;
    if (this.speechRecognition) {
      this.speechRecognition.stop();
    }
    this.state = VOICE_STATES.IDLE;
  }

  async handleSpeechResult(data) {
    const { transcript, confidence, isFinal } = data;

    if (!isFinal) {
      // Emit interim results for UI feedback
      this.emit('interim', { transcript, confidence });
      return;
    }

    this.state = VOICE_STATES.PROCESSING;
    this.lastTranscript = transcript;

    // Check confidence
    if (confidence < this.options.confidenceThreshold) {
      await this.handleLowConfidence(transcript, confidence);
      return;
    }

    // Process command
    try {
      const command = await this.commandProcessor.process(transcript);

      if (command) {
        this.lastCommand = command;
        await this.executeCommand(command);
      } else {
        await this.handleUnrecognizedCommand(transcript);
      }
    } catch (error) {
      console.error('Command processing failed:', error);
      await this.speak('Entschuldigung, es gab einen Fehler.');
    }
  }

  async handleLowConfidence(transcript, confidence) {
    this.emit('low_confidence', { transcript, confidence });
    await this.speak('Ich bin mir nicht sicher. Können Sie das wiederholen?');
  }

  async handleUnrecognizedCommand(transcript) {
    this.emit('unrecognized', { transcript });
    await this.speak('Ich habe den Befehl nicht verstanden. Sagen Sie "Hilfe" für verfügbare Befehle.');
  }

  // ============================================================================
  // COMMAND EXECUTION
  // ============================================================================

  async executeCommand(command) {
    this.emit('command', command);

    try {
      let message = '';

      switch (command.action) {
        // Order commands
        case 'NEW_ORDER':
          this.emit('action', { type: 'navigate', target: '/orders/new', params: command.params });
          message = command.params.table ?
            `Neue Bestellung für Tisch ${command.params.table}` :
            'Neue Bestellung wird erstellt';
          break;

        case 'ORDER_READY':
          if (command.params.orderId) {
            this.emit('action', { type: 'order_ready', orderId: command.params.orderId });
            message = `Bestellung ${command.params.orderId} ist fertig`;
          }
          break;

        case 'CANCEL_ORDER':
          if (command.params.orderId) {
            this.emit('action', { type: 'cancel_order', orderId: command.params.orderId });
            message = `Bestellung ${command.params.orderId} wird storniert`;
          }
          break;

        // Table commands
        case 'TABLE_OCCUPIED':
          if (command.params.table) {
            this.emit('action', { type: 'table_status', table: command.params.table, status: 'occupied' });
            message = `Tisch ${command.params.table} ist besetzt`;
          }
          break;

        case 'TABLE_FREE':
          if (command.params.table) {
            this.emit('action', { type: 'table_status', table: command.params.table, status: 'free' });
            message = `Tisch ${command.params.table} ist frei`;
          }
          break;

        // Product commands
        case 'PRODUCT_SOLDOUT':
          if (command.params.product) {
            this.emit('action', { type: 'product_availability', product: command.params.product, available: false });
            message = `${command.params.product} ist ausverkauft`;
          }
          break;

        case 'PRODUCT_AVAILABLE':
          if (command.params.product) {
            this.emit('action', { type: 'product_availability', product: command.params.product, available: true });
            message = `${command.params.product} ist wieder verfügbar`;
          }
          break;

        // Navigation
        case 'GO_TO_DASHBOARD':
          this.emit('action', { type: 'navigate', target: '/dashboard' });
          message = 'Gehe zum Dashboard';
          break;

        case 'GO_TO_ORDERS':
          this.emit('action', { type: 'navigate', target: '/orders' });
          message = 'Zeige Bestellungen';
          break;

        case 'GO_TO_KITCHEN':
          this.emit('action', { type: 'navigate', target: '/kitchen' });
          message = 'Zeige Küchen-Display';
          break;

        // Emergency
        case 'EMERGENCY':
          this.emit('action', { type: 'emergency', level: 'high' });
          message = 'NOTFALL AKTIVIERT!';
          if (this.options.feedbackSounds) {
            this.playSound('alert');
          }
          break;

        case 'STOP_ALL':
          this.emit('action', { type: 'emergency_stop' });
          message = 'Alle Operationen werden gestoppt';
          break;

        // System
        case 'HELP':
          message = await this.getHelpMessage();
          break;

        case 'CANCEL':
          this.stopListening();
          message = 'Sprachsteuerung beendet';
          break;

        default:
          message = 'Befehl nicht implementiert';
      }

      if (message) {
        await this.speak(message);
      }

      return { success: true, command, message };

    } catch (error) {
      console.error('Command execution failed:', error);
      return { success: false, error: error.message };
    }
  }

  async getHelpMessage() {
    const examples = [
      'Neue Bestellung für Tisch 5',
      'Bestellung ABC123 ist fertig',
      'Tisch 3 ist besetzt',
      'Pizza ausverkauft',
      'Zeige Bestellungen',
      'Notfall'
    ];

    return `Verfügbare Befehle: ${examples.join(', ')}`;
  }

  // ============================================================================
  // TEXT-TO-SPEECH
  // ============================================================================

  async speak(text, options = {}) {
    if (!this.textToSpeech || !text) return;

    try {
      // Pause recognition while speaking
      if (this.state === VOICE_STATES.LISTENING) {
        this.speechRecognition.pause();
      }

      await this.textToSpeech.speak(text, {
        language: options.language || this.currentLanguage,
        ...options
      });

    } catch (error) {
      console.error('Text-to-speech failed:', error);
    }
  }

  stopSpeaking() {
    if (this.textToSpeech) {
      this.textToSpeech.stop();
    }
  }

  // ============================================================================
  // LANGUAGE MANAGEMENT
  // ============================================================================

  async setLanguage(language) {
    if (!SUPPORTED_LANGUAGES[language]) {
      throw new Error(`Unsupported language: ${language}`);
    }

    this.currentLanguage = language;

    // Update all services
    if (this.speechRecognition) {
      this.speechRecognition.setLanguage(language);
    }

    if (this.textToSpeech) {
      await this.textToSpeech.setLanguage(language);
    }

    if (this.commandProcessor) {
      this.commandProcessor.setLanguage(language);
    }

    this.emit('language_changed', language);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  playSound(type) {
    // Simple audio feedback
    const audio = new Audio();
    switch (type) {
      case 'start':
        audio.src = '/sounds/voice-start.mp3';
        break;
      case 'stop':
        audio.src = '/sounds/voice-stop.mp3';
        break;
      case 'success':
        audio.src = '/sounds/success.mp3';
        break;
      case 'alert':
        audio.src = '/sounds/alert.mp3';
        break;
    }
    audio.play().catch(() => {}); // Ignore errors
  }

  handleError(error) {
    console.error('Voice service error:', error);
    this.state = VOICE_STATES.ERROR;

    let userMessage = 'Es gab einen Fehler mit der Spracherkennung.';

    if (error.code === 'not-allowed') {
      userMessage = 'Bitte erlauben Sie den Mikrofonzugriff.';
    } else if (error.code === 'no-speech') {
      userMessage = 'Keine Sprache erkannt.';
    } else if (error.code === 'network') {
      userMessage = 'Netzwerkfehler. Bitte überprüfen Sie Ihre Verbindung.';
    }

    this.emit('error', { error, message: userMessage });

    if (this.options.feedbackSounds) {
      this.playSound('error');
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  isAvailable() {
    return this.isInitialized && this.state !== VOICE_STATES.UNAVAILABLE;
  }

  isListening() {
    return this.state === VOICE_STATES.LISTENING;
  }

  isSpeaking() {
    return this.state === VOICE_STATES.SPEAKING;
  }

  getState() {
    return this.state;
  }

  getLastTranscript() {
    return this.lastTranscript;
  }

  getLastCommand() {
    return this.lastCommand;
  }

  getSupportedLanguages() {
    return SUPPORTED_LANGUAGES;
  }

  async toggleListening() {
    if (this.isListening()) {
      this.stopListening();
      return false;
    } else {
      return await this.startListening();
    }
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  destroy() {
    this.stopListening();
    this.stopSpeaking();

    if (this.speechRecognition) {
      this.speechRecognition.destroy();
    }

    if (this.textToSpeech) {
      this.textToSpeech.destroy();
    }

    if (this.commandProcessor) {
      this.commandProcessor.destroy();
    }

    this.removeAllListeners();
  }
}

// Singleton instance
let instance = null;

export const getVoiceService = (options = {}) => {
  if (!instance) {
    instance = new VoiceService(options);
  }
  return instance;
};

export default VoiceService;
