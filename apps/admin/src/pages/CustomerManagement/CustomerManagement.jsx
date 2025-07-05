/**
 * EATECH - Customer Management System
 * Version: 22.0.0
 * Description: Umfassendes CRM-System mit Kundenverwaltung, Bestellhistorie und Kommunikation
 * Features: Kundenprofile, Segmentierung, Loyalty, E-Mail/SMS, Export, Analytics
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/admin/src/pages/CustomerManagement/CustomerManagement.jsx
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, Filter, Download, Plus, UserPlus,
  Mail, Phone, MapPin, Calendar, ShoppingBag,
  DollarSign, TrendingUp, Award, Star, Heart,
  MessageSquare, Edit2, Trash2, MoreVertical,
  ChevronDown, ChevronUp, Eye, Send, Tag,
  Users, UserCheck, AlertCircle, Clock,
  CreditCard, Package, BarChart3, Gift,
  RefreshCw, Upload, Settings, History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useTenant } from '@eatech/core';
import CustomerModal from '../../components/Customers/CustomerModal';
import CustomerDetailModal from '../../components/Customers/CustomerDetailModal';
import EmailCampaignModal from '../../components/Customers/EmailCampaignModal';
import ImportCustomersModal from '../../components/Customers/ImportCustomersModal';
import LoyaltySettingsModal from '../../components/Customers/LoyaltySettingsModal';
import styles from './CustomerManagement.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const CUSTOMER_SEGMENTS = {
  VIP: { 
    label: 'VIP Kunde', 
    color: '#FFD700', 
    icon: Award, 
    criteria: { minSpent: 1000, minOrders: 20 }
  },
  REGULAR: { 
    label: 'Stammkunde', 
    color: '#4CAF50', 
    icon: UserCheck, 
    criteria: { minOrders: 10 }
  },
  OCCASIONAL: { 
    label: 'Gelegenheitskunde', 
    color: '#2196F3', 
    icon: Users, 
    criteria: { minOrders: 3 }
  },
  NEW: { 
    label: 'Neukunde', 
    color: '#9C27B0', 
    icon: UserPlus, 
    criteria: { maxOrders: 2 }
  },
  INACTIVE: { 
    label: 'Inaktiv', 
    color: '#9E9E9E', 
    icon: Clock, 
    criteria: { daysSinceLastOrder: 90 }
  }
};

const LOYALTY_TIERS = {
  BRONZE: { 
    name: 'Bronze', 
    points: 0, 
    discount: 0, 
    color: '#CD7F32',
    benefits: ['Newsletter', 'Geburtstags-Bonus']
  },
  SILVER: { 
    name: 'Silber', 
    points: 500, 
    discount: 5, 
    color: '#C0C0C0',
    benefits: ['5% Rabatt', 'Gratis Lieferung ab 30 CHF', 'Early Access']
  },
  GOLD: { 
    name: 'Gold', 
    points: 1000, 
    discount: 10, 
    color: '#FFD700',
    benefits: ['10% Rabatt', 'Gratis Lieferung', 'VIP Support', 'Exklusive Events']
  },
  PLATINUM: { 
    name: 'Platin', 
    points: 2000, 
    discount: 15, 
    color: '#E5E4E2',
    benefits: ['15% Rabatt', 'Priorität', 'Personal Account Manager', 'Geschenke']
  }
};

const COMMUNICATION_CHANNELS = {
  EMAIL: { label: 'E-Mail', icon: Mail },
  SMS: { label: 'SMS', icon: MessageSquare },
  PUSH: { label: 'Push', icon: Phone },
  WHATSAPP: { label: 'WhatsApp', icon: MessageSquare }
};

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'lastOrder', label: 'Letzte Bestellung' },
  { value: 'totalSpent', label: 'Umsatz' },
  { value: 'orderCount', label: 'Anzahl Bestellungen' },
  { value: 'loyaltyPoints', label: 'Treuepunkte' },
  { value: 'registeredAt', label: 'Registriert am' }
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const generateMockCustomers = () => {
  const firstNames = ['Max', 'Anna', 'Laura', 'Felix', 'Sophie', 'Luca', 'Emma', 'Noah', 'Mia', 'Leon'];
  const lastNames = ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker'];
  const domains = ['gmail.com', 'outlook.com', 'yahoo.com', 'swisscom.ch', 'bluewin.ch'];
  const streets = ['Bahnhofstrasse', 'Hauptstrasse', 'Kirchgasse', 'Dorfstrasse', 'Schulweg'];
  const cities = ['Zürich', 'Bern', 'Basel', 'Luzern', 'St. Gallen', 'Winterthur'];

  return Array.from({ length: 50 }, (_, i) => {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const orderCount = Math.floor(Math.random() * 50);
    const totalSpent = orderCount * (20 + Math.random() * 80);
    const loyaltyPoints = Math.floor(totalSpent);
    const lastOrderDays = Math.floor(Math.random() * 180);
    
    // Determine segment based on criteria
    let segment = 'NEW';
    if (totalSpent > 1000 && orderCount > 20) segment = 'VIP';
    else if (orderCount >= 10) segment = 'REGULAR';
    else if (orderCount >= 3) segment = 'OCCASIONAL';
    else if (lastOrderDays > 90) segment = 'INACTIVE';

    return {
      id: `customer-${i + 1}`,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domains[Math.floor(Math.random() * domains.length)]}`,
      phone: `+41 7${Math.floor(Math.random() * 9)}${Math.floor(Math.random() * 1000000).toString().padStart(7, '0')}`,
      address: {
        street: `${streets[Math.floor(Math.random() * streets.length)]} ${Math.floor(Math.random() * 100) + 1}`,
        zip: `${Math.floor(Math.random() * 9000) + 1000}`,
        city: cities[Math.floor(Math.random() * cities.length)]
      },
      registeredAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      lastOrderAt: new Date(Date.now() - lastOrderDays * 24 * 60 * 60 * 1000),
      orderCount,
      totalSpent,
      avgOrderValue: orderCount > 0 ? totalSpent / orderCount : 0,
      loyaltyPoints,
      loyaltyTier: Object.entries(LOYALTY_TIERS).reverse().find(([_, tier]) => loyaltyPoints >= tier.points)?.[0] || 'BRONZE',
      segment,
      tags: ['customer'],
      preferences: {
        language: 'de',
        marketing: Math.random() > 0.3,
        newsletter: Math.random() > 0.4,
        sms: Math.random() > 0.6
      },
      notes: '',
      active: lastOrderDays < 90
    };
  });
};

const convertToCSV = (customers) => {
  const headers = [
    'ID', 'Vorname', 'Nachname', 'E-Mail', 'Telefon',
    'Strasse', 'PLZ', 'Ort', 'Registriert', 'Letzte Bestellung',
    'Anzahl Bestellungen', 'Gesamtumsatz', 'Durchschnitt',
    'Treuepunkte', 'Treuestufe', 'Segment', 'Status'
  ];

  const rows = customers.map(customer => [
    customer.id,
    customer.firstName,
    customer.lastName,
    customer.email,
    customer.phone,
    customer.address.street,
    customer.address.zip,
    customer.address.city,
    new Date(customer.registeredAt).toLocaleDateString('de-CH'),
    new Date(customer.lastOrderAt).toLocaleDateString('de-CH'),
    customer.orderCount,
    customer.totalSpent.toFixed(2),
    customer.avgOrderValue.toFixed(2),
    customer.loyaltyPoints,
    LOYALTY_TIERS[customer.loyaltyTier].name,
    CUSTOMER_SEGMENTS[customer.segment].label,
    customer.active ? 'Aktiv' : 'Inaktiv'
  ]);

  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
  return csv;
};

const downloadCSV = (csv, filename) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const CustomerManagement = () => {
  const { tenantId } = useTenant();

  // State Management
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'lastOrder', direction: 'desc' });
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // list | grid
  
  // Modal States
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showLoyaltyModal, setShowLoyaltyModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);

  // ============================================================================
  // EFFECTS
  // ============================================================================
  useEffect(() => {
    loadCustomers();
  }, [tenantId]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockData = generateMockCustomers();
      setCustomers(mockData);
    } catch (error) {
      toast.error('Fehler beim Laden der Kundendaten');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // FILTERING & SORTING
  // ============================================================================
  const filteredCustomers = useMemo(() => {
    let filtered = [...customers];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(customer => 
        customer.firstName.toLowerCase().includes(search) ||
        customer.lastName.toLowerCase().includes(search) ||
        customer.email.toLowerCase().includes(search) ||
        customer.phone.includes(search)
      );
    }

    // Segment filter
    if (segmentFilter !== 'all') {
      filtered = filtered.filter(customer => customer.segment === segmentFilter);
    }

    // Sorting
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [customers, searchTerm, segmentFilter, sortConfig]);

  // ============================================================================
  // STATISTICS
  // ============================================================================
  const statistics = useMemo(() => {
    const stats = {
      totalCustomers: customers.length,
      activeCustomers: customers.filter(c => c.active).length,
      totalRevenue: customers.reduce((sum, c) => sum + c.totalSpent, 0),
      avgCustomerValue: 0,
      segments: {},
      newThisMonth: 0,
      churnRate: 0
    };

    stats.avgCustomerValue = stats.totalCustomers > 0 ? stats.totalRevenue / stats.totalCustomers : 0;
    stats.churnRate = stats.totalCustomers > 0 ? ((stats.totalCustomers - stats.activeCustomers) / stats.totalCustomers) * 100 : 0;

    // Count segments
    Object.keys(CUSTOMER_SEGMENTS).forEach(segment => {
      stats.segments[segment] = customers.filter(c => c.segment === segment).length;
    });

    // New customers this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    stats.newThisMonth = customers.filter(c => 
      new Date(c.registeredAt) >= thisMonth
    ).length;

    return stats;
  }, [customers]);

  // ============================================================================
  // HANDLERS
  // ============================================================================
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleSelectCustomer = (customerId) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map(customer => customer.id));
    }
  };

  const handleBulkAction = (action) => {
    if (selectedCustomers.length === 0) {
      toast.error('Bitte wählen Sie mindestens einen Kunden aus');
      return;
    }

    switch (action) {
      case 'email':
        setShowEmailModal(true);
        break;
      case 'export':
        const selectedData = customers.filter(c => selectedCustomers.includes(c.id));
        const csv = convertToCSV(selectedData);
        downloadCSV(csv, `kunden_export_${Date.now()}.csv`);
        toast.success(`${selectedCustomers.length} Kunden exportiert`);
        break;
      case 'delete':
        if (confirm(`Möchten Sie wirklich ${selectedCustomers.length} Kunden löschen?`)) {
          setCustomers(prev => prev.filter(c => !selectedCustomers.includes(c.id)));
          setSelectedCustomers([]);
          toast.success('Kunden gelöscht');
        }
        break;
      case 'tag':
        // Tag modal would go here
        toast.info('Tag-Funktion in Entwicklung');
        break;
    }
  };

  const handleSaveCustomer = async (customerData) => {
    try {
      if (editingCustomer) {
        // Update existing customer
        setCustomers(prev => prev.map(c => 
          c.id === editingCustomer.id ? { ...c, ...customerData } : c
        ));
        toast.success('Kunde aktualisiert');
      } else {
        // Create new customer
        const newCustomer = {
          ...customerData,
          id: `customer-${Date.now()}`,
          registeredAt: new Date(),
          lastOrderAt: new Date(),
          orderCount: 0,
          totalSpent: 0,
          avgOrderValue: 0,
          loyaltyPoints: 0,
          loyaltyTier: 'BRONZE',
          segment: 'NEW',
          active: true
        };
        setCustomers(prev => [...prev, newCustomer]);
        toast.success('Kunde erstellt');
      }
      setShowCustomerModal(false);
      setEditingCustomer(null);
    } catch (error) {
      toast.error('Fehler beim Speichern des Kunden');
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    if (confirm('Möchten Sie diesen Kunden wirklich löschen?')) {
      try {
        setCustomers(prev => prev.filter(c => c.id !== customerId));
        toast.success('Kunde gelöscht');
        setShowDetailModal(false);
      } catch (error) {
        toast.error('Fehler beim Löschen');
      }
    }
  };

  const handleImport = (importedCustomers) => {
    setCustomers(prev => [...prev, ...importedCustomers]);
    toast.success(`${importedCustomers.length} Kunden importiert`);
    setShowImportModal(false);
  };

  const calculateLoyaltyTier = (points) => {
    return Object.entries(LOYALTY_TIERS)
      .reverse()
      .find(([_, tier]) => points >= tier.points)?.[0] || 'BRONZE';
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  const renderCustomerCard = (customer) => {
    const segment = CUSTOMER_SEGMENTS[customer.segment];
    const tier = LOYALTY_TIERS[customer.loyaltyTier];
    const isSelected = selectedCustomers.includes(customer.id);

    return (
      <motion.div
        key={customer.id}
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`${styles.customerCard} ${isSelected ? styles.selected : ''}`}
        onClick={() => {
          setSelectedCustomer(customer);
          setShowDetailModal(true);
        }}
      >
        {/* Selection Checkbox */}
        <div className={styles.cardSelection}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              handleSelectCustomer(customer.id);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* Customer Avatar */}
        <div className={styles.customerAvatar}>
          <div className={styles.avatarCircle} style={{ backgroundColor: segment.color }}>
            {customer.firstName[0]}{customer.lastName[0]}
          </div>
          {customer.active && <div className={styles.activeIndicator} />}
        </div>

        {/* Customer Info */}
        <div className={styles.customerInfo}>
          <h3>{customer.firstName} {customer.lastName}</h3>
          <div className={styles.contactInfo}>
            <span><Mail size={14} /> {customer.email}</span>
            <span><Phone size={14} /> {customer.phone}</span>
          </div>
          
          {/* Segment & Tier */}
          <div className={styles.badges}>
            <span 
              className={styles.segmentBadge}
              style={{ backgroundColor: segment.color }}
            >
              <segment.icon size={12} />
              {segment.label}
            </span>
            
            <span 
              className={styles.tierBadge}
              style={{ backgroundColor: tier.color }}
            >
              <Award size={12} />
              {tier.name}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.customerStats}>
          <div className={styles.stat}>
            <ShoppingBag size={16} />
            <div>
              <strong>{customer.orderCount}</strong>
              <small>Bestellungen</small>
            </div>
          </div>
          
          <div className={styles.stat}>
            <DollarSign size={16} />
            <div>
              <strong>CHF {customer.totalSpent.toFixed(0)}</strong>
              <small>Umsatz</small>
            </div>
          </div>
          
          <div className={styles.stat}>
            <Star size={16} />
            <div>
              <strong>{customer.loyaltyPoints}</strong>
              <small>Punkte</small>
            </div>
          </div>
        </div>

        {/* Last Order */}
        <div className={styles.lastOrder}>
          <Clock size={14} />
          <span>
            Letzte Bestellung: {new Date(customer.lastOrderAt).toLocaleDateString('de-CH')}
          </span>
        </div>

        {/* Quick Actions */}
        <div className={styles.cardActions}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSelectCustomer(customer.id);
              setShowEmailModal(true);
            }}
            className={styles.actionButton}
            title="E-Mail senden"
          >
            <Mail size={16} />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingCustomer(customer);
              setShowCustomerModal(true);
            }}
            className={styles.actionButton}
            title="Bearbeiten"
          >
            <Edit2 size={16} />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              // More actions menu
            }}
            className={styles.actionButton}
            title="Weitere Aktionen"
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </motion.div>
    );
  };

  const renderListView = () => {
    return (
      <div className={styles.listView}>
        <table className={styles.customerTable}>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th onClick={() => handleSort('name')}>
                Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th>Kontakt</th>
              <th>Segment</th>
              <th onClick={() => handleSort('orderCount')}>
                Bestellungen {sortConfig.key === 'orderCount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('totalSpent')}>
                Umsatz {sortConfig.key === 'totalSpent' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('loyaltyPoints')}>
                Treue {sortConfig.key === 'loyaltyPoints' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('lastOrder')}>
                Letzte Best. {sortConfig.key === 'lastOrder' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map(customer => {
              const segment = CUSTOMER_SEGMENTS[customer.segment];
              const tier = LOYALTY_TIERS[customer.loyaltyTier];
              const isSelected = selectedCustomers.includes(customer.id);

              return (
                <tr 
                  key={customer.id} 
                  className={`${isSelected ? styles.selected : ''} ${!customer.active ? styles.inactive : ''}`}
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setShowDetailModal(true);
                  }}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectCustomer(customer.id)}
                    />
                  </td>
                  <td>
                    <div className={styles.nameCell}>
                      <div className={styles.avatarSmall} style={{ backgroundColor: segment.color }}>
                        {customer.firstName[0]}{customer.lastName[0]}
                      </div>
                      <div>
                        <strong>{customer.firstName} {customer.lastName}</strong>
                        {customer.active && <span className={styles.activeStatus}>●</span>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className={styles.contactCell}>
                      <div>{customer.email}</div>
                      <div className={styles.phone}>{customer.phone}</div>
                    </div>
                  </td>
                  <td>
                    <span 
                      className={styles.segmentPill}
                      style={{ backgroundColor: segment.color }}
                    >
                      <segment.icon size={12} />
                      {segment.label}
                    </span>
                  </td>
                  <td>{customer.orderCount}</td>
                  <td>CHF {customer.totalSpent.toFixed(2)}</td>
                  <td>
                    <div className={styles.loyaltyCell}>
                      <span 
                        className={styles.tierPill}
                        style={{ backgroundColor: tier.color }}
                      >
                        {tier.name}
                      </span>
                      <span className={styles.points}>{customer.loyaltyPoints} Pts</span>
                    </div>
                  </td>
                  <td>{new Date(customer.lastOrderAt).toLocaleDateString('de-CH')}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className={styles.tableActions}>
                      <button
                        onClick={() => {
                          setSelectedCustomers([customer.id]);
                          setShowEmailModal(true);
                        }}
                        className={styles.iconButton}
                      >
                        <Mail size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingCustomer(customer);
                          setShowCustomerModal(true);
                        }}
                        className={styles.iconButton}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button className={styles.iconButton}>
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}>
          <Users size={48} className={styles.spinnerIcon} />
        </div>
        <p>Lade Kundendaten...</p>
      </div>
    );
  }

  return (
    <div className={styles.customerManagement}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>Kundenverwaltung</h1>
          <div className={styles.headerStats}>
            <span>{statistics.totalCustomers} Kunden</span>
            <span className={styles.active}>{statistics.activeCustomers} aktiv</span>
            <span>CHF {statistics.totalRevenue.toFixed(0)} Gesamtumsatz</span>
          </div>
        </div>
        
        <div className={styles.headerActions}>
          <button 
            onClick={() => setShowLoyaltyModal(true)}
            className={styles.loyaltyButton}
          >
            <Award size={20} />
            <span>Treueprogramm</span>
          </button>
          
          <button 
            onClick={() => setShowImportModal(true)}
            className={styles.importButton}
          >
            <Upload size={20} />
            <span>Importieren</span>
          </button>
          
          <button 
            onClick={() => {
              setEditingCustomer(null);
              setShowCustomerModal(true);
            }}
            className={styles.addButton}
          >
            <UserPlus size={20} />
            <span>Kunde hinzufügen</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className={styles.statisticsGrid}>
        <motion.div 
          className={styles.statCard}
          whileHover={{ scale: 1.02 }}
        >
          <div className={styles.statIcon}>
            <Users size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>{statistics.totalCustomers}</h3>
            <p>Gesamtkunden</p>
          </div>
          <div className={styles.statTrend}>
            <TrendingUp size={16} />
            <span>+{statistics.newThisMonth} diese Woche</span>
          </div>
        </motion.div>

        <motion.div 
          className={styles.statCard}
          whileHover={{ scale: 1.02 }}
        >
          <div className={styles.statIcon}>
            <UserCheck size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>{statistics.activeCustomers}</h3>
            <p>Aktive Kunden</p>
          </div>
          <div className={styles.statTrend}>
            <span>{((statistics.activeCustomers / statistics.totalCustomers) * 100).toFixed(0)}% Aktivitätsrate</span>
          </div>
        </motion.div>

        <motion.div 
          className={styles.statCard}
          whileHover={{ scale: 1.02 }}
        >
          <div className={styles.statIcon}>
            <DollarSign size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>CHF {statistics.avgCustomerValue.toFixed(0)}</h3>
            <p>Ø Kundenwert</p>
          </div>
          <div className={styles.statTrend}>
            <TrendingUp size={16} />
            <span>+12% vs. Vormonat</span>
          </div>
        </motion.div>

        <motion.div 
          className={styles.statCard}
          whileHover={{ scale: 1.02 }}
        >
          <div className={styles.statIcon}>
            <AlertCircle size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>{statistics.churnRate.toFixed(0)}%</h3>
            <p>Abwanderungsrate</p>
          </div>
          <div className={styles.statTrend}>
            <span>{statistics.segments.INACTIVE || 0} inaktive Kunden</span>
          </div>
        </motion.div>
      </div>

      {/* Segment Overview */}
      <div className={styles.segmentOverview}>
        {Object.entries(CUSTOMER_SEGMENTS).map(([key, segment]) => (
          <motion.button
            key={key}
            className={`${styles.segmentCard} ${segmentFilter === key ? styles.active : ''}`}
            onClick={() => setSegmentFilter(segmentFilter === key ? 'all' : key)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div 
              className={styles.segmentIcon}
              style={{ backgroundColor: segment.color }}
            >
              <segment.icon size={20} />
            </div>
            <div className={styles.segmentInfo}>
              <h4>{segment.label}</h4>
              <p>{statistics.segments[key] || 0} Kunden</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          {/* Search */}
          <div className={styles.searchBox}>
            <Search size={20} />
            <input
              type="text"
              placeholder="Kunden suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Sort */}
          <select 
            className={styles.sortSelect}
            value={sortConfig.key}
            onChange={(e) => setSortConfig({ key: e.target.value, direction: 'desc' })}
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                Sortieren nach {option.label}
              </option>
            ))}
          </select>

          {/* View Mode */}
          <div className={styles.viewToggle}>
            <button
              className={viewMode === 'list' ? styles.active : ''}
              onClick={() => setViewMode('list')}
            >
              <BarChart3 size={20} />
            </button>
            <button
              className={viewMode === 'grid' ? styles.active : ''}
              onClick={() => setViewMode('grid')}
            >
              <Users size={20} />
            </button>
          </div>
        </div>

        <div className={styles.toolbarRight}>
          {/* Bulk Actions */}
          {selectedCustomers.length > 0 && (
            <div className={styles.bulkActions}>
              <span>{selectedCustomers.length} ausgewählt</span>
              
              <button 
                onClick={() => handleBulkAction('email')}
                className={styles.bulkButton}
              >
                <Mail size={16} />
                E-Mail
              </button>
              
              <button 
                onClick={() => handleBulkAction('export')}
                className={styles.bulkButton}
              >
                <Download size={16} />
                Export
              </button>
              
              <button 
                onClick={() => handleBulkAction('tag')}
                className={styles.bulkButton}
              >
                <Tag size={16} />
                Tag
              </button>
              
              <button 
                onClick={() => handleBulkAction('delete')}
                className={styles.bulkButton}
              >
                <Trash2 size={16} />
                Löschen
              </button>
              
              <button 
                onClick={() => setSelectedCustomers([])}
                className={styles.clearSelection}
              >
                Auswahl aufheben
              </button>
            </div>
          )}

          {/* Refresh */}
          <button onClick={loadCustomers} className={styles.refreshButton}>
            <RefreshCw size={20} />
          </button>

          {/* Export All */}
          <button 
            onClick={() => {
              const csv = convertToCSV(filteredCustomers);
              downloadCSV(csv, `alle_kunden_${Date.now()}.csv`);
              toast.success('Export erfolgreich');
            }}
            className={styles.exportButton}
          >
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {filteredCustomers.length === 0 ? (
          <div className={styles.emptyState}>
            <Users size={64} />
            <h3>Keine Kunden gefunden</h3>
            <p>Ändern Sie Ihre Suchkriterien oder fügen Sie neue Kunden hinzu.</p>
            <button 
              onClick={() => {
                setSearchTerm('');
                setSegmentFilter('all');
              }}
              className={styles.resetButton}
            >
              Filter zurücksetzen
            </button>
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className={styles.customerGrid}>
                <AnimatePresence>
                  {filteredCustomers.map(customer => renderCustomerCard(customer))}
                </AnimatePresence>
              </div>
            ) : (
              renderListView()
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showCustomerModal && (
        <CustomerModal
          customer={editingCustomer}
          onSave={handleSaveCustomer}
          onClose={() => {
            setShowCustomerModal(false);
            setEditingCustomer(null);
          }}
        />
      )}

      {showDetailModal && selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          onEdit={(customer) => {
            setEditingCustomer(customer);
            setShowCustomerModal(true);
            setShowDetailModal(false);
          }}
          onDelete={() => handleDeleteCustomer(selectedCustomer.id)}
          onEmail={() => {
            setSelectedCustomers([selectedCustomer.id]);
            setShowEmailModal(true);
          }}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedCustomer(null);
          }}
        />
      )}

      {showEmailModal && (
        <EmailCampaignModal
          customers={customers.filter(c => selectedCustomers.includes(c.id))}
          onSend={(campaign) => {
            // Send email campaign
            toast.success(`E-Mail an ${selectedCustomers.length} Kunden gesendet`);
            setShowEmailModal(false);
            setSelectedCustomers([]);
          }}
          onClose={() => setShowEmailModal(false)}
        />
      )}

      {showImportModal && (
        <ImportCustomersModal
          onImport={handleImport}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {showLoyaltyModal && (
        <LoyaltySettingsModal
          tiers={LOYALTY_TIERS}
          onSave={(settings) => {
            // Save loyalty settings
            toast.success('Treueprogramm-Einstellungen gespeichert');
            setShowLoyaltyModal(false);
          }}
          onClose={() => setShowLoyaltyModal(false)}
        />
      )}
    </div>
  );
};

export default CustomerManagement;