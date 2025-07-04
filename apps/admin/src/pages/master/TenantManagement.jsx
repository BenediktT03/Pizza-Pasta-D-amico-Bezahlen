/**
 * EATECH - Tenant Management Page
 * Version: 5.0.0
 * Description: Detaillierte Verwaltung einzelner Tenants
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/admin/src/pages/master/TenantManagement.jsx
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Save, Trash2, Lock, Unlock, RefreshCw,
  Building2, User, Mail, Phone, Globe, Calendar,
  CreditCard, Package, TrendingUp, AlertCircle,
  Settings, Database, Shield, Activity, History,
  FileText, Download, Upload, CheckCircle, XCircle,
  Edit3, Copy, ExternalLink, BarChart3, DollarSign
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { ref, onValue, update, remove } from 'firebase/database';
import { getDatabaseInstance } from '../../lib/firebase';
import { toast } from 'react-hot-toast';
import styles from './TenantManagement.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================

const PLANS = {
  starter: {
    name: 'Starter',
    price: 99,
    features: ['500 Bestellungen/Monat', 'Basis-Features', 'E-Mail Support'],
    color: '#FFE66D'
  },
  professional: {
    name: 'Professional',
    price: 299,
    features: ['2000 Bestellungen/Monat', 'Erweiterte Features', 'Priority Support'],
    color: '#4ECDC4'
  },
  enterprise: {
    name: 'Enterprise',
    price: 'Custom',
    features: ['Unbegrenzte Bestellungen', 'Alle Features', 'Dedizierter Support'],
    color: '#FF6B6B'
  }
};

const TABS = [
  { id: 'overview', label: 'Übersicht', icon: BarChart3 },
  { id: 'details', label: 'Details', icon: Building2 },
  { id: 'billing', label: 'Abrechnung', icon: CreditCard },
  { id: 'usage', label: 'Nutzung', icon: Activity },
  { id: 'settings', label: 'Einstellungen', icon: Settings },
  { id: 'logs', label: 'Aktivitäten', icon: History }
];

// ============================================================================
// MOCK DATA GENERATOR
// ============================================================================

const generateMockTenantData = (tenantId) => {
  // Generate 30 days of usage data
  const usageData = [];
  const now = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    usageData.push({
      date: date.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' }),
      orders: Math.floor(Math.random() * 100) + 20,
      revenue: Math.floor(Math.random() * 5000) + 1000,
      customers: Math.floor(Math.random() * 50) + 10,
      apiCalls: Math.floor(Math.random() * 10000) + 1000
    });
  }
  
  // Generate billing history
  const billingHistory = [];
  for (let i = 0; i < 6; i++) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);
    
    billingHistory.push({
      id: `inv-${Date.now()}-${i}`,
      date: date.toISOString(),
      amount: 299,
      status: i === 0 ? 'pending' : 'paid',
      plan: 'professional',
      period: date.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })
    });
  }
  
  // Generate activity logs
  const activityLogs = [
    { type: 'login', message: 'Admin-Login erfolgreich', timestamp: new Date().toISOString(), user: 'admin@pizzaexpress.ch' },
    { type: 'update', message: 'Menü aktualisiert', timestamp: new Date(Date.now() - 3600000).toISOString(), user: 'admin@pizzaexpress.ch' },
    { type: 'order', message: '45 neue Bestellungen verarbeitet', timestamp: new Date(Date.now() - 7200000).toISOString(), user: 'system' },
    { type: 'payment', message: 'Zahlung erfolgreich verarbeitet', timestamp: new Date(Date.now() - 86400000).toISOString(), user: 'system' },
    { type: 'settings', message: 'Öffnungszeiten geändert', timestamp: new Date(Date.now() - 172800000).toISOString(), user: 'admin@pizzaexpress.ch' }
  ];
  
  return {
    id: tenantId,
    // Basic Information
    name: 'Pizza Express Zürich',
    subdomain: 'pizza-express',
    status: 'active',
    plan: 'professional',
    createdAt: '2024-06-15T10:00:00Z',
    
    // Contact Information
    contact: {
      name: 'Marco Steiner',
      email: 'marco@pizzaexpress.ch',
      phone: '+41 79 123 45 67',
      address: 'Bahnhofstrasse 10, 8001 Zürich'
    },
    
    // Business Information
    business: {
      type: 'Foodtruck',
      cuisine: 'Italienisch',
      registrationNumber: 'CHE-123.456.789',
      vatNumber: 'CHE-123.456.789 MWST',
      bankAccount: 'CH93 0076 2011 6238 5295 7'
    },
    
    // Usage Statistics
    usage: {
      totalOrders: 15432,
      totalRevenue: 485320,
      totalCustomers: 3421,
      avgOrderValue: 31.50,
      currentMonth: {
        orders: 1243,
        revenue: 38450,
        customers: 456
      }
    },
    
    // Technical Details
    technical: {
      apiKey: 'pk_live_' + Math.random().toString(36).substring(2, 15),
      webhookUrl: 'https://pizza-express.eatech.ch/webhook',
      ipWhitelist: ['192.168.1.1', '10.0.0.1'],
      customDomain: 'bestellung.pizzaexpress.ch',
      ssl: true
    },
    
    // Features & Limits
    features: {
      multiLocation: true,
      customBranding: true,
      apiAccess: true,
      analytics: 'advanced',
      support: 'priority'
    },
    
    limits: {
      ordersPerMonth: 2000,
      locationsAllowed: 3,
      staffAccounts: 10,
      storageGB: 50,
      apiCallsPerDay: 10000
    },
    
    // Data
    usageData,
    billingHistory,
    activityLogs
  };
};

// ============================================================================
// COMPONENTS
// ============================================================================

const InfoCard = ({ title, icon: Icon, children, action }) => (
  <div className={styles.infoCard}>
    <div className={styles.infoCardHeader}>
      <div className={styles.infoCardTitle}>
        <Icon size={20} />
        <h3>{title}</h3>
      </div>
      {action && (
        <button className={styles.infoCardAction} onClick={action.onClick}>
          {action.icon && <action.icon size={16} />}
          {action.label}
        </button>
      )}
    </div>
    <div className={styles.infoCardContent}>
      {children}
    </div>
  </div>
);

const StatCard = ({ label, value, icon: Icon, trend, color }) => (
  <div className={`${styles.statCard} ${color ? styles[color] : ''}`}>
    <div className={styles.statCardHeader}>
      <span className={styles.statCardLabel}>{label}</span>
      {Icon && <Icon size={20} className={styles.statCardIcon} />}
    </div>
    <div className={styles.statCardValue}>{value}</div>
    {trend && (
      <div className={`${styles.statCardTrend} ${trend > 0 ? styles.positive : styles.negative}`}>
        <TrendingUp size={16} />
        <span>{Math.abs(trend)}%</span>
      </div>
    )}
  </div>
);

const ActivityItem = ({ activity }) => {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'login': return User;
      case 'update': return Edit3;
      case 'order': return Package;
      case 'payment': return CreditCard;
      case 'settings': return Settings;
      default: return Activity;
    }
  };
  
  const Icon = getActivityIcon(activity.type);
  
  return (
    <div className={styles.activityItem}>
      <div className={styles.activityIcon}>
        <Icon size={16} />
      </div>
      <div className={styles.activityContent}>
        <div className={styles.activityMessage}>{activity.message}</div>
        <div className={styles.activityMeta}>
          <span>{activity.user}</span>
          <span>•</span>
          <span>{new Date(activity.timestamp).toLocaleString('de-CH')}</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const TenantManagement = () => {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const db = getDatabaseInstance();
  
  // State
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  
  // Load tenant data
  useEffect(() => {
    const loadTenantData = async () => {
      setLoading(true);
      try {
        // In production, this would load from Firebase
        const mockData = generateMockTenantData(tenantId);
        setTenant(mockData);
        setFormData(mockData);
      } catch (error) {
        console.error('Error loading tenant data:', error);
        toast.error('Fehler beim Laden der Tenant-Daten');
      } finally {
        setLoading(false);
      }
    };
    
    loadTenantData();
  }, [tenantId]);
  
  // Handlers
  const handleSave = async () => {
    try {
      // In production, save to Firebase
      setTenant(formData);
      setIsEditing(false);
      toast.success('Änderungen gespeichert');
    } catch (error) {
      console.error('Error saving tenant:', error);
      toast.error('Fehler beim Speichern');
    }
  };
  
  const handleDelete = async () => {
    if (!window.confirm(`Möchten Sie ${tenant.name} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
      return;
    }
    
    try {
      // In production, delete from Firebase
      toast.success('Tenant gelöscht');
      navigate('/master');
    } catch (error) {
      console.error('Error deleting tenant:', error);
      toast.error('Fehler beim Löschen');
    }
  };
  
  const handleStatusToggle = async () => {
    const newStatus = tenant.status === 'active' ? 'suspended' : 'active';
    try {
      // In production, update in Firebase
      setTenant({ ...tenant, status: newStatus });
      toast.success(`Tenant ${newStatus === 'active' ? 'aktiviert' : 'suspendiert'}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Fehler beim Statusupdate');
    }
  };
  
  const handlePlanChange = async (newPlan) => {
    try {
      // In production, update in Firebase
      setTenant({ ...tenant, plan: newPlan });
      toast.success(`Plan auf ${PLANS[newPlan].name} geändert`);
    } catch (error) {
      console.error('Error updating plan:', error);
      toast.error('Fehler beim Planwechsel');
    }
  };
  
  const handleExportData = () => {
    // Implement data export
    toast.success('Daten werden exportiert...');
  };
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('In Zwischenablage kopiert');
  };
  
  // Loading state
  if (loading) {
    return (
      <div className={styles.loading}>
        <RefreshCw className={styles.spinner} />
        <span>Tenant-Daten werden geladen...</span>
      </div>
    );
  }
  
  // Error state
  if (!tenant) {
    return (
      <div className={styles.error}>
        <AlertCircle size={48} />
        <h2>Tenant nicht gefunden</h2>
        <button onClick={() => navigate('/master')}>Zurück zur Übersicht</button>
      </div>
    );
  }
  
  return (
    <div className={styles.tenantManagement}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backButton} onClick={() => navigate('/master')}>
            <ArrowLeft size={20} />
            Zurück
          </button>
          <div className={styles.headerInfo}>
            <h1>{tenant.name}</h1>
            <div className={styles.headerMeta}>
              <span className={`${styles.status} ${styles[tenant.status]}`}>
                {tenant.status === 'active' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                {tenant.status}
              </span>
              <span className={styles.plan}>
                <Package size={14} />
                {PLANS[tenant.plan].name}
              </span>
              <span className={styles.subdomain}>
                <Globe size={14} />
                {tenant.subdomain}.eatech.ch
              </span>
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          {isEditing ? (
            <>
              <button className={styles.cancelButton} onClick={() => setIsEditing(false)}>
                Abbrechen
              </button>
              <button className={styles.saveButton} onClick={handleSave}>
                <Save size={18} />
                Speichern
              </button>
            </>
          ) : (
            <>
              <button className={styles.editButton} onClick={() => setIsEditing(true)}>
                <Edit3 size={18} />
                Bearbeiten
              </button>
              <button 
                className={`${styles.statusButton} ${tenant.status === 'active' ? styles.suspend : styles.activate}`}
                onClick={handleStatusToggle}
              >
                {tenant.status === 'active' ? <Lock size={18} /> : <Unlock size={18} />}
                {tenant.status === 'active' ? 'Suspendieren' : 'Aktivieren'}
              </button>
              <button className={styles.deleteButton} onClick={handleDelete}>
                <Trash2 size={18} />
                Löschen
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div className={styles.content}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className={styles.overviewTab}>
            {/* Stats Grid */}
            <div className={styles.statsGrid}>
              <StatCard
                label="Umsatz (30 Tage)"
                value={`CHF ${tenant.usage.currentMonth.revenue.toLocaleString()}`}
                icon={DollarSign}
                trend={15}
                color="primary"
              />
              <StatCard
                label="Bestellungen"
                value={tenant.usage.currentMonth.orders.toLocaleString()}
                icon={Package}
                trend={8}
                color="success"
              />
              <StatCard
                label="Kunden"
                value={tenant.usage.currentMonth.customers.toLocaleString()}
                icon={User}
                trend={-5}
                color="info"
              />
              <StatCard
                label="Ø Bestellwert"
                value={`CHF ${tenant.usage.avgOrderValue}`}
                icon={TrendingUp}
                trend={12}
                color="warning"
              />
            </div>
            
            {/* Usage Chart */}
            <div className={styles.chartSection}>
              <h3>Nutzungsverlauf (30 Tage)</h3>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={tenant.usageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis dataKey="date" stroke="#666" />
                    <YAxis yAxisId="left" stroke="#666" />
                    <YAxis yAxisId="right" orientation="right" stroke="#666" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="orders" 
                      stroke="#FF6B6B" 
                      name="Bestellungen"
                      strokeWidth={2}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#4ECDC4" 
                      name="Umsatz (CHF)"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className={styles.quickActions}>
              <h3>Schnellaktionen</h3>
              <div className={styles.actionGrid}>
                <button className={styles.actionButton}>
                  <Mail size={20} />
                  E-Mail senden
                </button>
                <button className={styles.actionButton}>
                  <FileText size={20} />
                  Rechnung erstellen
                </button>
                <button className={styles.actionButton}>
                  <Download size={20} />
                  Daten exportieren
                </button>
                <button className={styles.actionButton}>
                  <Shield size={20} />
                  Berechtigungen
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className={styles.detailsTab}>
            {/* Contact Information */}
            <InfoCard 
              title="Kontaktinformationen" 
              icon={User}
              action={{
                label: 'Bearbeiten',
                icon: Edit3,
                onClick: () => setIsEditing(true)
              }}
            >
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <label>Name</label>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={formData.contact.name}
                      onChange={(e) => setFormData({
                        ...formData,
                        contact: { ...formData.contact, name: e.target.value }
                      })}
                    />
                  ) : (
                    <span>{tenant.contact.name}</span>
                  )}
                </div>
                <div className={styles.infoItem}>
                  <label>E-Mail</label>
                  {isEditing ? (
                    <input 
                      type="email" 
                      value={formData.contact.email}
                      onChange={(e) => setFormData({
                        ...formData,
                        contact: { ...formData.contact, email: e.target.value }
                      })}
                    />
                  ) : (
                    <span>{tenant.contact.email}</span>
                  )}
                </div>
                <div className={styles.infoItem}>
                  <label>Telefon</label>
                  {isEditing ? (
                    <input 
                      type="tel" 
                      value={formData.contact.phone}
                      onChange={(e) => setFormData({
                        ...formData,
                        contact: { ...formData.contact, phone: e.target.value }
                      })}
                    />
                  ) : (
                    <span>{tenant.contact.phone}</span>
                  )}
                </div>
                <div className={styles.infoItem}>
                  <label>Adresse</label>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={formData.contact.address}
                      onChange={(e) => setFormData({
                        ...formData,
                        contact: { ...formData.contact, address: e.target.value }
                      })}
                    />
                  ) : (
                    <span>{tenant.contact.address}</span>
                  )}
                </div>
              </div>
            </InfoCard>
            
            {/* Business Information */}
            <InfoCard title="Geschäftsinformationen" icon={Building2}>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <label>Typ</label>
                  <span>{tenant.business.type}</span>
                </div>
                <div className={styles.infoItem}>
                  <label>Küche</label>
                  <span>{tenant.business.cuisine}</span>
                </div>
                <div className={styles.infoItem}>
                  <label>Handelsregister</label>
                  <span>{tenant.business.registrationNumber}</span>
                </div>
                <div className={styles.infoItem}>
                  <label>MwSt-Nummer</label>
                  <span>{tenant.business.vatNumber}</span>
                </div>
                <div className={styles.infoItem}>
                  <label>Bankkonto</label>
                  <span>{tenant.business.bankAccount}</span>
                </div>
                <div className={styles.infoItem}>
                  <label>Erstellt am</label>
                  <span>{new Date(tenant.createdAt).toLocaleDateString('de-CH')}</span>
                </div>
              </div>
            </InfoCard>
            
            {/* Technical Information */}
            <InfoCard title="Technische Details" icon={Settings}>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <label>API Key</label>
                  <div className={styles.copyField}>
                    <code>{tenant.technical.apiKey}</code>
                    <button onClick={() => copyToClipboard(tenant.technical.apiKey)}>
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
                <div className={styles.infoItem}>
                  <label>Webhook URL</label>
                  <span>{tenant.technical.webhookUrl}</span>
                </div>
                <div className={styles.infoItem}>
                  <label>Custom Domain</label>
                  <span>
                    {tenant.technical.customDomain}
                    <ExternalLink size={14} style={{ marginLeft: 8 }} />
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <label>IP Whitelist</label>
                  <span>{tenant.technical.ipWhitelist.join(', ')}</span>
                </div>
              </div>
            </InfoCard>
          </div>
        )}
        
        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className={styles.billingTab}>
            {/* Current Plan */}
            <InfoCard 
              title="Aktueller Plan" 
              icon={CreditCard}
              action={{
                label: 'Plan ändern',
                onClick: () => {}
              }}
            >
              <div className={styles.planGrid}>
                {Object.entries(PLANS).map(([key, plan]) => (
                  <div 
                    key={key}
                    className={`${styles.planCard} ${tenant.plan === key ? styles.active : ''}`}
                    onClick={() => handlePlanChange(key)}
                  >
                    <h4>{plan.name}</h4>
                    <div className={styles.planPrice}>
                      {typeof plan.price === 'number' ? `CHF ${plan.price}` : plan.price}
                      {typeof plan.price === 'number' && <span>/Monat</span>}
                    </div>
                    <ul className={styles.planFeatures}>
                      {plan.features.map((feature, index) => (
                        <li key={index}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </InfoCard>
            
            {/* Billing History */}
            <InfoCard title="Abrechnungsverlauf" icon={History}>
              <div className={styles.billingHistory}>
                <table>
                  <thead>
                    <tr>
                      <th>Datum</th>
                      <th>Periode</th>
                      <th>Plan</th>
                      <th>Betrag</th>
                      <th>Status</th>
                      <th>Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenant.billingHistory.map(invoice => (
                      <tr key={invoice.id}>
                        <td>{new Date(invoice.date).toLocaleDateString('de-CH')}</td>
                        <td>{invoice.period}</td>
                        <td>{PLANS[invoice.plan].name}</td>
                        <td>CHF {invoice.amount}</td>
                        <td>
                          <span className={`${styles.invoiceStatus} ${styles[invoice.status]}`}>
                            {invoice.status === 'paid' ? 'Bezahlt' : 'Ausstehend'}
                          </span>
                        </td>
                        <td>
                          <button className={styles.downloadButton}>
                            <Download size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </InfoCard>
          </div>
        )}
        
        {/* Usage Tab */}
        {activeTab === 'usage' && (
          <div className={styles.usageTab}>
            {/* Resource Usage */}
            <InfoCard title="Ressourcennutzung" icon={Database}>
              <div className={styles.usageGrid}>
                <div className={styles.usageItem}>
                  <div className={styles.usageHeader}>
                    <span>Bestellungen</span>
                    <span>{tenant.usage.currentMonth.orders} / {tenant.limits.ordersPerMonth}</span>
                  </div>
                  <div className={styles.usageBar}>
                    <div 
                      className={styles.usageBarFill}
                      style={{ width: `${(tenant.usage.currentMonth.orders / tenant.limits.ordersPerMonth) * 100}%` }}
                    />
                  </div>
                </div>
                <div className={styles.usageItem}>
                  <div className={styles.usageHeader}>
                    <span>Speicherplatz</span>
                    <span>32 GB / {tenant.limits.storageGB} GB</span>
                  </div>
                  <div className={styles.usageBar}>
                    <div 
                      className={styles.usageBarFill}
                      style={{ width: '64%' }}
                    />
                  </div>
                </div>
                <div className={styles.usageItem}>
                  <div className={styles.usageHeader}>
                    <span>API Calls</span>
                    <span>7,234 / {tenant.limits.apiCallsPerDay}</span>
                  </div>
                  <div className={styles.usageBar}>
                    <div 
                      className={styles.usageBarFill}
                      style={{ width: '72%' }}
                    />
                  </div>
                </div>
                <div className={styles.usageItem}>
                  <div className={styles.usageHeader}>
                    <span>Mitarbeiter</span>
                    <span>8 / {tenant.limits.staffAccounts}</span>
                  </div>
                  <div className={styles.usageBar}>
                    <div 
                      className={styles.usageBarFill}
                      style={{ width: '80%' }}
                    />
                  </div>
                </div>
              </div>
            </InfoCard>
            
            {/* API Usage Chart */}
            <div className={styles.chartSection}>
              <h3>API-Nutzung (30 Tage)</h3>
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={tenant.usageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis dataKey="date" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="apiCalls" fill="#4ECDC4" name="API Calls" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
        
        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className={styles.settingsTab}>
            {/* Features */}
            <InfoCard title="Features & Berechtigungen" icon={Shield}>
              <div className={styles.featureGrid}>
                <label className={styles.featureToggle}>
                  <input 
                    type="checkbox" 
                    checked={tenant.features.multiLocation}
                    onChange={(e) => {/* Handle change */}}
                  />
                  <span>Multi-Location Support</span>
                </label>
                <label className={styles.featureToggle}>
                  <input 
                    type="checkbox" 
                    checked={tenant.features.customBranding}
                    onChange={(e) => {/* Handle change */}}
                  />
                  <span>Custom Branding</span>
                </label>
                <label className={styles.featureToggle}>
                  <input 
                    type="checkbox" 
                    checked={tenant.features.apiAccess}
                    onChange={(e) => {/* Handle change */}}
                  />
                  <span>API Zugang</span>
                </label>
                <label className={styles.featureToggle}>
                  <input 
                    type="checkbox" 
                    checked={true}
                    onChange={(e) => {/* Handle change */}}
                  />
                  <span>Erweiterte Analytics</span>
                </label>
              </div>
            </InfoCard>
            
            {/* Danger Zone */}
            <InfoCard title="Gefahrenzone" icon={AlertCircle}>
              <div className={styles.dangerZone}>
                <div className={styles.dangerItem}>
                  <div>
                    <h4>Daten exportieren</h4>
                    <p>Exportieren Sie alle Daten dieses Tenants</p>
                  </div>
                  <button className={styles.exportButton} onClick={handleExportData}>
                    <Download size={18} />
                    Exportieren
                  </button>
                </div>
                <div className={styles.dangerItem}>
                  <div>
                    <h4>Tenant löschen</h4>
                    <p>Diese Aktion kann nicht rückgängig gemacht werden</p>
                  </div>
                  <button className={styles.deleteButton} onClick={handleDelete}>
                    <Trash2 size={18} />
                    Löschen
                  </button>
                </div>
              </div>
            </InfoCard>
          </div>
        )}
        
        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className={styles.logsTab}>
            <InfoCard title="Aktivitätsverlauf" icon={History}>
              <div className={styles.activityList}>
                {tenant.activityLogs.map((activity, index) => (
                  <ActivityItem key={index} activity={activity} />
                ))}
              </div>
            </InfoCard>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default TenantManagement;