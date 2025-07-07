/**
 * EATECH - Contextual Help Component
 * Version: 4.0.0
 * Description: Context-aware help system for voice commands with Swiss German support
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/features/voice/components/ContextualHelp.jsx
 * 
 * Features:
 * - Context-aware command suggestions
 * - Swiss German command examples
 * - Interactive help tutorials
 * - Voice-guided assistance
 * - Accessibility support
 * - Progressive disclosure
 */

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo, 
  useRef 
} from 'react';
import { 
  HelpCircle, 
  X, 
  Search, 
  Mic, 
  Volume2,
  BookOpen, 
  MessageSquare, 
  Globe,
  ChevronRight, 
  ChevronDown, 
  Play,
  Square, 
  RotateCcw, 
  Star,
  Filter, 
  Tag, 
  Clock,
  TrendingUp, 
  Award, 
  Lightbulb,
  Eye, 
  Keyboard, 
  Smartphone
} from 'lucide-react';
import { useVoiceSettings } from '../hooks/useVoiceSettings';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import styles from './ContextualHelp.module.css';

// ============================================================================
// CONSTANTS & HELP DATA
// ============================================================================

const HELP_CATEGORIES = {
  GETTING_STARTED: {
    id: 'getting_started',
    title: 'Erste Schritte',
    icon: Play,
    priority: 1,
    context: ['new_user', 'tutorial']
  },
  ORDERING: {
    id: 'ordering',
    title: 'Bestellungen',
    icon: MessageSquare,
    priority: 2,
    context: ['menu', 'cart', 'checkout']
  },
  NAVIGATION: {
    id: 'navigation',
    title: 'Navigation',
    icon: Globe,
    priority: 3,
    context: ['navigation', 'pages']
  },
  SWISS_GERMAN: {
    id: 'swiss_german',
    title: 'Schweizerdeutsch',
    icon: MessageSquare,
    priority: 4,
    context: ['language', 'dialect']
  },
  ADVANCED: {
    id: 'advanced',
    title: 'Erweitert',
    icon: Star,
    priority: 5,
    context: ['power_user', 'customization']
  },
  TROUBLESHOOTING: {
    id: 'troubleshooting',
    title: 'Problembehebung',
    icon: HelpCircle,
    priority: 6,
    context: ['error', 'problem']
  }
};

