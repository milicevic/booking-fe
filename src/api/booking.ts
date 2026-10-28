import api from './axios'

export interface Booking {
  id: number
  slot_id: number
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  token: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'rejected'
  note: string | null
  start_time: string
  end_time: string
  slot: Slot
  service?: Service | null
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

/** Vreme u koje kupac može da zakaže; slot_id je termin u kom rezervacija počinje. */
export interface BookableTime {
  slot_id: number
  date: string
  start_time: string
  end_time: string
}

export interface Worker {
  id: number
  name: string
  services?: Service[]
}

export const bookingApi = {
  create: (data: {
    slot_id: number
    start_time?: string
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
