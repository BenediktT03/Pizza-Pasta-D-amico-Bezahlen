/**
 * EATECH - Trend Analyzer & Forecast Engine
 * Version: 5.0.0
 * Description: Advanced trend analysis and ML-based provision forecasting
 * File Path: /src/modules/master/utils/trendAnalyzer.js
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

// Seasonal factors for Swiss market (foodtruck business)
export const SEASONAL_FACTORS = {
  january: 0.7,     // Cold, after holidays
  february: 0.75,   // Still cold
  march: 0.85,      // Getting warmer
  april: 0.95,      // Spring arrives
  may: 1.1,         // Perfect weather
  june: 1.2,        // Summer begins
  july: 1.3,        // Peak summer
  august: 1.25,     // Still hot, some vacation
  september: 1.15,  // Good weather continues
  october: 0.95,    // Getting colder
  november: 0.8,    // Cold and rainy
  december: 0.9     // Christmas markets help
};

// Day of week factors
export const WEEKDAY_FACTORS = {
  monday: 0.9,
  tuesday: 0.95,
  wednesday: 1.0,
  thursday: 1.05,
  friday: 1.15,
  saturday: 1.2,
  sunday: 0.8
};

// Special events that affect sales
export const SPECIAL_EVENTS = {
  // Swiss national holidays
  'new_year': { factor: 0.5, dates: ['01-01', '01-02'] },
  'berchtoldstag': { factor: 0.6, dates: ['01-02'] },
  'good_friday': { factor: 0.7, dates: ['variable'] },
  'easter_monday': { factor: 0.8, dates: ['variable'] },
  'labor_day': { factor: 1.1, dates: ['05-01'] },
  'ascension': { factor: 0.9, dates: ['variable'] },
  'whit_monday': { factor: 0.9, dates: ['variable'] },
  'national_day': { factor: 1.3, dates: ['08-01'] },
  'christmas': { factor: 0.4, dates: ['12-25', '12-26'] },
  
  // Special events
  'street_parade': { factor: 1.5, dates: ['08-second-saturday'] },
  'fasnacht': { factor: 1.4, dates: ['variable'] },
  'sechselaeuten': { factor: 1.3, dates: ['04-third-monday'] }
};

// Anomaly detection thresholds
export const ANOMALY_THRESHOLDS = {
  severe: 0.5,      // 50% deviation
  warning: 0.3,     // 30% deviation
  minor: 0.15       // 15% deviation
};

// ============================================================================
// MAIN ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Analyze trends and detect anomalies for a tenant
 * @param {Object} tenantData - Historical data for the tenant
 * @returns {Object} Analysis results
 */
export const analyzeTrends = (tenantData) => {
  const { orders, revenue, provisions } = tenantData;
  
  // Calculate moving averages
  const movingAverages = calculateMovingAverages(revenue);
  
  // Detect anomalies
  const anomalies = detectAnomalies(orders, movingAverages);
  
  // Calculate growth rates
  const growthRates = calculateGrowthRates(revenue);
  
  // Identify patterns
  const patterns = identifyPatterns(orders);
  
  // Generate insights
  const insights = generateInsights(tenantData, anomalies, patterns);
  
  return {
    movingAverages,
    anomalies,
    growthRates,
    patterns,
    insights,
    lastAnalyzed: new Date().toISOString()
  };
};

/**
 * Forecast future provisions using advanced algorithms
 * @param {Array} historicalData - Historical provision data
 * @param {Number} daysToForecast - Number of days to forecast
 * @returns {Object} Forecast results
 */
