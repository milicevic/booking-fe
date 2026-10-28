import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { i18n } from '@/i18n'
import SubscriptionBanner from '@/components/SubscriptionBanner.vue'
import { useTenantStore } from '@/stores/tenant'
import type { TenantConfig } from '@/api/tenant'

function mountWith(status: TenantConfig['subscription_status'] | null, trialEndsAt: string | null = null) {
  const tenant = useTenantStore()
  tenant.config = status
    ? ({ subscription_status: status, trial_ends_at: trialEndsAt } as TenantConfig)
    : null
  return mount(SubscriptionBanner, { global: { plugins: [i18n] } })
}

describe('SubscriptionBanner', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows nothing for an active subscription', () => {
    expect(mountWith('active').text()).toBe('')
  })

  it('shows nothing without config', () => {
    expect(mountWith(null).text()).toBe('')
  })

  it('shows expired message', () => {
    const text = mountWith('expired').text()
    expect(text).toContain('Your account has been expired.')
    expect(text).toContain('Contact support')
  })

  it('shows canceled message', () => {
    expect(mountWith('canceled').text()).toContain('Your account has been canceled.')
  })

  it('shows remaining trial days', () => {
    const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 - 1000).toISOString()
    expect(mountWith('trialing', in3Days).text()).toContain('3 days remaining')
  })

  it('uses singular for one trial day', () => {
    const in1Day = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
    expect(mountWith('trialing', in1Day).text()).toContain('1 day remaining')
  })

  it('shows trial expired when no days remain', () => {
    const past = new Date(Date.now() - 1000).toISOString()
    expect(mountWith('trialing', past).text()).toContain('Your trial period has expired')
  })

  it('does not claim the trial expired when the end date is unknown', () => {
    expect(mountWith('trialing', null).text()).not.toContain('expired')
  })

  it('shows pending deploy notice', () => {
    expect(mountWith('pending_deploy').text()).toContain('Deploy request is pending')
  })
})
