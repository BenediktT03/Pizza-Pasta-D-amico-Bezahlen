/**
 * EATECH Core Package Exports
 * File Path: /packages/core/src/index.js
 */

// Firebase Config
export { auth, db, storage } from './config/firebase';

// Services
export { default as productService } from './services/productService';

// Hooks
export { useProducts, useProduct, useCategories } from './hooks/useProducts';