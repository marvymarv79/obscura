import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['drizzle-orm', '@neondatabase/serverless', 'drizzle-orm/neon-http']
  },
  build: {
    rollupOptions: {
      external: ['drizzle-orm', 'drizzle-orm/neon-http', '@neondatabase/serverless']
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://api.open-meteo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/geo': {
        target: 'https://geocoding-api.open-meteo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/geo/, '')
      }
    }
  }
})
