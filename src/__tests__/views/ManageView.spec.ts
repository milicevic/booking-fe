import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { i18n } from '@/i18n'
import { createTestRouter } from '../helpers'

vi.mock('@/api/booking', () => ({ bookingApi: { getByToken: vi.fn(), cancel: vi.fn() } }))

import { bookingApi } from '@/api/booking'
import ManageView from '@/views/booking/ManageView.vue'

function booking(status: string) {
  return {
    token: 'tok',
    status,
    customer_name: 'Ana',
    start_time: '08:00:00',
    end_time: '08:40:00',
    service: { id: 1, name: 'Haircut', duration_minutes: 40, price: null },
    slot: { date: '2030-01-10', worker: { id: 1, name: 'Marko' } },
  }
}

async function mountManage(status: string) {
  vi.mocked(bookingApi.getByToken).mockResolvedValue({ data: booking(status) } as never)
  const router = createTestRouter()
  router.push('/manage/tok')
  await router.isReady()
  const wrapper = mount(ManageView, { global: { plugins: [i18n, router] } })
  await flushPromises()
  return wrapper
}

describe('ManageView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('shows the exact booking time and service', async () => {
    const wrapper = await mountManage('confirmed')
    expect(wrapper.text()).toContain('08:00 — 08:40')
    expect(wrapper.text()).toContain('Haircut')
    expect(wrapper.text()).toContain('Cancel')
  })

  it('shows a rejected booking as rejected, without a cancel button', async () => {
    const wrapper = await mountManage('rejected')
    expect(wrapper.text()).toContain('Rejected')
    expect(wrapper.text()).not.toContain('Pending')
    expect(wrapper.findAll('button').some((b) => b.text().includes('Cancel'))).toBe(false)
  })
})
