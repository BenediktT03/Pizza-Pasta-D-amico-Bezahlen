/**
 * EATECH - Promotion Management System
 * Version: 1.0.0
 * Description: Verwaltung von Aktionen, Rabatten und Marketing-Kampagnen
 * Features: Discount Codes, Happy Hour, Combo Deals, Customer Segments
 * 
 * Kapitel: Phase 4 - Advanced Features - Promotion Engine
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Tag, 
  Plus, 
  Edit2, 
  Trash2, 
  Calendar,
  Clock,
  Users,
  Percent,
  Gift,
  TrendingUp,
  Copy,
  Eye,
  EyeOff,
  Play,
  Pause,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Target,
  Zap,
  Filter,
  Download,
  ChevronRight
} from 'lucide-react';
import { format, addDays, isWithinInterval, differenceInDays } from 'date-fns';
import { de } from 'date-fns/locale';

// Hooks
import { usePromotions } from '../../../packages/core/src/hooks/usePromotions';
import { useTenant } from '../../../packages/core/src/hooks/useTenant';
import { useAnalytics } from '../../../packages/core/src/hooks/useAnalytics';

// Components
import PromotionModal from '../../components/Promotions/PromotionModal';
import PromotionCard from '../../components/Promotions/PromotionCard';
import PromotionStats from '../../components/Promotions/PromotionStats';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';

// Styles
import styles from './PromotionManagement.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const PROMOTION_TYPES = {
  PERCENTAGE: { 
    id: 'percentage', 
    name: 'Prozent Rabatt', 
    icon: Percent,
    color: '#3b82f6',
    example: '20% auf alle Burger'
  },
  FIXED_AMOUNT: { 
    id: 'fixed_amount', 
    name: 'Fester Betrag', 
    icon: DollarSign,
    color: '#10b981',
    example: 'CHF 5.- Rabatt'
  },
  BUY_X_GET_Y: { 
    id: 'buy_x_get_y', 
    name: 'X kaufen, Y gratis', 
    icon: Gift,
    color: '#8b5cf6',
    example: '2+1 gratis'
  },
  HAPPY_HOUR: { 
    id: 'happy_hour', 
    name: 'Happy Hour', 
    icon: Clock,
    color: '#f59e0b',
    example: '30% zwischen 14-17 Uhr'
  },
  COMBO_DEAL: { 
    id: 'combo_deal', 
    name: 'Kombiangebot', 
    icon: Zap,
    color: '#ec4899',
    example: 'Menü-Deal'
  },
  FREE_DELIVERY: { 
    id: 'free_delivery', 
    name: 'Gratis Lieferung', 
    icon: TrendingUp,
    color: '#14b8a6',
    example: 'Ab CHF 50.-'
  }
};

const CUSTOMER_SEGMENTS = {
  ALL: { id: 'all', name: 'Alle Kunden', icon: Users },
  NEW: { id: 'new', name: 'Neukunden', icon: Target },
  RETURNING: { id: 'returning', name: 'Stammkunden', icon: CheckCircle },
  VIP: { id: 'vip', name: 'VIP Kunden', icon: Zap },
  INACTIVE: { id: 'inactive', name: 'Inaktive Kunden', icon: AlertCircle }
};

const PROMOTION_STATUSES = {
  DRAFT: { id: 'draft', name: 'Entwurf', color: '#6b7280' },
  SCHEDULED: { id: 'scheduled', name: 'Geplant', color: '#f59e0b' },
  ACTIVE: { id: 'active', name: 'Aktiv', color: '#10b981' },
  PAUSED: { id: 'paused', name: 'Pausiert', color: '#3b82f6' },
  EXPIRED: { id: 'expired', name: 'Abgelaufen', color: '#ef4444' }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function PromotionManagement() {
  const { currentTenant } = useTenant();
  const promotions = usePromotions();
  const analytics = useAnalytics();
  
  // State
  const [promotionList, setPromotionList] = useState([]);
  const [selectedPromotion, setSelectedPromotion] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPromotions: 0,
    activePromotions: 0,
    totalRedemptions: 0,
    totalSavings: 0,
    conversionRate: 0
  });
  
  // ==========================================================================
  // EFFECTS
  // ==========================================================================
  useEffect(() => {
    if (!currentTenant?.id) return;
    
    loadPromotions();
    loadStats();
    
    // Subscribe to real-time updates
    const unsubscribe = promotions.subscribeToPromotions(currentTenant.id, (updated) => {
      setPromotionList(updated);
      updateLocalStats(updated);
    });
    
    return () => unsubscribe();
  }, [currentTenant]);
  
  // Update promotion statuses periodically
  useEffect(() => {
    const interval = setInterval(() => {
      updatePromotionStatuses();
    }, 60000); // Every minute
    
    return () => clearInterval(interval);
  }, [promotionList]);
  
  // ==========================================================================
  // DATA LOADING
  // ==========================================================================
  const loadPromotions = async () => {
    try {
      setLoading(true);
      const loaded = await promotions.getPromotions();
      setPromotionList(loaded);
      updateLocalStats(loaded);
    } catch (error) {
      console.error('Failed to load promotions:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadStats = async () => {
    try {
      const stats = await promotions.getPromotionStats();
      setStats(stats);
    } catch (error) {
      console.error('Failed to load promotion stats:', error);
    }
  };
  
  const updateLocalStats = (promos) => {
    const stats = {
      totalPromotions: promos.length,
      activePromotions: promos.filter(p => p.status === 'active').length,
      totalRedemptions: promos.reduce((sum, p) => sum + (p.redemptions || 0), 0),
      totalSavings: promos.reduce((sum, p) => sum + (p.totalSavings || 0), 0),
      conversionRate: 0
    };
    
    // Calculate average conversion rate
    const activePromos = promos.filter(p => p.views > 0);
    if (activePromos.length > 0) {
      const avgConversion = activePromos.reduce((sum, p) => 
        sum + ((p.redemptions || 0) / p.views * 100), 0
      ) / activePromos.length;
      stats.conversionRate = avgConversion;
    }
    
    setStats(stats);
  };
  
  const updatePromotionStatuses = () => {
    const now = new Date();
    
    setPromotionList(prev => prev.map(promo => {
      let newStatus = promo.status;
      
      // Check if scheduled promotion should be activated
      if (promo.status === 'scheduled' && new Date(promo.startDate) <= now) {
        newStatus = 'active';
      }
      
      // Check if active promotion has expired
      if (promo.status === 'active' && new Date(promo.endDate) < now) {
        newStatus = 'expired';
      }
      
      if (newStatus !== promo.status) {
        // Update in backend
        promotions.updatePromotion(promo.id, { status: newStatus });
        
        return { ...promo, status: newStatus };
      }
      
      return promo;
    }));
  };
  
  // ==========================================================================
  // PROMOTION MANAGEMENT
  // ==========================================================================
  const handleCreatePromotion = useCallback(async (promotionData) => {
    try {
      const created = await promotions.createPromotion(promotionData);
      
      // Track event
      analytics.trackEvent('promotion_created', {
        promotionId: created.id,
        type: promotionData.type,
        value: promotionData.value
      });
      
      setShowModal(false);
      loadPromotions();
    } catch (error) {
      console.error('Failed to create promotion:', error);
    }
  }, [promotions, analytics]);
  
  const handleUpdatePromotion = useCallback(async (promotionId, updates) => {
    try {
      await promotions.updatePromotion(promotionId, updates);
      
      // Track event
      analytics.trackEvent('promotion_updated', {
        promotionId,
        updates: Object.keys(updates)
      });
      
      loadPromotions();
    } catch (error) {
      console.error('Failed to update promotion:', error);
    }
  }, [promotions, analytics]);
  
  const handleDeletePromotion = useCallback(async (promotionId) => {
    if (!window.confirm('Möchten Sie diese Aktion wirklich löschen?')) {
      return;
    }
    
    try {
      await promotions.deletePromotion(promotionId);
      
      // Track event
      analytics.trackEvent('promotion_deleted', { promotionId });
      
      loadPromotions();
    } catch (error) {
      console.error('Failed to delete promotion:', error);
    }
  }, [promotions, analytics]);
  
  const handleTogglePromotion = useCallback(async (promotion) => {
    const newStatus = promotion.status === 'active' ? 'paused' : 'active';
    
    await handleUpdatePromotion(promotion.id, { status: newStatus });
  }, [handleUpdatePromotion]);
  
  const handleDuplicatePromotion = useCallback(async (promotion) => {
    const duplicate = {
      ...promotion,
      id: undefined,
      name: `${promotion.name} (Kopie)`,
      code: promotion.code ? `${promotion.code}-COPY` : undefined,
      status: 'draft',
      redemptions: 0,
      views: 0,
      totalSavings: 0,
      createdAt: undefined,
      updatedAt: undefined
    };
    
    await handleCreatePromotion(duplicate);
  }, [handleCreatePromotion]);
  
  // ==========================================================================
  // FILTERING
  // ==========================================================================
  const filteredPromotions = promotionList.filter(promotion => {
    // Status filter
    if (filterStatus !== 'all' && promotion.status !== filterStatus) {
      return false;
    }
    
    // Type filter
    if (filterType !== 'all' && promotion.type !== filterType) {
      return false;
    }
    
    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        promotion.name.toLowerCase().includes(query) ||
        promotion.description?.toLowerCase().includes(query) ||
        promotion.code?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });
  
  // ==========================================================================
  // EXPORT
  // ==========================================================================
  const handleExportPromotions = useCallback(async () => {
    try {
      const data = filteredPromotions.map(promo => ({
        Name: promo.name,
        Typ: PROMOTION_TYPES[promo.type]?.name || promo.type,
        Wert: promo.value,
        Code: promo.code || '-',
        Status: PROMOTION_STATUSES[promo.status]?.name || promo.status,
        'Start Datum': format(new Date(promo.startDate), 'dd.MM.yyyy', { locale: de }),
        'End Datum': format(new Date(promo.endDate), 'dd.MM.yyyy', { locale: de }),
        Einlösungen: promo.redemptions || 0,
        'Gesamt Ersparnis': `CHF ${(promo.totalSavings || 0).toFixed(2)}`
      }));
      
      // Convert to CSV
      const csv = convertToCSV(data);
      downloadFile(csv, `promotions-${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv');
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [filteredPromotions]);
  
  // ==========================================================================
  // RENDER
  // ==========================================================================
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner size="large" />
        <p>Lade Aktionen...</p>
      </div>
    );
  }
  
  return (
    <div className={styles.promotionManagement}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Aktionen & Rabatte</h1>
          <p className={styles.subtitle}>
            Verwalten Sie Ihre Marketing-Aktionen und Sonderangebote
          </p>
        </div>
        
        <div className={styles.headerRight}>
          <button
            className={`${styles.button} ${styles.secondary}`}
            onClick={handleExportPromotions}
          >
            <Download size={20} />
            Exportieren
          </button>
          
          <button
            className={`${styles.button} ${styles.primary}`}
            onClick={() => {
              setSelectedPromotion(null);
              setShowModal(true);
            }}
          >
            <Plus size={20} />
            Neue Aktion
          </button>
        </div>
      </div>
      
      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: '#dbeafe' }}>
            <Tag size={24} color="#3b82f6" />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.totalPromotions}</div>
            <div className={styles.statLabel}>Aktionen Total</div>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: '#d1fae5' }}>
            <CheckCircle size={24} color="#10b981" />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.activePromotions}</div>
            <div className={styles.statLabel}>Aktive Aktionen</div>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: '#fef3c7' }}>
            <Gift size={24} color="#f59e0b" />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.totalRedemptions}</div>
            <div className={styles.statLabel}>Einlösungen</div>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: '#ede9fe' }}>
            <DollarSign size={24} color="#8b5cf6" />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>CHF {stats.totalSavings.toFixed(2)}</div>
            <div className={styles.statLabel}>Kundenersparnis</div>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: '#fce7f3' }}>
            <TrendingUp size={24} color="#ec4899" />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.conversionRate.toFixed(1)}%</div>
            <div className={styles.statLabel}>Conversion Rate</div>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filtersLeft}>
          <input
            type="search"
            placeholder="Suche nach Name, Code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Alle Status</option>
            {Object.entries(PROMOTION_STATUSES).map(([key, status]) => (
              <option key={key} value={key}>{status.name}</option>
            ))}
          </select>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Alle Typen</option>
            {Object.entries(PROMOTION_TYPES).map(([key, type]) => (
              <option key={key} value={key}>{type.name}</option>
            ))}
          </select>
        </div>
        
        <div className={styles.filtersRight}>
          <div className={styles.resultCount}>
            {filteredPromotions.length} Aktionen
          </div>
        </div>
      </div>
      
      {/* Promotions Grid */}
      {filteredPromotions.length > 0 ? (
        <div className={styles.promotionsGrid}>
          {filteredPromotions.map(promotion => (
            <PromotionCard
              key={promotion.id}
              promotion={promotion}
              onEdit={() => {
                setSelectedPromotion(promotion);
                setShowModal(true);
              }}
              onToggle={() => handleTogglePromotion(promotion)}
              onDuplicate={() => handleDuplicatePromotion(promotion)}
              onDelete={() => handleDeletePromotion(promotion.id)}
              onViewStats={() => {
                // Open stats modal
                console.log('View stats for', promotion.id);
              }}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Tag size={48} />
          <h3>Keine Aktionen gefunden</h3>
          <p>Erstellen Sie Ihre erste Aktion, um Kunden anzulocken</p>
          <button
            className={`${styles.button} ${styles.primary}`}
            onClick={() => {
              setSelectedPromotion(null);
              setShowModal(true);
            }}
          >
            <Plus size={20} />
            Erste Aktion erstellen
          </button>
        </div>
      )}
      
      {/* Promotion Modal */}
      {showModal && (
        <PromotionModal
          promotion={selectedPromotion}
          onSave={selectedPromotion ? 
            (data) => handleUpdatePromotion(selectedPromotion.id, data) : 
            handleCreatePromotion
          }
          onClose={() => {
            setShowModal(false);
            setSelectedPromotion(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function convertToCSV(data) {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      // Escape quotes and wrap in quotes if contains comma
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );
  
  return [headers.join(','), ...rows].join('\n');
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}