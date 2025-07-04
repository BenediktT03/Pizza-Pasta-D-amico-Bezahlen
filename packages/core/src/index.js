/**
 * EATECH - Core Package Exports
 * Version: 1.0.0
 * Description: Central exports for core functionality
 * File Path: /packages/core/src/index.js
 */

// Export all contexts
export { TenantProvider, useTenant } from './contexts/TenantContext';

// Export firebase config
export { database, auth, storage } from './config/firebase';