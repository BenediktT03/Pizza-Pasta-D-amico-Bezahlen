/**
 * EATECH - Switzerland Map Component
 * Version: 1.0.0
 * Description: Interaktive SVG-Karte der Schweiz mit Kantonen
 *              für Foodtruck-Verteilung und Statistiken
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/master/src/components/Dashboard/SwitzerlandMap.jsx
 */

import React, { useState, useCallback, useMemo } from 'react';
import styles from './SwitzerlandMap.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
// Simplified SVG paths for Swiss cantons (approximate shapes)
const CANTON_PATHS = {
  ZH: {
    path: "M 420 180 L 460 170 L 480 190 L 470 220 L 440 230 L 410 210 Z",
    center: { x: 445, y: 200 },
    name: "Zürich"
  },
  BE: {
    path: "M 320 200 L 380 190 L 400 220 L 390 280 L 350 290 L 310 270 L 300 230 Z",
    center: { x: 350, y: 240 },
    name: "Bern"
  },
  VD: {
    path: "M 180 280 L 240 270 L 260 300 L 250 340 L 210 350 L 170 330 L 160 300 Z",
    center: { x: 210, y: 310 },
    name: "Vaud"
  },
  AG: {
    path: "M 380 170 L 420 160 L 430 190 L 410 200 L 380 190 Z",
    center: { x: 405, y: 180 },
    name: "Aargau"
  },
  SG: {
    path: "M 480 150 L 520 140 L 540 170 L 530 200 L 490 210 L 470 180 Z",
    center: { x: 505, y: 175 },
    name: "St. Gallen"
  },
  LU: {
    path: "M 360 190 L 390 185 L 400 210 L 385 225 L 355 220 L 350 200 Z",
    center: { x: 375, y: 205 },
    name: "Luzern"
  },
  TI: {
    path: "M 370 340 L 410 330 L 430 360 L 420 400 L 380 410 L 350 390 L 340 360 Z",
    center: { x: 385, y: 370 },
    name: "Ticino"
  },
  VS: {
    path: "M 280 320 L 340 310 L 360 340 L 350 380 L 310 390 L 270 370 L 260 340 Z",
    center: { x: 310, y: 350 },
    name: "Valais"
  },
  FR: {
    path: "M 280 230 L 310 225 L 320 250 L 310 270 L 280 275 L 270 250 Z",
    center: { x: 295, y: 250 },
    name: "Fribourg"
  },
  BS: {
    path: "M 340 150 L 360 145 L 365 160 L 355 165 L 340 160 Z",
    center: { x: 352, y: 155 },
    name: "Basel-Stadt"
  },
  BL: {
    path: "M 345 140 L 375 135 L 380 155 L 370 165 L 345 160 L 340 145 Z",
    center: { x: 360, y: 150 },
    name: "Basel-Land"
  },
  GE: {
    path: "M 140 310 L 165 305 L 170 325 L 160 335 L 140 330 L 135 315 Z",
    center: { x: 152, y: 320 },
    name: "Genève"
  },
  NE: {
    path: "M 250 210 L 280 205 L 285 225 L 275 235 L 250 230 L 245 215 Z",
    center: { x: 265, y: 220 },
    name: "Neuchâtel"
  },
  JU: {
    path: "M 280 170 L 310 165 L 315 185 L 305 195 L 280 190 L 275 175 Z",
    center: { x: 295, y: 180 },
    name: "Jura"
  },
  SO: {
    path: "M 340 180 L 370 175 L 375 195 L 365 205 L 340 200 L 335 185 Z",
    center: { x: 355, y: 190 },
    name: "Solothurn"
  },
  SH: {
    path: "M 410 130 L 440 125 L 445 145 L 435 155 L 410 150 L 405 135 Z",
    center: { x: 425, y: 140 },
    name: "Schaffhausen"
  },
  TG: {
    path: "M 450 140 L 480 135 L 485 160 L 475 170 L 450 165 L 445 145 Z",
    center: { x: 465, y: 152 },
    name: "Thurgau"
  },
  GR: {
    path: "M 480 220 L 540 210 L 560 240 L 550 290 L 510 300 L 470 280 L 460 240 Z",
    center: { x: 510, y: 255 },
    name: "Graubünden"
  },
  GL: {
    path: "M 440 210 L 460 205 L 465 225 L 455 235 L 440 230 L 435 215 Z",
    center: { x: 450, y: 220 },
    name: "Glarus"
  },
  SZ: {
    path: "M 400 210 L 420 205 L 425 225 L 415 235 L 400 230 L 395 215 Z",
    center: { x: 410, y: 220 },
    name: "Schwyz"
  },
  UR: {
    path: "M 390 240 L 410 235 L 415 260 L 405 270 L 390 265 L 385 245 Z",
    center: { x: 400, y: 252 },
    name: "Uri"
  },
  ZG: {
    path: "M 385 200 L 400 197 L 403 210 L 395 215 L 385 210 L 382 203 Z",
    center: { x: 392, y: 206 },
    name: "Zug"
  },
  NW: {
    path: "M 375 215 L 390 212 L 393 225 L 385 230 L 375 225 L 372 218 Z",
    center: { x: 382, y: 221 },
    name: "Nidwalden"
  },
  OW: {
    path: "M 380 225 L 395 222 L 398 235 L 390 240 L 380 235 L 377 228 Z",
    center: { x: 387, y: 231 },
    name: "Obwalden"
  },
  AI: {
    path: "M 485 165 L 495 163 L 497 173 L 492 176 L 485 173 L 483 167 Z",
    center: { x: 490, y: 170 },
    name: "Appenzell Inner."
  },
  AR: {
    path: "M 490 155 L 505 152 L 508 165 L 500 170 L 490 165 L 487 158 Z",
    center: { x: 497, y: 161 },
    name: "Appenzell Auss."
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const getCantonColor = (value, maxValue) => {
  const percentage = value / maxValue;
  if (percentage > 0.7) return '#10b981'; // Green - High
  if (percentage > 0.4) return '#fbbf24'; // Yellow - Medium
  return '#fee2e2'; // Light Red - Low
};

const formatNumber = (num) => {
  return num.toLocaleString('de-CH');
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const SwitzerlandMap = ({ data, onCantonClick, selectedCanton }) => {
  const [hoveredCanton, setHoveredCanton] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  // Calculate max values for color scaling
  const maxValues = useMemo(() => {
    const values = Object.values(data);
    return {
      foodtrucks: Math.max(...values.map(v => v.foodtrucks)),
      revenue: Math.max(...values.map(v => v.revenue))
    };
  }, [data]);
  
  // Handle mouse enter
  const handleMouseEnter = useCallback((e, cantonCode) => {
    setHoveredCanton(cantonCode);
    const rect = e.currentTarget.getBoundingClientRect();
    const mapRect = e.currentTarget.closest('svg').getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2 - mapRect.left,
      y: rect.top - mapRect.top - 10
    });
  }, []);
  
  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setHoveredCanton(null);
  }, []);
  
  // Handle canton click
  const handleCantonClick = useCallback((cantonCode) => {
    onCantonClick(cantonCode);
  }, [onCantonClick]);
  
  return (
    <div className={styles.mapContainer}>
      <svg
        viewBox="0 0 600 500"
        className={styles.map}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background */}
        <rect width="600" height="500" fill="#f9fafb" />
        
        {/* Grid lines for visual reference */}
        <g className={styles.grid}>
          {[100, 200, 300, 400, 500].map(x => (
            <line
              key={`v${x}`}
              x1={x}
              y1="0"
              x2={x}
              y2="500"
              stroke="#e5e7eb"
              strokeWidth="0.5"
              strokeDasharray="2,2"
              opacity="0.5"
            />
          ))}
          {[100, 200, 300, 400].map(y => (
            <line
              key={`h${y}`}
              x1="0"
              y1={y}
              x2="600"
              y2={y}
              stroke="#e5e7eb"
              strokeWidth="0.5"
              strokeDasharray="2,2"
              opacity="0.5"
            />
          ))}
        </g>
        
        {/* Cantons */}
        {Object.entries(CANTON_PATHS).map(([code, canton]) => {
          const cantonData = data[code];
          if (!cantonData) return null;
          
          const isSelected = selectedCanton === code;
          const isHovered = hoveredCanton === code;
          const color = getCantonColor(cantonData.foodtrucks, maxValues.foodtrucks);
          
          return (
            <g key={code}>
              {/* Canton shape */}
              <path
                d={canton.path}
                fill={color}
                stroke={isSelected ? '#3b82f6' : '#d1d5db'}
                strokeWidth={isSelected ? '3' : '1'}
                className={styles.canton}
                onMouseEnter={(e) => handleMouseEnter(e, code)}
                onMouseLeave={handleMouseLeave}
                onClick={() => handleCantonClick(code)}
                style={{
                  cursor: 'pointer',
                  transform: (isHovered || isSelected) ? 'scale(1.05)' : 'scale(1)',
                  transformOrigin: `${canton.center.x}px ${canton.center.y}px`,
                  transition: 'all 0.2s ease-out'
                }}
              />
              
              {/* Canton label */}
              <text
                x={canton.center.x}
                y={canton.center.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className={styles.cantonLabel}
                pointerEvents="none"
              >
                {code}
              </text>
              
              {/* Foodtruck count */}
              <text
                x={canton.center.x}
                y={canton.center.y + 15}
                textAnchor="middle"
                dominantBaseline="middle"
                className={styles.cantonCount}
                pointerEvents="none"
              >
                {cantonData.foodtrucks}
              </text>
            </g>
          );
        })}
        
        {/* Lakes (simplified) */}
        <g className={styles.lakes}>
          {/* Lake Geneva */}
          <ellipse
            cx="180"
            cy="315"
            rx="35"
            ry="15"
            fill="#dbeafe"
            opacity="0.6"
          />
          {/* Lake Zurich */}
          <ellipse
            cx="440"
            cy="195"
            rx="25"
            ry="10"
            fill="#dbeafe"
            opacity="0.6"
          />
          {/* Lake Constance */}
          <ellipse
            cx="510"
            cy="140"
            rx="30"
            ry="12"
            fill="#dbeafe"
            opacity="0.6"
          />
        </g>
      </svg>
      
      {/* Tooltip */}
      {hoveredCanton && data[hoveredCanton] && (
        <div
          className={styles.tooltip}
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y
          }}
        >
          <h4>{CANTON_PATHS[hoveredCanton].name}</h4>
          <div className={styles.tooltipContent}>
            <div className={styles.tooltipRow}>
              <span>Foodtrucks:</span>
              <strong>{data[hoveredCanton].foodtrucks}</strong>
            </div>
            <div className={styles.tooltipRow}>
              <span>Umsatz:</span>
              <strong>CHF {formatNumber(data[hoveredCanton].revenue)}</strong>
            </div>
            <div className={styles.tooltipRow}>
              <span>Wachstum:</span>
              <strong className={styles.growth}>
                +{data[hoveredCanton].growth}%
              </strong>
            </div>
          </div>
        </div>
      )}
      
      {/* Map controls */}
      <div className={styles.mapControls}>
        <button className={styles.zoomButton}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        <button className={styles.zoomButton}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// EXPORT
// ============================================================================
export default SwitzerlandMap;