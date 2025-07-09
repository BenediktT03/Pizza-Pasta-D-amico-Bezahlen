// Menu Page for Customer
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components/layout/Layout';
import { MenuList } from '../features/menu/MenuList';
import { Cart } from '../features/cart/Cart';
import { useCartStore } from '../stores/cart.store';
import { Button } from '@eatech/ui';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';

const MenuPage: React.FC = () => {
  const { truckId } = useParams<{ truckId: string }>();
  const { t } = useTranslation();
  const { items, getTotalItems, getTotalPrice } = useCartStore();
  const [cartOpen, setCartOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!truckId) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('errors.noTruckId')}
          </h1>
        </div>
      </Layout>
    );
  }

  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="lg:grid lg:grid-cols-3 lg:gap-8">
            {/* Menu Section */}
            <div className="lg:col-span-2">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">
                {t('menu.title')}
              </h1>
              <MenuList truckId={truckId} />
            </div>

            {/* Cart Section - Desktop */}
            {!isMobile && (
              <div className="hidden lg:block">
                <div className="sticky top-6">
                  <h2 className="text-xl font-semibold mb-4">
                    {t('cart.title')}
                  </h2>
                  <Cart truckId={truckId} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Cart Button */}
        {isMobile && totalItems > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
            <Button
              variant="primary"
              size="large"
              fullWidth
              onClick={() => setCartOpen(true)}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <ShoppingCartIcon className="h-5 w-5" />
                <span>{t('cart.viewCart')} ({totalItems})</span>
              </div>
              <span className="font-bold">
                CHF {(totalPrice / 100).toFixed(2)}
              </span>
            </Button>
          </div>
        )}

        {/* Mobile Cart Modal */}
        {isMobile && cartOpen && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50">
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[90vh] overflow-hidden">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">{t('cart.title')}</h2>
                  <button
                    onClick={() => setCartOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
                <Cart truckId={truckId} onClose={() => setCartOpen(false)} />
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MenuPage;
