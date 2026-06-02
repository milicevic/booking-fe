import api from './axios'

export interface TenantConfig {
  app_name: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
  theme: string
  subscription_status: 'trialing' | 'active' | 'expired' | 'canceled' | 'pending_deploy'
  trial_ends_at: string | null
  subscription_ends_at: string | null
}

export const tenantApi = {
  getConfig: () => api.get<TenantConfig>('/api/tenant/config'),

  register: (data: {
    name: string
    email: string
    password: string
    primary_color: string
    secondary_color: string
    theme: string
  }) => api.post<{ message: string }>('/api/register', data),

  acceptInvite: (token: string, data: { name: string; password: string }) =>
    api.post<{ token: string; client: object }>(`/api/invite/${token}/accept`, data),

  requestDeploy: (data: { subdomain?: string; custom_domain?: string }) =>
    api.post<{ message: string }>('/api/deploy/request', data),
}
