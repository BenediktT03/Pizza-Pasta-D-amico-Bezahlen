/**
 * EATECH - Inventory Dashboard
 * Version: 6.4.0
 * Description: Smart Inventory Management mit AI-Predictions und Lazy Loading
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/admin/src/pages/Inventory/InventoryDashboard.jsx
 * 
 * Features: Stock tracking, automatic reordering, waste management, analytics
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, update, remove } from 'firebase/database';
import { 
  Package, TrendingDown, TrendingUp, AlertTriangle,
  Plus, Edit2, Trash2, Search, Filter,
  Download, Upload, RefreshCw, Bell,
  BarChart3, PieChart, Calendar, Clock,
  Truck, ShoppingCart, Zap, Target
} from 'lucide-react';
import { format, parseISO, addDays, subDays } from 'date-fns';
import { de } from 'date-fns/locale';
import styles from './InventoryDashboard.module.css';

// Lazy loaded components
const StockLevelChart = lazy(() => import('./components/StockLevelChart'));
const PredictionPanel = lazy(() => import('./components/PredictionPanel'));
const ReorderDialog = lazy(() => import('./components/ReorderDialog'));
const WasteTracker = lazy(() => import('./components/WasteTracker'));
const SupplierManager = lazy(() => import('./components/SupplierManager'));
const InventoryForm = lazy(() => import('./components/InventoryForm'));
const BulkOperations = lazy(() => import('./components/BulkOperations'));
const ExpirationTracker = lazy(() => import('./components/ExpirationTracker'));

// Lazy loaded services
const InventoryService = lazy(() => import('../../services/InventoryService'));
const PredictionService = lazy(() => import('../../services/PredictionService'));
const SupplierService = lazy(() => import('../../services/SupplierService'));
const NotificationService = lazy(() => import('../../services/NotificationService'));

const firebaseConfig = {
  apiKey: "AIzaSyDFBlgWE81iHnACVwOmaU0jL7FV0l_tRmU",
  authDomain: "eatech-foodtruck.firebaseapp.com",
  databaseURL: "https://eatech-foodtruck-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "eatech-foodtruck",
  storageBucket: "eatech-foodtruck.firebasestorage.app",
  messagingSenderId: "261222802445",
  appId: "1:261222802445:web:edde22580422fbced22144"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const LoadingSpinner = () => (
  <div className={styles.loadingContainer}>
    <div className={styles.spinner} />
  </div>
);

const INVENTORY_CATEGORIES = {
  ingredients: { name: 'Zutaten', icon: Package, color: '#10B981' },
  beverages: { name: 'Getränke', icon: Package, color: '#3B82F6' },
  packaging: { name: 'Verpackung', icon: Package, color: '#F59E0B' },
  supplies: { name: 'Zubehör', icon: Package, color: '#8B5CF6' },
  frozen: { name: 'Tiefkühl', icon: Package, color: '#06B6D4' },
  dairy: { name: 'Milchprodukte', icon: Package, color: '#EC4899' }
};

const STOCK_STATUS = {
  in_stock: { name: 'Verfügbar', color: '#10B981', threshold: 'above' },
  low_stock: { name: 'Wenig vorrätig', color: '#F59E0B', threshold: 'warning' },
  out_of_stock: { name: 'Nicht vorrätig', color: '#EF4444', threshold: 'critical' },
  overstocked: { name: 'Überbestand', color: '#3B82F6', threshold: 'excess' }
};

const INVENTORY_ALERTS = {
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
  EXPIRING_SOON: 'expiring_soon',
  WASTE_HIGH: 'waste_high',
  SUPPLIER_DELAY: 'supplier_delay'
};

const InventoryDashboard = () => {
  const [inventory, setInventory] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [movements, setMovements] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showReorderDialog, setShowReorderDialog] = useState(false);
  const [showSupplierManager, setShowSupplierManager] = useState(false);
  const [showWasteTracker, setShowWasteTracker] = useState(false);
  const [showBulkOperations, setShowBulkOperations] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const [activeView, setActiveView] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedItems, setSelectedItems] = useState([]);
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  const tenantId = 'demo-restaurant';

  // ============================================================================
  // FIREBASE DATA LOADING
  // ============================================================================
  useEffect(() => {
    const loadInventoryData = async () => {
      setLoading(true);
      try {
        // Load inventory items
        const inventoryRef = ref(database, `tenants/${tenantId}/inventory`);
        onValue(inventoryRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const inventoryArray = Object.entries(data).map(([id, item]) => ({
              id,
              ...item,
              status: calculateStockStatus(item),
              daysUntilExpiry: calculateDaysUntilExpiry(item.expiryDate)
            }));
            setInventory(inventoryArray);
          } else {
            setInventory([]);
          }
        });

        // Load suppliers
        const suppliersRef = ref(database, `tenants/${tenantId}/suppliers`);
        onValue(suppliersRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const suppliersArray = Object.entries(data).map(([id, supplier]) => ({
              id,
              ...supplier
            }));
            setSuppliers(suppliersArray);
          } else {
            setSuppliers([]);
          }
        });

        // Load inventory movements
        const movementsRef = ref(database, `tenants/${tenantId}/inventoryMovements`);
        onValue(movementsRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const movementsArray = Object.entries(data).map(([id, movement]) => ({
              id,
              ...movement
            }));
            setMovements(movementsArray);
          } else {
            setMovements([]);
          }
        });

        // Load predictions
        await loadPredictions();

        // Generate alerts
        generateAlerts();

      } catch (error) {
        console.error('Error loading inventory data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInventoryData();
  }, [tenantId]);

  // ============================================================================
  // CALCULATIONS
  // ============================================================================
  const calculateStockStatus = useCallback((item) => {
    const { currentStock, minStock, maxStock } = item;
    
    if (currentStock <= 0) return 'out_of_stock';
    if (currentStock <= minStock) return 'low_stock';
    if (maxStock && currentStock >= maxStock) return 'overstocked';
    return 'in_stock';
  }, []);

  const calculateDaysUntilExpiry = useCallback((expiryDate) => {
    if (!expiryDate) return null;
    
    const today = new Date();
    const expiry = parseISO(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }, []);

  const loadPredictions = useCallback(async () => {
    try {
      const { default: PredictionServiceModule } = await PredictionService();
      const predictionService = new PredictionServiceModule();
      
      const inventoryPredictions = await predictionService.getInventoryPredictions(
        tenantId,
        inventory,
        movements
      );
      
      setPredictions(inventoryPredictions);
    } catch (error) {
      console.error('Error loading predictions:', error);
    }
  }, [tenantId, inventory, movements]);

  const generateAlerts = useCallback(() => {
    const newAlerts = [];
    
    inventory.forEach(item => {
      // Low stock alerts
      if (item.status === 'low_stock') {
        newAlerts.push({
          id: `low_stock_${item.id}`,
          type: INVENTORY_ALERTS.LOW_STOCK,
          severity: 'warning',
          title: 'Wenig vorrätig',
          message: `${item.name} hat nur noch ${item.currentStock} ${item.unit}`,
          itemId: item.id,
          timestamp: new Date().toISOString()
        });
      }
      
      // Out of stock alerts
      if (item.status === 'out_of_stock') {
        newAlerts.push({
          id: `out_of_stock_${item.id}`,
          type: INVENTORY_ALERTS.OUT_OF_STOCK,
          severity: 'critical',
          title: 'Nicht vorrätig',
          message: `${item.name} ist nicht mehr vorrätig`,
          itemId: item.id,
          timestamp: new Date().toISOString()
        });
      }
      
      // Expiring soon alerts
      if (item.daysUntilExpiry !== null && item.daysUntilExpiry <= 3 && item.daysUntilExpiry >= 0) {
        newAlerts.push({
          id: `expiring_${item.id}`,
          type: INVENTORY_ALERTS.EXPIRING_SOON,
          severity: item.daysUntilExpiry <= 1 ? 'critical' : 'warning',
          title: 'Läuft bald ab',
          message: `${item.name} läuft in ${item.daysUntilExpiry} Tag(en) ab`,
          itemId: item.id,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    setAlerts(newAlerts);
  }, [inventory]);

  useEffect(() => {
    if (inventory.length > 0) {
      generateAlerts();
    }
  }, [inventory, generateAlerts]);

  // ============================================================================
  // FILTERED DATA
  // ============================================================================
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
      const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [inventory, searchTerm, filterCategory, filterStatus]);

  // ============================================================================
  // STATISTICS
  // ============================================================================
  const inventoryStats = useMemo(() => {
    const totalItems = inventory.length;
    const totalValue = inventory.reduce((sum, item) => sum + (item.currentStock * item.unitCost), 0);
    const lowStockItems = inventory.filter(item => item.status === 'low_stock').length;
    const outOfStockItems = inventory.filter(item => item.status === 'out_of_stock').length;
    const expiringItems = inventory.filter(item => 
      item.daysUntilExpiry !== null && item.daysUntilExpiry <= 7 && item.daysUntilExpiry >= 0
    ).length;
    
    const categoryDistribution = Object.keys(INVENTORY_CATEGORIES).reduce((acc, category) => {
      acc[category] = inventory.filter(item => item.category === category).length;
      return acc;
    }, {});

    return {
      totalItems,
      totalValue,
      lowStockItems,
      outOfStockItems,
      expiringItems,
      categoryDistribution
    };
  }, [inventory]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  const handleCreateItem = useCallback(async (itemData) => {
    try {
      const inventoryRef = ref(database, `tenants/${tenantId}/inventory`);
      const newItem = {
        ...itemData,
        createdAt: new Date().toISOString(),
        status: calculateStockStatus(itemData)
      };
      
      await push(inventoryRef, newItem);
      
      // Record movement
      await recordMovement({
        itemId: newItem.id,
        type: 'initial_stock',
        quantity: itemData.currentStock,
        reason: 'Initial inventory setup'
      });
      
      setShowItemForm(false);
    } catch (error) {
      console.error('Error creating item:', error);
    }
  }, [tenantId, calculateStockStatus]);

  const handleUpdateItem = useCallback(async (itemId, itemData) => {
    try {
      const itemRef = ref(database, `tenants/${tenantId}/inventory/${itemId}`);
      const updatedItem = {
        ...itemData,
        updatedAt: new Date().toISOString(),
        status: calculateStockStatus(itemData)
      };
      
      await update(itemRef, updatedItem);
      setSelectedItem(null);
      setShowItemForm(false);
    } catch (error) {
      console.error('Error updating item:', error);
    }
  }, [tenantId, calculateStockStatus]);

  const handleDeleteItem = useCallback(async (itemId) => {
    if (window.confirm('Artikel wirklich löschen?')) {
      try {
        const itemRef = ref(database, `tenants/${tenantId}/inventory/${itemId}`);
        await remove(itemRef);
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  }, [tenantId]);

  const recordMovement = useCallback(async (movementData) => {
    try {
      const movementsRef = ref(database, `tenants/${tenantId}/inventoryMovements`);
      await push(movementsRef, {
        ...movementData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error recording movement:', error);
    }
  }, [tenantId]);

  const handleStockAdjustment = useCallback(async (itemId, adjustment, reason) => {
    try {
      const item = inventory.find(i => i.id === itemId);
      if (!item) return;
      
      const newStock = Math.max(0, item.currentStock + adjustment);
      
      await handleUpdateItem(itemId, {
        ...item,
        currentStock: newStock
      });
      
      await recordMovement({
        itemId,
        type: adjustment > 0 ? 'stock_in' : 'stock_out',
        quantity: Math.abs(adjustment),
        reason,
        previousStock: item.currentStock,
        newStock
      });
      
    } catch (error) {
      console.error('Error adjusting stock:', error);
    }
  }, [inventory, handleUpdateItem, recordMovement]);

  const handleReorder = useCallback(async (itemId, quantity, supplierId) => {
    try {
      const { default: InventoryServiceModule } = await InventoryService();
      const inventoryService = new InventoryServiceModule();
      
      const order = await inventoryService.createReorder({
        tenantId,
        itemId,
        quantity,
        supplierId,
        timestamp: new Date().toISOString()
      });
      
      // Send notification
      const { default: NotificationServiceModule } = await NotificationService();
      const notificationService = new NotificationServiceModule();
      
      await notificationService.send({
        type: 'reorder_created',
        title: 'Nachbestellung erstellt',
        message: `Nachbestellung für ${quantity} Einheiten erstellt`,
        data: { orderId: order.id, itemId }
      });
      
    } catch (error) {
      console.error('Error creating reorder:', error);
    }
  }, [tenantId]);

  const handleExportInventory = useCallback(() => {
    const csvData = filteredInventory.map(item => ({
      Name: item.name,
      Kategorie: INVENTORY_CATEGORIES[item.category]?.name || item.category,
      'Aktueller Bestand': item.currentStock,
      Einheit: item.unit,
      'Min. Bestand': item.minStock,
      'Max. Bestand': item.maxStock || '',
      'Stückkosten': `${item.unitCost} CHF`,
      'Gesamtwert': `${(item.currentStock * item.unitCost).toFixed(2)} CHF`,
      Status: STOCK_STATUS[item.status]?.name || item.status,
      'Ablaufdatum': item.expiryDate ? format(parseISO(item.expiryDate), 'dd.MM.yyyy') : '',
      Lieferant: item.supplier || ''
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredInventory]);

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  const renderStatsCards = () => {
    return (
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Package size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>{inventoryStats.totalItems}</h3>
            <p>Artikel im Bestand</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <TrendingUp size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>{inventoryStats.totalValue.toLocaleString()} CHF</h3>
            <p>Gesamtwert</p>
          </div>
        </div>

        <div className={`${styles.statCard} ${inventoryStats.lowStockItems > 0 ? styles.warning : ''}`}>
          <div className={styles.statIcon}>
            <TrendingDown size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>{inventoryStats.lowStockItems}</h3>
            <p>Wenig vorrätig</p>
          </div>
        </div>

        <div className={`${styles.statCard} ${inventoryStats.outOfStockItems > 0 ? styles.critical : ''}`}>
          <div className={styles.statIcon}>
            <AlertTriangle size={24} />
          </div>
          <div className={styles.statContent}>
            <h3>{inventoryStats.outOfStockItems}</h3>
            <p>Nicht vorrätig</p>
          </div>
        </div>
      </div>
    );
  };

  const renderInventoryTable = () => {
    return (
      <div className={styles.inventoryTable}>
        <div className={styles.tableHeader}>
          <div className={styles.headerCell}>Artikel</div>
          <div className={styles.headerCell}>Kategorie</div>
          <div className={styles.headerCell}>Bestand</div>
          <div className={styles.headerCell}>Status</div>
          <div className={styles.headerCell}>Wert</div>
          <div className={styles.headerCell}>Ablauf</div>
          <div className={styles.headerCell}>Aktionen</div>
        </div>
        
        {filteredInventory.map(item => (
          <div key={item.id} className={styles.tableRow}>
            <div className={styles.tableCell}>
              <div className={styles.itemInfo}>
                <h4>{item.name}</h4>
                <p>{item.description}</p>
              </div>
            </div>
            
            <div className={styles.tableCell}>
              <div className={styles.category}>
                {React.createElement(INVENTORY_CATEGORIES[item.category]?.icon || Package, { size: 16 })}
                <span>{INVENTORY_CATEGORIES[item.category]?.name || item.category}</span>
              </div>
            </div>
            
            <div className={styles.tableCell}>
              <div className={styles.stockInfo}>
                <span className={styles.currentStock}>
                  {item.currentStock} {item.unit}
                </span>
                <span className={styles.minStock}>
                  Min: {item.minStock}
                </span>
              </div>
            </div>
            
            <div className={styles.tableCell}>
              <div 
                className={`${styles.statusBadge} ${styles[item.status]}`}
                style={{ backgroundColor: STOCK_STATUS[item.status]?.color + '20', color: STOCK_STATUS[item.status]?.color }}
              >
                {STOCK_STATUS[item.status]?.name || item.status}
              </div>
            </div>
            
            <div className={styles.tableCell}>
              <div className={styles.valueInfo}>
                <span>{(item.currentStock * item.unitCost).toFixed(2)} CHF</span>
                <span className={styles.unitCost}>à {item.unitCost} CHF</span>
              </div>
            </div>
            
            <div className={styles.tableCell}>
              {item.expiryDate && (
                <div className={`${styles.expiryInfo} ${item.daysUntilExpiry <= 3 ? styles.expiringSoon : ''}`}>
                  <Clock size={14} />
                  <span>
                    {item.daysUntilExpiry !== null ? 
                      `${item.daysUntilExpiry} Tage` : 
                      format(parseISO(item.expiryDate), 'dd.MM.yy')
                    }
                  </span>
                </div>
              )}
            </div>
            
            <div className={styles.tableCell}>
              <div className={styles.actionButtons}>
                <button
                  onClick={() => {
                    setSelectedItem(item);
                    setShowItemForm(true);
                  }}
                  className={styles.actionButton}
                  title="Bearbeiten"
                >
                  <Edit2 size={14} />
                </button>
                
                <button
                  onClick={() => {
                    setSelectedItem(item);
                    setShowReorderDialog(true);
                  }}
                  className={styles.actionButton}
                  title="Nachbestellen"
                >
                  <Truck size={14} />
                </button>
                
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className={styles.actionButton}
                  title="Löschen"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAlerts = () => {
    if (alerts.length === 0) return null;
    
    return (
      <div className={styles.alertsSection}>
        <h3>
          <Bell size={20} />
          Benachrichtigungen ({alerts.length})
        </h3>
        <div className={styles.alertsList}>
          {alerts.slice(0, 5).map(alert => (
            <div key={alert.id} className={`${styles.alert} ${styles[alert.severity]}`}>
              <div className={styles.alertIcon}>
                <AlertTriangle size={16} />
              </div>
              <div className={styles.alertContent}>
                <h4>{alert.title}</h4>
                <p>{alert.message}</p>
              </div>
              <div className={styles.alertTime}>
                {format(parseISO(alert.timestamp), 'HH:mm')}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderViewTabs = () => (
    <div className={styles.viewTabs}>
      {[
        { id: 'overview', name: 'Übersicht', icon: BarChart3 },
        { id: 'items', name: 'Artikel', icon: Package },
        { id: 'movements', name: 'Bewegungen', icon: TrendingUp },
        { id: 'predictions', name: 'Vorhersagen', icon: Target },
        { id: 'waste', name: 'Verschwendung', icon: TrendingDown }
      ].map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveView(tab.id)}
          className={`${styles.viewTab} ${activeView === tab.id ? styles.active : ''}`}
        >
          {React.createElement(tab.icon, { size: 16 })}
          <span>{tab.name}</span>
        </button>
      ))}
    </div>
  );

  const renderControls = () => (
    <div className={styles.controls}>
      <div className={styles.searchAndFilter}>
        <div className={styles.searchBox}>
          <Search size={20} />
          <input
            type="text"
            placeholder="Artikel suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className={styles.categoryFilter}
        >
          <option value="all">Alle Kategorien</option>
          {Object.entries(INVENTORY_CATEGORIES).map(([id, category]) => (
            <option key={id} value={id}>{category.name}</option>
          ))}
        </select>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={styles.statusFilter}
        >
          <option value="all">Alle Status</option>
          {Object.entries(STOCK_STATUS).map(([id, status]) => (
            <option key={id} value={id}>{status.name}</option>
          ))}
        </select>
      </div>

      <div className={styles.actionButtons}>
        <button
          onClick={() => setShowSupplierManager(true)}
          className={styles.secondaryButton}
        >
          <Truck size={16} />
          Lieferanten
        </button>
        
        <button
          onClick={() => setShowBulkOperations(true)}
          className={styles.secondaryButton}
        >
          <Upload size={16} />
          Bulk
        </button>
        
        <button
          onClick={handleExportInventory}
          className={styles.secondaryButton}
        >
          <Download size={16} />
          Export
        </button>
        
        <button
          onClick={() => setShowItemForm(true)}
          className={styles.primaryButton}
        >
          <Plus size={16} />
          Neuer Artikel
        </button>
      </div>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className={styles.inventoryDashboard}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1>Bestandsverwaltung</h1>
          <p>Intelligente Bestandsführung mit KI-Vorhersagen</p>
        </div>
        <div className={styles.headerActions}>
          <button
            onClick={() => setShowPredictions(true)}
            className={styles.secondaryButton}
          >
            <Zap size={20} />
            KI-Vorhersagen
          </button>
          <button
            onClick={() => setShowWasteTracker(true)}
            className={styles.primaryButton}
          >
            <TrendingDown size={20} />
            Verschwendung
          </button>
        </div>
      </div>

      {/* Stats */}
      {renderStatsCards()}

      {/* Alerts */}
      {renderAlerts()}

      {/* View Tabs */}
      {renderViewTabs()}

      {/* Controls */}
      {activeView === 'items' && renderControls()}

      {/* Content */}
      <div className={styles.content}>
        {activeView === 'overview' && (
          <div className={styles.overviewContent}>
            <Suspense fallback={<LoadingSpinner />}>
              <StockLevelChart inventory={inventory} />
            </Suspense>
          </div>
        )}

        {activeView === 'items' && renderInventoryTable()}

        {activeView === 'predictions' && (
          <Suspense fallback={<LoadingSpinner />}>
            <PredictionPanel
              predictions={predictions}
              inventory={inventory}
              onReorder={handleReorder}
            />
          </Suspense>
        )}
      </div>

      {/* Lazy Loaded Modals */}
      {showItemForm && (
        <Suspense fallback={<LoadingSpinner />}>
          <InventoryForm
            item={selectedItem}
            categories={INVENTORY_CATEGORIES}
            suppliers={suppliers}
            onSave={selectedItem ? handleUpdateItem : handleCreateItem}
            onClose={() => {
              setShowItemForm(false);
              setSelectedItem(null);
            }}
          />
        </Suspense>
      )}

      {showReorderDialog && selectedItem && (
        <Suspense fallback={<LoadingSpinner />}>
          <ReorderDialog
            item={selectedItem}
            suppliers={suppliers}
            onReorder={handleReorder}
            onClose={() => {
              setShowReorderDialog(false);
              setSelectedItem(null);
            }}
          />
        </Suspense>
      )}

      {showSupplierManager && (
        <Suspense fallback={<LoadingSpinner />}>
          <SupplierManager
            suppliers={suppliers}
            onClose={() => setShowSupplierManager(false)}
          />
        </Suspense>
      )}

      {showWasteTracker && (
        <Suspense fallback={<LoadingSpinner />}>
          <WasteTracker
            inventory={inventory}
            movements={movements}
            onClose={() => setShowWasteTracker(false)}
          />
        </Suspense>
      )}

      {showBulkOperations && (
        <Suspense fallback={<LoadingSpinner />}>
          <BulkOperations
            inventory={inventory}
            onBulkUpdate={(items) => console.log('Bulk update:', items)}
            onClose={() => setShowBulkOperations(false)}
          />
        </Suspense>
      )}

      {showPredictions && (
        <Suspense fallback={<LoadingSpinner />}>
          <PredictionPanel
            predictions={predictions}
            inventory={inventory}
            movements={movements}
            onClose={() => setShowPredictions(false)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default InventoryDashboard;