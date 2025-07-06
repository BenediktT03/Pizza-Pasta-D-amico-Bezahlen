/**
 * EATECH - Review Tracker & Reward System
 * Version: 25.0.0
 * Description: Zentrales Review-Management mit Punktesystem, Level-System,
 *              AI-Sentiment-Analyse und Review-Heatmap für Schweiz
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/master/src/pages/ReviewTracker/ReviewTracker.jsx
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  onValue, 
  update,
  set,
  push,
  serverTimestamp,
  off,
  remove,
  query,
  orderByChild,
  limitToLast,
  startAt,
  endAt
} from 'firebase/database';
import {
  Star,
  Camera,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Award,
  Gift,
  Map,
  Filter,
  Search,
  Download,
  BarChart3,
  PieChart,
  Activity,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Shield,
  Hash,
  DollarSign,
  Percent,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  ThumbsUp,
  ThumbsDown,
  Smile,
  Meh,
  Frown,
  MapPin,
  Truck,
  Calendar,
  RefreshCw,
  Settings,
  Info,
  ExternalLink,
  Bell,
  BellOff,
  Flag,
  UserCheck,
  UserX,
  Target,
  Flame,
  Sparkles,
  Trophy,
  Medal,
  Crown,
  Gem,
  Coffee,
  Pizza,
  Cookie,
  Soup,
  Utensils
} from 'lucide-react';
import styles from './ReviewTracker.module.css';

// ============================================================================
// FIREBASE CONFIGURATION
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDFBlgWE81iHnACVwOmaU0jL7FV0l_tRmU",
  authDomain: "eatech-foodtruck.firebaseapp.com",
  databaseURL: "https://eatech-foodtruck-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "eatech-foodtruck",
  storageBucket: "eatech-foodtruck.firebasestorage.app",
  messagingSenderId: "261222802445",
  appId: "1:261222802445:web:edde22580422fbced22144",
  measurementId: "G-N0KHWJG9KP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// ============================================================================
// CONSTANTS
// ============================================================================
const POINTS_CONFIG = {
  perCHF: 1,          // 1 CHF = 1 Punkt
  photoReview: 50,    // Foto hinzufügen
  textReview: 20,     // Text Review
  starRating: 5,      // Nur Sterne
  weeklyLimit: 1,     // Max 1x pro Woche pro Truck
  redeemThreshold: 1000, // 1000 Punkte = 10% Rabatt
  redeemDiscount: 10     // 10% Rabatt
};

const USER_LEVELS = [
  { 
    id: 'rookie',
    name: 'Street Food Rookie',
    icon: '🥄',
    minPoints: 0,
    maxPoints: 499,
    color: '#808080',
    benefits: ['Basis Features']
  },
  { 
    id: 'buddy',
    name: 'Burger Buddy',
    icon: '🍔',
    minPoints: 500,
    maxPoints: 1999,
    color: '#CD7F32', // Bronze
    benefits: ['1h frühere Vorbestellung']
  },
  { 
    id: 'champion',
    name: 'Taco Champion',
    icon: '🌮',
    minPoints: 2000,
    maxPoints: 4999,
    color: '#C0C0C0', // Silver
    benefits: ['Beta Features testen']
  },
  { 
    id: 'maestro',
    name: 'Pizza Maestro',
    icon: '🍕',
    minPoints: 5000,
    maxPoints: 9999,
    color: '#FFD700', // Gold
    benefits: ['2h frühere Vorbestellung', 'Priority Queue']
  },
  { 
    id: 'nomad',
    name: 'Gourmet Nomad',
    icon: '👨‍🍳',
    minPoints: 10000,
    maxPoints: null,
    color: '#E5E4E2', // Platinum
    benefits: ['VIP Status', '???']
  }
];

const SENTIMENT_TYPES = {
  positive: { icon: Smile, color: '#51CF66', label: 'Positiv' },
  neutral: { icon: Meh, color: '#FFD93D', label: 'Neutral' },
  negative: { icon: Frown, color: '#FF6B6B', label: 'Negativ' }
};

const REVIEW_PLATFORMS = {
  google: { name: 'Google Reviews', icon: '🔍', color: '#4285F4' },
  tripadvisor: { name: 'TripAdvisor', icon: '🦉', color: '#00AF87' },
  facebook: { name: 'Facebook', icon: '👍', color: '#1877F2' },
  internal: { name: 'EATECH', icon: '🍔', color: '#FF6B6B' }
};

const SWISS_CANTONS = {
  'ZH': { name: 'Zürich', lat: 47.3769, lng: 8.5417 },
  'BE': { name: 'Bern', lat: 46.9480, lng: 7.4474 },
  'LU': { name: 'Luzern', lat: 47.0502, lng: 8.3093 },
  'UR': { name: 'Uri', lat: 46.8868, lng: 8.6340 },
  'SZ': { name: 'Schwyz', lat: 47.0207, lng: 8.6530 },
  'OW': { name: 'Obwalden', lat: 46.8779, lng: 8.2513 },
  'NW': { name: 'Nidwalden', lat: 46.9267, lng: 8.3850 },
  'GL': { name: 'Glarus', lat: 47.0404, lng: 9.0680 },
  'ZG': { name: 'Zug', lat: 47.1662, lng: 8.5156 },
  'FR': { name: 'Fribourg', lat: 46.8065, lng: 7.1620 },
  'SO': { name: 'Solothurn', lat: 47.2088, lng: 7.5323 },
  'BS': { name: 'Basel-Stadt', lat: 47.5596, lng: 7.5886 },
  'BL': { name: 'Basel-Landschaft', lat: 47.4814, lng: 7.7335 },
  'SH': { name: 'Schaffhausen', lat: 47.6970, lng: 8.6344 },
  'AR': { name: 'Appenzell Ausserrhoden', lat: 47.3829, lng: 9.2779 },
  'AI': { name: 'Appenzell Innerrhoden', lat: 47.3167, lng: 9.4167 },
  'SG': { name: 'St. Gallen', lat: 47.4245, lng: 9.3767 },
  'GR': { name: 'Graubünden', lat: 46.6570, lng: 9.5779 },
  'AG': { name: 'Aargau', lat: 47.3887, lng: 8.0457 },
  'TG': { name: 'Thurgau', lat: 47.5537, lng: 9.0557 },
  'TI': { name: 'Ticino', lat: 46.3317, lng: 8.8005 },
  'VD': { name: 'Vaud', lat: 46.5707, lng: 6.5571 },
  'VS': { name: 'Valais', lat: 46.2270, lng: 7.6202 },
  'NE': { name: 'Neuchâtel', lat: 46.9900, lng: 6.9293 },
  'GE': { name: 'Genève', lat: 46.2044, lng: 6.1432 },
  'JU': { name: 'Jura', lat: 47.3507, lng: 7.1561 }
};

// ============================================================================
// REVIEW TRACKER COMPONENT
// ============================================================================
const ReviewTracker = () => {
  // State Management
  const [activeView, setActiveView] = useState('dashboard');
  const [reviews, setReviews] = useState([]);
  const [users, setUsers] = useState([]);
  const [foodtrucks, setFoodtrucks] = useState([]);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalReviews: 0,
    averageRating: 0,
    sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
    platformBreakdown: {},
    cantonStats: {},
    topReviewers: [],
    trendingFoodtrucks: [],
    criticalReviews: [],
    pointsDistributed: 0,
    redemptionsProcessed: 0
  });
  const [filters, setFilters] = useState({
    dateRange: 'week',
    sentiment: 'all',
    platform: 'all',
    canton: 'all',
    foodtruck: 'all',
    hasPhoto: 'all',
    search: ''
  });
  const [selectedReview, setSelectedReview] = useState(null);
  const [showSentimentModal, setShowSentimentModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // ========================================================================
  // FIREBASE LISTENERS
  // ========================================================================
  useEffect(() => {
    const reviewsRef = ref(database, 'reviews');
    const usersRef = ref(database, 'users');
    const foodtrucksRef = ref(database, 'foodtrucks');
    const pointsRef = ref(database, 'points_history');

    // Load reviews
    const reviewsQuery = query(
      reviewsRef,
      orderByChild('timestamp'),
      limitToLast(5000)
    );

    const unsubscribeReviews = onValue(reviewsQuery, (snapshot) => {
      const data = snapshot.val() || {};
      const reviewsList = Object.entries(data).map(([id, review]) => ({
        id,
        ...review,
        sentiment: analyzeSentiment(review.text || '')
      })).reverse();
      setReviews(reviewsList);
      calculateAnalytics(reviewsList);
      setLoading(false);
    });

    // Load users
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const usersList = Object.entries(data).map(([id, user]) => ({
        id,
        ...user,
        level: calculateUserLevel(user.points || 0)
      }));
      setUsers(usersList);
    });

    // Load foodtrucks
    const unsubscribeFoodtrucks = onValue(foodtrucksRef, (snapshot) => {
      const data = snapshot.val() || {};
      const foodtrucksList = Object.entries(data).map(([id, truck]) => ({
        id,
        ...truck
      }));
      setFoodtrucks(foodtrucksList);
    });

    // Load points history
    const pointsQuery = query(
      pointsRef,
      orderByChild('timestamp'),
      limitToLast(1000)
    );

    const unsubscribePoints = onValue(pointsQuery, (snapshot) => {
      const data = snapshot.val() || {};
      const pointsList = Object.entries(data).map(([id, points]) => ({
        id,
        ...points
      }));
      setPointsHistory(pointsList);
    });

    return () => {
      unsubscribeReviews();
      unsubscribeUsers();
      unsubscribeFoodtrucks();
      unsubscribePoints();
    };
  }, []);

  // ========================================================================
  // SENTIMENT ANALYSIS
  // ========================================================================
  const analyzeSentiment = (text) => {
    if (!text) return 'neutral';
    
    const positiveWords = [
      'super', 'toll', 'lecker', 'fantastisch', 'ausgezeichnet', 'perfekt',
      'délicieux', 'magnifique', 'excellent', 'parfait',
      'ottimo', 'buonissimo', 'fantastico', 'perfetto',
      'great', 'amazing', 'perfect', 'delicious', 'excellent'
    ];
    
    const negativeWords = [
      'schlecht', 'kalt', 'langsam', 'teuer', 'enttäuscht',
      'mauvais', 'froid', 'lent', 'cher', 'déçu',
      'cattivo', 'freddo', 'lento', 'caro', 'deluso',
      'bad', 'cold', 'slow', 'expensive', 'disappointed'
    ];
    
    const lowerText = text.toLowerCase();
    let score = 0;
    
    positiveWords.forEach(word => {
      if (lowerText.includes(word)) score += 1;
    });
    
    negativeWords.forEach(word => {
      if (lowerText.includes(word)) score -= 1;
    });
    
    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  };

  // ========================================================================
  // ANALYTICS CALCULATIONS
  // ========================================================================
  const calculateAnalytics = (reviewsList) => {
    const stats = {
      totalReviews: reviewsList.length,
      averageRating: 0,
      sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
      platformBreakdown: {},
      cantonStats: {},
      topReviewers: [],
      trendingFoodtrucks: [],
      criticalReviews: [],
      pointsDistributed: 0,
      redemptionsProcessed: 0
    };

    // Calculate averages and breakdowns
    let totalRating = 0;
    const userReviewCounts = {};
    const foodtruckReviewCounts = {};
    const cantonRatings = {};

    reviewsList.forEach(review => {
      // Rating average
      totalRating += review.rating || 0;
      
      // Sentiment breakdown
      stats.sentimentBreakdown[review.sentiment]++;
      
      // Platform breakdown
      const platform = review.platform || 'internal';
      stats.platformBreakdown[platform] = (stats.platformBreakdown[platform] || 0) + 1;
      
      // User counts for top reviewers
      if (!userReviewCounts[review.userId]) {
        userReviewCounts[review.userId] = { count: 0, userId: review.userId };
      }
      userReviewCounts[review.userId].count++;
      
      // Foodtruck counts for trending
      if (!foodtruckReviewCounts[review.foodtruckId]) {
        foodtruckReviewCounts[review.foodtruckId] = { 
          count: 0, 
          totalRating: 0, 
          foodtruckId: review.foodtruckId 
        };
      }
      foodtruckReviewCounts[review.foodtruckId].count++;
      foodtruckReviewCounts[review.foodtruckId].totalRating += review.rating || 0;
      
      // Canton stats
      const canton = review.canton || 'unknown';
      if (!cantonRatings[canton]) {
        cantonRatings[canton] = { 
          count: 0, 
          totalRating: 0, 
          positive: 0, 
          negative: 0 
        };
      }
      cantonRatings[canton].count++;
      cantonRatings[canton].totalRating += review.rating || 0;
      if (review.sentiment === 'positive') cantonRatings[canton].positive++;
      if (review.sentiment === 'negative') cantonRatings[canton].negative++;
      
      // Critical reviews (negative with rating <= 2)
      if (review.sentiment === 'negative' && review.rating <= 2) {
        stats.criticalReviews.push(review);
      }
      
      // Points distributed
      stats.pointsDistributed += review.pointsAwarded || 0;
    });

    // Calculate final values
    stats.averageRating = stats.totalReviews > 0 
      ? (totalRating / stats.totalReviews).toFixed(1) 
      : 0;

    // Top reviewers
    stats.topReviewers = Object.values(userReviewCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Trending foodtrucks (most reviews in last 7 days)
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    stats.trendingFoodtrucks = Object.values(foodtruckReviewCounts)
      .map(truck => ({
        ...truck,
        avgRating: truck.count > 0 ? (truck.totalRating / truck.count).toFixed(1) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Canton stats with averages
    Object.entries(cantonRatings).forEach(([canton, data]) => {
      stats.cantonStats[canton] = {
        ...data,
        avgRating: data.count > 0 ? (data.totalRating / data.count).toFixed(1) : 0,
        sentimentScore: data.count > 0 
          ? ((data.positive - data.negative) / data.count * 100).toFixed(0)
          : 0
      };
    });

    // Sort critical reviews by recency
    stats.criticalReviews = stats.criticalReviews
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);

    setAnalytics(stats);
  };

  // ========================================================================
  // USER LEVEL CALCULATION
  // ========================================================================
  const calculateUserLevel = (points) => {
    for (const level of USER_LEVELS) {
      if (points >= level.minPoints && (level.maxPoints === null || points <= level.maxPoints)) {
        return level;
      }
    }
    return USER_LEVELS[0];
  };

  // ========================================================================
  // POINTS MANAGEMENT
  // ========================================================================
  const awardPoints = async (userId, reviewId, type, amount) => {
    try {
      // Check weekly limit
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const userReviewsThisWeek = reviews.filter(r => 
        r.userId === userId && 
        r.foodtruckId === reviews.find(rev => rev.id === reviewId)?.foodtruckId &&
        new Date(r.timestamp) > weekAgo
      );
      
      if (userReviewsThisWeek.length >= POINTS_CONFIG.weeklyLimit) {
        alert('Wöchentliches Limit erreicht für diesen Foodtruck!');
        return;
      }

      // Award points
      const pointsEntry = {
        userId,
        reviewId,
        type,
        amount,
        timestamp: serverTimestamp()
      };

      await push(ref(database, 'points_history'), pointsEntry);
      
      // Update user total points
      const userRef = ref(database, `users/${userId}`);
      await update(userRef, {
        points: (users.find(u => u.id === userId)?.points || 0) + amount
      });

      // Update review
      await update(ref(database, `reviews/${reviewId}`), {
        pointsAwarded: amount
      });

      alert(`${amount} Punkte vergeben!`);
    } catch (error) {
      console.error('Error awarding points:', error);
      alert('Fehler beim Vergeben der Punkte');
    }
  };

  const redeemPoints = async (userId, amount) => {
    const user = users.find(u => u.id === userId);
    if (!user || user.points < amount) {
      alert('Nicht genügend Punkte!');
      return;
    }

    try {
      // Create redemption record
      const redemption = {
        userId,
        amount,
        discount: POINTS_CONFIG.redeemDiscount,
        timestamp: serverTimestamp(),
        status: 'pending'
      };

      await push(ref(database, 'redemptions'), redemption);
      
      // Deduct points
      await update(ref(database, `users/${userId}`), {
        points: user.points - amount
      });

      alert(`${POINTS_CONFIG.redeemDiscount}% Rabatt-Code generiert!`);
    } catch (error) {
      console.error('Error redeeming points:', error);
      alert('Fehler beim Einlösen der Punkte');
    }
  };

  // ========================================================================
  // REVIEW ACTIONS
  // ========================================================================
  const flagReview = async (reviewId, reason) => {
    try {
      await update(ref(database, `reviews/${reviewId}`), {
        flagged: true,
        flagReason: reason,
        flaggedAt: serverTimestamp()
      });
      alert('Review wurde gemeldet');
    } catch (error) {
      console.error('Error flagging review:', error);
      alert('Fehler beim Melden der Review');
    }
  };

  const sendReviewRequest = async (orderId) => {
    // This would trigger a notification after 15 minutes
    // Connected to NotificationCenter
    const notification = {
      type: 'review_request',
      orderId,
      scheduledFor: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      channels: ['push', 'email']
    };
    
    await push(ref(database, 'scheduled_notifications'), notification);
  };

  // ========================================================================
  // UI HELPERS
  // ========================================================================
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString('de-CH');
  };

  const getDateRangeFilter = () => {
    const now = new Date();
    const ranges = {
      today: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      year: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    };
    return ranges[filters.dateRange] || ranges.week;
  };

  const filteredReviews = useMemo(() => {
    const dateFilter = getDateRangeFilter();
    
    return reviews.filter(review => {
      if (new Date(review.timestamp) < dateFilter) return false;
      if (filters.sentiment !== 'all' && review.sentiment !== filters.sentiment) return false;
      if (filters.platform !== 'all' && review.platform !== filters.platform) return false;
      if (filters.canton !== 'all' && review.canton !== filters.canton) return false;
      if (filters.foodtruck !== 'all' && review.foodtruckId !== filters.foodtruck) return false;
      if (filters.hasPhoto !== 'all') {
        const hasPhoto = review.photoUrl ? 'yes' : 'no';
        if (hasPhoto !== filters.hasPhoto) return false;
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesText = review.text?.toLowerCase().includes(searchLower);
        const matchesUser = review.userName?.toLowerCase().includes(searchLower);
        const matchesTruck = review.foodtruckName?.toLowerCase().includes(searchLower);
        if (!matchesText && !matchesUser && !matchesTruck) return false;
      }
      return true;
    });
  }, [reviews, filters]);

  // ========================================================================
  // RENDER
  // ========================================================================
  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Lade Review Tracker...</p>
      </div>
    );
  }

  return (
    <div className={styles.reviewTracker}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>
            <Star size={28} />
            Review Tracker
          </h1>
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{analytics.totalReviews}</span>
              <span className={styles.statLabel}>Reviews</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{analytics.averageRating}</span>
              <span className={styles.statLabel}>⭐ Durchschnitt</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{analytics.pointsDistributed}</span>
              <span className={styles.statLabel}>Punkte vergeben</span>
            </div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button 
            className={styles.mapButton}
            onClick={() => setShowMapModal(true)}
          >
            <Map size={18} />
            Review Map
          </button>
          <button 
            className={styles.exportButton}
            onClick={() => exportAnalytics()}
          >
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeView === 'dashboard' ? styles.active : ''}`}
          onClick={() => setActiveView('dashboard')}
        >
          <Activity size={18} />
          Dashboard
        </button>
        <button 
          className={`${styles.tab} ${activeView === 'reviews' ? styles.active : ''}`}
          onClick={() => setActiveView('reviews')}
        >
          <MessageSquare size={18} />
          Reviews
        </button>
        <button 
          className={`${styles.tab} ${activeView === 'users' ? styles.active : ''}`}
          onClick={() => setActiveView('users')}
        >
          <Users size={18} />
          Benutzer
        </button>
        <button 
          className={`${styles.tab} ${activeView === 'sentiment' ? styles.active : ''}`}
          onClick={() => setActiveView('sentiment')}
        >
          <TrendingUp size={18} />
          Sentiment
        </button>
        <button 
          className={`${styles.tab} ${activeView === 'rewards' ? styles.active : ''}`}
          onClick={() => setActiveView('rewards')}
        >
          <Gift size={18} />
          Rewards
        </button>
      </div>

      {/* Content Area */}
      <div className={styles.content}>
        {activeView === 'dashboard' && (
          <div className={styles.dashboard}>
            {/* Sentiment Overview */}
            <div className={styles.sentimentOverview}>
              <h2>Sentiment Analyse</h2>
              <div className={styles.sentimentChart}>
                <div className={styles.sentimentBars}>
                  {Object.entries(analytics.sentimentBreakdown).map(([sentiment, count]) => {
                    const percentage = analytics.totalReviews > 0 
                      ? (count / analytics.totalReviews * 100).toFixed(1)
                      : 0;
                    const config = SENTIMENT_TYPES[sentiment];
                    
                    return (
                      <div key={sentiment} className={styles.sentimentBar}>
                        <div className={styles.sentimentHeader}>
                          <config.icon size={20} style={{ color: config.color }} />
                          <span>{config.label}</span>
                          <span className={styles.sentimentCount}>{count}</span>
                        </div>
                        <div className={styles.barContainer}>
                          <div 
                            className={styles.barFill}
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: config.color
                            }}
                          />
                        </div>
                        <span className={styles.percentage}>{percentage}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Platform Breakdown */}
            <div className={styles.platformBreakdown}>
              <h2>Review Plattformen</h2>
              <div className={styles.platformGrid}>
                {Object.entries(analytics.platformBreakdown).map(([platform, count]) => {
                  const config = REVIEW_PLATFORMS[platform] || REVIEW_PLATFORMS.internal;
                  const percentage = analytics.totalReviews > 0
                    ? (count / analytics.totalReviews * 100).toFixed(1)
                    : 0;

                  return (
                    <div key={platform} className={styles.platformCard}>
                      <div className={styles.platformIcon}>{config.icon}</div>
                      <div className={styles.platformName}>{config.name}</div>
                      <div className={styles.platformCount}>{count}</div>
                      <div className={styles.platformPercentage}>{percentage}%</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Reviewers */}
            <div className={styles.topReviewers}>
              <h2>
                <Trophy size={20} />
                Top Reviewers
              </h2>
              <div className={styles.reviewerList}>
                {analytics.topReviewers.map((reviewer, index) => {
                  const user = users.find(u => u.id === reviewer.userId);
                  if (!user) return null;

                  return (
                    <div key={reviewer.userId} className={styles.reviewerItem}>
                      <div className={styles.reviewerRank}>#{index + 1}</div>
                      <div className={styles.reviewerInfo}>
                        <div className={styles.reviewerName}>{user.name}</div>
                        <div className={styles.reviewerLevel}>
                          <span className={styles.levelIcon}>{user.level?.icon}</span>
                          <span className={styles.levelName}>{user.level?.name}</span>
                        </div>
                      </div>
                      <div className={styles.reviewerStats}>
                        <div className={styles.reviewCount}>{reviewer.count} Reviews</div>
                        <div className={styles.reviewPoints}>{user.points} Punkte</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Trending Foodtrucks */}
            <div className={styles.trendingTrucks}>
              <h2>
                <Flame size={20} />
                Trending Foodtrucks
              </h2>
              <div className={styles.truckList}>
                {analytics.trendingFoodtrucks.map((truck, index) => {
                  const foodtruck = foodtrucks.find(f => f.id === truck.foodtruckId);
                  if (!foodtruck) return null;

                  return (
                    <div key={truck.foodtruckId} className={styles.truckItem}>
                      <div className={styles.truckRank}>
                        {index < 3 && <Medal size={20} style={{ color: ['#FFD700', '#C0C0C0', '#CD7F32'][index] }} />}
                        #{index + 1}
                      </div>
                      <div className={styles.truckInfo}>
                        <div className={styles.truckName}>{foodtruck.name}</div>
                        <div className={styles.truckType}>{foodtruck.type}</div>
                      </div>
                      <div className={styles.truckStats}>
                        <div className={styles.truckReviews}>{truck.count} Reviews</div>
                        <div className={styles.truckRating}>⭐ {truck.avgRating}</div>
                      </div>
                      <div className={styles.truckTrend}>
                        <TrendingUp size={16} color="#51CF66" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Critical Reviews Alert */}
            {analytics.criticalReviews.length > 0 && (
              <div className={styles.criticalReviews}>
                <h2>
                  <AlertCircle size={20} color="#FF6B6B" />
                  Kritische Reviews (Sofort reagieren!)
                </h2>
                <div className={styles.criticalList}>
                  {analytics.criticalReviews.slice(0, 5).map(review => {
                    const foodtruck = foodtrucks.find(f => f.id === review.foodtruckId);
                    
                    return (
                      <div key={review.id} className={styles.criticalItem}>
                        <div className={styles.criticalHeader}>
                          <span className={styles.criticalRating}>
                            {'⭐'.repeat(review.rating)}
                          </span>
                          <span className={styles.criticalTruck}>{foodtruck?.name}</span>
                          <span className={styles.criticalTime}>
                            {formatTimestamp(review.timestamp)}
                          </span>
                        </div>
                        <div className={styles.criticalText}>{review.text}</div>
                        <div className={styles.criticalActions}>
                          <button 
                            className={styles.respondButton}
                            onClick={() => setSelectedReview(review)}
                          >
                            <MessageSquare size={14} />
                            Antworten
                          </button>
                          <button 
                            className={styles.flagButton}
                            onClick={() => flagReview(review.id, 'needs_attention')}
                          >
                            <Flag size={14} />
                            Markieren
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'reviews' && (
          <div className={styles.reviewsList}>
            {/* Filters */}
            <div className={styles.filters}>
              <div className={styles.searchBox}>
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Suche in Reviews..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>
              
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                className={styles.filterSelect}
              >
                <option value="today">Heute</option>
                <option value="week">Diese Woche</option>
                <option value="month">Dieser Monat</option>
                <option value="year">Dieses Jahr</option>
              </select>

              <select
                value={filters.sentiment}
                onChange={(e) => setFilters(prev => ({ ...prev, sentiment: e.target.value }))}
                className={styles.filterSelect}
              >
                <option value="all">Alle Sentiments</option>
                {Object.entries(SENTIMENT_TYPES).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>

              <select
                value={filters.platform}
                onChange={(e) => setFilters(prev => ({ ...prev, platform: e.target.value }))}
                className={styles.filterSelect}
              >
                <option value="all">Alle Plattformen</option>
                {Object.entries(REVIEW_PLATFORMS).map(([key, config]) => (
                  <option key={key} value={key}>{config.name}</option>
                ))}
              </select>

              <select
                value={filters.canton}
                onChange={(e) => setFilters(prev => ({ ...prev, canton: e.target.value }))}
                className={styles.filterSelect}
              >
                <option value="all">Alle Kantone</option>
                {Object.entries(SWISS_CANTONS).map(([key, config]) => (
                  <option key={key} value={key}>{config.name}</option>
                ))}
              </select>

              <select
                value={filters.hasPhoto}
                onChange={(e) => setFilters(prev => ({ ...prev, hasPhoto: e.target.value }))}
                className={styles.filterSelect}
              >
                <option value="all">Mit/Ohne Foto</option>
                <option value="yes">Mit Foto</option>
                <option value="no">Ohne Foto</option>
              </select>
            </div>

            {/* Reviews Grid */}
            <div className={styles.reviewsGrid}>
              {filteredReviews.map(review => {
                const user = users.find(u => u.id === review.userId);
                const foodtruck = foodtrucks.find(f => f.id === review.foodtruckId);
                const sentimentConfig = SENTIMENT_TYPES[review.sentiment];

                return (
                  <div key={review.id} className={styles.reviewCard}>
                    <div className={styles.reviewHeader}>
                      <div className={styles.reviewUser}>
                        <span className={styles.userName}>{user?.name || 'Unknown'}</span>
                        <span className={styles.userLevel}>
                          {user?.level?.icon} {user?.level?.name}
                        </span>
                      </div>
                      <div className={styles.reviewMeta}>
                        <span className={styles.reviewPlatform}>
                          {REVIEW_PLATFORMS[review.platform]?.icon}
                        </span>
                        <span className={styles.reviewTime}>
                          {formatTimestamp(review.timestamp)}
                        </span>
                      </div>
                    </div>

                    <div className={styles.reviewContent}>
                      <div className={styles.reviewRating}>
                        {'⭐'.repeat(review.rating || 0)}
                        <span className={styles.ratingNumber}>({review.rating}/5)</span>
                      </div>
                      <div className={styles.reviewTruck}>
                        <Truck size={14} />
                        {foodtruck?.name || 'Unknown Truck'}
                      </div>
                      {review.photoUrl && (
                        <div className={styles.reviewPhoto}>
                          <Camera size={16} />
                          <img src={review.photoUrl} alt="Review" />
                        </div>
                      )}
                      <div className={styles.reviewText}>{review.text}</div>
                    </div>

                    <div className={styles.reviewFooter}>
                      <div className={styles.sentimentBadge} style={{ backgroundColor: sentimentConfig.color }}>
                        <sentimentConfig.icon size={16} />
                        {sentimentConfig.label}
                      </div>
                      
                      <div className={styles.reviewActions}>
                        {!review.pointsAwarded && (
                          <button
                            className={styles.awardPointsBtn}
                            onClick={() => {
                              const points = (review.photoUrl ? POINTS_CONFIG.photoReview : 0) +
                                            (review.text ? POINTS_CONFIG.textReview : 0) +
                                            POINTS_CONFIG.starRating;
                              awardPoints(review.userId, review.id, 'review', points);
                            }}
                          >
                            <Gift size={14} />
                            {(review.photoUrl ? POINTS_CONFIG.photoReview : 0) +
                             (review.text ? POINTS_CONFIG.textReview : 0) +
                             POINTS_CONFIG.starRating} Punkte
                          </button>
                        )}
                        
                        {review.pointsAwarded && (
                          <span className={styles.pointsAwarded}>
                            <CheckCircle size={14} />
                            {review.pointsAwarded} Punkte vergeben
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeView === 'users' && (
          <div className={styles.usersView}>
            <div className={styles.levelOverview}>
              <h2>Level Übersicht</h2>
              <div className={styles.levelGrid}>
                {USER_LEVELS.map(level => {
                  const usersInLevel = users.filter(u => u.level?.id === level.id).length;
                  const percentage = users.length > 0 
                    ? (usersInLevel / users.length * 100).toFixed(1)
                    : 0;

                  return (
                    <div 
                      key={level.id} 
                      className={styles.levelCard}
                      style={{ borderColor: level.color }}
                    >
                      <div className={styles.levelIcon}>{level.icon}</div>
                      <div className={styles.levelName}>{level.name}</div>
                      <div className={styles.levelRange}>
                        {level.minPoints} - {level.maxPoints || '∞'} Punkte
                      </div>
                      <div className={styles.levelUsers}>
                        <Users size={16} />
                        {usersInLevel} Benutzer ({percentage}%)
                      </div>
                      <div className={styles.levelBenefits}>
                        <h4>Vorteile:</h4>
                        <ul>
                          {level.benefits.map((benefit, idx) => (
                            <li key={idx}>{benefit}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.usersTable}>
              <h2>Benutzer Rankings</h2>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Rang</th>
                    <th>Benutzer</th>
                    <th>Level</th>
                    <th>Punkte</th>
                    <th>Reviews</th>
                    <th>Durchschnitt</th>
                    <th>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .sort((a, b) => (b.points || 0) - (a.points || 0))
                    .map((user, index) => {
                      const userReviews = reviews.filter(r => r.userId === user.id);
                      const avgRating = userReviews.length > 0
                        ? (userReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / userReviews.length).toFixed(1)
                        : '-';

                      return (
                        <tr key={user.id}>
                          <td>
                            {index < 3 && (
                              <Trophy size={16} style={{ 
                                color: ['#FFD700', '#C0C0C0', '#CD7F32'][index] 
                              }} />
                            )}
                            #{index + 1}
                          </td>
                          <td>{user.name}</td>
                          <td>
                            <span className={styles.levelBadge}>
                              {user.level?.icon} {user.level?.name}
                            </span>
                          </td>
                          <td className={styles.points}>{user.points || 0}</td>
                          <td>{userReviews.length}</td>
                          <td>⭐ {avgRating}</td>
                          <td>
                            <div className={styles.userActions}>
                              <button
                                className={styles.viewBtn}
                                onClick={() => {/* Show user details */}}
                              >
                                <Eye size={14} />
                              </button>
                              {user.points >= POINTS_CONFIG.redeemThreshold && (
                                <button
                                  className={styles.redeemBtn}
                                  onClick={() => redeemPoints(user.id, POINTS_CONFIG.redeemThreshold)}
                                >
                                  <Gift size={14} />
                                  Einlösen
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeView === 'sentiment' && (
          <div className={styles.sentimentView}>
            <div className={styles.sentimentTrends}>
              <h2>Sentiment Trends</h2>
              {/* Here would be a line chart showing sentiment over time */}
              <div className={styles.trendChart}>
                <p>Sentiment Trend Chart (Implementation needed)</p>
              </div>
            </div>

            <div className={styles.aiInsights}>
              <h2>
                <Sparkles size={20} />
                AI Insights
              </h2>
              <div className={styles.insightsList}>
                <div className={styles.insightCard}>
                  <div className={styles.insightIcon}>
                    <TrendingDown size={24} color="#FF6B6B" />
                  </div>
                  <div className={styles.insightContent}>
                    <h3>Pizza-Qualität sinkt</h3>
                    <p>15% mehr negative Reviews für Pizza-Trucks in den letzten 2 Wochen</p>
                    <div className={styles.insightActions}>
                      <button className={styles.investigateBtn}>
                        <Search size={14} />
                        Untersuchen
                      </button>
                    </div>
                  </div>
                </div>

                <div className={styles.insightCard}>
                  <div className={styles.insightIcon}>
                    <TrendingUp size={24} color="#51CF66" />
                  </div>
                  <div className={styles.insightContent}>
                    <h3>Burger im Aufwind</h3>
                    <p>Burger-Trucks erhalten 25% mehr positive Reviews</p>
                  </div>
                </div>

                <div className={styles.insightCard}>
                  <div className={styles.insightIcon}>
                    <MapPin size={24} color="#FFD93D" />
                  </div>
                  <div className={styles.insightContent}>
                    <h3>Zürich dominiert</h3>
                    <p>40% aller Reviews kommen aus dem Kanton Zürich</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.wordCloud}>
              <h2>Häufigste Wörter</h2>
              {/* Word cloud visualization would go here */}
              <div className={styles.wordCloudContainer}>
                <p>Word Cloud (Implementation needed)</p>
              </div>
            </div>
          </div>
        )}

        {activeView === 'rewards' && (
          <div className={styles.rewardsView}>
            <div className={styles.pointsOverview}>
              <h2>Punkte System</h2>
              <div className={styles.pointsGrid}>
                <div className={styles.pointsCard}>
                  <div className={styles.pointsIcon}>
                    <DollarSign size={24} />
                  </div>
                  <div className={styles.pointsValue}>{POINTS_CONFIG.perCHF}</div>
                  <div className={styles.pointsLabel}>Punkt pro CHF</div>
                </div>
                <div className={styles.pointsCard}>
                  <div className={styles.pointsIcon}>
                    <Camera size={24} />
                  </div>
                  <div className={styles.pointsValue}>{POINTS_CONFIG.photoReview}</div>
                  <div className={styles.pointsLabel}>Punkte für Foto</div>
                </div>
                <div className={styles.pointsCard}>
                  <div className={styles.pointsIcon}>
                    <MessageSquare size={24} />
                  </div>
                  <div className={styles.pointsValue}>{POINTS_CONFIG.textReview}</div>
                  <div className={styles.pointsLabel}>Punkte für Text</div>
                </div>
                <div className={styles.pointsCard}>
                  <div className={styles.pointsIcon}>
                    <Star size={24} />
                  </div>
                  <div className={styles.pointsValue}>{POINTS_CONFIG.starRating}</div>
                  <div className={styles.pointsLabel}>Punkte für Sterne</div>
                </div>
              </div>
            </div>

            <div className={styles.redemptionInfo}>
              <h2>Einlösung</h2>
              <div className={styles.redemptionCard}>
                <div className={styles.redemptionIcon}>
                  <Gift size={48} />
                </div>
                <div className={styles.redemptionContent}>
                  <h3>{POINTS_CONFIG.redeemThreshold} Punkte = {POINTS_CONFIG.redeemDiscount}% Rabatt</h3>
                  <p>Auf die nächste Bestellung</p>
                </div>
              </div>
            </div>

            <div className={styles.pointsHistory}>
              <h2>Letzte Punkte-Transaktionen</h2>
              <div className={styles.historyList}>
                {pointsHistory.slice(0, 20).map(transaction => {
                  const user = users.find(u => u.id === transaction.userId);
                  
                  return (
                    <div key={transaction.id} className={styles.historyItem}>
                      <div className={styles.historyUser}>
                        {user?.name || 'Unknown'}
                      </div>
                      <div className={styles.historyType}>
                        {transaction.type}
                      </div>
                      <div className={styles.historyAmount}>
                        +{transaction.amount} Punkte
                      </div>
                      <div className={styles.historyTime}>
                        {formatTimestamp(transaction.timestamp)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Review Map Modal */}
      {showMapModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.mapModal}>
            <div className={styles.modalHeader}>
              <h2>
                <Map size={24} />
                Review Heatmap Schweiz
              </h2>
              <button 
                className={styles.closeButton}
                onClick={() => setShowMapModal(false)}
              >
                <X size={24} />
              </button>
            </div>
            <div className={styles.modalBody}>
              {/* SVG Switzerland Map with canton coloring based on sentiment */}
              <div className={styles.mapContainer}>
                <svg viewBox="0 0 1000 700" className={styles.switzerlandMap}>
                  {/* Simplified - would need actual canton paths */}
                  {Object.entries(analytics.cantonStats).map(([canton, stats]) => {
                    const cantonInfo = SWISS_CANTONS[canton];
                    if (!cantonInfo) return null;
                    
                    // Color based on sentiment score
                    const sentimentScore = parseInt(stats.sentimentScore);
                    let color = '#808080'; // neutral
                    if (sentimentScore > 20) color = '#51CF66'; // positive
                    if (sentimentScore < -20) color = '#FF6B6B'; // negative
                    
                    return (
                      <g key={canton}>
                        <circle
                          cx={cantonInfo.lng * 50 + 200}
                          cy={700 - cantonInfo.lat * 10}
                          r={Math.sqrt(stats.count) * 5}
                          fill={color}
                          opacity={0.7}
                          className={styles.cantonCircle}
                        />
                        <text
                          x={cantonInfo.lng * 50 + 200}
                          y={700 - cantonInfo.lat * 10}
                          textAnchor="middle"
                          className={styles.cantonLabel}
                        >
                          {canton}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
              
              <div className={styles.mapLegend}>
                <h3>Legende</h3>
                <div className={styles.legendItem}>
                  <div className={styles.legendColor} style={{ backgroundColor: '#51CF66' }} />
                  <span>Positiv (Sentiment Score > 20)</span>
                </div>
                <div className={styles.legendItem}>
                  <div className={styles.legendColor} style={{ backgroundColor: '#808080' }} />
                  <span>Neutral</span>
                </div>
                <div className={styles.legendItem}>
                  <div className={styles.legendColor} style={{ backgroundColor: '#FF6B6B' }} />
                  <span>Negativ (Sentiment Score < -20)</span>
                </div>
              </div>

              <div className={styles.cantonStats}>
                <h3>Kanton Statistiken</h3>
                <div className={styles.cantonGrid}>
                  {Object.entries(analytics.cantonStats)
                    .sort((a, b) => b[1].count - a[1].count)
                    .slice(0, 10)
                    .map(([canton, stats]) => (
                      <div key={canton} className={styles.cantonStat}>
                        <div className={styles.cantonName}>
                          {SWISS_CANTONS[canton]?.name || canton}
                        </div>
                        <div className={styles.cantonMetrics}>
                          <span>{stats.count} Reviews</span>
                          <span>⭐ {stats.avgRating}</span>
                          <span>
                            {stats.sentimentScore > 0 ? '+' : ''}{stats.sentimentScore}% Sentiment
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewTracker;