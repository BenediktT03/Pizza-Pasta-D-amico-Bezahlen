// ============================================================================
// EATECH V3.0 - ADVANCED REVIEW & RATING SYSTEM
// ============================================================================
// File: /apps/web/src/services/reviewService.js
// Type: Complete Review Management & Analytics Service
// Swiss Focus: Trust building, Quality assurance, FADP compliance
// Features: AI moderation, Sentiment analysis, Photo reviews, Verification
// ============================================================================

// ============================================================================
// IMPORTS & DEPENDENCIES
// ============================================================================

// Core utilities
import { v4 as uuidv4 } from 'uuid';

// Firebase/Database
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

// AI & Content Analysis
import { moderateContent, analyzesentiment } from '../utils/aiContentUtils';
import { detectLanguage, translateText } from '../utils/translationUtils';
import { validateSwissAddress } from '../utils/addressValidation';

// Image & Media
import { uploadImage, validateImage } from './imageService';
import { createThumbnail, optimizeVideo } from '../utils/mediaUtils';

// Analytics & Tracking
import { trackEvent } from './analyticsService';
import { logActivity } from './activityService';

// Swiss Privacy & Security
import { encryptSensitiveData, decryptSensitiveData } from '../utils/encryption';
import { validateFADPCompliance } from '../utils/privacy';
import { generateAnonymousId } from '../utils/anonymization';

// Notifications
import { sendNotification } from './notificationService';
import { sendEmail } from './emailService';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

// Review Types & Categories
export const REVIEW_TYPES = {
  FOOD_QUALITY: {
    id: 'food_quality',
    name: 'Food Quality',
    icon: '🍽️',
    weight: 0.4, // 40% of overall rating
    criteria: ['taste', 'freshness', 'presentation', 'portion_size']
  },
  SERVICE: {
    id: 'service',
    name: 'Service',
    icon: '👥',
    weight: 0.3,
    criteria: ['friendliness', 'speed', 'accuracy', 'professionalism']
  },
  VALUE: {
    id: 'value',
    name: 'Value for Money',
    icon: '💰',
    weight: 0.2,
    criteria: ['price_fairness', 'portion_value', 'quality_price_ratio']
  },
  EXPERIENCE: {
    id: 'experience',
    name: 'Overall Experience',
    icon: '✨',
    weight: 0.1,
    criteria: ['atmosphere', 'cleanliness', 'would_recommend']
  }
};

// Rating Scales (Swiss 6-point system + International 5-point)
export const RATING_SYSTEMS = {
  swiss: {
    min: 1,
    max: 6,
    labels: {
      1: 'Ungenügend',
      2: 'Schwach',
      3: 'Genügend',
      4: 'Befriedigend',
      5: 'Gut',
      6: 'Sehr gut'
    }
  },
  international: {
    min: 1,
    max: 5,
    labels: {
      1: 'Terrible',
      2: 'Poor',
      3: 'Average',
      4: 'Good',
      5: 'Excellent'
    }
  }
};

// Review Statuses
export const REVIEW_STATUSES = {
  PENDING: 'pending',           // Awaiting moderation
  APPROVED: 'approved',         // Live and visible
  REJECTED: 'rejected',         // Moderation failed
  FLAGGED: 'flagged',          // Reported by users
  ARCHIVED: 'archived',        // Older reviews
  ANONYMOUS: 'anonymous'       // Privacy-protected
};

// Content Moderation Rules (Swiss Standards)
export const MODERATION_RULES = {
  profanity: {
    enabled: true,
    languages: ['de', 'fr', 'it', 'en'],
    severity: 'strict'
  },
  spam: {
    enabled: true,
    duplicateThreshold: 0.8,
    linkDetection: true
  },
  authenticity: {
    enabled: true,
    verifiedPurchaseRequired: false,
    locationVerification: true
  },
  privacy: {
    enabled: true,
    personalInfoDetection: true,
    fadpCompliant: true
  }
};

