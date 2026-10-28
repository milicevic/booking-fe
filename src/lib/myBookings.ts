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

/** Aktivne predstojeće rezervacije; prošle, otkazane i nepostojeće se brišu iz pregledača. */
export async function loadMyBookings(): Promise<Booking[]> {
  const tokens = readTokens()
  if (tokens.length === 0) return []

  const results = await Promise.all(
    tokens.map(async (token) => {
      try {
        const { data } = await bookingApi.getByToken(token)
        return data
      } catch {
        return null
      }
    }),
  )

  const active = results.filter((booking): booking is Booking => !!booking && isUpcoming(booking))
  writeTokens(active.map((booking) => booking.token))

  return active.sort((a, b) =>
    a.slot.date.localeCompare(b.slot.date) || a.start_time.localeCompare(b.start_time),
  )
}
