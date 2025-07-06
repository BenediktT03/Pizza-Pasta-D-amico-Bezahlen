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
  photoReview: 50,    // Foto-Review
  criticalFeedback: 30, // Kritisches Feedback
  milestone: {
    first: 100,       // Erste Review
    tenth: 200,       // 10. Review
    fifty: 500,       // 50. Review
    hundred: 1000     // 100. Review
  }
};

const LEVEL_SYSTEM = [
  { 
    id: 'rookie', 
    name: 'Food Rookie', 
    minPoints: 0, 
    icon: '🍴', 
    color: '#808080',
    benefits: ['Newsletter', 'Geburtstags-Bonus']
  },
  { 
    id: 'explorer', 
    name: 'Food Explorer', 
    minPoints: 500, 
    icon: '🍕', 
    color: '#CD7F32',
    benefits: ['5% Rabatt', 'Early Access']
  },
  { 
    id: 'enthusiast', 
    name: 'Food Enthusiast', 
    minPoints: 1500, 
    icon: '🍔', 
    color: '#C0C0C0',
    benefits: ['10% Rabatt', 'Gratis Lieferung']
  },
  { 
    id: 'connoisseur', 
    name: 'Food Connoisseur', 
    minPoints: 3000, 
    icon: '🍽️', 
    color: '#FFD700',
    benefits: ['15% Rabatt', 'VIP Events', 'Priority Support']
  },
  { 
    id: 'nomad', 
    name: 'Food Nomad', 
    minPoints: 5000, 
    icon: '👨‍🍳', 
    color: '#E5E4E2',
    benefits: ['20% Rabatt', 'Personal Chef Session', 'Lifetime Status']
  }
];

const PLATFORM_ICONS = {
  google: '🌐',
  internal: '🏠',
  facebook: '📘',
  instagram: '📸',
  tripadvisor: '🦉'
};

