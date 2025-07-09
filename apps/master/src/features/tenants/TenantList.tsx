import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Eye,
  Ban,
  Check,
  X,
  CreditCard,
  Users,
  Calendar,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  Download,
  Mail,
  Phone,
  Globe,
  MapPin
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  contact: {
    name: string;
    email: string;
    phone: string;
    website?: string;
  };
  location: {
    address: string;
    city: string;
    canton: string;
    postalCode: string;
    country: string;
  };
  subscription: {
    plan: 'starter' | 'professional' | 'enterprise';
    status: 'active' | 'trial' | 'suspended' | 'cancelled';
    startDate: Date;
    endDate?: Date;
    trialEndsAt?: Date;
    seats: number;
    monthlyOrderLimit?: number;
    currentMonthOrders: number;
    mrr: number; // Monthly Recurring Revenue
  };
  metrics: {
    totalOrders: number;
    totalRevenue: number;
    activeUsers: number;
    lastOrderDate?: Date;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type FilterStatus = 'all' | 'active' | 'trial' | 'suspended' | 'cancelled';
type FilterPlan = 'all' | 'starter' | 'professional' | 'enterprise';

export function TenantList() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterPlan, setFilterPlan] = useState<FilterPlan>('all');
  const [showNewTenantForm, setShowNewTenantForm] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setLoading(true);
      // In a real app, this would be an API call
      // For now, using mock data
      const mockTenants: Tenant[] = [
        {
          id: '1',
          name: 'Restaurant Zürich',
          slug: 'restaurant-zurich',
          logo: 'https://via.placeholder.com/100',
          contact: {
            name: 'Hans Müller',
            email: 'hans@restaurant-zurich.ch',
            phone: '+41 44 123 45 67',
            website: 'https://restaurant-zurich.ch'
          },
          location: {
            address: 'Bahnhofstrasse 1',
            city: 'Zürich',
            canton: 'ZH',
            postalCode: '8001',
            country: 'CH'
          },
          subscription: {
            plan: 'professional',
            status: 'active',
            startDate: new Date('2024-01-01'),
            seats: 10,
            monthlyOrderLimit: 5000,
            currentMonthOrders: 3421,
            mrr: 299
          },
          metrics: {
            totalOrders: 12543,
            totalRevenue: 523450.50,
            activeUsers: 8,
            lastOrderDate: new Date()
          },
          isActive: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date()
        },
        {
          id: '2',
          name: 'Café Basel',
          slug: 'cafe-basel',
          contact: {
            name: 'Maria Schmidt',
            email: 'maria@cafe-basel.ch',
            phone: '+41 61 234 56 78'
          },
          location: {
            address: 'Marktplatz 5',
            city: 'Basel',
            canton: 'BS',
            postalCode: '4001',
            country: 'CH'
          },
          subscription: {
            plan: 'starter',
            status: 'trial',
            startDate: new Date('2024-12-01'),
            trialEndsAt: new Date('2025-01-01'),
            seats: 3,
            currentMonthOrders: 234,
            mrr: 0
          },
          metrics: {
            totalOrders: 234,
            totalRevenue: 8540.00,
            activeUsers: 2
          },
          isActive: true,
          createdAt: new Date('2024-12-01'),
          updatedAt: new Date()
        }
      ];
      
      setTenants(mockTenants);
    } catch (error) {
      console.error('Error loading tenants:', error);
      toast.error('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendTenant = async (tenantId: string) => {
    if (!confirm('Are you sure you want to suspend this tenant?')) return;
    
    try {
      // API call to suspend tenant
      toast.success('Tenant suspended successfully');
      await loadTenants();
    } catch (error) {
      toast.error('Failed to suspend tenant');
    }
  };

  const handleActivateTenant = async (tenantId: string) => {
    try {
      // API call to activate tenant
      toast.success('Tenant activated successfully');
      await loadTenants();
    } catch (error) {
      toast.error('Failed to activate tenant');
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    if (!confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) return;
    
    try {
      // API call to delete tenant
      toast.success('Tenant deleted successfully');
      await loadTenants();
    } catch (error) {
      toast.error('Failed to delete tenant');
    }
  };

  const exportTenants = () => {
    const csv = [
      ['Name', 'Plan', 'Status', 'MRR', 'Orders', 'Revenue', 'Created'].join(','),
      ...filteredTenants.map(t => [
        t.name,
        t.subscription.plan,
        t.subscription.status,
        t.subscription.mrr,
        t.metrics.totalOrders,
        t.metrics.totalRevenue,
        format(t.createdAt, 'yyyy-MM-dd')
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tenants-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusColor = (status: Tenant['subscription']['status']) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'trial': return 'text-blue-600 bg-blue-100';
      case 'suspended': return 'text-orange-600 bg-orange-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPlanColor = (plan: Tenant['subscription']['plan']) => {
    switch (plan) {
      case 'starter': return 'text-gray-600 bg-gray-100';
      case 'professional': return 'text-blue-600 bg-blue-100';
      case 'enterprise': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.slug.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || tenant.subscription.status === filterStatus;
    const matchesPlan = filterPlan === 'all' || tenant.subscription.plan === filterPlan;
    
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const totalMRR = tenants
    .filter(t => t.subscription.status === 'active')
    .reduce((sum, t) => sum + t.subscription.mrr, 0);
  
  const activeTenants = tenants.filter(t => t.subscription.status === 'active').length;
  const trialTenants = tenants.filter(t => t.subscription.status === 'trial').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="text-gray-600">Manage platform tenants and subscriptions</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={exportTenants}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => setShowNewTenantForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Tenant
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Tenants</p>
              <p className="text-2xl font-bold text-gray-900">{tenants.length}</p>
            </div>
            <Building2 className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">{activeTenants}</p>
            </div>
            <Check className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Trial</p>
              <p className="text-2xl font-bold text-gray-900">{trialTenants}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total MRR</p>
              <p className="text-2xl font-bold text-gray-900">
                CHF {totalMRR.toFixed(2)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search tenants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value as FilterPlan)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Plans</option>
            <option value="starter">Starter</option>
            <option value="professional">Professional</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Tenants Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No tenants found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan & Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTenants.map(tenant => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {tenant.logo ? (
                        <img
                          className="h-10 w-10 rounded-lg object-cover"
                          src={tenant.logo}
                          alt={tenant.name}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {tenant.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {tenant.slug}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlanColor(tenant.subscription.plan)}`}>
                        {tenant.subscription.plan}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tenant.subscription.status)}`}>
                        {tenant.subscription.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="text-gray-900">
                        {tenant.metrics.totalOrders.toLocaleString()} orders
                      </div>
                      <div className="text-gray-500">
                        {tenant.metrics.activeUsers} users
                      </div>
                      {tenant.subscription.monthlyOrderLimit && (
                        <div className="mt-1">
                          <div className="text-xs text-gray-500">
                            This month: {tenant.subscription.currentMonthOrders} / {tenant.subscription.monthlyOrderLimit}
                          </div>
                          <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-1">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full"
                              style={{ 
                                width: `${(tenant.subscription.currentMonthOrders / tenant.subscription.monthlyOrderLimit) * 100}%` 
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">
                        CHF {tenant.metrics.totalRevenue.toLocaleString()}
                      </div>
                      <div className="text-gray-500">
                        MRR: CHF {tenant.subscription.mrr}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="text-gray-900">{tenant.contact.name}</div>
                      <div className="text-gray-500">{tenant.contact.email}</div>
                      <div className="text-gray-500">{tenant.contact.phone}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/tenants/${tenant.id}`)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setShowActionMenu(showActionMenu === tenant.id ? null : tenant.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        
                        {showActionMenu === tenant.id && (
                          <div className="absolute right-0 z-10 mt-2 w-48 bg-white border rounded-lg shadow-lg">
                            <button
                              onClick={() => navigate(`/tenants/${tenant.id}/edit`)}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Edit Details
                            </button>
                            {tenant.subscription.status === 'active' ? (
                              <button
                                onClick={() => handleSuspendTenant(tenant.id)}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 text-orange-600"
                              >
                                <Ban className="w-4 h-4" />
                                Suspend
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActivateTenant(tenant.id)}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 text-green-600"
                              >
                                <Check className="w-4 h-4" />
                                Activate
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteTenant(tenant.id)}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600"
                            >
                              <X className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
