/**
 * EATECH - Voice Settings Component
 * Version: 4.1.0
 * Description: Comprehensive voice configuration modal with accessibility
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/features/voice/components/VoiceSettings.jsx
 * 
 * Features:
 * - Voice and language configuration
 * - Audio settings (volume, rate, pitch)
 * - Accessibility options
 * - Privacy settings
 * - Microphone testing
 * - Export/import settings
 * - Real-time preview
 */

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo, 
  useRef,
  lazy,
  Suspense
} from 'react';
import {
  Settings, X, Volume2, Mic, Globe, Accessibility,
  Shield, Download, Upload, TestTube, RotateCcw,
  Check, AlertCircle, Info, HelpCircle, Play,
  Pause, VolumeX, MicOff, Save, Loader
} from 'lucide-react';
import styles from './VoiceSettings.module.css';

// Lazy loaded components
const VoiceWaveform = lazy(() => import('./VoiceWaveform'));
const MicrophoneTest = lazy(() => import('./MicrophoneTest'));

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const VOICE_SETTINGS_CONFIG = {
  LANGUAGES: {
    'de-CH': {
      name: 'Schweizerdeutsch',
      flag: '🇨🇭',
      voices: ['de-CH-LeniNeural', 'de-CH-JanNeural'],
      testPhrase: 'Grüezi! Ich bin Ihr EATECH Sprachassistent.',
      description: 'Optimiert für Schweizer Dialekte und Begriffe'
    },
    'de-DE': {
      name: 'Deutsch',
      flag: '🇩🇪',
      voices: ['de-DE-KatjaNeural', 'de-DE-ConradNeural'],
      testPhrase: 'Guten Tag! Ich bin Ihr EATECH Sprachassistent.',
      description: 'Standard Hochdeutsch'
    },
    'fr-CH': {
      name: 'Français (Suisse)',
      flag: '🇫🇷',
      voices: ['fr-CH-ArianeNeural', 'fr-CH-FabriceNeural'],
      testPhrase: 'Bonjour! Je suis votre assistant vocal EATECH.',
      description: 'Français avec accent suisse'
    },
    'it-CH': {
      name: 'Italiano (Svizzera)',
      flag: '🇮🇹',
      voices: ['it-CH-LyndaNeural', 'it-CH-FrancescaNeural'],
      testPhrase: 'Ciao! Sono il vostro assistente vocale EATECH.',
      description: 'Italiano con accento svizzero'
    },
    'en-US': {
      name: 'English',
      flag: '🇺🇸',
      voices: ['en-US-AriaNeural', 'en-US-DavisNeural'],
      testPhrase: 'Hello! I am your EATECH voice assistant.',
      description: 'American English'
    }
  },
  
  PRIVACY_LEVELS: {
    HIGH: {
      level: 'high',
      name: 'Hoch',
      description: 'Maximaler Datenschutz, keine Cloud-Verarbeitung',
      features: {
        cloudProcessing: false,
        voiceData: false,
        analytics: false,
        personalizedTips: false
      }
    },
    MEDIUM: {
      level: 'medium',
      name: 'Mittel',
      description: 'Balanciert zwischen Funktionalität und Datenschutz',
      features: {
        cloudProcessing: false,
        voiceData: true,
        analytics: false,
        personalizedTips: true
      }
    },
    LOW: {
      level: 'low',
      name: 'Niedrig',
      description: 'Alle Features verfügbar',
      features: {
        cloudProcessing: true,
        voiceData: true,
        analytics: true,
        personalizedTips: true
      }
    }
  },
  
  ACCESSIBILITY_OPTIONS: {
    announceActions: 'Aktionen ansagen',
    speakPunctuation: 'Satzzeichen sprechen',
    slowSpeech: 'Langsamere Sprache',
    highContrast: 'Hoher Kontrast',
    largeText: 'Große Schrift',
    reduceMotion: 'Weniger Animationen'
  },
  
  DEFAULTS: {
    language: 'de-CH',
    voiceEnabled: true,
    volume: 0.8,
    rate: 1.0,
    pitch: 1.0,
    microphone: {
      sensitivity: 0.7,
      noiseReduction: true,
      autoGain: true
    },
    privacy: 'medium',
    accessibility: {}
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const VoiceSettings = ({
  isOpen = false,
  onClose,
  language = 'de-CH',
  voiceEnabled = true,
  volume = 0.8,
  rate = 1.0,
  pitch = 1.0,
  onLanguageChange,
  onVoiceToggle,
  onVolumeChange,
  onRateChange,
  onPitchChange,
  onAccessibilityChange,
  onPrivacyChange,
  accessibility = {},
  className = ''
}) => {
  
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [activeTab, setActiveTab] = useState('general');
  const [localSettings, setLocalSettings] = useState({
    language,
    voiceEnabled,
    volume,
    rate,
    pitch,
    privacy: 'medium',
    accessibility: {},
    microphone: {
      sensitivity: 0.7,
      noiseReduction: true,
      autoGain: true
    }
  });
  
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [isTestingMicrophone, setIsTestingMicrophone] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  const [microphoneLevel, setMicrophoneLevel] = useState(0);
  const [microphonePermission, setMicrophonePermission] = useState('prompt');
  
  const modalRef = useRef(null);
  const firstInputRef = useRef(null);
  
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const currentLanguageConfig = useMemo(() => 
    VOICE_SETTINGS_CONFIG.LANGUAGES[localSettings.language] || 
    VOICE_SETTINGS_CONFIG.LANGUAGES['de-CH'],
    [localSettings.language]
  );
  
  const privacyConfig = useMemo(() => 
    VOICE_SETTINGS_CONFIG.PRIVACY_LEVELS[localSettings.privacy.toUpperCase()] || 
    VOICE_SETTINGS_CONFIG.PRIVACY_LEVELS.MEDIUM,
    [localSettings.privacy]
  );
  
  const tabs = useMemo(() => [
    { id: 'general', name: 'Allgemein', icon: Settings },
    { id: 'voice', name: 'Stimme', icon: Volume2 },
    { id: 'microphone', name: 'Mikrofon', icon: Mic },
    { id: 'accessibility', name: 'Barrierefreiheit', icon: Accessibility },
    { id: 'privacy', name: 'Datenschutz', icon: Shield }
  ], []);
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  useEffect(() => {
    if (isOpen) {
      // Load available voices
      loadAvailableVoices();
      
      // Focus management
      if (firstInputRef.current) {
        firstInputRef.current.focus();
      }
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Check microphone permission
      checkMicrophonePermission();
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  useEffect(() => {
    // Update local settings when props change
    setLocalSettings(prev => ({
      ...prev,
      language,
      voiceEnabled,
      volume,
      rate,
      pitch
    }));
  }, [language, voiceEnabled, volume, rate, pitch]);
  
  useEffect(() => {
    // Check for changes
    const hasSettingsChanged = 
      localSettings.language !== language ||
      localSettings.voiceEnabled !== voiceEnabled ||
      localSettings.volume !== volume ||
      localSettings.rate !== rate ||
      localSettings.pitch !== pitch;
    
    setHasChanges(hasSettingsChanged);
  }, [localSettings, language, voiceEnabled, volume, rate, pitch]);
  
  // ============================================================================
  // VOICE & MICROPHONE HANDLING
  // ============================================================================
  
  const loadAvailableVoices = useCallback(async () => {
    try {
      if (!window.speechSynthesis) return;
      
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      
      // Select best voice for current language
      const languageVoices = voices.filter(voice => 
        voice.lang.startsWith(localSettings.language.split('-')[0])
      );
      
      if (languageVoices.length > 0) {
        setSelectedVoice(languageVoices[0]);
      }
      
      // Listen for voice changes
      window.speechSynthesis.onvoiceschanged = () => {
        const updatedVoices = window.speechSynthesis.getVoices();
        setAvailableVoices(updatedVoices);
      };
    } catch (error) {
      console.error('Failed to load voices:', error);
    }
  }, [localSettings.language]);
  
  const checkMicrophonePermission = useCallback(async () => {
    try {
      const permission = await navigator.permissions.query({ name: 'microphone' });
      setMicrophonePermission(permission.state);
      
      permission.addEventListener('change', () => {
        setMicrophonePermission(permission.state);
      });
    } catch (error) {
      console.warn('Could not check microphone permission:', error);
    }
  }, []);
  
  const testVoice = useCallback(async () => {
    if (!selectedVoice || isTestingVoice) return;
    
    setIsTestingVoice(true);
    
    try {
      const utterance = new SpeechSynthesisUtterance(currentLanguageConfig.testPhrase);
      utterance.voice = selectedVoice;
      utterance.volume = localSettings.volume;
      utterance.rate = localSettings.rate;
      utterance.pitch = localSettings.pitch;
      
      utterance.onend = () => setIsTestingVoice(false);
      utterance.onerror = () => setIsTestingVoice(false);
      
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Voice test failed:', error);
      setIsTestingVoice(false);
    }
  }, [selectedVoice, currentLanguageConfig.testPhrase, localSettings, isTestingVoice]);
  
  const startMicrophoneTest = useCallback(async () => {
    if (isTestingMicrophone) {
      setIsTestingMicrophone(false);
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsTestingMicrophone(true);
      
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      microphone.connect(analyser);
      analyser.fftSize = 256;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateLevel = () => {
        if (!isTestingMicrophone) {
          stream.getTracks().forEach(track => track.stop());
          audioContext.close();
          setMicrophoneLevel(0);
          return;
        }
        
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        setMicrophoneLevel(average / 255);
        
        requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
    } catch (error) {
      console.error('Microphone test failed:', error);
      setIsTestingMicrophone(false);
    }
  }, [isTestingMicrophone]);
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleSettingChange = useCallback((category, key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [category]: typeof prev[category] === 'object' ? 
        { ...prev[category], [key]: value } : 
        { [key]: value }
    }));
  }, []);
  
  const handleLanguageSelect = useCallback((newLanguage) => {
    setLocalSettings(prev => ({ ...prev, language: newLanguage }));
    
    // Update available voices for new language
    const languageVoices = availableVoices.filter(voice => 
      voice.lang.startsWith(newLanguage.split('-')[0])
    );
    
    if (languageVoices.length > 0) {
      setSelectedVoice(languageVoices[0]);
    }
  }, [availableVoices]);
  
  const handleVoiceSelect = useCallback((voice) => {
    setSelectedVoice(voice);
  }, []);
  
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    
    try {
      // Call all the change handlers
      if (onLanguageChange && localSettings.language !== language) {
        await onLanguageChange(localSettings.language);
      }
      
      if (onVoiceToggle && localSettings.voiceEnabled !== voiceEnabled) {
        await onVoiceToggle(localSettings.voiceEnabled);
      }
      
      if (onVolumeChange && localSettings.volume !== volume) {
        await onVolumeChange(localSettings.volume);
      }
      
      if (onRateChange && localSettings.rate !== rate) {
        await onRateChange(localSettings.rate);
      }
      
      if (onPitchChange && localSettings.pitch !== pitch) {
        await onPitchChange(localSettings.pitch);
      }
      
      if (onAccessibilityChange) {
        await onAccessibilityChange(localSettings.accessibility);
      }
      
      if (onPrivacyChange) {
        await onPrivacyChange(localSettings.privacy);
      }
      
      // Save to localStorage
      localStorage.setItem('voice_settings', JSON.stringify(localSettings));
      
      setHasChanges(false);
      
      // Show success briefly then close
      setTimeout(() => {
        onClose?.();
      }, 500);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  }, [
    localSettings,
    language,
    voiceEnabled,
    volume,
    rate,
    pitch,
    onLanguageChange,
    onVoiceToggle,
    onVolumeChange,
    onRateChange,
    onPitchChange,
    onAccessibilityChange,
    onPrivacyChange,
    onClose
  ]);
  
  const handleReset = useCallback(() => {
    setLocalSettings(VOICE_SETTINGS_CONFIG.DEFAULTS);
    setHasChanges(true);
  }, []);
  
  const handleExportSettings = useCallback(() => {
    const settingsData = {
      ...localSettings,
      exportDate: new Date().toISOString(),
      version: '4.1.0'
    };
    
    const blob = new Blob([JSON.stringify(settingsData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eatech-voice-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }, [localSettings]);
  
  const handleImportSettings = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target.result);
        
        // Validate and merge settings
        const mergedSettings = {
          ...VOICE_SETTINGS_CONFIG.DEFAULTS,
          ...importedSettings
        };
        
        setLocalSettings(mergedSettings);
        setHasChanges(true);
      } catch (error) {
        console.error('Failed to import settings:', error);
        alert('Fehler beim Importieren der Einstellungen');
      }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
  }, []);
  
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      onClose?.();
    }
  }, [onClose]);
  
  const handleModalClick = useCallback((event) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  }, [onClose]);
  
  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  
  const renderTabNavigation = () => (
    <div className={styles.tabNavigation} role="tablist">
      {tabs.map(tab => {
        const IconComponent = tab.icon;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <IconComponent size={18} />
            <span>{tab.name}</span>
          </button>
        );
      })}
    </div>
  );
  
  const renderGeneralTab = () => (
    <div id="panel-general" role="tabpanel" className={styles.tabPanel}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Globe size={20} />
          Sprache & Region
        </h3>
        
        <div className={styles.languageGrid}>
          {Object.entries(VOICE_SETTINGS_CONFIG.LANGUAGES).map(([code, config]) => (
            <button
              key={code}
              className={`${styles.languageCard} ${
                localSettings.language === code ? styles.selected : ''
              }`}
              onClick={() => handleLanguageSelect(code)}
            >
              <span className={styles.flag}>{config.flag}</span>
              <div className={styles.languageInfo}>
                <span className={styles.languageName}>{config.name}</span>
                <span className={styles.languageDescription}>{config.description}</span>
              </div>
              {localSettings.language === code && (
                <Check size={16} className={styles.checkIcon} />
              )}
            </button>
          ))}
        </div>
      </div>
      
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Settings size={20} />
          Grundeinstellungen
        </h3>
        
        <div className={styles.setting}>
          <label className={styles.toggleLabel}>
            <input
              ref={firstInputRef}
              type="checkbox"
              checked={localSettings.voiceEnabled}
              onChange={(e) => setLocalSettings(prev => ({
                ...prev,
                voiceEnabled: e.target.checked
              }))}
              className={styles.toggle}
            />
            <span className={styles.toggleSlider}></span>
            <span className={styles.toggleText}>Sprachsteuerung aktiviert</span>
          </label>
          <p className={styles.settingDescription}>
            Aktiviert die Sprachsteuerung für die gesamte Anwendung
          </p>
        </div>
      </div>
    </div>
  );
  
  const renderVoiceTab = () => (
    <div id="panel-voice" role="tabpanel" className={styles.tabPanel}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Volume2 size={20} />
          Stimmenauswahl
        </h3>
        
        <div className={styles.voiceSelector}>
          <select
            value={selectedVoice?.name || ''}
            onChange={(e) => {
              const voice = availableVoices.find(v => v.name === e.target.value);
              handleVoiceSelect(voice);
            }}
            className={styles.select}
          >
            <option value="">Stimme auswählen...</option>
            {availableVoices
              .filter(voice => voice.lang.startsWith(localSettings.language.split('-')[0]))
              .map(voice => (
                <option key={voice.name} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))
            }
          </select>
          
          <button
            onClick={testVoice}
            disabled={!selectedVoice || isTestingVoice}
            className={styles.testButton}
          >
            {isTestingVoice ? <Loader size={16} className={styles.spinning} /> : <Play size={16} />}
            Test
          </button>
        </div>
        
        <div className={styles.testPhrase}>
          <Info size={16} />
          <span>Testsatz: "{currentLanguageConfig.testPhrase}"</span>
        </div>
      </div>
      
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Audio-Einstellungen</h3>
        
        <div className={styles.sliderGroup}>
          <div className={styles.sliderContainer}>
            <label className={styles.sliderLabel}>
              <Volume2 size={16} />
              Lautstärke: {Math.round(localSettings.volume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={localSettings.volume}
              onChange={(e) => setLocalSettings(prev => ({
                ...prev,
                volume: parseFloat(e.target.value)
              }))}
              className={styles.slider}
            />
          </div>
          
          <div className={styles.sliderContainer}>
            <label className={styles.sliderLabel}>
              Geschwindigkeit: {localSettings.rate.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={localSettings.rate}
              onChange={(e) => setLocalSettings(prev => ({
                ...prev,
                rate: parseFloat(e.target.value)
              }))}
              className={styles.slider}
            />
          </div>
          
          <div className={styles.sliderContainer}>
            <label className={styles.sliderLabel}>
              Tonhöhe: {localSettings.pitch.toFixed(1)}
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={localSettings.pitch}
              onChange={(e) => setLocalSettings(prev => ({
                ...prev,
                pitch: parseFloat(e.target.value)
              }))}
              className={styles.slider}
            />
          </div>
        </div>
      </div>
      
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Live-Vorschau</h3>
        <Suspense fallback={<div className={styles.loading}>Lade Wellenform...</div>}>
          <VoiceWaveform
            isActive={isTestingVoice}
            audioLevel={0.5}
            width={400}
            height={80}
            showControls={false}
          />
        </Suspense>
      </div>
    </div>
  );
  
  const renderMicrophoneTab = () => (
    <div id="panel-microphone" role="tabpanel" className={styles.tabPanel}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Mic size={20} />
          Mikrofon-Test
        </h3>
        
        <div className={styles.microphoneTest}>
          <div className={styles.permissionStatus}>
            <div className={`${styles.permissionIndicator} ${styles[microphonePermission]}`}>
              {microphonePermission === 'granted' ? <Check size={16} /> : 
               microphonePermission === 'denied' ? <X size={16} /> : 
               <HelpCircle size={16} />}
            </div>
            <span>
              Mikrofon-Berechtigung: {
                microphonePermission === 'granted' ? 'Erteilt' :
                microphonePermission === 'denied' ? 'Verweigert' :
                'Ausstehend'
              }
            </span>
          </div>
          
          <button
            onClick={startMicrophoneTest}
            className={`${styles.testButton} ${isTestingMicrophone ? styles.testing : ''}`}
          >
            {isTestingMicrophone ? <MicOff size={16} /> : <Mic size={16} />}
            {isTestingMicrophone ? 'Test beenden' : 'Mikrofon testen'}
          </button>
          
          {isTestingMicrophone && (
            <div className={styles.levelMeter}>
              <div className={styles.levelLabel}>Eingangspegel:</div>
              <div className={styles.levelBar}>
                <div 
                  className={styles.levelFill}
                  style={{ width: `${microphoneLevel * 100}%` }}
                />
              </div>
              <div className={styles.levelValue}>
                {Math.round(microphoneLevel * 100)}%
              </div>
            </div>
          )}
        </div>
        
        <Suspense fallback={<div className={styles.loading}>Lade Mikrofon-Test...</div>}>
          <MicrophoneTest
            isActive={isTestingMicrophone}
            onLevelChange={setMicrophoneLevel}
          />
        </Suspense>
      </div>
      
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Mikrofon-Einstellungen</h3>
        
        <div className={styles.sliderContainer}>
          <label className={styles.sliderLabel}>
            Empfindlichkeit: {Math.round(localSettings.microphone.sensitivity * 100)}%
          </label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={localSettings.microphone.sensitivity}
            onChange={(e) => handleSettingChange('microphone', 'sensitivity', parseFloat(e.target.value))}
            className={styles.slider}
          />
        </div>
        
        <div className={styles.setting}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={localSettings.microphone.noiseReduction}
              onChange={(e) => handleSettingChange('microphone', 'noiseReduction', e.target.checked)}
              className={styles.toggle}
            />
            <span className={styles.toggleSlider}></span>
            <span className={styles.toggleText}>Rauschunterdrückung</span>
          </label>
        </div>
        
        <div className={styles.setting}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={localSettings.microphone.autoGain}
              onChange={(e) => handleSettingChange('microphone', 'autoGain', e.target.checked)}
              className={styles.toggle}
            />
            <span className={styles.toggleSlider}></span>
            <span className={styles.toggleText}>Automatische Verstärkung</span>
          </label>
        </div>
      </div>
    </div>
  );
  
  const renderAccessibilityTab = () => (
    <div id="panel-accessibility" role="tabpanel" className={styles.tabPanel}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Accessibility size={20} />
          Barrierefreiheit
        </h3>
        
        {Object.entries(VOICE_SETTINGS_CONFIG.ACCESSIBILITY_OPTIONS).map(([key, label]) => (
          <div key={key} className={styles.setting}>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={localSettings.accessibility[key] || false}
                onChange={(e) => handleSettingChange('accessibility', key, e.target.checked)}
                className={styles.toggle}
              />
              <span className={styles.toggleSlider}></span>
              <span className={styles.toggleText}>{label}</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
  
  const renderPrivacyTab = () => (
    <div id="panel-privacy" role="tabpanel" className={styles.tabPanel}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Shield size={20} />
          Datenschutz-Niveau
        </h3>
        
        <div className={styles.privacyLevels}>
          {Object.entries(VOICE_SETTINGS_CONFIG.PRIVACY_LEVELS).map(([level, config]) => (
            <label key={level} className={styles.privacyLevel}>
              <input
                type="radio"
                name="privacy"
                value={config.level}
                checked={localSettings.privacy === config.level}
                onChange={(e) => setLocalSettings(prev => ({
                  ...prev,
                  privacy: e.target.value
                }))}
                className={styles.radio}
              />
              <div className={styles.privacyCard}>
                <div className={styles.privacyHeader}>
                  <span className={styles.privacyName}>{config.name}</span>
                  <Check size={16} className={`${styles.checkIcon} ${
                    localSettings.privacy === config.level ? styles.visible : ''
                  }`} />
                </div>
                <p className={styles.privacyDescription}>{config.description}</p>
                
                <div className={styles.privacyFeatures}>
                  {Object.entries(config.features).map(([feature, enabled]) => (
                    <div key={feature} className={styles.privacyFeature}>
                      {enabled ? <Check size={14} /> : <X size={14} />}
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
  
  const renderModalFooter = () => (
    <div className={styles.modalFooter}>
      <div className={styles.footerLeft}>
        <button
          onClick={handleExportSettings}
          className={styles.secondaryButton}
          title="Einstellungen exportieren"
        >
          <Download size={16} />
          Exportieren
        </button>
        
        <label className={styles.secondaryButton} title="Einstellungen importieren">
          <Upload size={16} />
          Importieren
          <input
            type="file"
            accept=".json"
            onChange={handleImportSettings}
            className={styles.hiddenFileInput}
          />
        </label>
        
        <button
          onClick={handleReset}
          className={styles.secondaryButton}
          title="Auf Standardwerte zurücksetzen"
        >
          <RotateCcw size={16} />
          Zurücksetzen
        </button>
      </div>
      
      <div className={styles.footerRight}>
        <button
          onClick={onClose}
          className={styles.cancelButton}
        >
          Abbrechen
        </button>
        
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className={styles.saveButton}
        >
          {isSaving ? (
            <>
              <Loader size={16} className={styles.spinning} />
              Speichern...
            </>
          ) : (
            <>
              <Save size={16} />
              Speichern
            </>
          )}
        </button>
      </div>
    </div>
  );
  
  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  if (!isOpen) return null;
  
  return (
    <div 
      className={`${styles.modalOverlay} ${className}`}
      onClick={handleModalClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-settings-title"
    >
      <div 
        ref={modalRef}
        className={styles.modal}
        role="document"
      >
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <h2 id="voice-settings-title" className={styles.modalTitle}>
            <Settings size={24} />
            Voice-Einstellungen
          </h2>
          
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Einstellungen schließen"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Tab Navigation */}
        {renderTabNavigation()}
        
        {/* Modal Content */}
        <div className={styles.modalContent}>
          {activeTab === 'general' && renderGeneralTab()}
          {activeTab === 'voice' && renderVoiceTab()}
          {activeTab === 'microphone' && renderMicrophoneTab()}
          {activeTab === 'accessibility' && renderAccessibilityTab()}
          {activeTab === 'privacy' && renderPrivacyTab()}
        </div>
        
        {/* Modal Footer */}
        {renderModalFooter()}
        
        {/* Changes Indicator */}
        {hasChanges && (
          <div className={styles.changesIndicator}>
            <AlertCircle size={16} />
            Sie haben ungespeicherte Änderungen
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceSettings;