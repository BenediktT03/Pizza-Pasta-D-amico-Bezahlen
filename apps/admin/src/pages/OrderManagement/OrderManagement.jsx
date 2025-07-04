/**
 * EATECH - Order Management System
 * Version: 20.0.0
 * Description: Umfassendes Bestellverwaltungssystem mit Echtzeit-Updates
 * Features: Bestellübersicht, Statusverwaltung, Filterung, Export, Refunds
 * File Path: /src/pages/OrderManagement/OrderManagement.jsx
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, Filter, Download, RefreshCw, 
  ChevronDown, ChevronUp, MoreVertical,
  Package, Clock, CheckCircle, XCircle,
  AlertCircle, Phone, Mail, MapPin,
  CreditCard, DollarSign, FileText,
  Calendar, TrendingUp, Users, Printer,
  Eye, Edit, Trash2, RotateCcw, Send
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { mockOrders } from '../../data/mockData';
import styles from './OrderManagement.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const ORDER_STATUSES = {
  PENDING: { label: 'Ausstehend', color: '#FFA500', icon: Clock },
  CONFIRMED: { label: 'Bestätigt', color: '#2196F3', icon: Package },
  PREPARING: { label: 'In Zubereitung', color: '#9C27B0', icon: Package },
  READY: { label: 'Fertig', color: '#4CAF50', icon: CheckCircle },
  DELIVERED: { label: 'Geliefert', color: '#4CAF50', icon: CheckCircle },
  CANCELLED: { label: 'Storniert', color: '#F44336', icon: XCircle },
  REFUNDED: { label: 'Erstattet', color: '#FF9800', icon: RotateCcw }
};

const PAYMENT_METHODS = {
  CARD: { label: 'Kreditkarte', icon: CreditCard },
  CASH: { label: 'Bargeld', icon: DollarSign },
  TWINT: { label: 'TWINT', icon: CreditCard },
  INVOICE: { label: 'Rechnung', icon: FileText }
};

const TIME_FILTERS = {
  TODAY: 'Heute',
  YESTERDAY: 'Gestern',
  LAST_7_DAYS: 'Letzte 7 Tage',
  LAST_30_DAYS: 'Letzte 30 Tage',
  CUSTOM: 'Zeitraum wählen'
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const OrderManagement = () => {
  // State Management
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [timeFilter, setTimeFilter] = useState('TODAY');
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [viewMode, setViewMode] = useState('table'); // table | cards
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Load Orders
  useEffect(() => {
    loadOrders();
    // Real-time updates simulation
    const interval = setInterval(loadOrders, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOrders(mockOrders);
    } catch (error) {
      toast.error('Fehler beim Laden der Bestellungen');
    } finally {
      setLoading(false);
    }
  };

  // Filter & Sort Orders
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer.phone.includes(searchTerm)
      );
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Time filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (timeFilter) {
      case 'TODAY':
        filtered = filtered.filter(order => 
          new Date(order.createdAt) >= today
        );
        break;
      case 'YESTERDAY':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        filtered = filtered.filter(order => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= yesterday && orderDate < today;
        });
        break;
      case 'LAST_7_DAYS':
        const week = new Date(today);
        week.setDate(week.getDate() - 7);
        filtered = filtered.filter(order => 
          new Date(order.createdAt) >= week
        );
        break;
      case 'LAST_30_DAYS':
        const month = new Date(today);
        month.setDate(month.getDate() - 30);
        filtered = filtered.filter(order => 
          new Date(order.createdAt) >= month
        );
        break;
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
  }, [orders, searchTerm, statusFilter, timeFilter, sortConfig]);

  // Statistics
  const statistics = useMemo(() => {
    const stats = {
      total: filteredOrders.length,
      revenue: filteredOrders.reduce((sum, order) => sum + order.total, 0),
      avgOrderValue: 0,
      statusCounts: {}
    };

    stats.avgOrderValue = stats.total > 0 ? stats.revenue / stats.total : 0;

    Object.keys(ORDER_STATUSES).forEach(status => {
      stats.statusCounts[status] = filteredOrders.filter(
        order => order.status === status
      ).length;
    });

    return stats;
  }, [filteredOrders]);

  // Handlers
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleSelectOrder = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map(order => order.id));
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      // Update order status
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
      toast.success('Status erfolgreich aktualisiert');
    } catch (error) {
      toast.error('Fehler beim Statusupdate');
    }
  };

  const handleBulkStatusChange = async (newStatus) => {
    try {
      setOrders(prev => prev.map(order => 
        selectedOrders.includes(order.id) 
          ? { ...order, status: newStatus } 
          : order
      ));
      setSelectedOrders([]);
      toast.success(`${selectedOrders.length} Bestellungen aktualisiert`);
    } catch (error) {
      toast.error('Fehler beim Bulk-Update');
    }
  };

  const handleExport = () => {
    const csv = convertToCSV(filteredOrders);
    downloadCSV(csv, `bestellungen_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success('Export erfolgreich');
  };

  const handlePrintOrder = (order) => {
    window.print(); // Simplified - in production use proper print styling
    toast.success('Druckauftrag gesendet');
  };

  const handleRefund = async (orderId) => {
    if (window.confirm('Möchten Sie diese Bestellung wirklich erstatten?')) {
      try {
        // Process refund
        await handleStatusChange(orderId, 'REFUNDED');
        toast.success('Erstattung erfolgreich durchgeführt');
      } catch (error) {
        toast.error('Fehler bei der Erstattung');
      }
    }
  };

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  const renderStatistics = () => (
    <div className={styles.statistics}>
      <div className={styles.statCard}>
        <Package className={styles.statIcon} />
        <div className={styles.statContent}>
          <h3>{statistics.total}</h3>
          <p>Bestellungen</p>
        </div>
      </div>
      
      <div className={styles.statCard}>
        <DollarSign className={styles.statIcon} />
        <div className={styles.statContent}>
          <h3>CHF {statistics.revenue.toFixed(2)}</h3>
          <p>Gesamtumsatz</p>
        </div>
      </div>
      
      <div className={styles.statCard}>
        <TrendingUp className={styles.statIcon} />
        <div className={styles.statContent}>
          <h3>CHF {statistics.avgOrderValue.toFixed(2)}</h3>
          <p>Ø Bestellwert</p>
        </div>
      </div>
      
      <div className={styles.statCard}>
        <Users className={styles.statIcon} />
        <div className={styles.statContent}>
          <h3>{statistics.statusCounts.PENDING || 0}</h3>
          <p>Offene Bestellungen</p>
        </div>
      </div>
    </div>
  );

  const renderFilters = () => (
    <div className={`${styles.filters} ${showFilters ? styles.show : ''}`}>
      <div className={styles.filterGroup}>
        <label>Status</label>
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="ALL">Alle Status</option>
          {Object.entries(ORDER_STATUSES).map(([key, value]) => (
            <option key={key} value={key}>{value.label}</option>
          ))}
        </select>
      </div>
      
      <div className={styles.filterGroup}>
        <label>Zeitraum</label>
        <select 
          value={timeFilter} 
          onChange={(e) => setTimeFilter(e.target.value)}
          className={styles.filterSelect}
        >
          {Object.entries(TIME_FILTERS).map(([key, value]) => (
            <option key={key} value={key}>{value}</option>
          ))}
        </select>
      </div>
      
      <div className={styles.filterGroup}>
        <label>Ansicht</label>
        <div className={styles.viewToggle}>
          <button 
            className={viewMode === 'table' ? styles.active : ''}
            onClick={() => setViewMode('table')}
          >
            Tabelle
          </button>
          <button 
            className={viewMode === 'cards' ? styles.active : ''}
            onClick={() => setViewMode('cards')}
          >
            Karten
          </button>
        </div>
      </div>
    </div>
  );

  const renderTableView = () => (
    <div className={styles.tableContainer}>
      <table className={styles.orderTable}>
        <thead>
          <tr>
            <th>
              <input 
                type="checkbox" 
                checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                onChange={handleSelectAll}
              />
            </th>
            <th onClick={() => handleSort('id')}>
              Bestell-Nr. {sortConfig.key === 'id' && (
                sortConfig.direction === 'asc' ? <ChevronUp /> : <ChevronDown />
              )}
            </th>
            <th onClick={() => handleSort('createdAt')}>
              Datum {sortConfig.key === 'createdAt' && (
                sortConfig.direction === 'asc' ? <ChevronUp /> : <ChevronDown />
              )}
            </th>
            <th>Kunde</th>
            <th>Artikel</th>
            <th onClick={() => handleSort('total')}>
              Betrag {sortConfig.key === 'total' && (
                sortConfig.direction === 'asc' ? <ChevronUp /> : <ChevronDown />
              )}
            </th>
            <th>Zahlung</th>
            <th>Status</th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map(order => (
            <tr key={order.id} className={selectedOrders.includes(order.id) ? styles.selected : ''}>
              <td>
                <input 
                  type="checkbox" 
                  checked={selectedOrders.includes(order.id)}
                  onChange={() => handleSelectOrder(order.id)}
                />
              </td>
              <td className={styles.orderId}>#{order.id}</td>
              <td>{new Date(order.createdAt).toLocaleString('de-CH')}</td>
              <td>
                <div className={styles.customerInfo}>
                  <div>{order.customer.name}</div>
                  <div className={styles.customerContact}>
                    <Phone size={12} /> {order.customer.phone}
                  </div>
                </div>
              </td>
              <td>{order.items.length} Artikel</td>
              <td className={styles.amount}>CHF {order.total.toFixed(2)}</td>
              <td>
                <div className={styles.paymentMethod}>
                  {React.createElement(PAYMENT_METHODS[order.paymentMethod].icon, { size: 16 })}
                  {PAYMENT_METHODS[order.paymentMethod].label}
                </div>
              </td>
              <td>
                <span 
                  className={styles.statusBadge}
                  style={{ backgroundColor: ORDER_STATUSES[order.status].color }}
                >
                  {React.createElement(ORDER_STATUSES[order.status].icon, { size: 14 })}
                  {ORDER_STATUSES[order.status].label}
                </span>
              </td>
              <td>
                <div className={styles.actions}>
                  <button 
                    className={styles.actionButton}
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowOrderModal(true);
                    }}
                    title="Details anzeigen"
                  >
                    <Eye size={16} />
                  </button>
                  <button 
                    className={styles.actionButton}
                    onClick={() => handlePrintOrder(order)}
                    title="Drucken"
                  >
                    <Printer size={16} />
                  </button>
                  <div className={styles.dropdown}>
                    <button className={styles.actionButton}>
                      <MoreVertical size={16} />
                    </button>
                    <div className={styles.dropdownContent}>
                      <button onClick={() => handleStatusChange(order.id, 'CONFIRMED')}>
                        <CheckCircle size={16} /> Bestätigen
                      </button>
                      <button onClick={() => handleStatusChange(order.id, 'READY')}>
                        <Package size={16} /> Als fertig markieren
                      </button>
                      <button onClick={() => handleStatusChange(order.id, 'CANCELLED')}>
                        <XCircle size={16} /> Stornieren
                      </button>
                      <button onClick={() => handleRefund(order.id)}>
                        <RotateCcw size={16} /> Erstatten
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
      {filteredOrders.map(order => (
        <div key={order.id} className={styles.orderCard}>
          <div className={styles.cardHeader}>
            <div>
              <h3>#{order.id}</h3>
              <p>{new Date(order.createdAt).toLocaleString('de-CH')}</p>
            </div>
            <span 
              className={styles.statusBadge}
              style={{ backgroundColor: ORDER_STATUSES[order.status].color }}
            >
              {React.createElement(ORDER_STATUSES[order.status].icon, { size: 14 })}
              {ORDER_STATUSES[order.status].label}
            </span>
          </div>
          
          <div className={styles.cardBody}>
            <div className={styles.customerSection}>
              <h4>{order.customer.name}</h4>
              <p><Phone size={14} /> {order.customer.phone}</p>
              <p><Mail size={14} /> {order.customer.email}</p>
              {order.deliveryAddress && (
                <p><MapPin size={14} /> {order.deliveryAddress}</p>
              )}
            </div>
            
            <div className={styles.orderDetails}>
              <div className={styles.itemsList}>
                {order.items.slice(0, 3).map((item, index) => (
                  <div key={index} className={styles.itemPreview}>
                    {item.quantity}x {item.name}
                  </div>
                ))}
                {order.items.length > 3 && (
                  <div className={styles.moreItems}>
                    +{order.items.length - 3} weitere Artikel
                  </div>
                )}
              </div>
              
              <div className={styles.cardFooter}>
                <div className={styles.paymentInfo}>
                  {React.createElement(PAYMENT_METHODS[order.paymentMethod].icon, { size: 16 })}
                  {PAYMENT_METHODS[order.paymentMethod].label}
                </div>
                <div className={styles.totalAmount}>
                  CHF {order.total.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
          
          <div className={styles.cardActions}>
            <button onClick={() => {
              setSelectedOrder(order);
              setShowOrderModal(true);
            }}>
              <Eye size={16} /> Details
            </button>
            <button onClick={() => handlePrintOrder(order)}>
              <Printer size={16} /> Drucken
            </button>
            <select 
              value={order.status} 
              onChange={(e) => handleStatusChange(order.id, e.target.value)}
              className={styles.statusSelect}
            >
              {Object.entries(ORDER_STATUSES).map(([key, value]) => (
                <option key={key} value={key}>{value.label}</option>
              ))}
            </select>
          </div>
        </div>
      ))}
    </div>
  );

  const renderOrderModal = () => {
    if (!selectedOrder) return null;

    return (
      <div className={styles.modal} onClick={() => setShowOrderModal(false)}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h2>Bestellung #{selectedOrder.id}</h2>
            <button onClick={() => setShowOrderModal(false)}>×</button>
          </div>
          
          <div className={styles.modalBody}>
            <div className={styles.section}>
              <h3>Kundeninformationen</h3>
              <div className={styles.infoGrid}>
                <div>
                  <label>Name:</label>
                  <p>{selectedOrder.customer.name}</p>
                </div>
                <div>
                  <label>Telefon:</label>
                  <p>{selectedOrder.customer.phone}</p>
                </div>
                <div>
                  <label>E-Mail:</label>
                  <p>{selectedOrder.customer.email}</p>
                </div>
                {selectedOrder.deliveryAddress && (
                  <div>
                    <label>Lieferadresse:</label>
                    <p>{selectedOrder.deliveryAddress}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className={styles.section}>
              <h3>Bestelldetails</h3>
              <table className={styles.itemsTable}>
                <thead>
                  <tr>
                    <th>Artikel</th>
                    <th>Menge</th>
                    <th>Preis</th>
                    <th>Gesamt</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map((item, index) => (
                    <tr key={index}>
                      <td>
                        {item.name}
                        {item.modifiers && item.modifiers.length > 0 && (
                          <div className={styles.modifiers}>
                            {item.modifiers.join(', ')}
                          </div>
                        )}
                      </td>
                      <td>{item.quantity}</td>
                      <td>CHF {item.price.toFixed(2)}</td>
                      <td>CHF {(item.quantity * item.price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3">Zwischensumme</td>
                    <td>CHF {selectedOrder.subtotal.toFixed(2)}</td>
                  </tr>
                  {selectedOrder.discount > 0 && (
                    <tr>
                      <td colSpan="3">Rabatt</td>
                      <td>-CHF {selectedOrder.discount.toFixed(2)}</td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan="3">MwSt (7.7%)</td>
                    <td>CHF {selectedOrder.tax.toFixed(2)}</td>
                  </tr>
                  <tr className={styles.totalRow}>
                    <td colSpan="3">Gesamtbetrag</td>
                    <td>CHF {selectedOrder.total.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            <div className={styles.section}>
              <h3>Bestellverlauf</h3>
              <div className={styles.timeline}>
                <div className={styles.timelineItem}>
                  <div className={styles.timelineDot} />
                  <div className={styles.timelineContent}>
                    <p>Bestellung eingegangen</p>
                    <span>{new Date(selectedOrder.createdAt).toLocaleString('de-CH')}</span>
                  </div>
                </div>
                {selectedOrder.statusHistory && selectedOrder.statusHistory.map((history, index) => (
                  <div key={index} className={styles.timelineItem}>
                    <div className={styles.timelineDot} />
                    <div className={styles.timelineContent}>
                      <p>{history.status}</p>
                      <span>{new Date(history.timestamp).toLocaleString('de-CH')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {selectedOrder.notes && (
              <div className={styles.section}>
                <h3>Notizen</h3>
                <p className={styles.notes}>{selectedOrder.notes}</p>
              </div>
            )}
          </div>
          
          <div className={styles.modalFooter}>
            <button 
              className={styles.printButton}
              onClick={() => handlePrintOrder(selectedOrder)}
            >
              <Printer size={16} /> Drucken
            </button>
            <button 
              className={styles.refundButton}
              onClick={() => handleRefund(selectedOrder.id)}
            >
              <RotateCcw size={16} /> Erstatten
            </button>
            <button 
              className={styles.primaryButton}
              onClick={() => setShowOrderModal(false)}
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderBulkActions = () => {
    if (selectedOrders.length === 0) return null;

    return (
      <div className={styles.bulkActions}>
        <span>{selectedOrders.length} Bestellungen ausgewählt</span>
        <div className={styles.bulkButtons}>
          <button onClick={() => handleBulkStatusChange('CONFIRMED')}>
            <CheckCircle size={16} /> Bestätigen
          </button>
          <button onClick={() => handleBulkStatusChange('CANCELLED')}>
            <XCircle size={16} /> Stornieren
          </button>
          <button onClick={() => {
            // Export selected orders
            const selectedOrdersData = orders.filter(o => selectedOrders.includes(o.id));
            const csv = convertToCSV(selectedOrdersData);
            downloadCSV(csv, 'selected_orders.csv');
          }}>
            <Download size={16} /> Exportieren
          </button>
        </div>
        <button 
          className={styles.clearSelection}
          onClick={() => setSelectedOrders([])}
        >
          Auswahl aufheben
        </button>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  if (loading) {
    return (
      <div className={styles.loading}>
        <RefreshCw className={styles.spinner} />
        <p>Lade Bestellungen...</p>
      </div>
    );
  }

  return (
    <div className={styles.orderManagement}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>Bestellverwaltung</h1>
          <button className={styles.refreshButton} onClick={loadOrders}>
            <RefreshCw size={16} /> Aktualisieren
          </button>
        </div>
        
        <div className={styles.headerActions}>
          <div className={styles.searchBar}>
            <Search size={20} />
            <input
              type="text"
              placeholder="Suche nach Bestell-Nr., Kunde, E-Mail..."
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
      {renderBulkActions()}
      
      <div className={styles.content}>
        {viewMode === 'table' ? renderTableView() : renderCardView()}
      </div>
      
      {showOrderModal && renderOrderModal()}
    </div>
  );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const convertToCSV = (data) => {
  const headers = ['Bestell-Nr', 'Datum', 'Kunde', 'E-Mail', 'Telefon', 'Artikel', 'Betrag', 'Status'];
  const rows = data.map(order => [
    order.id,
    new Date(order.createdAt).toLocaleString('de-CH'),
    order.customer.name,
    order.customer.email,
    order.customer.phone,
    order.items.length,
    order.total.toFixed(2),
    ORDER_STATUSES[order.status].label
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
export default OrderManagement;