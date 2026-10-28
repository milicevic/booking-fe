import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import LangSwitcher from '@/components/LangSwitcher.vue'

describe('LangSwitcher', () => {
  afterEach(() => {
    i18n.global.locale.value = 'en'
    localStorage.clear()
  })

  it('toggles between en and sr and persists the choice', async () => {
    const wrapper = mount(LangSwitcher, { global: { plugins: [i18n] } })
    expect(wrapper.text()).toBe('SR')

    await wrapper.trigger('click')
    expect(i18n.global.locale.value).toBe('sr')
    expect(localStorage.getItem('locale')).toBe('sr')
    expect(wrapper.text()).toBe('EN')

    await wrapper.trigger('click')
    expect(i18n.global.locale.value).toBe('en')
  })
})
