/**
 * EATECH - Master Control Panel
 * Version: 5.0.0
 * Description: Complete Master Dashboard with all components integrated
 * File Path: /src/modules/master/MasterControl.jsx
 */

import React, { useState, useCallback } from 'react';
import { 
  BarChart3, 
  Map, 
  Users, 
  DollarSign,
  Activity,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Download
} from 'lucide-react';
import { useMasterData } from './hooks/useMasterData';
import SwissHeatMap from './components/SwissHeatMap';
import TenantHealthScore from './components/TenantHealthScore';
import ProvisionsForecast from './components/ProvisionsForecast';
import AnomalyDetector from './components/AnomalyDetector';
import TenantList from './components/TenantList';
import styles from './MasterControl.module.css';

// ============================================================================
// COMPONENT
// ============================================================================
const MasterControl = () => {
  // State
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Get master data
  const {
    tenants,
    analytics,
    liveOrders,
    provisions,
    heatMapData,
    anomalies,
    forecast,
    loading,
    error,
    updateTenantSettings,
    toggleTenantFeature,
    extendTrial,
    createTenant,
    refreshHealthScores,
    refreshAnomalies,
    refreshTrends
  } = useMasterData();
  
  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshHealthScores(),
        refreshAnomalies(),
        refreshTrends()
      ]);
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  }, [refreshHealthScores, refreshAnomalies, refreshTrends]);
  
  // Handle tenant selection
  const handleTenantSelect = useCallback((tenant) => {
    setSelectedTenant(tenant);
    setActiveView('tenant-detail');
  }, []);
  
  // Handle tenant action
  const handleTenantAction = useCallback(async (action, tenant) => {
    switch (action) {
      case 'create':
        setShowTenantModal(true);
        break;
        
      case 'view':
        handleTenantSelect(tenant);
        break;
        
      case 'settings':
        // Open settings modal
        break;
        
      case 'loginAs':
        // Implement login as tenant
        window.open(`/${tenant.subdomain}/admin`, '_blank');
        break;
        
      case 'extendTrial':
        await extendTrial(tenant.id, 30); // Extend by 30 days
        handleRefresh();
        break;
        
      case 'suspend':
        await updateTenantSettings(tenant.id, { status: 'suspended' });
        handleRefresh();
        break;
        
      case 'activate':
        await updateTenantSettings(tenant.id, { status: 'active' });
        handleRefresh();
        break;
        
      default:
        break;
    }
  }, [handleTenantSelect, extendTrial, updateTenantSettings, handleRefresh]);
  
  // Handle anomaly click
  const handleAnomalyClick = useCallback((anomaly) => {
    if (anomaly.tenantId) {
      const tenant = tenants.find(t => t.id === anomaly.tenantId);
      if (tenant) {
        handleTenantSelect(tenant);
      }
    }
  }, [tenants, handleTenantSelect]);
  // Render navigation
  const renderNavigation = () => (
    <nav className={styles.navigation}>
      <button
        className={[styles.navItem, activeView === 'dashboard' ? styles.active : ''].join(' ')}
        onClick={() => setActiveView('dashboard')}
      >
        <BarChart3 size={20} />
        <span>Dashboard</span>
      </button>
      <button
        className={[styles.navItem, activeView === 'map' ? styles.active : ''].join(' ')}
        onClick={() => setActiveView('map')}
      >
        <Map size={20} />
        <span>Live Map</span>
      </button>
      <button
        className={[styles.navItem, activeView === 'tenants' ? styles.active : ''].join(' ')}
        onClick={() => setActiveView('tenants')}
      >
        <Users size={20} />
        <span>Tenants</span>
      </button>
      <button
        className={[styles.navItem, activeView === 'analytics' ? styles.active : ''].join(' ')}
        onClick={() => setActiveView('analytics')}
      >
        <TrendingUp size={20} />
        <span>Analytics</span>
      </button>
    </nav>
  );
  
  // Render stats cards
  const renderStatsCards = () => (
    <div className={styles.statsGrid}>
      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <DollarSign />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statLabel}>Provisionen Heute</span>
          <span className={styles.statValue}>
            CHF {provisions?.today?.toFixed(2) || '0.00'}
          </span>
          <span className={styles.statChange}>
            +{provisions?.todayGrowth || 0}% vs. Gestern
          </span>
        </div>
      </div>
      
      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <Activity />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statLabel}>Aktive Foodtrucks</span>
          <span className={styles.statValue}>
            {analytics?.activeTrucksCount || 0}
          </span>
          <span className={styles.statSubtext}>
            von {analytics?.totalTrucksCount || 0} total
          </span>
        </div>
      </div>
      
      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <Users />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statLabel}>Bestellungen Heute</span>
          <span className={styles.statValue}>
            {analytics?.ordersToday || 0}
          </span>
          <span className={styles.statSubtext}>
            ⌀ CHF {analytics?.averageOrderValue?.toFixed(2) || '0.00'}
          </span>
        </div>
      </div>
      
      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <AlertTriangle />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statLabel}>Kritische Warnungen</span>
          <span className={styles.statValue}>
            {anomalies.filter(a => a.severity === 'severe').length}
          </span>
          <span className={styles.statSubtext}>
            {anomalies.length} total
          </span>
        </div>
      </div>
    </div>
  );
  
  // Render dashboard view
  const renderDashboard = () => (
    <div className={styles.dashboard}>
      {renderStatsCards()}
      
      <div className={styles.dashboardGrid}>
        <div className={styles.mapSection}>
          <SwissHeatMap 
            heatMapData={heatMapData}
            liveOrders={liveOrders}
            onCantonClick={(canton, data) => console.log('Canton clicked:', canton, data)}
          />
        </div>
        
        <div className={styles.anomaliesSection}>
          <AnomalyDetector
            anomalies={anomalies}
            onAnomalyClick={handleAnomalyClick}
          />
        </div>
        
        <div className={styles.forecastSection}>
          <ProvisionsForecast
            forecast={forecast}
            provisions={provisions}
            onRefresh={handleRefresh}
          />
        </div>
        
        <div className={styles.topTenantsSection}>
          <h3>Top Tenants nach Health Score</h3>
          <div className={styles.healthScoresList}>
            {tenants
              .filter(t => t.healthScore)
              .sort((a, b) => b.healthScore.totalScore - a.healthScore.totalScore)
              .slice(0, 3)
              .map(tenant => (
                <TenantHealthScore
                  key={tenant.id}
                  healthScore={tenant.healthScore}
                  tenantName={tenant.name}
                  onActionClick={(type, data) => handleTenantAction(type, tenant)}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
  
  // Render content based on active view
  const renderContent = () => {
    if (loading) {
      return (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Lade Master-Daten...</p>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className={styles.error}>
          <AlertTriangle size={48} />
          <h3>Fehler beim Laden</h3>
          <p>{error}</p>
          <button onClick={handleRefresh}>Erneut versuchen</button>
        </div>
      );
    }
    
    switch (activeView) {
      case 'dashboard':
        return renderDashboard();
        
      case 'map':
        return (
          <div className={styles.fullscreenMap}>
            <SwissHeatMap 
              heatMapData={heatMapData}
              liveOrders={liveOrders}
            />
          </div>
        );
        
      case 'tenants':
        return (
          <TenantList
            tenants={tenants}
            provisions={provisions}
            onTenantSelect={handleTenantSelect}
            onTenantAction={handleTenantAction}
          />
        );
        
      case 'analytics':
        return (
          <div className={styles.analyticsView}>
            <ProvisionsForecast
              forecast={forecast}
              provisions={provisions}
              onRefresh={handleRefresh}
            />
          </div>
        );
        
      case 'tenant-detail':
        return selectedTenant && (
          <div className={styles.tenantDetail}>
            <button 
              className={styles.backButton}
              onClick={() => setActiveView('tenants')}
            >
              ← Zurück zu Tenants
            </button>
            <TenantHealthScore
              healthScore={selectedTenant.healthScore}
              tenantName={selectedTenant.name}
              onActionClick={handleTenantAction}
            />
          </div>
        );
        
      default:
        return renderDashboard();
    }
  };
  
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>EATECH Master Control</h1>
          <span className={styles.subtitle}>
            Verwaltung von {tenants.length} Tenants
          </span>
        </div>
        
        <div className={styles.headerRight}>
          <button 
            className={styles.refreshButton}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={18} className={refreshing ? styles.spinning : ''} />
            <span>Aktualisieren</span>
          </button>
          
          <button className={styles.exportButton}>
            <Download size={18} />
            <span>Export</span>
          </button>
        </div>
      </header>
      
      {renderNavigation()}
      
      <main className={styles.main}>
        {renderContent()}
      </main>
    </div>
  );
};

// ============================================================================
// EXPORT
// ============================================================================
export default MasterControl;
