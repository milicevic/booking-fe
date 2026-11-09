import api from './axios'
import type { Booking, Slot } from './booking'
import type { CustomerContact } from './tenant'

export interface WorkerProfile {
  id: number
  user_id: number
  phone: string | null
  photo_url: string | null
  bio: string | null
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
  bio?: string
}

export interface UpdateWorkerData {
  name?: string
  email?: string
  phone?: string
  bio?: string | null
  can_edit_slots?: boolean
}

export interface ClientProfile {
  id: number
  auto_confirm_bookings: boolean
  customer_contact: CustomerContact
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
  getWorker: (id: number) => api.get<Worker>(`/api/workers/${id}`),
  updateWorker: (id: number, data: UpdateWorkerData) => api.put<Worker>(`/api/workers/${id}`, data),
  // Opis radnika menja i sam radnik, pa ide na posebnu rutu (PUT /workers/{id} je samo za klijenta)
  updateWorkerProfile: (id: number, bio: string | null) => api.patch<Worker>(`/api/workers/${id}/profile`, { bio }),
  deleteWorker: (id: number) => api.delete(`/api/workers/${id}`),
  uploadWorkerPhoto: (id: number, file: File) => {
    const form = new FormData()
    form.append('photo', file)
    return api.post<Worker>(`/api/workers/${id}/photo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  deleteWorkerPhoto: (id: number) => api.delete<Worker>(`/api/workers/${id}/photo`),

  getSlots: (clientId?: number) =>
    api.get<Slot[]>('/api/slots', { params: clientId ? { client_id: clientId } : undefined }),
  createSlot: (data: Partial<Slot>) => api.post<Slot>('/api/slots', data),
  deleteSlot: (id: number) => api.delete(`/api/slots/${id}`),

  getBookings: (clientId?: number) =>
    api.get<Booking[]>('/api/bookings', { params: clientId ? { client_id: clientId } : undefined }),
  cancelBooking: (token: string) => api.patch(`/api/bookings/${token}/cancel`),

  updateSettings: (data: { auto_confirm_bookings?: boolean; customer_contact?: CustomerContact }) =>
    api.patch('/api/client/settings', data),

  getClients: () => api.get<AdminClient[]>('/api/admin/clients'),
  suspendClient: (id: number) => api.patch<AdminClient>(`/api/admin/clients/${id}/suspend`),
}
