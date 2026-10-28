import api from './axios'
import type { BookableTime, Slot } from './booking'

export const slotsApi = {
  getAvailable: (params?: { date?: string; worker_id?: number; service_id?: number }) =>
    api.get<Slot[]>('/api/slots/available', { params }),

  getTimes: (params: { worker_id: number; service_id?: number }) =>
    api.get<BookableTime[]>('/api/slots/times', { params }),
}
