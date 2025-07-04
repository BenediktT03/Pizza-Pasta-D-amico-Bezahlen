/**
 * EATECH - Discount Manager System
 * Version: 20.0.0
 * Description: Umfassendes Rabatt- und Gutscheinverwaltungssystem
 * Features: Gutscheine, Rabatte, Aktionscodes, Automatische Rabatte, Analytics
 * File Path: /src/pages/DiscountManager/DiscountManager.jsx
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Tag, Percent, Gift, Zap, Calendar, Users,
  Clock, DollarSign, ShoppingCart, Package,
  Plus, Edit2, Trash2, Copy, Download, Upload,
  Search, Filter, BarChart3, TrendingUp,
  CheckCircle, XCircle, AlertCircle, Info,
  Code, Sparkles, Timer, Target, Layers,
  CreditCard, Truck, Coffee, Pizza, Star
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import styles from './DiscountManager.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const DISCOUNT_TYPES = {
  PERCENTAGE: { label: 'Prozentual', icon: Percent, format: (v) => `${v}%` },
  FIXED: { label: 'Festbetrag', icon: DollarSign, format: (v) => `CHF ${v}` },
  BOGO: { label: 'Buy One Get One', icon: Gift, format: () => 'BOGO' },
  FREEITEM: { label: 'Gratis Artikel', icon: Package, format: () => 'Gratis' },
  SHIPPING: { label: 'Versandkosten', icon: Truck, format: () => 'Gratis Versand' }
};

const DISCOUNT_CONDITIONS = {
  MIN_AMOUNT: { label: 'Mindestbestellwert', icon: DollarSign },
  MIN_ITEMS: { label: 'Mindestanzahl Artikel', icon: ShoppingCart },
  SPECIFIC_PRODUCTS: { label: 'Bestimmte Produkte', icon: Package },
  SPECIFIC_CATEGORIES: { label: 'Bestimmte Kategorien', icon: Layers },
  CUSTOMER_GROUP: { label: 'Kundengruppe', icon: Users },
  FIRST_ORDER: { label: 'Erstbestellung', icon: Sparkles },
  TIME_BASED: { label: 'Zeitbasiert', icon: Clock },
  LOYALTY_TIER: { label: 'Loyalitätsstufe', icon: Star }
};

const PROMO_CATEGORIES = {
  SEASONAL: { label: 'Saisonal', color: '#FF6B6B' },
  FLASH: { label: 'Flash Sale', color: '#FFD700' },
  LOYALTY: { label: 'Treue', color: '#4ECDC4' },
  WELCOME: { label: 'Willkommen', color: '#95E1D3' },
  CLEARANCE: { label: 'Ausverkauf', color: '#F38181' },
  SPECIAL: { label: 'Special', color: '#AA96DA' }
};

// Mock Data Generator
const generateMockDiscounts = () => [
  {
    id: 'DISC001',
    code: 'WELCOME10',
    name: 'Willkommensrabatt',
    description: '10% Rabatt für Neukunden',
    type: 'PERCENTAGE',
    value: 10,
    category: 'WELCOME',
    conditions: {
      type: 'FIRST_ORDER',
      value: true
    },
    usage: {
      limit: -1, // unlimited
      perCustomer: 1,
      used: 234
    },
    validity: {
      from: new Date('2025-01-01'),
      to: new Date('2025-12-31'),
      days: ['all'],
      hours: ['all']
    },
    active: true,
    autoApply: false,
    stackable: false,
    createdAt: new Date('2025-01-01'),
    stats: {
      revenue: 12450,
      orders: 234,
      avgOrderValue: 53.2
    }
  },
  {
    id: 'DISC002',
    code: 'PIZZA20',
    name: 'Pizza Lover Rabatt',
    description: '20% auf alle Pizzen',
    type: 'PERCENTAGE',
    value: 20,
    category: 'SPECIAL',
    conditions: {
      type: 'SPECIFIC_CATEGORIES',
      value: ['pizza']
    },
    usage: {
      limit: 500,
      perCustomer: 3,
      used: 127
    },
    validity: {
      from: new Date('2025-01-01'),
      to: new Date('2025-01-31'),
      days: ['all'],
      hours: ['all']
    },
    active: true,
    autoApply: true,
    stackable: false,
    createdAt: new Date('2025-01-01'),
    stats: {
      revenue: 8920,
      orders: 127,
      avgOrderValue: 70.2
    }
  },
  {
    id: 'DISC003',
    code: 'HAPPY50',
    name: 'Happy Hour 50%',
    description: '50% Rabatt von 14-16 Uhr',
    type: 'PERCENTAGE',
    value: 50,
    category: 'FLASH',
    conditions: {
      type: 'TIME_BASED',
      value: { hours: [14, 15] }
    },
    usage: {
      limit: -1,
      perCustomer: 1,
      used: 89
    },
    validity: {
      from: new Date('2025-01-01'),
      to: new Date('2025-01-31'),
      days: ['mon', 'tue', 'wed', 'thu', 'fri'],
      hours: [14, 15]
    },
    active: true,
    autoApply: true,
    stackable: false,
    createdAt: new Date('2025-01-01'),
    stats: {
      revenue: 4450,
      orders: 89,
      avgOrderValue: 50
    }
  },
  {
    id: 'DISC004',
    code: 'FREE_DELIVERY',
    name: 'Gratis Lieferung',
    description: 'Kostenlose Lieferung ab CHF 30',
    type: 'SHIPPING',
    value: 0,
    category: 'SPECIAL',
    conditions: {
      type: 'MIN_AMOUNT',
      value: 30
    },
    usage: {
      limit: -1,
      perCustomer: -1,
      used: 567
    },
    validity: {
      from: new Date('2025-01-01'),
      to: new Date('2025-12-31'),
      days: ['all'],
      hours: ['all']
    },
    active: true,
    autoApply: true,
    stackable: true,
    createdAt: new Date('2025-01-01'),
    stats: {
      revenue: 28350,
      orders: 567,
      avgOrderValue: 50
    }
  },
  {
    id: 'DISC005',
    code: 'VIP_GOLD',
    name: 'Gold Member Bonus',
    description: '15% für Gold Mitglieder',
    type: 'PERCENTAGE',
    value: 15,
    category: 'LOYALTY',
    conditions: {
      type: 'LOYALTY_TIER',
      value: ['GOLD', 'PLATINUM']
    },
    usage: {
      limit: -1,
      perCustomer: -1,
      used: 342
    },
    validity: {
      from: new Date('2025-01-01'),
      to: new Date('2025-12-31'),
      days: ['all'],
      hours: ['all']
    },
    active: true,
    autoApply: true,
    stackable: false,
    createdAt: new Date('2025-01-01'),
    stats: {
      revenue: 34200,
      orders: 342,
      avgOrderValue: 100
    }
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const DiscountManager = () => {
  // State Management
  const [activeTab, setActiveTab] = useState('active');
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [bulkCodes, setBulkCodes] = useState([]);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Load Data
  useEffect(() => {
    loadDiscounts();
  }, []);

  const loadDiscounts = async () => {
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setDiscounts(generateMockDiscounts());
    } catch (error) {
      toast.error('Fehler beim Laden der Rabatte');
    } finally {
      setLoading(false);
    }
  };

  // Statistics
  const statistics = useMemo(() => {
    const stats = {
      totalDiscounts: discounts.length,
      activeDiscounts: discounts.filter(d => d.active).length,
      totalUsage: discounts.reduce((sum, d) => sum + d.usage.used, 0),
      totalRevenue: discounts.reduce((sum, d) => sum + (d.stats?.revenue || 0), 0),
      avgDiscountValue: 0,
      popularDiscounts: discounts.sort((a, b) => b.usage.used - a.usage.used).slice(0, 3),
      expiringDiscounts: discounts.filter(d => {
        const daysUntilExpiry = Math.ceil((new Date(d.validity.to) - new Date()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
      })
    };

    const totalDiscountValue = discounts.reduce((sum, d) => {
      if (d.type === 'PERCENTAGE') return sum + d.value;
      if (d.type === 'FIXED') return sum + (d.value / 50 * 100); // Assume avg order 50 CHF
      return sum;
    }, 0);
    
    stats.avgDiscountValue = stats.totalDiscounts > 0 
      ? (totalDiscountValue / stats.totalDiscounts).toFixed(1)
      : 0;

    return stats;
  }, [discounts]);

  // Filtered Discounts
  const filteredDiscounts = useMemo(() => {
    let filtered = [...discounts];

    // Tab filter
    if (activeTab === 'active') {
      filtered = filtered.filter(d => d.active && new Date(d.validity.to) > new Date());
    } else if (activeTab === 'scheduled') {
      filtered = filtered.filter(d => new Date(d.validity.from) > new Date());
    } else if (activeTab === 'expired') {
      filtered = filtered.filter(d => new Date(d.validity.to) < new Date());
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(discount =>
        discount.code.toLowerCase().includes(term) ||
        discount.name.toLowerCase().includes(term) ||
        discount.description.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (filterCategory !== 'ALL') {
      filtered = filtered.filter(d => d.category === filterCategory);
    }

    // Type filter
    if (filterType !== 'ALL') {
      filtered = filtered.filter(d => d.type === filterType);
    }

    return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [discounts, activeTab, searchTerm, filterCategory, filterType]);

  // Handlers
  const handleCreateDiscount = async (discountData) => {
    try {
      const newDiscount = {
        ...discountData,
        id: `DISC${String(discounts.length + 1).padStart(3, '0')}`,
        usage: { limit: -1, perCustomer: 1, used: 0 },
        createdAt: new Date(),
        stats: { revenue: 0, orders: 0, avgOrderValue: 0 }
      };
      setDiscounts([...discounts, newDiscount]);
      toast.success('Rabatt erfolgreich erstellt');
      setShowCreateModal(false);
    } catch (error) {
      toast.error('Fehler beim Erstellen des Rabatts');
    }
  };

  const handleEditDiscount = async (discountData) => {
    try {
      setDiscounts(discounts.map(d => 
        d.id === selectedDiscount.id ? { ...d, ...discountData } : d
      ));
      toast.success('Rabatt erfolgreich aktualisiert');
      setShowEditModal(false);
    } catch (error) {
      toast.error('Fehler beim Aktualisieren des Rabatts');
    }
  };

  const handleDeleteDiscount = async (discountId) => {
    if (window.confirm('Möchten Sie diesen Rabatt wirklich löschen?')) {
      try {
        setDiscounts(discounts.filter(d => d.id !== discountId));
        toast.success('Rabatt erfolgreich gelöscht');
      } catch (error) {
        toast.error('Fehler beim Löschen des Rabatts');
      }
    }
  };

  const handleToggleDiscount = async (discountId) => {
    try {
      setDiscounts(discounts.map(d => 
        d.id === discountId ? { ...d, active: !d.active } : d
      ));
      toast.success('Status erfolgreich geändert');
    } catch (error) {
      toast.error('Fehler beim Statuswechsel');
    }
  };

  const handleDuplicateDiscount = (discount) => {
    const newDiscount = {
      ...discount,
      id: `DISC${String(discounts.length + 1).padStart(3, '0')}`,
      code: `${discount.code}_COPY`,
      name: `${discount.name} (Kopie)`,
      usage: { limit: -1, perCustomer: 1, used: 0 },
      createdAt: new Date(),
      stats: { revenue: 0, orders: 0, avgOrderValue: 0 }
    };
    setDiscounts([...discounts, newDiscount]);
    toast.success('Rabatt erfolgreich dupliziert');
  };

  const generateBulkCodes = (baseCode, count, type) => {
    const codes = [];
    for (let i = 1; i <= count; i++) {
      codes.push({
        code: `${baseCode}${String(i).padStart(4, '0')}`,
        type: type,
        used: false
      });
    }
    setBulkCodes(codes);
    setShowBulkModal(true);
  };

  const exportDiscounts = () => {
    const csv = convertToCSV(filteredDiscounts);
    downloadCSV(csv, `rabatte_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Export erfolgreich');
  };

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  const renderStatistics = () => (
    <div className={styles.statistics}>
      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <Tag />
        </div>
        <div className={styles.statContent}>
          <h3>{statistics.totalDiscounts}</h3>
          <p>Rabatte gesamt</p>
          <span className={styles.statSubtext}>
            {statistics.activeDiscounts} aktiv
          </span>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <ShoppingCart />
        </div>
        <div className={styles.statContent}>
          <h3>{statistics.totalUsage.toLocaleString()}</h3>
          <p>Verwendungen</p>
          <span className={styles.statChange}>
            <TrendingUp size={14} /> +23% diese Woche
          </span>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <DollarSign />
        </div>
        <div className={styles.statContent}>
          <h3>CHF {(statistics.totalRevenue / 1000).toFixed(1)}k</h3>
          <p>Generierter Umsatz</p>
          <span className={styles.statSubtext}>
            Mit Rabatten
          </span>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <Percent />
        </div>
        <div className={styles.statContent}>
          <h3>{statistics.avgDiscountValue}%</h3>
          <p>Ø Rabattwert</p>
          <span className={styles.statSubtext}>
            Über alle Typen
          </span>
        </div>
      </div>
    </div>
  );

  const renderQuickInsights = () => (
    <div className={styles.quickInsights}>
      <div className={styles.insightCard}>
        <h3>Beliebteste Rabatte</h3>
        <div className={styles.popularList}>
          {statistics.popularDiscounts.map((discount, index) => (
            <div key={discount.id} className={styles.popularItem}>
              <div className={styles.popularRank}>{index + 1}</div>
              <div className={styles.popularInfo}>
                <h4>{discount.name}</h4>
                <p>{discount.code}</p>
              </div>
              <div className={styles.popularStats}>
                <span>{discount.usage.used}x</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.insightCard}>
        <h3>Bald ablaufend</h3>
        <div className={styles.expiringList}>
          {statistics.expiringDiscounts.length > 0 ? (
            statistics.expiringDiscounts.map(discount => {
              const daysLeft = Math.ceil((new Date(discount.validity.to) - new Date()) / (1000 * 60 * 60 * 24));
              return (
                <div key={discount.id} className={styles.expiringItem}>
                  <AlertCircle size={16} className={styles.warningIcon} />
                  <div className={styles.expiringInfo}>
                    <h4>{discount.name}</h4>
                    <p>{daysLeft} Tage verbleibend</p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className={styles.noData}>Keine ablaufenden Rabatte</p>
          )}
        </div>
      </div>

      <div className={styles.insightCard}>
        <h3>Automatische Rabatte</h3>
        <div className={styles.autoApplyList}>
          {discounts.filter(d => d.autoApply && d.active).map(discount => (
            <div key={discount.id} className={styles.autoApplyItem}>
              <Zap size={16} className={styles.autoIcon} />
              <span>{discount.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderDiscountsList = () => (
    <div className={styles.discountsList}>
      {filteredDiscounts.map(discount => {
        const isExpired = new Date(discount.validity.to) < new Date();
        const isScheduled = new Date(discount.validity.from) > new Date();
        
        return (
          <div 
            key={discount.id} 
            className={`${styles.discountCard} ${!discount.active ? styles.inactive : ''} ${isExpired ? styles.expired : ''}`}
          >
            <div className={styles.discountHeader}>
              <div className={styles.discountTitle}>
                <div 
                  className={styles.typeIcon}
                  style={{ backgroundColor: PROMO_CATEGORIES[discount.category]?.color + '20' }}
                >
                  {React.createElement(DISCOUNT_TYPES[discount.type].icon, {
                    size: 20,
                    color: PROMO_CATEGORIES[discount.category]?.color
                  })}
                </div>
                <div>
                  <h3>{discount.name}</h3>
                  <div className={styles.codeWrapper}>
                    <code className={styles.discountCode}>{discount.code}</code>
                    <button 
                      className={styles.copyButton}
                      onClick={() => {
                        navigator.clipboard.writeText(discount.code);
                        toast.success('Code kopiert!');
                      }}
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className={styles.discountActions}>
                <button
                  onClick={() => {
                    setSelectedDiscount(discount);
                    setShowAnalyticsModal(true);
                  }}
                  title="Analytics"
                >
                  <BarChart3 size={16} />
                </button>
                <button
                  onClick={() => {
                    setSelectedDiscount(discount);
                    setShowEditModal(true);
                  }}
                  title="Bearbeiten"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDuplicateDiscount(discount)}
                  title="Duplizieren"
                >
                  <Copy size={16} />
                </button>
                <button
                  onClick={() => handleToggleDiscount(discount.id)}
                  title={discount.active ? 'Deaktivieren' : 'Aktivieren'}
                >
                  {discount.active ? <XCircle size={16} /> : <CheckCircle size={16} />}
                </button>
                <button
                  onClick={() => handleDeleteDiscount(discount.id)}
                  title="Löschen"
                  className={styles.danger}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className={styles.discountBody}>
              <p className={styles.description}>{discount.description}</p>
              
              <div className={styles.discountDetails}>
                <div className={styles.detailItem}>
                  <span className={styles.label}>Wert:</span>
                  <span className={styles.value}>
                    {DISCOUNT_TYPES[discount.type].format(discount.value)}
                  </span>
                </div>
                
                <div className={styles.detailItem}>
                  <span className={styles.label}>Bedingung:</span>
                  <span className={styles.value}>
                    {React.createElement(DISCOUNT_CONDITIONS[discount.conditions.type].icon, { size: 14 })}
                    {DISCOUNT_CONDITIONS[discount.conditions.type].label}
                  </span>
                </div>
                
                <div className={styles.detailItem}>
                  <span className={styles.label}>Gültigkeit:</span>
                  <span className={styles.value}>
                    {new Date(discount.validity.from).toLocaleDateString('de-CH')} - 
                    {new Date(discount.validity.to).toLocaleDateString('de-CH')}
                  </span>
                </div>
              </div>

              <div className={styles.discountStats}>
                <div className={styles.statItem}>
                  <span>{discount.usage.used}</span>
                  <span>Verwendet</span>
                </div>
                <div className={styles.statItem}>
                  <span>CHF {(discount.stats?.revenue || 0).toFixed(0)}</span>
                  <span>Umsatz</span>
                </div>
                <div className={styles.statItem}>
                  <span>{discount.usage.limit === -1 ? '∞' : discount.usage.limit - discount.usage.used}</span>
                  <span>Verfügbar</span>
                </div>
              </div>

              <div className={styles.discountTags}>
                <span className={`${styles.tag} ${styles.categoryTag}`} style={{ backgroundColor: PROMO_CATEGORIES[discount.category]?.color + '20', color: PROMO_CATEGORIES[discount.category]?.color }}>
                  {PROMO_CATEGORIES[discount.category]?.label}
                </span>
                {discount.autoApply && (
                  <span className={`${styles.tag} ${styles.autoTag}`}>
                    <Zap size={12} /> Auto-Apply
                  </span>
                )}
                {discount.stackable && (
                  <span className={`${styles.tag} ${styles.stackTag}`}>
                    <Layers size={12} /> Kombinierbar
                  </span>
                )}
                {isScheduled && (
                  <span className={`${styles.tag} ${styles.scheduledTag}`}>
                    <Clock size={12} /> Geplant
                  </span>
                )}
                {isExpired && (
                  <span className={`${styles.tag} ${styles.expiredTag}`}>
                    <XCircle size={12} /> Abgelaufen
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderCreateModal = () => (
    <div className={styles.modal} onClick={() => setShowCreateModal(false)}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Neuen Rabatt erstellen</h2>
          <button onClick={() => setShowCreateModal(false)}>×</button>
        </div>
        
        <div className={styles.modalBody}>
          <form className={styles.discountForm} onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const discountData = {
              code: formData.get('code'),
              name: formData.get('name'),
              description: formData.get('description'),
              type: formData.get('type'),
              value: parseFloat(formData.get('value')),
              category: formData.get('category'),
              conditions: {
                type: formData.get('conditionType'),
                value: formData.get('conditionValue')
              },
              validity: {
                from: new Date(formData.get('validFrom')),
                to: new Date(formData.get('validTo')),
                days: ['all'],
                hours: ['all']
              },
              active: formData.get('active') === 'on',
              autoApply: formData.get('autoApply') === 'on',
              stackable: formData.get('stackable') === 'on'
            };
            handleCreateDiscount(discountData);
          }}>
            <div className={styles.formSection}>
              <h3>Grundinformationen</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Rabattcode*</label>
                  <input 
                    type="text" 
                    name="code"
                    placeholder="z.B. SOMMER20"
                    required
                    pattern="[A-Z0-9_]+"
                    style={{ textTransform: 'uppercase' }}
                  />
                  <small>Nur Großbuchstaben, Zahlen und Unterstriche</small>
                </div>
                
                <div className={styles.formGroup}>
                  <label>Name*</label>
                  <input 
                    type="text" 
                    name="name"
                    placeholder="z.B. Sommeraktion 20%"
                    required
                  />
                </div>
                
                <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                  <label>Beschreibung</label>
                  <textarea 
                    name="description"
                    placeholder="Beschreiben Sie den Rabatt..."
                    rows="3"
                  />
                </div>
              </div>
            </div>

            <div className={styles.formSection}>
              <h3>Rabattwert</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Typ*</label>
                  <select name="type" required>
                    {Object.entries(DISCOUNT_TYPES).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className={styles.formGroup}>
                  <label>Wert*</label>
                  <input 
                    type="number" 
                    name="value"
                    placeholder="z.B. 20"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>Kategorie*</label>
                  <select name="category" required>
                    {Object.entries(PROMO_CATEGORIES).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.formSection}>
              <h3>Bedingungen</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Bedingungstyp</label>
                  <select name="conditionType">
                    <option value="">Keine Bedingung</option>
                    {Object.entries(DISCOUNT_CONDITIONS).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className={styles.formGroup}>
                  <label>Bedingungswert</label>
                  <input 
                    type="text" 
                    name="conditionValue"
                    placeholder="z.B. 50"
                  />
                </div>
              </div>
            </div>

            <div className={styles.formSection}>
              <h3>Gültigkeit</h3>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Gültig von*</label>
                  <input 
                    type="datetime-local" 
                    name="validFrom"
                    required
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>Gültig bis*</label>
                  <input 
                    type="datetime-local" 
                    name="validTo"
                    required
                  />
                </div>
              </div>
            </div>

            <div className={styles.formSection}>
              <h3>Optionen</h3>
              <div className={styles.checkboxGroup}>
                <label>
                  <input type="checkbox" name="active" defaultChecked />
                  <span>Aktiv</span>
                </label>
                <label>
                  <input type="checkbox" name="autoApply" />
                  <span>Automatisch anwenden</span>
                </label>
                <label>
                  <input type="checkbox" name="stackable" />
                  <span>Mit anderen Rabatten kombinierbar</span>
                </label>
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="button" onClick={() => setShowCreateModal(false)}>
                Abbrechen
              </button>
              <button type="submit" className={styles.primaryButton}>
                <Plus size={16} /> Rabatt erstellen
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  if (loading) {
    return (
      <div className={styles.loading}>
        <Tag className={styles.spinner} />
        <p>Lade Rabatte...</p>
      </div>
    );
  }

  return (
    <div className={styles.discountManager}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <Tag size={32} />
          <h1>Rabatt-Verwaltung</h1>
        </div>
        
        <div className={styles.headerActions}>
          <button 
            className={styles.createButton}
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={16} /> Neuer Rabatt
          </button>
          <button 
            className={styles.bulkButton}
            onClick={() => generateBulkCodes('BULK', 100, 'PERCENTAGE')}
          >
            <Code size={16} /> Bulk-Codes
          </button>
          <button 
            className={styles.exportButton}
            onClick={exportDiscounts}
          >
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {renderStatistics()}
      {renderQuickInsights()}

      <div className={styles.controls}>
        <div className={styles.tabs}>
          <button 
            className={activeTab === 'active' ? styles.active : ''}
            onClick={() => setActiveTab('active')}
          >
            Aktiv ({discounts.filter(d => d.active && new Date(d.validity.to) > new Date()).length})
          </button>
          <button 
            className={activeTab === 'scheduled' ? styles.active : ''}
            onClick={() => setActiveTab('scheduled')}
          >
            Geplant ({discounts.filter(d => new Date(d.validity.from) > new Date()).length})
          </button>
          <button 
            className={activeTab === 'expired' ? styles.active : ''}
            onClick={() => setActiveTab('expired')}
          >
            Abgelaufen ({discounts.filter(d => new Date(d.validity.to) < new Date()).length})
          </button>
          <button 
            className={activeTab === 'all' ? styles.active : ''}
            onClick={() => setActiveTab('all')}
          >
            Alle ({discounts.length})
          </button>
        </div>

        <div className={styles.filters}>
          <div className={styles.searchBar}>
            <Search size={20} />
            <input
              type="text"
              placeholder="Suche nach Code, Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="ALL">Alle Kategorien</option>
            {Object.entries(PROMO_CATEGORIES).map(([key, value]) => (
              <option key={key} value={key}>{value.label}</option>
            ))}
          </select>
          
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="ALL">Alle Typen</option>
            {Object.entries(DISCOUNT_TYPES).map(([key, value]) => (
              <option key={key} value={key}>{value.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.content}>
        {filteredDiscounts.length > 0 ? (
          renderDiscountsList()
        ) : (
          <div className={styles.emptyState}>
            <Tag size={48} />
            <h3>Keine Rabatte gefunden</h3>
            <p>Erstellen Sie Ihren ersten Rabatt oder ändern Sie die Filter</p>
          </div>
        )}
      </div>

      {showCreateModal && renderCreateModal()}
    </div>
  );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const convertToCSV = (data) => {
  const headers = ['Code', 'Name', 'Typ', 'Wert', 'Kategorie', 'Verwendungen', 'Umsatz', 'Status'];
  const rows = data.map(discount => [
    discount.code,
    discount.name,
    DISCOUNT_TYPES[discount.type].label,
    DISCOUNT_TYPES[discount.type].format(discount.value),
    PROMO_CATEGORIES[discount.category]?.label,
    discount.usage.used,
    discount.stats?.revenue || 0,
    discount.active ? 'Aktiv' : 'Inaktiv'
  ]);
  
  return [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
};

const downloadCSV = (csv, filename) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

// ============================================================================
// EXPORT
// ============================================================================
export default DiscountManager;