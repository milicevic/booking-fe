import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AxiosError } from 'axios'

vi.mock('@/api/booking', () => ({ bookingApi: { getByToken: vi.fn<(...args: unknown[]) => unknown>() } }))

import { bookingApi } from '@/api/booking'
import { loadMyBookings, rememberBooking } from '@/lib/myBookings'
import { localDate } from '../helpers'

const getByToken = vi.mocked(bookingApi.getByToken)
const tomorrow = localDate(new Date(Date.now() + 86400000))

function booking(token: string, status = 'confirmed', date = tomorrow) {
  return { token, status, start_time: '09:00:00', end_time: '09:30:00', slot: { date } }
}

function stored() {
  return JSON.parse(localStorage.getItem('my-bookings') ?? '[]')
}

describe('my bookings', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('keeps upcoming bookings and forgets cancelled and past ones', async () => {
    ;['active', 'cancelled', 'past'].forEach(rememberBooking)
    getByToken.mockImplementation(async (token: string) => ({
      data: token === 'active' ? booking(token) : token === 'cancelled' ? booking(token, 'cancelled') : booking(token, 'confirmed', '2020-01-01'),
    }) as never)

    const bookings = await loadMyBookings()

    expect(bookings.map((b) => b.token)).toEqual(['active'])
    expect(stored()).toEqual(['active'])
  })

  it('forgets bookings the server no longer knows', async () => {
    rememberBooking('gone')
    getByToken.mockRejectedValue(new AxiosError('404', undefined, undefined, undefined, { status: 404 } as never))

    expect(await loadMyBookings()).toEqual([])
    expect(stored()).toEqual([])
  })

  it('keeps bookings when the server or network fails', async () => {
    rememberBooking('later')
    getByToken.mockRejectedValue(new AxiosError('Network Error'))

    expect(await loadMyBookings()).toEqual([])
    expect(stored()).toEqual(['later'])
  })
})
