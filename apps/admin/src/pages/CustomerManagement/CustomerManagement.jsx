/**
 * EATECH - Customer Management System
 * Version: 20.0.0
 * Description: Umfassendes CRM-System mit Kundenverwaltung, Bestellhistorie und Analysen
 * Features: Kundenprofile, Bestellhistorie, Kommunikation, Segmentierung, Export
 * File Path: /src/pages/CustomerManagement/CustomerManagement.jsx
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, Filter, Download, Plus, UserPlus,
  Mail, Phone, MapPin, Calendar, ShoppingBag,
  DollarSign, TrendingUp, Award, Star, Heart,
  MessageSquare, Edit2, Trash2, MoreVertical,
  ChevronDown, ChevronUp, Eye, Send, Tag,
  Users, UserCheck, AlertCircle, Clock,
  CreditCard, Package, BarChart, PieChart
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import styles from './CustomerManagement.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const CUSTOMER_SEGMENTS = {
  VIP: { label: 'VIP Kunde', color: '#FFD700', icon: Award, minSpent: 1000 },
  REGULAR: { label: 'Stammkunde', color: '#4CAF50', icon: UserCheck, minOrders: 10 },
  OCCASIONAL: { label: 'Gelegenheitskunde', color: '#2196F3', icon: Users, minOrders: 3 },
  NEW: { label: 'Neukunde', color: '#9C27B0', icon: UserPlus, minOrders: 0 }
};

const LOYALTY_TIERS = {
  BRONZE: { name: 'Bronze', points: 0, discount: 0, color: '#CD7F32' },
  SILVER: { name: 'Silber', points: 500, discount: 5, color: '#C0C0C0' },
  GOLD: { name: 'Gold', points: 1000, discount: 10, color: '#FFD700' },
  PLATINUM: { name: 'Platin', points: 2000, discount: 15, color: '#E5E4E2' }
};

const COMMUNICATION_CHANNELS = {
  EMAIL: { label: 'E-Mail', icon: Mail },
  SMS: { label: 'SMS', icon: MessageSquare },
  PUSH: { label: 'Push', icon: Phone },
  WHATSAPP: { label: 'WhatsApp', icon: MessageSquare }
};

// Mock Data Generator
const generateMockCustomers = () => {
  const firstNames = ['Max', 'Anna', 'Laura', 'Felix', 'Sophie', 'Luca', 'Emma', 'Noah', 'Mia', 'Leon'];
  const lastNames = ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann'];
  const domains = ['gmail.com', 'outlook.com', 'yahoo.com', 'swisscom.ch', 'bluewin.ch'];
  const streets = ['Bahnhofstrasse', 'Hauptstrasse', 'Kirchgasse', 'Dorfstrasse', 'Schulweg'];
  const cities = ['Zürich', 'Bern', 'Basel', 'Luzern', 'St. Gallen', 'Winterthur', 'Thun', 'Chur'];
  
  return Array.from({ length: 150 }, (_, i) => {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const totalOrders = Math.floor(Math.random() * 50);
    const totalSpent = totalOrders * (20 + Math.random() * 80);
    const loyaltyPoints = Math.floor(totalSpent * 10);
    
    return {
      id: `CUS${String(i + 1).padStart(6, '0')}`,
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domains[Math.random() * domains.length | 0]}`,
      phone: `+41 ${Math.floor(Math.random() * 9) + 1}${Math.floor(Math.random() * 9)}${Math.floor(Math.random() * 1000000).toString().padStart(7, '0')}`,
      address: {
        street: `${streets[Math.random() * streets.length | 0]} ${Math.floor(Math.random() * 200) + 1}`,
        zip: `${Math.floor(Math.random() * 9000) + 1000}`,
        city: cities[Math.random() * cities.length | 0]
      },
      registeredAt: new Date(2020 + Math.floor(Math.random() * 5), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)),
      lastOrderDate: new Date(2024, 11, Math.floor(Math.random() * 31) + 1),
      totalOrders,
      totalSpent,
      averageOrderValue: totalOrders > 0 ? totalSpent / totalOrders : 0,
      loyaltyPoints,
      loyaltyTier: Object.entries(LOYALTY_TIERS).reverse().find(([_, tier]) => loyaltyPoints >= tier.points)?.[0] || 'BRONZE',
      segment: totalSpent >= 1000 ? 'VIP' : totalOrders >= 10 ? 'REGULAR' : totalOrders >= 3 ? 'OCCASIONAL' : 'NEW',
      favoriteItems: ['Margherita Pizza', 'Cheeseburger', 'Caesar Salad'].slice(0, Math.floor(Math.random() * 3) + 1),
      tags: ['Vegetarisch', 'Glutenfrei', 'Stammkunde', 'App-Nutzer', 'Newsletter'].slice(0, Math.floor(Math.random() * 3)),
      communicationPreferences: {
        email: Math.random() > 0.3,
        sms: Math.random() > 0.5,
        push: Math.random() > 0.4,
        whatsapp: Math.random() > 0.6
      },
      notes: Math.random() > 0.7 ? 'Bevorzugt extra Käse auf der Pizza' : null,
      active: Math.random() > 0.1
    };
  });
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const CustomerManagement = () => {
  // State Management
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('ALL');
  const [sortConfig, setSortConfig] = useState({ key: 'lastOrderDate', direction: 'desc' });
  const [viewMode, setViewMode] = useState('table'); // table | cards
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview | orders | communication | notes

  // Load Customers
  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockCustomers = generateMockCustomers();
      setCustomers(mockCustomers);
    } catch (error) {
      toast.error('Fehler beim Laden der Kundendaten');
    } finally {
      setLoading(false);
    }
  };

  // Filter & Sort Customers
  const filteredCustomers = useMemo(() => {
    let filtered = [...customers];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(customer => 
        customer.firstName.toLowerCase().includes(term) ||
        customer.lastName.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term) ||
        customer.phone.includes(term) ||
        customer.id.toLowerCase().includes(term)
      );
    }

    // Segment filter
    if (segmentFilter !== 'ALL') {
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

  // Statistics
  const statistics = useMemo(() => {
    const stats = {
      totalCustomers: filteredCustomers.length,
      activeCustomers: filteredCustomers.filter(c => c.active).length,
      totalRevenue: filteredCustomers.reduce((sum, c) => sum + c.totalSpent, 0),
      avgCustomerValue: 0,
      segments: {},
      newThisMonth: 0
    };

    stats.avgCustomerValue = stats.totalCustomers > 0 ? stats.totalRevenue / stats.totalCustomers : 0;

    // Count segments
    Object.keys(CUSTOMER_SEGMENTS).forEach(segment => {
      stats.segments[segment] = filteredCustomers.filter(c => c.segment === segment).length;
    });

    // New customers this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    stats.newThisMonth = filteredCustomers.filter(c => 
      new Date(c.registeredAt) >= thisMonth
    ).length;

    return stats;
  }, [filteredCustomers]);

  // Handlers
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

  const handleDeleteCustomer = async (customerId) => {
    if (window.confirm('Möchten Sie diesen Kunden wirklich löschen?')) {
      try {
        setCustomers(prev => prev.filter(c => c.id !== customerId));
        toast.success('Kunde erfolgreich gelöscht');
        setShowCustomerModal(false);
      } catch (error) {
        toast.error('Fehler beim Löschen des Kunden');
      }
    }
  };

  const handleExport = () => {
    const csv = convertToCSV(filteredCustomers);
    downloadCSV(csv, `kunden_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Export erfolgreich');
  };

  const handleSendEmail = (customers) => {
    setSelectedCustomers(Array.isArray(customers) ? customers : [customers]);
    setShowEmailModal(true);
  };

  const calculateLoyaltyTier = (points) => {
    return Object.entries(LOYALTY_TIERS)
      .reverse()
      .find(([_, tier]) => points >= tier.points)?.[0] || 'BRONZE';
  };

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  const renderStatistics = () => (
    <div className={styles.statistics}>
      <div className={styles.statCard}>
        <Users className={styles.statIcon} />
        <div className={styles.statContent}>
          <h3>{statistics.totalCustomers}</h3>
          <p>Gesamtkunden</p>
        </div>
      </div>
      
      <div className={styles.statCard}>
        <UserCheck className={styles.statIcon} />
        <div className={styles.statContent}>
          <h3>{statistics.activeCustomers}</h3>
          <p>Aktive Kunden</p>
        </div>
      </div>
      
      <div className={styles.statCard}>
        <DollarSign className={styles.statIcon} />
        <div className={styles.statContent}>
          <h3>CHF {statistics.totalRevenue.toFixed(0)}</h3>
          <p>Gesamtumsatz</p>
        </div>
      </div>
      
      <div className={styles.statCard}>
        <TrendingUp className={styles.statIcon} />
        <div className={styles.statContent}>
          <h3>CHF {statistics.avgCustomerValue.toFixed(2)}</h3>
          <p>Ø Kundenwert</p>
        </div>
      </div>
      
      <div className={styles.statCard}>
        <Award className={styles.statIcon} />
        <div className={styles.statContent}>
          <h3>{statistics.segments.VIP || 0}</h3>
          <p>VIP Kunden</p>
        </div>
      </div>
      
      <div className={styles.statCard}>
        <UserPlus className={styles.statIcon} />
        <div className={styles.statContent}>
          <h3>{statistics.newThisMonth}</h3>
          <p>Neu diesen Monat</p>
        </div>
      </div>
    </div>
  );

  const renderFilters = () => (
    <div className={`${styles.filters} ${showFilters ? styles.show : ''}`}>
      <div className={styles.filterGroup}>
        <label>Kundensegment</label>
        <select 
          value={segmentFilter} 
          onChange={(e) => setSegmentFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="ALL">Alle Segmente</option>
          {Object.entries(CUSTOMER_SEGMENTS).map(([key, value]) => (
            <option key={key} value={key}>{value.label}</option>
          ))}
        </select>
      </div>
      
      <div className={styles.filterGroup}>
        <label>Loyalitätsstufe</label>
        <select className={styles.filterSelect}>
          <option value="ALL">Alle Stufen</option>
          {Object.entries(LOYALTY_TIERS).map(([key, value]) => (
            <option key={key} value={key}>{value.name}</option>
          ))}
        </select>
      </div>
      
      <div className={styles.filterGroup}>
        <label>Status</label>
        <select className={styles.filterSelect}>
          <option value="ALL">Alle</option>
          <option value="ACTIVE">Aktiv</option>
          <option value="INACTIVE">Inaktiv</option>
        </select>
      </div>
      
      <div className={styles.filterGroup}>
        <label>Tags</label>
        <select className={styles.filterSelect}>
          <option value="ALL">Alle Tags</option>
          <option value="vegetarian">Vegetarisch</option>
          <option value="glutenfree">Glutenfrei</option>
          <option value="app">App-Nutzer</option>
          <option value="newsletter">Newsletter</option>
        </select>
      </div>
    </div>
  );

  const renderTableView = () => (
    <div className={styles.tableContainer}>
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
            <th onClick={() => handleSort('id')}>
              Kunden-Nr. {sortConfig.key === 'id' && (
                sortConfig.direction === 'asc' ? <ChevronUp /> : <ChevronDown />
              )}
            </th>
            <th>Name</th>
            <th>Kontakt</th>
            <th onClick={() => handleSort('totalOrders')}>
              Bestellungen {sortConfig.key === 'totalOrders' && (
                sortConfig.direction === 'asc' ? <ChevronUp /> : <ChevronDown />
              )}
            </th>
            <th onClick={() => handleSort('totalSpent')}>
              Umsatz {sortConfig.key === 'totalSpent' && (
                sortConfig.direction === 'asc' ? <ChevronUp /> : <ChevronDown />
              )}
            </th>
            <th>Segment</th>
            <th>Loyalität</th>
            <th onClick={() => handleSort('lastOrderDate')}>
              Letzte Bestellung {sortConfig.key === 'lastOrderDate' && (
                sortConfig.direction === 'asc' ? <ChevronUp /> : <ChevronDown />
              )}
            </th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          {filteredCustomers.map(customer => (
            <tr key={customer.id} className={selectedCustomers.includes(customer.id) ? styles.selected : ''}>
              <td>
                <input 
                  type="checkbox" 
                  checked={selectedCustomers.includes(customer.id)}
                  onChange={() => handleSelectCustomer(customer.id)}
                />
              </td>
              <td className={styles.customerId}>#{customer.id}</td>
              <td>
                <div className={styles.customerName}>
                  <div className={styles.avatar}>
                    {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
                  </div>
                  <div>
                    <div>{customer.firstName} {customer.lastName}</div>
                    {customer.tags.length > 0 && (
                      <div className={styles.tags}>
                        {customer.tags.slice(0, 2).map((tag, i) => (
                          <span key={i} className={styles.tag}>{tag}</span>
                        ))}
                        {customer.tags.length > 2 && (
                          <span className={styles.moreTag}>+{customer.tags.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td>
                <div className={styles.contactInfo}>
                  <div><Mail size={12} /> {customer.email}</div>
                  <div><Phone size={12} /> {customer.phone}</div>
                </div>
              </td>
              <td className={styles.orderCount}>{customer.totalOrders}</td>
              <td className={styles.revenue}>CHF {customer.totalSpent.toFixed(2)}</td>
              <td>
                <span 
                  className={styles.segmentBadge}
                  style={{ backgroundColor: CUSTOMER_SEGMENTS[customer.segment].color }}
                >
                  {React.createElement(CUSTOMER_SEGMENTS[customer.segment].icon, { size: 14 })}
                  {CUSTOMER_SEGMENTS[customer.segment].label}
                </span>
              </td>
              <td>
                <div 
                  className={styles.loyaltyBadge}
                  style={{ backgroundColor: LOYALTY_TIERS[customer.loyaltyTier].color }}
                >
                  <Star size={14} />
                  {LOYALTY_TIERS[customer.loyaltyTier].name}
                </div>
              </td>
              <td>{new Date(customer.lastOrderDate).toLocaleDateString('de-CH')}</td>
              <td>
                <div className={styles.actions}>
                  <button 
                    className={styles.actionButton}
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setShowCustomerModal(true);
                    }}
                    title="Details anzeigen"
                  >
                    <Eye size={16} />
                  </button>
                  <button 
                    className={styles.actionButton}
                    onClick={() => handleSendEmail(customer.id)}
                    title="E-Mail senden"
                  >
                    <Mail size={16} />
                  </button>
                  <div className={styles.dropdown}>
                    <button className={styles.actionButton}>
                      <MoreVertical size={16} />
                    </button>
                    <div className={styles.dropdownContent}>
                      <button onClick={() => {}}>
                        <Edit2 size={16} /> Bearbeiten
                      </button>
                      <button onClick={() => {}}>
                        <MessageSquare size={16} /> SMS senden
                      </button>
                      <button onClick={() => {}}>
                        <Award size={16} /> Punkte hinzufügen
                      </button>
                      <button onClick={() => handleDeleteCustomer(customer.id)} className={styles.danger}>
                        <Trash2 size={16} /> Löschen
                      </button>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderCardView = () => (
    <div className={styles.cardGrid}>
      {filteredCustomers.map(customer => (
        <div key={customer.id} className={styles.customerCard}>
          <div className={styles.cardHeader}>
            <div className={styles.cardAvatar}>
              {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
            </div>
            <div className={styles.cardTitle}>
              <h3>{customer.firstName} {customer.lastName}</h3>
              <p>#{customer.id}</p>
            </div>
            <div 
              className={styles.segmentBadge}
              style={{ backgroundColor: CUSTOMER_SEGMENTS[customer.segment].color }}
            >
              {React.createElement(CUSTOMER_SEGMENTS[customer.segment].icon, { size: 14 })}
            </div>
          </div>
          
          <div className={styles.cardBody}>
            <div className={styles.contactSection}>
              <p><Mail size={14} /> {customer.email}</p>
              <p><Phone size={14} /> {customer.phone}</p>
              <p><MapPin size={14} /> {customer.address.city}</p>
            </div>
            
            <div className={styles.statsGrid}>
              <div className={styles.miniStat}>
                <ShoppingBag size={16} />
                <div>
                  <strong>{customer.totalOrders}</strong>
                  <span>Bestellungen</span>
                </div>
              </div>
              <div className={styles.miniStat}>
                <DollarSign size={16} />
                <div>
                  <strong>CHF {customer.totalSpent.toFixed(0)}</strong>
                  <span>Umsatz</span>
                </div>
              </div>
            </div>
            
            <div className={styles.loyaltySection}>
              <div 
                className={styles.loyaltyBadge}
                style={{ backgroundColor: LOYALTY_TIERS[customer.loyaltyTier].color }}
              >
                <Star size={14} />
                {LOYALTY_TIERS[customer.loyaltyTier].name}
              </div>
              <span className={styles.points}>{customer.loyaltyPoints} Punkte</span>
            </div>
            
            {customer.tags.length > 0 && (
              <div className={styles.tagsList}>
                {customer.tags.map((tag, i) => (
                  <span key={i} className={styles.tag}>{tag}</span>
                ))}
              </div>
            )}
          </div>
          
          <div className={styles.cardFooter}>
            <button onClick={() => {
              setSelectedCustomer(customer);
              setShowCustomerModal(true);
            }}>
              Details
            </button>
            <button onClick={() => handleSendEmail(customer.id)}>
              Kontaktieren
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderCustomerModal = () => {
    if (!selectedCustomer) return null;

    return (
      <div className={styles.modal} onClick={() => setShowCustomerModal(false)}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <div className={styles.modalTitle}>
              <div className={styles.modalAvatar}>
                {selectedCustomer.firstName.charAt(0)}{selectedCustomer.lastName.charAt(0)}
              </div>
              <div>
                <h2>{selectedCustomer.firstName} {selectedCustomer.lastName}</h2>
                <p>Kunde seit {new Date(selectedCustomer.registeredAt).toLocaleDateString('de-CH')}</p>
              </div>
            </div>
            <button onClick={() => setShowCustomerModal(false)}>×</button>
          </div>
          
          <div className={styles.modalTabs}>
            <button 
              className={activeTab === 'overview' ? styles.active : ''}
              onClick={() => setActiveTab('overview')}
            >
              Übersicht
            </button>
            <button 
              className={activeTab === 'orders' ? styles.active : ''}
              onClick={() => setActiveTab('orders')}
            >
              Bestellungen
            </button>
            <button 
              className={activeTab === 'communication' ? styles.active : ''}
              onClick={() => setActiveTab('communication')}
            >
              Kommunikation
            </button>
            <button 
              className={activeTab === 'notes' ? styles.active : ''}
              onClick={() => setActiveTab('notes')}
            >
              Notizen
            </button>
          </div>
          
          <div className={styles.modalBody}>
            {activeTab === 'overview' && (
              <>
                <div className={styles.section}>
                  <h3>Kontaktinformationen</h3>
                  <div className={styles.infoGrid}>
                    <div>
                      <label>E-Mail:</label>
                      <p>{selectedCustomer.email}</p>
                    </div>
                    <div>
                      <label>Telefon:</label>
                      <p>{selectedCustomer.phone}</p>
                    </div>
                    <div>
                      <label>Adresse:</label>
                      <p>
                        {selectedCustomer.address.street}<br />
                        {selectedCustomer.address.zip} {selectedCustomer.address.city}
                      </p>
                    </div>
                    <div>
                      <label>Kunden-ID:</label>
                      <p>#{selectedCustomer.id}</p>
                    </div>
                  </div>
                </div>
                
                <div className={styles.section}>
                  <h3>Kundenstatistiken</h3>
                  <div className={styles.statsCards}>
                    <div className={styles.statItem}>
                      <ShoppingBag size={24} />
                      <div>
                        <h4>{selectedCustomer.totalOrders}</h4>
                        <p>Bestellungen</p>
                      </div>
                    </div>
                    <div className={styles.statItem}>
                      <DollarSign size={24} />
                      <div>
                        <h4>CHF {selectedCustomer.totalSpent.toFixed(2)}</h4>
                        <p>Gesamtumsatz</p>
                      </div>
                    </div>
                    <div className={styles.statItem}>
                      <TrendingUp size={24} />
                      <div>
                        <h4>CHF {selectedCustomer.averageOrderValue.toFixed(2)}</h4>
                        <p>Ø Bestellwert</p>
                      </div>
                    </div>
                    <div className={styles.statItem}>
                      <Calendar size={24} />
                      <div>
                        <h4>{new Date(selectedCustomer.lastOrderDate).toLocaleDateString('de-CH')}</h4>
                        <p>Letzte Bestellung</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className={styles.section}>
                  <h3>Loyalitätsprogramm</h3>
                  <div className={styles.loyaltyInfo}>
                    <div className={styles.loyaltyHeader}>
                      <div 
                        className={styles.loyaltyTier}
                        style={{ backgroundColor: LOYALTY_TIERS[selectedCustomer.loyaltyTier].color }}
                      >
                        <Star size={20} />
                        {LOYALTY_TIERS[selectedCustomer.loyaltyTier].name}
                      </div>
                      <div className={styles.loyaltyPoints}>
                        <strong>{selectedCustomer.loyaltyPoints}</strong> Punkte
                      </div>
                    </div>
                    <div className={styles.loyaltyProgress}>
                      <div className={styles.progressBar}>
                        <div 
                          className={styles.progressFill}
                          style={{ 
                            width: `${(selectedCustomer.loyaltyPoints % 500) / 5}%`,
                            backgroundColor: LOYALTY_TIERS[selectedCustomer.loyaltyTier].color
                          }}
                        />
                      </div>
                      <p>
                        {500 - (selectedCustomer.loyaltyPoints % 500)} Punkte bis {
                          Object.entries(LOYALTY_TIERS).find(([_, tier]) => 
                            tier.points > selectedCustomer.loyaltyPoints
                          )?.[1].name || 'Maximum'
                        }
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className={styles.section}>
                  <h3>Präferenzen</h3>
                  <div className={styles.preferences}>
                    <div>
                      <label>Lieblingsgerichte:</label>
                      <div className={styles.favoriteItems}>
                        {selectedCustomer.favoriteItems.map((item, i) => (
                          <span key={i} className={styles.favoriteItem}>
                            <Heart size={14} /> {item}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label>Kommunikationskanäle:</label>
                      <div className={styles.channels}>
                        {Object.entries(selectedCustomer.communicationPreferences).map(([channel, enabled]) => (
                          <div key={channel} className={`${styles.channel} ${enabled ? styles.enabled : ''}`}>
                            {React.createElement(COMMUNICATION_CHANNELS[channel.toUpperCase()].icon, { size: 16 })}
                            {COMMUNICATION_CHANNELS[channel.toUpperCase()].label}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {activeTab === 'orders' && (
              <div className={styles.ordersTab}>
                <div className={styles.ordersList}>
                  <p className={styles.placeholder}>Bestellhistorie wird geladen...</p>
                  {/* Hier würde die tatsächliche Bestellhistorie angezeigt */}
                </div>
              </div>
            )}
            
            {activeTab === 'communication' && (
              <div className={styles.communicationTab}>
                <div className={styles.communicationList}>
                  <p className={styles.placeholder}>Kommunikationsverlauf wird geladen...</p>
                  {/* Hier würde der Kommunikationsverlauf angezeigt */}
                </div>
              </div>
            )}
            
            {activeTab === 'notes' && (
              <div className={styles.notesTab}>
                <div className={styles.notesList}>
                  {selectedCustomer.notes && (
                    <div className={styles.note}>
                      <p>{selectedCustomer.notes}</p>
                      <span>{new Date().toLocaleDateString('de-CH')}</span>
                    </div>
                  )}
                  <textarea 
                    placeholder="Neue Notiz hinzufügen..."
                    className={styles.noteInput}
                  />
                  <button className={styles.addNoteButton}>
                    <Plus size={16} /> Notiz speichern
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className={styles.modalFooter}>
            <button className={styles.editButton}>
              <Edit2 size={16} /> Bearbeiten
            </button>
            <button 
              className={styles.emailButton}
              onClick={() => handleSendEmail(selectedCustomer.id)}
            >
              <Mail size={16} /> E-Mail senden
            </button>
            <button 
              className={styles.deleteButton}
              onClick={() => handleDeleteCustomer(selectedCustomer.id)}
            >
              <Trash2 size={16} /> Löschen
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderEmailModal = () => (
    <div className={styles.modal} onClick={() => setShowEmailModal(false)}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>E-Mail senden</h2>
          <button onClick={() => setShowEmailModal(false)}>×</button>
        </div>
        
        <div className={styles.modalBody}>
          <div className={styles.emailForm}>
            <div className={styles.formGroup}>
              <label>Empfänger:</label>
              <p>{selectedCustomers.length} Kunde(n) ausgewählt</p>
            </div>
            
            <div className={styles.formGroup}>
              <label>Vorlage:</label>
              <select className={styles.formSelect}>
                <option>Keine Vorlage</option>
                <option>Willkommens-E-Mail</option>
                <option>Geburtstagsgrüße</option>
                <option>Sonderangebot</option>
                <option>Feedback-Anfrage</option>
              </select>
            </div>
            
            <div className={styles.formGroup}>
              <label>Betreff:</label>
              <input 
                type="text" 
                className={styles.formInput}
                placeholder="E-Mail Betreff eingeben..."
              />
            </div>
            
            <div className={styles.formGroup}>
              <label>Nachricht:</label>
              <textarea 
                className={styles.formTextarea}
                rows="10"
                placeholder="Nachricht eingeben..."
              />
            </div>
          </div>
        </div>
        
        <div className={styles.modalFooter}>
          <button 
            className={styles.cancelButton}
            onClick={() => setShowEmailModal(false)}
          >
            Abbrechen
          </button>
          <button 
            className={styles.sendButton}
            onClick={() => {
              toast.success('E-Mail erfolgreich gesendet');
              setShowEmailModal(false);
            }}
          >
            <Send size={16} /> E-Mail senden
          </button>
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
        <Users className={styles.spinner} />
        <p>Lade Kundendaten...</p>
      </div>
    );
  }

  return (
    <div className={styles.customerManagement}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>Kundenverwaltung</h1>
          <button 
            className={styles.addButton}
            onClick={() => setShowAddModal(true)}
          >
            <UserPlus size={16} /> Neuer Kunde
          </button>
        </div>
        
        <div className={styles.headerActions}>
          <div className={styles.searchBar}>
            <Search size={20} />
            <input
              type="text"
              placeholder="Suche nach Name, E-Mail, Telefon..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button 
            className={styles.filterButton}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} /> Filter {showFilters && '✕'}
          </button>
          
          <div className={styles.viewToggle}>
            <button 
              className={viewMode === 'table' ? styles.active : ''}
              onClick={() => setViewMode('table')}
              title="Tabellenansicht"
            >
              <BarChart size={16} />
            </button>
            <button 
              className={viewMode === 'cards' ? styles.active : ''}
              onClick={() => setViewMode('cards')}
              title="Kartenansicht"
            >
              <PieChart size={16} />
            </button>
          </div>
          
          <button 
            className={styles.exportButton}
            onClick={handleExport}
          >
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {renderStatistics()}
      {renderFilters()}
      
      {selectedCustomers.length > 0 && (
        <div className={styles.bulkActions}>
          <span>{selectedCustomers.length} Kunden ausgewählt</span>
          <div className={styles.bulkButtons}>
            <button onClick={() => handleSendEmail(selectedCustomers)}>
              <Mail size={16} /> E-Mail senden
            </button>
            <button>
              <Tag size={16} /> Tags zuweisen
            </button>
            <button>
              <Award size={16} /> Punkte hinzufügen
            </button>
          </div>
          <button 
            className={styles.clearSelection}
            onClick={() => setSelectedCustomers([])}
          >
            Auswahl aufheben
          </button>
        </div>
      )}
      
      <div className={styles.content}>
        {viewMode === 'table' ? renderTableView() : renderCardView()}
      </div>
      
      {showCustomerModal && renderCustomerModal()}
      {showEmailModal && renderEmailModal()}
    </div>
  );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const convertToCSV = (data) => {
  const headers = ['Kunden-Nr', 'Vorname', 'Nachname', 'E-Mail', 'Telefon', 'Stadt', 'Bestellungen', 'Umsatz', 'Segment', 'Loyalität'];
  const rows = data.map(customer => [
    customer.id,
    customer.firstName,
    customer.lastName,
    customer.email,
    customer.phone,
    customer.address.city,
    customer.totalOrders,
    customer.totalSpent.toFixed(2),
    CUSTOMER_SEGMENTS[customer.segment].label,
    LOYALTY_TIERS[customer.loyaltyTier].name
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
export default CustomerManagement;