import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  optimizeDeps: {
    include: [
      'firebase/app',
      'firebase/database',
      'firebase/auth',
      'firebase/storage'
    ]
  },
  build: {
    commonjsOptions: {
      include: [/firebase/, /node_modules/]
    }
  }
})