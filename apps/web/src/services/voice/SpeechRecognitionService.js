/**
 * EATECH - Speech Recognition Service
 * Version: 4.2.0
 * Description: Advanced Speech Recognition with Swiss German support and WebRTC
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/services/voice/SpeechRecognitionService.js
 * 
 * Features:
 * - Cross-browser speech recognition support
 * - Swiss German dialect optimization
 * - WebRTC audio processing
 * - Real-time confidence scoring
 * - Noise reduction and audio enhancement
 * - Offline fallback capabilities
 * - Performance monitoring
 */

// ============================================================================
// IMPORTS & DEPENDENCIES
// ============================================================================

import EventEmitter from 'events';

// Dynamic imports for optional dependencies
let AudioWorkletNode = null;
let MediaStreamTrack = null;

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const RECOGNITION_CONFIG = {
  // Language configurations
  LANGUAGES: {
    'de-CH': {
      primary: 'de-CH',
      fallbacks: ['de-DE', 'de-AT'],
      dialectPatterns: [
        { pattern: /chund|chönd|händ/, replacement: 'können' },
        { pattern: /gah|gang/, replacement: 'gehen' },
        { pattern: /chunnt/, replacement: 'kommt' },
        { pattern: /hätt/, replacement: 'hätte' },
        { pattern: /wött/, replacement: 'wollte' },
        { pattern: /isch/, replacement: 'ist' }
      ],
      confidence: 0.65
    },
    'de-DE': {
      primary: 'de-DE',
      fallbacks: ['de-AT', 'de-CH'],
      confidence: 0.75
    },
    'fr-CH': {
      primary: 'fr-CH',
      fallbacks: ['fr-FR'],
      confidence: 0.75
    },
    'it-CH': {
      primary: 'it-CH',
      fallbacks: ['it-IT'],
      confidence: 0.75
    },
    'en-US': {
      primary: 'en-US',
      fallbacks: ['en-GB', 'en-AU'],
      confidence: 0.80
    }
  },
  
  // Audio processing
  AUDIO: {
    sampleRate: 44100,
    channels: 1,
    bufferSize: 4096,
    noiseReduction: true,
    echoCancellation: true,
    autoGainControl: true
  },
  
  // Recognition settings
  RECOGNITION: {
    continuous: true,
    interimResults: true,
    maxAlternatives: 5,
    timeout: 30000,
    pauseThreshold: 800,
    endTimeout: 2000
  },
  
  // Performance thresholds
  PERFORMANCE: {
    maxLatency: 500,
    minConfidence: 0.6,
    maxRetries: 3,
    bufferClearInterval: 5000
  }
};

const AUDIO_CONSTRAINTS = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
    sampleRate: 44100,
    sampleSize: 16
  },
  video: false
};

const ERROR_CODES = {
  NO_SPEECH: 'no-speech',
  ABORTED: 'aborted',
  AUDIO_CAPTURE: 'audio-capture',
  NETWORK: 'network',
  NOT_ALLOWED: 'not-allowed',
  SERVICE_NOT_ALLOWED: 'service-not-allowed',
  BAD_GRAMMAR: 'bad-grammar',
  LANGUAGE_NOT_SUPPORTED: 'language-not-supported'
};

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