const SWISS_CANTONS = {
  'ZH': { name: 'Zürich', lat: 47.3769, lng: 8.5417 },
  'BE': { name: 'Bern', lat: 46.9480, lng: 7.4474 },
  'LU': { name: 'Luzern', lat: 47.0502, lng: 8.3093 },
  'UR': { name: 'Uri', lat: 46.8868, lng: 8.6348 },
  'SZ': { name: 'Schwyz', lat: 47.0207, lng: 8.6530 },
  'OW': { name: 'Obwalden', lat: 46.8779, lng: 8.2512 },
  'NW': { name: 'Nidwalden', lat: 46.9266, lng: 8.3858 },
  'GL': { name: 'Glarus', lat: 47.0401, lng: 9.0678 },
  'ZG': { name: 'Zug', lat: 47.1662, lng: 8.5156 },
  'FR': { name: 'Freiburg', lat: 46.8065, lng: 7.1618 },
  'SO': { name: 'Solothurn', lat: 47.2088, lng: 7.5323 },
  'BS': { name: 'Basel-Stadt', lat: 47.5596, lng: 7.5886 },
  'BL': { name: 'Basel-Landschaft', lat: 47.4859, lng: 7.7327 },
  'SH': { name: 'Schaffhausen', lat: 47.6970, lng: 8.6345 },
  'AR': { name: 'Appenzell Ausserrhoden', lat: 47.3662, lng: 9.3000 },
  'AI': { name: 'Appenzell Innerrhoden', lat: 47.3166, lng: 9.4167 },
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
    const pointsRef = ref(database, 'pointsHistory');

    // Listen to reviews
    const reviewsUnsubscribe = onValue(reviewsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const reviewsList = Object.entries(data).map(([id, review]) => ({
        id,
        ...review,
        sentiment: analyzeSentiment(review.rating, review.text)
      }));
      setReviews(reviewsList);
      calculateAnalytics(reviewsList);
    });

    // Listen to users
    const usersUnsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const usersList = Object.entries(data).map(([id, user]) => ({
        id,
        ...user,
        level: calculateLevel(user.totalPoints || 0)
      }));
      setUsers(usersList);
    });

    // Listen to foodtrucks
    const foodtrucksUnsubscribe = onValue(foodtrucksRef, (snapshot) => {
      const data = snapshot.val() || {};
      const foodtrucksList = Object.entries(data).map(([id, truck]) => ({
        id,
        ...truck
      }));
      setFoodtrucks(foodtrucksList);
    });

    // Listen to points history
    const pointsUnsubscribe = onValue(pointsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const pointsList = Object.entries(data).map(([id, point]) => ({
        id,
        ...point
      }));
      setPointsHistory(pointsList);
    });

    setLoading(false);

    // Cleanup
    return () => {
      off(reviewsRef);
      off(usersRef);
      off(foodtrucksRef);
      off(pointsRef);
    };
  }, []);

  // ========================================================================
  // HELPER FUNCTIONS
  // ========================================================================
  const analyzeSentiment = (rating, text) => {
    // Simple sentiment analysis based on rating and keywords
    if (rating >= 4) return 'positive';
    if (rating <= 2) return 'negative';
    
    // For neutral ratings, check text
    const positiveWords = ['lecker', 'super', 'toll', 'gut', 'empfehlen', 'fantastisch'];
    const negativeWords = ['schlecht', 'kalt', 'lange', 'enttäuscht', 'teuer', 'nie wieder'];
    
    const textLower = (text || '').toLowerCase();
    const positiveCount = positiveWords.filter(word => textLower.includes(word)).length;
    const negativeCount = negativeWords.filter(word => textLower.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  };

  const calculateLevel = (points) => {
    for (let i = LEVEL_SYSTEM.length - 1; i >= 0; i--) {
      if (points >= LEVEL_SYSTEM[i].minPoints) {
        return LEVEL_SYSTEM[i];
      }
    }
    return LEVEL_SYSTEM[0];
  };

  const calculateAnalytics = (reviewsList) => {
    const totalReviews = reviewsList.length;
    const totalRating = reviewsList.reduce((sum, r) => sum + (r.rating || 0), 0);
    const averageRating = totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : 0;

    // Sentiment breakdown
    const sentimentBreakdown = reviewsList.reduce((acc, review) => {
      acc[review.sentiment] = (acc[review.sentiment] || 0) + 1;
      return acc;
    }, { positive: 0, neutral: 0, negative: 0 });

    // Platform breakdown
    const platformBreakdown = reviewsList.reduce((acc, review) => {
      acc[review.platform] = (acc[review.platform] || 0) + 1;
      return acc;
    }, {});

    // Canton stats
    const cantonStats = reviewsList.reduce((acc, review) => {
      if (review.canton) {
        acc[review.canton] = (acc[review.canton] || 0) + 1;
      }
      return acc;
    }, {});

    // Top reviewers (by review count)
    const reviewerCounts = reviewsList.reduce((acc, review) => {
      if (review.userId) {
        acc[review.userId] = (acc[review.userId] || 0) + 1;
      }
      return acc;
    }, {});

    const topReviewers = Object.entries(reviewerCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([userId, count]) => ({ userId, count }));

    // Critical reviews (rating <= 2)
    const criticalReviews = reviewsList
      .filter(r => r.rating <= 2)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    // Points distributed
    const pointsDistributed = pointsHistory.reduce((sum, p) => sum + (p.points || 0), 0);

    setAnalytics({
      totalReviews,
      averageRating,
      sentimentBreakdown,
      platformBreakdown,
      cantonStats,
      topReviewers,
      criticalReviews,
      pointsDistributed,
      redemptionsProcessed: pointsHistory.filter(p => p.type === 'redemption').length
    });
  };

  // ========================================================================
  // ACTION HANDLERS
  // ========================================================================
  const awardPoints = async (review, points, reason) => {
    try {
      // Update user points
      const userRef = ref(database, `users/${review.userId}`);
      const userSnapshot = await get(userRef);
      const userData = userSnapshot.val() || {};
      const currentPoints = userData.totalPoints || 0;
      
      await update(userRef, {
        totalPoints: currentPoints + points,
        lastPointsUpdate: serverTimestamp()
      });

      // Add to points history
      const pointsRef = ref(database, 'pointsHistory');
      await push(pointsRef, {
        userId: review.userId,
        reviewId: review.id,
        points,
        reason,
        timestamp: serverTimestamp(),
        type: 'award'
      });

      // Mark review as rewarded
      const reviewRef = ref(database, `reviews/${review.id}`);
      await update(reviewRef, {
        pointsAwarded: points,
        pointsAwardedAt: serverTimestamp()
      });

      alert(`${points} Punkte vergeben!`);
    } catch (error) {
      console.error('Error awarding points:', error);
      alert('Fehler beim Vergeben der Punkte');
    }
  };

  const handleSentimentOverride = async (reviewId, newSentiment) => {
    try {
      const reviewRef = ref(database, `reviews/${reviewId}`);
      await update(reviewRef, {
        sentiment: newSentiment,
        sentimentOverride: true,
        sentimentUpdatedAt: serverTimestamp()
      });
      setShowSentimentModal(false);
      alert('Sentiment erfolgreich aktualisiert');
    } catch (error) {
      console.error('Error updating sentiment:', error);
      alert('Fehler beim Aktualisieren des Sentiments');
    }
  };

  const exportAnalytics = () => {
    const data = {
      exportDate: new Date().toISOString(),
      analytics,
      reviews: filteredReviews,
      filters
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eatech-reviews-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ========================================================================
  // FILTER LOGIC
  // ========================================================================
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
          Users & Levels
        </button>
        <button 
          className={`${styles.tab} ${activeView === 'points' ? styles.active : ''}`}
          onClick={() => setActiveView('points')}
        >
          <Award size={18} />
          Points History
        </button>
      </div>

      {/* Content Area */}
      <div className={styles.content}>
        {/* Dashboard View */}
        {activeView === 'dashboard' && (
          <div className={styles.dashboard}>
            {/* Sentiment Overview */}
            <div className={styles.sentimentOverview}>
              <h2>Sentiment Analyse</h2>
              <div className={styles.sentimentChart}>
                <div className={styles.sentimentBars}>
                  {Object.entries(analytics.sentimentBreakdown).map(([sentiment, count]) => {
                    const percentage = analytics.totalReviews > 0 
                      ? Math.round((count / analytics.totalReviews) * 100) 
                      : 0;
                    const colors = {
                      positive: '#51CF66',
                      neutral: '#FFD93D',
                      negative: '#FF6B6B'
                    };
                    
                    return (
                      <div key={sentiment} className={styles.sentimentBar}>
                        <div className={styles.sentimentHeader}>
                          {sentiment === 'positive' && <Smile size={20} />}
                          {sentiment === 'neutral' && <Meh size={20} />}
                          {sentiment === 'negative' && <Frown size={20} />}
                          <span>{sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}</span>
                          <span className={styles.sentimentCount}>{count}</span>
                        </div>
                        <div className={styles.barContainer}>
                          <div 
                            className={styles.barFill}
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: colors[sentiment]
                            }}
                          />
                        </div>
                        <div className={styles.percentage}>{percentage}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Platform Breakdown */}
            <div className={styles.platformBreakdown}>
              <h2>Platform Verteilung</h2>
              <div className={styles.platformGrid}>
                {Object.entries(analytics.platformBreakdown).map(([platform, count]) => {
                  const percentage = analytics.totalReviews > 0
                    ? Math.round((count / analytics.totalReviews) * 100)
                    : 0;
                  
                  return (
                    <div key={platform} className={styles.platformCard}>
                      <div className={styles.platformIcon}>
                        {PLATFORM_ICONS[platform] || '📱'}
                      </div>
                      <div className={styles.platformName}>{platform}</div>
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
                Top Reviewer
              </h2>
              <div className={styles.reviewerList}>
                {analytics.topReviewers.map((reviewer, index) => {
                  const user = users.find(u => u.id === reviewer.userId);
                  if (!user) return null;
                  
                  return (
                    <div key={reviewer.userId} className={styles.reviewerItem}>
                      <div className={styles.reviewerRank}>#{index + 1}</div>
                      <div className={styles.reviewerInfo}>
                        <div className={styles.reviewerName}>{user.name || 'Unbekannt'}</div>
                        <div className={styles.reviewerLevel}>
                          <span className={styles.levelIcon}>{user.level?.icon}</span>
                          <span>{user.level?.name}</span>
                        </div>
                      </div>
                      <div className={styles.reviewerStats}>
                        <div className={styles.reviewCount}>{reviewer.count} Reviews</div>
                        <div className={styles.pointsCount}>{user.totalPoints || 0} Punkte</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Critical Reviews */}
            <div className={styles.criticalReviews}>
              <h2>
                <AlertCircle size={20} />
                Kritische Reviews
              </h2>
              <div className={styles.criticalList}>
                {analytics.criticalReviews.map(review => (
                  <div key={review.id} className={styles.criticalItem}>
                    <div className={styles.criticalHeader}>
                      <div className={styles.criticalRating}>
                        {'⭐'.repeat(review.rating)}
                        <span className={styles.ratingNumber}>({review.rating})</span>
                      </div>
                      <div className={styles.criticalDate}>
                        {new Date(review.timestamp).toLocaleDateString('de-CH')}
                      </div>
                    </div>
                    <div className={styles.criticalText}>{review.text}</div>
                    <div className={styles.criticalFooter}>
                      <div className={styles.criticalTruck}>
                        <Truck size={14} />
                        {review.foodtruckName || 'Unbekannt'}
                      </div>
                      <button 
                        className={styles.respondButton}
                        onClick={() => setSelectedReview(review)}
                      >
                        Antworten
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Reviews List View */}
        {activeView === 'reviews' && (
          <div className={styles.reviewsList}>
            {/* Filters */}
            <div className={styles.filters}>
              <div className={styles.searchBox}>
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Suche nach Text, User oder Foodtruck..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
              
              <select 
                className={styles.filterSelect}
                value={filters.dateRange}
                onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
              >
                <option value="today">Heute</option>
                <option value="week">Diese Woche</option>
                <option value="month">Dieser Monat</option>
                <option value="year">Dieses Jahr</option>
              </select>
              
              <select 
                className={styles.filterSelect}
                value={filters.sentiment}
                onChange={(e) => setFilters({ ...filters, sentiment: e.target.value })}
              >
                <option value="all">Alle Sentiments</option>
                <option value="positive">Positiv</option>
                <option value="neutral">Neutral</option>
                <option value="negative">Negativ</option>
              </select>
              
              <select 
                className={styles.filterSelect}
                value={filters.platform}
                onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
              >
                <option value="all">Alle Plattformen</option>
                {Object.keys(PLATFORM_ICONS).map(platform => (
                  <option key={platform} value={platform}>{platform}</option>
                ))}
              </select>
              
              <select 
                className={styles.filterSelect}
                value={filters.hasPhoto}
                onChange={(e) => setFilters({ ...filters, hasPhoto: e.target.value })}
              >
                <option value="all">Mit/Ohne Foto</option>
                <option value="yes">Mit Foto</option>
                <option value="no">Ohne Foto</option>
              </select>
            </div>

            {/* Reviews Grid */}
            <div className={styles.reviewsGrid}>
              {filteredReviews.map(review => {
                const sentimentColors = {
                  positive: '#51CF66',
                  neutral: '#FFD93D',
                  negative: '#FF6B6B'
                };
                
                return (
                  <div key={review.id} className={styles.reviewCard}>
                    <div className={styles.reviewHeader}>
                      <div className={styles.reviewUser}>
                        <div className={styles.userName}>{review.userName || 'Anonym'}</div>
                        <div className={styles.userLevel}>
                          {review.userId && users.find(u => u.id === review.userId)?.level?.icon}
                          {review.userId && users.find(u => u.id === review.userId)?.level?.name}
                        </div>
                      </div>
                      <div className={styles.reviewMeta}>
                        <span className={styles.reviewPlatform}>
                          {PLATFORM_ICONS[review.platform]}
                        </span>
                        <span>{new Date(review.timestamp).toLocaleDateString('de-CH')}</span>
                      </div>
                    </div>
                    
                    <div className={styles.reviewContent}>
                      <div className={styles.reviewRating}>
                        {'⭐'.repeat(review.rating)}
                        <span className={styles.ratingNumber}>({review.rating})</span>
                      </div>
                      
                      <div className={styles.reviewTruck}>
                        <Truck size={14} />
                        {review.foodtruckName || 'Unbekannt'}
                      </div>
                      
                      {review.photoUrl && (
                        <div className={styles.reviewPhoto}>
                          <img src={review.photoUrl} alt="Review" />
                          <Camera size={16} />
                        </div>
                      )}
                      
                      <p className={styles.reviewText}>{review.text}</p>
                    </div>
                    
                    <div className={styles.reviewFooter}>
                      <div 
                        className={styles.sentimentBadge}
                        style={{ backgroundColor: sentimentColors[review.sentiment] }}
                      >
                        {review.sentiment === 'positive' && <ThumbsUp size={14} />}
                        {review.sentiment === 'neutral' && <Meh size={14} />}
                        {review.sentiment === 'negative' && <ThumbsDown size={14} />}
                        {review.sentiment}
                      </div>
                      
                      <div className={styles.reviewActions}>
                        {!review.pointsAwarded && (
                          <button 
                            className={styles.awardPointsBtn}
                            onClick={() => {
                              const points = review.photoUrl ? POINTS_CONFIG.photoReview : 20;
                              awardPoints(review, points, 'Review Belohnung');
                            }}
                          >
                            <Gift size={16} />
                            Punkte vergeben
                          </button>
                        )}
                        {review.pointsAwarded && (
                          <div className={styles.pointsAwarded}>
                            <CheckCircle size={16} />
                            {review.pointsAwarded} Punkte vergeben
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Users & Levels View */}
        {activeView === 'users' && (
          <div className={styles.usersView}>
            {/* Level Overview */}
            <div className={styles.levelOverview}>
              <h2>Level System Übersicht</h2>
              <div className={styles.levelGrid}>
                {LEVEL_SYSTEM.map(level => {
                  const usersInLevel = users.filter(u => u.level?.id === level.id).length;
                  const percentage = users.length > 0 
                    ? Math.round((usersInLevel / users.length) * 100)
                    : 0;
                  
                  return (
                    <div 
                      key={level.id} 
                      className={styles.levelCard}
                      style={{ borderColor: level.color }}
                    >
                      <div className={styles.levelIcon}>{level.icon}</div>
                      <div className={styles.levelName}>{level.name}</div>
                      <div className={styles.levelRequirement}>
                        Ab {level.minPoints} Punkten
                      </div>
                      <div className={styles.levelStats}>
                        <div className={styles.userCount}>{usersInLevel} Users</div>
                        <div className={styles.levelPercentage}>{percentage}%</div>
                      </div>
                      <div className={styles.levelBenefits}>
                        {level.benefits.map((benefit, index) => (
                          <div key={index} className={styles.benefit}>
                            <CheckCircle size={12} />
                            {benefit}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Users List */}
            <div className={styles.usersList}>
              <h2>Alle Nutzer</h2>
              <div className={styles.usersTable}>
                <div className={styles.tableHeader}>
                  <div>Name</div>
                  <div>Level</div>
                  <div>Punkte</div>
                  <div>Reviews</div>
                  <div>Registriert</div>
                  <div>Aktionen</div>
                </div>
                {users
                  .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
                  .map(user => {
                    const userReviews = reviews.filter(r => r.userId === user.id);
                    
                    return (
                      <div key={user.id} className={styles.userRow}>
                        <div className={styles.userName}>
                          {user.name || 'Unbekannt'}
                        </div>
                        <div className={styles.userLevel}>
                          <span className={styles.levelIcon}>{user.level?.icon}</span>
                          <span>{user.level?.name}</span>
                        </div>
                        <div className={styles.userPoints}>
                          {user.totalPoints || 0}
                        </div>
                        <div className={styles.userReviews}>
                          {userReviews.length}
                        </div>
                        <div className={styles.userDate}>
                          {user.createdAt 
                            ? new Date(user.createdAt).toLocaleDateString('de-CH')
                            : '-'
                          }
                        </div>
                        <div className={styles.userActions}>
                          <button 
                            className={styles.actionButton}
                            title="Punkte hinzufügen"
                          >
                            <Plus size={16} />
                          </button>
                          <button 
                            className={styles.actionButton}
                            title="Details anzeigen"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* Points History View */}
        {activeView === 'points' && (
          <div className={styles.pointsView}>
            <h2>Punkte Historie</h2>
            <div className={styles.pointsStats}>
              <div className={styles.pointsStat}>
                <div className={styles.statIcon}>
                  <Gift size={24} />
                </div>
                <div className={styles.statInfo}>
                  <div className={styles.statValue}>{analytics.pointsDistributed}</div>
                  <div className={styles.statLabel}>Punkte vergeben</div>
                </div>
              </div>
              <div className={styles.pointsStat}>
                <div className={styles.statIcon}>
                  <ShoppingBag size={24} />
                </div>
                <div className={styles.statInfo}>
                  <div className={styles.statValue}>{analytics.redemptionsProcessed}</div>
                  <div className={styles.statLabel}>Einlösungen</div>
                </div>
              </div>
              <div className={styles.pointsStat}>
                <div className={styles.statIcon}>
                  <TrendingUp size={24} />
                </div>
                <div className={styles.statInfo}>
                  <div className={styles.statValue}>
                    {pointsHistory.length > 0
                      ? Math.round(analytics.pointsDistributed / pointsHistory.length)
                      : 0
                    }
                  </div>
                  <div className={styles.statLabel}>⌀ Punkte pro Transaktion</div>
                </div>
              </div>
            </div>
            
            <div className={styles.pointsHistory}>
              <div className={styles.historyHeader}>
                <h3>Letzte Transaktionen</h3>
                <select className={styles.filterSelect}>
                  <option value="all">Alle Typen</option>
                  <option value="award">Vergaben</option>
                  <option value="redemption">Einlösungen</option>
                </select>
              </div>
              
              <div className={styles.historyList}>
                {pointsHistory
                  .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                  .slice(0, 50)
                  .map(transaction => {
                    const user = users.find(u => u.id === transaction.userId);
                    
                    return (
                      <div key={transaction.id} className={styles.historyItem}>
                        <div className={styles.historyIcon}>
                          {transaction.type === 'award' ? (
                            <Gift size={20} color="#51CF66" />
                          ) : (
                            <ShoppingBag size={20} color="#FF6B6B" />
                          )}
                        </div>
                        <div className={styles.historyInfo}>
                          <div className={styles.historyUser}>
                            {user?.name || 'Unbekannt'}
                          </div>
                          <div className={styles.historyReason}>
                            {transaction.reason}
                          </div>
                        </div>
                        <div className={styles.historyPoints}>
                          {transaction.type === 'award' ? '+' : '-'}
                          {transaction.points} Punkte
                        </div>
                        <div className={styles.historyDate}>
                          {new Date(transaction.timestamp).toLocaleDateString('de-CH')}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MISSING IMPORTS
// ============================================================================
// Hinweis: Die folgenden Icons werden im Code verwendet, aber waren nicht in den 
// ursprünglichen Imports:
// - Plus (von lucide-react)
// - ShoppingBag (von lucide-react)

// Fügen Sie diese zu den Imports am Anfang der Datei hinzu:
import { Plus, ShoppingBag } from 'lucide-react';

export default ReviewTracker;