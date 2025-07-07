/**
 * EATECH - Text-to-Speech Hook
 * Version: 4.3.0
 * Description: Custom hook for text-to-speech with Swiss voice support and advanced features
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/features/voice/hooks/useTextToSpeech.js
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useVoiceSettings } from './useVoiceSettings';
import { TextToSpeechService } from '../services/TextToSpeechService';
import { SwissGermanProcessor } from '../utils/SwissGermanProcessor';
import { SSMLProcessor } from '../utils/SSMLProcessor';
import { debounce } from 'lodash';

// ============================================================================
// CONSTANTS
// ============================================================================

const TTS_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SPEAKING: 'speaking',
  PAUSED: 'paused',
  ERROR: 'error'
};

const VOICE_TYPES = {
  NEURAL: 'neural',
  STANDARD: 'standard',
  WAVENET: 'wavenet',
  CUSTOM: 'custom'
};

const SWISS_VOICES = {
  'de-CH': [
    { name: 'Petra-CH', gender: 'female', quality: 'high', type: VOICE_TYPES.NEURAL },
    { name: 'Marcus-CH', gender: 'male', quality: 'high', type: VOICE_TYPES.NEURAL },
    { name: 'Lina-ZH', gender: 'female', quality: 'premium', dialect: 'Zürich' },
    { name: 'Hans-BE', gender: 'male', quality: 'premium', dialect: 'Bern' },
    { name: 'Anna-BS', gender: 'female', quality: 'premium', dialect: 'Basel' }
  ],
  'fr-CH': [
    { name: 'Céline-CH', gender: 'female', quality: 'high', type: VOICE_TYPES.NEURAL },
    { name: 'Pierre-CH', gender: 'male', quality: 'high', type: VOICE_TYPES.NEURAL }
  ],
  'it-CH': [
    { name: 'Giulia-CH', gender: 'female', quality: 'medium', type: VOICE_TYPES.STANDARD },
    { name: 'Marco-CH', gender: 'male', quality: 'medium', type: VOICE_TYPES.STANDARD }
  ]
};

const PREDEFINED_PHRASES = {
  greetings: {
    'de-CH': [
      'Grüezi! Wie chönd mer Ihne helfe?',
      'Hallo! Was chönd mer für Sie tue?',
      'Güete Tag! Wie gaht\'s Ihne?'
    ],
    'de-DE': [
      'Guten Tag! Wie können wir Ihnen helfen?',
      'Hallo! Was können wir für Sie tun?',
      'Willkommen! Wie geht es Ihnen?'
    ],
    'en-US': [
      'Hello! How can we help you today?',
      'Welcome! What can we do for you?',
      'Good day! How are you doing?'
    ]
  },
  confirmations: {
    'de-CH': [
      'Das han ich verstande',
      'Alles klar',
      'Perfekt, das mache mer'
    ],
    'de-DE': [
      'Das habe ich verstanden',
      'Alles klar',
      'Perfekt, das machen wir'
    ],
    'en-US': [
      'I understood that',
      'Got it',
      'Perfect, we\'ll do that'
    ]
  },
  errors: {
    'de-CH': [
      'Entschuldigung, das han ich nöd verstande',
      'Chönd Sie das wiederhole?',
      'Da isch öppis schiefgange'
    ],
    'de-DE': [
      'Entschuldigung, das habe ich nicht verstanden',
      'Können Sie das wiederholen?',
      'Da ist etwas schiefgelaufen'
    ],
    'en-US': [
      'Sorry, I didn\'t understand that',
      'Could you repeat that?',
      'Something went wrong'
    ]
  }
};

const AUDIO_FORMATS = ['mp3', 'wav', 'ogg', 'webm'];

// ============================================================================
// CUSTOM HOOK
// ============================================================================

export const useTextToSpeech = (options = {}) => {
  // ============================================================================
  // HOOKS & REFS
  // ============================================================================
  
  const { settings, updateStats } = useVoiceSettings();
  const serviceRef = useRef(null);
  const synthRef = useRef(null);
  const currentUtteranceRef = useRef(null);
  const queueRef = useRef([]);
  const processorsRef = useRef({});
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const cacheRef = useRef(new Map());
  
  // ============================================================================
  // STATE
  // ============================================================================
  
  const [state, setState] = useState(TTS_STATES.IDLE);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [error, setError] = useState(null);
  const [queue, setQueue] = useState([]);
  const [volume, setVolume] = useState(settings.tts?.volume || 0.8);
  const [rate, setRate] = useState(settings.tts?.rate || 1.0);
  const [pitch, setPitch] = useState(settings.tts?.pitch || 1.0);
  const [audioData, setAudioData] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const isSupported = useMemo(() => {
    return 'speechSynthesis' in window;
  }, []);
  
  const canSpeak = useMemo(() => {
    return isSupported && 
           settings.tts?.enabled && 
           state !== TTS_STATES.ERROR;
  }, [isSupported, settings.tts?.enabled, state]);
  
  const currentLanguage = useMemo(() => {
    return settings.dialect || settings.language || 'de-CH';
  }, [settings.dialect, settings.language]);
  
  const isSwissGerman = useMemo(() => {
    return currentLanguage.includes('CH');
  }, [currentLanguage]);
  
  const availableVoices = useMemo(() => {
    return voices.filter(voice => {
      const voiceLang = voice.lang.toLowerCase();
      const targetLang = currentLanguage.toLowerCase();
      
      // Exact match first
      if (voiceLang === targetLang) return true;
      
      // Language family match (e.g., de-CH matches de-DE)
      const voiceFamily = voiceLang.split('-')[0];
      const targetFamily = targetLang.split('-')[0];
      
      return voiceFamily === targetFamily;
    });
  }, [voices, currentLanguage]);
  
  const preferredVoice = useMemo(() => {
    if (!availableVoices.length) return null;
    
    // Use selected voice if available
    if (selectedVoice && availableVoices.includes(selectedVoice)) {
      return selectedVoice;
    }
    
    // Try to find Swiss voices for Swiss languages
    if (isSwissGerman) {
      const swissVoice = availableVoices.find(voice => 
        voice.name.includes('CH') || 
        voice.name.includes('Swiss') ||
        SWISS_VOICES[currentLanguage]?.some(sv => voice.name.includes(sv.name.split('-')[0]))
      );
      if (swissVoice) return swissVoice;
    }
    
    // Prefer neural/premium voices
    const neuralVoice = availableVoices.find(voice => 
      voice.name.includes('Neural') || 
      voice.name.includes('Premium') ||
      voice.name.includes('Enhanced')
    );
    if (neuralVoice) return neuralVoice;
    
    // Return first available voice
    return availableVoices[0];
  }, [availableVoices, selectedVoice, isSwissGerman, currentLanguage]);
  
  // ============================================================================
  // VOICE MANAGEMENT
  // ============================================================================
  
  const loadVoices = useCallback(() => {
    if (!isSupported) return;
    
    const synth = window.speechSynthesis;
    let voices = synth.getVoices();
    
    // Some browsers load voices asynchronously
    if (voices.length === 0) {
      synth.addEventListener('voiceschanged', () => {
        voices = synth.getVoices();
        setVoices(voices);
      });
    } else {
      setVoices(voices);
    }
  }, [isSupported]);
  
  const getVoiceInfo = useCallback((voice) => {
    if (!voice) return null;
    
    const isSwissVoice = voice.name.includes('CH') || 
                        voice.name.includes('Swiss') ||
                        SWISS_VOICES[currentLanguage]?.some(sv => 
                          voice.name.includes(sv.name.split('-')[0])
                        );
    
    const quality = voice.name.includes('Neural') ? 'premium' :
                    voice.name.includes('Enhanced') ? 'high' :
                    voice.name.includes('Premium') ? 'high' : 'standard';
    
    return {
      name: voice.name,
      lang: voice.lang,
      gender: voice.name.toLowerCase().includes('female') ? 'female' : 'male',
      quality,
      isSwiss: isSwissVoice,
      isLocal: voice.localService,
      isDefault: voice.default
    };
  }, [currentLanguage]);
  
  // ============================================================================
  // TEXT PROCESSING
  // ============================================================================
  
  const preprocessText = useCallback((text, options = {}) => {
    let processedText = text.trim();
    
    // Process through Swiss German processor if applicable
    if (isSwissGerman && processorsRef.current.swissGerman) {
      processedText = processorsRef.current.swissGerman.preprocessForTTS(processedText);
    }
    
    // Process SSML if enabled
    if (settings.tts?.ssmlEnabled && processorsRef.current.ssml) {
      processedText = processorsRef.current.ssml.process(processedText, {
        voice: preferredVoice,
        rate: options.rate || rate,
        pitch: options.pitch || pitch,
        volume: options.volume || volume
      });
    }
    
    // Handle special replacements
    const replacements = {
      'EATECH': isSwissGerman ? 'Ietäch' : 'Ieteck',
      'CHF': isSwissGerman ? 'Schwiizer Franke' : 'Schweizer Franken',
      'Fr.': isSwissGerman ? 'Franke' : 'Franken',
      '&': isSwissGerman ? 'und' : 'und',
      '@': isSwissGerman ? 'ätt' : 'ätt',
      '%': isSwissGerman ? 'Prozänt' : 'Prozent'
    };
    
    Object.entries(replacements).forEach(([from, to]) => {
      processedText = processedText.replace(new RegExp(from, 'gi'), to);
    });
    
    return processedText;
  }, [isSwissGerman, settings.tts?.ssmlEnabled, preferredVoice, rate, pitch, volume]);
  
  // ============================================================================
  // SPEECH SYNTHESIS
  // ============================================================================
  
  const createUtterance = useCallback((text, options = {}) => {
    const utterance = new SpeechSynthesisUtterance();
    const processedText = preprocessText(text, options);
    
    utterance.text = processedText;
    utterance.voice = options.voice || preferredVoice;
    utterance.rate = options.rate || rate;
    utterance.pitch = options.pitch || pitch;
    utterance.volume = options.volume || volume;
    utterance.lang = options.lang || currentLanguage;
    
    return utterance;
  }, [preprocessText, preferredVoice, rate, pitch, volume, currentLanguage]);
  
  const speak = useCallback(async (text, options = {}) => {
    if (!canSpeak || !text?.trim()) {
      return false;
    }
    
    try {
      setState(TTS_STATES.LOADING);
      setError(null);
      setCurrentText(text);
      
      // Initialize processors if needed
      if (isSwissGerman && !processorsRef.current.swissGerman) {
        processorsRef.current.swissGerman = new SwissGermanProcessor();
      }
      
      if (settings.tts?.ssmlEnabled && !processorsRef.current.ssml) {
        processorsRef.current.ssml = new SSMLProcessor();
      }
      
      // Check cache first
      const cacheKey = `${text}-${JSON.stringify(options)}`;
      if (options.useCache && cacheRef.current.has(cacheKey)) {
        const cachedAudio = cacheRef.current.get(cacheKey);
        await playAudioData(cachedAudio);
        return true;
      }
      
      // Create utterance
      const utterance = createUtterance(text, options);
      currentUtteranceRef.current = utterance;
      
      // Set up event handlers
      utterance.onstart = () => {
        setState(TTS_STATES.SPEAKING);
        setIsPlaying(true);
        setProgress(0);
        
        // Start progress tracking
        const startTime = Date.now();
        const textLength = text.length;
        const estimatedDuration = (textLength / 10) * (2 - (options.rate || rate)) * 1000; // Rough estimate
        setDuration(estimatedDuration);
        
        const progressInterval = setInterval(() => {
          if (!currentUtteranceRef.current) {
            clearInterval(progressInterval);
            return;
          }
          
          const elapsed = Date.now() - startTime;
          const newProgress = Math.min((elapsed / estimatedDuration) * 100, 95);
          setProgress(newProgress);
        }, 100);
        
        utterance.progressInterval = progressInterval;
        
        options.onStart?.();
      };
      
      utterance.onend = () => {
        setState(TTS_STATES.IDLE);
        setIsPlaying(false);
        setProgress(100);
        
        if (utterance.progressInterval) {
          clearInterval(utterance.progressInterval);
        }
        
        currentUtteranceRef.current = null;
        
        // Update stats
        updateStats({
          totalUsageTime: duration || 1000 // Add estimated duration
        });
        
        // Process queue
        processQueue();
        
        options.onEnd?.();
      };
      
      utterance.onerror = (event) => {
        console.error('TTS Error:', event.error);
        setState(TTS_STATES.ERROR);
        setIsPlaying(false);
        setError({
          type: event.error,
          message: `Speech synthesis failed: ${event.error}`,
          timestamp: Date.now()
        });
        
        if (utterance.progressInterval) {
          clearInterval(utterance.progressInterval);
        }
        
        currentUtteranceRef.current = null;
        
        options.onError?.(event.error);
      };
      
      utterance.onpause = () => {
        setIsPaused(true);
        options.onPause?.();
      };
      
      utterance.onresume = () => {
        setIsPaused(false);
        options.onResume?.();
      };
      
      // Speak
      window.speechSynthesis.speak(utterance);
      
      // Record audio if requested
      if (options.recordAudio) {
        await startAudioRecording();
      }
      
      return true;
      
    } catch (error) {
      console.error('Failed to speak text:', error);
      setState(TTS_STATES.ERROR);
      setError({
        type: 'synthesis_error',
        message: error.message,
        timestamp: Date.now()
      });
      return false;
    }
  }, [
    canSpeak,
    isSwissGerman,
    settings.tts?.ssmlEnabled,
    createUtterance,
    rate,
    duration,
    updateStats
  ]);
  
  const stop = useCallback(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    
    setState(TTS_STATES.IDLE);
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
    setCurrentText('');
    
    if (currentUtteranceRef.current?.progressInterval) {
      clearInterval(currentUtteranceRef.current.progressInterval);
    }
    
    currentUtteranceRef.current = null;
    
    // Clear queue
    queueRef.current = [];
    setQueue([]);
    
    // Stop audio recording
    stopAudioRecording();
  }, []);
  
  const pause = useCallback(() => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, []);
  
  const resume = useCallback(() => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  }, []);
  
  // ============================================================================
  // QUEUE MANAGEMENT
  // ============================================================================
  
  const addToQueue = useCallback((text, options = {}) => {
    const queueItem = {
      id: Date.now() + Math.random(),
      text,
      options,
      timestamp: Date.now()
    };
    
    queueRef.current.push(queueItem);
    setQueue([...queueRef.current]);
    
    // Auto-start if not currently speaking
    if (!isPlaying) {
      processQueue();
    }
  }, [isPlaying]);
  
  const processQueue = useCallback(() => {
    if (queueRef.current.length === 0 || isPlaying) return;
    
    const nextItem = queueRef.current.shift();
    setQueue([...queueRef.current]);
    
    if (nextItem) {
      speak(nextItem.text, nextItem.options);
    }
  }, [isPlaying, speak]);
  
  const clearQueue = useCallback(() => {
    queueRef.current = [];
    setQueue([]);
  }, []);
  
  // ============================================================================
  // PREDEFINED PHRASES
  // ============================================================================
  
  const speakGreeting = useCallback((options = {}) => {
    const greetings = PREDEFINED_PHRASES.greetings[currentLanguage] || 
                     PREDEFINED_PHRASES.greetings['en-US'];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    return speak(greeting, options);
  }, [currentLanguage, speak]);
  
  const speakConfirmation = useCallback((options = {}) => {
    const confirmations = PREDEFINED_PHRASES.confirmations[currentLanguage] || 
                         PREDEFINED_PHRASES.confirmations['en-US'];
    const confirmation = confirmations[Math.floor(Math.random() * confirmations.length)];
    return speak(confirmation, options);
  }, [currentLanguage, speak]);
  
  const speakError = useCallback((options = {}) => {
    const errors = PREDEFINED_PHRASES.errors[currentLanguage] || 
                  PREDEFINED_PHRASES.errors['en-US'];
    const error = errors[Math.floor(Math.random() * errors.length)];
    return speak(error, options);
  }, [currentLanguage, speak]);
  
  // ============================================================================
  // AUDIO RECORDING
  // ============================================================================
  
  const startAudioRecording = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      source.connect(analyserRef.current);
      setIsRecording(true);
      
      // Record audio data
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      
      recorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setAudioData(blob);
        setIsRecording(false);
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      
      // Stop recording when TTS ends
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, duration || 5000);
      
    } catch (error) {
      console.error('Failed to start audio recording:', error);
      setIsRecording(false);
    }
  }, [duration]);
  
  const stopAudioRecording = useCallback(() => {
    setIsRecording(false);
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);
  
  const downloadAudio = useCallback(() => {
    if (!audioData) return;
    
    const url = URL.createObjectURL(audioData);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tts-${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [audioData]);
  
  // ============================================================================
  // SETTINGS INTEGRATION
  // ============================================================================
  
  const updateVoiceSettings = useCallback((newSettings) => {
    if (newSettings.rate !== undefined) setRate(newSettings.rate);
    if (newSettings.pitch !== undefined) setPitch(newSettings.pitch);
    if (newSettings.volume !== undefined) setVolume(newSettings.volume);
    if (newSettings.voice !== undefined) setSelectedVoice(newSettings.voice);
  }, []);
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  useEffect(() => {
    loadVoices();
  }, [loadVoices]);
  
  useEffect(() => {
    if (settings.tts) {
      updateVoiceSettings(settings.tts);
    }
  }, [settings.tts, updateVoiceSettings]);
  
  useEffect(() => {
    if (options.onStateChange) {
      options.onStateChange(state);
    }
  }, [state, options.onStateChange]);
  
  useEffect(() => {
    if (error && options.onError) {
      options.onError(error);
    }
  }, [error, options.onError]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
      stopAudioRecording();
    };
  }, [stop, stopAudioRecording]);
  
  // ============================================================================
  // RETURN API
  // ============================================================================
  
  return {
    // State
    state,
    isPlaying,
    isPaused,
    isSupported,
    canSpeak,
    
    // Current speech
    currentText,
    progress,
    duration,
    
    // Voice management
    voices: availableVoices,
    selectedVoice: preferredVoice,
    setSelectedVoice,
    getVoiceInfo,
    
    // Settings
    volume,
    rate,
    pitch,
    setVolume: (v) => setVolume(Math.max(0, Math.min(1, v))),
    setRate: (r) => setRate(Math.max(0.1, Math.min(3, r))),
    setPitch: (p) => setPitch(Math.max(0, Math.min(2, p))),
    
    // Queue
    queue,
    addToQueue,
    clearQueue,
    
    // Error handling
    error,
    clearError: () => setError(null),
    
    // Language info
    currentLanguage,
    isSwissGerman,
    
    // Audio recording
    isRecording,
    audioData,
    downloadAudio,
    
    // Actions
    speak,
    stop,
    pause,
    resume,
    
    // Predefined phrases
    speakGreeting,
    speakConfirmation,
    speakError,
    
    // Text processing
    preprocessText,
    
    // Constants
    TTS_STATES,
    VOICE_TYPES,
    SWISS_VOICES,
    PREDEFINED_PHRASES
  };
};