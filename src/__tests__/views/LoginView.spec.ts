import { AxiosError } from 'axios'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { i18n } from '@/i18n'
import { createTestRouter } from '../helpers'

vi.mock('@/api/axios', () => ({
  default: { get: vi.fn<(...args: unknown[]) => unknown>(), post: vi.fn<(...args: unknown[]) => unknown>(), defaults: { headers: { common: {} } } },
}))

import LoginView from '@/views/admin/LoginView.vue'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'

async function mountLogin(path = '/admin/login') {
  const router = createTestRouter()
  router.push(path)
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

  it('offers to resend the confirmation email when the address is not verified', async () => {
    const auth = useAuthStore()
    vi.spyOn(auth, 'login').mockRejectedValue(
      new AxiosError('403', undefined, undefined, undefined, {
        status: 403,
        data: { message: 'Please confirm your email address.', code: 'email_not_verified' },
      } as never),
    )
    const resend = vi.spyOn(auth, 'resendVerification').mockResolvedValue()
    const { wrapper } = await mountLogin()

    await wrapper.find('input[type="email"]').setValue('ana@salon.com')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Please confirm your email address.')
    await wrapper.find('[data-testid="resend-verification"]').trigger('click')
    await flushPromises()

    expect(resend).toHaveBeenCalledWith('ana@salon.com')
    expect(wrapper.find('[data-testid="verification-resent"]').text()).toBe(i18n.global.t('auth.verify.resent'))
  })

  it('does not offer resend for wrong credentials', async () => {
    vi.spyOn(useAuthStore(), 'login').mockRejectedValue(new Error('401'))
    const { wrapper } = await mountLogin()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="resend-verification"]').exists()).toBe(false)
  })

  it('confirms the email after the link from the mail', async () => {
    const { wrapper } = await mountLogin('/admin/login?verified=1')
    expect(wrapper.find('[data-testid="email-verified"]').exists()).toBe(true)
  })

  it('explains an invalid confirmation link', async () => {
    const { wrapper } = await mountLogin('/admin/login?verified=invalid')
    expect(wrapper.find('[data-testid="email-verify-invalid"]').exists()).toBe(true)
  })

  it('links to the forgotten password page and confirms a changed password', async () => {
    const { wrapper } = await mountLogin('/admin/login?reset=1')

    expect(wrapper.find('[data-testid="forgot-password-link"]').attributes('href')).toBe('/admin/forgot-password')
    expect(wrapper.find('[data-testid="password-reset-done"]').exists()).toBe(true)
  })
})
