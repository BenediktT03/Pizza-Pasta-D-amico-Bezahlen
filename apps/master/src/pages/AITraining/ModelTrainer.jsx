/**
 * EATECH - Model Trainer Component
 * Version: 1.0.0
 * Description: Interaktives Interface für AI Model Training mit
 *              Hyperparameter-Tuning und Echtzeit-Monitoring
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/master/src/pages/AITraining/components/ModelTrainer.jsx
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  Brain,
  Settings,
  Database,
  Play,
  Info,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  Plus,
  Minus,
  Save,
  Upload,
  Download,
  RefreshCw,
  Zap,
  Target,
  Gauge,
  TrendingUp,
  Package,
  Tag,
  FileText,
  Code,
  Terminal,
  Sliders,
  BarChart3,
  LineChart,
  GitBranch,
  Layers,
  Box,
  Clock,
  Calendar,
  Hash,
  Percent,
  Calculator,
  Function,
  Variable,
  Binary,
  Cpu,
  HardDrive,
  Activity,
  Shield,
  Award,
  Sparkles,
  TestTube,
  FlaskConical,
  Beaker,
  Microscope,
  Filter,
  Search,
  Copy,
  HelpCircle
} from 'lucide-react';
import styles from './ModelTrainer.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const MODEL_TYPES = {
  demand_forecast: {
    label: 'Nachfrage-Vorhersage',
    icon: TrendingUp,
    color: '#3b82f6',
    defaultArchitecture: 'lstm',
    requiredData: ['orders', 'weather', 'events'],
    metrics: ['mae', 'rmse', 'mape']
  },
  price_optimization: {
    label: 'Preis-Optimierung',
    icon: Calculator,
    color: '#10b981',
    defaultArchitecture: 'gradient_boosting',
    requiredData: ['orders', 'products', 'competitors'],
    metrics: ['revenue_uplift', 'elasticity', 'accuracy']
  },
  emergency_ai: {
    label: 'Notfall-KI',
    icon: Shield,
    color: '#ef4444',
    defaultArchitecture: 'decision_tree',
    requiredData: ['incidents', 'system_logs', 'alerts'],
    metrics: ['precision', 'recall', 'response_time']
  },
  recommendation: {
    label: 'Empfehlungs-Engine',
    icon: Sparkles,
    color: '#8b5cf6',
    defaultArchitecture: 'collaborative_filtering',
    requiredData: ['orders', 'customers', 'products'],
    metrics: ['precision_at_k', 'recall_at_k', 'ndcg']
  },
  inventory: {
    label: 'Lagerbestand',
    icon: Package,
    color: '#f59e0b',
    defaultArchitecture: 'arima',
    requiredData: ['inventory', 'orders', 'suppliers'],
    metrics: ['stockout_rate', 'holding_cost', 'mae']
  }
};

const ARCHITECTURES = {
  lstm: {
    label: 'LSTM',
    description: 'Long Short-Term Memory für Zeitreihen',
    hyperparameters: ['units', 'dropout', 'learning_rate', 'batch_size']
  },
  gradient_boosting: {
    label: 'Gradient Boosting',
    description: 'Ensemble-Methode für Regression/Klassifikation',
    hyperparameters: ['n_estimators', 'max_depth', 'learning_rate', 'subsample']
  },
  neural_network: {
    label: 'Neural Network',
    description: 'Klassisches neuronales Netzwerk',
    hyperparameters: ['hidden_layers', 'neurons', 'activation', 'learning_rate']
  },
  decision_tree: {
    label: 'Decision Tree',
    description: 'Regelbasierte Entscheidungsbäume',
    hyperparameters: ['max_depth', 'min_samples_split', 'criterion']
  },
  collaborative_filtering: {
    label: 'Collaborative Filtering',
    description: 'Nutzerbasierte Empfehlungen',
    hyperparameters: ['factors', 'regularization', 'iterations']
  },
  arima: {
    label: 'ARIMA',
    description: 'Autoregressive Integrated Moving Average',
    hyperparameters: ['p', 'd', 'q', 'seasonal']
  }
};

const HYPERPARAMETER_CONFIGS = {
  // Neural Network Parameters
  units: {
    label: 'LSTM Units',
    type: 'int',
    min: 32,
    max: 512,
    default: 128,
    step: 32,
    tooltip: 'Anzahl der LSTM-Einheiten pro Layer'
  },
  hidden_layers: {
    label: 'Hidden Layers',
    type: 'int',
    min: 1,
    max: 10,
    default: 3,
    step: 1,
    tooltip: 'Anzahl versteckter Schichten'
  },
  neurons: {
    label: 'Neurons per Layer',
    type: 'int',
    min: 16,
    max: 1024,
    default: 256,
    step: 16,
    tooltip: 'Neuronen pro versteckter Schicht'
  },
  dropout: {
    label: 'Dropout Rate',
    type: 'float',
    min: 0,
    max: 0.8,
    default: 0.2,
    step: 0.05,
    tooltip: 'Dropout zur Regularisierung'
  },
  learning_rate: {
    label: 'Learning Rate',
    type: 'float',
    min: 0.0001,
    max: 0.1,
    default: 0.001,
    step: 0.0001,
    scale: 'log',
    tooltip: 'Lernrate für Gradient Descent'
  },
  batch_size: {
    label: 'Batch Size',
    type: 'int',
    min: 8,
    max: 256,
    default: 32,
    step: 8,
    tooltip: 'Anzahl Samples pro Batch'
  },
  activation: {
    label: 'Activation Function',
    type: 'select',
    options: ['relu', 'tanh', 'sigmoid', 'elu'],
    default: 'relu',
    tooltip: 'Aktivierungsfunktion'
  },
  
  // Tree Parameters
  n_estimators: {
    label: 'Number of Trees',
    type: 'int',
    min: 10,
    max: 1000,
    default: 100,
    step: 10,
    tooltip: 'Anzahl der Bäume im Ensemble'
  },
  max_depth: {
    label: 'Max Depth',
    type: 'int',
    min: 3,
    max: 20,
    default: 8,
    step: 1,
    tooltip: 'Maximale Baumtiefe'
  },
  min_samples_split: {
    label: 'Min Samples Split',
    type: 'int',
    min: 2,
    max: 100,
    default: 10,
    step: 1,
    tooltip: 'Minimale Samples für Split'
  },
  subsample: {
    label: 'Subsample Ratio',
    type: 'float',
    min: 0.5,
    max: 1.0,
    default: 0.8,
    step: 0.05,
    tooltip: 'Anteil der Samples pro Baum'
  },
  criterion: {
    label: 'Split Criterion',
    type: 'select',
    options: ['gini', 'entropy', 'log_loss'],
    default: 'gini',
    tooltip: 'Kriterium für Splits'
  },
  
  // Recommendation Parameters
  factors: {
    label: 'Latent Factors',
    type: 'int',
    min: 10,
    max: 200,
    default: 50,
    step: 10,
    tooltip: 'Anzahl latenter Faktoren'
  },
  regularization: {
    label: 'Regularization',
    type: 'float',
    min: 0.001,
    max: 0.1,
    default: 0.01,
    step: 0.001,
    tooltip: 'L2 Regularisierung'
  },
  iterations: {
    label: 'Iterations',
    type: 'int',
    min: 10,
    max: 100,
    default: 30,
    step: 5,
    tooltip: 'Anzahl Iterationen'
  },
  
  // ARIMA Parameters
  p: {
    label: 'AR Order (p)',
    type: 'int',
    min: 0,
    max: 10,
    default: 2,
    step: 1,
    tooltip: 'Autoregressive Ordnung'
  },
  d: {
    label: 'Differencing (d)',
    type: 'int',
    min: 0,
    max: 3,
    default: 1,
    step: 1,
    tooltip: 'Grad der Differenzierung'
  },
  q: {
    label: 'MA Order (q)',
    type: 'int',
    min: 0,
    max: 10,
    default: 2,
    step: 1,
    tooltip: 'Moving Average Ordnung'
  },
  seasonal: {
    label: 'Seasonal Period',
    type: 'int',
    min: 0,
    max: 365,
    default: 7,
    step: 1,
    tooltip: 'Saisonale Periode (0 = keine)'
  }
};

const TRAINING_PRESETS = {
  quick: {
    label: 'Schnell',
    icon: Zap,
    epochs: 10,
    patience: 3,
    description: 'Schnelles Training für Tests'
  },
  balanced: {
    label: 'Ausgewogen',
    icon: Gauge,
    epochs: 50,
    patience: 10,
    description: 'Gute Balance zwischen Geschwindigkeit und Qualität'
  },
  thorough: {
    label: 'Gründlich',
    icon: Target,
    epochs: 200,
    patience: 20,
    description: 'Maximale Genauigkeit, längere Trainingszeit'
  }
};

const DATA_SOURCES = {
  orders: { 
    label: 'Bestellungen',
    icon: Package,
    required: ['timestamp', 'amount', 'items'],
    optional: ['customer_id', 'location', 'weather']
  },
  products: {
    label: 'Produkte',
    icon: Box,
    required: ['id', 'name', 'price', 'category'],
    optional: ['description', 'ingredients', 'image']
  },
  customers: {
    label: 'Kunden',
    icon: Users,
    required: ['id', 'created_at'],
    optional: ['preferences', 'location', 'order_history']
  },
  weather: {
    label: 'Wetter',
    icon: Cloud,
    required: ['timestamp', 'temperature', 'conditions'],
    optional: ['humidity', 'wind_speed', 'precipitation']
  },
  events: {
    label: 'Events',
    icon: Calendar,
    required: ['date', 'type', 'location'],
    optional: ['expected_attendance', 'category']
  },
  inventory: {
    label: 'Lagerbestand',
    icon: Archive,
    required: ['timestamp', 'product_id', 'quantity'],
    optional: ['supplier', 'expiry_date']
  }
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================
const HyperparameterControl = ({ param, config, value, onChange }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  if (config.type === 'select') {
    return (
      <div className={styles.paramControl}>
        <div className={styles.paramHeader}>
          <label>{config.label}</label>
          <button 
            className={styles.tooltipButton}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <HelpCircle size={14} />
          </button>
          {showTooltip && (
            <div className={styles.tooltip}>{config.tooltip}</div>
          )}
        </div>
        <select 
          value={value}
          onChange={(e) => onChange(param, e.target.value)}
          className={styles.paramSelect}
        >
          {config.options.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
    );
  }
  
  return (
    <div className={styles.paramControl}>
      <div className={styles.paramHeader}>
        <label>{config.label}</label>
        <button 
          className={styles.tooltipButton}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <HelpCircle size={14} />
        </button>
        {showTooltip && (
          <div className={styles.tooltip}>{config.tooltip}</div>
        )}
      </div>
      
      <div className={styles.paramInput}>
        <button 
          onClick={() => onChange(param, Math.max(config.min, value - config.step))}
          className={styles.paramButton}
        >
          <Minus size={14} />
        </button>
        
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const val = config.type === 'int' 
              ? parseInt(e.target.value) 
              : parseFloat(e.target.value);
            onChange(param, val);
          }}
          min={config.min}
          max={config.max}
          step={config.step}
          className={styles.paramValue}
        />
        
        <button 
          onClick={() => onChange(param, Math.min(config.max, value + config.step))}
          className={styles.paramButton}
        >
          <Plus size={14} />
        </button>
      </div>
      
      <input
        type="range"
        value={value}
        onChange={(e) => {
          const val = config.type === 'int' 
            ? parseInt(e.target.value) 
            : parseFloat(e.target.value);
          onChange(param, val);
        }}
        min={config.min}
        max={config.max}
        step={config.step}
        className={styles.paramSlider}
        style={{ 
          '--value-percent': `${((value - config.min) / (config.max - config.min)) * 100}%` 
        }}
      />
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const ModelTrainer = ({ onClose, onCreate, onStartTraining }) => {
  // State
  const [step, setStep] = useState(1);
  const [modelConfig, setModelConfig] = useState({
    name: '',
    description: '',
    type: 'demand_forecast',
    architecture: 'lstm',
    hyperparameters: {},
    dataSources: new Set(['orders']),
    trainingPreset: 'balanced',
    validationSplit: 0.2,
    testSplit: 0.1
  });
  const [errors, setErrors] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Initialize hyperparameters based on architecture
  useEffect(() => {
    const architecture = ARCHITECTURES[modelConfig.architecture];
    if (!architecture) return;
    
    const defaultParams = {};
    architecture.hyperparameters.forEach(param => {
      if (HYPERPARAMETER_CONFIGS[param]) {
        defaultParams[param] = modelConfig.hyperparameters[param] || 
                               HYPERPARAMETER_CONFIGS[param].default;
      }
    });
    
    setModelConfig(prev => ({
      ...prev,
      hyperparameters: defaultParams
    }));
  }, [modelConfig.architecture]);
  
  // Validation
  const validateStep = useCallback((stepNumber) => {
    const newErrors = {};
    
    switch (stepNumber) {
      case 1:
        if (!modelConfig.name.trim()) {
          newErrors.name = 'Name ist erforderlich';
        }
        if (!modelConfig.description.trim()) {
          newErrors.description = 'Beschreibung ist erforderlich';
        }
        break;
        
      case 2:
        const requiredData = MODEL_TYPES[modelConfig.type]?.requiredData || [];
        const missingData = requiredData.filter(d => !modelConfig.dataSources.has(d));
        if (missingData.length > 0) {
          newErrors.dataSources = `Erforderliche Datenquellen fehlen: ${missingData.join(', ')}`;
        }
        break;
        
      case 3:
        // Hyperparameter validation
        Object.entries(modelConfig.hyperparameters).forEach(([param, value]) => {
          const config = HYPERPARAMETER_CONFIGS[param];
          if (config) {
            if (value < config.min || value > config.max) {
              newErrors[param] = `Wert muss zwischen ${config.min} und ${config.max} liegen`;
            }
          }
        });
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [modelConfig]);
  
  // Handlers
  const handleNext = useCallback(() => {
    if (validateStep(step)) {
      if (step === 4) {
        // Create model
        onCreate(modelConfig);
      } else {
        setStep(step + 1);
      }
    }
  }, [step, modelConfig, onCreate, validateStep]);
  
  const handleBack = useCallback(() => {
    setStep(Math.max(1, step - 1));
  }, [step]);
  
  const handleTypeChange = useCallback((type) => {
    const modelType = MODEL_TYPES[type];
    setModelConfig(prev => ({
      ...prev,
      type,
      architecture: modelType.defaultArchitecture,
      dataSources: new Set(modelType.requiredData)
    }));
  }, []);
  
  const handleDataSourceToggle = useCallback((source) => {
    setModelConfig(prev => {
      const newSources = new Set(prev.dataSources);
      if (newSources.has(source)) {
        // Check if it's required
        const required = MODEL_TYPES[prev.type]?.requiredData || [];
        if (!required.includes(source)) {
          newSources.delete(source);
        }
      } else {
        newSources.add(source);
      }
      return { ...prev, dataSources: newSources };
    });
  }, []);
  
  const handleHyperparameterChange = useCallback((param, value) => {
    setModelConfig(prev => ({
      ...prev,
      hyperparameters: {
        ...prev.hyperparameters,
        [param]: value
      }
    }));
  }, []);
  
  const handlePresetChange = useCallback((preset) => {
    setModelConfig(prev => ({
      ...prev,
      trainingPreset: preset
    }));
  }, []);
  
  const handleSaveConfig = useCallback(() => {
    const configBlob = new Blob([JSON.stringify(modelConfig, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(configBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `model-config-${modelConfig.name || 'unnamed'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [modelConfig]);
  
  const handleLoadConfig = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result);
        setModelConfig(prev => ({
          ...prev,
          ...config,
          dataSources: new Set(config.dataSources)
        }));
      } catch (error) {
        console.error('Invalid config file:', error);
      }
    };
    reader.readAsText(file);
  }, []);
  
  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className={styles.stepContent}>
            <h3>Modell-Grundlagen</h3>
            
            <div className={styles.formGroup}>
              <label>Name des Modells</label>
              <input
                type="text"
                value={modelConfig.name}
                onChange={(e) => setModelConfig({...modelConfig, name: e.target.value})}
                placeholder="z.B. Demand Forecast Q1 2025"
                className={errors.name ? styles.errorInput : ''}
              />
              {errors.name && <span className={styles.errorText}>{errors.name}</span>}
            </div>
            
            <div className={styles.formGroup}>
              <label>Beschreibung</label>
              <textarea
                value={modelConfig.description}
                onChange={(e) => setModelConfig({...modelConfig, description: e.target.value})}
                placeholder="Beschreiben Sie den Zweck und die Funktionalität des Modells..."
                rows={4}
                className={errors.description ? styles.errorInput : ''}
              />
              {errors.description && <span className={styles.errorText}>{errors.description}</span>}
            </div>
            
            <div className={styles.formGroup}>
              <label>Modell-Typ</label>
              <div className={styles.typeGrid}>
                {Object.entries(MODEL_TYPES).map(([key, type]) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={key}
                      className={`${styles.typeCard} ${modelConfig.type === key ? styles.selected : ''}`}
                      onClick={() => handleTypeChange(key)}
                    >
                      <Icon size={24} style={{ color: type.color }} />
                      <span>{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className={styles.stepContent}>
            <h3>Datenquellen</h3>
            
            <div className={styles.dataSourcesGrid}>
              {Object.entries(DATA_SOURCES).map(([key, source]) => {
                const Icon = source.icon;
                const isSelected = modelConfig.dataSources.has(key);
                const isRequired = MODEL_TYPES[modelConfig.type]?.requiredData?.includes(key);
                
                return (
                  <div
                    key={key}
                    className={`${styles.dataSourceCard} ${isSelected ? styles.selected : ''} ${isRequired ? styles.required : ''}`}
                    onClick={() => !isRequired && handleDataSourceToggle(key)}
                  >
                    <div className={styles.dataSourceHeader}>
                      <Icon size={20} />
                      <h4>{source.label}</h4>
                      {isRequired && <span className={styles.requiredBadge}>Erforderlich</span>}
                    </div>
                    
                    <div className={styles.dataSourceFields}>
                      <div className={styles.fieldList}>
                        <span className={styles.fieldLabel}>Erforderlich:</span>
                        {source.required.map(field => (
                          <span key={field} className={styles.field}>{field}</span>
                        ))}
                      </div>
                      {source.optional.length > 0 && (
                        <div className={styles.fieldList}>
                          <span className={styles.fieldLabel}>Optional:</span>
                          {source.optional.map(field => (
                            <span key={field} className={styles.field}>{field}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {errors.dataSources && (
              <div className={styles.errorMessage}>
                <AlertCircle size={16} />
                {errors.dataSources}
              </div>
            )}
          </div>
        );
        
      case 3:
        return (
          <div className={styles.stepContent}>
            <h3>Modell-Konfiguration</h3>
            
            <div className={styles.architectureSection}>
              <label>Architektur</label>
              <select
                value={modelConfig.architecture}
                onChange={(e) => setModelConfig({...modelConfig, architecture: e.target.value})}
                className={styles.architectureSelect}
              >
                {Object.entries(ARCHITECTURES).map(([key, arch]) => (
                  <option key={key} value={key}>{arch.label}</option>
                ))}
              </select>
              <p className={styles.architectureDescription}>
                {ARCHITECTURES[modelConfig.architecture]?.description}
              </p>
            </div>
            
            <div className={styles.hyperparametersSection}>
              <div className={styles.sectionHeader}>
                <h4>Hyperparameter</h4>
                <button
                  className={styles.advancedToggle}
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? 'Weniger' : 'Erweitert'}
                  {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
              
              <div className={styles.hyperparametersGrid}>
                {ARCHITECTURES[modelConfig.architecture]?.hyperparameters
                  .filter(param => showAdvanced || ['learning_rate', 'batch_size', 'units', 'hidden_layers'].includes(param))
                  .map(param => {
                    const config = HYPERPARAMETER_CONFIGS[param];
                    if (!config) return null;
                    
                    return (
                      <HyperparameterControl
                        key={param}
                        param={param}
                        config={config}
                        value={modelConfig.hyperparameters[param] || config.default}
                        onChange={handleHyperparameterChange}
                      />
                    );
                  })}
              </div>
            </div>
            
            <div className={styles.trainingSection}>
              <h4>Training-Einstellungen</h4>
              
              <div className={styles.presetGrid}>
                {Object.entries(TRAINING_PRESETS).map(([key, preset]) => {
                  const Icon = preset.icon;
                  return (
                    <button
                      key={key}
                      className={`${styles.presetCard} ${modelConfig.trainingPreset === key ? styles.selected : ''}`}
                      onClick={() => handlePresetChange(key)}
                    >
                      <Icon size={20} />
                      <h5>{preset.label}</h5>
                      <p>{preset.description}</p>
                      <span className={styles.presetDetail}>{preset.epochs} Epochs</span>
                    </button>
                  );
                })}
              </div>
              
              <div className={styles.splitControls}>
                <div className={styles.splitControl}>
                  <label>Validation Split</label>
                  <input
                    type="range"
                    min="0.1"
                    max="0.4"
                    step="0.05"
                    value={modelConfig.validationSplit}
                    onChange={(e) => setModelConfig({...modelConfig, validationSplit: parseFloat(e.target.value)})}
                  />
                  <span>{(modelConfig.validationSplit * 100).toFixed(0)}%</span>
                </div>
                
                <div className={styles.splitControl}>
                  <label>Test Split</label>
                  <input
                    type="range"
                    min="0.05"
                    max="0.3"
                    step="0.05"
                    value={modelConfig.testSplit}
                    onChange={(e) => setModelConfig({...modelConfig, testSplit: parseFloat(e.target.value)})}
                  />
                  <span>{(modelConfig.testSplit * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
            
            <div className={styles.configActions}>
              <button onClick={handleSaveConfig} className={styles.configButton}>
                <Download size={16} />
                Config speichern
              </button>
              <label className={styles.configButton}>
                <Upload size={16} />
                Config laden
                <input
                  type="file"
                  accept=".json"
                  onChange={handleLoadConfig}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>
        );
        
      case 4:
        return (
          <div className={styles.stepContent}>
            <h3>Zusammenfassung</h3>
            
            <div className={styles.summaryCard}>
              <div className={styles.summarySection}>
                <h4>Modell-Details</h4>
                <div className={styles.summaryItem}>
                  <span>Name:</span>
                  <strong>{modelConfig.name}</strong>
                </div>
                <div className={styles.summaryItem}>
                  <span>Typ:</span>
                  <strong>{MODEL_TYPES[modelConfig.type]?.label}</strong>
                </div>
                <div className={styles.summaryItem}>
                  <span>Architektur:</span>
                  <strong>{ARCHITECTURES[modelConfig.architecture]?.label}</strong>
                </div>
              </div>
              
              <div className={styles.summarySection}>
                <h4>Datenquellen</h4>
                <div className={styles.dataSourcesList}>
                  {Array.from(modelConfig.dataSources).map(source => (
                    <div key={source} className={styles.dataSourceChip}>
                      {DATA_SOURCES[source]?.icon && 
                        React.createElement(DATA_SOURCES[source].icon, { size: 14 })}
                      {DATA_SOURCES[source]?.label}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className={styles.summarySection}>
                <h4>Training</h4>
                <div className={styles.summaryItem}>
                  <span>Preset:</span>
                  <strong>{TRAINING_PRESETS[modelConfig.trainingPreset]?.label}</strong>
                </div>
                <div className={styles.summaryItem}>
                  <span>Epochs:</span>
                  <strong>{TRAINING_PRESETS[modelConfig.trainingPreset]?.epochs}</strong>
                </div>
                <div className={styles.summaryItem}>
                  <span>Data Split:</span>
                  <strong>
                    {((1 - modelConfig.validationSplit - modelConfig.testSplit) * 100).toFixed(0)}% Train / 
                    {(modelConfig.validationSplit * 100).toFixed(0)}% Val / 
                    {(modelConfig.testSplit * 100).toFixed(0)}% Test
                  </strong>
                </div>
              </div>
              
              <div className={styles.summarySection}>
                <h4>Hyperparameter</h4>
                <div className={styles.hyperparametersList}>
                  {Object.entries(modelConfig.hyperparameters).map(([param, value]) => {
                    const config = HYPERPARAMETER_CONFIGS[param];
                    return (
                      <div key={param} className={styles.summaryItem}>
                        <span>{config?.label || param}:</span>
                        <strong>{value}</strong>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div className={styles.startTrainingSection}>
              <div className={styles.trainingInfo}>
                <Info size={20} />
                <p>
                  Das Training wird gestartet sobald das Modell erstellt wurde. 
                  Sie können den Fortschritt in Echtzeit verfolgen.
                </p>
              </div>
              
              <label className={styles.autoStartCheckbox}>
                <input
                  type="checkbox"
                  checked={true}
                  readOnly
                />
                Training automatisch starten
              </label>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  // Progress indicator
  const steps = [
    { label: 'Grundlagen', icon: FileText },
    { label: 'Daten', icon: Database },
    { label: 'Konfiguration', icon: Settings },
    { label: 'Zusammenfassung', icon: CheckCircle }
  ];
  
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2>Neues AI Modell erstellen</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={24} />
          </button>
        </div>
        
        {/* Progress */}
        <div className={styles.progress}>
          {steps.map((s, index) => {
            const Icon = s.icon;
            const isActive = index + 1 === step;
            const isCompleted = index + 1 < step;
            
            return (
              <div 
                key={index}
                className={`${styles.progressStep} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''}`}
              >
                <div className={styles.progressIcon}>
                  <Icon size={20} />
                </div>
                <span>{s.label}</span>
                {index < steps.length - 1 && (
                  <div className={styles.progressLine} />
                )}
              </div>
            );
          })}
        </div>
        
        {/* Content */}
        <div className={styles.modalContent}>
          {renderStepContent()}
        </div>
        
        {/* Footer */}
        <div className={styles.modalFooter}>
          <button 
            onClick={handleBack}
            disabled={step === 1}
            className={styles.backButton}
          >
            Zurück
          </button>
          
          <button 
            onClick={handleNext}
            className={styles.nextButton}
          >
            {step === 4 ? (
              <>
                <CheckCircle size={20} />
                Modell erstellen
              </>
            ) : (
              <>
                Weiter
                <ChevronRight size={20} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// EXPORT
// ============================================================================
export default ModelTrainer;