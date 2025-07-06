/**
 * EATECH - Model Details Component
 * Version: 1.0.0
 * Description: Detaillierte Ansicht für trainierte AI-Modelle mit
 *              Metriken, Evaluierungen und Deployment-Optionen
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/master/src/pages/AITraining/components/ModelDetails.jsx
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  X,
  Brain,
  BarChart3,
  Activity,
  Clock,
  Calendar,
  Database,
  GitBranch,
  Download,
  Upload,
  Share2,
  Settings,
  AlertCircle,
  CheckCircle,
  Info,
  Zap,
  Play,
  Pause,
  RefreshCw,
  Copy,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  Target,
  Award,
  Shield,
  Package,
  Code,
  FileText,
  Hash,
  Layers,
  Cpu,
  HardDrive,
  Server,
  Globe,
  Lock,
  Unlock,
  Edit3,
  Save,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Eye,
  EyeOff
} from 'lucide-react';
import styles from './ModelDetails.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const DEPLOYMENT_ENVIRONMENTS = {
  development: {
    label: 'Development',
    icon: Code,
    color: '#6b7280',
    endpoint: 'https://dev-api.eatech.ch/ml'
  },
  staging: {
    label: 'Staging',
    icon: GitBranch,
    color: '#f59e0b',
    endpoint: 'https://staging-api.eatech.ch/ml'
  },
  production: {
    label: 'Production',
    icon: Globe,
    color: '#10b981',
    endpoint: 'https://api.eatech.ch/ml'
  }
};

const EVALUATION_METRICS = {
  classification: ['accuracy', 'precision', 'recall', 'f1_score', 'auc_roc'],
  regression: ['mae', 'mse', 'rmse', 'r2', 'mape'],
  recommendation: ['precision_at_k', 'recall_at_k', 'ndcg', 'coverage', 'diversity'],
  timeseries: ['mae', 'rmse', 'mape', 'smape', 'mase']
};

const API_KEY_PERMISSIONS = {
  predict: { label: 'Predictions', description: 'Make predictions with the model' },
  evaluate: { label: 'Evaluation', description: 'Access evaluation metrics' },
  retrain: { label: 'Retraining', description: 'Trigger model retraining' },
  admin: { label: 'Administration', description: 'Full administrative access' }
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================
const MetricCard = ({ label, value, benchmark, format, trend }) => {
  const formattedValue = format ? format(value) : value;
  const formattedBenchmark = benchmark && format ? format(benchmark) : benchmark;
  const improvement = benchmark ? ((value - benchmark) / benchmark * 100).toFixed(1) : null;
  const isImproved = improvement ? improvement > 0 : null;
  
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricValue}>{formattedValue}</div>
      {benchmark && (
        <div className={styles.metricBenchmark}>
          <span>Baseline: {formattedBenchmark}</span>
          {improvement && (
            <span className={isImproved ? styles.improved : styles.degraded}>
              {isImproved ? '+' : ''}{improvement}%
              {isImproved ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

const DeploymentCard = ({ environment, deployment, onManage }) => {
  const env = DEPLOYMENT_ENVIRONMENTS[environment];
  const Icon = env.icon;
  
  return (
    <div className={styles.deploymentCard}>
      <div className={styles.deploymentHeader}>
        <div className={styles.deploymentInfo}>
          <Icon size={20} style={{ color: env.color }} />
          <h4>{env.label}</h4>
        </div>
        <span 
          className={styles.deploymentStatus}
          style={{ 
            backgroundColor: deployment ? '#10b981' : '#6b7280',
            color: '#ffffff'
          }}
        >
          {deployment ? 'Active' : 'Inactive'}
        </span>
      </div>
      
      {deployment ? (
        <div className={styles.deploymentDetails}>
          <div className={styles.deploymentStat}>
            <span>Version:</span>
            <strong>{deployment.version}</strong>
          </div>
          <div className={styles.deploymentStat}>
            <span>Deployed:</span>
            <strong>{new Date(deployment.deployedAt).toLocaleDateString()}</strong>
          </div>
          <div className={styles.deploymentStat}>
            <span>Requests (24h):</span>
            <strong>{deployment.requests24h?.toLocaleString() || '0'}</strong>
          </div>
          <div className={styles.deploymentStat}>
            <span>Avg Latency:</span>
            <strong>{deployment.avgLatency || '0'}ms</strong>
          </div>
          
          <div className={styles.deploymentEndpoint}>
            <code>{env.endpoint}/v{deployment.version}/predict</code>
            <button 
              className={styles.copyButton}
              onClick={() => navigator.clipboard.writeText(`${env.endpoint}/v${deployment.version}/predict`)}
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.deploymentEmpty}>
          <p>Modell ist nicht in {env.label} deployed</p>
        </div>
      )}
      
      <button 
        className={styles.manageButton}
        onClick={() => onManage(environment)}
      >
        {deployment ? 'Verwalten' : 'Deploy'}
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

const APIKeyRow = ({ apiKey, onToggle, onDelete }) => {
  const [showKey, setShowKey] = useState(false);
  
  return (
    <div className={styles.apiKeyRow}>
      <div className={styles.apiKeyInfo}>
        <div className={styles.apiKeyName}>
          <span>{apiKey.name}</span>
          {apiKey.active ? (
            <Unlock size={14} className={styles.activeIcon} />
          ) : (
            <Lock size={14} className={styles.inactiveIcon} />
          )}
        </div>
        <div className={styles.apiKeyMeta}>
          <span>Erstellt: {new Date(apiKey.created).toLocaleDateString()}</span>
          <span>•</span>
          <span>Verwendet: {apiKey.usage} mal</span>
        </div>
      </div>
      
      <div className={styles.apiKeyValue}>
        <code>
          {showKey ? apiKey.key : '••••••••••••••••••••••••••••••••'}
        </code>
        <button 
          className={styles.toggleKeyButton}
          onClick={() => setShowKey(!showKey)}
        >
          {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      
      <div className={styles.apiKeyActions}>
        <button 
          className={styles.toggleButton}
          onClick={() => onToggle(apiKey.id)}
        >
          {apiKey.active ? 'Deaktivieren' : 'Aktivieren'}
        </button>
        <button 
          className={styles.deleteButton}
          onClick={() => onDelete(apiKey.id)}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const ModelDetails = ({ model, onClose, onUpdate }) => {
  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [deployTarget, setDeployTarget] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedModel, setEditedModel] = useState({
    name: model.name,
    description: model.description
  });
  
  // Mock data for demonstration
  const [deployments] = useState({
    development: null,
    staging: {
      version: model.version,
      deployedAt: '2025-01-07T14:30:00Z',
      requests24h: 1234,
      avgLatency: 45
    },
    production: model.status === 'deployed' ? {
      version: model.version,
      deployedAt: model.lastTrained,
      requests24h: 15678,
      avgLatency: 23
    } : null
  });
  
  const [apiKeys] = useState([
    {
      id: 'key_001',
      name: 'Mobile App Integration',
      key: 'sk_live_a1b2c3d4e5f6g7h8i9j0',
      created: '2025-01-05T10:00:00Z',
      active: true,
      usage: 45231,
      permissions: ['predict']
    },
    {
      id: 'key_002',
      name: 'Admin Dashboard',
      key: 'sk_live_z9y8x7w6v5u4t3s2r1q0',
      created: '2025-01-06T15:00:00Z',
      active: true,
      usage: 892,
      permissions: ['predict', 'evaluate', 'admin']
    }
  ]);
  
  const [evaluationResults] = useState({
    testSetSize: 1250,
    evaluatedAt: '2025-01-07T16:45:00Z',
    confusionMatrix: [
      [985, 15, 8],
      [22, 956, 12],
      [5, 18, 229]
    ],
    classDistribution: {
      low: 0.45,
      medium: 0.40,
      high: 0.15
    },
    featureImportance: [
      { feature: 'temperature', importance: 0.342 },
      { feature: 'weekday', importance: 0.278 },
      { feature: 'time_of_day', importance: 0.198 },
      { feature: 'weather_condition', importance: 0.124 },
      { feature: 'special_event', importance: 0.058 }
    ]
  });
  
  // Handlers
  const handleSaveEdit = useCallback(() => {
    onUpdate({
      ...model,
      ...editedModel
    });
    setEditMode(false);
  }, [model, editedModel, onUpdate]);
  
  const handleDeploy = useCallback((environment) => {
    setDeployTarget(environment);
    setShowDeployModal(true);
  }, []);
  
  const handleExportModel = useCallback(() => {
    const exportData = {
      model: {
        id: model.id,
        name: model.name,
        type: model.type,
        architecture: model.architecture,
        version: model.version,
        hyperparameters: model.hyperparameters
      },
      metrics: model.metrics,
      metadata: {
        exported: new Date().toISOString(),
        exportVersion: '1.0.0'
      }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `model-${model.name.replace(/\s+/g, '-').toLowerCase()}-v${model.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [model]);
  
  const handleCreateAPIKey = useCallback((keyConfig) => {
    // TODO: Implement API key creation
    console.log('Creating API key:', keyConfig);
    setShowCreateKey(false);
  }, []);
  
  // Get metric type based on model type
  const metricType = useMemo(() => {
    switch (model.type) {
      case 'demand_forecast':
      case 'inventory':
        return 'timeseries';
      case 'price_optimization':
        return 'regression';
      case 'emergency_ai':
        return 'classification';
      case 'recommendation':
        return 'recommendation';
      default:
        return 'classification';
    }
  }, [model.type]);
  
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <Brain size={24} className={styles.modelIcon} />
            {editMode ? (
              <div className={styles.editHeader}>
                <input
                  type="text"
                  value={editedModel.name}
                  onChange={(e) => setEditedModel({...editedModel, name: e.target.value})}
                  className={styles.editInput}
                />
                <div className={styles.editActions}>
                  <button onClick={handleSaveEdit} className={styles.saveButton}>
                    <Save size={16} />
                  </button>
                  <button onClick={() => setEditMode(false)} className={styles.cancelButton}>
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.titleSection}>
                <h2>{model.name}</h2>
                <button 
                  onClick={() => setEditMode(true)}
                  className={styles.editButton}
                >
                  <Edit3 size={16} />
                </button>
              </div>
            )}
          </div>
          
          <button onClick={onClose} className={styles.closeButton}>
            <X size={24} />
          </button>
        </div>
        
        {/* Model Info Bar */}
        <div className={styles.infoBar}>
          <div className={styles.infoItem}>
            <Package size={16} />
            <span>Version {model.version}</span>
          </div>
          <div className={styles.infoItem}>
            <Layers size={16} />
            <span>{model.architecture}</span>
          </div>
          <div className={styles.infoItem}>
            <Calendar size={16} />
            <span>Trainiert: {new Date(model.lastTrained).toLocaleDateString()}</span>
          </div>
          <div className={styles.infoItem}>
            <Clock size={16} />
            <span>Dauer: {Math.floor(model.trainingDuration / 60)}m</span>
          </div>
          <div className={styles.infoItem}>
            <Database size={16} />
            <span>{model.dataSources.length} Datenquellen</span>
          </div>
        </div>
        
        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={activeTab === 'overview' ? styles.activeTab : ''}
            onClick={() => setActiveTab('overview')}
          >
            <BarChart3 size={16} />
            Übersicht
          </button>
          <button
            className={activeTab === 'evaluation' ? styles.activeTab : ''}
            onClick={() => setActiveTab('evaluation')}
          >
            <Target size={16} />
            Evaluierung
          </button>
          <button
            className={activeTab === 'deployment' ? styles.activeTab : ''}
            onClick={() => setActiveTab('deployment')}
          >
            <Zap size={16} />
            Deployment
          </button>
          <button
            className={activeTab === 'api' ? styles.activeTab : ''}
            onClick={() => setActiveTab('api')}
          >
            <Code size={16} />
            API & Keys
          </button>
          <button
            className={activeTab === 'monitoring' ? styles.activeTab : ''}
            onClick={() => setActiveTab('monitoring')}
          >
            <Activity size={16} />
            Monitoring
          </button>
        </div>
        
        {/* Content */}
        <div className={styles.modalContent}>
          {activeTab === 'overview' && (
            <div className={styles.overviewContent}>
              {/* Description */}
              <div className={styles.descriptionSection}>
                <h3>Beschreibung</h3>
                {editMode ? (
                  <textarea
                    value={editedModel.description}
                    onChange={(e) => setEditedModel({...editedModel, description: e.target.value})}
                    rows={4}
                    className={styles.editTextarea}
                  />
                ) : (
                  <p>{model.description}</p>
                )}
              </div>
              
              {/* Key Metrics */}
              <div className={styles.metricsSection}>
                <h3>Schlüssel-Metriken</h3>
                <div className={styles.metricsGrid}>
                  {Object.entries(model.metrics || {}).map(([key, value]) => (
                    <MetricCard
                      key={key}
                      label={key.toUpperCase().replace(/_/g, ' ')}
                      value={value}
                      benchmark={0.85} // Mock baseline
                      format={key.includes('accuracy') ? (v) => `${(v * 100).toFixed(2)}%` : (v) => v.toFixed(4)}
                    />
                  ))}
                </div>
              </div>
              
              {/* Hyperparameters */}
              <div className={styles.hyperparametersSection}>
                <h3>Hyperparameter</h3>
                <div className={styles.hyperparametersGrid}>
                  {Object.entries(model.hyperparameters || {}).map(([param, value]) => (
                    <div key={param} className={styles.hyperparameterItem}>
                      <span className={styles.paramName}>{param}:</span>
                      <span className={styles.paramValue}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Actions */}
              <div className={styles.actionsSection}>
                <button className={styles.actionButton} onClick={handleExportModel}>
                  <Download size={20} />
                  Modell exportieren
                </button>
                <button className={styles.actionButton}>
                  <RefreshCw size={20} />
                  Neu trainieren
                </button>
                <button className={styles.actionButton}>
                  <Copy size={20} />
                  Duplizieren
                </button>
                <button className={styles.actionButton}>
                  <Share2 size={20} />
                  Teilen
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'evaluation' && (
            <div className={styles.evaluationContent}>
              <div className={styles.evaluationHeader}>
                <h3>Evaluierungs-Ergebnisse</h3>
                <span className={styles.evaluationMeta}>
                  Test-Set: {evaluationResults.testSetSize} Samples • 
                  Evaluiert: {new Date(evaluationResults.evaluatedAt).toLocaleDateString()}
                </span>
              </div>
              
              {/* Confusion Matrix */}
              {metricType === 'classification' && (
                <div className={styles.confusionMatrixSection}>
                  <h4>Confusion Matrix</h4>
                  <div className={styles.confusionMatrix}>
                    <table>
                      <thead>
                        <tr>
                          <th></th>
                          <th>Low</th>
                          <th>Medium</th>
                          <th>High</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Low</td>
                          <td className={styles.correct}>{evaluationResults.confusionMatrix[0][0]}</td>
                          <td>{evaluationResults.confusionMatrix[0][1]}</td>
                          <td>{evaluationResults.confusionMatrix[0][2]}</td>
                        </tr>
                        <tr>
                          <td>Medium</td>
                          <td>{evaluationResults.confusionMatrix[1][0]}</td>
                          <td className={styles.correct}>{evaluationResults.confusionMatrix[1][1]}</td>
                          <td>{evaluationResults.confusionMatrix[1][2]}</td>
                        </tr>
                        <tr>
                          <td>High</td>
                          <td>{evaluationResults.confusionMatrix[2][0]}</td>
                          <td>{evaluationResults.confusionMatrix[2][1]}</td>
                          <td className={styles.correct}>{evaluationResults.confusionMatrix[2][2]}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Feature Importance */}
              <div className={styles.featureImportanceSection}>
                <h4>Feature Importance</h4>
                <div className={styles.featureImportanceChart}>
                  {evaluationResults.featureImportance.map((feature, idx) => (
                    <div key={idx} className={styles.featureBar}>
                      <div className={styles.featureInfo}>
                        <span className={styles.featureName}>{feature.feature}</span>
                        <span className={styles.featureValue}>
                          {(feature.importance * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className={styles.featureBarTrack}>
                        <div 
                          className={styles.featureBarFill}
                          style={{ width: `${feature.importance * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Detailed Metrics */}
              <div className={styles.detailedMetricsSection}>
                <h4>Detaillierte Metriken</h4>
                <div className={styles.metricsTable}>
                  <table>
                    <thead>
                      <tr>
                        <th>Metrik</th>
                        <th>Training</th>
                        <th>Validation</th>
                        <th>Test</th>
                      </tr>
                    </thead>
                    <tbody>
                      {EVALUATION_METRICS[metricType].map(metric => (
                        <tr key={metric}>
                          <td>{metric.toUpperCase()}</td>
                          <td>{(Math.random() * 0.1 + 0.85).toFixed(4)}</td>
                          <td>{(Math.random() * 0.1 + 0.83).toFixed(4)}</td>
                          <td>{(Math.random() * 0.1 + 0.82).toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'deployment' && (
            <div className={styles.deploymentContent}>
              <div className={styles.deploymentHeader}>
                <h3>Deployment Status</h3>
                <button className={styles.deployAllButton}>
                  <Zap size={20} />
                  Deploy to All
                </button>
              </div>
              
              <div className={styles.deploymentGrid}>
                {Object.entries(DEPLOYMENT_ENVIRONMENTS).map(([env, config]) => (
                  <DeploymentCard
                    key={env}
                    environment={env}
                    deployment={deployments[env]}
                    onManage={handleDeploy}
                  />
                ))}
              </div>
              
              {/* Deployment History */}
              <div className={styles.deploymentHistory}>
                <h4>Deployment History</h4>
                <div className={styles.historyList}>
                  <div className={styles.historyItem}>
                    <div className={styles.historyIcon}>
                      <CheckCircle size={16} />
                    </div>
                    <div className={styles.historyInfo}>
                      <span className={styles.historyAction}>
                        Deployed v{model.version} to Production
                      </span>
                      <span className={styles.historyTime}>
                        {new Date(model.lastTrained).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className={styles.historyItem}>
                    <div className={styles.historyIcon}>
                      <RefreshCw size={16} />
                    </div>
                    <div className={styles.historyInfo}>
                      <span className={styles.historyAction}>
                        Updated configuration in Staging
                      </span>
                      <span className={styles.historyTime}>
                        vor 2 Tagen
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'api' && (
            <div className={styles.apiContent}>
              {/* API Endpoints */}
              <div className={styles.apiEndpointsSection}>
                <h3>API Endpoints</h3>
                <div className={styles.endpointsList}>
                  <div className={styles.endpoint}>
                    <div className={styles.endpointMethod}>POST</div>
                    <div className={styles.endpointPath}>
                      <code>/ml/v{model.version}/predict</code>
                      <button className={styles.copyButton}>
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                  <div className={styles.endpoint}>
                    <div className={styles.endpointMethod}>GET</div>
                    <div className={styles.endpointPath}>
                      <code>/ml/v{model.version}/evaluate</code>
                      <button className={styles.copyButton}>
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                  <div className={styles.endpoint}>
                    <div className={styles.endpointMethod}>GET</div>
                    <div className={styles.endpointPath}>
                      <code>/ml/v{model.version}/info</code>
                      <button className={styles.copyButton}>
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* API Keys */}
              <div className={styles.apiKeysSection}>
                <div className={styles.apiKeysHeader}>
                  <h3>API Keys</h3>
                  <button 
                    className={styles.createKeyButton}
                    onClick={() => setShowCreateKey(true)}
                  >
                    <Plus size={20} />
                    Neuer Key
                  </button>
                </div>
                
                <div className={styles.apiKeysList}>
                  {apiKeys.map(key => (
                    <APIKeyRow
                      key={key.id}
                      apiKey={key}
                      onToggle={(id) => console.log('Toggle:', id)}
                      onDelete={(id) => console.log('Delete:', id)}
                    />
                  ))}
                </div>
              </div>
              
              {/* Example Request */}
              <div className={styles.exampleSection}>
                <h3>Beispiel Request</h3>
                <div className={styles.codeBlock}>
                  <pre>
{`curl -X POST https://api.eatech.ch/ml/v${model.version}/predict \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "features": {
      "temperature": 22.5,
      "weekday": 5,
      "time_of_day": "evening",
      "weather": "sunny",
      "special_event": false
    }
  }'`}
                  </pre>
                  <button className={styles.copyCodeButton}>
                    <Copy size={16} />
                    Copy
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'monitoring' && (
            <div className={styles.monitoringContent}>
              <div className={styles.monitoringHeader}>
                <h3>Live Monitoring</h3>
                <div className={styles.refreshIndicator}>
                  <RefreshCw size={16} className={styles.spinning} />
                  <span>Aktualisiert alle 30s</span>
                </div>
              </div>
              
              {/* Performance Metrics */}
              <div className={styles.performanceGrid}>
                <div className={styles.performanceCard}>
                  <div className={styles.performanceHeader}>
                    <Activity size={20} />
                    <span>Requests/Min</span>
                  </div>
                  <div className={styles.performanceValue}>247</div>
                  <div className={styles.performanceTrend}>
                    <ArrowUpRight size={16} />
                    <span>+12% vs letzte Stunde</span>
                  </div>
                </div>
                
                <div className={styles.performanceCard}>
                  <div className={styles.performanceHeader}>
                    <Clock size={20} />
                    <span>Avg Latency</span>
                  </div>
                  <div className={styles.performanceValue}>23ms</div>
                  <div className={styles.performanceTrend}>
                    <ArrowDownRight size={16} />
                    <span>-5% vs letzte Stunde</span>
                  </div>
                </div>
                
                <div className={styles.performanceCard}>
                  <div className={styles.performanceHeader}>
                    <Target size={20} />
                    <span>Accuracy (Live)</span>
                  </div>
                  <div className={styles.performanceValue}>94.3%</div>
                  <div className={styles.performanceTrend}>
                    <span>Stabil</span>
                  </div>
                </div>
                
                <div className={styles.performanceCard}>
                  <div className={styles.performanceHeader}>
                    <AlertCircle size={20} />
                    <span>Errors (24h)</span>
                  </div>
                  <div className={styles.performanceValue}>3</div>
                  <div className={styles.performanceTrend}>
                    <span>0.002% Error Rate</span>
                  </div>
                </div>
              </div>
              
              {/* Usage Chart */}
              <div className={styles.usageChartSection}>
                <h4>Nutzung (letzte 24h)</h4>
                <div className={styles.usageChart}>
                  {/* Simple bar chart */}
                  <svg width="100%" height="200" viewBox="0 0 800 200">
                    {Array.from({ length: 24 }, (_, i) => {
                      const height = Math.random() * 150 + 20;
                      return (
                        <rect
                          key={i}
                          x={i * 33 + 10}
                          y={200 - height}
                          width={28}
                          height={height}
                          fill="#3b82f6"
                          opacity={i === 23 ? 1 : 0.7}
                        />
                      );
                    })}
                  </svg>
                </div>
              </div>
              
              {/* Recent Predictions */}
              <div className={styles.recentPredictionsSection}>
                <h4>Letzte Vorhersagen</h4>
                <div className={styles.predictionsList}>
                  {[...Array(5)].map((_, idx) => (
                    <div key={idx} className={styles.predictionItem}>
                      <div className={styles.predictionTime}>
                        {new Date(Date.now() - idx * 60000).toLocaleTimeString()}
                      </div>
                      <div className={styles.predictionResult}>
                        <span>Predicted: High</span>
                        <span className={styles.confidence}>
                          Confidence: {(Math.random() * 0.1 + 0.9).toFixed(2)}
                        </span>
                      </div>
                      <div className={styles.predictionLatency}>
                        {Math.floor(Math.random() * 10 + 18)}ms
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Create API Key Modal */}
      {showCreateKey && (
        <div className={styles.subModal}>
          <div className={styles.subModalContent}>
            <h3>Neuen API Key erstellen</h3>
            
            <div className={styles.formGroup}>
              <label>Name</label>
              <input 
                type="text" 
                placeholder="z.B. Mobile App Integration"
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Berechtigungen</label>
              <div className={styles.permissionsList}>
                {Object.entries(API_KEY_PERMISSIONS).map(([key, perm]) => (
                  <label key={key} className={styles.permissionItem}>
                    <input type="checkbox" defaultChecked={key === 'predict'} />
                    <div>
                      <span>{perm.label}</span>
                      <p>{perm.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            <div className={styles.subModalActions}>
              <button onClick={() => setShowCreateKey(false)}>
                Abbrechen
              </button>
              <button 
                className={styles.primaryButton}
                onClick={() => handleCreateAPIKey({})}
              >
                Key erstellen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// EXPORT
// ============================================================================
export default ModelDetails;