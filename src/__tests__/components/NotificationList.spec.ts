import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { i18n } from '@/i18n'
import { createTestRouter } from '../helpers'

vi.mock('@/api/notifications', () => ({
  notificationsApi: { getAll: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn() },
}))

import { notificationsApi } from '@/api/notifications'
import type { Notification } from '@/api/notifications'
import NotificationList from '@/components/NotificationList.vue'

const api = notificationsApi as unknown as Record<keyof typeof notificationsApi, ReturnType<typeof vi.fn>>

function notification(id: string, overrides: Partial<Notification> = {}): Notification {
  return {
    id,
    type: 'App\\Notifications\\BookingPending',
    data: {
      type: 'booking_pending',
      booking_token: `tok-${id}`,
      customer_name: 'Ana',
      worker_name: 'Marko',
      service_name: 'Haircut',
      date: '2026-11-03',
      start_time: '10:00:00',
    },
    read_at: null,
    created_at: '2026-11-01T10:00:00Z',
    ...overrides,
  }
}

async function mountList(items: Notification[]) {
  api.getAll.mockResolvedValue({ data: items })
  const router = createTestRouter()
  router.push('/admin')
  await router.isReady()
  const wrapper = mount(NotificationList, { global: { plugins: [i18n, router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('NotificationList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.markRead.mockResolvedValue({})
    api.markAllRead.mockResolvedValue({})
  })

  it('renders nothing when there are no notifications', async () => {
    const { wrapper } = await mountList([])
    expect(wrapper.text()).toBe('')
  })

  it('renders notifications with unread count', async () => {
    const { wrapper } = await mountList([
      notification('1'),
      notification('2', { read_at: '2026-11-01T11:00:00Z', data: { ...notification('2').data, type: 'booking_confirmed' } }),
    ])
    const text = wrapper.text()
    expect(text).toContain('New booking request from Ana')
    expect(text).toContain('Booking confirmed for Ana')
    expect(text).toContain('10:00')
    expect(text).toContain('Marko')
    expect(text).toContain('Haircut')
    expect(wrapper.find('span.rounded-full').text()).toBe('1')
  })

  it('marks a notification read and opens the booking', async () => {
    const { wrapper, router } = await mountList([notification('1')])

    await wrapper.find('.cursor-pointer').trigger('click')
    await flushPromises()

    expect(api.markRead).toHaveBeenCalledWith('1')
    expect(router.currentRoute.value.name).toBe('manage')
    expect(router.currentRoute.value.params.token).toBe('tok-1')
  })

  it('does not re-mark an already read notification', async () => {
    const { wrapper } = await mountList([notification('1', { read_at: '2026-11-01T11:00:00Z' })])
    await wrapper.find('.cursor-default').trigger('click')
    expect(api.markRead).not.toHaveBeenCalled()
  })

  it('marks all as read', async () => {
    const { wrapper } = await mountList([notification('1'), notification('2')])

    const btn = wrapper.findAll('button').find((b) => b.text() === 'Mark all as read')!
    await btn.trigger('click')
    await flushPromises()

    expect(api.markAllRead).toHaveBeenCalledOnce()
    expect(wrapper.findAll('button').some((b) => b.text() === 'Mark all as read')).toBe(false)
  })
})
