/**
 * EATECH - Speech Recognition Hook
 * Version: 4.2.0
 * Description: Custom hook for speech recognition with Swiss German support and advanced features
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/features/voice/hooks/useSpeechRecognition.js
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useVoiceSettings } from './useVoiceSettings';
import { SpeechRecognitionService } from '../services/SpeechRecognitionService';
import { SwissGermanProcessor } from '../utils/SwissGermanProcessor';
import { debounce } from 'lodash';

// ============================================================================
// CONSTANTS
// ============================================================================

const RECOGNITION_STATES = {
  IDLE: 'idle',
  STARTING: 'starting',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  ERROR: 'error',
  STOPPING: 'stopping'
};

const ERROR_TYPES = {
  NOT_SUPPORTED: 'not_supported',
  PERMISSION_DENIED: 'permission_denied',
  NO_MICROPHONE: 'no_microphone',
  NETWORK_ERROR: 'network_error',
  TIMEOUT: 'timeout',
  ABORTED: 'aborted',
  AUDIO_CAPTURE: 'audio_capture',
  UNKNOWN: 'unknown'
};

const WAKE_WORDS = [
  'hey eatech',
  'hallo eatech',
  'grüezi eatech',
  'eatech',
  'computer',
  'assistent'
];

const SWISS_WAKE_WORDS = [
  'grüezi eatech',
  'hoi eatech',
  'sali eatech',
  'eatech lueg',
  'eatech mach'
];

// ============================================================================
// CUSTOM HOOK
// ============================================================================

export const useSpeechRecognition = (options = {}) => {
  // ============================================================================
  // HOOKS & REFS
  // ============================================================================
  
  const { settings, updateStats } = useVoiceSettings();
  const recognitionRef = useRef(null);
  const serviceRef = useRef(null);
  const processorsRef = useRef({});
  const timeoutRef = useRef(null);
  const interimTimeoutRef = useRef(null);
  const wakeWordTimeoutRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  
  // ============================================================================
  // STATE
  // ============================================================================
  
  const [state, setState] = useState(RECOGNITION_STATES.IDLE);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [alternatives, setAlternatives] = useState([]);
  const [error, setError] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [noiseLevel, setNoiseLevel] = useState(0);
  const [isWakeWordActive, setIsWakeWordActive] = useState(false);
  const [lastWakeWordTime, setLastWakeWordTime] = useState(null);
  const [sessionStats, setSessionStats] = useState({
    startTime: null,
    totalCommands: 0,
    successfulCommands: 0,
    averageConfidence: 0
  });
  
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const isSupported = useMemo(() => {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }, []);
  
  const canListen = useMemo(() => {
    return isSupported && 
           settings.enabled && 
           state !== RECOGNITION_STATES.ERROR &&
           state !== RECOGNITION_STATES.STARTING &&
           state !== RECOGNITION_STATES.STOPPING;
  }, [isSupported, settings.enabled, state]);
  
  const currentLanguage = useMemo(() => {
    return settings.dialect || settings.language || 'de-CH';
  }, [settings.dialect, settings.language]);
  
  const isSwissGerman = useMemo(() => {
    return currentLanguage.includes('CH');
  }, [currentLanguage]);
  
  const effectiveWakeWords = useMemo(() => {
    const baseWords = isSwissGerman ? 
      [...SWISS_WAKE_WORDS, ...WAKE_WORDS] : 
      WAKE_WORDS;
    
    return [
      ...baseWords,
      settings.wakeWord,
      ...settings.advanced?.customCommands?.map(cmd => cmd.wakeWord).filter(Boolean) || []
    ].filter((word, index, arr) => 
      word && arr.indexOf(word.toLowerCase()) === index
    );
  }, [isSwissGerman, settings.wakeWord, settings.advanced?.customCommands]);
  
  // ============================================================================
  // AUDIO ANALYSIS
  // ============================================================================
  
  const initializeAudioAnalysis = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return false;
    
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: settings.microphone.deviceId !== 'default' ? 
            { exact: settings.microphone.deviceId } : undefined,
          sampleRate: settings.microphone.sampleRate,
          channelCount: settings.microphone.channels,
          echoCancellation: settings.microphone.echoCancellation,
          noiseSuppression: settings.microphone.noiseReduction,
          autoGainControl: settings.microphone.autoGainControl
        }
      });
      
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(streamRef.current);
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.3;
      source.connect(analyserRef.current);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize audio analysis:', error);
      return false;
    }
  }, [settings.microphone]);
  
  const updateAudioLevels = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Calculate RMS level
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length) / 255;
    
    setAudioLevel(rms);
    
    // Update noise level (low-frequency average)
    const lowFreqData = dataArray.slice(0, Math.floor(dataArray.length * 0.1));
    const noiseRms = Math.sqrt(
      lowFreqData.reduce((sum, val) => sum + val * val, 0) / lowFreqData.length
    ) / 255;
    
    setNoiseLevel(noiseRms);
  }, []);
  
  // ============================================================================
  // WAKE WORD DETECTION
  // ============================================================================
  
  const checkWakeWord = useCallback((text) => {
    const normalizedText = text.toLowerCase().trim();
    
    // Process through Swiss German processor if applicable
    let processedText = normalizedText;
    if (isSwissGerman && processorsRef.current.swissGerman) {
      processedText = processorsRef.current.swissGerman.normalizeText(normalizedText);
    }
    
    // Check for wake words
    const foundWakeWord = effectiveWakeWords.find(wakeWord => {
      const normalizedWakeWord = wakeWord.toLowerCase();
      return processedText.includes(normalizedWakeWord) ||
             normalizedText.includes(normalizedWakeWord.replace(/\s+/g, ''));
    });
    
    if (foundWakeWord) {
      setIsWakeWordActive(true);
      setLastWakeWordTime(Date.now());
      
      // Auto-start listening if not already
      if (!isListening && settings.recognition.continuous) {
        startListening({ wakeWordTriggered: true });
      }
      
      // Remove wake word from transcript
      const cleanedText = processedText
        .replace(new RegExp(foundWakeWord.toLowerCase(), 'gi'), '')
        .trim();
      
      return cleanedText || null;
    }
    
    return null;
  }, [isSwissGerman, effectiveWakeWords, isListening, settings.recognition.continuous]);
  
  // ============================================================================
  // SPEECH RECOGNITION HANDLERS
  // ============================================================================
  
  const handleStart = useCallback(() => {
    setState(RECOGNITION_STATES.LISTENING);
    setIsListening(true);
    setError(null);
    
    // Initialize session stats
    if (!sessionStats.startTime) {
      setSessionStats(prev => ({
        ...prev,
        startTime: Date.now()
      }));
    }
    
    // Start audio level monitoring
    const levelInterval = setInterval(updateAudioLevels, 100);
    
    // Set timeout for maximum listening duration
    if (settings.recognition.timeoutDuration > 0) {
      timeoutRef.current = setTimeout(() => {
        stopListening();
      }, settings.recognition.timeoutDuration);
    }
    
    return () => clearInterval(levelInterval);
  }, [settings.recognition.timeoutDuration, sessionStats.startTime, updateAudioLevels]);
  
  const handleResult = useCallback((event) => {
    let interimText = '';
    let finalText = '';
    let bestConfidence = 0;
    let allAlternatives = [];
    
    // Process all results
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence || 0;
      
      if (result.isFinal) {
        finalText += transcript;
        bestConfidence = Math.max(bestConfidence, confidence);
        
        // Collect alternatives
        for (let j = 0; j < Math.min(result.length, settings.recognition.maxAlternatives); j++) {
          allAlternatives.push({
            transcript: result[j].transcript,
            confidence: result[j].confidence || 0
          });
        }
      } else {
        interimText += transcript;
      }
    }
    
    // Update interim results
    if (interimText && settings.recognition.interimResults) {
      setInterimTranscript(interimText);
      
      // Check for wake word in interim results
      const wakeWordResult = checkWakeWord(interimText);
      if (wakeWordResult !== null) {
        setInterimTranscript(wakeWordResult);
      }
      
      // Reset interim timeout
      if (interimTimeoutRef.current) {
        clearTimeout(interimTimeoutRef.current);
      }
      
      interimTimeoutRef.current = setTimeout(() => {
        setInterimTranscript('');
      }, settings.recognition.partialTimeout);
    }
    
    // Process final results
    if (finalText) {
      let processedText = finalText;
      
      // Process through Swiss German processor
      if (isSwissGerman && processorsRef.current.swissGerman) {
        processedText = processorsRef.current.swissGerman.processTranscript(finalText);
      }
      
      // Check for wake word
      const wakeWordResult = checkWakeWord(processedText);
      if (wakeWordResult !== null) {
        processedText = wakeWordResult;
      }
      
      // Only update if we have meaningful content
      if (processedText && processedText.length > 0) {
        setFinalTranscript(processedText);
        setTranscript(processedText);
        setConfidence(bestConfidence);
        setAlternatives(allAlternatives);
        
        // Update session stats
        setSessionStats(prev => {
          const newTotal = prev.totalCommands + 1;
          const newSuccessful = bestConfidence >= settings.recognition.confidenceThreshold ?
            prev.successfulCommands + 1 : prev.successfulCommands;
          const newAvgConfidence = (prev.averageConfidence * prev.totalCommands + bestConfidence) / newTotal;
          
          return {
            ...prev,
            totalCommands: newTotal,
            successfulCommands: newSuccessful,
            averageConfidence: newAvgConfidence
          };
        });
        
        // Update global stats
        updateStats({
          totalCommands: sessionStats.totalCommands + 1,
          successfulCommands: bestConfidence >= settings.recognition.confidenceThreshold ?
            sessionStats.successfulCommands + 1 : sessionStats.successfulCommands,
          averageConfidence: (sessionStats.averageConfidence * sessionStats.totalCommands + bestConfidence) / 
            (sessionStats.totalCommands + 1)
        });
        
        // Auto-stop if not continuous
        if (!settings.recognition.continuous) {
          stopListening();
        }
      }
      
      // Clear interim results
      setInterimTranscript('');
      if (interimTimeoutRef.current) {
        clearTimeout(interimTimeoutRef.current);
      }
    }
  }, [
    settings.recognition.maxAlternatives,
    settings.recognition.interimResults,
    settings.recognition.partialTimeout,
    settings.recognition.confidenceThreshold,
    settings.recognition.continuous,
    isSwissGerman,
    checkWakeWord,
    sessionStats,
    updateStats
  ]);
  
  const handleError = useCallback((event) => {
    console.error('Speech recognition error:', event.error);
    
    let errorType = ERROR_TYPES.UNKNOWN;
    let errorMessage = 'An unknown error occurred';
    
    switch (event.error) {
      case 'not-allowed':
      case 'permission-denied':
        errorType = ERROR_TYPES.PERMISSION_DENIED;
        errorMessage = 'Microphone permission denied. Please allow microphone access.';
        break;
      case 'no-speech':
        errorType = ERROR_TYPES.TIMEOUT;
        errorMessage = 'No speech detected. Please try again.';
        break;
      case 'audio-capture':
        errorType = ERROR_TYPES.AUDIO_CAPTURE;
        errorMessage = 'Microphone not available or audio capture failed.';
        break;
      case 'network':
        errorType = ERROR_TYPES.NETWORK_ERROR;
        errorMessage = 'Network error. Please check your internet connection.';
        break;
      case 'aborted':
        errorType = ERROR_TYPES.ABORTED;
        errorMessage = 'Speech recognition was aborted.';
        break;
      default:
        errorMessage = `Speech recognition error: ${event.error}`;
    }
    
    setError({
      type: errorType,
      message: errorMessage,
      timestamp: Date.now()
    });
    
    setState(RECOGNITION_STATES.ERROR);
    setIsListening(false);
    
    // Auto-retry for certain errors
    if (errorType === ERROR_TYPES.TIMEOUT && settings.recognition.continuous) {
      setTimeout(() => {
        if (canListen) {
          startListening();
        }
      }, 2000);
    }
  }, [settings.recognition.continuous, canListen]);
  
  const handleEnd = useCallback(() => {
    setState(RECOGNITION_STATES.IDLE);
    setIsListening(false);
    
    // Clean up timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (interimTimeoutRef.current) {
      clearTimeout(interimTimeoutRef.current);
      interimTimeoutRef.current = null;
    }
    
    // Auto-restart if continuous mode and wake word is active
    if (settings.recognition.continuous && 
        isWakeWordActive && 
        Date.now() - lastWakeWordTime < 30000) { // 30 second window
      setTimeout(() => {
        if (canListen) {
          startListening();
        }
      }, 1000);
    } else {
      setIsWakeWordActive(false);
    }
  }, [settings.recognition.continuous, isWakeWordActive, lastWakeWordTime, canListen]);
  
  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  const startListening = useCallback(async (options = {}) => {
    if (!canListen) {
      console.warn('Cannot start listening:', { isSupported, enabled: settings.enabled, state });
      return false;
    }
    
    try {
      setState(RECOGNITION_STATES.STARTING);
      setError(null);
      
      // Initialize service if not already done
      if (!serviceRef.current) {
        serviceRef.current = new SpeechRecognitionService();
      }
      
      // Initialize Swiss German processor if needed
      if (isSwissGerman && !processorsRef.current.swissGerman) {
        processorsRef.current.swissGerman = new SwissGermanProcessor();
      }
      
      // Initialize audio analysis
      await initializeAudioAnalysis();
      
      // Configure recognition
      const recognition = serviceRef.current.createRecognition({
        lang: currentLanguage,
        continuous: settings.recognition.continuous,
        interimResults: settings.recognition.interimResults,
        maxAlternatives: settings.recognition.maxAlternatives
      });
      
      // Set up event handlers
      recognition.onstart = handleStart;
      recognition.onresult = handleResult;
      recognition.onerror = handleError;
      recognition.onend = handleEnd;
      
      recognitionRef.current = recognition;
      
      // Start recognition
      recognition.start();
      
      return true;
      
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      setError({
        type: ERROR_TYPES.UNKNOWN,
        message: error.message,
        timestamp: Date.now()
      });
      setState(RECOGNITION_STATES.ERROR);
      return false;
    }
  }, [
    canListen,
    isSupported,
    settings.enabled,
    state,
    isSwissGerman,
    currentLanguage,
    settings.recognition,
    initializeAudioAnalysis,
    handleStart,
    handleResult,
    handleError,
    handleEnd
  ]);
  
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      setState(RECOGNITION_STATES.STOPPING);
      recognitionRef.current.stop();
    }
    
    // Clean up audio analysis
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
  }, [isListening]);
  
  const restartListening = useCallback(async () => {
    if (isListening) {
      stopListening();
      // Wait for stop to complete
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return startListening();
  }, [isListening, stopListening, startListening]);
  
  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setFinalTranscript('');
    setConfidence(0);
    setAlternatives([]);
  }, []);
  
  const clearError = useCallback(() => {
    setError(null);
    if (state === RECOGNITION_STATES.ERROR) {
      setState(RECOGNITION_STATES.IDLE);
    }
  }, [state]);
  
  // Debounced transcript change handler
  const debouncedTranscriptChange = useMemo(
    () => debounce((transcript, confidence, alternatives) => {
      options.onTranscript?.(transcript, confidence, alternatives);
    }, 100),
    [options.onTranscript]
  );
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  useEffect(() => {
    if (transcript && options.onTranscript) {
      debouncedTranscriptChange(transcript, confidence, alternatives);
    }
  }, [transcript, confidence, alternatives, debouncedTranscriptChange]);
  
  useEffect(() => {
    if (error && options.onError) {
      options.onError(error);
    }
  }, [error, options.onError]);
  
  useEffect(() => {
    if (state && options.onStateChange) {
      options.onStateChange(state);
    }
  }, [state, options.onStateChange]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopListening();
      debouncedTranscriptChange.cancel();
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (interimTimeoutRef.current) clearTimeout(interimTimeoutRef.current);
      if (wakeWordTimeoutRef.current) clearTimeout(wakeWordTimeoutRef.current);
    };
  }, [stopListening, debouncedTranscriptChange]);
  
  // ============================================================================
  // RETURN API
  // ============================================================================
  
  return {
    // State
    state,
    isListening,
    isSupported,
    canListen,
    
    // Transcripts
    transcript,
    interimTranscript,
    finalTranscript,
    confidence,
    alternatives,
    
    // Audio analysis
    audioLevel,
    noiseLevel,
    
    // Wake word
    isWakeWordActive,
    effectiveWakeWords,
    
    // Error handling
    error,
    
    // Session data
    sessionStats,
    currentLanguage,
    isSwissGerman,
    
    // Actions
    startListening,
    stopListening,
    restartListening,
    clearTranscript,
    clearError,
    
    // Constants
    RECOGNITION_STATES,
    ERROR_TYPES
  };
};