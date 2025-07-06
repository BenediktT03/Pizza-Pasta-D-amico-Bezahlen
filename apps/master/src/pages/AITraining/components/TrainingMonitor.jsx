/**
 * EATECH - Training Monitor Component
 * Version: 1.0.0
 * Description: Echtzeit-Monitoring für AI Model Training mit
 *              Live-Metriken und Visualisierungen
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/master/src/pages/AITraining/components/TrainingMonitor.jsx
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Activity,
  Clock,
  Cpu,
  HardDrive,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Pause,
  Play,
  Stop,
  Download,
  Maximize2,
  Settings,
  Info,
  RefreshCw,
  BarChart3,
  LineChart,
  GitBranch,
  Zap,
  Target,
  Award,
  Brain,
  Timer,
  Gauge,
  Binary,
  Database,
  Server,
  Layers,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  ChevronRight,
  ChevronDown,
  Terminal,
  Code
} from 'lucide-react';
import { Line, Bar } from 'recharts';
import styles from './TrainingMonitor.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const METRIC_CONFIGS = {
  loss: {
    label: 'Loss',
    format: (v) => v.toFixed(4),
    color: '#ef4444',
    invertTrend: true
  },
  accuracy: {
    label: 'Accuracy',
    format: (v) => `${(v * 100).toFixed(2)}%`,
    color: '#10b981',
    invertTrend: false
  },
  val_loss: {
    label: 'Val Loss',
    format: (v) => v.toFixed(4),
    color: '#f59e0b',
    invertTrend: true
  },
  val_accuracy: {
    label: 'Val Accuracy',
    format: (v) => `${(v * 100).toFixed(2)}%`,
    color: '#3b82f6',
    invertTrend: false
  },
  learning_rate: {
    label: 'Learning Rate',
    format: (v) => v.toExponential(2),
    color: '#8b5cf6',
    invertTrend: false
  }
};

const LOG_LEVELS = {
  info: { icon: Info, color: '#6b7280' },
  warning: { icon: AlertCircle, color: '#f59e0b' },
  error: { icon: AlertCircle, color: '#ef4444' },
  success: { icon: CheckCircle, color: '#10b981' }
};

// ============================================================================
// MOCK DATA GENERATOR
// ============================================================================
const generateMockData = (epoch, totalEpochs) => {
  const progress = epoch / totalEpochs;
  const noise = () => (Math.random() - 0.5) * 0.02;
  
  return {
    epoch,
    loss: Math.max(0.01, 2.5 * Math.exp(-3 * progress) + noise()),
    accuracy: Math.min(0.99, 0.5 + 0.49 * (1 - Math.exp(-3 * progress)) + noise()),
    val_loss: Math.max(0.01, 2.8 * Math.exp(-2.5 * progress) + noise() * 2),
    val_accuracy: Math.min(0.98, 0.45 + 0.48 * (1 - Math.exp(-2.5 * progress)) + noise()),
    learning_rate: 0.001 * Math.pow(0.9, Math.floor(epoch / 20)),
    batch_time: 120 + Math.random() * 40,
    gpu_usage: 0.7 + Math.random() * 0.25,
    memory_usage: 0.5 + progress * 0.3 + Math.random() * 0.1,
    temperature: 65 + Math.random() * 15
  };
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================
const MetricCard = ({ label, value, trend, format, color, icon: Icon }) => {
  const formattedValue = format ? format(value) : value;
  const trendValue = trend ? Math.abs(trend) : 0;
  const isPositive = trend > 0;
  
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricHeader}>
        {Icon && <Icon size={16} style={{ color }} />}
        <span>{label}</span>
      </div>
      <div className={styles.metricValue} style={{ color }}>
        {formattedValue}
      </div>
      {trend !== undefined && (
        <div className={styles.metricTrend}>
          {isPositive ? (
            <ArrowUp size={14} className={styles.trendUp} />
          ) : (
            <ArrowDown size={14} className={styles.trendDown} />
          )}
          <span>{(trendValue * 100).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
};

const LogEntry = ({ entry }) => {
  const config = LOG_LEVELS[entry.level];
  const Icon = config.icon;
  
  return (
    <div className={styles.logEntry}>
      <Icon size={14} style={{ color: config.color }} />
      <span className={styles.logTime}>{entry.time}</span>
      <span className={styles.logMessage}>{entry.message}</span>
    </div>
  );
};

const MetricChart = ({ data, metrics, height = 200 }) => {
  if (!data || data.length === 0) return null;
  
  // Simple line chart visualization
  const maxValue = Math.max(...data.flatMap(d => 
    metrics.map(m => d[m.key] || 0)
  ));
  
  return (
    <div className={styles.chartContainer} style={{ height }}>
      <svg width="100%" height="100%" viewBox="0 0 400 200">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(y => (
          <line
            key={y}
            x1="40"
            y1={180 - y * 160}
            x2="380"
            y2={180 - y * 160}
            stroke="#e5e7eb"
            strokeDasharray={y === 0 || y === 1 ? "0" : "2,2"}
          />
        ))}
        
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map(y => (
          <text
            key={y}
            x="30"
            y={185 - y * 160}
            fontSize="10"
            fill="#6b7280"
            textAnchor="end"
          >
            {(y * maxValue).toFixed(2)}
          </text>
        ))}
        
        {/* Data lines */}
        {metrics.map((metric, idx) => {
          const points = data.map((d, i) => {
            const x = 40 + (i / (data.length - 1)) * 340;
            const y = 180 - (d[metric.key] / maxValue) * 160;
            return `${x},${y}`;
          }).join(' ');
          
          return (
            <g key={metric.key}>
              <polyline
                points={points}
                fill="none"
                stroke={metric.color}
                strokeWidth="2"
              />
              {/* Data points */}
              {data.map((d, i) => {
                const x = 40 + (i / (data.length - 1)) * 340;
                const y = 180 - (d[metric.key] / maxValue) * 160;
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="3"
                    fill={metric.color}
                  />
                );
              })}
            </g>
          );
        })}
        
        {/* X-axis labels */}
        {data.filter((_, i) => i % Math.ceil(data.length / 5) === 0).map((d, i) => (
          <text
            key={i}
            x={40 + (d.epoch / data[data.length - 1].epoch) * 340}
            y="195"
            fontSize="10"
            fill="#6b7280"
            textAnchor="middle"
          >
            {d.epoch}
          </text>
        ))}
      </svg>
      
      {/* Legend */}
      <div className={styles.chartLegend}>
        {metrics.map(metric => (
          <div key={metric.key} className={styles.legendItem}>
            <div
              className={styles.legendColor}
              style={{ backgroundColor: metric.color }}
            />
            <span>{metric.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const TrainingMonitor = ({ model, onClose, onComplete }) => {
  // State
  const [isTraining, setIsTraining] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [currentEpoch, setCurrentEpoch] = useState(model.currentEpoch || 1);
  const [trainingData, setTrainingData] = useState([]);
  const [logs, setLogs] = useState([]);
  const [currentMetrics, setCurrentMetrics] = useState({});
  const [systemStats, setSystemStats] = useState({
    gpu_usage: 0,
    memory_usage: 0,
    temperature: 0,
    disk_io: 0
  });
  const [showSettings, setShowSettings] = useState(false);
  const [selectedView, setSelectedView] = useState('overview');
  const [autoScroll, setAutoScroll] = useState(true);
  
  const logsEndRef = useRef(null);
  const intervalRef = useRef(null);
  
  // Calculate progress and ETA
  const totalEpochs = model.totalEpochs || 100;
  const progress = currentEpoch / totalEpochs;
  const avgEpochTime = trainingData.length > 0 
    ? trainingData.reduce((sum, d) => sum + (d.batch_time || 0), 0) / trainingData.length
    : 120;
  const remainingTime = (totalEpochs - currentEpoch) * avgEpochTime;
  
  // Auto-scroll logs
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);
  
  // Training simulation
  useEffect(() => {
    if (!isTraining || isPaused) return;
    
    intervalRef.current = setInterval(() => {
      setCurrentEpoch(prev => {
        const nextEpoch = prev + 1;
        
        if (nextEpoch > totalEpochs) {
          setIsTraining(false);
          handleTrainingComplete();
          return prev;
        }
        
        // Generate new data
        const newData = generateMockData(nextEpoch, totalEpochs);
        setTrainingData(prevData => [...prevData, newData]);
        setCurrentMetrics(newData);
        
        // Add log entry
        const logEntry = {
          level: 'info',
          time: new Date().toLocaleTimeString(),
          message: `Epoch ${nextEpoch}/${totalEpochs} completed - Loss: ${newData.loss.toFixed(4)}, Accuracy: ${(newData.accuracy * 100).toFixed(2)}%`
        };
        setLogs(prevLogs => [...prevLogs, logEntry]);
        
        // Update system stats
        setSystemStats({
          gpu_usage: newData.gpu_usage,
          memory_usage: newData.memory_usage,
          temperature: newData.temperature,
          disk_io: Math.random() * 100
        });
        
        // Check for warnings
        if (newData.val_loss > newData.loss * 1.2) {
          setLogs(prevLogs => [...prevLogs, {
            level: 'warning',
            time: new Date().toLocaleTimeString(),
            message: 'Validation loss diverging - possible overfitting'
          }]);
        }
        
        return nextEpoch;
      });
    }, 2000); // 2 seconds per epoch for demo
    
    return () => clearInterval(intervalRef.current);
  }, [isTraining, isPaused, totalEpochs]);
  
  // Handlers
  const handlePause = useCallback(() => {
    setIsPaused(!isPaused);
    setLogs(prev => [...prev, {
      level: 'info',
      time: new Date().toLocaleTimeString(),
      message: isPaused ? 'Training resumed' : 'Training paused'
    }]);
  }, [isPaused]);
  
  const handleStop = useCallback(() => {
    if (confirm('Training wirklich abbrechen? Der Fortschritt geht verloren.')) {
      setIsTraining(false);
      clearInterval(intervalRef.current);
      setLogs(prev => [...prev, {
        level: 'error',
        time: new Date().toLocaleTimeString(),
        message: 'Training aborted by user'
      }]);
      setTimeout(onClose, 1000);
    }
  }, [onClose]);
  
  const handleTrainingComplete = useCallback(() => {
    setLogs(prev => [...prev, {
      level: 'success',
      time: new Date().toLocaleTimeString(),
      message: 'Training completed successfully!'
    }]);
    
    const finalMetrics = trainingData[trainingData.length - 1] || currentMetrics;
    const updatedModel = {
      ...model,
      status: 'evaluating',
      lastTrained: new Date().toISOString(),
      version: incrementVersion(model.version),
      metrics: {
        mae: finalMetrics.loss,
        rmse: finalMetrics.loss * 1.5,
        mape: finalMetrics.loss * 2,
        accuracy: finalMetrics.accuracy
      },
      trainingDuration: trainingData.length * avgEpochTime
    };
    
    setTimeout(() => {
      onComplete(updatedModel);
    }, 2000);
  }, [model, trainingData, currentMetrics, avgEpochTime, onComplete]);
  
  const incrementVersion = (version) => {
    const parts = version.split('.');
    parts[2] = (parseInt(parts[2]) + 1).toString();
    return parts.join('.');
  };
  
  const handleExportLogs = useCallback(() => {
    const logContent = logs.map(log => 
      `[${log.time}] ${log.level.toUpperCase()}: ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-logs-${model.name.replace(/\s+/g, '-')}-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [logs, model.name]);
  
  const handleExportMetrics = useCallback(() => {
    const csvContent = [
      'epoch,loss,accuracy,val_loss,val_accuracy,learning_rate',
      ...trainingData.map(d => 
        `${d.epoch},${d.loss},${d.accuracy},${d.val_loss},${d.val_accuracy},${d.learning_rate}`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-metrics-${model.name.replace(/\s+/g, '-')}-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [trainingData, model.name]);
  
  // Format time
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };
  
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerInfo}>
            <h2>Training Monitor</h2>
            <div className={styles.modelInfo}>
              <span>{model.name}</span>
              <span className={styles.separator}>•</span>
              <span>v{model.version}</span>
            </div>
          </div>
          
          <div className={styles.headerActions}>
            <button
              className={styles.iconButton}
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings size={20} />
            </button>
            <button
              className={styles.iconButton}
              onClick={() => {/* TODO: Fullscreen */}}
            >
              <Maximize2 size={20} />
            </button>
            <button onClick={onClose} className={styles.closeButton}>
              <X size={24} />
            </button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className={styles.progressSection}>
          <div className={styles.progressInfo}>
            <div className={styles.progressStats}>
              <span>Epoch {currentEpoch}/{totalEpochs}</span>
              <span>{(progress * 100).toFixed(1)}%</span>
            </div>
            <div className={styles.progressTime}>
              <Clock size={14} />
              <span>ETA: {formatTime(remainingTime)}</span>
            </div>
          </div>
          <div className={styles.mainProgressBar}>
            <div 
              className={styles.mainProgressFill}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
        
        {/* Control Bar */}
        <div className={styles.controlBar}>
          <div className={styles.controls}>
            {isTraining ? (
              <>
                <button
                  className={styles.controlButton}
                  onClick={handlePause}
                >
                  {isPaused ? <Play size={20} /> : <Pause size={20} />}
                  {isPaused ? 'Fortsetzen' : 'Pausieren'}
                </button>
                <button
                  className={`${styles.controlButton} ${styles.stopButton}`}
                  onClick={handleStop}
                >
                  <Stop size={20} />
                  Abbrechen
                </button>
              </>
            ) : (
              <button
                className={`${styles.controlButton} ${styles.successButton}`}
                onClick={onClose}
              >
                <CheckCircle size={20} />
                Training abgeschlossen
              </button>
            )}
          </div>
          
          <div className={styles.viewTabs}>
            <button
              className={selectedView === 'overview' ? styles.activeTab : ''}
              onClick={() => setSelectedView('overview')}
            >
              <BarChart3 size={16} />
              Übersicht
            </button>
            <button
              className={selectedView === 'metrics' ? styles.activeTab : ''}
              onClick={() => setSelectedView('metrics')}
            >
              <LineChart size={16} />
              Metriken
            </button>
            <button
              className={selectedView === 'logs' ? styles.activeTab : ''}
              onClick={() => setSelectedView('logs')}
            >
              <Terminal size={16} />
              Logs
            </button>
            <button
              className={selectedView === 'system' ? styles.activeTab : ''}
              onClick={() => setSelectedView('system')}
            >
              <Cpu size={16} />
              System
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className={styles.modalContent}>
          {selectedView === 'overview' && (
            <div className={styles.overviewContent}>
              {/* Current Metrics */}
              <div className={styles.metricsGrid}>
                <MetricCard
                  label="Loss"
                  value={currentMetrics.loss || 0}
                  format={METRIC_CONFIGS.loss.format}
                  color={METRIC_CONFIGS.loss.color}
                  icon={TrendingDown}
                  trend={trainingData.length > 1 ? 
                    (currentMetrics.loss - trainingData[trainingData.length - 2].loss) / trainingData[trainingData.length - 2].loss : 
                    undefined
                  }
                />
                <MetricCard
                  label="Accuracy"
                  value={currentMetrics.accuracy || 0}
                  format={METRIC_CONFIGS.accuracy.format}
                  color={METRIC_CONFIGS.accuracy.color}
                  icon={Target}
                  trend={trainingData.length > 1 ? 
                    (currentMetrics.accuracy - trainingData[trainingData.length - 2].accuracy) / trainingData[trainingData.length - 2].accuracy : 
                    undefined
                  }
                />
                <MetricCard
                  label="Val Loss"
                  value={currentMetrics.val_loss || 0}
                  format={METRIC_CONFIGS.val_loss.format}
                  color={METRIC_CONFIGS.val_loss.color}
                  icon={Activity}
                />
                <MetricCard
                  label="Val Accuracy"
                  value={currentMetrics.val_accuracy || 0}
                  format={METRIC_CONFIGS.val_accuracy.format}
                  color={METRIC_CONFIGS.val_accuracy.color}
                  icon={Award}
                />
                <MetricCard
                  label="Learning Rate"
                  value={currentMetrics.learning_rate || 0}
                  format={METRIC_CONFIGS.learning_rate.format}
                  color={METRIC_CONFIGS.learning_rate.color}
                  icon={Gauge}
                />
                <MetricCard
                  label="Batch Time"
                  value={currentMetrics.batch_time || 0}
                  format={(v) => `${v.toFixed(0)}ms`}
                  color="#6b7280"
                  icon={Timer}
                />
              </div>
              
              {/* Main Chart */}
              <div className={styles.chartSection}>
                <div className={styles.sectionHeader}>
                  <h3>Training Progress</h3>
                  <button
                    className={styles.exportButton}
                    onClick={handleExportMetrics}
                  >
                    <Download size={16} />
                    Export
                  </button>
                </div>
                <MetricChart
                  data={trainingData}
                  metrics={[
                    { key: 'loss', label: 'Loss', color: METRIC_CONFIGS.loss.color },
                    { key: 'accuracy', label: 'Accuracy', color: METRIC_CONFIGS.accuracy.color },
                    { key: 'val_loss', label: 'Val Loss', color: METRIC_CONFIGS.val_loss.color },
                    { key: 'val_accuracy', label: 'Val Accuracy', color: METRIC_CONFIGS.val_accuracy.color }
                  ]}
                  height={300}
                />
              </div>
              
              {/* Recent Logs */}
              <div className={styles.recentLogsSection}>
                <h3>Letzte Ereignisse</h3>
                <div className={styles.recentLogs}>
                  {logs.slice(-5).map((log, idx) => (
                    <LogEntry key={idx} entry={log} />
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {selectedView === 'metrics' && (
            <div className={styles.metricsContent}>
              <div className={styles.sectionHeader}>
                <h3>Detaillierte Metriken</h3>
                <button
                  className={styles.exportButton}
                  onClick={handleExportMetrics}
                >
                  <Download size={16} />
                  Export CSV
                </button>
              </div>
              
              {/* Individual metric charts */}
              {Object.entries(METRIC_CONFIGS).map(([key, config]) => (
                <div key={key} className={styles.metricChartSection}>
                  <h4>{config.label}</h4>
                  <MetricChart
                    data={trainingData}
                    metrics={[{ key, label: config.label, color: config.color }]}
                    height={150}
                  />
                </div>
              ))}
            </div>
          )}
          
          {selectedView === 'logs' && (
            <div className={styles.logsContent}>
              <div className={styles.logsHeader}>
                <h3>Training Logs</h3>
                <div className={styles.logsActions}>
                  <label className={styles.autoScrollToggle}>
                    <input
                      type="checkbox"
                      checked={autoScroll}
                      onChange={(e) => setAutoScroll(e.target.checked)}
                    />
                    Auto-scroll
                  </label>
                  <button
                    className={styles.exportButton}
                    onClick={handleExportLogs}
                  >
                    <Download size={16} />
                    Export
                  </button>
                </div>
              </div>
              
              <div className={styles.logsContainer}>
                {logs.map((log, idx) => (
                  <LogEntry key={idx} entry={log} />
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}
          
          {selectedView === 'system' && (
            <div className={styles.systemContent}>
              <h3>System Resources</h3>
              
              <div className={styles.systemGrid}>
                <div className={styles.systemCard}>
                  <div className={styles.systemHeader}>
                    <Cpu size={20} />
                    <span>GPU Auslastung</span>
                  </div>
                  <div className={styles.systemValue}>
                    {(systemStats.gpu_usage * 100).toFixed(1)}%
                  </div>
                  <div className={styles.systemBar}>
                    <div 
                      className={styles.systemBarFill}
                      style={{ 
                        width: `${systemStats.gpu_usage * 100}%`,
                        backgroundColor: systemStats.gpu_usage > 0.9 ? '#ef4444' : '#10b981'
                      }}
                    />
                  </div>
                </div>
                
                <div className={styles.systemCard}>
                  <div className={styles.systemHeader}>
                    <HardDrive size={20} />
                    <span>Speicher</span>
                  </div>
                  <div className={styles.systemValue}>
                    {(systemStats.memory_usage * 100).toFixed(1)}%
                  </div>
                  <div className={styles.systemBar}>
                    <div 
                      className={styles.systemBarFill}
                      style={{ 
                        width: `${systemStats.memory_usage * 100}%`,
                        backgroundColor: systemStats.memory_usage > 0.8 ? '#f59e0b' : '#10b981'
                      }}
                    />
                  </div>
                </div>
                
                <div className={styles.systemCard}>
                  <div className={styles.systemHeader}>
                    <Gauge size={20} />
                    <span>Temperatur</span>
                  </div>
                  <div className={styles.systemValue}>
                    {systemStats.temperature.toFixed(0)}°C
                  </div>
                  <div className={styles.systemBar}>
                    <div 
                      className={styles.systemBarFill}
                      style={{ 
                        width: `${(systemStats.temperature / 100) * 100}%`,
                        backgroundColor: systemStats.temperature > 80 ? '#ef4444' : '#10b981'
                      }}
                    />
                  </div>
                </div>
                
                <div className={styles.systemCard}>
                  <div className={styles.systemHeader}>
                    <Database size={20} />
                    <span>Disk I/O</span>
                  </div>
                  <div className={styles.systemValue}>
                    {systemStats.disk_io.toFixed(0)} MB/s
                  </div>
                  <div className={styles.systemBar}>
                    <div 
                      className={styles.systemBarFill}
                      style={{ 
                        width: `${(systemStats.disk_io / 200) * 100}%`,
                        backgroundColor: '#3b82f6'
                      }}
                    />
                  </div>
                </div>
              </div>
              
              <div className={styles.systemInfo}>
                <div className={styles.infoItem}>
                  <Server size={16} />
                  <span>Server: gpu-node-03.eatech.cloud</span>
                </div>
                <div className={styles.infoItem}>
                  <Layers size={16} />
                  <span>CUDA Version: 12.2</span>
                </div>
                <div className={styles.infoItem}>
                  <Binary size={16} />
                  <span>TensorFlow: 2.15.0</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Settings Panel */}
        {showSettings && (
          <div className={styles.settingsPanel}>
            <h3>Training Einstellungen</h3>
            
            <div className={styles.settingGroup}>
              <label>Checkpoint Interval</label>
              <select defaultValue="10">
                <option value="5">Alle 5 Epochs</option>
                <option value="10">Alle 10 Epochs</option>
                <option value="20">Alle 20 Epochs</option>
              </select>
            </div>
            
            <div className={styles.settingGroup}>
              <label>Early Stopping</label>
              <label className={styles.toggleSwitch}>
                <input type="checkbox" defaultChecked />
                <span>Aktiviert</span>
              </label>
            </div>
            
            <div className={styles.settingGroup}>
              <label>Patience</label>
              <input type="number" defaultValue="10" min="5" max="50" />
            </div>
            
            <div className={styles.settingGroup}>
              <label>Mixed Precision</label>
              <label className={styles.toggleSwitch}>
                <input type="checkbox" />
                <span>FP16 Training</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// EXPORT
// ============================================================================
export default TrainingMonitor;