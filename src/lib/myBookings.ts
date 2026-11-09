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

/**
 * Aktivne predstojeće rezervacije. Iz pregledača se brišu samo prošle, otkazane i one koje
 * server ne prepoznaje (404); kod greške mreže ili servera token ostaje za sledeći put.
 */
export async function loadMyBookings(): Promise<Booking[]> {
  const tokens = readTokens()
  if (tokens.length === 0) return []

  const results = await Promise.all(
    tokens.map(async (token): Promise<{ token: string; booking: Booking | null; keep: boolean }> => {
      try {
        const { data } = await bookingApi.getByToken(token)
        return { token, booking: data, keep: isUpcoming(data) }
      } catch (e) {
        return { token, booking: null, keep: !(isAxiosError(e) && e.response?.status === 404) }
      }
    }),
  )

  writeTokens(results.filter((result) => result.keep).map((result) => result.token))

  return results
    .filter((result): result is { token: string; booking: Booking; keep: boolean } => !!result.booking && result.keep)
    .map((result) => result.booking)
    .sort((a, b) => a.slot.date.localeCompare(b.slot.date) || a.start_time.localeCompare(b.start_time))
}
