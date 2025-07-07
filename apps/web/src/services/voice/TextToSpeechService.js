/**
 * EATECH - Text-to-Speech Service
 * Version: 4.3.0
 * Description: Advanced Text-to-Speech engine with Swiss voice support
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/services/voice/TextToSpeechService.js
 * 
 * Features:
 * - Multi-language voice synthesis (DE/FR/IT/EN + Swiss variants)
 * - Advanced voice configuration and customization
 * - SSML support for expressive speech
 * - Queue management for multiple utterances
 * - Real-time audio visualization
 * - Emotional tone adjustment
 * - Performance optimization and caching
 * - Accessibility compliance
 */

// ============================================================================
// IMPORTS & DEPENDENCIES
// ============================================================================

import EventEmitter from 'events';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const TTS_CONFIG = {
  // Voice configurations for different languages
  VOICES: {
    'de-CH': {
      primary: ['de-CH-LeniNeural', 'de-CH-JanNeural'],
      fallback: ['de-DE-KatjaNeural', 'de-AT-IngridNeural'],
      characteristics: {
        pitch: 1.0,
        rate: 0.9,
        volume: 0.8,
        emphasis: 'moderate'
      }
    },
    'de-DE': {
      primary: ['de-DE-KatjaNeural', 'de-DE-ConradNeural'],
      fallback: ['de-AT-IngridNeural', 'de-CH-LeniNeural'],
      characteristics: {
        pitch: 1.0,
        rate: 1.0,
        volume: 0.8,
        emphasis: 'moderate'
      }
    },
    'fr-CH': {
      primary: ['fr-CH-ArianeNeural', 'fr-CH-FabriceNeural'],
      fallback: ['fr-FR-DeniseNeural', 'fr-CA-SylvieNeural'],
      characteristics: {
        pitch: 1.1,
        rate: 0.95,
        volume: 0.8,
        emphasis: 'moderate'
      }
    },
    'it-CH': {
      primary: ['it-CH-LyndaNeural', 'it-CH-FrancescaNeural'],
      fallback: ['it-IT-ElsaNeural', 'it-IT-IsabellaNeural'],
      characteristics: {
        pitch: 1.05,
        rate: 0.95,
        volume: 0.8,
        emphasis: 'moderate'
      }
    },
    'en-US': {
      primary: ['en-US-AriaNeural', 'en-US-DavisNeural'],
      fallback: ['en-GB-SoniaNeural', 'en-AU-NatashaNeural'],
      characteristics: {
        pitch: 1.0,
        rate: 1.0,
        volume: 0.8,
        emphasis: 'moderate'
      }
    }
  },
  
  // Emotional tones for different contexts
  TONES: {
    NEUTRAL: {
      pitch: 1.0,
      rate: 1.0,
      volume: 0.8,
      ssml: ''
    },
    FRIENDLY: {
      pitch: 1.1,
      rate: 0.95,
      volume: 0.85,
      ssml: '<prosody pitch="+10%" rate="95%">{text}</prosody>'
    },
    PROFESSIONAL: {
      pitch: 0.95,
      rate: 0.9,
      volume: 0.8,
      ssml: '<prosody pitch="-5%" rate="90%">{text}</prosody>'
    },
    EXCITED: {
      pitch: 1.2,
      rate: 1.1,
      volume: 0.9,
      ssml: '<prosody pitch="+20%" rate="110%" volume="90%">{text}</prosody>'
    },
    CALM: {
      pitch: 0.9,
      rate: 0.8,
      volume: 0.7,
      ssml: '<prosody pitch="-10%" rate="80%" volume="70%">{text}</prosody>'
    },
    ERROR: {
      pitch: 0.85,
      rate: 0.85,
      volume: 0.8,
      ssml: '<prosody pitch="-15%" rate="85%"><emphasis level="moderate">{text}</emphasis></prosody>'
    },
    SUCCESS: {
      pitch: 1.15,
      rate: 1.05,
      volume: 0.85,
      ssml: '<prosody pitch="+15%" rate="105%"><emphasis level="moderate">{text}</emphasis></prosody>'
    }
  },
  
  // Context-specific speech patterns
  CONTEXTS: {
    GREETING: {
      tone: 'FRIENDLY',
      pause_after: 800,
      emphasis: ['willkommen', 'hallo', 'guten tag']
    },
    ORDERING: {
      tone: 'PROFESSIONAL',
      pause_after: 500,
      emphasis: ['bestellt', 'hinzugefügt', 'warenkorb']
    },
    CONFIRMATION: {
      tone: 'SUCCESS',
      pause_after: 600,
      emphasis: ['bestätigt', 'erfolgreich', 'abgeschlossen']
    },
    ERROR: {
      tone: 'ERROR',
      pause_after: 1000,
      emphasis: ['fehler', 'problem', 'entschuldigung']
    },
    HELP: {
      tone: 'FRIENDLY',
      pause_after: 400,
      emphasis: ['hilfe', 'können', 'sagen sie']
    }
  },
  
  // SSML templates for Swiss German expressions
  SWISS_EXPRESSIONS: {
    'grüezi': '<say-as interpret-as="characters">Grüezi</say-as>',
    'merci vielmal': '<prosody pitch="+5%" rate="95%">Merci vielmal</prosody>',
    'chuchichäschtli': '<phoneme alphabet="ipa" ph="ˈχuxiˌχæʃtli">Chuchichäschtli</phoneme>',
    'rösti': '<phoneme alphabet="ipa" ph="ˈrøsti">Rösti</phoneme>',
    'chrüter': '<phoneme alphabet="ipa" ph="ˈχrytər">Chrüter</phoneme>'
  },
  
  // Performance settings
  PERFORMANCE: {
    max_queue_size: 20,
    max_text_length: 500,
    cache_size: 100,
    preload_common_phrases: true,
    chunk_size: 200,
    audio_buffer_size: 4096
  },
  
  // Accessibility settings
  ACCESSIBILITY: {
    announce_punctuation: false,
    spell_out_numbers: false,
    reading_speed_adjustment: true,
    pause_on_punctuation: true,
    screen_reader_compatible: true
  }
};

