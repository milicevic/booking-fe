import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useToast } from '@/composables/useToast'

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    const { toasts, dismiss } = useToast()
    toasts.value.forEach((t) => dismiss(t.id))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('adds typed toasts', () => {
    const toast = useToast()
    toast.success('Saved')
    toast.error('Failed')
    toast.info('Heads up')

    expect(toast.toasts.value.map((t) => [t.type, t.message])).toEqual([
      ['success', 'Saved'],
      ['error', 'Failed'],
      ['info', 'Heads up'],
    ])
  })

  it('auto-dismisses after the duration', () => {
    const toast = useToast()
    toast.error('Gone soon', 3000)

    vi.advanceTimersByTime(2999)
    expect(toast.toasts.value).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(toast.toasts.value).toHaveLength(0)
  })

  it('keeps a toast with duration 0 until dismissed', () => {
    const toast = useToast()
    const id = toast.info('Sticky', 0)

    vi.advanceTimersByTime(60_000)
    expect(toast.toasts.value).toHaveLength(1)

    toast.dismiss(id)
    expect(toast.toasts.value).toHaveLength(0)
  })

  it('shares state between callers', () => {
    useToast().success('Shared')
    expect(useToast().toasts.value[0]?.message).toBe('Shared')
  })
})
