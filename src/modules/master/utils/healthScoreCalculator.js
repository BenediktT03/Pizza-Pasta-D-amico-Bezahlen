/**
 * EATECH - Health Score Calculator
 * Version: 5.0.0
 * Description: Calculates tenant health score based on multiple weighted factors
 * File Path: /src/modules/master/utils/healthScoreCalculator.js
 */

// ============================================================================
// CONSTANTS
// ============================================================================

// Weight distribution for health score factors
export const HEALTH_WEIGHTS = {
  paymentSuccess: 0.35,    // 35% - Most critical for revenue
  orderFrequency: 0.30,    // 30% - Main business indicator
  customerSatisfaction: 0.20, // 20% - Long-term success
  technicalIssues: 0.15    // 15% - Usually temporary
};

// Thresholds for different metrics
export const THRESHOLDS = {
  paymentSuccess: {
    excellent: 0.98,    // 98%+ success rate
    good: 0.95,         // 95%+ success rate
    fair: 0.90,         // 90%+ success rate
    poor: 0.85          // Below 85% is critical
  },
  orderFrequency: {
    // Orders per day relative to average
    excellent: 1.2,     // 20% above average
    good: 1.0,          // At average
    fair: 0.8,          // 20% below average
    poor: 0.6           // 40% below average
  },
  customerSatisfaction: {
    excellent: 4.5,     // 4.5+ stars
    good: 4.0,          // 4.0+ stars
    fair: 3.5,          // 3.5+ stars
    poor: 3.0           // Below 3.0 is critical
  },
  technicalIssues: {
    // Issues per 100 orders (inverted - lower is better)
    excellent: 0.5,     // Less than 0.5%
    good: 1.0,          // Less than 1%
    fair: 2.0,          // Less than 2%
    poor: 5.0           // More than 5% is critical
  }
};

// Score ranges for categorization
export const SCORE_CATEGORIES = {
  excellent: { min: 85, color: '#4caf50', label: 'Exzellent', emoji: '🚀' },
  good: { min: 70, color: '#8bc34a', label: 'Gut', emoji: '✅' },
  fair: { min: 50, color: '#ff9800', label: 'Befriedigend', emoji: '⚠️' },
  poor: { min: 0, color: '#f44336', label: 'Kritisch', emoji: '🚨' }
};

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

/**
 * Calculate overall health score for a tenant
 * @param {Object} metrics - Tenant metrics
 * @returns {Object} Health score details
 */
export const calculateHealthScore = (metrics) => {
  const scores = {
    paymentSuccess: calculatePaymentScore(metrics.paymentSuccess),
    orderFrequency: calculateOrderFrequencyScore(metrics.orderFrequency),
    customerSatisfaction: calculateSatisfactionScore(metrics.customerSatisfaction),
    technicalIssues: calculateTechnicalScore(metrics.technicalIssues)
  };

  // Calculate weighted total
  const totalScore = Math.round(
    scores.paymentSuccess * HEALTH_WEIGHTS.paymentSuccess +
    scores.orderFrequency * HEALTH_WEIGHTS.orderFrequency +
    scores.customerSatisfaction * HEALTH_WEIGHTS.customerSatisfaction +
    scores.technicalIssues * HEALTH_WEIGHTS.technicalIssues
  );

  // Get category
  const category = getScoreCategory(totalScore);

  // Identify critical issues
  const issues = identifyIssues(scores, metrics);

  // Generate recommendations
  const recommendations = generateRecommendations(scores, metrics);

  return {
    totalScore,
    scores,
    category,
    issues,
    recommendations,
    trend: calculateTrend(metrics.history || []),
    lastUpdated: new Date().toISOString()
  };
};

// ============================================================================
// INDIVIDUAL SCORE CALCULATORS
// ============================================================================

/**
 * Calculate payment success score
 */
const calculatePaymentScore = (successRate) => {
  const { excellent, good, fair, poor } = THRESHOLDS.paymentSuccess;
  
  if (successRate >= excellent) return 100;
  if (successRate >= good) return linearScale(successRate, good, excellent, 80, 100);
  if (successRate >= fair) return linearScale(successRate, fair, good, 60, 80);
  if (successRate >= poor) return linearScale(successRate, poor, fair, 40, 60);
  return linearScale(successRate, 0, poor, 0, 40);
};

/**
 * Calculate order frequency score
 */
const calculateOrderFrequencyScore = (relativeFrequency) => {
  const { excellent, good, fair, poor } = THRESHOLDS.orderFrequency;
  
  if (relativeFrequency >= excellent) return 100;
  if (relativeFrequency >= good) return linearScale(relativeFrequency, good, excellent, 80, 100);
  if (relativeFrequency >= fair) return linearScale(relativeFrequency, fair, good, 60, 80);
  if (relativeFrequency >= poor) return linearScale(relativeFrequency, poor, fair, 40, 60);
  return linearScale(relativeFrequency, 0, poor, 0, 40);
};

/**
 * Calculate customer satisfaction score
 */
const calculateSatisfactionScore = (rating) => {
  const { excellent, good, fair, poor } = THRESHOLDS.customerSatisfaction;
  
  if (rating >= excellent) return 100;
  if (rating >= good) return linearScale(rating, good, excellent, 80, 100);
  if (rating >= fair) return linearScale(rating, fair, good, 60, 80);
  if (rating >= poor) return linearScale(rating, poor, fair, 40, 60);
  return linearScale(rating, 0, poor, 0, 40);
};

