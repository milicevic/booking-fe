<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { bookingApi } from '@/api/booking'
import { useConfirm } from '@/composables/useConfirm'
import type { Booking } from '@/api/booking'
import { useTenantStore } from '@/stores/tenant'
import TenantLogo from '@/components/TenantLogo.vue'
import { apiErrorMessage } from '@/lib/apiError'
import { formatPrice } from '@/lib/price'

const { t, locale } = useI18n()
const tenant = useTenantStore()
const { confirm } = useConfirm()
const route = useRoute()
const router = useRouter()

const booking = ref<Booking | null>(null)
const loading = ref(true)
const cancelling = ref(false)
const error = ref('')

const jsLocale = computed(() => locale.value === 'sr' ? 'sr-Latn-RS' : 'en-US')

onMounted(async () => {
  try {
    const { data } = await bookingApi.getByToken(route.params.token as string)
    booking.value = data
  } catch (e) {
    error.value = apiErrorMessage(e, t('manage.notFound'))
  } finally {
    loading.value = false
  }
})

const isActive = computed(() => !!booking.value && ['pending', 'confirmed'].includes(booking.value.status))

function bookingStatusLabel(status: string) {
  if (status === 'confirmed') return t('manage.statusActive')
  if (status === 'cancelled') return t('manage.statusCancelled')
  if (status === 'rejected') return t('manage.statusRejected')
  return t('manage.statusPending')
}

function bookingStatusClass(status: string) {
  if (status === 'confirmed') return 'bg-green-100 text-green-700'
  if (status === 'cancelled' || status === 'rejected') return 'bg-red-100 text-red-700'
  return 'bg-yellow-100 text-yellow-700'
}

function formatDate(date: string) {
  return new Date(date.slice(0, 10) + 'T00:00:00').toLocaleDateString(jsLocale.value, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

async function handleCancel() {
  if (!booking.value) return
  if (!await confirm(t('manage.cancelConfirm'))) return

  cancelling.value = true
  try {
    await bookingApi.cancel(booking.value.token)
    booking.value.status = 'cancelled'
  } catch (e) {
    error.value = apiErrorMessage(e, t('manage.cancelError'))
  } finally {
    cancelling.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-md p-8">

      <div class="flex items-center gap-2 mb-6">
        <TenantLogo :src="tenant.logoUrl" :size="28" />
        <span class="font-semibold text-gray-800">{{ tenant.appName }}</span>
      </div>

      <div v-if="loading" class="text-center text-gray-400">{{ t('common.loading') }}</div>

      <div v-else-if="error" class="text-center text-red-500">{{ error }}</div>

      <template v-else-if="booking">
        <div class="flex items-center justify-between mb-6">
          <h1 class="text-xl font-semibold text-gray-900">{{ t('manage.title') }}</h1>
          <span
            :class="bookingStatusClass(booking.status)"
            class="text-xs font-medium px-3 py-1 rounded-full"
          >
            {{ bookingStatusLabel(booking.status) }}
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
          <div v-if="booking.service" class="flex justify-between gap-4 text-sm">
            <span class="text-gray-500">{{ t('manage.service') }}</span>
            <span class="font-medium text-gray-900 text-right">
              {{ booking.service.name }}<template v-if="booking.service.price"> · {{ formatPrice(booking.service.price, locale, tenant.config?.currency) }}</template>
            </span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">{{ t('manage.date') }}</span>
            <span class="font-medium text-gray-900 capitalize">{{ formatDate(booking.slot.date) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">{{ t('manage.time') }}</span>
            <span class="font-medium text-gray-900">
              {{ booking.start_time.slice(0, 5) }} — {{ booking.end_time.slice(0, 5) }}
            </span>
          </div>
        </div>

        <div v-if="booking.status === 'cancelled'" class="text-center text-sm text-gray-400 mb-4">
          {{ t('manage.cancelled') }}
        </div>
        <div v-else-if="booking.status === 'rejected'" class="text-center text-sm text-gray-400 mb-4">
          {{ t('manage.rejected') }}
        </div>

        <div v-if="error" class="text-red-500 text-sm text-center mb-4">{{ error }}</div>

        <button
          v-if="isActive"
          @click="handleCancel"
          :disabled="cancelling"
          class="w-full border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-50 text-sm font-medium py-2.5 rounded-xl transition-colors"
        >
          {{ cancelling ? t('manage.cancelling') : t('manage.cancelBtn') }}
        </button>

        <button
          v-else
          @click="router.push({ name: 'booking' })"
          class="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
        >
          {{ t('manage.backHome') }}
        </button>
      </template>
    </div>
  </div>
</template>
