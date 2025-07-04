/**
 * EATECH - Modern Admin Dashboard
 * Version: 14.0.0
 * Description: Ultramodernes Admin Dashboard mit KI-Features und Real-time Analytics
 * Author: EATECH Development Team
 * Created: 2025-07-04
 * File Path: /apps/admin/src/pages/Dashboard/Dashboard.jsx
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ref, onValue, update, push, set } from 'firebase/database';
import { database } from '@eatech/core/config/firebase';
import { useTenant } from '@eatech/core/contexts/TenantContext';
import { useAuth } from '@eatech/auth';
import { Card } from '@eatech/ui';
import {
    TrendingUp,
    TrendingDown,
    ShoppingCart,
    Users,
    DollarSign,
    Clock,
    AlertCircle,
    CheckCircle,
    XCircle,
    ChefHat,
    Truck,
    Package,
    BarChart3,
    Activity,
    Bell,
    Calendar,
    Filter,
    Download,
    RefreshCw,
    MoreVertical,
    ChevronRight,
    Eye,
    Edit,
    Trash2,
    MessageSquare,
    Phone,
    Mail,
    MapPin,
    Timer,
    Zap,
    Sparkles,
    Brain,
    Target,
    Award,
    Star,
    Heart,
    ThumbsUp,
    ThumbsDown,
    Coffee,
    Pizza,
    Utensils,
    Flame,
    Droplets,
    Wind,
    Sun,
    Moon,
    CloudRain,
    Thermometer,
    Wifi,
    WifiOff,
    Battery,
    BatteryLow,
    Cpu,
    HardDrive,
    Server,
    Database as DatabaseIcon,
    Shield,
    Lock,
    Unlock,
    UserCheck,
    UserX,
    CreditCard,
    Banknote,
    Receipt,
    FileText,
    Printer,
    QrCode,
    Smartphone,
    Monitor,
    Tablet,
    Watch,
    Headphones,
    Speaker,
    Mic,
    Video,
    Camera,
    Image,
    Palette,
    Brush,
    Layers,
    Grid,
    Layout,
    Maximize,
    Minimize,
    Move,
    RotateCw,
    Save,
    Search,
    Settings,
    Sliders,
    ToggleLeft,
    ToggleRight,
    Trash,
    Upload,
    Volume2,
    VolumeX,
    Webhook,
    Wifi2,
    X,
    ZoomIn,
    ZoomOut
} from 'lucide-react';
import {
    LineChart,
    Line,
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    RadialBarChart,
    RadialBar,
    ScatterChart,
    Scatter,
    ComposedChart,
    XAxis,
    YAxis,
    ZAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    RadarChart,
    Treemap,
    Sankey,
    Funnel,
    FunnelChart
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Dashboard.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================

const REFRESH_INTERVALS = {
    realtime: 5000,      // 5 seconds
    metrics: 30000,      // 30 seconds
    charts: 60000,       // 1 minute
    weather: 900000,     // 15 minutes
    predictions: 300000  // 5 minutes
};

const CHART_COLORS = {
    primary: '#FF6B6B',
    secondary: '#4ECDC4',
    accent: '#FFE66D',
    success: '#51CF66',
    warning: '#FFD43B',
    danger: '#FF4757',
    info: '#54A0FF',
    purple: '#A55EEA',
    pink: '#FF6B9D',
    orange: '#FD9644',
    gradient: {
        primary: ['#FF6B6B', '#FF8E8E'],
        secondary: ['#4ECDC4', '#6DD6CE'],
        accent: ['#FFE66D', '#FFF59D'],
        success: ['#51CF66', '#6FCF7F'],
        revenue: ['#667eea', '#764ba2'],
        orders: ['#f093fb', '#f5576c'],
        customers: ['#4facfe', '#00f2fe'],
        satisfaction: ['#fa709a', '#fee140']
    }
};

const ORDER_STATUS = {
    NEW: { label: 'Neu', color: '#54A0FF', icon: ShoppingCart },
    CONFIRMED: { label: 'Bestätigt', color: '#FFD43B', icon: CheckCircle },
    PREPARING: { label: 'In Zubereitung', color: '#FD9644', icon: ChefHat },
    READY: { label: 'Fertig', color: '#51CF66', icon: Package },
    DELIVERING: { label: 'In Zustellung', color: '#A55EEA', icon: Truck },
    COMPLETED: { label: 'Abgeschlossen', color: '#51CF66', icon: CheckCircle },
    CANCELLED: { label: 'Storniert', color: '#FF4757', icon: XCircle }
};

const WIDGET_TYPES = {
    METRIC: 'metric',
    CHART: 'chart',
    LIST: 'list',
    MAP: 'map',
    CALENDAR: 'calendar',
    WEATHER: 'weather',
    AI_INSIGHTS: 'ai_insights',
    LIVE_FEED: 'live_feed',
    QUICK_ACTIONS: 'quick_actions'
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-CH', {
        style: 'currency',
        currency: 'CHF'
    }).format(amount);
};

const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
};

const formatPercentage = (value, decimals = 1) => {
    return `${value.toFixed(decimals)}%`;
};

const formatTime = (date) => {
    return new Intl.DateTimeFormat('de-CH', {
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
};

const formatDate = (date) => {
    return new Intl.DateTimeFormat('de-CH', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(date);
};

const calculateTrend = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
};

const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
};

const getGreeting = () => {
    const timeOfDay = getTimeOfDay();
    const greetings = {
        night: 'Gute Nacht',
        morning: 'Guten Morgen',
        afternoon: 'Guten Tag',
        evening: 'Guten Abend'
    };
    return greetings[timeOfDay];
};

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

const useRealtimeData = (path, interval = REFRESH_INTERVALS.realtime) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    useEffect(() => {
        if (!path) return;
        
        const dataRef = ref(database, path);
        const unsubscribe = onValue(dataRef, 
            (snapshot) => {
                setData(snapshot.val());
                setLoading(false);
                setError(null);
            },
            (error) => {
                setError(error);
                setLoading(false);
            }
        );
        
        return () => unsubscribe();
    }, [path]);
    
    return { data, loading, error };
};

const useMetrics = (tenantId) => {
    const [metrics, setMetrics] = useState({
        revenue: { today: 0, yesterday: 0, week: 0, month: 0 },
        orders: { today: 0, yesterday: 0, week: 0, month: 0 },
        customers: { today: 0, yesterday: 0, week: 0, month: 0 },
        avgOrderValue: { today: 0, yesterday: 0, week: 0, month: 0 },
        conversionRate: { today: 0, yesterday: 0, week: 0, month: 0 },
        satisfaction: { today: 0, yesterday: 0, week: 0, month: 0 }
    });
    
    useEffect(() => {
        if (!tenantId) return;
        
        const calculateMetrics = async () => {
            // Hier würde die echte Metriken-Berechnung stattfinden
            // Für Demo-Zwecke generieren wir Beispieldaten
            const mockMetrics = {
                revenue: {
                    today: 4567.80,
                    yesterday: 3890.50,
                    week: 28450.30,
                    month: 98765.40
                },
                orders: {
                    today: 87,
                    yesterday: 72,
                    week: 543,
                    month: 2145
                },
                customers: {
                    today: 76,
                    yesterday: 65,
                    week: 487,
                    month: 1876
                },
                avgOrderValue: {
                    today: 52.50,
                    yesterday: 54.03,
                    week: 52.40,
                    month: 46.05
                },
                conversionRate: {
                    today: 68.5,
                    yesterday: 65.2,
                    week: 67.8,
                    month: 69.1
                },
                satisfaction: {
                    today: 4.8,
                    yesterday: 4.7,
                    week: 4.75,
                    month: 4.72
                }
            };
            
            setMetrics(mockMetrics);
        };
        
        calculateMetrics();
        const interval = setInterval(calculateMetrics, REFRESH_INTERVALS.metrics);
        
        return () => clearInterval(interval);
    }, [tenantId]);
    
    return metrics;
};

const useAIInsights = (metrics, orders) => {
    const [insights, setInsights] = useState([]);
    
    useEffect(() => {
        // Simuliere KI-Analyse
        const generateInsights = () => {
            const newInsights = [];
            
            // Umsatz-Insight
            if (metrics.revenue.today > metrics.revenue.yesterday * 1.2) {
                newInsights.push({
                    id: 'revenue-spike',
                    type: 'success',
                    icon: TrendingUp,
                    title: 'Umsatz-Rekord!',
                    description: 'Der heutige Umsatz liegt 20% über dem Durchschnitt',
                    action: 'Details anzeigen',
                    priority: 'high'
                });
            }
            
            // Bestell-Muster
            if (orders?.length > 10) {
                const popularItems = {}; // Analyse der beliebtesten Produkte
                newInsights.push({
                    id: 'popular-items',
                    type: 'info',
                    icon: Sparkles,
                    title: 'Trend entdeckt',
                    description: 'Burger Deluxe ist heute besonders beliebt',
                    action: 'Lager prüfen',
                    priority: 'medium'
                });
            }
            
            // Vorhersage
            const currentHour = new Date().getHours();
            if (currentHour < 11) {
                newInsights.push({
                    id: 'lunch-rush',
                    type: 'warning',
                    icon: Brain,
                    title: 'Mittagsrush Vorhersage',
                    description: 'Erwarte 120-140 Bestellungen zwischen 12-14 Uhr',
                    action: 'Personal planen',
                    priority: 'high'
                });
            }
            
            // Kundenzufriedenheit
            if (metrics.satisfaction.today < 4.5) {
                newInsights.push({
                    id: 'satisfaction-alert',
                    type: 'warning',
                    icon: AlertCircle,
                    title: 'Zufriedenheit sinkt',
                    description: 'Die Bewertungen sind heute unterdurchschnittlich',
                    action: 'Feedback prüfen',
                    priority: 'high'
                });
            }
            
            setInsights(newInsights);
        };
        
        generateInsights();
        const interval = setInterval(generateInsights, REFRESH_INTERVALS.predictions);
        
        return () => clearInterval(interval);
    }, [metrics, orders]);
    
    return insights;
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const MetricCard = ({ title, value, previousValue, icon: Icon, color, prefix = '', suffix = '', decimals = 0 }) => {
    const trend = calculateTrend(value, previousValue);
    const isPositive = trend >= 0;
    
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.metricCard}
        >
            <div className={styles.metricHeader}>
                <div className={styles.metricIcon} style={{ backgroundColor: `${color}20` }}>
                    <Icon size={24} style={{ color }} />
                </div>
                <button className={styles.metricMenu}>
                    <MoreVertical size={16} />
                </button>
            </div>
            
            <div className={styles.metricContent}>
                <h3 className={styles.metricTitle}>{title}</h3>
                <div className={styles.metricValue}>
                    <span className={styles.metricPrefix}>{prefix}</span>
                    <span className={styles.metricNumber}>
                        {typeof value === 'number' ? formatNumber(value) : value}
                    </span>
                    <span className={styles.metricSuffix}>{suffix}</span>
                </div>
                
                <div className={styles.metricTrend}>
                    <div className={`${styles.trendBadge} ${isPositive ? styles.positive : styles.negative}`}>
                        {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        <span>{formatPercentage(Math.abs(trend))}</span>
                    </div>
                    <span className={styles.trendLabel}>vs. gestern</span>
                </div>
            </div>
            
            <div className={styles.metricSparkline}>
                <ResponsiveContainer width="100%" height={40}>
                    <AreaChart data={generateSparklineData()}>
                        <defs>
                            <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                                <stop offset="100%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={color}
                            strokeWidth={2}
                            fill={`url(#gradient-${title})`}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
};

const LiveOrderCard = ({ order, onStatusChange, onViewDetails }) => {
    const status = ORDER_STATUS[order.status];
    const StatusIcon = status.icon;
    const orderAge = Date.now() - new Date(order.createdAt).getTime();
    const isUrgent = orderAge > 15 * 60 * 1000; // 15 minutes
    
    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`${styles.orderCard} ${isUrgent ? styles.urgent : ''}`}
            style={{ borderLeftColor: status.color }}
        >
            <div className={styles.orderHeader}>
                <div className={styles.orderInfo}>
                    <h4 className={styles.orderNumber}>#{order.orderNumber}</h4>
                    <span className={styles.orderTime}>{formatTime(new Date(order.createdAt))}</span>
                </div>
                <div className={styles.orderStatus} style={{ backgroundColor: `${status.color}20`, color: status.color }}>
                    <StatusIcon size={16} />
                    <span>{status.label}</span>
                </div>
            </div>
            
            <div className={styles.orderCustomer}>
                <User size={14} />
                <span>{order.customerName}</span>
                {order.isFirstOrder && <Badge variant="new">Neukunde</Badge>}
            </div>
            
            <div className={styles.orderItems}>
                {order.items.slice(0, 3).map((item, index) => (
                    <div key={index} className={styles.orderItem}>
                        <span className={styles.itemQuantity}>{item.quantity}x</span>
                        <span className={styles.itemName}>{item.name}</span>
                    </div>
                ))}
                {order.items.length > 3 && (
                    <div className={styles.orderItem}>
                        <span className={styles.itemMore}>+{order.items.length - 3} weitere</span>
                    </div>
                )}
            </div>
            
            <div className={styles.orderFooter}>
                <div className={styles.orderTotal}>
                    <span className={styles.totalLabel}>Total</span>
                    <span className={styles.totalValue}>{formatCurrency(order.total)}</span>
                </div>
                <div className={styles.orderActions}>
                    <button
                        className={styles.actionButton}
                        onClick={() => onViewDetails(order)}
                        title="Details"
                    >
                        <Eye size={16} />
                    </button>
                    <button
                        className={`${styles.actionButton} ${styles.primary}`}
                        onClick={() => onStatusChange(order)}
                        title="Status ändern"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

const AIInsightCard = ({ insight, onAction }) => {
    const Icon = insight.icon;
    
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`${styles.insightCard} ${styles[insight.type]}`}
        >
            <div className={styles.insightIcon}>
                <Icon size={20} />
            </div>
            <div className={styles.insightContent}>
                <h4 className={styles.insightTitle}>{insight.title}</h4>
                <p className={styles.insightDescription}>{insight.description}</p>
            </div>
            <button
                className={styles.insightAction}
                onClick={() => onAction(insight)}
            >
                {insight.action}
                <ChevronRight size={14} />
            </button>
        </motion.div>
    );
};

const QuickActionButton = ({ icon: Icon, label, color, onClick, badge }) => {
    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={styles.quickAction}
            onClick={onClick}
            style={{ '--action-color': color }}
        >
            <div className={styles.quickActionIcon}>
                <Icon size={20} />
                {badge && <span className={styles.quickActionBadge}>{badge}</span>}
            </div>
            <span className={styles.quickActionLabel}>{label}</span>
        </motion.button>
    );
};

const WeatherWidget = ({ location = 'Zürich' }) => {
    const [weather, setWeather] = useState({
        temp: 18,
        condition: 'partly-cloudy',
        humidity: 65,
        windSpeed: 12
    });
    
    const weatherIcons = {
        'clear': Sun,
        'partly-cloudy': CloudRain,
        'cloudy': CloudRain,
        'rain': CloudRain,
        'snow': CloudRain
    };
    
    const WeatherIcon = weatherIcons[weather.condition] || Sun;
    
    return (
        <div className={styles.weatherWidget}>
            <div className={styles.weatherMain}>
                <WeatherIcon size={48} />
                <div className={styles.weatherTemp}>
                    <span className={styles.tempValue}>{weather.temp}</span>
                    <span className={styles.tempUnit}>°C</span>
                </div>
            </div>
            <div className={styles.weatherDetails}>
                <div className={styles.weatherDetail}>
                    <Droplets size={16} />
                    <span>{weather.humidity}%</span>
                </div>
                <div className={styles.weatherDetail}>
                    <Wind size={16} />
                    <span>{weather.windSpeed} km/h</span>
                </div>
            </div>
            <p className={styles.weatherAdvice}>
                Perfektes Wetter für Foodtrucks! 🌮
            </p>
        </div>
    );
};

// Helper function for sparkline data
const generateSparklineData = () => {
    return Array.from({ length: 7 }, (_, i) => ({
        day: i,
        value: Math.random() * 100 + 50
    }));
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Dashboard = () => {
    // Hooks
    const { tenant } = useTenant();
    const { user } = useAuth();
    const metrics = useMetrics(tenant?.id);
    
    // State
    const [timeRange, setTimeRange] = useState('today');
    const [refreshing, setRefreshing] = useState(false);
    const [selectedWidget, setSelectedWidget] = useState(null);
    const [showNotifications, setShowNotifications] = useState(false);
    const [dashboardLayout, setDashboardLayout] = useState('default');
    
    // Realtime data
    const { data: liveOrders } = useRealtimeData(`tenants/${tenant?.id}/orders/active`);
    const { data: notifications } = useRealtimeData(`tenants/${tenant?.id}/notifications`);
    
    // AI Insights
    const insights = useAIInsights(metrics, liveOrders);
    
    // Chart data
    const revenueChartData = useMemo(() => {
        return Array.from({ length: 24 }, (_, hour) => ({
            hour: `${hour}:00`,
            revenue: Math.random() * 500 + 100,
            orders: Math.floor(Math.random() * 20 + 5)
        }));
    }, [timeRange]);
    
    const categoryData = useMemo(() => {
        return [
            { name: 'Burger', value: 35, color: CHART_COLORS.primary },
            { name: 'Pizza', value: 28, color: CHART_COLORS.secondary },
            { name: 'Salate', value: 18, color: CHART_COLORS.accent },
            { name: 'Getränke', value: 12, color: CHART_COLORS.success },
            { name: 'Desserts', value: 7, color: CHART_COLORS.info }
        ];
    }, []);
    
    const customerSatisfactionData = useMemo(() => {
        return [
            { rating: '5⭐', count: 145, percentage: 58 },
            { rating: '4⭐', count: 76, percentage: 30 },
            { rating: '3⭐', count: 20, percentage: 8 },
            { rating: '2⭐', count: 7, percentage: 3 },
            { rating: '1⭐', count: 2, percentage: 1 }
        ];
    }, []);
    
    // Handlers
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        // Refresh logic here
        setTimeout(() => setRefreshing(false), 1000);
    }, []);
    
    const handleOrderStatusChange = useCallback(async (order) => {
        // Status change logic
        console.log('Change status for order:', order);
    }, []);
    
    const handleViewOrderDetails = useCallback((order) => {
        // View details logic
        console.log('View details for order:', order);
    }, []);
    
    const handleInsightAction = useCallback((insight) => {
        // Handle insight action
        console.log('Handle insight:', insight);
    }, []);
    
    // Quick actions
    const quickActions = [
        { icon: Plus, label: 'Neue Bestellung', color: CHART_COLORS.primary, onClick: () => {} },
        { icon: Users, label: 'Kunde erfassen', color: CHART_COLORS.secondary, onClick: () => {} },
        { icon: Package, label: 'Inventar', color: CHART_COLORS.accent, onClick: () => {}, badge: '!' },
        { icon: MessageSquare, label: 'Support', color: CHART_COLORS.info, onClick: () => {}, badge: '3' }
    ];
    
    // Effects
    useEffect(() => {
        // Auto-refresh
        const interval = setInterval(handleRefresh, REFRESH_INTERVALS.metrics);
        return () => clearInterval(interval);
    }, [handleRefresh]);
    
    // Render
    return (
        <div className={styles.dashboard}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.title}>
                        {getGreeting()}, {user?.displayName || 'Chef'} 👋
                    </h1>
                    <p className={styles.subtitle}>
                        Hier ist dein Überblick für {tenant?.name}
                    </p>
                </div>
                
                <div className={styles.headerRight}>
                    <div className={styles.timeRangeSelector}>
                        <button
                            className={`${styles.timeRangeButton} ${timeRange === 'today' ? styles.active : ''}`}
                            onClick={() => setTimeRange('today')}
                        >
                            Heute
                        </button>
                        <button
                            className={`${styles.timeRangeButton} ${timeRange === 'week' ? styles.active : ''}`}
                            onClick={() => setTimeRange('week')}
                        >
                            Woche
                        </button>
                        <button
                            className={`${styles.timeRangeButton} ${timeRange === 'month' ? styles.active : ''}`}
                            onClick={() => setTimeRange('month')}
                        >
                            Monat
                        </button>
                    </div>
                    
                    <button className={styles.iconButton} onClick={handleRefresh} disabled={refreshing}>
                        <RefreshCw size={20} className={refreshing ? styles.spinning : ''} />
                    </button>
                    
                    <button className={styles.iconButton} onClick={() => setShowNotifications(!showNotifications)}>
                        <Bell size={20} />
                        {notifications?.length > 0 && <span className={styles.notificationBadge}>{notifications.length}</span>}
                    </button>
                    
                    <button className={styles.iconButton}>
                        <Settings size={20} />
                    </button>
                </div>
            </header>
            
            {/* AI Insights */}
            {insights.length > 0 && (
                <section className={styles.insightsSection}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            <Sparkles size={20} />
                            KI-Insights
                        </h2>
                    </div>
                    <div className={styles.insightsGrid}>
                        {insights.map(insight => (
                            <AIInsightCard
                                key={insight.id}
                                insight={insight}
                                onAction={handleInsightAction}
                            />
                        ))}
                    </div>
                </section>
            )}
            
            {/* Metrics Grid */}
            <section className={styles.metricsSection}>
                <div className={styles.metricsGrid}>
                    <MetricCard
                        title="Umsatz heute"
                        value={metrics.revenue[timeRange]}
                        previousValue={metrics.revenue.yesterday}
                        icon={DollarSign}
                        color={CHART_COLORS.primary}
                        prefix="CHF"
                    />
                    <MetricCard
                        title="Bestellungen"
                        value={metrics.orders[timeRange]}
                        previousValue={metrics.orders.yesterday}
                        icon={ShoppingCart}
                        color={CHART_COLORS.secondary}
                    />
                    <MetricCard
                        title="Kunden"
                        value={metrics.customers[timeRange]}
                        previousValue={metrics.customers.yesterday}
                        icon={Users}
                        color={CHART_COLORS.accent}
                    />
                    <MetricCard
                        title="⌀ Bestellwert"
                        value={metrics.avgOrderValue[timeRange]}
                        previousValue={metrics.avgOrderValue.yesterday}
                        icon={Receipt}
                        color={CHART_COLORS.success}
                        prefix="CHF"
                    />
                    <MetricCard
                        title="Conversion"
                        value={metrics.conversionRate[timeRange]}
                        previousValue={metrics.conversionRate.yesterday}
                        icon={Target}
                        color={CHART_COLORS.info}
                        suffix="%"
                    />
                    <MetricCard
                        title="Zufriedenheit"
                        value={metrics.satisfaction[timeRange]}
                        previousValue={metrics.satisfaction.yesterday}
                        icon={Star}
                        color={CHART_COLORS.warning}
                        suffix="/5"
                        decimals={1}
                    />
                </div>
            </section>
            
            {/* Main Content Grid */}
            <div className={styles.mainGrid}>
                {/* Live Orders */}
                <section className={styles.liveOrdersSection}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            <Activity size={20} />
                            Live Bestellungen
                        </h2>
                        <span className={styles.liveIndicator}>
                            <span className={styles.liveDot} />
                            Live
                        </span>
                    </div>
                    
                    <div className={styles.orderStats}>
                        <div className={styles.orderStat}>
                            <span className={styles.statValue}>12</span>
                            <span className={styles.statLabel}>Wartend</span>
                        </div>
                        <div className={styles.orderStat}>
                            <span className={styles.statValue}>8</span>
                            <span className={styles.statLabel}>In Arbeit</span>
                        </div>
                        <div className={styles.orderStat}>
                            <span className={styles.statValue}>5</span>
                            <span className={styles.statLabel}>Fertig</span>
                        </div>
                    </div>
                    
                    <div className={styles.ordersList}>
                        <AnimatePresence>
                            {liveOrders && Object.entries(liveOrders).map(([id, order]) => (
                                <LiveOrderCard
                                    key={id}
                                    order={{ id, ...order }}
                                    onStatusChange={handleOrderStatusChange}
                                    onViewDetails={handleViewOrderDetails}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                </section>
                
                {/* Charts Section */}
                <section className={styles.chartsSection}>
                    {/* Revenue Chart */}
                    <Card className={styles.chartCard}>
                        <div className={styles.chartHeader}>
                            <h3 className={styles.chartTitle}>Umsatzverlauf</h3>
                            <select className={styles.chartControl}>
                                <option>Stündlich</option>
                                <option>Täglich</option>
                                <option>Wöchentlich</option>
                            </select>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={revenueChartData}>
                                <defs>
                                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.8} />
                                        <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0.1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="hour" stroke="#666" />
                                <YAxis stroke="#666" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1a1a1a',
                                        border: '1px solid #333',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke={CHART_COLORS.primary}
                                    strokeWidth={2}
                                    fill="url(#revenueGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Card>
                    
                    {/* Category Distribution */}
                    <Card className={styles.chartCard}>
                        <div className={styles.chartHeader}>
                            <h3 className={styles.chartTitle}>Verkauf nach Kategorie</h3>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percentage }) => `${name} ${percentage}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </Card>
                    
                    {/* Customer Satisfaction */}
                    <Card className={styles.chartCard}>
                        <div className={styles.chartHeader}>
                            <h3 className={styles.chartTitle}>Kundenzufriedenheit</h3>
                            <div className={styles.satisfactionScore}>
                                <Star size={24} fill={CHART_COLORS.warning} />
                                <span className={styles.scoreValue}>4.8</span>
                            </div>
                        </div>
                        <div className={styles.satisfactionBars}>
                            {customerSatisfactionData.map((item) => (
                                <div key={item.rating} className={styles.satisfactionBar}>
                                    <span className={styles.barLabel}>{item.rating}</span>
                                    <div className={styles.barContainer}>
                                        <div
                                            className={styles.barFill}
                                            style={{
                                                width: `${item.percentage}%`,
                                                backgroundColor: CHART_COLORS.warning
                                            }}
                                        />
                                    </div>
                                    <span className={styles.barCount}>{item.count}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </section>
                
                {/* Right Sidebar */}
                <aside className={styles.sidebar}>
                    {/* Quick Actions */}
                    <Card className={styles.quickActionsCard}>
                        <h3 className={styles.cardTitle}>Quick Actions</h3>
                        <div className={styles.quickActionsGrid}>
                            {quickActions.map((action, index) => (
                                <QuickActionButton key={index} {...action} />
                            ))}
                        </div>
                    </Card>
                    
                    {/* Weather Widget */}
                    <Card className={styles.weatherCard}>
                        <h3 className={styles.cardTitle}>Wetter in {tenant?.location || 'Zürich'}</h3>
                        <WeatherWidget location={tenant?.location} />
                    </Card>
                    
                    {/* Team Performance */}
                    <Card className={styles.teamCard}>
                        <h3 className={styles.cardTitle}>Team Performance</h3>
                        <div className={styles.teamList}>
                            <div className={styles.teamMember}>
                                <div className={styles.memberInfo}>
                                    <div className={styles.memberAvatar}>JM</div>
                                    <div>
                                        <div className={styles.memberName}>Julia Meier</div>
                                        <div className={styles.memberRole}>Küchenchef</div>
                                    </div>
                                </div>
                                <div className={styles.memberStats}>
                                    <span className={styles.statBadge}>45 Orders</span>
                                </div>
                            </div>
                            <div className={styles.teamMember}>
                                <div className={styles.memberInfo}>
                                    <div className={styles.memberAvatar}>TK</div>
                                    <div>
                                        <div className={styles.memberName}>Tom Keller</div>
                                        <div className={styles.memberRole}>Service</div>
                                    </div>
                                </div>
                                <div className={styles.memberStats}>
                                    <span className={styles.statBadge}>38 Orders</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                    
                    {/* System Status */}
                    <Card className={styles.systemCard}>
                        <h3 className={styles.cardTitle}>System Status</h3>
                        <div className={styles.systemStats}>
                            <div className={styles.systemStat}>
                                <Wifi size={16} />
                                <span>Online</span>
                                <span className={styles.statusIndicator + ' ' + styles.online} />
                            </div>
                            <div className={styles.systemStat}>
                                <Cpu size={16} />
                                <span>CPU: 23%</span>
                            </div>
                            <div className={styles.systemStat}>
                                <HardDrive size={16} />
                                <span>Speicher: 45%</span>
                            </div>
                        </div>
                    </Card>
                </aside>
            </div>
        </div>
    );
};

// ============================================================================
// EXPORTS
// ============================================================================

export default Dashboard;