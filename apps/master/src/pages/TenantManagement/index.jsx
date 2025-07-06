/**
 * EATECH - Tenant Management Page
 * Version: 1.0.0
 * Description: Multi-Tenant Verwaltung für Foodtrucks mit Subscription,
 *              Billing und individuellen Einstellungen
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/master/src/pages/TenantManagement/index.jsx
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Truck,
  Search,
  Filter,
  Plus,
  Edit3,
  Trash2,
  MoreVertical,
  ChevronRight,
  ChevronDown,
  Calendar,
  DollarSign,
  CreditCard,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Eye,
  EyeOff,
  Download,
  Upload,
  RefreshCw,
  Settings,
  Bell,
  Mail,
  Phone,
  Globe,
  Shield,
  Key,
  Lock,
  Unlock,
  Star,
  TrendingUp,
  TrendingDown,
  Package,
  Zap,
  Activity,
  BarChart3,
  PieChart,
  FileText,
  Copy,
  ExternalLink,
  UserPlus,
  UserMinus,
  Ban,
  Award,
  Tag,
  Hash,
  Layers,
  Database,
  Cpu,
  HardDrive,
  Wifi,
  WifiOff,
  Image,
  MessageSquare
} from 'lucide-react';
import styles from './TenantManagement.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const SUBSCRIPTION_PLANS = {
  free: {
    label: 'Free',
    price: 0,
    color: '#6b7280',
    features: ['50 Bestellungen/Monat', 'Basis-Analytics', 'Email Support'],
    limits: { orders: 50, products: 20, staff: 1 }
  },
  starter: {
    label: 'Starter',
    price: 49,
    color: '#3b82f6',
    features: ['500 Bestellungen/Monat', 'Erweiterte Analytics', 'Priority Support', 'Custom Domain'],
    limits: { orders: 500, products: 50, staff: 3 }
  },
  professional: {
    label: 'Professional',
    price: 99,
    color: '#8b5cf6',
    features: ['2000 Bestellungen/Monat', 'AI Features', 'API Zugang', 'Multi-Location'],
    limits: { orders: 2000, products: 200, staff: 10 }
  },
  enterprise: {
    label: 'Enterprise',
    price: 299,
    color: '#10b981',
    features: ['Unbegrenzte Bestellungen', 'White Label', 'Dedicated Support', 'Custom Features'],
    limits: { orders: -1, products: -1, staff: -1 }
  }
};

const TENANT_STATUS = {
  active: { label: 'Aktiv', color: '#10b981', icon: CheckCircle },
  suspended: { label: 'Gesperrt', color: '#f59e0b', icon: AlertCircle },
  inactive: { label: 'Inaktiv', color: '#6b7280', icon: XCircle },
  trial: { label: 'Testphase', color: '#3b82f6', icon: Clock },
  pending: { label: 'Ausstehend', color: '#8b5cf6', icon: Clock }
};

const CATEGORIES = {
  italian: 'Italienisch',
  asian: 'Asiatisch',
  american: 'Amerikanisch',
  mexican: 'Mexikanisch',
  swiss: 'Schweizer Küche',
  vegetarian: 'Vegetarisch',
  vegan: 'Vegan',
  dessert: 'Desserts',
  beverages: 'Getränke',
  other: 'Sonstiges'
};

// ============================================================================
// MOCK DATA
// ============================================================================
const MOCK_TENANTS = [
  {
    id: 'tenant_001',
    name: 'Bella Italia Express',
    slug: 'bella-italia',
    category: 'italian',
    owner: {
      name: 'Marco Rossi',
      email: 'marco@bellaitalia.ch',
      phone: '+41 79 123 45 67'
    },
    subscription: {
      plan: 'professional',
      status: 'active',
      startDate: '2024-06-15',
      nextBilling: '2025-02-15',
      monthlyRevenue: 99
    },
    status: 'active',
    created: '2024-06-15T10:00:00Z',
    locations: ['Zürich HB', 'Paradeplatz'],
    stats: {
      totalOrders: 12453,
      monthlyOrders: 1847,
      totalRevenue: 458230,
      monthlyRevenue: 67890,
      avgOrderValue: 36.80,
      rating: 4.8,
      reviews: 342
    },
    usage: {
      orders: { current: 1847, limit: 2000 },
      products: { current: 45, limit: 200 },
      staff: { current: 4, limit: 10 },
      storage: { current: 2.3, limit: 10 } // GB
    },
    features: {
      aiPricing: true,
      loyaltyProgram: true,
      multiLocation: true,
      customDomain: true,
      apiAccess: true
    },
    lastActivity: '2025-01-08T14:30:00Z'
  },
  {
    id: 'tenant_002',
    name: 'Thai Street Kitchen',
    slug: 'thai-street',
    category: 'asian',
    owner: {
      name: 'Somchai Thanakit',
      email: 'info@thaistreet.ch',
      phone: '+41 78 234 56 78'
    },
    subscription: {
      plan: 'starter',
      status: 'active',
      startDate: '2024-09-01',
      nextBilling: '2025-02-01',
      monthlyRevenue: 49
    },
    status: 'active',
    created: '2024-09-01T14:00:00Z',
    locations: ['Bern Bahnhof'],
    stats: {
      totalOrders: 4892,
      monthlyOrders: 423,
      totalRevenue: 187340,
      monthlyRevenue: 16790,
      avgOrderValue: 39.70,
      rating: 4.9,
      reviews: 198
    },
    usage: {
      orders: { current: 423, limit: 500 },
      products: { current: 28, limit: 50 },
      staff: { current: 2, limit: 3 },
      storage: { current: 0.8, limit: 5 }
    },
    features: {
      aiPricing: false,
      loyaltyProgram: true,
      multiLocation: false,
      customDomain: true,
      apiAccess: false
    },
    lastActivity: '2025-01-08T13:15:00Z'
  },
  {
    id: 'tenant_003',
    name: 'Burger Brothers',
    slug: 'burger-brothers',
    category: 'american',
    owner: {
      name: 'Mike Johnson',
      email: 'mike@burgerbrothers.ch',
      phone: '+41 76 345 67 89'
    },
    subscription: {
      plan: 'free',
      status: 'active',
      startDate: '2025-01-01',
      nextBilling: null,
      monthlyRevenue: 0
    },
    status: 'trial',
    created: '2025-01-01T09:00:00Z',
    locations: ['Basel Marktplatz'],
    stats: {
      totalOrders: 47,
      monthlyOrders: 47,
      totalRevenue: 1890,
      monthlyRevenue: 1890,
      avgOrderValue: 40.20,
      rating: 4.5,
      reviews: 12
    },
    usage: {
      orders: { current: 47, limit: 50 },
      products: { current: 15, limit: 20 },
      staff: { current: 1, limit: 1 },
      storage: { current: 0.2, limit: 1 }
    },
    features: {
      aiPricing: false,
      loyaltyProgram: false,
      multiLocation: false,
      customDomain: false,
      apiAccess: false
    },
    lastActivity: '2025-01-08T11:45:00Z'
  },
  {
    id: 'tenant_004',
    name: 'Taco Fiesta',
    slug: 'taco-fiesta',
    category: 'mexican',
    owner: {
      name: 'Carlos Rodriguez',
      email: 'carlos@tacofiesta.ch',
      phone: '+41 77 456 78 90'
    },
    subscription: {
      plan: 'professional',
      status: 'past_due',
      startDate: '2024-03-20',
      nextBilling: '2025-01-20',
      monthlyRevenue: 99
    },
    status: 'suspended',
    created: '2024-03-20T11:00:00Z',
    locations: ['Luzern Schwanenplatz', 'Luzern Bahnhof'],
    stats: {
      totalOrders: 18923,
      monthlyOrders: 0,
      totalRevenue: 512340,
      monthlyRevenue: 0,
      avgOrderValue: 27.10,
      rating: 4.7,
      reviews: 523
    },
    usage: {
      orders: { current: 0, limit: 2000 },
      products: { current: 38, limit: 200 },
      staff: { current: 5, limit: 10 },
      storage: { current: 3.1, limit: 10 }
    },
    features: {
      aiPricing: true,
      loyaltyProgram: true,
      multiLocation: true,
      customDomain: true,
      apiAccess: true
    },
    lastActivity: '2025-01-05T16:20:00Z',
    suspendedReason: 'Zahlungsrückstand - 2 Monate ausstehend'
  },
  {
    id: 'tenant_005',
    name: 'Sushi Master Zürich',
    slug: 'sushi-master',
    category: 'asian',
    owner: {
      name: 'Akiko Tanaka',
      email: 'info@sushimaster.ch',
      phone: '+41 79 567 89 01'
    },
    subscription: {
      plan: 'enterprise',
      status: 'active',
      startDate: '2023-11-01',
      nextBilling: '2025-02-01',
      monthlyRevenue: 299
    },
    status: 'active',
    created: '2023-11-01T08:00:00Z',
    locations: ['Zürich Paradeplatz', 'Zürich Oerlikon', 'Winterthur'],
    stats: {
      totalOrders: 34567,
      monthlyOrders: 3124,
      totalRevenue: 1876540,
      monthlyRevenue: 186430,
      avgOrderValue: 59.70,
      rating: 4.8,
      reviews: 876
    },
    usage: {
      orders: { current: 3124, limit: -1 },
      products: { current: 78, limit: -1 },
      staff: { current: 12, limit: -1 },
      storage: { current: 5.4, limit: -1 }
    },
    features: {
      aiPricing: true,
      loyaltyProgram: true,
      multiLocation: true,
      customDomain: true,
      apiAccess: true,
      whiteLabel: true,
      dedicatedSupport: true
    },
    lastActivity: '2025-01-08T15:45:00Z'
  }
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const calculateUsagePercentage = (current, limit) => {
  if (limit === -1) return 0; // Unlimited
  return (current / limit) * 100;
};

const getUsageStatus = (percentage) => {
  if (percentage >= 90) return 'critical';
  if (percentage >= 75) return 'warning';
  return 'normal';
};

const formatCurrency = (amount) => {
  return `CHF ${amount.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================
const TenantCard = ({ tenant, onView, onEdit, onAction }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const plan = SUBSCRIPTION_PLANS[tenant.subscription.plan];
  const status = TENANT_STATUS[tenant.status];
  const StatusIcon = status.icon;
  
  const orderUsage = calculateUsagePercentage(
    tenant.usage.orders.current,
    tenant.usage.orders.limit
  );
  const orderStatus = getUsageStatus(orderUsage);
  
  return (
    <div className={`${styles.tenantCard} ${styles[tenant.status]}`}>
      <div className={styles.cardHeader}>
        <div className={styles.tenantInfo}>
          <div className={styles.tenantLogo}>
            <Truck size={24} />
          </div>
          <div>
            <h3>{tenant.name}</h3>
            <div className={styles.tenantMeta}>
              <span className={styles.category}>{CATEGORIES[tenant.category]}</span>
              <span className={styles.slug}>@{tenant.slug}</span>
            </div>
          </div>
        </div>
        
        <div className={styles.cardActions}>
          <div 
            className={styles.statusBadge}
            style={{ backgroundColor: `${status.color}20`, color: status.color }}
          >
            <StatusIcon size={14} />
            <span>{status.label}</span>
          </div>
          
          <div className={styles.menuWrapper}>
            <button 
              className={styles.menuButton}
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreVertical size={18} />
            </button>
            
            {showMenu && (
              <div className={styles.dropdownMenu}>
                <button onClick={() => onView(tenant)}>
                  <Eye size={14} />
                  Details anzeigen
                </button>
                <button onClick={() => onEdit(tenant)}>
                  <Edit3 size={14} />
                  Bearbeiten
                </button>
                <button onClick={() => onAction(tenant, 'message')}>
                  <MessageSquare size={14} />
                  Nachricht senden
                </button>
                <button onClick={() => onAction(tenant, 'call')}>
                  <Phone size={14} />
                  Anrufen
                </button>
                <div className={styles.menuDivider} />
                {tenant.status === 'active' && (
                  <button onClick={() => onAction(tenant, 'suspend')}>
                    <Ban size={14} />
                    Sperren
                  </button>
                )}
                {tenant.status === 'suspended' && (
                  <button onClick={() => onAction(tenant, 'activate')}>
                    <CheckCircle size={14} />
                    Aktivieren
                  </button>
                )}
                <button 
                  onClick={() => onAction(tenant, 'delete')}
                  className={styles.deleteButton}
                >
                  <Trash2 size={14} />
                  Löschen
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {tenant.suspendedReason && (
        <div className={styles.suspendedAlert}>
          <AlertCircle size={16} />
          <span>{tenant.suspendedReason}</span>
        </div>
      )}
      
      <div className={styles.ownerInfo}>
        <Users size={14} />
        <span>{tenant.owner.name}</span>
        <span className={styles.separator}>•</span>
        <Mail size={14} />
        <span>{tenant.owner.email}</span>
      </div>
      
      <div className={styles.subscriptionInfo}>
        <div className={styles.planBadge} style={{ backgroundColor: `${plan.color}20`, color: plan.color }}>
          <Zap size={14} />
          <span>{plan.label} Plan</span>
        </div>
        <span className={styles.revenue}>{formatCurrency(plan.price)}/Monat</span>
      </div>
      
      <div className={styles.statsGrid}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Bestellungen (Monat)</span>
          <span className={styles.statValue}>{tenant.stats.monthlyOrders.toLocaleString()}</span>
          <div className={styles.usageBar}>
            <div 
              className={`${styles.usageFill} ${styles[orderStatus]}`}
              style={{ width: `${Math.min(orderUsage, 100)}%` }}
            />
          </div>
          <span className={styles.usageText}>
            {tenant.usage.orders.current} / {tenant.usage.orders.limit === -1 ? '∞' : tenant.usage.orders.limit}
          </span>
        </div>
        
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Umsatz (Monat)</span>
          <span className={styles.statValue}>{formatCurrency(tenant.stats.monthlyRevenue)}</span>
        </div>
        
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Ø Bestellwert</span>
          <span className={styles.statValue}>{formatCurrency(tenant.stats.avgOrderValue)}</span>
        </div>
        
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Bewertung</span>
          <div className={styles.rating}>
            <Star size={14} fill="#fbbf24" />
            <span className={styles.statValue}>{tenant.stats.rating}</span>
            <span className={styles.reviewCount}>({tenant.stats.reviews})</span>
          </div>
        </div>
      </div>
      
      <div className={styles.locationsSection}>
        <MapPin size={14} />
        <span className={styles.locationsList}>
          {tenant.locations.join(', ')}
        </span>
      </div>
      
      <div className={styles.cardFooter}>
        <button 
          className={styles.expandButton}
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Weniger' : 'Mehr'} Details
          {showDetails ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        
        <div className={styles.lastActivity}>
          <Clock size={12} />
          <span>Letzte Aktivität: {new Date(tenant.lastActivity).toLocaleString('de-CH')}</span>
        </div>
      </div>
      
      {showDetails && (
        <div className={styles.expandedDetails}>
          {/* Usage Details */}
          <div className={styles.usageSection}>
            <h4>Ressourcennutzung</h4>
            <div className={styles.usageGrid}>
              <div className={styles.usageItem}>
                <Package size={16} />
                <span>Produkte</span>
                <strong>{tenant.usage.products.current}/{tenant.usage.products.limit === -1 ? '∞' : tenant.usage.products.limit}</strong>
              </div>
              <div className={styles.usageItem}>
                <Users size={16} />
                <span>Mitarbeiter</span>
                <strong>{tenant.usage.staff.current}/{tenant.usage.staff.limit === -1 ? '∞' : tenant.usage.staff.limit}</strong>
              </div>
              <div className={styles.usageItem}>
                <HardDrive size={16} />
                <span>Speicher</span>
                <strong>{tenant.usage.storage.current}GB/{tenant.usage.storage.limit === -1 ? '∞' : tenant.usage.storage.limit}GB</strong>
              </div>
            </div>
          </div>
          
          {/* Features */}
          <div className={styles.featuresSection}>
            <h4>Aktivierte Features</h4>
            <div className={styles.featuresList}>
              {Object.entries(tenant.features).map(([key, enabled]) => (
                enabled && (
                  <span key={key} className={styles.featureTag}>
                    <CheckCircle size={12} />
                    {key}
                  </span>
                )
              ))}
            </div>
          </div>
          
          {/* Subscription Details */}
          <div className={styles.subscriptionDetails}>
            <div className={styles.subscriptionItem}>
              <Calendar size={14} />
              <span>Kunde seit: {new Date(tenant.created).toLocaleDateString('de-CH')}</span>
            </div>
            {tenant.subscription.nextBilling && (
              <div className={styles.subscriptionItem}>
                <CreditCard size={14} />
                <span>Nächste Abrechnung: {new Date(tenant.subscription.nextBilling).toLocaleDateString('de-CH')}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const TenantManagement = () => {
  const [tenants, setTenants] = useState(MOCK_TENANTS);
  const [filteredTenants, setFilteredTenants] = useState(MOCK_TENANTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('created_desc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  
  // Filter and sort tenants
  useEffect(() => {
    let filtered = [...tenants];
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(tenant =>
        tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.owner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.owner.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Plan filter
    if (selectedPlan !== 'all') {
      filtered = filtered.filter(tenant => tenant.subscription.plan === selectedPlan);
    }
    
    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(tenant => tenant.status === selectedStatus);
    }
    
    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(tenant => tenant.category === selectedCategory);
    }
    
    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'created_desc':
          return new Date(b.created) - new Date(a.created);
        case 'created_asc':
          return new Date(a.created) - new Date(b.created);
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'revenue_desc':
          return b.stats.monthlyRevenue - a.stats.monthlyRevenue;
        case 'orders_desc':
          return b.stats.monthlyOrders - a.stats.monthlyOrders;
        default:
          return 0;
      }
    });
    
    setFilteredTenants(filtered);
  }, [tenants, searchQuery, selectedPlan, selectedStatus, selectedCategory, sortBy]);
  
  // Calculate statistics
  const stats = useMemo(() => {
    const activeCount = tenants.filter(t => t.status === 'active').length;
    const totalRevenue = tenants.reduce((sum, t) => sum + t.subscription.monthlyRevenue, 0);
    const totalOrders = tenants.reduce((sum, t) => sum + t.stats.monthlyOrders, 0);
    
    return {
      total: tenants.length,
      active: activeCount,
      suspended: tenants.filter(t => t.status === 'suspended').length,
      trial: tenants.filter(t => t.status === 'trial').length,
      totalRevenue,
      totalOrders,
      avgRevenue: activeCount > 0 ? totalRevenue / activeCount : 0
    };
  }, [tenants]);
  
  // Handlers
  const handleView = (tenant) => {
    setSelectedTenant(tenant);
    // In real app, navigate to tenant details page
  };
  
  const handleEdit = (tenant) => {
    setSelectedTenant(tenant);
    setShowCreateModal(true);
  };
  
  const handleAction = (tenant, action) => {
    switch (action) {
      case 'suspend':
        setTenants(prev => prev.map(t => 
          t.id === tenant.id ? { ...t, status: 'suspended' } : t
        ));
        break;
      case 'activate':
        setTenants(prev => prev.map(t => 
          t.id === tenant.id ? { ...t, status: 'active' } : t
        ));
        break;
      case 'delete':
        if (confirm(`Foodtruck "${tenant.name}" wirklich löschen?`)) {
          setTenants(prev => prev.filter(t => t.id !== tenant.id));
        }
        break;
      case 'message':
        console.log('Send message to:', tenant.owner.email);
        break;
      case 'call':
        console.log('Call:', tenant.owner.phone);
        break;
    }
  };
  
  const handleExport = () => {
    const exportData = {
      tenants: tenants,
      exported: new Date().toISOString(),
      stats: stats
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tenants-export-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            <Truck size={32} className={styles.pageIcon} />
            <div>
              <h1>Tenant Management</h1>
              <p>Verwalten Sie alle Foodtrucks und deren Subscriptions</p>
            </div>
          </div>
          
          <button 
            className={styles.createButton}
            onClick={() => {
              setSelectedTenant(null);
              setShowCreateModal(true);
            }}
          >
            <Plus size={20} />
            Neuer Foodtruck
          </button>
        </div>
      </div>
      
      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <Truck size={24} />
          <div>
            <span className={styles.statValue}>{stats.total}</span>
            <span className={styles.statLabel}>Foodtrucks Total</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <CheckCircle size={24} style={{ color: '#10b981' }} />
          <div>
            <span className={styles.statValue}>{stats.active}</span>
            <span className={styles.statLabel}>Aktiv</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <DollarSign size={24} style={{ color: '#3b82f6' }} />
          <div>
            <span className={styles.statValue}>{formatCurrency(stats.totalRevenue)}</span>
            <span className={styles.statLabel}>Monatlicher Umsatz</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <Package size={24} style={{ color: '#f59e0b' }} />
          <div>
            <span className={styles.statValue}>{stats.totalOrders.toLocaleString()}</span>
            <span className={styles.statLabel}>Bestellungen/Monat</span>
          </div>
        </div>
      </div>
      
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBar}>
          <Search size={20} />
          <input
            type="text"
            placeholder="Foodtrucks suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}>
              <X size={16} />
            </button>
          )}
        </div>
        
        <div className={styles.filters}>
          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Alle Pläne</option>
            {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
              <option key={key} value={key}>{plan.label}</option>
            ))}
          </select>
          
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Alle Status</option>
            {Object.entries(TENANT_STATUS).map(([key, status]) => (
              <option key={key} value={key}>{status.label}</option>
            ))}
          </select>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Alle Kategorien</option>
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <option key={key} value={key}>{cat}</option>
            ))}
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="created_desc">Neueste zuerst</option>
            <option value="created_asc">Älteste zuerst</option>
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
            <option value="revenue_desc">Umsatz (hoch-niedrig)</option>
            <option value="orders_desc">Bestellungen (hoch-niedrig)</option>
          </select>
        </div>
        
        <div className={styles.toolbarActions}>
          <button
            className={`${styles.viewModeButton} ${viewMode === 'grid' ? styles.active : ''}`}
            onClick={() => setViewMode('grid')}
          >
            <Layers size={16} />
          </button>
          <button
            className={`${styles.viewModeButton} ${viewMode === 'list' ? styles.active : ''}`}
            onClick={() => setViewMode('list')}
          >
            <FileText size={16} />
          </button>
          
          <button className={styles.iconButton} onClick={handleExport}>
            <Download size={20} />
          </button>
          
          <button className={styles.iconButton}>
            <RefreshCw size={20} />
          </button>
        </div>
      </div>
      
      {/* Tenants Grid/List */}
      <div className={`${styles.tenantsContainer} ${styles[viewMode]}`}>
        {filteredTenants.length === 0 ? (
          <div className={styles.emptyState}>
            <Truck size={48} />
            <h3>Keine Foodtrucks gefunden</h3>
            <p>Fügen Sie Ihren ersten Foodtruck hinzu</p>
            <button 
              className={styles.emptyButton}
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={20} />
              Foodtruck hinzufügen
            </button>
          </div>
        ) : (
          filteredTenants.map(tenant => (
            <TenantCard
              key={tenant.id}
              tenant={tenant}
              onView={handleView}
              onEdit={handleEdit}
              onAction={handleAction}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ============================================================================
// EXPORT
// ============================================================================
export default TenantManagement;