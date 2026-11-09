import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/axios'
import type { CustomerContact } from '@/api/tenant'
import { isAxiosError } from 'axios'

interface ClientProfile {
  id: number
  auto_confirm_bookings: boolean
  customer_contact: CustomerContact
}

export interface Client {
  id: number
  name: string
  email: string
  role: string
  can_edit_slots: boolean
  client_profile: ClientProfile | null
}

export const useAuthStore = defineStore('auth', () => {
  const client = ref<Client | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))

  const isLoggedIn = computed(() => !!token.value)

  // Postavi token u axios header
  if (token.value) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
  }

  async function login(email: string, password: string) {
    const { data } = await api.post('/api/auth/login', { email, password })

    token.value = data.token
    client.value = data.client

    localStorage.setItem('token', data.token)
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
  }

  // Briše prijavu samo u pregledaču (npr. kad je token istekao, pa ga backend više ne prihvata)
  function clearSession() {
    token.value = null
    client.value = null
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
  }

  async function logout() {
    await api.post('/api/auth/logout')
    clearSession()
  }

  async function fetchMe() {
    if (!token.value) return
    try {
      const { data } = await api.get('/api/auth/me')
      client.value = data
    } catch (e) {
      if (isAxiosError(e) && e.response?.status === 401) clearSession()
    }
  }

  function setSession(newToken: string, newClient: Client) {
    token.value = newToken
    client.value = newClient
    localStorage.setItem('token', newToken)
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
  }

  // Ponovo šalje mejl za potvrdu email adrese (backend odgovara isto i kad nalog ne postoji)
  async function resendVerification(email: string) {
    await api.post('/api/auth/email/resend', { email })
  }

  // Zaboravljena lozinka: backend šalje link na mejl (odgovor je isti i kad nalog ne postoji)
  async function requestPasswordReset(email: string) {
    await api.post('/api/auth/password/forgot', { email })
  }

  async function resetPassword(data: { token: string; email: string; password: string; password_confirmation: string }) {
    await api.post('/api/auth/password/reset', data)
  }

  // Prijava tokenom koji je backend vratio posle Google prijave (korisnika učitavamo posebno)
  async function loginWithToken(newToken: string) {
    token.value = newToken
    localStorage.setItem('token', newToken)
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
    await fetchMe()
  }

  return { client, token, isLoggedIn, login, logout, clearSession, fetchMe, setSession, loginWithToken, resendVerification, requestPasswordReset, resetPassword }
})
