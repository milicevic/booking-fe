import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { i18n } from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import { createTestRouter } from '../helpers'
import GoogleCallbackView from '@/views/auth/GoogleCallbackView.vue'

async function mountCallback(hash: string) {
  window.history.replaceState(null, '', `/auth/callback${hash}`)
  const router = createTestRouter()
  router.push('/auth/callback')
  await router.isReady()
  const wrapper = mount(GoogleCallbackView, { global: { plugins: [i18n, router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('GoogleCallbackView', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.history.replaceState(null, '', '/')
  })

  it('logs in with the token and redirects to the dashboard', async () => {
    const auth = useAuthStore()
    const loginWithToken = vi.spyOn(auth, 'loginWithToken').mockResolvedValue()

    const { router } = await mountCallback('#token=abc123')

    expect(loginWithToken).toHaveBeenCalledWith('abc123')
    expect(router.currentRoute.value.name).toBe('dashboard')
  })

  it('removes the token from the address bar', async () => {
    vi.spyOn(useAuthStore(), 'loginWithToken').mockResolvedValue()

    await mountCallback('#token=abc123')

    expect(window.location.hash).toBe('')
  })

  it('shows a translated message for an error code', async () => {
    const loginWithToken = vi.spyOn(useAuthStore(), 'loginWithToken')

    const { wrapper } = await mountCallback('#error=account_not_found')

    expect(wrapper.find('[data-testid="google-error"]').text()).toBe(i18n.global.t('auth.google.errors.account_not_found'))
    expect(wrapper.find('a[href="/admin/login"]').exists()).toBe(true)
    expect(loginWithToken).not.toHaveBeenCalled()
    expect(window.location.hash).toBe('')
  })

  it('falls back to a generic message for an unknown error', async () => {
    const { wrapper } = await mountCallback('#error=nesto')

    expect(wrapper.find('[data-testid="google-error"]').text()).toBe(i18n.global.t('auth.google.errors.google_failed'))
  })
})
