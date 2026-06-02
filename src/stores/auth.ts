import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/axios'

interface ClientProfile {
  id: number
  auto_confirm_bookings: boolean
}

interface Client {
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

  async function logout() {
    await api.post('/api/auth/logout')
    token.value = null
    client.value = null
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
  }

  async function fetchMe() {
    if (!token.value) return
    try {
      const { data } = await api.get('/api/auth/me')
      client.value = data
    } catch (e: any) {
      if (e.response?.status === 401) {
        token.value = null
        client.value = null
        localStorage.removeItem('token')
        delete api.defaults.headers.common['Authorization']
      }
    }
  }

  function setSession(newToken: string, newClient: Client) {
    token.value = newToken
    client.value = newClient
    localStorage.setItem('token', newToken)
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
  }

  return { client, token, isLoggedIn, login, logout, fetchMe, setSession }
})
