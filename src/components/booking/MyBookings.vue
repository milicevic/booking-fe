<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Booking } from '@/api/booking'
import { loadMyBookings } from '@/lib/myBookings'
import { formatPrice } from '@/lib/price'
import { useTenantStore } from '@/stores/tenant'

const { t, locale } = useI18n()
const tenant = useTenantStore()
const bookings = ref<Booking[]>([])

const jsLocale = computed(() => (locale.value === 'sr' ? 'sr-Latn-RS' : 'en-US'))

function formatDate(date: string) {
  return new Date(date.slice(0, 10) + 'T00:00:00').toLocaleDateString(jsLocale.value, {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

onMounted(async () => {
  bookings.value = await loadMyBookings()
})
</script>

<template>
  <section v-if="bookings.length" class="mb-6" data-testid="my-bookings">
    <p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">{{ t('booking.myBookings') }}</p>
    <div class="space-y-2">
      <router-link
        v-for="booking in bookings"
        :key="booking.token"
        :to="{ name: 'manage', params: { token: booking.token } }"
        class="flex items-center justify-between gap-4 bg-white rounded-xl border border-gray-100 p-4 hover:border-indigo-300 transition-colors"
      >
        <div class="min-w-0">
          <p class="text-sm font-medium text-gray-900">
            {{ booking.slot.worker.name }}
            <span v-if="booking.service" class="font-normal text-gray-500">
              · {{ booking.service.name }}<template v-if="booking.service.price"> ({{ formatPrice(booking.service.price, locale, tenant.config?.currency) }})</template>
            </span>
          </p>
          <p class="text-sm text-gray-500 capitalize">
            {{ formatDate(booking.slot.date) }} · {{ booking.start_time.slice(0, 5) }} — {{ booking.end_time.slice(0, 5) }}
          </p>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <span
            :class="booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'"
            class="text-xs font-medium px-2.5 py-1 rounded-full"
          >
            {{ booking.status === 'confirmed' ? t('booking.statusConfirmed') : t('booking.statusPending') }}
          </span>
          <span class="text-xs text-indigo-600">{{ t('booking.manageLink') }}</span>
        </div>
      </router-link>
    </div>
  </section>
</template>
