import api from './axios'

export interface TenantConfig {
  app_name: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
  theme: string
  subdomain: string
  currency: string
  locale: 'sr' | 'en'
  subscription_status: 'trialing' | 'active' | 'expired' | 'canceled' | 'pending_deploy'
  trial_ends_at: string | null
  subscription_ends_at: string | null
}

export const tenantApi = {
  getConfig: () => api.get<TenantConfig>('/api/tenant/config'),

  updateBranding: (data: { app_name?: string; primary_color?: string; secondary_color?: string; theme?: string; currency?: string; locale?: string }) =>
    api.patch<{ app_name: string; primary_color: string; secondary_color: string; theme: string; logo_url: string | null }>('/api/client/branding', data),

  uploadLogo: (file: File) => {
    const form = new FormData()
    form.append('logo', file)
    return api.post<{ logo_url: string }>('/api/client/branding/logo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  register: (data: { name: string; email: string; password: string; app_name: string }) =>
    api.post<{ token: string; tenant: { subdomain: string } }>('/api/register', data),

  previewSubdomain: (appName: string) =>
    api.get<{ subdomain: string }>('/api/register/subdomain-preview', { params: { app_name: appName } }),

  acceptInvite: (token: string, data: { name: string; password: string }) =>
    api.post<{ token: string; client: object }>(`/api/invite/${token}/accept`, data),

  requestDeploy: (data: { subdomain?: string; custom_domain?: string }) =>
    api.post<{ message: string }>('/api/deploy/request', data),
}
