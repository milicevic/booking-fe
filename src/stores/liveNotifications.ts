import { defineStore } from 'pinia'
import { ref } from 'vue'
import { notificationsApi } from '@/api/notifications'
import type { Notification } from '@/api/notifications'

/**
 * Obaveštenja prijavljenog vlasnika ili radnika (nova rezervacija, automatski potvrđena…).
 * AdminLayout ih proverava dok je admin otvoren (useLiveRefresh), a nova se prikazuju kao poruka.
 */
export const useLiveNotificationsStore = defineStore('liveNotifications', () => {
  const items = ref<Notification[]>([])
  const loaded = ref(false)
  let seen = new Set<string>()

  /** Učitava obaveštenja; vraća nepročitana koja nisu postojala pri prethodnom učitavanju. */
  async function load(): Promise<Notification[]> {
    const { data } = await notificationsApi.getAll()
    const fresh = loaded.value ? data.filter((n) => !n.read_at && !seen.has(n.id)) : []
    seen = new Set(data.map((n) => n.id))
    items.value = data
    loaded.value = true
    return fresh
  }

  return { items, loaded, load }
})
