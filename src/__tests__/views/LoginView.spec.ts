import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { i18n } from '@/i18n'
import { createTestRouter } from '../helpers'

vi.mock('@/api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), defaults: { headers: { common: {} } } },
}))

import LoginView from '@/views/admin/LoginView.vue'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'

async function mountLogin() {
  const router = createTestRouter()
  router.push('/admin/login')
  await router.isReady()
  const wrapper = mount(LoginView, { global: { plugins: [i18n, router] } })
  return { wrapper, router }
}

describe('LoginView', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('logs in and redirects to the dashboard', async () => {
    const auth = useAuthStore()
    const login = vi.spyOn(auth, 'login').mockResolvedValue()
    const { wrapper, router } = await mountLogin()

    await wrapper.find('input[type="email"]').setValue('salon@example.com')
    await wrapper.find('input[type="password"]').setValue('secret')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(login).toHaveBeenCalledWith('salon@example.com', 'secret')
    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('shows an error on invalid credentials', async () => {
    const auth = useAuthStore()
    vi.spyOn(auth, 'login').mockRejectedValue(new Error('401'))
    const { wrapper, router } = await mountLogin()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Invalid email or password')
    expect(router.currentRoute.value.name).toBe('login')
  })

  it('shows the client brand on the client address', async () => {
    const tenant = useTenantStore()
    tenant.config = { app_name: 'Salon Ana', logo_url: null } as never
    const { wrapper } = await mountLogin()

    expect(wrapper.find('[data-testid="auth-tenant-brand"]').text()).toContain('Salon Ana')
    expect(wrapper.find('[data-testid="auth-platform-brand"]').exists()).toBe(false)
  })

  it('shows the platform brand on the main domain', async () => {
    const { wrapper } = await mountLogin()

    expect(wrapper.find('[data-testid="auth-platform-brand"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="auth-tenant-brand"]').exists()).toBe(false)
  })
})
