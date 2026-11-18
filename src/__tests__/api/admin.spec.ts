import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn<(...args: unknown[]) => unknown>(),
    post: vi.fn<(...args: unknown[]) => unknown>(),
    patch: vi.fn<(...args: unknown[]) => unknown>(),
    put: vi.fn<(...args: unknown[]) => unknown>(),
    delete: vi.fn<(...args: unknown[]) => unknown>(),
  },
}))

import api from '@/api/axios'
import { adminApi } from '@/api/admin'

describe('adminApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads slots and bookings for a date range', () => {
    adminApi.getSlots(undefined, { from: '2026-11-16', to: '2026-11-22' })
    expect(api.get).toHaveBeenCalledWith('/api/slots', { params: { from: '2026-11-16', to: '2026-11-22' } })

    adminApi.getBookings(5, { from: '2026-11-16', to: '2026-11-22' })
    expect(api.get).toHaveBeenCalledWith('/api/bookings', { params: { client_id: 5, from: '2026-11-16', to: '2026-11-22' } })
  })

  it('blocks a slot, creates slots in bulk and reschedules a booking', () => {
    adminApi.setSlotBlocked(7, true)
    expect(api.patch).toHaveBeenCalledWith('/api/slots/7', { is_blocked: true })

    const bulk = { worker_id: 2, date_from: '2026-11-17', date_to: '2026-12-14', weekdays: [1, 2], start: '09:00', end: '17:00', slot_duration: 30, breaks: [] }
    adminApi.bulkCreateSlots(bulk)
    expect(api.post).toHaveBeenCalledWith('/api/slots/bulk', bulk)

    adminApi.rescheduleBooking('tok', { slot_id: 12, start_time: '15:00' })
    expect(api.patch).toHaveBeenCalledWith('/api/bookings/tok/reschedule', { slot_id: 12, start_time: '15:00' })
  })

  it('saves the confirmation mode in client settings', () => {
    adminApi.updateSettings({ confirmation_mode: 'worker' })
    expect(api.patch).toHaveBeenCalledWith('/api/client/settings', { confirmation_mode: 'worker' })
  })

  it('loads, saves and removes a worker schedule', () => {
    adminApi.getWorkerSchedule(4)
    expect(api.get).toHaveBeenCalledWith('/api/workers/4/schedule')

    const hours = { weekdays: [1, 3], start: '09:00', end: '15:00', slot_duration: 45, breaks: [{ start: '12:00', end: '12:30' }] }
    adminApi.saveWorkerSchedule(4, hours)
    expect(api.put).toHaveBeenCalledWith('/api/workers/4/schedule', hours)

    adminApi.deleteWorkerSchedule(4)
    expect(api.delete).toHaveBeenCalledWith('/api/workers/4/schedule')
  })

  it('marks onboarding completed and saves the reschedule cutoff', () => {
    adminApi.updateSettings({ onboarding_completed: true, reschedule_cutoff_hours: 6 })
    expect(api.patch).toHaveBeenCalledWith('/api/client/settings', { onboarding_completed: true, reschedule_cutoff_hours: 6 })
  })
})
