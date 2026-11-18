import { describe, it, expect } from 'vitest'
import { notificationLabel } from '@/lib/notificationLabel'
import type { Notification } from '@/api/notifications'

const t = (key: string, params: Record<string, unknown>) => `${key}:${params.name}`
const notification = (data: Partial<Notification['data']>) =>
  ({ id: '1', type: 'x', read_at: null, created_at: '', data: { type: 'booking_pending', customer_name: 'Ana', ...data } }) as Notification

describe('notificationLabel', () => {
  it('labels new and moved bookings', () => {
    expect(notificationLabel(notification({}), t)).toBe('notifications.booking_pending:Ana')
    expect(notificationLabel(notification({ rescheduled: true }), t)).toBe('notifications.booking_moved:Ana')
  })
})
