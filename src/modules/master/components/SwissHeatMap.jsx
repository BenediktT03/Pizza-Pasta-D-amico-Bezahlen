/**
 * EATECH - Swiss Heat Map Component
 * Version: 5.0.0
 * Description: Interactive Switzerland map showing live order activity
 * File Path: /src/modules/master/components/SwissHeatMap.jsx
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { MapPin, TrendingUp, Users, DollarSign } from 'lucide-react';
import { SWISS_CANTONS, SWISS_CITIES, getHeatColor } from '../utils/swissMapData';
import styles from './SwissHeatMap.module.css';

// ============================================================================
// COMPONENT
// ============================================================================
const SwissHeatMap = ({ heatMapData, liveOrders, onCantonClick }) => {
  // State
  const [selectedCanton, setSelectedCanton] = useState(null);
  const [hoveredCanton, setHoveredCanton] = useState(null);
  const [animatedOrders, setAnimatedOrders] = useState([]);
  const [mapScale, setMapScale] = useState(1);
  
  // Calculate max values for heat scaling
  const maxValues = useMemo(() => {
    const values = Object.values(heatMapData);
    return {
      orders: Math.max(...values.map(v => v.orders || 0), 1),
      revenue: Math.max(...values.map(v => v.revenue || 0), 1)
    };
  }, [heatMapData]);
  
  // Animate new orders
  useEffect(() => {
    const newOrders = liveOrders.slice(0, 5).map(order => ({
      ...order,
      animationId: "${order.id}-${Date.now()}"
    }));
    setAnimatedOrders(newOrders);
    
    // Remove animation after 3 seconds
    const timer = setTimeout(() => {
      setAnimatedOrders([]);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [liveOrders]);
  
  // Handle canton click
  const handleCantonClick = useCallback((canton) => {
    setSelectedCanton(canton);
    if (onCantonClick) {
      onCantonClick(canton, heatMapData[canton.id]);
    }
  }, [heatMapData, onCantonClick]);
  
  // Handle zoom
  const handleZoom = useCallback((delta) => {
    setMapScale(prev => Math.max(0.5, Math.min(2, prev + delta)));
  }, []);
  
  // Get canton stats
  const getCantonStats = useCallback((cantonId) => {
    const data = heatMapData[cantonId] || { orders: 0, revenue: 0, cities: {} };
    const topCity = Object.values(data.cities || {})
      .sort((a, b) => b.orders - a.orders)[0];
    
    return {
      ...data,
      topCity,
      revenuePerOrder: data.orders > 0 ? data.revenue / data.orders : 0
    };
  }, [heatMapData]);
  
  // Render SVG map
  const renderMap = () => (
    <svg
      viewBox='0 0 800 500'
      className={styles.map}
      style={{ transform: "scale(${mapScale})" }}
    >
      {/* Background */}
      <rect width='800' height='500' fill='#f8f9fa' />
      
      {/* Grid lines */}
      {[...Array(8)].map((_, i) => (
        <g key={"grid-${i}"}>
          <line
            x1={i * 100}
            y1='0'
            x2={i * 100}
            y2='500'
            stroke='#e0e0e0'
            strokeWidth='0.5'
            opacity='0.3'
          />
          <line
            x1='0'
            y1={i * 100}
            x2='800'
            y2={i * 100}
            stroke='#e0e0e0'
            strokeWidth='0.5'
            opacity='0.3'
          />
        </g>
      ))}
      
      {/* Cantons */}
      {SWISS_CANTONS.map(canton => {
        const stats = getCantonStats(canton.id);
        const isHovered = hoveredCanton === canton.id;
        const isSelected = selectedCanton?.id === canton.id;
        
        return (
          <g key={canton.id}>
            <path
              d={canton.path}
              fill={getHeatColor(stats.orders, maxValues.orders)}
              stroke={isSelected ? '#1976d2' : '#666'}
              strokeWidth={isSelected ? 2 : 1}
              opacity={isHovered ? 0.8 : 1}
              className={styles.canton}
              onMouseEnter={() => setHoveredCanton(canton.id)}
              onMouseLeave={() => setHoveredCanton(null)}
              onClick={() => handleCantonClick(canton)}
            />
            
            {/* Canton label */}
            <text
              x={canton.center.lng * 80 - 100}
              y={canton.center.lat * -10 + 550}
              textAnchor='middle'
              className={styles.cantonLabel}
              pointerEvents='none'
            >
              {canton.id}
            </text>
            
            {/* Show order count if significant */}
            {stats.orders > 5 && (
              <text
                x={canton.center.lng * 80 - 100}
                y={canton.center.lat * -10 + 565}
                textAnchor='middle'
                className={styles.orderCount}
                pointerEvents='none'
              >
                {stats.orders}
              </text>
            )}
          </g>
        );
      })}
      
      {/* Cities */}
      {SWISS_CITIES.filter(city => city.importance >= 7).map(city => (
        <g key={city.id}>
          <circle
            cx={city.coordinates.lng * 80 - 100}
            cy={city.coordinates.lat * -10 + 550}
            r={city.importance / 2}
            fill='#333'
            opacity='0.6'
          />
          <text
            x={city.coordinates.lng * 80 - 100}
            y={city.coordinates.lat * -10 + 548}
            textAnchor='middle'
            className={styles.cityLabel}
            fontSize='10'
          >
            {city.name}
          </text>
        </g>
      ))}
      
      {/* Animated order indicators */}
      {animatedOrders.map(order => {
        if (!order.location) return null;
        const x = order.location.lng * 80 - 100;
        const y = order.location.lat * -10 + 550;
        
        return (
          <g key={order.animationId} className={styles.orderPulse}>
            <circle
              cx={x}
              cy={y}
              r='3'
              fill='#ff6b6b'
              opacity='0.8'
            />
            <circle
              cx={x}
              cy={y}
              r='3'
              fill='none'
              stroke='#ff6b6b'
              strokeWidth='2'
              opacity='0.6'
              className={styles.pulseRing}
            />
          </g>
        );
      })}
    </svg>
  );
  // Render stats panel
  const renderStatsPanel = () => {
    if (!hoveredCanton && !selectedCanton) return null;
    
    const canton = selectedCanton || SWISS_CANTONS.find(c => c.id === hoveredCanton);
    const stats = getCantonStats(canton.id);
    
    return (
      <div className={styles.statsPanel}>
        <h4>{canton.name}</h4>
        <div className={styles.statGrid}>
          <div className={styles.stat}>
            <Users className={styles.statIcon} />
            <span className={styles.statValue}>{stats.orders}</span>
            <span className={styles.statLabel}>Bestellungen</span>
          </div>
          <div className={styles.stat}>
            <DollarSign className={styles.statIcon} />
            <span className={styles.statValue}>
              CHF {(stats.revenue || 0).toFixed(0)}
            </span>
            <span className={styles.statLabel}>Umsatz</span>
          </div>
          <div className={styles.stat}>
            <TrendingUp className={styles.statIcon} />
            <span className={styles.statValue}>
              CHF {stats.revenuePerOrder.toFixed(2)}
            </span>
            <span className={styles.statLabel}>⌀ Bestellung</span>
          </div>
        </div>
        
        {stats.topCity && (
          <div className={styles.topCity}>
            <MapPin size={16} />
            <span>Top Stadt: {stats.topCity.name} ({stats.topCity.orders} Bestellungen)</span>
          </div>
        )}
      </div>
    );
  };
  
  // Render legend
  const renderLegend = () => (
    <div className={styles.legend}>
      <h5>Bestellaktivität</h5>
      <div className={styles.legendItems}>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: '#f0f0f0' }} />
          <span>Keine</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: '#ffe4e1' }} />
          <span>Niedrig</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: '#ffb3ba' }} />
          <span>Mittel</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: '#ff7f86' }} />
          <span>Hoch</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: '#ff1744' }} />
          <span>Sehr hoch</span>
        </div>
      </div>
    </div>
  );
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Live Bestellaktivität Schweiz</h3>
        <div className={styles.controls}>
          <button 
            onClick={() => handleZoom(0.1)} 
            className={styles.zoomButton}
            aria-label='Zoom in'
          >
            +
          </button>
          <button 
            onClick={() => handleZoom(-0.1)} 
            className={styles.zoomButton}
            aria-label='Zoom out'
          >
            -
          </button>
        </div>
      </div>
      
      <div className={styles.mapContainer}>
        {renderMap()}
        {renderStatsPanel()}
      </div>
      
      {renderLegend()}
      
      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <strong>Total Bestellungen:</strong>
          <span>{Object.values(heatMapData).reduce((sum, d) => sum + d.orders, 0)}</span>
        </div>
        <div className={styles.summaryItem}>
          <strong>Total Umsatz:</strong>
          <span>CHF {Object.values(heatMapData).reduce((sum, d) => sum + d.revenue, 0).toFixed(2)}</span>
        </div>
        <div className={styles.summaryItem}>
          <strong>Aktive Kantone:</strong>
          <span>{Object.keys(heatMapData).length}</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PROP TYPES
// ============================================================================
SwissHeatMap.propTypes = {
  heatMapData: PropTypes.object.isRequired,
  liveOrders: PropTypes.array,
  onCantonClick: PropTypes.func
};

SwissHeatMap.defaultProps = {
  liveOrders: [],
  onCantonClick: null
};

// ============================================================================
// EXPORT
// ============================================================================
export default React.memo(SwissHeatMap);
