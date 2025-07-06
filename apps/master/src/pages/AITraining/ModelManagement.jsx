/**
 * EATECH - AI Model Management System
 * Version: 1.0.0
 * Description: Verwaltung von AI-Modellen mit Training, Deployment,
 *              Versionierung und Performance-Monitoring
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * Kapitel: Phase 5 - Master Control - AI Training & Optimization
 * File Path: /apps/master/src/pages/AITraining/ModelManagement.jsx
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  onValue, 
  push,
  update,
  set,
  serverTimestamp,
  query,
  orderByChild,
  limitToLast,
  off
} from 'firebase/database';
import {
  Brain,
  Cpu,
  Zap,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  LineChart,
  PieChart,
  GitBranch,
  GitCommit,
  GitMerge,
  Package,
  Database,
  Server,
  Cloud,
  CloudUpload,
  CloudDownload,
  Download,
  Upload,
  Play,
  Pause,
  Square,
  RotateCcw,
  RefreshCw,
  Settings,
  Sliders,
  Target,
  Crosshair,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Clock,
  Timer,
  Calendar,
  Tag,
  Tags,
  Hash,
  Layers,
  Box,
  Archive,
  Folder,
  FolderOpen,
  File,
  FileText,
  FileCode,
  Code,
  Terminal,
  Monitor,
  Gauge,
  Thermometer,
  Battery,
  BatteryCharging,
  Wifi,
  WifiOff,
  Save,
  Copy,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Key,
  Shield,
  ShieldCheck,
  ShieldOff,
  Award,
  Medal,
  Trophy,
  Star,
  Sparkles,
  Rocket,
  Microscope,
  TestTube,
  FlaskConical,
  Beaker,
  Binary,
  Calculator,
  Function,
  Variable,
  Plus,
  Minus,
  X,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  ExternalLink,
  Share2,
  Filter,
  Search
} from 'lucide-react';
import styles from './ModelManagement.module.css';

// Lazy loaded components
const ModelTrainer = lazy(() => import('./components/ModelTrainer'));
const ModelComparison = lazy(() => import('./components/ModelComparison'));
const DeploymentManager = lazy(() => import('./components/DeploymentManager'));
const PerformanceMonitor = lazy(() => import('./components/PerformanceMonitor'));

// ============================================================================
// FIREBASE CONFIGURATION
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDFBlgWE81iHnACVwOmaU0jL7FV0l_tRmU",
  authDomain: "eatech-foodtruck.firebaseapp.com",
  databaseURL: "https://eatech-foodtruck-default-rtdb.europe-west1.firebaseio.com",
  projectId: "eatech-foodtruck",
  storageBucket: "eatech-foodtruck.appspot.com",
  messagingSenderId: "679154857640",
  appId: "1:679154857640:web:e9b623a3e9b2f3b5a9c8d6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// ============================================================================
// CONSTANTS
// ============================================================================
const MODEL_TYPES = {
  demand_forecast: {
    label: 'Nachfrage-Vorhersage',
    icon: TrendingUp,
    color: '#3b82f6',
    description: 'Vorhersage der Kundenachfrage'
  },
  price_optimization: {
    label: 'Preis-Optimierung',
    icon: Calculator,
    color: '#10b981',
    description: 'Dynamische Preisgestaltung'
  },
  emergency_ai: {
    label: 'Notfall-KI',
    icon: AlertTriangle,
    color: '#ef4444',
    description: 'Automatische Problemlösung'
  },
  recommendation: {
    label: 'Empfehlungs-Engine',
    icon: Sparkles,
    color: '#8b5cf6',
    description: 'Personalisierte Empfehlungen'
  },
  inventory: {
    label: 'Lagerbestand',
    icon: Package,
    color: '#f59e0b',
    description: 'Bestandsoptimierung'
  },
  nlp: {
    label: 'Sprachverarbeitung',
    icon: MessageSquare,
    color: '#ec4899',
    description: 'Voice & Chat Verständnis'
  },
  vision: {
    label: 'Bildverarbeitung',
    icon: Camera,
    color: '#06b6d4',
    description: 'Qualitätskontrolle'
  },
  anomaly: {
    label: 'Anomalie-Erkennung',
    icon: Shield,
    color: '#dc2626',
    description: 'Betrugs- & Fehlererkennung'
  }
};

const MODEL_STATES = {
  draft: { label: 'Entwurf', color: '#6b7280', icon: FileText },
  training: { label: 'Training', color: '#f59e0b', icon: Cpu },
  validating: { label: 'Validierung', color: '#8b5cf6', icon: TestTube },
  ready: { label: 'Bereit', color: '#10b981', icon: CheckCircle },
  deployed: { label: 'Deployed', color: '#3b82f6', icon: Rocket },
  archived: { label: 'Archiviert', color: '#6b7280', icon: Archive }
};

const TRAINING_METRICS = {
  accuracy: { label: 'Genauigkeit', unit: '%', format: (v) => `${(v * 100).toFixed(2)}%` },
  loss: { label: 'Loss', unit: '', format: (v) => v.toFixed(4) },
  mae: { label: 'MAE', unit: '', format: (v) => v.toFixed(4) },
  rmse: { label: 'RMSE', unit: '', format: (v) => v.toFixed(4) },
  f1: { label: 'F1-Score', unit: '', format: (v) => v.toFixed(4) },
  precision: { label: 'Präzision', unit: '%', format: (v) => `${(v * 100).toFixed(2)}%` },
  recall: { label: 'Recall', unit: '%', format: (v) => `${(v * 100).toFixed(2)}%` },
  auc: { label: 'AUC', unit: '', format: (v) => v.toFixed(4) }
};

const DEPLOYMENT_ENVIRONMENTS = {
  development: { label: 'Development', color: '#6b7280', icon: Code },
  staging: { label: 'Staging', color: '#f59e0b', icon: TestTube },
  production: { label: 'Production', color: '#10b981', icon: Rocket },
  edge: { label: 'Edge', color: '#8b5cf6', icon: Wifi }
};

const HYPERPARAMETERS = {
  learning_rate: { label: 'Learning Rate', type: 'float', min: 0.0001, max: 1, default: 0.001 },
  batch_size: { label: 'Batch Size', type: 'int', min: 1, max: 256, default: 32 },
  epochs: { label: 'Epochs', type: 'int', min: 1, max: 1000, default: 100 },
  dropout: { label: 'Dropout', type: 'float', min: 0, max: 0.9, default: 0.2 },
  hidden_layers: { label: 'Hidden Layers', type: 'int', min: 1, max: 10, default: 3 },
  neurons: { label: 'Neurons per Layer', type: 'int', min: 8, max: 512, default: 128 }
};

const DATASET_SOURCES = {
  orders: { label: 'Bestellungen', icon: ShoppingCart },
  products: { label: 'Produkte', icon: Package },
  customers: { label: 'Kunden', icon: Users },
  weather: { label: 'Wetter', icon: Cloud },
  events: { label: 'Events', icon: Calendar },
  analytics: { label: 'Analytics', icon: BarChart3 }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const calculateModelScore = (metrics) => {
  // Weighted score calculation
  const weights = {
    accuracy: 0.3,
    loss: 0.2,
    f1: 0.2,
    precision: 0.15,
    recall: 0.15
  };
  
  let score = 0;
  Object.entries(weights).forEach(([metric, weight]) => {
    if (metrics[metric] !== undefined) {
      const value = metric === 'loss' ? 1 - metrics[metric] : metrics[metric];
      score += value * weight;
    }
  });
  
  return Math.round(score * 100);
};

const formatBytes = (bytes) => {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

const formatDuration = (ms) => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
};

const generateVersionNumber = (baseVersion, type = 'patch') => {
  const [major, minor, patch] = baseVersion.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const ModelManagement = () => {
  // State Management
  const [models, setModels] = useState([]);
  const [trainingSessions, setTrainingSessions] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [experiments, setExperiments] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedExperiment, setSelectedExperiment] = useState(null);
  const [activeTraining, setActiveTraining] = useState(null);
  const [showTrainer, setShowTrainer] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showDeployment, setShowDeployment] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all',
    state: 'all',
    search: ''
  });
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedModels, setSelectedModels] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ========================================================================
  // FIREBASE LISTENERS
  // ========================================================================
  useEffect(() => {
    const modelsRef = ref(database, 'ai/models');
    const trainingsRef = query(
      ref(database, 'ai/trainingSessions'),
      orderByChild('timestamp'),
      limitToLast(100)
    );
    const deploymentsRef = ref(database, 'ai/deployments');
    const experimentsRef = query(
      ref(database, 'ai/experiments'),
      orderByChild('createdAt'),
      limitToLast(50)
    );

    // Models listener
    const unsubscribeModels = onValue(modelsRef, (snapshot) => {
      if (snapshot.exists()) {
        const modelsList = [];
        snapshot.forEach((child) => {
          modelsList.push({ id: child.key, ...child.val() });
        });
        setModels(modelsList);
      } else {
        setModels([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Models error:', error);
      setError('Fehler beim Laden der Modelle');
      setLoading(false);
    });

    // Training sessions listener
    const unsubscribeTrainings = onValue(trainingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const sessionsList = [];
        snapshot.forEach((child) => {
          sessionsList.unshift({ id: child.key, ...child.val() });
        });
        setTrainingSessions(sessionsList);
      }
    });

    // Deployments listener
    const unsubscribeDeployments = onValue(deploymentsRef, (snapshot) => {
      if (snapshot.exists()) {
        const deploymentsList = [];
        snapshot.forEach((child) => {
          deploymentsList.push({ id: child.key, ...child.val() });
        });
        setDeployments(deploymentsList);
      }
    });

    // Experiments listener
    const unsubscribeExperiments = onValue(experimentsRef, (snapshot) => {
      if (snapshot.exists()) {
        const experimentsList = [];
        snapshot.forEach((child) => {
          experimentsList.unshift({ id: child.key, ...child.val() });
        });
        setExperiments(experimentsList);
      }
    });

    // Check for active training
    const activeTrainingRef = ref(database, 'ai/activeTraining');
    const unsubscribeActive = onValue(activeTrainingRef, (snapshot) => {
      if (snapshot.exists()) {
        setActiveTraining(snapshot.val());
      } else {
        setActiveTraining(null);
      }
    });

    // Cleanup
    return () => {
      off(modelsRef);
      off(trainingsRef);
      off(deploymentsRef);
      off(experimentsRef);
      off(activeTrainingRef);
    };
  }, []);

  // ========================================================================
  // FILTERING
  // ========================================================================
  const filteredModels = useMemo(() => {
    let filtered = [...models];
    
    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(m => m.type === filters.type);
    }
    
    // State filter
    if (filters.state !== 'all') {
      filtered = filtered.filter(m => m.state === filters.state);
    }
    
    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(m => 
        m.name?.toLowerCase().includes(search) ||
        m.description?.toLowerCase().includes(search) ||
        m.version?.toLowerCase().includes(search)
      );
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      if (sortBy === 'performance') {
        aVal = calculateModelScore(a.metrics || {});
        bVal = calculateModelScore(b.metrics || {});
      }
      
      if (sortOrder === 'desc') {
        return bVal > aVal ? 1 : -1;
      } else {
        return aVal > bVal ? 1 : -1;
      }
    });
    
    return filtered;
  }, [models, filters, sortBy, sortOrder]);

  // Stats
  const stats = useMemo(() => {
    const stats = {
      total: models.length,
      deployed: models.filter(m => m.state === 'deployed').length,
      training: models.filter(m => m.state === 'training').length,
      avgAccuracy: 0,
      totalTrainings: trainingSessions.length,
      activeExperiments: experiments.filter(e => e.status === 'running').length,
      byType: {}
    };
    
    // Calculate average accuracy
    const accuracies = models
      .map(m => m.metrics?.accuracy)
      .filter(a => a !== undefined);
    if (accuracies.length > 0) {
      stats.avgAccuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
    }
    
    // Count by type
    Object.keys(MODEL_TYPES).forEach(type => {
      stats.byType[type] = models.filter(m => m.type === type).length;
    });
    
    return stats;
  }, [models, trainingSessions, experiments]);

  // ========================================================================
  // HANDLERS
  // ========================================================================
  const handleCreateModel = useCallback(async (modelData) => {
    try {
      const newModel = {
        ...modelData,
        state: 'draft',
        version: '1.0.0',
        createdAt: serverTimestamp(),
        createdBy: 'master-admin',
        updatedAt: serverTimestamp(),
        metrics: {},
        config: {
          hyperparameters: {},
          features: [],
          preprocessing: []
        }
      };
      
      const modelRef = await push(ref(database, 'ai/models'), newModel);
      
      // Create experiment
      await push(ref(database, 'ai/experiments'), {
        modelId: modelRef.key,
        name: `Experiment: ${modelData.name}`,
        status: 'created',
        createdAt: serverTimestamp(),
        createdBy: 'master-admin'
      });
      
      setShowTrainer(false);
    } catch (error) {
      console.error('Create model error:', error);
    }
  }, []);

  const handleStartTraining = useCallback(async (modelId, config) => {
    try {
      // Update model state
      await update(ref(database, `ai/models/${modelId}`), {
        state: 'training',
        lastTrainingStarted: serverTimestamp()
      });
      
      // Create training session
      const session = {
        modelId,
        config,
        status: 'running',
        startedAt: serverTimestamp(),
        metrics: {
          epochs: [],
          current: {}
        }
      };
      
      const sessionRef = await push(ref(database, 'ai/trainingSessions'), session);
      
      // Set as active training
      await set(ref(database, 'ai/activeTraining'), {
        modelId,
        sessionId: sessionRef.key,
        ...session
      });
      
      // In real implementation, this would trigger the actual training process
      simulateTraining(modelId, sessionRef.key, config);
    } catch (error) {
      console.error('Start training error:', error);
    }
  }, []);

  const handleStopTraining = useCallback(async () => {
    if (!activeTraining) return;
    
    try {
      // Update training session
      await update(ref(database, `ai/trainingSessions/${activeTraining.sessionId}`), {
        status: 'stopped',
        stoppedAt: serverTimestamp()
      });
      
      // Update model state
      await update(ref(database, `ai/models/${activeTraining.modelId}`), {
        state: 'ready'
      });
      
      // Clear active training
      await set(ref(database, 'ai/activeTraining'), null);
    } catch (error) {
      console.error('Stop training error:', error);
    }
  }, [activeTraining]);

  const handleDeployModel = useCallback(async (modelId, environment, config) => {
    try {
      const model = models.find(m => m.id === modelId);
      if (!model) return;
      
      // Create deployment
      const deployment = {
        modelId,
        modelVersion: model.version,
        environment,
        config,
        status: 'deploying',
        deployedAt: serverTimestamp(),
        deployedBy: 'master-admin'
      };
      
      const deploymentRef = await push(ref(database, 'ai/deployments'), deployment);
      
      // Update model state
      await update(ref(database, `ai/models/${modelId}`), {
        state: 'deployed',
        currentDeployment: deploymentRef.key,
        lastDeployedAt: serverTimestamp()
      });
      
      // Simulate deployment process
      setTimeout(async () => {
        await update(ref(database, `ai/deployments/${deploymentRef.key}`), {
          status: 'active'
        });
      }, 3000);
      
      setShowDeployment(false);
    } catch (error) {
      console.error('Deploy model error:', error);
    }
  }, [models]);

  const handleArchiveModel = useCallback(async (modelId) => {
    if (!confirm('Dieses Modell wirklich archivieren?')) return;
    
    try {
      await update(ref(database, `ai/models/${modelId}`), {
        state: 'archived',
        archivedAt: serverTimestamp(),
        archivedBy: 'master-admin'
      });
    } catch (error) {
      console.error('Archive model error:', error);
    }
  }, []);

  const handleExportModel = useCallback((modelId) => {
    const model = models.find(m => m.id === modelId);
    if (!model) return;
    
    const exportData = {
      model: model,
      trainingSessions: trainingSessions.filter(s => s.modelId === modelId),
      deployments: deployments.filter(d => d.modelId === modelId),
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `model-${model.name}-${model.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [models, trainingSessions, deployments]);

  // Simulate training process
  const simulateTraining = useCallback(async (modelId, sessionId, config) => {
    const epochs = config.hyperparameters?.epochs || 100;
    let currentEpoch = 0;
    
    const interval = setInterval(async () => {
      currentEpoch++;
      
      // Generate mock metrics
      const metrics = {
        epoch: currentEpoch,
        loss: Math.max(0.5 - (currentEpoch / epochs) * 0.4 + Math.random() * 0.1, 0.1),
        accuracy: Math.min(0.5 + (currentEpoch / epochs) * 0.4 + Math.random() * 0.1, 0.98),
        val_loss: Math.max(0.6 - (currentEpoch / epochs) * 0.35 + Math.random() * 0.15, 0.15),
        val_accuracy: Math.min(0.45 + (currentEpoch / epochs) * 0.35 + Math.random() * 0.15, 0.95)
      };
      
      // Update training session
      await update(ref(database, `ai/trainingSessions/${sessionId}/metrics`), {
        current: metrics,
        [`epochs/${currentEpoch}`]: metrics
      });
      
      // Update active training
      await update(ref(database, 'ai/activeTraining'), {
        progress: currentEpoch / epochs,
        currentEpoch,
        currentMetrics: metrics
      });
      
      if (currentEpoch >= epochs) {
        clearInterval(interval);
        
        // Training complete
        await update(ref(database, `ai/trainingSessions/${sessionId}`), {
          status: 'completed',
          completedAt: serverTimestamp(),
          finalMetrics: metrics
        });
        
        // Update model
        await update(ref(database, `ai/models/${modelId}`), {
          state: 'ready',
          metrics: metrics,
          lastTrainingCompleted: serverTimestamp()
        });
        
        // Clear active training
        await set(ref(database, 'ai/activeTraining'), null);
      }
    }, 1000); // 1 second per epoch for demo
  }, []);

  // ========================================================================
  // RENDER HELPERS
  // ========================================================================
  const renderModelCard = (model) => {
    const TypeIcon = MODEL_TYPES[model.type]?.icon || Brain;
    const StateIcon = MODEL_STATES[model.state]?.icon || FileText;
    const isSelected = selectedModels.has(model.id);
    const score = calculateModelScore(model.metrics || {});
    const deployment = deployments.find(d => d.id === model.currentDeployment);
    
    return (
      <div 
        key={model.id}
        className={styles.modelCard}
        data-state={model.state}
        onClick={() => setSelectedModel(model)}
      >
        <div className={styles.modelHeader}>
          <div className={styles.modelIcon} style={{ backgroundColor: MODEL_TYPES[model.type]?.color + '20' }}>
            <TypeIcon size={24} style={{ color: MODEL_TYPES[model.type]?.color }} />
          </div>
          
          <div className={styles.modelInfo}>
            <h3>{model.name}</h3>
            <p>{model.description}</p>
          </div>
          
          <div className={styles.modelActions}>
            <button
              className={styles.actionButton}
              onClick={(e) => {
                e.stopPropagation();
                const newSet = new Set(selectedModels);
                if (isSelected) {
                  newSet.delete(model.id);
                } else {
                  newSet.add(model.id);
                }
                setSelectedModels(newSet);
              }}
            >
              <input type="checkbox" checked={isSelected} readOnly />
            </button>
            
            <button
              className={styles.moreButton}
              onClick={(e) => {
                e.stopPropagation();
                // Show context menu
              }}
            >
              <MoreVertical size={16} />
            </button>
          </div>
        </div>
        
        <div className={styles.modelMeta}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Version</span>
            <span className={styles.metaValue}>{model.version}</span>
          </div>
          
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Status</span>
            <span 
              className={styles.metaValue} 
              data-state={model.state}
              style={{ color: MODEL_STATES[model.state]?.color }}
            >
              <StateIcon size={14} />
              {MODEL_STATES[model.state]?.label}
            </span>
          </div>
          
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Score</span>
            <span className={styles.metaValue} data-score={score > 80 ? 'good' : score > 60 ? 'medium' : 'low'}>
              {score}%
            </span>
          </div>
        </div>
        
        {model.metrics && (
          <div className={styles.modelMetrics}>
            {Object.entries(TRAINING_METRICS).map(([key, config]) => {
              const value = model.metrics[key];
              if (value === undefined) return null;
              
              return (
                <div key={key} className={styles.metricItem}>
                  <span className={styles.metricLabel}>{config.label}</span>
                  <span className={styles.metricValue}>{config.format(value)}</span>
                </div>
              );
            }).filter(Boolean).slice(0, 4)}
          </div>
        )}
        
        <div className={styles.modelFooter}>
          {deployment && (
            <div className={styles.deploymentBadge}>
              <Rocket size={14} />
              {DEPLOYMENT_ENVIRONMENTS[deployment.environment]?.label}
            </div>
          )}
          
          <div className={styles.modelTimestamp}>
            <Clock size={12} />
            {new Date(model.updatedAt || model.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    );
  };

  // ========================================================================
  // RENDER
  // ========================================================================
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Lade AI Modelle...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <AlertTriangle size={48} />
        <h2>Fehler</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          <RefreshCw size={20} />
          Neu laden
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>AI Model Management</h1>
          <p>Training, Deployment und Monitoring von Machine Learning Modellen</p>
        </div>
        
        <div className={styles.headerRight}>
          <div className={styles.headerStats}>
            <div className={styles.statCard}>
              <Brain size={24} />
              <div>
                <span className={styles.statValue}>{stats.total}</span>
                <span className={styles.statLabel}>Modelle</span>
              </div>
            </div>
            <div className={styles.statCard} data-highlight="true">
              <Rocket size={24} />
              <div>
                <span className={styles.statValue}>{stats.deployed}</span>
                <span className={styles.statLabel}>Deployed</span>
              </div>
            </div>
            <div className={styles.statCard}>
              <Target size={24} />
              <div>
                <span className={styles.statValue}>{(stats.avgAccuracy * 100).toFixed(1)}%</span>
                <span className={styles.statLabel}>Ø Accuracy</span>
              </div>
            </div>
          </div>
          
          <div className={styles.headerActions}>
            <button
              className={styles.newModelButton}
              onClick={() => setShowTrainer(true)}
            >
              <Plus size={20} />
              Neues Modell
            </button>
            
            {selectedModels.size > 0 && (
              <button
                className={styles.compareButton}
                onClick={() => setShowComparison(true)}
              >
                <GitBranch size={20} />
                Vergleichen ({selectedModels.size})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active Training Banner */}
      {activeTraining && (
        <div className={styles.trainingBanner}>
          <div className={styles.trainingInfo}>
            <Cpu size={20} className={styles.pulsingIcon} />
            <div>
              <h4>Training läuft: {models.find(m => m.id === activeTraining.modelId)?.name}</h4>
              <p>Epoch {activeTraining.currentEpoch || 0} • {(activeTraining.progress * 100).toFixed(1)}% abgeschlossen</p>
            </div>
          </div>
          
          <div className={styles.trainingMetrics}>
            {activeTraining.currentMetrics && (
              <>
                <div className={styles.trainingMetric}>
                  <span>Loss</span>
                  <strong>{activeTraining.currentMetrics.loss?.toFixed(4)}</strong>
                </div>
                <div className={styles.trainingMetric}>
                  <span>Accuracy</span>
                  <strong>{(activeTraining.currentMetrics.accuracy * 100).toFixed(2)}%</strong>
                </div>
              </>
            )}
          </div>
          
          <div className={styles.trainingActions}>
            <button onClick={handleStopTraining} className={styles.stopButton}>
              <Square size={16} />
              Stop
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <select 
            value={filters.type}
            onChange={(e) => setFilters({...filters, type: e.target.value})}
            className={styles.filterSelect}
          >
            <option value="all">Alle Typen</option>
            {Object.entries(MODEL_TYPES).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          
          <select 
            value={filters.state}
            onChange={(e) => setFilters({...filters, state: e.target.value})}
            className={styles.filterSelect}
          >
            <option value="all">Alle Status</option>
            {Object.entries(MODEL_STATES).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
        </div>
        
        <div className={styles.searchBox}>
          <Search size={20} />
          <input
            type="text"
            placeholder="Modelle durchsuchen..."
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            className={styles.searchInput}
          />
        </div>
        
        <div className={styles.viewOptions}>
          <button
            className={styles.sortButton}
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          >
            {sortOrder === 'desc' ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={styles.sortSelect}
          >
            <option value="updatedAt">Aktualisiert</option>
            <option value="performance">Performance</option>
            <option value="name">Name</option>
            <option value="version">Version</option>
          </select>
        </div>
      </div>

      {/* Model Grid */}
      <div className={styles.modelGrid}>
        {filteredModels.length === 0 ? (
          <div className={styles.emptyState}>
            <Brain size={48} />
            <h3>Keine Modelle gefunden</h3>
            <p>Erstellen Sie Ihr erstes AI-Modell</p>
            <button onClick={() => setShowTrainer(true)}>
              <Plus size={20} />
              Neues Modell erstellen
            </button>
          </div>
        ) : (
          filteredModels.map(model => renderModelCard(model))
        )}
      </div>

      {/* Recent Experiments */}
      <div className={styles.experimentsSection}>
        <div className={styles.sectionHeader}>
          <h2>Aktuelle Experimente</h2>
          <button className={styles.viewAllButton}>
            Alle anzeigen
            <ChevronRight size={16} />
          </button>
        </div>
        
        <div className={styles.experimentsGrid}>
          {experiments.slice(0, 4).map(experiment => {
            const model = models.find(m => m.id === experiment.modelId);
            
            return (
              <div 
                key={experiment.id} 
                className={styles.experimentCard}
                onClick={() => setSelectedExperiment(experiment)}
              >
                <div className={styles.experimentHeader}>
                  <FlaskConical size={20} />
                  <h4>{experiment.name}</h4>
                </div>
                
                <div className={styles.experimentMeta}>
                  <span>Model: {model?.name || 'Unknown'}</span>
                  <span>Status: {experiment.status}</span>
                </div>
                
                <div className={styles.experimentMetrics}>
                  {experiment.results && (
                    <>
                      <div className={styles.experimentMetric}>
                        <span>Best Accuracy</span>
                        <strong>{(experiment.results.bestAccuracy * 100).toFixed(2)}%</strong>
                      </div>
                      <div className={styles.experimentMetric}>
                        <span>Runs</span>
                        <strong>{experiment.results.totalRuns}</strong>
                      </div>
                    </>
                  )}
                </div>
                
                <div className={styles.experimentTimestamp}>
                  <Clock size={12} />
                  {new Date(experiment.createdAt).toLocaleDateString()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      {showTrainer && (
        <Suspense fallback={<div>Lade Trainer...</div>}>
          <ModelTrainer
            onClose={() => setShowTrainer(false)}
            onCreate={handleCreateModel}
            onStartTraining={handleStartTraining}
          />
        </Suspense>
      )}
      
      {showComparison && selectedModels.size > 0 && (
        <Suspense fallback={<div>Lade Vergleich...</div>}>
          <ModelComparison
            modelIds={Array.from(selectedModels)}
            models={models}
            trainingSessions={trainingSessions}
            onClose={() => setShowComparison(false)}
          />
        </Suspense>
      )}
      
      {showDeployment && selectedModel && (
        <Suspense fallback={<div>Lade Deployment Manager...</div>}>
          <DeploymentManager
            model={selectedModel}
            deployments={deployments.filter(d => d.modelId === selectedModel.id)}
            onDeploy={(env, config) => handleDeployModel(selectedModel.id, env, config)}
            onClose={() => setShowDeployment(false)}
          />
        </Suspense>
      )}
      
      {selectedModel && !showDeployment && (
        <div className={styles.modelDetails}>
          <div className={styles.detailsHeader}>
            <h3>{selectedModel.name}</h3>
            <button onClick={() => setSelectedModel(null)}>
              <X size={20} />
            </button>
          </div>
          
          <div className={styles.detailsActions}>
            <button 
              onClick={() => handleStartTraining(selectedModel.id, selectedModel.config)}
              disabled={activeTraining || selectedModel.state === 'training'}
            >
              <Play size={16} />
              Training starten
            </button>
            <button onClick={() => setShowDeployment(true)}>
              <Rocket size={16} />
              Deploy
            </button>
            <button onClick={() => handleExportModel(selectedModel.id)}>
              <Download size={16} />
              Export
            </button>
            <button onClick={() => handleArchiveModel(selectedModel.id)}>
              <Archive size={16} />
              Archivieren
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// EXPORT
// ============================================================================
export default ModelManagement;