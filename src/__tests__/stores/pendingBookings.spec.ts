import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePendingBookingsStore } from '@/stores/pendingBookings'
import { toISODate, addDays } from '@/lib/weekCalendar'

vi.mock('@/api/admin', () => ({
  adminApi: { getBookings: vi.fn<(...args: unknown[]) => unknown>() },
}))

import { adminApi } from '@/api/admin'

const today = toISODate(new Date())
const yesterday = toISODate(addDays(new Date(), -1))

function booking(status: string, date: string) {
  return { status, slot: { date } }
}

describe('pending bookings store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(adminApi.getBookings).mockReset()
  })

  it('counts only pending bookings from today on', async () => {
    vi.mocked(adminApi.getBookings).mockResolvedValue({
      data: [booking('pending', today), booking('pending', yesterday), booking('confirmed', today)],
    } as never)
    const store = usePendingBookingsStore()
    await store.refresh()
    expect(store.count).toBe(1)
  })

  it('keeps the last count when loading fails', async () => {
    vi.mocked(adminApi.getBookings).mockRejectedValue(new Error('network'))
    const store = usePendingBookingsStore()
    store.count = 3
    await store.refresh()
    expect(store.count).toBe(3)
  })
})
