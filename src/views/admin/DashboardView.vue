<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import { adminApi } from '@/api/admin'
import type { Booking } from '@/api/booking'

const bookings = ref<Booking[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const { data } = await adminApi.getBookings()
    bookings.value = data
  } finally {
    loading.value = false
  }
})

const confirmed = computed(() =>
  bookings.value.filter(b => b.status === 'confirmed').length
)
const cancelled = computed(() =>
  bookings.value.filter(b => b.status === 'cancelled').length
)
const today = computed(() => {
  const todayStr = new Date().toISOString().slice(0, 10)
  return bookings.value.filter(b =>
    b.slot.date === todayStr && b.status === 'confirmed'
  ).length
})

const recent = computed(() =>
  [...bookings.value]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5)
)

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('sr-RS', {
    day: 'numeric',
    month: 'short',
  })
}
</script>

<template>
  <AdminLayout>
    <h1 class="text-xl font-semibold text-gray-900 mb-6">Pregled</h1>

    <div v-if="loading" class="text-gray-400">Učitavanje...</div>

    <template v-else>
      <!-- Stats -->
      <div class="grid grid-cols-3 gap-3 mb-8">
        <div class="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p class="text-2xl font-semibold text-gray-900">{{ today }}</p>
          <p class="text-xs text-gray-500 mt-0.5">Danas</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p class="text-2xl font-semibold text-green-600">{{ confirmed }}</p>
          <p class="text-xs text-gray-500 mt-0.5">Aktivnih</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p class="text-2xl font-semibold text-red-500">{{ cancelled }}</p>
          <p class="text-xs text-gray-500 mt-0.5">Otkazanih</p>
        </div>
      </div>

      <!-- Poslednje rezervacije -->
      <h2 class="text-sm font-medium text-gray-500 mb-3">Poslednje rezervacije</h2>
      <div class="space-y-2">
        <div
          v-for="booking in recent"
          :key="booking.id"
          class="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between"
        >
          <div>
            <p class="text-sm font-medium text-gray-900">{{ booking.customer_name }}</p>
            <p class="text-xs text-gray-400 mt-0.5">
              {{ booking.slot.worker.name }} ·
              {{ formatDate(booking.slot.date) }} ·
              {{ booking.slot.start_time.slice(0, 5) }}
            </p>
          </div>
          <span
            :class="booking.status === 'confirmed'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'"
            class="text-xs font-medium px-2.5 py-1 rounded-full"
          >
            {{ booking.status === 'confirmed' ? 'Aktivna' : 'Otkazana' }}
          </span>
        </div>

        <div v-if="recent.length === 0" class="text-center py-8 text-gray-400 text-sm">
          Još nema rezervacija
        </div>
      </div>
    </template>
  </AdminLayout>
</template>
