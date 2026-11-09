import { existsSync, readFileSync } from 'node:fs'
import path from "path"

import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

const httpsConfig = existsSync('.cert/key.pem')
  ? { key: readFileSync('.cert/key.pem'), cert: readFileSync('.cert/cert.pem') }
  : undefined

// Domen platforme i sajtovi firmi (*.platforma) moraju biti dozvoljeni hostovi,
// inače Vite odbija HMR WebSocket (400) i svaka izmena osvežava celu stranicu
// (važi samo za dev server, pa se čita env iz "development" moda)
function allowedHosts(): string[] {
  const platformHost = loadEnv('development', process.cwd(), 'VITE_').VITE_PLATFORM_HOST
  return ['.localhost', ...(platformHost ? [`.${platformHost}`] : [])]
}

// Content-Security-Policy za produkcijski build (u dev-u bi smetala HMR-u). frame-ancestors i HSTS
// meta tag ne podržava — njih postavlja hosting kao HTTP zaglavlja.
function contentSecurityPolicy(): Plugin {
  let apiOrigin = ''
  return {
    name: 'content-security-policy',
    apply: 'build',
    configResolved(config) {
      const apiUrl = config.env.VITE_API_URL as string | undefined
      apiOrigin = apiUrl ? new URL(apiUrl).origin : ''
    },
    transformIndexHtml(html) {
      const policy = [
        "default-src 'self'",
        "script-src 'self' https://challenges.cloudflare.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: blob: https:",
        `connect-src 'self' ${apiOrigin} https://challenges.cloudflare.com`.replace(/\s+/g, ' '),
        'frame-src https://challenges.cloudflare.com',
        "worker-src 'self'",
        "manifest-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        `form-action 'self' ${apiOrigin}`.trim(),
      ].join('; ')
      return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    vue(),
    contentSecurityPolicy(),
  ],
  server: {
    host: true,
    allowedHosts: allowedHosts(),
    https: httpsConfig,
    hmr: {
      protocol: 'wss',
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/storage': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, "./src"),
    },
  },
  // vue-i18n bez JIT-a prevodi poruke preko new Function, što CSP (bez 'unsafe-eval') blokira
  define: {
    __INTLIFY_JIT_COMPILATION__: true,
  },
  optimizeDeps: {
    include: ['axios'],
  },
})
