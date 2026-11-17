import { describe, it, expect } from 'vitest'
import {
  cloneSchedule,
  defaultSchedule,
  scheduleCandidates,
  scheduleProblem,
  slotCount,
  workersProblem,
} from '@/lib/onboarding'
import type { ScheduleDraft, WorkerDraft } from '@/lib/onboarding'

// 2026-11-09 je ponedeljak
const monday = new Date(2026, 10, 9)

const oneDay: ScheduleDraft = {
  weekdays: [1],
  workStart: '09:00',
  workEnd: '11:00',
  slotDuration: 30,
  breaks: [],
}

function worker(id: string, serviceIds: string[], schedule: ScheduleDraft): WorkerDraft {
  return { id, name: id, email: '', serviceIds, schedule }
}

describe('onboarding schedule', () => {
  it('counts slots for every matching weekday in the period', () => {
    // 4 ponedeljka * 4 termina
    expect(slotCount(oneDay, 4, monday)).toBe(16)
  })

  it('removes slots that overlap any break', () => {
    const withBreaks: ScheduleDraft = {
      ...oneDay,
      breaks: [
        { start: '09:30', end: '10:00' },
        { start: '10:30', end: '11:00' },
      ],
    }
    expect(slotCount(withBreaks, 1, monday)).toBe(2)
  })

  it('uses each worker slot length', () => {
    expect(slotCount({ ...oneDay, slotDuration: 60 }, 1, monday)).toBe(2)
    expect(slotCount({ ...oneDay, slotDuration: 15 }, 1, monday)).toBe(8)
  })

  it('returns concrete candidates', () => {
    expect(scheduleCandidates({ ...oneDay, workEnd: '10:00' }, 1, monday)).toEqual([
      { date: '2026-11-09', start: '09:00', end: '09:30' },
      { date: '2026-11-09', start: '09:30', end: '10:00' },
    ])
  })

  it('clones a schedule without sharing arrays', () => {
    const copy = cloneSchedule(defaultSchedule())
    copy.weekdays.push(7)
    copy.breaks[0]!.start = '13:00'
    expect(defaultSchedule().weekdays).not.toContain(7)
    expect(defaultSchedule().breaks[0]!.start).toBe('12:00')
  })
})

describe('onboarding validation', () => {
  it('requires at least one worker', () => {
    expect(workersProblem([])).toEqual({ code: 'none' })
  })

  it('requires every worker to have a service', () => {
    const problem = workersProblem([worker('Ana', ['s1'], oneDay), worker('Marija', [], oneDay)])
    expect(problem).toEqual({ code: 'noService', name: 'Marija' })
    expect(workersProblem([worker('Ana', ['s1'], oneDay)])).toBeNull()
  })

  it('finds a worker whose schedule produces no slots', () => {
    const empty: ScheduleDraft = { ...oneDay, weekdays: [] }
    expect(scheduleProblem([worker('Ana', ['s1'], oneDay), worker('Marija', ['s1'], empty)], monday)?.id).toBe('Marija')
    expect(scheduleProblem([worker('Ana', ['s1'], oneDay)], monday)).toBeNull()
  })
})
