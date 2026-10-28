import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), defaults: { headers: { common: {} } } },
}))

import router from '@/router'

describe('router auth guard', () => {
  beforeEach(async () => {
    localStorage.clear()
    setActivePinia(createPinia())
    await router.replace('/admin/login')
  })

  it.each(['/admin', '/admin/workers', '/admin/slots', '/admin/bookings', '/admin/services', '/admin/branding'])(
    'redirects %s to login when logged out',
    async (path) => {
      await router.push(path)
      expect(router.currentRoute.value.name).toBe('login')
    },
  )

  it('allows admin routes when logged in', async () => {
    localStorage.setItem('token', 'abc')
    setActivePinia(createPinia())
    await router.push('/admin/workers')
    expect(router.currentRoute.value.name).toBe('workers')
  })

  it.each([
    ['/', 'booking'],
    ['/register', 'register'],
    ['/invite/xyz', 'worker-invite'],
    ['/manage/xyz', 'manage'],
  ])('public route %s needs no auth', async (path, name) => {
    await router.push(path)
    expect(router.currentRoute.value.name).toBe(name)
  })
})
