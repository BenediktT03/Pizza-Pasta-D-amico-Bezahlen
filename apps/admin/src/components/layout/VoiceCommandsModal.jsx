/**
 * EATECH - Voice Commands Modal Component
 * Version: 1.0.0
 * Description: Interactive modal showing available voice commands with language support
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /apps/admin/src/components/Layout/VoiceCommandsModal.jsx
 */

import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  ChevronRight,
  Globe,
  HelpCircle,
  Home,
  Info,
  Mic,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShoppingCart,
  Users,
  X
} from 'lucide-react';
import { useMemo, useState } from 'react';
import styles from './VoiceCommandsModal.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================

const LANGUAGES = {
  'de-CH': { label: 'Schweizerdeutsch', flag: '🇨🇭' },
  'de-DE': { label: 'Deutsch', flag: '🇩🇪' },
  'fr-CH': { label: 'Français', flag: '🇫🇷' },
  'it-CH': { label: 'Italiano', flag: '🇮🇹' },
  'en-US': { label: 'English', flag: '🇺🇸' }
};

const COMMAND_CATEGORIES = {
  navigation: {
    label: 'Navigation',
    icon: Home,
    color: '#6366F1'
  },
  orders: {
    label: 'Bestellungen',
    icon: ShoppingCart,
    color: '#10B981'
  },
  products: {
    label: 'Produkte',
    icon: Package,
    color: '#F59E0B'
  },
  analytics: {
    label: 'Analytics',
    icon: BarChart3,
    color: '#3B82F6'
  },
  actions: {
    label: 'Aktionen',
    icon: Plus,
    color: '#8B5CF6'
  },
  system: {
    label: 'System',
    icon: Settings,
    color: '#6B7280'
  }
};

