/**
 * EATECH - Voice Settings Hook
 * Version: 4.1.0
 * Description: Custom hook for managing voice interface settings and preferences
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/features/voice/hooks/useVoiceSettings.js
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { useAuth } from '../../../contexts/AuthContext';
import { voiceSettingsService } from '../services/VoiceSettingsService';
import { debounce } from 'lodash';

// ============================================================================
// CONSTANTS & DEFAULTS
// ============================================================================

const DEFAULT_VOICE_SETTINGS = {
  // General Settings
  enabled: true,
  language: 'de-CH',
  dialect: 'de-CH-ZH',
  wakeWord: 'hey eatech',
  
  // Audio Settings
  microphone: {
    deviceId: 'default',
    sensitivity: 0.7,
    noiseReduction: true,
    echoCancellation: true,
    autoGainControl: true,
    sampleRate: 16000,
    channels: 1
  },
  
  speaker: {
    deviceId: 'default',
    volume: 0.8,
    rate: 1.0,
    pitch: 1.0,
    voice: 'default'
  },
  
  // Recognition Settings
  recognition: {
    continuous: true,
    interimResults: true,
    maxAlternatives: 3,
    confidenceThreshold: 0.7,
    timeoutDuration: 5000,
    partialTimeout: 1000
  },
  
  // Text-to-Speech Settings
  tts: {
    enabled: true,
    confirmations: true,
    errors: true,
    instructions: false,
    rate: 1.0,
    pitch: 1.0,
    volume: 0.8,
    voice: 'default',
    ssmlEnabled: false
  },
  
  // UI Settings
  ui: {
    showWaveform: true,
    showTranscript: true,
    showConfidence: false,
    compactMode: false,
    darkMode: 'auto',
    animations: true,
    notifications: true,
    visualFeedback: true
  },
  
  // Privacy Settings
  privacy: {
    saveTranscripts: false,
    shareAnalytics: true,
    localProcessing: false,
    dataRetention: 30, // days
    anonymizeData: true
  },
  
  // Advanced Settings
  advanced: {
    customCommands: [],
    shortcuts: {},
    contextualHelp: true,
    smartSuggestions: true,
    learningEnabled: true,
    debugMode: false,
    experimentalFeatures: false
  },
  
  // Accessibility Settings
  accessibility: {
    highContrast: false,
    reducedMotion: false,
    screenReader: false,
    keyboardNavigation: true,
    focusIndicators: true,
    largeText: false
  },
  
  // Performance Settings
  performance: {
    offlineMode: false,
    cacheSize: 100, // MB
    preloadModels: true,
    adaptiveQuality: true,
    batteryOptimization: true
  },
  
  // Tutorial & Help
  tutorial: {
    completed: false,
    skipped: false,
    currentStep: 0,
    showHints: true,
    autoAdvance: true
  },
  
  // Statistics
  stats: {
    totalCommands: 0,
    successfulCommands: 0,
    averageConfidence: 0,
    favoriteCommands: [],
    lastUsed: null,
    totalUsageTime: 0
  }
};

const VALIDATION_RULES = {
  microphone: {
    sensitivity: { min: 0, max: 1 },
    sampleRate: [8000, 16000, 22050, 44100, 48000]
  },
  speaker: {
    volume: { min: 0, max: 1 },
    rate: { min: 0.1, max: 3.0 },
    pitch: { min: 0, max: 2 }
  },
  recognition: {
    maxAlternatives: { min: 1, max: 10 },
    confidenceThreshold: { min: 0, max: 1 },
    timeoutDuration: { min: 1000, max: 30000 },
    partialTimeout: { min: 500, max: 5000 }
  },
  tts: {
    rate: { min: 0.1, max: 3.0 },
    pitch: { min: 0, max: 2 },
    volume: { min: 0, max: 1 }
  },
  privacy: {
    dataRetention: { min: 1, max: 365 }
  },
  performance: {
    cacheSize: { min: 10, max: 1000 }
  }
};

// ============================================================================
// CUSTOM HOOK
// ============================================================================

export const useVoiceSettings = () => {
  // ============================================================================
  // HOOKS & STATE
  // ============================================================================
  
  const { user } = useAuth();
  const [localSettings, setLocalSettings] = useLocalStorage('voice_settings', DEFAULT_VOICE_SETTINGS);
  const [settings, setSettings] = useState(DEFAULT_VOICE_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  
  const settingsRef = useRef(settings);
  const saveTimeoutRef = useRef(null);
  
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const isOnline = useMemo(() => navigator.onLine, []);
  
  const deviceCapabilities = useMemo(() => ({
    speechRecognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
    speechSynthesis: 'speechSynthesis' in window,
    mediaDevices: 'mediaDevices' in navigator,
    getUserMedia: 'getUserMedia' in navigator.mediaDevices,
    webAudio: 'AudioContext' in window || 'webkitAudioContext' in window
  }), []);
  
  const currentProfile = useMemo(() => {
    if (!settings.enabled) return 'disabled';
    if (settings.privacy.localProcessing) return 'private';
    if (settings.performance.offlineMode) return 'offline';
    if (settings.advanced.experimentalFeatures) return 'experimental';
    return 'standard';
  }, [settings]);
  
  // ============================================================================
  // VALIDATION
  // ============================================================================
  
  const validateSettings = useCallback((newSettings) => {
    const errors = {};
    
    // Validate microphone settings
    const micSensitivity = newSettings.microphone?.sensitivity;
    if (micSensitivity < VALIDATION_RULES.microphone.sensitivity.min || 
        micSensitivity > VALIDATION_RULES.microphone.sensitivity.max) {
      errors.microphone = errors.microphone || {};
      errors.microphone.sensitivity = 'Sensitivity must be between 0 and 1';
    }
    
    // Validate speaker settings
    const speakerVolume = newSettings.speaker?.volume;
    if (speakerVolume < VALIDATION_RULES.speaker.volume.min || 
        speakerVolume > VALIDATION_RULES.speaker.volume.max) {
      errors.speaker = errors.speaker || {};
      errors.speaker.volume = 'Volume must be between 0 and 1';
    }
    
    const speakerRate = newSettings.speaker?.rate;
    if (speakerRate < VALIDATION_RULES.speaker.rate.min || 
        speakerRate > VALIDATION_RULES.speaker.rate.max) {
      errors.speaker = errors.speaker || {};
      errors.speaker.rate = 'Rate must be between 0.1 and 3.0';
    }
    
    // Validate recognition settings
    const confidence = newSettings.recognition?.confidenceThreshold;
    if (confidence < VALIDATION_RULES.recognition.confidenceThreshold.min || 
        confidence > VALIDATION_RULES.recognition.confidenceThreshold.max) {
      errors.recognition = errors.recognition || {};
      errors.recognition.confidenceThreshold = 'Confidence threshold must be between 0 and 1';
    }
    
    // Validate TTS settings
    const ttsRate = newSettings.tts?.rate;
    if (ttsRate < VALIDATION_RULES.tts.rate.min || 
        ttsRate > VALIDATION_RULES.tts.rate.max) {
      errors.tts = errors.tts || {};
      errors.tts.rate = 'TTS rate must be between 0.1 and 3.0';
    }
    
    return errors;
  }, []);
  
  // ============================================================================
  // SETTINGS MANAGEMENT
  // ============================================================================
  
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      let loadedSettings = { ...DEFAULT_VOICE_SETTINGS, ...localSettings };
      
      // Load from server if user is authenticated
      if (user && isOnline) {
        try {
          const serverSettings = await voiceSettingsService.getUserSettings(user.uid);
          if (serverSettings) {
            loadedSettings = { ...loadedSettings, ...serverSettings };
          }
        } catch (serverError) {
          console.warn('Failed to load server settings, using local settings:', serverError);
        }
      }
      
      // Validate loaded settings
      const errors = validateSettings(loadedSettings);
      setValidationErrors(errors);
      
      if (Object.keys(errors).length === 0) {
        setSettings(loadedSettings);
        settingsRef.current = loadedSettings;
      } else {
        console.warn('Settings validation failed, using defaults:', errors);
        setSettings(DEFAULT_VOICE_SETTINGS);
        settingsRef.current = DEFAULT_VOICE_SETTINGS;
      }
      
    } catch (error) {
      console.error('Failed to load voice settings:', error);
      setError(error.message);
      setSettings(DEFAULT_VOICE_SETTINGS);
      settingsRef.current = DEFAULT_VOICE_SETTINGS;
    } finally {
      setIsLoading(false);
    }
  }, [user, isOnline, localSettings, validateSettings]);
  
  // Debounced save function
  const debouncedSave = useMemo(
    () => debounce(async (settingsToSave) => {
      setIsSaving(true);
      
      try {
        // Save to local storage
        setLocalSettings(settingsToSave);
        
        // Save to server if user is authenticated
        if (user && isOnline) {
          await voiceSettingsService.saveUserSettings(user.uid, settingsToSave);
        }
        
        setIsDirty(false);
        setError(null);
      } catch (error) {
        console.error('Failed to save voice settings:', error);
        setError(error.message);
      } finally {
        setIsSaving(false);
      }
    }, 1000),
    [user, isOnline, setLocalSettings]
  );
  
  const updateSettings = useCallback((newSettings, options = {}) => {
    const { immediate = false, validate = true } = options;
    
    // Merge with current settings
    const mergedSettings = typeof newSettings === 'function' 
      ? newSettings(settingsRef.current)
      : { ...settingsRef.current, ...newSettings };
    
    // Validate if requested
    if (validate) {
      const errors = validateSettings(mergedSettings);
      setValidationErrors(errors);
      
      if (Object.keys(errors).length > 0) {
        setError('Settings validation failed. Please check your input.');
        return false;
      }
    }
    
    // Update state
    setSettings(mergedSettings);
    settingsRef.current = mergedSettings;
    setIsDirty(true);
    
    // Clear any previous save timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Save immediately or debounced
    if (immediate) {
      debouncedSave.cancel();
      saveTimeoutRef.current = setTimeout(() => {
        debouncedSave(mergedSettings);
      }, 100);
    } else {
      debouncedSave(mergedSettings);
    }
    
    return true;
  }, [validateSettings, debouncedSave]);
  
  // ============================================================================
  // PRESET MANAGEMENT
  // ============================================================================
  
  const applyPreset = useCallback((presetName) => {
    const presets = {
      beginner: {
        recognition: { confidenceThreshold: 0.5, continuous: false },
        tts: { confirmations: true, instructions: true },
        ui: { showTranscript: true, showConfidence: true },
        tutorial: { showHints: true, autoAdvance: true }
      },
      
      advanced: {
        recognition: { confidenceThreshold: 0.8, continuous: true, interimResults: true },
        tts: { confirmations: false, instructions: false },
        ui: { showTranscript: false, compactMode: true },
        advanced: { experimentalFeatures: true }
      },
      
      accessibility: {
        tts: { enabled: true, confirmations: true, instructions: true },
        ui: { highContrast: true, largeText: true, visualFeedback: true },
        accessibility: { screenReader: true, keyboardNavigation: true }
      },
      
      privacy: {
        privacy: { saveTranscripts: false, shareAnalytics: false, localProcessing: true },
        advanced: { learningEnabled: false, smartSuggestions: false }
      },
      
      performance: {
        performance: { offlineMode: true, preloadModels: false, adaptiveQuality: false },
        ui: { animations: false, showWaveform: false }
      }
    };
    
    const preset = presets[presetName];
    if (preset) {
      updateSettings(preset, { immediate: true });
      return true;
    }
    
    return false;
  }, [updateSettings]);
  
  // ============================================================================
  // DEVICE MANAGEMENT
  // ============================================================================
  
  const getAvailableDevices = useCallback(async () => {
    if (!deviceCapabilities.getUserMedia) {
      return { microphones: [], speakers: [] };
    }
    
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      return {
        microphones: devices.filter(device => device.kind === 'audioinput'),
        speakers: devices.filter(device => device.kind === 'audiooutput')
      };
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
      return { microphones: [], speakers: [] };
    }
  }, [deviceCapabilities.getUserMedia]);
  
  const testMicrophone = useCallback(async (deviceId = null) => {
    if (!deviceCapabilities.getUserMedia) {
      throw new Error('Microphone access not supported');
    }
    
    try {
      const constraints = {
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          sampleRate: settings.microphone.sampleRate,
          channelCount: settings.microphone.channels,
          echoCancellation: settings.microphone.echoCancellation,
          noiseSuppression: settings.microphone.noiseReduction,
          autoGainControl: settings.microphone.autoGainControl
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Test for 3 seconds
      return new Promise((resolve) => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        
        source.connect(analyser);
        analyser.fftSize = 2048;
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let maxLevel = 0;
        let avgLevel = 0;
        let samples = 0;
        
        const checkAudio = () => {
          analyser.getByteFrequencyData(dataArray);
          const level = Math.max(...dataArray) / 255;
          maxLevel = Math.max(maxLevel, level);
          avgLevel = (avgLevel * samples + level) / (samples + 1);
          samples++;
        };
        
        const interval = setInterval(checkAudio, 100);
        
        setTimeout(() => {
          clearInterval(interval);
          stream.getTracks().forEach(track => track.stop());
          audioContext.close();
          
          resolve({
            maxLevel,
            avgLevel,
            quality: avgLevel > 0.1 ? 'good' : avgLevel > 0.05 ? 'fair' : 'poor',
            working: maxLevel > 0.01
          });
        }, 3000);
      });
      
    } catch (error) {
      console.error('Microphone test failed:', error);
      throw error;
    }
  }, [settings.microphone, deviceCapabilities.getUserMedia]);
  
  // ============================================================================
  // STATISTICS & ANALYTICS
  // ============================================================================
  
  const updateStats = useCallback((statsUpdate) => {
    updateSettings((current) => ({
      ...current,
      stats: {
        ...current.stats,
        ...statsUpdate,
        lastUsed: new Date().toISOString()
      }
    }));
  }, [updateSettings]);
  
  const getUsageStatistics = useCallback(() => {
    const stats = settings.stats;
    const successRate = stats.totalCommands > 0 
      ? (stats.successfulCommands / stats.totalCommands * 100).toFixed(1)
      : 0;
    
    return {
      totalCommands: stats.totalCommands,
      successfulCommands: stats.successfulCommands,
      successRate: parseFloat(successRate),
      averageConfidence: stats.averageConfidence,
      favoriteCommands: stats.favoriteCommands,
      totalUsageTime: stats.totalUsageTime,
      lastUsed: stats.lastUsed
    };
  }, [settings.stats]);
  
  // ============================================================================
  // IMPORT/EXPORT
  // ============================================================================
  
  const exportSettings = useCallback(() => {
    const exportData = {
      version: '4.1.0',
      timestamp: new Date().toISOString(),
      settings: settingsRef.current,
      deviceCapabilities,
      profile: currentProfile
    };
    
    return JSON.stringify(exportData, null, 2);
  }, [deviceCapabilities, currentProfile]);
  
  const importSettings = useCallback((jsonString) => {
    try {
      const importData = JSON.parse(jsonString);
      
      if (!importData.settings) {
        throw new Error('Invalid settings file format');
      }
      
      // Validate imported settings
      const errors = validateSettings(importData.settings);
      if (Object.keys(errors).length > 0) {
        throw new Error('Imported settings contain validation errors');
      }
      
      updateSettings(importData.settings, { immediate: true });
      return true;
      
    } catch (error) {
      console.error('Failed to import settings:', error);
      setError(`Import failed: ${error.message}`);
      return false;
    }
  }, [validateSettings, updateSettings]);
  
  const resetSettings = useCallback((section = null) => {
    if (section) {
      updateSettings((current) => ({
        ...current,
        [section]: DEFAULT_VOICE_SETTINGS[section]
      }), { immediate: true });
    } else {
      updateSettings(DEFAULT_VOICE_SETTINGS, { immediate: true });
    }
  }, [updateSettings]);
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);
  
  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      debouncedSave.cancel();
    };
  }, [debouncedSave]);
  
  // ============================================================================
  // RETURN API
  // ============================================================================
  
  return {
    // Settings state
    settings,
    isLoading,
    isSaving,
    error,
    isDirty,
    validationErrors,
    
    // Settings management
    updateSettings,
    loadSettings,
    resetSettings,
    
    // Presets
    applyPreset,
    
    // Device management
    getAvailableDevices,
    testMicrophone,
    deviceCapabilities,
    
    // Statistics
    updateStats,
    getUsageStatistics,
    
    // Import/Export
    exportSettings,
    importSettings,
    
    // Computed values
    currentProfile,
    isOnline,
    
    // Validation
    validateSettings,
    
    // Constants
    DEFAULT_VOICE_SETTINGS,
    VALIDATION_RULES
  };
};