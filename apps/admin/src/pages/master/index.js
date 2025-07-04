/**
 * EATECH - Master Admin Module Exports
 * Version: 5.0.0
 * Description: Zentrale Export-Datei für alle Master Admin Komponenten
 * Author: EATECH Development Team
 * Created: 2025-01-07
 * File Path: /apps/admin/src/pages/master/index.js
 */

// Master Admin Pages
export { default as MasterDashboard } from './MasterDashboard';
export { default as TenantManagement } from './TenantManagement';
export { default as SystemMetrics } from './SystemMetrics';
export { default as BillingOverview } from './BillingOverview';
export { default as GlobalSettings } from './GlobalSettings';

// Re-export commonly used components and hooks
export * from './MasterDashboard';
export * from './TenantManagement';
export * from './SystemMetrics';
export * from './BillingOverview';
export * from './GlobalSettings';