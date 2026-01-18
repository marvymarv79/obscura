import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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