import api from './axios'

export interface Booking {
  id: number
  slot_id: number
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  token: string
  status: 'confirmed' | 'cancelled'
  note: string | null
  slot: Slot
}

export interface Service {
  id: number
  name: string
  duration_minutes: number
  price: string | null
}

export interface Slot {
  id: number
  worker_id: number
  date: string
  start_time: string
  end_time: string
  is_available: boolean
  worker: Worker
}

export interface Worker {
  id: number
  name: string
  services?: Service[]
}

export const bookingApi = {
  create: (data: {
    slot_id: number
    customer_name: string
    customer_email?: string
    customer_phone?: string
    note?: string
    service_id?: number
  }) => api.post<Booking>('/api/bookings', data),

  getByToken: (token: string) =>
    api.get<Booking>(`/api/bookings/${token}`),

  cancel: (token: string) =>
    api.patch(`/api/bookings/${token}/cancel`),

  registerPushSubscription: (token: string, data: {
    endpoint: string
    keys: { p256dh: string; auth: string }
  }) => api.post(`/api/bookings/${token}/push-subscription`, data),
}
