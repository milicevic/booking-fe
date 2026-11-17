import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { i18n } from '@/i18n'
import { createTestRouter, localDate } from '../helpers'

vi.mock('@/api/booking', () => ({
  bookingApi: { getByToken: vi.fn<(...args: unknown[]) => unknown>(), cancel: vi.fn<(...args: unknown[]) => unknown>() },
}))

import { bookingApi } from '@/api/booking'
import MyBookingsView from '@/views/booking/MyBookingsView.vue'

const tomorrow = localDate(new Date(Date.now() + 86400000))
const haircut = { id: 10, name: 'Haircut', duration_minutes: 30, price: '1500' }

function booking(token: string, status: string) {
  return {
    token, status, start_time: '09:00:00', end_time: '09:30:00', service: haircut,
    slot: { id: 1, worker_id: 1, date: tomorrow, start_time: '09:00:00', end_time: '09:30:00', is_available: false, worker: { id: 1, name: 'Marko' } },
  }
}

async function mountView() {
  const router = createTestRouter()
  router.push('/my-bookings')
  await router.isReady()
  const wrapper = mount(MyBookingsView, { global: { plugins: [i18n, router] } })
  await flushPromises()
  return wrapper
}

describe('MyBookingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    localStorage.setItem('my-bookings', JSON.stringify(['tok-active', 'tok-cancelled']))
    vi.mocked(bookingApi.getByToken).mockImplementation(async (token: string) => ({
      data: booking(token, token === 'tok-active' ? 'confirmed' : 'cancelled'),
    }) as never)
  })

  it('shows upcoming bookings and the cancelled one in history', async () => {
    const wrapper = await mountView()
    const cards = wrapper.findAll('[data-testid="my-booking"]')
    expect(cards).toHaveLength(1)
    expect(cards[0]!.text()).toContain('Haircut')
    expect(cards[0]!.text()).toContain('Marko')
    expect(cards[0]!.text()).toContain('Confirmed')
    expect(wrapper.text()).toContain('Past and cancelled')
  })

  it('asks before cancelling and cancels by token', async () => {
    vi.mocked(bookingApi.cancel).mockResolvedValue({} as never)
    const wrapper = await mountView()

    await wrapper.findAll('button').find((b) => b.text() === 'Cancel booking')!.trigger('click')
    expect(bookingApi.cancel).not.toHaveBeenCalled()

    await wrapper.findAll('button').find((b) => b.text() === 'Yes, cancel')!.trigger('click')
    await flushPromises()
    expect(bookingApi.cancel).toHaveBeenCalledWith('tok-active')
  })

  it('shows an empty state with a link to book', async () => {
    localStorage.removeItem('my-bookings')
    const wrapper = await mountView()
    expect(wrapper.text()).toContain('No upcoming bookings')
  })
})
