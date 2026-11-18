import api from './axios'
import type { PushKeys } from '@/lib/push'

export interface Notification {
  id: string
  type: string
  data: {
    type: 'booking_pending' | 'booking_confirmed'
    booking_token: string
    customer_name: string
    worker_name: string
    service_name: string | null
    date: string
    start_time: string
  }
  read_at: string | null
  created_at: string
}

export const notificationsApi = {
  getAll: () => api.get<Notification[]>('/api/notifications'),
  markRead: (id: string) => api.patch(`/api/notifications/${id}/read`),
  markAllRead: () => api.patch('/api/notifications/read-all'),

  // Push na ovom uređaju za prijavljenog korisnika (vlasnik, radnik, admin)
  subscribePush: (keys: PushKeys) => api.post('/api/push/subscriptions', keys),
  unsubscribePush: (endpoint: string) => api.delete('/api/push/subscriptions', { data: { endpoint } }),
}