const VOICE_COMMANDS_DB = {
  getting_started: [
    {
      command: 'Hey EATECH',
      description: 'Sprachassistent aktivieren',
      example: 'Hey EATECH, zeig mir die Speisekarte',
      difficulty: 'easy',
      swissGerman: ['Hoi EATECH', 'Salü EATECH']
    },
    {
      command: 'Hilfe',
      description: 'Diese Hilfe öffnen',
      example: 'Hilfe, was kann ich sagen?',
      difficulty: 'easy',
      swissGerman: ['Hilf mir', 'Chasch mir hälfe?']
    },
    {
      command: 'Tutorial starten',
      description: 'Interaktives Tutorial beginnen',
      example: 'Starte das Voice Tutorial',
      difficulty: 'easy',
      swissGerman: ['Tutorial aafange', 'Lehrgang starte']
    }
  ],
  ordering: [
    {
      command: 'Bestelle [Produkt]',
      description: 'Produkt zum Warenkorb hinzufügen',
      example: 'Bestelle eine Pizza Margherita',
      difficulty: 'easy',
      swissGerman: ['Ich hätt gern e Pizza', 'Chani e Pizza ha?', 'Pizza bitte']
    },
    {
      command: '[Anzahl] [Produkt]',
      description: 'Mehrere Produkte bestellen',
      example: 'Drei Kaffee und zwei Croissants',
      difficulty: 'medium',
      swissGerman: ['Drü Kafi und zwöi Gipfeli', 'Ich nimm drü Kafi']
    },
    {
      command: 'Ohne [Zutat]',
      description: 'Produkt ohne bestimmte Zutat',
      example: 'Pizza Margherita ohne Oregano',
      difficulty: 'medium',
      swissGerman: ['Ohni Oregano', 'Käs Pizza ohni Chili']
    },
    {
      command: 'Meine übliche Bestellung',
      description: 'Gespeicherte Lieblings-Bestellung',
      example: 'Mach mir meine übliche Bestellung',
      difficulty: 'advanced',
      swissGerman: ['Mis gwöhnlechs', 'Wie immer']
    }
  ],
  navigation: [
    {
      command: 'Zeig [Seite]',
      description: 'Zu einer bestimmten Seite navigieren',
      example: 'Zeig mir die Speisekarte',
      difficulty: 'easy',
      swissGerman: ['Gang zur Spysekarte', 'Spysekarte aazeige']
    },
    {
      command: 'Warenkorb öffnen',
      description: 'Warenkorb anzeigen',
      example: 'Öffne meinen Warenkorb',
      difficulty: 'easy',
      swissGerman: ['Warachorb öffne', 'Gang zum Warachorb']
    },
    {
      command: 'Zurück',
      description: 'Zur vorherigen Seite',
      example: 'Geh zurück zur vorherigen Seite',
      difficulty: 'easy',
      swissGerman: ['Gang zrugg', 'Zrugg']
    }
  ],
  swiss_german: [
    {
      command: 'Griaßi / Hoi',
      description: 'Begrüßung auf Schweizerdeutsch',
      example: 'Hoi EATECH, wie gaht\'s?',
      difficulty: 'easy',
      swissGerman: ['Grüezi', 'Salü', 'Hoi zäme']
    },
    {
      command: 'Merci vilmal',
      description: 'Bedankung',
      example: 'Merci vilmal für d Hilf',
      difficulty: 'easy',
      swissGerman: ['Danke vilmal', 'Merci', 'Herzliche Dank']
    },
    {
      command: 'Adieu / Tschüss',
      description: 'Verabschiedung',
      example: 'Adieu, bis spöter',
      difficulty: 'easy',
      swissGerman: ['Tschau', 'Bis spöter', 'Uf Widerluege']
    }
  ],
  advanced: [
    {
      command: 'Wenn [Bedingung] dann [Aktion]',
      description: 'Bedingte Befehle',
      example: 'Wenn Tisch 5 frei ist, reserviere ihn',
      difficulty: 'advanced',
      swissGerman: ['Falls Tisch 5 frei isch, reservier en']
    },
    {
      command: 'Erstelle Shortcut',
      description: 'Benutzerdefinierten Befehl erstellen',
      example: 'Erstelle Shortcut "Kaffee-Pause" für Kaffee und Gipfeli',
      difficulty: 'advanced',
      swissGerman: ['Mach en Shortcut']
    }
  ],
  troubleshooting: [
    {
      command: 'Lauter sprechen',
      description: 'Bei schlechter Erkennung',
      example: 'Sprechen Sie deutlicher und lauter',
      difficulty: 'easy',
      swissGerman: ['Lüter rede', 'Dütlicher rede']
    },
    {
      command: 'Mikrofon testen',
      description: 'Mikrofoneinstellungen prüfen',
      example: 'Teste mein Mikrofon',
      difficulty: 'medium',
      swissGerman: ['Mikrofon teste']
    }
  ]
};

const CONTEXT_MAPPING = {
  '/menu': ['ordering', 'navigation'],
  '/cart': ['ordering', 'checkout'],
  '/checkout': ['ordering'],
  '/': ['getting_started', 'navigation'],
  '/profile': ['advanced'],
  '/settings': ['advanced', 'troubleshooting']
};

// ============================================================================
// COMPONENT
// ============================================================================

