<script setup lang="ts">
import { useLiveRefresh } from '@/composables/useLiveRefresh'
import { useBookingChangeToast } from '@/composables/useBookingChangeToast'
import { bookingChanges } from '@/lib/bookingChanges'
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { InfoIcon } from '@lucide/vue'
import PublicHeader from '@/components/booking/PublicHeader.vue'
import { Button } from '@/components/ui/button'
import { bookingApi } from '@/api/booking'
import type { Booking } from '@/api/booking'
import { loadMyBookingsWithHistory } from '@/lib/myBookings'
import { apiErrorMessage } from '@/lib/apiError'

const { t, locale } = useI18n()

const upcoming = ref<Booking[]>([])
const history = ref<Booking[]>([])
const loading = ref(true)
const asking = ref<string | null>(null)
const busy = ref(false)
const error = ref('')

const jsLocale = computed(() => (locale.value === 'sr' ? 'sr-Latn-RS' : 'en-US'))

function part(b: Booking, opts: Intl.DateTimeFormatOptions) {
  return new Date(`${b.slot.date.slice(0, 10)}T00:00:00`).toLocaleDateString(jsLocale.value, opts).replace('.', '')
}

function when(b: Booking) {
  return `${part(b, { weekday: 'long', day: 'numeric', month: 'short' })} · ${b.start_time.slice(0, 5)}`
}

// Istorija: prošla rezervacija koja nije otkazana je „Završen“
function historyStatus(b: Booking) {
  return b.status === 'pending' || b.status === 'confirmed' ? 'done' : b.status
}

const badge: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
  rejected: 'bg-gray-100 text-gray-600',
  done: 'bg-gray-100 text-gray-600',
}

async function load() {
  try {
    const result = await loadMyBookingsWithHistory()
    upcoming.value = result.upcoming
    history.value = result.history
  } finally {
    loading.value = false
  }
}

onMounted(load)

// Promene koje napravi salon (potvrda, odbijanje, pomeranje) stižu same, uz poruku
const showChanges = useBookingChangeToast()
useLiveRefresh(async () => {
  if (loading.value || busy.value) return
  const before = [...upcoming.value, ...history.value]
  const result = await loadMyBookingsWithHistory()
  upcoming.value = result.upcoming
  history.value = result.history
  showChanges(bookingChanges(before, [...result.upcoming, ...result.history]))
})

