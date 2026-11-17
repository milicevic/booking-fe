<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { adminApi } from '@/api/admin'
import type { Booking } from '@/api/booking'
import { apiErrorMessage } from '@/lib/apiError'
import { toISODate } from '@/lib/weekCalendar'
import { Button } from '@/components/ui/button'
import BookingRow from './BookingRow.vue'
import { usePendingBookingsStore } from '@/stores/pendingBookings'

const props = defineProps<{
  /** Admin platforme koji je otvorio klijenta */
  clientId?: number
  workersCount: number
  siteUrl: string
}>()

const { t, locale } = useI18n()
const pending = usePendingBookingsStore()
const bookings = ref<Booking[]>([])
const busy = ref(false)
const error = ref('')
const today = toISODate(new Date())

const jsLocale = computed(() => (locale.value === 'sr' ? 'sr-Latn-RS' : 'en-US'))

async function load() {
  try {
    bookings.value = (await adminApi.getBookings(props.clientId)).data
  } catch (e) {
    error.value = apiErrorMessage(e, t('common.error'))
  }
}

onMounted(load)

const byTime = (a: Booking, b: Booking) =>
  a.slot.date.localeCompare(b.slot.date) || a.start_time.localeCompare(b.start_time)

const active = computed(() => bookings.value.filter((b) => b.status === 'pending' || b.status === 'confirmed'))
const todayList = computed(() => active.value.filter((b) => b.slot.date.slice(0, 10) === today).sort(byTime))
const pendingList = computed(() =>
  bookings.value.filter((b) => b.status === 'pending' && b.slot.date.slice(0, 10) >= today).sort(byTime),
)

const stats = computed(() => [
  { value: todayList.value.length, label: t('dashboard.overview.today') },
  { value: pendingList.value.length, label: t('dashboard.overview.pending') },
  { value: active.value.filter((b) => b.status === 'confirmed').length, label: t('dashboard.overview.confirmed') },
  { value: props.workersCount, label: t('dashboard.overview.workers') },
])

function when(b: Booking) {
  const day = new Date(b.slot.date.slice(0, 10) + 'T00:00:00').toLocaleDateString(jsLocale.value, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  return `${day} ${b.start_time.slice(0, 5)}`
}

async function act(action: () => Promise<unknown>) {
  busy.value = true
  error.value = ''
  try {
    await action()
    await load()
    void pending.refresh(props.clientId)
  } catch (e) {
    error.value = apiErrorMessage(e, t('common.error'))
  } finally {
    busy.value = false
  }
}

const siteHost = computed(() => props.siteUrl.replace(/^https?:\/\//, ''))
</script>

<template>
  <div class="mb-8 flex flex-col gap-6">
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div v-for="stat in stats" :key="stat.label" class="flex flex-col rounded-xl border border-gray-100 bg-card px-5 py-4">
        <span class="text-[28px] leading-tight font-semibold">{{ stat.value }}</span>
        <span class="text-sm text-gray-600">{{ stat.label }}</span>
      </div>
    </div>

    <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

    <div class="grid items-start gap-6 lg:grid-cols-2">
      <section class="flex flex-col gap-3 rounded-xl border border-gray-100 bg-card p-5">
        <h2 class="text-xs font-semibold uppercase tracking-[.08em] text-gray-600">{{ t('dashboard.overview.todayTitle') }}</h2>
        <BookingRow v-for="b in todayList" :key="b.id" :booking="b" :when="b.start_time.slice(0, 5)" />
        <p v-if="todayList.length === 0" class="text-sm text-gray-600">{{ t('dashboard.overview.noToday') }}</p>
      </section>

      <section class="flex flex-col gap-3 rounded-xl border border-gray-100 bg-card p-5">
        <h2 class="text-xs font-semibold uppercase tracking-[.08em] text-gray-600">{{ t('dashboard.overview.pendingTitle') }}</h2>
        <div
          v-for="b in pendingList"
          :key="b.id"
          class="flex flex-wrap items-center gap-x-3.5 gap-y-2 border-t border-gray-100 py-2.5"
        >
          <div class="flex min-w-0 flex-[1_1_140px] flex-col leading-snug">
            <span class="text-[15px] font-medium">{{ b.customer_name }}</span>
            <span class="text-[13px] text-gray-600">{{ when(b) }} · {{ b.service?.name ?? '—' }} · {{ b.slot.worker.name }}</span>
          </div>
          <div class="flex flex-none gap-2">
            <Button :disabled="busy" @click="act(() => adminApi.confirmBooking(b.token))">{{ t('common.confirm') }}</Button>
            <Button variant="outline" :disabled="busy" @click="act(() => adminApi.rejectBooking(b.token))">{{ t('calendar.panel.reject') }}</Button>
          </div>
        </div>
        <p v-if="pendingList.length === 0" class="text-sm text-gray-600">{{ t('dashboard.overview.noPending') }}</p>
      </section>
    </div>

    <section
      v-if="siteUrl"
      class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border border-gray-100 bg-card p-5"
    >
      <div class="flex min-w-0 flex-col gap-0.5">
        <span class="text-xs font-semibold uppercase tracking-[.08em] text-gray-600">{{ t('dashboard.site.title') }}</span>
        <span class="font-semibold break-all">{{ siteHost }}</span>
      </div>
      <Button as-child>
        <a :href="siteUrl" target="_blank" rel="noopener">{{ t('dashboard.site.open') }}</a>
      </Button>
    </section>
  </div>
</template>
