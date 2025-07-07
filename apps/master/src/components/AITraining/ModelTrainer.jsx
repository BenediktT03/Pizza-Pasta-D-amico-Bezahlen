import React, { useState, useEffect } from 'react';
import {
  Brain,
  Play,
  Pause,
  RotateCcw,
  Download,
  Upload,
  Settings,
  TrendingUp,
  Clock,
  Cpu,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import styles from './ModelTrainer.module.css';

const ModelTrainer = ({
  modelId,
  modelName,
  onTrainingComplete,
  initialConfig = {}
}) => {
  // State Management
  const [isTraining, setIsTraining] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [currentEpoch, setCurrentEpoch] = useState(0);
  const [metrics, setMetrics] = useState({
    loss: 0,
    accuracy: 0,
    validationLoss: 0,
    validationAccuracy: 0
  });
  const [trainingHistory, setTrainingHistory] = useState([]);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [trainingConfig, setTrainingConfig] = useState({
    epochs: 100,
    batchSize: 32,
    learningRate: 0.001,
    optimizer: 'adam',
    lossFunction: 'crossentropy',
    validationSplit: 0.2,
    earlyStoppingPatience: 10,
    ...initialConfig
  });

  // Mock training simulation
  useEffect(() => {
    let interval;
    
    if (isTraining && !isPaused) {
      interval = setInterval(() => {
        setTrainingProgress(prev => {
          const newProgress = prev + 1;
          
          if (newProgress >= 100) {
            handleTrainingComplete();
            return 100;
          }
          
          // Update epoch
          const epoch = Math.floor((newProgress / 100) * trainingConfig.epochs);
          setCurrentEpoch(epoch);
          
          // Simulate metrics
          updateMetrics(newProgress);
          
          return newProgress;
        });
      }, 500); // Update every 500ms
    }
    
    return () => clearInterval(interval);
  }, [isTraining, isPaused, trainingConfig.epochs]);

  // Update metrics simulation
  const updateMetrics = (progress) => {
    const newMetrics = {
      loss: Math.max(0.1, 2 - (progress / 50)),
      accuracy: Math.min(0.98, progress / 100),
      validationLoss: Math.max(0.15, 2.1 - (progress / 55)),
      validationAccuracy: Math.min(0.95, progress / 105)
    };
    
    setMetrics(newMetrics);
    setTrainingHistory(prev => [...prev, {
      epoch: currentEpoch,
      ...newMetrics,
      timestamp: new Date().toISOString()
    }]);
  };

  // Training control functions
  const startTraining = () => {
    setIsTraining(true);
    setIsPaused(false);
    setTrainingProgress(0);
    setCurrentEpoch(0);
    setTrainingHistory([]);
    
    // Calculate estimated time
    const estimatedSeconds = trainingConfig.epochs * trainingConfig.batchSize * 0.1;
    setEstimatedTime(estimatedSeconds);
  };

  const pauseTraining = () => {
    setIsPaused(true);
  };

  const resumeTraining = () => {
    setIsPaused(false);
  };

  const stopTraining = () => {
    setIsTraining(false);
    setIsPaused(false);
    setTrainingProgress(0);
    setCurrentEpoch(0);
  };

  const handleTrainingComplete = () => {
    setIsTraining(false);
    if (onTrainingComplete) {
      onTrainingComplete({
        modelId,
        metrics,
        history: trainingHistory,
        config: trainingConfig
      });
    }
  };

  // Export model
  const exportModel = () => {
    const modelData = {
      modelId,
      modelName,
      metrics,
      history: trainingHistory,
      config: trainingConfig,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(modelData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${modelName}_model.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Format time
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.modelInfo}>
          <Brain size={32} className={styles.modelIcon} />
          <div>
            <h2>{modelName}</h2>
            <p className={styles.modelId}>Model ID: {modelId}</p>
          </div>
        </div>
        
        <div className={styles.controls}>
          {!isTraining ? (
            <button className={styles.startButton} onClick={startTraining}>
              <Play size={20} />
              <span>Training starten</span>
            </button>
          ) : (
            <>
              {isPaused ? (
                <button className={styles.resumeButton} onClick={resumeTraining}>
                  <Play size={20} />
                  <span>Fortsetzen</span>
                </button>
              ) : (
                <button className={styles.pauseButton} onClick={pauseTraining}>
                  <Pause size={20} />
                  <span>Pausieren</span>
                </button>
              )}
              <button className={styles.stopButton} onClick={stopTraining}>
                <RotateCcw size={20} />
                <span>Stoppen</span>
              </button>
            </>
          )}
          <button className={styles.exportButton} onClick={exportModel}>
            <Download size={20} />
            <span>Exportieren</span>
          </button>
        </div>
      </div>

      {/* Progress Section */}
      <div className={styles.progressSection}>
        <div className={styles.progressHeader}>
          <h3>Training Progress</h3>
          <span className={styles.epoch}>
            Epoch {currentEpoch} / {trainingConfig.epochs}
          </span>
        </div>
        
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill}
            style={{ width: `${trainingProgress}%` }}
          >
            <span className={styles.progressText}>{trainingProgress}%</span>
          </div>
        </div>
        
        {estimatedTime && isTraining && (
          <div className={styles.timeEstimate}>
            <Clock size={16} />
            <span>Geschätzte Restzeit: {formatTime(Math.floor(estimatedTime * (1 - trainingProgress / 100)))}</span>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <TrendingUp size={20} />
            <span>Loss</span>
          </div>
          <div className={styles.metricValue}>{metrics.loss.toFixed(4)}</div>
          <div className={styles.metricLabel}>Training Loss</div>
        </div>
        
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <BarChart3 size={20} />
            <span>Accuracy</span>
          </div>
          <div className={styles.metricValue}>{(metrics.accuracy * 100).toFixed(2)}%</div>
          <div className={styles.metricLabel}>Training Accuracy</div>
        </div>
        
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <TrendingUp size={20} />
            <span>Val Loss</span>
          </div>
          <div className={styles.metricValue}>{metrics.validationLoss.toFixed(4)}</div>
          <div className={styles.metricLabel}>Validation Loss</div>
        </div>
        
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <BarChart3 size={20} />
            <span>Val Accuracy</span>
          </div>
          <div className={styles.metricValue}>{(metrics.validationAccuracy * 100).toFixed(2)}%</div>
          <div className={styles.metricLabel}>Validation Accuracy</div>
        </div>
      </div>

      {/* Training Configuration */}
      <div className={styles.configSection}>
        <h3>Training Configuration</h3>
        <div className={styles.configGrid}>
          <div className={styles.configItem}>
            <label>Epochs</label>
            <input
              type="number"
              value={trainingConfig.epochs}
              onChange={(e) => setTrainingConfig({
                ...trainingConfig,
                epochs: parseInt(e.target.value)
              })}
              disabled={isTraining}
            />
          </div>
          
          <div className={styles.configItem}>
            <label>Batch Size</label>
            <input
              type="number"
              value={trainingConfig.batchSize}
              onChange={(e) => setTrainingConfig({
                ...trainingConfig,
                batchSize: parseInt(e.target.value)
              })}
              disabled={isTraining}
            />
          </div>
          
          <div className={styles.configItem}>
            <label>Learning Rate</label>
            <input
              type="number"
              step="0.0001"
              value={trainingConfig.learningRate}
              onChange={(e) => setTrainingConfig({
                ...trainingConfig,
                learningRate: parseFloat(e.target.value)
              })}
              disabled={isTraining}
            />
          </div>
          
          <div className={styles.configItem}>
            <label>Optimizer</label>
            <select
              value={trainingConfig.optimizer}
              onChange={(e) => setTrainingConfig({
                ...trainingConfig,
                optimizer: e.target.value
              })}
              disabled={isTraining}
            >
              <option value="adam">Adam</option>
              <option value="sgd">SGD</option>
              <option value="rmsprop">RMSprop</option>
              <option value="adagrad">Adagrad</option>
            </select>
          </div>
        </div>
      </div>

      {/* Training History Chart */}
      {trainingHistory.length > 0 && (
        <div className={styles.historySection}>
          <h3>Training History</h3>
          <div className={styles.chartContainer}>
            <svg viewBox="0 0 400 200" className={styles.chart}>
              {/* Loss line */}
              <polyline
                points={trainingHistory.map((item, idx) => 
                  `${(idx / (trainingHistory.length - 1)) * 380 + 10},${190 - (item.loss / 2) * 180}`
                ).join(' ')}
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
              />
              
              {/* Accuracy line */}
              <polyline
                points={trainingHistory.map((item, idx) => 
                  `${(idx / (trainingHistory.length - 1)) * 380 + 10},${190 - item.accuracy * 180}`
                ).join(' ')}
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
              />
            </svg>
            
            <div className={styles.chartLegend}>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: '#ef4444' }}></span>
                <span>Training Loss</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: '#10b981' }}></span>
                <span>Training Accuracy</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {isTraining && (
        <div className={styles.statusMessage}>
          <Cpu size={20} className={styles.statusIcon} />
          <span>Model wird trainiert... GPU-Auslastung: 87%</span>
        </div>
      )}
      
      {trainingProgress === 100 && (
        <div className={styles.successMessage}>
          <CheckCircle size={20} />
          <span>Training erfolgreich abgeschlossen!</span>
        </div>
      )}
    </div>
  );
};

export default ModelTrainer;