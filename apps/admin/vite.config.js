/**
 * EATECH - Admin Vite Configuration
 * Version: 14.0.0
 * Description: Vite config for Admin Dashboard
 * Author: EATECH Development Team
 * Created: 2025-07-04
 * File Path: /apps/admin/vite.config.js
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@assets': path.resolve(__dirname, './src/assets')
    }
  },
  
  server: {
    port: 3001,
    host: true,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/database'],
          charts: ['recharts'],
          ui: ['lucide-react', 'framer-motion']
        }
      }
    }
  },
  
  optimizeDeps: {
    include: ['react', 'react-dom', 'recharts', 'framer-motion'],
    exclude: ['firebase', 'firebase/app', 'firebase/auth', 'firebase/database']
  },
  
  define: {
    'process.env': {}
  }
});