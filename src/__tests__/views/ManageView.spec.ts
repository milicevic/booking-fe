import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { i18n } from '@/i18n'
import { createTestRouter } from '../helpers'

vi.mock('@/api/booking', () => ({
  bookingApi: {
    getByToken: vi.fn<(...args: unknown[]) => unknown>(),
    cancel: vi.fn<(...args: unknown[]) => unknown>(),
    reschedule: vi.fn<(...args: unknown[]) => unknown>(),
  },
}))
vi.mock('@/api/slots', () => ({ slotsApi: { getTimes: vi.fn<(...args: unknown[]) => unknown>() } }))

import { bookingApi } from '@/api/booking'
import { slotsApi } from '@/api/slots'
import ManageView from '@/views/booking/ManageView.vue'

function booking(status: string, extra: Record<string, unknown> = {}) {
  return {
    ...extra,
    token: 'tok',
    status,
    customer_name: 'Ana',
    start_time: '08:00:00',
    end_time: '08:40:00',
    service: { id: 1, name: 'Haircut', duration_minutes: 40, price: null },
    slot: { date: '2030-01-10', worker_id: 7, worker: { id: 7, name: 'Marko' } },
  }
}

async function mountManage(status: string, extra: Record<string, unknown> = {}) {
  vi.mocked(bookingApi.getByToken).mockResolvedValue({ data: booking(status, extra) } as never)
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

  it('lets the customer move the booking to an offered time', async () => {
    vi.mocked(slotsApi.getTimes).mockResolvedValue({
      data: [
        { slot_id: 31, worker_id: 7, date: '2030-01-12', start_time: '10:00:00', end_time: '10:40:00' },
        { slot_id: 31, worker_id: 7, date: '2030-01-12', start_time: '11:00:00', end_time: '11:40:00' },
      ],
    } as never)
    vi.mocked(bookingApi.reschedule).mockResolvedValue({
      data: { ...booking('pending', { can_reschedule: true }), start_time: '11:00:00', end_time: '11:40:00' },
    } as never)
    const wrapper = await mountManage('confirmed', { can_reschedule: true, reschedule_cutoff_hours: 6 })

    await wrapper.findAll('button').find((b) => b.text() === 'Change time')!.trigger('click')
    await flushPromises()
    expect(slotsApi.getTimes).toHaveBeenCalledWith({ service_id: 1, worker_id: 7 })

    await wrapper.findAll('button').find((b) => b.text() === '11:00')!.trigger('click')
    await wrapper.findAll('button').find((b) => b.text() === 'Confirm new time')!.trigger('click')
    await flushPromises()

    expect(bookingApi.reschedule).toHaveBeenCalledWith('tok', { slot_id: 31, start_time: '11:00' })
    expect(wrapper.text()).toContain('waiting for the business to confirm')
    expect(wrapper.text()).toContain('11:00 — 11:40')
  })

  it('explains the cutoff when it is too late to move the booking', async () => {
    const wrapper = await mountManage('confirmed', { can_reschedule: false, reschedule_cutoff_hours: 6 })

    expect(wrapper.text()).toContain('up to 6 h before it starts')
    expect(wrapper.findAll('button').some((b) => b.text() === 'Change time')).toBe(false)
  })
})
