/**
 * EATECH - Voice Preferences Hook
 * Version: 4.2.0
 * Description: Unified voice preferences management with full multi-language support
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/hooks/useVoicePreferences.js
 * 
 * Features:
 * - Multi-language voice support (DE, IT, EN, FR + CH variants)
 * - Persistent settings with localStorage and cloud sync
 * - Real-time preference updates with debouncing
 * - Voice calibration and testing capabilities
 * - Advanced accessibility features
 * - Performance monitoring integration
 * - Lazy loading support for language processors
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';

// ============================================================================
// CONSTANTS & LANGUAGE DEFINITIONS
// ============================================================================

const SUPPORTED_LANGUAGES = {
  // SCHWEIZER SPRACHEN
  'de-CH': {
    name: 'Schweizerdeutsch',
    nativeName: 'Schwiizerdütsch',
    code: 'de-CH',
    flag: '🇨🇭',
    region: 'Schweiz',
    voiceType: 'swiss-german',
    sampleRate: 16000,
    dialects: ['ZH', 'BE', 'BS', 'LU', 'SG', 'AG', 'TG', 'GR', 'SO', 'SH'],
    processorPath: '/utils/voice/SwissGermanProcessor',
    priority: 1,
    confidence: 0.95
  },
  'fr-CH': {
    name: 'Français Suisse',
    nativeName: 'Français (Suisse)',
    code: 'fr-CH',
    flag: '🇨🇭',
    region: 'Suisse romande',
    voiceType: 'swiss-french',
    sampleRate: 16000,
    dialects: ['VD', 'GE', 'NE', 'JU', 'FR', 'VS'],
    processorPath: '/utils/voice/FrenchProcessor',
    priority: 1,
    confidence: 0.92
  },
  'it-CH': {
    name: 'Italiano Svizzero',
    nativeName: 'Italiano (Svizzera)',
    code: 'it-CH',
    flag: '🇨🇭',
    region: 'Svizzera italiana',
    voiceType: 'swiss-italian',
    sampleRate: 16000,
    dialects: ['TI', 'GR'],
    processorPath: '/utils/voice/ItalianProcessor',
    priority: 1,
    confidence: 0.90
  },
  
  // STANDARD SPRACHEN
  'de-DE': {
    name: 'Deutsch',
    nativeName: 'Deutsch',
    code: 'de-DE',
    flag: '🇩🇪',
    region: 'Deutschland',
    voiceType: 'standard-german',
    sampleRate: 16000,
    dialects: ['standard', 'bavarian', 'northern', 'saxon', 'western'],
    processorPath: '/utils/voice/GermanProcessor',
    priority: 2,
    confidence: 0.96
  },
  'de-AT': {
    name: 'Österreichisch',
    nativeName: 'Österreichisches Deutsch',
    code: 'de-AT',
    flag: '🇦🇹',
    region: 'Österreich',
    voiceType: 'austrian-german',
    sampleRate: 16000,
    dialects: ['standard', 'viennese', 'salzburg', 'tyrol'],
    processorPath: '/utils/voice/GermanProcessor',
    priority: 2,
    confidence: 0.94
  },
  'it-IT': {
    name: 'Italiano',
    nativeName: 'Italiano',
    code: 'it-IT',
    flag: '🇮🇹',
    region: 'Italia',
    voiceType: 'standard-italian',
    sampleRate: 16000,
    dialects: ['standard', 'northern', 'central', 'southern'],
    processorPath: '/utils/voice/ItalianProcessor',
    priority: 2,
    confidence: 0.95
  },
  'fr-FR': {
    name: 'Français',
    nativeName: 'Français',
    code: 'fr-FR',
    flag: '🇫🇷',
    region: 'France',
    voiceType: 'standard-french',
    sampleRate: 16000,
    dialects: ['standard', 'northern', 'southern', 'parisian'],
    processorPath: '/utils/voice/FrenchProcessor',
    priority: 2,
    confidence: 0.96
  },
  'en-US': {
    name: 'English (US)',
    nativeName: 'English (United States)',
    code: 'en-US',
    flag: '🇺🇸',
    region: 'United States',
    voiceType: 'american-english',
    sampleRate: 16000,
    dialects: ['general', 'southern', 'midwestern', 'western', 'northeastern'],
    processorPath: '/utils/voice/EnglishProcessor',
    priority: 3,
    confidence: 0.97
  },
  'en-GB': {
    name: 'English (UK)',
    nativeName: 'English (United Kingdom)',
    code: 'en-GB',
    flag: '🇬🇧',
    region: 'United Kingdom',
    voiceType: 'british-english',
    sampleRate: 16000,
    dialects: ['rp', 'cockney', 'scottish', 'welsh', 'northern'],
    processorPath: '/utils/voice/EnglishProcessor',
    priority: 3,
    confidence: 0.96
  }
};

const DEFAULT_PREFERENCES = {
  // Language & Voice Settings
  language: 'de-CH',
  dialect: 'ZH',
  voiceEnabled: true,
  autoDetectLanguage: false,
  fallbackLanguage: 'en-US',
  wakeWord: 'hey eatech',
  
  // Audio Input Settings
  microphone: {
    deviceId: 'default',
    sensitivity: 0.75,
    noiseReduction: true,
    echoCancellation: true,
    autoGainControl: true,
    sampleRate: 16000,
    channels: 1,
    bufferSize: 4096
  },
  
  // Audio Output Settings
  speaker: {
    deviceId: 'default',
    volume: 0.8,
    rate: 1.0,
    pitch: 1.0,
    voice: 'default',
    ssmlEnabled: false
  },
  
  // Recognition Settings
  recognition: {
    continuous: true,
    interimResults: true,
    maxAlternatives: 3,
    confidenceThreshold: 0.7,
    timeoutDuration: 5000,
    partialTimeout: 1000,
    silenceTimeout: 2000,
    maxRecordingTime: 30000
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
    queue: true,
    interrupt: false
  },
  
  // UI & UX Settings
  ui: {
    showWaveform: true,
    showTranscript: true,
    showConfidence: false,
    compactMode: false,
    darkMode: 'auto',
    animations: true,
    notifications: true,
    visualFeedback: true,
    hapticFeedback: false
  },
  
  // Privacy & Security Settings
  privacy: {
    saveTranscripts: false,
    shareAnalytics: true,
    localProcessing: false,
    dataRetention: 30, // days
    anonymizeData: true,
    encryptData: true,
    cloudSync: false
  },
  
  // Advanced Settings
  advanced: {
    customCommands: [],
    shortcuts: {},
    contextualHelp: true,
    smartSuggestions: true,
    learningEnabled: true,
    debugMode: false,
    experimentalFeatures: false,
    multiModal: false
  },
  
  // Accessibility Settings
  accessibility: {
    highContrast: false,
    reducedMotion: false,
    screenReader: false,
    keyboardNavigation: true,
    focusIndicators: true,
    largeText: false,
    voiceGuidance: false,
    alternativeInput: false
  },
  
  // Performance Settings
  performance: {
    offlineMode: false,
    cacheSize: 100, // MB
    preloadModels: true,
    adaptiveQuality: true,
    batteryOptimization: true,
    lowLatencyMode: false,
    compressionEnabled: true
  },
  
  // Tutorial & Help
  tutorial: {
    completed: false,
    skipped: false,
    currentStep: 0,
    showHints: true,
    autoAdvance: true,
    version: '1.0.0'
  },
  
  // Usage Statistics
  stats: {
    totalCommands: 0,
    successfulCommands: 0,
    averageConfidence: 0,
    favoriteCommands: [],
    lastUsed: null,
    totalUsageTime: 0,
    sessionCount: 0,
    errorCount: 0
  }
};

const STORAGE_KEYS = {
  LOCAL: 'eatech_voice_preferences',
  CLOUD: 'voice_preferences_v2',
  BACKUP: 'eatech_voice_preferences_backup',
  CACHE: 'voice_preferences_cache'
};

const VALIDATION_RULES = {
  microphone: {
    sensitivity: { min: 0, max: 1 },
    sampleRate: [8000, 16000, 22050, 44100, 48000],
    bufferSize: [1024, 2048, 4096, 8192, 16384]
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
    partialTimeout: { min: 500, max: 5000 },
    maxRecordingTime: { min: 5000, max: 300000 }
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
// CUSTOM HOOK IMPLEMENTATION
// ============================================================================

export const useVoicePreferences = () => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const { user } = useAuth();
  const { tenant } = useTenant();
  
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'syncing', 'synced', 'error'
  
  // Refs for performance optimization
  const preferencesRef = useRef(preferences);
  const saveTimeoutRef = useRef(null);
  const lastSyncRef = useRef(null);
  
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const isOnline = useMemo(() => navigator.onLine, []);
  
  const deviceCapabilities = useMemo(() => ({
    speechRecognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
    speechSynthesis: 'speechSynthesis' in window,
    mediaDevices: 'mediaDevices' in navigator,
    getUserMedia: navigator.mediaDevices && 'getUserMedia' in navigator.mediaDevices,
    webAudio: 'AudioContext' in window || 'webkitAudioContext' in window,
    notification: 'Notification' in window,
    vibrate: 'vibrate' in navigator,
    wakeLock: 'wakeLock' in navigator
  }), []);
  
  const currentLanguageConfig = useMemo(() => 
    SUPPORTED_LANGUAGES[preferences.language] || SUPPORTED_LANGUAGES['de-CH'],
    [preferences.language]
  );
  
  const supportedLanguages = useMemo(() => {
    // Filter by device capabilities and tenant settings
    return Object.entries(SUPPORTED_LANGUAGES)
      .filter(([code, config]) => {
        // Basic device support check
        if (!deviceCapabilities.speechRecognition) return false;
        
        // Tenant-specific language restrictions
        if (tenant?.supportedLanguages && !tenant.supportedLanguages.includes(code)) {
          return false;
        }
        
        return true;
      })
      .sort(([, a], [, b]) => a.priority - b.priority)
      .reduce((acc, [code, config]) => {
        acc[code] = config;
        return acc;
      }, {});
  }, [deviceCapabilities, tenant]);
  
  const currentProfile = useMemo(() => {
    if (!preferences.voiceEnabled) return 'disabled';
    if (preferences.privacy.localProcessing) return 'private';
    if (preferences.performance.offlineMode) return 'offline';
    if (preferences.advanced.experimentalFeatures) return 'experimental';
    if (preferences.accessibility.screenReader) return 'accessible';
    return 'standard';
  }, [preferences]);
  
  // ============================================================================
  // VALIDATION FUNCTIONS
  // ============================================================================
  
  const validatePreferences = useCallback((newPreferences) => {
    const errors = {};
    
    try {
      // Validate microphone settings
      const micSensitivity = newPreferences.microphone?.sensitivity;
      if (typeof micSensitivity === 'number') {
        if (micSensitivity < VALIDATION_RULES.microphone.sensitivity.min || 
            micSensitivity > VALIDATION_RULES.microphone.sensitivity.max) {
          errors.microphone = errors.microphone || {};
          errors.microphone.sensitivity = `Must be between ${VALIDATION_RULES.microphone.sensitivity.min} and ${VALIDATION_RULES.microphone.sensitivity.max}`;
        }
      }
      
      const sampleRate = newPreferences.microphone?.sampleRate;
      if (sampleRate && !VALIDATION_RULES.microphone.sampleRate.includes(sampleRate)) {
        errors.microphone = errors.microphone || {};
        errors.microphone.sampleRate = `Must be one of: ${VALIDATION_RULES.microphone.sampleRate.join(', ')}`;
      }
      
      // Validate speaker settings
      const volume = newPreferences.speaker?.volume;
      if (typeof volume === 'number') {
        if (volume < VALIDATION_RULES.speaker.volume.min || 
            volume > VALIDATION_RULES.speaker.volume.max) {
          errors.speaker = errors.speaker || {};
          errors.speaker.volume = `Must be between ${VALIDATION_RULES.speaker.volume.min} and ${VALIDATION_RULES.speaker.volume.max}`;
        }
      }
      
      const rate = newPreferences.speaker?.rate;
      if (typeof rate === 'number') {
        if (rate < VALIDATION_RULES.speaker.rate.min || 
            rate > VALIDATION_RULES.speaker.rate.max) {
          errors.speaker = errors.speaker || {};
          errors.speaker.rate = `Must be between ${VALIDATION_RULES.speaker.rate.min} and ${VALIDATION_RULES.speaker.rate.max}`;
        }
      }
      
      // Validate recognition settings
      const confidenceThreshold = newPreferences.recognition?.confidenceThreshold;
      if (typeof confidenceThreshold === 'number') {
        if (confidenceThreshold < VALIDATION_RULES.recognition.confidenceThreshold.min || 
            confidenceThreshold > VALIDATION_RULES.recognition.confidenceThreshold.max) {
          errors.recognition = errors.recognition || {};
          errors.recognition.confidenceThreshold = `Must be between ${VALIDATION_RULES.recognition.confidenceThreshold.min} and ${VALIDATION_RULES.recognition.confidenceThreshold.max}`;
        }
      }
      
      // Validate language support
      if (!SUPPORTED_LANGUAGES[newPreferences.language]) {
        errors.language = `Unsupported language: ${newPreferences.language}`;
      }
      
      // Validate data retention
      const dataRetention = newPreferences.privacy?.dataRetention;
      if (typeof dataRetention === 'number') {
        if (dataRetention < VALIDATION_RULES.privacy.dataRetention.min || 
            dataRetention > VALIDATION_RULES.privacy.dataRetention.max) {
          errors.privacy = errors.privacy || {};
          errors.privacy.dataRetention = `Must be between ${VALIDATION_RULES.privacy.dataRetention.min} and ${VALIDATION_RULES.privacy.dataRetention.max} days`;
        }
      }
      
    } catch (validationError) {
      console.error('Validation error:', validationError);
      errors.general = 'Validation failed due to unexpected error';
    }
    
    return errors;
  }, []);
  
  // ============================================================================
  // STORAGE FUNCTIONS
  // ============================================================================
  
  const saveToLocalStorage = useCallback((data) => {
    try {
      const serialized = JSON.stringify({
        ...data,
        version: '4.2.0',
        lastModified: new Date().toISOString(),
        deviceId: getDeviceId()
      });
      localStorage.setItem(STORAGE_KEYS.LOCAL, serialized);
      
      // Create backup
      localStorage.setItem(STORAGE_KEYS.BACKUP, serialized);
      
      return true;
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      return false;
    }
  }, []);
  
  const loadFromLocalStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LOCAL);
      if (!stored) return null;
      
      const parsed = JSON.parse(stored);
      
      // Version migration if needed
      if (parsed.version !== '4.2.0') {
        return migratePreferences(parsed);
      }
      
      return parsed;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      
      // Try backup
      try {
        const backup = localStorage.getItem(STORAGE_KEYS.BACKUP);
        if (backup) {
          return JSON.parse(backup);
        }
      } catch (backupError) {
        console.error('Failed to load backup:', backupError);
      }
      
      return null;
    }
  }, []);
  
  const syncToCloud = useCallback(async (data) => {
    if (!user || !preferences.privacy.cloudSync || !isOnline) {
      return false;
    }
    
    try {
      setSyncStatus('syncing');
      
      // Implement cloud sync logic here
      // This would typically involve calling an API
      const response = await fetch('/api/voice-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          userId: user.id,
          tenantId: tenant?.id,
          preferences: data,
          version: '4.2.0',
          timestamp: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        setSyncStatus('synced');
        lastSyncRef.current = new Date().toISOString();
        return true;
      } else {
        throw new Error(`Sync failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Cloud sync failed:', error);
      setSyncStatus('error');
      return false;
    }
  }, [user, tenant, preferences.privacy.cloudSync, isOnline]);
  
  // ============================================================================
  // PREFERENCE MANAGEMENT
  // ============================================================================
  
  const updatePreferences = useCallback((updates) => {
    setPreferences(current => {
      const newPreferences = typeof updates === 'function' ? updates(current) : { ...current, ...updates };
      
      // Validate new preferences
      const errors = validatePreferences(newPreferences);
      setValidationErrors(errors);
      
      if (Object.keys(errors).length > 0) {
        console.warn('Preference validation errors:', errors);
        return current; // Don't update if validation fails
      }
      
      // Update ref for performance
      preferencesRef.current = newPreferences;
      setIsDirty(true);
      
      // Debounced save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        savePreferences(newPreferences);
      }, 500);
      
      return newPreferences;
    });
  }, [validatePreferences]);
  
  const savePreferences = useCallback(async (data = preferences) => {
    setIsSaving(true);
    setError(null);
    
    try {
      // Save to localStorage first (always available)
      const localSaved = saveToLocalStorage(data);
      
      if (!localSaved) {
        throw new Error('Failed to save to local storage');
      }
      
      // Attempt cloud sync if enabled
      if (preferences.privacy.cloudSync) {
        await syncToCloud(data);
      }
      
      setIsDirty(false);
      
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setError(error.message);
    } finally {
      setIsSaving(false);
    }
  }, [preferences, saveToLocalStorage, syncToCloud]);
  
  const resetPreferences = useCallback(() => {
    const confirmed = window.confirm('Are you sure you want to reset all voice preferences to default values?');
    
    if (confirmed) {
      setPreferences(DEFAULT_PREFERENCES);
      setValidationErrors({});
      setError(null);
      setIsDirty(true);
      
      // Clear storage
      localStorage.removeItem(STORAGE_KEYS.LOCAL);
      localStorage.removeItem(STORAGE_KEYS.BACKUP);
      localStorage.removeItem(STORAGE_KEYS.CACHE);
    }
  }, []);
  
  // ============================================================================
  // LANGUAGE MANAGEMENT
  // ============================================================================
  
  const setLanguage = useCallback(async (languageCode) => {
    if (!SUPPORTED_LANGUAGES[languageCode]) {
      throw new Error(`Unsupported language: ${languageCode}`);
    }
    
    const oldLanguage = preferences.language;
    
    updatePreferences(current => ({
      ...current,
      language: languageCode,
      dialect: SUPPORTED_LANGUAGES[languageCode].dialects[0] // Use first dialect as default
    }));
    
    // Lazy load language processor if needed
    try {
      const processorPath = SUPPORTED_LANGUAGES[languageCode].processorPath;
      const { default: LanguageProcessor } = await import(processorPath);
      
      // Initialize processor for new language
      if (LanguageProcessor && typeof LanguageProcessor.initialize === 'function') {
        await LanguageProcessor.initialize({
          language: languageCode,
          dialect: SUPPORTED_LANGUAGES[languageCode].dialects[0]
        });
      }
      
    } catch (error) {
      console.error(`Failed to load language processor for ${languageCode}:`, error);
      
      // Rollback on error
      updatePreferences(current => ({
        ...current,
        language: oldLanguage
      }));
      
      throw new Error(`Failed to switch to ${languageCode}: Language processor not available`);
    }
  }, [preferences.language, updatePreferences]);
  
  const setDialect = useCallback((dialect) => {
    const currentLang = SUPPORTED_LANGUAGES[preferences.language];
    
    if (!currentLang || !currentLang.dialects.includes(dialect)) {
      throw new Error(`Unsupported dialect: ${dialect} for language ${preferences.language}`);
    }
    
    updatePreferences(current => ({
      ...current,
      dialect
    }));
  }, [preferences.language, updatePreferences]);
  
  // ============================================================================
  // DEVICE MANAGEMENT
  // ============================================================================
  
  const getAvailableDevices = useCallback(async () => {
    if (!deviceCapabilities.mediaDevices || !deviceCapabilities.getUserMedia) {
      return { microphones: [], speakers: [] };
    }
    
    try {
      // Request permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const microphones = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
          groupId: device.groupId
        }));
      
      const speakers = devices
        .filter(device => device.kind === 'audiooutput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Speaker ${device.deviceId.slice(0, 8)}`,
          groupId: device.groupId
        }));
      
      return { microphones, speakers };
      
    } catch (error) {
      console.error('Failed to get available devices:', error);
      return { microphones: [], speakers: [] };
    }
  }, [deviceCapabilities]);
  
  const testMicrophone = useCallback(async () => {
    if (!deviceCapabilities.getUserMedia) {
      throw new Error('Microphone access not supported');
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: preferences.microphone.deviceId !== 'default' ? 
            { exact: preferences.microphone.deviceId } : undefined,
          sampleRate: preferences.microphone.sampleRate,
          channelCount: preferences.microphone.channels,
          echoCancellation: preferences.microphone.echoCancellation,
          noiseSuppression: preferences.microphone.noiseReduction,
          autoGainControl: preferences.microphone.autoGainControl
        }
      });
      
      return new Promise((resolve) => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        microphone.connect(analyser);
        analyser.fftSize = 256;
        
        let maxLevel = 0;
        let avgLevel = 0;
        let samples = 0;
        
        const checkLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          const level = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length / 255;
          
          maxLevel = Math.max(maxLevel, level);
          avgLevel = (avgLevel * samples + level) / (samples + 1);
          samples++;
          
          if (samples < 100) { // Test for ~3 seconds
            requestAnimationFrame(checkLevel);
          } else {
            stream.getTracks().forEach(track => track.stop());
            audioContext.close();
            
            resolve({
              maxLevel,
              avgLevel,
              quality: avgLevel > 0.1 ? 'good' : avgLevel > 0.05 ? 'fair' : 'poor',
              working: maxLevel > 0.01
            });
          }
        };
        
        setTimeout(checkLevel, 100);
      });
      
    } catch (error) {
      console.error('Microphone test failed:', error);
      throw error;
    }
  }, [preferences.microphone, deviceCapabilities.getUserMedia]);
  
  // ============================================================================
  // STATISTICS & ANALYTICS
  // ============================================================================
  
  const updateStats = useCallback((statsUpdate) => {
    updatePreferences(current => ({
      ...current,
      stats: {
        ...current.stats,
        ...statsUpdate,
        lastUsed: new Date().toISOString()
      }
    }));
  }, [updatePreferences]);
  
  const getUsageStatistics = useCallback(() => {
    const stats = preferences.stats;
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
      sessionCount: stats.sessionCount,
      errorCount: stats.errorCount,
      lastUsed: stats.lastUsed
    };
  }, [preferences.stats]);
  
  // ============================================================================
  // IMPORT/EXPORT
  // ============================================================================
  
  const exportPreferences = useCallback(() => {
    const exportData = {
      version: '4.2.0',
      timestamp: new Date().toISOString(),
      preferences: preferencesRef.current,
      deviceCapabilities,
      profile: currentProfile,
      supportedLanguages: Object.keys(supportedLanguages)
    };
    
    return JSON.stringify(exportData, null, 2);
  }, [deviceCapabilities, currentProfile, supportedLanguages]);
  
  const importPreferences = useCallback((jsonString) => {
    try {
      const importData = JSON.parse(jsonString);
      
      if (!importData.preferences) {
        throw new Error('Invalid preferences format');
      }
      
      // Validate imported preferences
      const errors = validatePreferences(importData.preferences);
      if (Object.keys(errors).length > 0) {
        throw new Error(`Invalid preferences: ${Object.values(errors).flat().join(', ')}`);
      }
      
      // Merge with current preferences (keeping stats)
      const mergedPreferences = {
        ...importData.preferences,
        stats: preferences.stats // Keep current stats
      };
      
      setPreferences(mergedPreferences);
      setIsDirty(true);
      
      return true;
    } catch (error) {
      console.error('Failed to import preferences:', error);
      setError(`Import failed: ${error.message}`);
      return false;
    }
  }, [validatePreferences, preferences.stats]);
  
  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  const getDeviceId = useCallback(() => {
    let deviceId = localStorage.getItem('eatech_device_id');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
      localStorage.setItem('eatech_device_id', deviceId);
    }
    return deviceId;
  }, []);
  
  const migratePreferences = useCallback((oldPreferences) => {
    // Handle migration from older versions
    console.log('Migrating preferences from version:', oldPreferences.version);
    
    // Add any migration logic here for different versions
    const migrated = {
      ...DEFAULT_PREFERENCES,
      ...oldPreferences,
      version: '4.2.0'
    };
    
    return migrated;
  }, []);
  
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  useEffect(() => {
    const initializePreferences = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Load from localStorage first
        const stored = loadFromLocalStorage();
        
        if (stored) {
          // Validate and set preferences
          const errors = validatePreferences(stored);
          setValidationErrors(errors);
          
          if (Object.keys(errors).length === 0) {
            setPreferences(stored);
          } else {
            console.warn('Stored preferences invalid, using defaults');
            setPreferences(DEFAULT_PREFERENCES);
          }
        } else {
          // No stored preferences, use defaults
          setPreferences(DEFAULT_PREFERENCES);
        }
        
        // Try to sync from cloud if enabled and online
        if (user && isOnline && (stored?.privacy?.cloudSync ?? DEFAULT_PREFERENCES.privacy.cloudSync)) {
          try {
            const response = await fetch(`/api/voice-preferences?userId=${user.id}`, {
              headers: {
                'Authorization': `Bearer ${user.token}`
              }
            });
            
            if (response.ok) {
              const cloudPreferences = await response.json();
              
              // Use cloud preferences if they're newer
              if (!stored || new Date(cloudPreferences.lastModified) > new Date(stored.lastModified)) {
                const errors = validatePreferences(cloudPreferences.preferences);
                
                if (Object.keys(errors).length === 0) {
                  setPreferences(cloudPreferences.preferences);
                  saveToLocalStorage(cloudPreferences.preferences);
                }
              }
            }
          } catch (cloudError) {
            console.warn('Failed to load cloud preferences:', cloudError);
          }
        }
        
      } catch (error) {
        console.error('Failed to initialize preferences:', error);
        setError(error.message);
        setPreferences(DEFAULT_PREFERENCES);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializePreferences();
  }, [user, isOnline, loadFromLocalStorage, saveToLocalStorage, validatePreferences]);
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);
  
  // ============================================================================
  // RETURN API
  // ============================================================================
  
  return {
    // Current state
    preferences,
    language: preferences.language,
    dialect: preferences.dialect,
    voiceEnabled: preferences.voiceEnabled,
    volume: preferences.speaker.volume,
    rate: preferences.speaker.rate,
    currentLanguageConfig,
    currentProfile,
    
    // Computed values
    supportedLanguages,
    deviceCapabilities,
    isOnline,
    
    // Status
    isLoading,
    isSaving,
    isDirty,
    error,
    validationErrors,
    syncStatus,
    
    // Actions
    updatePreferences,
    savePreferences,
    resetPreferences,
    setLanguage,
    setDialect,
    
    // Device management
    getAvailableDevices,
    testMicrophone,
    
    // Statistics
    updateStats,
    getUsageStatistics,
    
    // Import/Export
    exportPreferences,
    importPreferences,
    
    // Validation
    validatePreferences
  };
};

export default useVoicePreferences;