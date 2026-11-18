import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('@/api/axios', () => ({ default: { get: vi.fn<(...args: unknown[]) => unknown>() } }))

import api from '@/api/axios'
import { createSubscription, isIos, pushNeedsInstall, PushPermissionDeniedError, urlBase64ToUint8Array } from '@/lib/push'

function stubBrowser({ permission, existing = null }: { permission: NotificationPermission; existing?: unknown }) {
  const subscribe = vi.fn<(...args: unknown[]) => unknown>().mockResolvedValue({
    toJSON: () => ({ endpoint: 'https://push.example/new', keys: { p256dh: 'p', auth: 'a' } }),
  })
  const registration = { pushManager: { getSubscription: vi.fn<() => unknown>().mockResolvedValue(existing), subscribe } }
  vi.stubGlobal('Notification', { requestPermission: vi.fn<() => Promise<NotificationPermission>>().mockResolvedValue(permission) })
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { register: vi.fn<() => Promise<unknown>>().mockResolvedValue({}), ready: Promise.resolve(registration) },
  })
  return { subscribe }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('push', () => {
  it('decodes the VAPID key', () => {
    expect([...urlBase64ToUint8Array('AQID-_8')]).toEqual([1, 2, 3, 251, 255])
  })

  it('subscribes with the VAPID key after permission is granted', async () => {
    const { subscribe } = stubBrowser({ permission: 'granted' })
    vi.mocked(api.get).mockResolvedValue({ data: { vapid_public_key: 'AQID' } })

    const keys = await createSubscription()

    expect(api.get).toHaveBeenCalledWith('/api/push/vapid-public-key')
    expect(subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }))
    expect(keys).toEqual({ endpoint: 'https://push.example/new', keys: { p256dh: 'p', auth: 'a' } })
  })

  it('reuses an existing subscription of this device', async () => {
    const { subscribe } = stubBrowser({
      permission: 'granted',
      existing: { toJSON: () => ({ endpoint: 'https://push.example/old', keys: { p256dh: 'x', auth: 'y' } }) },
    })

    expect((await createSubscription()).endpoint).toBe('https://push.example/old')
    expect(subscribe).not.toHaveBeenCalled()
  })

  it('reports a denied permission', async () => {
    stubBrowser({ permission: 'denied' })
    await expect(createSubscription()).rejects.toBeInstanceOf(PushPermissionDeniedError)
  })

  it('needs installation on iPhone outside the home screen app', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')
    expect(isIos()).toBe(true)
    expect(pushNeedsInstall()).toBe(true)
  })
})
