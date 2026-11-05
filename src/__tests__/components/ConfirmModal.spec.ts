import { describe, it, expect, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { i18n } from '@/i18n'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { useConfirm } from '@/composables/useConfirm'

// Dijalog se renderuje u <body> (portal), pa ga tražimo tamo, a ne u wrapper-u
let wrapper: VueWrapper | null = null

function mountModal() {
  wrapper = mount(ConfirmModal, { attachTo: document.body, global: { plugins: [i18n] } })
}

// Portal se prikazuje tek u sledećem ciklusu
async function settle() {
  await flushPromises()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

function button(text: string) {
  return [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === text)!
}

describe('ConfirmModal', () => {
  afterEach(() => {
    useConfirm().reject()
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
  })

  it('is hidden by default', () => {
    mountModal()
    expect(document.body.querySelector('[role="alertdialog"]')).toBeNull()
  })

  it('shows the message and resolves true on Confirm', async () => {
    mountModal()
    const result = useConfirm().confirm('Delete this service?')
    await settle()

    expect(document.body.querySelector('[role="alertdialog"]')?.textContent).toContain('Delete this service?')
    button('Confirm').click()

    await expect(result).resolves.toBe(true)
    expect(useConfirm().isOpen.value).toBe(false)
  })

  it('resolves false on Cancel', async () => {
    mountModal()
    const result = useConfirm().confirm('Delete?')
    await settle()

    button('Cancel').click()

    await expect(result).resolves.toBe(false)
  })

  it('resolves false on Escape', async () => {
    mountModal()
    const result = useConfirm().confirm('Delete?')
    await settle()

    document.body.querySelector('[role="alertdialog"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    await expect(result).resolves.toBe(false)
  })
})