// Voice commands with multi-language support
const VOICE_COMMANDS = [
  // Navigation Commands
  {
    category: 'navigation',
    commands: [
      {
        action: 'Dashboard öffnen',
        phrases: {
          'de-CH': ['dashboard', 'übersicht', 'hauptseite', 'startseite'],
          'de-DE': ['dashboard', 'übersicht', 'hauptseite', 'startseite'],
          'fr-CH': ['tableau de bord', 'vue d\'ensemble', 'accueil'],
          'it-CH': ['dashboard', 'panoramica', 'pagina principale'],
          'en-US': ['dashboard', 'overview', 'home', 'main page']
        },
        icon: Home,
        path: '/admin'
      },
      {
        action: 'Bestellungen anzeigen',
        phrases: {
          'de-CH': ['bestellungen', 'bstellige', 'orders'],
          'de-DE': ['bestellungen', 'aufträge', 'orders'],
          'fr-CH': ['commandes', 'orders'],
          'it-CH': ['ordini', 'orders'],
          'en-US': ['orders', 'show orders', 'order list']
        },
        icon: ShoppingCart,
        path: '/admin/orders'
      },
      {
        action: 'Produkte verwalten',
        phrases: {
          'de-CH': ['produkte', 'produkt', 'menü', 'speisekarte'],
          'de-DE': ['produkte', 'artikel', 'menü', 'speisekarte'],
          'fr-CH': ['produits', 'menu', 'carte'],
          'it-CH': ['prodotti', 'menu', 'menù'],
          'en-US': ['products', 'menu', 'items']
        },
        icon: Package,
        path: '/admin/products'
      },
      {
        action: 'Kunden anzeigen',
        phrases: {
          'de-CH': ['kunden', 'chunde', 'gäste'],
          'de-DE': ['kunden', 'gäste', 'customers'],
          'fr-CH': ['clients', 'customers'],
          'it-CH': ['clienti', 'ospiti'],
          'en-US': ['customers', 'clients', 'guests']
        },
        icon: Users,
        path: '/admin/customers'
      },
      {
        action: 'Analytics öffnen',
        phrases: {
          'de-CH': ['analytics', 'statistiken', 'statistike', 'auswertung'],
          'de-DE': ['analytics', 'statistiken', 'auswertung', 'berichte'],
          'fr-CH': ['analytique', 'statistiques', 'rapports'],
          'it-CH': ['analisi', 'statistiche', 'rapporti'],
          'en-US': ['analytics', 'statistics', 'reports']
        },
        icon: BarChart3,
        path: '/admin/analytics'
      }
    ]
  },
  // Order Actions
  {
    category: 'orders',
    commands: [
      {
        action: 'Neue Bestellung',
        phrases: {
          'de-CH': ['neue bestellung', 'nöi bstellig', 'bestellung erstellen'],
          'de-DE': ['neue bestellung', 'bestellung erstellen', 'order anlegen'],
          'fr-CH': ['nouvelle commande', 'créer commande'],
          'it-CH': ['nuovo ordine', 'crea ordine'],
          'en-US': ['new order', 'create order', 'add order']
        },
        icon: Plus,
        path: '/admin/orders/new'
      },
      {
        action: 'Bestellung suchen',
        phrases: {
          'de-CH': ['bestellung suchen', 'bstellig sueche', 'order finden'],
          'de-DE': ['bestellung suchen', 'order finden', 'auftrag suchen'],
          'fr-CH': ['chercher commande', 'trouver commande'],
          'it-CH': ['cerca ordine', 'trova ordine'],
          'en-US': ['search order', 'find order', 'lookup order']
        },
        icon: Search,
        action: 'search_orders'
      },
      {
        action: 'Offene Bestellungen',
        phrases: {
          'de-CH': ['offene bestellungen', 'offeni bstellige', 'pending'],
          'de-DE': ['offene bestellungen', 'ausstehende', 'pending'],
          'fr-CH': ['commandes ouvertes', 'en attente'],
          'it-CH': ['ordini aperti', 'in attesa'],
          'en-US': ['open orders', 'pending orders', 'active orders']
        },
        icon: Clock,
        path: '/admin/orders?status=pending'
      }
    ]
  },
  // Product Actions
  {
    category: 'products',
    commands: [
      {
        action: 'Neues Produkt',
        phrases: {
          'de-CH': ['neues produkt', 'nöis produkt', 'produkt hinzufügen'],
          'de-DE': ['neues produkt', 'produkt hinzufügen', 'artikel anlegen'],
          'fr-CH': ['nouveau produit', 'ajouter produit'],
          'it-CH': ['nuovo prodotto', 'aggiungi prodotto'],
          'en-US': ['new product', 'add product', 'create product']
        },
        icon: Plus,
        path: '/admin/products/new'
      },
      {
        action: 'Inventar prüfen',
        phrases: {
          'de-CH': ['inventar', 'lagerbestand', 'stock'],
          'de-DE': ['inventar', 'lagerbestand', 'bestand prüfen'],
          'fr-CH': ['inventaire', 'stock', 'vérifier stock'],
          'it-CH': ['inventario', 'scorte', 'magazzino'],
          'en-US': ['inventory', 'stock', 'check stock']
        },
        icon: Package,
        path: '/admin/inventory'
      }
    ]
  },
  // Quick Actions
  {
    category: 'actions',
    commands: [
      {
        action: 'Hilfe anzeigen',
        phrases: {
          'de-CH': ['hilfe', 'hilf', 'was kann ich sagen'],
          'de-DE': ['hilfe', 'hilf mir', 'was kann ich sagen'],
          'fr-CH': ['aide', 'aidez-moi', 'que dire'],
          'it-CH': ['aiuto', 'aiutami', 'cosa posso dire'],
          'en-US': ['help', 'help me', 'what can I say']
        },
        icon: HelpCircle,
        action: 'show_help'
      },
      {
        action: 'Suche öffnen',
        phrases: {
          'de-CH': ['suchen', 'sueche', 'finden'],
          'de-DE': ['suchen', 'suche', 'finden'],
          'fr-CH': ['chercher', 'rechercher', 'trouver'],
          'it-CH': ['cercare', 'ricerca', 'trovare'],
          'en-US': ['search', 'find', 'look for']
        },
        icon: Search,
        action: 'open_search'
      },
      {
        action: 'Aktualisieren',
        phrases: {
          'de-CH': ['aktualisieren', 'neu laden', 'refresh'],
          'de-DE': ['aktualisieren', 'neu laden', 'refresh'],
          'fr-CH': ['actualiser', 'rafraîchir', 'recharger'],
          'it-CH': ['aggiornare', 'ricaricare', 'refresh'],
          'en-US': ['refresh', 'reload', 'update']
        },
        icon: RefreshCw,
        action: 'refresh_page'
      }
    ]
  },
  // System Commands
  {
    category: 'system',
    commands: [
      {
        action: 'Einstellungen',
        phrases: {
          'de-CH': ['einstellungen', 'istellige', 'settings'],
          'de-DE': ['einstellungen', 'optionen', 'settings'],
          'fr-CH': ['paramètres', 'réglages', 'settings'],
          'it-CH': ['impostazioni', 'opzioni', 'settings'],
          'en-US': ['settings', 'preferences', 'options']
        },
        icon: Settings,
        path: '/admin/settings'
      },
      {
        action: 'Abmelden',
        phrases: {
          'de-CH': ['abmelden', 'abmelde', 'logout'],
          'de-DE': ['abmelden', 'ausloggen', 'logout'],
          'fr-CH': ['déconnexion', 'logout', 'sortir'],
          'it-CH': ['disconnetti', 'logout', 'esci'],
          'en-US': ['logout', 'sign out', 'log off']
        },
        icon: LogOut,
        action: 'logout'
      }
    ]
  }
];

// ============================================================================
// VOICE COMMANDS MODAL COMPONENT
// ============================================================================

