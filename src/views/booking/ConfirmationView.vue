<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { bookingApi } from '@/api/booking'
import type { Booking } from '@/api/booking'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()

const booking = ref<Booking | null>(null)
const loading = ref(true)

const jsLocale = computed(() => locale.value === 'sr' ? 'sr-RS' : 'en-US')

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
  return new Date(date).toLocaleDateString(jsLocale.value, {
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

      <div v-if="loading" class="text-gray-400">{{ t('common.loading') }}</div>

      <template v-else-if="booking">
        <div class="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
        </div>

        <h1 class="text-xl font-semibold text-gray-900 mb-1">{{ t('confirmation.title') }}</h1>
        <p class="text-gray-500 text-sm mb-6">
          {{ t('confirmation.sentTo', { contact: booking.customer_email ? 'email' : t('booking.phone').toLowerCase() }) }}
        </p>

        <div class="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-6">
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">{{ t('confirmation.worker') }}</span>
            <span class="font-medium text-gray-900">{{ booking.slot.worker.name }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">{{ t('confirmation.date') }}</span>
            <span class="font-medium text-gray-900 capitalize">{{ formatDate(booking.slot.date) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">{{ t('confirmation.time') }}</span>
            <span class="font-medium text-gray-900">
              {{ booking.slot.start_time.slice(0, 5) }} — {{ booking.slot.end_time.slice(0, 5) }}
            </span>
          </div>
        </div>

        <router-link
          :to="{ name: 'manage', params: { token: booking.token } }"
          class="text-sm text-indigo-600 hover:text-indigo-700"
        >
          {{ t('confirmation.manageLink') }}
        </router-link>
      </template>
    </div>
  </div>
</template>
