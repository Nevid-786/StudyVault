
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],

  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },

  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
    watch: {
      usePolling: true,
      interval: 500,
    },
    hmr: true,
  },
})
