import api from './axios'
import type { Booking, Slot } from './booking'
import type { CustomerContact } from './tenant'
import type { Client } from '@/stores/auth'

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

/** Ko potvrđuje nove rezervacije: vlasnik, radnik kod koga je termin, ili niko (automatski) */
export type ConfirmationMode = 'owner' | 'worker' | 'auto'

export interface ClientProfile {
  id: number
  auto_confirm_bookings: boolean
  customer_contact: CustomerContact
  confirmation_mode?: ConfirmationMode
  reschedule_cutoff_hours?: number
  /** Kupac dobija poziv u kalendar (Google / .ics sa podsetnikom) */
  calendar_invites?: boolean
  /** Zaštita od zauzimanja termina (0 = bez ograničenja) */
  max_active_bookings_per_customer?: number
  max_daily_bookings_per_customer?: number
  pending_expiry_hours?: number
  /** Kada je vlasnik završio onboarding; null = još nije */
  onboarding_completed_at?: string | null
}

export interface SettingsData {
  auto_confirm_bookings?: boolean
  customer_contact?: CustomerContact
  confirmation_mode?: ConfirmationMode
  reschedule_cutoff_hours?: number
  calendar_invites?: boolean
  max_active_bookings_per_customer?: number
  max_daily_bookings_per_customer?: number
  pending_expiry_hours?: number
  /** true postavlja onboarding_completed_at, false ga briše */
  onboarding_completed?: boolean
}

/** Radno vreme koje se ponavlja svake nedelje (1 = ponedeljak … 7 = nedelja) */
export interface WorkingHours {
  weekdays: number[]
  start: string
  end: string
  slot_duration: number
  breaks: { start: string; end: string }[]
}

/** Stalni raspored radnika: backend drži termine napravljenim weeks_ahead nedelja unapred */
export interface WorkerSchedule extends WorkingHours {
  worker_id: number
  weeks_ahead: number
  generated_until: string | null
  updated_at: string
}

export interface SavedWorkerSchedule extends WorkerSchedule {
  generated: { created: number; skipped: number; removed: number }
}

/** Kupac koga je vlasnik blokirao (po telefonu i emailu) */
export interface BlockedCustomer {
  id: number
  name: string | null
  phone: string | null
  email: string | null
  created_at: string
}

export interface BulkSlotsData {
  worker_id: number
  date_from: string
  date_to: string
  weekdays: number[]
  start: string
  end: string
  slot_duration: number
  breaks: { start: string; end: string }[]
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

  getWorkerSchedule: (workerId: number) => api.get<WorkerSchedule | null>(`/api/workers/${workerId}/schedule`),
  saveWorkerSchedule: (workerId: number, data: WorkingHours) =>
    api.put<SavedWorkerSchedule>(`/api/workers/${workerId}/schedule`, data),
  deleteWorkerSchedule: (workerId: number) => api.delete(`/api/workers/${workerId}/schedule`),

  getSlots: (clientId?: number, range?: { from: string; to: string }) =>
    api.get<Slot[]>('/api/slots', { params: { ...(clientId ? { client_id: clientId } : {}), ...range } }),
  // Blokiran termin ostaje u kalendaru, ali se ne nudi kupcima
  setSlotBlocked: (id: number, blocked: boolean) => api.patch<Slot>(`/api/slots/${id}`, { is_blocked: blocked }),
  bulkCreateSlots: (data: BulkSlotsData) => api.post<{ created: number; skipped: number }>('/api/slots/bulk', data),
  createSlot: (data: Partial<Slot>) => api.post<Slot>('/api/slots', data),
  deleteSlot: (id: number) => api.delete(`/api/slots/${id}`),

  getBookings: (clientId?: number, range?: { from: string; to: string }) =>
    api.get<Booking[]>('/api/bookings', { params: { ...(clientId ? { client_id: clientId } : {}), ...range } }),
  cancelBooking: (token: string) => api.patch(`/api/bookings/${token}/cancel`),
  // Potvrda i odbijanje: vlasnik, a u režimu 'worker' i radnik kod koga je termin (BookingPolicy)
  confirmBooking: (token: string) => api.patch(`/api/bookings/${token}/confirm`),
  rejectBooking: (token: string) => api.patch(`/api/bookings/${token}/reject`),
  // Blokira kupca iz rezervacije i otkazuje mu buduće rezervacije (samo vlasnik)
  blockCustomer: (token: string) =>
    api.post<{ message: string; blocked: BlockedCustomer; cancelled: number }>(`/api/bookings/${token}/block-customer`),
  getBlockedCustomers: () => api.get<BlockedCustomer[]>('/api/blocked-customers'),
  unblockCustomer: (id: number) => api.delete(`/api/blocked-customers/${id}`),
  rescheduleBooking: (token: string, data: { slot_id: number; start_time: string }) =>
    api.patch<Booking>(`/api/bookings/${token}/reschedule`, data),

  updateSettings: (data: SettingsData) =>
    api.patch<Client>('/api/client/settings', data),

  getClients: () => api.get<AdminClient[]>('/api/admin/clients'),
  suspendClient: (id: number) => api.patch<AdminClient>(`/api/admin/clients/${id}/suspend`),
}
