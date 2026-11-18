import { onMounted, onUnmounted } from 'vue'

/** Koliko često otvorena stranica proverava promene dok je vidljiva. */
export const LIVE_REFRESH_MS = 30_000

/**
 * Osvežava podatke otvorene stranice bez ponovnog učitavanja:
 * - odmah kad se korisnik vrati na karticu;
 * - odmah kad stigne push obaveštenje (service worker javlja otvorenim karticama, public/sw.js);
 * - uz `poll: true` i periodično, dok je kartica vidljiva. Periodično proveravaju samo vlasnik i radnik
 *   (admin); stranice kupca se osvežavaju samo na povratak i na push.
 */
export function useLiveRefresh(refresh: () => unknown, { poll = false, intervalMs = LIVE_REFRESH_MS } = {}) {
  let timer: ReturnType<typeof setInterval> | undefined
  let running = false

  async function run() {
    if (running || document.visibilityState === 'hidden') return
    running = true
    try {
      await refresh()
    } catch {
      // Sledeći krug pokušava ponovo; greške prikazuje prvo učitavanje stranice
    } finally {
      running = false
    }
  }

  const onVisibility = () => {
    if (document.visibilityState === 'visible') void run()
  }
  const onWorkerMessage = (event: MessageEvent) => {
    if ((event.data as { type?: string } | null)?.type === 'push') void run()
  }

  onMounted(() => {
    if (poll) timer = setInterval(run, intervalMs)
    document.addEventListener('visibilitychange', onVisibility)
    navigator.serviceWorker?.addEventListener('message', onWorkerMessage)
  })

  onUnmounted(() => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisibility)
    navigator.serviceWorker?.removeEventListener('message', onWorkerMessage)
  })

  return { refreshNow: run }
}