// Swiss Review Preferences
export const SWISS_PREFERENCES = {
  languages: ['de-CH', 'de-DE', 'fr-CH', 'fr-FR', 'it-CH', 'it-IT', 'en-US'],
  ratingSystem: 'swiss', // Default to Swiss 6-point system
  dateFormat: 'dd.mm.yyyy',
  currency: 'CHF',
  
  culturalAdaptations: {
    directFeedback: true,      // Swiss prefer direct, honest feedback
    detailedReviews: true,     // Thorough, structured reviews
    qualityFocus: true,        // Emphasis on quality over quantity
    privacyRespect: true      // Strong privacy considerations
  }
};

// Photo/Video Review Settings
export const MEDIA_REVIEW_CONFIG = {
  maxPhotos: 5,
  maxVideos: 2,
  maxPhotoSize: 5 * 1024 * 1024, // 5MB
  maxVideoSize: 50 * 1024 * 1024, // 50MB
  allowedImageFormats: ['jpeg', 'png', 'webp'],
  allowedVideoFormats: ['mp4', 'webm'],
  
  moderation: {
    enabled: true,
    aiContentAnalysis: true,
    inappropriateContentDetection: true,
    foodSafetyValidation: true
  }
};

// ============================================================================
// MAIN REVIEW SERVICE CLASS
// ============================================================================

class ReviewService {
  constructor(options = {}) {
    this.config = {
      moderationEnabled: options.moderationEnabled !== false,
      aiAnalysis: options.aiAnalysis !== false,
      swissCompliance: options.swissCompliance !== false,
      realTimeUpdates: options.realTimeUpdates !== false,
      analyticsEnabled: options.analyticsEnabled !== false,
      ...options
    };
    
    this.cache = new Map();
    this.moderationQueue = [];
    this.reviewCache = new Map();
    
    // Initialize AI services
    this.aiModerator = this.initAIModerator();
    this.sentimentAnalyzer = this.initSentimentAnalyzer();
    
    // Statistics
    this.stats = {
      totalReviews: 0,
      averageRating: 0,
      moderationActions: 0,
      responseRate: 0
    };
  }

  // ============================================================================
  // CORE REVIEW OPERATIONS
  // ============================================================================
  
  /**
   * Submit a new review with Swiss standards
   */
  async submitReview(reviewData, options = {}) {
    const reviewId = uuidv4();
    const timestamp = new Date().toISOString();
    
    try {
      // Validate review data
      await this.validateReviewData(reviewData);
      
      // Process media attachments
      const mediaData = await this.processMediaAttachments(reviewData.media || [], options);
      
      // Analyze content with AI
      const contentAnalysis = await this.analyzeReviewContent(reviewData);
      
      // Create review object
      const review = {
        id: reviewId,
        ...reviewData,
        media: mediaData,
        analysis: contentAnalysis,
        timestamp,
        status: REVIEW_STATUSES.PENDING,
        
        // Swiss-specific fields
        ratingSystem: options.ratingSystem || 'swiss',
        language: await detectLanguage(reviewData.comment || ''),
        location: await this.validateReviewLocation(reviewData.location),
        
        // Privacy & Security
        userId: options.anonymous ? await generateAnonymousId() : reviewData.userId,
        userEmail: reviewData.userEmail ? await encryptSensitiveData(reviewData.userEmail) : null,
        ipAddress: options.trackIP ? await encryptSensitiveData(options.ipAddress) : null,
        
        // Verification
        verifiedPurchase: await this.verifyPurchase(reviewData.orderId, reviewData.userId),
        deviceInfo: this.extractDeviceInfo(options.userAgent),
        
        // Metadata
        fadpCompliant: this.config.swissCompliance,
        moderationRequired: this.requiresModeration(contentAnalysis)
      };
      
      // Add to moderation queue if needed
      if (review.moderationRequired) {
        await this.addToModerationQueue(review);
      } else {
        review.status = REVIEW_STATUSES.APPROVED;
      }
      
      // Save to database
      const docRef = await addDoc(collection(db, 'reviews'), review);
      review.firestoreId = docRef.id;
      
      // Update restaurant statistics
      await this.updateRestaurantStats(reviewData.restaurantId, review);
      
      // Send notifications
      await this.sendReviewNotifications(review);
      
      // Track analytics
      if (this.config.analyticsEnabled) {
        await this.trackReviewSubmission(review);
      }
      
      this.stats.totalReviews++;
      
      return {
        success: true,
        reviewId,
        review: this.sanitizeReviewForPublic(review),
        status: review.status,
        estimatedApprovalTime: this.getEstimatedApprovalTime(review)
      };
      
    } catch (error) {
      console.error('ReviewService: Review submission failed:', error);
      
      await this.trackReviewError('submission_failed', {
        reviewId,
        error: error.message,
        restaurantId: reviewData.restaurantId
      });
      
      return {
        success: false,
        error: error.message,
        reviewId
      };
    }
  }
  
