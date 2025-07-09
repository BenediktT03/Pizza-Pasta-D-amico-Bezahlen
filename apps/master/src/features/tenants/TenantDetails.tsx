import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Users,
  Package,
  TrendingUp,
  Calendar,
  Clock,
  MapPin,
  Mail,
  Phone,
  Globe,
  Edit,
  Ban,
  Check,
  AlertTriangle,
  Download,
  Activity,
  BarChart3,
  DollarSign,
  ShoppingCart,
  User,
  Settings,
  Shield,
  Database,
  Zap
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';

interface TenantDetails {
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
    usedSeats: number;
    monthlyOrderLimit?: number;
    currentMonthOrders: number;
    mrr: number;
    nextBillingDate?: Date;
    paymentMethod?: string;
  };
  settings: {
    orderPrefix: string;
    timezone: string;
    currency: string;
    language: string;
    autoAcceptOrders: boolean;
    emailNotifications: boolean;
    smsNotifications: boolean;
  };
  features: {
    multiLocation: boolean;
    voiceOrdering: boolean;
    advancedAnalytics: boolean;
    customBranding: boolean;
    apiAccess: boolean;
    whiteLabel: boolean;
  };
  metrics: {
    totalOrders: number;
    totalRevenue: number;
    activeUsers: number;
    totalProducts: number;
    averageOrderValue: number;
    conversionRate: number;
    lastOrderDate?: Date;
    monthlyGrowth: number;
  };
  usage: {
    storage: {
      used: number; // in MB
      limit: number;
    };
    apiCalls: {
      used: number;
      limit: number;
      resetDate: Date;
    };
  };
  billing: {
    invoices: Invoice[];
    upcomingInvoice?: {
      amount: number;
      dueDate: Date;
      items: string[];
    };
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  dueDate: Date;
  paidDate?: Date;
  downloadUrl: string;
}

interface ActivityLog {
  id: string;
  type: 'order' | 'user' | 'setting' | 'payment' | 'support';
  action: string;
  description: string;
  user?: string;
  timestamp: Date;
  metadata?: any;
}

type TabType = 'overview' | 'billing' | 'usage' | 'settings' | 'activity';

