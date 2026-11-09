import axios, { isAxiosError } from 'axios'
import { i18n } from '@/i18n'
import { isPlatformHostname } from '@/lib/domain'

function resolveTenantHeader(): { key: string; value: string } | null {
  // Dev: eksplicitno postavljen subdomen u .env (override)
  const devSubdomain = import.meta.env.VITE_TENANT_SUBDOMAIN
  if (devSubdomain) return { key: 'X-Tenant-Subdomain', value: devSubdomain }

  const hostname = window.location.hostname
  const parts = hostname.split('.')

  // Dev: *.localhost (npr. salon-a.localhost → subdomain = salon-a)
  if (hostname.endsWith('.localhost') && parts.length === 2) {
    return { key: 'X-Tenant-Subdomain', value: parts[0] as string }
  }

  // Produkcija: koristimo VITE_PLATFORM_HOST da razlikujemo main od tenant domene
  const platformHost = import.meta.env.VITE_PLATFORM_HOST
  if (!platformHost) return null

  // Na glavnoj platformi — admin, bez tenant headera
  if (isPlatformHostname(hostname)) return null

  // Subdomena platforme (npr. moj-salon.booking.app)
  if (hostname.endsWith('.' + platformHost)) {
    const subdomain = hostname.slice(0, -(platformHost.length + 1))
    return { key: 'X-Tenant-Subdomain', value: subdomain }
  }

  // Custom domena (npr. rezervacije.moj-salon.com)
  return { key: 'X-Tenant-Domain', value: hostname }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  config.headers['Accept-Language'] = i18n.global.locale.value

  const tenantHeader = resolveTenantHeader()
  if (tenantHeader) {
    config.headers[tenantHeader.key] = tenantHeader.value
  }

  return config
})

// Istekao ili opozvan token: API vraća 401 na zahtev koji je nosio token. Šta tada (odjava,
// povratak na prijavu) određuje aplikacija preko onUnauthorized, da klijent ne zavisi od store-a i rutera.
let unauthorizedHandler: (() => void) | null = null

export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler
}

api.interceptors.response.use(undefined, (error) => {
  if (isAxiosError(error) && error.response?.status === 401 && error.config?.headers?.Authorization) {
    unauthorizedHandler?.()
  }
  return Promise.reject(error)
})

export default api
