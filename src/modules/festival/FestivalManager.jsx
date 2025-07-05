/**
 * EATECH - Festival Management System
 * Version: 1.0.0
 * Description: Revolutionäres Multi-Vendor Festival Management mit
 *              dynamischem Revenue Share, Cashless Wallet und Live Analytics
 * Features: Festival Creation, Vendor Management, QR System, Revenue Tracking,
 *           Live Maps, Queue Management, Sponsor Integration
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * File Path: /src/modules/festival/FestivalManager.jsx
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Calendar, MapPin, Users, Clock, DollarSign, QrCode,
  Plus, Edit2, Trash2, Eye, Download, Upload, Settings,
  TrendingUp, AlertCircle, CheckCircle, RefreshCw,
  BarChart3, PieChart, Activity, Zap, Shield, Globe,
  Wallet, CreditCard, Smartphone, Radio, Music,
  Coffee, Pizza, Award, Target, Navigation, Send,
  Building2, Package, Truck, ChevronRight, MoreVertical,
  Copy, ExternalLink, Bell, Filter, Search, X
} from 'lucide-react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart as RePieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, Radar, PolarGrid
} from 'recharts';
import QRCode from 'qrcode.react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import styles from './FestivalManager.module.css';

// Sub-components
import FestivalCreationWizard from './components/FestivalCreationWizard';
import VendorManagement from './components/VendorManagement';
import LiveFestivalDashboard from './components/LiveFestivalDashboard';
import WalletConfiguration from './components/WalletConfiguration';
import QRCodeGenerator from './components/QRCodeGenerator';
import RevenueAnalytics from './components/RevenueAnalytics';
import SponsorManager from './components/SponsorManager';

// Hooks
import { useFestivalData } from '../../hooks/useFestivalData';
import { useRealtimeAnalytics } from '../../hooks/useRealtimeAnalytics';
import { useWalletSystem } from '../../hooks/useWalletSystem';
import { useMapbox } from '../../hooks/useMapbox';

// Utils
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters';
import { calculateRevenueSplit } from '../../utils/revenueCalculations';
import { generateFestivalQR } from '../../utils/qrGenerator';

// ============================================================================
// CONSTANTS
// ============================================================================
const FESTIVAL_TYPES = {
  STREET_FOOD: {
    id: 'street_food',
    name: 'Street Food Festival',
    icon: Pizza,
    color: '#FF6B6B',
    baseCommission: 2,
    features: ['full'],
    avgDuration: 3,
    avgVendors: 30,
    description: 'Kulinarische Vielfalt unter freiem Himmel'
  },
  MUSIC: {
    id: 'music',
    name: 'Musik Festival',
    icon: Music,
    color: '#4ECDC4',
    baseCommission: 2.5,
    features: ['full', 'stage_integration'],
    avgDuration: 3,
    avgVendors: 20,
    description: 'Food & Music in perfekter Harmonie'
  },
  CORPORATE: {
    id: 'corporate',
    name: 'Firmen Event',
    icon: Building2,
    color: '#45B7D1',
    baseCommission: 1.5,
    features: ['limited', 'closed_loop'],
    avgDuration: 1,
    avgVendors: 8,
    description: 'Exklusives Catering für Mitarbeiter'
  },
  WEEKLY_MARKET: {
    id: 'weekly_market',
    name: 'Wochenmarkt',
    icon: Package,
    color: '#96CEB4',
    baseCommission: 1,
    features: ['basic', 'recurring'],
    avgDuration: 1,
    avgVendors: 15,
    description: 'Regelmäßiger lokaler Markt'
  },
  CHRISTMAS: {
    id: 'christmas',
    name: 'Weihnachtsmarkt',
    icon: Award,
    color: '#D4A574',
    baseCommission: 2,
    features: ['full', 'seasonal'],
    avgDuration: 30,
    avgVendors: 40,
    description: 'Festliche Stimmung & Glühwein'
  },
  SPORTS: {
    id: 'sports',
    name: 'Sport Event',
    icon: Target,
    color: '#F39C12',
    baseCommission: 2,
    features: ['fast_service', 'team_orders'],
    avgDuration: 1,
    avgVendors: 10,
    description: 'Schnelle Verpflegung für Fans'
  }
};

const FESTIVAL_SIZES = {
  SMALL: {
    id: 'small',
    name: 'Klein',
    visitors: '< 5.000',
    setupFee: 500,
    features: ['basic'],
    support: 'email'
  },
  MEDIUM: {
    id: 'medium',
    name: 'Mittel',
    visitors: '5.000 - 25.000',
    setupFee: 1000,
    features: ['advanced'],
    support: 'priority'
  },
  LARGE: {
    id: 'large',
    name: 'Groß',
    visitors: '25.000 - 100.000',
    setupFee: 1500,
    features: ['premium'],
    support: 'dedicated'
  },
  MEGA: {
    id: 'mega',
    name: 'Mega',
    visitors: '> 100.000',
    setupFee: 2000,
    features: ['enterprise'],
    support: '24/7'
  }
};

const PREMIUM_FEATURES = {
  CASHLESS_WALLET: {
    id: 'cashless_wallet',
    name: 'Cashless Wallet',
    icon: Wallet,
    commission: 0.5,
    description: 'Bargeldloses Bezahlen mit Prepaid-Guthaben',
    benefits: ['Schnellere Transaktionen', 'Weniger Bargeld-Handling', 'Detaillierte Analytics']
  },
  SPONSOR_INTEGRATION: {
    id: 'sponsor_integration', 
    name: 'Sponsor Integration',
    icon: Award,
    revenueShare: 20,
    description: 'Sponsoren-Logos und Werbeflächen',
    benefits: ['Zusätzliche Einnahmen', 'Professionelles Branding', 'Sponsor Reports']
  },
  VIP_FAST_LANE: {
    id: 'vip_fast_lane',
    name: 'VIP Fast Lane',
    icon: Zap,
    feePerOrder: 1,
    description: 'Express-Service für VIP-Gäste',
    benefits: ['Keine Wartezeiten', 'Premium Experience', 'Höhere Margen']
  },
  ANALYTICS_PACKAGE: {
    id: 'analytics_package',
    name: 'Analytics Package',
    icon: BarChart3,
    fixedFee: 500,
    description: 'Detaillierte Datenanalyse nach dem Event',
    benefits: ['Besucherströme', 'Umsatzanalysen', 'Optimierungsvorschläge']
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const FestivalManager = ({ tenantId, userRole }) => {
  // State Management
  const [activeView, setActiveView] = useState('overview');
  const [selectedFestival, setSelectedFestival] = useState(null);
  const [showCreationWizard, setShowCreationWizard] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showQRModal, setShowQRModal] = useState(false);
  const [liveMode, setLiveMode] = useState(false);

  // Custom Hooks
  const { 
    festivals, 
    loading, 
    error, 
    createFestival, 
    updateFestival, 
    deleteFestival 
  } = useFestivalData(tenantId);
  
  const { 
    liveData, 
    subscribeToFestival, 
    unsubscribeFromFestival 
  } = useRealtimeAnalytics();
  
  const { 
    walletConfig, 
    updateWalletConfig, 
    processWalletTransaction 
  } = useWalletSystem();

  // Refs
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  // ============================================================================
  // LIFECYCLE & EFFECTS
  // ============================================================================
  useEffect(() => {
    if (selectedFestival && liveMode) {
      subscribeToFestival(selectedFestival.id);
      
      return () => {
        unsubscribeFromFestival(selectedFestival.id);
      };
    }
  }, [selectedFestival, liveMode]);

  useEffect(() => {
    // Initialize map for live view
    if (activeView === 'map' && mapContainerRef.current && !mapRef.current) {
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/dark-v10',
        center: [8.5417, 47.3769], // Zürich
        zoom: 12
      });

      // Add navigation controls
      mapRef.current.addControl(new mapboxgl.NavigationControl());
    }
  }, [activeView]);

  // ============================================================================
  // FESTIVAL MANAGEMENT FUNCTIONS
  // ============================================================================
  const handleCreateFestival = useCallback(async (festivalData) => {
    try {
      const festival = {
        ...festivalData,
        id: generateFestivalId(),
        createdAt: new Date().toISOString(),
        createdBy: tenantId,
        status: 'planning',
        vendors: [],
        revenue: {
          total: 0,
          eatechCommission: 0,
          festivalCommission: 0,
          vendorRevenue: 0
        },
        qrCodes: {
          main: null,
          vendors: {}
        }
      };

      await createFestival(festival);
      
      // Generate QR codes
      await generateFestivalQRCodes(festival);
      
      toast.success(`Festival "${festival.name}" erfolgreich erstellt!`);
      setShowCreationWizard(false);
      
      // Send confirmation email
      await sendFestivalConfirmation(festival);
      
    } catch (error) {
      console.error('Error creating festival:', error);
      toast.error('Fehler beim Erstellen des Festivals');
    }
  }, [createFestival, tenantId]);

  const handleAddVendor = useCallback(async (festivalId, vendorData) => {
    try {
      const vendorCode = generateVendorCode();
      const vendor = {
        ...vendorData,
        code: vendorCode,
        addedAt: new Date().toISOString(),
        status: 'invited',
        revenue: 0,
        orders: 0,
        qrCode: null
      };

      await updateFestival(festivalId, {
        vendors: [...(selectedFestival.vendors || []), vendor]
      });

      // Generate vendor-specific QR
      const qrCode = await generateVendorQR(festivalId, vendor);
      
      // Send invitation
      await sendVendorInvitation(vendor, selectedFestival);
      
      toast.success(`Vendor "${vendor.name}" hinzugefügt und eingeladen!`);
      
    } catch (error) {
      console.error('Error adding vendor:', error);
      toast.error('Fehler beim Hinzufügen des Vendors');
    }
  }, [selectedFestival, updateFestival]);

  const handleUpdateWalletConfig = useCallback(async (config) => {
    try {
      await updateWalletConfig(selectedFestival.id, config);
      toast.success('Wallet-Konfiguration aktualisiert!');
    } catch (error) {
      console.error('Error updating wallet config:', error);
      toast.error('Fehler beim Aktualisieren der Wallet-Konfiguration');
    }
  }, [selectedFestival, updateWalletConfig]);

  // ============================================================================
  // QR CODE GENERATION
  // ============================================================================
  const generateFestivalQRCodes = useCallback(async (festival) => {
    // Main festival QR
    const mainQR = {
      type: 'festival_main',
      festivalId: festival.id,
      url: `https://${festival.slug}.eatech.ch`,
      created: new Date().toISOString()
    };

    // Generate QR image
    const qrDataUrl = await generateQRDataUrl(mainQR);
    
    await updateFestival(festival.id, {
      'qrCodes.main': {
        ...mainQR,
        image: qrDataUrl
      }
    });
  }, [updateFestival]);

  const generateVendorCode = () => {
    const prefix = 'FST2025';
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${random}`;
  };

  // ============================================================================
  // ANALYTICS & CALCULATIONS
  // ============================================================================
  const festivalAnalytics = useMemo(() => {
    if (!festivals || festivals.length === 0) return null;

    const activeF

estivals = festivals.filter(f => f.status === 'active');
    const totalRevenue = festivals.reduce((sum, f) => sum + (f.revenue?.total || 0), 0);
    const totalCommission = festivals.reduce((sum, f) => sum + (f.revenue?.eatechCommission || 0), 0);
    
    const upcomingFestivals = festivals.filter(f => 
      new Date(f.startDate) > new Date() && f.status !== 'cancelled'
    );

    const festivalsByType = Object.keys(FESTIVAL_TYPES).map(type => ({
      type: FESTIVAL_TYPES[type].name,
      count: festivals.filter(f => f.type === type).length,
      revenue: festivals.filter(f => f.type === type)
        .reduce((sum, f) => sum + (f.revenue?.total || 0), 0)
    }));

    return {
      total: festivals.length,
      active: activeFestivals.length,
      upcoming: upcomingFestivals.length,
      totalRevenue,
      totalCommission,
      avgCommissionRate: totalRevenue > 0 ? (totalCommission / totalRevenue * 100).toFixed(2) : 0,
      festivalsByType,
      topFestivals: [...festivals]
        .sort((a, b) => (b.revenue?.total || 0) - (a.revenue?.total || 0))
        .slice(0, 5)
    };
  }, [festivals]);

  // ============================================================================
  // FILTERED DATA
  // ============================================================================
  const filteredFestivals = useMemo(() => {
    let filtered = [...(festivals || [])];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(f => 
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.vendors?.some(v => v.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(f => f.status === filterStatus);
    }

    // Sort by date
    filtered.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    return filtered;
  }, [festivals, searchTerm, filterStatus]);

  // ============================================================================
  // RENDER METHODS
  // ============================================================================
  const renderHeader = () => (
    <div className={styles.header}>
      <div className={styles.titleSection}>
        <div className={styles.titleIcon}>
          <Calendar />
        </div>
        <div>
          <h1>Festival Management</h1>
          <p className={styles.subtitle}>
            {festivalAnalytics?.total || 0} Festivals | 
            CHF {formatCurrency(festivalAnalytics?.totalRevenue || 0)} Umsatz | 
            {festivalAnalytics?.active || 0} Aktiv
          </p>
        </div>
      </div>

      <div className={styles.headerActions}>
        <button 
          className={styles.primaryButton}
          onClick={() => setShowCreationWizard(true)}
        >
          <Plus />
          Neues Festival
        </button>
        
        <button 
          className={styles.analyticsButton}
          onClick={() => setActiveView('analytics')}
        >
          <BarChart3 />
          Analytics
        </button>
        
        {selectedFestival && selectedFestival.status === 'active' && (
          <button 
            className={`${styles.liveButton} ${liveMode ? styles.active : ''}`}
            onClick={() => setLiveMode(!liveMode)}
          >
            <Radio className={liveMode ? styles.pulse : ''} />
            {liveMode ? 'Live' : 'Live Mode'}
          </button>
        )}
      </div>
    </div>
  );

  const renderViewToggle = () => (
    <div className={styles.viewToggle}>
      {['overview', 'list', 'calendar', 'map', 'analytics'].map(view => (
        <button
          key={view}
          className={`${styles.viewButton} ${activeView === view ? styles.active : ''}`}
          onClick={() => setActiveView(view)}
        >
          {view === 'overview' && <BarChart3 />}
          {view === 'list' && <Users />}
          {view === 'calendar' && <Calendar />}
          {view === 'map' && <MapPin />}
          {view === 'analytics' && <TrendingUp />}
          {view.charAt(0).toUpperCase() + view.slice(1)}
        </button>
      ))}
    </div>
  );

  const renderOverview = () => (
    <div className={styles.overviewGrid}>
      {/* KPI Cards */}
      <div className={styles.kpiSection}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: '#4ECDC4' }}>
            <Calendar />
          </div>
          <div className={styles.kpiContent}>
            <h3>{festivalAnalytics?.total || 0}</h3>
            <p>Gesamt Festivals</p>
            <span className={styles.kpiTrend}>
              <TrendingUp /> {festivalAnalytics?.upcoming || 0} bevorstehend
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: '#FF6B6B' }}>
            <DollarSign />
          </div>
          <div className={styles.kpiContent}>
            <h3>CHF {formatCurrency(festivalAnalytics?.totalRevenue || 0)}</h3>
            <p>Gesamt Umsatz</p>
            <span className={styles.kpiTrend}>
              <TrendingUp /> {festivalAnalytics?.avgCommissionRate || 0}% Durchschnitt
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: '#95E1D3' }}>
            <TrendingUp />
          </div>
          <div className={styles.kpiContent}>
            <h3>CHF {formatCurrency(festivalAnalytics?.totalCommission || 0)}</h3>
            <p>EATECH Einnahmen</p>
            <span className={styles.kpiInfo}>
              3% Basis + Festival Fees
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiIcon} style={{ background: '#F8B500' }}>
            <Truck />
          </div>
          <div className={styles.kpiContent}>
            <h3>{calculateTotalVendors()}</h3>
            <p>Teilnehmende Vendors</p>
            <span className={styles.kpiInfo}>
              Ø {calculateAvgVendorsPerFestival()} pro Festival
            </span>
          </div>
        </div>
      </div>

      {/* Festival Type Distribution */}
      <div className={styles.chartCard}>
        <h3>Festivals nach Typ</h3>
        <ResponsiveContainer width="100%" height={300}>
          <RePieChart>
            <Pie
              data={festivalAnalytics?.festivalsByType || []}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="count"
              label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
            >
              {festivalAnalytics?.festivalsByType.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </RePieChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue Timeline */}
      <div className={styles.chartCard}>
        <h3>Umsatzentwicklung</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={getRevenueTimeline()}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#8884d8" 
              fillOpacity={1} 
              fill="url(#colorRevenue)" 
            />
            <Area 
              type="monotone" 
              dataKey="commission" 
              stroke="#82ca9d" 
              fillOpacity={0.6} 
              fill="#82ca9d" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Top Festivals */}
      <div className={styles.topFestivalsCard}>
        <h3>Top Festivals nach Umsatz</h3>
        <div className={styles.festivalRanking}>
          {festivalAnalytics?.topFestivals.map((festival, index) => (
            <div key={festival.id} className={styles.rankingItem}>
              <div className={styles.rankNumber}>{index + 1}</div>
              <div className={styles.rankInfo}>
                <h4>{festival.name}</h4>
                <p>{festival.location} • {formatDate(festival.startDate)}</p>
              </div>
              <div className={styles.rankRevenue}>
                <strong>CHF {formatCurrency(festival.revenue?.total || 0)}</strong>
                <small>{festival.vendors?.length || 0} Vendors</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderFestivalList = () => (
    <div className={styles.listView}>
      {/* Search and Filters */}
      <div className={styles.listControls}>
        <div className={styles.searchBar}>
          <Search />
          <input
            type="text"
            placeholder="Suche nach Festival, Ort oder Vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className={styles.filterGroup}>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className={styles.statusFilter}
          >
            <option value="all">Alle Status</option>
            <option value="planning">In Planung</option>
            <option value="active">Aktiv</option>
            <option value="completed">Abgeschlossen</option>
            <option value="cancelled">Abgesagt</option>
          </select>
          
          <button className={styles.filterButton}>
            <Filter /> Weitere Filter
          </button>
        </div>
      </div>

      {/* Festival Cards */}
      <div className={styles.festivalGrid}>
        {filteredFestivals.map(festival => (
          <motion.div
            key={festival.id}
            className={styles.festivalCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setSelectedFestival(festival)}
          >
            <div className={styles.festivalHeader}>
              <div 
                className={styles.festivalType}
                style={{ background: FESTIVAL_TYPES[festival.type]?.color }}
              >
                {React.createElement(FESTIVAL_TYPES[festival.type]?.icon || Calendar, { size: 20 })}
              </div>
              <div className={styles.festivalStatus} data-status={festival.status}>
                {festival.status === 'active' && <Radio className={styles.liveIndicator} />}
                {getStatusLabel(festival.status)}
              </div>
            </div>

            <h3>{festival.name}</h3>
            <p className={styles.festivalLocation}>
              <MapPin size={14} /> {festival.location}
            </p>
            <p className={styles.festivalDate}>
              <Calendar size={14} /> {formatDate(festival.startDate)} - {formatDate(festival.endDate)}
            </p>

            <div className={styles.festivalStats}>
              <div className={styles.stat}>
                <Users size={16} />
                <span>{festival.expectedVisitors || 0}</span>
                <small>Besucher</small>
              </div>
              <div className={styles.stat}>
                <Truck size={16} />
                <span>{festival.vendors?.length || 0}</span>
                <small>Vendors</small>
              </div>
              <div className={styles.stat}>
                <DollarSign size={16} />
                <span>{formatCurrency(festival.revenue?.total || 0)}</span>
                <small>Umsatz</small>
              </div>
            </div>

            <div className={styles.festivalActions}>
              <button 
                className={styles.actionButton}
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewDetails(festival);
                }}
              >
                <Eye size={16} /> Details
              </button>
              <button 
                className={styles.actionButton}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowQRModal(festival);
                }}
              >
                <QrCode size={16} /> QR-Codes
              </button>
              <button 
                className={styles.actionButton}
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoreOptions(festival);
                }}
              >
                <MoreVertical size={16} />
              </button>
            </div>

            {/* Premium Features Badges */}
            {festival.premiumFeatures && festival.premiumFeatures.length > 0 && (
              <div className={styles.premiumBadges}>
                {festival.premiumFeatures.includes('cashless_wallet') && (
                  <div className={styles.badge} title="Cashless Wallet aktiv">
                    <Wallet size={12} />
                  </div>
                )}
                {festival.premiumFeatures.includes('vip_fast_lane') && (
                  <div className={styles.badge} title="VIP Fast Lane">
                    <Zap size={12} />
                  </div>
                )}
                {festival.premiumFeatures.includes('sponsor_integration') && (
                  <div className={styles.badge} title="Sponsoren integriert">
                    <Award size={12} />
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ))}

        {/* Empty State */}
        {filteredFestivals.length === 0 && (
          <div className={styles.emptyState}>
            <Calendar size={48} />
            <h3>Keine Festivals gefunden</h3>
            <p>Erstellen Sie Ihr erstes Festival oder ändern Sie Ihre Suchkriterien.</p>
            <button 
              className={styles.primaryButton}
              onClick={() => setShowCreationWizard(true)}
            >
              <Plus /> Festival erstellen
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderLiveMode = () => {
    if (!selectedFestival || !liveMode) return null;

    return (
      <LiveFestivalDashboard
        festival={selectedFestival}
        liveData={liveData}
        onUpdateVendor={handleUpdateVendor}
        onProcessPayment={processWalletTransaction}
        onEmergency={handleEmergency}
      />
    );
  };

  const renderMapView = () => (
    <div className={styles.mapView}>
      <div className={styles.mapContainer} ref={mapContainerRef} />
      
      {/* Map Overlay Controls */}
      <div className={styles.mapControls}>
        <div className={styles.mapSearch}>
          <Search />
          <input 
            type="text" 
            placeholder="Festival oder Stadt suchen..."
          />
        </div>
        
        <div className={styles.mapFilters}>
          <button className={styles.mapFilterButton}>
            <Calendar /> Zeitraum
          </button>
          <button className={styles.mapFilterButton}>
            <Users /> Festival-Typ
          </button>
          <button className={styles.mapFilterButton}>
            <DollarSign /> Umsatz
          </button>
        </div>
      </div>

      {/* Festival List Sidebar */}
      <div className={styles.mapSidebar}>
        <h3>Festivals in Ihrer Nähe</h3>
        {getNebyFestivals().map(festival => (
          <div 
            key={festival.id} 
            className={styles.mapFestivalItem}
            onClick={() => focusMapOnFestival(festival)}
          >
            <div className={styles.mapFestivalIcon}>
              {React.createElement(FESTIVAL_TYPES[festival.type]?.icon || Calendar)}
            </div>
            <div className={styles.mapFestivalInfo}>
              <h4>{festival.name}</h4>
              <p>{festival.location}</p>
              <small>{formatDate(festival.startDate)}</small>
            </div>
            <ChevronRight />
          </div>
        ))}
      </div>
    </div>
  );

  // Main Render
  return (
    <div className={styles.festivalManager}>
      {renderHeader()}
      {renderViewToggle()}
      
      <div className={styles.mainContent}>
        {activeView === 'overview' && renderOverview()}
        {activeView === 'list' && renderFestivalList()}
        {activeView === 'calendar' && <FestivalCalendar festivals={festivals} />}
        {activeView === 'map' && renderMapView()}
        {activeView === 'analytics' && (
          <RevenueAnalytics 
            festivals={festivals}
            onExport={handleExportAnalytics}
          />
        )}
        
        {liveMode && renderLiveMode()}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreationWizard && (
          <FestivalCreationWizard
            onClose={() => setShowCreationWizard(false)}
            onCreate={handleCreateFestival}
            festivalTypes={FESTIVAL_TYPES}
            festivalSizes={FESTIVAL_SIZES}
            premiumFeatures={PREMIUM_FEATURES}
          />
        )}
        
        {showQRModal && (
          <QRCodeGenerator
            festival={showQRModal}
            onClose={() => setShowQRModal(false)}
            onDownload={handleDownloadQR}
            onPrint={handlePrintQR}
          />
        )}
        
        {selectedFestival && !liveMode && (
          <FestivalDetailModal
            festival={selectedFestival}
            onClose={() => setSelectedFestival(null)}
            onUpdate={updateFestival}
            onAddVendor={handleAddVendor}
            onUpdateWallet={handleUpdateWalletConfig}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const generateFestivalId = () => {
  return `festival_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const getStatusLabel = (status) => {
  const labels = {
    planning: 'In Planung',
    active: 'Aktiv',
    completed: 'Abgeschlossen',
    cancelled: 'Abgesagt'
  };
  return labels[status] || status;
};

const calculateTotalVendors = () => {
  // Mock calculation - replace with real data
  return 234;
};

const calculateAvgVendorsPerFestival = () => {
  // Mock calculation - replace with real data
  return 18;
};

const getRevenueTimeline = () => {
  // Mock data - replace with real data
  return [
    { month: 'Jan', revenue: 45000, commission: 1350 },
    { month: 'Feb', revenue: 52000, commission: 1560 },
    { month: 'Mar', revenue: 78000, commission: 2340 },
    { month: 'Apr', revenue: 125000, commission: 3750 },
    { month: 'Mai', revenue: 234000, commission: 7020 },
    { month: 'Jun', revenue: 189000, commission: 5670 }
  ];
};

const getNearbyFestivals = () => {
  // Mock data - implement with real geolocation
  return [];
};

const CHART_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#D4A574', '#F39C12'];

// ============================================================================
// EXPORT
// ============================================================================
export default FestivalManager;