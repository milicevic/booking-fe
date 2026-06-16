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
const cancelling = ref(false)
const error = ref('')

const jsLocale = computed(() => locale.value === 'sr' ? 'sr-RS' : 'en-US')

onMounted(async () => {
  try {
    const { data } = await bookingApi.getByToken(route.params.token as string)
    booking.value = data
  } catch {
    error.value = t('manage.notFound')
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

async function handleCancel() {
  if (!booking.value) return
  if (!confirm(t('manage.cancelConfirm'))) return

  cancelling.value = true
  try {
    await bookingApi.cancel(booking.value.token)
    booking.value.status = 'cancelled'
  } catch {
    error.value = t('manage.cancelError')
  } finally {
    cancelling.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-8">

      <div v-if="loading" class="text-center text-gray-400">{{ t('common.loading') }}</div>

      <div v-else-if="error" class="text-center text-red-500">{{ error }}</div>

      <template v-else-if="booking">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-xl font-semibold text-gray-900">{{ t('manage.title') }}</h1>
          <span
            :class="booking.status === 'confirmed'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'"
            class="text-xs font-medium px-3 py-1 rounded-full"
          >
            {{ booking.status === 'confirmed' ? t('manage.statusActive') : t('manage.statusCancelled') }}
          </span>
        </div>

        <div class="bg-gray-50 rounded-xl p-4 space-y-3 mb-6">
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">{{ t('manage.name') }}</span>
            <span class="font-medium text-gray-900">{{ booking.customer_name }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">{{ t('manage.worker') }}</span>
            <span class="font-medium text-gray-900">{{ booking.slot.worker.name }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">{{ t('manage.date') }}</span>
            <span class="font-medium text-gray-900 capitalize">{{ formatDate(booking.slot.date) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">{{ t('manage.time') }}</span>
            <span class="font-medium text-gray-900">
              {{ booking.slot.start_time.slice(0, 5) }} — {{ booking.slot.end_time.slice(0, 5) }}
            </span>
          </div>
        </div>

        <div v-if="booking.status === 'cancelled'" class="text-center text-sm text-gray-400 mb-4">
          {{ t('manage.cancelled') }}
        </div>

        <div v-if="error" class="text-red-500 text-sm text-center mb-4">{{ error }}</div>

        <button
          v-if="booking.status === 'confirmed'"
          @click="handleCancel"
          :disabled="cancelling"
          class="w-full border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 text-sm font-medium py-2.5 rounded-xl transition-colors"
        >
          {{ cancelling ? t('manage.cancelling') : t('manage.cancelBtn') }}
        </button>
      </template>
    </div>
  </div>
</template>
