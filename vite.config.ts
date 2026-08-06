import { fileURLToPath, URL } from 'node:url'
import { existsSync, readFileSync } from 'node:fs'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

const httpsConfig = existsSync('.cert/key.pem')
  ? { key: readFileSync('.cert/key.pem'), cert: readFileSync('.cert/cert.pem') }
  : undefined

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    vue(),
  ],
  server: {
    https: httpsConfig,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  optimizeDeps: {
    include: ['axios'],
  },
})
