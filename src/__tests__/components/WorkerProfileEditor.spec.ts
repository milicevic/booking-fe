import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { i18n } from '@/i18n'

vi.mock('@/api/admin', () => ({
  adminApi: {
    updateWorkerProfile: vi.fn<(...args: unknown[]) => unknown>(),
    updateWorker: vi.fn<(...args: unknown[]) => unknown>(),
    uploadWorkerPhoto: vi.fn<(...args: unknown[]) => unknown>(),
    deleteWorkerPhoto: vi.fn<(...args: unknown[]) => unknown>(),
  },
}))

import { adminApi } from '@/api/admin'
import type { Worker } from '@/api/admin'
import WorkerProfileEditor from '@/components/admin/WorkerProfileEditor.vue'
import WorkerAvatar from '@/components/WorkerAvatar.vue'

function worker(profile: Partial<NonNullable<Worker['worker_profile']>> = {}): Worker {
  return {
    id: 7,
    name: 'Marko',
    email: null,
    role: 'worker',
    client_id: 1,
    can_edit_slots: false,
    worker_profile: { id: 1, user_id: 7, phone: null, photo_url: null, bio: null, ...profile },
  }
}

function mountEditor(w = worker(), canEditName = false) {
  return mount(WorkerProfileEditor, { props: { worker: w, canEditName }, global: { plugins: [i18n] } })
}

describe('WorkerAvatar', () => {
  it('shows a generic picture when the worker has no photo', () => {
    const wrapper = mount(WorkerAvatar, { props: { photoUrl: null } })
    expect(wrapper.find('[data-testid="worker-avatar-default"]').exists()).toBe(true)
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('shows the photo when there is one', () => {
    const wrapper = mount(WorkerAvatar, { props: { photoUrl: '/storage/w.webp' } })
    expect(wrapper.find('img').attributes('src')).toBe('/storage/w.webp')
  })
})

describe('WorkerProfileEditor', () => {
  beforeEach(() => vi.clearAllMocks())

  it('saves the description through the profile endpoint', async () => {
    vi.mocked(adminApi.updateWorkerProfile).mockResolvedValue({ data: worker({ bio: 'Novi opis' }) } as never)
    const wrapper = mountEditor()

    await wrapper.find('textarea').setValue('  Novi opis  ')
    await wrapper.findAll('button').find((b) => b.text() === 'Save')!.trigger('click')
    await flushPromises()

    expect(adminApi.updateWorkerProfile).toHaveBeenCalledWith(7, 'Novi opis')
    expect(wrapper.emitted('updated')?.[0]).toEqual([worker({ bio: 'Novi opis' })])
  })

  it('clears the description when it is emptied', async () => {
    vi.mocked(adminApi.updateWorkerProfile).mockResolvedValue({ data: worker() } as never)
    const wrapper = mountEditor(worker({ bio: 'Stari opis' }))

    await wrapper.find('textarea').setValue('   ')
    await wrapper.findAll('button').find((b) => b.text() === 'Save')!.trigger('click')
    await flushPromises()

    expect(adminApi.updateWorkerProfile).toHaveBeenCalledWith(7, null)
  })

  it('uploads a chosen photo and shows it', async () => {
    vi.mocked(adminApi.uploadWorkerPhoto).mockResolvedValue({ data: worker({ photo_url: '/storage/marko.webp' }) } as never)
    const wrapper = mountEditor()
    const file = new File(['x'], 'marko.png', { type: 'image/png' })
    const input = wrapper.find('input[type="file"]')
    Object.defineProperty(input.element, 'files', { value: [file] })

    await input.trigger('change')
    await flushPromises()

    expect(adminApi.uploadWorkerPhoto).toHaveBeenCalledWith(7, file)
    expect(wrapper.find('img').attributes('src')).toBe('/storage/marko.webp')
    expect(wrapper.text()).toContain('Remove photo')
  })

  it('removes the photo and falls back to the generic picture', async () => {
    vi.mocked(adminApi.deleteWorkerPhoto).mockResolvedValue({ data: worker() } as never)
    const wrapper = mountEditor(worker({ photo_url: '/storage/marko.webp' }))

    await wrapper.findAll('button').find((b) => b.text() === 'Remove photo')!.trigger('click')
    await flushPromises()

    expect(adminApi.deleteWorkerPhoto).toHaveBeenCalledWith(7)
    expect(wrapper.find('[data-testid="worker-avatar-default"]').exists()).toBe(true)
  })

  it('lets the client change the name together with the description', async () => {
    vi.mocked(adminApi.updateWorker).mockResolvedValue({ data: { ...worker({ bio: 'Opis' }), name: 'Marko M.' } } as never)
    const wrapper = mountEditor(worker(), true)

    await wrapper.find('input[type="text"]').setValue('Marko M.')
    await wrapper.find('textarea').setValue('Opis')
    await wrapper.findAll('button').find((b) => b.text() === 'Save')!.trigger('click')
    await flushPromises()

    expect(adminApi.updateWorker).toHaveBeenCalledWith(7, { name: 'Marko M.', bio: 'Opis' })
    expect(adminApi.updateWorkerProfile).not.toHaveBeenCalled()
  })

  it('does not let a worker change the name', () => {
    const wrapper = mountEditor()
    expect(wrapper.find('input[type="text"]').exists()).toBe(false)
  })

  it('requires a name', async () => {
    const wrapper = mountEditor(worker(), true)
    await wrapper.find('input[type="text"]').setValue('  ')
    await wrapper.findAll('button').find((b) => b.text() === 'Save')!.trigger('click')

    expect(wrapper.text()).toContain('Enter worker name')
    expect(adminApi.updateWorker).not.toHaveBeenCalled()
  })
})
