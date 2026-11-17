<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirm } from '@/composables/useConfirm'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import BookingCard from '@/components/admin/BookingCard.vue'
import FilterChips from '@/components/admin/FilterChips.vue'
import { adminApi } from '@/api/admin'
import { useAdminContextStore } from '@/stores/adminContext'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { usePendingBookingsStore } from '@/stores/pendingBookings'
import type { Booking } from '@/api/booking'
import { apiErrorMessage } from '@/lib/apiError'

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'cancelled'

const { t } = useI18n()
const { confirm } = useConfirm()
const auth = useAuthStore()
const adminContext = useAdminContextStore()
const pending = usePendingBookingsStore()

const bookings = ref<Booking[]>([])
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const status = ref<StatusFilter>('all')
const workerId = ref<number>(0)

const tenant = useTenantStore()
const isOwner = computed(() => auth.client?.role !== 'worker')
// Radnik potvrđuje svoje termine samo kad vlasnik tako podesi
const canModerate = computed(
  () => isOwner.value || (auth.client?.client_profile?.confirmation_mode ?? tenant.config?.confirmation_mode) === 'worker',
)

onMounted(fetchBookings)

async function fetchBookings() {
  try {
    const { data } = await adminApi.getBookings(adminContext.selectedClient?.id)
    bookings.value = data
  } catch (e) {
    error.value = apiErrorMessage(e, t('common.error'))
  } finally {
    loading.value = false
  }
}

async function act(action: () => Promise<unknown>) {
  busy.value = true
  error.value = ''
  try {
    await action()
    await fetchBookings()
    void pending.refresh(adminContext.selectedClient?.id)
  } catch (e) {
    error.value = apiErrorMessage(e, t('common.error'))
  } finally {
    busy.value = false
  }
}

async function handleCancel(booking: Booking) {
  if (!(await confirm(t('bookingsView.cancelConfirm', { name: booking.customer_name })))) return
  await act(() => adminApi.cancelBooking(booking.token))
}

// Radnici iz samih rezervacija; filter ima smisla tek kad ih je više
const workerOptions = computed(() => {
  const seen = new Map<number, string>()
  for (const b of bookings.value) seen.set(b.slot.worker.id, b.slot.worker.name)
  return [
    { value: 0, label: t('bookingsView.filterAll') },
    ...[...seen].map(([value, label]) => ({ value, label })),
  ]
})

const statusOptions = computed(() => [
  { value: 'all' as const, label: t('bookingsView.filterAll') },
  { value: 'pending' as const, label: t('bookingsView.filterPending') },
  { value: 'confirmed' as const, label: t('bookingsView.filterActive') },
  { value: 'cancelled' as const, label: t('bookingsView.filterCancelled') },
])

function matchesStatus(b: Booking) {
  if (status.value === 'all') return true
  // Odbijene se prikazuju zajedno sa otkazanim
  if (status.value === 'cancelled') return b.status === 'cancelled' || b.status === 'rejected'
  return b.status === status.value
}

const filtered = computed(() =>
  bookings.value.filter((b) => (workerId.value === 0 || b.slot.worker.id === workerId.value) && matchesStatus(b)),
)

</script>

<template>
  <AdminLayout :title="t('bookingsView.title')">
    <div class="flex flex-col gap-7">
      <div class="flex flex-wrap gap-x-8 gap-y-4">
        <FilterChips v-if="workerOptions.length > 2" v-model="workerId" :label="t('bookingsView.filterWorker')" :options="workerOptions" />
        <FilterChips v-model="status" :label="t('bookingsView.filterStatus')" :options="statusOptions" />
      </div>

      <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

      <div v-if="loading" class="text-sm text-muted-foreground">{{ t('common.loading') }}</div>

      <div v-else class="flex flex-col gap-3">
        <BookingCard
          v-for="booking in filtered"
          :key="booking.id"
          :booking="booking"
          :can-moderate="canModerate"
          :busy="busy"
          @confirm="act(() => adminApi.confirmBooking(booking.token))"
          @reject="act(() => adminApi.rejectBooking(booking.token))"
          @cancel="handleCancel(booking)"
        />

        <div v-if="filtered.length === 0" class="rounded-xl border border-gray-100 bg-card px-6 py-8 text-center text-[15px] text-gray-600">
          {{ t('bookingsView.noBookings') }}
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
