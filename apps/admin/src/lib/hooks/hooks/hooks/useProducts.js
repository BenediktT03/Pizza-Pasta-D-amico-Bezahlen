/**
 * EATECH - useProducts Hook
 * File Path: /apps/admin/src/lib/hooks/useProducts.js
 * 
 * React Hook für Produkt-Management
 */

import { useState, useEffect, useCallback } from 'react';
import productService from '../productService';

export const useProducts = (options = {}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [operationStates, setOperationStates] = useState({
    creating: false,
    updating: false,
    deleting: false
  });

  // Produkte laden
  useEffect(() => {
    let unsubscribe;

    try {
      unsubscribe = productService.subscribeToProducts((products) => {
        setProducts(products);
        setLoading(false);
        setError(null);
      });
    } catch (err) {
      console.error('Fehler beim Laden der Produkte:', err);
      setError(err.message);
      setLoading(false);
    }

    // Cleanup
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Produkt erstellen
  const createProduct = useCallback(async (productData) => {
    setOperationStates(prev => ({ ...prev, creating: true }));
    setError(null);
    
    try {
      const newProduct = await productService.createProduct(productData);
      return newProduct;
    } catch (err) {
      console.error('Fehler beim Erstellen:', err);
      setError(err.message);
      throw err;
    } finally {
      setOperationStates(prev => ({ ...prev, creating: false }));
    }
  }, []);

  // Produkt aktualisieren
  const updateProduct = useCallback(async (productId, updates) => {
    setOperationStates(prev => ({ ...prev, updating: true }));
    setError(null);
    
    try {
      const updated = await productService.updateProduct(productId, updates);
      return updated;
    } catch (err) {
      console.error('Fehler beim Aktualisieren:', err);
      setError(err.message);
      throw err;
    } finally {
      setOperationStates(prev => ({ ...prev, updating: false }));
    }
  }, []);

  // Produkt löschen
  const deleteProduct = useCallback(async (productId) => {
    setOperationStates(prev => ({ ...prev, deleting: true }));
    setError(null);
    
    try {
      await productService.deleteProduct(productId);
    } catch (err) {
      console.error('Fehler beim Löschen:', err);
      setError(err.message);
      throw err;
    } finally {
      setOperationStates(prev => ({ ...prev, deleting: false }));
    }
  }, []);

  // Verfügbarkeit umschalten
  const toggleAvailability = useCallback(async (productId) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      await productService.toggleAvailability(productId, product.available);
    }
  }, [products]);

  // Lagerbestand aktualisieren
  const updateStock = useCallback(async (productId, quantity) => {
    await productService.updateStock(productId, quantity);
  }, []);

  // Refresh (erzwingt Neuladung)
  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
  }, []);

  return {
    products,
    loading,
    error,
    ...operationStates,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleAvailability,
    updateStock,
    refresh
  };
};