/**
 * EATECH - Language Selector Component
 * Version: 4.3.0
 * Description: Advanced language selection for voice interface with Swiss dialect support
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/features/voice/components/LanguageSelector.jsx
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Search,
  Volume2,
  VolumeX,
  Play,
  Square,
  Check,
  Globe,
  Mic,
  Star,
  Clock,
  Download,
  Wifi,
  WifiOff,
  AlertCircle,
  Info,
  X,
  Loader
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useVoiceSettings } from '../hooks/useVoiceSettings';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import styles from './LanguageSelector.module.css';

// ============================================================================
// CONSTANTS & LANGUAGE DATA
// ============================================================================

const LANGUAGE_DATA = {
  'de-CH': {
    name: 'Schweizerdeutsch',
    nativeName: 'Schwiizerdütsch',
    flag: '🇨🇭',
    region: 'Schweiz',
    dialects: [
      { code: 'de-CH-ZH', name: 'Zürichdeutsch', region: 'Zürich' },
      { code: 'de-CH-BE', name: 'Berndeutsch', region: 'Bern' },
      { code: 'de-CH-BS', name: 'Baseldeutsch', region: 'Basel' },
      { code: 'de-CH-LU', name: 'Luzernerdeutsch', region: 'Luzern' },
      { code: 'de-CH-SG', name: 'St. Gallerdeutsch', region: 'St. Gallen' }
    ],
    quality: 'premium',
    accuracy: 92,
    offline: true,
    voiceCount: 12,
    features: ['dictation', 'commands', 'emotion'],
    recommendedFor: ['restaurants', 'hospitality', 'local']
  },
  'de-DE': {
    name: 'Hochdeutsch',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    region: 'Deutschland',
    dialects: [
      { code: 'de-DE-STANDARD', name: 'Standard', region: 'Deutschland' },
      { code: 'de-DE-BAVARIA', name: 'Bayerisch', region: 'Bayern' },
      { code: 'de-DE-SAXON', name: 'Sächsisch', region: 'Sachsen' }
    ],
    quality: 'high',
    accuracy: 95,
    offline: true,
    voiceCount: 18,
    features: ['dictation', 'commands', 'emotion', 'conversation'],
    recommendedFor: ['business', 'corporate', 'international']
  },
  'en-US': {
    name: 'English (US)',
    nativeName: 'English',
    flag: '🇺🇸',
    region: 'United States',
    dialects: [
      { code: 'en-US-STANDARD', name: 'General American', region: 'USA' },
      { code: 'en-US-SOUTHERN', name: 'Southern', region: 'South' },
      { code: 'en-US-WESTERN', name: 'Western', region: 'West' }
    ],
    quality: 'premium',
    accuracy: 97,
    offline: true,
    voiceCount: 24,
    features: ['dictation', 'commands', 'emotion', 'conversation', 'technical'],
    recommendedFor: ['international', 'technology', 'business']
  },
  'en-GB': {
    name: 'English (UK)',
    nativeName: 'British English',
    flag: '🇬🇧',
    region: 'United Kingdom',
    dialects: [
      { code: 'en-GB-STANDARD', name: 'Received Pronunciation', region: 'England' },
      { code: 'en-GB-SCOTTISH', name: 'Scottish', region: 'Scotland' },
      { code: 'en-GB-WELSH', name: 'Welsh', region: 'Wales' }
    ],
    quality: 'high',
    accuracy: 94,
    offline: true,
    voiceCount: 16,
    features: ['dictation', 'commands', 'emotion', 'conversation'],
    recommendedFor: ['formal', 'hospitality', 'luxury']
  },
  'fr-CH': {
    name: 'Français (Suisse)',
    nativeName: 'Français suisse',
    flag: '🇨🇭',
    region: 'Suisse romande',
    dialects: [
      { code: 'fr-CH-STANDARD', name: 'Standard', region: 'Suisse romande' },
      { code: 'fr-CH-GENEVA', name: 'Genevois', region: 'Genève' },
      { code: 'fr-CH-VAUD', name: 'Vaudois', region: 'Vaud' }
    ],
    quality: 'high',
    accuracy: 89,
    offline: false,
    voiceCount: 8,
    features: ['dictation', 'commands'],
    recommendedFor: ['hospitality', 'luxury', 'tourism']
  },
  'it-CH': {
    name: 'Italiano (Svizzera)',
    nativeName: 'Italiano svizzero',
    flag: '🇨🇭',
    region: 'Ticino',
    dialects: [
      { code: 'it-CH-STANDARD', name: 'Standard', region: 'Ticino' },
      { code: 'it-CH-TICINESE', name: 'Ticinese', region: 'Ticino' }
    ],
    quality: 'medium',
    accuracy: 85,
    offline: false,
    voiceCount: 6,
    features: ['dictation', 'commands'],
    recommendedFor: ['regional', 'tourism']
  },
  'fr-FR': {
    name: 'Français',
    nativeName: 'Français',
    flag: '🇫🇷',
    region: 'France',
    dialects: [
      { code: 'fr-FR-STANDARD', name: 'Standard', region: 'France' },
      { code: 'fr-FR-QUEBEC', name: 'Québécois', region: 'Québec' }
    ],
    quality: 'high',
    accuracy: 93,
    offline: true,
    voiceCount: 14,
    features: ['dictation', 'commands', 'emotion', 'conversation'],
    recommendedFor: ['international', 'luxury', 'culture']
  },
  'es-ES': {
    name: 'Español',
    nativeName: 'Español',
    flag: '🇪🇸',
    region: 'España',
    dialects: [
      { code: 'es-ES-STANDARD', name: 'Castellano', region: 'España' },
      { code: 'es-ES-CATALONIA', name: 'Catalán', region: 'Cataluña' }
    ],
    quality: 'high',
    accuracy: 91,
    offline: true,
    voiceCount: 12,
    features: ['dictation', 'commands', 'emotion'],
    recommendedFor: ['international', 'tourism']
  }
};

const QUALITY_BADGES = {
  premium: { color: '#22c55e', label: 'Premium' },
  high: { color: '#3b82f6', label: 'Hoch' },
  medium: { color: '#f59e0b', label: 'Mittel' },
  low: { color: '#ef4444', label: 'Niedrig' }
};

const FEATURE_ICONS = {
  dictation: { icon: Mic, label: 'Diktat' },
  commands: { icon: Volume2, label: 'Befehle' },
  emotion: { icon: Star, label: 'Emotion' },
  conversation: { icon: Globe, label: 'Gespräch' },
  technical: { icon: Info, label: 'Technisch' }
};

// ============================================================================
// COMPONENT
// ============================================================================

const LanguageSelector = ({
  selectedLanguage,
  onLanguageChange,
  mode = 'dropdown', // 'dropdown', 'grid', 'list'
  showDialects = true,
  showPreview = true,
  compact = false,
  className = '',
  ...props
}) => {
  // ============================================================================
  // HOOKS & STATE
  // ============================================================================
  
  const { t } = useTranslation();
  const { settings, updateSettings } = useVoiceSettings();
  const { speak, stop, isPlaying } = useTextToSpeech();
  const { isSupported: speechSupported } = useSpeechRecognition();
  
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDialect, setSelectedDialect] = useState(null);
  const [isDownloading, setIsDownloading] = useState({});
  const [downloadProgress, setDownloadProgress] = useState({});
  const [previewText, setPreviewText] = useState('');
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [recentLanguages, setRecentLanguages] = useState([]);
  const [favoriteLanguages, setFavoriteLanguages] = useState([]);
  
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const filteredLanguages = useMemo(() => {
    const languages = Object.entries(LANGUAGE_DATA);
    
    if (!searchTerm) return languages;
    
    return languages.filter(([code, lang]) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        lang.name.toLowerCase().includes(searchLower) ||
        lang.nativeName.toLowerCase().includes(searchLower) ||
        lang.region.toLowerCase().includes(searchLower) ||
        code.toLowerCase().includes(searchLower) ||
        lang.dialects.some(dialect => 
          dialect.name.toLowerCase().includes(searchLower) ||
          dialect.region.toLowerCase().includes(searchLower)
        )
      );
    });
  }, [searchTerm]);
  
  const sortedLanguages = useMemo(() => {
    return filteredLanguages.sort(([aCode, aLang], [bCode, bLang]) => {
      // Favoriten zuerst
      const aFav = favoriteLanguages.includes(aCode);
      const bFav = favoriteLanguages.includes(bCode);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      
      // Dann kürzlich verwendete
      const aRecent = recentLanguages.indexOf(aCode);
      const bRecent = recentLanguages.indexOf(bCode);
      if (aRecent !== -1 && bRecent === -1) return -1;
      if (aRecent === -1 && bRecent !== -1) return 1;
      if (aRecent !== -1 && bRecent !== -1) return aRecent - bRecent;
      
      // Schweizer Sprachen bevorzugen
      const aSwiss = aCode.includes('CH');
      const bSwiss = bCode.includes('CH');
      if (aSwiss && !bSwiss) return -1;
      if (!aSwiss && bSwiss) return 1;
      
      // Nach Qualität sortieren
      const qualityOrder = { premium: 0, high: 1, medium: 2, low: 3 };
      const qualityDiff = qualityOrder[aLang.quality] - qualityOrder[bLang.quality];
      if (qualityDiff !== 0) return qualityDiff;
      
      // Alphabetisch
      return aLang.name.localeCompare(bLang.name);
    });
  }, [filteredLanguages, favoriteLanguages, recentLanguages]);
  
  const currentLanguage = LANGUAGE_DATA[selectedLanguage];
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  useEffect(() => {
    // Load recent and favorite languages from localStorage
    const recent = JSON.parse(localStorage.getItem('voice_recent_languages') || '[]');
    const favorites = JSON.parse(localStorage.getItem('voice_favorite_languages') || '[]');
    setRecentLanguages(recent);
    setFavoriteLanguages(favorites);
  }, []);
  
  useEffect(() => {
    // Close dropdown on outside click
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  useEffect(() => {
    // Focus search input when dropdown opens
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);
  
  useEffect(() => {
    // Update preview text based on selected language
    if (currentLanguage) {
      const samples = {
        'de-CH': 'Grüezi! Wie chönd mer Ihne helfe?',
        'de-DE': 'Guten Tag! Wie können wir Ihnen helfen?',
        'en-US': 'Hello! How can we help you today?',
        'en-GB': 'Good day! How may we assist you?',
        'fr-CH': 'Bonjour! Comment pouvons-nous vous aider?',
        'fr-FR': 'Bonjour! Comment pouvons-nous vous aider?',
        'it-CH': 'Buongiorno! Come possiamo aiutarla?',
        'es-ES': '¡Hola! ¿Cómo podemos ayudarle?'
      };
      setPreviewText(samples[selectedLanguage] || samples['en-US']);
    }
  }, [selectedLanguage, currentLanguage]);
  
  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handleLanguageSelect = useCallback((languageCode, dialectCode = null) => {
    // Update recent languages
    const updatedRecent = [languageCode, ...recentLanguages.filter(l => l !== languageCode)].slice(0, 5);
    setRecentLanguages(updatedRecent);
    localStorage.setItem('voice_recent_languages', JSON.stringify(updatedRecent));
    
    // Set selected dialect if provided
    if (dialectCode) {
      setSelectedDialect(dialectCode);
    }
    
    // Call parent handler
    onLanguageChange(languageCode, dialectCode);
    
    // Close dropdown
    setIsOpen(false);
    setSearchTerm('');
  }, [onLanguageChange, recentLanguages]);
  
  const handleToggleFavorite = useCallback((languageCode) => {
    const updatedFavorites = favoriteLanguages.includes(languageCode)
      ? favoriteLanguages.filter(l => l !== languageCode)
      : [...favoriteLanguages, languageCode];
    
    setFavoriteLanguages(updatedFavorites);
    localStorage.setItem('voice_favorite_languages', JSON.stringify(updatedFavorites));
  }, [favoriteLanguages]);
  
  const handlePreview = useCallback(async (languageCode) => {
    if (isPlaying) {
      stop();
      return;
    }
    
    const text = previewText || 'Hallo, das ist eine Sprachvorschau.';
    await speak(text, { lang: languageCode });
  }, [speak, stop, isPlaying, previewText]);
  
  const handleDownload = useCallback(async (languageCode) => {
    setIsDownloading(prev => ({ ...prev, [languageCode]: true }));
    setDownloadProgress(prev => ({ ...prev, [languageCode]: 0 }));
    
    try {
      // Simulate download progress
      for (let i = 0; i <= 100; i += 10) {
        setDownloadProgress(prev => ({ ...prev, [languageCode]: i }));
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Mark language as offline available
      updateSettings({
        ...settings,
        offlineLanguages: [...(settings.offlineLanguages || []), languageCode]
      });
      
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(prev => ({ ...prev, [languageCode]: false }));
      setDownloadProgress(prev => ({ ...prev, [languageCode]: 0 }));
    }
  }, [settings, updateSettings]);
  
  const handleMicTest = useCallback(async (languageCode) => {
    setIsTestingMic(true);
    
    try {
      // Test microphone with selected language
      // This would integrate with speech recognition
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Mic test failed:', error);
    } finally {
      setIsTestingMic(false);
    }
  }, []);
  
  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  
  const renderLanguageItem = useCallback((languageCode, language, isCompact = false) => {
    const isSelected = languageCode === selectedLanguage;
    const isFavorite = favoriteLanguages.includes(languageCode);
    const isRecent = recentLanguages.includes(languageCode);
    const isOffline = language.offline || settings.offlineLanguages?.includes(languageCode);
    const quality = QUALITY_BADGES[language.quality];
    const isDownloadingLang = isDownloading[languageCode];
    const progress = downloadProgress[languageCode] || 0;
    
    return (
      <div
        key={languageCode}
        className={`${styles.languageItem} ${isSelected ? styles.selected : ''} ${isCompact ? styles.compact : ''}`}
        onClick={() => handleLanguageSelect(languageCode)}
        role="option"
        aria-selected={isSelected}
        tabIndex={0}
      >
        <div className={styles.languageMain}>
          <div className={styles.languageFlag}>
            {language.flag}
          </div>
          
          <div className={styles.languageInfo}>
            <div className={styles.languageName}>
              {language.name}
              {isRecent && <Clock className={styles.recentIcon} />}
            </div>
            {!isCompact && (
              <div className={styles.languageDetails}>
                <span className={styles.nativeName}>{language.nativeName}</span>
                <span className={styles.region}>{language.region}</span>
              </div>
            )}
          </div>
          
          <div className={styles.languageStats}>
            <div className={styles.qualityBadge} style={{ backgroundColor: quality.color }}>
              {quality.label}
            </div>
            {!isCompact && (
              <div className={styles.accuracy}>
                {language.accuracy}% genau
              </div>
            )}
          </div>
        </div>
        
        {!isCompact && (
          <div className={styles.languageFeatures}>
            <div className={styles.features}>
              {language.features.slice(0, 3).map(feature => {
                const FeatureIcon = FEATURE_ICONS[feature]?.icon || Info;
                return (
                  <div key={feature} className={styles.featureIcon} title={FEATURE_ICONS[feature]?.label}>
                    <FeatureIcon size={14} />
                  </div>
                );
              })}
              {language.features.length > 3 && (
                <span className={styles.moreFeatures}>+{language.features.length - 3}</span>
              )}
            </div>
            
            <div className={styles.voiceInfo}>
              <Volume2 size={14} />
              <span>{language.voiceCount} Stimmen</span>
            </div>
          </div>
        )}
        
        <div className={styles.languageActions}>
          <button
            className={`${styles.actionButton} ${isFavorite ? styles.favorited : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleFavorite(languageCode);
            }}
            title={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
          >
            <Star size={16} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
          
          {showPreview && (
            <button
              className={styles.actionButton}
              onClick={(e) => {
                e.stopPropagation();
                handlePreview(languageCode);
              }}
              title="Sprachvorschau"
              disabled={isPlaying}
            >
              {isPlaying ? <Square size={16} /> : <Play size={16} />}
            </button>
          )}
          
          {speechSupported && (
            <button
              className={styles.actionButton}
              onClick={(e) => {
                e.stopPropagation();
                handleMicTest(languageCode);
              }}
              title="Mikrofon testen"
              disabled={isTestingMic}
            >
              {isTestingMic ? <Loader size={16} className={styles.spinning} /> : <Mic size={16} />}
            </button>
          )}
          
          {!isOffline && (
            <button
              className={styles.actionButton}
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(languageCode);
              }}
              title="Für Offline-Nutzung herunterladen"
              disabled={isDownloadingLang}
            >
              {isDownloadingLang ? (
                <div className={styles.downloadProgress}>
                  <Loader size={16} className={styles.spinning} />
                  <span>{progress}%</span>
                </div>
              ) : (
                <Download size={16} />
              )}
            </button>
          )}
          
          <div className={styles.connectionStatus}>
            {isOffline ? (
              <WifiOff size={14} className={styles.offline} title="Offline verfügbar" />
            ) : (
              <Wifi size={14} className={styles.online} title="Internetverbindung erforderlich" />
            )}
          </div>
          
          {isSelected && <Check size={16} className={styles.selectedIcon} />}
        </div>
        
        {showDialects && language.dialects.length > 1 && (
          <div className={styles.dialectsSection}>
            <div className={styles.dialectsLabel}>Dialekte:</div>
            <div className={styles.dialects}>
              {language.dialects.map(dialect => (
                <button
                  key={dialect.code}
                  className={`${styles.dialectButton} ${selectedDialect === dialect.code ? styles.selected : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLanguageSelect(languageCode, dialect.code);
                  }}
                >
                  {dialect.name}
                  <span className={styles.dialectRegion}>({dialect.region})</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }, [
    selectedLanguage,
    favoriteLanguages,
    recentLanguages,
    settings.offlineLanguages,
    isDownloading,
    downloadProgress,
    isPlaying,
    isTestingMic,
    selectedDialect,
    showPreview,
    showDialects,
    speechSupported,
    handleLanguageSelect,
    handleToggleFavorite,
    handlePreview,
    handleMicTest,
    handleDownload
  ]);
  
  const renderDropdownMode = () => (
    <div className={`${styles.dropdown} ${className}`} ref={dropdownRef} {...props}>
      <button
        className={`${styles.trigger} ${isOpen ? styles.open : ''} ${compact ? styles.compact : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className={styles.currentLanguage}>
          <span className={styles.flag}>{currentLanguage?.flag}</span>
          <span className={styles.name}>{currentLanguage?.name}</span>
          {!compact && currentLanguage && (
            <span className={styles.details}>
              ({currentLanguage.region})
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
      
      {isOpen && (
        <div className={styles.dropdownContent}>
          <div className={styles.searchSection}>
            <div className={styles.searchContainer}>
              <Search className={styles.searchIcon} size={16} />
              <input
                ref={searchInputRef}
                type="text"
                className={styles.searchInput}
                placeholder="Sprache suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  className={styles.clearSearch}
                  onClick={() => setSearchTerm('')}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
          
          <div className={styles.languageList} role="listbox">
            {sortedLanguages.length > 0 ? (
              sortedLanguages.map(([code, language]) =>
                renderLanguageItem(code, language, compact)
              )
            ) : (
              <div className={styles.noResults}>
                <AlertCircle size={24} />
                <p>Keine Sprachen gefunden</p>
                <button onClick={() => setSearchTerm('')}>
                  Alle anzeigen
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
  
  const renderGridMode = () => (
    <div className={`${styles.grid} ${className}`} {...props}>
      <div className={styles.searchSection}>
        <div className={styles.searchContainer}>
          <Search className={styles.searchIcon} size={16} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Sprache suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className={styles.clearSearch}
              onClick={() => setSearchTerm('')}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      
      <div className={styles.languageGrid}>
        {sortedLanguages.map(([code, language]) =>
          renderLanguageItem(code, language, false)
        )}
      </div>
    </div>
  );
  
  const renderListMode = () => (
    <div className={`${styles.list} ${className}`} {...props}>
      <div className={styles.searchSection}>
        <div className={styles.searchContainer}>
          <Search className={styles.searchIcon} size={16} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Sprache suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              className={styles.clearSearch}
              onClick={() => setSearchTerm('')}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      
      <div className={styles.languageList}>
        {sortedLanguages.map(([code, language]) =>
          renderLanguageItem(code, language, true)
        )}
      </div>
    </div>
  );
  
  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  if (mode === 'grid') return renderGridMode();
  if (mode === 'list') return renderListMode();
  return renderDropdownMode();
};

export default LanguageSelector;