import type { Booking, Slot } from '@/api/booking'

export type BlockKind = 'free' | 'taken' | 'pending' | 'confirmed'

/** Jedan blok u nedeljnom kalendaru: slobodan termin, zauzet termin ili rezervacija. */
export interface WeekBlock {
  key: string
  slot: Slot
  kind: BlockKind
  /** HH:MM; kod rezervacije je to njeno vreme, a ne vreme termina u kom počinje */
  start: string
  end: string
  booking: Booking | null
}

export interface WeekDay {
  date: string
  blocks: WeekBlock[]
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

const hhmm = (time: string) => time.slice(0, 5)

/**
 * Sedam dana od `monday`, svaki sa blokovima po vremenu. Rezervacija koja traje duže od jednog
 * termina je jedan blok: termini koje pokriva se ne prikazuju posebno.
 */
export function buildWeek(monday: Date, slots: Slot[], bookings: Booking[], workerId: number | null): WeekDay[] {
  const active = bookings.filter((b) => b.status === 'pending' || b.status === 'confirmed')
  const byStartSlot = new Map(active.map((b) => [b.slot_id, b]))

  return Array.from({ length: 7 }, (_, i) => {
    const date = toISODate(addDays(monday, i))
    const daySlots = slots
      .filter((s) => s.date.slice(0, 10) === date && (workerId === null || s.worker_id === workerId))
      .sort((a, b) => a.start_time.localeCompare(b.start_time))

    const covered = (slot: Slot) =>
      active.some(
        (b) =>
          b.slot_id !== slot.id &&
          b.slot.worker_id === slot.worker_id &&
          b.slot.date.slice(0, 10) === date &&
          hhmm(slot.start_time) >= hhmm(b.start_time) &&
          hhmm(slot.end_time) <= hhmm(b.end_time),
      )

    const blocks: WeekBlock[] = daySlots
      .filter((slot) => !covered(slot))
      .map((slot) => {
        const booking = byStartSlot.get(slot.id) ?? null
        const kind: BlockKind = booking
          ? booking.status === 'confirmed' ? 'confirmed' : 'pending'
          : slot.is_available ? 'free' : 'taken'
        return {
          key: `${slot.id}`,
          slot,
          kind,
          start: hhmm(booking ? booking.start_time : slot.start_time),
          end: hhmm(booking ? booking.end_time : slot.end_time),
          booking,
        }
      })
    return { date, blocks }
  })
}
