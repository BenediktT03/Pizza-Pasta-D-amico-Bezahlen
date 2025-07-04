import { useState, useEffect } from 'react';
import productService from '../services/productServiceSimple';

export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = productService.subscribeToProducts((products) => {
      setProducts(products);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const createProduct = async (productData) => {
    await productService.createProduct(productData);
  };

  const updateProduct = async (productId, updates) => {
    await productService.updateProduct(productId, updates);
  };

  const deleteProduct = async (productId) => {
    await productService.deleteProduct(productId);
  };

  const toggleAvailability = async (productId) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      await updateProduct(productId, { available: !product.available });
    }
  };

  return {
    products,
    loading,
    error: null,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleAvailability,
    refresh: () => {}
  };
};