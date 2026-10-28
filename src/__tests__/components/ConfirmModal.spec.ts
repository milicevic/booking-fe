import { describe, it, expect, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { i18n } from '@/i18n'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { useConfirm } from '@/composables/useConfirm'

function mountModal() {
  return mount(ConfirmModal, {
    attachTo: document.body,
    global: { plugins: [i18n], stubs: { Teleport: true, Transition: false } },
  })
}

describe('ConfirmModal', () => {
  afterEach(() => {
    useConfirm().reject()
    document.body.innerHTML = ''
  })

  it('is hidden by default', () => {
    expect(mountModal().text()).toBe('')
  })

  it('shows the message and resolves true on Confirm', async () => {
    const wrapper = mountModal()
    const result = useConfirm().confirm('Delete this service?')
    await flushPromises()

    expect(wrapper.text()).toContain('Delete this service?')
    const confirmBtn = wrapper.findAll('button').find((b) => b.text() === 'Confirm')!
    await confirmBtn.trigger('click')

    await expect(result).resolves.toBe(true)
    expect(useConfirm().isOpen.value).toBe(false)
  })

  it('resolves false on Cancel', async () => {
    const wrapper = mountModal()
    const result = useConfirm().confirm('Delete?')
    await flushPromises()

    const cancelBtn = wrapper.findAll('button').find((b) => b.text() === 'Cancel')!
    await cancelBtn.trigger('click')

    await expect(result).resolves.toBe(false)
  })
})
