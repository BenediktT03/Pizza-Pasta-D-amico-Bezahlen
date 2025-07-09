import { useState, useEffect, useCallback } from 'react';
import { db, storage } from '@/services/firebase/config';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const useAIModels = () => {
  const [models, setModels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trainingJobs, setTrainingJobs] = useState({});

  useEffect(() => {
    setIsLoading(true);

    // Subscribe to AI models collection
    const modelsQuery = query(
      collection(db, 'aiModels'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      modelsQuery,
      (snapshot) => {
        const modelData = [];
        snapshot.forEach((doc) => {
          modelData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        setModels(modelData);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching AI models:', err);
        setError(err.message);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const trainModel = useCallback(async (modelId, options = {}) => {
    try {
      // Update model status to training
      await updateDoc(doc(db, 'aiModels', modelId), {
        status: 'training',
        trainingStartedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      // Create training job
      const jobRef = await addDoc(collection(db, 'trainingJobs'), {
        modelId,
        status: 'running',
        progress: 0,
        startedAt: Timestamp.now(),
        parameters: options.parameters || {},
        createdBy: 'system' // In production, get from auth
      });

      // Simulate training progress (in production, this would be handled by Cloud Functions)
      let progress = 0;
      const interval = setInterval(async () => {
        progress += Math.random() * 15;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);

          // Complete training
          await updateDoc(doc(db, 'trainingJobs', jobRef.id), {
            status: 'completed',
            progress: 100,
            completedAt: Timestamp.now(),
            metrics: {
              accuracy: 0.87 + Math.random() * 0.1,
              loss: 0.15 - Math.random() * 0.05,
              f1Score: 0.85 + Math.random() * 0.1,
              precision: 0.88 + Math.random() * 0.08,
              recall: 0.84 + Math.random() * 0.12
            }
          });

          // Update model status
          await updateDoc(doc(db, 'aiModels', modelId), {
            status: 'trained',
            version: await incrementVersion(modelId),
            lastTrained: Timestamp.now(),
            accuracy: 0.87 + Math.random() * 0.1,
            updatedAt: Timestamp.now()
          });
        } else {
          // Update progress
          await updateDoc(doc(db, 'trainingJobs', jobRef.id), {
            progress: Math.round(progress),
            updatedAt: Timestamp.now()
          });
        }

        if (options.onProgress) {
          options.onProgress(Math.round(progress));
        }
      }, 1000);

      setTrainingJobs(prev => ({
        ...prev,
        [modelId]: { jobId: jobRef.id, interval }
      }));

      return jobRef.id;
    } catch (err) {
      console.error('Error training model:', err);
      throw err;
    }
  }, []);

  const deployModel = useCallback(async (modelId) => {
    try {
      const model = models.find(m => m.id === modelId);
      if (!model || model.status !== 'trained') {
        throw new Error('Model must be trained before deployment');
      }

      // Update model status to deploying
      await updateDoc(doc(db, 'aiModels', modelId), {
        status: 'deploying',
        deploymentStartedAt: Timestamp.now()
      });

      // Simulate deployment process
      setTimeout(async () => {
        await updateDoc(doc(db, 'aiModels', modelId), {
          status: 'deployed',
          deployedAt: Timestamp.now(),
          endpoint: `https://api.eatech.ch/ai/models/${modelId}/predict`,
          updatedAt: Timestamp.now()
        });
      }, 3000);
    } catch (err) {
      console.error('Error deploying model:', err);
      throw err;
    }
  }, [models]);

  const createModel = useCallback(async (modelData) => {
    try {
      const newModel = {
        ...modelData,
        status: 'draft',
        version: '1.0.0',
        accuracy: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: 'system' // In production, get from auth
      };

      const docRef = await addDoc(collection(db, 'aiModels'), newModel);
      return docRef.id;
    } catch (err) {
      console.error('Error creating model:', err);
      throw err;
    }
  }, []);

  const exportModel = useCallback(async (modelId) => {
    try {
      const model = models.find(m => m.id === modelId);
      if (!model) throw new Error('Model not found');

      // Create export data
      const exportData = {
        model: model,
        exportedAt: new Date().toISOString(),
        version: model.version,
        metadata: {
          accuracy: model.accuracy,
          lastTrained: model.lastTrained?.toDate(),
          parameters: model.parameters || {}
        }
      };

      // Convert to JSON and create blob
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      // Upload to Firebase Storage
      const storageRef = ref(storage, `ai-models/exports/${modelId}-${Date.now()}.json`);
      const snapshot = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // Trigger download
      const a = document.createElement('a');
      a.href = downloadURL;
      a.download = `model-${model.name}-${model.version}.json`;
      a.click();

      return downloadURL;
    } catch (err) {
      console.error('Error exporting model:', err);
      throw err;
    }
  }, [models]);

  const getModelMetrics = useCallback(async (modelId) => {
    try {
      const metricsQuery = query(
        collection(db, 'aiModels', modelId, 'metrics'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      const snapshot = await metricsQuery.get();
      const metrics = [];
      snapshot.forEach(doc => {
        metrics.push({ id: doc.id, ...doc.data() });
      });

      return metrics;
    } catch (err) {
      console.error('Error fetching model metrics:', err);
      throw err;
    }
  }, []);

  // Helper function to increment version
  const incrementVersion = async (modelId) => {
    const model = models.find(m => m.id === modelId);
    if (!model) return '1.0.0';

    const [major, minor, patch] = model.version.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  };

  return {
    models,
    isLoading,
    error,
    trainModel,
    deployModel,
    createModel,
    exportModel,
    getModelMetrics,
    refreshModels: () => {
      setIsLoading(true);
      // Trigger re-fetch by updating state
      setModels([...models]);
    }
  };
};
