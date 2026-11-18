import { describe, it, expect } from 'vitest'
import type { Booking, Slot } from '@/api/booking'
import { addDays, buildWeekGrid, fromMinutes, startOfWeek, toISODate, toMinutes } from '@/lib/weekCalendar'

// 2026-11-09 je ponedeljak
const monday = new Date(2026, 10, 9)

function slot(id: number, workerId: number, date: string, start: string, end: string, extra: Partial<Slot> = {}): Slot {
  return {
    id, worker_id: workerId, date, start_time: `${start}:00`, end_time: `${end}:00`, is_available: true,
    worker: { id: workerId, name: 'X' }, ...extra,
  }
}

function booking(id: number, s: Slot, start: string, end: string, status: Booking['status']): Booking {
  return {
    id, slot_id: s.id, customer_name: 'Jelena Marković', customer_email: null, customer_phone: null, token: `t${id}`,
    status, note: null, start_time: `${start}:00`, end_time: `${end}:00`, slot: s,
  }
}

describe('week calendar grid', () => {
  it('finds monday of any day in the week, also for sunday', () => {
    expect(toISODate(startOfWeek(new Date(2026, 10, 11)))).toBe('2026-11-09')
    expect(toISODate(startOfWeek(new Date(2026, 10, 15)))).toBe('2026-11-09')
    expect(toISODate(addDays(monday, 6))).toBe('2026-11-15')
  })

  it('converts between HH:MM and minutes', () => {
    expect(toMinutes('09:30:00')).toBe(570)
    expect(fromMinutes(570)).toBe('09:30')
  })

  it('builds rows from the earliest start to the latest end, stepped by the shortest slot', () => {
    const slots = [slot(1, 1, '2026-11-09', '09:00', '09:30'), slot(2, 1, '2026-11-10', '10:00', '10:30')]
    const grid = buildWeekGrid(monday, slots, [], 1)
    expect(grid.step).toBe(30)
    expect(grid.times).toEqual(['09:00', '09:30', '10:00'])
    expect(grid.days).toHaveLength(7)
    expect(grid.days[0]!.cells.map((c) => c.kind)).toEqual(['free', 'off', 'off'])
    expect(grid.days[1]!.cells.map((c) => c.kind)).toEqual(['off', 'off', 'free'])
  })

  it('shows only the chosen worker', () => {
    const slots = [slot(1, 1, '2026-11-09', '09:00', '09:30'), slot(2, 2, '2026-11-09', '09:00', '09:30')]
    const grid = buildWeekGrid(monday, slots, [], 2)
    expect(grid.days[0]!.cells[0]!.slot?.id).toBe(2)
  })

  it('marks blocked and taken slots', () => {
    const slots = [
      slot(1, 1, '2026-11-09', '09:00', '09:30', { is_blocked: true }),
      slot(2, 1, '2026-11-09', '09:30', '10:00', { is_available: false }),
    ]
    expect(buildWeekGrid(monday, slots, [], 1).days[0]!.cells.map((c) => c.kind)).toEqual(['blocked', 'taken'])
  })

  it('spreads a long booking over the rows it covers, with one key', () => {
    const s1 = slot(1, 1, '2026-11-09', '09:00', '09:30')
    const s2 = slot(2, 1, '2026-11-09', '09:30', '10:00')
    const s3 = slot(3, 1, '2026-11-09', '10:00', '10:30')
    const grid = buildWeekGrid(monday, [s1, s2, s3], [booking(7, s1, '09:00', '10:00', 'pending')], 1)
    const cells = grid.days[0]!.cells
    expect(cells.map((c) => c.kind)).toEqual(['pending', 'pending', 'free'])
    expect(cells.map((c) => c.key)).toEqual(['b7', 'b7', 's3'])
    expect(cells.map((c) => c.first)).toEqual([true, false, true])
  })

  it('ignores cancelled and rejected bookings', () => {
    const s1 = slot(1, 1, '2026-11-09', '09:00', '09:30')
    const grid = buildWeekGrid(monday, [s1], [booking(1, s1, '09:00', '09:30', 'cancelled')], 1)
    expect(grid.days[0]!.cells[0]!.kind).toBe('free')
  })

  it('returns an empty grid when the worker has no slots this week', () => {
    const grid = buildWeekGrid(monday, [slot(1, 1, '2026-11-20', '09:00', '09:30')], [], 1)
    expect(grid.times).toEqual([])
    expect(grid.days.every((d) => d.cells.length === 0)).toBe(true)
  })
})
