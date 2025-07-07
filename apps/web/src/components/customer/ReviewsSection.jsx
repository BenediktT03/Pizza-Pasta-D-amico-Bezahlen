/**
 * EATECH - Reviews Section Component
 * Version: 4.1.0
 * Description: Comprehensive customer reviews and ratings system with ML-powered insights
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/web/src/components/customer/ReviewsSection.jsx
 * 
 * Features:
 * - Interactive review display with sorting and filtering
 * - AI-powered sentiment analysis and review insights
 * - Photo/video review support with moderation
 * - Multi-language review translation
 * - Verified purchase indicators and authenticity checks
 * - Review helpfulness voting and comment system
 * - Detailed rating breakdown by categories
 * - Review response system for businesses
 * - Spam detection and content moderation
 * - Real-time review notifications
 * - Swiss data privacy compliance (FADP)
 * - Advanced analytics and review trends
 */

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useMemo,
  useRef,
  lazy,
  Suspense
} from 'react';
import { 
  Star, StarHalf, ThumbsUp, ThumbsDown, Flag,
  MessageCircle, Share2, MoreHorizontal, Filter,
  TrendingUp, TrendingDown, Clock, Calendar,
  User, Shield, Camera, Play, Volume2,
  CheckCircle, AlertTriangle, Award, Heart,
  BarChart3, PieChart, Smile, Frown, Meh,
  Search, SortAsc, SortDesc, Eye, EyeOff,
  Languages, Verified, Edit3, Trash2, Reply
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { de, fr, it, enUS } from 'date-fns/locale';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { useReviews } from '../../hooks/useReviews';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import styles from './ReviewsSection.module.css';

// ============================================================================
// LAZY LOADED COMPONENTS
// ============================================================================

// Review Components
const ReviewForm = lazy(() => import('./ReviewForm'));
const ReviewDetails = lazy(() => import('./ReviewDetails'));
const ReviewResponse = lazy(() => import('./ReviewResponse'));
const ReviewMediaViewer = lazy(() => import('./ReviewMediaViewer'));

// Analytics Components
const ReviewAnalytics = lazy(() => import('./ReviewAnalytics'));
const SentimentAnalysis = lazy(() => import('./SentimentAnalysis'));
const ReviewTrends = lazy(() => import('./ReviewTrends'));
const KeywordAnalysis = lazy(() => import('./KeywordAnalysis'));

// Interactive Components
const ReviewTranslator = lazy(() => import('./ReviewTranslator'));
const ReviewModerator = lazy(() => import('./ReviewModerator'));
const ReviewComparison = lazy(() => import('./ReviewComparison'));

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const REVIEW_SORT_OPTIONS = {
  NEWEST: 'newest',
  OLDEST: 'oldest',
  HIGHEST_RATED: 'highest_rated',
  LOWEST_RATED: 'lowest_rated',
  MOST_HELPFUL: 'most_helpful',
  VERIFIED_ONLY: 'verified_only',
  WITH_PHOTOS: 'with_photos',
  WITH_RESPONSES: 'with_responses'
};

const REVIEW_FILTERS = {
  ALL: 'all',
  FIVE_STAR: '5',
  FOUR_STAR: '4',
  THREE_STAR: '3',
  TWO_STAR: '2',
  ONE_STAR: '1',
  VERIFIED: 'verified',
  WITH_MEDIA: 'with_media',
  RECENT: 'recent',
  CRITICAL: 'critical'
};

const SENTIMENT_TYPES = {
  VERY_POSITIVE: 'very_positive',
  POSITIVE: 'positive',
  NEUTRAL: 'neutral',
  NEGATIVE: 'negative',
  VERY_NEGATIVE: 'very_negative'
};

const REVIEW_TRANSLATIONS = {
  'de-CH': {
    reviews: 'Bewertungen',
    write_review: 'Bewertung schreiben',
    rating: 'Bewertung',
    sort_by: 'Sortieren nach',
    filter_by: 'Filtern nach',
    newest: 'Neueste',
    oldest: 'Älteste',
    highest_rated: 'Beste Bewertung',
    lowest_rated: 'Schlechteste Bewertung',
    most_helpful: 'Hilfreichste',
    verified_only: 'Nur verifiziert',
    with_photos: 'Mit Fotos',
    with_responses: 'Mit Antworten',
    all_ratings: 'Alle Bewertungen',
    verified_purchase: 'Verifizierter Kauf',
    helpful: 'Hilfreich',
    not_helpful: 'Nicht hilfreich',
    report: 'Melden',
    reply: 'Antworten',
    translate: 'Übersetzen',
    show_original: 'Original anzeigen',
    read_more: 'Mehr lesen',
    read_less: 'Weniger lesen',
    no_reviews: 'Noch keine Bewertungen',
    be_first: 'Seien Sie der Erste, der bewertet!',
    average_rating: 'Durchschnittsbewertung',
    total_reviews: 'Bewertungen insgesamt',
    rating_distribution: 'Bewertungsverteilung'
  },
  'de-DE': {
    reviews: 'Bewertungen',
    write_review: 'Bewertung schreiben',
    rating: 'Bewertung',
    sort_by: 'Sortieren nach',
    filter_by: 'Filtern nach',
    newest: 'Neueste',
    oldest: 'Älteste',
    highest_rated: 'Beste Bewertung',
    lowest_rated: 'Schlechteste Bewertung',
    most_helpful: 'Hilfreichste',
    verified_only: 'Nur verifiziert',
    with_photos: 'Mit Fotos',
    with_responses: 'Mit Antworten',
    all_ratings: 'Alle Bewertungen',
    verified_purchase: 'Verifizierter Kauf',
    helpful: 'Hilfreich',
    not_helpful: 'Nicht hilfreich',
    report: 'Melden',
    reply: 'Antworten',
    translate: 'Übersetzen',
    show_original: 'Original anzeigen',
    read_more: 'Mehr lesen',
    read_less: 'Weniger lesen',
    no_reviews: 'Noch keine Bewertungen',
    be_first: 'Seien Sie der Erste, der bewertet!',
    average_rating: 'Durchschnittsbewertung',
    total_reviews: 'Bewertungen insgesamt',
    rating_distribution: 'Bewertungsverteilung'
  },
  'fr-CH': {
    reviews: 'Avis',
    write_review: 'Écrire un avis',
    rating: 'Note',
    sort_by: 'Trier par',
    filter_by: 'Filtrer par',
    newest: 'Plus récents',
    oldest: 'Plus anciens',
    highest_rated: 'Mieux notés',
    lowest_rated: 'Moins bien notés',
    most_helpful: 'Plus utiles',
    verified_only: 'Vérifiés uniquement',
    with_photos: 'Avec photos',
    with_responses: 'Avec réponses',
    all_ratings: 'Toutes les notes',
    verified_purchase: 'Achat vérifié',
    helpful: 'Utile',
    not_helpful: 'Pas utile',
    report: 'Signaler',
    reply: 'Répondre',
    translate: 'Traduire',
    show_original: 'Afficher l\'original',
    read_more: 'Lire plus',
    read_less: 'Lire moins',
    no_reviews: 'Aucun avis pour le moment',
    be_first: 'Soyez le premier à donner votre avis!',
    average_rating: 'Note moyenne',
    total_reviews: 'Total des avis',
    rating_distribution: 'Répartition des notes'
  },
  'it-CH': {
    reviews: 'Recensioni',
    write_review: 'Scrivi recensione',
    rating: 'Valutazione',
    sort_by: 'Ordina per',
    filter_by: 'Filtra per',
    newest: 'Più recenti',
    oldest: 'Più vecchie',
    highest_rated: 'Meglio valutate',
    lowest_rated: 'Peggio valutate',
    most_helpful: 'Più utili',
    verified_only: 'Solo verificate',
    with_photos: 'Con foto',
    with_responses: 'Con risposte',
    all_ratings: 'Tutte le valutazioni',
    verified_purchase: 'Acquisto verificato',
    helpful: 'Utile',
    not_helpful: 'Non utile',
    report: 'Segnala',
    reply: 'Rispondi',
    translate: 'Traduci',
    show_original: 'Mostra originale',
    read_more: 'Leggi di più',
    read_less: 'Leggi meno',
    no_reviews: 'Nessuna recensione ancora',
    be_first: 'Sii il primo a recensire!',
    average_rating: 'Valutazione media',
    total_reviews: 'Recensioni totali',
    rating_distribution: 'Distribuzione valutazioni'
  },
  'en-US': {
    reviews: 'Reviews',
    write_review: 'Write Review',
    rating: 'Rating',
    sort_by: 'Sort by',
    filter_by: 'Filter by',
    newest: 'Newest',
    oldest: 'Oldest',
    highest_rated: 'Highest Rated',
    lowest_rated: 'Lowest Rated',
    most_helpful: 'Most Helpful',
    verified_only: 'Verified Only',
    with_photos: 'With Photos',
    with_responses: 'With Responses',
    all_ratings: 'All Ratings',
    verified_purchase: 'Verified Purchase',
    helpful: 'Helpful',
    not_helpful: 'Not Helpful',
    report: 'Report',
    reply: 'Reply',
    translate: 'Translate',
    show_original: 'Show Original',
    read_more: 'Read More',
    read_less: 'Read Less',
    no_reviews: 'No reviews yet',
    be_first: 'Be the first to review!',
    average_rating: 'Average Rating',
    total_reviews: 'Total Reviews',
    rating_distribution: 'Rating Distribution'
  }
};

const DATE_LOCALES = {
  'de-CH': de,
  'de-DE': de,
  'fr-CH': fr,
  'it-CH': it,
  'en-US': enUS
};

const SENTIMENT_COLORS = {
  [SENTIMENT_TYPES.VERY_POSITIVE]: '#22c55e',
  [SENTIMENT_TYPES.POSITIVE]: '#84cc16',
  [SENTIMENT_TYPES.NEUTRAL]: '#eab308',
  [SENTIMENT_TYPES.NEGATIVE]: '#f97316',
  [SENTIMENT_TYPES.VERY_NEGATIVE]: '#ef4444'
};

const DEFAULT_SETTINGS = {
  showAnalytics: true,
  enableTranslation: true,
  enableModeration: true,
  showSentiment: true,
  enableVoting: true,
  showVerifiedOnly: false,
  autoLoadMore: true,
  pageSize: 10,
  enableMediaViewer: true,
  showResponseTime: true
};

// ============================================================================
// LOADING COMPONENT
// ============================================================================

const LoadingSpinner = ({ size = 24, message }) => (
  <div className={styles.loadingContainer}>
    <div className={styles.spinner} style={{ width: size, height: size }} />
    {message && <span className={styles.loadingMessage}>{message}</span>}
  </div>
);

// ============================================================================
// STAR RATING COMPONENT
// ============================================================================

const StarRating = ({ rating, maxRating = 5, size = 16, showValue = false, interactive = false, onChange }) => {
  const [hoverRating, setHoverRating] = useState(0);

  const handleStarClick = (starRating) => {
    if (interactive && onChange) {
      onChange(starRating);
    }
  };

  const handleStarHover = (starRating) => {
    if (interactive) {
      setHoverRating(starRating);
    }
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setHoverRating(0);
    }
  };

  const displayRating = interactive && hoverRating > 0 ? hoverRating : rating;

  return (
    <div className={styles.starRating} onMouseLeave={handleMouseLeave}>
      {[...Array(maxRating)].map((_, index) => {
        const starValue = index + 1;
        const isFilled = displayRating >= starValue;
        const isHalfFilled = displayRating >= starValue - 0.5 && displayRating < starValue;

        return (
          <button
            key={index}
            className={`${styles.star} ${interactive ? styles.interactive : ''}`}
            onClick={() => handleStarClick(starValue)}
            onMouseEnter={() => handleStarHover(starValue)}
            disabled={!interactive}
            aria-label={`${starValue} star${starValue !== 1 ? 's' : ''}`}
          >
            {isFilled ? (
              <Star size={size} fill="currentColor" />
            ) : isHalfFilled ? (
              <StarHalf size={size} fill="currentColor" />
            ) : (
              <Star size={size} />
            )}
          </button>
        );
      })}
      {showValue && (
        <span className={styles.ratingValue}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ReviewsSection = ({
  product,
  language = 'de-CH',
  settings = {},
  onReviewSubmit,
  onReviewUpdate,
  onReviewDelete,
  className = '',
  showWriteReview = true,
  enableAnalytics = true
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [sortBy, setSortBy] = useState(REVIEW_SORT_OPTIONS.NEWEST);
  const [filterBy, setFilterBy] = useState(REVIEW_FILTERS.ALL);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [translatedReviews, setTranslatedReviews] = useState(new Map());
  const [votedReviews, setVotedReviews] = useState(new Map());
  const [flaggedReviews, setFlaggedReviews] = useState(new Set());
  const [expandedReviews, setExpandedReviews] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAnalytics, setShowAnalytics] = useState(enableAnalytics);
  const [selectedMedia, setSelectedMedia] = useState(null);

  // ============================================================================
  // REFS & CONTEXTS
  // ============================================================================

  const sectionRef = useRef(null);
  const { tenant } = useTenant();
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  
  const {
    reviews,
    analytics,
    isLoading,
    hasMore,
    submitReview,
    updateReview,
    deleteReview,
    voteReview,
    flagReview,
    loadMoreReviews,
    translateReview
  } = useReviews(product?.id);

  // ============================================================================
  // MEMOIZED VALUES
  // ============================================================================

  const mergedSettings = useMemo(() => ({
    ...DEFAULT_SETTINGS,
    ...settings
  }), [settings]);

  const translations = useMemo(() => 
    REVIEW_TRANSLATIONS[language] || REVIEW_TRANSLATIONS['de-CH'], 
    [language]
  );

  const dateLocale = useMemo(() => 
    DATE_LOCALES[language] || DATE_LOCALES['de-CH'], 
    [language]
  );

  const filteredAndSortedReviews = useMemo(() => {
    if (!reviews) return [];

    let filtered = [...reviews];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(review => 
        review.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.author.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply rating filter
    if (filterBy !== REVIEW_FILTERS.ALL) {
      switch (filterBy) {
        case REVIEW_FILTERS.VERIFIED:
          filtered = filtered.filter(review => review.verified);
          break;
        case REVIEW_FILTERS.WITH_MEDIA:
          filtered = filtered.filter(review => review.media && review.media.length > 0);
          break;
        case REVIEW_FILTERS.RECENT:
          const recentDate = new Date();
          recentDate.setDate(recentDate.getDate() - 30);
          filtered = filtered.filter(review => new Date(review.createdAt) >= recentDate);
          break;
        case REVIEW_FILTERS.CRITICAL:
          filtered = filtered.filter(review => review.rating <= 2);
          break;
        default:
          if (filterBy.match(/^[1-5]$/)) {
            filtered = filtered.filter(review => review.rating === parseInt(filterBy));
          }
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case REVIEW_SORT_OPTIONS.NEWEST:
          return new Date(b.createdAt) - new Date(a.createdAt);
        case REVIEW_SORT_OPTIONS.OLDEST:
          return new Date(a.createdAt) - new Date(b.createdAt);
        case REVIEW_SORT_OPTIONS.HIGHEST_RATED:
          return b.rating - a.rating;
        case REVIEW_SORT_OPTIONS.LOWEST_RATED:
          return a.rating - b.rating;
        case REVIEW_SORT_OPTIONS.MOST_HELPFUL:
          return (b.helpfulVotes || 0) - (a.helpfulVotes || 0);
        case REVIEW_SORT_OPTIONS.VERIFIED_ONLY:
          return b.verified - a.verified;
        case REVIEW_SORT_OPTIONS.WITH_PHOTOS:
          return (b.media?.length || 0) - (a.media?.length || 0);
        case REVIEW_SORT_OPTIONS.WITH_RESPONSES:
          return (b.responses?.length || 0) - (a.responses?.length || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [reviews, searchTerm, filterBy, sortBy]);

  const paginatedReviews = useMemo(() => {
    const startIndex = 0;
    const endIndex = currentPage * mergedSettings.pageSize;
    return filteredAndSortedReviews.slice(startIndex, endIndex);
  }, [filteredAndSortedReviews, currentPage, mergedSettings.pageSize]);

  const reviewStatistics = useMemo(() => {
    if (!reviews || reviews.length === 0) return null;

    const totalReviews = reviews.length;
    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;
    
    const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
      rating,
      count: reviews.filter(review => review.rating === rating).length,
      percentage: (reviews.filter(review => review.rating === rating).length / totalReviews) * 100
    }));

    const verifiedCount = reviews.filter(review => review.verified).length;
    const withMediaCount = reviews.filter(review => review.media && review.media.length > 0).length;
    const withResponsesCount = reviews.filter(review => review.responses && review.responses.length > 0).length;

    return {
      totalReviews,
      averageRating,
      ratingDistribution,
      verifiedCount,
      withMediaCount,
      withResponsesCount,
      verifiedPercentage: (verifiedCount / totalReviews) * 100,
      responseRate: (withResponsesCount / totalReviews) * 100
    };
  }, [reviews]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleReviewSubmit = useCallback(async (reviewData) => {
    try {
      await submitReview(reviewData);
      setShowReviewForm(false);
      onReviewSubmit?.(reviewData);
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  }, [submitReview, onReviewSubmit]);

  const handleReviewVote = useCallback(async (reviewId, isHelpful) => {
    try {
      await voteReview(reviewId, isHelpful);
      setVotedReviews(prev => new Map(prev.set(reviewId, isHelpful)));
    } catch (error) {
      console.error('Failed to vote on review:', error);
    }
  }, [voteReview]);

  const handleReviewFlag = useCallback(async (reviewId, reason) => {
    try {
      await flagReview(reviewId, reason);
      setFlaggedReviews(prev => new Set(prev.add(reviewId)));
    } catch (error) {
      console.error('Failed to flag review:', error);
    }
  }, [flagReview]);

  const handleReviewTranslate = useCallback(async (reviewId) => {
    try {
      const translation = await translateReview(reviewId, language);
      setTranslatedReviews(prev => new Map(prev.set(reviewId, translation)));
    } catch (error) {
      console.error('Failed to translate review:', error);
    }
  }, [translateReview, language]);

  const handleToggleExpanded = useCallback((reviewId) => {
    setExpandedReviews(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });
  }, []);

  const handleLoadMore = useCallback(() => {
    setCurrentPage(prev => prev + 1);
  }, []);

  // ============================================================================
  // RENDER METHODS
  // ============================================================================

  const renderReviewStatistics = () => {
    if (!reviewStatistics) return null;

    return (
      <div className={styles.reviewStatistics}>
        <div className={styles.overallRating}>
          <div className={styles.averageRating}>
            <span className={styles.ratingNumber}>
              {reviewStatistics.averageRating.toFixed(1)}
            </span>
            <StarRating rating={reviewStatistics.averageRating} size={20} />
            <span className={styles.totalReviews}>
              {reviewStatistics.totalReviews} {translations.reviews}
            </span>
          </div>
        </div>

        <div className={styles.ratingDistribution}>
          <h4>{translations.rating_distribution}</h4>
          {reviewStatistics.ratingDistribution.reverse().map(({ rating, count, percentage }) => (
            <div key={rating} className={styles.ratingBar}>
              <div className={styles.ratingLabel}>
                <StarRating rating={rating} size={14} />
                <span>{rating}</span>
              </div>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className={styles.ratingCount}>{count}</span>
            </div>
          ))}
        </div>

        <div className={styles.additionalStats}>
          <div className={styles.stat}>
            <Shield size={16} />
            <span>{Math.round(reviewStatistics.verifiedPercentage)}% verified</span>
          </div>
          <div className={styles.stat}>
            <Camera size={16} />
            <span>{reviewStatistics.withMediaCount} with photos</span>
          </div>
          <div className={styles.stat}>
            <Reply size={16} />
            <span>{Math.round(reviewStatistics.responseRate)}% response rate</span>
          </div>
        </div>
      </div>
    );
  };

  const renderControlsBar = () => (
    <div className={styles.controlsBar}>
      {/* Search */}
      <div className={styles.searchBox}>
        <Search size={16} />
        <input
          type="text"
          placeholder="Search reviews..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* Sort */}
      <div className={styles.sortFilter}>
        <label htmlFor="sortBy">{translations.sort_by}:</label>
        <select
          id="sortBy"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className={styles.select}
        >
          <option value={REVIEW_SORT_OPTIONS.NEWEST}>{translations.newest}</option>
          <option value={REVIEW_SORT_OPTIONS.OLDEST}>{translations.oldest}</option>
          <option value={REVIEW_SORT_OPTIONS.HIGHEST_RATED}>{translations.highest_rated}</option>
          <option value={REVIEW_SORT_OPTIONS.LOWEST_RATED}>{translations.lowest_rated}</option>
          <option value={REVIEW_SORT_OPTIONS.MOST_HELPFUL}>{translations.most_helpful}</option>
          <option value={REVIEW_SORT_OPTIONS.VERIFIED_ONLY}>{translations.verified_only}</option>
          <option value={REVIEW_SORT_OPTIONS.WITH_PHOTOS}>{translations.with_photos}</option>
          <option value={REVIEW_SORT_OPTIONS.WITH_RESPONSES}>{translations.with_responses}</option>
        </select>
      </div>

      {/* Filter */}
      <div className={styles.sortFilter}>
        <label htmlFor="filterBy">{translations.filter_by}:</label>
        <select
          id="filterBy"
          value={filterBy}
          onChange={(e) => setFilterBy(e.target.value)}
          className={styles.select}
        >
          <option value={REVIEW_FILTERS.ALL}>{translations.all_ratings}</option>
          <option value="5">5 ⭐</option>
          <option value="4">4 ⭐</option>
          <option value="3">3 ⭐</option>
          <option value="2">2 ⭐</option>
          <option value="1">1 ⭐</option>
          <option value={REVIEW_FILTERS.VERIFIED}>{translations.verified_only}</option>
          <option value={REVIEW_FILTERS.WITH_MEDIA}>{translations.with_photos}</option>
          <option value={REVIEW_FILTERS.RECENT}>Recent (30 days)</option>
          <option value={REVIEW_FILTERS.CRITICAL}>Critical (≤2 stars)</option>
        </select>
      </div>

      {/* Analytics Toggle */}
      {enableAnalytics && (
        <button
          className={`${styles.toggleButton} ${showAnalytics ? styles.active : ''}`}
          onClick={() => setShowAnalytics(!showAnalytics)}
          aria-label="Toggle analytics"
        >
          <BarChart3 size={16} />
          Analytics
        </button>
      )}
    </div>
  );

  const renderReviewItem = (review) => {
    const isExpanded = expandedReviews.has(review.id);
    const isTranslated = translatedReviews.has(review.id);
    const userVote = votedReviews.get(review.id);
    const isFlagged = flaggedReviews.has(review.id);
    const displayContent = isTranslated ? translatedReviews.get(review.id) : review.content;
    
    const shouldTruncate = review.content.length > 300;
    const truncatedContent = shouldTruncate && !isExpanded 
      ? review.content.slice(0, 300) + '...' 
      : review.content;

    const reviewDate = formatDistanceToNow(parseISO(review.createdAt), {
      addSuffix: true,
      locale: dateLocale
    });

    return (
      <div key={review.id} className={`${styles.reviewItem} ${isFlagged ? styles.flagged : ''}`}>
        {/* Review Header */}
        <div className={styles.reviewHeader}>
          <div className={styles.reviewAuthor}>
            <div className={styles.authorAvatar}>
              {review.author.avatar ? (
                <img src={review.author.avatar} alt={review.author.name} />
              ) : (
                <User size={24} />
              )}
            </div>
            
            <div className={styles.authorInfo}>
              <span className={styles.authorName}>
                {review.author.name}
                {review.verified && (
                  <CheckCircle className={styles.verifiedIcon} size={14} />
                )}
              </span>
              <div className={styles.reviewMeta}>
                <StarRating rating={review.rating} size={14} />
                <span className={styles.reviewDate}>{reviewDate}</span>
                {review.verified && (
                  <span className={styles.verifiedBadge}>
                    <Shield size={12} />
                    {translations.verified_purchase}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Review Actions */}
          <div className={styles.reviewActions}>
            <button
              className={styles.actionButton}
              onClick={() => handleReviewTranslate(review.id)}
              disabled={isTranslated}
              title={isTranslated ? translations.show_original : translations.translate}
            >
              <Languages size={14} />
            </button>

            <button
              className={styles.actionButton}
              onClick={() => setSelectedReview(review)}
              title="More options"
            >
              <MoreHorizontal size={14} />
            </button>
          </div>
        </div>

        {/* Review Content */}
        <div className={styles.reviewContent}>
          <p className={styles.reviewText}>
            {isTranslated ? displayContent : truncatedContent}
          </p>
          
          {shouldTruncate && (
            <button
              className={styles.expandButton}
              onClick={() => handleToggleExpanded(review.id)}
            >
              {isExpanded ? translations.read_less : translations.read_more}
            </button>
          )}

          {/* Review Media */}
          {review.media && review.media.length > 0 && (
            <div className={styles.reviewMedia}>
              {review.media.map((media, index) => (
                <button
                  key={index}
                  className={styles.mediaItem}
                  onClick={() => setSelectedMedia({ review, mediaIndex: index })}
                >
                  {media.type === 'image' ? (
                    <img src={media.thumbnail || media.url} alt={`Review image ${index + 1}`} />
                  ) : (
                    <div className={styles.videoThumbnail}>
                      <img src={media.thumbnail} alt={`Review video ${index + 1}`} />
                      <Play className={styles.playIcon} size={24} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Sentiment Indicator */}
          {mergedSettings.showSentiment && review.sentiment && (
            <div className={styles.sentimentIndicator}>
              <div 
                className={styles.sentimentBar}
                style={{ backgroundColor: SENTIMENT_COLORS[review.sentiment] }}
              >
                {review.sentiment === SENTIMENT_TYPES.VERY_POSITIVE && <Smile size={14} />}
                {review.sentiment === SENTIMENT_TYPES.POSITIVE && <Smile size={14} />}
                {review.sentiment === SENTIMENT_TYPES.NEUTRAL && <Meh size={14} />}
                {review.sentiment === SENTIMENT_TYPES.NEGATIVE && <Frown size={14} />}
                {review.sentiment === SENTIMENT_TYPES.VERY_NEGATIVE && <Frown size={14} />}
              </div>
            </div>
          )}
        </div>

        {/* Business Response */}
        {review.responses && review.responses.length > 0 && (
          <div className={styles.businessResponse}>
            {review.responses.map((response, index) => (
              <div key={index} className={styles.responseItem}>
                <div className={styles.responseHeader}>
                  <span className={styles.responseAuthor}>
                    {response.author.name}
                  </span>
                  <span className={styles.responseRole}>
                    {response.author.role}
                  </span>
                  <span className={styles.responseDate}>
                    {formatDistanceToNow(parseISO(response.createdAt), {
                      addSuffix: true,
                      locale: dateLocale
                    })}
                  </span>
                </div>
                <p className={styles.responseContent}>{response.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Review Footer */}
        <div className={styles.reviewFooter}>
          {/* Voting */}
          {mergedSettings.enableVoting && (
            <div className={styles.reviewVoting}>
              <button
                className={`${styles.voteButton} ${userVote === true ? styles.voted : ''}`}
                onClick={() => handleReviewVote(review.id, true)}
                disabled={userVote !== undefined}
              >
                <ThumbsUp size={14} />
                <span>{review.helpfulVotes || 0}</span>
              </button>
              
              <button
                className={`${styles.voteButton} ${userVote === false ? styles.voted : ''}`}
                onClick={() => handleReviewVote(review.id, false)}
                disabled={userVote !== undefined}
              >
                <ThumbsDown size={14} />
                <span>{review.unhelpfulVotes || 0}</span>
              </button>
            </div>
          )}

          {/* Additional Actions */}
          <div className={styles.reviewExtraActions}>
            <button
              className={styles.actionButton}
              onClick={() => handleReviewFlag(review.id, 'inappropriate')}
              disabled={isFlagged}
            >
              <Flag size={14} />
              {translations.report}
            </button>

            <button
              className={styles.actionButton}
              onClick={() => {/* Handle share */}}
            >
              <Share2 size={14} />
              Share
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (isLoading && (!reviews || reviews.length === 0)) {
    return (
      <div className={`${styles.reviewsSection} ${className}`}>
        <LoadingSpinner size={32} message="Loading reviews..." />
      </div>
    );
  }

  return (
    <div ref={sectionRef} className={`${styles.reviewsSection} ${className}`}>
      {/* Header */}
      <div className={styles.sectionHeader}>
        <h2>{translations.reviews}</h2>
        
        {showWriteReview && user && (
          <button
            className={styles.writeReviewButton}
            onClick={() => setShowReviewForm(true)}
          >
            <Edit3 size={16} />
            {translations.write_review}
          </button>
        )}
      </div>

      {/* Statistics */}
      {reviewStatistics && renderReviewStatistics()}

      {/* Analytics */}
      {showAnalytics && analytics && (
        <Suspense fallback={<LoadingSpinner message="Loading analytics..." />}>
          <ReviewAnalytics
            analytics={analytics}
            language={language}
            className={styles.analyticsSection}
          />
        </Suspense>
      )}

      {/* Controls */}
      {reviews && reviews.length > 0 && renderControlsBar()}

      {/* Reviews List */}
      <div className={styles.reviewsList}>
        {paginatedReviews.length > 0 ? (
          <>
            {paginatedReviews.map(renderReviewItem)}
            
            {/* Load More */}
            {filteredAndSortedReviews.length > paginatedReviews.length && (
              <button
                className={styles.loadMoreButton}
                onClick={handleLoadMore}
                disabled={isLoading}
              >
                {isLoading ? <LoadingSpinner size={16} /> : 'Load More Reviews'}
              </button>
            )}
          </>
        ) : (
          <div className={styles.noReviews}>
            <MessageCircle size={48} />
            <h3>{translations.no_reviews}</h3>
            <p>{translations.be_first}</p>
            {showWriteReview && user && (
              <button
                className={styles.writeFirstReviewButton}
                onClick={() => setShowReviewForm(true)}
              >
                {translations.write_review}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Review Form Modal */}
      {showReviewForm && (
        <Suspense fallback={<LoadingSpinner />}>
          <ReviewForm
            product={product}
            isOpen={showReviewForm}
            onClose={() => setShowReviewForm(false)}
            onSubmit={handleReviewSubmit}
            language={language}
          />
        </Suspense>
      )}

      {/* Media Viewer */}
      {selectedMedia && mergedSettings.enableMediaViewer && (
        <Suspense fallback={<LoadingSpinner />}>
          <ReviewMediaViewer
            review={selectedMedia.review}
            initialMediaIndex={selectedMedia.mediaIndex}
            onClose={() => setSelectedMedia(null)}
          />
        </Suspense>
      )}

      {/* Review Details Modal */}
      {selectedReview && (
        <Suspense fallback={<LoadingSpinner />}>
          <ReviewDetails
            review={selectedReview}
            onClose={() => setSelectedReview(null)}
            onFlag={handleReviewFlag}
            onUpdate={onReviewUpdate}
            onDelete={onReviewDelete}
            language={language}
            isOwner={user?.id === selectedReview.author.id}
            isModerator={user?.role === 'moderator' || user?.role === 'admin'}
          />
        </Suspense>
      )}
    </div>
  );
};

export default ReviewsSection;