  /**
   * Get reviews for a restaurant with Swiss optimization
   */
  async getRestaurantReviews(restaurantId, options = {}) {
    try {
      const cacheKey = `reviews_${restaurantId}_${JSON.stringify(options)}`;
      
      // Check cache first
      if (this.reviewCache.has(cacheKey) && !options.bypassCache) {
        return this.reviewCache.get(cacheKey);
      }
      
      // Build query
      let reviewQuery = query(
        collection(db, 'reviews'),
        where('restaurantId', '==', restaurantId),
        where('status', '==', REVIEW_STATUSES.APPROVED),
        orderBy(options.sortBy || 'timestamp', options.sortOrder || 'desc')
      );
      
      // Apply pagination
      if (options.limit) {
        reviewQuery = query(reviewQuery, limit(options.limit));
      }
      
      if (options.startAfter) {
        reviewQuery = query(reviewQuery, startAfter(options.startAfter));
      }
      
      // Execute query
      const querySnapshot = await getDocs(reviewQuery);
      const reviews = [];
      
      querySnapshot.forEach((doc) => {
        const reviewData = doc.data();
        reviews.push({
          ...reviewData,
          firestoreId: doc.id,
          // Decrypt sensitive data if authorized
          userEmail: options.includePrivateData ? 
            this.decryptIfAuthorized(reviewData.userEmail, options.authLevel) : null
        });
      });
      
      // Process reviews for Swiss display
      const processedReviews = await this.processReviewsForDisplay(reviews, options);
      
      // Generate analytics
      const analytics = await this.generateReviewAnalytics(reviews);
      
      // Prepare response
      const response = {
        success: true,
        reviews: processedReviews,
        analytics,
        pagination: {
          total: reviews.length,
          hasMore: reviews.length === (options.limit || 50),
          nextCursor: reviews.length > 0 ? reviews[reviews.length - 1].timestamp : null
        },
        swissOptimized: true
      };
      
      // Cache the response
      this.reviewCache.set(cacheKey, response);
      
      return response;
      
    } catch (error) {
      console.error('ReviewService: Failed to get restaurant reviews:', error);
      return {
        success: false,
        error: error.message,
        reviews: []
      };
    }
  }
  
