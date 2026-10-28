import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), defaults: { headers: { common: {} as Record<string, string> } } },
}))

import api from '@/api/axios'
import { useAuthStore } from '@/stores/auth'

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  defaults: { headers: { common: Record<string, string> } }
}

const client = {
  id: 1,
  name: 'Salon',
  email: 'salon@example.com',
  role: 'client',
  can_edit_slots: true,
  client_profile: null,
}

describe('auth store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    delete mockedApi.defaults.headers.common['Authorization']
    setActivePinia(createPinia())
  })

  it('is logged out without a stored token', () => {
    expect(useAuthStore().isLoggedIn).toBe(false)
  })

  it('restores the token from localStorage and sets the auth header', () => {
    localStorage.setItem('token', 'abc')
    const auth = useAuthStore()
    expect(auth.isLoggedIn).toBe(true)
    expect(mockedApi.defaults.headers.common['Authorization']).toBe('Bearer abc')
  })

  it('login stores token, client and header', async () => {
    mockedApi.post.mockResolvedValue({ data: { token: 'tok', client } })
    const auth = useAuthStore()

    await auth.login('salon@example.com', 'secret')

    expect(mockedApi.post).toHaveBeenCalledWith('/api/auth/login', { email: 'salon@example.com', password: 'secret' })
    expect(auth.isLoggedIn).toBe(true)
    expect(auth.client).toEqual(client)
    expect(localStorage.getItem('token')).toBe('tok')
    expect(mockedApi.defaults.headers.common['Authorization']).toBe('Bearer tok')
  })

  it('login failure keeps the user logged out', async () => {
    mockedApi.post.mockRejectedValue({ response: { status: 422 } })
    const auth = useAuthStore()

    await expect(auth.login('x@example.com', 'bad')).rejects.toBeTruthy()
    expect(auth.isLoggedIn).toBe(false)
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('logout clears the session', async () => {
    localStorage.setItem('token', 'abc')
    mockedApi.post.mockResolvedValue({})
    const auth = useAuthStore()

    await auth.logout()

    expect(mockedApi.post).toHaveBeenCalledWith('/api/auth/logout')
    expect(auth.isLoggedIn).toBe(false)
    expect(auth.client).toBeNull()
    expect(localStorage.getItem('token')).toBeNull()
    expect(mockedApi.defaults.headers.common['Authorization']).toBeUndefined()
  })

  it('fetchMe does nothing without a token', async () => {
    await useAuthStore().fetchMe()
    expect(mockedApi.get).not.toHaveBeenCalled()
  })

  it('fetchMe loads the current client', async () => {
    localStorage.setItem('token', 'abc')
    mockedApi.get.mockResolvedValue({ data: client })
    const auth = useAuthStore()

    await auth.fetchMe()

    expect(mockedApi.get).toHaveBeenCalledWith('/api/auth/me')
    expect(auth.client).toEqual(client)
  })

  it('fetchMe clears an expired session on 401', async () => {
    localStorage.setItem('token', 'abc')
    mockedApi.get.mockRejectedValue({ response: { status: 401 } })
    const auth = useAuthStore()

    await auth.fetchMe()

    expect(auth.isLoggedIn).toBe(false)
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('fetchMe keeps the session on non-401 errors', async () => {
    localStorage.setItem('token', 'abc')
    mockedApi.get.mockRejectedValue({ response: { status: 500 } })
    const auth = useAuthStore()

    await auth.fetchMe()

    expect(auth.isLoggedIn).toBe(true)
    expect(localStorage.getItem('token')).toBe('abc')
  })

  it('setSession logs in with a provided token (worker invite)', () => {
    const auth = useAuthStore()
    auth.setSession('invite-tok', client)

    expect(auth.isLoggedIn).toBe(true)
    expect(auth.client).toEqual(client)
    expect(localStorage.getItem('token')).toBe('invite-tok')
    expect(mockedApi.defaults.headers.common['Authorization']).toBe('Bearer invite-tok')
  })
})
