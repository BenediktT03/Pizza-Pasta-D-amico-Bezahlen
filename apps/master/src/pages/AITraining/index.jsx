/**
 * EATECH - AI Training Main Page
 * Version: 1.0.0
 * Description: Hauptseite für AI Model Training und Management
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/master/src/pages/AITraining/index.jsx
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Brain,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  MoreVertical,
  Play,
  Pause,
  Stop,
  RefreshCw,
  Eye,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  TrendingUp,
  Clock,
  Cpu,
  Database,
  BarChart3,
  Activity,
  Settings,
  FileText,
  GitBranch,
  Package,
  Shield,
  Sparkles,
  Calculator,
  ChevronRight,
  ExternalLink,
  Info,
  Calendar,
  Zap,
  Target,
  Award,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import ModelTrainer from './components/ModelTrainer';
import TrainingMonitor from './components/TrainingMonitor';
import ModelDetails from './components/ModelDetails';
import styles from './AITraining.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const MODEL_STATUS = {
  draft: { label: 'Entwurf', color: '#6b7280', icon: FileText },
  training: { label: 'Training', color: '#f59e0b', icon: Activity },
  evaluating: { label: 'Evaluierung', color: '#8b5cf6', icon: BarChart3 },
  ready: { label: 'Bereit', color: '#10b981', icon: Check },
  deployed: { label: 'Deployed', color: '#3b82f6', icon: Zap },
  failed: { label: 'Fehlgeschlagen', color: '#ef4444', icon: AlertCircle },
  archived: { label: 'Archiviert', color: '#6b7280', icon: Package }
};

const FILTER_OPTIONS = {
  status: [
    { value: 'all', label: 'Alle Status' },
    { value: 'draft', label: 'Entwurf' },
    { value: 'training', label: 'Training' },
    { value: 'ready', label: 'Bereit' },
    { value: 'deployed', label: 'Deployed' },
    { value: 'failed', label: 'Fehlgeschlagen' }
  ],
  type: [
    { value: 'all', label: 'Alle Typen' },
    { value: 'demand_forecast', label: 'Nachfrage-Vorhersage' },
    { value: 'price_optimization', label: 'Preis-Optimierung' },
    { value: 'emergency_ai', label: 'Notfall-KI' },
    { value: 'recommendation', label: 'Empfehlungs-Engine' },
    { value: 'inventory', label: 'Lagerbestand' }
  ],
  sortBy: [
    { value: 'created_desc', label: 'Neueste zuerst' },
    { value: 'created_asc', label: 'Älteste zuerst' },
    { value: 'name_asc', label: 'Name (A-Z)' },
    { value: 'name_desc', label: 'Name (Z-A)' },
    { value: 'accuracy_desc', label: 'Beste Genauigkeit' }
  ]
};

// ============================================================================
// MOCK DATA
// ============================================================================
const MOCK_MODELS = [
  {
    id: 'model_001',
    name: 'Demand Forecast Q1 2025',
    description: 'LSTM-basierte Nachfrageprognose für Q1 2025 mit Wetter- und Event-Daten',
    type: 'demand_forecast',
    status: 'deployed',
    architecture: 'lstm',
    created: '2025-01-05T10:30:00Z',
    lastTrained: '2025-01-06T14:20:00Z',
    version: '1.2.0',
    metrics: {
      mae: 0.082,
      rmse: 0.124,
      mape: 0.156,
      accuracy: 0.943
    },
    performance: {
      avgPredictionTime: 23,
      dailyPredictions: 1247,
      cpuUsage: 0.34,
      memoryUsage: 0.56
    },
    dataSources: ['orders', 'weather', 'events'],
    trainingDuration: 3460,
    deployments: 3
  },
  {
    id: 'model_002',
    name: 'Dynamic Pricing Engine',
    description: 'Gradient Boosting für dynamische Preisoptimierung basierend auf Nachfrage',
    type: 'price_optimization',
    status: 'training',
    architecture: 'gradient_boosting',
    created: '2025-01-07T08:15:00Z',
    lastTrained: '2025-01-08T09:00:00Z',
    version: '0.9.0',
    currentEpoch: 67,
    totalEpochs: 100,
    estimatedTimeRemaining: 1820,
    metrics: {
      revenue_uplift: 0.124,
      elasticity: -1.82,
      accuracy: 0.876
    },
    dataSources: ['orders', 'products', 'competitors'],
    trainingProgress: 0.67
  },
  {
    id: 'model_003',
    name: 'Emergency Response AI',
    description: 'Entscheidungsbaum für schnelle Notfall-Reaktionen',
    type: 'emergency_ai',
    status: 'ready',
    architecture: 'decision_tree',
    created: '2025-01-04T16:45:00Z',
    lastTrained: '2025-01-05T11:30:00Z',
    version: '2.0.1',
    metrics: {
      precision: 0.956,
      recall: 0.942,
      response_time: 12.5,
      f1_score: 0.949
    },
    performance: {
      avgPredictionTime: 8,
      dailyPredictions: 328,
      cpuUsage: 0.12,
      memoryUsage: 0.23
    },
    dataSources: ['incidents', 'system_logs', 'alerts'],
    trainingDuration: 890
  },
  {
    id: 'model_004',
    name: 'Menu Recommendation V3',
    description: 'Collaborative Filtering für personalisierte Menü-Empfehlungen',
    type: 'recommendation',
    status: 'evaluating',
    architecture: 'collaborative_filtering',
    created: '2025-01-06T12:00:00Z',
    lastTrained: '2025-01-07T18:45:00Z',
    version: '3.0.0-beta',
    metrics: {
      precision_at_k: 0.823,
      recall_at_k: 0.756,
      ndcg: 0.891
    },
    dataSources: ['orders', 'customers', 'products'],
    evaluationProgress: 0.85,
    testResults: {
      auc: 0.912,
      coverage: 0.94
    }
  },
  {
    id: 'model_005',
    name: 'Inventory Optimizer',
    description: 'ARIMA-Modell für optimale Lagerbestandsverwaltung',
    type: 'inventory',
    status: 'draft',
    architecture: 'arima',
    created: '2025-01-08T07:00:00Z',
    version: '0.1.0',
    dataSources: ['inventory', 'orders', 'suppliers'],
    hyperparameters: {
      p: 2,
      d: 1,
      q: 2,
      seasonal: 7
    }
  },
  {
    id: 'model_006',
    name: 'Weekend Demand Spike',
    description: 'Spezialisiertes Modell für Wochenend-Nachfragespitzen',
    type: 'demand_forecast',
    status: 'failed',
    architecture: 'lstm',
    created: '2025-01-03T14:20:00Z',
    lastTrained: '2025-01-03T16:45:00Z',
    version: '0.3.0',
    error: 'Out of memory: Dataset too large for current configuration',
    metrics: {
      mae: 0.234,
      rmse: 0.341,
      mape: 0.412
    },
    dataSources: ['orders', 'weather'],
    trainingDuration: 8920
  }
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================
const ModelCard = ({ model, onView, onAction }) => {
  const [showMenu, setShowMenu] = useState(false);
  const status = MODEL_STATUS[model.status];
  const StatusIcon = status.icon;
  
  const getMainMetric = () => {
    switch (model.type) {
      case 'demand_forecast':
        return { label: 'MAPE', value: `${(model.metrics?.mape * 100).toFixed(1)}%`, trend: 'down' };
      case 'price_optimization':
        return { label: 'Revenue', value: `+${(model.metrics?.revenue_uplift * 100).toFixed(1)}%`, trend: 'up' };
      case 'emergency_ai':
        return { label: 'F1 Score', value: model.metrics?.f1_score?.toFixed(3), trend: 'stable' };
      case 'recommendation':
        return { label: 'NDCG', value: model.metrics?.ndcg?.toFixed(3), trend: 'up' };
      case 'inventory':
        return { label: 'Stockout', value: `${(model.metrics?.stockout_rate * 100).toFixed(1)}%`, trend: 'down' };
      default:
        return { label: 'Accuracy', value: model.metrics?.accuracy?.toFixed(3), trend: 'stable' };
    }
  };
  
  const mainMetric = getMainMetric();
  
  return (
    <div className={styles.modelCard}>
      <div className={styles.modelHeader}>
        <div className={styles.modelInfo}>
          <h3>{model.name}</h3>
          <p>{model.description}</p>
        </div>
        <div className={styles.modelActions}>
          <button
            className={styles.menuButton}
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreVertical size={20} />
          </button>
          {showMenu && (
            <div className={styles.dropdownMenu}>
              <button onClick={() => onAction(model, 'view')}>
                <Eye size={16} />
                Details anzeigen
              </button>
              {model.status === 'ready' && (
                <button onClick={() => onAction(model, 'deploy')}>
                  <Zap size={16} />
                  Deployen
                </button>
              )}
              {model.status === 'deployed' && (
                <button onClick={() => onAction(model, 'undeploy')}>
                  <Pause size={16} />
                  Undeploy
                </button>
              )}
              {(model.status === 'ready' || model.status === 'deployed') && (
                <button onClick={() => onAction(model, 'retrain')}>
                  <RefreshCw size={16} />
                  Neu trainieren
                </button>
              )}
              <button onClick={() => onAction(model, 'duplicate')}>
                <Copy size={16} />
                Duplizieren
              </button>
              <button onClick={() => onAction(model, 'export')}>
                <Download size={16} />
                Exportieren
              </button>
              <div className={styles.menuDivider} />
              <button 
                onClick={() => onAction(model, 'delete')}
                className={styles.deleteButton}
              >
                <Trash2 size={16} />
                Löschen
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className={styles.modelStatus}>
        <div 
          className={styles.statusBadge}
          style={{ backgroundColor: `${status.color}20`, color: status.color }}
        >
          <StatusIcon size={14} />
          {status.label}
        </div>
        <span className={styles.modelVersion}>v{model.version}</span>
      </div>
      
      {model.status === 'training' && (
        <div className={styles.trainingProgress}>
          <div className={styles.progressHeader}>
            <span>Epoch {model.currentEpoch}/{model.totalEpochs}</span>
            <span>{Math.floor(model.estimatedTimeRemaining / 60)}m verbleibend</span>
          </div>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${model.trainingProgress * 100}%` }}
            />
          </div>
        </div>
      )}
      
      {model.status === 'evaluating' && (
        <div className={styles.evaluationProgress}>
          <div className={styles.progressHeader}>
            <span>Evaluierung läuft...</span>
            <span>{(model.evaluationProgress * 100).toFixed(0)}%</span>
          </div>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${model.evaluationProgress * 100}%` }}
            />
          </div>
        </div>
      )}
      
      {model.status === 'failed' && (
        <div className={styles.errorMessage}>
          <AlertCircle size={16} />
          <span>{model.error}</span>
        </div>
      )}
      
      {(model.status === 'ready' || model.status === 'deployed') && mainMetric && (
        <div className={styles.modelMetrics}>
          <div className={styles.mainMetric}>
            <span className={styles.metricLabel}>{mainMetric.label}</span>
            <div className={styles.metricValue}>
              <span>{mainMetric.value}</span>
              {mainMetric.trend === 'up' && <ArrowUpRight size={16} className={styles.trendUp} />}
              {mainMetric.trend === 'down' && <ArrowDownRight size={16} className={styles.trendDown} />}
            </div>
          </div>
          
          {model.performance && (
            <div className={styles.performanceMetrics}>
              <div className={styles.perfMetric}>
                <Clock size={14} />
                <span>{model.performance.avgPredictionTime}ms</span>
              </div>
              <div className={styles.perfMetric}>
                <Activity size={14} />
                <span>{model.performance.dailyPredictions}/Tag</span>
              </div>
              <div className={styles.perfMetric}>
                <Cpu size={14} />
                <span>{(model.performance.cpuUsage * 100).toFixed(0)}%</span>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className={styles.modelFooter}>
        <div className={styles.dataSources}>
          <Database size={14} />
          <span>{model.dataSources.length} Datenquellen</span>
        </div>
        <button 
          className={styles.viewButton}
          onClick={() => onView(model)}
        >
          Details
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const AITraining = () => {
  // State
  const [models, setModels] = useState(MOCK_MODELS);
  const [filteredModels, setFilteredModels] = useState(MOCK_MODELS);
  const [showTrainer, setShowTrainer] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);
  const [showMonitor, setShowMonitor] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    sortBy: 'created_desc'
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Stats calculation
  const stats = useMemo(() => {
    const totalModels = models.length;
    const deployedModels = models.filter(m => m.status === 'deployed').length;
    const trainingModels = models.filter(m => m.status === 'training').length;
    const avgAccuracy = models
      .filter(m => m.metrics?.accuracy)
      .reduce((sum, m) => sum + m.metrics.accuracy, 0) / 
      models.filter(m => m.metrics?.accuracy).length || 0;
    
    return {
      total: totalModels,
      deployed: deployedModels,
      training: trainingModels,
      accuracy: avgAccuracy
    };
  }, [models]);
  
  // Filter and sort models
  useEffect(() => {
    let filtered = [...models];
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(model => 
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(model => model.status === filters.status);
    }
    
    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(model => model.type === filters.type);
    }
    
    // Sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'created_desc':
          return new Date(b.created) - new Date(a.created);
        case 'created_asc':
          return new Date(a.created) - new Date(b.created);
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'accuracy_desc':
          return (b.metrics?.accuracy || 0) - (a.metrics?.accuracy || 0);
        default:
          return 0;
      }
    });
    
    setFilteredModels(filtered);
  }, [models, searchQuery, filters]);
  
  // Handlers
  const handleCreateModel = useCallback((modelConfig) => {
    const newModel = {
      id: `model_${Date.now()}`,
      ...modelConfig,
      status: 'draft',
      created: new Date().toISOString(),
      version: '0.1.0',
      metrics: {}
    };
    
    setModels(prev => [newModel, ...prev]);
    setShowTrainer(false);
    
    // Auto-start training if configured
    setTimeout(() => {
      handleStartTraining(newModel);
    }, 1000);
  }, []);
  
  const handleStartTraining = useCallback((model) => {
    setModels(prev => prev.map(m => 
      m.id === model.id 
        ? { 
            ...m, 
            status: 'training',
            currentEpoch: 1,
            totalEpochs: 100,
            trainingProgress: 0.01,
            estimatedTimeRemaining: 5400
          }
        : m
    ));
    
    // Show training monitor
    setSelectedModel(model);
    setShowMonitor(true);
  }, []);
  
  const handleModelAction = useCallback((model, action) => {
    switch (action) {
      case 'view':
        setSelectedModel(model);
        setShowDetails(true);
        break;
        
      case 'deploy':
        setModels(prev => prev.map(m => 
          m.id === model.id ? { ...m, status: 'deployed' } : m
        ));
        break;
        
      case 'undeploy':
        setModels(prev => prev.map(m => 
          m.id === model.id ? { ...m, status: 'ready' } : m
        ));
        break;
        
      case 'retrain':
        handleStartTraining(model);
        break;
        
      case 'duplicate':
        const duplicated = {
          ...model,
          id: `model_${Date.now()}`,
          name: `${model.name} (Kopie)`,
          status: 'draft',
          created: new Date().toISOString(),
          version: '0.1.0'
        };
        setModels(prev => [duplicated, ...prev]);
        break;
        
      case 'export':
        const modelData = JSON.stringify(model, null, 2);
        const blob = new Blob([modelData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${model.name.replace(/\s+/g, '-').toLowerCase()}-export.json`;
        a.click();
        URL.revokeObjectURL(url);
        break;
        
      case 'delete':
        if (confirm(`Möchten Sie das Modell "${model.name}" wirklich löschen?`)) {
          setModels(prev => prev.filter(m => m.id !== model.id));
        }
        break;
    }
  }, [handleStartTraining]);
  
  const handleViewModel = useCallback((model) => {
    setSelectedModel(model);
    if (model.status === 'training') {
      setShowMonitor(true);
    } else {
      setShowDetails(true);
    }
  }, []);
  
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <Brain size={32} className={styles.pageIcon} />
            <div>
              <h1>AI Training Center</h1>
              <p>Trainieren und verwalten Sie KI-Modelle für Ihre Foodtrucks</p>
            </div>
          </div>
          
          <button 
            className={styles.createButton}
            onClick={() => setShowTrainer(true)}
          >
            <Plus size={20} />
            Neues Modell
          </button>
        </div>
      </div>
      
      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Brain size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Modelle Total</span>
            <span className={styles.statValue}>{stats.total}</span>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: '#3b82f6' }}>
            <Zap size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Deployed</span>
            <span className={styles.statValue}>{stats.deployed}</span>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: '#f59e0b' }}>
            <Activity size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Training</span>
            <span className={styles.statValue}>{stats.training}</span>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: '#10b981' }}>
            <Target size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Ø Genauigkeit</span>
            <span className={styles.statValue}>{(stats.accuracy * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>
      
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBar}>
          <Search size={20} />
          <input
            type="text"
            placeholder="Modelle suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className={styles.toolbarActions}>
          <button 
            className={`${styles.filterButton} ${showFilters ? styles.active : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} />
            Filter
          </button>
          
          <button className={styles.iconButton}>
            <Download size={20} />
          </button>
          
          <button className={styles.iconButton}>
            <Upload size={20} />
          </button>
        </div>
      </div>
      
      {/* Filters */}
      {showFilters && (
        <div className={styles.filtersBar}>
          <div className={styles.filterGroup}>
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              {FILTER_OPTIONS.status.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className={styles.filterGroup}>
            <label>Typ</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
            >
              {FILTER_OPTIONS.type.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className={styles.filterGroup}>
            <label>Sortierung</label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
            >
              {FILTER_OPTIONS.sortBy.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      
      {/* Models Grid */}
      <div className={styles.modelsGrid}>
        {filteredModels.length === 0 ? (
          <div className={styles.emptyState}>
            <Brain size={48} />
            <h3>Keine Modelle gefunden</h3>
            <p>Erstellen Sie Ihr erstes AI-Modell</p>
            <button 
              className={styles.emptyButton}
              onClick={() => setShowTrainer(true)}
            >
              <Plus size={20} />
              Neues Modell erstellen
            </button>
          </div>
        ) : (
          filteredModels.map(model => (
            <ModelCard
              key={model.id}
              model={model}
              onView={handleViewModel}
              onAction={handleModelAction}
            />
          ))
        )}
      </div>
      
      {/* Modals */}
      {showTrainer && (
        <ModelTrainer
          onClose={() => setShowTrainer(false)}
          onCreate={handleCreateModel}
          onStartTraining={handleStartTraining}
        />
      )}
      
      {showMonitor && selectedModel && (
        <TrainingMonitor
          model={selectedModel}
          onClose={() => {
            setShowMonitor(false);
            setSelectedModel(null);
          }}
          onComplete={(updatedModel) => {
            setModels(prev => prev.map(m => 
              m.id === updatedModel.id ? updatedModel : m
            ));
            setShowMonitor(false);
            setSelectedModel(null);
          }}
        />
      )}
      
      {showDetails && selectedModel && (
        <ModelDetails
          model={selectedModel}
          onClose={() => {
            setShowDetails(false);
            setSelectedModel(null);
          }}
          onUpdate={(updatedModel) => {
            setModels(prev => prev.map(m => 
              m.id === updatedModel.id ? updatedModel : m
            ));
          }}
        />
      )}
    </div>
  );
};

// ============================================================================
// EXPORT
// ============================================================================
export default AITraining;