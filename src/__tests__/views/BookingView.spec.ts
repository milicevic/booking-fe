import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { i18n } from '@/i18n'
import { createTestRouter, localDate } from '../helpers'

vi.mock('@/api/slots', () => ({ slotsApi: { getAvailable: vi.fn<(...args: unknown[]) => unknown>(), getTimes: vi.fn<(...args: unknown[]) => unknown>() } }))
vi.mock('@/api/booking', () => ({ bookingApi: { create: vi.fn<(...args: unknown[]) => unknown>(), getByToken: vi.fn<(...args: unknown[]) => unknown>() } }))

import { slotsApi } from '@/api/slots'
import { bookingApi } from '@/api/booking'
import type { BookableTime, Slot } from '@/api/booking'
import BookingView from '@/views/booking/BookingView.vue'
import { useToast } from '@/composables/useToast'
import { useTenantStore } from '@/stores/tenant'
import type { CustomerContact, TenantConfig } from '@/api/tenant'

const getAvailable = slotsApi.getAvailable as ReturnType<typeof vi.fn>
const getTimes = slotsApi.getTimes as ReturnType<typeof vi.fn>
const createBooking = bookingApi.create as ReturnType<typeof vi.fn>

const today = localDate()
const haircut = { id: 10, name: 'Haircut', duration_minutes: 30, price: '1500' }
const coloring = { id: 11, name: 'Coloring', duration_minutes: 60, price: '4000' }

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

// Marko radi šišanje, Jelena šišanje i farbanje
const slots = [slot(1, 1, 'Marko', '11'), slot(2, 1, 'Marko', '09'), slot(3, 2, 'Jelena', '10', [haircut, coloring])]

function time(slotId: number, workerId: number, start: string, end: string): BookableTime {
  return { slot_id: slotId, worker_id: workerId, date: today, start_time: `${start}:00`, end_time: `${end}:00` }
}

// Vremena računa backend; ovde ih vraćamo po radniku
const timesByWorker: Record<number, BookableTime[]> = {
  1: [time(1, 1, '11:00', '11:30'), time(2, 1, '09:00', '09:30')],
  2: [time(3, 2, '10:00', '10:30')],
}