// ============================================================================
// SSML BUILDER CLASS
// ============================================================================

class SSMLBuilder {
  constructor() {
    this.elements = [];
  }
  
  speak(text) {
    this.elements.push(`<speak>${text}</speak>`);
    return this;
  }
  
  prosody(text, options = {}) {
    const { pitch, rate, volume } = options;
    let prosodyTag = '<prosody';
    
    if (pitch) prosodyTag += ` pitch="${pitch}"`;
    if (rate) prosodyTag += ` rate="${rate}"`;
    if (volume) prosodyTag += ` volume="${volume}"`;
    
    prosodyTag += `>${text}</prosody>`;
    this.elements.push(prosodyTag);
    return this;
  }
  
  emphasis(text, level = 'moderate') {
    this.elements.push(`<emphasis level="${level}">${text}</emphasis>`);
    return this;
  }
  
  pause(duration = '500ms') {
    this.elements.push(`<break time="${duration}"/>`);
    return this;
  }
  
  sayAs(text, interpretAs, format = null) {
    let tag = `<say-as interpret-as="${interpretAs}"`;
    if (format) tag += ` format="${format}"`;
    tag += `>${text}</say-as>`;
    this.elements.push(tag);
    return this;
  }
  
  phoneme(text, alphabet, ph) {
    this.elements.push(`<phoneme alphabet="${alphabet}" ph="${ph}">${text}</phoneme>`);
    return this;
  }
  
  build() {
    return this.elements.join('');
  }
  
  clear() {
    this.elements = [];
    return this;
  }
}

// ============================================================================
// MAIN TTS SERVICE CLASS
// ============================================================================

