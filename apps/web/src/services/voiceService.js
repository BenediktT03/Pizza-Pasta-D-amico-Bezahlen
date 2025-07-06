/**
 * EATECH - Voice Service
 * Version: 4.1.0
 * Description: Advanced Voice Recognition Service mit Lazy Loading & AI Integration
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/web/src/services/voiceService.js
 * 
 * Features: Speech recognition, natural language processing, voice commands, multilingual
 */

import { EventEmitter } from 'events';

// Lazy loaded speech services
const speechRecognition = () => import('../lib/speechRecognition');
const speechSynthesis = () => import('../lib/speechSynthesis');
const naturalLanguageProcessor = () => import('../lib/naturalLanguageProcessor');
const voiceCommands = () => import('../lib/voiceCommands');

// Lazy loaded AI services
const aiService = () => import('./aiService');
const translationService = () => import('./translationService');
const contextService = () => import('./contextService');

// Lazy loaded utilities
const audioUtils = () => import('../utils/audioUtils');
const languageUtils = () => import('../utils/languageUtils');
const validationUtils = () => import('../utils/validationUtils');
const formattersUtils = () => import('../utils/formattersUtils');

// Supported languages
export const SUPPORTED_LANGUAGES = {
  'de-CH': { name: 'Schweizerdeutsch', flag: '🇨🇭', confidence: 0.9 },
  'de-DE': { name: 'Deutsch', flag: '🇩🇪', confidence: 0.95 },
  'fr-CH': { name: 'Français (Suisse)', flag: '🇨🇭', confidence: 0.9 },
  'fr-FR': { name: 'Français', flag: '🇫🇷', confidence: 0.95 },
  'it-CH': { name: 'Italiano (Svizzera)', flag: '🇨🇭', confidence: 0.85 },
  'it-IT': { name: 'Italiano', flag: '🇮🇹', confidence: 0.9 },
  'en-US': { name: 'English (US)', flag: '🇺🇸', confidence: 0.98 },
  'en-GB': { name: 'English (UK)', flag: '🇬🇧', confidence: 0.95 }
};

// Voice commands
export const VOICE_COMMANDS = {
  // Navigation
  SHOW_MENU: ['menu zeigen', 'show menu', 'montrer le menu', 'mostra menu'],
  SHOW_CART: ['warenkorb', 'show cart', 'panier', 'carrello'],
  CHECKOUT: ['zur kasse', 'checkout', 'passer commande', 'checkout'],
  
  // Ordering
  ADD_TO_CART: ['in warenkorb', 'add to cart', 'ajouter au panier', 'aggiungi al carrello'],
  REMOVE_FROM_CART: ['entfernen', 'remove', 'supprimer', 'rimuovi'],
  ORDER_ITEM: ['bestellen', 'order', 'commander', 'ordinare'],
  
  // Information
  SHOW_DETAILS: ['details', 'more info', 'plus d\'infos', 'maggiori dettagli'],
  SHOW_INGREDIENTS: ['zutaten', 'ingredients', 'ingrédients', 'ingredienti'],
  SHOW_ALLERGENS: ['allergene', 'allergens', 'allergènes', 'allergeni'],
  
  // Assistance
  HELP: ['hilfe', 'help', 'aide', 'aiuto'],
  REPEAT: ['wiederholen', 'repeat', 'répéter', 'ripeti'],
  CANCEL: ['abbrechen', 'cancel', 'annuler', 'annulla']
};

// Recognition states
export const RECOGNITION_STATES = {
  IDLE: 'idle',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  ERROR: 'error',
  UNAVAILABLE: 'unavailable'
};

