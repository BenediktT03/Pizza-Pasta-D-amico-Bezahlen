/**
 * EATECH - Switzerland Map Component
 * Version: 4.2.0
 * Description: Interaktive Schweizer Karte mit Foodtruck-Standorten und Lazy Loading
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/master/src/components/SwitzerlandMap/SwitzerlandMap.jsx
 * 
 * Features: SVG map, canton statistics, heatmap, real-time updates
 */

import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { 
  MapPin, Users, TrendingUp, Activity,
  ZoomIn, ZoomOut, RotateCcw, Layers,
  Filter, Search, Download, Settings,
  BarChart3, PieChart, Map as MapIcon,
  Eye, EyeOff, RefreshCw
} from 'lucide-react';
import { scaleLinear } from 'd3-scale';
import { interpolateReds, interpolateBlues } from 'd3-scale-chromatic';
import styles from './SwitzerlandMap.module.css';

// Lazy loaded components
const CantonTooltip = lazy(() => import('./components/CantonTooltip'));
const FoodtruckMarker = lazy(() => import('./components/FoodtruckMarker'));
const LegendPanel = lazy(() => import('./components/LegendPanel'));
const StatsPanel = lazy(() => import('./components/StatsPanel'));
const FilterPanel = lazy(() => import('./components/FilterPanel'));
const HeatmapOverlay = lazy(() => import('./components/HeatmapOverlay'));
const ClusterOverlay = lazy(() => import('./components/ClusterOverlay'));

// Lazy loaded services
const MapDataService = lazy(() => import('../../services/MapDataService'));
const GeocodingService = lazy(() => import('../../services/GeocodingService'));
const StatisticsService = lazy(() => import('../../services/StatisticsService'));

// Lazy loaded utilities
const mapProjection = () => import('../../utils/mapProjection');
const geoUtils = () => import('../../utils/geoUtils');
const colorUtils = () => import('../../utils/colorUtils');

const LoadingSpinner = () => (
  <div className={styles.loadingContainer}>
    <div className={styles.spinner} />
    <span>Karte wird geladen...</span>
  </div>
);

// Swiss Cantons with coordinates and data
const SWISS_CANTONS = {
  ZH: { name: 'Zürich', capital: 'Zürich', population: 1539275, area: 1729 },
  BE: { name: 'Bern', capital: 'Bern', population: 1043132, area: 5959 },
  LU: { name: 'Luzern', capital: 'Luzern', population: 416347, area: 1493 },
  UR: { name: 'Uri', capital: 'Altdorf', population: 36433, area: 1077 },
  SZ: { name: 'Schwyz', capital: 'Schwyz', population: 162157, area: 908 },
  OW: { name: 'Obwalden', capital: 'Sarnen', population: 37841, area: 491 },
  NW: { name: 'Nidwalden', capital: 'Stans', population: 43223, area: 276 },
  GL: { name: 'Glarus', capital: 'Glarus', population: 40403, area: 685 },
  ZG: { name: 'Zug', capital: 'Zug', population: 127642, area: 239 },
  FR: { name: 'Freiburg', capital: 'Freiburg', population: 327039, area: 1671 },
  SO: { name: 'Solothurn', capital: 'Solothurn', population: 275247, area: 790 },
  BS: { name: 'Basel-Stadt', capital: 'Basel', population: 195427, area: 37 },
  BL: { name: 'Basel-Landschaft', capital: 'Liestal', population: 295203, area: 518 },
  SH: { name: 'Schaffhausen', capital: 'Schaffhausen', population: 83107, area: 298 },
  AR: { name: 'Appenzell Ausserrhoden', capital: 'Herisau', population: 55309, area: 243 },
  AI: { name: 'Appenzell Innerrhoden', capital: 'Appenzell', population: 16003, area: 173 },
  SG: { name: 'St. Gallen', capital: 'St. Gallen', population: 514504, area: 2026 },
  GR: { name: 'Graubünden', capital: 'Chur', population: 200096, area: 7105 },
  AG: { name: 'Aargau', capital: 'Aarau', population: 695072, area: 1404 },
  TG: { name: 'Thurgau', capital: 'Frauenfeld', population: 282909, area: 991 },
  TI: { name: 'Tessin', capital: 'Bellinzona', population: 355973, area: 2812 },
  VD: { name: 'Waadt', capital: 'Lausanne', population: 815300, area: 3212 },
  VS: { name: 'Wallis', capital: 'Sitten', population: 348503, area: 5224 },
  NE: { name: 'Neuenburg', capital: 'Neuenburg', population: 177964, area: 803 },
  GE: { name: 'Genf', capital: 'Genf', population: 506343, area: 282 },
  JU: { name: 'Jura', capital: 'Delsberg', population: 73584, area: 838 }
};

