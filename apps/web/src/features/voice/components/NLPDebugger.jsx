/**
 * EATECH - NLP Debugger Component
 * Version: 4.3.0
 * Description: Advanced debugging interface for natural language processing and voice recognition
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/features/voice/components/NLPDebugger.jsx
 * 
 * Features:
 * - Real-time NLP pipeline visualization
 * - Intent confidence analysis
 * - Entity extraction debugging
 * - Swiss German dialect analysis
 * - Performance metrics
 * - Error tracking and analysis
 * - Export debug data
 */

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo, 
  useRef 
} from 'react';
import { 
  Bug, 
  X, 
  Activity, 
  Brain,
  Target, 
  Zap, 
  BarChart3,
  PieChart, 
  Download, 
  Upload,
  Play, 
  Pause, 
  RotateCcw,
  Copy, 
  Share, 
  Filter,
  Search, 
  Eye, 
  EyeOff,
  AlertTriangle, 
  CheckCircle,
  Info, 
  Clock, 
  Cpu,
  Database, 
  Network,
  MessageSquare, 
  Globe,
  Layers, 
  Code, 
  FileText
} from 'lucide-react';
import { useVoiceSettings } from '../hooks/useVoiceSettings';
import { usePerformanceMonitor } from '../../../hooks/usePerformanceMonitor';
import styles from './NLPDebugger.module.css';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const DEBUG_LEVELS = {
  ERROR: { level: 0, color: '#ef4444', label: 'Error' },
  WARN: { level: 1, color: '#f59e0b', label: 'Warning' },
  INFO: { level: 2, color: '#3b82f6', label: 'Info' },
  DEBUG: { level: 3, color: '#6b7280', label: 'Debug' },
  TRACE: { level: 4, color: '#9ca3af', label: 'Trace' }
};

const NLP_PIPELINE_STAGES = {
  PREPROCESSING: {
    id: 'preprocessing',
    title: 'Vorverarbeitung',
    description: 'Text-Normalisierung und Bereinigung',
    icon: Filter
  },
  TOKENIZATION: {
    id: 'tokenization',
    title: 'Tokenisierung',
    description: 'Aufteilung in Wörter und Tokens',
    icon: Layers
  },
  LANGUAGE_DETECTION: {
    id: 'language_detection',
    title: 'Spracherkennung',
    description: 'Erkennung der gesprochenen Sprache',
    icon: Globe
  },
  DIALECT_ANALYSIS: {
    id: 'dialect_analysis',
    title: 'Dialekt-Analyse',
    description: 'Schweizerdeutsch Dialekt-Erkennung',
    icon: MessageSquare
  },
  INTENT_CLASSIFICATION: {
    id: 'intent_classification',
    title: 'Intent-Klassifizierung',
    description: 'Erkennung der Benutzer-Absicht',
    icon: Target
  },
  ENTITY_EXTRACTION: {
    id: 'entity_extraction',
    title: 'Entity-Extraktion',
    description: 'Erkennung von Entitäten (Produkte, Mengen, etc.)',
    icon: Database
  },
  POSTPROCESSING: {
    id: 'postprocessing',
    title: 'Nachverarbeitung',
    description: 'Finale Verarbeitung und Validierung',
    icon: CheckCircle
  }
};

const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.6,
  LOW: 0.4
};

// ============================================================================
// COMPONENT
// ============================================================================

