import React, { useState, useEffect } from 'react';
import {
  PlayCircle,
  PauseCircle,
  StopCircle,
  RotateCw,
  Settings,
  Database,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useAIModels } from '@/hooks/useAIModels';
import { useToast } from '@/hooks/useToast';
import styles from './TrainingPipeline.module.css';

export const TrainingPipeline = () => {
  const { models, trainModel, isLoading } = useAIModels();
  const { toast } = useToast();
  const [selectedModels, setSelectedModels] = useState([]);
  const [pipelineStatus, setPipelineStatus] = useState('idle'); // idle, running, paused, completed
  const [activeJobs, setActiveJobs] = useState([]);
  const [pipelineConfig, setPipelineConfig] = useState({
    batchSize: 32,
    epochs: 100,
    learningRate: 0.001,
    validationSplit: 0.2,
    earlyStoppingPatience: 10,
    dataAugmentation: true,
    crossValidation: false,
    hyperparameterTuning: false
  });

  const pipelineSteps = [
    { id: 'data-prep', name: 'Datenvorbereitung', icon: Database },
    { id: 'feature-eng', name: 'Feature Engineering', icon: Settings },
    { id: 'training', name: 'Model Training', icon: RotateCw },
    { id: 'validation', name: 'Validierung', icon: CheckCircle },
    { id: 'evaluation', name: 'Evaluation', icon: BarChart3 },
    { id: 'deployment', name: 'Deployment', icon: PlayCircle }
  ];

  const handleStartPipeline = async () => {
    if (selectedModels.length === 0) {
      toast.error('Bitte wählen Sie mindestens ein Modell aus');
      return;
    }

    setPipelineStatus('running');
    const jobs = [];

    for (const modelId of selectedModels) {
      try {
        const jobId = await trainModel(modelId, {
          parameters: pipelineConfig,
          onProgress: (progress) => {
            setActiveJobs(prev => prev.map(job =>
              job.modelId === modelId
                ? { ...job, progress, status: progress === 100 ? 'completed' : 'running' }
                : job
            ));
          }
        });

        jobs.push({
          jobId,
          modelId,
          modelName: models.find(m => m.id === modelId)?.name,
          status: 'running',
          progress: 0,
          startedAt: new Date()
        });
      } catch (error) {
        toast.error(`Fehler beim Starten des Trainings für Modell ${modelId}`);
        console.error(error);
      }
    }

    setActiveJobs(jobs);
  };

  const handlePausePipeline = () => {
    setPipelineStatus('paused');
    // In production, this would pause the actual training jobs
    toast.info('Pipeline pausiert');
  };

  const handleStopPipeline = () => {
    setPipelineStatus('idle');
    setActiveJobs([]);
    // In production, this would cancel the training jobs
    toast.warning('Pipeline gestoppt');
  };

  const handleConfigChange = (key, value) => {
    setPipelineConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getStepStatus = (stepId) => {
    if (pipelineStatus === 'idle') return 'pending';

    // Simplified logic - in production this would track actual progress
    const stepOrder = ['data-prep', 'feature-eng', 'training', 'validation', 'evaluation', 'deployment'];
    const currentStepIndex = 2; // Assume we're at training
    const stepIndex = stepOrder.indexOf(stepId);

    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'active';
    return 'pending';
  };

  const getOverallProgress = () => {
    if (activeJobs.length === 0) return 0;
    const totalProgress = activeJobs.reduce((sum, job) => sum + job.progress, 0);
    return Math.round(totalProgress / activeJobs.length);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Training Pipeline</h1>
        <div className={styles.controls}>
          {pipelineStatus === 'idle' && (
            <button
              onClick={handleStartPipeline}
              className={styles.startBtn}
              disabled={selectedModels.length === 0}
            >
              <PlayCircle />
              Pipeline starten
            </button>
          )}
          {pipelineStatus === 'running' && (
            <>
              <button onClick={handlePausePipeline} className={styles.pauseBtn}>
                <PauseCircle />
                Pausieren
              </button>
              <button onClick={handleStopPipeline} className={styles.stopBtn}>
                <StopCircle />
                Stoppen
              </button>
            </>
          )}
          {pipelineStatus === 'paused' && (
            <>
              <button onClick={() => setPipelineStatus('running')} className={styles.resumeBtn}>
                <PlayCircle />
                Fortsetzen
              </button>
              <button onClick={handleStopPipeline} className={styles.stopBtn}>
                <StopCircle />
                Stoppen
              </button>
            </>
          )}
        </div>
      </div>

      <div className={styles.content}>
        {/* Model Selection */}
        <div className={styles.section}>
          <h2>Modell-Auswahl</h2>
          <div className={styles.modelGrid}>
            {models.map(model => (
              <div
                key={model.id}
                className={`${styles.modelCard} ${selectedModels.includes(model.id) ? styles.selected : ''}`}
                onClick={() => {
                  setSelectedModels(prev =>
                    prev.includes(model.id)
                      ? prev.filter(id => id !== model.id)
                      : [...prev, model.id]
                  );
                }}
              >
                <h4>{model.name}</h4>
                <p>{model.type}</p>
                <span className={`${styles.modelStatus} ${styles[model.status]}`}>
                  {model.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline Configuration */}
        <div className={styles.section}>
          <h2>Pipeline Konfiguration</h2>
          <div className={styles.configGrid}>
            <div className={styles.configItem}>
              <label>Batch Size</label>
              <input
                type="number"
                value={pipelineConfig.batchSize}
                onChange={(e) => handleConfigChange('batchSize', parseInt(e.target.value))}
                disabled={pipelineStatus !== 'idle'}
              />
            </div>
            <div className={styles.configItem}>
              <label>Epochs</label>
              <input
                type="number"
                value={pipelineConfig.epochs}
                onChange={(e) => handleConfigChange('epochs', parseInt(e.target.value))}
                disabled={pipelineStatus !== 'idle'}
              />
            </div>
            <div className={styles.configItem}>
              <label>Learning Rate</label>
              <input
                type="number"
                step="0.0001"
                value={pipelineConfig.learningRate}
                onChange={(e) => handleConfigChange('learningRate', parseFloat(e.target.value))}
                disabled={pipelineStatus !== 'idle'}
              />
            </div>
            <div className={styles.configItem}>
              <label>Validation Split</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={pipelineConfig.validationSplit}
                onChange={(e) => handleConfigChange('validationSplit', parseFloat(e.target.value))}
                disabled={pipelineStatus !== 'idle'}
              />
            </div>
            <div className={styles.configItem}>
              <label>
                <input
                  type="checkbox"
                  checked={pipelineConfig.dataAugmentation}
                  onChange={(e) => handleConfigChange('dataAugmentation', e.target.checked)}
                  disabled={pipelineStatus !== 'idle'}
                />
                Data Augmentation
              </label>
            </div>
            <div className={styles.configItem}>
              <label>
                <input
                  type="checkbox"
                  checked={pipelineConfig.crossValidation}
                  onChange={(e) => handleConfigChange('crossValidation', e.target.checked)}
                  disabled={pipelineStatus !== 'idle'}
                />
                Cross Validation
              </label>
            </div>
          </div>
        </div>

        {/* Pipeline Steps */}
        <div className={styles.section}>
          <h2>Pipeline Schritte</h2>
          <div className={styles.pipeline}>
            {pipelineSteps.map((step, index) => {
              const status = getStepStatus(step.id);
              const Icon = step.icon;

              return (
                <React.Fragment key={step.id}>
                  <div className={`${styles.pipelineStep} ${styles[status]}`}>
                    <div className={styles.stepIcon}>
                      <Icon />
                    </div>
                    <h4>{step.name}</h4>
                    <div className={styles.stepStatus}>
                      {status === 'completed' && <CheckCircle className={styles.success} />}
                      {status === 'active' && <RotateCw className={styles.spinning} />}
                      {status === 'pending' && <Clock className={styles.pending} />}
                    </div>
                  </div>
                  {index < pipelineSteps.length - 1 && (
                    <div className={`${styles.connector} ${status === 'completed' ? styles.completed : ''}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Active Jobs */}
        {activeJobs.length > 0 && (
          <div className={styles.section}>
            <h2>Aktive Training Jobs</h2>
            <div className={styles.jobsList}>
              {activeJobs.map(job => (
                <div key={job.jobId} className={styles.jobCard}>
                  <div className={styles.jobHeader}>
                    <h4>{job.modelName}</h4>
                    <span className={`${styles.jobStatus} ${styles[job.status]}`}>
                      {job.status}
                    </span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                  <div className={styles.jobStats}>
                    <span>{job.progress}%</span>
                    <span>Gestartet: {new Date(job.startedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.overallProgress}>
              <h3>Gesamtfortschritt: {getOverallProgress()}%</h3>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${getOverallProgress()}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Results Summary (shown when completed) */}
        {pipelineStatus === 'completed' && (
          <div className={styles.section}>
            <h2>Training Ergebnisse</h2>
            <div className={styles.resultsGrid}>
              <div className={styles.resultCard}>
                <h4>Durchschnittliche Genauigkeit</h4>
                <p className={styles.bigNumber}>87.3%</p>
              </div>
              <div className={styles.resultCard}>
                <h4>Training Dauer</h4>
                <p className={styles.bigNumber}>2h 34m</p>
              </div>
              <div className={styles.resultCard}>
                <h4>Beste Performance</h4>
                <p className={styles.bigNumber}>Price Optimizer</p>
              </div>
              <div className={styles.resultCard}>
                <h4>Status</h4>
                <p className={styles.success}>Erfolgreich</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
