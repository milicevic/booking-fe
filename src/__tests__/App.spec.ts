import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { i18n } from '@/i18n'
import App from '../App.vue'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { createTestRouter } from './helpers'

vi.mock('@/api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), defaults: { headers: { common: {} } } },
}))

describe('App', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.unstubAllEnvs()
  })

  async function mountApp() {
    const router = createTestRouter()
    router.push('/')
    await router.isReady()
    const auth = useAuthStore()
    const tenant = useTenantStore()
    const fetchMe = vi.spyOn(auth, 'fetchMe').mockResolvedValue()
    const fetchConfig = vi.spyOn(tenant, 'fetchConfig').mockResolvedValue()
    const wrapper = mount(App, { global: { plugins: [router, i18n] } })
    await flushPromises()
    return { wrapper, fetchMe, fetchConfig }
  }

  it('fetches the current user on mount', async () => {
    const { fetchMe } = await mountApp()
    expect(fetchMe).toHaveBeenCalledOnce()
  })

  it('loads tenant config on a tenant domain', async () => {
    vi.stubEnv('VITE_TENANT_SUBDOMAIN', 'salon-a')
    const { fetchConfig } = await mountApp()
    expect(fetchConfig).toHaveBeenCalledOnce()
  })

  it('skips tenant config on the main platform host', async () => {
    vi.stubEnv('VITE_TENANT_SUBDOMAIN', '')
    vi.stubEnv('VITE_PLATFORM_HOST', window.location.hostname)
    const { fetchConfig } = await mountApp()
    expect(fetchConfig).not.toHaveBeenCalled()
  })
})
