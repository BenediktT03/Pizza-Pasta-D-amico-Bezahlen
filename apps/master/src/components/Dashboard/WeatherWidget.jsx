/**
 * EATECH - Weather Widget Component
 * Version: 1.0.0
 * Description: Wetter-Widget für lokale Bedingungen und Vorhersagen
 *              zur Optimierung der Foodtruck-Planung
 * Author: EATECH Development Team
 * Created: 2025-01-08
 * 
 * File Path: /apps/master/src/components/Dashboard/WeatherWidget.jsx
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Cloud,
  CloudRain,
  CloudSnow,
  Sun,
  CloudDrizzle,
  Wind,
  Thermometer,
  Droplets,
  Eye,
  Sunrise,
  Sunset,
  Navigation,
  MapPin,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  Umbrella,
  Gauge
} from 'lucide-react';
import styles from './WeatherWidget.module.css';

// ============================================================================
// CONSTANTS
// ============================================================================
const WEATHER_CONDITIONS = {
  sunny: { icon: Sun, label: 'Sonnig', color: '#fbbf24' },
  partly_cloudy: { icon: Cloud, label: 'Teilweise bewölkt', color: '#9ca3af' },
  cloudy: { icon: Cloud, label: 'Bewölkt', color: '#6b7280' },
  rainy: { icon: CloudRain, label: 'Regen', color: '#3b82f6' },
  drizzle: { icon: CloudDrizzle, label: 'Nieselregen', color: '#60a5fa' },
  snowy: { icon: CloudSnow, label: 'Schnee', color: '#dbeafe' },
  stormy: { icon: CloudRain, label: 'Gewitter', color: '#4b5563' }
};

const LOCATIONS = {
  zurich: { 
    name: 'Zürich', 
    coords: { lat: 47.3769, lon: 8.5417 },
    timezone: 'Europe/Zurich'
  },
  bern: { 
    name: 'Bern', 
    coords: { lat: 46.9481, lon: 7.4474 },
    timezone: 'Europe/Zurich'
  },
  basel: { 
    name: 'Basel', 
    coords: { lat: 47.5596, lon: 7.5886 },
    timezone: 'Europe/Zurich'
  },
  geneva: { 
    name: 'Genève', 
    coords: { lat: 46.2044, lon: 6.1432 },
    timezone: 'Europe/Zurich'
  },
  lugano: { 
    name: 'Lugano', 
    coords: { lat: 46.0037, lon: 8.9511 },
    timezone: 'Europe/Zurich'
  }
};

const IMPACT_LEVELS = {
  high: { label: 'Hoch', color: '#10b981', description: 'Ideales Wetter für Foodtrucks' },
  medium: { label: 'Mittel', color: '#f59e0b', description: 'Akzeptable Bedingungen' },
  low: { label: 'Niedrig', color: '#ef4444', description: 'Herausfordernde Bedingungen' }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const generateMockWeatherData = (location) => {
  const conditions = Object.keys(WEATHER_CONDITIONS);
  const condition = conditions[Math.floor(Math.random() * conditions.length)];
  
  // Base temperature varies by location (Lugano warmer, mountain areas cooler)
  const baseTemp = location === 'lugano' ? 18 : location === 'bern' ? 14 : 15;
  const temp = baseTemp + Math.random() * 10 - 5;
  
  return {
    current: {
      condition,
      temperature: Math.round(temp),
      feelsLike: Math.round(temp + (Math.random() * 4 - 2)),
      humidity: Math.round(40 + Math.random() * 40),
      windSpeed: Math.round(5 + Math.random() * 20),
      windDirection: Math.round(Math.random() * 360),
      pressure: Math.round(1010 + Math.random() * 20),
      visibility: Math.round(5 + Math.random() * 15),
      uvIndex: Math.round(Math.random() * 10),
      precipitation: condition.includes('rain') || condition.includes('snow') ? Math.random() * 10 : 0
    },
    forecast: Array.from({ length: 5 }, (_, i) => ({
      day: new Date(Date.now() + (i + 1) * 86400000).toLocaleDateString('de-CH', { weekday: 'short' }),
      condition: conditions[Math.floor(Math.random() * conditions.length)],
      high: Math.round(temp + 5 + Math.random() * 3),
      low: Math.round(temp - 2 + Math.random() * 3),
      precipitation: Math.round(Math.random() * 60)
    })),
    sunrise: '06:45',
    sunset: '18:30',
    lastUpdate: new Date()
  };
};

const calculateBusinessImpact = (weather) => {
  const { condition, temperature, windSpeed, precipitation } = weather.current;
  
  // Calculate impact score
  let score = 100;
  
  // Temperature impact
  if (temperature < 10 || temperature > 30) score -= 30;
  else if (temperature < 15 || temperature > 25) score -= 15;
  
  // Weather condition impact
  if (condition === 'rainy' || condition === 'stormy') score -= 40;
  else if (condition === 'drizzle') score -= 20;
  else if (condition === 'snowy') score -= 35;
  else if (condition === 'cloudy') score -= 10;
  
  // Wind impact
  if (windSpeed > 30) score -= 25;
  else if (windSpeed > 20) score -= 15;
  else if (windSpeed > 15) score -= 5;
  
  // Precipitation impact
  if (precipitation > 5) score -= 20;
  else if (precipitation > 2) score -= 10;
  
  // Determine impact level
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

const getWindDirection = (degrees) => {
  const directions = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================
const CurrentWeather = ({ data, location }) => {
  const condition = WEATHER_CONDITIONS[data.condition];
  const Icon = condition.icon;
  
  return (
    <div className={styles.currentWeather}>
      <div className={styles.locationHeader}>
        <div className={styles.location}>
          <MapPin size={16} />
          <span>{LOCATIONS[location].name}</span>
        </div>
        <span className={styles.updateTime}>
          <Clock size={12} />
          {data.lastUpdate.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      
      <div className={styles.mainWeather}>
        <div className={styles.weatherIcon}>
          <Icon size={48} style={{ color: condition.color }} />
        </div>
        <div className={styles.temperature}>
          <span className={styles.tempValue}>{data.temperature}°</span>
          <span className={styles.tempFeels}>Gefühlt {data.feelsLike}°</span>
        </div>
        <div className={styles.condition}>
          <span>{condition.label}</span>
        </div>
      </div>
      
      <div className={styles.weatherDetails}>
        <div className={styles.detailItem}>
          <Droplets size={14} />
          <span>{data.humidity}%</span>
        </div>
        <div className={styles.detailItem}>
          <Wind size={14} />
          <span>{data.windSpeed} km/h {getWindDirection(data.windDirection)}</span>
        </div>
        <div className={styles.detailItem}>
          <Gauge size={14} />
          <span>{data.pressure} hPa</span>
        </div>
        <div className={styles.detailItem}>
          <Eye size={14} />
          <span>{data.visibility} km</span>
        </div>
      </div>
      
      {data.precipitation > 0 && (
        <div className={styles.precipitationAlert}>
          <Umbrella size={14} />
          <span>Niederschlag: {data.precipitation.toFixed(1)} mm</span>
        </div>
      )}
    </div>
  );
};

const ForecastDay = ({ day }) => {
  const condition = WEATHER_CONDITIONS[day.condition];
  const Icon = condition.icon;
  
  return (
    <div className={styles.forecastDay}>
      <span className={styles.dayName}>{day.day}</span>
      <Icon size={24} style={{ color: condition.color }} />
      <div className={styles.tempRange}>
        <span className={styles.tempHigh}>{day.high}°</span>
        <span className={styles.tempLow}>{day.low}°</span>
      </div>
      {day.precipitation > 0 && (
        <div className={styles.rainChance}>
          <Droplets size={12} />
          <span>{day.precipitation}%</span>
        </div>
      )}
    </div>
  );
};

const BusinessImpact = ({ weather }) => {
  const impact = useMemo(() => calculateBusinessImpact(weather), [weather]);
  const impactConfig = IMPACT_LEVELS[impact];
  
  const recommendations = useMemo(() => {
    const recs = [];
    const { temperature, condition, windSpeed } = weather.current;
    
    if (temperature < 15) {
      recs.push('Warme Getränke und Suppen anbieten');
    } else if (temperature > 25) {
      recs.push('Kalte Getränke und leichte Speisen fokussieren');
    }
    
    if (condition === 'rainy' || condition === 'drizzle') {
      recs.push('Überdachte Bereiche vorbereiten');
      recs.push('Take-away Option hervorheben');
    }
    
    if (windSpeed > 20) {
      recs.push('Windschutz aufstellen');
      recs.push('Leichte Gegenstände sichern');
    }
    
    if (impact === 'high') {
      recs.push('Zusätzliches Personal einplanen');
      recs.push('Lagerbestände aufstocken');
    }
    
    return recs;
  }, [weather, impact]);
  
  return (
    <div className={styles.businessImpact}>
      <h4>Business Impact</h4>
      
      <div 
        className={styles.impactLevel}
        style={{ backgroundColor: `${impactConfig.color}20`, borderColor: impactConfig.color }}
      >
        <div className={styles.impactHeader}>
          <span className={styles.impactLabel}>Erwarteter Umsatz</span>
          <span 
            className={styles.impactValue}
            style={{ color: impactConfig.color }}
          >
            {impactConfig.label}
          </span>
        </div>
        <p className={styles.impactDescription}>{impactConfig.description}</p>
      </div>
      
      {recommendations.length > 0 && (
        <div className={styles.recommendations}>
          <h5>Empfehlungen</h5>
          <ul>
            {recommendations.map((rec, idx) => (
              <li key={idx}>
                <ChevronRight size={12} />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const WeatherWidget = ({ 
  location = 'zurich',
  showForecast = true,
  showBusinessImpact = true,
  refreshInterval = 600000, // 10 minutes
  onLocationChange
}) => {
  const [weatherData, setWeatherData] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(location);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedView, setExpandedView] = useState(false);
  
  // Load weather data
  useEffect(() => {
    setWeatherData(generateMockWeatherData(selectedLocation));
  }, [selectedLocation]);
  
  // Auto refresh
  useEffect(() => {
    const interval = setInterval(() => {
      setWeatherData(generateMockWeatherData(selectedLocation));
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [selectedLocation, refreshInterval]);
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setWeatherData(generateMockWeatherData(selectedLocation));
      setIsRefreshing(false);
    }, 1000);
  };
  
  const handleLocationChange = (newLocation) => {
    setSelectedLocation(newLocation);
    if (onLocationChange) {
      onLocationChange(newLocation);
    }
  };
  
  if (!weatherData) {
    return (
      <div className={styles.weatherWidget}>
        <div className={styles.loading}>
          <RefreshCw size={24} className={styles.spinning} />
          <span>Wetterdaten werden geladen...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`${styles.weatherWidget} ${expandedView ? styles.expanded : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <h3>
          <Thermometer size={18} />
          Wetter & Prognose
        </h3>
        <div className={styles.headerActions}>
          <select 
            value={selectedLocation}
            onChange={(e) => handleLocationChange(e.target.value)}
            className={styles.locationSelect}
          >
            {Object.entries(LOCATIONS).map(([key, loc]) => (
              <option key={key} value={key}>{loc.name}</option>
            ))}
          </select>
          
          <button
            className={`${styles.refreshButton} ${isRefreshing ? styles.spinning : ''}`}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
      
      {/* Current Weather */}
      <CurrentWeather 
        data={weatherData.current} 
        location={selectedLocation}
      />
      
      {/* Sun times */}
      <div className={styles.sunTimes}>
        <div className={styles.sunTime}>
          <Sunrise size={16} />
          <span>Sonnenaufgang</span>
          <strong>{weatherData.sunrise}</strong>
        </div>
        <div className={styles.sunTime}>
          <Sunset size={16} />
          <span>Sonnenuntergang</span>
          <strong>{weatherData.sunset}</strong>
        </div>
      </div>
      
      {/* Forecast */}
      {showForecast && (
        <div className={styles.forecast}>
          <h4>5-Tage Vorhersage</h4>
          <div className={styles.forecastDays}>
            {weatherData.forecast.map((day, idx) => (
              <ForecastDay key={idx} day={day} />
            ))}
          </div>
        </div>
      )}
      
      {/* Business Impact */}
      {showBusinessImpact && (
        <BusinessImpact weather={weatherData} />
      )}
      
      {/* Expand/Collapse Button */}
      <button
        className={styles.expandButton}
        onClick={() => setExpandedView(!expandedView)}
      >
        {expandedView ? 'Weniger anzeigen' : 'Mehr Details'}
        <ChevronRight size={16} className={expandedView ? styles.rotated : ''} />
      </button>
    </div>
  );
};

// ============================================================================
// EXPORT
// ============================================================================
export default WeatherWidget;