const MAP_MODES = {
  FOODTRUCKS: 'foodtrucks',
  REVENUE: 'revenue',
  ORDERS: 'orders',
  DENSITY: 'density',
  GROWTH: 'growth'
};

const SwitzerlandMap = ({
  data = {},
  selectedCanton = null,
  mapMode = MAP_MODES.FOODTRUCKS,
  showHeatmap = false,
  showClusters = true,
  onCantonSelect,
  onFoodtruckSelect,
  className = ''
}) => {
  const [mapData, setMapData] = useState(null);
  const [foodtrucks, setFoodtrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredCanton, setHoveredCanton] = useState(null);
  const [selectedFoodtruck, setSelectedFoodtruck] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [mapStatistics, setMapStatistics] = useState({});
  const [activeFilters, setActiveFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });

  const svgRef = useRef(null);
  const mapContainerRef = useRef(null);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  useEffect(() => {
    initializeMap();
  }, []);

  useEffect(() => {
    if (mapData) {
      loadFoodtruckData();
      calculateStatistics();
    }
  }, [mapData, mapMode, activeFilters]);

  const initializeMap = async () => {
    try {
      setLoading(true);
      
      // Load map data
      const { default: MapDataServiceModule } = await MapDataService();
      const swissMapData = await MapDataServiceModule.getSwitzerlandGeoData();
      setMapData(swissMapData);
      
      // Load initial foodtruck data
      await loadFoodtruckData();
      
      console.log('Switzerland map initialized successfully');
      
    } catch (error) {
      console.error('Map initialization failed:', error);
      setError('Fehler beim Laden der Karte');
    } finally {
      setLoading(false);
    }
  };

  const loadFoodtruckData = async () => {
    try {
      const { default: MapDataServiceModule } = await MapDataService();
      const foodtruckData = await MapDataServiceModule.getFoodtruckLocations({
        filters: activeFilters,
        mode: mapMode
      });
      
      setFoodtrucks(foodtruckData);
      
    } catch (error) {
      console.error('Error loading foodtruck data:', error);
    }
  };

  const calculateStatistics = async () => {
    try {
      const { default: StatisticsServiceModule } = await StatisticsService();
      const stats = await StatisticsServiceModule.calculateMapStatistics(
        foodtrucks,
        SWISS_CANTONS,
        mapMode
      );
      
      setMapStatistics(stats);
      
    } catch (error) {
      console.error('Error calculating statistics:', error);
    }
  };

  // ============================================================================
  // COLOR SCALES
  // ============================================================================
  const colorScale = useMemo(() => {
    if (!mapStatistics.cantonData) return () => '#E5E7EB';
    
    const values = Object.values(mapStatistics.cantonData);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    
    switch (mapMode) {
      case MAP_MODES.REVENUE:
        return scaleLinear()
          .domain([minValue, maxValue])
          .range(['#FEF3C7', '#DC2626']);
      
      case MAP_MODES.ORDERS:
        return scaleLinear()
          .domain([minValue, maxValue])
          .range(['#DBEAFE', '#1D4ED8']);
      
      case MAP_MODES.GROWTH:
        return scaleLinear()
          .domain([minValue, maxValue])
          .range(['#FECACA', '#059669']);
      
      default:
        return scaleLinear()
          .domain([minValue, maxValue])
          .range(['#F3F4F6', '#10B981']);
    }
  }, [mapStatistics, mapMode]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  const handleCantonHover = useCallback((canton, event) => {
    setHoveredCanton(canton);
    setTooltipPosition({
      x: event.clientX,
      y: event.clientY
    });
    setShowTooltip(true);
  }, []);

  const handleCantonLeave = useCallback(() => {
    setHoveredCanton(null);
    setShowTooltip(false);
  }, []);

  const handleCantonClick = useCallback((canton) => {
    onCantonSelect?.(canton);
  }, [onCantonSelect]);

  const handleFoodtruckClick = useCallback((foodtruck) => {
    setSelectedFoodtruck(foodtruck);
    onFoodtruckSelect?.(foodtruck);
  }, [onFoodtruckSelect]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev * 1.5, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev / 1.5, 0.5));
  }, []);

  const handleResetView = useCallback(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = useCallback((event) => {
    setIsDragging(true);
    setLastPanPoint({ x: event.clientX, y: event.clientY });
  }, []);

  const handleMouseMove = useCallback((event) => {
    if (!isDragging) return;
    
    const deltaX = event.clientX - lastPanPoint.x;
    const deltaY = event.clientY - lastPanPoint.y;
    
    setPanOffset(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));
    
    setLastPanPoint({ x: event.clientX, y: event.clientY });
  }, [isDragging, lastPanPoint]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFilterChange = useCallback((filters) => {
    setActiveFilters(filters);
  }, []);

  const handleExportMap = useCallback(async () => {
    try {
      const svg = svgRef.current;
      if (!svg) return;
      
      // Create canvas and export as PNG
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const data = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Download
        const link = document.createElement('a');
        link.download = `switzerland-map-${mapMode}-${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL();
        link.click();
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(data);
      
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [mapMode]);

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================
  const renderCanton = useCallback((canton) => {
    if (!mapData?.features) return null;
    
    const cantonData = mapData.features.find(f => f.properties.code === canton);
    if (!cantonData) return null;
    
    const cantonInfo = SWISS_CANTONS[canton];
    const value = mapStatistics.cantonData?.[canton] || 0;
    const fillColor = colorScale(value);
    const isSelected = selectedCanton === canton;
    const isHovered = hoveredCanton === canton;
    
    return (
      <path
        key={canton}
        d={cantonData.path}
        fill={fillColor}
        stroke={isSelected ? '#DC2626' : '#9CA3AF'}
        strokeWidth={isSelected ? 3 : isHovered ? 2 : 1}
        className={`${styles.canton} ${isHovered ? styles.hovered : ''} ${isSelected ? styles.selected : ''}`}
        onMouseEnter={(e) => handleCantonHover(cantonInfo, e)}
        onMouseLeave={handleCantonLeave}
        onClick={() => handleCantonClick(canton)}
      />
    );
  }, [mapData, mapStatistics, colorScale, selectedCanton, hoveredCanton, handleCantonHover, handleCantonLeave, handleCantonClick]);

  const renderFoodtrucks = () => {
    if (!showClusters || !foodtrucks.length) return null;
    
    return foodtrucks.map(foodtruck => (
      <Suspense key={foodtruck.id} fallback={null}>
        <FoodtruckMarker
          foodtruck={foodtruck}
          projection={mapProjection}
          zoomLevel={zoomLevel}
          onClick={() => handleFoodtruckClick(foodtruck)}
          isSelected={selectedFoodtruck?.id === foodtruck.id}
        />
      </Suspense>
    ));
  };

  const renderControls = () => (
    <div className={styles.mapControls}>
      <div className={styles.controlGroup}>
        <button
          className={styles.controlButton}
          onClick={handleZoomIn}
          title="Vergrößern"
        >
          <ZoomIn size={16} />
        </button>
        <button
          className={styles.controlButton}
          onClick={handleZoomOut}
          title="Verkleinern"
        >
          <ZoomOut size={16} />
        </button>
        <button
          className={styles.controlButton}
          onClick={handleResetView}
          title="Ansicht zurücksetzen"
        >
          <RotateCcw size={16} />
        </button>
      </div>
      
      <div className={styles.controlGroup}>
        <button
          className={`${styles.controlButton} ${showHeatmap ? styles.active : ''}`}
          onClick={() => setShowHeatmap(!showHeatmap)}
          title="Heatmap"
        >
          <Activity size={16} />
        </button>
        <button
          className={`${styles.controlButton} ${showClusters ? styles.active : ''}`}
          onClick={() => setShowClusters(!showClusters)}
          title="Cluster"
        >
          <MapPin size={16} />
        </button>
        <button
          className={`${styles.controlButton} ${showFilters ? styles.active : ''}`}
          onClick={() => setShowFilters(!showFilters)}
          title="Filter"
        >
          <Filter size={16} />
        </button>
      </div>
      
      <div className={styles.controlGroup}>
        <button
          className={`${styles.controlButton} ${showStats ? styles.active : ''}`}
          onClick={() => setShowStats(!showStats)}
          title="Statistiken"
        >
          <BarChart3 size={16} />
        </button>
        <button
          className={`${styles.controlButton} ${showLegend ? styles.active : ''}`}
          onClick={() => setShowLegend(!showLegend)}
          title="Legende"
        >
          <Layers size={16} />
        </button>
        <button
          className={styles.controlButton}
          onClick={handleExportMap}
          title="Exportieren"
        >
          <Download size={16} />
        </button>
      </div>
    </div>
  );

  const renderModeSelector = () => (
    <div className={styles.modeSelector}>
      {Object.entries(MAP_MODES).map(([key, mode]) => (
        <button
          key={mode}
          className={`${styles.modeButton} ${mapMode === mode ? styles.active : ''}`}
          onClick={() => setMapMode(mode)}
        >
          {mode === MAP_MODES.FOODTRUCKS && <MapPin size={16} />}
          {mode === MAP_MODES.REVENUE && <TrendingUp size={16} />}
          {mode === MAP_MODES.ORDERS && <BarChart3 size={16} />}
          {mode === MAP_MODES.DENSITY && <Users size={16} />}
          {mode === MAP_MODES.GROWTH && <Activity size={16} />}
          <span>{key}</span>
        </button>
      ))}
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <AlertCircle size={48} />
        <h3>Fehler beim Laden der Karte</h3>
        <p>{error}</p>
        <button onClick={initializeMap} className={styles.retryButton}>
          <RefreshCw size={16} />
          Erneut versuchen
        </button>
      </div>
    );
  }

  return (
    <div className={`${styles.switzerlandMap} ${className}`} ref={mapContainerRef}>
      {/* Mode Selector */}
      {renderModeSelector()}
      
      {/* Map Container */}
      <div className={styles.mapContainer}>
        <svg
          ref={svgRef}
          className={styles.mapSvg}
          viewBox="0 0 800 600"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Canton Paths */}
          <g className={styles.cantonsGroup}>
            {Object.keys(SWISS_CANTONS).map(renderCanton)}
          </g>
          
          {/* Heatmap Overlay */}
          {showHeatmap && (
            <Suspense fallback={null}>
              <HeatmapOverlay
                data={foodtrucks}
                mode={mapMode}
                projection={mapProjection}
              />
            </Suspense>
          )}
          
          {/* Foodtruck Markers */}
          <g className={styles.foodtrucksGroup}>
            {renderFoodtrucks()}
          </g>
          
          {/* Cluster Overlay */}
          {showClusters && (
            <Suspense fallback={null}>
              <ClusterOverlay
                foodtrucks={foodtrucks}
                zoomLevel={zoomLevel}
                onClusterClick={(cluster) => console.log('Cluster clicked:', cluster)}
              />
            </Suspense>
          )}
        </svg>
        
        {/* Controls */}
        {renderControls()}
      </div>
      
      {/* Tooltip */}
      {showTooltip && hoveredCanton && (
        <Suspense fallback={null}>
          <CantonTooltip
            canton={hoveredCanton}
            data={mapStatistics.cantonData?.[hoveredCanton.code]}
            mode={mapMode}
            position={tooltipPosition}
          />
        </Suspense>
      )}
      
      {/* Statistics Panel */}
      {showStats && (
        <Suspense fallback={<LoadingSpinner />}>
          <StatsPanel
            statistics={mapStatistics}
            mode={mapMode}
            onClose={() => setShowStats(false)}
          />
        </Suspense>
      )}
      
      {/* Legend */}
      {showLegend && (
        <Suspense fallback={<LoadingSpinner />}>
          <LegendPanel
            colorScale={colorScale}
            mode={mapMode}
            onClose={() => setShowLegend(false)}
          />
        </Suspense>
      )}
      
      {/* Filter Panel */}
      {showFilters && (
        <Suspense fallback={<LoadingSpinner />}>
          <FilterPanel
            filters={activeFilters}
            onChange={handleFilterChange}
            onClose={() => setShowFilters(false)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default SwitzerlandMap;