<script setup lang="ts">
import { useLiveRefresh } from '@/composables/useLiveRefresh'
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronLeftIcon, ChevronRightIcon } from '@lucide/vue'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import WeekCalendar from '@/components/admin/WeekCalendar.vue'
import CalendarPanel from '@/components/admin/CalendarPanel.vue'
import FilterChips from '@/components/admin/FilterChips.vue'
import { Button } from '@/components/ui/button'
import { adminApi } from '@/api/admin'
import { slotsApi } from '@/api/slots'
import type { Worker } from '@/api/admin'
import type { Booking, Slot } from '@/api/booking'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { useAdminContextStore } from '@/stores/adminContext'
import { usePendingBookingsStore } from '@/stores/pendingBookings'
import { useConfirm } from '@/composables/useConfirm'
import { apiErrorMessage } from '@/lib/apiError'
import { addDays, buildWeekGrid, startOfWeek, toISODate } from '@/lib/weekCalendar'
import type { GridCell } from '@/lib/weekCalendar'

const { t, locale } = useI18n()
const auth = useAuthStore()
const tenant = useTenantStore()
const adminContext = useAdminContextStore()
const pending = usePendingBookingsStore()
const { confirm } = useConfirm()

const slots = ref<Slot[]>([])
const bookings = ref<Booking[]>([])
const workers = ref<Worker[]>([])
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const monday = ref(startOfWeek(new Date()))
const workerId = ref<number>(0)
const selectedKey = ref<string | null>(null)
const moveOptions = ref<{ value: string; label: string }[]>([])

const jsLocale = computed(() => (locale.value === 'sr' ? 'sr-Latn-RS' : 'en-US'))
const isOwner = computed(() => auth.client?.role !== 'worker')
const mode = computed(() => auth.client?.client_profile?.confirmation_mode ?? tenant.config?.confirmation_mode ?? 'owner')
const canModerate = computed(() => isOwner.value || mode.value === 'worker')
const canEditSlots = computed(() => isOwner.value || !!auth.client?.can_edit_slots)
const canMove = computed(() => isOwner.value || mode.value === 'worker')
const today = toISODate(new Date())

const range = computed(() => ({ from: toISODate(monday.value), to: toISODate(addDays(monday.value, 6)) }))
const grid = computed(() => buildWeekGrid(monday.value, slots.value, bookings.value, workerId.value || null))
const selected = computed<GridCell | null>(
  () => grid.value.days.flatMap((d) => d.cells).find((c) => c.key === selectedKey.value) ?? null,
)
const workerName = computed(() =>
  isOwner.value ? workers.value.find((w) => w.id === workerId.value)?.name ?? '' : auth.client?.name ?? '',
)
const workerOptions = computed(() => workers.value.map((w) => ({ value: w.id, label: w.name })))

const rangeLabel = computed(() => {
  const fmt = (d: Date) => d.toLocaleDateString(jsLocale.value, { day: 'numeric', month: 'short' })
  return `${fmt(monday.value)} – ${fmt(addDays(monday.value, 6))}`
})

async function load() {
  const clientId = adminContext.selectedClient?.id
  const [s, b] = await Promise.all([
    adminApi.getSlots(clientId, range.value),
    adminApi.getBookings(clientId, range.value),
  ])
  slots.value = s.data
  bookings.value = b.data
}

// Nove, potvrđene, otkazane i pomerene rezervacije se pojavljuju same
useLiveRefresh(() => (busy.value ? undefined : load()), { poll: true })

onMounted(async () => {
  try {
    if (isOwner.value) {
      workers.value = (await adminApi.getWorkers(adminContext.selectedClient?.id)).data
      workerId.value = workers.value[0]?.id ?? 0
    } else {
      workerId.value = auth.client?.id ?? 0
    }
    await load()
  } catch (e) {
    error.value = apiErrorMessage(e, t('common.error'))
  } finally {
    loading.value = false
  }
})

async function shiftWeek(weeks: number | null) {
  monday.value = weeks === null ? startOfWeek(new Date()) : addDays(monday.value, weeks * 7)
  selectedKey.value = null
  await act(async () => {})
}

watch(workerId, () => (selectedKey.value = null))

