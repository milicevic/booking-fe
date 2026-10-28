import { describe, it, expect } from 'vitest'
import { useConfirm } from '@/composables/useConfirm'

describe('useConfirm', () => {
  it('opens with a message and resolves true on accept', async () => {
    const { isOpen, message, confirm, accept } = useConfirm()
    const result = confirm('Delete worker?')

    expect(isOpen.value).toBe(true)
    expect(message.value).toBe('Delete worker?')

    accept()
    await expect(result).resolves.toBe(true)
    expect(isOpen.value).toBe(false)
  })

  it('resolves false on reject', async () => {
    const { isOpen, confirm, reject } = useConfirm()
    const result = confirm('Cancel booking?')

    reject()
    await expect(result).resolves.toBe(false)
    expect(isOpen.value).toBe(false)
  })

  it('shares state between callers', () => {
    const a = useConfirm()
    const b = useConfirm()
    a.confirm('Shared?')
    expect(b.isOpen.value).toBe(true)
    expect(b.message.value).toBe('Shared?')
    b.reject()
  })
})
