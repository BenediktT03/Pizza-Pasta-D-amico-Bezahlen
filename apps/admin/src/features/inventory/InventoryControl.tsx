import React, { useState, useEffect } from 'react';
import {
  Package,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  BarChart,
  Clock,
  ChevronDown,
  ShoppingCart,
  RefreshCw,
  Calendar,
  DollarSign,
  Truck,
  CheckCircle,
  XCircle,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Save
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useTenantStore } from '../../stores/tenant.store';
import { useAuth } from '../../hooks/useAuth';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  sku?: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  unit: string;
  costPerUnit: number;
  supplier?: string;
  location?: string;
  expiryDate?: Date;
  lastRestocked?: Date;
  lastCounted?: Date;
  notes?: string;
  isActive: boolean;
  trackExpiry: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface StockMovement {
  id: string;
  inventoryItemId: string;
  productName: string;
  type: 'in' | 'out' | 'adjustment' | 'waste' | 'return';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  reference?: string; // Order ID, Invoice number, etc.
  performedBy: string;
  cost?: number;
  createdAt: Date;
}

interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  paymentTerms?: string;
  leadTime?: number; // in days
  minimumOrder?: number;
  isActive: boolean;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
  totalAmount: number;
  expectedDelivery?: Date;
  actualDelivery?: Date;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PurchaseOrderItem {
  inventoryItemId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

type ViewMode = 'inventory' | 'movements' | 'suppliers' | 'orders';

export function InventoryControl() {
  const { user, hasPermission } = useAuth();
  const { tenant } = useTenantStore();
  
  const [viewMode, setViewMode] = useState<ViewMode>('inventory');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'low' | 'normal' | 'overstocked'>('all');
  const [showStockAdjustment, setShowStockAdjustment] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showPurchaseOrderForm, setShowPurchaseOrderForm] = useState(false);
  
  // Stock adjustment form
  const [adjustmentData, setAdjustmentData] = useState({
    type: 'adjustment' as StockMovement['type'],
    quantity: 0,
    reason: '',
    reference: ''
  });

  useEffect(() => {
    if (tenant?.id) {
      loadData();
    }
  }, [tenant?.id, viewMode]);

  const loadData = async () => {
    if (!tenant?.id) return;
    
    try {
      setLoading(true);
      
      switch (viewMode) {
        case 'inventory':
          await loadInventory();
          break;
        case 'movements':
          await loadMovements();
          break;
        case 'suppliers':
          await loadSuppliers();
          break;
        case 'orders':
          await loadPurchaseOrders();
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInventory = async () => {
    if (!tenant?.id) return;
    
    const inventoryQuery = query(
      collection(db, 'inventory'),
      where('tenantId', '==', tenant.id),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(inventoryQuery);
    
    const inventoryData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      expiryDate: doc.data().expiryDate?.toDate(),
      lastRestocked: doc.data().lastRestocked?.toDate(),
      lastCounted: doc.data().lastCounted?.toDate(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    } as InventoryItem));
    
    setInventory(inventoryData);
  };

  const loadMovements = async () => {
    if (!tenant?.id) return;
    
    const movementsQuery = query(
      collection(db, 'stock_movements'),
      where('tenantId', '==', tenant.id),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const snapshot = await getDocs(movementsQuery);
    
    const movementsData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    } as StockMovement));
    
    setMovements(movementsData);
  };

  const loadSuppliers = async () => {
    if (!tenant?.id) return;
    
    const suppliersQuery = query(
      collection(db, 'suppliers'),
      where('tenantId', '==', tenant.id)
    );
    const snapshot = await getDocs(suppliersQuery);
    
    const suppliersData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Supplier));
    
    setSuppliers(suppliersData);
  };

  const loadPurchaseOrders = async () => {
    if (!tenant?.id) return;
    
    const ordersQuery = query(
      collection(db, 'purchase_orders'),
      where('tenantId', '==', tenant.id),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const snapshot = await getDocs(ordersQuery);
    
    const ordersData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      expectedDelivery: doc.data().expectedDelivery?.toDate(),
      actualDelivery: doc.data().actualDelivery?.toDate(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    } as PurchaseOrder));
    
    setPurchaseOrders(ordersData);
  };

  const handleStockAdjustment = async () => {
    if (!selectedItem || !tenant?.id || !user) return;
    
    try {
      setLoading(true);
      
      const isAddition = adjustmentData.type === 'in' || 
                        (adjustmentData.type === 'adjustment' && adjustmentData.quantity > 0);
      const actualQuantity = Math.abs(adjustmentData.quantity);
      const newStock = isAddition 
        ? selectedItem.currentStock + actualQuantity
        : selectedItem.currentStock - actualQuantity;
      
      // Update inventory
      await updateDoc(doc(db, 'inventory', selectedItem.id), {
        currentStock: newStock,
        lastCounted: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Record movement
      await addDoc(collection(db, 'stock_movements'), {
        tenantId: tenant.id,
        inventoryItemId: selectedItem.id,
        productName: selectedItem.productName,
        type: adjustmentData.type,
        quantity: adjustmentData.quantity,
        previousStock: selectedItem.currentStock,
        newStock,
        reason: adjustmentData.reason,
        reference: adjustmentData.reference,
        performedBy: user.name,
        cost: adjustmentData.type === 'waste' ? selectedItem.costPerUnit * actualQuantity : 0,
        createdAt: serverTimestamp()
      });
      
      // Reload data
      await loadInventory();
      
      // Reset form
      setShowStockAdjustment(false);
      setSelectedItem(null);
      setAdjustmentData({
        type: 'adjustment',
        quantity: 0,
        reason: '',
        reference: ''
      });
    } catch (error) {
      console.error('Error adjusting stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPurchaseOrder = async (items: InventoryItem[]) => {
    if (!tenant?.id || !user) return;
    
    try {
      const orderNumber = `PO-${Date.now()}`;
      const orderItems: PurchaseOrderItem[] = items.map(item => ({
        inventoryItemId: item.id,
        productName: item.productName,
        quantity: item.reorderQuantity,
        unitCost: item.costPerUnit,
        totalCost: item.reorderQuantity * item.costPerUnit
      }));
      
      const totalAmount = orderItems.reduce((sum, item) => sum + item.totalCost, 0);
      
      await addDoc(collection(db, 'purchase_orders'), {
        tenantId: tenant.id,
        orderNumber,
        supplierId: items[0].supplier || '',
        supplierName: suppliers.find(s => s.id === items[0].supplier)?.name || 'Unknown',
        items: orderItems,
        status: 'draft',
        totalAmount,
        createdBy: user.name,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Show success message
      alert('Purchase order created successfully!');
    } catch (error) {
      console.error('Error creating purchase order:', error);
    }
  };

  const getStockStatus = (item: InventoryItem) => {
    const stockPercentage = (item.currentStock / item.maxStock) * 100;
    
    if (item.currentStock <= item.minStock) {
      return { status: 'critical', color: 'text-red-600 bg-red-100' };
    } else if (item.currentStock <= item.reorderPoint) {
      return { status: 'low', color: 'text-orange-600 bg-orange-100' };
    } else if (stockPercentage > 90) {
      return { status: 'overstocked', color: 'text-purple-600 bg-purple-100' };
    } else {
      return { status: 'normal', color: 'text-green-600 bg-green-100' };
    }
  };

  const getExpiryStatus = (expiryDate?: Date) => {
    if (!expiryDate) return null;
    
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { status: 'expired', color: 'text-red-600', message: 'Expired' };
    } else if (daysUntilExpiry <= 7) {
      return { status: 'expiring-soon', color: 'text-orange-600', message: `Expires in ${daysUntilExpiry} days` };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'expiring', color: 'text-yellow-600', message: `Expires in ${daysUntilExpiry} days` };
    }
    
    return null;
  };

  const exportInventory = () => {
    const csv = [
      ['Product', 'SKU', 'Category', 'Current Stock', 'Min Stock', 'Max Stock', 'Unit', 'Cost/Unit', 'Total Value', 'Status'].join(','),
      ...inventory.map(item => [
        item.productName,
        item.sku || '',
        item.category,
        item.currentStock,
        item.minStock,
        item.maxStock,
        item.unit,
        item.costPerUnit.toFixed(2),
        (item.currentStock * item.costPerUnit).toFixed(2),
        getStockStatus(item).status
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    const stockStatus = getStockStatus(item).status;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'low' && (stockStatus === 'low' || stockStatus === 'critical')) ||
                         (filterStatus === 'normal' && stockStatus === 'normal') ||
                         (filterStatus === 'overstocked' && stockStatus === 'overstocked');
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const categories = [...new Set(inventory.map(item => item.category))];
  const lowStockItems = inventory.filter(item => item.currentStock <= item.reorderPoint);
  const totalValue = inventory.reduce((sum, item) => sum + (item.currentStock * item.costPerUnit), 0);
  const expiringItems = inventory.filter(item => {
    const status = getExpiryStatus(item.expiryDate);
    return status && (status.status === 'expiring-soon' || status.status === 'expired');
  });

  const canEdit = hasPermission('inventory:write');
  const canDelete = hasPermission('inventory:delete');

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Control</h1>
          <p className="text-gray-600">Manage stock levels and track inventory movements</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={exportInventory}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{inventory.length}</p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-orange-600">{lowStockItems.length}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-red-600">{expiringItems.length}</p>
            </div>
            <Clock className="w-8 h-8 text-red-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">
                CHF {totalValue.toFixed(2)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="border-b">
          <nav className="flex -mb-px">
            {[
              { id: 'inventory', label: 'Inventory', icon: Package },
              { id: 'movements', label: 'Stock Movements', icon: TrendingUp },
              { id: 'suppliers', label: 'Suppliers', icon: Truck },
              { id: 'orders', label: 'Purchase Orders', icon: ShoppingCart }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setViewMode(tab.id as ViewMode)}
                  className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm ${
                    viewMode === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Filters */}
        {viewMode === 'inventory' && (
          <div className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search inventory..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="low">Low Stock</option>
                <option value="normal">Normal</option>
                <option value="overstocked">Overstocked</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <>
          {/* Inventory View */}
          {viewMode === 'inventory' && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expiry
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInventory.map(item => {
                    const stockStatus = getStockStatus(item);
                    const expiryStatus = getExpiryStatus(item.expiryDate);
                    const stockPercentage = (item.currentStock / item.maxStock) * 100;
                    
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.productName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.sku && `SKU: ${item.sku}`} • {item.category}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {item.currentStock} {item.unit}
                              </span>
                              {item.currentStock <= item.reorderPoint && (
                                <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
                                  Reorder
                                </span>
                              )}
                            </div>
                            <div className="mt-1">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    stockPercentage < 25 ? 'bg-red-500' :
                                    stockPercentage < 50 ? 'bg-orange-500' :
                                    stockPercentage < 90 ? 'bg-green-500' :
                                    'bg-purple-500'
                                  }`}
                                  style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                                />
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Min: {item.minStock} • Max: {item.maxStock}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}>
                            {stockStatus.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              CHF {(item.currentStock * item.costPerUnit).toFixed(2)}
                            </div>
                            <div className="text-gray-500">
                              @ CHF {item.costPerUnit.toFixed(2)}/{item.unit}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.trackExpiry && item.expiryDate ? (
                            <div className={`text-sm ${expiryStatus?.color}`}>
                              {format(item.expiryDate, 'MMM dd, yyyy')}
                              {expiryStatus && (
                                <div className="text-xs">{expiryStatus.message}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {canEdit && (
                              <button
                                onClick={() => {
                                  setSelectedItem(item);
                                  setShowStockAdjustment(true);
                                }}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Adjust
                              </button>
                            )}
                            {item.currentStock <= item.reorderPoint && canEdit && (
                              <button
                                onClick={() => createPurchaseOrder([item])}
                                className="text-green-600 hover:text-green-900"
                              >
                                Reorder
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Stock Movements View */}
          {viewMode === 'movements' && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Change
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Performed By
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {movements.map(movement => (
                    <tr key={movement.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(movement.createdAt, 'MMM dd, yyyy HH:mm')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {movement.productName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          movement.type === 'in' ? 'bg-green-100 text-green-800' :
                          movement.type === 'out' ? 'bg-red-100 text-red-800' :
                          movement.type === 'waste' ? 'bg-orange-100 text-orange-800' :
                          movement.type === 'return' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {movement.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">{movement.previousStock}</span>
                          {movement.quantity > 0 ? (
                            <ArrowUpRight className="w-4 h-4 text-green-500" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-red-500" />
                          )}
                          <span className="font-medium text-gray-900">{movement.newStock}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {movement.reason}
                        {movement.reference && (
                          <div className="text-xs">Ref: {movement.reference}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {movement.performedBy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Suppliers View */}
          {viewMode === 'suppliers' && (
            <div>
              {canEdit && (
                <div className="mb-4 flex justify-end">
                  <button
                    onClick={() => setShowSupplierForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Supplier
                  </button>
                </div>
              )}
              
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Supplier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment Terms
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lead Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {suppliers.map(supplier => (
                      <tr key={supplier.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {supplier.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {supplier.address}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{supplier.contact}</div>
                          <div className="text-sm text-gray-500">{supplier.email}</div>
                          <div className="text-sm text-gray-500">{supplier.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {supplier.paymentTerms || 'Net 30'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {supplier.leadTime || 0} days
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            supplier.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {supplier.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {canEdit && (
                              <button className="text-blue-600 hover:text-blue-900">
                                Edit
                              </button>
                            )}
                            {canDelete && (
                              <button className="text-red-600 hover:text-red-900">
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Purchase Orders View */}
          {viewMode === 'orders' && (
            <div>
              {canEdit && (
                <div className="mb-4 flex justify-end">
                  <button
                    onClick={() => setShowPurchaseOrderForm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create Order
                  </button>
                </div>
              )}
              
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Supplier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expected Delivery
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {purchaseOrders.map(order => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {order.orderNumber}
                          </div>
                          <div className="text-sm text-gray-500">
                            {format(order.createdAt, 'MMM dd, yyyy')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {order.supplierName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.items.length} items
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          CHF {order.totalAmount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            order.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                            order.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            order.status === 'received' ? 'bg-purple-100 text-purple-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.expectedDelivery 
                            ? format(order.expectedDelivery, 'MMM dd, yyyy')
                            : '-'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-blue-600 hover:text-blue-900">
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Stock Adjustment Modal */}
      {showStockAdjustment && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Adjust Stock - {selectedItem.productName}
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Current Stock: <span className="font-medium">{selectedItem.currentStock} {selectedItem.unit}</span>
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adjustment Type
                </label>
                <select
                  value={adjustmentData.type}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, type: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="adjustment">General Adjustment</option>
                  <option value="in">Stock In (Received)</option>
                  <option value="out">Stock Out (Used)</option>
                  <option value="waste">Waste/Damage</option>
                  <option value="return">Return to Supplier</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  value={adjustmentData.quantity}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, quantity: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={adjustmentData.type === 'adjustment' ? "Use + or - for adjustment" : "Enter quantity"}
                />
                <p className="text-xs text-gray-500 mt-1">
                  New stock will be: {
                    adjustmentData.type === 'in' || (adjustmentData.type === 'adjustment' && adjustmentData.quantity > 0)
                      ? selectedItem.currentStock + Math.abs(adjustmentData.quantity)
                      : selectedItem.currentStock - Math.abs(adjustmentData.quantity)
                  } {selectedItem.unit}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <input
                  type="text"
                  value={adjustmentData.reason}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Stock count correction, Damaged goods"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference (Optional)
                </label>
                <input
                  type="text"
                  value={adjustmentData.reference}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, reference: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Invoice #, Order #"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => {
                  setShowStockAdjustment(false);
                  setSelectedItem(null);
                  setAdjustmentData({
                    type: 'adjustment',
                    quantity: 0,
                    reason: '',
                    reference: ''
                  });
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStockAdjustment}
                disabled={!adjustmentData.reason || adjustmentData.quantity === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