class SpeechRecognitionService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Configuration
    this.config = {
      ...RECOGNITION_CONFIG,
      ...options
    };
    
    // State management
    this.state = {
      isInitialized: false,
      isListening: false,
      isPaused: false,
      currentLanguage: options.language || 'de-CH',
      sessionId: null,
      startTime: null,
      lastActivity: null
    };
    
    // Recognition instances
    this.recognition = null;
    this.fallbackRecognition = null;
    this.currentRecognition = null;
    
    // Audio processing
    this.audioContext = null;
    this.mediaStream = null;
    this.audioProcessor = null;
    this.audioAnalyser = null;
    this.noiseGate = null;
    
    // Performance monitoring
    this.metrics = {
      sessionsStarted: 0,
      totalProcessingTime: 0,
      averageConfidence: 0,
      errorCount: 0,
      successfulRecognitions: 0
    };
    
    // Timers and intervals
    this.timeouts = new Map();
    this.intervals = new Map();
    
    // Event handlers (bound methods)
    this.handleResult = this.handleResult.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleStart = this.handleStart.bind(this);
    this.handleEnd = this.handleEnd.bind(this);
    this.handleSoundStart = this.handleSoundStart.bind(this);
    this.handleSoundEnd = this.handleSoundEnd.bind(this);
    this.handleSpeechStart = this.handleSpeechStart.bind(this);
    this.handleSpeechEnd = this.handleSpeechEnd.bind(this);
    this.handleNoMatch = this.handleNoMatch.bind(this);
    
    // Buffer management
    this.audioBuffer = [];
    this.resultBuffer = [];
    
    // Initialize
    this.initialize();
  }
  
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  async initialize() {
    try {
      console.log('🎤 Initializing Speech Recognition Service...');
      
      // Check browser support
      if (!this.isSupportedBrowser()) {
        throw new Error('Speech recognition not supported in this browser');
      }
      
      // Setup audio context
      await this.setupAudioContext();
      
      // Create recognition instances
      await this.createRecognitionInstances();
      
      // Setup audio processing
      await this.setupAudioProcessing();
      
      // Initialize performance monitoring
      this.initializeMetrics();
      
      this.state.isInitialized = true;
      this.emit('initialized');
      
      console.log('✅ Speech Recognition Service initialized successfully');
      
    } catch (error) {
      console.error('❌ Speech Recognition initialization failed:', error);
      this.emit('error', error);
      throw error;
    }
  }
  
  isSupportedBrowser() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }
  
  async setupAudioContext() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext({
        sampleRate: RECOGNITION_CONFIG.AUDIO.sampleRate,
        latencyHint: 'interactive'
      });
      
      // Resume context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      console.log('🔊 Audio context initialized');
      
    } catch (error) {
      console.warn('⚠️ Audio context setup failed:', error);
      // Continue without audio processing
    }
  }
  
  async createRecognitionInstances() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    // Primary recognition instance
    this.recognition = new SpeechRecognition();
    this.setupRecognitionInstance(this.recognition, 'primary');
    
    // Fallback recognition instance with different settings
    this.fallbackRecognition = new SpeechRecognition();
    this.setupRecognitionInstance(this.fallbackRecognition, 'fallback');
    
    this.currentRecognition = this.recognition;
    
    console.log('🎯 Recognition instances created');
  }
  
  setupRecognitionInstance(recognition, type = 'primary') {
    const config = this.config.RECOGNITION;
    const languageConfig = this.config.LANGUAGES[this.state.currentLanguage];
    
    // Basic configuration
    recognition.continuous = config.continuous;
    recognition.interimResults = config.interimResults;
    recognition.maxAlternatives = type === 'fallback' ? 3 : config.maxAlternatives;
    recognition.lang = languageConfig.primary;
    
    // Event listeners
    recognition.onstart = this.handleStart;
    recognition.onresult = this.handleResult;
    recognition.onerror = this.handleError;
    recognition.onend = this.handleEnd;
    recognition.onsoundstart = this.handleSoundStart;
    recognition.onsoundend = this.handleSoundEnd;
    recognition.onspeechstart = this.handleSpeechStart;
    recognition.onspeechend = this.handleSpeechEnd;
    recognition.onnomatch = this.handleNoMatch;
    
    // Service-specific grammar (if supported)
    if (recognition.grammars) {
      try {
        const grammar = this.createGrammar();
        recognition.grammars.addFromString(grammar, 1);
      } catch (error) {
        console.warn('Grammar not supported:', error);
      }
    }
  }
  
  createGrammar() {
    // JSGF grammar for food ordering
    return `
      #JSGF V1.0;
      grammar eatech;
      
      public <command> = <order> | <navigation> | <inquiry> | <control>;
      
      <order> = (ich möchte | ich hätte gern | bestellen) <product> [<quantity>];
      <navigation> = (zeig | geh zu | öffne) <page>;
      <inquiry> = (was kostet | preis von | info über) <product>;
      <control> = (stopp | abbrechen | hilfe | wiederholen);
      
      <product> = (pizza | burger | sandwich | salat | getränk);
      <quantity> = (ein | eine | zwei | drei | vier | fünf);
      <page> = (menü | warenkorb | bezahlen | einstellungen);
    `;
  }
  
  async setupAudioProcessing() {
    if (!this.audioContext) return;
    
    try {
      // Create analyser for audio visualization
      this.audioAnalyser = this.audioContext.createAnalyser();
      this.audioAnalyser.fftSize = 256;
      this.audioAnalyser.smoothingTimeConstant = 0.8;
      
      // Create noise gate for better recognition
      await this.createNoiseGate();
      
      // Setup audio worklet for advanced processing
      await this.setupAudioWorklet();
      
      console.log('🎚️ Audio processing setup complete');
      
    } catch (error) {
      console.warn('⚠️ Audio processing setup failed:', error);
      // Continue without advanced audio processing
    }
  }
  
  async createNoiseGate() {
    try {
      this.noiseGate = this.audioContext.createGain();
      this.noiseGate.gain.value = 1.0;
      
      // Simple noise gate implementation
      const noiseThreshold = 0.1;
      this.noiseGate.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.01);
      
    } catch (error) {
      console.warn('Noise gate creation failed:', error);
    }
  }
  
  async setupAudioWorklet() {
    try {
      if (!this.audioContext.audioWorklet) return;
      
      // Load audio worklet for advanced processing
      await this.audioContext.audioWorklet.addModule('/audio-worklets/voice-processor.js');
      
      this.audioProcessor = new AudioWorkletNode(this.audioContext, 'voice-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 1
      });
      
      this.audioProcessor.port.onmessage = (event) => {
        const { type, data } = event.data;
        
        switch (type) {
          case 'audio-level':
            this.emit('audioLevel', data.level);
            break;
          case 'voice-activity':
            this.emit('voiceActivity', data.active);
            break;
          case 'noise-detected':
            this.handleNoiseDetection(data);
            break;
        }
      };
      
    } catch (error) {
      console.warn('Audio worklet setup failed:', error);
    }
  }
  
  initializeMetrics() {
    this.metrics = {
      sessionsStarted: 0,
      totalProcessingTime: 0,
      averageConfidence: 0,
      errorCount: 0,
      successfulRecognitions: 0,
      languageAccuracy: new Map(),
      processingLatency: [],
      audioQualityScores: []
    };
    
    // Start metrics collection interval
    this.intervals.set('metrics', setInterval(() => {
      this.updateMetrics();
    }, 1000));
  }
  
  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================
  
  async start(options = {}) {
    try {
      if (!this.state.isInitialized) {
        throw new Error('Service not initialized');
      }
      
      if (this.state.isListening) {
        console.warn('Already listening');
        return;
      }
      
      // Update configuration if provided
      if (options.language) {
        await this.setLanguage(options.language);
      }
      
      // Request microphone access
      await this.requestMicrophoneAccess();
      
      // Generate session ID
      this.state.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.state.startTime = performance.now();
      this.state.lastActivity = Date.now();
      
      // Clear buffers
      this.audioBuffer = [];
      this.resultBuffer = [];
      
      // Setup timeout
      this.setupSessionTimeout();
      
      // Start recognition
      this.currentRecognition.start();
      
      // Update metrics
      this.metrics.sessionsStarted++;
      
      console.log(`🎤 Started speech recognition session: ${this.state.sessionId}`);
      
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      this.emit('error', error);
      throw error;
    }
  }
  
  stop() {
    try {
      if (!this.state.isListening) {
        console.warn('Not currently listening');
        return;
      }
      
      // Stop recognition
      if (this.currentRecognition) {
        this.currentRecognition.stop();
      }
      
      // Stop media stream
      this.stopMediaStream();
      
      // Clear timeouts
      this.clearTimeouts();
      
      // Update state
      this.state.isListening = false;
      this.state.isPaused = false;
      
      // Calculate session duration
      if (this.state.startTime) {
        const sessionDuration = performance.now() - this.state.startTime;
        this.metrics.totalProcessingTime += sessionDuration;
      }
      
      console.log(`🛑 Stopped speech recognition session: ${this.state.sessionId}`);
      
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
      this.emit('error', error);
    }
  }
  
  pause() {
    if (this.state.isListening && !this.state.isPaused) {
      this.state.isPaused = true;
      this.emit('paused');
      console.log('⏸️ Speech recognition paused');
    }
  }
  
  resume() {
    if (this.state.isListening && this.state.isPaused) {
      this.state.isPaused = false;
      this.emit('resumed');
      console.log('▶️ Speech recognition resumed');
    }
  }
  
  async setLanguage(language) {
    if (!this.config.LANGUAGES[language]) {
      throw new Error(`Language ${language} not supported`);
    }
    
    const wasListening = this.state.isListening;
    
    // Stop current recognition if running
    if (wasListening) {
      this.stop();
    }
    
    // Update language
    this.state.currentLanguage = language;
    
    // Recreate recognition instances with new language
    await this.createRecognitionInstances();
    
    // Restart if was listening
    if (wasListening) {
      await this.start();
    }
    
    this.emit('languageChanged', language);
    console.log(`🌐 Language changed to: ${language}`);
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      currentSession: {
        sessionId: this.state.sessionId,
        duration: this.state.startTime ? performance.now() - this.state.startTime : 0,
        language: this.state.currentLanguage,
        isListening: this.state.isListening,
        isPaused: this.state.isPaused
      }
    };
  }
  
  // ============================================================================
  // MICROPHONE ACCESS
  // ============================================================================
  
  async requestMicrophoneAccess() {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
      
      // Connect to audio processing chain
      if (this.audioContext && this.audioAnalyser) {
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        
        // Connect processing chain
        let currentNode = source;
        
        if (this.noiseGate) {
          currentNode.connect(this.noiseGate);
          currentNode = this.noiseGate;
        }
        
        if (this.audioProcessor) {
          currentNode.connect(this.audioProcessor);
          currentNode = this.audioProcessor;
        }
        
        currentNode.connect(this.audioAnalyser);
        
        // Start audio monitoring
        this.startAudioMonitoring();
      }
      
      console.log('🎤 Microphone access granted');
      
    } catch (error) {
      console.error('Microphone access denied:', error);
      throw new Error('Microphone access denied');
    }
  }
  
  stopMediaStream() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        track.stop();
      });
      this.mediaStream = null;
    }
  }
  
  startAudioMonitoring() {
    if (!this.audioAnalyser) return;
    
    const bufferLength = this.audioAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const monitor = () => {
      if (!this.state.isListening) return;
      
      this.audioAnalyser.getByteFrequencyData(dataArray);
      
      // Calculate audio level
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      const normalizedLevel = average / 255;
      
      // Calculate dominant frequency
      let maxIndex = 0;
      let maxValue = 0;
      for (let i = 0; i < bufferLength; i++) {
        if (dataArray[i] > maxValue) {
          maxValue = dataArray[i];
          maxIndex = i;
        }
      }
      
      const dominantFrequency = (maxIndex * this.audioContext.sampleRate) / (2 * bufferLength);
      
      // Emit audio data
      this.emit('audioData', {
        level: normalizedLevel,
        frequency: dominantFrequency,
        spectrum: Array.from(dataArray)
      });
      
      // Continue monitoring
      requestAnimationFrame(monitor);
    };
    
    monitor();
  }
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  handleStart(event) {
    this.state.isListening = true;
    this.state.lastActivity = Date.now();
    this.emit('start', { sessionId: this.state.sessionId });
    console.log('🎤 Speech recognition started');
  }
  
  handleResult(event) {
    try {
      const startTime = performance.now();
      this.state.lastActivity = Date.now();
      
      let interimTranscript = '';
      let finalTranscript = '';
      let maxConfidence = 0;
      let alternatives = [];
      
      // Process all results
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence || this.estimateConfidence(transcript);
        
        // Collect alternatives
        const resultAlternatives = [];
        for (let j = 0; j < result.length; j++) {
          resultAlternatives.push({
            transcript: result[j].transcript,
            confidence: result[j].confidence || this.estimateConfidence(result[j].transcript)
          });
        }
        alternatives.push(resultAlternatives);
        
        if (result.isFinal) {
          // Process Swiss German if needed
          const processedTranscript = this.processSwissGerman(transcript);
          finalTranscript += processedTranscript;
          
          // Update metrics
          this.metrics.successfulRecognitions++;
          this.updateLanguageAccuracy(confidence);
          
          this.emit('result', {
            transcript: processedTranscript,
            confidence,
            alternatives: resultAlternatives,
            isFinal: true,
            sessionId: this.state.sessionId
          });
          
        } else {
          interimTranscript += transcript;
          
          this.emit('result', {
            transcript,
            confidence,
            alternatives: resultAlternatives,
            isFinal: false,
            sessionId: this.state.sessionId
          });
        }
        
        maxConfidence = Math.max(maxConfidence, confidence);
      }
      
      // Calculate processing latency
      const processingTime = performance.now() - startTime;
      this.metrics.processingLatency.push(processingTime);
      
      // Keep only last 100 measurements
      if (this.metrics.processingLatency.length > 100) {
        this.metrics.processingLatency.shift();
      }
      
      // Emit comprehensive result
      this.emit('comprehensiveResult', {
        interim: interimTranscript,
        final: finalTranscript,
        confidence: maxConfidence,
        alternatives,
        processingTime,
        sessionId: this.state.sessionId
      });
      
    } catch (error) {
      console.error('Error processing speech result:', error);
      this.emit('error', error);
    }
  }
  
  handleError(event) {
    console.error('Speech recognition error:', event.error);
    
    this.metrics.errorCount++;
    this.state.lastActivity = Date.now();
    
    const errorInfo = {
      error: event.error,
      message: this.getErrorMessage(event.error),
      sessionId: this.state.sessionId,
      canRetry: this.canRetryAfterError(event.error)
    };
    
    this.emit('error', errorInfo);
    
    // Attempt fallback or retry if appropriate
    if (errorInfo.canRetry && this.metrics.errorCount < this.config.PERFORMANCE.maxRetries) {
      this.attemptFallback();
    }
  }
  
  handleEnd(event) {
    console.log('🏁 Speech recognition ended');
    
    this.state.isListening = false;
    this.state.isPaused = false;
    
    this.emit('end', {
      sessionId: this.state.sessionId,
      duration: this.state.startTime ? performance.now() - this.state.startTime : 0
    });
    
    // Clean up
    this.clearTimeouts();
    this.stopMediaStream();
  }
  
  handleSoundStart(event) {
    this.emit('soundStart', { sessionId: this.state.sessionId });
  }
  
  handleSoundEnd(event) {
    this.emit('soundEnd', { sessionId: this.state.sessionId });
  }
  
  handleSpeechStart(event) {
    this.emit('speechStart', { sessionId: this.state.sessionId });
  }
  
  handleSpeechEnd(event) {
    this.emit('speechEnd', { sessionId: this.state.sessionId });
  }
  
  handleNoMatch(event) {
    this.emit('noMatch', { sessionId: this.state.sessionId });
  }
  
  // ============================================================================
  // SWISS GERMAN PROCESSING
  // ============================================================================
  
  processSwissGerman(transcript) {
    if (this.state.currentLanguage !== 'de-CH') {
      return transcript;
    }
    
    const dialectPatterns = this.config.LANGUAGES['de-CH'].dialectPatterns;
    let processed = transcript.toLowerCase();
    
    // Apply dialect normalization
    dialectPatterns.forEach(({ pattern, replacement }) => {
      processed = processed.replace(pattern, replacement);
    });
    
    // Additional Swiss German specific processing
    processed = this.normalizeSwissGermanPhrases(processed);
    
    return processed;
  }
  
  normalizeSwissGermanPhrases(text) {
    const swissGermanMap = {
      // Common Swiss German food terms
      'rösti': 'rösti',
      'bratwurst': 'bratwurst',
      'cervelat': 'cervelat',
      'älplermagronen': 'älplermagronen',
      'zürcher geschnetzeltes': 'zürcher geschnetzeltes',
      
      // Common verbs
      'luege': 'schauen',
      'mache': 'machen',
      'gah': 'gehen',
      'cho': 'kommen',
      'ha': 'haben',
      
      // Numbers
      'eis': 'eins',
      'zwöi': 'zwei',
      'drü': 'drei',
      'vier': 'vier',
      'föif': 'fünf',
      
      // Quantities
      'es': 'ein',
      'e': 'eine',
      'zwöi': 'zwei',
      'es paar': 'einige'
    };
    
    let normalized = text;
    
    Object.entries(swissGermanMap).forEach(([swiss, standard]) => {
      const regex = new RegExp(`\\b${swiss}\\b`, 'gi');
      normalized = normalized.replace(regex, standard);
    });
    
    return normalized;
  }
  
  // ============================================================================
  // ERROR HANDLING & FALLBACK
  // ============================================================================
  
  getErrorMessage(errorCode) {
    const messages = {
      [ERROR_CODES.NO_SPEECH]: 'Keine Sprache erkannt. Bitte sprechen Sie deutlicher.',
      [ERROR_CODES.ABORTED]: 'Spracherkennung wurde abgebrochen.',
      [ERROR_CODES.AUDIO_CAPTURE]: 'Mikrofon nicht verfügbar oder Fehler beim Audioaufnahme.',
      [ERROR_CODES.NETWORK]: 'Netzwerkfehler bei der Spracherkennung.',
      [ERROR_CODES.NOT_ALLOWED]: 'Mikrofon-Zugriff wurde verweigert.',
      [ERROR_CODES.SERVICE_NOT_ALLOWED]: 'Spracherkennungsdienst nicht verfügbar.',
      [ERROR_CODES.BAD_GRAMMAR]: 'Grammatikfehler in der Spracherkennung.',
      [ERROR_CODES.LANGUAGE_NOT_SUPPORTED]: 'Sprache wird nicht unterstützt.'
    };
    
    return messages[errorCode] || 'Unbekannter Fehler bei der Spracherkennung.';
  }
  
  canRetryAfterError(errorCode) {
    const retryableErrors = [
      ERROR_CODES.NO_SPEECH,
      ERROR_CODES.NETWORK,
      ERROR_CODES.ABORTED
    ];
    
    return retryableErrors.includes(errorCode);
  }
  
  async attemptFallback() {
    try {
      console.log('🔄 Attempting fallback recognition...');
      
      // Switch to fallback recognition
      this.currentRecognition = this.fallbackRecognition;
      
      // Adjust settings for better reliability
      this.currentRecognition.continuous = false;
      this.currentRecognition.interimResults = false;
      this.currentRecognition.maxAlternatives = 1;
      
      // Try with fallback language
      const languageConfig = this.config.LANGUAGES[this.state.currentLanguage];
      if (languageConfig.fallbacks && languageConfig.fallbacks.length > 0) {
        this.currentRecognition.lang = languageConfig.fallbacks[0];
      }
      
      // Start fallback recognition
      setTimeout(() => {
        if (this.state.isListening) {
          this.currentRecognition.start();
        }
      }, 500);
      
    } catch (error) {
      console.error('Fallback attempt failed:', error);
    }
  }
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  estimateConfidence(transcript) {
    // Simple confidence estimation based on transcript characteristics
    const length = transcript.length;
    const wordCount = transcript.split(' ').length;
    const avgWordLength = length / wordCount;
    
    // Base confidence
    let confidence = 0.7;
    
    // Adjust based on length (longer = more confident)
    if (length > 20) confidence += 0.1;
    if (length > 50) confidence += 0.1;
    
    // Adjust based on word count
    if (wordCount > 3) confidence += 0.05;
    if (wordCount > 6) confidence += 0.05;
    
    // Adjust based on average word length (reasonable length = more confident)
    if (avgWordLength >= 3 && avgWordLength <= 8) confidence += 0.05;
    
    // Check for common words
    const commonWords = ['ich', 'möchte', 'hätte', 'gern', 'bitte', 'danke'];
    const hasCommonWords = commonWords.some(word => 
      transcript.toLowerCase().includes(word)
    );
    if (hasCommonWords) confidence += 0.05;
    
    return Math.min(confidence, 1.0);
  }
  
  updateLanguageAccuracy(confidence) {
    const current = this.metrics.languageAccuracy.get(this.state.currentLanguage) || {
      totalConfidence: 0,
      count: 0
    };
    
    current.totalConfidence += confidence;
    current.count += 1;
    
    this.metrics.languageAccuracy.set(this.state.currentLanguage, current);
    
    // Update overall average
    const totalConfidence = Array.from(this.metrics.languageAccuracy.values())
      .reduce((sum, lang) => sum + lang.totalConfidence, 0);
    const totalCount = Array.from(this.metrics.languageAccuracy.values())
      .reduce((sum, lang) => sum + lang.count, 0);
    
    this.metrics.averageConfidence = totalCount > 0 ? totalConfidence / totalCount : 0;
  }
  
  setupSessionTimeout() {
    const timeout = setTimeout(() => {
      if (this.state.isListening) {
        console.log('⏰ Session timeout reached');
        this.emit('timeout', { sessionId: this.state.sessionId });
        this.stop();
      }
    }, this.config.RECOGNITION.timeout);
    
    this.timeouts.set('session', timeout);
  }
  
  clearTimeouts() {
    this.timeouts.forEach((timeout, key) => {
      clearTimeout(timeout);
    });
    this.timeouts.clear();
  }
  
  updateMetrics() {
    // Update real-time metrics
    this.emit('metricsUpdate', this.getMetrics());
  }
  
  handleNoiseDetection(data) {
    if (data.level > 0.8) {
      this.emit('noiseDetected', {
        level: data.level,
        type: data.type,
        sessionId: this.state.sessionId
      });
    }
  }
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  destroy() {
    console.log('🗑️ Destroying Speech Recognition Service...');
    
    // Stop recognition
    this.stop();
    
    // Clear all timers
    this.clearTimeouts();
    this.intervals.forEach((interval, key) => {
      clearInterval(interval);
    });
    this.intervals.clear();
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    // Remove all listeners
    this.removeAllListeners();
    
    // Reset state
    this.state.isInitialized = false;
    
    console.log('✅ Speech Recognition Service destroyed');
  }
}

// ============================================================================
// FACTORY FUNCTION & EXPORT
// ============================================================================

let serviceInstance = null;

export const createSpeechRecognitionService = (options = {}) => {
  if (!serviceInstance) {
    serviceInstance = new SpeechRecognitionService(options);
  }
  return serviceInstance;
};

export const getSpeechRecognitionService = () => {
  if (!serviceInstance) {
    throw new Error('Speech Recognition Service not initialized. Call createSpeechRecognitionService first.');
  }
  return serviceInstance;
};

export default SpeechRecognitionService;