import type { BookableTime } from '@/api/booking'

/**
 * Jedno vreme početka i radnici koji su tada slobodni (svaka opcija nosi termin tog radnika).
 * Pravila celog toka zakazivanja: booking-api/docs/booking-flow.md
 */
export interface TimeChoice {
  date: string
  start_time: string
  end_time: string
  options: BookableTime[]
}

/** Vremena jednog dana, grupisana po početku i poređana po vremenu. */
export function timeChoicesForDate(times: BookableTime[], date: string): TimeChoice[] {
  const byStart = new Map<string, TimeChoice>()
  for (const time of times) {
    if (time.date.slice(0, 10) !== date) continue
    const choice = byStart.get(time.start_time) ?? { date, start_time: time.start_time, end_time: time.end_time, options: [] }
    if (!choice.options.some((option) => option.worker_id === time.worker_id)) choice.options.push(time)
    byStart.set(time.start_time, choice)
  }
  return [...byStart.values()].sort((a, b) => a.start_time.localeCompare(b.start_time))
}

/** Dani na kojima postoji bar jedno slobodno vreme (za kalendar). */
export function availableDates(times: BookableTime[]): Set<string> {
  return new Set(times.map((time) => time.date.slice(0, 10)))
}