const ContextualHelp = ({
  commands = {},
  language = 'de-CH',
  currentContext = {},
  onClose,
  onCommandSelect,
  className = '',
  ...props
}) => {
  // ============================================================================
  // HOOKS & STATE
  // ============================================================================
  
  const { settings } = useVoiceSettings();
  const { speak, stop, isPlaying } = useTextToSpeech();
  const { isSupported } = useSpeechRecognition();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [expandedCommands, setExpandedCommands] = useState(new Set());
  const [favorites, setFavorites] = useState(new Set());
  const [showSwissGerman, setShowSwissGerman] = useState(true);
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [isVoiceHelpActive, setIsVoiceHelpActive] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  
  // Refs
  const searchInputRef = useRef(null);
  
  // ============================================================================
  // MEMOIZED VALUES
  // ============================================================================
  
  const contextualCategories = useMemo(() => {
    const page = currentContext.page || '/';
    const contextKeys = CONTEXT_MAPPING[page] || ['getting_started'];
    
    return Object.values(HELP_CATEGORIES)
      .filter(category => 
        contextKeys.includes(category.id) || 
        searchTerm || 
        selectedCategory === category.id
      )
      .sort((a, b) => a.priority - b.priority);
  }, [currentContext.page, searchTerm, selectedCategory]);
  
  const filteredCommands = useMemo(() => {
    const allCommands = [];
    
    Object.entries(VOICE_COMMANDS_DB).forEach(([categoryId, commands]) => {
      commands.forEach(command => {
        allCommands.push({ ...command, categoryId });
      });
    });
    
    return allCommands.filter(command => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          command.command.toLowerCase().includes(searchLower) ||
          command.description.toLowerCase().includes(searchLower) ||
          command.example.toLowerCase().includes(searchLower) ||
          command.swissGerman?.some(sg => sg.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return false;
      }
      
      // Category filter
      if (selectedCategory && command.categoryId !== selectedCategory) {
        return false;
      }
      
      // Difficulty filter
      if (filterDifficulty !== 'all' && command.difficulty !== filterDifficulty) {
        return false;
      }
      
      // Context filter (if no search term)
      if (!searchTerm && !selectedCategory) {
        const page = currentContext.page || '/';
        const contextKeys = CONTEXT_MAPPING[page] || ['getting_started'];
        return contextKeys.includes(command.categoryId);
      }
      
      return true;
    });
  }, [searchTerm, selectedCategory, filterDifficulty, currentContext.page]);
  
  const accessibilitySettings = useMemo(() => ({
    screenReader: settings.accessibility?.screenReader || false,
    highContrast: settings.accessibility?.highContrast || false,
    reducedMotion: settings.accessibility?.reducedMotion || false
  }), [settings.accessibility]);
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);
  
  const handleCategorySelect = useCallback((categoryId) => {
    setSelectedCategory(selectedCategory === categoryId ? null : categoryId);
    setSearchTerm('');
  }, [selectedCategory]);
  
  const handleCommandExpand = useCallback((commandIndex) => {
    const newExpanded = new Set(expandedCommands);
    if (newExpanded.has(commandIndex)) {
      newExpanded.delete(commandIndex);
    } else {
      newExpanded.add(commandIndex);
    }
    setExpandedCommands(newExpanded);
  }, [expandedCommands]);
  
  const handleFavoriteToggle = useCallback((commandIndex) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(commandIndex)) {
      newFavorites.delete(commandIndex);
    } else {
      newFavorites.add(commandIndex);
    }
    setFavorites(newFavorites);
    
    // Save to settings
    const favoriteCommands = Array.from(newFavorites);
    // Update user preferences here
  }, [favorites]);
  
  const handleVoiceDemo = useCallback((command, text) => {
    if (currentlyPlaying === command) {
      stop();
      setCurrentlyPlaying(null);
    } else {
      setCurrentlyPlaying(command);
      speak(text, {
        onEnd: () => setCurrentlyPlaying(null),
        onError: () => setCurrentlyPlaying(null)
      });
    }
  }, [currentlyPlaying, speak, stop]);
  
  const handleCommandSelect = useCallback((command) => {
    onCommandSelect?.(command);
    onClose?.();
  }, [onCommandSelect, onClose]);
  
  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  
  const renderCategoryButton = useCallback((category) => {
    const Icon = category.icon;
    const isSelected = selectedCategory === category.id;
    
    return (
      <button
        key={category.id}
        className={`${styles.categoryButton} ${isSelected ? styles.selected : ''}`}
        onClick={() => handleCategorySelect(category.id)}
        aria-pressed={isSelected}
      >
        <Icon size={16} />
        <span>{category.title}</span>
      </button>
    );
  }, [selectedCategory, handleCategorySelect]);
  
  const renderCommand = useCallback((command, index) => {
    const isExpanded = expandedCommands.has(index);
    const isFavorite = favorites.has(index);
    const isPlaying = currentlyPlaying === index;
    
    return (
      <div key={index} className={styles.commandItem}>
        <div className={styles.commandHeader}>
          <button
            className={styles.commandButton}
            onClick={() => handleCommandExpand(index)}
            aria-expanded={isExpanded}
          >
            <div className={styles.commandMain}>
              <span className={styles.commandText}>{command.command}</span>
              <span className={`${styles.difficulty} ${styles[command.difficulty]}`}>
                {command.difficulty}
              </span>
            </div>
            <ChevronRight 
              className={`${styles.expandIcon} ${isExpanded ? styles.expanded : ''}`}
              size={16}
            />
          </button>
          
          <div className={styles.commandActions}>
            <button
              className={`${styles.favoriteButton} ${isFavorite ? styles.active : ''}`}
              onClick={() => handleFavoriteToggle(index)}
              aria-label={isFavorite ? 'Von Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
            >
              <Star size={16} />
            </button>
            
            {isSupported && (
              <button
                className={`${styles.voiceButton} ${isPlaying ? styles.playing : ''}`}
                onClick={() => handleVoiceDemo(index, command.example)}
                aria-label={isPlaying ? 'Wiedergabe stoppen' : 'Beispiel anhören'}
              >
                {isPlaying ? <Square size={16} /> : <Play size={16} />}
              </button>
            )}
          </div>
        </div>
        
        {isExpanded && (
          <div className={styles.commandDetails}>
            <p className={styles.description}>{command.description}</p>
            
            <div className={styles.example}>
              <label>Beispiel:</label>
              <button
                className={styles.exampleText}
                onClick={() => handleCommandSelect(command.example)}
              >
                "{command.example}"
              </button>
            </div>
            
            {showSwissGerman && command.swissGerman && (
              <div className={styles.swissGermanSection}>
                <label>Auf Schweizerdeutsch:</label>
                <div className={styles.swissGermanExamples}>
                  {command.swissGerman.map((sg, sgIndex) => (
                    <button
                      key={sgIndex}
                      className={styles.swissGermanExample}
                      onClick={() => handleCommandSelect(sg)}
                    >
                      "{sg}"
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }, [
    expandedCommands,
    favorites, 
    currentlyPlaying,
    showSwissGerman,
    isSupported,
    handleCommandExpand,
    handleFavoriteToggle,
    handleVoiceDemo,
    handleCommandSelect
  ]);
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  useEffect(() => {
    // Focus search input when component mounts
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);
  
  useEffect(() => {
    // Load user favorites from settings
    const savedFavorites = settings.advanced?.favoriteCommands || [];
    setFavorites(new Set(savedFavorites));
  }, [settings.advanced?.favoriteCommands]);
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <div 
      className={`
        ${styles.contextualHelp} 
        ${className}
        ${accessibilitySettings.highContrast ? styles.highContrast : ''}
        ${accessibilitySettings.reducedMotion ? styles.reducedMotion : ''}
      `}
      role="dialog"
      aria-labelledby="help-title"
      aria-modal="true"
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <HelpCircle size={24} />
          <h2 id="help-title">Voice Commands Hilfe</h2>
        </div>
        
        <div className={styles.headerActions}>
          <button
            className={`${styles.toggleButton} ${showSwissGerman ? styles.active : ''}`}
            onClick={() => setShowSwissGerman(!showSwissGerman)}
            aria-pressed={showSwissGerman}
          >
            🇨🇭 Schweizerdeutsch
          </button>
          
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Hilfe schließen"
          >
            <X size={20} />
          </button>
        </div>
      </div>
      
      {/* Search and Filters */}
      <div className={styles.searchSection}>
        <div className={styles.searchInput}>
          <Search size={16} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Nach Befehlen suchen..."
            value={searchTerm}
            onChange={handleSearchChange}
            aria-label="Nach Befehlen suchen"
          />
        </div>
        
        <div className={styles.filters}>
          <select
            className={styles.difficultyFilter}
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            aria-label="Nach Schwierigkeit filtern"
          >
            <option value="all">Alle Schwierigkeiten</option>
            <option value="easy">Einfach</option>
            <option value="medium">Mittel</option>
            <option value="advanced">Fortgeschritten</option>
          </select>
        </div>
      </div>
      
      {/* Categories */}
      <div className={styles.categories}>
        {contextualCategories.map(renderCategoryButton)}
      </div>
      
      {/* Commands List */}
      <div className={styles.commandsList}>
        {filteredCommands.length > 0 ? (
          filteredCommands.map(renderCommand)
        ) : (
          <div className={styles.noResults}>
            <MessageSquare size={48} />
            <h3>Keine Befehle gefunden</h3>
            <p>Versuchen Sie andere Suchbegriffe oder wählen Sie eine andere Kategorie.</p>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.stats}>
          <span>{filteredCommands.length} Befehle verfügbar</span>
          <span>•</span>
          <span>{favorites.size} Favoriten</span>
        </div>
        
        <div className={styles.footerActions}>
          <button 
            className={styles.tutorialButton}
            onClick={() => {
              // Start tutorial
              onClose?.();
            }}
          >
            <BookOpen size={16} />
            Tutorial starten
          </button>
        </div>
      </div>
    </div>
  );
};

export { ContextualHelp };