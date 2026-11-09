import { describe, it, expect } from 'vitest'
import type { Slot } from '@/api/booking'
import { buildSlotCandidates, splitByExisting } from '@/lib/slotGenerator'

// 2026-11-09 je ponedeljak
const base = {
  dateFrom: '2026-11-09',
  dateTo: '2026-11-10',
  weekdays: [1],
  workStart: '09:00',
  workEnd: '11:00',
  slotDuration: 30,
  breaks: [] as { start: string; end: string }[],
}

function slot(workerId: number, date: string, start: string, end: string): Slot {
  return { id: 1, worker_id: workerId, date, start_time: `${start}:00`, end_time: `${end}:00`, is_available: true, worker: { id: workerId, name: 'X' } }
}

describe('slot generator', () => {
  it('builds slots for the chosen weekdays and working hours', () => {
    expect(buildSlotCandidates(base)).toEqual([
      { date: '2026-11-09', start: '09:00', end: '09:30' },
      { date: '2026-11-09', start: '09:30', end: '10:00' },
      { date: '2026-11-09', start: '10:00', end: '10:30' },
      { date: '2026-11-09', start: '10:30', end: '11:00' },
    ])
  })

  it('skips breaks', () => {
    const starts = buildSlotCandidates({ ...base, breaks: [{ start: '09:30', end: '10:00' }] }).map((c) => c.start)
    expect(starts).toEqual(['09:00', '10:00', '10:30'])
  })

  it('separates slots the worker already has from new ones', () => {
    const candidates = buildSlotCandidates(base)
    const existing = [slot(7, '2026-11-09', '09:00', '10:00'), slot(8, '2026-11-09', '10:00', '11:00')]

    const { fresh, existing: skipped } = splitByExisting(candidates, existing, 7)

    expect(skipped.map((c) => c.start)).toEqual(['09:00', '09:30'])
    expect(fresh.map((c) => c.start)).toEqual(['10:00', '10:30'])
  })

  it('treats touching slots as not overlapping', () => {
    const { fresh } = splitByExisting(buildSlotCandidates(base), [slot(7, '2026-11-09', '08:00', '09:00')], 7)
    expect(fresh).toHaveLength(4)
  })
})
