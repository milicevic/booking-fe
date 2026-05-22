import api from './axios'
import type { Booking, Slot } from './booking'

export interface Worker {
  id: number
  name: string
  email: string | null
  phone: string | null
  is_active: boolean
}

export const adminApi = {
  getWorkers: () => api.get<Worker[]>('/api/workers'),
  createWorker: (data: Partial<Worker>) => api.post<Worker>('/api/workers', data),
  updateWorker: (id: number, data: Partial<Worker>) => api.put<Worker>(`/api/workers/${id}`, data),
  deleteWorker: (id: number) => api.delete(`/api/workers/${id}`),

  getSlots: () => api.get<Slot[]>('/api/slots'),
  createSlot: (data: Partial<Slot>) => api.post<Slot>('/api/slots', data),
  deleteSlot: (id: number) => api.delete(`/api/slots/${id}`),

  getBookings: () => api.get<Booking[]>('/api/bookings'),
  cancelBooking: (token: string) => api.patch(`/api/bookings/${token}/cancel`),
}