class TextToSpeechService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Configuration
    this.config = {
      ...TTS_CONFIG,
      ...options
    };
    
    // State management
    this.state = {
      isInitialized: false,
      isSupported: false,
      isSpeaking: false,
      isPaused: false,
      currentLanguage: 'de-CH',
      currentVoice: null,
      volume: 0.8,
      rate: 1.0,
      pitch: 1.0
    };
    
    // Speech synthesis API
    this.synthesis = null;
    this.voices = [];
    this.currentUtterance = null;
    
    // Queue management
    this.speechQueue = [];
    this.isProcessingQueue = false;
    this.queueProcessor = null;
    
    // SSML builder
    this.ssmlBuilder = new SSMLBuilder();
    
    // Performance tracking
    this.metrics = {
      totalUtterances: 0,
      totalCharacters: 0,
      averageDuration: 0,
      cacheHits: 0,
      errors: 0,
      queueOverflows: 0
    };
    
    // Audio context for visualization
    this.audioContext = null;
    this.analyser = null;
    this.audioBuffer = null;
    
    // Caching system
    this.cache = new Map();
    this.cacheOrder = [];
    
    // Event handlers (bound methods)
    this.handleVoicesChanged = this.handleVoicesChanged.bind(this);
    this.handleUtteranceStart = this.handleUtteranceStart.bind(this);
    this.handleUtteranceEnd = this.handleUtteranceEnd.bind(this);
    this.handleUtteranceError = this.handleUtteranceError.bind(this);
    this.handleUtterancePause = this.handleUtterancePause.bind(this);
    this.handleUtteranceResume = this.handleUtteranceResume.bind(this);
    this.handleUtteranceBoundary = this.handleUtteranceBoundary.bind(this);
    
    // Initialize
    this.initialize();
  }
  
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  async initialize() {
    try {
      console.log('🗣️ Initializing Text-to-Speech Service...');
      
      // Check browser support
      this.checkSupport();
      
      if (!this.state.isSupported) {
        throw new Error('Text-to-Speech not supported in this browser');
      }
      
      // Initialize speech synthesis
      await this.initializeSynthesis();
      
      // Load and select voices
      await this.loadVoices();
      
      // Setup audio context for visualization
      await this.setupAudioContext();
      
      // Start queue processor
      this.startQueueProcessor();
      
      // Preload common phrases if enabled
      if (this.config.PERFORMANCE.preload_common_phrases) {
        await this.preloadCommonPhrases();
      }
      
      this.state.isInitialized = true;
      this.emit('initialized');
      
      console.log('✅ Text-to-Speech Service initialized successfully');
      
    } catch (error) {
      console.error('❌ TTS initialization failed:', error);
      this.emit('error', error);
      throw error;
    }
  }
  
  checkSupport() {
    this.state.isSupported = !!(window.speechSynthesis && window.SpeechSynthesisUtterance);
    
    if (this.state.isSupported) {
      this.synthesis = window.speechSynthesis;
    }
  }
  
  async initializeSynthesis() {
    if (!this.synthesis) {
      throw new Error('Speech synthesis not available');
    }
    
    // Setup global event listeners
    this.synthesis.addEventListener('voiceschanged', this.handleVoicesChanged);
    
    // Cancel any ongoing speech
    this.synthesis.cancel();
  }
  
  async loadVoices() {
    return new Promise((resolve) => {
      // Voices might not be immediately available
      const loadVoicesInterval = setInterval(() => {
        this.voices = this.synthesis.getVoices();
        
        if (this.voices.length > 0) {
          clearInterval(loadVoicesInterval);
          this.selectBestVoice();
          resolve();
        }
      }, 100);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(loadVoicesInterval);
        if (this.voices.length === 0) {
          console.warn('⚠️ No voices loaded, using system default');
        }
        resolve();
      }, 5000);
    });
  }
  
  selectBestVoice() {
    const languageConfig = this.config.VOICES[this.state.currentLanguage];
    if (!languageConfig) {
      console.warn(`No voice configuration for language: ${this.state.currentLanguage}`);
      return;
    }
    
    // Try primary voices first
    for (const voiceName of languageConfig.primary) {
      const voice = this.voices.find(v => v.name.includes(voiceName));
      if (voice) {
        this.state.currentVoice = voice;
        console.log(`🎤 Selected voice: ${voice.name}`);
        return;
      }
    }
    
    // Try fallback voices
    for (const voiceName of languageConfig.fallback) {
      const voice = this.voices.find(v => v.name.includes(voiceName));
      if (voice) {
        this.state.currentVoice = voice;
        console.log(`🎤 Selected fallback voice: ${voice.name}`);
        return;
      }
    }
    
    // Try language-based selection
    const languageCode = this.state.currentLanguage.split('-')[0];
    const languageVoice = this.voices.find(v => v.lang.startsWith(languageCode));
    if (languageVoice) {
      this.state.currentVoice = languageVoice;
      console.log(`🎤 Selected language-based voice: ${languageVoice.name}`);
      return;
    }
    
    // Use system default
    this.state.currentVoice = this.voices[0] || null;
    if (this.state.currentVoice) {
      console.log(`🎤 Using default voice: ${this.state.currentVoice.name}`);
    }
  }
  
  async setupAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.config.PERFORMANCE.audio_buffer_size;
      
      console.log('🎚️ Audio context initialized for TTS visualization');
    } catch (error) {
      console.warn('⚠️ Audio context setup failed:', error);
      // Continue without audio visualization
    }
  }
  
  startQueueProcessor() {
    this.queueProcessor = setInterval(() => {
      this.processQueue();
    }, 100);
  }
  
  async preloadCommonPhrases() {
    const commonPhrases = [
      'Willkommen bei EATECH',
      'Ihr Produkt wurde hinzugefügt',
      'Bestellung bestätigt',
      'Vielen Dank für Ihre Bestellung',
      'Es gab einen Fehler',
      'Wie kann ich Ihnen helfen?'
    ];
    
    for (const phrase of commonPhrases) {
      // Pre-generate utterances for caching
      this.createUtterance(phrase, { cache: true });
    }
    
    console.log(`📚 Preloaded ${commonPhrases.length} common phrases`);
  }
  
  // ============================================================================
  // MAIN SPEAK METHOD
  // ============================================================================
  
  async speak(text, options = {}) {
    try {
      if (!this.state.isInitialized) {
        throw new Error('TTS service not initialized');
      }
      
      if (!text || typeof text !== 'string') {
        throw new Error('Invalid text input');
      }
      
      // Validate text length
      if (text.length > this.config.PERFORMANCE.max_text_length) {
        return await this.speakLongText(text, options);
      }
      
      // Generate speech request
      const speechRequest = this.createSpeechRequest(text, options);
      
      // Add to queue or speak immediately
      if (options.immediate || this.speechQueue.length === 0) {
        return await this.speakImmediate(speechRequest);
      } else {
        return await this.addToQueue(speechRequest);
      }
      
    } catch (error) {
      console.error('Speech synthesis failed:', error);
      this.metrics.errors++;
      this.emit('error', error);
      throw error;
    }
  }
  
  createSpeechRequest(text, options) {
    const {
      voice = this.state.currentVoice,
      volume = this.state.volume,
      rate = this.state.rate,
      pitch = this.state.pitch,
      tone = 'NEUTRAL',
      context = null,
      language = this.state.currentLanguage,
      useSSML = false,
      cache = false,
      priority = 'normal'
    } = options;
    
    return {
      id: this.generateRequestId(),
      text,
      processedText: this.preprocessText(text, { context, language }),
      voice,
      volume,
      rate,
      pitch,
      tone,
      context,
      language,
      useSSML,
      cache,
      priority,
      timestamp: Date.now()
    };
  }
  
  preprocessText(text, options = {}) {
    let processed = text;
    
    // Handle Swiss German expressions
    if (options.language === 'de-CH') {
      processed = this.processSwissGermanText(processed);
    }
    
    // Apply context-specific processing
    if (options.context) {
      processed = this.applyContextualProcessing(processed, options.context);
    }
    
    // Clean up text
    processed = this.cleanText(processed);
    
    return processed;
  }
  
  processSwissGermanText(text) {
    let processed = text;
    
    // Replace Swiss German expressions with SSML
    Object.entries(this.config.SWISS_EXPRESSIONS).forEach(([expression, ssml]) => {
      const regex = new RegExp(`\\b${expression}\\b`, 'gi');
      processed = processed.replace(regex, ssml);
    });
    
    return processed;
  }
  
  applyContextualProcessing(text, context) {
    let processed = text;
    
    const contextConfig = this.config.CONTEXTS[context.toUpperCase()];
    if (!contextConfig) return processed;
    
    // Add emphasis to important words
    if (contextConfig.emphasis) {
      contextConfig.emphasis.forEach(word => {
        const regex = new RegExp(`\\b(${word})\\b`, 'gi');
        processed = processed.replace(regex, `<emphasis level="moderate">$1</emphasis>`);
      });
    }
    
    return processed;
  }
  
  cleanText(text) {
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/([.!?])\s*$/, '$1') // Ensure proper ending punctuation
      .trim();
  }
  
  async speakImmediate(speechRequest) {
    return new Promise((resolve, reject) => {
      try {
        // Check cache first
        const cacheKey = this.generateCacheKey(speechRequest);
        if (this.cache.has(cacheKey)) {
          this.metrics.cacheHits++;
          const cachedResult = this.cache.get(cacheKey);
          
          // Emit cached audio
          this.emit('speechStart', { request: speechRequest, fromCache: true });
          setTimeout(() => {
            this.emit('speechEnd', { request: speechRequest, fromCache: true });
            resolve(cachedResult);
          }, cachedResult.estimatedDuration || 1000);
          
          return;
        }
        
        // Create utterance
        const utterance = this.createUtterance(speechRequest.processedText, speechRequest);
        
        // Setup event handlers
        utterance.onstart = () => {
          this.state.isSpeaking = true;
          this.emit('speechStart', { request: speechRequest });
        };
        
        utterance.onend = () => {
          this.state.isSpeaking = false;
          this.updateMetrics(speechRequest);
          
          // Cache result if requested
          if (speechRequest.cache) {
            this.cacheResult(cacheKey, speechRequest);
          }
          
          this.emit('speechEnd', { request: speechRequest });
          resolve({ success: true, request: speechRequest });
        };
        
        utterance.onerror = (event) => {
          this.state.isSpeaking = false;
          this.metrics.errors++;
          this.emit('speechError', { request: speechRequest, error: event.error });
          reject(new Error(`Speech synthesis failed: ${event.error}`));
        };
        
        utterance.onpause = () => {
          this.state.isPaused = true;
          this.emit('speechPause', { request: speechRequest });
        };
        
        utterance.onresume = () => {
          this.state.isPaused = false;
          this.emit('speechResume', { request: speechRequest });
        };
        
        utterance.onboundary = (event) => {
          this.emit('speechBoundary', {
            request: speechRequest,
            charIndex: event.charIndex,
            charLength: event.charLength
          });
        };
        
        // Store current utterance
        this.currentUtterance = utterance;
        
        // Speak
        this.synthesis.speak(utterance);
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  createUtterance(text, options = {}) {
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Apply voice settings
    if (options.voice) {
      utterance.voice = options.voice;
    }
    
    utterance.volume = options.volume || this.state.volume;
    utterance.rate = options.rate || this.state.rate;
    utterance.pitch = options.pitch || this.state.pitch;
    
    // Apply tone adjustments
    if (options.tone && this.config.TONES[options.tone]) {
      const toneConfig = this.config.TONES[options.tone];
      utterance.pitch *= toneConfig.pitch;
      utterance.rate *= toneConfig.rate;
      utterance.volume *= toneConfig.volume;
    }
    
    // Language setting
    if (options.language) {
      utterance.lang = options.language;
    }
    
    return utterance;
  }
  
  async speakLongText(text, options = {}) {
    const chunkSize = this.config.PERFORMANCE.chunk_size;
    const chunks = this.chunkText(text, chunkSize);
    
    const results = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkOptions = {
        ...options,
        immediate: i === 0, // First chunk immediate, others queued
        isChunk: true,
        chunkIndex: i,
        totalChunks: chunks.length
      };
      
      const result = await this.speak(chunk, chunkOptions);
      results.push(result);
      
      // Small pause between chunks
      if (i < chunks.length - 1) {
        await this.pause(200);
      }
    }
    
    return {
      success: true,
      chunks: results,
      totalChunks: chunks.length
    };
  }
  
  chunkText(text, maxLength) {
    const chunks = [];
    const sentences = text.split(/[.!?]+/);
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;
      
      const sentenceWithPunctuation = trimmedSentence + '.';
      
      if (currentChunk.length + sentenceWithPunctuation.length <= maxLength) {
        currentChunk += (currentChunk ? ' ' : '') + sentenceWithPunctuation;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = sentenceWithPunctuation;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }
  
  // ============================================================================
  // QUEUE MANAGEMENT
  // ============================================================================
  
  async addToQueue(speechRequest) {
    if (this.speechQueue.length >= this.config.PERFORMANCE.max_queue_size) {
      this.metrics.queueOverflows++;
      throw new Error('Speech queue is full');
    }
    
    // Insert based on priority
    const insertIndex = this.findInsertionPoint(speechRequest.priority);
    this.speechQueue.splice(insertIndex, 0, speechRequest);
    
    this.emit('queueUpdated', {
      size: this.speechQueue.length,
      added: speechRequest
    });
    
    return new Promise((resolve, reject) => {
      speechRequest.resolve = resolve;
      speechRequest.reject = reject;
    });
  }
  
  findInsertionPoint(priority) {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    const priorityValue = priorityOrder[priority] || 1;
    
    for (let i = 0; i < this.speechQueue.length; i++) {
      const itemPriority = priorityOrder[this.speechQueue[i].priority] || 1;
      if (priorityValue < itemPriority) {
        return i;
      }
    }
    
    return this.speechQueue.length;
  }
  
  processQueue() {
    if (this.isProcessingQueue || this.state.isSpeaking || this.speechQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    const speechRequest = this.speechQueue.shift();
    
    this.speakImmediate(speechRequest)
      .then(result => {
        if (speechRequest.resolve) {
          speechRequest.resolve(result);
        }
      })
      .catch(error => {
        if (speechRequest.reject) {
          speechRequest.reject(error);
        }
      })
      .finally(() => {
        this.isProcessingQueue = false;
        
        this.emit('queueUpdated', {
          size: this.speechQueue.length,
          processed: speechRequest
        });
      });
  }
  
  // ============================================================================
  // CONTROL METHODS
  // ============================================================================
  
  pause() {
    if (this.synthesis && this.state.isSpeaking) {
      this.synthesis.pause();
      return true;
    }
    return false;
  }
  
  resume() {
    if (this.synthesis && this.state.isPaused) {
      this.synthesis.resume();
      return true;
    }
    return false;
  }
  
  stop() {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.state.isSpeaking = false;
      this.state.isPaused = false;
      this.currentUtterance = null;
      
      // Clear queue
      this.speechQueue.forEach(request => {
        if (request.reject) {
          request.reject(new Error('Speech cancelled'));
        }
      });
      this.speechQueue = [];
      
      this.emit('speechStopped');
      return true;
    }
    return false;
  }
  
  async setLanguage(language) {
    if (!this.config.VOICES[language]) {
      throw new Error(`Language ${language} not supported`);
    }
    
    this.state.currentLanguage = language;
    this.selectBestVoice();
    
    this.emit('languageChanged', { language, voice: this.state.currentVoice });
  }
  
  setVoice(voiceName) {
    const voice = this.voices.find(v => v.name === voiceName || v.name.includes(voiceName));
    
    if (voice) {
      this.state.currentVoice = voice;
      this.emit('voiceChanged', { voice });
      return true;
    }
    
    return false;
  }
  
  setVolume(volume) {
    this.state.volume = Math.max(0, Math.min(1, volume));
    this.emit('volumeChanged', { volume: this.state.volume });
  }
  
  setRate(rate) {
    this.state.rate = Math.max(0.1, Math.min(3, rate));
    this.emit('rateChanged', { rate: this.state.rate });
  }
  
  setPitch(pitch) {
    this.state.pitch = Math.max(0, Math.min(2, pitch));
    this.emit('pitchChanged', { pitch: this.state.pitch });
  }
  
  // ============================================================================
  // SSML SUPPORT
  // ============================================================================
  
  createSSML(text, options = {}) {
    this.ssmlBuilder.clear();
    
    if (options.tone && this.config.TONES[options.tone]) {
      const toneConfig = this.config.TONES[options.tone];
      if (toneConfig.ssml) {
        const ssmlText = toneConfig.ssml.replace('{text}', text);
        return this.ssmlBuilder.speak(ssmlText).build();
      }
    }
    
    return this.ssmlBuilder.speak(text).build();
  }
  
  speakSSML(ssml, options = {}) {
    // Most browsers don't fully support SSML in speech synthesis
    // This is a fallback that extracts text and applies manual adjustments
    const textContent = this.extractTextFromSSML(ssml);
    
    return this.speak(textContent, {
      ...options,
      useSSML: true
    });
  }
  
  extractTextFromSSML(ssml) {
    // Simple SSML text extraction
    return ssml
      .replace(/<[^>]*>/g, '') // Remove all tags
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim();
  }
  
  // ============================================================================
  // CACHING SYSTEM
  // ============================================================================
  
  generateCacheKey(speechRequest) {
    const { text, voice, volume, rate, pitch, tone, language } = speechRequest;
    const voiceName = voice?.name || 'default';
    
    return `${language}:${voiceName}:${volume}:${rate}:${pitch}:${tone}:${text}`;
  }
  
  cacheResult(key, speechRequest) {
    if (this.cache.size >= this.config.PERFORMANCE.cache_size) {
      // Remove oldest cache entry
      const oldestKey = this.cacheOrder.shift();
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      request: speechRequest,
      timestamp: Date.now(),
      estimatedDuration: this.estimateDuration(speechRequest.text)
    });
    
    this.cacheOrder.push(key);
  }
  
  estimateDuration(text) {
    // Rough estimation: 150 words per minute average reading speed
    const words = text.split(/\s+/).length;
    const wordsPerMinute = 150;
    const duration = (words / wordsPerMinute) * 60 * 1000; // Convert to milliseconds
    
    return Math.max(duration, 500); // Minimum 500ms
  }
  
  clearCache() {
    this.cache.clear();
    this.cacheOrder = [];
    this.emit('cacheCleared');
  }
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  handleVoicesChanged() {
    this.loadVoices().then(() => {
      this.emit('voicesUpdated', { voices: this.voices });
    });
  }
  
  handleUtteranceStart(event) {
    this.state.isSpeaking = true;
    this.emit('utteranceStart', event);
  }
  
  handleUtteranceEnd(event) {
    this.state.isSpeaking = false;
    this.emit('utteranceEnd', event);
  }
  
  handleUtteranceError(event) {
    this.state.isSpeaking = false;
    this.metrics.errors++;
    this.emit('utteranceError', event);
  }
  
  handleUtterancePause(event) {
    this.state.isPaused = true;
    this.emit('utterancePause', event);
  }
  
  handleUtteranceResume(event) {
    this.state.isPaused = false;
    this.emit('utteranceResume', event);
  }
  
  handleUtteranceBoundary(event) {
    this.emit('utteranceBoundary', event);
  }
  
  // ============================================================================
  // METRICS & ANALYTICS
  // ============================================================================
  
  updateMetrics(speechRequest) {
    this.metrics.totalUtterances++;
    this.metrics.totalCharacters += speechRequest.text.length;
    
    // Update average duration (simplified)
    const estimatedDuration = this.estimateDuration(speechRequest.text);
    this.metrics.averageDuration = 
      (this.metrics.averageDuration * (this.metrics.totalUtterances - 1) + estimatedDuration) 
      / this.metrics.totalUtterances;
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      queueSize: this.speechQueue.length,
      cacheSize: this.cache.size,
      isInitialized: this.state.isInitialized,
      isSupported: this.state.isSupported,
      isSpeaking: this.state.isSpeaking,
      isPaused: this.state.isPaused,
      currentLanguage: this.state.currentLanguage,
      currentVoice: this.state.currentVoice?.name,
      successRate: this.metrics.totalUtterances > 0 ? 
        (this.metrics.totalUtterances - this.metrics.errors) / this.metrics.totalUtterances : 0
    };
  }
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  generateRequestId() {
    return `tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  getAvailableVoices() {
    return this.voices.map(voice => ({
      name: voice.name,
      lang: voice.lang,
      localService: voice.localService,
      default: voice.default
    }));
  }
  
  getState() {
    return { ...this.state };
  }
  
  isReady() {
    return this.state.isInitialized && this.state.isSupported && !this.state.isSpeaking;
  }
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  destroy() {
    console.log('🗑️ Destroying Text-to-Speech Service...');
    
    // Stop any ongoing speech
    this.stop();
    
    // Clear queue processor
    if (this.queueProcessor) {
      clearInterval(this.queueProcessor);
      this.queueProcessor = null;
    }
    
    // Remove event listeners
    if (this.synthesis) {
      this.synthesis.removeEventListener('voiceschanged', this.handleVoicesChanged);
    }
    
    // Clear caches
    this.clearCache();
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    // Remove all listeners
    this.removeAllListeners();
    
    // Reset state
    this.state.isInitialized = false;
    
    console.log('✅ Text-to-Speech Service destroyed');
  }
}

// ============================================================================
// FACTORY & EXPORT
// ============================================================================

let serviceInstance = null;

export const createTextToSpeechService = (options = {}) => {
  if (!serviceInstance) {
    serviceInstance = new TextToSpeechService(options);
  }
  return serviceInstance;
};

export const getTextToSpeechService = () => {
  if (!serviceInstance) {
    throw new Error('Text-to-Speech Service not initialized. Call createTextToSpeechService first.');
  }
  return serviceInstance;
};

export { SSMLBuilder };
export default TextToSpeechService;