/** Izvršava akciju, pa osvežava nedelju i bedž u meniju. */
async function act(action: () => Promise<unknown>) {
  busy.value = true
  error.value = ''
  try {
    await action()
    await load()
    void pending.refresh(adminContext.selectedClient?.id)
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

const withSlot = (fn: (s: Slot) => Promise<unknown>) => () => {
  const slot = selected.value?.slot
  if (slot) void act(() => fn(slot))
}

const onBlock = withSlot((s) => adminApi.setSlotBlocked(s.id, true))
const onUnblock = withSlot((s) => adminApi.setSlotBlocked(s.id, false))

async function onRemoveSlot() {
  const slot = selected.value?.slot
  if (!slot || !(await confirm(t('slots.deleteConfirm')))) return
  selectedKey.value = null
  await act(() => adminApi.deleteSlot(slot.id))
}

async function onMove(value: string) {
  const booking = selected.value?.booking
  const [slotId, start] = value.split('|')
  if (!booking || !slotId || !start) return
  await act(() => adminApi.rescheduleBooking(booking.token, { slot_id: Number(slotId), start_time: start }))
  selectedKey.value = `b${booking.id}`
}

// Slobodna vremena za uslugu izabrane rezervacije kod istog radnika
watch(
  () => selected.value?.booking?.id,
  async () => {
    moveOptions.value = []
    const booking = selected.value?.booking
    if (!booking?.service || !canMove.value) return
    try {
      const { data } = await slotsApi.getTimes({ service_id: booking.service.id, worker_id: booking.slot.worker_id })
      moveOptions.value = data
        .filter((time) => !(time.date.slice(0, 10) === booking.slot.date.slice(0, 10) && time.start_time.slice(0, 5) === booking.start_time.slice(0, 5)))
        .slice(0, 40)
        .map((time) => ({
          value: `${time.slot_id}|${time.start_time.slice(0, 5)}`,
          label: `${new Date(`${time.date.slice(0, 10)}T00:00:00`).toLocaleDateString(jsLocale.value, { weekday: 'short', day: 'numeric', month: 'short' })} · ${time.start_time.slice(0, 5)}`,
        }))
    } catch {
      moveOptions.value = []
    }
  },
)

const legend = [
  { kind: 'free', class: 'border border-dashed border-gray-400 bg-card' },
  { kind: 'pending', class: 'border border-amber-300 bg-amber-100' },
  { kind: 'confirmed', class: 'border border-green-300 bg-green-100' },
  { kind: 'blocked', class: 'border border-gray-300 bg-gray-200' },
] as const
</script>

<template>
  <AdminLayout :title="t('calendar.title')">
    <div class="flex flex-col gap-5">
      <div class="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
        <FilterChips
          v-if="isOwner && workers.length > 1"
          v-model="workerId"
          :label="t('bookingsView.filterWorker')"
          :options="workerOptions"
        />
        <div class="flex items-center gap-2">
          <Button variant="outline" size="icon" :aria-label="t('calendar.prevWeek')" @click="shiftWeek(-1)"><ChevronLeftIcon /></Button>
          <span class="min-w-36 text-center text-sm font-medium">{{ rangeLabel }}</span>
          <Button variant="outline" size="icon" :aria-label="t('calendar.nextWeek')" @click="shiftWeek(1)"><ChevronRightIcon /></Button>
          <Button variant="outline" @click="shiftWeek(null)">{{ t('calendar.thisWeek') }}</Button>
        </div>
      </div>

      <div class="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-gray-600">
        <span v-for="item in legend" :key="item.kind" class="flex items-center gap-1.5">
          <span aria-hidden="true" class="size-3.5 rounded" :class="item.class" />
          {{ t(`calendar.legend.${item.kind}`) }}
        </span>
      </div>

      <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
      <p v-if="loading" class="text-sm text-muted-foreground">{{ t('common.loading') }}</p>

      <div v-else class="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <WeekCalendar :grid="grid" :selected-key="selectedKey" :today="today" :locale="jsLocale" @select="selectedKey = $event.key" />
        <CalendarPanel
          :cell="selected"
          :worker-name="workerName"
          :can-moderate="canModerate"
          :can-edit-slots="canEditSlots"
          :can-move="canMove"
          :move-options="moveOptions"
          :busy="busy"
          :locale="jsLocale"
          @confirm="onConfirm"
          @reject="onReject"
          @cancel="onCancel"
          @block="onBlock"
          @unblock="onUnblock"
          @remove-slot="onRemoveSlot"
          @move="onMove"
        />
      </div>
    </div>
  </AdminLayout>
</template>
