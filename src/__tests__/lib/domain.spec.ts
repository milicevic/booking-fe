import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isPlatformHost, isPlatformHostname, tenantUrl } from '@/lib/domain'

describe('isPlatformHost', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('VITE_TENANT_SUBDOMAIN', '')
  })

  it('is true on the main platform host', () => {
    vi.stubEnv('VITE_PLATFORM_HOST', window.location.hostname)
    expect(isPlatformHost()).toBe(true)
  })

  it('is false on any other host', () => {
    vi.stubEnv('VITE_PLATFORM_HOST', 'slotres.click')
    expect(isPlatformHost()).toBe(false)
  })

  it('is false when platform host is not configured', () => {
    vi.stubEnv('VITE_PLATFORM_HOST', '')
    expect(isPlatformHost()).toBe(false)
  })

  it('is false when a dev tenant subdomain is set', () => {
    vi.stubEnv('VITE_PLATFORM_HOST', window.location.hostname)
    vi.stubEnv('VITE_TENANT_SUBDOMAIN', 'salon-a')
    expect(isPlatformHost()).toBe(false)
  })
})

describe('tenantUrl', () => {
  it('builds the client address on the platform host, keeping protocol and port', () => {
    vi.stubEnv('VITE_PLATFORM_HOST', 'slotres.click')
    const { protocol, port } = window.location
    const portPart = port ? `:${port}` : ''

    expect(tenantUrl('salon-ana')).toBe(`${protocol}//salon-ana.slotres.click${portPart}`)
    expect(tenantUrl('salon-ana', '/admin/login')).toBe(`${protocol}//salon-ana.slotres.click${portPart}/admin/login`)
  })
})

describe('isPlatformHostname', () => {
  it('treats www as the main platform, not as a client', () => {
    vi.stubEnv('VITE_PLATFORM_HOST', 'slotres.click')
    expect(isPlatformHostname('slotres.click')).toBe(true)
    expect(isPlatformHostname('www.slotres.click')).toBe(true)
    expect(isPlatformHostname('salon-ana.slotres.click')).toBe(false)
  })
})
