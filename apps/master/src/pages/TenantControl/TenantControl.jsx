/**
 * EATECH - Tenant Control (Foodtruck Management)
 * Version: 26.0.0
 * Description: Zentrale Verwaltung aller Foodtrucks mit Lazy Loading
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/master/src/pages/TenantControl/TenantControl.jsx
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, Filter, MapPin, Truck, Users, TrendingUp,
  AlertCircle, CheckCircle, XCircle, Clock, Calendar, DollarSign,
  Package, Settings, Power, Pause, Play, Edit, Trash2, Mail,
  Phone, Globe, Star, Heart, ChevronRight, ChevronDown, MoreVertical,
  Navigation, Activity, Shield, RefreshCw, Download, Upload, Copy,
  ExternalLink, Info, BarChart3, Eye, EyeOff, Bell, BellOff,
  Zap, Award, Timer, Utensils, Coffee, Battery, Signal, Wifi,
  CloudOff, UserCheck, Lock, Unlock
} from 'lucide-react';
import styles from './TenantControl.module.css';

// Lazy loaded components
const SwitzerlandMap = lazy(() => import('../../components/SwitzerlandMap/SwitzerlandMap'));
const TenantDetailsModal = lazy(() => import('./components/TenantDetailsModal'));
const TenantEditModal = lazy(() => import('./components/TenantEditModal'));
const TenantMetricsCard = lazy(() => import('./components/TenantMetricsCard'));
const TenantActionMenu = lazy(() => import('./components/TenantActionMenu'));
const BulkActionsBar = lazy(() => import('./components/BulkActionsBar'));

// Lazy loaded services
const FirebaseService = lazy(() => import('../../services/firebase.service'));
const NotificationService = lazy(() => import('../../services/notification.service'));
const ExportService = lazy(() => import('../../services/export.service'));

// Loading component
const LoadingSpinner = () => (
  <div className={styles.loadingContainer}>
    <div className={styles.spinner}>
      <Truck className={styles.spinnerIcon} size={24} />
    </div>
    <p className={styles.loadingText}>Lade Foodtrucks...</p>
  </div>
);

// Constants
const TENANT_STATUS = {
  active: { label: 'Aktiv', color: '#10b981', icon: CheckCircle },
  paused: { label: 'Pausiert', color: '#f59e0b', icon: Pause },
  suspended: { label: 'Gesperrt', color: '#ef4444', icon: XCircle },
  trial: { label: 'Trial', color: '#3b82f6', icon: Clock },
  onboarding: { label: 'Onboarding', color: '#8b5cf6', icon: Settings }
};

const VIEW_MODES = {
  grid: { label: 'Karten', icon: Package },
  list: { label: 'Liste', icon: BarChart3 },
  map: { label: 'Karte', icon: MapPin }
};

const FILTER_OPTIONS = {
  status: ['all', 'active', 'paused', 'suspended', 'trial', 'onboarding'],
  plan: ['all', 'basic', 'pro', 'enterprise'],
  region: ['all', 'zurich', 'bern', 'basel', 'geneva', 'lausanne', 'ticino']
};

// Main Component
const TenantControl = () => {
  // State Management
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedTenants, setSelectedTenants] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    plan: 'all',
    region: 'all'
  });
  const [sortBy, setSortBy] = useState('name');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [services, setServices] = useState({});
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    revenue: 0,
    avgOrderValue: 0
  });

  // Load services on mount
  useEffect(() => {
    const loadServices = async () => {
      try {
        const [firebase, notification, exportSvc] = await Promise.all([
          import('../../services/firebase.service'),
          import('../../services/notification.service'),
          import('../../services/export.service')
        ]);
        setServices({ firebase, notification, export: exportSvc });
      } catch (error) {
        console.error('Failed to load services:', error);
      }
    };
    loadServices();
  }, []);

  // Load tenant data
  useEffect(() => {
    const loadTenants = async () => {
      if (!services.firebase) return;

      try {
        setLoading(true);
        setError(null);

        const { database, dbRef, onValue } = services.firebase;
        const tenantsRef = dbRef(database, 'tenants');

        const unsubscribe = onValue(tenantsRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const tenantList = Object.entries(data).map(([id, tenant]) => ({
              id,
              ...tenant,
              lastActive: tenant.lastActive || Date.now(),
              revenue: tenant.revenue || 0,
              orderCount: tenant.orderCount || 0,
              customerCount: tenant.customerCount || 0
            }));

            setTenants(tenantList);
            calculateStats(tenantList);
          }
          setLoading(false);
        }, (error) => {
          console.error('Error loading tenants:', error);
          setError('Fehler beim Laden der Foodtrucks');
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error in loadTenants:', error);
        setError('Fehler beim Initialisieren');
        setLoading(false);
      }
    };

    loadTenants();
  }, [services.firebase]);

  // Calculate statistics
  const calculateStats = (tenantList) => {
    const stats = {
      total: tenantList.length,
      active: tenantList.filter(t => t.status === 'active').length,
      revenue: tenantList.reduce((sum, t) => sum + (t.revenue || 0), 0),
      avgOrderValue: tenantList.reduce((sum, t) => sum + (t.avgOrderValue || 0), 0) / tenantList.length
    };
    setStats(stats);
  };

  // Filter and sort tenants
  const filteredAndSortedTenants = useMemo(() => {
    let filtered = [...tenants];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        t.name?.toLowerCase().includes(term) ||
        t.email?.toLowerCase().includes(term) ||
        t.subdomain?.toLowerCase().includes(term) ||
        t.location?.city?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(t => t.status === filters.status);
    }

    // Plan filter
    if (filters.plan !== 'all') {
      filtered = filtered.filter(t => t.plan === filters.plan);
    }

    // Region filter
    if (filters.region !== 'all') {
      filtered = filtered.filter(t => t.location?.region === filters.region);
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'revenue':
          return b.revenue - a.revenue;
        case 'orders':
          return b.orderCount - a.orderCount;
        case 'lastActive':
          return b.lastActive - a.lastActive;
        default:
          return 0;
      }
    });

    return filtered;
  }, [tenants, searchTerm, filters, sortBy]);

  // Handlers
  const handleSelectTenant = useCallback((tenantId) => {
    setSelectedTenants(prev =>
      prev.includes(tenantId)
        ? prev.filter(id => id !== tenantId)
        : [...prev, tenantId]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedTenants.length === filteredAndSortedTenants.length) {
      setSelectedTenants([]);
    } else {
      setSelectedTenants(filteredAndSortedTenants.map(t => t.id));
    }
  }, [selectedTenants.length, filteredAndSortedTenants]);

  const handleTenantAction = useCallback(async (action, tenantId) => {
    if (!services.firebase) return;

    try {
      const { database, dbRef, update } = services.firebase;
      const tenantRef = dbRef(database, `tenants/${tenantId}`);

      switch (action) {
        case 'activate':
          await update(tenantRef, { status: 'active', lastModified: Date.now() });
          break;
        case 'pause':
          await update(tenantRef, { status: 'paused', lastModified: Date.now() });
          break;
        case 'suspend':
          await update(tenantRef, { status: 'suspended', lastModified: Date.now() });
          break;
        case 'delete':
          if (window.confirm('Wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
            await update(tenantRef, { status: 'deleted', deletedAt: Date.now() });
          }
          break;
      }

      // Show success notification
      if (services.notification) {
        services.notification.show({
          type: 'success',
          message: `Aktion "${action}" erfolgreich ausgeführt`
        });
      }
    } catch (error) {
      console.error('Error performing tenant action:', error);
      if (services.notification) {
        services.notification.show({
          type: 'error',
          message: 'Fehler bei der Ausführung der Aktion'
        });
      }
    }
  }, [services]);

  const handleBulkAction = useCallback(async (action) => {
    if (selectedTenants.length === 0) return;

    const confirmMessage = `Möchten Sie diese Aktion für ${selectedTenants.length} Foodtrucks ausführen?`;
    if (!window.confirm(confirmMessage)) return;

    setShowBulkActions(false);
    
    // Process each selected tenant
    for (const tenantId of selectedTenants) {
      await handleTenantAction(action, tenantId);
    }

    setSelectedTenants([]);
  }, [selectedTenants, handleTenantAction]);

  const handleExport = useCallback(async () => {
    if (!services.export) return;

    try {
      const dataToExport = selectedTenants.length > 0
        ? tenants.filter(t => selectedTenants.includes(t.id))
        : filteredAndSortedTenants;

      await services.export.exportToExcel(dataToExport, 'foodtrucks-export');
      
      if (services.notification) {
        services.notification.show({
          type: 'success',
          message: 'Export erfolgreich erstellt'
        });
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [services, selectedTenants, filteredAndSortedTenants, tenants]);

  // Render helpers
  const renderStatsCard = (title, value, icon, color) => (
    <div className={styles.statsCard}>
      <div className={styles.statsIcon} style={{ backgroundColor: `${color}20`, color }}>
        {icon}
      </div>
      <div className={styles.statsContent}>
        <p className={styles.statsLabel}>{title}</p>
        <h3 className={styles.statsValue}>{value}</h3>
      </div>
    </div>
  );

  const renderTenantCard = (tenant) => {
    const status = TENANT_STATUS[tenant.status] || TENANT_STATUS.active;
    const isSelected = selectedTenants.includes(tenant.id);

    return (
      <motion.div
        key={tenant.id}
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`${styles.tenantCard} ${isSelected ? styles.selected : ''}`}
      >
        <div className={styles.cardHeader}>
          <div className={styles.selectWrapper}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => handleSelectTenant(tenant.id)}
              className={styles.checkbox}
            />
          </div>
          <div className={styles.tenantInfo}>
            <h3 className={styles.tenantName}>{tenant.name}</h3>
            <p className={styles.tenantSubdomain}>{tenant.subdomain}.eatech.ch</p>
          </div>
          <div className={styles.statusBadge} style={{ backgroundColor: `${status.color}20`, color: status.color }}>
            <status.icon size={14} />
            <span>{status.label}</span>
          </div>
        </div>

        <Suspense fallback={<div className={styles.metricsSkeleton} />}>
          <TenantMetricsCard tenant={tenant} />
        </Suspense>

        <div className={styles.cardActions}>
          <button
            className={styles.viewButton}
            onClick={() => {
              setSelectedTenant(tenant);
              setShowDetailsModal(true);
            }}
          >
            <Eye size={16} />
            Details
          </button>
          <Suspense fallback={<button className={styles.actionButton}><MoreVertical size={16} /></button>}>
            <TenantActionMenu
              tenant={tenant}
              onAction={(action) => handleTenantAction(action, tenant.id)}
              onEdit={() => {
                setSelectedTenant(tenant);
                setShowEditModal(true);
              }}
            />
          </Suspense>
        </div>
      </motion.div>
    );
  };

  // Render tenant list item (for list view)
  const renderTenantListItem = (tenant) => {
    const status = TENANT_STATUS[tenant.status] || TENANT_STATUS.active;
    const isSelected = selectedTenants.includes(tenant.id);

    return (
      <div
        key={tenant.id}
        className={`${styles.tenantListItem} ${isSelected ? styles.selected : ''}`}
      >
        <div className={styles.listItemLeft}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => handleSelectTenant(tenant.id)}
            className={styles.checkbox}
          />
          <div className={styles.tenantBasicInfo}>
            <h4>{tenant.name}</h4>
            <p>{tenant.subdomain}.eatech.ch</p>
          </div>
        </div>
        
        <div className={styles.listItemCenter}>
          <div className={styles.statusBadge} style={{ backgroundColor: `${status.color}20`, color: status.color }}>
            <status.icon size={14} />
            <span>{status.label}</span>
          </div>
          <span className={styles.planBadge}>{tenant.plan?.toUpperCase()}</span>
          {tenant.location?.city && (
            <span className={styles.locationBadge}>
              <MapPin size={14} />
              {tenant.location.city}
            </span>
          )}
        </div>

        <div className={styles.listItemMetrics}>
          <div className={styles.metric}>
            <span className={styles.metricValue}>CHF {(tenant.revenue || 0).toLocaleString()}</span>
            <span className={styles.metricLabel}>Umsatz</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricValue}>{tenant.orderCount || 0}</span>
            <span className={styles.metricLabel}>Bestellungen</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricValue}>{tenant.customerCount || 0}</span>
            <span className={styles.metricLabel}>Kunden</span>
          </div>
        </div>

        <div className={styles.listItemActions}>
          <button
            className={styles.viewButton}
            onClick={() => {
              setSelectedTenant(tenant);
              setShowDetailsModal(true);
            }}
          >
            <Eye size={16} />
          </button>
          <Suspense fallback={<button className={styles.actionButton}><MoreVertical size={16} /></button>}>
            <TenantActionMenu
              tenant={tenant}
              onAction={(action) => handleTenantAction(action, tenant.id)}
              onEdit={() => {
                setSelectedTenant(tenant);
                setShowEditModal(true);
              }}
            />
          </Suspense>
        </div>
      </div>
    );
  };

  // Main render
  if (loading && tenants.length === 0) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <AlertCircle size={48} className={styles.errorIcon} />
        <h2>Fehler beim Laden</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className={styles.retryButton}>
          <RefreshCw size={20} />
          Erneut versuchen
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>
            <Truck size={28} />
            Foodtruck Verwaltung
          </h1>
          <p className={styles.subtitle}>
            Verwalten Sie alle {stats.total} registrierten Foodtrucks
          </p>
        </div>
        <div className={styles.headerActions}>
          <button 
            className={styles.refreshButton} 
            onClick={() => window.location.reload()}
            title="Aktualisieren"
          >
            <RefreshCw size={20} />
          </button>
          <button 
            className={styles.exportButton} 
            onClick={handleExport}
            title="Exportieren"
          >
            <Download size={20} />
            Export
          </button>
          <button className={styles.addButton}>
            <Plus size={20} />
            Neuer Foodtruck
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {renderStatsCard('Gesamt', stats.total, <Truck size={20} />, '#3b82f6')}
        {renderStatsCard('Aktiv', stats.active, <Activity size={20} />, '#10b981')}
        {renderStatsCard('Umsatz (Monat)', `CHF ${stats.revenue.toLocaleString()}`, <DollarSign size={20} />, '#f59e0b')}
        {renderStatsCard('Ø Bestellung', `CHF ${stats.avgOrderValue.toFixed(2)}`, <TrendingUp size={20} />, '#8b5cf6')}
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.controlsLeft}>
          <div className={styles.searchBox}>
            <Search size={20} />
            <input
              type="text"
              placeholder="Suche nach Name, E-Mail, Subdomain, Stadt..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            {searchTerm && (
              <button 
                className={styles.clearSearchButton}
                onClick={() => setSearchTerm('')}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button
            className={`${styles.filterButton} ${showFilters ? styles.active : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} />
            Filter
            {Object.values(filters).some(f => f !== 'all') && (
              <span className={styles.filterBadge}>
                {Object.values(filters).filter(f => f !== 'all').length}
              </span>
            )}
          </button>
        </div>
        <div className={styles.controlsRight}>
          <div className={styles.viewModeSelector}>
            {Object.entries(VIEW_MODES).map(([mode, config]) => (
              <button
                key={mode}
                className={`${styles.viewModeButton} ${viewMode === mode ? styles.active : ''}`}
                onClick={() => setViewMode(mode)}
                title={config.label}
              >
                <config.icon size={20} />
              </button>
            ))}
          </div>
          <select
            className={styles.sortSelect}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="name">Name (A-Z)</option>
            <option value="revenue">Umsatz (Hoch-Niedrig)</option>
            <option value="orders">Bestellungen (Hoch-Niedrig)</option>
            <option value="lastActive">Letzte Aktivität</option>
          </select>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className={styles.filtersPanel}
        >
          <div className={styles.filterGroup}>
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              {FILTER_OPTIONS.status.map(option => (
                <option key={option} value={option}>
                  {option === 'all' ? 'Alle Status' : TENANT_STATUS[option]?.label || option}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label>Plan</label>
            <select
              value={filters.plan}
              onChange={(e) => setFilters(prev => ({ ...prev, plan: e.target.value }))}
            >
              {FILTER_OPTIONS.plan.map(option => (
                <option key={option} value={option}>
                  {option === 'all' ? 'Alle Pläne' : option.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label>Region</label>
            <select
              value={filters.region}
              onChange={(e) => setFilters(prev => ({ ...prev, region: e.target.value }))}
            >
              {FILTER_OPTIONS.region.map(option => (
                <option key={option} value={option}>
                  {option === 'all' ? 'Alle Regionen' : option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <button
            className={styles.clearFiltersButton}
            onClick={() => {
              setFilters({ status: 'all', plan: 'all', region: 'all' });
              setSearchTerm('');
            }}
          >
            <X size={16} />
            Alle Filter zurücksetzen
          </button>
        </motion.div>
      )}

      {/* Bulk Actions */}
      {selectedTenants.length > 0 && (
        <Suspense fallback={<div className={styles.bulkActionsSkeleton} />}>
          <BulkActionsBar
            selectedCount={selectedTenants.length}
            totalCount={filteredAndSortedTenants.length}
            onSelectAll={handleSelectAll}
            onAction={handleBulkAction}
            onCancel={() => setSelectedTenants([])}
          />
        </Suspense>
      )}

      {/* Content based on view mode */}
      <div className={styles.content}>
        {viewMode === 'map' ? (
          <Suspense fallback={<LoadingSpinner />}>
            <div className={styles.mapContainer}>
              <SwitzerlandMap
                tenants={filteredAndSortedTenants}
                onTenantClick={(tenant) => {
                  setSelectedTenant(tenant);
                  setShowDetailsModal(true);
                }}
                selectedTenants={selectedTenants}
                onTenantSelect={handleSelectTenant}
              />
            </div>
          </Suspense>
        ) : viewMode === 'grid' ? (
          <div className={styles.tenantsGrid}>
            {filteredAndSortedTenants.length === 0 ? (
              <div className={styles.emptyState}>
                <Truck size={48} className={styles.emptyIcon} />
                <h3>Keine Foodtrucks gefunden</h3>
                <p>Versuchen Sie andere Filtereinstellungen oder Suchbegriffe</p>
                {(searchTerm || Object.values(filters).some(f => f !== 'all')) && (
                  <button
                    className={styles.resetButton}
                    onClick={() => {
                      setSearchTerm('');
                      setFilters({ status: 'all', plan: 'all', region: 'all' });
                    }}
                  >
                    Filter zurücksetzen
                  </button>
                )}
              </div>
            ) : (
              <AnimatePresence>
                {filteredAndSortedTenants.map(renderTenantCard)}
              </AnimatePresence>
            )}
          </div>
        ) : (
          <div className={styles.tenantsList}>
            {filteredAndSortedTenants.length === 0 ? (
              <div className={styles.emptyState}>
                <Truck size={48} className={styles.emptyIcon} />
                <h3>Keine Foodtrucks gefunden</h3>
                <p>Versuchen Sie andere Filtereinstellungen oder Suchbegriffe</p>
              </div>
            ) : (
              <>
                <div className={styles.listHeader}>
                  <div className={styles.listHeaderLeft}>
                    <input
                      type="checkbox"
                      checked={selectedTenants.length === filteredAndSortedTenants.length && filteredAndSortedTenants.length > 0}
                      onChange={handleSelectAll}
                      className={styles.checkbox}
                    />
                    <span>Foodtruck</span>
                  </div>
                  <span>Status & Details</span>
                  <span>Metriken</span>
                  <span>Aktionen</span>
                </div>
                <div className={styles.listContent}>
                  {filteredAndSortedTenants.map(renderTenantListItem)}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showDetailsModal && selectedTenant && (
        <Suspense fallback={<LoadingSpinner />}>
          <TenantDetailsModal
            tenant={selectedTenant}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedTenant(null);
            }}
            onEdit={() => {
              setShowDetailsModal(false);
              setShowEditModal(true);
            }}
            services={services}
          />
        </Suspense>
      )}

      {showEditModal && selectedTenant && (
        <Suspense fallback={<LoadingSpinner />}>
          <TenantEditModal
            tenant={selectedTenant}
            onClose={() => {
              setShowEditModal(false);
              setSelectedTenant(null);
            }}
            onSave={async (updatedData) => {
              if (services.firebase) {
                const { database, dbRef, update } = services.firebase;
                const tenantRef = dbRef(database, `tenants/${selectedTenant.id}`);
                await update(tenantRef, {
                  ...updatedData,
                  lastModified: Date.now()
                });
                
                if (services.notification) {
                  services.notification.show({
                    type: 'success',
                    message: 'Foodtruck erfolgreich aktualisiert'
                  });
                }
              }
              setShowEditModal(false);
              setSelectedTenant(null);
            }}
            services={services}
          />
        </Suspense>
      )}
    </div>
  );
};

export default TenantControl;