export function TenantDetails() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  
  const [tenant, setTenant] = useState<TenantDetails | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  useEffect(() => {
    if (tenantId) {
      loadTenantDetails();
      loadActivityLog();
    }
  }, [tenantId]);

  const loadTenantDetails = async () => {
    try {
      setLoading(true);
      // In a real app, this would be an API call
      const mockTenant: TenantDetails = {
        id: tenantId!,
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
          usedSeats: 8,
          monthlyOrderLimit: 5000,
          currentMonthOrders: 3421,
          mrr: 299,
          nextBillingDate: new Date('2025-02-01'),
          paymentMethod: 'Credit Card (•••• 4242)'
        },
        settings: {
          orderPrefix: 'ORD',
          timezone: 'Europe/Zurich',
          currency: 'CHF',
          language: 'de',
          autoAcceptOrders: true,
          emailNotifications: true,
          smsNotifications: false
        },
        features: {
          multiLocation: true,
          voiceOrdering: true,
          advancedAnalytics: true,
          customBranding: true,
          apiAccess: false,
          whiteLabel: false
        },
        metrics: {
          totalOrders: 12543,
          totalRevenue: 523450.50,
          activeUsers: 8,
          totalProducts: 156,
          averageOrderValue: 41.73,
          conversionRate: 3.2,
          lastOrderDate: new Date(),
          monthlyGrowth: 12.5
        },
        usage: {
          storage: {
            used: 2048,
            limit: 5120
          },
          apiCalls: {
            used: 45320,
            limit: 100000,
            resetDate: new Date('2025-02-01')
          }
        },
        billing: {
          invoices: [
            {
              id: '1',
              invoiceNumber: 'INV-2025-001',
              amount: 299,
              status: 'paid',
              dueDate: new Date('2025-01-01'),
              paidDate: new Date('2025-01-01'),
              downloadUrl: '#'
            }
          ],
          upcomingInvoice: {
            amount: 299,
            dueDate: new Date('2025-02-01'),
            items: ['Professional Plan (Monthly)', '8 Active Users']
          }
        },
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date()
      };
      
      setTenant(mockTenant);
    } catch (error) {
      console.error('Error loading tenant details:', error);
      toast.error('Failed to load tenant details');
    } finally {
      setLoading(false);
    }
  };

  const loadActivityLog = async () => {
    // Mock activity log
    const mockActivities: ActivityLog[] = [
      {
        id: '1',
        type: 'order',
        action: 'completed',
        description: 'Order #12543 completed',
        user: 'System',
        timestamp: new Date(),
        metadata: { orderId: '12543', amount: 45.50 }
      },
      {
        id: '2',
        type: 'user',
        action: 'login',
        description: 'Admin user logged in',
        user: 'Hans Müller',
        timestamp: subDays(new Date(), 1)
      },
      {
        id: '3',
        type: 'setting',
        action: 'updated',
        description: 'Updated notification settings',
        user: 'Hans Müller',
        timestamp: subDays(new Date(), 2)
      }
    ];
    
    setActivities(mockActivities);
  };

  const handleSuspendTenant = async () => {
    if (!suspendReason.trim()) {
      toast.error('Please provide a reason for suspension');
      return;
    }
    
    try {
      // API call to suspend tenant
      toast.success('Tenant suspended successfully');
      setShowSuspendModal(false);
      setSuspendReason('');
      await loadTenantDetails();
    } catch (error) {
      toast.error('Failed to suspend tenant');
    }
  };

  const handleActivateTenant = async () => {
    try {
      // API call to activate tenant
      toast.success('Tenant activated successfully');
      await loadTenantDetails();
    } catch (error) {
      toast.error('Failed to activate tenant');
    }
  };

  const handleUpgradePlan = async (newPlan: string) => {
    try {
      // API call to upgrade plan
      toast.success(`Plan upgraded to ${newPlan}`);
      await loadTenantDetails();
    } catch (error) {
      toast.error('Failed to upgrade plan');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'trial': return 'text-blue-600 bg-blue-100';
      case 'suspended': return 'text-orange-600 bg-orange-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'paid': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'overdue': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getActivityIcon = (type: ActivityLog['type']) => {
    switch (type) {
      case 'order': return <ShoppingCart className="w-4 h-4" />;
      case 'user': return <User className="w-4 h-4" />;
      case 'setting': return <Settings className="w-4 h-4" />;
      case 'payment': return <CreditCard className="w-4 h-4" />;
      case 'support': return <Shield className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  if (loading || !tenant) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/tenants')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-4">
            {tenant.logo ? (
              <img
                className="h-12 w-12 rounded-lg object-cover"
                src={tenant.logo}
                alt={tenant.name}
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-gray-500" />
              </div>
            )}
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>{tenant.slug}</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tenant.subscription.status)}`}>
                  {tenant.subscription.status}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/tenants/${tenant.id}/edit`)}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
          {tenant.subscription.status === 'active' ? (
            <button
              onClick={() => setShowSuspendModal(true)}
              className="px-4 py-2 border border-orange-600 text-orange-600 rounded-lg hover:bg-orange-50 flex items-center gap-2"
            >
              <Ban className="w-4 h-4" />
              Suspend
            </button>
          ) : (
            <button
              onClick={handleActivateTenant}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Activate
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex -mb-px space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'billing', label: 'Billing', icon: CreditCard },
            { id: 'usage', label: 'Usage', icon: Activity },
            { id: 'settings', label: 'Settings', icon: Settings },
            { id: 'activity', label: 'Activity', icon: Clock }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
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

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    CHF {tenant.metrics.totalRevenue.toLocaleString()}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    +{tenant.metrics.monthlyGrowth}% this month
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {tenant.metrics.totalOrders.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    AOV: CHF {tenant.metrics.averageOrderValue.toFixed(2)}
                  </p>
                </div>
                <ShoppingCart className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {tenant.subscription.usedSeats} / {tenant.subscription.seats}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full"
                      style={{ 
                        width: `${(tenant.subscription.usedSeats / tenant.subscription.seats) * 100}%` 
                      }}
                    />
                  </div>
                </div>
                <Users className="w-8 h-8 text-purple-500" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Products</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {tenant.metrics.totalProducts}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Conversion: {tenant.metrics.conversionRate}%
                  </p>
                </div>
                <Package className="w-8 h-8 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Contact & Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Contact Person</p>
                    <p className="font-medium">{tenant.contact.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <a href={`mailto:${tenant.contact.email}`} className="font-medium text-blue-600 hover:text-blue-700">
                      {tenant.contact.email}
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <a href={`tel:${tenant.contact.phone}`} className="font-medium text-blue-600 hover:text-blue-700">
                      {tenant.contact.phone}
                    </a>
                  </div>
                </div>
                {tenant.contact.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Website</p>
                      <a href={tenant.contact.website} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:text-blue-700">
                        {tenant.contact.website}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="font-medium">
                      {tenant.location.address}<br />
                      {tenant.location.postalCode} {tenant.location.city}<br />
                      {tenant.location.canton}, {tenant.location.country}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Enabled Features</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(tenant.features).map(([feature, enabled]) => (
                <div key={feature} className="flex items-center gap-3">
                  {enabled ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <X className="w-5 h-5 text-gray-300" />
                  )}
                  <span className={`text-sm ${enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                    {feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* Subscription Details */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Subscription</h3>
              <button className="text-sm text-blue-600 hover:text-blue-700">
                Change Plan
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Current Plan</p>
                <p className="text-xl font-semibold text-gray-900 capitalize">
                  {tenant.subscription.plan}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  CHF {tenant.subscription.mrr}/month
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-1">Next Billing Date</p>
                <p className="text-xl font-semibold text-gray-900">
                  {tenant.subscription.nextBillingDate 
                    ? format(tenant.subscription.nextBillingDate, 'MMM dd, yyyy')
                    : '-'
                  }
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {tenant.subscription.paymentMethod}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-1">Monthly Orders</p>
                <p className="text-xl font-semibold text-gray-900">
                  {tenant.subscription.currentMonthOrders} / {tenant.subscription.monthlyOrderLimit || '∞'}
                </p>
                {tenant.subscription.monthlyOrderLimit && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ 
                        width: `${(tenant.subscription.currentMonthOrders / tenant.subscription.monthlyOrderLimit) * 100}%` 
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Upcoming Invoice */}
          {tenant.billing.upcomingInvoice && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Invoice</h3>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    CHF {tenant.billing.upcomingInvoice.amount.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">
                    Due on {format(tenant.billing.upcomingInvoice.dueDate, 'MMM dd, yyyy')}
                  </p>
                </div>
                <div className="text-right">
                  {tenant.billing.upcomingInvoice.items.map((item, index) => (
                    <p key={index} className="text-sm text-gray-600">{item}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Invoice History */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Invoice History</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tenant.billing.invoices.map(invoice => (
                    <tr key={invoice.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        CHF {invoice.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {format(invoice.dueDate, 'MMM dd, yyyy')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <a
                          href={invoice.downloadUrl}
                          className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'usage' && (
        <div className="space-y-6">
          {/* Storage Usage */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Storage Usage</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">
                    {(tenant.usage.storage.used / 1024).toFixed(2)} GB / {(tenant.usage.storage.limit / 1024).toFixed(2)} GB
                  </span>
                  <span className="text-sm text-gray-600">
                    {((tenant.usage.storage.used / tenant.usage.storage.limit) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-500 h-3 rounded-full"
                    style={{ 
                      width: `${(tenant.usage.storage.used / tenant.usage.storage.limit) * 100}%` 
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Database className="w-4 h-4" />
                <span>Includes images, documents, and database storage</span>
              </div>
            </div>
          </div>

          {/* API Usage */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">API Usage</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">
                    {tenant.usage.apiCalls.used.toLocaleString()} / {tenant.usage.apiCalls.limit.toLocaleString()} calls
                  </span>
                  <span className="text-sm text-gray-600">
                    {((tenant.usage.apiCalls.used / tenant.usage.apiCalls.limit) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-500 h-3 rounded-full"
                    style={{ 
                      width: `${(tenant.usage.apiCalls.used / tenant.usage.apiCalls.limit) * 100}%` 
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  <span>Resets on {format(tenant.usage.apiCalls.resetDate, 'MMM dd, yyyy')}</span>
                </div>
                <span>{Math.ceil((tenant.usage.apiCalls.resetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining</span>
              </div>
            </div>
          </div>

          {/* Order Limits */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Order Limit</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">
                    {tenant.subscription.currentMonthOrders} / {tenant.subscription.monthlyOrderLimit || '∞'} orders
                  </span>
                  {tenant.subscription.monthlyOrderLimit && (
                    <span className="text-sm text-gray-600">
                      {((tenant.subscription.currentMonthOrders / tenant.subscription.monthlyOrderLimit) * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
                {tenant.subscription.monthlyOrderLimit ? (
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        (tenant.subscription.currentMonthOrders / tenant.subscription.monthlyOrderLimit) > 0.9
                          ? 'bg-orange-500'
                          : 'bg-purple-500'
                      }`}
                      style={{ 
                        width: `${Math.min((tenant.subscription.currentMonthOrders / tenant.subscription.monthlyOrderLimit) * 100, 100)}%` 
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Unlimited orders on this plan</p>
                )}
              </div>
              {tenant.subscription.monthlyOrderLimit && 
               tenant.subscription.currentMonthOrders >= tenant.subscription.monthlyOrderLimit * 0.9 && (
                <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <p className="text-sm text-orange-800">
                    Approaching monthly order limit. Consider upgrading your plan.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* General Settings */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order Prefix
                </label>
                <p className="text-sm text-gray-900">{tenant.settings.orderPrefix}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone
                </label>
                <p className="text-sm text-gray-900">{tenant.settings.timezone}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <p className="text-sm text-gray-900">{tenant.settings.currency}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language
                </label>
                <p className="text-sm text-gray-900 uppercase">{tenant.settings.language}</p>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Auto-accept Orders</p>
                  <p className="text-sm text-gray-500">Automatically accept incoming orders</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  tenant.settings.autoAcceptOrders ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {tenant.settings.autoAcceptOrders ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Email Notifications</p>
                  <p className="text-sm text-gray-500">Receive order notifications via email</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  tenant.settings.emailNotifications ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {tenant.settings.emailNotifications ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">SMS Notifications</p>
                  <p className="text-sm text-gray-500">Receive order notifications via SMS</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  tenant.settings.smsNotifications ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {tenant.settings.smsNotifications ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {activities.map(activity => (
                <div key={activity.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${
                      activity.type === 'order' ? 'bg-blue-100' :
                      activity.type === 'user' ? 'bg-purple-100' :
                      activity.type === 'setting' ? 'bg-gray-100' :
                      activity.type === 'payment' ? 'bg-green-100' :
                      'bg-orange-100'
                    }`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.description}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {activity.user} • {format(activity.timestamp, 'MMM dd, yyyy HH:mm')}
                      </p>
                      {activity.metadata && (
                        <div className="mt-2 text-xs text-gray-500">
                          {Object.entries(activity.metadata).map(([key, value]) => (
                            <span key={key} className="mr-4">
                              {key}: {value?.toString()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Suspend Tenant
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Suspending this tenant will immediately block access to their account. 
              They will not be able to process orders or access the admin panel.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for suspension
              </label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Payment issues, Terms violation, etc."
              />
            </div>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowSuspendModal(false);
                  setSuspendReason('');
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspendTenant}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Suspend Tenant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
