/**
 * EATECH - Price AI Modal Component
 * Version: 1.0.0
 * Description: AI-powered price optimization modal with machine learning insights
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /apps/admin/src/components/Products/PriceAIModal.jsx
 */

import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Brain,
  CheckCircle, Info,
  RefreshCw, Settings,
  Target,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAI } from '../../hooks/useAI';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../hooks/useTenant';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import Modal from '../common/Modal';
import styles from './PriceAIModal.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================

const OPTIMIZATION_STAGES = {
  ANALYZING: 'analyzing',
  CALCULATING: 'calculating',
  COMPARING: 'comparing',
  SIMULATING: 'simulating',
  COMPLETE: 'complete'
};

const CONFIDENCE_LEVELS = {
  VERY_HIGH: { min: 0.9, label: 'Sehr hoch', color: '#10B981' },
  HIGH: { min: 0.8, label: 'Hoch', color: '#3B82F6' },
  MEDIUM: { min: 0.7, label: 'Mittel', color: '#F59E0B' },
  LOW: { min: 0, label: 'Niedrig', color: '#EF4444' }
};

const PRICE_STRATEGIES = {
  MAXIMIZE_REVENUE: {
    id: 'maximize_revenue',
    label: 'Umsatz maximieren',
    icon: TrendingUp,
    description: 'Optimiert den Preis für maximalen Umsatz'
  },
  MAXIMIZE_VOLUME: {
    id: 'maximize_volume',
    label: 'Absatz maximieren',
    icon: Users,
    description: 'Niedrigerer Preis für höhere Verkaufszahlen'
  },
  COMPETITIVE: {
    id: 'competitive',
    label: 'Wettbewerbsfähig',
    icon: Target,
    description: 'Ausrichtung an Marktpreisen'
  },
  PREMIUM: {
    id: 'premium',
    label: 'Premium Positionierung',
    icon: Zap,
    description: 'Höherer Preis für Qualitätswahrnehmung'
  }
};

// ============================================================================
// PRICE AI MODAL COMPONENT
// ============================================================================

