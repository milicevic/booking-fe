import api from './axios'
import type { Slot } from './booking'

export const slotsApi = {
  getAvailable: (params?: { date?: string; worker_id?: number }) =>
    api.get<Slot[]>('/api/slots/available', { params }),
}
