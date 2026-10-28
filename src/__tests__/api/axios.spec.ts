import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { InternalAxiosRequestConfig } from 'axios'
import { AxiosHeaders } from 'axios'
import api from '@/api/axios'
import { i18n } from '@/i18n'

// Pokreće request interceptor nad praznim configom i vraća headere
async function headersFor(): Promise<Record<string, unknown>> {
  const handler = (api.interceptors.request as any).handlers[0]
  const cfg = await handler.fulfilled({ headers: new AxiosHeaders() } as InternalAxiosRequestConfig)
  return cfg.headers.toJSON()
}

describe('api client tenant resolution', () => {
  // jsdom hostname je "localhost"
  beforeEach(() => {
    vi.stubEnv('VITE_TENANT_SUBDOMAIN', '')
    vi.stubEnv('VITE_PLATFORM_HOST', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    i18n.global.locale.value = 'en'
  })

  it('sends the current locale as Accept-Language', async () => {
    i18n.global.locale.value = 'sr'
    expect((await headersFor())['Accept-Language']).toBe('sr')
  })

  it('uses the dev subdomain override', async () => {
    vi.stubEnv('VITE_TENANT_SUBDOMAIN', 'salon-a')
    expect((await headersFor())['X-Tenant-Subdomain']).toBe('salon-a')
  })

  it('sends no tenant header without platform host', async () => {
    const headers = await headersFor()
    expect(headers['X-Tenant-Subdomain']).toBeUndefined()
    expect(headers['X-Tenant-Domain']).toBeUndefined()
  })

  it('sends no tenant header on the main platform host', async () => {
    vi.stubEnv('VITE_PLATFORM_HOST', 'localhost')
    const headers = await headersFor()
    expect(headers['X-Tenant-Subdomain']).toBeUndefined()
    expect(headers['X-Tenant-Domain']).toBeUndefined()
  })

  it('treats any other host as a custom tenant domain', async () => {
    vi.stubEnv('VITE_PLATFORM_HOST', 'booking.app')
    expect((await headersFor())['X-Tenant-Domain']).toBe('localhost')
  })

  it('sends JSON headers by default', () => {
    expect(api.defaults.headers['Accept']).toBe('application/json')
    expect(api.defaults.withCredentials).toBe(true)
  })
})
