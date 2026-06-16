<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConfirm } from '@/composables/useConfirm'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import { adminApi } from '@/api/admin'
import { useAdminContextStore } from '@/stores/adminContext'
import type { Booking } from '@/api/booking'

const { t, locale } = useI18n()
const { confirm } = useConfirm()
const adminContext = useAdminContextStore()
const bookings = ref<Booking[]>([])
const loading = ref(true)
const filter = ref<'all' | 'confirmed' | 'pending' | 'cancelled'>('all')

onMounted(async () => {
  await fetchBookings()
})

async function fetchBookings() {
  loading.value = true
  try {
    const { data } = await adminApi.getBookings(adminContext.selectedClient?.id)
    bookings.value = data
  } finally {
    loading.value = false
  }
}

async function handleCancel(booking: Booking) {
  if (!await confirm(t('bookingsView.cancelConfirm', { name: booking.customer_name }))) return
  await adminApi.cancelBooking(booking.token)
  await fetchBookings()
}

function bookingStatusLabel(status: string) {
  if (status === 'confirmed') return t('bookingsView.statusActive')
  if (status === 'cancelled') return t('bookingsView.statusCancelled')
  return t('bookingsView.statusPending')
}

function bookingStatusClass(status: string) {
  if (status === 'confirmed') return 'bg-green-100 text-green-700'
  if (status === 'cancelled') return 'bg-red-100 text-red-700'
  return 'bg-yellow-100 text-yellow-700'
}

const filtered = computed(() => {
  if (filter.value === 'all') return bookings.value
  return bookings.value.filter(b => b.status === filter.value)
})

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(locale.value === 'sr' ? 'sr-RS' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
</script>

<template>
  <AdminLayout>
    <h1 class="text-xl font-semibold text-gray-900 mb-6">{{ t('bookingsView.title') }}</h1>

    <div class="flex gap-2 mb-6">
      <button
        v-for="f in ['all', 'confirmed', 'pending', 'cancelled']"
        :key="f"
        @click="filter = f as any"
        :class="filter === f
          ? 'bg-indigo-600 text-white'
          : 'bg-white text-gray-500 border border-gray-200'"
        class="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        {{ f === 'all' ? t('bookingsView.filterAll') : f === 'confirmed' ? t('bookingsView.filterActive') : f === 'pending' ? t('bookingsView.filterPending') : t('bookingsView.filterCancelled') }}
      </button>
    </div>

    <div v-if="loading" class="text-gray-400 text-sm">{{ t('common.loading') }}</div>

    <div v-else class="space-y-2">
      <div
        v-for="booking in filtered"
        :key="booking.id"
        class="bg-white rounded-xl border border-gray-100 p-4"
      >
        <div class="flex items-start justify-between mb-2">
          <div>
            <p class="text-sm font-medium text-gray-900">{{ booking.customer_name }}</p>
            <p class="text-xs text-gray-400 mt-0.5">
              {{ booking.customer_phone ?? booking.customer_email ?? '—' }}
            </p>
          </div>
          <span
            :class="bookingStatusClass(booking.status)"
            class="text-xs font-medium px-2.5 py-1 rounded-full shrink-0"
          >
            {{ bookingStatusLabel(booking.status) }}
          </span>
        </div>

        <div class="text-xs text-gray-500 space-y-0.5">
          <p>{{ booking.slot.worker.name }} · {{ formatDate(booking.slot.date) }} · {{ booking.slot.start_time.slice(0, 5) }}</p>
          <p v-if="booking.note" class="text-gray-400 italic">{{ booking.note }}</p>
        </div>

        <button
          v-if="booking.status === 'confirmed'"
          @click="handleCancel(booking)"
          class="mt-3 text-xs text-red-500 hover:text-red-700 transition-colors"
        >
          {{ t('bookingsView.cancelBtn') }}
        </button>
      </div>

      <div v-if="filtered.length === 0" class="text-center py-8 text-gray-400 text-sm">
        {{ t('bookingsView.noBookings') }}
      </div>
    </div>
  </AdminLayout>
</template>
