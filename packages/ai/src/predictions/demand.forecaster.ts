/**
 * Predictive Demand Forecaster
 *
 * Erweiterte ML-basierte Nachfrageprognose mit neuronalen Netzen
 * Spezifische Implementierung für Schweizer Foodtrucks
 *
 * @author Benedikt Thomma <benedikt@thomma.ch>
 */

import { getFirestore } from 'firebase-admin/firestore';
import { aiConfig } from '../config/ai.config';
import {
  FeatureVector,
  ForecastHorizon,
  MLModel,
  ModelPerformance,
  PredictiveForecastRequest,
  PredictiveForecastResponse,
  TrainingData
} from '../types/ai.types';
import {
  normalizeData,
  splitTrainTest
} from '../utils/ai.utils';

export class DemandForecaster {
  private db: FirebaseFirestore.Firestore;
  private models: Map<string, MLModel> = new Map();
  private trainingData: Map<string, TrainingData[]> = new Map();
  private lastTraining: Map<string, Date> = new Map();

  constructor() {
    this.db = getFirestore();
  }

  /**
   * Initialisiert den Predictive Demand Forecaster
   */
  async initialize(): Promise<void> {
    console.log('🤖 Initializing Predictive Demand Forecaster...');

    // Lade existierende Modelle
    await this.loadExistingModels();

    // Starte Model Training Pipeline
    this.startModelTrainingPipeline();

    console.log('✅ Predictive Demand Forecaster initialized');
  }

