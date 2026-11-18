import { computed, ref } from 'vue'

/** Chrome/Edge/Android: događaj koji omogućava naše dugme „Instaliraj“. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)

/** Pregledač nudi instalaciju i možemo da je pokrenemo dugmetom. */
export const canPromptInstall = computed(() => deferredPrompt.value !== null)

/**
 * Manifest daje API (naziv i boja firme), jer je frontend jedan build za sve firme.
 * Mora da se doda pre nego što pregledač proceni da li se sajt može instalirati.
 */
export function addManifestLink(apiUrl: string, origin: string = window.location.origin) {
  if (document.querySelector('link[rel="manifest"]')) return
  const link = document.createElement('link')
  link.rel = 'manifest'
  link.href = `${apiUrl.replace(/\/$/, '')}/api/tenant/manifest?origin=${encodeURIComponent(origin)}`
  document.head.appendChild(link)
}

/** Boja trake pregledača i instalirane aplikacije prati boju firme. */
export function setThemeColor(color: string) {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  meta.content = color
}

/** Hvata ponudu za instalaciju (stiže pre nego što se prikaže bilo koja strana) da bi je ponudilo naše dugme. */
export function listenForInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt.value = event as BeforeInstallPromptEvent
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt.value = null
  })
}

/** Otvara sistemski prozor za instalaciju; true ako je korisnik prihvatio. */
export async function promptInstall(): Promise<boolean> {
  const event = deferredPrompt.value
  if (!event) return false
  deferredPrompt.value = null
  await event.prompt()
  return (await event.userChoice).outcome === 'accepted'
}