// Bez radnika backend vraća vremena svih radnika koji rade uslugu, poređana po vremenu pa radniku
function mockTimes({ service_id, worker_id }: { service_id: number; worker_id?: number }) {
  if (worker_id) return { data: timesByWorker[worker_id] ?? [] }
  const workerIds = [...new Set(slots.filter((s) => s.worker.services?.some((svc) => svc.id === service_id)).map((s) => s.worker.id))]
  const data = workerIds
    .flatMap((id) => timesByWorker[id] ?? [])
    .sort((a, b) => a.start_time.localeCompare(b.start_time) || a.worker_id - b.worker_id)
  return { data }
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

/** Calendar day buttons must be matched exactly — "5" would otherwise match a price like "1500". */
function dayButton(wrapper: VueWrapper, day = new Date().getDate()) {
  const btn = wrapper.findAll('button').find((b) => b.text().trim() === String(day) && !b.attributes('disabled'))
  if (!btn) throw new Error(`Day button "${day}" not found`)
  return btn
}

function serviceButton(wrapper: VueWrapper, name: string) {
  const btn = wrapper.findAll('[data-testid="service-option"]').find((b) => b.text().includes(name))
  if (!btn) throw new Error(`Service "${name}" not found`)
  return btn
}

function workerButton(wrapper: VueWrapper, text: string) {
  const btn = wrapper.find('[data-testid="worker-list"]').findAll('button').find((b) => b.text().includes(text))
  if (!btn) throw new Error(`Worker "${text}" not found`)
  return btn
}

function shownTimes(wrapper: VueWrapper) {
  return wrapper.findAll('[data-testid="time-option"]').map((b) => b.text().match(/^\d\d:\d\d — \d\d:\d\d/)?.[0])
}

// U 09:00 je slobodan samo Marko, pa se posle izbora vremena odmah prelazi na formu
async function goToForm(wrapper: VueWrapper) {
  await serviceButton(wrapper, 'Haircut').trigger('click')
  await flushPromises()
  await dayButton(wrapper).trigger('click')
  await button(wrapper, '09:00').trigger('click')
}

describe('BookingView (end-user booking flow)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.removeItem('my-bookings')
    setActivePinia(createPinia())
    getAvailable.mockResolvedValue({ data: slots })
    getTimes.mockImplementation(async (params: { service_id: number; worker_id?: number }) => mockTimes(params))
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

  it('lists the price list and all workers before anything is chosen', async () => {
    const { wrapper } = await mountView()

    expect(wrapper.text()).toContain('Choose a service to see available slots')
    expect(serviceButton(wrapper, 'Haircut').text()).toContain('30 min · Marko, Jelena')
    expect(serviceButton(wrapper, 'Coloring').text()).toContain('60 min · Jelena')
    expect(workerButton(wrapper, 'Marko').exists()).toBe(true)
    expect(workerButton(wrapper, 'Jelena').exists()).toBe(true)
    expect(getTimes).not.toHaveBeenCalled()
  })

  it('shows the times of every worker who does the chosen service', async () => {
    const { wrapper } = await mountView()
    await serviceButton(wrapper, 'Haircut').trigger('click')
    await flushPromises()

    expect(getTimes).toHaveBeenCalledWith({ service_id: 10 })
    await dayButton(wrapper).trigger('click')
    expect(shownTimes(wrapper)).toEqual(['09:00 — 09:30', '10:00 — 10:30', '11:00 — 11:30'])
  })

  it('narrows the times to an optionally chosen worker, and back when deselected', async () => {
    const { wrapper } = await mountView()
    await serviceButton(wrapper, 'Haircut').trigger('click')
    await workerButton(wrapper, 'Jelena').trigger('click')
    await flushPromises()

    expect(getTimes).toHaveBeenLastCalledWith({ service_id: 10, worker_id: 2 })
    await dayButton(wrapper).trigger('click')
    expect(shownTimes(wrapper)).toEqual(['10:00 — 10:30'])

    await workerButton(wrapper, 'Jelena').trigger('click')
    await flushPromises()
    expect(getTimes).toHaveBeenLastCalledWith({ service_id: 10 })
    expect(shownTimes(wrapper)).toHaveLength(3)
  })

  it('asks which free worker to book when several are free at the chosen time', async () => {
    timesByWorker[2] = [time(3, 2, '09:00', '09:30')]
    createBooking.mockResolvedValue({ data: { token: 'tok-1' } })
    const { wrapper } = await mountView()
    await serviceButton(wrapper, 'Haircut').trigger('click')
    await flushPromises()
    await dayButton(wrapper).trigger('click')

    expect(wrapper.find('[data-testid="time-option"]').text()).toContain('2 workers free')
    await button(wrapper, '09:00').trigger('click')

    const choice = wrapper.find('[data-testid="time-workers"]')
    expect(choice.text()).toContain('Marko')
    expect(choice.text()).toContain('Jelena')
    expect(wrapper.find('form').exists()).toBe(false)

    await choice.findAll('button').find((b) => b.text().includes('Jelena'))!.trigger('click')
    await wrapper.find('input[type="text"]').setValue('Ana')
    await wrapper.find('input[type="tel"]').setValue('+381601234567')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(createBooking).toHaveBeenCalledWith(expect.objectContaining({ slot_id: 3, start_time: '09:00', service_id: 10 }))
    timesByWorker[2] = [time(3, 2, '10:00', '10:30')]
  })

  it('goes straight to the form when only one worker is free at the chosen time', async () => {
    const { wrapper } = await mountView()
    await serviceButton(wrapper, 'Haircut').trigger('click')
    await flushPromises()
    await dayButton(wrapper).trigger('click')
    await button(wrapper, '10:00').trigger('click')

    expect(wrapper.find('[data-testid="time-workers"]').exists()).toBe(false)
    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.text()).toContain('Jelena')
  })

  it('disables what does not match the other choice', async () => {
    const { wrapper } = await mountView()

    await workerButton(wrapper, 'Marko').trigger('click')
    expect(serviceButton(wrapper, 'Coloring').attributes('disabled')).toBeDefined()
    expect(serviceButton(wrapper, 'Haircut').attributes('disabled')).toBeUndefined()

    await workerButton(wrapper, 'Marko').trigger('click')
    await serviceButton(wrapper, 'Coloring').trigger('click')
    expect(workerButton(wrapper, 'Marko').attributes('disabled')).toBeDefined()
    expect(workerButton(wrapper, 'Jelena').attributes('disabled')).toBeUndefined()
  })

  it('asks for the service when only a worker is chosen', async () => {
    const { wrapper } = await mountView()
    await workerButton(wrapper, 'Marko').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="missing-choice"]').text()).toContain('Choose the service you want')
    expect(getTimes).not.toHaveBeenCalled()

    await serviceButton(wrapper, 'Haircut').trigger('click')
    await flushPromises()
    expect(getTimes).toHaveBeenLastCalledWith({ service_id: 10, worker_id: 1 })
  })

  it('shows worker photos and descriptions', async () => {
    getAvailable.mockResolvedValue({
      data: [{ ...slot(1, 1, 'Marko', '11'), worker: { id: 1, name: 'Marko', photo_url: '/storage/marko.webp', bio: 'Majstor za fade', services: [haircut] } }],
    })
    const { wrapper } = await mountView()

    const marko = workerButton(wrapper, 'Marko')
    expect(marko.find('img').attributes('src')).toBe('/storage/marko.webp')
    expect(marko.text()).toContain('Majstor za fade')
  })

  it('explains that booking is not available while the business has no services', async () => {
    getAvailable.mockResolvedValue({ data: [slot(1, 1, 'Marko', '11', []), slot(3, 2, 'Jelena', '10', [])] })
    const { wrapper } = await mountView()

    expect(wrapper.find('[data-testid="no-services"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="worker-option"]').exists()).toBe(false)
  })

  it('offers only workers who do at least one service', async () => {
    getAvailable.mockResolvedValue({ data: [...slots, slot(4, 3, 'Petar', '12', [])] })
    const { wrapper } = await mountView()

    expect(wrapper.find('[data-testid="worker-list"]').text()).not.toContain('Petar')
  })

  it('picks the only service automatically', async () => {
    getAvailable.mockResolvedValue({ data: [slot(1, 1, 'Marko', '11'), slot(3, 2, 'Jelena', '10')] })
    const { wrapper } = await mountView()

    expect(serviceButton(wrapper, 'Haircut').attributes('aria-pressed')).toBe('true')
    await flushPromises()
    expect(getTimes).toHaveBeenCalledWith({ service_id: 10 })

    // Jedina usluga ostaje izabrana i posle klika
    await serviceButton(wrapper, 'Haircut').trigger('click')
    expect(serviceButton(wrapper, 'Haircut').attributes('aria-pressed')).toBe('true')
  })

  it('picks the only worker automatically', async () => {
    getAvailable.mockResolvedValue({ data: [slot(1, 1, 'Marko', '11', [haircut, coloring]), slot(2, 1, 'Marko', '09', [haircut, coloring])] })
    const { wrapper } = await mountView()

    expect(workerButton(wrapper, 'Marko').attributes('aria-pressed')).toBe('true')
    await workerButton(wrapper, 'Marko').trigger('click')
    expect(workerButton(wrapper, 'Marko').attributes('aria-pressed')).toBe('true')

    await serviceButton(wrapper, 'Coloring').trigger('click')
    await flushPromises()
    expect(getTimes).toHaveBeenCalledWith({ service_id: 11, worker_id: 1 })
  })

  it('goes straight to the calendar when there is one service and one worker', async () => {
    getAvailable.mockResolvedValue({ data: [slot(1, 1, 'Marko', '11'), slot(2, 1, 'Marko', '09')] })
    const { wrapper } = await mountView()
    await flushPromises()

    expect(getTimes).toHaveBeenCalledWith({ service_id: 10, worker_id: 1 })
    expect(wrapper.find('[data-testid="missing-choice"]').exists()).toBe(false)
  })

  it('offers the gap after a longer booking as a start time', async () => {
    timesByWorker[1] = [time(2, 1, '09:40', '10:00')]
    const { wrapper } = await mountView()
    await serviceButton(wrapper, 'Haircut').trigger('click')
    await workerButton(wrapper, 'Marko').trigger('click')
    await flushPromises()
    await dayButton(wrapper).trigger('click')

    expect(wrapper.text()).toContain('09:40 — 10:00')
    timesByWorker[1] = [time(1, 1, '11:00', '11:30'), time(2, 1, '09:00', '09:30')]
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

  function requireContact(rule: CustomerContact) {
    useTenantStore().config = { app_name: 'Salon', customer_contact: rule } as TenantConfig
  }

  it('requires the phone when the business asks for it', async () => {
    requireContact('phone')
    const { wrapper } = await mountView()
    await goToForm(wrapper)

    expect(wrapper.find('label[for="booking-phone"]').text()).toContain('*')
    expect(wrapper.find('label[for="booking-email"]').text()).toContain('optional')

    await wrapper.find('input[type="text"]').setValue('Ana')
    await wrapper.find('input[type="email"]').setValue('ana@example.com')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Enter your phone number')
    expect(createBooking).not.toHaveBeenCalled()
  })

  it('requires both email and phone when the business asks for both', async () => {
    requireContact('both')
    const { wrapper } = await mountView()
    await goToForm(wrapper)

    await wrapper.find('input[type="text"]').setValue('Ana')
    await wrapper.find('input[type="tel"]').setValue('+381601234567')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Enter both email and phone')
    expect(createBooking).not.toHaveBeenCalled()
  })

  it('requires the email when the business asks for it', async () => {
    requireContact('email')
    createBooking.mockResolvedValue({ data: { token: 'tok-e' } })
    const { wrapper } = await mountView()
    await goToForm(wrapper)

    await wrapper.find('input[type="text"]').setValue('Ana')
    await wrapper.find('input[type="tel"]').setValue('+381601234567')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).toContain('Enter your email')

    await wrapper.find('input[type="email"]').setValue('ana@example.com')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(createBooking).toHaveBeenCalledOnce()
  })

  it('asks to confirm the captcha when bot protection is on', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site-key')
    window.turnstile = { render: vi.fn(() => 'w'), reset: vi.fn(), remove: vi.fn() }
    const { wrapper } = await mountView()
    await goToForm(wrapper)

    await wrapper.find('input[type="text"]').setValue('Ana')
    await wrapper.find('input[type="tel"]').setValue('+381601234567')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Please confirm that you are not a robot')
    expect(createBooking).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
    delete window.turnstile
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
