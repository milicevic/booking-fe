import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { i18n } from '@/i18n'
import { createTestRouter, localDate } from '../helpers'

vi.mock('@/api/slots', () => ({ slotsApi: { getAvailable: vi.fn(), getTimes: vi.fn() } }))
vi.mock('@/api/booking', () => ({ bookingApi: { create: vi.fn(), getByToken: vi.fn() } }))

import { slotsApi } from '@/api/slots'
import { bookingApi } from '@/api/booking'
import type { BookableTime, Slot } from '@/api/booking'
import BookingView from '@/views/booking/BookingView.vue'
import { useToast } from '@/composables/useToast'

const getAvailable = slotsApi.getAvailable as ReturnType<typeof vi.fn>
const getTimes = slotsApi.getTimes as ReturnType<typeof vi.fn>
const createBooking = bookingApi.create as ReturnType<typeof vi.fn>

const today = localDate()
const haircut = { id: 10, name: 'Haircut', duration_minutes: 30, price: '1500' }

function slot(id: number, workerId: number, workerName: string, start: string, services = [haircut]): Slot {
  return {
    id,
    worker_id: workerId,
    date: today,
    start_time: `${start}:00`,
    end_time: `${start.slice(0, 2)}:30:00`,
    is_available: true,
    worker: { id: workerId, name: workerName, services },
  }
}

const slots = [slot(1, 1, 'Marko', '11'), slot(2, 1, 'Marko', '09'), slot(3, 2, 'Jelena', '10', [])]

function time(slotId: number, start: string, end: string): BookableTime {
  return { slot_id: slotId, date: today, start_time: `${start}:00`, end_time: `${end}:00` }
}

// Vremena računa backend; ovde ih vraćamo po radniku
const timesByWorker: Record<number, BookableTime[]> = {
  1: [time(1, '11:00', '11:30'), time(2, '09:00', '09:30')],
  2: [time(3, '10:00', '10:30')],
}

async function mountView() {
  const router = createTestRouter()
  router.push('/')
  await router.isReady()
  const wrapper = mount(BookingView, { global: { plugins: [i18n, router] } })
  await flushPromises()
  return { wrapper, router }
}

function button(wrapper: VueWrapper, text: string) {
  const btn = wrapper.findAll('button').find((b) => b.text().includes(text) && !b.attributes('disabled'))
  if (!btn) throw new Error(`Button "${text}" not found`)
  return btn
}

async function goToForm(wrapper: VueWrapper) {
  await button(wrapper, 'Marko').trigger('click')
  await button(wrapper, 'Haircut').trigger('click')
  await flushPromises()
  await button(wrapper, String(new Date().getDate())).trigger('click')
  await button(wrapper, '09:00').trigger('click')
}