export const PriceAIModal = ({
  product,
  isOpen,
  onClose,
  onApply,
  initialStrategy = 'maximize_revenue'
}) => {
  // State
  const [optimization, setOptimization] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stage, setStage] = useState(null);
  const [selectedStrategy, setSelectedStrategy] = useState(initialStrategy);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [simulationResults, setSimulationResults] = useState(null);
  const [competitorData, setCompetitorData] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);

  // Advanced settings
  const [advancedSettings, setAdvancedSettings] = useState({
    elasticity: -1.2,
    seasonalFactor: 1.0,
    competitionWeight: 0.5,
    marginTarget: 0.3,
    includePromotions: true,
    timeHorizon: 30 // days
  });

  // Hooks
  const { optimizePrice, forecastDemand, analyzeCompetitors } = useAI();
  const { tenant } = useTenant();
  const { user } = useAuth();

  // ============================================================================
  // OPTIMIZATION PROCESS
  // ============================================================================

  useEffect(() => {
    if (isOpen && product) {
      runOptimization();
    }
  }, [isOpen, product?.id, selectedStrategy]);

  const runOptimization = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Stage 1: Analyzing
      setStage(OPTIMIZATION_STAGES.ANALYZING);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Fetch historical data
      const history = await fetchHistoricalData(product.id);
      setHistoricalData(history);

      // Stage 2: Calculating
      setStage(OPTIMIZATION_STAGES.CALCULATING);
      const result = await optimizePrice({
        productId: product.id,
        currentPrice: product.price,
        strategy: selectedStrategy,
        category: product.category,
        salesHistory: history.sales,
        settings: advancedSettings,
        tenantId: tenant?.id
      });

      // Stage 3: Comparing
      setStage(OPTIMIZATION_STAGES.COMPARING);
      const competitors = await analyzeCompetitors({
        category: product.category,
        productName: product.name,
        location: tenant?.location
      });
      setCompetitorData(competitors);

      // Stage 4: Simulating
      setStage(OPTIMIZATION_STAGES.SIMULATING);
      const simulation = await simulatePriceChange(result, history);
      setSimulationResults(simulation);

      // Stage 5: Complete
      setStage(OPTIMIZATION_STAGES.COMPLETE);
      setOptimization(result);

    } catch (error) {
      console.error('Price optimization failed:', error);
      setError(error.message || 'Optimierung fehlgeschlagen');
      toast.error('Preisoptimierung fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistoricalData = async (productId) => {
    // Mock historical data - in production, fetch from API
    return {
      sales: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000),
        quantity: Math.floor(Math.random() * 50) + 10,
        price: product.price + (Math.random() - 0.5) * 2,
        revenue: 0
      })).map(d => ({ ...d, revenue: d.quantity * d.price })),
      avgDailySales: 25,
      priceChanges: [
        { date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), oldPrice: 14.90, newPrice: 16.90 }
      ]
    };
  };

  const simulatePriceChange = async (optimization, history) => {
    // Simulate impact of price change
    const currentRevenue = history.avgDailySales * product.price;
    const projectedDemand = history.avgDailySales * (1 + optimization.demandChange);
    const projectedRevenue = projectedDemand * optimization.recommendedPrice;

    return {
      currentMetrics: {
        price: product.price,
        dailySales: history.avgDailySales,
        dailyRevenue: currentRevenue,
        margin: (product.price - (product.cost || product.price * 0.3)) / product.price
      },
      projectedMetrics: {
        price: optimization.recommendedPrice,
        dailySales: projectedDemand,
        dailyRevenue: projectedRevenue,
        margin: (optimization.recommendedPrice - (product.cost || product.price * 0.3)) / optimization.recommendedPrice
      },
      impact: {
        salesChange: optimization.demandChange,
        revenueChange: (projectedRevenue - currentRevenue) / currentRevenue,
        marginChange: 0, // Calculate based on cost
        monthlyRevenueImpact: (projectedRevenue - currentRevenue) * 30
      },
      breakEvenDays: Math.ceil(100 / ((projectedRevenue - currentRevenue) || 1))
    };
  };

  // ============================================================================
  // ACTION HANDLERS
  // ============================================================================

  const handleApplyPrice = useCallback(() => {
    if (!optimization) return;

    const priceData = {
      productId: product.id,
      oldPrice: product.price,
      newPrice: optimization.recommendedPrice,
      strategy: selectedStrategy,
      confidence: optimization.confidence,
      expectedImpact: simulationResults?.impact,
      aiRecommendation: optimization,
      appliedBy: user?.uid,
      appliedAt: new Date().toISOString()
    };

    onApply(priceData);

    // Track analytics
    if (window.gtag) {
      window.gtag('event', 'ai_price_applied', {
        product_id: product.id,
        old_price: product.price,
        new_price: optimization.recommendedPrice,
        strategy: selectedStrategy,
        confidence: optimization.confidence,
        expected_revenue_lift: optimization.projectedRevenueLift
      });
    }

    toast.success('Preis wurde aktualisiert');
    onClose();
  }, [optimization, product, selectedStrategy, simulationResults, user, onApply, onClose]);

  const handleStrategyChange = (strategyId) => {
    setSelectedStrategy(strategyId);
    setOptimization(null);
    setSimulationResults(null);
  };

  const handleRefresh = () => {
    runOptimization();
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const getConfidenceLevel = (confidence) => {
    for (const [key, level] of Object.entries(CONFIDENCE_LEVELS)) {
      if (confidence >= level.min) return { key, ...level };
    }
    return { key: 'LOW', ...CONFIDENCE_LEVELS.LOW };
  };

  const renderLoadingStage = () => {
    const stageMessages = {
      [OPTIMIZATION_STAGES.ANALYZING]: 'Analysiere Verkaufsdaten...',
      [OPTIMIZATION_STAGES.CALCULATING]: 'Berechne optimalen Preis...',
      [OPTIMIZATION_STAGES.COMPARING]: 'Vergleiche mit Marktpreisen...',
      [OPTIMIZATION_STAGES.SIMULATING]: 'Simuliere Auswirkungen...',
      [OPTIMIZATION_STAGES.COMPLETE]: 'Optimierung abgeschlossen!'
    };

    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <Brain className={styles.loadingIcon} />
          <h3 className={styles.loadingTitle}>KI-Preisoptimierung läuft</h3>
          <p className={styles.loadingMessage}>{stageMessages[stage] || 'Initialisiere...'}</p>

          <div className={styles.progressSteps}>
            {Object.values(OPTIMIZATION_STAGES).map((s, index) => (
              <div
                key={s}
                className={`${styles.progressStep} ${
                  Object.keys(OPTIMIZATION_STAGES).indexOf(stage) >= index
                    ? styles.active
                    : ''
                }`}
              >
                <div className={styles.stepDot} />
                <span className={styles.stepLabel}>
                  {s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderStrategySelector = () => (
    <div className={styles.strategySection}>
      <h3 className={styles.sectionTitle}>Optimierungsstrategie</h3>
      <div className={styles.strategyGrid}>
        {Object.values(PRICE_STRATEGIES).map(strategy => {
          const Icon = strategy.icon;
          return (
            <button
              key={strategy.id}
              onClick={() => handleStrategyChange(strategy.id)}
              className={`${styles.strategyCard} ${
                selectedStrategy === strategy.id ? styles.selected : ''
              }`}
            >
              <Icon className={styles.strategyIcon} />
              <h4>{strategy.label}</h4>
              <p>{strategy.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderOptimizationResult = () => {
    if (!optimization) return null;

    const confidenceLevel = getConfidenceLevel(optimization.confidence);
    const priceChange = optimization.recommendedPrice - product.price;
    const priceChangePercent = (priceChange / product.price) * 100;

    return (
      <div className={styles.resultSection}>
        <div className={styles.mainResult}>
          <div className={styles.currentPrice}>
            <span className={styles.priceLabel}>Aktueller Preis</span>
            <span className={styles.priceValue}>{formatCurrency(product.price)}</span>
          </div>

          <div className={styles.arrow}>
            {priceChange > 0 ? (
              <ArrowUp className={styles.arrowUp} />
            ) : (
              <ArrowDown className={styles.arrowDown} />
            )}
          </div>

          <div className={styles.recommendedPrice}>
            <span className={styles.priceLabel}>Empfohlener Preis</span>
            <span className={styles.priceValue}>{formatCurrency(optimization.recommendedPrice)}</span>
            <span className={`${styles.priceChange} ${priceChange > 0 ? styles.increase : styles.decrease}`}>
              {priceChange > 0 ? '+' : ''}{formatPercentage(priceChangePercent)}
            </span>
          </div>
        </div>

        <div className={styles.confidence}>
          <div className={styles.confidenceHeader}>
            <span>Konfidenz</span>
            <span style={{ color: confidenceLevel.color }}>
              {confidenceLevel.label}
            </span>
          </div>
          <div className={styles.confidenceBar}>
            <div
              className={styles.confidenceFill}
              style={{
                width: `${optimization.confidence * 100}%`,
                backgroundColor: confidenceLevel.color
              }}
            />
          </div>
          <span className={styles.confidenceValue}>
            {Math.round(optimization.confidence * 100)}%
          </span>
        </div>

        <div className={styles.insights}>
          <h4 className={styles.insightsTitle}>
            <Info className={styles.insightsIcon} />
            KI-Insights
          </h4>
          <ul className={styles.insightsList}>
            {optimization.insights?.map((insight, index) => (
              <li key={index}>{insight}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  const renderImpactSimulation = () => {
    if (!simulationResults) return null;

    const { currentMetrics, projectedMetrics, impact } = simulationResults;

    return (
      <div className={styles.simulationSection}>
        <h3 className={styles.sectionTitle}>
          <BarChart3 className={styles.sectionIcon} />
          Erwartete Auswirkungen
        </h3>

        <div className={styles.metricsComparison}>
          <div className={styles.metricColumn}>
            <h4>Aktuell</h4>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Tägliche Verkäufe</span>
              <span className={styles.metricValue}>{Math.round(currentMetrics.dailySales)}</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Täglicher Umsatz</span>
              <span className={styles.metricValue}>{formatCurrency(currentMetrics.dailyRevenue)}</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Marge</span>
              <span className={styles.metricValue}>{formatPercentage(currentMetrics.margin * 100)}</span>
            </div>
          </div>

          <div className={styles.metricArrow}>→</div>

          <div className={styles.metricColumn}>
            <h4>Projiziert</h4>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Tägliche Verkäufe</span>
              <span className={styles.metricValue}>
                {Math.round(projectedMetrics.dailySales)}
                <span className={`${styles.metricChange} ${impact.salesChange > 0 ? styles.positive : styles.negative}`}>
                  ({impact.salesChange > 0 ? '+' : ''}{formatPercentage(impact.salesChange * 100)})
                </span>
              </span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Täglicher Umsatz</span>
              <span className={styles.metricValue}>
                {formatCurrency(projectedMetrics.dailyRevenue)}
                <span className={`${styles.metricChange} ${impact.revenueChange > 0 ? styles.positive : styles.negative}`}>
                  ({impact.revenueChange > 0 ? '+' : ''}{formatPercentage(impact.revenueChange * 100)})
                </span>
              </span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Marge</span>
              <span className={styles.metricValue}>{formatPercentage(projectedMetrics.margin * 100)}</span>
            </div>
          </div>
        </div>

        <div className={styles.monthlyImpact}>
          <div className={styles.impactCard}>
            <span className={styles.impactLabel}>Monatlicher Umsatz-Impact</span>
            <span className={`${styles.impactValue} ${impact.monthlyRevenueImpact > 0 ? styles.positive : styles.negative}`}>
              {impact.monthlyRevenueImpact > 0 ? '+' : ''}{formatCurrency(impact.monthlyRevenueImpact)}
            </span>
          </div>
          <div className={styles.impactCard}>
            <span className={styles.impactLabel}>Break-Even</span>
            <span className={styles.impactValue}>{simulationResults.breakEvenDays} Tage</span>
          </div>
        </div>
      </div>
    );
  };

  const renderCompetitorAnalysis = () => {
    if (!competitorData || competitorData.length === 0) return null;

    return (
      <div className={styles.competitorSection}>
        <h3 className={styles.sectionTitle}>
          <Target className={styles.sectionIcon} />
          Marktvergleich
        </h3>

        <div className={styles.competitorList}>
          {competitorData.map((competitor, index) => (
            <div key={index} className={styles.competitorCard}>
              <span className={styles.competitorName}>{competitor.name}</span>
              <span className={styles.competitorPrice}>{formatCurrency(competitor.price)}</span>
              <span className={`${styles.competitorDiff} ${
                competitor.price > product.price ? styles.higher : styles.lower
              }`}>
                {competitor.price > product.price ? '+' : ''}{formatPercentage(((competitor.price - product.price) / product.price) * 100)}
              </span>
            </div>
          ))}
        </div>

        <div className={styles.marketPosition}>
          <span>Ihre Position: </span>
          <strong>{optimization?.marketPosition || 'Mittelfeld'}</strong>
        </div>
      </div>
    );
  };

  const renderAdvancedSettings = () => (
    <AnimatePresence>
      {showAdvanced && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className={styles.advancedSection}
        >
          <h3 className={styles.sectionTitle}>
            <Settings className={styles.sectionIcon} />
            Erweiterte Einstellungen
          </h3>

          <div className={styles.settingsGrid}>
            <div className={styles.settingItem}>
              <label>Preiselastizität</label>
              <input
                type="range"
                min="-2"
                max="-0.5"
                step="0.1"
                value={advancedSettings.elasticity}
                onChange={(e) => setAdvancedSettings(prev => ({
                  ...prev,
                  elasticity: parseFloat(e.target.value)
                }))}
              />
              <span>{advancedSettings.elasticity}</span>
            </div>

            <div className={styles.settingItem}>
              <label>Saisonfaktor</label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={advancedSettings.seasonalFactor}
                onChange={(e) => setAdvancedSettings(prev => ({
                  ...prev,
                  seasonalFactor: parseFloat(e.target.value)
                }))}
              />
              <span>{advancedSettings.seasonalFactor}x</span>
            </div>

            <div className={styles.settingItem}>
              <label>Wettbewerbsgewichtung</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={advancedSettings.competitionWeight}
                onChange={(e) => setAdvancedSettings(prev => ({
                  ...prev,
                  competitionWeight: parseFloat(e.target.value)
                }))}
              />
              <span>{Math.round(advancedSettings.competitionWeight * 100)}%</span>
            </div>

            <div className={styles.settingItem}>
              <label>Zeithorizont</label>
              <select
                value={advancedSettings.timeHorizon}
                onChange={(e) => setAdvancedSettings(prev => ({
                  ...prev,
                  timeHorizon: parseInt(e.target.value)
                }))}
              >
                <option value="7">1 Woche</option>
                <option value="30">1 Monat</option>
                <option value="90">3 Monate</option>
              </select>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className={styles.modalHeader}>
          <Brain className={styles.headerIcon} />
          <span>KI-Preisoptimierung für {product?.name}</span>
        </div>
      }
      size="large"
      className={styles.modal}
    >
      <div className={styles.modalContent}>
        {isLoading ? (
          renderLoadingStage()
        ) : error ? (
          <div className={styles.errorContainer}>
            <AlertCircle className={styles.errorIcon} />
            <h3>Optimierung fehlgeschlagen</h3>
            <p>{error}</p>
            <button onClick={handleRefresh} className={styles.retryButton}>
              <RefreshCw className={styles.buttonIcon} />
              Erneut versuchen
            </button>
          </div>
        ) : (
          <>
            {renderStrategySelector()}

            {optimization && (
              <>
                {renderOptimizationResult()}
                {renderImpactSimulation()}
                {renderCompetitorAnalysis()}

                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className={styles.advancedToggle}
                >
                  <Settings className={styles.buttonIcon} />
                  {showAdvanced ? 'Erweiterte Einstellungen ausblenden' : 'Erweiterte Einstellungen'}
                </button>

                {renderAdvancedSettings()}
              </>
            )}
          </>
        )}
      </div>

      <div className={styles.modalFooter}>
        <button onClick={onClose} className={styles.cancelButton}>
          Abbrechen
        </button>

        {optimization && (
          <>
            <button onClick={handleRefresh} className={styles.refreshButton}>
              <RefreshCw className={styles.buttonIcon} />
              Neu berechnen
            </button>

            <button
              onClick={handleApplyPrice}
              className={styles.applyButton}
              disabled={!optimization.recommendedPrice}
            >
              <CheckCircle className={styles.buttonIcon} />
              Preis anwenden ({formatCurrency(optimization.recommendedPrice)})
            </button>
          </>
        )}
      </div>
    </Modal>
  );
};

export default PriceAIModal;
