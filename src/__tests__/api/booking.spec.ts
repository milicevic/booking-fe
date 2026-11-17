import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/api/axios', () => ({
  default: {
    get: vi.fn<(...args: unknown[]) => unknown>(),
    post: vi.fn<(...args: unknown[]) => unknown>(),
    patch: vi.fn<(...args: unknown[]) => unknown>(),
  },
}))

import api from '@/api/axios'
import { bookingApi } from '@/api/booking'
import { tenantApi } from '@/api/tenant'

describe('bookingApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lets the customer reschedule through the public route', () => {
    bookingApi.reschedule('tok', { slot_id: 3, start_time: '10:00' })
    expect(api.patch).toHaveBeenCalledWith('/api/bookings/tok/customer-reschedule', { slot_id: 3, start_time: '10:00' })
  })
})

describe('tenantApi', () => {
  it('saves the business type with branding', () => {
    tenantApi.updateBranding({ business_type: 'dentist' })
    expect(api.patch).toHaveBeenCalledWith('/api/client/branding', { business_type: 'dentist' })
  })
})

describe('tenantApi.acceptInvite', () => {
  it('posts the invite token and password to the auth route', () => {
    tenantApi.acceptInvite('inv-1', 'Lozinka123')
    expect(api.post).toHaveBeenCalledWith('/api/auth/accept-invite', { invite_token: 'inv-1', password: 'Lozinka123' })
  })
})
