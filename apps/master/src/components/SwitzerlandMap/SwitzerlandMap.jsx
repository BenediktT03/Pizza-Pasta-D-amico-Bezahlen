/**
 * EATECH Switzerland Map Component
 * Version: 1.0.0
 * 
 * Interaktive Schweizer Karte mit Foodtruck-Positionen
 * Features:
 * - SVG-basierte Schweizer Karte
 * - Echtzeit Foodtruck-Positionen
 * - Hover und Click Interaktionen
 * - Heatmap-Overlay für Bestelldichte
 * 
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/master/src/components/SwitzerlandMap/SwitzerlandMap.jsx
 */

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Truck, Activity, AlertCircle } from 'lucide-react';
import styles from './SwitzerlandMap.module.css';

const SwitzerlandMap = ({ foodtrucks = [], onFoodtruckClick, showHeatmap = false }) => {
  const [hoveredTruck, setHoveredTruck] = useState(null);
  const [selectedCanton, setSelectedCanton] = useState(null);
  const mapRef = useRef(null);

  // Major Swiss cities coordinates (normalized to 0-100 scale)
  const cities = {
    zurich: { x: 72, y: 25, name: 'Zürich' },
    bern: { x: 46, y: 42, name: 'Bern' },
    basel: { x: 48, y: 15, name: 'Basel' },
    geneva: { x: 15, y: 72, name: 'Genf' },
    lausanne: { x: 25, y: 62, name: 'Lausanne' },
    lucerne: { x: 65, y: 38, name: 'Luzern' },
    stgallen: { x: 85, y: 20, name: 'St. Gallen' },
    lugano: { x: 75, y: 85, name: 'Lugano' }
  };

  // Convert lat/lng to map coordinates
  const latLngToXY = (lat, lng) => {
    // Swiss coordinate bounds
    const bounds = {
      minLat: 45.8,
      maxLat: 47.8,
      minLng: 5.9,
      maxLng: 10.5
    };
    
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
    const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * 100;
    
    return { x, y };
  };

  // Canton regions (simplified)
  const cantons = [
    { id: 'ZH', name: 'Zürich', path: 'M 65 20 L 80 15 L 85 25 L 80 35 L 70 30 Z', orders: 234 },
    { id: 'BE', name: 'Bern', path: 'M 35 35 L 60 30 L 65 45 L 55 55 L 40 50 Z', orders: 156 },
    { id: 'VD', name: 'Waadt', path: 'M 15 55 L 35 50 L 40 65 L 30 75 L 20 70 Z', orders: 89 },
    { id: 'AG', name: 'Aargau', path: 'M 50 25 L 65 20 L 70 30 L 60 35 L 55 30 Z', orders: 123 },
    { id: 'SG', name: 'St. Gallen', path: 'M 80 15 L 95 10 L 95 25 L 85 30 L 80 25 Z', orders: 67 },
    { id: 'LU', name: 'Luzern', path: 'M 60 35 L 70 30 L 75 40 L 65 45 L 60 40 Z', orders: 98 },
    { id: 'TI', name: 'Tessin', path: 'M 65 75 L 80 70 L 85 85 L 75 90 L 70 85 Z', orders: 45 },
    { id: 'VS', name: 'Wallis', path: 'M 35 65 L 55 60 L 60 75 L 50 85 L 40 80 Z', orders: 34 }
  ];

  // Calculate heatmap intensity
  const getHeatmapColor = (orders) => {
    const maxOrders = Math.max(...cantons.map(c => c.orders));
    const intensity = orders / maxOrders;
    
    if (intensity > 0.8) return 'rgba(239, 68, 68, 0.3)'; // Red
    if (intensity > 0.6) return 'rgba(245, 158, 11, 0.3)'; // Orange
    if (intensity > 0.4) return 'rgba(59, 130, 246, 0.3)'; // Blue
    if (intensity > 0.2) return 'rgba(16, 185, 129, 0.3)'; // Green
    return 'rgba(148, 163, 184, 0.1)'; // Gray
  };

  return (
    <div className={styles.mapContainer} ref={mapRef}>
      <svg
        viewBox="0 0 100 100"
        className={styles.map}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background */}
        <rect width="100" height="100" fill="var(--bg-primary)" />
        
        {/* Grid lines for reference */}
        <g className={styles.grid}>
          {[...Array(10)].map((_, i) => (
            <React.Fragment key={i}>
              <line
                x1={i * 10}
                y1="0"
                x2={i * 10}
                y2="100"
                stroke="var(--border-color)"
                strokeWidth="0.1"
                opacity="0.3"
              />
              <line
                x1="0"
                y1={i * 10}
                x2="100"
                y2={i * 10}
                stroke="var(--border-color)"
                strokeWidth="0.1"
                opacity="0.3"
              />
            </React.Fragment>
          ))}
        </g>

        {/* Switzerland outline (simplified) */}
        <path
          d="M 10 60 L 15 50 L 25 45 L 35 35 L 45 30 L 55 25 L 65 20 L 75 15 L 85 10 L 95 15 L 95 25 L 90 35 L 85 45 L 80 55 L 75 65 L 70 75 L 65 85 L 55 90 L 45 85 L 35 80 L 25 75 L 15 70 Z"
          fill="none"
          stroke="var(--border-color)"
          strokeWidth="1"
          className={styles.switzerlandOutline}
        />

        {/* Canton regions with heatmap */}
        {cantons.map(canton => (
          <g key={canton.id}>
            <path
              d={canton.path}
              fill={showHeatmap ? getHeatmapColor(canton.orders) : 'transparent'}
              stroke="var(--border-color)"
              strokeWidth="0.5"
              className={styles.canton}
              onClick={() => setSelectedCanton(canton)}
              onMouseEnter={() => setSelectedCanton(canton)}
              onMouseLeave={() => setSelectedCanton(null)}
            />
            {selectedCanton?.id === canton.id && (
              <text
                x={canton.path.split(' ')[1]}
                y={canton.path.split(' ')[2]}
                className={styles.cantonLabel}
                textAnchor="middle"
              >
                {canton.name}
              </text>
            )}
          </g>
        ))}

        {/* Cities */}
        {Object.entries(cities).map(([key, city]) => (
          <g key={key} className={styles.city}>
            <circle
              cx={city.x}
              cy={city.y}
              r="1"
              fill="var(--text-secondary)"
            />
            <text
              x={city.x}
              y={city.y - 2}
              textAnchor="middle"
              className={styles.cityLabel}
            >
              {city.name}
            </text>
          </g>
        ))}

        {/* Foodtrucks */}
        {foodtrucks.map(truck => {
          const pos = latLngToXY(truck.location.lat, truck.location.lng);
          const isHovered = hoveredTruck === truck.id;
          
          return (
            <g
              key={truck.id}
              className={styles.foodtruck}
              onMouseEnter={() => setHoveredTruck(truck.id)}
              onMouseLeave={() => setHoveredTruck(null)}
              onClick={() => onFoodtruckClick?.(truck)}
            >
              {/* Pulse animation for active trucks */}
              {truck.status === 'active' && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="3"
                  fill="none"
                  stroke="var(--success-color)"
                  strokeWidth="0.5"
                  opacity="0.5"
                  className={styles.pulse}
                />
              )}
              
              {/* Truck icon background */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isHovered ? "2.5" : "2"}
                fill={truck.status === 'active' ? 'var(--success-color)' : 'var(--warning-color)'}
                className={styles.truckDot}
              />
              
              {/* Truck icon */}
              <foreignObject
                x={pos.x - 1.5}
                y={pos.y - 1.5}
                width="3"
                height="3"
              >
                <Truck 
                  className={styles.truckIcon}
                  style={{ 
                    width: '100%', 
                    height: '100%',
                    color: 'white'
                  }} 
                />
              </foreignObject>
              
              {/* Tooltip */}
              {isHovered && (
                <foreignObject
                  x={pos.x + 3}
                  y={pos.y - 5}
                  width="30"
                  height="10"
                  className={styles.tooltip}
                >
                  <div className={styles.tooltipContent}>
                    <h4>{truck.name}</h4>
                    <p>
                      <Activity size={12} />
                      {truck.orders} Bestellungen
                    </p>
                    <p>
                      CHF {truck.revenue.toFixed(2)}
                    </p>
                    <span className={`${styles.status} ${styles[truck.status]}`}>
                      {truck.status === 'active' ? 'Aktiv' : 'Pausiert'}
                    </span>
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}

        {/* Legend */}
        <g className={styles.legend}>
          <rect x="2" y="85" width="25" height="12" fill="var(--bg-secondary)" stroke="var(--border-color)" strokeWidth="0.5" rx="1" />
          <text x="4" y="89" className={styles.legendTitle}>Legende</text>
          <circle cx="6" cy="93" r="0.5" fill="var(--success-color)" />
          <text x="8" y="93.5" className={styles.legendText}>Aktiv</text>
          <circle cx="16" cy="93" r="0.5" fill="var(--warning-color)" />
          <text x="18" y="93.5" className={styles.legendText}>Pausiert</text>
        </g>

        {/* Stats overlay */}
        {selectedCanton && (
          <g className={styles.statsOverlay}>
            <rect
              x="70"
              y="85"
              width="28"
              height="12"
              fill="var(--bg-secondary)"
              stroke="var(--border-color)"
              strokeWidth="0.5"
              rx="1"
            />
            <text x="72" y="89" className={styles.statsTitle}>
              {selectedCanton.name}
            </text>
            <text x="72" y="94" className={styles.statsText}>
              {selectedCanton.orders} Bestellungen heute
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};

export default SwitzerlandMap;