/**
 * EATECH - Provisions Forecast Component
 * Version: 5.0.0
 * Description: ML-based provision forecast visualization with confidence intervals
 * File Path: /src/modules/master/components/ProvisionsForecast.jsx
 */

import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Info,
  Download,
  RefreshCw
} from 'lucide-react';
import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import styles from './ProvisionsForecast.module.css';

// ============================================================================
// COMPONENT
// ============================================================================
const ProvisionsForecast = ({ forecast, provisions, onRefresh }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [showConfidence, setShowConfidence] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState('ensemble');
  
  // Prepare chart data
  const chartData = useMemo(() => {
    if (!forecast || !provisions) return [];
    
    const data = [];
    const today = new Date();
    
    // Add historical data (last 30 days)
    if (provisions.history) {
      provisions.history.slice(-30).forEach((item, index) => {
        data.push({
          date: new Date(item.date).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' }),
          actual: item.value,
          isHistorical: true,
          dayIndex: index - 30
        });
      });
    }
    
    // Add forecast data
    const forecastData = forecast.forecasts[selectedMethod] || [];
    const confidenceData = forecast.confidence || [];
    
    forecastData.slice(0, parseInt(selectedPeriod)).forEach((item, index) => {
      const confidence = confidenceData[index];
      data.push({
        date: new Date(item.date).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' }),
        forecast: item.value,
        lower: confidence?.lower,
        upper: confidence?.upper,
        isHistorical: false,
        dayIndex: index + 1
      });
    });
    
    return data;
  }, [forecast, provisions, selectedPeriod, selectedMethod]);
  
  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!forecast || !chartData.length) return null;
    
    const forecastValues = chartData.filter(d => !d.isHistorical).map(d => d.forecast || 0);
    const historicalValues = chartData.filter(d => d.isHistorical).map(d => d.actual || 0);
    
    const avgForecast = forecastValues.reduce((a, b) => a + b, 0) / forecastValues.length;
    const avgHistorical = historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length;
    const totalForecast = forecastValues.reduce((a, b) => a + b, 0);
    const growth = ((avgForecast - avgHistorical) / avgHistorical) * 100;
    
    return {
      avgForecast,
      avgHistorical,
      totalForecast,
      growth,
      accuracy: forecast.metadata?.accuracy
    };
  }, [forecast, chartData]);
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    
    const data = payload[0].payload;
    
    return (
      <div className={styles.tooltip}>
        <p className={styles.tooltipDate}>{label}</p>
        {data.actual !== undefined && (
          <p className={styles.tooltipValue}>
            <span>Tatsächlich:</span>
            <strong>CHF {data.actual.toFixed(2)}</strong>
          </p>
        )}
        {data.forecast !== undefined && (
          <>
            <p className={styles.tooltipValue}>
              <span>Prognose:</span>
              <strong>CHF {data.forecast.toFixed(2)}</strong>
            </p>
            {showConfidence && data.lower !== undefined && (
              <p className={styles.tooltipConfidence}>
                <span>95% Konfidenz:</span>
                <span>CHF {data.lower.toFixed(2)} - {data.upper.toFixed(2)}</span>
              </p>
            )}
          </>
        )}
      </div>
    );
  };
  
  // Render method selector
  const renderMethodSelector = () => (
    <div className={styles.methodSelector}>
      <label>Prognose-Methode:</label>
      <select 
        value={selectedMethod}
        onChange={(e) => setSelectedMethod(e.target.value)}
        className={styles.select}
      >
        <option value="ensemble">Ensemble (Empfohlen)</option>
        <option value="linear">Linear Trend</option>
        <option value="exponential">Exponential Smoothing</option>
        <option value="seasonal">Saisonal</option>
      </select>
    </div>
  );
  
  // Render recommendations
  const renderRecommendations = () => {
    if (!forecast || !forecast.recommendations) return null;
    
    return (
      <div className={styles.recommendations}>
        <h4>Empfehlungen basierend auf Prognose</h4>
        {forecast.recommendations.map((rec, index) => (
          <div key={index} className={[styles.recommendation, styles[rec.type]].join(' ')}>
            <div className={styles.recIcon}>
              {rec.type === 'prepare' ? <TrendingUp /> : <Info />}
            </div>
            <div className={styles.recContent}>
              <p className={styles.recMessage}>{rec.message}</p>
              <p className={styles.recAction}>{rec.action}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h3>Provisions-Prognose</h3>
          <p className={styles.subtitle}>ML-basierte Vorhersage der erwarteten Provisionen</p>
        </div>
        <div className={styles.actions}>
          <button 
            onClick={onRefresh}
            className={styles.refreshButton}
            title="Prognose aktualisieren"
          >
            <RefreshCw size={18} />
          </button>
          <button 
            className={styles.downloadButton}
            title="Export als CSV"
          >
            <Download size={18} />
          </button>
        </div>
      </div>
      
      <div className={styles.controls}>
        <div className={styles.periodSelector}>
          <label>Prognosezeitraum:</label>
          <div className={styles.periodButtons}>
            {['7', '14', '30'].map(days => (
              <button
                key={days}
                className={[styles.periodButton, selectedPeriod === days ? styles.active : ''].join(' ')}
                onClick={() => setSelectedPeriod(days)}
              >
                {days} Tage
              </button>
            ))}
          </div>
        </div>
        
        {renderMethodSelector()}
        
        <label className={styles.confidenceToggle}>
          <input
            type="checkbox"
            checked={showConfidence}
            onChange={(e) => setShowConfidence(e.target.checked)}
          />
          <span>Konfidenzintervall anzeigen</span>
        </label>
      </div>
      
      {summaryStats && (
        <div className={styles.summary}>
          <div className={styles.summaryItem}>
            <DollarSign className={styles.summaryIcon} />
            <div>
              <span className={styles.summaryLabel}>Ø Prognose/Tag</span>
              <span className={styles.summaryValue}>
                CHF {summaryStats.avgForecast.toFixed(2)}
              </span>
            </div>
          </div>
          <div className={styles.summaryItem}>
            <TrendingUp className={styles.summaryIcon} />
            <div>
              <span className={styles.summaryLabel}>Erwartetes Wachstum</span>
              <span className={[styles.summaryValue, summaryStats.growth > 0 ? styles.positive : styles.negative].join(' ')}>
                {summaryStats.growth > 0 ? '+' : ''}{summaryStats.growth.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className={styles.summaryItem}>
            <Calendar className={styles.summaryIcon} />
            <div>
              <span className={styles.summaryLabel}>Total {selectedPeriod} Tage</span>
              <span className={styles.summaryValue}>
                CHF {summaryStats.totalForecast.toFixed(2)}
              </span>
            </div>
          </div>
          {summaryStats.accuracy && (
            <div className={styles.summaryItem}>
              <Info className={styles.summaryIcon} />
              <div>
                <span className={styles.summaryLabel}>Modell-Genauigkeit</span>
                <span className={styles.summaryValue}>
                  {summaryStats.accuracy.toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              label={{ 
                value: 'Provisionen (CHF)', 
                angle: -90, 
                position: 'insideLeft',
                style: { fontSize: 14 }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Today marker */}
            <ReferenceLine 
              x={chartData.find(d => d.dayIndex === 0)?.date}
              stroke="#666"
              strokeDasharray="5 5"
              label={{ value: "Heute", position: "top" }}
            />
            
            {/* Confidence interval */}
            {showConfidence && (
              <Area
                dataKey="upper"
                stackId="1"
                stroke="none"
                fill="#ff6b6b"
                fillOpacity={0.1}
                name="Obere Grenze"
              />
            )}
            {showConfidence && (
              <Area
                dataKey="lower"
                stackId="1"
                stroke="none"
                fill="#fff"
                fillOpacity={1}
                name="Untere Grenze"
              />
            )}
            
            {/* Historical line */}
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#333"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Tatsächliche Provisionen"
              connectNulls={false}
            />
            
            {/* Forecast line */}
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="#ff6b6b"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3 }}
              name="Prognose"
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {renderRecommendations()}
    </div>
  );
};

// ============================================================================
// PROP TYPES
// ============================================================================
ProvisionsForecast.propTypes = {
  forecast: PropTypes.shape({
    forecasts: PropTypes.object.isRequired,
    confidence: PropTypes.array,
    recommendations: PropTypes.array,
    metadata: PropTypes.object
  }),
  provisions: PropTypes.shape({
    history: PropTypes.array
  }),
  onRefresh: PropTypes.func
};

ProvisionsForecast.defaultProps = {
  onRefresh: () => {}
};

// ============================================================================
// EXPORT
// ============================================================================
export default React.memo(ProvisionsForecast);