/**
 * Calculate technical issues score (inverted - lower is better)
 */
const calculateTechnicalScore = (issueRate) => {
  const { excellent, good, fair, poor } = THRESHOLDS.technicalIssues;
  
  if (issueRate <= excellent) return 100;
  if (issueRate <= good) return linearScale(issueRate, excellent, good, 100, 80);
  if (issueRate <= fair) return linearScale(issueRate, good, fair, 80, 60);
  if (issueRate <= poor) return linearScale(issueRate, fair, poor, 60, 40);
  return linearScale(issueRate, poor, 10, 40, 0);
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Linear scale between two ranges
 */
const linearScale = (value, inMin, inMax, outMin, outMax) => {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
};

/**
 * Get score category
 */
const getScoreCategory = (score) => {
  for (const [key, category] of Object.entries(SCORE_CATEGORIES)) {
    if (score >= category.min) {
      return { key, ...category };
    }
  }
  return { key: 'poor', ...SCORE_CATEGORIES.poor };
};

/**
 * Identify critical issues
 */
const identifyIssues = (scores, metrics) => {
  const issues = [];

  // Check each metric
  if (scores.paymentSuccess < 60) {
    issues.push({
      type: 'payment',
      severity: 'critical',
      message: "Zahlungserfolg nur ${(metrics.paymentSuccess * 100).toFixed(1)}%",
      impact: 'high'
    });
  }

  if (scores.orderFrequency < 60) {
    issues.push({
      type: 'orders',
      severity: scores.orderFrequency < 40 ? 'critical' : 'warning',
      message: "Bestellfrequenz ${((1 - metrics.orderFrequency) * 100).toFixed(0)}% unter Durchschnitt",
      impact: 'high'
    });
  }

  if (scores.customerSatisfaction < 60) {
    issues.push({
      type: 'satisfaction',
      severity: scores.customerSatisfaction < 40 ? 'critical' : 'warning',
      message: "Kundenbewertung nur ${metrics.customerSatisfaction.toFixed(1)} Sterne",
      impact: 'medium'
    });
  }

  if (scores.technicalIssues < 60) {
    issues.push({
      type: 'technical',
      severity: 'warning',
      message: "${metrics.technicalIssues.toFixed(1)}% technische Probleme",
      impact: 'low'
    });
  }

  return issues.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
};

/**
 * Generate recommendations based on scores
 */
const generateRecommendations = (scores, metrics) => {
  const recommendations = [];

  if (scores.paymentSuccess < 80) {
    recommendations.push({
      priority: 'high',
      action: 'Payment-System überprüfen',
      description: 'Kontaktieren Sie den Tenant bezüglich Zahlungsproblemen',
      estimatedImpact: '+5-10% Umsatz'
    });
  }

  if (scores.orderFrequency < 70) {
    recommendations.push({
      priority: 'high',
      action: 'Marketing-Kampagne starten',
      description: 'Empfehlen Sie dem Tenant Promotions oder Rabatte',
      estimatedImpact: '+15-20% Bestellungen'
    });
  }

  if (scores.customerSatisfaction < 70) {
    recommendations.push({
      priority: 'medium',
      action: 'Qualitätskontrolle durchführen',
      description: 'Review der negativen Bewertungen und Feedback-Session',
      estimatedImpact: '+0.5 Sterne Rating'
    });
  }

  if (scores.technicalIssues < 70) {
    recommendations.push({
      priority: 'medium',
      action: 'Technischen Support anbieten',
      description: 'Proaktive Unterstützung bei App-Problemen',
      estimatedImpact: '-50% Support-Tickets'
    });
  }

  return recommendations;
};

/**
 * Calculate trend from historical data
 */
const calculateTrend = (history) => {
  if (!history || history.length < 2) {
    return { direction: 'stable', change: 0 };
  }

  const recent = history.slice(-7); // Last 7 days
  const older = history.slice(-14, -7); // Previous 7 days

  const recentAvg = recent.reduce((sum, h) => sum + h.score, 0) / recent.length;
  const olderAvg = older.reduce((sum, h) => sum + h.score, 0) / older.length;

  const change = recentAvg - olderAvg;
  const changePercent = (change / olderAvg) * 100;

  return {
    direction: change > 2 ? 'up' : change < -2 ? 'down' : 'stable',
    change: changePercent,
    recentAvg,
    olderAvg
  };
};

// ============================================================================
// BATCH CALCULATION
// ============================================================================

/**
 * Calculate health scores for multiple tenants
 */
export const calculateBatchHealthScores = (tenants) => {
  return tenants.map(tenant => ({
    tenantId: tenant.id,
    tenantName: tenant.name,
    ...calculateHealthScore(tenant.metrics)
  }));
};

// ============================================================================
// MOCK DATA GENERATOR (for testing)
// ============================================================================

/**
 * Generate mock metrics for testing
 */
export const generateMockMetrics = () => {
  return {
    paymentSuccess: 0.9 + Math.random() * 0.09, // 90-99%
    orderFrequency: 0.7 + Math.random() * 0.6, // 0.7-1.3x average
    customerSatisfaction: 3.5 + Math.random() * 1.4, // 3.5-4.9 stars
    technicalIssues: Math.random() * 3, // 0-3%
    history: Array.from({ length: 14 }, (_, i) => ({
      date: new Date(Date.now() - (14 - i) * 24 * 60 * 60 * 1000),
      score: 60 + Math.random() * 30
    }))
  };
};