export const forecastProvisions = (historicalData, daysToForecast = 30) => {
  // Prepare data
  const preparedData = prepareTimeSeriesData(historicalData);
  
  // Decompose time series
  const decomposed = decomposeTimeSeries(preparedData);
  
  // Apply multiple forecasting methods
  const forecasts = {
    linear: linearTrendForecast(decomposed, daysToForecast),
    exponential: exponentialSmoothingForecast(preparedData, daysToForecast),
    seasonal: seasonalForecast(decomposed, daysToForecast),
    ensemble: null // Will be calculated from other methods
  };
  
  // Create ensemble forecast (weighted average)
  forecasts.ensemble = createEnsembleForecast(forecasts, {
    linear: 0.2,
    exponential: 0.3,
    seasonal: 0.5
  });
  
  // Calculate confidence intervals
  const confidence = calculateConfidenceIntervals(forecasts.ensemble, preparedData);
  
  return {
    forecasts,
    confidence,
    recommendations: generateForecastRecommendations(forecasts),
    metadata: {
      method: 'Ensemble (Linear + Exponential + Seasonal)',
      accuracy: calculateForecastAccuracy(preparedData),
      generatedAt: new Date().toISOString()
    }
  };
};

// ============================================================================
// ANOMALY DETECTION
// ============================================================================

/**
 * Detect anomalies in order patterns
 */
const detectAnomalies = (orders, movingAverages) => {
  const anomalies = [];
  const { ma7, ma30 } = movingAverages;
  
  orders.forEach((order, index) => {
    if (index < 7) return; // Need enough data for comparison
    
    const expectedValue = ma7[index] || ma30[index];
    const actualValue = order.count;
    const deviation = Math.abs(actualValue - expectedValue) / expectedValue;
    
    if (deviation > ANOMALY_THRESHOLDS.severe) {
      anomalies.push({
        date: order.date,
        type: actualValue < expectedValue ? 'drop' : 'spike',
        severity: 'severe',
        expected: expectedValue,
        actual: actualValue,
        deviation: deviation * 100,
        possibleCauses: identifyAnomalyCauses(order, deviation, actualValue < expectedValue)
      });
    } else if (deviation > ANOMALY_THRESHOLDS.warning) {
      anomalies.push({
        date: order.date,
        type: actualValue < expectedValue ? 'drop' : 'spike',
        severity: 'warning',
        expected: expectedValue,
        actual: actualValue,
        deviation: deviation * 100,
        possibleCauses: identifyAnomalyCauses(order, deviation, actualValue < expectedValue)
      });
    }
  });
  
  return anomalies;
};

/**
 * Identify possible causes for anomalies
 */
const identifyAnomalyCauses = (order, deviation, isDropping) => {
  const causes = [];
  const dayOfWeek = new Date(order.date).getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  if (isDropping) {
    if (deviation > 0.7) {
      causes.push('Möglicher technischer Ausfall');
    }
    if (order.weather && order.weather.condition === 'heavy_rain') {
      causes.push('Schlechtes Wetter');
    }
    if (isWeekend && dayOfWeek === 0) {
      causes.push('Sonntag - reduzierte Aktivität');
    }
    if (order.competitorActivity > 1.5) {
      causes.push('Erhöhte Konkurrenz-Aktivität');
    }
  } else {
    if (order.promotionActive) {
      causes.push('Aktive Promotion/Rabatt');
    }
    if (order.specialEvent) {
      causes.push("Event: ${order.specialEvent}");
    }
    if (isWeekend && dayOfWeek === 6) {
      causes.push('Samstag - Spitzengeschäft');
    }
  }
  
  return causes.length > 0 ? causes : ['Ursache unbekannt - weitere Analyse erforderlich'];
};

// ============================================================================
// TIME SERIES ANALYSIS
// ============================================================================

/**
 * Calculate moving averages
 */
const calculateMovingAverages = (data) => {
  const ma7 = [];
  const ma30 = [];
  
  for (let i = 0; i < data.length; i++) {
    // 7-day moving average
    if (i >= 6) {
      const sum7 = data.slice(i - 6, i + 1).reduce((acc, val) => acc + val.value, 0);
      ma7.push(sum7 / 7);
    } else {
      ma7.push(null);
    }
    
    // 30-day moving average
    if (i >= 29) {
      const sum30 = data.slice(i - 29, i + 1).reduce((acc, val) => acc + val.value, 0);
      ma30.push(sum30 / 30);
    } else {
      ma30.push(null);
    }
  }
  
  return { ma7, ma30 };
};

/**
 * Decompose time series into trend, seasonal, and residual components
 */
