import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: './src/main.tsx'
      }
    }
  },  server: {
    port: 8090,
    host: '0.0.0.0',
    open: false,
    allowedHosts: [
      'fastfile.captain.dum88.nl',
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '.captain.dum88.nl'
    ],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path
      }
    },
    hmr: {
      port: 8090,
      host: 'localhost'
    }
  },
  preview: {
    port: 8090
  }
})
