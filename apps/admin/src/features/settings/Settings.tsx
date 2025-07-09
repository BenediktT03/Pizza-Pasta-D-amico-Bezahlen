import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Store,
  CreditCard,
  Clock,
  Globe,
  Bell,
  Shield,
  Palette,
  Receipt,
  Truck,
  Save,
  ChevronRight,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  Percent,
  Calendar,
  Users,
  AlertCircle,
  Check,
  X,
  Plus,
  Trash2
} from 'lucide-react';
import { useTenantStore } from '../../stores/tenant.store';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';

type SettingsTab = 'general' | 'business' | 'payment' | 'delivery' | 'notifications' | 'security' | 'appearance' | 'advanced';

interface TimeSlot {
  start: string;
  end: string;
}

interface DaySchedule {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  breaks: TimeSlot[];
}

export function Settings() {
  const { user, hasPermission } = useAuth();
  const { 
    tenant, 
    loading: tenantLoading,
    updateTenantSettings,
    updateBusinessHours,
    updateTenantContact,
    updateTenantLocation,
    updateTenantBranding,
    togglePaymentMethod
  } = useTenantStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form states
  const [generalSettings, setGeneralSettings] = useState({
    name: '',
    email: '',
    phone: '',
    website: '',
    supportEmail: '',
    whatsapp: ''
  });

  const [locationSettings, setLocationSettings] = useState({
    address: '',
    city: '',
    canton: '',
    postalCode: '',
    country: 'CH'
  });

  const [businessSettings, setBusinessSettings] = useState({
    currency: 'CHF',
    timezone: 'Europe/Zurich',
    language: 'de',
    dateFormat: 'dd.MM.yyyy',
    orderPrefix: 'ORD',
    taxRate: 7.7,
    serviceFee: 0,
    minimumOrder: 0,
    preparationTime: 15,
    autoAcceptOrders: false,
    enableTableOrdering: true,
    enableDelivery: true,
    enablePickup: true,
    enableReservations: false,
    maxReservationSize: 10,
    reservationDuration: 120
  });

  const [deliverySettings, setDeliverySettings] = useState({
    deliveryRadius: 5,
    deliveryFee: 5,
    freeDeliveryThreshold: 50,
    estimatedDeliveryTime: 30
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    orderNotificationEmail: '',
    lowStockAlerts: true,
    dailyReports: false,
    weeklyReports: true
  });

  const [brandingSettings, setBrandingSettings] = useState({
    primaryColor: '#3B82F6',
    secondaryColor: '#1F2937',
    accentColor: '#F59E0B',
    logo: ''
  });

  const [businessHours, setBusinessHours] = useState<Record<string, DaySchedule>>({
    monday: { isOpen: true, openTime: '11:00', closeTime: '22:00', breaks: [] },
    tuesday: { isOpen: true, openTime: '11:00', closeTime: '22:00', breaks: [] },
    wednesday: { isOpen: true, openTime: '11:00', closeTime: '22:00', breaks: [] },
    thursday: { isOpen: true, openTime: '11:00', closeTime: '22:00', breaks: [] },
    friday: { isOpen: true, openTime: '11:00', closeTime: '23:00', breaks: [] },
    saturday: { isOpen: true, openTime: '11:00', closeTime: '23:00', breaks: [] },
    sunday: { isOpen: false, openTime: '11:00', closeTime: '22:00', breaks: [] }
  });

  useEffect(() => {
    if (tenant) {
      // Initialize form states with tenant data
      setGeneralSettings({
        name: tenant.name || '',
        email: tenant.contact.email || '',
        phone: tenant.contact.phone || '',
        website: tenant.contact.website || '',
        supportEmail: tenant.contact.supportEmail || '',
        whatsapp: tenant.contact.whatsapp || ''
      });

      setLocationSettings({
        address: tenant.location.address || '',
        city: tenant.location.city || '',
        canton: tenant.location.canton || '',
        postalCode: tenant.location.postalCode || '',
        country: tenant.location.country || 'CH'
      });

      setBusinessSettings({
        currency: tenant.settings.currency || 'CHF',
        timezone: tenant.settings.timezone || 'Europe/Zurich',
        language: tenant.settings.language || 'de',
        dateFormat: tenant.settings.dateFormat || 'dd.MM.yyyy',
        orderPrefix: tenant.settings.orderPrefix || 'ORD',
        taxRate: tenant.settings.taxRate || 7.7,
        serviceFee: tenant.settings.serviceFee || 0,
        minimumOrder: tenant.settings.minimumOrder || 0,
        preparationTime: tenant.settings.preparationTime || 15,
        autoAcceptOrders: tenant.settings.autoAcceptOrders || false,
        enableTableOrdering: tenant.settings.enableTableOrdering || true,
        enableDelivery: tenant.settings.enableDelivery || true,
        enablePickup: tenant.settings.enablePickup || true,
        enableReservations: tenant.settings.enableReservations || false,
        maxReservationSize: tenant.settings.maxReservationSize || 10,
        reservationDuration: tenant.settings.reservationDuration || 120
      });

      setDeliverySettings({
        deliveryRadius: tenant.settings.deliveryRadius || 5,
        deliveryFee: tenant.settings.serviceFee || 5,
        freeDeliveryThreshold: 50,
        estimatedDeliveryTime: 30
      });

      setNotificationSettings({
        emailNotifications: tenant.settings.emailNotifications !== false,
        smsNotifications: tenant.settings.smsNotifications || false,
        orderNotificationEmail: tenant.settings.orderNotificationEmail || '',
        lowStockAlerts: true,
        dailyReports: false,
        weeklyReports: true
      });

      setBrandingSettings({
        primaryColor: tenant.primaryColor || '#3B82F6',
        secondaryColor: tenant.secondaryColor || '#1F2937',
        accentColor: tenant.accentColor || '#F59E0B',
        logo: tenant.logo || ''
      });

      if (tenant.businessHours) {
        setBusinessHours(tenant.businessHours as any);
      }
    }
  }, [tenant]);

  const handleSaveGeneral = async () => {
    try {
      setLoading(true);
      setSaveStatus('saving');
      
      await updateTenantBranding({
        name: generalSettings.name
      });
      
      await updateTenantContact({
        email: generalSettings.email,
        phone: generalSettings.phone,
        website: generalSettings.website,
        supportEmail: generalSettings.supportEmail,
        whatsapp: generalSettings.whatsapp
      });
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving general settings:', error);
      setSaveStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLocation = async () => {
    try {
      setLoading(true);
      setSaveStatus('saving');
      
      await updateTenantLocation(locationSettings);
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving location settings:', error);
      setSaveStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBusinessSettings = async () => {
    try {
      setLoading(true);
      setSaveStatus('saving');
      
      await updateTenantSettings(businessSettings);
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving business settings:', error);
      setSaveStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBusinessHours = async () => {
    try {
      setLoading(true);
      setSaveStatus('saving');
      
      await updateBusinessHours(businessHours as any);
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving business hours:', error);
      setSaveStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBranding = async () => {
    try {
      setLoading(true);
      setSaveStatus('saving');
      
      await updateTenantBranding({
        primaryColor: brandingSettings.primaryColor,
        secondaryColor: brandingSettings.secondaryColor,
        accentColor: brandingSettings.accentColor,
        logo: brandingSettings.logo
      });
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving branding settings:', error);
      setSaveStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const addBreakTime = (day: string) => {
    const newBreak: TimeSlot = { start: '14:00', end: '16:00' };
    setBusinessHours({
      ...businessHours,
      [day]: {
        ...businessHours[day],
        breaks: [...businessHours[day].breaks, newBreak]
      }
    });
  };

  const removeBreakTime = (day: string, index: number) => {
    setBusinessHours({
      ...businessHours,
      [day]: {
        ...businessHours[day],
        breaks: businessHours[day].breaks.filter((_, i) => i !== index)
      }
    });
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Store },
    { id: 'business', label: 'Business', icon: Receipt },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'delivery', label: 'Delivery', icon: Truck },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'advanced', label: 'Advanced', icon: SettingsIcon }
  ];

  const canEdit = hasPermission('settings:write');

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>
        <nav className="space-y-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
                {activeTab === tab.id && (
                  <ChevronRight className="w-4 h-4 ml-auto" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-4xl">
          {/* Save Status */}
          {saveStatus !== 'idle' && (
            <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
              saveStatus === 'saving' ? 'bg-blue-50 text-blue-700' :
              saveStatus === 'saved' ? 'bg-green-50 text-green-700' :
              'bg-red-50 text-red-700'
            }`}>
              {saveStatus === 'saving' && (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                  <span>Saving changes...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <Check className="w-4 h-4" />
                  <span>Changes saved successfully</span>
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <X className="w-4 h-4" />
                  <span>Error saving changes. Please try again.</span>
                </>
              )}
            </div>
          )}

          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">General Information</h3>
                <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Restaurant Name
                    </label>
                    <input
                      type="text"
                      value={generalSettings.name}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={generalSettings.email}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, email: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={generalSettings.phone}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, phone: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!canEdit}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      value={generalSettings.website}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, website: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Support Email
                      </label>
                      <input
                        type="email"
                        value={generalSettings.supportEmail}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, supportEmail: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={generalSettings.whatsapp}
                        onChange={(e) => setGeneralSettings({ ...generalSettings, whatsapp: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!canEdit}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
                <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={locationSettings.address}
                      onChange={(e) => setLocationSettings({ ...locationSettings, address: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        value={locationSettings.postalCode}
                        onChange={(e) => setLocationSettings({ ...locationSettings, postalCode: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={locationSettings.city}
                        onChange={(e) => setLocationSettings({ ...locationSettings, city: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Canton
                      </label>
                      <select
                        value={locationSettings.canton}
                        onChange={(e) => setLocationSettings({ ...locationSettings, canton: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!canEdit}
                      >
                        <option value="">Select Canton</option>
                        <option value="ZH">Zürich</option>
                        <option value="BE">Bern</option>
                        <option value="LU">Luzern</option>
                        <option value="UR">Uri</option>
                        <option value="SZ">Schwyz</option>
                        <option value="OW">Obwalden</option>
                        <option value="NW">Nidwalden</option>
                        <option value="GL">Glarus</option>
                        <option value="ZG">Zug</option>
                        <option value="FR">Fribourg</option>
                        <option value="SO">Solothurn</option>
                        <option value="BS">Basel-Stadt</option>
                        <option value="BL">Basel-Landschaft</option>
                        <option value="SH">Schaffhausen</option>
                        <option value="AR">Appenzell Ausserrhoden</option>
                        <option value="AI">Appenzell Innerrhoden</option>
                        <option value="SG">St. Gallen</option>
                        <option value="GR">Graubünden</option>
                        <option value="AG">Aargau</option>
                        <option value="TG">Thurgau</option>
                        <option value="TI">Ticino</option>
                        <option value="VD">Vaud</option>
                        <option value="VS">Valais</option>
                        <option value="NE">Neuchâtel</option>
                        <option value="GE">Genève</option>
                        <option value="JU">Jura</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {canEdit && (
                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => {
                      handleSaveGeneral();
                      handleSaveLocation();
                    }}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Business Settings */}
          {activeTab === 'business' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Settings</h3>
                <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Currency
                      </label>
                      <select
                        value={businessSettings.currency}
                        onChange={(e) => setBusinessSettings({ ...businessSettings, currency: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!canEdit}
                      >
                        <option value="CHF">CHF - Swiss Franc</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="USD">USD - US Dollar</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Timezone
                      </label>
                      <select
                        value={businessSettings.timezone}
                        onChange={(e) => setBusinessSettings({ ...businessSettings, timezone: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!canEdit}
                      >
                        <option value="Europe/Zurich">Europe/Zurich</option>
                        <option value="Europe/Paris">Europe/Paris</option>
                        <option value="Europe/Rome">Europe/Rome</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Language
                      </label>
                      <select
                        value={businessSettings.language}
                        onChange={(e) => setBusinessSettings({ ...businessSettings, language: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!canEdit}
                      >
                        <option value="de">German</option>
                        <option value="fr">French</option>
                        <option value="it">Italian</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={businessSettings.taxRate}
                        onChange={(e) => setBusinessSettings({ ...businessSettings, taxRate: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Service Fee ({businessSettings.currency})
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={businessSettings.serviceFee}
                        onChange={(e) => setBusinessSettings({ ...businessSettings, serviceFee: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Minimum Order ({businessSettings.currency})
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={businessSettings.minimumOrder}
                        onChange={(e) => setBusinessSettings({ ...businessSettings, minimumOrder: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!canEdit}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Order Prefix
                      </label>
                      <input
                        type="text"
                        value={businessSettings.orderPrefix}
                        onChange={(e) => setBusinessSettings({ ...businessSettings, orderPrefix: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default Preparation Time (minutes)
                      </label>
                      <input
                        type="number"
                        value={businessSettings.preparationTime}
                        onChange={(e) => setBusinessSettings({ ...businessSettings, preparationTime: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!canEdit}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={businessSettings.autoAcceptOrders}
                        onChange={(e) => setBusinessSettings({ ...businessSettings, autoAcceptOrders: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={!canEdit}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Auto-accept orders
                      </span>
                    </label>
                    
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={businessSettings.enableTableOrdering}
                        onChange={(e) => setBusinessSettings({ ...businessSettings, enableTableOrdering: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={!canEdit}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Enable table ordering
                      </span>
                    </label>
                    
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={businessSettings.enableDelivery}
                        onChange={(e) => setBusinessSettings({ ...businessSettings, enableDelivery: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={!canEdit}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Enable delivery
                      </span>
                    </label>
                    
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={businessSettings.enablePickup}
                        onChange={(e) => setBusinessSettings({ ...businessSettings, enablePickup: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={!canEdit}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Enable pickup
                      </span>
                    </label>
                    
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={businessSettings.enableReservations}
                        onChange={(e) => setBusinessSettings({ ...businessSettings, enableReservations: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={!canEdit}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Enable reservations
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Hours</h3>
                <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
                  {Object.entries(businessHours).map(([day, schedule]) => (
                    <div key={day} className="border-b pb-4 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={schedule.isOpen}
                            onChange={(e) => setBusinessHours({
                              ...businessHours,
                              [day]: { ...schedule, isOpen: e.target.checked }
                            })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            disabled={!canEdit}
                          />
                          <span className="text-sm font-medium text-gray-700 capitalize">
                            {day}
                          </span>
                        </label>
                        
                        {schedule.isOpen && (
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <input
                                type="time"
                                value={schedule.openTime}
                                onChange={(e) => setBusinessHours({
                                  ...businessHours,
                                  [day]: { ...schedule, openTime: e.target.value }
                                })}
                                className="px-2 py-1 border rounded text-sm"
                                disabled={!canEdit}
                              />
                              <span className="text-sm text-gray-500">to</span>
                              <input
                                type="time"
                                value={schedule.closeTime}
                                onChange={(e) => setBusinessHours({
                                  ...businessHours,
                                  [day]: { ...schedule, closeTime: e.target.value }
                                })}
                                className="px-2 py-1 border rounded text-sm"
                                disabled={!canEdit}
                              />
                            </div>
                            
                            {canEdit && (
                              <button
                                onClick={() => addBreakTime(day)}
                                className="text-sm text-blue-600 hover:text-blue-700"
                              >
                                Add break
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {schedule.breaks.length > 0 && (
                        <div className="ml-7 space-y-2">
                          {schedule.breaks.map((breakTime, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <span className="text-gray-500">Break:</span>
                              <input
                                type="time"
                                value={breakTime.start}
                                onChange={(e) => {
                                  const newBreaks = [...schedule.breaks];
                                  newBreaks[index].start = e.target.value;
                                  setBusinessHours({
                                    ...businessHours,
                                    [day]: { ...schedule, breaks: newBreaks }
                                  });
                                }}
                                className="px-2 py-1 border rounded text-sm"
                                disabled={!canEdit}
                              />
                              <span className="text-gray-500">to</span>
                              <input
                                type="time"
                                value={breakTime.end}
                                onChange={(e) => {
                                  const newBreaks = [...schedule.breaks];
                                  newBreaks[index].end = e.target.value;
                                  setBusinessHours({
                                    ...businessHours,
                                    [day]: { ...schedule, breaks: newBreaks }
                                  });
                                }}
                                className="px-2 py-1 border rounded text-sm"
                                disabled={!canEdit}
                              />
                              {canEdit && (
                                <button
                                  onClick={() => removeBreakTime(day, index)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {canEdit && (
                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => {
                      handleSaveBusinessSettings();
                      handleSaveBusinessHours();
                    }}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Payment Settings */}
          {activeTab === 'payment' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h3>
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="space-y-4">
                    {tenant?.settings.paymentMethods.map((method) => (
                      <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <CreditCard className="w-8 h-8 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">{method.name}</p>
                            {method.processingFee && (
                              <p className="text-sm text-gray-500">
                                Processing fee: {method.processingFee}%
                              </p>
                            )}
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={method.enabled}
                            onChange={(e) => togglePaymentMethod(method.id, e.target.checked)}
                            className="sr-only peer"
                            disabled={!canEdit}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Settings */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Brand Colors</h3>
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Primary Color
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={brandingSettings.primaryColor}
                          onChange={(e) => setBrandingSettings({ ...brandingSettings, primaryColor: e.target.value })}
                          className="h-10 w-20 border rounded cursor-pointer"
                          disabled={!canEdit}
                        />
                        <input
                          type="text"
                          value={brandingSettings.primaryColor}
                          onChange={(e) => setBrandingSettings({ ...brandingSettings, primaryColor: e.target.value })}
                          className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={!canEdit}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Secondary Color
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={brandingSettings.secondaryColor}
                          onChange={(e) => setBrandingSettings({ ...brandingSettings, secondaryColor: e.target.value })}
                          className="h-10 w-20 border rounded cursor-pointer"
                          disabled={!canEdit}
                        />
                        <input
                          type="text"
                          value={brandingSettings.secondaryColor}
                          onChange={(e) => setBrandingSettings({ ...brandingSettings, secondaryColor: e.target.value })}
                          className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={!canEdit}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Accent Color
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={brandingSettings.accentColor}
                          onChange={(e) => setBrandingSettings({ ...brandingSettings, accentColor: e.target.value })}
                          className="h-10 w-20 border rounded cursor-pointer"
                          disabled={!canEdit}
                        />
                        <input
                          type="text"
                          value={brandingSettings.accentColor}
                          onChange={(e) => setBrandingSettings({ ...brandingSettings, accentColor: e.target.value })}
                          className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={!canEdit}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Logo</h3>
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center gap-6">
                    {brandingSettings.logo ? (
                      <img
                        src={brandingSettings.logo}
                        alt="Logo"
                        className="w-32 h-32 object-contain border rounded-lg"
                      />
                    ) : (
                      <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center text-gray-400">
                        <Store className="w-12 h-12" />
                      </div>
                    )}
                    
                    {canEdit && (
                      <div>
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                          Upload Logo
                        </button>
                        <p className="text-sm text-gray-500 mt-2">
                          Recommended: 512x512px, PNG or SVG
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {canEdit && (
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveBranding}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
