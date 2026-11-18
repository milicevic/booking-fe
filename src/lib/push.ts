import api from '@/api/axios'

/** Pretplata pregledača u obliku koji prima API (POST /api/push/subscriptions, /bookings/{token}/push-subscription). */
export interface PushKeys {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

/** Korisnik je u pregledaču zabranio obaveštenja; ponovo ih dozvoljava samo u podešavanjima sajta. */
export class PushPermissionDeniedError extends Error {}

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function isIos(): boolean {
  const ua = navigator.userAgent
  // iPadOS se predstavlja kao Mac, ali ima ekran na dodir
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
}

/** Sajt je otvoren kao instalirana aplikacija (sa početnog ekrana), a ne u kartici pregledača. */
export function isStandalone(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return iosStandalone || window.matchMedia?.('(display-mode: standalone)').matches === true
}

/** Na iPhone-u/iPad-u push radi samo kad je sajt dodat na početni ekran (iOS 16.4+). */
export function pushNeedsInstall(): boolean {
  return isIos() && !isStandalone()
}

export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

async function registration(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register('/sw.js')
  return navigator.serviceWorker.ready
}

/** Postojeća pretplata ovog uređaja, ako je ima. */
export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  return (await registration()).pushManager.getSubscription()
}

export function toKeys(subscription: PushSubscription): PushKeys {
  return subscription.toJSON() as PushKeys
}

/** Traži dozvolu i pravi (ili vraća postojeću) pretplatu ovog uređaja. */
export async function createSubscription(): Promise<PushKeys> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new PushPermissionDeniedError('denied')

  const reg = await registration()
  const existing = await reg.pushManager.getSubscription()
  if (existing) return toKeys(existing)

  const { data } = await api.get<{ vapid_public_key: string }>('/api/push/vapid-public-key')
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(data.vapid_public_key),
  })
  return toKeys(subscription)
}
