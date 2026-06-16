import axios from 'axios'
import { i18n } from '@/i18n'

function resolveTenantHeader(): { key: string; value: string } | null {
  // Dev: eksplicitno postavljen subdomen u .env (override)
  const devSubdomain = import.meta.env.VITE_TENANT_SUBDOMAIN
  if (devSubdomain) return { key: 'X-Tenant-Subdomain', value: devSubdomain }

  const hostname = window.location.hostname
  const parts = hostname.split('.')

  // Dev: *.localhost (npr. test-salon.localhost → subdomain = test-salon)
  if (hostname.endsWith('.localhost') && parts.length === 2) {
    return { key: 'X-Tenant-Subdomain', value: parts[0] }
  }

  // Produkcija: koristimo VITE_PLATFORM_HOST da razlikujemo main od tenant domene
  const platformHost = import.meta.env.VITE_PLATFORM_HOST
  if (!platformHost) return null

  // Na glavnoj platformi — admin, bez tenant headera
  if (hostname === platformHost) return null

  // Subdomena platforme (npr. moj-salon.booking.app)
  if (hostname.endsWith('.' + platformHost)) {
    const subdomain = hostname.slice(0, -(platformHost.length + 1))
    return { key: 'X-Tenant-Subdomain', value: subdomain }
  }

  // Custom domena (npr. rezervacije.moj-salon.com)
  return { key: 'X-Tenant-Domain', value: hostname }
}

const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
}

const tenantHeader = resolveTenantHeader()
if (tenantHeader) {
  headers[tenantHeader.key] = tenantHeader.value
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  withCredentials: true,
  headers,
})

api.interceptors.request.use((config) => {
  config.headers['Accept-Language'] = i18n.global.locale.value
  return config
})

export default api
