import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/api/notifications', () => ({ notificationsApi: { getAll: vi.fn<() => unknown>() } }))

import { notificationsApi } from '@/api/notifications'
import { useLiveNotificationsStore } from '@/stores/liveNotifications'

const n = (id: string, read = false) => ({ id, type: 'x', read_at: read ? '2026-11-18' : null, created_at: '', data: {} })

describe('liveNotifications', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('reports only notifications that arrived after the first load', async () => {
    const store = useLiveNotificationsStore()
    vi.mocked(notificationsApi.getAll).mockResolvedValueOnce({ data: [n('a')] } as never)
    expect(await store.load()).toEqual([])

    vi.mocked(notificationsApi.getAll).mockResolvedValueOnce({ data: [n('b'), n('c', true), n('a')] } as never)
    const fresh = await store.load()

    expect(fresh.map((x) => x.id)).toEqual(['b'])
    expect(store.items).toHaveLength(3)
  })
})