const VoiceCommandsModal = ({
  isOpen,
  onClose,
  commands = NAVIGATION_ITEMS,
  currentLanguage = 'de-CH'
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showExamples, setShowExamples] = useState(true);

  // Filter commands based on search and category
  const filteredCommands = useMemo(() => {
    let filtered = VOICE_COMMANDS;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(group => group.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.map(group => ({
        ...group,
        commands: group.commands.filter(cmd => {
          const searchLower = searchQuery.toLowerCase();
          const actionMatch = cmd.action.toLowerCase().includes(searchLower);
          const phrasesMatch = cmd.phrases[selectedLanguage]?.some(phrase =>
            phrase.toLowerCase().includes(searchLower)
          );
          return actionMatch || phrasesMatch;
        })
      })).filter(group => group.commands.length > 0);
    }

    return filtered;
  }, [selectedCategory, searchQuery, selectedLanguage]);

  const handleCommandClick = (command) => {
    // Trigger voice command execution
    if (command.path) {
      window.location.href = command.path;
    } else if (command.action) {
      // Emit custom event for action commands
      window.dispatchEvent(new CustomEvent('voice-command', {
        detail: { action: command.action }
      }));
    }
    onClose();
  };

  const renderCommandCard = (command) => {
    const Icon = command.icon;
    const phrases = command.phrases[selectedLanguage] || command.phrases['de-CH'];

    return (
      <motion.div
        key={command.action}
        className={styles.commandCard}
        onClick={() => handleCommandClick(command)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className={styles.commandHeader}>
          <div className={styles.commandIcon}>
            <Icon size={20} />
          </div>
          <h4 className={styles.commandAction}>{command.action}</h4>
        </div>

        <div className={styles.commandPhrases}>
          <span className={styles.phrasesLabel}>Sagen Sie:</span>
          <div className={styles.phrasesList}>
            {phrases.map((phrase, index) => (
              <span key={index} className={styles.phrase}>
                "{phrase}"
              </span>
            ))}
          </div>
        </div>

        {command.path && (
          <div className={styles.commandPath}>
            <ChevronRight size={14} />
            <span>{command.path}</span>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', duration: 0.3 }}
          >
            {/* Header */}
            <div className={styles.header}>
              <div className={styles.headerLeft}>
                <Mic className={styles.headerIcon} />
                <h2 className={styles.title}>Voice Commands</h2>
              </div>
              <button onClick={onClose} className={styles.closeButton}>
                <X size={24} />
              </button>
            </div>

            {/* Language Selector */}
            <div className={styles.languageSelector}>
              <Globe size={18} />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className={styles.languageSelect}
              >
                {Object.entries(LANGUAGES).map(([code, lang]) => (
                  <option key={code} value={code}>
                    {lang.flag} {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Controls */}
            <div className={styles.controls}>
              {/* Search */}
              <div className={styles.searchBox}>
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Befehl suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
              </div>

              {/* Category Filter */}
              <div className={styles.categoryFilter}>
                <button
                  className={`${styles.categoryButton} ${selectedCategory === 'all' ? styles.active : ''}`}
                  onClick={() => setSelectedCategory('all')}
                >
                  Alle
                </button>
                {Object.entries(COMMAND_CATEGORIES).map(([key, category]) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={key}
                      className={`${styles.categoryButton} ${selectedCategory === key ? styles.active : ''}`}
                      onClick={() => setSelectedCategory(key)}
                      style={{
                        '--category-color': category.color,
                        borderColor: selectedCategory === key ? category.color : 'transparent'
                      }}
                    >
                      <Icon size={16} />
                      {category.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Info Box */}
            {showExamples && (
              <motion.div
                className={styles.infoBox}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <Info size={18} />
                <div className={styles.infoContent}>
                  <p>
                    <strong>Tipp:</strong> Aktivieren Sie Voice Commands mit{' '}
                    <kbd>⌘ + ⇧ + V</kbd> oder klicken Sie auf das Mikrofon-Symbol.
                  </p>
                  <p>
                    Voice Commands funktionieren in {LANGUAGES[selectedLanguage].label} und
                    passen sich automatisch an Ihren Dialekt an.
                  </p>
                </div>
                <button
                  onClick={() => setShowExamples(false)}
                  className={styles.infoClose}
                >
                  <X size={16} />
                </button>
              </motion.div>
            )}

            {/* Commands List */}
            <div className={styles.commandsList}>
              {filteredCommands.length === 0 ? (
                <div className={styles.noResults}>
                  <Search size={48} />
                  <p>Keine Befehle gefunden</p>
                  <span>Versuchen Sie eine andere Suche</span>
                </div>
              ) : (
                filteredCommands.map(group => (
                  <div key={group.category} className={styles.commandGroup}>
                    <h3 className={styles.groupTitle}>
                      {COMMAND_CATEGORIES[group.category].label}
                    </h3>
                    <div className={styles.commandGrid}>
                      {group.commands.map(renderCommandCard)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className={styles.footer}>
              <div className={styles.footerInfo}>
                <Mic size={16} />
                <span>
                  Voice Commerce powered by EATECH AI
                </span>
              </div>
              <button
                onClick={() => window.open('/admin/help/voice', '_blank')}
                className={styles.helpButton}
              >
                <HelpCircle size={16} />
                Mehr erfahren
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default VoiceCommandsModal;
