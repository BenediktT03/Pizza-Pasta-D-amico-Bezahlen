/**
 * EATECH - Master Admin Dashboard
 * Version: 5.0.0
 * Description: Hauptseite für Master-Administratoren zur Verwaltung aller Tenants
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/admin/src/pages/master/MasterDashboard.jsx
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Users, TrendingUp, Settings, ShieldCheck, 
  DollarSign, Package, AlertCircle, Activity, Database,
  Globe, Lock, Zap, BarChart3, Search, Filter,
  ChevronRight, MoreVertical, CheckCircle, XCircle,
  RefreshCw, Download, Upload, Mail, Phone, Sparkles
} from 'lucide-react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, Area, AreaChart 
} from 'recharts';
import { ref, onValue, update, push } from 'firebase/database';
import { getDatabaseInstance } from '../../lib/firebase';
import { toast } from 'react-hot-toast';
import styles from './MasterDashboard.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================

const CHART_COLORS = {
  primary: '#FF6B6B',
  secondary: '#4ECDC4',
  tertiary: '#FFE66D',
  quaternary: '#6C5CE7',
  success: '#2ECC71',
  warning: '#F39C12',
  danger: '#E74C3C',
  info: '#3498DB'
};

const TIME_RANGES = [
  { value: '24h', label: 'Letzte 24 Stunden' },
  { value: '7d', label: 'Letzte 7 Tage' },
  { value: '30d', label: 'Letzte 30 Tage' },
  { value: '90d', label: 'Letzte 90 Tage' },
  { value: '1y', label: 'Letztes Jahr' }
];

const TENANT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  TRIAL: 'trial'
};

// ============================================================================
// MOCK DATA GENERATOR
// ============================================================================

const generateMockData = () => {
  const tenants = [];
  const names = [
    'Pizza Express Zürich', 'Burger King Mobile', 'Asian Fusion Truck',
    'Veggie Delights', 'Taco Fiesta', 'Swiss Grill Master',
    'Döner Dreams', 'Pasta Paradise', 'Healthy Bowl Express',
    'Curry on Wheels'
  ];

  for (let i = 0; i < 10; i++) {
    const status = i < 7 ? TENANT_STATUS.ACTIVE : 
                   i < 8 ? TENANT_STATUS.TRIAL : 
                   i < 9 ? TENANT_STATUS.INACTIVE : 
                   TENANT_STATUS.SUSPENDED;
    
    tenants.push({
      id: `tenant-${i + 1}`,
      name: names[i],
      subdomain: names[i].toLowerCase().replace(/\s+/g, '-'),
      status,
      plan: i < 3 ? 'enterprise' : i < 6 ? 'professional' : 'starter',
      createdAt: new Date(2024, i, 15).toISOString(),
      lastActive: new Date(2025, 0, 7 - i).toISOString(),
      metrics: {
        orders: Math.floor(Math.random() * 5000) + 1000,
        revenue: Math.floor(Math.random() * 100000) + 20000,
        customers: Math.floor(Math.random() * 2000) + 500,
        avgOrderValue: Math.floor(Math.random() * 50) + 25
      },
      contact: {
        name: `Owner ${i + 1}`,
        email: `owner${i + 1}@${names[i].toLowerCase().replace(/\s+/g, '')}.ch`,
        phone: `+41 79 ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 90) + 10}`
      }
    });
  }

  return {
    tenants,
    systemMetrics: {
      totalTenants: tenants.length,
      activeTenants: tenants.filter(t => t.status === TENANT_STATUS.ACTIVE).length,
      totalOrders: tenants.reduce((sum, t) => sum + t.metrics.orders, 0),
      totalRevenue: tenants.reduce((sum, t) => sum + t.metrics.revenue, 0),
      serverHealth: 98.5,
      apiLatency: 45,
      storageUsed: 65,
      bandwidth: 78
    },
    revenueData: generateRevenueData(),
    growthData: generateGrowthData(),
    planDistribution: generatePlanDistribution()
  };
};

const generateRevenueData = () => {
  const data = [];
  const now = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    data.push({
      date: date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' }),
      revenue: Math.floor(Math.random() * 50000) + 30000,
      orders: Math.floor(Math.random() * 800) + 400,
      commission: Math.floor(Math.random() * 5000) + 2000
    });
  }
  
  return data;
};

const generateGrowthData = () => {
  const data = [];
  const metrics = ['Neue Tenants', 'Aktive Nutzer', 'Bestellungen', 'Umsatz'];
  
  metrics.forEach(metric => {
    data.push({
      metric,
      current: Math.floor(Math.random() * 1000) + 500,
      previous: Math.floor(Math.random() * 800) + 400,
      growth: Math.floor(Math.random() * 40) - 10
    });
  });
  
  return data;
};

const generatePlanDistribution = () => [
  { name: 'Starter', value: 45, color: CHART_COLORS.primary },
  { name: 'Professional', value: 35, color: CHART_COLORS.secondary },
  { name: 'Enterprise', value: 20, color: CHART_COLORS.tertiary }
];

// ============================================================================
// COMPONENTS
// ============================================================================

const MetricCard = ({ icon: Icon, title, value, trend, color = 'primary', onClick }) => (
  <div className={`${styles.metricCard} ${styles[color]}`} onClick={onClick}>
    <div className={styles.metricHeader}>
      <Icon className={styles.metricIcon} />
      <span className={styles.metricTitle}>{title}</span>
    </div>
    <div className={styles.metricValue}>{value}</div>
    {trend && (
      <div className={`${styles.metricTrend} ${trend > 0 ? styles.positive : styles.negative}`}>
        <TrendingUp size={16} />
        <span>{Math.abs(trend)}%</span>
      </div>
    )}
  </div>
);

const TenantRow = ({ tenant, onSelect, onAction }) => {
  const [showActions, setShowActions] = useState(false);
  
  const getStatusColor = (status) => {
    switch (status) {
      case TENANT_STATUS.ACTIVE: return styles.statusActive;
      case TENANT_STATUS.INACTIVE: return styles.statusInactive;
      case TENANT_STATUS.SUSPENDED: return styles.statusSuspended;
      case TENANT_STATUS.TRIAL: return styles.statusTrial;
      default: return '';
    }
  };
  
  const getPlanIcon = (plan) => {
    switch (plan) {
      case 'enterprise': return <Sparkles size={16} />;
      case 'professional': return <Zap size={16} />;
      default: return <Package size={16} />;
    }
  };
  
  return (
    <tr className={styles.tenantRow} onClick={() => onSelect(tenant)}>
      <td>
        <div className={styles.tenantInfo}>
          <div className={styles.tenantName}>{tenant.name}</div>
          <div className={styles.tenantSubdomain}>{tenant.subdomain}.eatech.ch</div>
        </div>
      </td>
      <td>
        <span className={`${styles.status} ${getStatusColor(tenant.status)}`}>
          {tenant.status === TENANT_STATUS.ACTIVE && <CheckCircle size={14} />}
          {tenant.status === TENANT_STATUS.INACTIVE && <XCircle size={14} />}
          {tenant.status === TENANT_STATUS.SUSPENDED && <Lock size={14} />}
          {tenant.status === TENANT_STATUS.TRIAL && <Activity size={14} />}
          {tenant.status}
        </span>
      </td>
      <td>
        <div className={styles.plan}>
          {getPlanIcon(tenant.plan)}
          <span>{tenant.plan}</span>
        </div>
      </td>
      <td className={styles.revenue}>CHF {tenant.metrics.revenue.toLocaleString()}</td>
      <td className={styles.orders}>{tenant.metrics.orders.toLocaleString()}</td>
      <td className={styles.lastActive}>
        {new Date(tenant.lastActive).toLocaleDateString('de-CH')}
      </td>
      <td className={styles.actions}>
        <div className={styles.actionsWrapper}>
          <button 
            className={styles.actionButton}
            onClick={(e) => {
              e.stopPropagation();
              setShowActions(!showActions);
            }}
          >
            <MoreVertical size={18} />
          </button>
          {showActions && (
            <div className={styles.actionMenu}>
              <button onClick={() => onAction('view', tenant)}>
                <Activity size={16} /> Details
              </button>
              <button onClick={() => onAction('edit', tenant)}>
                <Settings size={16} /> Bearbeiten
              </button>
              <button onClick={() => onAction('suspend', tenant)}>
                <Lock size={16} /> Suspendieren
              </button>
              <button onClick={() => onAction('delete', tenant)} className={styles.danger}>
                <XCircle size={16} /> Löschen
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};

const SystemHealthCard = ({ metric, value, max, unit, icon: Icon, color }) => {
  const percentage = (value / max) * 100;
  const isWarning = percentage > 80;
  const isCritical = percentage > 90;
  
  return (
    <div className={`${styles.healthCard} ${isCritical ? styles.critical : isWarning ? styles.warning : ''}`}>
      <div className={styles.healthHeader}>
        <Icon size={20} />
        <span>{metric}</span>
      </div>
      <div className={styles.healthValue}>
        {value}{unit}
      </div>
      <div className={styles.healthBar}>
        <div 
          className={styles.healthBarFill} 
          style={{ 
            width: `${percentage}%`,
            backgroundColor: isCritical ? CHART_COLORS.danger : 
                           isWarning ? CHART_COLORS.warning : 
                           CHART_COLORS.success
          }}
        />
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const MasterDashboard = () => {
  const navigate = useNavigate();
  const db = getDatabaseInstance();
  
  // State
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState('overview');
  const [selectedTenant, setSelectedTenant] = useState(null);
  
  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // In production, this would load from Firebase
        const mockData = generateMockData();
        setData(mockData);
      } catch (error) {
        console.error('Error loading master data:', error);
        toast.error('Fehler beim Laden der Daten');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [selectedTimeRange]);
  
  // Handlers
  const handleTenantSelect = useCallback((tenant) => {
    setSelectedTenant(tenant);
    navigate(`/master/tenant/${tenant.id}`);
  }, [navigate]);
  
  const handleTenantAction = useCallback((action, tenant) => {
    switch (action) {
      case 'view':
        navigate(`/master/tenant/${tenant.id}`);
        break;
      case 'edit':
        navigate(`/master/tenant/${tenant.id}/edit`);
        break;
      case 'suspend':
        // Implement suspend logic
        toast.success(`${tenant.name} wurde suspendiert`);
        break;
      case 'delete':
        // Implement delete logic with confirmation
        if (window.confirm(`Möchten Sie ${tenant.name} wirklich löschen?`)) {
          toast.success(`${tenant.name} wurde gelöscht`);
        }
        break;
      default:
        break;
    }
  }, [navigate]);
  
  const handleExportData = useCallback(() => {
    // Implement data export
    toast.success('Daten werden exportiert...');
  }, []);
  
  // Filtered tenants
  const filteredTenants = useMemo(() => {
    if (!data?.tenants || !searchQuery) return data?.tenants || [];
    
    return data.tenants.filter(tenant => 
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.subdomain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.contact.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [data?.tenants, searchQuery]);
  
  // Loading state
  if (loading) {
    return (
      <div className={styles.loading}>
        <RefreshCw className={styles.spinner} />
        <span>Master-Daten werden geladen...</span>
      </div>
    );
  }
  
  // Error state
  if (!data) {
    return (
      <div className={styles.error}>
        <AlertCircle size={48} />
        <h2>Fehler beim Laden der Daten</h2>
        <button onClick={() => window.location.reload()}>Neu laden</button>
      </div>
    );
  }
  
  return (
    <div className={styles.masterDashboard}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Master Admin Dashboard</h1>
          <p>Systemweite Verwaltung und Überwachung</p>
        </div>
        <div className={styles.headerRight}>
          <select 
            value={selectedTimeRange} 
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className={styles.timeSelect}
          >
            {TIME_RANGES.map(range => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
          <button className={styles.refreshButton} onClick={() => window.location.reload()}>
            <RefreshCw size={18} />
            Aktualisieren
          </button>
          <button className={styles.exportButton} onClick={handleExportData}>
            <Download size={18} />
            Export
          </button>
        </div>
      </div>
      
      {/* System Overview */}
      <div className={styles.systemOverview}>
        <MetricCard
          icon={Building2}
          title="Aktive Tenants"
          value={data.systemMetrics.activeTenants}
          trend={12}
          color="primary"
        />
        <MetricCard
          icon={DollarSign}
          title="Gesamtumsatz"
          value={`CHF ${(data.systemMetrics.totalRevenue / 1000).toFixed(0)}k`}
          trend={18}
          color="success"
        />
        <MetricCard
          icon={Package}
          title="Bestellungen"
          value={data.systemMetrics.totalOrders.toLocaleString()}
          trend={25}
          color="info"
        />
        <MetricCard
          icon={Activity}
          title="System Health"
          value={`${data.systemMetrics.serverHealth}%`}
          trend={null}
          color={data.systemMetrics.serverHealth > 95 ? 'success' : 'warning'}
        />
      </div>
      
      {/* Revenue Chart */}
      <div className={styles.chartSection}>
        <div className={styles.chartHeader}>
          <h2>Umsatzentwicklung</h2>
          <div className={styles.chartLegend}>
            <span><span className={styles.dot} style={{ backgroundColor: CHART_COLORS.primary }} /> Umsatz</span>
            <span><span className={styles.dot} style={{ backgroundColor: CHART_COLORS.secondary }} /> Provision</span>
          </div>
        </div>
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="date" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                labelStyle={{ color: '#fff' }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stackId="1"
                stroke={CHART_COLORS.primary}
                fill={CHART_COLORS.primary}
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="commission"
                stackId="1"
                stroke={CHART_COLORS.secondary}
                fill={CHART_COLORS.secondary}
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Main Content Grid */}
      <div className={styles.mainGrid}>
        {/* Tenant List */}
        <div className={styles.tenantSection}>
          <div className={styles.sectionHeader}>
            <h2>Tenant-Übersicht</h2>
            <div className={styles.searchBar}>
              <Search size={18} />
              <input
                type="text"
                placeholder="Suche nach Name, Domain oder E-Mail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className={styles.tableWrapper}>
            <table className={styles.tenantTable}>
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Status</th>
                  <th>Plan</th>
                  <th>Umsatz (30T)</th>
                  <th>Bestellungen</th>
                  <th>Letzte Aktivität</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map(tenant => (
                  <TenantRow
                    key={tenant.id}
                    tenant={tenant}
                    onSelect={handleTenantSelect}
                    onAction={handleTenantAction}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Side Panels */}
        <div className={styles.sidePanels}>
          {/* System Health */}
          <div className={styles.panel}>
            <h3>System Health</h3>
            <div className={styles.healthGrid}>
              <SystemHealthCard
                metric="CPU Auslastung"
                value={45}
                max={100}
                unit="%"
                icon={Activity}
                color={CHART_COLORS.primary}
              />
              <SystemHealthCard
                metric="API Latenz"
                value={data.systemMetrics.apiLatency}
                max={200}
                unit="ms"
                icon={Zap}
                color={CHART_COLORS.secondary}
              />
              <SystemHealthCard
                metric="Speicher"
                value={data.systemMetrics.storageUsed}
                max={100}
                unit="%"
                icon={Database}
                color={CHART_COLORS.tertiary}
              />
              <SystemHealthCard
                metric="Bandbreite"
                value={data.systemMetrics.bandwidth}
                max={100}
                unit="%"
                icon={Globe}
                color={CHART_COLORS.quaternary}
              />
            </div>
          </div>
          
          {/* Plan Distribution */}
          <div className={styles.panel}>
            <h3>Plan-Verteilung</h3>
            <div className={styles.pieChartContainer}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.planDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.planDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className={styles.planLegend}>
                {data.planDistribution.map((plan, index) => (
                  <div key={index} className={styles.planItem}>
                    <span className={styles.planDot} style={{ backgroundColor: plan.color }} />
                    <span className={styles.planName}>{plan.name}</span>
                    <span className={styles.planValue}>{plan.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Recent Activities */}
          <div className={styles.panel}>
            <h3>Letzte Aktivitäten</h3>
            <div className={styles.activities}>
              <div className={styles.activity}>
                <CheckCircle size={16} className={styles.activityIcon} />
                <div className={styles.activityContent}>
                  <span className={styles.activityText}>Neuer Tenant registriert</span>
                  <span className={styles.activityTime}>vor 5 Minuten</span>
                </div>
              </div>
              <div className={styles.activity}>
                <DollarSign size={16} className={styles.activityIcon} />
                <div className={styles.activityContent}>
                  <span className={styles.activityText}>Zahlung erhalten: CHF 299</span>
                  <span className={styles.activityTime}>vor 12 Minuten</span>
                </div>
              </div>
              <div className={styles.activity}>
                <AlertCircle size={16} className={styles.activityIcon} />
                <div className={styles.activityContent}>
                  <span className={styles.activityText}>Server-Warnung behoben</span>
                  <span className={styles.activityTime}>vor 1 Stunde</span>
                </div>
              </div>
              <div className={styles.activity}>
                <Upload size={16} className={styles.activityIcon} />
                <div className={styles.activityContent}>
                  <span className={styles.activityText}>System-Update installiert</span>
                  <span className={styles.activityTime}>vor 3 Stunden</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default MasterDashboard;