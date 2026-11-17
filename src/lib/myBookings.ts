import { isAxiosError } from 'axios'
import { bookingApi } from '@/api/booking'
import type { Booking } from '@/api/booking'

// Tokeni rezervacija koje je kupac napravio u ovom pregledaču. localStorage je odvojen po adresi,
// pa svaki salon (poddomen) vidi samo svoje rezervacije.
const STORAGE_KEY = 'my-bookings'

function readTokens(): string[] {
  try {
    const tokens = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(tokens) ? tokens.filter((token): token is string => typeof token === 'string') : []
  } catch {
    return []
  }
}

function writeTokens(tokens: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
  } catch {
    // Pregledač ne dozvoljava čuvanje — kupac i dalje ima link iz mejla
  }
}

export function rememberBooking(token: string) {
  const tokens = readTokens()
  if (!tokens.includes(token)) writeTokens([...tokens, token])
}

function isUpcoming(booking: Booking): boolean {
  const end = new Date(`${booking.slot.date.slice(0, 10)}T${booking.end_time}`)
  return ['pending', 'confirmed'].includes(booking.status) && end.getTime() > Date.now()
}

/** Prošle i otkazane rezervacije ostaju u istoriji još ovoliko dana posle termina. */
export const HISTORY_DAYS = 60

function isRecent(booking: Booking): boolean {
  const day = new Date(`${booking.slot.date.slice(0, 10)}T00:00:00`)
  return Date.now() - day.getTime() < HISTORY_DAYS * 86400000
}

export interface MyBookings {
  upcoming: Booking[]
  /** Prošle, otkazane i odbijene iz poslednjih HISTORY_DAYS dana, najnovije prve */
  history: Booking[]
}

/**
 * Rezervacije iz ovog pregledača: predstojeće i skorašnja istorija. Iz pregledača se brišu
 * starije od HISTORY_DAYS dana i one koje server ne prepoznaje (404); kod greške mreže ili
 * servera token ostaje za sledeći put.
 */
export async function loadMyBookingsWithHistory(): Promise<MyBookings> {
  const tokens = readTokens()
  if (tokens.length === 0) return { upcoming: [], history: [] }

  const results = await Promise.all(
    tokens.map(async (token): Promise<{ token: string; booking: Booking | null; keep: boolean }> => {
      try {
        const { data } = await bookingApi.getByToken(token)
        return { token, booking: data, keep: isUpcoming(data) || isRecent(data) }
      } catch (e) {
        return { token, booking: null, keep: !(isAxiosError(e) && e.response?.status === 404) }
      }
    }),
  )

  writeTokens(results.filter((result) => result.keep).map((result) => result.token))

  const known = results
    .filter((result): result is { token: string; booking: Booking; keep: boolean } => !!result.booking && result.keep)
    .map((result) => result.booking)
  const byTime = (a: Booking, b: Booking) => a.slot.date.localeCompare(b.slot.date) || a.start_time.localeCompare(b.start_time)

  return {
    upcoming: known.filter(isUpcoming).sort(byTime),
    history: known.filter((b) => !isUpcoming(b)).sort((a, b) => byTime(b, a)),
  }
}

/** Samo aktivne predstojeće rezervacije. */
export async function loadMyBookings(): Promise<Booking[]> {
  return (await loadMyBookingsWithHistory()).upcoming
}