class VoiceService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      language: 'de-CH',
      continuous: false,
      interimResults: true,
      maxAlternatives: 3,
      confidenceThreshold: 0.7,
      enableNLP: true,
      enableAI: true,
      enableTranslation: true,
      silenceTimeout: 3000,
      noSpeechTimeout: 5000,
      ...options
    };
    
    // State
    this.isSupported = false;
    this.isInitialized = false;
    this.state = RECOGNITION_STATES.IDLE;
    this.recognition = null;
    this.synthesis = null;
    this.currentLanguage = this.options.language;
    this.lastTranscript = '';
    this.confidenceScore = 0;
    this.activeSession = null;
    this.commandHistory = [];
    
    // Lazy loaded services
    this.speechRecognition = null;
    this.speechSynthesis = null;
    this.nlpProcessor = null;
    this.voiceCommands = null;
    this.aiService = null;
    this.translationService = null;
    this.contextService = null;
    this.audioUtils = null;
    this.languageUtils = null;
    this.validationUtils = null;
    this.formattersUtils = null;
    
    this.initialize();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  async initialize() {
    try {
      // Check browser support
      this.checkSupport();
      
      if (!this.isSupported) {
        this.state = RECOGNITION_STATES.UNAVAILABLE;
        this.emit('error', new Error('Speech recognition not supported'));
        return;
      }
      
      await this.initializeLazyServices();
      await this.setupSpeechRecognition();
      await this.setupSpeechSynthesis();
      await this.loadLanguageModels();
      
      this.isInitialized = true;
      this.state = RECOGNITION_STATES.IDLE;
      this.emit('initialized');
      
    } catch (error) {
      console.error('Voice service initialization failed:', error);
      this.state = RECOGNITION_STATES.ERROR;
      this.emit('error', error);
    }
  }

  checkSupport() {
    this.isSupported = !!(
      window.SpeechRecognition || 
      window.webkitSpeechRecognition ||
      window.mozSpeechRecognition ||
      window.msSpeechRecognition
    );
  }

  async initializeLazyServices() {
    try {
      // Initialize utilities
      this.audioUtils = await audioUtils();
      this.languageUtils = await languageUtils();
      this.validationUtils = await validationUtils();
      this.formattersUtils = await formattersUtils();
      
      // Initialize speech services
      const SpeechRecognition = await speechRecognition();
      this.speechRecognition = new SpeechRecognition.default();
      
      const SpeechSynthesis = await speechSynthesis();
      this.speechSynthesis = new SpeechSynthesis.default();
      
      // Initialize NLP if enabled
      if (this.options.enableNLP) {
        const NLPProcessor = await naturalLanguageProcessor();
        this.nlpProcessor = new NLPProcessor.default();
      }
      
      // Initialize voice commands
      const VoiceCommands = await voiceCommands();
      this.voiceCommands = new VoiceCommands.default(VOICE_COMMANDS);
      
      // Initialize AI service if enabled
      if (this.options.enableAI) {
        const AIService = await aiService();
        this.aiService = new AIService.default();
      }
      
      // Initialize translation service if enabled
      if (this.options.enableTranslation) {
        const TranslationService = await translationService();
        this.translationService = new TranslationService.default();
      }
      
      // Initialize context service
      const ContextService = await contextService();
      this.contextService = new ContextService.default();
      
    } catch (error) {
      console.error('Failed to initialize voice services:', error);
      throw error;
    }
  }

  async setupSpeechRecognition() {
    if (!this.speechRecognition) return;
    
    const SpeechRecognition = 
      window.SpeechRecognition || 
      window.webkitSpeechRecognition ||
      window.mozSpeechRecognition ||
      window.msSpeechRecognition;
    
    this.recognition = new SpeechRecognition();
    
    // Configure recognition
    this.recognition.continuous = this.options.continuous;
    this.recognition.interimResults = this.options.interimResults;
    this.recognition.maxAlternatives = this.options.maxAlternatives;
    this.recognition.lang = this.currentLanguage;
    
    // Event handlers
    this.recognition.onstart = () => {
      this.state = RECOGNITION_STATES.LISTENING;
      this.emit('listening_started');
    };
    
    this.recognition.onresult = (event) => {
      this.handleRecognitionResult(event);
    };
    
    this.recognition.onerror = (event) => {
      this.handleRecognitionError(event);
    };
    
    this.recognition.onend = () => {
      this.state = RECOGNITION_STATES.IDLE;
      this.emit('listening_stopped');
    };
    
    this.recognition.onnomatch = () => {
      this.emit('no_match');
    };
    
    this.recognition.onspeechend = () => {
      this.recognition.stop();
    };
  }

  async setupSpeechSynthesis() {
    if (!this.speechSynthesis || !window.speechSynthesis) return;
    
    this.synthesis = window.speechSynthesis;
    
    // Load available voices
    const loadVoices = () => {
      this.availableVoices = this.synthesis.getVoices();
      this.emit('voices_loaded', this.availableVoices);
    };
    
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = loadVoices;
    } else {
      loadVoices();
    }
  }

  async loadLanguageModels() {
    try {
      if (this.nlpProcessor) {
        await this.nlpProcessor.loadLanguageModel(this.currentLanguage);
      }
      
      if (this.voiceCommands) {
        await this.voiceCommands.loadCommands(this.currentLanguage);
      }
      
    } catch (error) {
      console.error('Failed to load language models:', error);
    }
  }

  // ============================================================================
  // SPEECH RECOGNITION
  // ============================================================================
  async startListening(options = {}) {
    try {
      if (!this.isInitialized || this.state === RECOGNITION_STATES.LISTENING) {
        return;
      }
      
      // Update language if specified
      if (options.language && options.language !== this.currentLanguage) {
        await this.setLanguage(options.language);
      }
      
      // Configure recognition for this session
      if (options.continuous !== undefined) {
        this.recognition.continuous = options.continuous;
      }
      
      // Start recognition
      this.recognition.start();
      
      // Set timeout for no speech
      if (this.options.noSpeechTimeout > 0) {
        this.noSpeechTimer = setTimeout(() => {
          this.stopListening();
          this.emit('no_speech_timeout');
        }, this.options.noSpeechTimeout);
      }
      
    } catch (error) {
      console.error('Failed to start listening:', error);
      this.state = RECOGNITION_STATES.ERROR;
      this.emit('error', error);
    }
  }

  stopListening() {
    try {
      if (this.recognition && this.state === RECOGNITION_STATES.LISTENING) {
        this.recognition.stop();
      }
      
      if (this.noSpeechTimer) {
        clearTimeout(this.noSpeechTimer);
        this.noSpeechTimer = null;
      }
      
    } catch (error) {
      console.error('Failed to stop listening:', error);
    }
  }

  async handleRecognitionResult(event) {
    try {
      this.state = RECOGNITION_STATES.PROCESSING;
      
      const results = Array.from(event.results);
      const lastResult = results[results.length - 1];
      
      if (lastResult.isFinal) {
        const transcript = lastResult[0].transcript.trim();
        const confidence = lastResult[0].confidence;
        
        this.lastTranscript = transcript;
        this.confidenceScore = confidence;
        
        // Clear no speech timer
        if (this.noSpeechTimer) {
          clearTimeout(this.noSpeechTimer);
          this.noSpeechTimer = null;
        }
        
        // Process the transcript
        await this.processTranscript(transcript, confidence);
        
      } else if (this.options.interimResults) {
        // Handle interim results
        const interimTranscript = lastResult[0].transcript;
        this.emit('interim_result', {
          transcript: interimTranscript,
          confidence: lastResult[0].confidence
        });
      }
      
    } catch (error) {
      console.error('Failed to handle recognition result:', error);
      this.emit('error', error);
    }
  }

  handleRecognitionError(event) {
    this.state = RECOGNITION_STATES.ERROR;
    
    const errorMap = {
      'no-speech': 'No speech detected',
      'audio-capture': 'Audio capture failed',
      'not-allowed': 'Permission denied',
      'network': 'Network error',
      'bad-grammar': 'Grammar error',
      'aborted': 'Recognition aborted'
    };
    
    const errorMessage = errorMap[event.error] || `Recognition error: ${event.error}`;
    this.emit('error', new Error(errorMessage));
  }

  // ============================================================================
  // TRANSCRIPT PROCESSING
  // ============================================================================
  async processTranscript(transcript, confidence) {
    try {
      // Check confidence threshold
      if (confidence < this.options.confidenceThreshold) {
        this.emit('low_confidence', { transcript, confidence });
        await this.requestClarification(transcript);
        return;
      }
      
      // Normalize transcript
      const normalizedTranscript = await this.normalizeTranscript(transcript);
      
      // Detect intent and entities
      const analysis = await this.analyzeTranscript(normalizedTranscript);
      
      // Execute command or process order
      const result = await this.executeCommand(analysis);
      
      // Store in history
      this.commandHistory.push({
        transcript: normalizedTranscript,
        confidence,
        analysis,
        result,
        timestamp: new Date().toISOString()
      });
      
      this.emit('transcript_processed', {
        transcript: normalizedTranscript,
        confidence,
        analysis,
        result
      });
      
    } catch (error) {
      console.error('Failed to process transcript:', error);
      this.emit('error', error);
    }
  }

  async normalizeTranscript(transcript) {
    if (!this.languageUtils) return transcript;
    
    return this.languageUtils.normalizeText(transcript, this.currentLanguage);
  }

  async analyzeTranscript(transcript) {
    const analysis = {
      transcript,
      intent: null,
      entities: [],
      command: null,
      confidence: this.confidenceScore,
      language: this.currentLanguage
    };
    
    try {
      // Check for voice commands first
      if (this.voiceCommands) {
        const command = await this.voiceCommands.detectCommand(transcript, this.currentLanguage);
        if (command) {
          analysis.command = command;
          analysis.intent = command.intent;
          return analysis;
        }
      }
      
      // Use NLP for more complex analysis
      if (this.nlpProcessor) {
        const nlpResult = await this.nlpProcessor.analyze(transcript, this.currentLanguage);
        analysis.intent = nlpResult.intent;
        analysis.entities = nlpResult.entities;
      }
      
      // Use AI for advanced understanding if enabled
      if (this.options.enableAI && this.aiService) {
        const aiAnalysis = await this.aiService.analyzeOrderIntent(transcript, {
          language: this.currentLanguage,
          context: this.contextService?.getCurrentContext()
        });
        
        analysis.aiSuggestions = aiAnalysis;
        if (!analysis.intent && aiAnalysis.intent) {
          analysis.intent = aiAnalysis.intent;
          analysis.entities = [...analysis.entities, ...aiAnalysis.entities];
        }
      }
      
      return analysis;
      
    } catch (error) {
      console.error('Failed to analyze transcript:', error);
      return analysis;
    }
  }

  async executeCommand(analysis) {
    try {
      const { intent, entities, command, aiSuggestions } = analysis;
      
      // Handle specific voice commands
      if (command) {
        return await this.handleVoiceCommand(command);
      }
      
      // Handle ordering intents
      if (intent === 'order' || intent === 'add_to_cart') {
        return await this.handleOrderIntent(entities, aiSuggestions);
      }
      
      // Handle navigation intents
      if (intent === 'navigate') {
        return await this.handleNavigationIntent(entities);
      }
      
      // Handle information requests
      if (intent === 'information') {
        return await this.handleInformationIntent(entities);
      }
      
      // Handle help requests
      if (intent === 'help') {
        return await this.handleHelpIntent();
      }
      
      // No recognized intent
      return await this.handleUnknownIntent(analysis);
      
    } catch (error) {
      console.error('Failed to execute command:', error);
      throw error;
    }
  }

  async handleVoiceCommand(command) {
    const result = {
      type: 'command',
      action: command.action,
      success: false,
      message: ''
    };
    
    try {
      switch (command.action) {
        case 'SHOW_MENU':
          this.emit('navigate', '/menu');
          result.success = true;
          result.message = 'Menu wird angezeigt';
          break;
          
        case 'SHOW_CART':
          this.emit('show_cart');
          result.success = true;
          result.message = 'Warenkorb wird angezeigt';
          break;
          
        case 'CHECKOUT':
          this.emit('navigate', '/checkout');
          result.success = true;
          result.message = 'Zur Kasse';
          break;
          
        case 'HELP':
          await this.speak('Wie kann ich Ihnen helfen? Sie können Produkte bestellen, den Warenkorb anzeigen oder zur Kasse gehen.');
          result.success = true;
          result.message = 'Hilfe angezeigt';
          break;
          
        case 'CANCEL':
          this.stopListening();
          result.success = true;
          result.message = 'Sprachbefehl abgebrochen';
          break;
          
        default:
          result.message = 'Unbekannter Befehl';
      }
      
      return result;
      
    } catch (error) {
      console.error('Failed to handle voice command:', error);
      result.message = 'Fehler beim Ausführen des Befehls';
      return result;
    }
  }

  async handleOrderIntent(entities, aiSuggestions) {
    const result = {
      type: 'order',
      items: [],
      success: false,
      message: ''
    };
    
    try {
      // Extract items from entities
      const productEntities = entities.filter(e => e.type === 'PRODUCT');
      const quantityEntities = entities.filter(e => e.type === 'QUANTITY');
      const modifierEntities = entities.filter(e => e.type === 'MODIFIER');
      
      // Use AI suggestions if no entities found
      if (productEntities.length === 0 && aiSuggestions?.items) {
        result.items = aiSuggestions.items;
      } else {
        // Build order items from entities
        for (const productEntity of productEntities) {
          const item = {
            name: productEntity.value,
            quantity: 1,
            modifiers: []
          };
          
          // Find associated quantity
          const quantity = quantityEntities.find(q => 
            Math.abs(q.position - productEntity.position) < 5
          );
          if (quantity) {
            item.quantity = parseInt(quantity.value) || 1;
          }
          
          // Find associated modifiers
          const modifiers = modifierEntities.filter(m =>
            Math.abs(m.position - productEntity.position) < 10
          );
          item.modifiers = modifiers.map(m => m.value);
          
          result.items.push(item);
        }
      }
      
      if (result.items.length > 0) {
        this.emit('order_items', result.items);
        result.success = true;
        result.message = `${result.items.length} Artikel zum Warenkorb hinzugefügt`;
        
        // Provide voice confirmation
        await this.speak(result.message);
      } else {
        result.message = 'Keine Produkte erkannt. Bitte wiederholen Sie Ihre Bestellung.';
        await this.speak(result.message);
      }
      
      return result;
      
    } catch (error) {
      console.error('Failed to handle order intent:', error);
      result.message = 'Fehler bei der Bestellverarbeitung';
      return result;
    }
  }

  async handleNavigationIntent(entities) {
    const result = {
      type: 'navigation',
      target: null,
      success: false,
      message: ''
    };
    
    try {
      const targetEntity = entities.find(e => e.type === 'PAGE' || e.type === 'SECTION');
      
      if (targetEntity) {
        const target = targetEntity.value.toLowerCase();
        let route = null;
        
        switch (target) {
          case 'menu':
          case 'speisekarte':
            route = '/menu';
            break;
          case 'warenkorb':
          case 'cart':
            route = '/cart';
            break;
          case 'kasse':
          case 'checkout':
            route = '/checkout';
            break;
          case 'profil':
          case 'profile':
            route = '/profile';
            break;
        }
        
        if (route) {
          this.emit('navigate', route);
          result.target = route;
          result.success = true;
          result.message = `Navigation zu ${target}`;
        }
      }
      
      if (!result.success) {
        result.message = 'Navigationsziel nicht erkannt';
      }
      
      return result;
      
    } catch (error) {
      console.error('Failed to handle navigation intent:', error);
      result.message = 'Navigationsfehler';
      return result;
    }
  }

  async handleInformationIntent(entities) {
    const result = {
      type: 'information',
      query: null,
      success: false,
      message: ''
    };
    
    try {
      // This would typically query a knowledge base or product catalog
      const infoType = entities.find(e => e.type === 'INFO_TYPE');
      const product = entities.find(e => e.type === 'PRODUCT');
      
      if (infoType && product) {
        // Simulate information retrieval
        result.query = `${infoType.value} for ${product.value}`;
        result.success = true;
        result.message = `Informationen zu ${product.value} werden angezeigt`;
        
        this.emit('show_info', {
          type: infoType.value,
          product: product.value
        });
      } else {
        result.message = 'Informationsanfrage nicht verstanden';
      }
      
      return result;
      
    } catch (error) {
      console.error('Failed to handle information intent:', error);
      result.message = 'Informationsfehler';
      return result;
    }
  }

  async handleHelpIntent() {
    const helpMessage = 'Sie können folgende Sprachbefehle verwenden: "Menü zeigen", "Warenkorb", "Zur Kasse", oder bestellen Sie direkt mit "Ich möchte einen Burger".';
    
    await this.speak(helpMessage);
    
    return {
      type: 'help',
      success: true,
      message: helpMessage
    };
  }

  async handleUnknownIntent(analysis) {
    let message = 'Entschuldigung, ich habe Sie nicht verstanden. ';
    
    if (analysis.confidence < 0.5) {
      message += 'Bitte sprechen Sie deutlicher.';
    } else {
      message += 'Können Sie das anders formulieren?';
    }
    
    await this.speak(message);
    
    return {
      type: 'unknown',
      success: false,
      message: message,
      suggestions: await this.getSuggestions()
    };
  }

  async requestClarification(transcript) {
    const message = `Ich bin mir nicht sicher, ob ich "${transcript}" richtig verstanden habe. Können Sie das wiederholen?`;
    await this.speak(message);
    
    this.emit('clarification_requested', {
      transcript,
      confidence: this.confidenceScore
    });
  }

  async getSuggestions() {
    return [
      'Sagen Sie "Menü zeigen" um das Menü anzuzeigen',
      'Sagen Sie "Warenkorb" um Ihren Warenkorb zu sehen',
      'Bestellen Sie direkt: "Ich möchte einen Burger"',
      'Sagen Sie "Hilfe" für weitere Optionen'
    ];
  }

  // ============================================================================
  // SPEECH SYNTHESIS
  // ============================================================================
  async speak(text, options = {}) {
    try {
      if (!this.synthesis || !text) return;
      
      // Cancel any ongoing speech
      this.synthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure utterance
      utterance.lang = options.language || this.currentLanguage;
      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 1.0;
      
      // Select appropriate voice
      if (this.availableVoices) {
        const voice = this.getPreferredVoice(utterance.lang);
        if (voice) {
          utterance.voice = voice;
        }
      }
      
      // Event handlers
      utterance.onstart = () => {
        this.emit('speaking_started', { text });
      };
      
      utterance.onend = () => {
        this.emit('speaking_ended', { text });
      };
      
      utterance.onerror = (event) => {
        this.emit('speaking_error', { text, error: event.error });
      };
      
      // Speak
      this.synthesis.speak(utterance);
      
    } catch (error) {
      console.error('Speech synthesis failed:', error);
      this.emit('speaking_error', { text, error });
    }
  }

  getPreferredVoice(language) {
    if (!this.availableVoices) return null;
    
    // Try to find a voice that matches the language
    return this.availableVoices.find(voice => 
      voice.lang.startsWith(language.split('-')[0])
    ) || this.availableVoices[0];
  }

  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
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
    
    if (this.recognition) {
      this.recognition.lang = language;
    }
    
    // Reload language models
    await this.loadLanguageModels();
    
    this.emit('language_changed', { language });
  }

  getCurrentLanguage() {
    return this.currentLanguage;
  }

  getSupportedLanguages() {
    return SUPPORTED_LANGUAGES;
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================
  startSession(context = {}) {
    this.activeSession = {
      id: this.generateSessionId(),
      startTime: new Date().toISOString(),
      context,
      interactions: []
    };
    
    if (this.contextService) {
      this.contextService.setContext(context);
    }
    
    this.emit('session_started', this.activeSession);
    return this.activeSession.id;
  }

  endSession() {
    if (this.activeSession) {
      this.activeSession.endTime = new Date().toISOString();
      this.emit('session_ended', this.activeSession);
      this.activeSession = null;
    }
    
    this.stopListening();
    this.stopSpeaking();
  }

  generateSessionId() {
    return `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================
  isAvailable() {
    return this.isSupported && this.isInitialized;
  }

  getState() {
    return this.state;
  }

  getLastTranscript() {
    return this.lastTranscript;
  }

  getConfidenceScore() {
    return this.confidenceScore;
  }

  getCommandHistory() {
    return this.commandHistory.slice();
  }

  clearHistory() {
    this.commandHistory = [];
    this.emit('history_cleared');
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================
  cleanup() {
    try {
      this.endSession();
      
      if (this.noSpeechTimer) {
        clearTimeout(this.noSpeechTimer);
      }
      
      this.removeAllListeners();
      
    } catch (error) {
      console.error('Voice service cleanup failed:', error);
    }
  }
}

export default VoiceService;