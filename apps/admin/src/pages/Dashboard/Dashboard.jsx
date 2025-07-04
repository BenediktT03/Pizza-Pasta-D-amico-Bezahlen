/**
 * EATECH - Admin Dashboard (Working Version)
 * Version: 14.0.0
 * Description: Funktionierendes Admin Dashboard ohne problematische Icons
 * Author: EATECH Development Team
 * Created: 2025-07-04
 * File Path: /apps/admin/src/pages/Dashboard/Dashboard.jsx
 */

import React, { useState, useEffect } from 'react';
import {
    TrendingUp,
    TrendingDown,
    ShoppingCart,
    Users,
    DollarSign,
    Clock,
    Activity,
    BarChart3,
    Star,
    Package,
    ChefHat,
    Truck,
    AlertCircle,
    CheckCircle,
    ChevronRight,
    MoreVertical,
    RefreshCw,
    Bell,
    Settings,
    Plus,
    MessageSquare,
    Eye,
    Sparkles,
    Brain,
    Target,
    Coffee,
    Sun,
    CloudRain,
    Wind,
    Droplets,
    Wifi,
    Cpu,
    HardDrive
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
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import styles from './Dashboard.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================

const CHART_COLORS = {
    primary: '#FF6B6B',
    secondary: '#4ECDC4',
    accent: '#FFE66D',
    success: '#51CF66',
    warning: '#FFD43B',
    danger: '#FF4757',
    info: '#54A0FF'
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

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Guten Morgen';
    if (hour < 18) return 'Guten Tag';
    return 'Guten Abend';
};

// ============================================================================
// COMPONENTS
// ============================================================================

const MetricCard = ({ title, value, previousValue, icon: Icon, color }) => {
    const trend = previousValue ? ((value - previousValue) / previousValue) * 100 : 0;
    const isPositive = trend >= 0;
    
    return (
        <div className={styles.metricCard}>
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
                    {typeof value === 'number' && title.includes('CHF') && 'CHF '}
                    <span className={styles.metricNumber}>
                        {typeof value === 'number' ? formatNumber(value) : value}
                    </span>
                </div>
                
                {previousValue && (
                    <div className={styles.metricTrend}>
                        <div className={`${styles.trendBadge} ${isPositive ? styles.positive : styles.negative}`}>
                            {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                            <span>{Math.abs(trend).toFixed(1)}%</span>
                        </div>
                        <span className={styles.trendLabel}>vs. gestern</span>
                    </div>
                )}
            </div>
        </div>
    );
};

const OrderCard = ({ order }) => {
    const statusColors = {
        NEW: '#54A0FF',
        PREPARING: '#FD9644',
        READY: '#51CF66'
    };
    
    return (
        <div className={styles.orderCard} style={{ borderLeftColor: statusColors[order.status] }}>
            <div className={styles.orderHeader}>
                <h4 className={styles.orderNumber}>#{order.orderNumber}</h4>
                <span className={styles.orderTime}>{order.time}</span>
            </div>
            
            <div className={styles.orderCustomer}>
                <Users size={14} />
                <span>{order.customerName}</span>
            </div>
            
            <div className={styles.orderItems}>
                {order.items.map((item, index) => (
                    <div key={index} className={styles.orderItem}>
                        <span className={styles.itemQuantity}>{item.quantity}x</span>
                        <span className={styles.itemName}>{item.name}</span>
                    </div>
                ))}
            </div>
            
            <div className={styles.orderFooter}>
                <div className={styles.orderTotal}>
                    <span className={styles.totalLabel}>Total</span>
                    <span className={styles.totalValue}>{formatCurrency(order.total)}</span>
                </div>
                <div className={styles.orderActions}>
                    <button className={styles.actionButton}>
                        <Eye size={16} />
                    </button>
                    <button className={`${styles.actionButton} ${styles.primary}`}>
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const InsightCard = ({ insight }) => {
    const Icon = insight.icon;
    
    return (
        <div className={`${styles.insightCard} ${styles[insight.type]}`}>
            <div className={styles.insightIcon}>
                <Icon size={20} />
            </div>
            <div className={styles.insightContent}>
                <h4 className={styles.insightTitle}>{insight.title}</h4>
                <p className={styles.insightDescription}>{insight.description}</p>
            </div>
            <button className={styles.insightAction}>
                {insight.action}
                <ChevronRight size={14} />
            </button>
        </div>
    );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Dashboard = () => {
    const [refreshing, setRefreshing] = useState(false);
    const [timeRange, setTimeRange] = useState('today');
    
    // Mock data
    const metrics = {
        revenue: { today: 4567.80, yesterday: 3890.50 },
        orders: { today: 87, yesterday: 72 },
        customers: { today: 76, yesterday: 65 },
        avgOrderValue: { today: 52.50, yesterday: 54.03 },
        conversionRate: { today: 68.5, yesterday: 65.2 },
        satisfaction: { today: 4.8, yesterday: 4.7 }
    };
    
    const insights = [
        {
            id: 1,
            type: 'success',
            icon: TrendingUp,
            title: 'Umsatz-Rekord!',
            description: 'Der heutige Umsatz liegt 20% über dem Durchschnitt',
            action: 'Details anzeigen'
        },
        {
            id: 2,
            type: 'info',
            icon: Sparkles,
            title: 'Trend entdeckt',
            description: 'Burger Deluxe ist heute besonders beliebt',
            action: 'Lager prüfen'
        },
        {
            id: 3,
            type: 'warning',
            icon: Brain,
            title: 'Mittagsrush Vorhersage',
            description: 'Erwarte 120-140 Bestellungen zwischen 12-14 Uhr',
            action: 'Personal planen'
        }
    ];
    
    const liveOrders = [
        {
            orderNumber: '1001',
            status: 'NEW',
            customerName: 'Max Mustermann',
            time: '12:34',
            items: [
                { quantity: 2, name: 'Burger Deluxe' },
                { quantity: 1, name: 'Pommes' },
                { quantity: 2, name: 'Cola' }
            ],
            total: 45.80
        },
        {
            orderNumber: '1002',
            status: 'PREPARING',
            customerName: 'Anna Schmidt',
            time: '12:28',
            items: [
                { quantity: 1, name: 'Pizza Margherita' },
                { quantity: 1, name: 'Salat' }
            ],
            total: 28.50
        }
    ];
    
    const revenueChartData = Array.from({ length: 24 }, (_, hour) => ({
        hour: `${hour}:00`,
        revenue: Math.random() * 500 + 100
    }));
    
    const categoryData = [
        { name: 'Burger', value: 35, color: CHART_COLORS.primary },
        { name: 'Pizza', value: 28, color: CHART_COLORS.secondary },
        { name: 'Salate', value: 18, color: CHART_COLORS.accent },
        { name: 'Getränke', value: 12, color: CHART_COLORS.success },
        { name: 'Desserts', value: 7, color: CHART_COLORS.info }
    ];
    
    const handleRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
    };
    
    return (
        <div className={styles.dashboard}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.title}>
                        {getGreeting()}, Admin 👋
                    </h1>
                    <p className={styles.subtitle}>
                        Hier ist dein Überblick für Demo Restaurant
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
                    
                    <button className={styles.iconButton}>
                        <Bell size={20} />
                    </button>
                    
                    <button className={styles.iconButton}>
                        <Settings size={20} />
                    </button>
                </div>
            </header>
            
            {/* AI Insights */}
            <section className={styles.insightsSection}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                        <Sparkles size={20} />
                        KI-Insights
                    </h2>
                </div>
                <div className={styles.insightsGrid}>
                    {insights.map(insight => (
                        <InsightCard key={insight.id} insight={insight} />
                    ))}
                </div>
            </section>
            
            {/* Metrics Grid */}
            <section className={styles.metricsSection}>
                <div className={styles.metricsGrid}>
                    <MetricCard
                        title="Umsatz heute"
                        value={metrics.revenue.today}
                        previousValue={metrics.revenue.yesterday}
                        icon={DollarSign}
                        color={CHART_COLORS.primary}
                    />
                    <MetricCard
                        title="Bestellungen"
                        value={metrics.orders.today}
                        previousValue={metrics.orders.yesterday}
                        icon={ShoppingCart}
                        color={CHART_COLORS.secondary}
                    />
                    <MetricCard
                        title="Kunden"
                        value={metrics.customers.today}
                        previousValue={metrics.customers.yesterday}
                        icon={Users}
                        color={CHART_COLORS.accent}
                    />
                    <MetricCard
                        title="⌀ Bestellwert"
                        value={metrics.avgOrderValue.today}
                        previousValue={metrics.avgOrderValue.yesterday}
                        icon={Package}
                        color={CHART_COLORS.success}
                    />
                    <MetricCard
                        title="Conversion"
                        value={`${metrics.conversionRate.today}%`}
                        previousValue={metrics.conversionRate.yesterday}
                        icon={Target}
                        color={CHART_COLORS.info}
                    />
                    <MetricCard
                        title="Zufriedenheit"
                        value={`${metrics.satisfaction.today}/5`}
                        previousValue={metrics.satisfaction.yesterday}
                        icon={Star}
                        color={CHART_COLORS.warning}
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
                    
                    <div className={styles.ordersList}>
                        {liveOrders.map((order, index) => (
                            <OrderCard key={index} order={order} />
                        ))}
                    </div>
                </section>
                
                {/* Charts Section */}
                <section className={styles.chartsSection}>
                    {/* Revenue Chart */}
                    <div className={styles.chartCard}>
                        <div className={styles.chartHeader}>
                            <h3 className={styles.chartTitle}>Umsatzverlauf</h3>
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
                    </div>
                    
                    {/* Category Distribution */}
                    <div className={styles.chartCard}>
                        <div className={styles.chartHeader}>
                            <h3 className={styles.chartTitle}>Verkauf nach Kategorie</h3>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
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
                    </div>
                </section>
                
                {/* Right Sidebar */}
                <aside className={styles.sidebar}>
                    {/* Quick Actions */}
                    <div className={styles.quickActionsCard}>
                        <h3 className={styles.cardTitle}>Quick Actions</h3>
                        <div className={styles.quickActionsGrid}>
                            <button className={styles.quickAction}>
                                <Plus size={20} />
                                <span>Neue Bestellung</span>
                            </button>
                            <button className={styles.quickAction}>
                                <Users size={20} />
                                <span>Kunde erfassen</span>
                            </button>
                            <button className={styles.quickAction}>
                                <Package size={20} />
                                <span>Inventar</span>
                            </button>
                            <button className={styles.quickAction}>
                                <MessageSquare size={20} />
                                <span>Support</span>
                            </button>
                        </div>
                    </div>
                    
                    {/* Weather Widget */}
                    <div className={styles.weatherCard}>
                        <h3 className={styles.cardTitle}>Wetter in Zürich</h3>
                        <div className={styles.weatherWidget}>
                            <div className={styles.weatherMain}>
                                <Sun size={48} />
                                <div className={styles.weatherTemp}>
                                    <span className={styles.tempValue}>18</span>
                                    <span className={styles.tempUnit}>°C</span>
                                </div>
                            </div>
                            <div className={styles.weatherDetails}>
                                <div className={styles.weatherDetail}>
                                    <Droplets size={16} />
                                    <span>65%</span>
                                </div>
                                <div className={styles.weatherDetail}>
                                    <Wind size={16} />
                                    <span>12 km/h</span>
                                </div>
                            </div>
                            <p className={styles.weatherAdvice}>
                                Perfektes Wetter für Foodtrucks! 🌮
                            </p>
                        </div>
                    </div>
                    
                    {/* System Status */}
                    <div className={styles.systemCard}>
                        <h3 className={styles.cardTitle}>System Status</h3>
                        <div className={styles.systemStats}>
                            <div className={styles.systemStat}>
                                <Wifi size={16} />
                                <span>Online</span>
                                <span className={`${styles.statusIndicator} ${styles.online}`} />
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
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default Dashboard;