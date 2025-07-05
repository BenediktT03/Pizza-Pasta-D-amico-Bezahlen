/**
 * EATECH - Master Module Index
 * Version: 5.0.0
 * Description: Export file for Master Control module
 * File Path: /src/modules/master/index.js
 */

// Main component
export { default as MasterControl } from './MasterControl';

// Sub-components (if needed for external use)
export { default as SwissHeatMap } from './components/SwissHeatMap';
export { default as TenantHealthScore } from './components/TenantHealthScore';
export { default as ProvisionsForecast } from './components/ProvisionsForecast';
export { default as AnomalyDetector } from './components/AnomalyDetector';
export { default as TenantList } from './components/TenantList';

// Hooks
export { useMasterData } from './hooks/useMasterData';

// Utils
export { calculateHealthScore } from './utils/healthScoreCalculator';
export { analyzeTrends, forecastProvisions } from './utils/trendAnalyzer';
export { SWISS_CANTONS, SWISS_CITIES, getCantonByCoordinates } from './utils/swissMapData';