async function cancel(b: Booking) {
  busy.value = true
  error.value = ''
  try {
    await bookingApi.cancel(b.token)
    asking.value = null
    await load()
  } catch (e) {
    error.value = apiErrorMessage(e, t('manage.cancelError'))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <PublicHeader>
      <Button as-child>
        <router-link :to="{ name: 'booking' }">{{ t('myBookings.bookNew') }}</router-link>
      </Button>
    </PublicHeader>

    <main class="mx-auto flex max-w-3xl flex-col gap-7 px-4 pt-10 pb-20 sm:px-6">
      <div class="flex flex-col gap-2">
        <h1 class="text-[28px] leading-tight font-semibold sm:text-[32px]">{{ t('myBookings.title') }}</h1>
        <p class="text-gray-600">{{ t('myBookings.subtitle') }}</p>
      </div>

      <div role="note" class="flex items-start gap-3 rounded-xl border border-primary/30 bg-accent px-4 py-3.5 text-sm text-gray-700">
        <InfoIcon class="mt-0.5 size-[18px] flex-none text-primary" aria-hidden="true" />
        <span>{{ t('myBookings.note') }}</span>
      </div>

      <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
      <p v-if="loading" class="text-sm text-muted-foreground">{{ t('common.loading') }}</p>

      <template v-else>
        <section class="flex flex-col gap-3">
          <h2 class="text-xs font-semibold uppercase tracking-[.08em] text-gray-600">{{ t('myBookings.upcoming') }}</h2>

          <article
            v-for="b in upcoming"
            :key="b.token"
            class="flex flex-col gap-4 rounded-xl border border-gray-100 bg-card px-5 py-4 shadow-xs"
            data-testid="my-booking"
          >
            <div class="flex flex-wrap items-center gap-x-5 gap-y-3">
              <div aria-hidden="true" class="flex w-14 flex-none flex-col rounded-[10px] bg-accent py-1.5 text-center leading-tight text-primary">
                <span class="text-xs font-semibold capitalize">{{ part(b, { weekday: 'short' }) }}</span>
                <span class="text-[22px] font-bold">{{ part(b, { day: 'numeric' }) }}</span>
                <span class="text-xs">{{ part(b, { month: 'short' }) }}</span>
              </div>
              <div class="flex min-w-0 flex-[1_1_200px] flex-col gap-0.5">
                <span class="font-semibold">{{ b.service?.name ?? b.slot.worker.name }}</span>
                <span class="text-sm text-gray-600 first-letter:uppercase">
                  {{ when(b) }}<template v-if="b.service"> · {{ b.service.duration_minutes }} min</template>
                </span>
                <span class="text-sm text-gray-600">{{ t('booking.summary.worker') }}: {{ b.slot.worker.name }}</span>
              </div>
              <span class="flex-none rounded-full px-2.5 py-1 text-[13px] font-semibold" :class="badge[b.status]">
                {{ t(`myBookings.status.${b.status}`) }}
              </span>
            </div>

            <div v-if="asking !== b.token" class="flex justify-end gap-2 border-t border-gray-100 pt-3">
              <Button variant="ghost" as-child>
                <router-link :to="{ name: 'manage', params: { token: b.token } }">{{ t('booking.manageLink') }}</router-link>
              </Button>
              <Button variant="outline" class="min-h-11" @click="asking = b.token">{{ t('manage.cancelBtn') }}</Button>
            </div>
            <div v-else role="alert" class="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
              <span class="text-sm font-medium">{{ t('manage.cancelConfirm') }}</span>
              <div class="flex gap-2">
                <Button variant="outline" class="min-h-11" :disabled="busy" @click="asking = null">{{ t('myBookings.keep') }}</Button>
                <Button variant="destructive" class="min-h-11" :disabled="busy" @click="cancel(b)">{{ t('myBookings.confirmCancel') }}</Button>
              </div>
            </div>
          </article>

          <div v-if="upcoming.length === 0" class="flex flex-col items-center gap-3 rounded-xl border border-gray-100 bg-card px-6 py-8 text-center">
            <span class="text-lg font-semibold">{{ t('myBookings.emptyTitle') }}</span>
            <span class="text-sm text-gray-600">{{ t('myBookings.emptyText') }}</span>
            <Button as-child>
              <router-link :to="{ name: 'booking' }">{{ t('myBookings.book') }}</router-link>
            </Button>
          </div>
        </section>

        <section v-if="history.length" class="flex flex-col gap-3">
          <h2 class="text-xs font-semibold uppercase tracking-[.08em] text-gray-600">{{ t('myBookings.history') }}</h2>
          <article
            v-for="b in history"
            :key="b.token"
            class="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-gray-100 bg-card px-5 py-3.5"
          >
            <div class="flex min-w-0 flex-[1_1_200px] flex-col gap-0.5">
              <span class="font-semibold" :class="historyStatus(b) !== 'done' && 'text-gray-500 line-through'">{{ b.service?.name ?? b.slot.worker.name }}</span>
              <span class="text-sm text-gray-600 first-letter:uppercase">{{ when(b) }} · {{ b.slot.worker.name }}</span>
            </div>
            <span class="flex-none rounded-full px-2.5 py-1 text-[13px] font-semibold" :class="badge[historyStatus(b)]">
              {{ t(`myBookings.status.${historyStatus(b)}`) }}
            </span>
          </article>
        </section>
      </template>
    </main>

    <footer class="px-6 pb-8 text-center text-[13px] text-gray-600">{{ t('booking.poweredBy') }}</footer>
  </div>
</template>
