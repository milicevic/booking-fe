import type { Slot } from '@/api/booking'

export interface SlotCandidate {
  date: string
  start: string
  end: string
}

export interface SlotGeneratorOptions {
  dateFrom: string
  dateTo: string
  /** 1 = ponedeljak … 7 = nedelja */
  weekdays: number[]
  workStart: string
  workEnd: string
  slotDuration: number
  breaks: { start: string; end: string }[]
}

function toMinutes(time: string): number {
  const [h = 0, m = 0] = time.split(':').map(Number)
  return h * 60 + m
}

function fromMinutes(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

/** Termini za izabrani period, radne dane i radno vreme, bez pauza. */
export function buildSlotCandidates(options: SlotGeneratorOptions): SlotCandidate[] {
  const result: SlotCandidate[] = []
  const from = new Date(options.dateFrom)
  const to = new Date(options.dateTo)
  if (from > to || options.slotDuration <= 0) return result

  const workStart = toMinutes(options.workStart)
  const workEnd = toMinutes(options.workEnd)
  const breaks = options.breaks
    .filter((br) => br.start && br.end)
    .map((br) => ({ start: toMinutes(br.start), end: toMinutes(br.end) }))

  for (const cur = new Date(from); cur <= to; cur.setDate(cur.getDate() + 1)) {
    const dow = cur.getDay() === 0 ? 7 : cur.getDay()
    if (!options.weekdays.includes(dow)) continue

    const date = cur.toISOString().slice(0, 10)
    for (let start = workStart; start + options.slotDuration <= workEnd; start += options.slotDuration) {
      const end = start + options.slotDuration
      if (breaks.some((br) => start < br.end && end > br.start)) continue
      result.push({ date, start: fromMinutes(start), end: fromMinutes(end) })
    }
  }

  return result
}

/**
 * Deli termine na nove i one koji se preklapaju sa postojećim terminima radnika
 * (isto pravilo kao na backendu: dodirivanje nije preklapanje).
 */
export function splitByExisting(candidates: SlotCandidate[], existing: Slot[], workerId: number) {
  const workerSlots = existing.filter((slot) => slot.worker_id === workerId)
  const overlaps = (candidate: SlotCandidate) =>
    workerSlots.some(
      (slot) =>
        slot.date.slice(0, 10) === candidate.date &&
        slot.start_time.slice(0, 5) < candidate.end &&
        slot.end_time.slice(0, 5) > candidate.start,
    )

  return {
    fresh: candidates.filter((candidate) => !overlaps(candidate)),
    existing: candidates.filter(overlaps),
  }
}
