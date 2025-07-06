/**
 * EATECH - Customer Layout
 * Version: 17.0.0
 * Description: Hauptlayout für die Customer Web App mit Lazy Loading
 * Author: EATECH Development Team
 * Modified: 2025-01-08
 * File Path: /apps/web/src/app/(customer)/layout.jsx
 */

import { Inter } from 'next/font/google';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Lazy load heavy components
const CartProvider = dynamic(
  () => import('@/contexts/CartContext').then(mod => mod.CartProvider),
  { ssr: false }
);

const CustomerHeader = dynamic(
  () => import('@/components/customer/CustomerHeader'),
  { 
    loading: () => <HeaderSkeleton />,
    ssr: true 
  }
);

const FloatingCart = dynamic(
  () => import('@/components/cart/FloatingCart'),
  { 
    loading: () => null,
    ssr: false 
  }
);

const Toaster = dynamic(
  () => import('react-hot-toast').then(mod => mod.Toaster),
  { ssr: false }
);

const VoiceCommandProvider = dynamic(
  () => import('@/contexts/VoiceCommandContext').then(mod => mod.VoiceCommandProvider),
  { ssr: false }
);

const PWAPrompt = dynamic(
  () => import('@/components/common/PWAPrompt'),
  { ssr: false }
);

const CookieBanner = dynamic(
  () => import('@/components/common/CookieBanner'),
  { ssr: false }
);

const OfflineIndicator = dynamic(
  () => import('@/components/common/OfflineIndicator'),
  { ssr: false }
);

// Loading skeleton components
const HeaderSkeleton = () => (
  <div className="h-16 bg-black/90 backdrop-blur-sm fixed top-0 left-0 right-0 z-50 animate-pulse">
    <div className="container mx-auto px-4 h-full flex items-center justify-between">
      <div className="h-8 w-32 bg-gray-800 rounded"></div>
      <div className="flex gap-4">
        <div className="h-8 w-8 bg-gray-800 rounded-full"></div>
        <div className="h-8 w-8 bg-gray-800 rounded-full"></div>
      </div>
    </div>
  </div>
);

// Font optimization
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif']
});

// Metadata
export const metadata = {
  title: {
    default: 'EATECH - Bestelle dein Lieblingsessen',
    template: '%s | EATECH'
  },
  description: 'Die schnellste Art, bei deinem Lieblings-Foodtruck zu bestellen. Mobile Bestellung, kontaktlose Zahlung, keine Wartezeiten.',
  keywords: ['Foodtruck', 'Bestellung', 'Mobile', 'Restaurant', 'Essen', 'Schweiz'],
  authors: [{ name: 'EATECH Team' }],
  creator: 'EATECH',
  publisher: 'EATECH',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: 'EATECH - Bestelle dein Lieblingsessen',
    description: 'Die schnellste Art, bei deinem Lieblings-Foodtruck zu bestellen',
    type: 'website',
    locale: 'de_CH',
    url: 'https://eatech.ch',
    siteName: 'EATECH',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'EATECH - Foodtruck Bestellsystem'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EATECH - Bestelle dein Lieblingsessen',
    description: 'Die schnellste Art, bei deinem Lieblings-Foodtruck zu bestellen',
    images: ['/twitter-image.jpg']
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'EATECH'
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: 'cover'
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' }
  ],
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' }
    ],
    apple: [
      { url: '/apple-icon-180x180.png', sizes: '180x180', type: 'image/png' }
    ],
    other: [
      { rel: 'mask-icon', url: '/safari-pinned-tab.svg', color: '#ff6b6b' }
    ]
  }
};

// Import global styles
import '@/styles/globals.css';

// Loading fallback component
const PageLoading = () => (
  <div className="min-h-screen bg-black text-white flex items-center justify-center">
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
      <p className="text-gray-400">Laden...</p>
    </div>
  </div>
);

export default function CustomerLayout({ children }) {
  return (
    <html lang="de" className={inter.variable}>
      <head>
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.eatech.ch" />
        
        {/* DNS Prefetch */}
        <link rel="dns-prefetch" href="https://cdn.eatech.ch" />
        
        {/* Preload critical resources */}
        <link 
          rel="preload" 
          href="/fonts/inter-var.woff2" 
          as="font" 
          type="font/woff2" 
          crossOrigin="anonymous" 
        />
        
        {/* PWA meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="EATECH" />
        
        {/* Performance hints */}
        <meta httpEquiv="x-dns-prefetch-control" content="on" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <Suspense fallback={<PageLoading />}>
          <CartProvider>
            <VoiceCommandProvider>
              <div className="min-h-screen bg-black text-white">
                {/* Header */}
                <Suspense fallback={<HeaderSkeleton />}>
                  <CustomerHeader />
                </Suspense>
                
                {/* Main Content */}
                <main className="pt-16">
                  {children}
                </main>
                
                {/* Floating Cart */}
                <Suspense fallback={null}>
                  <FloatingCart />
                </Suspense>
                
                {/* Toast Notifications */}
                <Suspense fallback={null}>
                  <Toaster
                    position="bottom-center"
                    toastOptions={{
                      duration: 4000,
                      style: {
                        background: '#1A1A1A',
                        color: '#FFF',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '16px',
                        fontSize: '14px',
                        maxWidth: '400px',
                      },
                      success: {
                        iconTheme: {
                          primary: '#51CF66',
                          secondary: '#FFF',
                        },
                        style: {
                          border: '1px solid rgba(81, 207, 102, 0.2)',
                        }
                      },
                      error: {
                        iconTheme: {
                          primary: '#FF4757',
                          secondary: '#FFF',
                        },
                        style: {
                          border: '1px solid rgba(255, 71, 87, 0.2)',
                        }
                      },
                      loading: {
                        iconTheme: {
                          primary: '#FF6B6B',
                          secondary: '#FFF',
                        }
                      }
                    }}
                  />
                </Suspense>
                
                {/* PWA Install Prompt */}
                <Suspense fallback={null}>
                  <PWAPrompt />
                </Suspense>
                
                {/* Cookie Banner */}
                <Suspense fallback={null}>
                  <CookieBanner />
                </Suspense>
                
                {/* Offline Indicator */}
                <Suspense fallback={null}>
                  <OfflineIndicator />
                </Suspense>
              </div>
            </VoiceCommandProvider>
          </CartProvider>
        </Suspense>
        
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'EATECH',
              description: 'Die schnellste Art, bei deinem Lieblings-Foodtruck zu bestellen',
              url: 'https://eatech.ch',
              applicationCategory: 'FoodDelivery',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'CHF'
              },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                reviewCount: '1250'
              }
            })
          }}
        />
      </body>
    </html>
  );
}