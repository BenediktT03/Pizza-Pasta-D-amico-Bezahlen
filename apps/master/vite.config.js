import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@eatech/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@eatech/core': path.resolve(__dirname, '../../packages/core/src'),
      '@eatech/auth': path.resolve(__dirname, '../../packages/auth/src'),
      '@eatech/feature-flags': path.resolve(__dirname, '../../packages/feature-flags/src')
    }
  },
  server: {
    port: 3002
  }
})