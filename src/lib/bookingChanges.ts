import type { Booking } from '@/api/booking'

export interface BookingChange {
  /** i18n ključ poruke (live.*) */
  key: string
  params: { date: string; time: string }
}

/**
 * Šta se promenilo u rezervaciji od poslednjeg učitavanja, za poruku kupcu na otvorenoj stranici:
 * status (potvrđena, odbijena, otkazana) ili novo vreme (salon je pomerio rezervaciju).
 */
export function bookingChange(before: Booking, after: Booking): BookingChange | null {
  const params = { date: after.slot.date.slice(0, 10), time: after.start_time.slice(0, 5) }

  if (before.status !== after.status) return { key: `live.status.${after.status}`, params }

  const moved = before.slot.date.slice(0, 10) !== params.date || before.start_time !== after.start_time
  return moved ? { key: 'live.moved', params } : null
}

/** Promene u listi rezervacija (po tokenu); nove rezervacije nisu promena. */
export function bookingChanges(before: Booking[], after: Booking[]): BookingChange[] {
  const previous = new Map(before.map((b) => [b.token, b]))
  return after.flatMap((b) => {
    const old = previous.get(b.token)
    const change = old ? bookingChange(old, b) : null
    return change ? [change] : []
  })
}
