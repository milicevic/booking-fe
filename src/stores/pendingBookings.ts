import { defineStore } from 'pinia'
import { ref } from 'vue'
import { adminApi } from '@/api/admin'
import { toISODate } from '@/lib/weekCalendar'

/**
 * Broj budućih rezervacija koje čekaju potvrdu (bedž na „Termini“ u meniju).
 * AdminLayout ga osvežava pri otvaranju stranice, a ekrani koji potvrđuju ili odbijaju posle akcije.
 */
export const usePendingBookingsStore = defineStore('pendingBookings', () => {
  const count = ref(0)

  async function refresh(clientId?: number) {
    try {
      const today = toISODate(new Date())
      const { data } = await adminApi.getBookings(clientId)
      count.value = data.filter((b) => b.status === 'pending' && b.slot.date.slice(0, 10) >= today).length
    } catch {
      // Bedž nije bitan za rad stranice; greška se prikazuje tamo gde se rezervacije zaista učitavaju
    }
  }

  return { count, refresh }
})