  /**
   * Update existing review
   */
  async updateReview(reviewId, updateData, options = {}) {
    try {
      // Get existing review
      const existingReview = await this.getReviewById(reviewId);
      if (!existingReview) {
        throw new Error('Review not found');
      }
      
      // Validate update permissions
      await this.validateUpdatePermissions(existingReview, options.userId, options.authLevel);
      
      // Process updates
      const processedUpdates = await this.processReviewUpdate(updateData, existingReview);
      
      // Re-analyze if content changed
      if (updateData.comment || updateData.rating) {
        processedUpdates.analysis = await this.analyzeReviewContent(processedUpdates);
        processedUpdates.moderationRequired = this.requiresModeration(processedUpdates.analysis);
        
        // Reset to pending if moderation needed
        if (processedUpdates.moderationRequired) {
          processedUpdates.status = REVIEW_STATUSES.PENDING;
        }
      }
      
      processedUpdates.updatedAt = new Date().toISOString();
      processedUpdates.updateCount = (existingReview.updateCount || 0) + 1;
      
      // Update in database
      await updateDoc(doc(db, 'reviews', existingReview.firestoreId), processedUpdates);
      
      // Clear cache
      this.clearReviewCache(existingReview.restaurantId);
      
      // Track update
      await this.trackReviewUpdate(reviewId, updateData, options);
      
      return {
        success: true,
        reviewId,
        updatedFields: Object.keys(processedUpdates)
      };
      
    } catch (error) {
      console.error('ReviewService: Review update failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ============================================================================
  // CONTENT ANALYSIS & MODERATION
  // ============================================================================
  
  async analyzeReviewContent(reviewData) {
    const analysis = {
      sentiment: null,
      toxicity: null,
      authenticity: null,
      language: null,
      topics: [],
      flags: [],
      confidence: 0
    };
    
    try {
      if (!reviewData.comment && !reviewData.rating) {
        return analysis;
      }
      
      // Language detection
      if (reviewData.comment) {
        analysis.language = await detectLanguage(reviewData.comment);
      }
      
      // Sentiment analysis
      if (this.sentimentAnalyzer && reviewData.comment) {
        analysis.sentiment = await this.sentimentAnalyzer.analyze(reviewData.comment, {
          language: analysis.language,
          swissContext: true
        });
      }
      
      // Content moderation
      if (this.aiModerator && reviewData.comment) {
        const moderation = await this.aiModerator.moderate(reviewData.comment, {
          language: analysis.language,
          rules: MODERATION_RULES
        });
        
        analysis.toxicity = moderation.toxicity;
        analysis.flags = moderation.flags;
        analysis.authenticity = moderation.authenticity;
      }
      
      // Topic extraction
      if (reviewData.comment) {
        analysis.topics = await this.extractTopics(reviewData.comment, analysis.language);
      }
      
      // Calculate confidence score
      analysis.confidence = this.calculateAnalysisConfidence(analysis);
      
      return analysis;
      
    } catch (error) {
      console.error('Content analysis failed:', error);
      return {
        ...analysis,
        error: error.message,
        confidence: 0
      };
    }
  }
  
  requiresModeration(analysis) {
    if (!this.config.moderationEnabled) return false;
    
    // Check toxicity levels
    if (analysis.toxicity && analysis.toxicity.score > 0.7) return true;
    
    // Check flags
    if (analysis.flags && analysis.flags.length > 0) return true;
    
    // Check authenticity
    if (analysis.authenticity && analysis.authenticity.score < 0.5) return true;
    
    // Check confidence
    if (analysis.confidence < 0.6) return true;
    
    return false;
  }
  
  async addToModerationQueue(review) {
    this.moderationQueue.push(review);
    
    // Process moderation queue
    if (this.moderationQueue.length > 0) {
      await this.processModerationQueue();
    }
  }
  
  async processModerationQueue() {
    if (this.moderationQueue.length === 0) return;
    
    const batchSize = 5;
    const batch = this.moderationQueue.splice(0, batchSize);
    
    for (const review of batch) {
      try {
        const moderationResult = await this.moderateReview(review);
        
        // Update review status
        review.status = moderationResult.approved ? 
          REVIEW_STATUSES.APPROVED : 
          REVIEW_STATUSES.REJECTED;
        
        review.moderationResult = moderationResult;
        review.moderatedAt = new Date().toISOString();
        
        // Update in database
        await updateDoc(doc(db, 'reviews', review.firestoreId), {
          status: review.status,
          moderationResult: moderationResult,
          moderatedAt: review.moderatedAt
        });
        
        // Send notification to user
        await this.sendModerationNotification(review);
        
        this.stats.moderationActions++;
        
      } catch (error) {
        console.error('Moderation failed for review:', review.id, error);
      }
    }
  }
  
  async moderateReview(review) {
    const moderationResult = {
      approved: false,
      reasons: [],
      score: 0,
      automaticDecision: true,
      moderatedBy: 'ai_system',
      timestamp: new Date().toISOString()
    };
    
    try {
      // Check content quality
      if (review.analysis.confidence < 0.4) {
        moderationResult.reasons.push('Low content quality');
      }
      
      // Check toxicity
      if (review.analysis.toxicity && review.analysis.toxicity.score > 0.8) {
        moderationResult.reasons.push('Toxic content detected');
      }
      
      // Check authenticity
      if (review.analysis.authenticity && review.analysis.authenticity.score < 0.3) {
        moderationResult.reasons.push('Questionable authenticity');
      }
      
      // Check for spam
      if (await this.isSpamReview(review)) {
        moderationResult.reasons.push('Potential spam');
      }
      
      // Calculate approval score
      moderationResult.score = this.calculateModerationScore(review);
      moderationResult.approved = moderationResult.score >= 0.7 && moderationResult.reasons.length === 0;
      
      return moderationResult;
      
    } catch (error) {
      console.error('Review moderation failed:', error);
      moderationResult.approved = false;
      moderationResult.reasons.push('Moderation system error');
      return moderationResult;
    }
  }

  // ============================================================================
  // ANALYTICS & INSIGHTS
  // ============================================================================
  
  async generateReviewAnalytics(reviews) {
    const analytics = {
      overview: {
        totalReviews: reviews.length,
        averageRating: 0,
        distributionByRating: {},
        distributionByType: {}
      },
      
      sentiment: {
        positive: 0,
        neutral: 0,
        negative: 0,
        averageSentiment: 0
      },
      
      topics: {
        mostMentioned: [],
        trends: [],
        categories: {}
      },
      
      temporal: {
        reviewsPerMonth: {},
        ratingTrends: {},
        seasonality: {}
      },
      
      swiss: {
        languageDistribution: {},
        cantonalDistribution: {},
        culturalInsights: {}
      }
    };
    
    try {
      if (reviews.length === 0) return analytics;
      
      // Calculate basic metrics
      const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
      analytics.overview.averageRating = totalRating / reviews.length;
      
      // Rating distribution
      reviews.forEach(review => {
        const rating = review.rating || 0;
        analytics.overview.distributionByRating[rating] = 
          (analytics.overview.distributionByRating[rating] || 0) + 1;
        
        const type = review.type || 'general';
        analytics.overview.distributionByType[type] = 
          (analytics.overview.distributionByType[type] || 0) + 1;
      });
      
      // Sentiment analysis
      const sentimentReviews = reviews.filter(r => r.analysis?.sentiment);
      if (sentimentReviews.length > 0) {
        sentimentReviews.forEach(review => {
          const sentiment = review.analysis.sentiment.label;
          analytics.sentiment[sentiment] = (analytics.sentiment[sentiment] || 0) + 1;
        });
        
        const avgSentiment = sentimentReviews.reduce((sum, review) => 
          sum + review.analysis.sentiment.score, 0) / sentimentReviews.length;
        analytics.sentiment.averageSentiment = avgSentiment;
      }
      
      // Topic analysis
      const allTopics = reviews.flatMap(r => r.analysis?.topics || []);
      const topicCounts = allTopics.reduce((acc, topic) => {
        acc[topic] = (acc[topic] || 0) + 1;
        return acc;
      }, {});
      
      analytics.topics.mostMentioned = Object.entries(topicCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([topic, count]) => ({ topic, count }));
      
      // Swiss-specific analytics
      reviews.forEach(review => {
        const language = review.language || 'unknown';
        analytics.swiss.languageDistribution[language] = 
          (analytics.swiss.languageDistribution[language] || 0) + 1;
        
        if (review.location?.canton) {
          const canton = review.location.canton;
          analytics.swiss.cantonalDistribution[canton] = 
            (analytics.swiss.cantonalDistribution[canton] || 0) + 1;
        }
      });
      
      // Temporal analysis
      reviews.forEach(review => {
        const date = new Date(review.timestamp);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        analytics.temporal.reviewsPerMonth[monthKey] = 
          (analytics.temporal.reviewsPerMonth[monthKey] || 0) + 1;
      });
      
      return analytics;
      
    } catch (error) {
      console.error('Analytics generation failed:', error);
      return analytics;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================
  
  async validateReviewData(reviewData) {
    // Required fields
    if (!reviewData.restaurantId) {
      throw new Error('Restaurant ID is required');
    }
    
    if (!reviewData.rating && !reviewData.comment) {
      throw new Error('Either rating or comment is required');
    }
    
    // Rating validation
    if (reviewData.rating) {
      const min = RATING_SYSTEMS.swiss.min;
      const max = RATING_SYSTEMS.swiss.max;
      
      if (reviewData.rating < min || reviewData.rating > max) {
        throw new Error(`Rating must be between ${min} and ${max}`);
      }
    }
    
    // Comment validation
    if (reviewData.comment) {
      if (reviewData.comment.length < 10) {
        throw new Error('Comment must be at least 10 characters long');
      }
      
      if (reviewData.comment.length > 2000) {
        throw new Error('Comment must be less than 2000 characters');
      }
    }
    
    // Media validation
    if (reviewData.media && reviewData.media.length > MEDIA_REVIEW_CONFIG.maxPhotos) {
      throw new Error(`Maximum ${MEDIA_REVIEW_CONFIG.maxPhotos} photos allowed`);
    }
    
    return true;
  }
  
  async processMediaAttachments(mediaFiles, options = {}) {
    if (!mediaFiles || mediaFiles.length === 0) return [];
    
    const processedMedia = [];
    
    for (const media of mediaFiles) {
      try {
        // Validate media file
        await validateImage(media, {
          maxSize: MEDIA_REVIEW_CONFIG.maxPhotoSize,
          allowedTypes: MEDIA_REVIEW_CONFIG.allowedImageFormats.map(f => `image/${f}`)
        });
        
        // Upload and process
        const uploadResult = await uploadImage(media, {
          type: 'review',
          enhance: true,
          preset: 'food_photography'
        });
        
        if (uploadResult.success) {
          processedMedia.push({
            id: uploadResult.uploadId,
            type: media.type.startsWith('image/') ? 'photo' : 'video',
            url: uploadResult.imageData.variants.medium.url,
            thumbnail: uploadResult.imageData.variants.thumbnail.url,
            metadata: uploadResult.metadata
          });
        }
        
      } catch (error) {
        console.warn('Media processing failed:', error);
      }
    }
    
    return processedMedia;
  }
  
  sanitizeReviewForPublic(review) {
    const sanitized = { ...review };
    
    // Remove sensitive data
    delete sanitized.userEmail;
    delete sanitized.ipAddress;
    delete sanitized.deviceInfo;
    
    // Anonymize user ID if needed
    if (review.status === REVIEW_STATUSES.ANONYMOUS) {
      sanitized.userId = 'anonymous';
    }
    
    return sanitized;
  }
  
  async trackReviewSubmission(review) {
    await trackEvent('review_submitted', {
      reviewId: review.id,
      restaurantId: review.restaurantId,
      rating: review.rating,
      hasComment: !!review.comment,
      hasMedia: review.media && review.media.length > 0,
      language: review.language,
      ratingSystem: review.ratingSystem,
      timestamp: review.timestamp
    });
  }
  
  // Initialize AI services (Mock implementations)
  initAIModerator() {
    if (!this.config.moderationEnabled) return null;
    
    return {
      moderate: async (content, options) => {
        // Mock moderation result
        return {
          toxicity: { score: Math.random() * 0.3 }, // Low toxicity
          flags: [],
          authenticity: { score: 0.8 + Math.random() * 0.2 }
        };
      }
    };
  }
  
  initSentimentAnalyzer() {
    if (!this.config.aiAnalysis) return null;
    
    return {
      analyze: async (text, options) => {
        // Mock sentiment analysis
        const score = Math.random() * 2 - 1; // -1 to 1
        return {
          score,
          label: score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral',
          confidence: 0.7 + Math.random() * 0.3
        };
      }
    };
  }
}

// ============================================================================
// EXPORTS & SINGLETON
// ============================================================================

// Create singleton instance
let reviewServiceInstance = null;

export const getReviewService = (options = {}) => {
  if (!reviewServiceInstance) {
    reviewServiceInstance = new ReviewService(options);
  }
  return reviewServiceInstance;
};

// Named exports
export { 
  ReviewService, 
  REVIEW_TYPES, 
  RATING_SYSTEMS, 
  REVIEW_STATUSES,
  SWISS_PREFERENCES 
};

// Default export
export default ReviewService;