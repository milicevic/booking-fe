import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
import type { BookingChange } from '@/lib/bookingChanges'

/** Poruka kupcu kad salon potvrdi, odbije, otkaže ili pomeri rezervaciju dok je stranica otvorena. */
export function useBookingChangeToast() {
  const { t, locale } = useI18n()
  const toast = useToast()

  return (changes: BookingChange[]) => {
    for (const change of changes) {
      const date = new Date(`${change.params.date}T00:00:00`).toLocaleDateString(locale.value === 'sr' ? 'sr-Latn-RS' : 'en-US', {
        day: 'numeric',
        month: 'long',
      })
      const message = t(change.key, { date, time: change.params.time })
      if (change.key === 'live.status.confirmed') toast.success(message, 8000)
      else toast.info(message, 8000)
    }
  }
}
