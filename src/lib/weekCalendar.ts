import type { Booking, Slot } from '@/api/booking'

/**
 * Stanje jedne ćelije nedeljnog kalendara:
 * slobodan termin, blokiran termin, rezervacija (čeka potvrdu / potvrđena), zauzet termin
 * bez vidljive rezervacije, ili vreme kada radnik ne radi (pauza, van radnog vremena).
 */
export type CellKind = 'free' | 'blocked' | 'pending' | 'confirmed' | 'taken' | 'off'

export interface GridCell {
  /** Isti ključ imaju sve ćelije jedne rezervacije, odnosno jednog termina */
  key: string
  /** HH:MM početak ćelije */
  time: string
  kind: CellKind
  /** Prva ćelija rezervacije (u njoj se ispisuje kupac i usluga) */
  first: boolean
  slot: Slot | null
  booking: Booking | null
}

export interface GridDay {
  date: string
  cells: GridCell[]
}

export interface WeekGrid {
  /** Početna vremena redova (HH:MM) */
  times: string[]
  /** Trajanje jednog reda u minutima */
  step: number
  days: GridDay[]
}

export function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Ponedeljak nedelje u kojoj je zadati dan. */
export function startOfWeek(date: Date): Date {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dow = monday.getDay() === 0 ? 7 : monday.getDay()
  monday.setDate(monday.getDate() - (dow - 1))
  return monday
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export const toMinutes = (time: string) => {
  const [h, m] = time.slice(0, 5).split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export const fromMinutes = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

const DEFAULT_STEP = 30

/**
 * Korak redova: najkraći termin u nedelji (15–60 min), da svaki termin ima bar jedan red.
 */
function stepFor(slots: Slot[]): number {
  const lengths = slots.map((s) => toMinutes(s.end_time) - toMinutes(s.start_time)).filter((n) => n > 0)
  if (lengths.length === 0) return DEFAULT_STEP
  return Math.min(60, Math.max(15, Math.min(...lengths)))
}

/**
 * Nedeljni kalendar jednog radnika kao mreža: redovi su vremena, kolone dani (pon–ned).
 * Rezervacija koja traje duže od jednog reda zauzima više ćelija sa istim ključem.
 */
export function buildWeekGrid(monday: Date, slots: Slot[], bookings: Booking[], workerId: number | null): WeekGrid {
  const dates = Array.from({ length: 7 }, (_, i) => toISODate(addDays(monday, i)))
  const weekSlots = slots.filter(
    (s) => dates.includes(s.date.slice(0, 10)) && (workerId === null || s.worker_id === workerId),
  )
  const active = bookings.filter(
    (b) =>
      (b.status === 'pending' || b.status === 'confirmed') &&
      dates.includes(b.slot.date.slice(0, 10)) &&
      (workerId === null || b.slot.worker_id === workerId),
  )

  const step = stepFor(weekSlots)
  if (weekSlots.length === 0) return { times: [], step, days: dates.map((date) => ({ date, cells: [] })) }

  const first = Math.floor(Math.min(...weekSlots.map((s) => toMinutes(s.start_time))) / step) * step
  const last = Math.max(...weekSlots.map((s) => toMinutes(s.end_time)))
  const times: string[] = []
  for (let m = first; m < last; m += step) times.push(fromMinutes(m))

  const days = dates.map((date) => {
    const daySlots = weekSlots.filter((s) => s.date.slice(0, 10) === date)
    const dayBookings = active.filter((b) => b.slot.date.slice(0, 10) === date)

    const cells = times.map((time): GridCell => {
      const t = toMinutes(time)
      const booking =
        dayBookings.find((b) => toMinutes(b.start_time) < t + step && toMinutes(b.end_time) > t) ?? null
      const slot =
        daySlots.find((s) => toMinutes(s.start_time) <= t && toMinutes(s.end_time) > t) ??
        (booking ? daySlots.find((s) => s.id === booking.slot_id) ?? null : null)

      if (booking) {
        const start = toMinutes(booking.start_time)
        return {
          key: `b${booking.id}`,
          time,
          kind: booking.status === 'confirmed' ? 'confirmed' : 'pending',
          first: start >= t && start < t + step,
          slot,
          booking,
        }
      }
      if (!slot) return { key: `off-${date}-${time}`, time, kind: 'off', first: false, slot: null, booking: null }

      const kind: CellKind = slot.is_blocked ? 'blocked' : slot.is_available ? 'free' : 'taken'
      return { key: `s${slot.id}`, time, kind, first: toMinutes(slot.start_time) >= t, slot, booking: null }
    })
    return { date, cells }
  })

  return { times, step, days }
}
