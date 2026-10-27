import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Vite configuration for RouteFlow with Network Host & API Proxying
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all network addresses (0.0.0.0)
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
