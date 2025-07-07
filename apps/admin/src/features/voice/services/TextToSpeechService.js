/**
 * EATECH - Text-to-Speech Service
 * Version: 4.3.0
 * Description: Advanced text-to-speech service with Swiss voice support and SSML processing
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/features/voice/services/TextToSpeechService.js
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const TTS_ENGINES = {
  WEB_SPEECH_API: 'webSpeechAPI',
  CLOUD_TTS: 'cloudTTS',
  NEURAL_TTS: 'neuralTTS',
  CUSTOM_ENGINE: 'customEngine'
};

const VOICE_CATEGORIES = {
  STANDARD: 'standard',
  NEURAL: 'neural',
  PREMIUM: 'premium',
  SWISS: 'swiss',
  MULTILINGUAL: 'multilingual'
};

const SWISS_VOICES = {
  'de-CH': [
    {
      name: 'Petra-CH',
      lang: 'de-CH',
      gender: 'female',
      category: VOICE_CATEGORIES.NEURAL,
      quality: 'premium',
      characteristics: ['warm', 'friendly', 'professional'],
      sampleRate: 24000,
      dialectSupport: ['ZH', 'BE', 'BS'],
      emotionSupport: true
    },
    {
      name: 'Marcus-CH',
      lang: 'de-CH',
      gender: 'male',
      category: VOICE_CATEGORIES.NEURAL,
      quality: 'premium',
      characteristics: ['authoritative', 'clear', 'trustworthy'],
      sampleRate: 24000,
      dialectSupport: ['ZH', 'BE'],
      emotionSupport: true
    },
    {
      name: 'Lina-ZH',
      lang: 'de-CH',
      gender: 'female',
      category: VOICE_CATEGORIES.SWISS,
      quality: 'high',
      characteristics: ['youthful', 'energetic', 'local'],
      sampleRate: 16000,
      dialectSupport: ['ZH'],
      emotionSupport: false,
      specialization: 'zurich_dialect'
    },
    {
      name: 'Hans-BE',
      lang: 'de-CH',
      gender: 'male',
      category: VOICE_CATEGORIES.SWISS,
      quality: 'high',
      characteristics: ['traditional', 'calm', 'authentic'],
      sampleRate: 16000,
      dialectSupport: ['BE'],
      emotionSupport: false,
      specialization: 'bern_dialect'
    }
  ],
  'fr-CH': [
    {
      name: 'Céline-CH',
      lang: 'fr-CH',
      gender: 'female',
      category: VOICE_CATEGORIES.NEURAL,
      quality: 'high',
      characteristics: ['elegant', 'sophisticated', 'multilingual'],
      sampleRate: 22050,
      dialectSupport: ['GE', 'VD'],
      emotionSupport: true
    },
    {
      name: 'Pierre-CH',
      lang: 'fr-CH',
      gender: 'male',
      category: VOICE_CATEGORIES.NEURAL,
      quality: 'high',
      characteristics: ['professional', 'articulate', 'confident'],
      sampleRate: 22050,
      dialectSupport: ['GE', 'VD'],
      emotionSupport: true
    }
  ],
  'it-CH': [
    {
      name: 'Giulia-CH',
      lang: 'it-CH',
      gender: 'female',
      category: VOICE_CATEGORIES.STANDARD,
      quality: 'medium',
      characteristics: ['melodic', 'expressive', 'regional'],
      sampleRate: 16000,
      dialectSupport: ['TI'],
      emotionSupport: false
    }
  ]
};

const VOICE_EMOTIONS = {
  NEUTRAL: 'neutral',
  HAPPY: 'happy',
  SAD: 'sad',
  EXCITED: 'excited',
  CALM: 'calm',
  PROFESSIONAL: 'professional',
  FRIENDLY: 'friendly',
  URGENT: 'urgent'
};

const AUDIO_FORMATS = {
  MP3: 'audio/mpeg',
  WAV: 'audio/wav',
  OGG: 'audio/ogg',
  WEBM: 'audio/webm'
};

const PROCESSING_MODES = {
  REALTIME: 'realtime',
  BATCH: 'batch',
  STREAMING: 'streaming',
  OFFLINE: 'offline'
};

// ============================================================================
// TEXT-TO-SPEECH SERVICE CLASS
// ============================================================================

export class TextToSpeechService {
  constructor(options = {}) {
    this.engine = options.engine || TTS_ENGINES.WEB_SPEECH_API;
    this.language = options.language || 'de-CH';
    this.defaultVoice = options.defaultVoice || null;
    this.enableSSML = options.enableSSML !== false;
    this.enableCaching = options.enableCaching !== false;
    this.enableAudioRecording = options.enableAudioRecording !== false;
    
    // Audio configuration
    this.audioContext = null;
    this.outputDevice = null;
    this.audioFormat = options.audioFormat || AUDIO_FORMATS.WAV;
    this.sampleRate = options.sampleRate || 22050;
    
    // Processing configuration
    this.processingMode = options.processingMode || PROCESSING_MODES.REALTIME;
    this.maxConcurrentRequests = options.maxConcurrentRequests || 3;
    this.requestTimeout = options.requestTimeout || 30000;
    
    // Voice management
    this.availableVoices = [];
    this.selectedVoice = null;
    this.voiceLoadPromise = null;
    
    // SSML processor
    this.ssmlProcessor = null;
    
    // Queue management
    this.synthesisQueue = [];
    this.activeRequests = new Set();
    this.isProcessingQueue = false;
    
    // Audio recording
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    
    // Caching
    this.audioCache = new Map();
    this.maxCacheSize = options.maxCacheSize || 50;
    this.cacheExpiryTime = options.cacheExpiryTime || 3600000; // 1 hour
    
    // Performance monitoring
    this.performanceMetrics = {
      totalSynthesis: 0,
      successfulSynthesis: 0,
      failedSynthesis: 0,
      averageLatency: 0,
      cacheHitRate: 0,
      totalAudioGenerated: 0 // in seconds
    };
    
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
        throw new Error('Text-to-speech not supported in this browser');
      }
      
      // Initialize audio context
      await this.initializeAudioContext();
      
      // Load available voices
      await this.loadVoices();
      
      // Initialize SSML processor if enabled
      if (this.enableSSML) {
        await this.initializeSSMLProcessor();
      }
      
      // Set up voice change listener
      this.setupVoiceChangeListener();
      
      console.log('TextToSpeechService initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize TextToSpeechService:', error);
      throw error;
    }
  }
  
  checkBrowserSupport() {
    return 'speechSynthesis' in window;
  }
  
  async initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.sampleRate,
        latencyHint: 'interactive'
      });
      
      console.log('Audio context initialized for TTS');
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }
  
  async loadVoices() {
    return new Promise((resolve) => {
      const loadVoicesAsync = () => {
        const voices = window.speechSynthesis.getVoices();
        
        if (voices.length > 0) {
          this.availableVoices = this.processVoices(voices);
          this.selectOptimalVoice();
          resolve(this.availableVoices);
        } else {
          // Some browsers load voices asynchronously
          setTimeout(loadVoicesAsync, 100);
        }
      };
      
      loadVoicesAsync();
    });
  }
  
  processVoices(voices) {
    const processedVoices = voices.map(voice => {
      const voiceInfo = this.analyzeVoice(voice);
      return {
        ...voiceInfo,
        originalVoice: voice
      };
    });
    
    // Sort voices by quality and language preference
    return processedVoices.sort((a, b) => {
      // Prioritize Swiss voices
      if (a.isSwiss && !b.isSwiss) return -1;
      if (!a.isSwiss && b.isSwiss) return 1;
      
      // Then by language match
      const aLangMatch = a.lang === this.language ? 2 : a.lang.startsWith(this.language.split('-')[0]) ? 1 : 0;
      const bLangMatch = b.lang === this.language ? 2 : b.lang.startsWith(this.language.split('-')[0]) ? 1 : 0;
      
      if (aLangMatch !== bLangMatch) return bLangMatch - aLangMatch;
      
      // Then by quality
      const qualityOrder = { premium: 3, high: 2, medium: 1, low: 0 };
      return (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0);
    });
  }
  
  analyzeVoice(voice) {
    const isSwiss = voice.name.includes('CH') || voice.name.includes('Swiss') || voice.lang.includes('CH');
    const isNeural = voice.name.toLowerCase().includes('neural') || voice.name.toLowerCase().includes('premium');
    
    // Try to find matching Swiss voice configuration
    let swissVoiceConfig = null;
    if (isSwiss) {
      const swissVoices = SWISS_VOICES[voice.lang] || [];
      swissVoiceConfig = swissVoices.find(sv => 
        voice.name.includes(sv.name.split('-')[0])
      );
    }
    
    return {
      name: voice.name,
      lang: voice.lang,
      gender: this.detectGender(voice.name),
      isLocal: voice.localService,
      isDefault: voice.default,
      isSwiss,
      isNeural,
      quality: this.determineQuality(voice, isNeural, isSwiss),
      category: this.determineCategory(voice, isNeural, isSwiss),
      characteristics: swissVoiceConfig?.characteristics || this.inferCharacteristics(voice),
      dialectSupport: swissVoiceConfig?.dialectSupport || [],
      emotionSupport: swissVoiceConfig?.emotionSupport || isNeural,
      sampleRate: swissVoiceConfig?.sampleRate || 16000
    };
  }
  
  detectGender(voiceName) {
    const femaleNames = ['female', 'woman', 'petra', 'lina', 'céline', 'giulia', 'anna', 'sarah', 'emma'];
    const maleNames = ['male', 'man', 'marcus', 'hans', 'pierre', 'thomas', 'david', 'michael'];
    
    const nameLower = voiceName.toLowerCase();
    
    if (femaleNames.some(name => nameLower.includes(name))) return 'female';
    if (maleNames.some(name => nameLower.includes(name))) return 'male';
    
    return 'neutral';
  }
  
  determineQuality(voice, isNeural, isSwiss) {
    if (isNeural) return 'premium';
    if (isSwiss) return 'high';
    if (voice.localService) return 'medium';
    return 'standard';
  }
  
  determineCategory(voice, isNeural, isSwiss) {
    if (isNeural) return VOICE_CATEGORIES.NEURAL;
    if (isSwiss) return VOICE_CATEGORIES.SWISS;
    if (voice.localService) return VOICE_CATEGORIES.STANDARD;
    return VOICE_CATEGORIES.STANDARD;
  }
  
  inferCharacteristics(voice) {
    const characteristics = [];
    const nameLower = voice.name.toLowerCase();
    
    if (nameLower.includes('professional')) characteristics.push('professional');
    if (nameLower.includes('friendly')) characteristics.push('friendly');
    if (nameLower.includes('calm')) characteristics.push('calm');
    if (nameLower.includes('clear')) characteristics.push('clear');
    
    return characteristics.length > 0 ? characteristics : ['neutral'];
  }
  
  selectOptimalVoice() {
    if (this.availableVoices.length === 0) return;
    
    // Use default voice if specified
    if (this.defaultVoice) {
      const defaultVoice = this.availableVoices.find(v => v.name === this.defaultVoice);
      if (defaultVoice) {
        this.selectedVoice = defaultVoice;
        return;
      }
    }
    
    // Find best match for current language
    const languageMatches = this.availableVoices.filter(v => v.lang === this.language);
    
    if (languageMatches.length > 0) {
      this.selectedVoice = languageMatches[0]; // Already sorted by quality
    } else {
      // Fallback to language family match
      const familyMatches = this.availableVoices.filter(v => 
        v.lang.startsWith(this.language.split('-')[0])
      );
      
      this.selectedVoice = familyMatches.length > 0 ? familyMatches[0] : this.availableVoices[0];
    }
  }
  
  async initializeSSMLProcessor() {
    try {
      const { SSMLProcessor } = await import('../utils/SSMLProcessor');
      this.ssmlProcessor = new SSMLProcessor({
        language: this.language,
        enableSwissPhonemes: this.language.includes('CH')
      });
      
      console.log('SSML processor initialized');
    } catch (error) {
      console.error('Failed to initialize SSML processor:', error);
      this.enableSSML = false;
    }
  }
  
  setupVoiceChangeListener() {
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      this.loadVoices().then(() => {
        this.emit('voicesChanged', this.availableVoices);
      });
    });
  }
  
  // ============================================================================
  // SYNTHESIS METHODS
  // ============================================================================
  
  async speak(text, options = {}) {
    const startTime = Date.now();
    this.performanceMetrics.totalSynthesis++;
    
    try {
      // Validate input
      if (!text || typeof text !== 'string') {
        throw new Error('Invalid text input');
      }
      
      // Process options
      const synthesisOptions = this.processSynthesisOptions(options);
      
      // Check cache first
      const cacheKey = this.generateCacheKey(text, synthesisOptions);
      const cachedAudio = this.getCachedAudio(cacheKey);
      
      if (cachedAudio && this.enableCaching) {
        await this.playAudioData(cachedAudio);
        this.performanceMetrics.successfulSynthesis++;
        return { success: true, cached: true, duration: cachedAudio.duration };
      }
      
      // Process text through SSML if enabled
      let processedText = text;
      if (this.enableSSML && this.ssmlProcessor) {
        processedText = this.ssmlProcessor.process(text, synthesisOptions);
      }
      
      // Create synthesis request
      const synthesisRequest = {
        id: this.generateRequestId(),
        text: processedText,
        options: synthesisOptions,
        startTime,
        cacheKey
      };
      
      // Execute synthesis based on processing mode
      let result;
      switch (this.processingMode) {
        case PROCESSING_MODES.REALTIME:
          result = await this.synthesizeRealtime(synthesisRequest);
          break;
        case PROCESSING_MODES.BATCH:
          result = await this.synthesizeBatch(synthesisRequest);
          break;
        case PROCESSING_MODES.STREAMING:
          result = await this.synthesizeStreaming(synthesisRequest);
          break;
        default:
          result = await this.synthesizeRealtime(synthesisRequest);
      }
      
      // Update performance metrics
      const latency = Date.now() - startTime;
      this.updateLatencyMetrics(latency);
      this.performanceMetrics.successfulSynthesis++;
      
      return result;
      
    } catch (error) {
      console.error('TTS synthesis failed:', error);
      this.performanceMetrics.failedSynthesis++;
      throw error;
    }
  }
  
  async synthesizeRealtime(request) {
    return new Promise((resolve, reject) => {
      const utterance = this.createUtterance(request.text, request.options);
      
      utterance.onstart = () => {
        this.emit('speechStart', { requestId: request.id });
        
        // Start recording if enabled
        if (this.enableAudioRecording) {
          this.startRecording();
        }
      };
      
      utterance.onend = () => {
        this.emit('speechEnd', { requestId: request.id });
        
        // Stop recording and cache audio
        if (this.enableAudioRecording && this.isRecording) {
          this.stopRecording().then(audioData => {
            if (audioData && this.enableCaching) {
              this.cacheAudio(request.cacheKey, audioData);
            }
          });
        }
        
        resolve({
          success: true,
          requestId: request.id,
          duration: Date.now() - request.startTime
        });
      };
      
      utterance.onerror = (event) => {
        this.emit('speechError', { requestId: request.id, error: event.error });
        reject(new Error(`TTS Error: ${event.error}`));
      };
      
      utterance.onpause = () => {
        this.emit('speechPause', { requestId: request.id });
      };
      
      utterance.onresume = () => {
        this.emit('speechResume', { requestId: request.id });
      };
      
      // Add to active requests
      this.activeRequests.add(request.id);
      
      // Speak
      window.speechSynthesis.speak(utterance);
      
      // Set timeout
      setTimeout(() => {
        if (this.activeRequests.has(request.id)) {
          this.activeRequests.delete(request.id);
          window.speechSynthesis.cancel();
          reject(new Error('TTS timeout'));
        }
      }, this.requestTimeout);
    });
  }
  
  async synthesizeBatch(request) {
    // Add to queue for batch processing
    return new Promise((resolve, reject) => {
      this.synthesisQueue.push({
        ...request,
        resolve,
        reject
      });
      
      // Start processing queue if not already running
      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }
  
  async synthesizeStreaming(request) {
    // For streaming synthesis (chunked processing)
    const chunks = this.chunkText(request.text);
    const results = [];
    
    for (const chunk of chunks) {
      const chunkRequest = {
        ...request,
        text: chunk,
        id: `${request.id}_chunk_${results.length}`
      };
      
      const result = await this.synthesizeRealtime(chunkRequest);
      results.push(result);
    }
    
    return {
      success: true,
      requestId: request.id,
      chunks: results.length,
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0)
    };
  }
  
  // ============================================================================
  // UTTERANCE CREATION & CONFIGURATION
  // ============================================================================
  
  createUtterance(text, options) {
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set voice
    const voice = options.voice || this.selectedVoice;
    if (voice && voice.originalVoice) {
      utterance.voice = voice.originalVoice;
    }
    
    // Set parameters
    utterance.rate = this.normalizeRate(options.rate || 1.0);
    utterance.pitch = this.normalizePitch(options.pitch || 1.0);
    utterance.volume = this.normalizeVolume(options.volume || 1.0);
    utterance.lang = options.language || this.language;
    
    return utterance;
  }
  
  normalizeRate(rate) {
    return Math.max(0.1, Math.min(10, rate));
  }
  
  normalizePitch(pitch) {
    return Math.max(0, Math.min(2, pitch));
  }
  
  normalizeVolume(volume) {
    return Math.max(0, Math.min(1, volume));
  }
  
  processSynthesisOptions(options) {
    return {
      voice: options.voice || this.selectedVoice,
      rate: options.rate || 1.0,
      pitch: options.pitch || 1.0,
      volume: options.volume || 1.0,
      language: options.language || this.language,
      emotion: options.emotion || VOICE_EMOTIONS.NEUTRAL,
      ssmlEnabled: options.ssmlEnabled !== false && this.enableSSML,
      recordAudio: options.recordAudio !== false && this.enableAudioRecording
    };
  }
  
  // ============================================================================
  // QUEUE PROCESSING
  // ============================================================================
  
  async processQueue() {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;
    
    while (this.synthesisQueue.length > 0 && this.activeRequests.size < this.maxConcurrentRequests) {
      const request = this.synthesisQueue.shift();
      
      try {
        const result = await this.synthesizeRealtime(request);
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }
    
    this.isProcessingQueue = false;
    
    // Continue processing if queue has items and we have capacity
    if (this.synthesisQueue.length > 0 && this.activeRequests.size < this.maxConcurrentRequests) {
      setTimeout(() => this.processQueue(), 100);
    }
  }
  
  // ============================================================================
  // AUDIO RECORDING
  // ============================================================================
  
  async startRecording() {
    if (!this.enableAudioRecording || this.isRecording) return;
    
    try {
      // Create a destination for recording
      const destination = this.audioContext.createMediaStreamDestination();
      
      // This is a simplified recording setup
      // In a real implementation, you'd capture the TTS output
      this.mediaRecorder = new MediaRecorder(destination.stream);
      this.recordedChunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.start();
      this.isRecording = true;
      
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }
  
  async stopRecording() {
    if (!this.isRecording || !this.mediaRecorder) return null;
    
    return new Promise((resolve) => {
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: this.audioFormat });
        const audioData = {
          blob,
          url: URL.createObjectURL(blob),
          duration: blob.size / 1000, // Rough estimate
          timestamp: Date.now()
        };
        
        this.isRecording = false;
        this.recordedChunks = [];
        resolve(audioData);
      };
      
      this.mediaRecorder.stop();
    });
  }
  
  async playAudioData(audioData) {
    if (!audioData.url) return;
    
    const audio = new Audio(audioData.url);
    
    return new Promise((resolve, reject) => {
      audio.onended = resolve;
      audio.onerror = reject;
      audio.play();
    });
  }
  
  // ============================================================================
  // CACHING
  // ============================================================================
  
  generateCacheKey(text, options) {
    const keyData = {
      text: text.toLowerCase().trim(),
      voice: options.voice?.name || 'default',
      rate: Math.round(options.rate * 100) / 100,
      pitch: Math.round(options.pitch * 100) / 100,
      volume: Math.round(options.volume * 100) / 100,
      language: options.language
    };
    
    return btoa(JSON.stringify(keyData)).replace(/[^a-zA-Z0-9]/g, '');
  }
  
  cacheAudio(key, audioData) {
    if (!this.enableCaching) return;
    
    // Manage cache size
    if (this.audioCache.size >= this.maxCacheSize) {
      const oldestKey = this.audioCache.keys().next().value;
      const oldestData = this.audioCache.get(oldestKey);
      
      // Cleanup blob URL to prevent memory leaks
      if (oldestData.url) {
        URL.revokeObjectURL(oldestData.url);
      }
      
      this.audioCache.delete(oldestKey);
    }
    
    this.audioCache.set(key, {
      ...audioData,
      cachedAt: Date.now()
    });
  }
  
  getCachedAudio(key) {
    if (!this.enableCaching) return null;
    
    const cached = this.audioCache.get(key);
    
    if (cached) {
      // Check if cache entry is expired
      if (Date.now() - cached.cachedAt > this.cacheExpiryTime) {
        if (cached.url) {
          URL.revokeObjectURL(cached.url);
        }
        this.audioCache.delete(key);
        return null;
      }
      
      return cached;
    }
    
    return null;
  }
  
  clearCache() {
    // Cleanup all blob URLs
    for (const [key, data] of this.audioCache.entries()) {
      if (data.url) {
        URL.revokeObjectURL(data.url);
      }
    }
    
    this.audioCache.clear();
  }
  
  // ============================================================================
  // VOICE MANAGEMENT
  // ============================================================================
  
  getAvailableVoices(language = null) {
    if (language) {
      return this.availableVoices.filter(voice => 
        voice.lang === language || voice.lang.startsWith(language.split('-')[0])
      );
    }
    
    return this.availableVoices;
  }
  
  getSwissVoices() {
    return this.availableVoices.filter(voice => voice.isSwiss);
  }
  
  selectVoice(voiceName) {
    const voice = this.availableVoices.find(v => v.name === voiceName);
    if (voice) {
      this.selectedVoice = voice;
      return true;
    }
    return false;
  }
  
  getVoiceInfo(voiceName) {
    return this.availableVoices.find(v => v.name === voiceName) || null;
  }
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  chunkText(text, maxChunkSize = 200) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const chunks = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxChunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }
  
  generateRequestId() {
    return `tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  updateLatencyMetrics(latency) {
    const currentAvg = this.performanceMetrics.averageLatency;
    const count = this.performanceMetrics.totalSynthesis;
    
    this.performanceMetrics.averageLatency = 
      (currentAvg * (count - 1) + latency) / count;
  }
  
  // ============================================================================
  // CONTROL METHODS
  // ============================================================================
  
  pause() {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      this.emit('globalPause');
    }
  }
  
  resume() {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      this.emit('globalResume');
    }
  }
  
  cancel() {
    window.speechSynthesis.cancel();
    this.activeRequests.clear();
    this.synthesisQueue = [];
    this.emit('globalCancel');
  }
  
  isPaused() {
    return window.speechSynthesis.paused;
  }
  
  isSpeaking() {
    return window.speechSynthesis.speaking;
  }
  
  // ============================================================================
  // EVENT MANAGEMENT
  // ============================================================================
  
  on(event, callback) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(callback);
  }
  
  off(event, callback) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(callback);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }
  
  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in TTS event handler for ${event}:`, error);
        }
      });
    }
  }
  
  // ============================================================================
  // PERFORMANCE & ANALYTICS
  // ============================================================================
  
  getPerformanceMetrics() {
    const cacheHitRate = this.audioCache.size > 0 ? 
      (this.performanceMetrics.cacheHitRate / this.audioCache.size * 100) : 0;
    
    return {
      ...this.performanceMetrics,
      cacheHitRate: `${cacheHitRate.toFixed(2)}%`,
      successRate: this.performanceMetrics.totalSynthesis > 0 ?
        `${(this.performanceMetrics.successfulSynthesis / this.performanceMetrics.totalSynthesis * 100).toFixed(2)}%` : '0%',
      queueLength: this.synthesisQueue.length,
      activeRequests: this.activeRequests.size,
      cacheSize: this.audioCache.size
    };
  }
  
  resetMetrics() {
    this.performanceMetrics = {
      totalSynthesis: 0,
      successfulSynthesis: 0,
      failedSynthesis: 0,
      averageLatency: 0,
      cacheHitRate: 0,
      totalAudioGenerated: 0
    };
  }
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  destroy() {
    // Cancel all active synthesis
    this.cancel();
    
    // Clear cache and cleanup blob URLs
    this.clearCache();
    
    // Close audio context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    // Clear event handlers
    this.eventHandlers.clear();
    
    // Cleanup media recorder
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }
    
    console.log('TextToSpeechService destroyed');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default TextToSpeechService;

export {
  TTS_ENGINES,
  VOICE_CATEGORIES,
  SWISS_VOICES,
  VOICE_EMOTIONS,
  AUDIO_FORMATS,
  PROCESSING_MODES
};