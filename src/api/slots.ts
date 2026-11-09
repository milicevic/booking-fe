import api from './axios'
import type { BookableTime, Slot } from './booking'

export const slotsApi = {
  getAvailable: (params?: { date?: string; worker_id?: number; service_id?: number }) =>
    api.get<Slot[]>('/api/slots/available', { params }),

  // worker_id je samo filter prikaza; bez njega backend vraća vremena svih radnika usluge.
  // Rezervacija uvek ide preko slot_id izabranog radnika (vidi booking-api/docs/booking-flow.md).
  getTimes: (params: { service_id: number; worker_id?: number }) =>
    api.get<BookableTime[]>('/api/slots/times', { params }),
}
