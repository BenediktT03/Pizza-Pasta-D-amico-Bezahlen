import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Copy,
  Calendar,
  Clock,
  Percent,
  DollarSign,
  Gift,
  Users,
  ShoppingBag,
  TrendingUp,
  AlertCircle,
  Check,
  X,
  ChevronDown,
  BarChart,
  Eye,
  EyeOff,
  Download,
  Upload,
  Code,
  Zap
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
  Timestamp
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useTenantStore } from '../../stores/tenant.store';
import { useAuth } from '../../hooks/useAuth';
import { format, isAfter, isBefore, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

interface Promotion {
  id: string;
  name: string;
  description: string;
  type: PromotionType;
  discountType: 'percentage' | 'fixed' | 'bogo' | 'bundle';
  discountValue: number;
  code?: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  conditions: PromotionConditions;
  applicableProducts?: string[];
  applicableCategories?: string[];
  excludedProducts?: string[];
  maxUsesTotal?: number;
  maxUsesPerCustomer?: number;
  currentUses: number;
  minimumPurchase?: number;
  freeShipping?: boolean;
  stackable: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

type PromotionType = 'discount' | 'coupon' | 'flash_sale' | 'happy_hour' | 'loyalty' | 'seasonal' | 'bundle';

interface PromotionConditions {
  dayOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  timeStart?: string; // HH:mm format
  timeEnd?: string; // HH:mm format
  customerGroups?: string[];
  firstTimeCustomer?: boolean;
  minimumItems?: number;
  specificPaymentMethods?: string[];
}

interface PromotionStats {
  totalRevenue: number;
  totalDiscount: number;
  ordersCount: number;
  averageOrderValue: number;
  conversionRate: number;
}

interface PromotionFormData {
  name: string;
  description: string;
  type: PromotionType;
  discountType: 'percentage' | 'fixed' | 'bogo' | 'bundle';
  discountValue: number;
  code: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  minimumPurchase: number;
  maxUsesTotal: number;
  maxUsesPerCustomer: number;
  freeShipping: boolean;
  stackable: boolean;
  priority: number;
  applicableProducts: string[];
  applicableCategories: string[];
  excludedProducts: string[];
}

export function Promotions() {
  const { user, hasPermission } = useAuth();
  const { tenant } = useTenantStore();
  
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<PromotionType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'scheduled' | 'expired'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [promotionStats, setPromotionStats] = useState<PromotionStats | null>(null);
  
  const [formData, setFormData] = useState<PromotionFormData>({
    name: '',
    description: '',
    type: 'discount',
    discountType: 'percentage',
    discountValue: 10,
    code: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    startTime: '00:00',
    endTime: '23:59',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    minimumPurchase: 0,
    maxUsesTotal: 0,
    maxUsesPerCustomer: 1,
    freeShipping: false,
    stackable: false,
    priority: 1,
    applicableProducts: [],
    applicableCategories: [],
    excludedProducts: []
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (tenant?.id) {
      loadPromotions();
    }
  }, [tenant?.id]);

  const loadPromotions = async () => {
    if (!tenant?.id) return;
    
    try {
      setLoading(true);
      
      const promotionsQuery = query(
        collection(db, 'promotions'),
        where('tenantId', '==', tenant.id)
      );
      const snapshot = await getDocs(promotionsQuery);
      
      const promotionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate?.toDate() || new Date(),
        endDate: doc.data().endDate?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      } as Promotion));
      
      setPromotions(promotionsData);
    } catch (error) {
      console.error('Error loading promotions:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.description.trim()) errors.description = 'Description is required';
    if (formData.discountValue <= 0) errors.discountValue = 'Discount value must be greater than 0';
    if (formData.discountType === 'percentage' && formData.discountValue > 100) {
      errors.discountValue = 'Percentage discount cannot exceed 100%';
    }
    if (formData.type === 'coupon' && !formData.code.trim()) {
      errors.code = 'Coupon code is required';
    }
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      errors.endDate = 'End date must be after start date';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !tenant?.id) return;
    
    try {
      setLoading(true);
      
      const conditions: PromotionConditions = {
        dayOfWeek: formData.daysOfWeek.length === 7 ? undefined : formData.daysOfWeek,
        timeStart: formData.startTime !== '00:00' ? formData.startTime : undefined,
        timeEnd: formData.endTime !== '23:59' ? formData.endTime : undefined
      };
      
      const promotionData: any = {
        tenantId: tenant.id,
        name: formData.name,
        description: formData.description,
        type: formData.type,
        discountType: formData.discountType,
        discountValue: formData.discountValue,
        code: formData.type === 'coupon' ? formData.code.toUpperCase() : undefined,
        startDate: Timestamp.fromDate(new Date(formData.startDate)),
        endDate: Timestamp.fromDate(new Date(formData.endDate)),
        isActive: true,
        conditions,
        minimumPurchase: formData.minimumPurchase || undefined,
        maxUsesTotal: formData.maxUsesTotal || undefined,
        maxUsesPerCustomer: formData.maxUsesPerCustomer || undefined,
        freeShipping: formData.freeShipping,
        stackable: formData.stackable,
        priority: formData.priority,
        currentUses: editingPromotion?.currentUses || 0,
        updatedAt: serverTimestamp()
      };
      
      if (formData.applicableProducts.length > 0) {
        promotionData.applicableProducts = formData.applicableProducts;
      }
      if (formData.applicableCategories.length > 0) {
        promotionData.applicableCategories = formData.applicableCategories;
      }
      if (formData.excludedProducts.length > 0) {
        promotionData.excludedProducts = formData.excludedProducts;
      }
      
      if (editingPromotion) {
        await updateDoc(doc(db, 'promotions', editingPromotion.id), promotionData);
      } else {
        promotionData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'promotions'), promotionData);
      }
      
      await loadPromotions();
      resetForm();
    } catch (error) {
      console.error('Error saving promotion:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (promotionId: string, isActive: boolean) => {
    try {
      await updateDoc(doc(db, 'promotions', promotionId), {
        isActive,
        updatedAt: serverTimestamp()
      });
      
      setPromotions(promotions.map(p => 
        p.id === promotionId ? { ...p, isActive } : p
      ));
    } catch (error) {
      console.error('Error updating promotion status:', error);
    }
  };

  const handleDeletePromotion = async (promotionId: string) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return;
    
    try {
      await deleteDoc(doc(db, 'promotions', promotionId));
      setPromotions(promotions.filter(p => p.id !== promotionId));
    } catch (error) {
      console.error('Error deleting promotion:', error);
    }
  };

  const handleDuplicatePromotion = async (promotion: Promotion) => {
    const newPromotion = {
      ...promotion,
      name: `${promotion.name} (Copy)`,
      code: promotion.code ? `${promotion.code}-COPY` : undefined,
      currentUses: 0,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };
    
    setEditingPromotion(null);
    setFormData({
      name: newPromotion.name,
      description: newPromotion.description,
      type: newPromotion.type,
      discountType: newPromotion.discountType,
      discountValue: newPromotion.discountValue,
      code: newPromotion.code || '',
      startDate: format(newPromotion.startDate, 'yyyy-MM-dd'),
      endDate: format(newPromotion.endDate, 'yyyy-MM-dd'),
      startTime: newPromotion.conditions.timeStart || '00:00',
      endTime: newPromotion.conditions.timeEnd || '23:59',
      daysOfWeek: newPromotion.conditions.dayOfWeek || [0, 1, 2, 3, 4, 5, 6],
      minimumPurchase: newPromotion.minimumPurchase || 0,
      maxUsesTotal: newPromotion.maxUsesTotal || 0,
      maxUsesPerCustomer: newPromotion.maxUsesPerCustomer || 1,
      freeShipping: newPromotion.freeShipping || false,
      stackable: newPromotion.stackable || false,
      priority: newPromotion.priority || 1,
      applicableProducts: newPromotion.applicableProducts || [],
      applicableCategories: newPromotion.applicableCategories || [],
      excludedProducts: newPromotion.excludedProducts || []
    });
    setShowForm(true);
  };

  const loadPromotionStats = async (promotionId: string) => {
    // This would load actual stats from orders that used this promotion
    // For now, returning mock data
    setPromotionStats({
      totalRevenue: 15420.50,
      totalDiscount: 2313.08,
      ordersCount: 127,
      averageOrderValue: 121.42,
      conversionRate: 3.2
    });
  };

  const generatePromoCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'discount',
      discountType: 'percentage',
      discountValue: 10,
      code: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      startTime: '00:00',
      endTime: '23:59',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      minimumPurchase: 0,
      maxUsesTotal: 0,
      maxUsesPerCustomer: 1,
      freeShipping: false,
      stackable: false,
      priority: 1,
      applicableProducts: [],
      applicableCategories: [],
      excludedProducts: []
    });
    setFormErrors({});
    setShowForm(false);
    setEditingPromotion(null);
  };

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      name: promotion.name,
      description: promotion.description,
      type: promotion.type,
      discountType: promotion.discountType,
      discountValue: promotion.discountValue,
      code: promotion.code || '',
      startDate: format(promotion.startDate, 'yyyy-MM-dd'),
      endDate: format(promotion.endDate, 'yyyy-MM-dd'),
      startTime: promotion.conditions.timeStart || '00:00',
      endTime: promotion.conditions.timeEnd || '23:59',
      daysOfWeek: promotion.conditions.dayOfWeek || [0, 1, 2, 3, 4, 5, 6],
      minimumPurchase: promotion.minimumPurchase || 0,
      maxUsesTotal: promotion.maxUsesTotal || 0,
      maxUsesPerCustomer: promotion.maxUsesPerCustomer || 1,
      freeShipping: promotion.freeShipping || false,
      stackable: promotion.stackable || false,
      priority: promotion.priority || 1,
      applicableProducts: promotion.applicableProducts || [],
      applicableCategories: promotion.applicableCategories || [],
      excludedProducts: promotion.excludedProducts || []
    });
    setShowForm(true);
  };

  const getPromotionStatus = (promotion: Promotion) => {
    const now = new Date();
    
    if (!promotion.isActive) {
      return { status: 'inactive', color: 'text-gray-600 bg-gray-100' };
    } else if (isBefore(now, promotion.startDate)) {
      return { status: 'scheduled', color: 'text-blue-600 bg-blue-100' };
    } else if (isAfter(now, promotion.endDate)) {
      return { status: 'expired', color: 'text-red-600 bg-red-100' };
    } else if (promotion.maxUsesTotal && promotion.currentUses >= promotion.maxUsesTotal) {
      return { status: 'exhausted', color: 'text-orange-600 bg-orange-100' };
    } else {
      return { status: 'active', color: 'text-green-600 bg-green-100' };
    }
  };

  const getTypeIcon = (type: PromotionType) => {
    switch (type) {
      case 'discount': return <Percent className="w-4 h-4" />;
      case 'coupon': return <Tag className="w-4 h-4" />;
      case 'flash_sale': return <Zap className="w-4 h-4" />;
      case 'happy_hour': return <Clock className="w-4 h-4" />;
      case 'loyalty': return <Users className="w-4 h-4" />;
      case 'seasonal': return <Calendar className="w-4 h-4" />;
      case 'bundle': return <ShoppingBag className="w-4 h-4" />;
      default: return <Gift className="w-4 h-4" />;
    }
  };

  const exportPromotions = () => {
    const csv = [
      ['Name', 'Type', 'Discount', 'Code', 'Start Date', 'End Date', 'Status', 'Uses'].join(','),
      ...promotions.map(p => [
        p.name,
        p.type,
        p.discountType === 'percentage' ? `${p.discountValue}%` : `CHF ${p.discountValue}`,
        p.code || '-',
        format(p.startDate, 'yyyy-MM-dd'),
        format(p.endDate, 'yyyy-MM-dd'),
        getPromotionStatus(p).status,
        `${p.currentUses}/${p.maxUsesTotal || '∞'}`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promotions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredPromotions = promotions.filter(promotion => {
    const matchesSearch = promotion.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         promotion.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         promotion.code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || promotion.type === filterType;
    
    const status = getPromotionStatus(promotion).status;
    const matchesStatus = filterStatus === 'all' || filterStatus === status;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const activePromotions = promotions.filter(p => getPromotionStatus(p).status === 'active');
  const scheduledPromotions = promotions.filter(p => getPromotionStatus(p).status === 'scheduled');
  const totalDiscountGiven = promotions.reduce((sum, p) => sum + (p.currentUses * p.discountValue), 0);

  const canEdit = hasPermission('promotions:write');
  const canDelete = hasPermission('promotions:delete');

  const daysOfWeek = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' }
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promotions</h1>
          <p className="text-gray-600">Create and manage promotional offers</p>
        </div>
        
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={exportPromotions}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Promotion
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Promotions</p>
              <p className="text-2xl font-bold text-gray-900">{activePromotions.length}</p>
            </div>
            <Zap className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Scheduled</p>
              <p className="text-2xl font-bold text-gray-900">{scheduledPromotions.length}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Uses</p>
              <p className="text-2xl font-bold text-gray-900">
                {promotions.reduce((sum, p) => sum + p.currentUses, 0)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Discount</p>
              <p className="text-2xl font-bold text-gray-900">
                CHF {totalDiscountGiven.toFixed(2)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search promotions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="discount">Discount</option>
            <option value="coupon">Coupon</option>
            <option value="flash_sale">Flash Sale</option>
            <option value="happy_hour">Happy Hour</option>
            <option value="loyalty">Loyalty</option>
            <option value="seasonal">Seasonal</option>
            <option value="bundle">Bundle</option>
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="scheduled">Scheduled</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Promotions List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : filteredPromotions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Gift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No promotions found</p>
          {canEdit && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create First Promotion
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Promotion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Discount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uses
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
              {filteredPromotions.map(promotion => {
                const status = getPromotionStatus(promotion);
                
                return (
                  <tr key={promotion.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {promotion.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {promotion.code && (
                            <span className="inline-flex items-center gap-1">
                              <Code className="w-3 h-3" />
                              {promotion.code}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(promotion.type)}
                        <span className="text-sm text-gray-900 capitalize">
                          {promotion.type.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {promotion.discountType === 'percentage' ? (
                          <span className="font-medium text-gray-900">{promotion.discountValue}%</span>
                        ) : promotion.discountType === 'fixed' ? (
                          <span className="font-medium text-gray-900">CHF {promotion.discountValue}</span>
                        ) : promotion.discountType === 'bogo' ? (
                          <span className="font-medium text-gray-900">Buy 1 Get 1</span>
                        ) : (
                          <span className="font-medium text-gray-900">Bundle</span>
                        )}
                        {promotion.minimumPurchase && (
                          <div className="text-xs text-gray-500">
                            Min: CHF {promotion.minimumPurchase}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="text-gray-900">
                          {format(promotion.startDate, 'MMM dd')} - {format(promotion.endDate, 'MMM dd')}
                        </div>
                        {promotion.conditions.timeStart && promotion.conditions.timeEnd && (
                          <div className="text-xs text-gray-500">
                            {promotion.conditions.timeStart} - {promotion.conditions.timeEnd}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {promotion.currentUses} / {promotion.maxUsesTotal || '∞'}
                        </div>
                        {promotion.maxUsesTotal && (
                          <div className="mt-1">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ 
                                  width: `${(promotion.currentUses / promotion.maxUsesTotal) * 100}%` 
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          {status.status}
                        </span>
                        <button
                          onClick={() => handleToggleActive(promotion.id, !promotion.isActive)}
                          className="text-gray-400 hover:text-gray-600"
                          disabled={!canEdit}
                        >
                          {promotion.isActive ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedPromotion(promotion);
                            loadPromotionStats(promotion.id);
                            setShowStats(true);
                          }}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <BarChart className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <>
                            <button
                              onClick={() => handleEdit(promotion)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDuplicatePromotion(promotion)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeletePromotion(promotion.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Promotion Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full my-8">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingPromotion ? 'Edit Promotion' : 'Create New Promotion'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-4">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Promotion Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.name ? 'border-red-500' : ''
                      }`}
                    />
                    {formErrors.name && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as PromotionType })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="discount">General Discount</option>
                      <option value="coupon">Coupon Code</option>
                      <option value="flash_sale">Flash Sale</option>
                      <option value="happy_hour">Happy Hour</option>
                      <option value="loyalty">Loyalty Reward</option>
                      <option value="seasonal">Seasonal Offer</option>
                      <option value="bundle">Bundle Deal</option>
                    </select>
                  </div>
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.description ? 'border-red-500' : ''
                    }`}
                  />
                  {formErrors.description && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>
                  )}
                </div>
              </div>

              {/* Discount Configuration */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-4">Discount Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Type *
                    </label>
                    <select
                      value={formData.discountType}
                      onChange={(e) => setFormData({ ...formData, discountType: e.target.value as any })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                      <option value="bogo">Buy One Get One</option>
                      <option value="bundle">Bundle</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount Value *
                    </label>
                    <input
                      type="number"
                      step={formData.discountType === 'percentage' ? '1' : '0.5'}
                      value={formData.discountValue}
                      onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.discountValue ? 'border-red-500' : ''
                      }`}
                    />
                    {formErrors.discountValue && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.discountValue}</p>
                    )}
                  </div>
                  
                  {formData.type === 'coupon' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Coupon Code *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                          className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            formErrors.code ? 'border-red-500' : ''
                          }`}
                        />
                        <button
                          type="button"
                          onClick={generatePromoCode}
                          className="px-3 py-2 border rounded-lg hover:bg-gray-50"
                        >
                          Generate
                        </button>
                      </div>
                      {formErrors.code && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.code}</p>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Purchase
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={formData.minimumPurchase}
                      onChange={(e) => setFormData({ ...formData, minimumPurchase: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <input
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Higher priority promotions apply first</p>
                  </div>
                  
                  <div className="flex items-end gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.freeShipping}
                        onChange={(e) => setFormData({ ...formData, freeShipping: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Free Shipping</span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.stackable}
                        onChange={(e) => setFormData({ ...formData, stackable: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Stackable</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Schedule */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-4">Schedule</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.endDate ? 'border-red-500' : ''
                      }`}
                    />
                    {formErrors.endDate && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.endDate}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time Range
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Days of Week
                    </label>
                    <div className="flex gap-2">
                      {daysOfWeek.map(day => (
                        <label key={day.value} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.daysOfWeek.includes(day.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ 
                                  ...formData, 
                                  daysOfWeek: [...formData.daysOfWeek, day.value] 
                                });
                              } else {
                                setFormData({ 
                                  ...formData, 
                                  daysOfWeek: formData.daysOfWeek.filter(d => d !== day.value)
                                });
                              }
                            }}
                            className="sr-only"
                          />
                          <span className={`px-3 py-1 text-sm rounded cursor-pointer ${
                            formData.daysOfWeek.includes(day.value)
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {day.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Usage Limits */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-4">Usage Limits</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Maximum Total Uses
                    </label>
                    <input
                      type="number"
                      value={formData.maxUsesTotal}
                      onChange={(e) => setFormData({ ...formData, maxUsesTotal: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0 for unlimited"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Maximum Uses Per Customer
                    </label>
                    <input
                      type="number"
                      value={formData.maxUsesPerCustomer}
                      onChange={(e) => setFormData({ ...formData, maxUsesPerCustomer: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : (editingPromotion ? 'Update' : 'Create')} Promotion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStats && selectedPromotion && promotionStats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Promotion Statistics
                </h3>
                <p className="text-sm text-gray-500">{selectedPromotion.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowStats(false);
                  setSelectedPromotion(null);
                  setPromotionStats(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  CHF {promotionStats.totalRevenue.toFixed(2)}
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Total Discount Given</p>
                <p className="text-2xl font-bold text-orange-600">
                  CHF {promotionStats.totalDiscount.toFixed(2)}
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Orders</p>
                <p className="text-2xl font-bold text-gray-900">
                  {promotionStats.ordersCount}
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Average Order Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  CHF {promotionStats.averageOrderValue.toFixed(2)}
                </p>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">Conversion Rate</p>
                  <p className="text-xs text-blue-700">
                    Customers who used this promotion
                  </p>
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  {promotionStats.conversionRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
