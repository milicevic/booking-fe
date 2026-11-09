import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { i18n } from '@/i18n'
import { createTestRouter } from '../helpers'

vi.mock('@/api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), defaults: { headers: { common: {} } } },
}))

import { useAuthStore } from '@/stores/auth'
import ForgotPasswordView from '@/views/auth/ForgotPasswordView.vue'
import ResetPasswordView from '@/views/auth/ResetPasswordView.vue'

async function mountAt(component: object, path: string) {
  const router = createTestRouter()
  router.push(path)
  await router.isReady()
  const wrapper = mount(component, { global: { plugins: [i18n, router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('password reset', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('asks for a reset link and shows the same message for any email', async () => {
    const request = vi.spyOn(useAuthStore(), 'requestPasswordReset').mockResolvedValue()
    const { wrapper } = await mountAt(ForgotPasswordView, '/admin/forgot-password')

    await wrapper.find('input[type="email"]').setValue('ana@salon.com')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(request).toHaveBeenCalledWith('ana@salon.com')
    expect(wrapper.find('[data-testid="forgot-sent"]').exists()).toBe(true)
  })

  it('sets the new password from the mail link and returns to sign in', async () => {
    const reset = vi.spyOn(useAuthStore(), 'resetPassword').mockResolvedValue()
    const { wrapper, router } = await mountAt(ResetPasswordView, '/admin/reset-password?token=abc&email=ana%40salon.com')

    await wrapper.find('#reset-password').setValue('nova-lozinka')
    await wrapper.find('#reset-password-confirmation').setValue('nova-lozinka')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(reset).toHaveBeenCalledWith({ token: 'abc', email: 'ana@salon.com', password: 'nova-lozinka', password_confirmation: 'nova-lozinka' })
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.reset).toBe('1')
  })

  it('stops when the two passwords differ', async () => {
    const reset = vi.spyOn(useAuthStore(), 'resetPassword')
    const { wrapper } = await mountAt(ResetPasswordView, '/admin/reset-password?token=abc&email=ana%40salon.com')

    await wrapper.find('#reset-password').setValue('nova-lozinka')
    await wrapper.find('#reset-password-confirmation').setValue('druga-lozinka')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Passwords do not match')
    expect(reset).not.toHaveBeenCalled()
  })

  it('explains an incomplete link', async () => {
    const { wrapper } = await mountAt(ResetPasswordView, '/admin/reset-password')
    expect(wrapper.find('[data-testid="reset-invalid"]').exists()).toBe(true)
  })
})
