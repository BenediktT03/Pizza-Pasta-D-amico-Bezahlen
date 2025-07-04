/**
 * EATECH - Customer Layout
 * Version: 16.0.0
 * Description: Hauptlayout für die Customer Web App
 * Author: EATECH Development Team
 * Created: 2025-07-05
 * File Path: /apps/web/src/app/(customer)/layout.jsx
 */

import { Inter } from 'next/font/google';
import { CartProvider } from '@/contexts/CartContext';
import { Toaster } from 'react-hot-toast';
import CustomerHeader from '@/components/customer/CustomerHeader';
import FloatingCart from '@/components/cart/FloatingCart';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'EATECH - Bestelle dein Lieblingsessen',
  description: 'Die schnellste Art, bei deinem Lieblings-Foodtruck zu bestellen',
};

export default function CustomerLayout({ children }) {
  return (
    <html lang="de">
      <body className={inter.className}>
        <CartProvider>
          <div className="min-h-screen bg-black text-white">
            <CustomerHeader />
            <main className="pt-16">
              {children}
            </main>
            <FloatingCart />
            <Toaster
              position="bottom-center"
              toastOptions={{
                style: {
                  background: '#1A1A1A',
                  color: '#FFF',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                },
                success: {
                  iconTheme: {
                    primary: '#51CF66',
                    secondary: '#FFF',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#FF4757',
                    secondary: '#FFF',
                  },
                },
              }}
            />
          </div>
        </CartProvider>
      </body>
    </html>
  );
}