describe('BookingView (end-user booking flow)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.removeItem('my-bookings')
    setActivePinia(createPinia())
    getAvailable.mockResolvedValue({ data: slots })
    getTimes.mockImplementation(async ({ worker_id }: { worker_id: number }) => ({ data: timesByWorker[worker_id] ?? [] }))
    const toast = useToast()
    toast.toasts.value.forEach((t) => toast.dismiss(t.id))
  })

  it('shows an empty state when no slots exist', async () => {
    getAvailable.mockResolvedValue({ data: [] })
    const { wrapper } = await mountView()
    expect(wrapper.text()).toContain('No available slots at the moment')
  })

  it('shows an error when slots fail to load', async () => {
    getAvailable.mockRejectedValue(new Error('network'))
    const { wrapper } = await mountView()
    expect(wrapper.text()).toContain('Error loading slots')
  })

  it('lists unique workers derived from slots', async () => {
    const { wrapper } = await mountView()
    expect(wrapper.text()).toContain('Select a worker to see available slots')
    expect(wrapper.findAll('button').filter((b) => b.text().includes('Marko'))).toHaveLength(1)
    expect(wrapper.text()).toContain('Jelena')
  })

  it('requires picking a service when the worker offers services', async () => {
    const { wrapper } = await mountView()
    await button(wrapper, 'Marko').trigger('click')

    expect(wrapper.text()).toContain('Select a service')
    expect(wrapper.text()).not.toContain('Select a date on the calendar')

    await button(wrapper, 'Haircut').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Select a date on the calendar')
    expect(getTimes).toHaveBeenCalledWith({ worker_id: 1, service_id: 10 })
  })

  it('goes straight to the calendar when the worker has no services', async () => {
    const { wrapper } = await mountView()
    await button(wrapper, 'Jelena').trigger('click')
    await flushPromises()
    expect(getTimes).toHaveBeenCalledWith({ worker_id: 2 })
    expect(wrapper.text()).not.toContain('Select a service')
    expect(wrapper.text()).toContain('Select a date on the calendar')
  })

  it('shows the selected worker slots for a date sorted by time', async () => {
    const { wrapper } = await mountView()
    await button(wrapper, 'Marko').trigger('click')
    await button(wrapper, 'Haircut').trigger('click')
    await flushPromises()
    await button(wrapper, String(new Date().getDate())).trigger('click')

    const times = wrapper.findAll('button').map((b) => b.text()).filter((t) => /^\d\d:\d\d —/.test(t))
    expect(times).toEqual(['09:00 — 09:30', '11:00 — 11:30'])
  })

  it('offers the gap after a longer booking as a start time', async () => {
    timesByWorker[1] = [time(2, '09:40', '10:00')]
    const { wrapper } = await mountView()
    await button(wrapper, 'Marko').trigger('click')
    await button(wrapper, 'Haircut').trigger('click')
    await flushPromises()
    await button(wrapper, String(new Date().getDate())).trigger('click')

    expect(wrapper.text()).toContain('09:40 — 10:00')
    timesByWorker[1] = [time(1, '11:00', '11:30'), time(2, '09:00', '09:30')]
  })

  it('validates that a name is entered', async () => {
    const { wrapper } = await mountView()
    await goToForm(wrapper)
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Enter your name')
    expect(createBooking).not.toHaveBeenCalled()
  })

  it('validates that email or phone is entered', async () => {
    const { wrapper } = await mountView()
    await goToForm(wrapper)
    await wrapper.find('input[type="text"]').setValue('Ana')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Enter email or phone')
    expect(createBooking).not.toHaveBeenCalled()
  })

  it('creates a booking with phone only and redirects to confirmation', async () => {
    createBooking.mockResolvedValue({ data: { token: 'tok-123' } })
    const { wrapper, router } = await mountView()
    await goToForm(wrapper)

    await wrapper.find('input[type="text"]').setValue('Ana')
    await wrapper.find('input[type="tel"]').setValue('+381601234567')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(createBooking).toHaveBeenCalledWith({
      slot_id: 2,
      start_time: '09:00',
      customer_name: 'Ana',
      customer_email: '',
      customer_phone: '+381601234567',
      note: '',
      service_id: 10,
    })
    expect(router.currentRoute.value.name).toBe('confirmation')
    expect(router.currentRoute.value.query.token).toBe('tok-123')
    expect(JSON.parse(localStorage.getItem('my-bookings') ?? '[]')).toEqual(['tok-123'])
  })

  it('reloads slots when the chosen slot was taken (409)', async () => {
    createBooking.mockRejectedValue({ response: { status: 409 } })
    const { wrapper, router } = await mountView()
    await goToForm(wrapper)

    await wrapper.find('input[type="text"]').setValue('Ana')
    await wrapper.find('input[type="email"]').setValue('ana@example.com')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(getTimes).toHaveBeenCalledTimes(2)
    expect(wrapper.find('form').exists()).toBe(false)
    expect(router.currentRoute.value.name).toBe('booking')
  })

  it('shows the slot-taken message as an error notification after a 409', async () => {
    createBooking.mockRejectedValue({ response: { status: 409 } })
    const { wrapper } = await mountView()
    await goToForm(wrapper)

    await wrapper.find('input[type="text"]').setValue('Ana')
    await wrapper.find('input[type="email"]').setValue('ana@example.com')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(useToast().toasts.value).toEqual([
      expect.objectContaining({ type: 'error', message: 'This slot just became unavailable, please choose another' }),
    ])
  })

  it('shows a generic error on other failures', async () => {
    createBooking.mockRejectedValue({ response: { status: 500 } })
    const { wrapper } = await mountView()
    await goToForm(wrapper)

    await wrapper.find('input[type="text"]').setValue('Ana')
    await wrapper.find('input[type="email"]').setValue('ana@example.com')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Booking error')
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('shows the customer their upcoming bookings when they come back', async () => {
    localStorage.setItem('my-bookings', JSON.stringify(['tok-active', 'tok-cancelled']))
    const tomorrow = localDate(new Date(Date.now() + 86400000))
    const base = { slot: { ...slot(2, 1, 'Marko', '09'), date: tomorrow }, start_time: '09:00:00', end_time: '09:40:00', service: haircut }
    vi.mocked(bookingApi.getByToken).mockImplementation(async (token: string) => ({
      data: { ...base, token, status: token === 'tok-active' ? 'confirmed' : 'cancelled' },
    }) as never)

    const { wrapper } = await mountView()

    const section = wrapper.find('[data-testid="my-bookings"]')
    expect(section.text()).toContain('Your bookings')
    expect(section.text()).toContain('Marko')
    expect(section.text()).toContain('09:00 — 09:40')
    expect(section.text()).toContain('Confirmed')
    expect(section.findAll('a')).toHaveLength(1)
    expect(JSON.parse(localStorage.getItem('my-bookings') ?? '[]')).toEqual(['tok-active'])
  })

  it('hides the section when there are no remembered bookings', async () => {
    const { wrapper } = await mountView()
    expect(wrapper.find('[data-testid="my-bookings"]').exists()).toBe(false)
  })
})
