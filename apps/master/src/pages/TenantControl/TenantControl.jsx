/**
 * EATECH - Tenant Control (Foodtruck Management)
 * Version: 25.0.0
 * Description: Zentrale Verwaltung aller Foodtrucks mit Live-Karte,
 *              Status-Management und Quick Actions
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/master/src/pages/TenantControl/TenantControl.jsx
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
  off
} from 'firebase/database';
import { 
  Search, 
  Plus,
  Filter,
  MapPin,
  Truck,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  DollarSign,
  Package,
  Settings,
  Power,
  Pause,
  Play,
  Edit,
  Trash2,
  Mail,
  Phone,
  Globe,
  Star,
  Heart,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Navigation,
  Activity,
  Shield,
  RefreshCw,
  Download,
  Upload,
  Copy,
  ExternalLink,
  Info,
  BarChart3,
  Eye,
  EyeOff,
  Bell,
  BellOff,
  Zap,
  Award,
  Timer,
  Utensils,
  Coffee,
  PizzaSlice,
  Battery,
  BatteryLow,
  Signal,
  SignalLow,
  Wifi,
  WifiOff,
  CloudOff,
  UserCheck,
  Lock,
  Unlock
} from 'lucide-react';
import styles from './TenantControl.module.css';

// Import Swiss Map Component
import SwitzerlandMap from '../../components/SwitzerlandMap/SwitzerlandMap';

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
const TENANT_STATUS = {
  active: { label: 'Aktiv', color: '#10b981', icon: CheckCircle },
  paused: { label: 'Pausiert', color: '#f59e0b', icon: Pause },
  offline: { label: 'Offline', color: '#6b7280', icon: CloudOff },
  suspended: { label: 'Gesperrt', color: '#ef4444', icon: XCircle }
};

const TENANT_PLANS = {
  basic: { label: 'Basic', color: '#6b7280', features: 8 },
  pro: { label: 'Pro', color: '#3b82f6', features: 14 },
  premium: { label: 'Premium', color: '#8b5cf6', features: 20 },
  enterprise: { label: 'Enterprise', color: '#ff6b6b', features: 'Alle' }
};

const FOODTRUCK_TYPES = {
  burger: { label: 'Burger', icon: '🍔', color: '#ff6b6b' },
  pizza: { label: 'Pizza', icon: '🍕', color: '#f59e0b' },
  asian: { label: 'Asiatisch', icon: '🥡', color: '#10b981' },
  mexican: { label: 'Mexikanisch', icon: '🌮', color: '#ec4899' },
  coffee: { label: 'Kaffee & Snacks', icon: '☕', color: '#6366f1' },
  dessert: { label: 'Desserts', icon: '🍰', color: '#8b5cf6' },
  vegan: { label: 'Vegan', icon: '🥗', color: '#84cc16' },
  other: { label: 'Andere', icon: '🍴', color: '#6b7280' }
};

const QUICK_ACTIONS = [
  { 
    id: 'pause', 
    label: 'Pausieren', 
    icon: Pause, 
    color: '#f59e0b',
    confirm: 'Möchten Sie diesen Foodtruck pausieren?'
  },
  { 
    id: 'activate', 
    label: 'Aktivieren', 
    icon: Play, 
    color: '#10b981',
    confirm: 'Möchten Sie diesen Foodtruck aktivieren?'
  },
  { 
    id: 'message', 
    label: 'Nachricht', 
    icon: Mail, 
    color: '#3b82f6'
  },
  { 
    id: 'analytics', 
    label: 'Analytics', 
    icon: BarChart3, 
    color: '#8b5cf6'
  },
  { 
    id: 'suspend', 
    label: 'Sperren', 
    icon: Lock, 
    color: '#ef4444',
    confirm: 'ACHTUNG: Möchten Sie diesen Foodtruck wirklich sperren?',
    dangerous: true
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const TenantControl = () => {
  // State Management
  const [tenants, setTenants] = useState([]);
  const [filteredTenants, setFilteredTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // grid | list | map
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTenants, setSelectedTenants] = useState(new Set());
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [cantonFilter, setCantonFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name'); // name | revenue | orders | lastActive
  
  // Map State
  const [mapHoveredTenant, setMapHoveredTenant] = useState(null);
  const [mapSelectedCanton, setMapSelectedCanton] = useState(null);
  
  // ========================================================================
  // FIREBASE SUBSCRIPTIONS
  // ========================================================================
  useEffect(() => {
    const tenantsRef = ref(database, 'tenants');
    
    const unsubscribe = onValue(tenantsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const tenantList = Object.entries(data).map(([id, tenant]) => {
          // Calculate additional stats
          const now = Date.now();
          const lastOrderTime = tenant.stats?.lastOrderTime || 0;
          const hoursSinceLastOrder = (now - lastOrderTime) / (1000 * 60 * 60);
          
          // Determine real-time status
          let status = tenant.info?.status || 'offline';
          if (status === 'active' && hoursSinceLastOrder > 24) {
            status = 'offline'; // Auto-offline after 24h inactivity
          }
          
          // Get current location if GPS is active
          const currentLocation = tenant.location?.current || null;
          
          return {
            id,
            ...tenant.info,
            status,
            stats: {
              ...tenant.stats,
              hoursSinceLastOrder,
              isOnline: hoursSinceLastOrder < 1,
              dailyRevenue: tenant.stats?.dailyRevenue || 0,
              dailyOrders: tenant.stats?.dailyOrders || 0,
              totalRevenue: tenant.stats?.totalRevenue || 0,
              totalOrders: tenant.stats?.totalOrders || 0,
              averageOrderValue: tenant.stats?.totalOrders > 0 
                ? (tenant.stats?.totalRevenue / tenant.stats?.totalOrders).toFixed(2)
                : 0,
              favoriteCount: tenant.stats?.favoriteCount || 0,
              regularCustomers: tenant.stats?.regularCustomers || 0,
              rating: tenant.stats?.rating || 0,
              reviewCount: tenant.stats?.reviewCount || 0
            },
            location: currentLocation,
            features: tenant.features || {},
            contact: tenant.contact || {},
            schedule: tenant.schedule || {},
            notifications: tenant.notifications || { enabled: true }
          };
        });
        
        setTenants(tenantList);
        setLastSync(new Date());
      }
      setLoading(false);
    }, (error) => {
      console.error('Error loading tenants:', error);
      setError('Fehler beim Laden der Foodtrucks');
      setLoading(false);
    });
    
    // Cleanup
    return () => off(tenantsRef);
  }, []);
  
  // ========================================================================
  // FILTERING & SORTING
  // ========================================================================
  useEffect(() => {
    let filtered = [...tenants];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(tenant => 
        tenant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.owner?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.address?.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(tenant => tenant.status === statusFilter);
    }
    
    // Plan filter
    if (planFilter !== 'all') {
      filtered = filtered.filter(tenant => tenant.plan === planFilter);
    }
    
    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(tenant => tenant.type === typeFilter);
    }
    
    // Canton filter
    if (cantonFilter !== 'all') {
      filtered = filtered.filter(tenant => tenant.canton === cantonFilter);
    }
    
    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'revenue':
          return (b.stats?.dailyRevenue || 0) - (a.stats?.dailyRevenue || 0);
        case 'orders':
          return (b.stats?.dailyOrders || 0) - (a.stats?.dailyOrders || 0);
        case 'lastActive':
          return (a.stats?.hoursSinceLastOrder || 999) - (b.stats?.hoursSinceLastOrder || 999);
        default:
          return 0;
      }
    });
    
    setFilteredTenants(filtered);
  }, [tenants, searchTerm, statusFilter, planFilter, typeFilter, cantonFilter, sortBy]);
  
  // ========================================================================
  // COMPUTED VALUES
  // ========================================================================
  const stats = useMemo(() => {
    const active = tenants.filter(t => t.status === 'active').length;
    const paused = tenants.filter(t => t.status === 'paused').length;
    const offline = tenants.filter(t => t.status === 'offline').length;
    const suspended = tenants.filter(t => t.status === 'suspended').length;
    
    const totalRevenue = tenants.reduce((sum, t) => sum + (t.stats?.dailyRevenue || 0), 0);
    const totalOrders = tenants.reduce((sum, t) => sum + (t.stats?.dailyOrders || 0), 0);
    const avgRating = tenants.reduce((sum, t) => sum + (t.stats?.rating || 0), 0) / (tenants.length || 1);
    
    const cantonStats = {};
    tenants.forEach(tenant => {
      const canton = tenant.canton || 'unknown';
      if (!cantonStats[canton]) {
        cantonStats[canton] = { count: 0, revenue: 0 };
      }
      cantonStats[canton].count++;
      cantonStats[canton].revenue += tenant.stats?.dailyRevenue || 0;
    });
    
    return {
      total: tenants.length,
      active,
      paused,
      offline,
      suspended,
      totalRevenue,
      totalOrders,
      avgRating: avgRating.toFixed(1),
      cantonStats
    };
  }, [tenants]);
  
  const mapData = useMemo(() => {
    // Prepare data for map visualization
    const cantonData = {};
    
    tenants.forEach(tenant => {
      const canton = tenant.canton;
      if (!canton) return;
      
      if (!cantonData[canton]) {
        cantonData[canton] = {
          trucks: [],
          totalRevenue: 0,
          activeCount: 0,
          avgRating: 0
        };
      }
      
      cantonData[canton].trucks.push({
        id: tenant.id,
        name: tenant.name,
        status: tenant.status,
        location: tenant.location,
        type: tenant.type,
        rating: tenant.stats?.rating || 0
      });
      
      cantonData[canton].totalRevenue += tenant.stats?.dailyRevenue || 0;
      if (tenant.status === 'active') cantonData[canton].activeCount++;
      cantonData[canton].avgRating += tenant.stats?.rating || 0;
    });
    
    // Calculate averages
    Object.keys(cantonData).forEach(canton => {
      const data = cantonData[canton];
      data.avgRating = data.trucks.length > 0 
        ? (data.avgRating / data.trucks.length).toFixed(1)
        : 0;
    });
    
    return cantonData;
  }, [tenants]);
  
  // ========================================================================
  // HANDLERS
  // ========================================================================
  const handleQuickAction = useCallback(async (tenantId, action) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return;
    
    // Confirm dangerous actions
    if (action.confirm) {
      if (!confirm(action.confirm)) return;
    }
    
    try {
      switch (action.id) {
        case 'pause':
          await updateTenantStatus(tenantId, 'paused');
          break;
          
        case 'activate':
          await updateTenantStatus(tenantId, 'active');
          break;
          
        case 'suspend':
          await updateTenantStatus(tenantId, 'suspended');
          break;
          
        case 'message':
          // Open message modal
          console.log('Send message to', tenant.name);
          break;
          
        case 'analytics':
          // Navigate to tenant analytics
          console.log('Show analytics for', tenant.name);
          break;
      }
    } catch (error) {
      console.error('Error executing quick action:', error);
      alert('Fehler bei der Ausführung der Aktion');
    }
  }, [tenants]);
  
  const updateTenantStatus = async (tenantId, newStatus) => {
    const updates = {
      [`tenants/${tenantId}/info/status`]: newStatus,
      [`tenants/${tenantId}/info/lastStatusChange`]: serverTimestamp(),
      [`tenants/${tenantId}/info/lastModifiedBy`]: 'master@eatech.ch'
    };
    
    // Log status change
    const logRef = push(ref(database, 'logs/statusChanges'));
    updates[`logs/statusChanges/${logRef.key}`] = {
      tenantId,
      previousStatus: tenants.find(t => t.id === tenantId)?.status,
      newStatus,
      timestamp: serverTimestamp(),
      changedBy: 'master@eatech.ch'
    };
    
    await update(ref(database), updates);
  };
  
  const handleBulkAction = useCallback(async (action) => {
    if (selectedTenants.size === 0) {
      alert('Bitte wählen Sie mindestens einen Foodtruck aus');
      return;
    }
    
    if (action.confirm) {
      if (!confirm(`${action.confirm} (${selectedTenants.size} Foodtrucks)`)) return;
    }
    
    try {
      const updates = {};
      const logs = [];
      
      selectedTenants.forEach(tenantId => {
        switch (action.id) {
          case 'pause':
            updates[`tenants/${tenantId}/info/status`] = 'paused';
            break;
          case 'activate':
            updates[`tenants/${tenantId}/info/status`] = 'active';
            break;
          case 'message':
            // Bulk message logic
            break;
        }
        
        logs.push({
          tenantId,
          action: action.id,
          timestamp: serverTimestamp()
        });
      });
      
      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates);
      }
      
      // Clear selection
      setSelectedTenants(new Set());
      setBulkActionMode(false);
      
      alert(`Aktion für ${selectedTenants.size} Foodtrucks ausgeführt`);
    } catch (error) {
      console.error('Error executing bulk action:', error);
      alert('Fehler bei der Bulk-Aktion');
    }
  }, [selectedTenants]);
  
  const handleExportData = useCallback(() => {
    const exportData = {
      exportDate: new Date().toISOString(),
      totalTenants: tenants.length,
      tenants: filteredTenants.map(t => ({
        id: t.id,
        name: t.name,
        status: t.status,
        plan: t.plan,
        type: t.type,
        canton: t.canton,
        revenue: t.stats?.totalRevenue,
        orders: t.stats?.totalOrders,
        rating: t.stats?.rating,
        created: t.created
      })),
      stats: stats
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `foodtrucks-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredTenants, tenants, stats]);
  
  // ========================================================================
  // RENDER HELPERS
  // ========================================================================
  const renderTenantCard = (tenant) => {
    const isSelected = selectedTenants.has(tenant.id);
    const statusConfig = TENANT_STATUS[tenant.status] || TENANT_STATUS.offline;
    const planConfig = TENANT_PLANS[tenant.plan] || TENANT_PLANS.basic;
    const typeConfig = FOODTRUCK_TYPES[tenant.type] || FOODTRUCK_TYPES.other;
    const StatusIcon = statusConfig.icon;
    
    return (
      <div 
        key={tenant.id}
        className={`${styles.tenantCard} ${isSelected ? styles.selected : ''}`}
        onClick={() => {
          if (bulkActionMode) {
            setSelectedTenants(prev => {
              const newSet = new Set(prev);
              if (newSet.has(tenant.id)) {
                newSet.delete(tenant.id);
              } else {
                newSet.add(tenant.id);
              }
              return newSet;
            });
          } else {
            setSelectedTenant(tenant);
            setShowDetailModal(true);
          }
        }}
      >
        {bulkActionMode && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            className={styles.checkbox}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        
        {/* Header */}
        <div className={styles.cardHeader}>
          <div className={styles.tenantInfo}>
            <div className={styles.tenantIcon}>
              <span>{typeConfig.icon}</span>
            </div>
            <div>
              <h3>{tenant.name}</h3>
              <p className={styles.tenantId}>#{tenant.id}</p>
            </div>
          </div>
          
          <div className={styles.statusBadge} style={{ backgroundColor: statusConfig.color }}>
            <StatusIcon size={14} />
            {statusConfig.label}
          </div>
        </div>
        
        {/* Location & Type */}
        <div className={styles.tenantMeta}>
          <span>
            <MapPin size={14} />
            {tenant.address?.city || 'Unbekannt'}, {tenant.canton || 'XX'}
          </span>
          <span className={styles.tenantType}>
            {typeConfig.label}
          </span>
        </div>
        
        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={styles.stat}>
            <span className={styles.statValue}>CHF {tenant.stats?.dailyRevenue || 0}</span>
            <span className={styles.statLabel}>Heute</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{tenant.stats?.dailyOrders || 0}</span>
            <span className={styles.statLabel}>Bestellungen</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>
              <Star size={12} />
              {tenant.stats?.rating || '-'}
            </span>
            <span className={styles.statLabel}>Bewertung</span>
          </div>
        </div>
        
        {/* Activity Indicator */}
        <div className={styles.activityBar}>
          {tenant.stats?.isOnline ? (
            <span className={styles.online}>
              <Activity size={14} />
              Online
            </span>
          ) : (
            <span className={styles.offline}>
              <Clock size={14} />
              Zuletzt aktiv vor {Math.round(tenant.stats?.hoursSinceLastOrder || 0)}h
            </span>
          )}
        </div>
        
        {/* Quick Actions */}
        {!bulkActionMode && (
          <div className={styles.quickActions}>
            {QUICK_ACTIONS.slice(0, 3).map(action => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={action.id}
                  className={styles.quickActionBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickAction(tenant.id, action);
                  }}
                  title={action.label}
                >
                  <ActionIcon size={16} />
                </button>
              );
            })}
            <button
              className={styles.moreBtn}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTenant(tenant);
                setShowDetailModal(true);
              }}
            >
              <MoreVertical size={16} />
            </button>
          </div>
        )}
        
        {/* Plan Badge */}
        <div className={styles.planBadge} style={{ backgroundColor: `${planConfig.color}20`, color: planConfig.color }}>
          {planConfig.label}
        </div>
        
        {/* Notifications Status */}
        {tenant.notifications?.enabled === false && (
          <div className={styles.notificationOff}>
            <BellOff size={12} />
          </div>
        )}
      </div>
    );
  };
  
  // ========================================================================
  // RENDER
  // ========================================================================
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Lade Foodtrucks...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <AlertCircle size={48} />
        <h2>Fehler</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          <RefreshCw size={20} />
          Neu laden
        </button>
      </div>
    );
  }
  
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <h1>Foodtruck Management</h1>
            <p>Verwalten Sie alle Foodtrucks und deren Status</p>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.connectionStatus}>
              <CheckCircle size={16} />
              {tenants.length} Foodtrucks
              {lastSync && (
                <span className={styles.lastSync}>
                  Sync: {lastSync.toLocaleTimeString()}
                </span>
              )}
            </div>
            <button className={styles.addButton} onClick={() => setShowAddModal(true)}>
              <Plus size={20} />
              Neuer Foodtruck
            </button>
            <button className={styles.exportButton} onClick={handleExportData}>
              <Download size={20} />
              Export
            </button>
          </div>
        </div>
      </div>
      
      {/* Stats Overview */}
      <div className={styles.statsOverview}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: '#10b98120' }}>
            <Truck size={24} style={{ color: '#10b981' }} />
          </div>
          <div className={styles.statContent}>
            <h3>{stats.active}</h3>
            <p>Aktive Foodtrucks</p>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: '#3b82f620' }}>
            <DollarSign size={24} style={{ color: '#3b82f6' }} />
          </div>
          <div className={styles.statContent}>
            <h3>CHF {stats.totalRevenue.toLocaleString()}</h3>
            <p>Heutiger Umsatz</p>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: '#8b5cf620' }}>
            <Package size={24} style={{ color: '#8b5cf6' }} />
          </div>
          <div className={styles.statContent}>
            <h3>{stats.totalOrders}</h3>
            <p>Bestellungen heute</p>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ backgroundColor: '#f59e0b20' }}>
            <Star size={24} style={{ color: '#f59e0b' }} />
          </div>
          <div className={styles.statContent}>
            <h3>{stats.avgRating}</h3>
            <p>Ø Bewertung</p>
          </div>
        </div>
      </div>
      
      {/* Action Bar */}
      <div className={styles.actionBar}>
        <div className={styles.searchBar}>
          <Search size={20} />
          <input
            type="text"
            placeholder="Suche nach Name, Ort, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className={styles.actions}>
          <button
            className={styles.filterButton}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} />
            Filter
            {(statusFilter !== 'all' || planFilter !== 'all' || typeFilter !== 'all' || cantonFilter !== 'all') && (
              <span className={styles.filterBadge}>!</span>
            )}
          </button>
          
          <button
            className={`${styles.bulkButton} ${bulkActionMode ? styles.active : ''}`}
            onClick={() => {
              setBulkActionMode(!bulkActionMode);
              setSelectedTenants(new Set());
            }}
          >
            <Copy size={20} />
            Bulk Actions
          </button>
          
          <div className={styles.viewToggle}>
            <button
              className={viewMode === 'grid' ? styles.active : ''}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <Package size={20} />
            </button>
            <button
              className={viewMode === 'list' ? styles.active : ''}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <Settings size={20} />
            </button>
            <button
              className={viewMode === 'map' ? styles.active : ''}
              onClick={() => setViewMode('map')}
              title="Map View"
            >
              <MapPin size={20} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      {showFilters && (
        <div className={styles.filterBar}>
          <div className={styles.filterGroup}>
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Alle Status</option>
              {Object.entries(TENANT_STATUS).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
          
          <div className={styles.filterGroup}>
            <label>Plan</label>
            <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
              <option value="all">Alle Pläne</option>
              {Object.entries(TENANT_PLANS).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
          
          <div className={styles.filterGroup}>
            <label>Typ</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">Alle Typen</option>
              {Object.entries(FOODTRUCK_TYPES).map(([key, config]) => (
                <option key={key} value={key}>{config.icon} {config.label}</option>
              ))}
            </select>
          </div>
          
          <div className={styles.filterGroup}>
            <label>Kanton</label>
            <select value={cantonFilter} onChange={(e) => setCantonFilter(e.target.value)}>
              <option value="all">Alle Kantone</option>
              <option value="ZH">Zürich</option>
              <option value="BE">Bern</option>
              <option value="LU">Luzern</option>
              <option value="UR">Uri</option>
              <option value="SZ">Schwyz</option>
              <option value="OW">Obwalden</option>
              <option value="NW">Nidwalden</option>
              <option value="GL">Glarus</option>
              <option value="ZG">Zug</option>
              <option value="FR">Freiburg</option>
              <option value="SO">Solothurn</option>
              <option value="BS">Basel-Stadt</option>
              <option value="BL">Basel-Landschaft</option>
              <option value="SH">Schaffhausen</option>
              <option value="AR">Appenzell Ausserrhoden</option>
              <option value="AI">Appenzell Innerrhoden</option>
              <option value="SG">St. Gallen</option>
              <option value="GR">Graubünden</option>
              <option value="AG">Aargau</option>
              <option value="TG">Thurgau</option>
              <option value="TI">Tessin</option>
              <option value="VD">Waadt</option>
              <option value="VS">Wallis</option>
              <option value="NE">Neuenburg</option>
              <option value="GE">Genf</option>
              <option value="JU">Jura</option>
            </select>
          </div>
          
          <div className={styles.filterGroup}>
            <label>Sortierung</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="name">Name</option>
              <option value="revenue">Umsatz (Heute)</option>
              <option value="orders">Bestellungen</option>
              <option value="lastActive">Letzte Aktivität</option>
            </select>
          </div>
        </div>
      )}
      
      {/* Bulk Actions Bar */}
      {bulkActionMode && selectedTenants.size > 0 && (
        <div className={styles.bulkActionsBar}>
          <span>{selectedTenants.size} Foodtrucks ausgewählt</span>
          <div className={styles.bulkActions}>
            <button onClick={() => handleBulkAction({ id: 'pause', confirm: 'Ausgewählte Foodtrucks pausieren?' })}>
              <Pause size={16} />
              Pausieren
            </button>
            <button onClick={() => handleBulkAction({ id: 'activate', confirm: 'Ausgewählte Foodtrucks aktivieren?' })}>
              <Play size={16} />
              Aktivieren
            </button>
            <button onClick={() => handleBulkAction({ id: 'message' })}>
              <Mail size={16} />
              Nachricht
            </button>
            <button onClick={() => setSelectedTenants(new Set())}>
              Auswahl aufheben
            </button>
          </div>
        </div>
      )}
      
      {/* Content Area */}
      <div className={styles.contentArea}>
        {viewMode === 'map' ? (
          <div className={styles.mapContainer}>
            <SwitzerlandMap
              data={mapData}
              onCantonClick={(canton) => setCantonFilter(canton)}
              onTruckClick={(truck) => {
                const tenant = tenants.find(t => t.id === truck.id);
                if (tenant) {
                  setSelectedTenant(tenant);
                  setShowDetailModal(true);
                }
              }}
              selectedCanton={cantonFilter !== 'all' ? cantonFilter : null}
              hoveredTruck={mapHoveredTenant}
            />
            
            {/* Map Legend */}
            <div className={styles.mapLegend}>
              <h4>Legende</h4>
              <div className={styles.legendItem}>
                <div className={styles.legendColor} style={{ backgroundColor: '#10b981' }} />
                <span>Hohe Aktivität</span>
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendColor} style={{ backgroundColor: '#f59e0b' }} />
                <span>Mittlere Aktivität</span>
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendColor} style={{ backgroundColor: '#ef4444' }} />
                <span>Niedrige Aktivität</span>
              </div>
            </div>
            
            {/* Canton Info */}
            {cantonFilter !== 'all' && mapData[cantonFilter] && (
              <div className={styles.cantonInfo}>
                <h4>{cantonFilter}</h4>
                <p>{mapData[cantonFilter].trucks.length} Foodtrucks</p>
                <p>CHF {mapData[cantonFilter].totalRevenue.toLocaleString()} Umsatz</p>
                <p>{mapData[cantonFilter].activeCount} aktiv</p>
                <p>⭐ {mapData[cantonFilter].avgRating} Bewertung</p>
              </div>
            )}
          </div>
        ) : viewMode === 'list' ? (
          <div className={styles.listContainer}>
            <table className={styles.tenantTable}>
              <thead>
                <tr>
                  {bulkActionMode && <th></th>}
                  <th>Name</th>
                  <th>Typ</th>
                  <th>Status</th>
                  <th>Ort</th>
                  <th>Plan</th>
                  <th>Umsatz (Heute)</th>
                  <th>Bestellungen</th>
                  <th>Bewertung</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map(tenant => {
                  const isSelected = selectedTenants.has(tenant.id);
                  const statusConfig = TENANT_STATUS[tenant.status] || TENANT_STATUS.offline;
                  const typeConfig = FOODTRUCK_TYPES[tenant.type] || FOODTRUCK_TYPES.other;
                  
                  return (
                    <tr 
                      key={tenant.id}
                      className={isSelected ? styles.selected : ''}
                      onClick={() => {
                        if (bulkActionMode) {
                          setSelectedTenants(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(tenant.id)) {
                              newSet.delete(tenant.id);
                            } else {
                              newSet.add(tenant.id);
                            }
                            return newSet;
                          });
                        }
                      }}
                    >
                      {bulkActionMode && (
                        <td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                      )}
                      <td>
                        <div className={styles.nameCell}>
                          <span className={styles.tenantIcon}>{typeConfig.icon}</span>
                          <div>
                            <strong>{tenant.name}</strong>
                            <span className={styles.tenantId}>#{tenant.id}</span>
                          </div>
                        </div>
                      </td>
                      <td>{typeConfig.label}</td>
                      <td>
                        <span className={styles.statusBadge} style={{ backgroundColor: statusConfig.color }}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td>{tenant.address?.city}, {tenant.canton}</td>
                      <td>
                        <span className={styles.planBadge} style={{ color: TENANT_PLANS[tenant.plan]?.color }}>
                          {TENANT_PLANS[tenant.plan]?.label}
                        </span>
                      </td>
                      <td>CHF {tenant.stats?.dailyRevenue || 0}</td>
                      <td>{tenant.stats?.dailyOrders || 0}</td>
                      <td>
                        <span className={styles.rating}>
                          <Star size={14} />
                          {tenant.stats?.rating || '-'}
                        </span>
                      </td>
                      <td>
                        <div className={styles.tableActions}>
                          {QUICK_ACTIONS.slice(0, 2).map(action => {
                            const ActionIcon = action.icon;
                            return (
                              <button
                                key={action.id}
                                className={styles.actionBtn}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickAction(tenant.id, action);
                                }}
                                title={action.label}
                              >
                                <ActionIcon size={14} />
                              </button>
                            );
                          })}
                          <button
                            className={styles.actionBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTenant(tenant);
                              setShowDetailModal(true);
                            }}
                          >
                            <MoreVertical size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.gridContainer}>
            {filteredTenants.length === 0 ? (
              <div className={styles.emptyState}>
                <Truck size={48} />
                <h3>Keine Foodtrucks gefunden</h3>
                <p>Versuchen Sie es mit anderen Filtereinstellungen</p>
              </div>
            ) : (
              filteredTenants.map(tenant => renderTenantCard(tenant))
            )}
          </div>
        )}
      </div>
      
      {/* Detail Modal */}
      {showDetailModal && selectedTenant && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>{selectedTenant.name}</h2>
              <button onClick={() => setShowDetailModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            <div className={styles.modalBody}>
              {/* Tenant details would go here */}
              <p>Details für {selectedTenant.name}</p>
              <pre>{JSON.stringify(selectedTenant, null, 2)}</pre>
            </div>
            
            <div className={styles.modalFooter}>
              <button className={styles.cancelButton} onClick={() => setShowDetailModal(false)}>
                Schließen
              </button>
              <button className={styles.primaryButton}>
                <Edit size={16} />
                Bearbeiten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantControl;