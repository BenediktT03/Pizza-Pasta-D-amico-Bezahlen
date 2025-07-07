/**
 * EATECH - Review Management
 * Version: 2.8.0
 * Description: Bewertungs-Verwaltung mit Sentiment-Analyse und Lazy Loading
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/admin/src/pages/Reviews/ReviewManagement.jsx
 * 
 * Features: Review monitoring, response management, sentiment analysis
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, update, remove } from 'firebase/database';
import { 
  Star, MessageSquare, ThumbsUp, ThumbsDown,
  TrendingUp, TrendingDown, AlertCircle, CheckCircle,
  Reply, Flag, Filter, Search,
  Download, BarChart3, Heart, Frown,
  Smile, Meh, User, Calendar,
  Eye, EyeOff, Archive, Send
} from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import { de } from 'date-fns/locale';
import styles from './ReviewManagement.module.css';

// Lazy loaded components
const ReviewCard = lazy(() => import('./components/ReviewCard'));
const ResponseModal = lazy(() => import('./components/ResponseModal'));
const SentimentAnalyzer = lazy(() => import('./components/SentimentAnalyzer'));
const ReviewAnalytics = lazy(() => import('./components/ReviewAnalytics'));
const BulkActions = lazy(() => import('./components/BulkActions'));

// Lazy loaded services
const ReviewService = lazy(() => import('../../services/ReviewService'));
const SentimentService = lazy(() => import('../../services/SentimentService'));
const NotificationService = lazy(() => import('../../services/NotificationService'));

const firebaseConfig = {
  apiKey: "AIzaSyDFBlgWE81iHnACVwOmaU0jL7FV0l_tRmU",
  authDomain: "eatech-foodtruck.firebaseapp.com",
  databaseURL: "https://eatech-foodtruck-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "eatech-foodtruck",
  storageBucket: "eatech-foodtruck.firebasestorage.app",
  messagingSenderId: "261222802445",
  appId: "1:261222802445:web:edde22580422fbced22144"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const LoadingSpinner = () => (
  <div className={styles.loadingContainer}>
    <div className={styles.spinner} />
  </div>
);

const RATING_FILTERS = {
  all: { name: 'Alle Bewertungen', min: 0, max: 5 },
  excellent: { name: '5 Sterne', min: 5, max: 5, color: '#10B981' },
  good: { name: '4 Sterne', min: 4, max: 4, color: '#22C55E' },
  average: { name: '3 Sterne', min: 3, max: 3, color: '#F59E0B' },
  poor: { name: '2 Sterne', min: 2, max: 2, color: '#EF4444' },
  terrible: { name: '1 Stern', min: 1, max: 1, color: '#DC2626' }
};

const SENTIMENT_TYPES = {
  positive: { name: 'Positiv', icon: Smile, color: '#10B981' },
  neutral: { name: 'Neutral', icon: Meh, color: '#F59E0B' },
  negative: { name: 'Negativ', icon: Frown, color: '#EF4444' }
};

const REVIEW_STATUS = {
  new: { name: 'Neu', color: '#3B82F6' },
  responded: { name: 'Beantwortet', color: '#10B981' },
  flagged: { name: 'Gemeldet', color: '#EF4444' },
  archived: { name: 'Archiviert', color: '#6B7280' }
};

const ReviewManagement = () => {
  const [reviews, setReviews] = useState([]);
  const [selectedReviews, setSelectedReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);
  const [showResponse, setShowResponse] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSentiment, setShowSentiment] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRating, setFilterRating] = useState('all');
  const [filterSentiment, setFilterSentiment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  const tenantId = 'demo-restaurant';

  // ============================================================================
  // FIREBASE DATA LOADING
  // ============================================================================
  useEffect(() => {
    const loadReviews = async () => {
      setLoading(true);
      try {
        const reviewsRef = ref(database, `tenants/${tenantId}/reviews`);
        onValue(reviewsRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const reviewsArray = Object.entries(data).map(([id, review]) => ({
              id,
              ...review,
              sentiment: analyzeSentiment(review.comment || ''),
              createdAt: review.createdAt || new Date().toISOString()
            }));
            setReviews(reviewsArray);
          } else {
            setReviews([]);
          }
        });
      } catch (error) {
        console.error('Error loading reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [tenantId]);

  // ============================================================================
  // SENTIMENT ANALYSIS
  // ============================================================================
  const analyzeSentiment = useCallback((text) => {
    // Simple sentiment analysis - in production use proper ML service
    const positiveWords = ['gut', 'toll', 'super', 'fantastisch', 'lecker', 'freundlich', 'schnell'];
    const negativeWords = ['schlecht', 'furchtbar', 'kalt', 'langsam', 'unfreundlich', 'teuer'];
    
    const words = text.toLowerCase().split(' ');
    let score = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) score += 1;
      if (negativeWords.includes(word)) score -= 1;
    });
    
    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  }, []);

  // ============================================================================
  // FILTERED AND SORTED DATA
  // ============================================================================
  const filteredAndSortedReviews = useMemo(() => {
    let filtered = reviews.filter(review => {
      const matchesSearch = review.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           review.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const ratingFilter = RATING_FILTERS[filterRating];
      const matchesRating = filterRating === 'all' || 
                           (review.rating >= ratingFilter.min && review.rating <= ratingFilter.max);
      
      const matchesSentiment = filterSentiment === 'all' || review.sentiment === filterSentiment;
      const matchesStatus = filterStatus === 'all' || review.status === filterStatus;
      
      const reviewDate = parseISO(review.createdAt);
      const startDate = parseISO(dateRange.start);
      const endDate = parseISO(dateRange.end);
      const matchesDate = reviewDate >= startDate && reviewDate <= endDate;
      
      return matchesSearch && matchesRating && matchesSentiment && matchesStatus && matchesDate;
    });

    // Sort reviews
    filtered.sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'date':
          compareValue = new Date(a.createdAt) - new Date(b.createdAt);
          break;
        case 'rating':
          compareValue = a.rating - b.rating;
          break;
        case 'sentiment':
          const sentimentOrder = { positive: 3, neutral: 2, negative: 1 };
          compareValue = sentimentOrder[a.sentiment] - sentimentOrder[b.sentiment];
          break;
        default:
          compareValue = 0;
      }
      
      return sortOrder === 'desc' ? -compareValue : compareValue;
    });

    return filtered;
  }, [reviews, searchTerm, filterRating, filterSentiment, filterStatus, dateRange, sortBy, sortOrder]);

  // ============================================================================
  // CALCULATED STATS
  // ============================================================================
  const reviewStats = useMemo(() => {
    const totalReviews = reviews.length;
    const avgRating = totalReviews > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews 
      : 0;
    
    const sentimentCounts = reviews.reduce((acc, review) => {
      acc[review.sentiment] = (acc[review.sentiment] || 0) + 1;
      return acc;
    }, {});

    const responseRate = totalReviews > 0
      ? (reviews.filter(r => r.status === 'responded').length / totalReviews) * 100
      : 0;

    const recentReviews = reviews.filter(r => {
      const reviewDate = parseISO(r.createdAt);
      const weekAgo = subDays(new Date(), 7);
      return reviewDate >= weekAgo;
    }).length;

    return {
      totalReviews,
      avgRating: avgRating.toFixed(1),
      positive: sentimentCounts.positive || 0,
      neutral: sentimentCounts.neutral || 0,
      negative: sentimentCounts.negative || 0,
      responseRate: responseRate.toFixed(1),
      recentReviews
    };
  }, [reviews]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  const handleResponseSubmit = useCallback(async (reviewId, responseText) => {
    try {
      const reviewRef = ref(database, `tenants/${tenantId}/reviews/${reviewId}`);
      await update(reviewRef, {
        response: responseText,
        respondedAt: new Date().toISOString(),
        status: 'responded'
      });
      setShowResponse(false);
      setSelectedReview(null);
    } catch (error) {
      console.error('Error submitting response:', error);
    }
  }, [tenantId]);

  const handleReviewFlag = useCallback(async (reviewId) => {
    try {
      const reviewRef = ref(database, `tenants/${tenantId}/reviews/${reviewId}`);
      await update(reviewRef, {
        status: 'flagged',
        flaggedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error flagging review:', error);
    }
  }, [tenantId]);

  const handleReviewArchive = useCallback(async (reviewId) => {
    try {
      const reviewRef = ref(database, `tenants/${tenantId}/reviews/${reviewId}`);
      await update(reviewRef, {
        status: 'archived',
        archivedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error archiving review:', error);
    }
  }, [tenantId]);

  const handleBulkAction = useCallback(async (action, reviewIds) => {
    try {
      const updates = {};
      const timestamp = new Date().toISOString();
      
      reviewIds.forEach(reviewId => {
        updates[`tenants/${tenantId}/reviews/${reviewId}/status`] = action;
        updates[`tenants/${tenantId}/reviews/${reviewId}/${action}At`] = timestamp;
      });
      
      await update(ref(database), updates);
      setSelectedReviews([]);
      setShowBulkActions(false);
    } catch (error) {
      console.error('Error performing bulk action:', error);
    }
  }, [tenantId]);

  const handleExportReviews = useCallback(() => {
    const csvData = filteredAndSortedReviews.map(review => ({
      Datum: format(parseISO(review.createdAt), 'dd.MM.yyyy HH:mm', { locale: de }),
      Kunde: review.customerName || 'Anonym',
      Bewertung: review.rating,
      Kommentar: review.comment || '',
      Sentiment: SENTIMENT_TYPES[review.sentiment]?.name || review.sentiment,
      Status: REVIEW_STATUS[review.status]?.name || review.status,
      Antwort: review.response || ''
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reviews-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredAndSortedReviews]);

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  const renderStatsCards = () => {
    return (
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <MessageSquare size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>{reviewStats.totalReviews}</h3>
            <p>Gesamt Bewertungen</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Star size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>{reviewStats.avgRating}</h3>
            <p>Ø Bewertung</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <ThumbsUp size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>{reviewStats.positive}</h3>
            <p>Positive</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Reply size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>{reviewStats.responseRate}%</h3>
            <p>Antwortrate</p>
          </div>
        </div>
      </div>
    );
  };

  const renderRatingStars = (rating) => {
    return (
      <div className={styles.ratingStars}>
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            size={16}
            className={star <= rating ? styles.starFilled : styles.starEmpty}
          />
        ))}
      </div>
    );
  };

  const renderReviewItem = (review) => {
    const sentiment = SENTIMENT_TYPES[review.sentiment] || SENTIMENT_TYPES.neutral;
    const status = REVIEW_STATUS[review.status] || REVIEW_STATUS.new;
    const SentimentIcon = sentiment.icon;

    return (
      <div 
        key={review.id} 
        className={`${styles.reviewItem} ${selectedReviews.includes(review.id) ? styles.selected : ''}`}
      >
        <div className={styles.reviewHeader}>
          <div className={styles.reviewMeta}>
            <input
              type="checkbox"
              checked={selectedReviews.includes(review.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedReviews(prev => [...prev, review.id]);
                } else {
                  setSelectedReviews(prev => prev.filter(id => id !== review.id));
                }
              }}
            />
            <div className={styles.customerInfo}>
              <User size={16} />
              <span>{review.customerName || 'Anonym'}</span>
            </div>
            <div className={styles.reviewDate}>
              <Calendar size={16} />
              <span>{format(parseISO(review.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}</span>
            </div>
          </div>
          <div className={styles.reviewActions}>
            <button
              onClick={() => {
                setSelectedReview(review);
                setShowResponse(true);
              }}
              className={styles.actionButton}
              disabled={review.status === 'responded'}
            >
              <Reply size={16} />
            </button>
            <button
              onClick={() => handleReviewFlag(review.id)}
              className={styles.actionButton}
            >
              <Flag size={16} />
            </button>
            <button
              onClick={() => handleReviewArchive(review.id)}
              className={styles.actionButton}
            >
              <Archive size={16} />
            </button>
          </div>
        </div>

        <div className={styles.reviewContent}>
          <div className={styles.reviewRating}>
            {renderRatingStars(review.rating)}
            <div 
              className={styles.sentimentBadge}
              style={{ backgroundColor: sentiment.color + '20', color: sentiment.color }}
            >
              <SentimentIcon size={14} />
              <span>{sentiment.name}</span>
            </div>
          </div>
          
          <div className={styles.reviewComment}>
            <p>{review.comment}</p>
          </div>

          {review.response && (
            <div className={styles.reviewResponse}>
              <div className={styles.responseHeader}>
                <Reply size={16} />
                <span>Antwort:</span>
              </div>
              <p>{review.response}</p>
            </div>
          )}
        </div>

        <div className={styles.reviewFooter}>
          <div 
            className={styles.reviewStatus}
            style={{ backgroundColor: status.color + '20', color: status.color }}
          >
            {status.name}
          </div>
          {review.orderNumber && (
            <div className={styles.orderLink}>
              Bestellung: #{review.orderNumber}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className={styles.reviewManagement}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Review Management</h1>
          <p>Verwalten und beantworten Sie Kundenbewertungen</p>
        </div>
        <div className={styles.headerActions}>
          {selectedReviews.length > 0 && (
            <button
              onClick={() => setShowBulkActions(true)}
              className={styles.secondaryButton}
            >
              <CheckCircle size={20} />
              {selectedReviews.length} ausgewählt
            </button>
          )}
          <button
            onClick={() => setShowSentiment(true)}
            className={styles.secondaryButton}
          >
            <Smile size={20} />
            Sentiment
          </button>
          <button
            onClick={() => setShowAnalytics(true)}
            className={styles.secondaryButton}
          >
            <BarChart3 size={20} />
            Analytics
          </button>
          <button
            onClick={handleExportReviews}
            className={styles.secondaryButton}
          >
            <Download size={20} />
            Export
          </button>
        </div>
      </div>

      {/* Stats */}
      {renderStatsCards()}

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.searchAndFilter}>
          <div className={styles.searchBox}>
            <Search size={20} />
            <input
              type="text"
              placeholder="Bewertungen suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className={styles.filters}>
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
            >
              {Object.entries(RATING_FILTERS).map(([key, filter]) => (
                <option key={key} value={key}>{filter.name}</option>
              ))}
            </select>
            
            <select
              value={filterSentiment}
              onChange={(e) => setFilterSentiment(e.target.value)}
            >
              <option value="all">Alle Sentiments</option>
              {Object.entries(SENTIMENT_TYPES).map(([key, sentiment]) => (
                <option key={key} value={key}>{sentiment.name}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Alle Status</option>
              {Object.entries(REVIEW_STATUS).map(([key, status]) => (
                <option key={key} value={key}>{status.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.dateRange}>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
          />
          <span>bis</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
          />
        </div>

        <div className={styles.sortControls}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date">Nach Datum</option>
            <option value="rating">Nach Bewertung</option>
            <option value="sentiment">Nach Sentiment</option>
          </select>
          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className={styles.sortButton}
          >
            {sortOrder === 'asc' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.reviewsList}>
          {filteredAndSortedReviews.length > 0 ? (
            filteredAndSortedReviews.map(renderReviewItem)
          ) : (
            <div className={styles.emptyState}>
              <MessageSquare size={48} />
              <h3>Keine Bewertungen gefunden</h3>
              <p>Passen Sie die Filter an oder warten Sie auf neue Bewertungen</p>
            </div>
          )}
        </div>
      </div>

      {/* Lazy Loaded Modals */}
      {showResponse && selectedReview && (
        <Suspense fallback={<LoadingSpinner />}>
          <ResponseModal
            review={selectedReview}
            onSubmit={handleResponseSubmit}
            onClose={() => {
              setShowResponse(false);
              setSelectedReview(null);
            }}
          />
        </Suspense>
      )}

      {showAnalytics && (
        <Suspense fallback={<LoadingSpinner />}>
          <ReviewAnalytics
            reviews={reviews}
            stats={reviewStats}
            onClose={() => setShowAnalytics(false)}
          />
        </Suspense>
      )}

      {showSentiment && (
        <Suspense fallback={<LoadingSpinner />}>
          <SentimentAnalyzer
            reviews={reviews}
            onClose={() => setShowSentiment(false)}
          />
        </Suspense>
      )}

      {showBulkActions && (
        <Suspense fallback={<LoadingSpinner />}>
          <BulkActions
            selectedReviews={selectedReviews}
            onAction={handleBulkAction}
            onClose={() => setShowBulkActions(false)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default ReviewManagement;