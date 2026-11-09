import { describe, it, expect } from 'vitest'
import type { BookableTime } from '@/api/booking'
import { availableDates, timeChoicesForDate } from '@/lib/bookingTimes'

function time(workerId: number, start: string, date = '2026-11-10'): BookableTime {
  return { slot_id: workerId * 10, worker_id: workerId, date, start_time: `${start}:00`, end_time: `${start.slice(0, 3)}30:00` }
}

describe('booking times', () => {
  it('groups the same start time with every free worker', () => {
    const choices = timeChoicesForDate([time(1, '09:00'), time(2, '09:00'), time(1, '10:00')], '2026-11-10')

    expect(choices.map((c) => [c.start_time, c.options.map((o) => o.worker_id)])).toEqual([
      ['09:00:00', [1, 2]],
      ['10:00:00', [1]],
    ])
  })

  it('keeps only the chosen day, sorted by time', () => {
    const choices = timeChoicesForDate([time(1, '11:00'), time(1, '08:00'), time(1, '09:00', '2026-11-11')], '2026-11-10')

    expect(choices.map((c) => c.start_time)).toEqual(['08:00:00', '11:00:00'])
  })

  it('lists the days that have at least one free time', () => {
    expect([...availableDates([time(1, '09:00'), time(2, '10:00', '2026-11-12')])]).toEqual(['2026-11-10', '2026-11-12'])
  })
})