const NLPDebugger = ({
  currentIntent = null,
  processingResult = null,
  performanceMetrics = {},
  commandHistory = [],
  onClose,
  className = '',
  ...props
}) => {
  // ============================================================================
  // HOOKS & STATE
  // ============================================================================
  
  const { settings } = useVoiceSettings();
  const { getMetrics } = usePerformanceMonitor();
  
  const [debugLevel, setDebugLevel] = useState(DEBUG_LEVELS.INFO.level);
  const [selectedStage, setSelectedStage] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [selectedTabs, setSelectedTabs] = useState(['pipeline', 'metrics']);
  const [exportData, setExportData] = useState(null);
  
  // Pipeline state
  const [pipelineState, setPipelineState] = useState({});
  const [processingTime, setProcessingTime] = useState({});
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  
  // Refs
  const logsRef = useRef(null);
  const exportLinkRef = useRef(null);
  
  // ============================================================================
  // MEMOIZED VALUES
  // ============================================================================
  
  const filteredLogs = useMemo(() => {
    return debugLogs.filter(log => {
      if (log.level > debugLevel) return false;
      if (filterText && !log.message.toLowerCase().includes(filterText.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [debugLogs, debugLevel, filterText]);
  
  const pipelineProgress = useMemo(() => {
    const stages = Object.keys(NLP_PIPELINE_STAGES);
    const completed = Object.keys(pipelineState).filter(stage => 
      pipelineState[stage]?.status === 'completed'
    );
    return (completed.length / stages.length) * 100;
  }, [pipelineState]);
  
  const overallConfidence = useMemo(() => {
    if (!processingResult) return 0;
    
    const confidenceScores = [];
    if (processingResult.intentConfidence) confidenceScores.push(processingResult.intentConfidence);
    if (processingResult.entityConfidence) confidenceScores.push(processingResult.entityConfidence);
    if (processingResult.dialectConfidence) confidenceScores.push(processingResult.dialectConfidence);
    
    return confidenceScores.length > 0 
      ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
      : 0;
  }, [processingResult]);
  
  const performanceStats = useMemo(() => {
    const metrics = getMetrics();
    return {
      ...metrics,
      ...performanceMetrics,
      totalProcessingTime: Object.values(processingTime).reduce((sum, time) => sum + time, 0)
    };
  }, [getMetrics, performanceMetrics, processingTime]);
  
  // ============================================================================
  // LOGGING FUNCTIONS
  // ============================================================================
  
  const addLog = useCallback((message, level = DEBUG_LEVELS.INFO.level, data = null) => {
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      message,
      level,
      data,
      stage: selectedStage
    };
    
    setDebugLogs(prev => [...prev.slice(-99), logEntry]);
    
    // Auto-scroll to bottom
    if (logsRef.current) {
      setTimeout(() => {
        logsRef.current.scrollTop = logsRef.current.scrollHeight;
      }, 100);
    }
  }, [selectedStage]);
  
  const clearLogs = useCallback(() => {
    setDebugLogs([]);
  }, []);
  
  // ============================================================================
  // PIPELINE MONITORING
  // ============================================================================
  
  const updatePipelineStage = useCallback((stageId, status, data = {}, duration = 0) => {
    setPipelineState(prev => ({
      ...prev,
      [stageId]: {
        status,
        data,
        timestamp: new Date(),
        duration
      }
    }));
    
    setProcessingTime(prev => ({
      ...prev,
      [stageId]: duration
    }));
    
    addLog(`Pipeline Stage: ${stageId} - ${status}`, DEBUG_LEVELS.DEBUG.level, data);
  }, [addLog]);
  
  const simulatePipelineProcessing = useCallback((inputText) => {
    if (!inputText) return;
    
    setIsRecording(true);
    setPipelineState({});
    setProcessingTime({});
    setErrors([]);
    setWarnings([]);
    
    addLog(`Starting NLP pipeline for: "${inputText}"`, DEBUG_LEVELS.INFO.level);
    
    // Simulate pipeline stages
    Object.entries(NLP_PIPELINE_STAGES).forEach(([stageId, stage], index) => {
      setTimeout(() => {
        const startTime = performance.now();
        
        // Simulate processing
        let stageData = {};
        let stageStatus = 'completed';
        
        switch (stageId) {
          case 'preprocessing':
            stageData = {
              originalText: inputText,
              normalizedText: inputText.toLowerCase().trim(),
              removedChars: ['!', '?', '.'].filter(char => inputText.includes(char))
            };
            break;
            
          case 'tokenization':
            stageData = {
              tokens: inputText.split(' ').filter(t => t.length > 0),
              tokenCount: inputText.split(' ').length
            };
            break;
            
          case 'language_detection':
            stageData = {
              detectedLanguage: 'de-CH',
              confidence: 0.95,
              alternatives: [
                { language: 'de-DE', confidence: 0.85 },
                { language: 'de-AT', confidence: 0.75 }
              ]
            };
            break;
            
          case 'dialect_analysis':
            const swissWords = ['gaht', 'hät', 'chönd', 'zäme', 'gah', 'hätte gern'];
            const foundSwissWords = swissWords.filter(word => 
              inputText.toLowerCase().includes(word)
            );
            stageData = {
              dialectMarkers: foundSwissWords,
              dialectConfidence: foundSwissWords.length > 0 ? 0.8 : 0.2,
              region: foundSwissWords.length > 0 ? 'Zürich' : 'Unknown'
            };
            break;
            
          case 'intent_classification':
            const intentConfidence = Math.random() * 0.4 + 0.6; // 0.6 - 1.0
            stageData = {
              intent: currentIntent || 'order',
              confidence: intentConfidence,
              alternatives: [
                { intent: 'navigation', confidence: 0.3 },
                { intent: 'information', confidence: 0.1 }
              ]
            };
            
            if (intentConfidence < CONFIDENCE_THRESHOLDS.MEDIUM) {
              setWarnings(prev => [...prev, {
                stage: stageId,
                message: 'Low intent confidence detected',
                confidence: intentConfidence
              }]);
            }
            break;
            
          case 'entity_extraction':
            const entities = [];
            const productWords = ['pizza', 'kaffee', 'burger', 'salat'];
            const quantityWords = ['ein', 'zwei', 'drei', 'eine'];
            
            productWords.forEach(product => {
              if (inputText.toLowerCase().includes(product)) {
                entities.push({
                  type: 'product',
                  value: product,
                  confidence: 0.9
                });
              }
            });
            
            quantityWords.forEach(qty => {
              if (inputText.toLowerCase().includes(qty)) {
                entities.push({
                  type: 'quantity',
                  value: qty,
                  confidence: 0.8
                });
              }
            });
            
            stageData = { entities, entityCount: entities.length };
            break;
            
          case 'postprocessing':
            stageData = {
              finalResult: {
                intent: currentIntent || 'order',
                entities: pipelineState.entity_extraction?.data?.entities || [],
                confidence: overallConfidence,
                language: 'de-CH'
              },
              validationPassed: true
            };
            break;
            
          default:
            stageData = { processed: true };
        }
        
        const endTime = performance.now();
        const duration = endTime - startTime + Math.random() * 50; // Add simulated processing time
        
        updatePipelineStage(stageId, stageStatus, stageData, duration);
        
        // Complete recording after last stage
        if (index === Object.keys(NLP_PIPELINE_STAGES).length - 1) {
          setIsRecording(false);
          addLog(`Pipeline completed in ${Object.values(processingTime).reduce((sum, time) => sum + time, 0).toFixed(2)}ms`, DEBUG_LEVELS.INFO.level);
        }
      }, index * 200 + Math.random() * 100); // Stagger the stages
    });
  }, [currentIntent, overallConfidence, pipelineState, processingTime, updatePipelineStage, addLog]);
  
  // ============================================================================
  // EXPORT/IMPORT FUNCTIONS
  // ============================================================================
  
  const exportDebugData = useCallback(() => {
    const debugData = {
      timestamp: new Date().toISOString(),
      version: '4.3.0',
      pipelineState,
      processingTime,
      debugLogs: filteredLogs,
      performanceStats,
      errors,
      warnings,
      settings: settings.advanced
    };
    
    const dataStr = JSON.stringify(debugData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    setExportData(url);
    
    // Auto-download
    const link = document.createElement('a');
    link.href = url;
    link.download = `nlp-debug-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addLog('Debug data exported', DEBUG_LEVELS.INFO.level);
  }, [pipelineState, processingTime, filteredLogs, performanceStats, errors, warnings, settings.advanced, addLog]);
  
  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text).then(() => {
      addLog('Copied to clipboard', DEBUG_LEVELS.INFO.level);
    }).catch(() => {
      addLog('Failed to copy to clipboard', DEBUG_LEVELS.ERROR.level);
    });
  }, [addLog]);
  
  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  
  const renderPipelineStage = useCallback((stageId, stage) => {
    const stageState = pipelineState[stageId];
    const isActive = selectedStage === stageId;
    const isCompleted = stageState?.status === 'completed';
    const isProcessing = stageState?.status === 'processing';
    const hasError = stageState?.status === 'error';
    
    const Icon = stage.icon;
    
    return (
      <div
        key={stageId}
        className={`
          ${styles.pipelineStage}
          ${isActive ? styles.active : ''}
          ${isCompleted ? styles.completed : ''}
          ${isProcessing ? styles.processing : ''}
          ${hasError ? styles.error : ''}
        `}
        onClick={() => setSelectedStage(isActive ? null : stageId)}
      >
        <div className={styles.stageHeader}>
          <Icon size={16} />
          <span className={styles.stageTitle}>{stage.title}</span>
          <span className={styles.stageDuration}>
            {processingTime[stageId] ? `${processingTime[stageId].toFixed(1)}ms` : ''}
          </span>
        </div>
        
        <div className={styles.stageDescription}>
          {stage.description}
        </div>
        
        {isActive && stageState?.data && (
          <div className={styles.stageData}>
            <pre>{JSON.stringify(stageState.data, null, 2)}</pre>
          </div>
        )}
      </div>
    );
  }, [pipelineState, selectedStage, processingTime]);
  
  const renderLogEntry = useCallback((log) => {
    const debugLevel = Object.values(DEBUG_LEVELS).find(level => level.level === log.level);
    
    return (
      <div key={log.id} className={`${styles.logEntry} ${styles[debugLevel?.label?.toLowerCase()]}`}>
        <div className={styles.logTimestamp}>
          {log.timestamp.toLocaleTimeString()}
        </div>
        <div className={styles.logLevel} style={{ color: debugLevel?.color }}>
          {debugLevel?.label}
        </div>
        <div className={styles.logMessage}>{log.message}</div>
        {log.data && (
          <button
            className={styles.logDataToggle}
            onClick={() => copyToClipboard(JSON.stringify(log.data, null, 2))}
          >
            <Copy size={12} />
          </button>
        )}
      </div>
    );
  }, [copyToClipboard]);
  
  const renderMetricsPanel = useCallback(() => {
    return (
      <div className={styles.metricsPanel}>
        <h4>Performance Metriken</h4>
        
        <div className={styles.metricsGrid}>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Gesamtzeit</span>
            <span className={styles.metricValue}>
              {performanceStats.totalProcessingTime?.toFixed(2) || 0}ms
            </span>
          </div>
          
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Pipeline Progress</span>
            <span className={styles.metricValue}>{pipelineProgress.toFixed(1)}%</span>
          </div>
          
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Confidence</span>
            <span className={styles.metricValue}>
              {(overallConfidence * 100).toFixed(1)}%
            </span>
          </div>
          
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Errors</span>
            <span className={`${styles.metricValue} ${errors.length > 0 ? styles.error : ''}`}>
              {errors.length}
            </span>
          </div>
          
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Warnings</span>
            <span className={`${styles.metricValue} ${warnings.length > 0 ? styles.warning : ''}`}>
              {warnings.length}
            </span>
          </div>
        </div>
        
        {(errors.length > 0 || warnings.length > 0) && (
          <div className={styles.issuesSection}>
            {errors.map((error, index) => (
              <div key={index} className={styles.errorItem}>
                <AlertTriangle size={16} />
                <span>{error.message}</span>
              </div>
            ))}
            {warnings.map((warning, index) => (
              <div key={index} className={styles.warningItem}>
                <Info size={16} />
                <span>{warning.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }, [performanceStats, pipelineProgress, overallConfidence, errors, warnings]);
  
  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  useEffect(() => {
    // Simulate processing when new data arrives
    if (processingResult?.transcript) {
      simulatePipelineProcessing(processingResult.transcript);
    }
  }, [processingResult?.transcript, simulatePipelineProcessing]);
  
  useEffect(() => {
    // Add initial welcome log
    addLog('NLP Debugger initialized', DEBUG_LEVELS.INFO.level);
  }, [addLog]);
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <div className={`${styles.nlpDebugger} ${className}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <Bug size={24} />
          <h2>NLP Debugger</h2>
          <div className={styles.statusIndicators}>
            {isRecording && (
              <div className={styles.recordingIndicator}>
                <Activity size={16} />
                <span>Recording</span>
              </div>
            )}
          </div>
        </div>
        
        <div className={styles.headerActions}>
          <button
            className={styles.actionButton}
            onClick={() => simulatePipelineProcessing('Test input für debugging')}
            disabled={isRecording}
          >
            <Play size={16} />
            Test Pipeline
          </button>
          
          <button
            className={styles.actionButton}
            onClick={exportDebugData}
          >
            <Download size={16} />
            Export
          </button>
          
          <button
            className={styles.closeButton}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
      </div>
      
      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.debugLevelSelector}>
          <label>Debug Level:</label>
          <select
            value={debugLevel}
            onChange={(e) => setDebugLevel(parseInt(e.target.value))}
          >
            {Object.entries(DEBUG_LEVELS).map(([key, level]) => (
              <option key={key} value={level.level}>
                {level.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className={styles.filterSection}>
          <button
            className={`${styles.filterToggle} ${showFilters ? styles.active : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            Filter
          </button>
          
          {showFilters && (
            <div className={styles.filterInputs}>
              <input
                type="text"
                placeholder="Filter logs..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
          )}
        </div>
        
        <button
          className={styles.clearButton}
          onClick={clearLogs}
        >
          <RotateCcw size={16} />
          Clear Logs
        </button>
      </div>
      
      {/* Content */}
      <div className={styles.content}>
        {/* Pipeline Visualization */}
        <div className={styles.pipelineSection}>
          <h3>NLP Pipeline</h3>
          <div className={styles.pipelineProgress}>
            <div 
              className={styles.progressBar}
              style={{ width: `${pipelineProgress}%` }}
            />
          </div>
          <div className={styles.pipelineStages}>
            {Object.entries(NLP_PIPELINE_STAGES).map(([stageId, stage]) =>
              renderPipelineStage(stageId, stage)
            )}
          </div>
        </div>
        
        {/* Metrics Panel */}
        {renderMetricsPanel()}
        
        {/* Debug Logs */}
        <div className={styles.logsSection}>
          <h3>Debug Logs ({filteredLogs.length})</h3>
          <div ref={logsRef} className={styles.logsList}>
            {filteredLogs.map(renderLogEntry)}
          </div>
        </div>
      </div>
    </div>
  );
};

export { NLPDebugger };