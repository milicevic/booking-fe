import api from './axios'
import type { Booking, Slot } from './booking'

export interface WorkerProfile {
  id: number
  user_id: number
  phone: string | null
}

export interface Worker {
  id: number
  name: string
  email: string | null
  role: string
  client_id: number
  can_edit_slots: boolean
  worker_profile: WorkerProfile | null
}

export interface CreateWorkerData {
  name: string
  email?: string
  phone?: string
}

export interface UpdateWorkerData {
  name?: string
  email?: string
  phone?: string
  can_edit_slots?: boolean
}

export interface ClientProfile {
  id: number
  auto_confirm_bookings: boolean
}

export interface AdminClient {
  id: number
  name: string
  email: string
  role: string
  is_suspended: boolean
  workers_count: number
  client_profile: ClientProfile | null
}

export const adminApi = {
  getWorkers: (clientId?: number) =>
    api.get<Worker[]>('/api/workers', { params: clientId ? { client_id: clientId } : undefined }),
  createWorker: (data: CreateWorkerData) => api.post<Worker>('/api/workers', data),
  updateWorker: (id: number, data: UpdateWorkerData) => api.put<Worker>(`/api/workers/${id}`, data),
  deleteWorker: (id: number) => api.delete(`/api/workers/${id}`),

  getSlots: (clientId?: number) =>
    api.get<Slot[]>('/api/slots', { params: clientId ? { client_id: clientId } : undefined }),
  createSlot: (data: Partial<Slot>) => api.post<Slot>('/api/slots', data),
  deleteSlot: (id: number) => api.delete(`/api/slots/${id}`),

  getBookings: (clientId?: number) =>
    api.get<Booking[]>('/api/bookings', { params: clientId ? { client_id: clientId } : undefined }),
  cancelBooking: (token: string) => api.patch(`/api/bookings/${token}/cancel`),

  updateSettings: (data: { auto_confirm_bookings: boolean }) =>
    api.patch('/api/client/settings', data),

  getClients: () => api.get<AdminClient[]>('/api/admin/clients'),
  suspendClient: (id: number) => api.patch<AdminClient>(`/api/admin/clients/${id}/suspend`),
}
