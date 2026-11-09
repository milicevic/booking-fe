import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { i18n } from '@/i18n'
import TurnstileWidget from '@/components/TurnstileWidget.vue'

describe('TurnstileWidget', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    delete window.turnstile
    document.head.querySelectorAll('script[src*="turnstile"]').forEach((s) => s.remove())
  })

  it('renders nothing while captcha is not configured', () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '')
    const wrapper = mount(TurnstileWidget, { global: { plugins: [i18n] } })

    expect(wrapper.find('[data-testid="captcha"]').exists()).toBe(false)
    expect(document.head.querySelector('script[src*="turnstile"]')).toBeNull()
  })

  it('loads Turnstile and reports the token', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site-key')
    let options: Record<string, unknown> = {}
    window.turnstile = {
      render: vi.fn((_el, opts) => {
        options = opts
        return 'widget-1'
      }),
      reset: vi.fn(),
      remove: vi.fn(),
    }

    const wrapper = mount(TurnstileWidget, { global: { plugins: [i18n] } })
    const script = document.head.querySelector<HTMLScriptElement>('script[src*="turnstile"]')!
    script.onload?.(new Event('load'))
    await flushPromises()

    expect(options.sitekey).toBe('site-key')
    ;(options.callback as (token: string) => void)('captcha-token')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['captcha-token'])
  })
})
