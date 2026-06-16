import api from './axios'

export interface Notification {
  id: string
  type: string
  data: {
    type: 'booking_pending' | 'booking_confirmed'
    booking_token: string
    customer_name: string
    worker_name: string
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
}
