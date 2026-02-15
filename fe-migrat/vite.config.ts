import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react'
            if (id.includes('socket.io-client')) return 'vendor-socket'
            if (id.includes('axios')) return 'vendor-axios'
            return 'vendor'
          }
        }
      }
    }
  }
})