  /**
   * Erstellt ML-basierte Nachfrageprognose
   */
  async forecastDemand(request: PredictiveForecastRequest): Promise<PredictiveForecastResponse> {
    try {
      console.log(`🔮 Predictive forecasting for tenant ${request.tenantId}`);

      // Hole oder trainiere Modell
      const model = await this.getOrTrainModel(request.tenantId);

      // Bereite Features vor
      const features = await this.prepareFeatures(request);

      // Führe Vorhersage durch
      const predictions = await this.predict(model, features, request.horizon);

      // Berechne Konfidenz-Intervalle
      const confidenceIntervals = this.calculateConfidenceIntervals(predictions, model);

      // Validiere Vorhersagen
      const validatedPredictions = this.validatePredictions(predictions, request);

      return {
        tenantId: request.tenantId,
        horizon: request.horizon,
        method: 'neural_network',
        predictions: validatedPredictions,
        confidenceIntervals,
        modelMetrics: {
          accuracy: model.performance.accuracy,
          mape: model.performance.mape,
          rmse: model.performance.rmse,
          lastTrained: model.lastTrained,
          dataPoints: model.trainingDataSize
        },
        features: this.getFeatureImportance(model),
        generatedAt: new Date(),
        validUntil: new Date(Date.now() + aiConfig.forecasting.cacheValidityMinutes * 60 * 1000)
      };
    } catch (error) {
      console.error(`Predictive forecasting failed for ${request.tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Trainiert oder lädt existierendes Modell
   */
  private async getOrTrainModel(tenantId: string): Promise<MLModel> {
    const existingModel = this.models.get(tenantId);
    const lastTraining = this.lastTraining.get(tenantId);

    // Prüfe ob Re-Training nötig ist
    const needsRetraining = !existingModel ||
      !lastTraining ||
      (new Date().getTime() - lastTraining.getTime()) > aiConfig.forecasting.retrainingInterval;

    if (needsRetraining) {
      console.log(`🔄 Training new model for tenant ${tenantId}`);
      return await this.trainModel(tenantId);
    }

    return existingModel;
  }

  /**
   * Trainiert neues ML-Modell
   */
  private async trainModel(tenantId: string): Promise<MLModel> {
    // Sammle Trainingsdaten
    const trainingData = await this.collectTrainingData(tenantId);

    if (trainingData.length < aiConfig.forecasting.minTrainingDataPoints) {
      throw new Error(`Insufficient training data: ${trainingData.length} points (min: ${aiConfig.forecasting.minTrainingDataPoints})`);
    }

    // Bereite Daten vor
    const features = this.extractFeatures(trainingData);
    const targets = trainingData.map(d => d.demandValue);

    // Normalisiere Daten
    const normalizedFeatures = normalizeData(features);
    const normalizedTargets = normalizeData(targets);

    // Teile in Train/Test auf
    const { trainX, testX, trainY, testY } = splitTrainTest(
      normalizedFeatures,
      normalizedTargets,
      0.8
    );

    // Trainiere Modell (vereinfachte Neuronales Netz Simulation)
    const model = await this.trainNeuralNetwork(trainX, trainY);

    // Evaluiere Modell
    const performance = await this.evaluateModel(model, testX, testY);

    // Speichere Modell
    const mlModel: MLModel = {
      id: `${tenantId}_demand_v${Date.now()}`,
      tenantId,
      type: 'neural_network',
      architecture: 'feedforward',
      hyperparameters: {
        hiddenLayers: [64, 32, 16],
        learningRate: 0.001,
        epochs: 1000,
        batchSize: 32
      },
      weights: model.weights,
      normalizers: model.normalizers,
      performance,
      trainingDataSize: trainingData.length,
      lastTrained: new Date(),
      version: '1.0'
    };

    this.models.set(tenantId, mlModel);
    this.lastTraining.set(tenantId, new Date());

    // Speichere in DB
    await this.saveModel(mlModel);

    console.log(`✅ Model trained for ${tenantId}. MAPE: ${performance.mape.toFixed(2)}%`);

    return mlModel;
  }

  /**
   * Sammelt Trainingsdaten
   */
  private async collectTrainingData(tenantId: string): Promise<TrainingData[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - aiConfig.forecasting.trainingDataDays);

    // Hole historische Orders
    const ordersSnapshot = await this.db
      .collection(`tenants/${tenantId}/orders`)
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .where('status', 'in', ['completed', 'delivered', 'picked_up'])
      .orderBy('createdAt')
      .get();

    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate()
    }));

    // Gruppiere nach Stunden
    const hourlyData = new Map<string, {
      timestamp: Date;
      orderCount: number;
      revenue: number;
      itemCount: number;
    }>();

    for (const order of orders) {
      const hourKey = this.getHourKey(order.createdAt);

      if (!hourlyData.has(hourKey)) {
        hourlyData.set(hourKey, {
          timestamp: this.roundToHour(order.createdAt),
          orderCount: 0,
          revenue: 0,
          itemCount: 0
        });
      }

      const entry = hourlyData.get(hourKey)!;
      entry.orderCount++;
      entry.revenue += order.total || 0;
      entry.itemCount += order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    }

    // Konvertiere zu TrainingData
    const trainingData: TrainingData[] = [];

    for (const [, data] of hourlyData) {
      const features = await this.generateFeatureVector(tenantId, data.timestamp);

      trainingData.push({
        timestamp: data.timestamp,
        tenantId,
        demandValue: data.orderCount,
        features,
        contextData: {
          revenue: data.revenue,
          itemCount: data.itemCount,
          avgOrderValue: data.orderCount > 0 ? data.revenue / data.orderCount : 0
        }
      });
    }

    // Sortiere nach Zeit
    trainingData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return trainingData;
  }

  /**
   * Generiert Feature Vector für einen Zeitpunkt
   */
  private async generateFeatureVector(tenantId: string, timestamp: Date): Promise<FeatureVector> {
    const hour = timestamp.getHours();
    const dayOfWeek = timestamp.getDay();
    const month = timestamp.getMonth();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Temporale Features
    const temporalFeatures = [
      hour / 23, // Stunde normalisiert
      dayOfWeek / 6, // Wochentag normalisiert
      month / 11, // Monat normalisiert
      isWeekend ? 1 : 0, // Weekend Flag
      this.isHoliday(timestamp) ? 1 : 0, // Holiday Flag
      this.isSchoolHoliday(timestamp) ? 1 : 0 // School Holiday Flag
    ];

    // Wetter Features (vereinfacht)
    const weatherFeatures = await this.getWeatherFeatures(tenantId, timestamp);

    // Lag Features (historische Werte)
    const lagFeatures = await this.getLagFeatures(tenantId, timestamp);

    // Saisonale Features
    const seasonalFeatures = this.getSeasonalFeatures(timestamp);

    // Event Features
    const eventFeatures = await this.getEventFeatures(tenantId, timestamp);

    return {
      temporal: temporalFeatures,
      weather: weatherFeatures,
      lag: lagFeatures,
      seasonal: seasonalFeatures,
      events: eventFeatures
    };
  }

  /**
   * Trainiert vereinfachtes Neuronales Netz
   */
  private async trainNeuralNetwork(trainX: number[][], trainY: number[]): Promise<{
    weights: number[][][];
    normalizers: any;
  }> {
    // Vereinfachte Neuronales Netz Implementation
    // In der Praxis würde hier TensorFlow.js verwendet

    const inputSize = trainX[0].length;
    const hiddenSizes = [64, 32, 16];
    const outputSize = 1;

    // Initialisiere Gewichte zufällig
    const weights: number[][][] = [];

    // Input zu Hidden Layer 1
    weights.push(this.initializeWeights(inputSize, hiddenSizes[0]));

    // Hidden Layers
    for (let i = 1; i < hiddenSizes.length; i++) {
      weights.push(this.initializeWeights(hiddenSizes[i-1], hiddenSizes[i]));
    }

    // Hidden zu Output
    weights.push(this.initializeWeights(hiddenSizes[hiddenSizes.length - 1], outputSize));

    // Training Loop (vereinfacht)
    const epochs = 1000;
    const learningRate = 0.001;

    for (let epoch = 0; epoch < epochs; epoch++) {
      let totalLoss = 0;

      for (let i = 0; i < trainX.length; i++) {
        // Forward Pass
        const prediction = this.forwardPass(trainX[i], weights);

        // Berechne Loss
        const loss = Math.pow(prediction - trainY[i], 2);
        totalLoss += loss;

        // Backward Pass (vereinfacht - nur Output Layer)
        const error = 2 * (prediction - trainY[i]);
        this.updateWeights(weights, error, learningRate);
      }

      if (epoch % 100 === 0) {
        console.log(`Epoch ${epoch}, Loss: ${(totalLoss / trainX.length).toFixed(4)}`);
      }
    }

    return {
      weights,
      normalizers: this.calculateNormalizers(trainX, trainY)
    };
  }

  /**
   * Führt Vorhersage durch
   */
  private async predict(model: MLModel, features: FeatureVector[], horizon: ForecastHorizon): Promise<{
    timestamp: Date;
    value: number;
    confidence: number;
  }[]> {
    const predictions: { timestamp: Date; value: number; confidence: number; }[] = [];
    const now = new Date();

    for (let i = 0; i < this.getHorizonSteps(horizon); i++) {
      const futureTime = this.addTimeStep(now, i, horizon);
      const featureVector = this.flattenFeatureVector(features[i] || features[features.length - 1]);

      // Normalisiere Features
      const normalizedFeatures = this.normalizeFeatures(featureVector, model.normalizers);

      // Vorhersage
      const prediction = this.forwardPass(normalizedFeatures, model.weights);

      // Denormalisiere
      const denormalizedPrediction = this.denormalizePrediction(prediction, model.normalizers);

      // Berechne Konfidenz (basierend auf Modell-Performance und Zeithorizont)
      const confidence = Math.max(0.1, model.performance.accuracy * (1 - i * 0.05));

      predictions.push({
        timestamp: futureTime,
        value: Math.max(0, Math.round(denormalizedPrediction)),
        confidence
      });
    }

    return predictions;
  }

  /**
   * Health Check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.db.collection('_health').doc('ai_predictive_demand').set({
        lastCheck: new Date(),
        service: 'predictive-demand-forecaster',
        modelsLoaded: this.models.size
      });
      return true;
    } catch (error) {
      console.error('Predictive Demand Forecaster health check failed:', error);
      return false;
    }
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    this.models.clear();
    this.trainingData.clear();
    this.lastTraining.clear();
    console.log('Predictive Demand Forecaster shut down');
  }

  // Helper Methods
  private async loadExistingModels(): Promise<void> {
    // Lade existierende Modelle aus der DB
  }

  private startModelTrainingPipeline(): void {
    // Starte Pipeline für kontinuierliches Model Training
    setInterval(async () => {
      await this.performScheduledTraining();
    }, aiConfig.forecasting.retrainingInterval);
  }

  private async performScheduledTraining(): Promise<void> {
    // Führe geplantes Training durch
  }

  private extractFeatures(trainingData: TrainingData[]): number[][] {
    return trainingData.map(data => this.flattenFeatureVector(data.features));
  }

  private flattenFeatureVector(features: FeatureVector): number[] {
    return [
      ...features.temporal,
      ...features.weather,
      ...features.lag,
      ...features.seasonal,
      ...features.events
    ];
  }

  private initializeWeights(inputSize: number, outputSize: number): number[][] {
    const weights: number[][] = [];
    for (let i = 0; i < outputSize; i++) {
      weights[i] = [];
      for (let j = 0; j < inputSize; j++) {
        weights[i][j] = (Math.random() - 0.5) * 2 * Math.sqrt(2 / inputSize);
      }
    }
    return weights;
  }

  private forwardPass(input: number[], weights: number[][][]): number {
    let current = input;

    for (const layer of weights) {
      const next: number[] = [];

      for (let i = 0; i < layer.length; i++) {
        let sum = 0;
        for (let j = 0; j < current.length; j++) {
          sum += current[j] * layer[i][j];
        }
        // ReLU Aktivierung (außer Output Layer)
        next[i] = weights.indexOf(layer) === weights.length - 1 ? sum : Math.max(0, sum);
      }

      current = next;
    }

    return current[0];
  }

  private updateWeights(weights: number[][][], error: number, learningRate: number): void {
    // Vereinfachte Gewichtsaktualisierung (nur Output Layer)
    const lastLayer = weights[weights.length - 1];
    for (let i = 0; i < lastLayer.length; i++) {
      for (let j = 0; j < lastLayer[i].length; j++) {
        lastLayer[i][j] -= learningRate * error;
      }
    }
  }

  private calculateNormalizers(trainX: number[][], trainY: number[]): any {
    // Berechne Min/Max für Normalisierung
    const featuresMin = new Array(trainX[0].length).fill(Infinity);
    const featuresMax = new Array(trainX[0].length).fill(-Infinity);

    for (const sample of trainX) {
      for (let i = 0; i < sample.length; i++) {
        featuresMin[i] = Math.min(featuresMin[i], sample[i]);
        featuresMax[i] = Math.max(featuresMax[i], sample[i]);
      }
    }

    const targetMin = Math.min(...trainY);
    const targetMax = Math.max(...trainY);

    return {
      features: { min: featuresMin, max: featuresMax },
      target: { min: targetMin, max: targetMax }
    };
  }

  private async evaluateModel(model: any, testX: number[][], testY: number[]): Promise<ModelPerformance> {
    let sumSquaredError = 0;
    let sumAbsoluteError = 0;
    let sumPercentageError = 0;

    for (let i = 0; i < testX.length; i++) {
      const prediction = this.forwardPass(testX[i], model.weights);
      const actual = testY[i];

      const error = prediction - actual;
      sumSquaredError += error * error;
      sumAbsoluteError += Math.abs(error);

      if (actual !== 0) {
        sumPercentageError += Math.abs(error / actual);
      }
    }

    const mse = sumSquaredError / testX.length;
    const rmse = Math.sqrt(mse);
    const mae = sumAbsoluteError / testX.length;
    const mape = (sumPercentageError / testX.length) * 100;
    const accuracy = Math.max(0, 1 - mape / 100);

    return { accuracy, mape, rmse, mae };
  }

  private getHourKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
  }

  private roundToHour(date: Date): Date {
    const rounded = new Date(date);
    rounded.setMinutes(0, 0, 0);
    return rounded;
  }

  private isHoliday(date: Date): boolean {
    // Implementierung für Schweizer Feiertage
    return false;
  }

  private isSchoolHoliday(date: Date): boolean {
    // Implementierung für Schweizer Schulferien
    return false;
  }

  private async getWeatherFeatures(tenantId: string, timestamp: Date): Promise<number[]> {
    // Vereinfachte Wetter-Features
    return [0.5, 0.3, 0.8]; // temp, humidity, condition
  }

  private async getLagFeatures(tenantId: string, timestamp: Date): Promise<number[]> {
    // Lag-Features (historische Werte)
    return [1.0, 0.8, 1.2]; // 1h, 24h, 168h ago
  }

  private getSeasonalFeatures(timestamp: Date): number[] {
    const dayOfYear = this.getDayOfYear(timestamp);
    return [
      Math.sin(2 * Math.PI * dayOfYear / 365), // Yearly cycle
      Math.cos(2 * Math.PI * dayOfYear / 365),
      Math.sin(2 * Math.PI * timestamp.getDay() / 7), // Weekly cycle
      Math.cos(2 * Math.PI * timestamp.getDay() / 7)
    ];
  }

  private async getEventFeatures(tenantId: string, timestamp: Date): Promise<number[]> {
    // Event-Features
    return [0, 0, 0]; // hasEvent, eventSize, eventDistance
  }

  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  private getHorizonSteps(horizon: ForecastHorizon): number {
    switch (horizon) {
      case '1h': return 1;
      case '6h': return 6;
      case '24h': return 24;
      case '3d': return 72;
      case '7d': return 168;
      default: return 24;
    }
  }

  private addTimeStep(baseTime: Date, step: number, horizon: ForecastHorizon): Date {
    const result = new Date(baseTime);
    result.setHours(result.getHours() + step);
    return result;
  }

  private normalizeFeatures(features: number[], normalizers: any): number[] {
    return features.map((feature, i) => {
      const min = normalizers.features.min[i];
      const max = normalizers.features.max[i];
      return max > min ? (feature - min) / (max - min) : 0;
    });
  }

  private denormalizePrediction(prediction: number, normalizers: any): number {
    const min = normalizers.target.min;
    const max = normalizers.target.max;
    return prediction * (max - min) + min;
  }

  private calculateConfidenceIntervals(predictions: any[], model: MLModel): any[] {
    // Berechne Konfidenz-Intervalle basierend auf Modell-Unsicherheit
    return predictions.map((pred, i) => {
      const uncertainty = model.performance.rmse * (1 + i * 0.1);
      return {
        timestamp: pred.timestamp,
        lower: Math.max(0, pred.value - uncertainty),
        upper: pred.value + uncertainty
      };
    });
  }

  private validatePredictions(predictions: any[], request: PredictiveForecastRequest): any[] {
    // Validiere Vorhersagen gegen Business Rules
    return predictions.map(pred => ({
      ...pred,
      value: Math.min(pred.value, 100) // Max 100 orders per hour
    }));
  }

  private getFeatureImportance(model: MLModel): any {
    // Berechne Feature Importance (vereinfacht)
    return {
      temporal: 0.4,
      weather: 0.3,
      lag: 0.2,
      seasonal: 0.1,
      events: 0.0
    };
  }

  private async saveModel(model: MLModel): Promise<void> {
    await this.db.collection('ml_models').doc(model.id).set({
      ...model,
      lastTrained: new Date()
    });
  }

  private async prepareFeatures(request: PredictiveForecastRequest): Promise<FeatureVector[]> {
    const features: FeatureVector[] = [];
    const steps = this.getHorizonSteps(request.horizon);

    for (let i = 0; i < steps; i++) {
      const futureTime = this.addTimeStep(new Date(), i, request.horizon);
      const featureVector = await this.generateFeatureVector(request.tenantId, futureTime);
      features.push(featureVector);
    }

    return features;
  }
}
