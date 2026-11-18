import { describe, it, expect } from 'vitest'
import { bookingChange, bookingChanges } from '@/lib/bookingChanges'
import type { Booking } from '@/api/booking'

function booking(overrides: Partial<Booking> & { date?: string } = {}): Booking {
  const { date = '2026-12-02', ...rest } = overrides
  return {
    id: 1,
    slot_id: 1,
    token: 'tok',
    status: 'pending',
    customer_name: 'Ana',
    customer_email: null,
    customer_phone: null,
    note: null,
    start_time: '10:00:00',
    end_time: '10:30:00',
    slot: { id: 1, worker_id: 1, date, start_time: '09:00:00', end_time: '12:00:00', is_available: true, worker: { id: 1, name: 'Marko' } },
    ...rest,
  }
}

describe('bookingChange', () => {
  it('reports a new status', () => {
    expect(bookingChange(booking(), booking({ status: 'confirmed' }))).toEqual({
      key: 'live.status.confirmed',
      params: { date: '2026-12-02', time: '10:00' },
    })
  })

  it('reports a moved booking', () => {
    expect(bookingChange(booking(), booking({ start_time: '11:00:00', date: '2026-12-03' }))).toEqual({
      key: 'live.moved',
      params: { date: '2026-12-03', time: '11:00' },
    })
  })

  it('ignores an unchanged booking', () => {
    expect(bookingChange(booking(), booking())).toBeNull()
  })

  it('compares lists by token and ignores new bookings', () => {
    const before = [booking({ token: 'a' }), booking({ token: 'b' })]
    const after = [booking({ token: 'a', status: 'rejected' }), booking({ token: 'b' }), booking({ token: 'c' })]
    expect(bookingChanges(before, after).map((c) => c.key)).toEqual(['live.status.rejected'])
  })
})
