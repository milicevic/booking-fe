import { describe, it, expect } from 'vitest'
import type { Booking, Slot } from '@/api/booking'
import { addDays, buildWeek, startOfWeek, toISODate } from '@/lib/weekCalendar'

// 2026-11-11 je sreda
const monday = new Date(2026, 10, 9)

function slot(id: number, workerId: number, date: string, start: string, end: string, available = true): Slot {
  return { id, worker_id: workerId, date, start_time: `${start}:00`, end_time: `${end}:00`, is_available: available, worker: { id: workerId, name: 'X' } }
}

function booking(id: number, s: Slot, start: string, end: string, status: Booking['status']): Booking {
  return {
    id, slot_id: s.id, customer_name: 'Jelena', customer_email: null, customer_phone: null, token: `t${id}`,
    status, note: null, start_time: `${start}:00`, end_time: `${end}:00`, slot: s,
  }
}

describe('week calendar', () => {
  it('finds monday of any day in the week, also for sunday', () => {
    expect(toISODate(startOfWeek(new Date(2026, 10, 11)))).toBe('2026-11-09')
    expect(toISODate(startOfWeek(new Date(2026, 10, 15)))).toBe('2026-11-09')
    expect(toISODate(addDays(monday, 6))).toBe('2026-11-15')
  })

  it('returns seven days and sorts blocks by time', () => {
    const week = buildWeek(monday, [slot(2, 1, '2026-11-09', '10:00', '10:30'), slot(1, 1, '2026-11-09', '09:00', '09:30')], [], null)
    expect(week).toHaveLength(7)
    expect(week[0]!.blocks.map((b) => b.start)).toEqual(['09:00', '10:00'])
    expect(week[1]!.blocks).toEqual([])
  })

  it('marks free and taken slots', () => {
    const week = buildWeek(monday, [slot(1, 1, '2026-11-09', '09:00', '09:30'), slot(2, 1, '2026-11-09', '09:30', '10:00', false)], [], null)
    expect(week[0]!.blocks.map((b) => b.kind)).toEqual(['free', 'taken'])
  })

  it('shows a booking as one block with its own time and hides covered slots', () => {
    const first = slot(1, 1, '2026-11-09', '09:00', '09:30', false)
    const second = slot(2, 1, '2026-11-09', '09:30', '10:00', false)
    const third = slot(3, 1, '2026-11-09', '10:00', '10:30')
    const week = buildWeek(monday, [first, second, third], [booking(1, first, '09:00', '10:00', 'confirmed')], null)
    expect(week[0]!.blocks.map((b) => [b.kind, b.start, b.end])).toEqual([
      ['confirmed', '09:00', '10:00'],
      ['free', '10:00', '10:30'],
    ])
  })

  it('ignores cancelled and rejected bookings', () => {
    const s = slot(1, 1, '2026-11-09', '09:00', '09:30')
    const week = buildWeek(monday, [s], [booking(1, s, '09:00', '09:30', 'cancelled')], null)
    expect(week[0]!.blocks[0]!.kind).toBe('free')
  })

  it('filters by worker', () => {
    const slots = [slot(1, 1, '2026-11-09', '09:00', '09:30'), slot(2, 2, '2026-11-09', '09:00', '09:30')]
    expect(buildWeek(monday, slots, [], 2)[0]!.blocks.map((b) => b.slot.id)).toEqual([2])
  })
})
