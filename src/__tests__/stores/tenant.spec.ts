import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/api/tenant', () => ({ tenantApi: { getConfig: vi.fn() } }))

import { tenantApi } from '@/api/tenant'
import type { TenantConfig } from '@/api/tenant'
import { useTenantStore } from '@/stores/tenant'

const getConfig = tenantApi.getConfig as ReturnType<typeof vi.fn>

function config(overrides: Partial<TenantConfig> = {}): TenantConfig {
  return {
    app_name: 'Salon A',
    logo_url: 'https://cdn.example.com/logo.png',
    primary_color: '#111111',
    secondary_color: '#222222',
    theme: 'modern',
    subscription_status: 'active',
    trial_ends_at: null,
    subscription_ends_at: null,
    ...overrides,
  }
}

describe('tenant store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    document.documentElement.removeAttribute('style')
    document.documentElement.removeAttribute('data-theme')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses defaults before config is loaded', () => {
    const tenant = useTenantStore()
    expect(tenant.appName).toBe('Booking')
    expect(tenant.logoUrl).toBeNull()
    expect(tenant.isExpired).toBe(false)
    expect(tenant.isTrialing).toBe(false)
    expect(tenant.trialDaysLeft).toBeNull()
  })

  it('fetchConfig stores config and applies the theme as CSS variables', async () => {
    getConfig.mockResolvedValue({ data: config() })
    const tenant = useTenantStore()

    await tenant.fetchConfig()

    expect(tenant.loaded).toBe(true)
    expect(tenant.appName).toBe('Salon A')
    expect(tenant.logoUrl).toBe('https://cdn.example.com/logo.png')
    const root = document.documentElement
    expect(root.style.getPropertyValue('--color-primary')).toBe('#111111')
    expect(root.style.getPropertyValue('--color-secondary')).toBe('#222222')
    expect(root.getAttribute('data-theme')).toBe('modern')
  })

  it('fetchConfig falls back to defaults on error', async () => {
    getConfig.mockRejectedValue(new Error('network'))
    const tenant = useTenantStore()

    await tenant.fetchConfig()

    expect(tenant.loaded).toBe(true)
    expect(tenant.config).toBeNull()
    expect(tenant.appName).toBe('Booking')
  })

  it.each(['expired', 'canceled'] as const)('%s subscription is blocked', async (status) => {
    getConfig.mockResolvedValue({ data: config({ subscription_status: status }) })
    const tenant = useTenantStore()
    await tenant.fetchConfig()
    expect(tenant.isExpired).toBe(true)
  })

  it.each(['trialing', 'active', 'pending_deploy'] as const)('%s subscription is not blocked', async (status) => {
    getConfig.mockResolvedValue({ data: config({ subscription_status: status }) })
    const tenant = useTenantStore()
    await tenant.fetchConfig()
    expect(tenant.isExpired).toBe(false)
  })

  it('computes remaining trial days (7-day trial)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-01T12:00:00Z'))
    getConfig.mockResolvedValue({
      data: config({ subscription_status: 'trialing', trial_ends_at: '2026-10-08T12:00:00Z' }),
    })
    const tenant = useTenantStore()
    await tenant.fetchConfig()

    expect(tenant.isTrialing).toBe(true)
    expect(tenant.trialDaysLeft).toBe(7)
  })

  it('never returns negative trial days', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-10T12:00:00Z'))
    getConfig.mockResolvedValue({
      data: config({ subscription_status: 'trialing', trial_ends_at: '2026-10-08T12:00:00Z' }),
    })
    const tenant = useTenantStore()
    await tenant.fetchConfig()

    expect(tenant.trialDaysLeft).toBe(0)
  })
})
