import api from '@/api/axios'

export type GoogleIntent = 'login' | 'register'

// Google prijava ide punom navigacijom: backend šalje korisnika na Google, a zatim nazad na /auth/callback ove adrese
export function googleAuthUrl(intent: GoogleIntent, appName?: string): string {
  const params = new URLSearchParams({ intent, host: window.location.host })
  if (appName) params.set('app_name', appName)
  return `${api.defaults.baseURL}/api/auth/google/redirect?${params}`
}
