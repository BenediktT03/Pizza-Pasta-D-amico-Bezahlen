/**
 * EATECH - Promotion Manager
 * Version: 4.1.0
 * Description: Marketing-Kampagnen und Promotions mit Lazy Loading
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/admin/src/pages/Promotions/PromotionManager.jsx
 * 
 * Features: Campaign management, discount codes, A/B testing
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, update, remove } from 'firebase/database';
import { 
  Percent, Tag, Target, TrendingUp,
  Plus, Edit2, Trash2, Copy,
  Play, Pause, Calendar, Clock,
  Users, ShoppingCart, DollarSign, BarChart3,
  Gift, Zap, Star, Award,
  Search, Filter, Download, Eye
} from 'lucide-react';
import { format, parseISO, addDays, isAfter, isBefore } from 'date-fns';
import { de } from 'date-fns/locale';
import styles from './PromotionManager.module.css';

// Lazy loaded components
const PromotionForm = lazy(() => import('./components/PromotionForm'));
const CampaignAnalytics = lazy(() => import('./components/CampaignAnalytics'));
const DiscountCodeGenerator = lazy(() => import('./components/DiscountCodeGenerator'));
const ABTestingPanel = lazy(() => import('./components/ABTestingPanel'));
const PromotionPreview = lazy(() => import('./components/PromotionPreview'));

// Lazy loaded services
const PromotionService = lazy(() => import('../../services/PromotionService'));
const AnalyticsService = lazy(() => import('../../services/AnalyticsService'));
const EmailService = lazy(() => import('../../services/EmailService'));

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

const PROMOTION_TYPES = {
  percentage: { 
    name: 'Prozentual', 
    icon: Percent, 
    color: '#10B981',
    description: 'Rabatt in Prozent'
  },
  fixed: { 
    name: 'Fester Betrag', 
    icon: DollarSign, 
    color: '#3B82F6',
    description: 'Fester Rabattbetrag'
  },
  bogo: { 
    name: 'Buy One Get One', 
    icon: Gift, 
    color: '#F59E0B',
    description: '2 für 1 Angebote'
  },
  bundle: { 
    name: 'Bundle Deal', 
    icon: ShoppingCart, 
    color: '#8B5CF6',
    description: 'Produkt-Pakete'
  }
};

const PROMOTION_STATUS = {
  draft: { name: 'Entwurf', color: '#6B7280' },
  active: { name: 'Aktiv', color: '#10B981' },
  paused: { name: 'Pausiert', color: '#F59E0B' },
  expired: { name: 'Abgelaufen', color: '#EF4444' },
  scheduled: { name: 'Geplant', color: '#3B82F6' }
};

const TARGET_AUDIENCES = {
  all: { name: 'Alle Kunden', icon: Users },
  new: { name: 'Neukunden', icon: UserPlus },
  loyal: { name: 'Stammkunden', icon: Star },
  inactive: { name: 'Inaktive Kunden', icon: Clock }
};

const PromotionManager = () => {
  const [promotions, setPromotions] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedPromotion, setSelectedPromotion] = useState(null);
  const [showPromotionForm, setShowPromotionForm] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showCodeGenerator, setShowCodeGenerator] = useState(false);
  const [showABTesting, setShowABTesting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('created');
  const [sortOrder, setSortOrder] = useState('desc');

  const tenantId = 'demo-restaurant';

  // ============================================================================
  // FIREBASE DATA LOADING
  // ============================================================================
  useEffect(() => {
    const loadPromotionData = async () => {
      setLoading(true);
      try {
        // Load promotions
        const promotionsRef = ref(database, `tenants/${tenantId}/promotions`);
        onValue(promotionsRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const promotionsArray = Object.entries(data).map(([id, promotion]) => ({
              id,
              ...promotion,
              status: getPromotionStatus(promotion)
            }));
            setPromotions(promotionsArray);
          } else {
            setPromotions([]);
          }
        });

        // Load campaigns
        const campaignsRef = ref(database, `tenants/${tenantId}/campaigns`);
        onValue(campaignsRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const campaignsArray = Object.entries(data).map(([id, campaign]) => ({
              id,
              ...campaign
            }));
            setCampaigns(campaignsArray);
          } else {
            setCampaigns([]);
          }
        });

        // Load analytics
        const analyticsRef = ref(database, `tenants/${tenantId}/promotionAnalytics`);
        onValue(analyticsRef, (snapshot) => {
          const data = snapshot.val();
          setAnalytics(data || {});
        });
      } catch (error) {
        console.error('Error loading promotion data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPromotionData();
  }, [tenantId]);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================
  const getPromotionStatus = useCallback((promotion) => {
    const now = new Date();
    const startDate = parseISO(promotion.startDate);
    const endDate = parseISO(promotion.endDate);

    if (promotion.status === 'draft') return 'draft';
    if (promotion.status === 'paused') return 'paused';
    if (isAfter(now, endDate)) return 'expired';
    if (isBefore(now, startDate)) return 'scheduled';
    return 'active';
  }, []);

  // ============================================================================
  // FILTERED AND SORTED DATA
  // ============================================================================
  const filteredAndSortedPromotions = useMemo(() => {
    let filtered = promotions.filter(promotion => {
      const matchesSearch = promotion.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           promotion.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || promotion.type === filterType;
      const matchesStatus = filterStatus === 'all' || promotion.status === filterStatus;

      return matchesSearch && matchesType && matchesStatus;
    });

    // Sort promotions
    filtered.sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'created':
          compareValue = new Date(a.createdAt) - new Date(b.createdAt);
          break;
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'usage':
          compareValue = (a.usageCount || 0) - (b.usageCount || 0);
          break;
        case 'value':
          compareValue = (a.discountValue || 0) - (b.discountValue || 0);
          break;
        default:
          compareValue = 0;
      }
      
      return sortOrder === 'desc' ? -compareValue : compareValue;
    });

    return filtered;
  }, [promotions, searchTerm, filterType, filterStatus, sortBy, sortOrder]);

  // ============================================================================
  // CALCULATED STATS
  // ============================================================================
  const promotionStats = useMemo(() => {
    const activePromotions = promotions.filter(p => p.status === 'active').length;
    const totalUsage = promotions.reduce((sum, p) => sum + (p.usageCount || 0), 0);
    const totalSavings = promotions.reduce((sum, p) => sum + (p.totalSavings || 0), 0);
    const conversionRate = promotions.reduce((sum, p) => sum + (p.conversionRate || 0), 0) / promotions.length || 0;

    return {
      total: promotions.length,
      active: activePromotions,
      totalUsage,
      totalSavings: totalSavings.toFixed(2),
      avgConversion: conversionRate.toFixed(1)
    };
  }, [promotions]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  const handleCreatePromotion = useCallback(async (promotionData) => {
    try {
      const promotionsRef = ref(database, `tenants/${tenantId}/promotions`);
      const newPromotion = {
        ...promotionData,
        createdAt: new Date().toISOString(),
        usageCount: 0,
        totalSavings: 0,
        status: 'draft'
      };
      await push(promotionsRef, newPromotion);
      setShowPromotionForm(false);
    } catch (error) {
      console.error('Error creating promotion:', error);
    }
  }, [tenantId]);

  const handleUpdatePromotion = useCallback(async (promotionId, promotionData) => {
    try {
      const promotionRef = ref(database, `tenants/${tenantId}/promotions/${promotionId}`);
      await update(promotionRef, {
        ...promotionData,
        updatedAt: new Date().toISOString()
      });
      setSelectedPromotion(null);
      setShowPromotionForm(false);
    } catch (error) {
      console.error('Error updating promotion:', error);
    }
  }, [tenantId]);

  const handleDeletePromotion = useCallback(async (promotionId) => {
    if (window.confirm('Promotion wirklich löschen?')) {
      try {
        const promotionRef = ref(database, `tenants/${tenantId}/promotions/${promotionId}`);
        await remove(promotionRef);
      } catch (error) {
        console.error('Error deleting promotion:', error);
      }
    }
  }, [tenantId]);

  const handleTogglePromotion = useCallback(async (promotionId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      const promotionRef = ref(database, `tenants/${tenantId}/promotions/${promotionId}`);
      await update(promotionRef, {
        status: newStatus,
        [`${newStatus}At`]: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error toggling promotion:', error);
    }
  }, [tenantId]);

  const handleDuplicatePromotion = useCallback(async (promotion) => {
    try {
      const promotionsRef = ref(database, `tenants/${tenantId}/promotions`);
      const duplicatedPromotion = {
        ...promotion,
        name: `${promotion.name} (Kopie)`,
        code: `${promotion.code}_COPY`,
        createdAt: new Date().toISOString(),
        usageCount: 0,
        totalSavings: 0,
        status: 'draft'
      };
      delete duplicatedPromotion.id;
      await push(promotionsRef, duplicatedPromotion);
    } catch (error) {
      console.error('Error duplicating promotion:', error);
    }
  }, [tenantId]);

  const handleExportPromotions = useCallback(() => {
    const csvData = filteredAndSortedPromotions.map(promotion => ({
      Name: promotion.name,
      Typ: PROMOTION_TYPES[promotion.type]?.name || promotion.type,
      Code: promotion.code,
      Rabatt: promotion.type === 'percentage' ? `${promotion.discountValue}%` : `${promotion.discountValue} CHF`,
      Status: PROMOTION_STATUS[promotion.status]?.name || promotion.status,
      'Start-Datum': format(parseISO(promotion.startDate), 'dd.MM.yyyy'),
      'End-Datum': format(parseISO(promotion.endDate), 'dd.MM.yyyy'),
      'Verwendungen': promotion.usageCount || 0,
      'Ersparnis': `${promotion.totalSavings || 0} CHF`
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promotions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredAndSortedPromotions]);

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  const renderStatsCards = () => {
    return (
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Tag size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>{promotionStats.total}</h3>
            <p>Gesamt Promotions</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Zap size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>{promotionStats.active}</h3>
            <p>Aktiv</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Users size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>{promotionStats.totalUsage}</h3>
            <p>Gesamt Verwendungen</p>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <DollarSign size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>{promotionStats.totalSavings} CHF</h3>
            <p>Gesamt Ersparnis</p>
          </div>
        </div>
      </div>
    );
  };

  const renderPromotionCard = (promotion) => {
    const type = PROMOTION_TYPES[promotion.type] || { name: promotion.type, color: '#6B7280', icon: Tag };
    const status = PROMOTION_STATUS[promotion.status] || { name: promotion.status, color: '#6B7280' };
    const TypeIcon = type.icon;

    return (
      <div key={promotion.id} className={styles.promotionCard}>
        <div className={styles.promotionHeader}>
          <div className={styles.promotionType} style={{ backgroundColor: type.color + '20' }}>
            <TypeIcon size={20} color={type.color} />
            <span style={{ color: type.color }}>{type.name}</span>
          </div>
          <div className={styles.promotionActions}>
            <button
              onClick={() => {
                setSelectedPromotion(promotion);
                setShowPreview(true);
              }}
              className={styles.actionButton}
            >
              <Eye size={16} />
            </button>
            <button
              onClick={() => {
                setSelectedPromotion(promotion);
                setShowPromotionForm(true);
              }}
              className={styles.actionButton}
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => handleDuplicatePromotion(promotion)}
              className={styles.actionButton}
            >
              <Copy size={16} />
            </button>
            <button
              onClick={() => handleDeletePromotion(promotion.id)}
              className={styles.actionButton}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className={styles.promotionContent}>
          <h3>{promotion.name}</h3>
          <p>{promotion.description}</p>
          
          <div className={styles.promotionDetails}>
            <div className={styles.promotionCode}>
              <strong>Code:</strong> {promotion.code}
            </div>
            <div className={styles.promotionValue}>
              <strong>Rabatt:</strong> {
                promotion.type === 'percentage' 
                  ? `${promotion.discountValue}%`
                  : `${promotion.discountValue} CHF`
              }
            </div>
            <div className={styles.promotionPeriod}>
              <Calendar size={16} />
              <span>
                {format(parseISO(promotion.startDate), 'dd.MM.yy')} - 
                {format(parseISO(promotion.endDate), 'dd.MM.yy')}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.promotionStats}>
          <div className={styles.statItem}>
            <Users size={16} />
            <span>{promotion.usageCount || 0} Verwendet</span>
          </div>
          <div className={styles.statItem}>
            <DollarSign size={16} />
            <span>{promotion.totalSavings || 0} CHF gespart</span>
          </div>
        </div>

        <div className={styles.promotionFooter}>
          <div 
            className={styles.promotionStatus}
            style={{ backgroundColor: status.color + '20', color: status.color }}
          >
            {status.name}
          </div>
          <button
            onClick={() => handleTogglePromotion(promotion.id, promotion.status)}
            className={`${styles.toggleButton} ${promotion.status === 'active' ? styles.pause : styles.play}`}
            disabled={promotion.status === 'expired' || promotion.status === 'draft'}
          >
            {promotion.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
            {promotion.status === 'active' ? 'Pausieren' : 'Aktivieren'}
          </button>
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
    <div className={styles.promotionManager}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Promotion Manager</h1>
          <p>Erstellen und verwalten Sie Marketing-Kampagnen</p>
        </div>
        <div className={styles.headerActions}>
          <button
            onClick={() => setShowCodeGenerator(true)}
            className={styles.secondaryButton}
          >
            <Tag size={20} />
            Code Generator
          </button>
          <button
            onClick={() => setShowABTesting(true)}
            className={styles.secondaryButton}
          >
            <Target size={20} />
            A/B Testing
          </button>
          <button
            onClick={() => setShowAnalytics(true)}
            className={styles.secondaryButton}
          >
            <BarChart3 size={20} />
            Analytics
          </button>
          <button
            onClick={handleExportPromotions}
            className={styles.secondaryButton}
          >
            <Download size={20} />
            Export
          </button>
          <button
            onClick={() => setShowPromotionForm(true)}
            className={styles.primaryButton}
          >
            <Plus size={20} />
            Neue Promotion
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
              placeholder="Promotions suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className={styles.filters}>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">Alle Typen</option>
              {Object.entries(PROMOTION_TYPES).map(([key, type]) => (
                <option key={key} value={key}>{type.name}</option>
              ))}
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Alle Status</option>
              {Object.entries(PROMOTION_STATUS).map(([key, status]) => (
                <option key={key} value={key}>{status.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.sortControls}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="created">Nach Erstellung</option>
            <option value="name">Nach Name</option>
            <option value="usage">Nach Verwendung</option>
            <option value="value">Nach Wert</option>
          </select>
          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className={styles.sortButton}
          >
            {sortOrder === 'asc' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          </button>
        </div>

        <div className={styles.viewToggle}>
          <button
            className={viewMode === 'grid' ? styles.active : ''}
            onClick={() => setViewMode('grid')}
          >
            Grid
          </button>
          <button
            className={viewMode === 'list' ? styles.active : ''}
            onClick={() => setViewMode('list')}
          >
            Liste
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={`${styles.promotionsList} ${viewMode === 'grid' ? styles.grid : styles.list}`}>
          {filteredAndSortedPromotions.length > 0 ? (
            filteredAndSortedPromotions.map(renderPromotionCard)
          ) : (
            <div className={styles.emptyState}>
              <Tag size={48} />
              <h3>Keine Promotions gefunden</h3>
              <p>Erstellen Sie Ihre erste Promotion oder passen Sie die Filter an</p>
              <button
                onClick={() => setShowPromotionForm(true)}
                className={styles.primaryButton}
              >
                <Plus size={20} />
                Erste Promotion erstellen
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lazy Loaded Modals */}
      {showPromotionForm && (
        <Suspense fallback={<LoadingSpinner />}>
          <PromotionForm
            promotion={selectedPromotion}
            types={PROMOTION_TYPES}
            audiences={TARGET_AUDIENCES}
            onSave={selectedPromotion ? handleUpdatePromotion : handleCreatePromotion}
            onClose={() => {
              setShowPromotionForm(false);
              setSelectedPromotion(null);
            }}
          />
        </Suspense>
      )}

      {showAnalytics && (
        <Suspense fallback={<LoadingSpinner />}>
          <CampaignAnalytics
            promotions={promotions}
            campaigns={campaigns}
            analytics={analytics}
            onClose={() => setShowAnalytics(false)}
          />
        </Suspense>
      )}

      {showCodeGenerator && (
        <Suspense fallback={<LoadingSpinner />}>
          <DiscountCodeGenerator
            existingCodes={promotions.map(p => p.code)}
            onGenerate={(codes) => console.log('Generated codes:', codes)}
            onClose={() => setShowCodeGenerator(false)}
          />
        </Suspense>
      )}

      {showABTesting && (
        <Suspense fallback={<LoadingSpinner />}>
          <ABTestingPanel
            promotions={promotions}
            onTestCreate={(test) => console.log('A/B test created:', test)}
            onClose={() => setShowABTesting(false)}
          />
        </Suspense>
      )}

      {showPreview && selectedPromotion && (
        <Suspense fallback={<LoadingSpinner />}>
          <PromotionPreview
            promotion={selectedPromotion}
            onClose={() => {
              setShowPreview(false);
              setSelectedPromotion(null);
            }}
          />
        </Suspense>
      )}
    </div>
  );
};

export default PromotionManager;