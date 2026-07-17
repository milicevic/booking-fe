import api from './axios'

export interface Service {
  id: number
  name: string
  duration_minutes: number
  price: string | null
  is_active: boolean
  workers?: { id: number; name: string }[]
}

export interface CreateServiceData {
  name: string
  duration_minutes: number
  price?: number | null
  is_active?: boolean
}

export const servicesApi = {
  getServices: (workerId?: number) =>
    api.get<Service[]>('/api/services', { params: workerId ? { worker_id: workerId } : undefined }),
  createService: (data: CreateServiceData) => api.post<Service>('/api/services', data),
  updateService: (id: number, data: Partial<CreateServiceData> & { is_active?: boolean }) =>
    api.patch<Service>(`/api/services/${id}`, data),
  deleteService: (id: number) => api.delete(`/api/services/${id}`),
  assignWorker: (serviceId: number, workerId: number) =>
    api.post(`/api/services/${serviceId}/workers/${workerId}`),
  unassignWorker: (serviceId: number, workerId: number) =>
    api.delete(`/api/services/${serviceId}/workers/${workerId}`),
}
