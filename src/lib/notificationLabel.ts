import type { Notification } from '@/api/notifications'

type Translate = (key: string, params: Record<string, unknown>) => string

/** Naslov obaveštenja vlasnika/radnika: nova, automatski potvrđena ili pomerena rezervacija. */
export function notificationLabel(n: Notification, t: Translate): string {
  const key = n.data.rescheduled ? 'notifications.booking_moved' : `notifications.${n.data.type}`
  return t(key, { name: n.data.customer_name })
}
