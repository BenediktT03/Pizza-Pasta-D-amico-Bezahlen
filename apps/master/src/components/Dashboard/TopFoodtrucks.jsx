/**
 * EATECH - Top Foodtrucks Component
 * Version: 1.0.0
 * Description: Anzeige der Top-performenden Foodtrucks mit Metriken
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/master/src/components/Dashboard/TopFoodtrucks.jsx
 */

import React, { useState, useMemo } from 'react';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Star,
  MapPin,
  Clock,
  DollarSign,
  Package,
  Users,
  ChevronRight,
  Medal,
  Award,
  MoreVertical,
  Eye,
  MessageSquare,
  Phone,
  Mail
} from 'lucide-react';
import styles from './TopFoodtrucks.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const SORT_OPTIONS = {
  revenue: { label: 'Umsatz', icon: DollarSign },
  orders: { label: 'Bestellungen', icon: Package },
  rating: { label: 'Bewertung', icon: Star },
  growth: { label: 'Wachstum', icon: TrendingUp }
};

const MOCK_FOODTRUCKS = [
  {
    id: 1,
    name: 'Bella Italia Express',
    category: 'Italienisch',
    location: 'Zürich HB',
    avatar: '🍕',
    revenue: 45280,
    revenueGrowth: 12.5,
    orders: 1247,
    ordersGrowth: 8.3,
    rating: 4.8,
    reviews: 342,
    avgOrderValue: 36.30,
    activeHours: '11:00 - 14:00, 17:00 - 21:00',
    topItems: ['Margherita Pizza', 'Pasta Carbonara', 'Tiramisu'],
    customerSatisfaction: 94,
    repeatCustomerRate: 68
  },
  {
    id: 2,
    name: 'Thai Street Kitchen',
    category: 'Asiatisch',
    location: 'Bern Bahnhof',
    avatar: '🍜',
    revenue: 38960,
    revenueGrowth: 18.2,
    orders: 982,
    ordersGrowth: 15.7,
    rating: 4.9,
    reviews: 287,
    avgOrderValue: 39.70,
    activeHours: '11:30 - 14:30, 17:30 - 21:30',
    topItems: ['Pad Thai', 'Green Curry', 'Mango Sticky Rice'],
    customerSatisfaction: 96,
    repeatCustomerRate: 72
  },
  {
    id: 3,
    name: 'Burger Brothers',
    category: 'American',
    location: 'Basel Marktplatz',
    avatar: '🍔',
    revenue: 42150,
    revenueGrowth: -3.2,
    orders: 1105,
    ordersGrowth: -1.5,
    rating: 4.6,
    reviews: 512,
    avgOrderValue: 38.14,
    activeHours: '11:00 - 22:00',
    topItems: ['Classic Burger', 'BBQ Bacon Burger', 'Sweet Potato Fries'],
    customerSatisfaction: 88,
    repeatCustomerRate: 61
  },
  {
    id: 4,
    name: 'Sushi Roll Master',
    category: 'Japanisch',
    location: 'Zürich Paradeplatz',
    avatar: '🍱',
    revenue: 52340,
    revenueGrowth: 22.8,
    orders: 876,
    ordersGrowth: 19.4,
    rating: 4.7,
    reviews: 198,
    avgOrderValue: 59.75,
    activeHours: '11:30 - 14:00, 18:00 - 21:00',
    topItems: ['Salmon Roll', 'Rainbow Roll', 'Miso Soup'],
    customerSatisfaction: 92,
    repeatCustomerRate: 65
  },
  {
    id: 5,
    name: 'Taco Fiesta',
    category: 'Mexikanisch',
    location: 'Luzern Schwanenplatz',
    avatar: '🌮',
    revenue: 35670,
    revenueGrowth: 9.1,
    orders: 1423,
    ordersGrowth: 11.2,
    rating: 4.8,
    reviews: 423,
    avgOrderValue: 25.08,
    activeHours: '11:00 - 21:00',
    topItems: ['Chicken Tacos', 'Beef Burrito', 'Nachos Grande'],
    customerSatisfaction: 90,
    repeatCustomerRate: 70
  }
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const formatCurrency = (value) => {
  return `CHF ${value.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getRankIcon = (rank) => {
  switch (rank) {
    case 1: return { icon: Trophy, color: '#fbbf24' };
    case 2: return { icon: Medal, color: '#9ca3af' };
    case 3: return { icon: Award, color: '#f97316' };
    default: return null;
  }
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================
const FoodtruckCard = ({ foodtruck, rank, onViewDetails }) => {
  const [showMenu, setShowMenu] = useState(false);
  const rankIcon = getRankIcon(rank);
  const RankIcon = rankIcon?.icon;
  
  return (
    <div className={styles.foodtruckCard}>
      <div className={styles.rankBadge}>
        {rankIcon ? (
          <RankIcon size={20} style={{ color: rankIcon.color }} />
        ) : (
          <span className={styles.rankNumber}>#{rank}</span>
        )}
      </div>
      
      <div className={styles.foodtruckHeader}>
        <div className={styles.avatar}>{foodtruck.avatar}</div>
        <div className={styles.foodtruckInfo}>
          <h4>{foodtruck.name}</h4>
          <div className={styles.metadata}>
            <span className={styles.category}>{foodtruck.category}</span>
            <span className={styles.location}>
              <MapPin size={12} />
              {foodtruck.location}
            </span>
          </div>
        </div>
        
        <div className={styles.actions}>
          <button
            className={styles.menuButton}
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreVertical size={18} />
          </button>
          
          {showMenu && (
            <div className={styles.dropdown}>
              <button onClick={() => onViewDetails(foodtruck)}>
                <Eye size={14} />
                Details anzeigen
              </button>
              <button>
                <MessageSquare size={14} />
                Nachricht senden
              </button>
              <button>
                <Phone size={14} />
                Anrufen
              </button>
              <button>
                <Mail size={14} />
                E-Mail senden
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className={styles.metricsGrid}>
        <div className={styles.metric}>
          <div className={styles.metricHeader}>
            <DollarSign size={14} />
            <span>Umsatz (30T)</span>
          </div>
          <div className={styles.metricValue}>
            {formatCurrency(foodtruck.revenue)}
          </div>
          <div className={`${styles.metricChange} ${foodtruck.revenueGrowth > 0 ? styles.positive : styles.negative}`}>
            {foodtruck.revenueGrowth > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(foodtruck.revenueGrowth)}%
          </div>
        </div>
        
        <div className={styles.metric}>
          <div className={styles.metricHeader}>
            <Package size={14} />
            <span>Bestellungen</span>
          </div>
          <div className={styles.metricValue}>
            {foodtruck.orders.toLocaleString()}
          </div>
          <div className={`${styles.metricChange} ${foodtruck.ordersGrowth > 0 ? styles.positive : styles.negative}`}>
            {foodtruck.ordersGrowth > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(foodtruck.ordersGrowth)}%
          </div>
        </div>
        
        <div className={styles.metric}>
          <div className={styles.metricHeader}>
            <Star size={14} />
            <span>Bewertung</span>
          </div>
          <div className={styles.metricValue}>
            {foodtruck.rating}
          </div>
          <div className={styles.metricSubtext}>
            {foodtruck.reviews} Reviews
          </div>
        </div>
      </div>
      
      <div className={styles.additionalInfo}>
        <div className={styles.infoItem}>
          <Clock size={12} />
          <span>{foodtruck.activeHours}</span>
        </div>
        <div className={styles.infoItem}>
          <Users size={12} />
          <span>{foodtruck.repeatCustomerRate}% Stammkunden</span>
        </div>
      </div>
      
      <div className={styles.topItems}>
        <span className={styles.topItemsLabel}>Top Gerichte:</span>
        <div className={styles.itemsList}>
          {foodtruck.topItems.map((item, idx) => (
            <span key={idx} className={styles.topItem}>{item}</span>
          ))}
        </div>
      </div>
      
      <button 
        className={styles.viewDetailsButton}
        onClick={() => onViewDetails(foodtruck)}
      >
        Details anzeigen
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const TopFoodtrucks = ({ 
  limit = 5,
  sortBy = 'revenue',
  showFullDetails = true 
}) => {
  const [selectedSort, setSelectedSort] = useState(sortBy);
  const [selectedFoodtruck, setSelectedFoodtruck] = useState(null);
  
  // Sort foodtrucks based on selected criteria
  const sortedFoodtrucks = useMemo(() => {
    const sorted = [...MOCK_FOODTRUCKS].sort((a, b) => {
      switch (selectedSort) {
        case 'revenue':
          return b.revenue - a.revenue;
        case 'orders':
          return b.orders - a.orders;
        case 'rating':
          return b.rating - a.rating;
        case 'growth':
          return b.revenueGrowth - a.revenueGrowth;
        default:
          return 0;
      }
    });
    
    return sorted.slice(0, limit);
  }, [selectedSort, limit]);
  
  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const stats = sortedFoodtrucks.reduce((acc, ft) => ({
      totalRevenue: acc.totalRevenue + ft.revenue,
      totalOrders: acc.totalOrders + ft.orders,
      avgRating: acc.avgRating + ft.rating / sortedFoodtrucks.length,
      avgGrowth: acc.avgGrowth + ft.revenueGrowth / sortedFoodtrucks.length
    }), { totalRevenue: 0, totalOrders: 0, avgRating: 0, avgGrowth: 0 });
    
    return stats;
  }, [sortedFoodtrucks]);
  
  const handleViewDetails = (foodtruck) => {
    setSelectedFoodtruck(foodtruck);
    // In real app, this would navigate or open a modal
    console.log('View details for:', foodtruck.name);
  };
  
  return (
    <div className={styles.topFoodtrucks}>
      {/* Header with sort options */}
      <div className={styles.header}>
        <h3>Top {limit} Foodtrucks</h3>
        <div className={styles.sortOptions}>
          {Object.entries(SORT_OPTIONS).map(([key, option]) => {
            const Icon = option.icon;
            return (
              <button
                key={key}
                className={`${styles.sortButton} ${selectedSort === key ? styles.active : ''}`}
                onClick={() => setSelectedSort(key)}
              >
                <Icon size={14} />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Summary stats */}
      {showFullDetails && (
        <div className={styles.summaryStats}>
          <div className={styles.stat}>
            <span>Gesamt-Umsatz</span>
            <strong>{formatCurrency(summaryStats.totalRevenue)}</strong>
          </div>
          <div className={styles.stat}>
            <span>Gesamt-Bestellungen</span>
            <strong>{summaryStats.totalOrders.toLocaleString()}</strong>
          </div>
          <div className={styles.stat}>
            <span>Ø Bewertung</span>
            <strong>{summaryStats.avgRating.toFixed(1)} ⭐</strong>
          </div>
          <div className={styles.stat}>
            <span>Ø Wachstum</span>
            <strong className={summaryStats.avgGrowth > 0 ? styles.positive : styles.negative}>
              {summaryStats.avgGrowth > 0 ? '+' : ''}{summaryStats.avgGrowth.toFixed(1)}%
            </strong>
          </div>
        </div>
      )}
      
      {/* Foodtruck list */}
      <div className={styles.foodtruckList}>
        {sortedFoodtrucks.map((foodtruck, index) => (
          <FoodtruckCard
            key={foodtruck.id}
            foodtruck={foodtruck}
            rank={index + 1}
            onViewDetails={handleViewDetails}
          />
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// EXPORT
// ============================================================================
export default TopFoodtrucks;