import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { i18n } from '@/i18n'
import { createTestRouter } from '../helpers'

vi.mock('@/api/tenant', () => ({
  tenantApi: { register: vi.fn(), previewSubdomain: vi.fn() },
}))

import RegisterView from '@/views/auth/RegisterView.vue'
import { tenantApi } from '@/api/tenant'

async function mountRegister() {
  const router = createTestRouter()
  router.push('/register')
  await router.isReady()
  return mount(RegisterView, { global: { plugins: [i18n, router] } })
}

describe('RegisterView', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
    vi.stubEnv('VITE_PLATFORM_HOST', 'slotres.click')
    vi.mocked(tenantApi.previewSubdomain).mockResolvedValue({ data: { subdomain: 'salon-ana' } } as never)
    vi.mocked(tenantApi.register).mockResolvedValue({ data: { token: 't', tenant: { subdomain: 'salon-ana' } } } as never)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('has a business name field and no theme or color pickers', async () => {
    const wrapper = await mountRegister()
    expect(wrapper.find('#register-app-name').exists()).toBe(true)
    expect(wrapper.find('input[type="color"]').exists()).toBe(false)
    expect(wrapper.find('input[type="radio"]').exists()).toBe(false)
  })

  it('shows the page address based on the business name', async () => {
    const wrapper = await mountRegister()
    await wrapper.find('#register-app-name').setValue('Salon Ana')
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    expect(tenantApi.previewSubdomain).toHaveBeenCalledWith('Salon Ana')
    expect(wrapper.find('[data-testid="address-preview"]').text()).toBe('https://salon-ana.slotres.click')
  })

  it('sends app_name with the registration and no theme or colors', async () => {
    const wrapper = await mountRegister()
    await wrapper.find('#register-app-name').setValue('Salon Ana')
    await wrapper.find('#register-name').setValue('Ana Petrović')
    await wrapper.find('input[type="email"]').setValue('ana@example.com')
    await wrapper.find('input[type="password"]').setValue('secret123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(tenantApi.register).toHaveBeenCalledWith({
      app_name: 'Salon Ana',
      name: 'Ana Petrović',
      email: 'ana@example.com',
      password: 'secret123',
    })
  })

  it('after registration links to the client address instead of the main domain', async () => {
    const wrapper = await mountRegister()
    await wrapper.find('#register-app-name').setValue('Salon Ana')
    await wrapper.find('#register-name').setValue('Ana Petrović')
    await wrapper.find('input[type="email"]').setValue('ana@example.com')
    await wrapper.find('input[type="password"]').setValue('secret123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const { protocol, port } = window.location
    const base = `${protocol}//salon-ana.slotres.click${port ? `:${port}` : ''}`
    expect(wrapper.find('[data-testid="registered-address"]').attributes('href')).toBe(base)
    expect(wrapper.find('[data-testid="go-to-login"]').attributes('href')).toBe(`${base}/admin/login`)
  })
})