const decomposeTimeSeries = (data) => {
  // Simple decomposition using moving averages
  const trend = calculateTrend(data);
  const seasonal = calculateSeasonalComponent(data, trend);
  const residual = calculateResidual(data, trend, seasonal);
  
  return { trend, seasonal, residual };
};

/**
 * Calculate trend component
 */
const calculateTrend = (data) => {
  // Using linear regression for trend
  const n = data.length;
  const sumX = data.reduce((acc, _, i) => acc + i, 0);
  const sumY = data.reduce((acc, val) => acc + val.value, 0);
  const sumXY = data.reduce((acc, val, i) => acc + i * val.value, 0);
  const sumX2 = data.reduce((acc, _, i) => acc + i * i, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return data.map((_, i) => slope * i + intercept);
};

/**
 * Calculate seasonal component
 */
const calculateSeasonalComponent = (data, trend) => {
  const seasonal = [];
  const seasonalIndices = {};
  
  // Group by month
  data.forEach((item, index) => {
    const month = new Date(item.date).getMonth();
    if (!seasonalIndices[month]) {
      seasonalIndices[month] = [];
    }
    seasonalIndices[month].push(item.value / trend[index]);
  });
  
  // Calculate average seasonal index for each month
  const monthlyFactors = {};
  Object.keys(seasonalIndices).forEach(month => {
    monthlyFactors[month] = seasonalIndices[month].reduce((a, b) => a + b, 0) / seasonalIndices[month].length;
  });
  
  // Apply seasonal factors
  data.forEach(item => {
    const month = new Date(item.date).getMonth();
    seasonal.push(monthlyFactors[month] || 1);
  });
  
  return seasonal;
};

/**
 * Calculate residual component
 */
const calculateResidual = (data, trend, seasonal) => {
  return data.map((item, index) => 
    item.value - (trend[index] * seasonal[index])
  );
};
// ============================================================================
// FORECASTING ALGORITHMS
// ============================================================================

/**
 * Linear trend forecast
 */
const linearTrendForecast = (decomposed, days) => {
  const { trend } = decomposed;
  const lastIndex = trend.length - 1;
  const lastValue = trend[lastIndex];
  const slope = trend[lastIndex] - trend[lastIndex - 1];
  
  const forecast = [];
  for (let i = 1; i <= days; i++) {
    forecast.push({
      date: addDays(new Date(), i),
      value: lastValue + (slope * i),
      method: 'linear'
    });
  }
  
  return forecast;
};

/**
 * Exponential smoothing forecast
 */
const exponentialSmoothingForecast = (data, days) => {
  const alpha = 0.3; // Smoothing parameter
  let s = data[0].value;
  
  // Calculate smoothed values
  data.forEach(item => {
    s = alpha * item.value + (1 - alpha) * s;
  });
  
  const forecast = [];
  for (let i = 1; i <= days; i++) {
    forecast.push({
      date: addDays(new Date(), i),
      value: s,
      method: 'exponential'
    });
  }
  
  return forecast;
};

/**
 * Seasonal forecast
 */
const seasonalForecast = (decomposed, days) => {
  const { trend, seasonal } = decomposed;
  const lastTrend = trend[trend.length - 1];
  const trendSlope = (trend[trend.length - 1] - trend[trend.length - 7]) / 7;
  
  const forecast = [];
  for (let i = 1; i <= days; i++) {
    const futureDate = addDays(new Date(), i);
    const month = futureDate.getMonth();
    const dayOfWeek = futureDate.getDay();
    
    // Base trend projection
    let value = lastTrend + (trendSlope * i);
    
    // Apply seasonal factors
    const monthName = Object.keys(SEASONAL_FACTORS)[month];
    value *= SEASONAL_FACTORS[monthName];
    
    // Apply day of week factors
    const dayName = Object.keys(WEEKDAY_FACTORS)[dayOfWeek];
    value *= WEEKDAY_FACTORS[dayName];
    
    forecast.push({
      date: futureDate,
      value,
      method: 'seasonal'
    });
  }
  
  return forecast;
};

/**
 * Create ensemble forecast
 */
const createEnsembleForecast = (forecasts, weights) => {
  const ensemble = [];
  const forecastKeys = Object.keys(forecasts).filter(k => k !== 'ensemble');
  
  // Assuming all forecasts have the same length
  const forecastLength = forecasts[forecastKeys[0]].length;
  
  for (let i = 0; i < forecastLength; i++) {
    let weightedSum = 0;
    let totalWeight = 0;
    
    forecastKeys.forEach(key => {
      if (forecasts[key][i]) {
        weightedSum += forecasts[key][i].value * weights[key];
        totalWeight += weights[key];
      }
    });
    
    ensemble.push({
      date: forecasts[forecastKeys[0]][i].date,
      value: weightedSum / totalWeight,
      method: 'ensemble'
    });
  }
  
  return ensemble;
};

/**
 * Calculate confidence intervals
 */
const calculateConfidenceIntervals = (forecast, historicalData) => {
  // Calculate standard deviation of historical data
  const values = historicalData.map(d => d.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
  
  // Apply confidence intervals (95% = 1.96 * stdDev)
  return forecast.map((point, index) => ({
    date: point.date,
    value: point.value,
    lower: point.value - (1.96 * stdDev * Math.sqrt(1 + index / 30)), // Wider intervals for future
    upper: point.value + (1.96 * stdDev * Math.sqrt(1 + index / 30))
  }));
};

// ============================================================================
// PATTERN RECOGNITION
// ============================================================================

/**
 * Identify patterns in order data
 */
const identifyPatterns = (orders) => {
  const patterns = {
    weekly: analyzeWeeklyPattern(orders),
    monthly: analyzeMonthlyPattern(orders),
    growth: analyzeGrowthPattern(orders),
    seasonal: analyzeSeasonalPattern(orders)
  };
  
  return patterns;
};

/**
 * Analyze weekly patterns
 */
const analyzeWeeklyPattern = (orders) => {
  const weekdayAverages = {};
  const weekdayCounts = {};
  
  orders.forEach(order => {
    const dayOfWeek = new Date(order.date).getDay();
    if (!weekdayAverages[dayOfWeek]) {
      weekdayAverages[dayOfWeek] = 0;
      weekdayCounts[dayOfWeek] = 0;
    }
    weekdayAverages[dayOfWeek] += order.count;
    weekdayCounts[dayOfWeek]++;
  });
  
  // Calculate averages
  Object.keys(weekdayAverages).forEach(day => {
    weekdayAverages[day] /= weekdayCounts[day];
  });
  
  // Find peak and low days
  const days = Object.entries(weekdayAverages);
  const peakDay = days.reduce((a, b) => a[1] > b[1] ? a : b);
  const lowDay = days.reduce((a, b) => a[1] < b[1] ? a : b);
  
  return {
    averages: weekdayAverages,
    peakDay: getDayName(parseInt(peakDay[0])),
    lowDay: getDayName(parseInt(lowDay[0])),
    variation: (peakDay[1] - lowDay[1]) / lowDay[1] * 100
  };
};

/**
 * Analyze monthly patterns
 */
const analyzeMonthlyPattern = (orders) => {
  const monthlyTotals = {};
  
  orders.forEach(order => {
    const month = new Date(order.date).getMonth();
    if (!monthlyTotals[month]) {
      monthlyTotals[month] = 0;
    }
    monthlyTotals[month] += order.count;
  });
  
  return monthlyTotals;
};

/**
 * Analyze growth pattern
 */
const analyzeGrowthPattern = (orders) => {
  if (orders.length < 60) return null; // Need at least 2 months
  
  const firstMonth = orders.slice(0, 30).reduce((sum, o) => sum + o.count, 0);
  const lastMonth = orders.slice(-30).reduce((sum, o) => sum + o.count, 0);
  
  const growthRate = ((lastMonth - firstMonth) / firstMonth) * 100;
  
  return {
    firstMonth,
    lastMonth,
    growthRate,
    trend: growthRate > 5 ? 'growing' : growthRate < -5 ? 'declining' : 'stable'
  };
};

/**
 * Analyze seasonal pattern
 */
const analyzeSeasonalPattern = (orders) => {
  // Group by season
  const seasons = {
    winter: [], // Dec, Jan, Feb
    spring: [], // Mar, Apr, May
    summer: [], // Jun, Jul, Aug
    autumn: []  // Sep, Oct, Nov
  };
  
  orders.forEach(order => {
    const month = new Date(order.date).getMonth();
    if ([11, 0, 1].includes(month)) seasons.winter.push(order.count);
    else if ([2, 3, 4].includes(month)) seasons.spring.push(order.count);
    else if ([5, 6, 7].includes(month)) seasons.summer.push(order.count);
    else seasons.autumn.push(order.count);
  });
  
  // Calculate averages
  const seasonAverages = {};
  Object.keys(seasons).forEach(season => {
    if (seasons[season].length > 0) {
      seasonAverages[season] = seasons[season].reduce((a, b) => a + b, 0) / seasons[season].length;
    }
  });
  
  return seasonAverages;
};

// ============================================================================
// GROWTH RATE CALCULATIONS
// ============================================================================

/**
 * Calculate various growth rates
 */
const calculateGrowthRates = (revenue) => {
  const rates = {
    daily: [],
    weekly: [],
    monthly: [],
    quarterly: []
  };
  
  // Daily growth
  for (let i = 1; i < revenue.length; i++) {
    const growth = ((revenue[i].value - revenue[i-1].value) / revenue[i-1].value) * 100;
    rates.daily.push({
      date: revenue[i].date,
      rate: growth
    });
  }
  
  // Weekly growth (compare to same day last week)
  for (let i = 7; i < revenue.length; i++) {
    const growth = ((revenue[i].value - revenue[i-7].value) / revenue[i-7].value) * 100;
    rates.weekly.push({
      date: revenue[i].date,
      rate: growth
    });
  }
  
  // Monthly growth
  for (let i = 30; i < revenue.length; i++) {
    const growth = ((revenue[i].value - revenue[i-30].value) / revenue[i-30].value) * 100;
    rates.monthly.push({
      date: revenue[i].date,
      rate: growth
    });
  }
  
  return rates;
};

// ============================================================================
// INSIGHT GENERATION
// ============================================================================

/**
 * Generate actionable insights from analysis
 */
const generateInsights = (data, anomalies, patterns) => {
  const insights = [];
  
  // Anomaly insights
  if (anomalies.length > 0) {
    const severeAnomalies = anomalies.filter(a => a.severity === 'severe');
    if (severeAnomalies.length > 0) {
      insights.push({
        type: 'critical',
        category: 'anomaly',
        title: 'Kritische Anomalien erkannt',
        description: "${severeAnomalies.length} schwerwiegende Abweichungen in den letzten 30 Tagen",
        action: 'Sofortige Überprüfung erforderlich',
        priority: 1
      });
    }
  }
  
  // Pattern insights
  if (patterns.weekly && patterns.weekly.variation > 50) {
    insights.push({
      type: 'opportunity',
      category: 'pattern',
      title: 'Starke Wochentags-Schwankungen',
      description: "${patterns.weekly.variation.toFixed(0)}% Unterschied zwischen Spitzen- und Schwachtagen",
      action: 'Promo-Aktionen für schwache Tage empfehlen',
      priority: 2
    });
  }
  
  if (patterns.growth && patterns.growth.trend === 'declining') {
    insights.push({
      type: 'warning',
      category: 'trend',
      title: 'Rückläufiger Trend',
      description: "${Math.abs(patterns.growth.growthRate).toFixed(1)}% Rückgang im Vergleich zum Vormonat",
      action: 'Marketing-Strategie überprüfen',
      priority: 1
    });
  }
  
  // Seasonal insights
  const currentMonth = new Date().getMonth();
  const currentSeasonFactor = Object.values(SEASONAL_FACTORS)[currentMonth];
  const nextMonthFactor = Object.values(SEASONAL_FACTORS)[(currentMonth + 1) % 12];
  
  if (nextMonthFactor > currentSeasonFactor * 1.1) {
    insights.push({
      type: 'info',
      category: 'seasonal',
      title: 'Saisonaler Aufschwung erwartet',
      description: "Nächster Monat zeigt historisch ${((nextMonthFactor / currentSeasonFactor - 1) * 100).toFixed(0)}% höhere Umsätze",
      action: 'Lagerbestände aufstocken',
      priority: 3
    });
  }
  
  return insights.sort((a, b) => a.priority - b.priority);
};

// ============================================================================
// FORECAST RECOMMENDATIONS
// ============================================================================

/**
 * Generate recommendations based on forecast
 */
const generateForecastRecommendations = (forecasts) => {
  const recommendations = [];
  const ensemble = forecasts.ensemble;
  
  if (!ensemble || ensemble.length === 0) return recommendations;
  
  // Calculate expected growth
  const currentValue = ensemble[0].value;
  const futureValue = ensemble[ensemble.length - 1].value;
  const growthPercent = ((futureValue - currentValue) / currentValue) * 100;
  
  if (growthPercent > 20) {
    recommendations.push({
      type: 'prepare',
      message: "Erwartetes Wachstum von ${growthPercent.toFixed(1)}% - Kapazitäten prüfen",
      action: 'Zusätzliche Foodtrucks oder Personal einplanen'
    });
  }
  
  if (growthPercent < -10) {
    recommendations.push({
      type: 'action',
      message: "Rückgang von ${Math.abs(growthPercent).toFixed(1)}% prognostiziert",
      action: 'Proaktive Massnahmen zur Umsatzsteigerung einleiten'
    });
  }
  
  // Check for high-revenue days in forecast
  const highRevenueDays = ensemble.filter(day => day.value > currentValue * 1.3);
  if (highRevenueDays.length > 0) {
    recommendations.push({
      type: 'opportunity',
      message: "${highRevenueDays.length} Tage mit Spitzenumsatz erwartet",
      action: 'Sicherstellen dass genügend Inventory vorhanden ist'
    });
  }
  
  return recommendations;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Add days to a date
 */
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Get day name
 */
const getDayName = (dayIndex) => {
  const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  return days[dayIndex];
};

/**
 * Prepare time series data
 */
const prepareTimeSeriesData = (rawData) => {
  return rawData.map((item, index) => ({
    date: item.date,
    value: item.value,
    index: index
  }));
};

/**
 * Calculate forecast accuracy (for backtesting)
 */
const calculateForecastAccuracy = (historicalData) => {
  // Simple MAPE calculation if we have enough data
  if (historicalData.length < 60) {
    return { mape: null, accuracy: null };
  }
  
  // Use last 30 days for testing
  const testData = historicalData.slice(-30);
  const trainData = historicalData.slice(0, -30);
  
  // Generate forecast on training data
  const testForecast = forecastProvisions(trainData, 30);
  
  // Calculate MAPE
  let totalError = 0;
  testData.forEach((actual, index) => {
    const predicted = testForecast.forecasts.ensemble[index].value;
    totalError += Math.abs((actual.value - predicted) / actual.value);
  });
  
  const mape = (totalError / testData.length) * 100;
  const accuracy = 100 - mape;
  
  return { mape, accuracy };
};

// ============================================================================
// MOCK DATA GENERATOR
// ============================================================================

/**
 * Generate mock historical data for testing
 */
export const generateMockHistoricalData = (days = 180) => {
  const data = [];
  const baseValue = 5000; // Base daily provision
  let currentValue = baseValue;
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - i));
    
    // Apply patterns
    const dayOfWeek = date.getDay();
    const month = date.getMonth();
    
    // Base value with trend
    currentValue = baseValue * (1 + (i / days) * 0.3); // 30% growth over period
    
    // Apply seasonal factor
    const monthName = Object.keys(SEASONAL_FACTORS)[month];
    currentValue *= SEASONAL_FACTORS[monthName];
    
    // Apply day of week factor
    const dayName = Object.keys(WEEKDAY_FACTORS)[dayOfWeek];
    currentValue *= WEEKDAY_FACTORS[dayName];
    
    // Add random variation
    currentValue *= (0.9 + Math.random() * 0.2); // ±10% random
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(currentValue),
      orders: Math.round(currentValue / 50), // Assume CHF 50 per order
      count: Math.round(currentValue / 50)
    });
  }
  
  return data;
};
