import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Upload,
  Download,
  ChevronDown,
  Package,
  Tag,
  DollarSign,
  BarChart,
  AlertCircle,
  Image as ImageIcon,
  Grid,
  List
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useTenantStore } from '../../stores/tenant.store';
import { useAuth } from '../../hooks/useAuth';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  price: number;
  currency: string;
  image?: string;
  images?: string[];
  isActive: boolean;
  isAvailable: boolean;
  sku?: string;
  barcode?: string;
  tags: string[];
  modifiers?: ProductModifier[];
  nutritionalInfo?: NutritionalInfo;
  allergens?: string[];
  preparationTime?: number;
  stock?: number;
  trackInventory: boolean;
  taxRate?: number;
  cost?: number;
  supplier?: string;
  unit?: string;
  minOrderQuantity?: number;
  maxOrderQuantity?: number;
  featured: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductModifier {
  id: string;
  name: string;
  options: ModifierOption[];
  required: boolean;
  minSelection?: number;
  maxSelection?: number;
}

interface ModifierOption {
  id: string;
  name: string;
  price: number;
  isDefault?: boolean;
}

interface NutritionalInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string;
  sortOrder: number;
  isActive: boolean;
  productCount?: number;
}

export function ProductCatalog() {
  const { user, hasPermission } = useAuth();
  const { tenant } = useTenantStore();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [bulkSelection, setBulkSelection] = useState<string[]>([]);

  useEffect(() => {
    if (tenant?.id) {
      loadProducts();
      loadCategories();
    }
  }, [tenant?.id]);

  const loadProducts = async () => {
    if (!tenant?.id) return;
    
    try {
      setLoading(true);
      
      const constraints = [where('tenantId', '==', tenant.id)];
      if (!showInactive) {
        constraints.push(where('isActive', '==', true));
      }
      
      const productsQuery = query(collection(db, 'products'), ...constraints);
      const snapshot = await getDocs(productsQuery);
      
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      } as Product));
      
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    if (!tenant?.id) return;
    
    try {
      const categoriesQuery = query(
        collection(db, 'categories'),
        where('tenantId', '==', tenant.id)
      );
      const snapshot = await getDocs(categoriesQuery);
      
      const categoriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Category));
      
      // Count products per category
      const categoriesWithCount = categoriesData.map(category => ({
        ...category,
        productCount: products.filter(p => p.category === category.id).length
      }));
      
      setCategories(categoriesWithCount);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleToggleActive = async (productId: string, isActive: boolean) => {
    try {
      await updateDoc(doc(db, 'products', productId), {
        isActive,
        updatedAt: serverTimestamp()
      });
      
      setProducts(products.map(p => 
        p.id === productId ? { ...p, isActive } : p
      ));
    } catch (error) {
      console.error('Error updating product status:', error);
    }
  };

  const handleToggleAvailable = async (productId: string, isAvailable: boolean) => {
    try {
      await updateDoc(doc(db, 'products', productId), {
        isAvailable,
        updatedAt: serverTimestamp()
      });
      
      setProducts(products.map(p => 
        p.id === productId ? { ...p, isAvailable } : p
      ));
    } catch (error) {
      console.error('Error updating product availability:', error);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await deleteDoc(doc(db, 'products', productId));
      setProducts(products.filter(p => p.id !== productId));
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleDuplicateProduct = async (product: Product) => {
    try {
      const newProduct = {
        ...product,
        name: `${product.name} (Copy)`,
        sku: product.sku ? `${product.sku}-COPY` : undefined,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      delete (newProduct as any).id;
      
      const docRef = await addDoc(collection(db, 'products'), newProduct);
      
      setProducts([...products, { ...newProduct, id: docRef.id } as Product]);
    } catch (error) {
      console.error('Error duplicating product:', error);
    }
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete' | 'export') => {
    if (bulkSelection.length === 0) return;
    
    switch (action) {
      case 'activate':
      case 'deactivate':
        for (const productId of bulkSelection) {
          await handleToggleActive(productId, action === 'activate');
        }
        break;
      case 'delete':
        if (confirm(`Are you sure you want to delete ${bulkSelection.length} products?`)) {
          for (const productId of bulkSelection) {
            await handleDeleteProduct(productId);
          }
        }
        break;
      case 'export':
        exportProducts(bulkSelection);
        break;
    }
    
    setBulkSelection([]);
  };

  const exportProducts = (productIds?: string[]) => {
    const productsToExport = productIds 
      ? products.filter(p => productIds.includes(p.id))
      : products;
    
    const csv = [
      ['Name', 'SKU', 'Category', 'Price', 'Stock', 'Status'].join(','),
      ...productsToExport.map(p => [
        p.name,
        p.sku || '',
        categories.find(c => c.id === p.category)?.name || '',
        p.price.toFixed(2),
        p.stock || 'N/A',
        p.isActive ? 'Active' : 'Inactive'
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const importProducts = () => {
    // TODO: Implement import functionality
    console.log('Import products');
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const canEdit = hasPermission('products:write');
  const canDelete = hasPermission('products:delete');

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Catalog</h1>
          <p className="text-gray-600">Manage your products and categories</p>
        </div>
        
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={importProducts}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Import
            </button>
            <button
              onClick={() => exportProducts()}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => setShowProductForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{products.length}</p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Products</p>
              <p className="text-2xl font-bold text-gray-900">
                {products.filter(p => p.isActive).length}
              </p>
            </div>
            <Eye className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Categories</p>
              <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
            </div>
            <Tag className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {products.filter(p => p.trackInventory && (p.stock || 0) < 10).length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name} ({category.productCount})
              </option>
            ))}
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${
                viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${
                viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>

          {/* Show Inactive Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Show inactive</span>
          </label>

          {/* Bulk Actions */}
          {bulkSelection.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {bulkSelection.length} selected
              </span>
              <button
                onClick={() => handleBulkAction('activate')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Activate
              </button>
              <button
                onClick={() => handleBulkAction('deactivate')}
                className="text-sm text-orange-600 hover:text-orange-800"
              >
                Deactivate
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Products Display */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No products found</p>
          {canEdit && (
            <button
              onClick={() => setShowProductForm(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add First Product
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              {/* Product Image */}
              <div className="aspect-square bg-gray-100 relative">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                
                {/* Quick Actions */}
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    onClick={() => handleToggleAvailable(product.id, !product.isAvailable)}
                    className={`p-1.5 rounded-lg ${
                      product.isAvailable ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {product.isAvailable ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>

                {/* Stock Badge */}
                {product.trackInventory && (
                  <div className={`absolute bottom-2 left-2 px-2 py-1 rounded text-xs font-medium ${
                    (product.stock || 0) === 0 ? 'bg-red-100 text-red-700' :
                    (product.stock || 0) < 10 ? 'bg-orange-100 text-orange-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    Stock: {product.stock || 0}
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-1">{product.name}</h3>
                <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                  {product.description}
                </p>
                
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-semibold text-gray-900">
                    CHF {product.price.toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {categories.find(c => c.id === product.category)?.name}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {canEdit && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowProductForm(true);
                        }}
                        className="flex-1 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                      >
                        <Edit className="w-4 h-4 inline mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDuplicateProduct(product)}
                        className="p-1.5 border rounded-lg hover:bg-gray-50"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={bulkSelection.length === filteredProducts.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setBulkSelection(filteredProducts.map(p => p.id));
                      } else {
                        setBulkSelection([]);
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={bulkSelection.includes(product.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBulkSelection([...bulkSelection, product.id]);
                        } else {
                          setBulkSelection(bulkSelection.filter(id => id !== product.id));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        {product.image ? (
                          <img
                            className="h-10 w-10 rounded-lg object-cover"
                            src={product.image}
                            alt={product.name}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        {product.sku && (
                          <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {categories.find(c => c.id === product.category)?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    CHF {product.price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product.trackInventory ? (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        (product.stock || 0) === 0 ? 'bg-red-100 text-red-800' :
                        (product.stock || 0) < 10 ? 'bg-orange-100 text-orange-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {product.stock || 0}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(product.id, !product.isActive)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {product.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      {canEdit && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedProduct(product);
                              setShowProductForm(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDuplicateProduct(product)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            Duplicate
                          </button>
                        </>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TODO: Add Product Form Modal */}
      {/* TODO: Add Category Management Modal */}
    </div>
  );
}
