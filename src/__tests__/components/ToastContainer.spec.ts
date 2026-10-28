import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ToastContainer from '@/components/ToastContainer.vue'
import { useToast } from '@/composables/useToast'

function mountContainer() {
  return mount(ToastContainer, { global: { stubs: { Teleport: true } } })
}

describe('ToastContainer', () => {
  beforeEach(() => {
    const { toasts, dismiss } = useToast()
    toasts.value.forEach((t) => dismiss(t.id))
  })

  it('renders active toasts with type styling', async () => {
    const wrapper = mountContainer()
    useToast().error('Slot taken', 0)
    await wrapper.vm.$nextTick()

    const alert = wrapper.find('[role="alert"]')
    expect(alert.text()).toContain('Slot taken')
    expect(alert.classes()).toContain('bg-red-50')
  })

  it('dismisses a toast on close click', async () => {
    const wrapper = mountContainer()
    useToast().info('Closable', 0)
    await wrapper.vm.$nextTick()

    await wrapper.find('button[aria-label="Close"]').trigger('click')
    expect(useToast().toasts.value).toHaveLength(0)
  })
})
