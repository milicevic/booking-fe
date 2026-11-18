import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { useLiveRefresh } from '@/composables/useLiveRefresh'

function mountWith(refresh: () => unknown, poll = true) {
  return mount(defineComponent({ setup: () => (useLiveRefresh(refresh, { poll, intervalMs: 1000 }), () => h('div')) }))
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('useLiveRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setVisibility('visible')
  })
  afterEach(() => vi.useRealTimers())

  it('refreshes periodically while the tab is visible', async () => {
    const refresh = vi.fn<() => void>()
    const wrapper = mountWith(refresh)

    await vi.advanceTimersByTimeAsync(2000)
    expect(refresh).toHaveBeenCalledTimes(2)

    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(5000)
    expect(refresh).toHaveBeenCalledTimes(2)
  })

  it('skips hidden tabs and refreshes right away when the user comes back', async () => {
    const refresh = vi.fn<() => void>()
    mountWith(refresh)

    setVisibility('hidden')
    await vi.advanceTimersByTimeAsync(3000)
    expect(refresh).not.toHaveBeenCalled()

    setVisibility('visible')
    await flushPromises()
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('does not poll without poll (customer pages), only on return and push', async () => {
    const refresh = vi.fn<() => void>()
    mountWith(refresh, false)

    await vi.advanceTimersByTimeAsync(5000)
    expect(refresh).not.toHaveBeenCalled()

    setVisibility('visible')
    await flushPromises()
    expect(refresh).toHaveBeenCalledTimes(1)
  })
})
