/**
 * EATECH - Speech Recognition Service
 * Version: 4.2.0
 * Description: Advanced speech recognition service with Swiss German support and WebRTC integration
 * Author: EATECH Development Team
 * Created: 2025-01-08
 *
 * File Path: /apps/web/src/features/voice/services/SpeechRecognitionService.js
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const RECOGNITION_ENGINES = {
  WEB_SPEECH_API: 'webSpeechAPI',
  CUSTOM_ENGINE: 'customEngine',
  CLOUD_API: 'cloudAPI'
};

const SUPPORTED_LANGUAGES = {
  'de-CH': {
    name: 'Swiss German',
    code: 'de-CH',
    fallback: 'de-DE',
    confidence: 0.85,
    customProcessor: true
  },
  'de-DE': {
    name: 'German',
    code: 'de-DE',
    confidence: 0.95,
    customProcessor: false
  },
  'en-US': {
    name: 'English (US)',
    code: 'en-US',
    confidence: 0.97,
    customProcessor: false
  },
  'en-GB': {
    name: 'English (UK)',
    code: 'en-GB',
    confidence: 0.94,
    customProcessor: false
  },
  'fr-CH': {
    name: 'French (Swiss)',
    code: 'fr-CH',
    fallback: 'fr-FR',
    confidence: 0.82,
    customProcessor: true
  },
  'fr-FR': {
    name: 'French',
    code: 'fr-FR',
    confidence: 0.93,
    customProcessor: false
  },
  'it-CH': {
    name: 'Italian (Swiss)',
    code: 'it-CH',
    fallback: 'it-IT',
    confidence: 0.80,
    customProcessor: true
  },
  'it-IT': {
    name: 'Italian',
    code: 'it-IT',
    confidence: 0.91,
    customProcessor: false
  }
};

const AUDIO_CONSTRAINTS = {
  STANDARD: {
    sampleRate: 16000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  },
  HIGH_QUALITY: {
    sampleRate: 44100,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  },
  LOW_LATENCY: {
    sampleRate: 8000,
    channelCount: 1,
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false
  }
};

const ERROR_TYPES = {
  NOT_SUPPORTED: 'not_supported',
  PERMISSION_DENIED: 'permission_denied',
  NO_MICROPHONE: 'no_microphone',
  NETWORK_ERROR: 'network_error',
  TIMEOUT: 'timeout',
  AUDIO_CAPTURE: 'audio_capture',
  LANGUAGE_NOT_SUPPORTED: 'language_not_supported',
  PROCESSING_ERROR: 'processing_error'
};

// ============================================================================
// SPEECH RECOGNITION SERVICE CLASS
// ============================================================================

export class SpeechRecognitionService {
  constructor(options = {}) {
    this.engine = options.engine || RECOGNITION_ENGINES.WEB_SPEECH_API;
    this.language = options.language || 'de-CH';
    this.enableFallback = options.enableFallback !== false;
    this.enablePostProcessing = options.enablePostProcessing !== false;
    this.enableCustomModels = options.enableCustomModels !== false;

    // Audio processing options
    this.audioConstraints = options.audioConstraints || AUDIO_CONSTRAINTS.STANDARD;
    this.enableWebRTC = options.enableWebRTC !== false;
    this.enableNoiseReduction = options.enableNoiseReduction !== false;

    // Recognition instances
    this.recognition = null;
    this.isInitialized = false;
    this.isListening = false;

    // Audio processing
    this.audioContext = null;
    this.mediaStream = null;
    this.analyser = null;
    this.workletNode = null;
    this.audioProcessor = null;

    // WebRTC components
    this.webrtcProcessor = null;
    this.echoCanceller = null;
    this.noiseGate = null;

    // Swiss German processing
    this.swissGermanProcessor = null;
    this.customLanguageModels = new Map();

    // Performance monitoring
    this.performanceMetrics = {
      recognitionLatency: [],
      processingTime: [],
      confidenceScores: [],
      errorCount: 0,
      successCount: 0
    };

    // Cache
    this.resultCache = new Map();
    this.maxCacheSize = 100;

    // Event handlers
    this.eventHandlers = new Map();

    this.initialize();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  async initialize() {
    try {
      // Check browser support
      if (!this.checkBrowserSupport()) {
        throw new Error('Speech recognition not supported in this browser');
      }

      // Initialize audio context
      await this.initializeAudioContext();

      // Initialize WebRTC processing if enabled
      if (this.enableWebRTC) {
        await this.initializeWebRTC();
      }

      // Load custom language models if enabled
      if (this.enableCustomModels) {
        await this.loadCustomLanguageModels();
      }

      // Initialize Swiss German processor if needed
      if (this.language.includes('CH') && this.enablePostProcessing) {
        await this.initializeSwissGermanProcessor();
      }

      this.isInitialized = true;
      console.log('SpeechRecognitionService initialized successfully');

    } catch (error) {
      console.error('Failed to initialize SpeechRecognitionService:', error);
      throw error;
    }
  }

  checkBrowserSupport() {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  async initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.audioConstraints.sampleRate,
        latencyHint: 'interactive'
      });

      // Load audio worklet for advanced processing
      if (this.audioContext.audioWorklet) {
        await this.audioContext.audioWorklet.addModule('/audio-worklets/voice-processor.js');
      }

      console.log('Audio context initialized');
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }

  async initializeWebRTC() {
    try {
      // Initialize WebRTC audio processing
      this.webrtcProcessor = {
        echoCancellation: this.audioConstraints.echoCancellation,
        noiseSuppression: this.audioConstraints.noiseSuppression,
        autoGainControl: this.audioConstraints.autoGainControl
      };

      console.log('WebRTC processing initialized');
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
    }
  }

  async loadCustomLanguageModels() {
    try {
      // Load custom models for Swiss languages
      const swissLanguages = ['de-CH', 'fr-CH', 'it-CH'];

      for (const lang of swissLanguages) {
        if (SUPPORTED_LANGUAGES[lang]?.customProcessor) {
          await this.loadLanguageModel(lang);
        }
      }

      console.log('Custom language models loaded');
    } catch (error) {
      console.error('Failed to load custom language models:', error);
    }
  }

  async loadLanguageModel(language) {
    try {
      // In a real implementation, this would load actual model files
      const modelData = {
        language,
        vocabulary: await this.loadVocabulary(language),
        phonemes: await this.loadPhonemes(language),
        acousticModel: await this.loadAcousticModel(language)
      };

      this.customLanguageModels.set(language, modelData);
      console.log(`Language model loaded for ${language}`);

    } catch (error) {
      console.error(`Failed to load language model for ${language}:`, error);
    }
  }

  async loadVocabulary(language) {
    // Mock vocabulary loading - in production, load from CDN or local storage
    const vocabularies = {
      'de-CH': ['grüezi', 'chuchichäschtli', 'chönd', 'wänd', 'isch', 'git', 'hät'],
      'fr-CH': ['bonjour', 'merci', 'chocolat', 'fromage'],
      'it-CH': ['buongiorno', 'grazie', 'formaggio']
    };

    return vocabularies[language] || [];
  }

  async loadPhonemes(language) {
    // Mock phoneme loading
    const phonemes = {
      'de-CH': {
        'ü': '/y/',
        'ö': '/ø/',
        'ä': '/æ/',
        'ch': '/χ/'
      }
    };

    return phonemes[language] || {};
  }

  async loadAcousticModel(language) {
    // Mock acoustic model loading
    return {
      language,
      confidence: SUPPORTED_LANGUAGES[language]?.confidence || 0.8,
      loaded: true
    };
  }

  async initializeSwissGermanProcessor() {
    try {
      // Import Swiss German processor dynamically
      const { SwissGermanProcessor } = await import('../utils/SwissGermanProcessor');
      this.swissGermanProcessor = new SwissGermanProcessor({
        dialect: this.language.includes('ZH') ? 'ZH' : 'BE'
      });

      console.log('Swiss German processor initialized');
    } catch (error) {
      console.error('Failed to initialize Swiss German processor:', error);
    }
  }

  // ============================================================================
  // RECOGNITION CREATION & CONFIGURATION
  // ============================================================================

  createRecognition(options = {}) {
    const {
      language = this.language,
      continuous = true,
      interimResults = true,
      maxAlternatives = 3
    } = options;

    try {
      // Create recognition instance
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      // Configure recognition
      const targetLanguage = this.getTargetLanguage(language);
      recognition.lang = targetLanguage;
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.maxAlternatives = maxAlternatives;

      // Add performance monitoring
      recognition.addEventListener('start', () => {
        this.performanceMetrics.startTime = Date.now();
      });

      recognition.addEventListener('result', (event) => {
        this.recordPerformanceMetrics(event);
      });

      recognition.addEventListener('error', (event) => {
        this.performanceMetrics.errorCount++;
        console.error('Recognition error:', event.error);
      });

      recognition.addEventListener('end', () => {
        this.isListening = false;
      });

      return recognition;

    } catch (error) {
      console.error('Failed to create recognition instance:', error);
      throw error;
    }
  }

  getTargetLanguage(requestedLanguage) {
    const languageConfig = SUPPORTED_LANGUAGES[requestedLanguage];

    if (!languageConfig) {
      console.warn(`Language ${requestedLanguage} not supported, falling back to de-DE`);
      return 'de-DE';
    }

    // Use fallback for Swiss languages if custom processing is not available
    if (languageConfig.fallback && !this.enableCustomModels) {
      return languageConfig.fallback;
    }

    return languageConfig.code;
  }

  // ============================================================================
  // AUDIO STREAM MANAGEMENT
  // ============================================================================

  async setupAudioStream(deviceId = null) {
    try {
      const constraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          ...this.audioConstraints,
          ...this.webrtcProcessor
        }
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Set up audio processing pipeline
      await this.setupAudioProcessingPipeline();

      return this.mediaStream;

    } catch (error) {
      console.error('Failed to setup audio stream:', error);
      throw this.mapAudioError(error);
    }
  }

  async setupAudioProcessingPipeline() {
    if (!this.audioContext || !this.mediaStream) return;

    try {
      // Create audio source
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create analyser for audio visualization
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.3;

      // Set up processing chain
      let currentNode = source;

      // Add noise gate if enabled
      if (this.enableNoiseReduction) {
        this.noiseGate = await this.createNoiseGate();
        currentNode.connect(this.noiseGate);
        currentNode = this.noiseGate;
      }

      // Add worklet processor if available
      if (this.audioContext.audioWorklet) {
        this.workletNode = new AudioWorkletNode(this.audioContext, 'voice-processor');
        currentNode.connect(this.workletNode);
        currentNode = this.workletNode;
      }

      // Connect to analyser
      currentNode.connect(this.analyser);

      console.log('Audio processing pipeline setup complete');

    } catch (error) {
      console.error('Failed to setup audio processing pipeline:', error);
    }
  }

  async createNoiseGate() {
    // Create a simple noise gate using Web Audio API
    const compressor = this.audioContext.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-50, this.audioContext.currentTime);
    compressor.knee.setValueAtTime(40, this.audioContext.currentTime);
    compressor.ratio.setValueAtTime(12, this.audioContext.currentTime);
    compressor.attack.setValueAtTime(0, this.audioContext.currentTime);
    compressor.release.setValueAtTime(0.25, this.audioContext.currentTime);

    return compressor;
  }

  // ============================================================================
  // RECOGNITION PROCESSING
  // ============================================================================

  async processRecognitionResult(event) {
    const startProcessingTime = Date.now();

    try {
      let results = this.extractResults(event);

      // Apply post-processing if enabled
      if (this.enablePostProcessing) {
        results = await this.postProcessResults(results);
      }

      // Cache results
      this.cacheResults(results);

      // Update performance metrics
      const processingTime = Date.now() - startProcessingTime;
      this.performanceMetrics.processingTime.push(processingTime);
      this.performanceMetrics.successCount++;

      return results;

    } catch (error) {
      console.error('Failed to process recognition result:', error);
      this.performanceMetrics.errorCount++;
      throw error;
    }
  }

  extractResults(event) {
    const results = [];

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const alternatives = [];

      for (let j = 0; j < result.length; j++) {
        alternatives.push({
          transcript: result[j].transcript,
          confidence: result[j].confidence || 0
        });
      }

      results.push({
        isFinal: result.isFinal,
        alternatives,
        timestamp: Date.now()
      });
    }

    return results;
  }

  async postProcessResults(results) {
    const processedResults = [];

    for (const result of results) {
      const processedAlternatives = [];

      for (const alternative of result.alternatives) {
        let processedTranscript = alternative.transcript;
        let adjustedConfidence = alternative.confidence;

        // Apply Swiss German processing if applicable
        if (this.swissGermanProcessor && this.language.includes('CH')) {
          processedTranscript = this.swissGermanProcessor.processTranscript(processedTranscript);
          adjustedConfidence = this.swissGermanProcessor.calculateSwissConfidence(
            alternative.transcript,
            processedTranscript
          );
        }

        // Apply custom language model if available
        if (this.customLanguageModels.has(this.language)) {
          const modelResult = await this.applyLanguageModel(
            processedTranscript,
            this.language
          );
          processedTranscript = modelResult.transcript;
          adjustedConfidence = Math.max(adjustedConfidence, modelResult.confidence);
        }

        // Apply vocabulary boost
        adjustedConfidence = this.applyVocabularyBoost(processedTranscript, adjustedConfidence);

        processedAlternatives.push({
          transcript: processedTranscript,
          confidence: adjustedConfidence,
          original: alternative.transcript
        });
      }

      // Sort alternatives by confidence
      processedAlternatives.sort((a, b) => b.confidence - a.confidence);

      processedResults.push({
        ...result,
        alternatives: processedAlternatives
      });
    }

    return processedResults;
  }

  async applyLanguageModel(transcript, language) {
    const model = this.customLanguageModels.get(language);
    if (!model) {
      return { transcript, confidence: 0 };
    }

    try {
      // Simple vocabulary matching - in production, use more sophisticated NLP
      const words = transcript.toLowerCase().split(' ');
      let vocabularyMatches = 0;

      for (const word of words) {
        if (model.vocabulary.includes(word)) {
          vocabularyMatches++;
        }
      }

      const vocabularyScore = words.length > 0 ? vocabularyMatches / words.length : 0;
      const confidenceBoost = vocabularyScore * 0.2; // Max 20% boost

      return {
        transcript,
        confidence: Math.min(model.acousticModel.confidence + confidenceBoost, 1.0)
      };

    } catch (error) {
      console.error('Language model application failed:', error);
      return { transcript, confidence: 0 };
    }
  }

  applyVocabularyBoost(transcript, baseConfidence) {
    // Boost confidence for known restaurant/food terms
    const boostTerms = [
      'bestellen', 'bestellung', 'menü', 'essen', 'trinken', 'rechnung',
      'tisch', 'reservierung', 'kellner', 'service', 'zahlen', 'karte'
    ];

    const lowerTranscript = transcript.toLowerCase();
    let boost = 0;

    for (const term of boostTerms) {
      if (lowerTranscript.includes(term)) {
        boost += 0.05; // 5% boost per matching term
      }
    }

    return Math.min(baseConfidence + boost, 1.0);
  }

  // ============================================================================
  // AUDIO ANALYSIS
  // ============================================================================

  getAudioLevels() {
    if (!this.analyser) return { level: 0, frequency: [] };

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Get frequency data
    this.analyser.getByteFrequencyData(dataArray);

    // Calculate RMS level
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / bufferLength) / 255;

    return {
      level: rms,
      frequency: Array.from(dataArray),
      timestamp: Date.now()
    };
  }

  detectSpeechActivity() {
    const audioLevels = this.getAudioLevels();
    const threshold = 0.02; // Adjustable speech detection threshold

    return audioLevels.level > threshold;
  }

  // ============================================================================
  // PERFORMANCE MONITORING
  // ============================================================================

  recordPerformanceMetrics(event) {
    if (this.performanceMetrics.startTime) {
      const latency = Date.now() - this.performanceMetrics.startTime;
      this.performanceMetrics.recognitionLatency.push(latency);
    }

    // Record confidence scores
    for (let i = 0; i < event.results.length; i++) {
      const result = event.results[i];
      if (result[0].confidence) {
        this.performanceMetrics.confidenceScores.push(result[0].confidence);
      }
    }

    // Trim arrays to prevent memory growth
    const maxMetrics = 100;
    if (this.performanceMetrics.recognitionLatency.length > maxMetrics) {
      this.performanceMetrics.recognitionLatency =
        this.performanceMetrics.recognitionLatency.slice(-maxMetrics);
    }
    if (this.performanceMetrics.processingTime.length > maxMetrics) {
      this.performanceMetrics.processingTime =
        this.performanceMetrics.processingTime.slice(-maxMetrics);
    }
    if (this.performanceMetrics.confidenceScores.length > maxMetrics) {
      this.performanceMetrics.confidenceScores =
        this.performanceMetrics.confidenceScores.slice(-maxMetrics);
    }
  }

  getPerformanceMetrics() {
    const latencies = this.performanceMetrics.recognitionLatency;
    const processingTimes = this.performanceMetrics.processingTime;
    const confidences = this.performanceMetrics.confidenceScores;

    return {
      averageLatency: latencies.length > 0 ?
        latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
      averageProcessingTime: processingTimes.length > 0 ?
        processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length : 0,
      averageConfidence: confidences.length > 0 ?
        confidences.reduce((a, b) => a + b, 0) / confidences.length : 0,
      successRate: this.performanceMetrics.successCount + this.performanceMetrics.errorCount > 0 ?
        this.performanceMetrics.successCount /
        (this.performanceMetrics.successCount + this.performanceMetrics.errorCount) : 0,
      totalOperations: this.performanceMetrics.successCount + this.performanceMetrics.errorCount
    };
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  cacheResults(results) {
    const cacheKey = this.generateCacheKey(results);

    // Trim cache if too large
    if (this.resultCache.size >= this.maxCacheSize) {
      const firstKey = this.resultCache.keys().next().value;
      this.resultCache.delete(firstKey);
    }

    this.resultCache.set(cacheKey, {
      results,
      timestamp: Date.now()
    });
  }

  generateCacheKey(results) {
    // Generate cache key based on first alternative of first result
    if (results.length > 0 && results[0].alternatives.length > 0) {
      return results[0].alternatives[0].transcript.toLowerCase().trim();
    }
    return `cache_${Date.now()}_${Math.random()}`;
  }

  getCachedResult(transcript) {
    const cacheKey = transcript.toLowerCase().trim();
    const cached = this.resultCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes
      return cached.results;
    }

    return null;
  }

  clearCache() {
    this.resultCache.clear();
  }

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  mapAudioError(error) {
    switch (error.name) {
      case 'NotAllowedError':
        return { type: ERROR_TYPES.PERMISSION_DENIED, message: error.message };
      case 'NotFoundError':
        return { type: ERROR_TYPES.NO_MICROPHONE, message: error.message };
      case 'NotReadableError':
        return { type: ERROR_TYPES.AUDIO_CAPTURE, message: error.message };
      default:
        return { type: ERROR_TYPES.PROCESSING_ERROR, message: error.message };
    }
  }

  // ============================================================================
  // DEVICE MANAGEMENT
  // ============================================================================

  async getAvailableDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audioinput');
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
      return [];
    }
  }

  async testDevice(deviceId) {
    try {
      const stream = await this.setupAudioStream(deviceId);
      const isWorking = stream && stream.active;

      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      return isWorking;
    } catch (error) {
      console.error('Device test failed:', error);
      return false;
    }
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  cleanup() {
    // Stop media stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Clear references
    this.recognition = null;
    this.analyser = null;
    this.workletNode = null;
    this.noiseGate = null;

    // Clear cache
    this.clearCache();

    console.log('SpeechRecognitionService cleanup complete');
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  isSupported() {
    return this.checkBrowserSupport();
  }

  getSupportedLanguages() {
    return Object.keys(SUPPORTED_LANGUAGES);
  }

  setLanguage(language) {
    if (SUPPORTED_LANGUAGES[language]) {
      this.language = language;
      return true;
    }
    return false;
  }

  getLanguageInfo(language = this.language) {
    return SUPPORTED_LANGUAGES[language] || null;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default SpeechRecognitionService;

export {
  AUDIO_CONSTRAINTS,
  ERROR_TYPES, RECOGNITION_ENGINES,
  SUPPORTED_LANGUAGES
};
