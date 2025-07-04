/**
 * EATECH - useProducts Hook
 * Version: 17.0.0
 * Description: React Hook für Produkt-Verwaltung mit Firebase
 * Author: EATECH Development Team
 * Created: 2025-07-05
 * File Path: /packages/core/src/hooks/useProducts.js
 */

import { useState, useEffect, useCallback } from 'react';
import productService from '../services/productService';

// ============================================================================
// MAIN HOOK
// ============================================================================

export const useProducts = (options = {}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load products on mount
  useEffect(() => {
    let unsubscribe;

    const loadProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        if (options.realtime !== false) {
          // Real-time subscription
          unsubscribe = productService.subscribeToProducts(
            (products) => {
              setProducts(products);
              setLoading(false);
            },
            options
          );
        } else {
          // One-time fetch
          const data = await productService.getProducts(options);
          setProducts(data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading products:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadProducts();

    // Cleanup
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [options.category, options.featured, options.includeUnavailable]);

  // Create product
  const createProduct = useCallback(async (productData) => {
    try {
      setCreating(true);
      setError(null);
      
      const newProduct = await productService.createProduct(productData);
      
      // Update local state if not using realtime
      if (options.realtime === false) {
        setProducts(prev => [...prev, newProduct]);
      }
      
      return newProduct;
    } catch (err) {
      console.error('Error creating product:', err);
      setError(err.message);
      throw err;
    } finally {
      setCreating(false);
    }
  }, [options.realtime]);

  // Update product
  const updateProduct = useCallback(async (productId, updates) => {
    try {
      setUpdating(true);
      setError(null);
      
      const updatedProduct = await productService.updateProduct(productId, updates);
      
      // Update local state if not using realtime
      if (options.realtime === false) {
        setProducts(prev => 
          prev.map(p => p.id === productId ? { ...p, ...updatedProduct } : p)
        );
      }
      
      return updatedProduct;
    } catch (err) {
      console.error('Error updating product:', err);
      setError(err.message);
      throw err;
    } finally {
      setUpdating(false);
    }
  }, [options.realtime]);

  // Delete product
  const deleteProduct = useCallback(async (productId) => {
    try {
      setDeleting(true);
      setError(null);
      
      await productService.deleteProduct(productId);
      
      // Update local state if not using realtime
      if (options.realtime === false) {
        setProducts(prev => prev.filter(p => p.id !== productId));
      }
      
      return true;
    } catch (err) {
      console.error('Error deleting product:', err);
      setError(err.message);
      throw err;
    } finally {
      setDeleting(false);
    }
  }, [options.realtime]);

  // Toggle availability
  const toggleAvailability = useCallback(async (productId) => {
    try {
      setUpdating(true);
      const newAvailability = await productService.toggleAvailability(productId);
      
      // Update local state if not using realtime
      if (options.realtime === false) {
        setProducts(prev => 
          prev.map(p => p.id === productId ? { ...p, available: newAvailability } : p)
        );
      }
      
      return newAvailability;
    } catch (err) {
      console.error('Error toggling availability:', err);
      setError(err.message);
      throw err;
    } finally {
      setUpdating(false);
    }
  }, [options.realtime]);

  // Update stock
  const updateStock = useCallback(async (productId, quantity, operation = 'set') => {
    try {
      setUpdating(true);
      const newQuantity = await productService.updateStock(productId, quantity, operation);
      
      // Update local state if not using realtime
      if (options.realtime === false) {
        setProducts(prev => 
          prev.map(p => p.id === productId 
            ? { ...p, stock: { ...p.stock, quantity: newQuantity } } 
            : p
          )
        );
      }
      
      return newQuantity;
    } catch (err) {
      console.error('Error updating stock:', err);
      setError(err.message);
      throw err;
    } finally {
      setUpdating(false);
    }
  }, [options.realtime]);

  // Refresh products
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productService.getProducts(options);
      setProducts(data);
    } catch (err) {
      console.error('Error refreshing products:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [options]);

  return {
    products,
    loading,
    error,
    creating,
    updating,
    deleting,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleAvailability,
    updateStock,
    refresh
  };
};

// ============================================================================
// SINGLE PRODUCT HOOK
// ============================================================================

export const useProduct = (productId) => {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }

    let unsubscribe;

    const loadProduct = async () => {
      try {
        setLoading(true);
        setError(null);

        // Real-time subscription
        unsubscribe = productService.subscribeToProduct(
          productId,
          (product) => {
            setProduct(product);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error('Error loading product:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadProduct();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [productId]);

  return { product, loading, error };
};

// ============================================================================
// CATEGORIES HOOK
// ============================================================================

export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await productService.getCategories();
        setCategories(data);
      } catch (err) {
        console.error('Error loading categories:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  return { categories, loading };
};