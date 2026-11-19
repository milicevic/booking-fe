import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { i18n } from '@/i18n'

vi.mock('@/api/admin', () => ({
  adminApi: { getBlockedCustomers: vi.fn<() => unknown>(), unblockCustomer: vi.fn<() => unknown>() },
}))
vi.mock('@/composables/useConfirm', () => ({ useConfirm: () => ({ confirm: () => Promise.resolve(true) }) }))

import { adminApi } from '@/api/admin'
import BlockedCustomers from '@/components/admin/BlockedCustomers.vue'

describe('BlockedCustomers', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists blocked customers and unblocks one', async () => {
    vi.mocked(adminApi.getBlockedCustomers).mockResolvedValue({
      data: [{ id: 3, name: 'Marko', phone: '+381601234567', email: null, created_at: '2026-11-18T10:00:00Z' }],
    } as never)
    vi.mocked(adminApi.unblockCustomer).mockResolvedValue({} as never)
    const wrapper = mount(BlockedCustomers, { global: { plugins: [i18n] } })
    await flushPromises()

    expect(wrapper.text()).toContain('Marko')
    expect(wrapper.text()).toContain('+381601234567')

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(adminApi.unblockCustomer).toHaveBeenCalledWith(3)
    expect(wrapper.text()).toContain('No blocked customers')
  })
})
