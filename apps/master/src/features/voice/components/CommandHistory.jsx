/**
 * EATECH - Command History Component
 * Version: 3.7.0
 * Description: Interactive voice command history with analytics and replay
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/features/voice/components/CommandHistory.jsx
 * 
 * Features:
 * - Command history display with timestamps
 * - Confidence scoring and success indicators
 * - Command replay functionality
 * - Search and filtering capabilities
 * - Export and analytics features
 * - Accessibility support
 * - Performance optimization
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
  Clock, MessageSquare, Check, X, RotateCcw,
  Search, Filter, Download, Trash2, Play,
  BarChart3, TrendingUp, AlertCircle, Info,
  ChevronDown, ChevronUp, Star, Archive,
  Volume2, Mic, Settings, Eye, EyeOff
} from 'lucide-react';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { de } from 'date-fns/locale';
import styles from './CommandHistory.module.css';

// Lazy loaded components
const CommandAnalytics = lazy(() => import('./CommandAnalytics'));
const ExportDialog = lazy(() => import('./ExportDialog'));

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const HISTORY_CONFIG = {
  // Display options
  ITEMS_PER_PAGE: 20,
  MAX_TRANSCRIPT_LENGTH: 100,
  AUTO_REFRESH_INTERVAL: 30000, // 30 seconds
  
  // Filter options
  FILTERS: {
    ALL: 'all',
    SUCCESS: 'success',
    FAILED: 'failed',
    TODAY: 'today',
    YESTERDAY: 'yesterday',
    THIS_WEEK: 'this_week'
  },
  
  // Sort options
  SORT_OPTIONS: {
    NEWEST: 'newest',
    OLDEST: 'oldest',
    CONFIDENCE: 'confidence',
    DURATION: 'duration'
  },
  
  // Intent categories with icons and colors
  INTENT_CATEGORIES: {
    order: { icon: '🛒', color: '#10b981', label: 'Bestellung' },
    navigation: { icon: '🧭', color: '#3b82f6', label: 'Navigation' },
    inquiry: { icon: '❓', color: '#f59e0b', label: 'Anfrage' },
    checkout: { icon: '💳', color: '#8b5cf6', label: 'Bezahlung' },
    control: { icon: '⚙️', color: '#6b7280', label: 'Steuerung' },
    unknown: { icon: '❔', color: '#ef4444', label: 'Unbekannt' }
  },
  
  // Confidence thresholds
  CONFIDENCE_LEVELS: {
    HIGH: 0.8,
    MEDIUM: 0.6,
    LOW: 0.4
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getConfidenceLevel = (confidence) => {
  if (confidence >= HISTORY_CONFIG.CONFIDENCE_LEVELS.HIGH) return 'high';
  if (confidence >= HISTORY_CONFIG.CONFIDENCE_LEVELS.MEDIUM) return 'medium';
  return 'low';
};

const getConfidenceColor = (confidence) => {
  const level = getConfidenceLevel(confidence);
  switch (level) {
    case 'high': return '#10b981';
    case 'medium': return '#f59e0b';
    case 'low': return '#ef4444';
    default: return '#6b7280';
  }
};

const truncateText = (text, maxLength) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

const groupCommandsByDate = (commands) => {
  const groups = {};
  
  commands.forEach(command => {
    const date = new Date(command.timestamp);
    let key;
    
    if (isToday(date)) {
      key = 'Heute';
    } else if (isYesterday(date)) {
      key = 'Gestern';
    } else {
      key = format(date, 'dd.MM.yyyy', { locale: de });
    }
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(command);
  });
  
  return groups;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const CommandHistory = ({
  commands = [],
  onCommandSelect,
  onCommandReplay,
  onClearHistory,
  onExportHistory,
  language = 'de-CH',
  maxItems = 100,
  showAnalytics = true,
  showExport = true,
  autoRefresh = false,
  className = ''
}) => {
  
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================
  
  const [filteredCommands, setFilteredCommands] = useState(commands);
  const [selectedCommands, setSelectedCommands] = useState([]);
  const [expandedCommand, setExpandedCommand] = useState(null);
  
  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState(HISTORY_CONFIG.FILTERS.ALL);
  const [sortBy, setSortBy] = useState(HISTORY_CONFIG.SORT_OPTIONS.NEWEST);
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(HISTORY_CONFIG.ITEMS_PER_PAGE);
  
  // UI state
  const [showAnalyticsPanel, setShowAnalyticsPanel] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [groupByDate, setGroupByDate] = useState(true);
  
  // Performance state
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  
  const containerRef = useRef(null);
  const refreshIntervalRef = useRef(null);
  
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const totalPages = useMemo(() => 
    Math.ceil(filteredCommands.length / itemsPerPage),
    [filteredCommands.length, itemsPerPage]
  );
  
  const paginatedCommands = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCommands.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCommands, currentPage, itemsPerPage]);
  
  const displayCommands = useMemo(() => {
    if (groupByDate) {
      return groupCommandsByDate(paginatedCommands);
    }
    return { 'Alle Befehle': paginatedCommands };
  }, [paginatedCommands, groupByDate]);
  
  const statistics = useMemo(() => {
    const total = commands.length;
    const successful = commands.filter(cmd => cmd.result?.success).length;
    const failed = total - successful;
    const avgConfidence = total > 0 ? 
      commands.reduce((sum, cmd) => sum + (cmd.confidence || 0), 0) / total : 0;
    
    const intentCounts = commands.reduce((counts, cmd) => {
      const intent = cmd.intent?.name || 'unknown';
      counts[intent] = (counts[intent] || 0) + 1;
      return counts;
    }, {});
    
    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      avgConfidence,
      intentCounts
    };
  }, [commands]);
  
  // ============================================================================
  // FILTERING & SORTING
  // ============================================================================
  
  const applyFilters = useCallback(() => {
    let filtered = [...commands];
    
    // Apply search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(command =>
        command.transcript?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        command.intent?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        command.result?.message?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply status filter
    switch (activeFilter) {
      case HISTORY_CONFIG.FILTERS.SUCCESS:
        filtered = filtered.filter(cmd => cmd.result?.success);
        break;
      case HISTORY_CONFIG.FILTERS.FAILED:
        filtered = filtered.filter(cmd => !cmd.result?.success);
        break;
      case HISTORY_CONFIG.FILTERS.TODAY:
        filtered = filtered.filter(cmd => isToday(new Date(cmd.timestamp)));
        break;
      case HISTORY_CONFIG.FILTERS.YESTERDAY:
        filtered = filtered.filter(cmd => isYesterday(new Date(cmd.timestamp)));
        break;
      case HISTORY_CONFIG.FILTERS.THIS_WEEK:
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(cmd => new Date(cmd.timestamp) >= weekAgo);
        break;
    }
    
    // Apply sorting
    switch (sortBy) {
      case HISTORY_CONFIG.SORT_OPTIONS.NEWEST:
        filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        break;
      case HISTORY_CONFIG.SORT_OPTIONS.OLDEST:
        filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        break;
      case HISTORY_CONFIG.SORT_OPTIONS.CONFIDENCE:
        filtered.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
        break;
      case HISTORY_CONFIG.SORT_OPTIONS.DURATION:
        filtered.sort((a, b) => (b.processingTime || 0) - (a.processingTime || 0));
        break;
    }
    
    // Limit to maxItems
    if (filtered.length > maxItems) {
      filtered = filtered.slice(0, maxItems);
    }
    
    setFilteredCommands(filtered);
    setCurrentPage(1); // Reset to first page
  }, [commands, searchQuery, activeFilter, sortBy, maxItems]);
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);
  
  useEffect(() => {
    setLastUpdateTime(Date.now());
  }, [commands]);
  
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        setLastUpdateTime(Date.now());
      }, HISTORY_CONFIG.AUTO_REFRESH_INTERVAL);
      
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [autoRefresh]);
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleCommandClick = useCallback((command) => {
    if (isSelectionMode) {
      setSelectedCommands(prev => {
        const isSelected = prev.some(cmd => cmd.id === command.id);
        if (isSelected) {
          return prev.filter(cmd => cmd.id !== command.id);
        } else {
          return [...prev, command];
        }
      });
    } else {
      setExpandedCommand(prev => prev?.id === command.id ? null : command);
      onCommandSelect?.(command);
    }
  }, [isSelectionMode, onCommandSelect]);
  
  const handleCommandReplay = useCallback((command, event) => {
    event.stopPropagation();
    onCommandReplay?.(command);
  }, [onCommandReplay]);
  
  const handleSearchChange = useCallback((event) => {
    setSearchQuery(event.target.value);
  }, []);
  
  const handleFilterChange = useCallback((filter) => {
    setActiveFilter(filter);
    setShowFilters(false);
  }, []);
  
  const handleSortChange = useCallback((event) => {
    setSortBy(event.target.value);
  }, []);
  
  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    
    // Scroll to top of container
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, []);
  
  const handleSelectAll = useCallback(() => {
    if (selectedCommands.length === paginatedCommands.length) {
      setSelectedCommands([]);
    } else {
      setSelectedCommands([...paginatedCommands]);
    }
  }, [selectedCommands.length, paginatedCommands]);
  
  const handleDeleteSelected = useCallback(() => {
    const selectedIds = selectedCommands.map(cmd => cmd.id);
    const remainingCommands = commands.filter(cmd => !selectedIds.includes(cmd.id));
    
    // This would typically call a parent handler to update the commands
    // onDeleteCommands?.(selectedIds);
    
    setSelectedCommands([]);
    setIsSelectionMode(false);
  }, [selectedCommands, commands]);
  
  const handleExportSelected = useCallback(() => {
    const exportData = selectedCommands.length > 0 ? selectedCommands : filteredCommands;
    onExportHistory?.(exportData);
  }, [selectedCommands, filteredCommands, onExportHistory]);
  
  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  
  const renderToolbar = () => (
    <div className={styles.toolbar}>
      <div className={styles.toolbarLeft}>
        {/* Search */}
        <div className={styles.searchContainer}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Befehle durchsuchen..."
            value={searchQuery}
            onChange={handleSearchChange}
            className={styles.searchInput}
          />
        </div>
        
        {/* Filters */}
        <div className={styles.filterContainer}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`${styles.filterButton} ${activeFilter !== HISTORY_CONFIG.FILTERS.ALL ? styles.active : ''}`}
          >
            <Filter size={16} />
            Filter
            {activeFilter !== HISTORY_CONFIG.FILTERS.ALL && (
              <span className={styles.filterBadge}>1</span>
            )}
          </button>
          
          {showFilters && (
            <div className={styles.filterDropdown}>
              {Object.entries(HISTORY_CONFIG.FILTERS).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => handleFilterChange(value)}
                  className={`${styles.filterOption} ${activeFilter === value ? styles.active : ''}`}
                >
                  {key === 'ALL' && 'Alle'}
                  {key === 'SUCCESS' && 'Erfolgreich'}
                  {key === 'FAILED' && 'Fehlgeschlagen'}
                  {key === 'TODAY' && 'Heute'}
                  {key === 'YESTERDAY' && 'Gestern'}
                  {key === 'THIS_WEEK' && 'Diese Woche'}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Sort */}
        <select
          value={sortBy}
          onChange={handleSortChange}
          className={styles.sortSelect}
        >
          <option value={HISTORY_CONFIG.SORT_OPTIONS.NEWEST}>Neueste zuerst</option>
          <option value={HISTORY_CONFIG.SORT_OPTIONS.OLDEST}>Älteste zuerst</option>
          <option value={HISTORY_CONFIG.SORT_OPTIONS.CONFIDENCE}>Nach Sicherheit</option>
          <option value={HISTORY_CONFIG.SORT_OPTIONS.DURATION}>Nach Dauer</option>
        </select>
      </div>
      
      <div className={styles.toolbarRight}>
        {/* Selection Mode Toggle */}
        <button
          onClick={() => {
            setIsSelectionMode(!isSelectionMode);
            setSelectedCommands([]);
          }}
          className={`${styles.toolbarButton} ${isSelectionMode ? styles.active : ''}`}
        >
          <Archive size={16} />
        </button>
        
        {/* Group by Date Toggle */}
        <button
          onClick={() => setGroupByDate(!groupByDate)}
          className={`${styles.toolbarButton} ${groupByDate ? styles.active : ''}`}
        >
          <Clock size={16} />
        </button>
        
        {/* Analytics Toggle */}
        {showAnalytics && (
          <button
            onClick={() => setShowAnalyticsPanel(!showAnalyticsPanel)}
            className={`${styles.toolbarButton} ${showAnalyticsPanel ? styles.active : ''}`}
          >
            <BarChart3 size={16} />
          </button>
        )}
        
        {/* Export */}
        {showExport && (
          <button
            onClick={() => setShowExportDialog(true)}
            className={styles.toolbarButton}
          >
            <Download size={16} />
          </button>
        )}
        
        {/* Clear History */}
        <button
          onClick={() => {
            if (window.confirm('Möchten Sie den gesamten Befehlsverlauf löschen?')) {
              onClearHistory?.();
            }
          }}
          className={styles.toolbarButton}
          title="Verlauf löschen"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
  
  const renderSelectionToolbar = () => {
    if (!isSelectionMode || selectedCommands.length === 0) return null;
    
    return (
      <div className={styles.selectionToolbar}>
        <span className={styles.selectionCount}>
          {selectedCommands.length} ausgewählt
        </span>
        
        <div className={styles.selectionActions}>
          <button
            onClick={handleSelectAll}
            className={styles.selectionButton}
          >
            {selectedCommands.length === paginatedCommands.length ? 'Alle abwählen' : 'Alle auswählen'}
          </button>
          
          <button
            onClick={handleExportSelected}
            className={styles.selectionButton}
          >
            <Download size={14} />
            Exportieren
          </button>
          
          <button
            onClick={handleDeleteSelected}
            className={`${styles.selectionButton} ${styles.danger}`}
          >
            <Trash2 size={14} />
            Löschen
          </button>
        </div>
      </div>
    );
  };
  
  const renderStatistics = () => (
    <div className={styles.statistics}>
      <div className={styles.statItem}>
        <span className={styles.statValue}>{statistics.total}</span>
        <span className={styles.statLabel}>Befehle</span>
      </div>
      <div className={styles.statItem}>
        <span className={styles.statValue} style={{ color: '#10b981' }}>
          {statistics.successful}
        </span>
        <span className={styles.statLabel}>Erfolgreich</span>
      </div>
      <div className={styles.statItem}>
        <span className={styles.statValue} style={{ color: '#ef4444' }}>
          {statistics.failed}
        </span>
        <span className={styles.statLabel}>Fehlgeschlagen</span>
      </div>
      <div className={styles.statItem}>
        <span className={styles.statValue}>
          {Math.round(statistics.successRate)}%
        </span>
        <span className={styles.statLabel}>Erfolgsrate</span>
      </div>
    </div>
  );
  
  const renderCommand = (command) => {
    const isSelected = selectedCommands.some(cmd => cmd.id === command.id);
    const isExpanded = expandedCommand?.id === command.id;
    const intentCategory = HISTORY_CONFIG.INTENT_CATEGORIES[command.intent?.name] || 
                          HISTORY_CONFIG.INTENT_CATEGORIES.unknown;
    
    return (
      <div
        key={command.id}
        className={`${styles.commandItem} ${isSelected ? styles.selected : ''} ${isExpanded ? styles.expanded : ''}`}
        onClick={() => handleCommandClick(command)}
      >
        <div className={styles.commandHeader}>
          {/* Selection Checkbox */}
          {isSelectionMode && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleCommandClick(command)}
              className={styles.commandCheckbox}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          
          {/* Intent Icon */}
          <div 
            className={styles.intentIcon}
            style={{ backgroundColor: intentCategory.color }}
            title={intentCategory.label}
          >
            {intentCategory.icon}
          </div>
          
          {/* Command Content */}
          <div className={styles.commandContent}>
            <div className={styles.commandTranscript}>
              "{truncateText(command.transcript || '', HISTORY_CONFIG.MAX_TRANSCRIPT_LENGTH)}"
            </div>
            
            <div className={styles.commandMeta}>
              <span className={styles.commandTime}>
                {formatDistanceToNow(new Date(command.timestamp), { 
                  addSuffix: true, 
                  locale: de 
                })}
              </span>
              
              {command.confidence && (
                <span 
                  className={styles.commandConfidence}
                  style={{ color: getConfidenceColor(command.confidence) }}
                >
                  {Math.round(command.confidence * 100)}%
                </span>
              )}
              
              {command.processingTime && (
                <span className={styles.commandDuration}>
                  {Math.round(command.processingTime)}ms
                </span>
              )}
            </div>
          </div>
          
          {/* Status Icon */}
          <div className={styles.commandStatus}>
            {command.result?.success ? (
              <Check size={16} className={styles.successIcon} />
            ) : (
              <X size={16} className={styles.errorIcon} />
            )}
          </div>
          
          {/* Actions */}
          <div className={styles.commandActions}>
            {onCommandReplay && (
              <button
                onClick={(e) => handleCommandReplay(command, e)}
                className={styles.actionButton}
                title="Befehl wiederholen"
              >
                <RotateCcw size={14} />
              </button>
            )}
            
            <button
              onClick={(e) => e.stopPropagation()}
              className={styles.actionButton}
              title={isExpanded ? 'Zuklappen' : 'Aufklappen'}
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>
        
        {/* Expanded Details */}
        {isExpanded && (
          <div className={styles.commandDetails}>
            <div className={styles.detailSection}>
              <h4>Intent</h4>
              <p>{command.intent?.name || 'Unbekannt'}</p>
              {command.intent?.entities && command.intent.entities.length > 0 && (
                <div className={styles.entities}>
                  <strong>Entitäten:</strong>
                  {command.intent.entities.map((entity, index) => (
                    <span key={index} className={styles.entity}>
                      {entity.type}: {entity.value}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            {command.result && (
              <div className={styles.detailSection}>
                <h4>Ergebnis</h4>
                <p className={command.result.success ? styles.successText : styles.errorText}>
                  {command.result.message || command.result.error}
                </p>
                {command.result.data && (
                  <pre className={styles.resultData}>
                    {JSON.stringify(command.result.data, null, 2)}
                  </pre>
                )}
              </div>
            )}
            
            <div className={styles.detailSection}>
              <h4>Technische Details</h4>
              <div className={styles.technicalDetails}>
                <span>Zeitstempel: {format(new Date(command.timestamp), 'dd.MM.yyyy HH:mm:ss')}</span>
                <span>Vertrauenswert: {Math.round((command.confidence || 0) * 100)}%</span>
                <span>Verarbeitungszeit: {command.processingTime || 0}ms</span>
                <span>Sprache: {command.language || language}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  const renderCommandGroups = () => {
    if (Object.keys(displayCommands).length === 0) {
      return (
        <div className={styles.emptyState}>
          <MessageSquare size={48} />
          <h3>Keine Befehle gefunden</h3>
          <p>
            {searchQuery || activeFilter !== HISTORY_CONFIG.FILTERS.ALL
              ? 'Versuchen Sie andere Suchbegriffe oder Filter'
              : 'Verwenden Sie die Sprachsteuerung um Befehle zu sehen'
            }
          </p>
        </div>
      );
    }
    
    return Object.entries(displayCommands).map(([groupName, groupCommands]) => (
      <div key={groupName} className={styles.commandGroup}>
        {groupByDate && (
          <div className={styles.groupHeader}>
            <Clock size={16} />
            <span>{groupName}</span>
            <span className={styles.groupCount}>({groupCommands.length})</span>
          </div>
        )}
        
        <div className={styles.commandList}>
          {groupCommands.map(renderCommand)}
        </div>
      </div>
    ));
  };
  
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    return (
      <div className={styles.pagination}>
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={styles.paginationButton}
        >
          ← Zurück
        </button>
        
        <div className={styles.paginationInfo}>
          Seite {currentPage} von {totalPages}
        </div>
        
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={styles.paginationButton}
        >
          Weiter →
        </button>
      </div>
    );
  };
  
  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  return (
    <div className={`${styles.commandHistory} ${className}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3 className={styles.title}>
            <MessageSquare size={20} />
            Befehlsverlauf
          </h3>
          <span className={styles.lastUpdate}>
            Zuletzt aktualisiert: {format(new Date(lastUpdateTime), 'HH:mm:ss')}
          </span>
        </div>
        
        {/* Statistics */}
        {renderStatistics()}
      </div>
      
      {/* Toolbar */}
      {renderToolbar()}
      
      {/* Selection Toolbar */}
      {renderSelectionToolbar()}
      
      {/* Content */}
      <div ref={containerRef} className={styles.content}>
        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>Lade Befehle...</span>
          </div>
        ) : (
          renderCommandGroups()
        )}
      </div>
      
      {/* Pagination */}
      {renderPagination()}
      
      {/* Analytics Panel */}
      {showAnalyticsPanel && (
        <Suspense fallback={<div className={styles.loading}>Lade Analytics...</div>}>
          <CommandAnalytics
            commands={filteredCommands}
            onClose={() => setShowAnalyticsPanel(false)}
          />
        </Suspense>
      )}
      
      {/* Export Dialog */}
      {showExportDialog && (
        <Suspense fallback={<div className={styles.loading}>Lade Export...</div>}>
          <ExportDialog
            commands={selectedCommands.length > 0 ? selectedCommands : filteredCommands}
            onClose={() => setShowExportDialog(false)}
            onExport={handleExportSelected}
          />
        </Suspense>
      )}
    </div>
  );
};

export default CommandHistory;