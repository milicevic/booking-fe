<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronLeftIcon, ChevronRightIcon } from '@lucide/vue'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import WeekCalendar from '@/components/admin/WeekCalendar.vue'
import CalendarPanel from '@/components/admin/CalendarPanel.vue'
import { Button } from '@/components/ui/button'
import { adminApi } from '@/api/admin'
import type { Worker } from '@/api/admin'
import type { Booking, Slot } from '@/api/booking'
import { useAuthStore } from '@/stores/auth'
import { useAdminContextStore } from '@/stores/adminContext'
import { useConfirm } from '@/composables/useConfirm'
import { apiErrorMessage } from '@/lib/apiError'
import { addDays, buildWeek, startOfWeek, toISODate } from '@/lib/weekCalendar'
import type { WeekBlock } from '@/lib/weekCalendar'

const { t, locale } = useI18n()
const auth = useAuthStore()
const adminContext = useAdminContextStore()
const { confirm } = useConfirm()

const slots = ref<Slot[]>([])
const bookings = ref<Booking[]>([])
const workers = ref<Worker[]>([])
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const monday = ref(startOfWeek(new Date()))
const workerId = ref<number | null>(null)
const selectedKey = ref<string | null>(null)

const jsLocale = computed(() => (locale.value === 'sr' ? 'sr-Latn-RS' : 'en-US'))
const isOwner = computed(() => auth.client?.role !== 'worker')
const today = toISODate(new Date())

const days = computed(() => buildWeek(monday.value, slots.value, bookings.value, workerId.value))
const selected = computed<WeekBlock | null>(
  () => days.value.flatMap((d) => d.blocks).find((b) => b.key === selectedKey.value) ?? null,
)
const rangeLabel = computed(() => {
  const fmt = (d: Date) => d.toLocaleDateString(jsLocale.value, { day: 'numeric', month: 'short' })
  return `${fmt(monday.value)} – ${fmt(addDays(monday.value, 6))}`
})

async function load() {
  const clientId = adminContext.selectedClient?.id
  const [s, b] = await Promise.all([adminApi.getSlots(clientId), adminApi.getBookings(clientId)])
  slots.value = s.data
  bookings.value = b.data
}

onMounted(async () => {
  try {
    await load()
    if (isOwner.value) {
      workers.value = (await adminApi.getWorkers(adminContext.selectedClient?.id)).data
      // Mreža prikazuje jednog radnika po jednog, da se termini različitih radnika ne preklapaju
      workerId.value = workers.value[0]?.id ?? null
    }
  } catch (e) {
    error.value = apiErrorMessage(e, t('common.error'))
  } finally {
    loading.value = false
  }
})

function shiftWeek(weeks: number) {
  monday.value = addDays(monday.value, weeks * 7)
  selectedKey.value = null
}

/** Izvršava akciju nad izabranim blokom, pa osveži podatke. */
async function act(action: () => Promise<unknown>) {
  busy.value = true
  error.value = ''
  try {
    await action()
    await load()
  } catch (e) {
    error.value = apiErrorMessage(e, t('common.error'))
  } finally {
    busy.value = false
  }
}

const withBooking = (fn: (b: Booking) => Promise<unknown>) => () => {
  const booking = selected.value?.booking
  if (booking) void act(() => fn(booking))
}

const onConfirm = withBooking((b) => adminApi.confirmBooking(b.token))
const onReject = withBooking((b) => adminApi.rejectBooking(b.token))
const onCancel = withBooking(async (b) => {
  if (await confirm(t('bookingsView.cancelConfirm', { name: b.customer_name }))) await adminApi.cancelBooking(b.token)
})

async function onRemoveSlot() {
  const block = selected.value
  if (!block || !(await confirm(t('slots.deleteConfirm')))) return
  selectedKey.value = null
  await act(() => adminApi.deleteSlot(block.slot.id))
}
</script>

<template>
  <AdminLayout>
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-xl font-semibold">{{ t('calendar.title') }}</h1>
      <div class="flex items-center gap-2">
        <Button variant="outline" size="icon" :aria-label="t('calendar.prevWeek')" @click="shiftWeek(-1)"><ChevronLeftIcon /></Button>
        <span class="min-w-36 text-center text-sm font-medium">{{ rangeLabel }}</span>
        <Button variant="outline" size="icon" :aria-label="t('calendar.nextWeek')" @click="shiftWeek(1)"><ChevronRightIcon /></Button>
        <Button variant="outline" @click="monday = startOfWeek(new Date()); selectedKey = null">{{ t('calendar.thisWeek') }}</Button>
      </div>
    </div>

    <div v-if="isOwner && workers.length > 0" class="mb-4 flex flex-wrap items-center gap-2" role="group" :aria-label="t('slots.worker')">
      <Button
        v-for="w in workers"
        :key="w.id"
        :variant="workerId === w.id ? 'default' : 'outline'"
        size="sm"
        :aria-pressed="workerId === w.id"
        @click="workerId = w.id; selectedKey = null"
      >
        {{ w.name }}
      </Button>
    </div>

    <p v-if="error" class="mb-4 text-sm text-destructive" role="alert">{{ error }}</p>
    <p v-if="loading" class="text-sm text-muted-foreground">{{ t('common.loading') }}</p>

    <div v-else class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <WeekCalendar :days="days" :selected-key="selectedKey" :today="today" :locale="jsLocale" @select="selectedKey = $event.key" />
      <CalendarPanel
        :block="selected"
        :can-moderate="isOwner"
        :busy="busy"
        :locale="jsLocale"
        @confirm="onConfirm"
        @reject="onReject"
        @cancel="onCancel"
        @remove-slot="onRemoveSlot"
      />
    </div>
  </AdminLayout>
</template>
