import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom', 
      'axios', 
      'mermaid', 
      'react-markdown', 
      'react-calendar'
    ]
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    cors: true,
    strictPort: true,
    hmr: {
      overlay: false
    },
    watch: {
      ignored: [
        '**/node_modules/**', 
        '**/.venv/**', 
        '**/venv/**', 
        '**/Back/**', 
        '**/reuniones.db', 
        '**/*.db-journal'
      ]
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/uploads': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      }
    }
  }
})