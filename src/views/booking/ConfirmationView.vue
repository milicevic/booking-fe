<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { bookingApi } from '@/api/booking'
import type { Booking } from '@/api/booking'

const route = useRoute()
const router = useRouter()

const booking = ref<Booking | null>(null)
const loading = ref(true)

onMounted(async () => {
  const token = route.query.token as string
  if (!token) {
    router.push({ name: 'booking' })
    return
  }

  try {
    const { data } = await bookingApi.getByToken(token)
    booking.value = data
  } finally {
    loading.value = false
  }
})

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('sr-RS', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-8 text-center">

      <div v-if="loading" class="text-gray-400">Učitavanje...</div>

      <template v-else-if="booking">
        <div class="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
        </div>

        <h1 class="text-xl font-semibold text-gray-900 mb-1">Rezervacija potvrđena!</h1>
        <p class="text-gray-500 text-sm mb-6">
          Detalji su poslati na vaš {{ booking.customer_email ? 'email' : 'telefon' }}
        </p>

        <div class="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-6">
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Radnik</span>
            <span class="font-medium text-gray-900">{{ booking.slot.worker.name }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Datum</span>
            <span class="font-medium text-gray-900 capitalize">{{ formatDate(booking.slot.date) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Vreme</span>
            <span class="font-medium text-gray-900">
              {{ booking.slot.start_time.slice(0, 5) }} — {{ booking.slot.end_time.slice(0, 5) }}
            </span>
          </div>
        </div>

        <router-link
          :to="{ name: 'manage', params: { token: booking.token } }"
          class="text-sm text-indigo-600 hover:text-indigo-700"
        >
          Upravljaj rezervacijom →
        </router-link>
      </template>
    </div>
  </div>
</template>
