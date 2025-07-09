// apps/admin/src/hooks/useAI.js
// AI Services Hook for Admin App
// Version: 1.0.0

import { useState, useCallback, useRef } from 'react';
import { db } from '@/services/firebase/firebaseConfig';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore';

// OpenAI Configuration
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export const useAI = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  // Price Optimization
  const optimizePrice = useCallback(async (productData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Get historical data
      const historicalData = await getHistoricalData(productData.productId, productData.tenantId);

      // Get competitor prices
      const competitorData = await getCompetitorPrices(productData.category, productData.location);

      // Get market trends
      const marketTrends = await getMarketTrends(productData.category);

      // Prepare context for AI
      const context = {
        product: {
          name: productData.productName,
          currentPrice: productData.currentPrice,
          cost: productData.cost,
          category: productData.category,
          margin: ((productData.currentPrice - productData.cost) / productData.currentPrice) * 100
        },
        historical: {
          avgDailySales: historicalData.avgDailySales,
          priceHistory: historicalData.priceHistory,
          demandPattern: historicalData.demandPattern,
          seasonality: historicalData.seasonality
        },
        market: {
          competitorPrices: competitorData,
          marketTrends: marketTrends,
          priceRange: {
            min: Math.min(...competitorData.map(c => c.price)),
            max: Math.max(...competitorData.map(c => c.price)),
            avg: competitorData.reduce((sum, c) => sum + c.price, 0) / competitorData.length
          }
        },
        constraints: {
          minPrice: productData.minPrice,
          maxPrice: productData.maxPrice,
          targetMargin: productData.targetMargin
        }
      };

      // Call OpenAI API
      const optimization = await callOpenAI('price-optimization', context);

      // Save optimization result
      await saveOptimizationResult(productData.productId, optimization);

      return optimization;
    } catch (err) {
      console.error('Price optimization failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Demand Forecasting
  const forecastDemand = useCallback(async (params) => {
    setIsLoading(true);
    setError(null);

    try {
      const context = {
        product: params.product,
        timeframe: params.timeframe,
        historicalSales: params.historicalSales,
        factors: {
          weather: params.weather,
          events: params.events,
          holidays: params.holidays,
          dayOfWeek: params.dayOfWeek,
          season: params.season
        }
      };

      const forecast = await callOpenAI('demand-forecast', context);

      return {
        ...forecast,
        confidence: calculateConfidence(forecast, params.historicalSales)
      };
    } catch (err) {
      console.error('Demand forecast failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Emergency AI
  const activateEmergencyMode = useCallback(async (issue, context) => {
    setIsLoading(true);
    setError(null);

    try {
      const emergencyContext = {
        issue: {
          type: issue.type,
          severity: issue.severity,
          description: issue.description,
          timestamp: issue.timestamp
        },
        system: {
          affectedComponents: issue.components,
          currentStatus: context.systemStatus,
          activeOrders: context.activeOrders
        },
        capabilities: {
          canModifyPrices: true,
          canDisableProducts: true,
          canNotifyCustomers: true,
          canSwitchProviders: true
        }
      };

      const solution = await callOpenAI('emergency-response', emergencyContext);

      // Execute emergency actions
      if (solution.actions) {
        await executeEmergencyActions(solution.actions);
      }

      return solution;
    } catch (err) {
      console.error('Emergency AI failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Menu Suggestions
  const generateMenuSuggestions = useCallback(async (params) => {
    setIsLoading(true);
    setError(null);

    try {
      const context = {
        currentMenu: params.currentMenu,
        salesData: params.salesData,
        customerFeedback: params.feedback,
        trends: params.trends,
        season: params.season,
        constraints: {
          maxItems: params.maxItems,
          dietary: params.dietary,
          priceRange: params.priceRange
        }
      };

      const suggestions = await callOpenAI('menu-suggestions', context);

      return suggestions;
    } catch (err) {
      console.error('Menu suggestions failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Voice Order Processing
  const processVoiceOrder = useCallback(async (transcript, context) => {
    setIsLoading(true);
    setError(null);

    try {
      const orderContext = {
        transcript,
        menu: context.menu,
        language: context.language,
        customerHistory: context.customerHistory,
        currentCart: context.currentCart
      };

      const result = await callOpenAI('voice-order', orderContext);

      return {
        items: result.items,
        confidence: result.confidence,
        clarificationNeeded: result.clarificationNeeded,
        suggestedResponse: result.response
      };
    } catch (err) {
      console.error('Voice order processing failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Core OpenAI API Call
  const callOpenAI = async (type, context) => {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    // Create abort controller for timeout
    abortControllerRef.current = new AbortController();
    const timeoutId = setTimeout(() => abortControllerRef.current?.abort(), 30000); // 30s timeout

    try {
      const messages = buildMessages(type, context);

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages,
          temperature: type === 'emergency-response' ? 0.3 : 0.7,
          max_tokens: 1000,
          response_format: { type: "json_object" }
        }),
        signal: abortControllerRef.current.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);

      return result;
    } catch (err) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw err;
    }
  };

  // Build messages for different AI tasks
  const buildMessages = (type, context) => {
    const systemPrompts = {
      'price-optimization': `You are an AI pricing expert for a food truck business. Analyze the provided data and recommend optimal pricing. Consider elasticity, competition, margins, and demand patterns. Return a JSON object with: optimalPrice, confidence, revenueLift, priceElasticity, factors[], reasoning, demandChange, marginImprovement, competitivePosition, dynamicPricingRules[], bundleOpportunities[].`,

      'demand-forecast': `You are an AI demand forecasting expert. Predict future demand based on historical data and contextual factors. Return a JSON object with: forecast[], confidence, factors[], recommendations[].`,

      'emergency-response': `You are an emergency response AI for a food truck system. Analyze the issue and provide immediate actionable solutions. Return a JSON object with: severity, actions[], notifications[], alternativeSolutions[], estimatedResolutionTime.`,

      'menu-suggestions': `You are a culinary AI consultant. Suggest menu improvements based on sales data and trends. Return a JSON object with: suggestions[], reasoning, expectedImpact, implementation.`,

      'voice-order': `You are a voice order processing AI. Parse the natural language order and match it to menu items. Return a JSON object with: items[], confidence, clarificationNeeded, response.`
    };

    return [
      {
        role: 'system',
        content: systemPrompts[type] || 'You are a helpful AI assistant for a food truck business.'
      },
      {
        role: 'user',
        content: JSON.stringify(context)
      }
    ];
  };

  // Helper Functions
  const getHistoricalData = async (productId, tenantId) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const ordersRef = collection(db, `tenants/${tenantId}/orders`);
    const q = query(
      ordersRef,
      where('items', 'array-contains', { productId }),
      where('createdAt', '>=', thirtyDaysAgo),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Calculate metrics
    const dailySales = {};
    const priceHistory = [];

    orders.forEach(order => {
      const date = order.createdAt.toDate().toDateString();
      const productItems = order.items.filter(item => item.productId === productId);

      if (!dailySales[date]) {
        dailySales[date] = 0;
      }
      dailySales[date] += productItems.reduce((sum, item) => sum + item.quantity, 0);

      productItems.forEach(item => {
        if (item.unitPrice) {
          priceHistory.push({
            date: order.createdAt.toDate(),
            price: item.unitPrice
          });
        }
      });
    });

    return {
      avgDailySales: Object.values(dailySales).reduce((a, b) => a + b, 0) / Object.keys(dailySales).length,
      priceHistory,
      demandPattern: analyzeDemandPattern(dailySales),
      seasonality: detectSeasonality(orders)
    };
  };

  const getCompetitorPrices = async (category, location) => {
    // In real implementation, this would fetch from a competitor API or database
    // For now, return mock data
    return [
      { name: 'Competitor A', price: 15.90, distance: 0.5 },
      { name: 'Competitor B', price: 17.50, distance: 1.2 },
      { name: 'Competitor C', price: 16.20, distance: 2.0 }
    ];
  };

  const getMarketTrends = async (category) => {
    // In real implementation, fetch from market data API
    return {
      trend: 'increasing',
      avgPriceChange: 0.05, // 5% increase
      demandTrend: 'stable'
    };
  };

  const analyzeDemandPattern = (dailySales) => {
    // Simple demand pattern analysis
    const values = Object.values(dailySales);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;

    return {
      average: avg,
      variance,
      stability: variance < avg * 0.3 ? 'stable' : 'volatile'
    };
  };

  const detectSeasonality = (orders) => {
    // Simple seasonality detection
    const monthlyOrders = {};

    orders.forEach(order => {
      const month = order.createdAt.toDate().getMonth();
      if (!monthlyOrders[month]) {
        monthlyOrders[month] = 0;
      }
      monthlyOrders[month]++;
    });

    return {
      hasSeasonality: Object.keys(monthlyOrders).length > 1,
      peakMonths: Object.entries(monthlyOrders)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 2)
        .map(([month]) => parseInt(month))
    };
  };

  const calculateConfidence = (forecast, historicalData) => {
    // Simple confidence calculation based on data quality
    const dataPoints = historicalData.length;
    const dataQuality = Math.min(dataPoints / 30, 1); // 30 days = full confidence

    return dataQuality * 0.8 + 0.2; // Minimum 20% confidence
  };

  const saveOptimizationResult = async (productId, optimization) => {
    const optimizationRef = doc(db, 'ai_optimizations', `${productId}_${Date.now()}`);
    await setDoc(optimizationRef, {
      productId,
      optimization,
      createdAt: new Date(),
      applied: false
    });
  };

  const executeEmergencyActions = async (actions) => {
    // Execute emergency actions
    for (const action of actions) {
      switch (action.type) {
        case 'notify':
          // Send notifications
          console.log('Sending emergency notification:', action.message);
          break;
        case 'disable':
          // Disable products/features
          console.log('Disabling:', action.target);
          break;
        case 'adjust':
          // Adjust prices/settings
          console.log('Adjusting:', action.target, action.value);
          break;
        default:
          console.log('Unknown action type:', action.type);
      }
    }
  };

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    // Methods
    optimizePrice,
    forecastDemand,
    activateEmergencyMode,
    generateMenuSuggestions,
    processVoiceOrder,

    // State
    isLoading,
    error,

    // Cleanup
    cleanup
  };
};

export default useAI;
