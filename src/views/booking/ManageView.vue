<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { bookingApi } from '@/api/booking'
import type { Booking } from '@/api/booking'

const route = useRoute()
const router = useRouter()

const booking = ref<Booking | null>(null)
const loading = ref(true)
const cancelling = ref(false)
const error = ref('')

onMounted(async () => {
  try {
    const { data } = await bookingApi.getByToken(route.params.token as string)
    booking.value = data
  } catch {
    error.value = 'Rezervacija nije pronađena'
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

async function handleCancel() {
  if (!booking.value) return
  if (!confirm('Da li ste sigurni da želite da otkažete rezervaciju?')) return

  cancelling.value = true
  try {
    await bookingApi.cancel(booking.value.token)
    booking.value.status = 'cancelled'
  } catch {
    error.value = 'Greška pri otkazivanju'
  } finally {
    cancelling.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-8">

      <div v-if="loading" class="text-center text-gray-400">Učitavanje...</div>

      <div v-else-if="error" class="text-center text-red-500">{{ error }}</div>

      <template v-else-if="booking">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-xl font-semibold text-gray-900">Vaša rezervacija</h1>
          <span
            :class="booking.status === 'confirmed'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'"
            class="text-xs font-medium px-3 py-1 rounded-full"
          >
            {{ booking.status === 'confirmed' ? 'Aktivna' : 'Otkazana' }}
          </span>
        </div>

        <div class="bg-gray-50 rounded-xl p-4 space-y-3 mb-6">
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Ime</span>
            <span class="font-medium text-gray-900">{{ booking.customer_name }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Radnik</span>
            <span class="font-medium text-gray-900">{{ booking.slot.worker.name }}</span>
          </div>
